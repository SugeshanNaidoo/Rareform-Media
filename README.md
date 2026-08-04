# Coastline Creative — site + contact form API

## Deploying to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it) and import it in Vercel.
2. Vercel will automatically detect `api/contact.js` as a serverless function at `/api/contact` — no build step needed for the static HTML/CSS/JS.
3. Sign up at https://resend.com (free tier is fine to start).
4. In your Vercel project → **Settings → Environment Variables**, add:
   - `RESEND_API_KEY` — your Resend API key
   - `CONTACT_TO_EMAIL` — the inbox that should receive enquiries, e.g. `coastlinecreate@gmail.com`
   - `CONTACT_FROM_EMAIL` — the address Resend sends *from*. This **cannot** be a Gmail address — Resend (like all transactional email providers) requires you to verify a domain you control and send from an address on that domain, e.g. `enquiries@coastlinecreative.co.za`. Until you have a domain verified, you can use Resend's shared test domain (`onboarding@resend.dev`) for development — it will still deliver to `CONTACT_TO_EMAIL`, including your Gmail inbox.
5. Redeploy. The form on `contact.html` posts to `/api/contact`, which emails the submission to `CONTACT_TO_EMAIL` and sets `reply_to` to the enquirer's email so you can reply directly.

## Notes
- The function includes a hidden honeypot field (`website`) to quietly drop simple bot submissions.
- Every field is required and sanitized server-side (control characters and HTML tags stripped, whitespace collapsed, length capped) before validation, storage, or emailing.
- No npm dependencies are required — the function calls Resend's REST API directly with `fetch`.
- If you'd rather use a different email provider (SMTP, SendGrid, Postmark, etc.), swap out the `fetch('https://api.resend.com/emails', …)` call in `api/contact.js` for that provider's API — the validation and response handling around it can stay the same.

## Brand assets
- `logo.png` — full lockup (icon + wordmark + tagline), used in the nav and footer.
- `favicon.png` — icon-only mark, used as the browser tab favicon.
- If you'd like sharper favicons across devices, you can additionally generate a `favicon.ico` and various `apple-touch-icon` sizes from `favicon.png` (e.g. via https://realfavicongenerator.net) and drop the extra `<link>` tags into each page's `<head>`.

## Domain placeholder
Canonical URLs, Open Graph tags, and the sitemap currently use `https://www.coastlinecreative.co.za` as a placeholder domain. Once your real domain is live, do a find-and-replace for that string across the HTML files, `sitemap.xml`, and `robots.txt`.
