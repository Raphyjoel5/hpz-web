'use strict';

/**
 * Email provider abstraction.
 *
 * Resend is the default because it needs no SDK (plain HTTPS + JSON), has a free
 * tier that covers early-stage volume, and handles domain auth cleanly.
 * To swap providers, implement a new sender below and set EMAIL_PROVIDER.
 *
 * If no API key is configured the site degrades gracefully: the lead is still
 * stored and the welcome email is simply skipped (never blocks a signup).
 */

const { logEvent } = require('./_lib');

const SITE = 'https://www.hpzperformance.com';
const FROM = process.env.EMAIL_FROM || 'HPZ Performance <onboarding@resend.dev>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'hpzperformancezone@gmail.com';

function welcomeHtml(unsubscribeUrl) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Welcome to the Zone</title></head>
<body style="margin:0;padding:0;background:#07090e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07090e;padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0c0f16;border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
    <tr><td style="padding:36px 32px;font-family:Arial,Helvetica,sans-serif;">

      <div style="margin-bottom:24px;">
        <span style="display:inline-block;width:34px;height:34px;background:#00e5ff;border-radius:6px;"></span>
      </div>

      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;letter-spacing:1px;color:#edf1f8;text-transform:uppercase;">
        Welcome to <span style="color:#00e5ff;">the Zone</span>
      </h1>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a7b0c0;">
        You're officially on the HPZ Early Access List.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#a7b0c0;">
        You'll be among the first to hear about beta openings, platform updates,
        new training features and the official HPZ launch.
      </p>

      <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#edf1f8;font-weight:bold;">
        Train with System. Perform for Real.
      </p>

      <a href="${SITE}/" style="display:inline-block;background:#00e5ff;color:#04141a;font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:13px 30px;border-radius:8px;">
        Visit HPZ
      </a>

      <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;line-height:1.7;color:#7d8799;">
        HPZ — Human Performance Zone<br />
        You received this because you joined the HPZ Early Access List.<br />
        <a href="${unsubscribeUrl}" style="color:#7d8799;">Unsubscribe</a>
      </p>

    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function welcomeText(unsubscribeUrl) {
  return [
    'WELCOME TO THE ZONE',
    '',
    "You're officially on the HPZ Early Access List.",
    '',
    "You'll be among the first to hear about beta openings, platform updates,",
    'new training features and the official HPZ launch.',
    '',
    'Train with System. Perform for Real.',
    '',
    'HPZ — Human Performance Zone',
    SITE,
    '',
    `Unsubscribe: ${unsubscribeUrl}`
  ].join('\n');
}

async function sendViaResend({ to, unsubscribeUrl }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: 'Welcome to the Zone.',
      html: welcomeHtml(unsubscribeUrl),
      text: welcomeText(unsubscribeUrl),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { sent: false, reason: `provider_${res.status}`, detail: detail.slice(0, 200) };
  }
  return { sent: true };
}

/**
 * Never throws — a provider outage must not cost us the lead.
 */
async function sendWelcomeEmail({ to, manageToken }) {
  const unsubscribeUrl = `${SITE}/api/unsubscribe?token=${manageToken}`;
  const provider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();

  try {
    let result;
    if (provider === 'resend') {
      result = await sendViaResend({ to, unsubscribeUrl });
    } else {
      result = { sent: false, reason: `unknown_provider_${provider}` };
    }
    logEvent('welcome_email', { email: to, ...result });
    return result;
  } catch (err) {
    logEvent('welcome_email_failed', { email: to, reason: err.message });
    return { sent: false, reason: 'exception' };
  }
}

module.exports = { sendWelcomeEmail };
