'use strict';

const { TABLE, sb, configured, logEvent } = require('./_lib');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET  → branded confirmation page (a plain link click must not unsubscribe
 *        anyone, because mail clients pre-fetch links).
 * POST → performs the unsubscribe. Also satisfies RFC 8058 one-click
 *        (List-Unsubscribe-Post) which Gmail/Apple Mail send as POST.
 */
module.exports = async function handler(req, res) {
  const token = String((req.query && req.query.token) || '').trim();
  const valid = UUID_RE.test(token);

  if (req.method === 'POST') {
    if (!valid) return page(res, 400, 'INVALID LINK', 'This unsubscribe link is not valid.', false);
    if (!configured()) return page(res, 503, 'TEMPORARILY UNAVAILABLE', 'Please try again shortly.', false);

    try {
      const updated = await sb(`${TABLE}?manage_token=eq.${token}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        })
      });

      if (!Array.isArray(updated) || updated.length === 0) {
        return page(res, 404, 'LINK NOT FOUND', 'This unsubscribe link is no longer valid.', false);
      }

      logEvent('lead_unsubscribed', {});
      return page(
        res, 200,
        'YOU\'RE UNSUBSCRIBED',
        'You will no longer receive HPZ marketing emails. You can rejoin the Early Access List any time from our website.',
        true
      );
    } catch (err) {
      logEvent('lead_unsubscribe_failed', { reason: err.message });
      return page(res, 500, 'SOMETHING WENT WRONG', 'We could not process that right now. Please try again.', false);
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return page(res, 405, 'NOT ALLOWED', 'Unsupported request.', false);
  }

  if (!valid) return page(res, 400, 'INVALID LINK', 'This unsubscribe link is not valid.', false);

  return page(
    res, 200,
    'UNSUBSCRIBE',
    'Confirm that you want to stop receiving HPZ Early Access emails.',
    false,
    token
  );
};

function page(res, status, title, message, done, confirmToken) {
  const action = confirmToken
    ? `<form method="POST" action="/api/unsubscribe?token=${escapeHtml(confirmToken)}" style="margin:0;">
         <button type="submit" class="btn">Confirm Unsubscribe</button>
       </form>
       <a class="link" href="/">Never mind — back to HPZ</a>`
    : `<a class="btn" href="/">Back to HPZ</a>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)} — HPZ Human Performance Zone</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#07090e;color:#edf1f8;font-family:'Barlow',sans-serif;min-height:100vh;min-height:100dvh;
       display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center}
  body::before{content:'';position:fixed;inset:0;pointer-events:none;
       background-image:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px);
       background-size:60px 60px}
  .wrap{position:relative;max-width:440px}
  .logo{margin-bottom:28px}
  h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(34px,7vw,46px);letter-spacing:3px;line-height:1.05;margin-bottom:14px}
  .accent{color:#00e5ff}
  p{font-size:15px;line-height:1.7;color:#8a94a8;margin-bottom:32px}
  .btn{display:inline-block;background:#00e5ff;color:#04141a;font-family:'Barlow Condensed',sans-serif;font-size:14px;
       font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 34px;border-radius:8px;
       border:none;cursor:pointer;transition:transform .2s}
  .btn:hover{transform:translateY(-2px)}
  .link{display:block;margin-top:18px;font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:1.5px;
        text-transform:uppercase;color:#7d8799;text-decoration:none}
  .link:hover{color:#00e5ff}
  :focus-visible{outline:2px solid #00e5ff;outline-offset:3px;border-radius:4px}
  .foot{margin-top:44px;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:1.5px;color:#7d8799;text-transform:uppercase}
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">
      <svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="HPZ" role="img">
        <rect x="14" y="14" width="72" height="13" fill="#edf1f8"/>
        <line x1="86" y1="27" x2="14" y2="73" stroke="#00e5ff" stroke-width="15"/>
        <rect x="14" y="73" width="72" height="13" fill="#edf1f8"/>
      </svg>
    </div>
    <h1>${escapeHtml(title).replace(/\s(\S+)$/, ' <span class="accent">$1</span>')}</h1>
    <p>${escapeHtml(message)}</p>
    ${action}
    <p class="foot">HPZ — Human Performance Zone</p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.status(status).send(html);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
