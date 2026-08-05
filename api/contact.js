// /api/contact.js
// Vercel serverless function that receives the Coastline Creative contact form
// submission and emails it using Resend (https://resend.com).
//
// ENV VARS REQUIRED (set these in your Vercel project → Settings → Environment Variables):
//   RESEND_API_KEY   — your Resend API key
//   CONTACT_TO_EMAIL — the inbox that should receive enquiries, e.g. hello@rareformmedia.co.za
//   CONTACT_FROM_EMAIL — the "from" address Resend sends as, e.g. enquiries@rareformmedia.co.za
//                         (must be on a domain you've verified with Resend)
//
// No npm dependencies required — this calls Resend's REST API directly with fetch,
// which is available natively in the Vercel Node runtime.

const ALLOWED_SERVICES = new Set([
  'photography',
  'social',
  'automotive',
  'branding',
  'other',
]);

const SERVICE_LABELS = {
  photography: 'Photography & Videography',
  social: 'Social Media Content',
  automotive: 'Automotive Content',
  branding: 'Branding & Design',
  other: 'Something Else',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strips control characters, HTML tags, and collapses/trims whitespace.
// Used on every field before it's validated, stored, or emailed.
function sanitizeText(value, maxLength) {
  if (value === undefined || value === null) return '';
  var str = String(value);
  // Remove null bytes and other control characters (except normal whitespace).
  str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Strip any HTML tags outright — form fields are plain text, not markup.
  str = str.replace(/<[^>]*>/g, '');
  // Collapse runs of whitespace and trim ends.
  str = str.replace(/\s+/g, ' ').trim();
  if (maxLength && str.length > maxLength) {
    str = str.slice(0, maxLength).trim();
  }
  return str;
}

function isValidEmail(email) {
  // Simple, deliberately permissive email check.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  // CORS / method guard
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  let body = req.body;
  // On some runtimes req.body arrives as a raw string — parse defensively.
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      res.status(400).json({ ok: false, error: 'Invalid JSON body.' });
      return;
    }
  }

  const rawBody = body || {};

  // Honeypot — if it's filled in, it was a bot. Pretend success, do nothing.
  if (rawBody.website) {
    res.status(200).json({ ok: true });
    return;
  }

  // Sanitize every field before it's validated, stored, or emailed.
  const name = sanitizeText(rawBody.name, 100);
  const email = sanitizeText(rawBody.email, 200);
  const phone = sanitizeText(rawBody.phone, 40);
  const service = sanitizeText(rawBody.service, 30);
  const message = sanitizeText(rawBody.message, 5000);

  // Validation — every field is required, no exceptions.
  const errors = {};
  if (!name || name.length < 2) errors.name = 'Please enter your full name.';
  if (!email || !isValidEmail(email)) errors.email = 'Please enter a valid email address.';
  if (!phone || phone.length < 5) errors.phone = 'Please enter a valid phone number.';
  if (!service || !ALLOWED_SERVICES.has(service)) errors.service = 'Please select what you\u2019re enquiring about.';
  if (!message || message.length < 5) errors.message = 'Please enter a short message.';

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ ok: false, error: 'Please fill in every field and try again.', fields: errors });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    console.error('Contact form is missing required environment variables (RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL).');
    res.status(500).json({ ok: false, error: 'The contact form is not fully configured yet. Please email us directly for now.' });
    return;
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const serviceLabel = SERVICE_LABELS[service] || service;

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #1a1a1a;">
      <h2 style="margin-bottom: 0.2em;">New enquiry from rareformmedia.co.za</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <p><strong>Enquiring about:</strong> ${escapeHtml(serviceLabel)}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
    </div>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Coastline Creative Website <${fromEmail}>`,
        to: [toEmail],
        reply_to: email,
        subject: `New price inquiry from ${safeName}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', resendRes.status, errText);
      res.status(502).json({ ok: false, error: 'We could not send your message right now. Please try again or email us directly.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form send failed:', err);
    res.status(500).json({ ok: false, error: 'Something went wrong sending your message. Please try again or email us directly.' });
  }
};
