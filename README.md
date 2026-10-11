# Apex Capital Consultants — acc-funds.com

The marketing site for Apex Capital Consultants, a brand management firm, plus the Mastermind Minutes blog and email list. Next.js (App Router) on Vercel, Postgres (Neon) via Prisma, Vercel Blob for post images, Resend for email, Vercel Web Analytics.

```bash
npm install
cp .env.example .env.local   # at minimum DATABASE_URL and SESSION_SECRET
npm run dev
```

The production build (`npm run build`) runs `prisma migrate deploy` first, so every deploy applies new migrations.

## Pages

| Route | Page |
|---|---|
| `/` | Home: hero, three teasers, Mastermind Minutes signup + one-time popup |
| `/firm` | The Firm |
| `/what-we-do` | The Six Disciplines + How We Work |
| `/clients` | Who Qualifies + Client Builds |
| `/minutes`, `/minutes/[slug]` | The Mastermind Minutes blog |
| `/consultation` | Booking (Google Calendar) + inquiry form |
| `/privacy`, `/terms` | Legal pages (noindex) |
| `/unsubscribe?token=…` | Confirms before unsubscribing (mail scanners follow links) |
| `/admin` | Sign-in, posts, editor, subscribers (linked from the footer) |

The header, overlay menu and footer are shared (`components/`). Every page except Home shows the "← Home" link next to Menu. It was added to fix a navigation dead-end, so keep it.

## The Mastermind Minutes

- **Signups.** All three forms (home panel, popup, blog pages) save to the `Subscriber` table through `/api/subscribe`.
- **Admin.** Accounts are created only from the command line, and there is no sign-up page. Running the command again for an existing email resets that password:
  ```bash
  npm run admin:create -- you@acc-funds.com
  ```
  It needs the production `DATABASE_URL` in `.env.local`. Five wrong passwords locks that email out for 15 minutes.
- **Publishing.** "Publish" makes the post live and, if the box is ticked, emails it to every active subscriber through Resend's batch API. A post is emailed at most once (`Post.sentAt` is claimed atomically), and its URL is locked after that.
- **Unsubscribing.** Every email has its own unsubscribe link plus RFC 8058 one-click headers (`/api/unsubscribe`).
- **Images.** Images are shrunk in the browser to at most 2000px, uploaded to the **private** Blob store, and served at `/media/minutes/…` with an immutable cache. The HTML sanitizer drops any image that isn't from `/media/minutes/`.
- **Export.** The Subscribers page has a CSV export, for moving to Mailchimp or another provider later.

## Hard content rules

- **`inquiries@acc-funds.com` never appears on the public site.** That means no footer text, no mailto link, no meta tag, and nothing in the page source. It exists only as the `INQUIRY_TO_EMAIL` server env var. Never give it a `NEXT_PUBLIC_` prefix.
- **No sector or industry segmentation anywhere.** The position is that readiness matters, not industry. Don't add an industry list, grid or filter.
- **Blue is interactive, gold is static.** Platinum-blue (`--accent`) is for things you can click and for status indicators. Gold (`--gold`) is for brand touches and numbering only.
- The Firm page is written as "the firm," not in the first person.

## Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres (set by the Vercel integration) |
| `BLOB_STORE_ID` | Private Blob store `apex-media`; auth is via Vercel OIDC (set by the integration) |
| `SESSION_SECRET` | Signs admin session cookies; rotating it signs every admin out |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender for inquiry emails |
| `INQUIRY_TO_EMAIL` | Where inquiries are delivered (server-only) |
| `NEWSLETTER_FROM_EMAIL` | Sender for Minutes emails (falls back to `RESEND_FROM_EMAIL`) |

If Resend isn't configured, the inquiry form tells the visitor honestly that nothing was sent (HTTP 503).

## Open items

1. **Booking link.** Set `BOOKING_URL` and `BOOKING_EMBED_URL` in `lib/site.ts`. Until they're set, the Consultation page shows its "opens soon" panel.
2. **Real inquiry fields.** The owner is sending his paper form. Replace the placeholder fields in `components/InquiryForm.tsx` and `app/api/inquiry/route.ts`.
3. **Client logos.** Swap the text wordmarks in `app/clients/page.tsx` once the files arrive, and keep the same links.
4. **Full privacy policy.** The current page accurately describes inquiries, the Minutes list and analytics. Expand it into a full policy once the inquiry fields are final.
