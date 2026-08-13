'use strict';

const {
  TABLE, SEGMENTS,
  json, methodGuard, readBody,
  sb, configured, logEvent
} = require('./_lib');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Optional post-signup segmentation. Identified by the opaque manage_token
 * returned at signup, so no email address travels back over the wire and
 * nobody can enumerate or edit other people's records.
 */
module.exports = async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return;

  const body = readBody(req);
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const segment = typeof body.segment === 'string' ? body.segment.trim().toLowerCase() : '';

  if (!UUID_RE.test(token)) return json(res, 400, { ok: false, error: 'invalid_token' });
  if (!SEGMENTS.includes(segment)) return json(res, 400, { ok: false, error: 'invalid_segment' });
  if (!configured()) return json(res, 503, { ok: false, error: 'not_configured' });

  try {
    const updated = await sb(`${TABLE}?manage_token=eq.${token}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ segment })
    });

    if (!Array.isArray(updated) || updated.length === 0) {
      return json(res, 404, { ok: false, error: 'not_found' });
    }

    logEvent('lead_segmented', { segment });
    return json(res, 200, { ok: true, segment });
  } catch (err) {
    logEvent('lead_segment_failed', { reason: err.message });
    return json(res, 500, { ok: false, error: 'storage_error' });
  }
};
