'use strict';

const {
  TABLE, CONSENT_VERSION,
  json, methodGuard, readBody,
  normalizeEmail, hashIp,
  memoryRateLimited, dbRateLimited,
  sb, sbRaw, configured,
  logEvent, attribution
} = require('./_lib');

const { sendWelcomeEmail } = require('./_email');

// Bots fill hidden fields and submit instantly. Both get a fake success so they
// stop retrying, but nothing is written.
const MIN_FILL_MS = 1200;

module.exports = async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return;

  const body = readBody(req);

  // Honeypot: a real browser never fills this (it is hidden and aria-hidden).
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    logEvent('lead_rejected', { reason: 'honeypot' });
    return json(res, 200, { ok: true, status: 'subscribed' });
  }

  const elapsed = Number(body.elapsed_ms);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) {
    logEvent('lead_rejected', { reason: 'too_fast', elapsed });
    return json(res, 200, { ok: true, status: 'subscribed' });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return json(res, 400, { ok: false, error: 'invalid_email' });
  }

  const ipHash = hashIp(req);
  if (memoryRateLimited(ipHash)) {
    logEvent('lead_rejected', { reason: 'rate_limit_memory' });
    return json(res, 429, { ok: false, error: 'rate_limited' });
  }

  if (!configured()) {
    logEvent('lead_failed', { email, reason: 'not_configured' });
    return json(res, 503, { ok: false, error: 'not_configured' });
  }

  try {
    if (await dbRateLimited(ipHash)) {
      logEvent('lead_rejected', { reason: 'rate_limit_db' });
      return json(res, 429, { ok: false, error: 'rate_limited' });
    }

    const attr = attribution(body);
    const row = {
      email,
      email_normalized: email,
      consent_version: CONSENT_VERSION,
      ip_hash: ipHash,
      ...attr
    };

    const insert = await sbRaw(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });

    // 201 → brand new lead.
    if (insert.status === 201) {
      const [created] = await insert.json();
      logEvent('lead_created', {
        email,
        form_location: attr.form_location,
        utm_source: attr.utm_source
      });

      const mail = await sendWelcomeEmail({ to: email, manageToken: created.manage_token });
      if (mail.sent) {
        // Fire-and-forget: a failed timestamp write must not fail the request.
        sb(`${TABLE}?id=eq.${created.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ welcome_email_sent_at: new Date().toISOString() })
        }).catch(() => {});
      }

      return json(res, 200, {
        ok: true,
        status: 'subscribed',
        token: created.manage_token,
        welcome_email: mail.sent
      });
    }

    // 409 → email already exists.
    if (insert.status === 409) {
      const existing = await sb(
        `${TABLE}?select=id,status,manage_token&email_normalized=eq.${encodeURIComponent(email)}&limit=1`
      );
      const lead = Array.isArray(existing) ? existing[0] : null;

      // Someone who previously unsubscribed is opting back in — honour it.
      if (lead && lead.status === 'unsubscribed') {
        await sb(`${TABLE}?id=eq.${lead.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'active',
            resubscribed_at: new Date().toISOString(),
            consent_at: new Date().toISOString(),
            consent_version: CONSENT_VERSION
          })
        });
        logEvent('lead_resubscribed', { email });
        return json(res, 200, {
          ok: true,
          status: 'subscribed',
          token: lead.manage_token,
          welcome_email: false
        });
      }

      logEvent('lead_duplicate', { email });
      return json(res, 200, { ok: true, status: 'already' });
    }

    const detail = await insert.text().catch(() => '');
    logEvent('lead_failed', { email, reason: `insert_${insert.status}`, detail: detail.slice(0, 200) });
    return json(res, 500, { ok: false, error: 'storage_error' });

  } catch (err) {
    logEvent('lead_failed', { email, reason: err.message });
    return json(res, 500, { ok: false, error: 'storage_error' });
  }
};
