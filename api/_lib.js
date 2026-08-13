'use strict';

/**
 * Shared helpers for the HPZ lead capture endpoints.
 * Zero dependencies on purpose: the website has no build step and no package.json.
 */

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ypfooffkoiuumqnwraxu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'marketing_leads';
const CONSENT_VERSION = '2026-08-13';

/* ── responses ── */

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function methodGuard(req, res, allowed) {
  if (allowed.includes(req.method)) return false;
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { ok: false, error: 'method_not_allowed' });
  return true;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

/* ── email ── */

// Deliberately permissive but structural: one @, no spaces, a dotted domain.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function normalizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  // Strip whitespace (including non-breaking spaces pasted from mobile keyboards).
  const cleaned = raw.replace(/[\s ]/g, '');
  if (cleaned.length < 6 || cleaned.length > 254) return null;
  const lowered = cleaned.toLowerCase();
  if (!EMAIL_RE.test(lowered)) return null;
  return lowered;
}

/* ── privacy-preserving client fingerprint ── */

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

// We never store raw IPs — only a salted hash, used for abuse throttling.
function hashIp(req) {
  const ip = clientIp(req);
  if (!ip) return null;
  const salt = process.env.LEAD_IP_SALT || 'hpz-default-salt';
  return crypto.createHash('sha256').update(salt + ip).digest('hex').slice(0, 32);
}

/* ── rate limiting ── */

// Best-effort per-instance limiter. The database check below is the real backstop.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function memoryRateLimited(key) {
  if (!key) return false;
  const now = Date.now();
  const list = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear(); // crude guard against unbounded growth
  return list.length > MAX_PER_WINDOW;
}

async function dbRateLimited(ipHash) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const rows = await sb(
    `${TABLE}?select=id&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}&limit=11`
  );
  return Array.isArray(rows) && rows.length >= 10;
}

/* ── supabase REST ── */

function configured() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

async function sbRaw(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return res;
}

async function sb(path, options = {}) {
  const res = await sbRaw(path, options);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`supabase_${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

/* ── logging (never logs full email addresses) ── */

function maskEmail(email) {
  if (!email) return '(none)';
  const [user, domain] = email.split('@');
  const head = user.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function logEvent(event, data = {}) {
  const safe = { ...data };
  if (safe.email) safe.email = maskEmail(safe.email);
  console.log(JSON.stringify({ event, ...safe }));
}

/* ── attribution ── */

const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const SEGMENTS = ['athlete', 'coach', 'lifestyle', 'unknown'];

function str(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function attribution(body) {
  const out = {};
  for (const field of UTM_FIELDS) out[field] = str(body[field], 200);
  out.page = str(body.page, 300);
  out.form_location = str(body.form_location, 60);
  out.source = str(body.source, 60) || 'website';
  return out;
}

module.exports = {
  SUPABASE_URL, TABLE, CONSENT_VERSION, SEGMENTS,
  json, methodGuard, readBody,
  normalizeEmail, hashIp,
  memoryRateLimited, dbRateLimited,
  sb, sbRaw, configured,
  logEvent, maskEmail, attribution, str
};
