# Rareform Media — site + contact form API

## Deploying to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it) and import it in Vercel.
2. Vercel will automatically detect `api/contact.js` as a serverless function at `/api/contact` — no build step needed for the static HTML/CSS/JS.
3. Sign up at https://resend.com (free tier is fine to start) and verify a sending domain (or use their test domain while developing).
4. In your Vercel project → **Settings → Environment Variables**, add:
   - `RESEND_API_KEY` — your Resend API key
   - `CONTACT_TO_EMAIL` — the inbox that should receive enquiries, e.g. `hello@rareformmedia.co.za`
   - `CONTACT_FROM_EMAIL` — the address Resend sends from, e.g. `enquiries@rareformmedia.co.za` (must be on a domain verified with Resend)
5. Redeploy. The form on `contact.html` posts to `/api/contact`, which emails the submission to `CONTACT_TO_EMAIL` and sets `reply_to` to the enquirer's email so you can reply directly.

## Notes
- The function includes a hidden honeypot field (`website`) to quietly drop simple bot submissions.
- Basic server-side validation is included (name/email/message required, email format checked).
- No npm dependencies are required — the function calls Resend's REST API directly with `fetch`.
- If you'd rather use a different email provider (SMTP, SendGrid, Postmark, etc.), swap out the `fetch('https://api.resend.com/emails', …)` call in `api/contact.js` for that provider's API — the validation and response handling around it can stay the same.
