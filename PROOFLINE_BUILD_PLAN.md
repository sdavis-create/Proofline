# Proofline — Build Plan (Commercial SaaS Version)

> **For Claude Code:** Read this entire file before writing any code. Work one phase at a time. At the start of each phase, propose a short plan and wait for approval. At the end of each phase, run the app, confirm every "Done when" item, and summarize what changed. Never skip ahead.

---

## 1. Product Summary

Proofline helps print-on-demand (POD) sellers list one design across many platforms quickly and safely.

**Core promise:** Upload a design once → get platform-ready titles, tags, and descriptions → publish or autofill on each platform in minutes.

**Target user:** Small-to-mid POD sellers on Redbubble, TeePublic, Etsy, Society6, and similar sites.

**Key differentiators:**

1. Platform-specific metadata (each platform's own limits and format)
2. Trademark/risk checking before anything is listed
3. A browser extension that fills listing forms on the page the user has open. **The user always clicks submit.** No headless bots, no auto-submission.

---

## 2. Tech Stack

| Layer             | Choice                                                                                    | Why                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Language          | TypeScript everywhere                                                                     | One language for web app, API, and extension             |
| Web framework     | Next.js (App Router)                                                                      | Frontend + backend API routes in one project             |
| UI                | Tailwind CSS + shadcn/ui                                                                  | Fast, clean, consistent components                       |
| Database          | Supabase Postgres                                                                         | Hosted, relational, row-level security                   |
| Auth              | Supabase Auth (email + Google)                                                            | Built in, pairs with the database                        |
| File storage      | Supabase Storage                                                                          | Artwork images, per-user private buckets                 |
| AI                | Anthropic API (Claude, current Sonnet model — check docs.claude.com for the model string) | Vision to analyze artwork + text generation for metadata |
| Background jobs   | Inngest (or Supabase Edge Functions)                                                      | Batch metadata generation without request timeouts       |
| Payments          | Stripe Checkout + Customer Portal + webhooks                                              | Subscriptions, upgrades, cancellations handled by Stripe |
| Browser extension | Chrome Manifest V3, TypeScript, built with WXT                                            | Modern extension tooling                                 |
| Etsy integration  | Etsy Open API v3 (OAuth 2.0)                                                              | Official, ToS-compliant direct publishing                |
| Email             | Resend                                                                                    | Welcome, receipts, usage alerts                          |
| Error monitoring  | Sentry                                                                                    | Catch bugs before customers report them                  |
| Product analytics | PostHog                                                                                   | See where users drop off                                 |
| Hosting           | Vercel (web app)                                                                          | Simple deploys from GitHub                               |
| Code hosting      | GitHub (private repo)                                                                     | Version control; Vercel deploys from here                |

**Note on the old stack:** The earlier prototype used FastAPI + SQLite. This version consolidates into Next.js + Supabase so there is one codebase, one language, and managed multi-user infrastructure. Reuse ideas and UI patterns from the prototype (artwork grid, marketability scoring, listings queue, CopyField), not its code.

---

## 3. Data Model (starting point)

```
profiles          id (= auth user id), display_name, shop_voice (text), plan_tier, created_at
designs           id, user_id, title_working, image_path, width_px, height_px,
                  ai_description, themes (text[]), styles (text[]),
                  marketability_score (int), created_at
platforms         id, key ('etsy','redbubble','teepublic','society6'), name,
                  rules (jsonb: title_max, tag_max, tag_char_max, description_max, notes)
listings          id, user_id, design_id, platform_id,
                  title, tags (text[]), description,
                  status ('draft','ready','listed','skipped'),
                  risk_flags (jsonb), external_url, listed_at, updated_at
risk_terms        id, term, category ('trademark','celebrity','sports','brand','other'),
                  severity ('block','warn'), source, is_global (bool), user_id (nullable)
sales_imports     id, user_id, platform_id, filename, imported_at
sales_records     id, user_id, design_id (nullable), platform_id, sale_date, product_type,
                  quantity, revenue_cents, raw (jsonb)
usage_events      id, user_id, event_type ('ai_generation','listing_created'), created_at
extension_tokens  id, user_id, token_hash, label, last_used_at, revoked (bool)
field_selectors   id, platform_id, field ('title','tags','description'),
                  selector, version, active (bool)
```

Row-level security on every user-owned table: users can only read/write their own rows.

**Platform rules live in the database, not in code**, so limits can be corrected without redeploying. Verify each platform's current limits before launch (e.g. Etsy has historically used 13 tags, 20 characters per tag, 140-character titles — confirm these).

---

## 4. Build Phases

### Phase 0 — Project Setup

**Goal:** An empty, deployable app with all accounts connected.

- Create Next.js + TypeScript + Tailwind + shadcn/ui project
- Connect Supabase (env vars in `.env.local`, never committed)
- Push to private GitHub repo; connect Vercel; confirm a deploy works
- Add a `CLAUDE.md` with coding conventions (see Section 6)
- Add ESLint + Prettier + a basic test setup (Vitest)

**Done when:** A "Hello Proofline" page is live on a Vercel URL and the repo has a working CI lint/test step.

---

### Phase 1 — Accounts & Design Library

**Goal:** Users can sign up and manage their artwork.

- Sign up / log in / log out (email + Google)
- `profiles` row created automatically on signup
- Upload one or many images (drag and drop), stored in private per-user storage
- Design library grid: thumbnail, working title, date, status badges per platform
- Design detail page: view image, edit working title, delete design
- Basic app shell: sidebar nav (Library, Queue, Analytics, Settings)

**Done when:** Two different test users can each upload images and neither can see the other's designs (verify RLS).

---

### Phase 2 — AI Metadata Engine

**Goal:** Generate platform-specific listings from an image.

- On upload (or on demand), send image to Claude vision → store `ai_description`, `themes`, `styles`, `marketability_score` (1–100 with a one-line rationale)
- "Generate listings" action: for each selected platform, produce title, tags, description that obey that platform's `rules` from the database
- Validate output in code against the rules (length, count, characters); auto-retry once if invalid, otherwise truncate safely and flag for review
- Settings page: "Shop voice" text field that is included in every generation prompt
- Editable listing form per platform with live character/tag counters and a "Regenerate" button
- Batch generation for many designs at once via background jobs, with progress shown in the UI
- Log each AI call to `usage_events`

**Done when:** Uploading one design and selecting 3 platforms produces 3 valid, rule-compliant listings; a batch of 20 designs completes without timeouts.

---

### Phase 3 — Listings Queue & Status Tracking

**Goal:** A clear workflow from draft to listed.

- Queue page: filter by platform and status; sort by marketability
- Status flow: `draft → ready → listed` (or `skipped`)
- Bulk actions: mark ready, skip, regenerate
- Manual "mark as listed" with optional external URL
- CSV export of listings per platform (fallback for any platform)
- Dashboard summary: designs uploaded, listings ready, listed this week

**Done when:** A user can take a batch of designs from upload to "ready" entirely inside the queue, and export a CSV.

---

### Phase 4 — Trademark & Risk Checker

**Goal:** Catch risky terms before listing.

- Seed `risk_terms` with a starter global list (well-known brands, sports leagues/teams, franchise and character names, celebrity names, commonly enforced phrases)
- Check every title, tag, and description on generate and on edit
- `block` severity: listing cannot be marked ready until fixed; `warn`: yellow flag, can proceed
- Highlight flagged words inline in the listing editor with the reason
- Users can add personal blocklist terms
- AI generation prompt instructs Claude to avoid trademarked terms, **and** the code check runs regardless (never trust the prompt alone)
- Visible disclaimer: "Risk checking is a helpful screen, not legal advice. You are responsible for what you list."

**Done when:** A listing containing a seeded brand name is blocked with a clear explanation, and editing the term out unblocks it.

---

### Phase 5 — Chrome Extension (Autofill)

**Goal:** Fill listing forms on platforms without APIs, user-in-control.

- Settings page in web app: generate/revoke extension tokens (store only a hash)
- Extension popup: paste token to connect; shows the user's "ready" listings for the platform matching the current tab
- User opens the platform's upload page themselves, picks a listing in the popup, clicks "Fill"
- Content script fills title, tags, description using selectors fetched from `field_selectors` (server-side, so selector fixes don't require publishing a new extension version)
- **The extension never clicks submit/publish.** The user reviews and submits.
- After submitting, user clicks "Mark as listed" in the popup (optionally captures the current URL)
- Graceful failure: if a selector is not found, show "This field couldn't be filled — copy it instead" with one-click copy buttons (the CopyField pattern)
- Start with one platform (Redbubble), then add others

**Done when:** On Redbubble's upload page, the extension fills all three fields from a queued listing, the user submits manually, and the listing shows "listed" in the web app.

---

### Phase 6 — Etsy Direct Publishing

**Goal:** Official API publishing for Etsy.

- Etsy OAuth connect/disconnect in Settings
- Create listings as **drafts** on Etsy (user activates them on Etsy), including image upload
- Handle Etsy-required fields (taxonomy/category, shipping profile, price, etc.) with sensible defaults the user sets once
- Store Etsy listing ID and URL; update status to `listed`
- Handle token refresh and API errors with clear messages

**Note:** Etsy requires registering an app and may require approval for commercial access. Start the application early (it can happen in parallel with earlier phases).

**Done when:** A ready listing becomes an Etsy draft with image, title, tags, and description in one click.

---

### Phase 7 — Billing & Usage Limits

**Goal:** Get paid; control AI costs.

- Tiers (adjust before launch):
  - **Free:** small monthly listing-generation cap, 1 platform, no risk checker
  - **Seller (~$15–20/mo):** higher cap, all platforms, risk checker, extension
  - **Pro (~$30–40/mo):** highest cap, Etsy publishing, analytics, priority support
- Stripe Checkout for upgrades; Stripe Customer Portal for managing/canceling
- Webhooks update `profiles.plan_tier` (subscription created, updated, canceled, payment failed)
- Enforce caps using `usage_events` (monthly window); friendly upgrade prompt when a cap is hit
- Usage meter visible in Settings
- Admin view (just for Scott): users, tiers, monthly AI usage, estimated AI cost

**Done when:** A test user can upgrade with a Stripe test card, see higher limits immediately, cancel in the portal, and be downgraded at period end.

---

### Phase 8 — Sales Analytics

**Goal:** Show what's actually selling.

- CSV import of sales reports per platform (parser per platform format; show a preview before saving)
- Match sales to designs (by title/URL; manual matching UI for unmatched rows)
- Charts: revenue over time, top designs, top product types, top-performing tags
- Feed top-performing tags/themes back into future generation prompts as "what works for this shop"

**Done when:** Importing a real sales CSV produces correct totals and a top-designs chart.

---

### Phase 9 — Beta Hardening

**Goal:** Ready for real users who aren't Scott.

- Onboarding flow: welcome → set shop voice → upload first design → generate first listing
- Help center pages (getting started, extension setup, Etsy connection, FAQ)
- Empty states and clear error messages everywhere
- Sentry and PostHog installed
- Terms of Service and Privacy Policy pages (have them reviewed; do not rely on AI-drafted legal text alone)
- Account deletion that removes all user data and images
- Public landing page with pricing
- Basic accessibility and mobile-responsive checks

**Done when:** A new tester completes onboarding and lists a design without any help.

---

### Phase 10 — Launch

- Free beta for 10–20 sellers; collect feedback in-app
- Fix top issues; then open paid tiers
- Publish extension to the Chrome Web Store (developer account required)

---

## 5. Non-Negotiable Rules

1. **Never auto-submit on third-party platforms.** The user always clicks publish.
2. **No headless browser automation** of customer accounts.
3. **Secrets stay in environment variables.** Never commit keys. Never expose the Anthropic or Stripe secret keys to the browser or extension.
4. **All AI calls go through the server**, with usage logged and caps enforced.
5. **RLS on every user table**, tested with two accounts.
6. **Validate AI output in code** against platform rules and the risk list every time.
7. **Private image storage** with signed URLs.

---

## 6. Conventions for CLAUDE.md

- TypeScript strict mode; no `any` without a comment explaining why
- Server logic in `app/api/*` route handlers or server actions; shared logic in `lib/`
- Database access through typed Supabase client; generate types from the schema
- Every new feature gets at least one test for its core logic (validation, limits, risk checks)
- Small commits with clear messages; one phase per branch, merged when "Done when" passes
- Ask before adding a new paid service or major dependency
- Keep UI consistent with shadcn/ui components; no one-off styling systems

---

## 7. How to Run Each Session with Claude Code

1. Open the project folder in Claude Code.
2. Start with: _"Read PROOFLINE_BUILD_PLAN.md and CLAUDE.md. We're starting Phase N. Propose a step-by-step plan before writing code."_
3. Approve or adjust the plan.
4. Let it build, run, and test.
5. Check the "Done when" items yourself in the browser.
6. Ask it to commit and summarize, then start the next phase in a fresh session.

---

## 8. Accounts Scott Needs to Create

- GitHub (private repo)
- Vercel
- Supabase
- Anthropic API (console.anthropic.com) — separate from a Claude.ai subscription
- Stripe
- Inngest (if used)
- Resend, Sentry, PostHog (free tiers are fine to start)
- Etsy developer app
- Chrome Web Store developer account (one-time fee)
