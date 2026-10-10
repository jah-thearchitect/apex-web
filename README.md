# Apex Capital Consultants — acc-funds.com

The marketing site for Apex Capital Consultants, a brand management firm. Next.js (App Router) on Vercel, with Resend for the inquiry form and Vercel Web Analytics.

```bash
npm install
cp .env.example .env.local   # fill in the Resend values
npm run dev
```

## Pages

| Route | Page |
|---|---|
| `/` | Home: hero, three teasers, Mastermind Minutes signup + one-time popup |
| `/firm` | The Firm |
| `/what-we-do` | The Six Disciplines + How We Work |
| `/clients` | Who Qualifies + Client Builds |
| `/consultation` | Scheduling panel + inquiry form |
| `/privacy`, `/terms` | Interim legal pages (noindex) |

The header, overlay menu and footer are shared (`components/`). Every page except Home shows the "← Home" link next to Menu. It was added to fix a navigation dead-end, so keep it.

## Hard content rules

- **`inquiries@acc-funds.com` never appears on the public site.** That means no footer text, no mailto link, no meta tag, and nothing in the page source. It exists only as the `INQUIRY_TO_EMAIL` server env var. Never give it a `NEXT_PUBLIC_` prefix.
- **No sector or industry segmentation anywhere.** The position is that readiness matters, not industry. Don't add an industry list, grid or filter.
- **Blue is interactive, gold is static.** Platinum-blue (`--accent`) is for things you can click and for status indicators. Gold (`--gold`) is for brand touches and numbering only.
- The Firm page is written as "the firm," not in the first person.

## Environment

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender on acc-funds.com |
| `INQUIRY_TO_EMAIL` | Where inquiries are delivered (server-only) |

If these aren't set, the inquiry form tells the visitor honestly that nothing was sent (HTTP 503).

## Open items

1. **Newsletter provider.** Not chosen yet. `components/NewsletterForm.tsx` only confirms locally. Wire it up once a provider is picked.
2. **Real inquiry fields.** The owner is sending his paper form. Replace the placeholder fields in `components/InquiryForm.tsx` and `app/api/inquiry/route.ts`.
3. **Booking link.** It will be a Google Calendar Appointment Schedules link. Swap the CTA in `app/consultation/page.tsx`.
4. **Client logos.** Swap the text wordmarks in `app/clients/page.tsx` once the files arrive, and keep the same links.
5. **Real privacy policy.** Write it after items 1–2 are settled. The interim page describes what the code actually does today.
