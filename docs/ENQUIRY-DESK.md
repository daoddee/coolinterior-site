# Cool Interior enquiry desk

The existing Vercel/GitHub website now includes `/admin`, a private customer enquiry workflow, and `/api/enquiries`. It stays on the existing domain and hosting provider.

## Live infrastructure

- Supabase project: `ysvmbvnnwpsqtqgnsccb`, **Cool Interior Enquiries**, London `eu-west-2`.
- Tables: `ci_enquiries`, `ci_rate_limits`, `ci_panel_owner`.
- Edge gateway: `https://ysvmbvnnwpsqtqgnsccb.supabase.co/functions/v1/ci-panel-gateway`.
- Tables have RLS enabled with no client read/write grants. This intentionally denies anonymous and ordinary authenticated access. Only the server-side gateway uses the service role.
- Gateway requires a high-entropy bearer credential of at least 32 characters. Set `PANEL_GATEWAY_SECRET` in Supabase Edge Function Secrets and the identical value in Vercel Production environment variables. The function reads the secret server-side and compares SHA-256 digests. It fails closed when the secret is missing or too short. Never put the credential in browser code or Git.

## Vercel production configuration

Set these **sensitive, production-only** environment variables on the Vercel project actually serving `www.coolinterior.co.uk`:

| Key | Value |
| --- | --- |
| `PANEL_GATEWAY_URL` | The gateway URL above |
| `PANEL_GATEWAY_SECRET` | The same random credential (at least 32 characters) stored in Supabase Edge Function Secrets |
| `PANEL_SESSION_SECRET` | Independent random secret of at least 32 characters |
| `ENQUIRIES_ENABLED` | `true` |

Dashboard-only credential pairing: open the Supabase project → Edge Functions → Secrets, save `PANEL_GATEWAY_SECRET`, then save the identical value as a Secret in Vercel Production. If a previously saved value cannot be recovered, generate a new strong value with a password manager and replace both. Never paste it into chat. Supabase applies secret changes immediately; Vercel needs a new deployment.\n\nRedeploy the exact approved GitHub source after configuring variables. Do not configure a live customer database on arbitrary preview deployments.

The password is not an environment variable. An owner is provisioned with a random, one-time setup token; only its SHA-256 hash is stored in `ci_panel_owner.setup_token_hash`. The setup URL is `/admin#setup=TOKEN`. The fragment is immediately removed from browser history; this page has no analytics. The owner chooses a password of at least 14 characters. Setup is atomic and cannot be repeated after the hash is stored. If the initial token is lost before use, generate a new token and update only its hash in the database. Do not log or commit the token.

After setup, direct delivery activates automatically when `/api/enquiries?action=health` confirms the database and owner password are ready. The public enquiry flow is portal-only. If delivery fails, the brief stays on the page and the customer can retry using the same request ID; there is no WhatsApp or email handoff. Do not tell customers a submission has been received before the database acknowledgement succeeds.

## Operations

- Sign in at `/admin`. Signed, HttpOnly, Secure, SameSite=Strict cookies expire after eight hours.
- Password changes require the current password and invalidate older sessions through the owner's session version. Rotate the session secret to revoke all sessions in an incident.
- Enquiries: New → Contacted → Site visit → Quoted → Won / Lost.
- Set priority, team member, quote value and follow-up date; add private notes. Updates are version checked, so a concurrent edit is rejected rather than silently overwriting it.
- Refresh every minute while the page is visible and no enquiry is being edited. Each page loads 100 enquiries; load older pages as needed. Metrics and export clearly refer to loaded enquiries, not an exhaustive accounts report.
- Export current filters to CSV. Spreadsheet formula prefixes are escaped.
- The sample workspace is fictional and held in memory for one visit. It never reads or writes customer records.
- Permanent deletion requires typing the enquiry reference. Review data retention periodically; keep only what is needed for enquiries, work and applicable record keeping.
- Internal notes are part of the enquiry; deleting it deletes them. The activity history stores the latest 300 entries per enquiry.
- Private photo uploads are available. Outbound notification emails require a sending service and are not connected. This is an enquiry CRM, not invoicing, accounting or a multi-role staff identity system.

## Checks

`node --test tests/enquiry-panel.test.cjs`

Syntax checks: `node --check api/enquiries.js`, `node --check assets/panel.js`, `node --check assets/site.js`.

Additional DOM checks exercised sample records, search, board/list, safe note rendering, stage changes and direct enquiry confirmation. A live gateway/database smoke test created, read, updated and deleted a system test record. Browser visual QA has not been performed.

## Initial activation status

Database and gateway deployed; no public database access granted. Vercel connection lists the user's projects but returned 403 for team `daoddees-projects` (`team_c5zudjHFeCSdIXmaoyqKlWgq`). The user must grant this team access before automated production environment setup can finish. Do not activate a guessed project: confirm which of the three Cool Interior projects serves the live domain first.


## Campaign attribution
Public pages load campaign-core and campaign-attribution before site.js. Analytics consent permits a first and latest touch in browser storage for up to 90 days; advertisement consent additionally permits gclid, gbraid and wbraid. Revocation clears browser storage. Only allowlisted tags, pathname and referring hostname are accepted; no full URL or referrer query is stored. Submitted attribution follows enquiry retention and deletion.

The server sanitizes every touch before saving `ci_enquiries.attribution`. Existing enquiries remain unattributed. Moving a lead to Site visit, Quoted or Won stamps `qualified_at` once. The portal groups loaded enquiries by latest source/medium/campaign and shows qualified counts, current wins and won quotation value. These are not payments or profitability calculations. Load older pages to expand the report. CSV exports include both touches and qualification date.

This release does not upload offline conversions to Google Ads. Captured click IDs are available for a future authorized import with the account's conversion action and consent requirements configured. Do not infer ROI without campaign spend and project costs. Campaign values are browser-reported and should not be treated as verified platform billing data.


## Optional project photos
The public form accepts up to five photos of at most 10 MB each and converts them in the browser to JPEG at up to 2048 pixels on the longest side, capped at 2 MB per uploaded file. Canvas conversion removes source metadata. Unsupported image formats show a clear error; the enquiry can be sent without photos.

The enquiry is saved first, then a 30-minute HMAC ticket permits uploads only to that enquiry. The server reserves up to five UUID object paths. The gateway issues Supabase signed upload URLs (two-hour validity, no overwrite) and verifies actual JPEG bytes and sizes before metadata is marked uploaded. Upload errors clearly distinguish a saved enquiry from unconfirmed photos; retries retain the request and photo IDs. The `ci-enquiry-photos` bucket is private, allows image/jpeg only and enforces a 2 MB object limit. No anonymous read/list policies are granted.

The signed-in owner receives ten-minute photo read links when opening an enquiry. Permanent enquiry deletion removes its reserved/uploaded objects through Storage before deleting the database row. Photo uploads do not require analytics consent and are not sent to analytics.

## Owner alerts and response process
New enquiries create durable private owner alerts in the same database transaction as the lead. The portal checks every 60 seconds and shows unread alerts, with a link to the enquiry and a mark-read control. Marking read does not mark a customer contacted. Move the stage to Contacted after responding and enter the next follow-up date.

A database cron checks every 15 minutes. On weekdays from 09:00 Europe/London, it creates one reminder per enquiry per day for follow-up dates before today. New enquiries still awaiting first contact after 24 hours also receive a reminder, unless already covered by an overdue follow-up. Updating stages or dates resolves obsolete alerts. Won/Lost enquiries do not receive follow-up reminders. Reminders persist with the portal closed.

Desktop notifications are optional and require the owner's explicit browser permission. They operate while the portal tab is open; browser suspension may delay delivery. Initial sign-in displays existing alerts without flooding desktop notifications. The browser alert body contains no customer contact details. These are not background push or email alerts. Email delivery remains unconnected and is labelled in the portal. A sending provider, verified sender and deployment credentials are required before outbound email can be enabled.

Apply database/owner-alerts.sql once to provision the private alert table, service-only RPCs, trigger and cron job. Gateway RPC paths are allowlisted. No public alert reads or writes are permitted.

## Phase 3: compact enquiry and contact intent
All 34 public enquiry forms use a single visible form requiring name, one phone number or email, postcode and a short description. Photos and service/property/timing/budget details are optional disclosures. The service defaults to the relevant page and can be changed. Submitting saves directly; no separate review-stage confirmation click is required. The editable brief and safe retry controls remain available if saving or photo transfer fails. A response target of one working day is displayed before sending and on confirmation, as confirmed by the owner.

The mobile contact bar provides Call, Get a quote and WhatsApp, with safe-area spacing. It hides during input focus, keyboard display or an open dialog. WhatsApp opens the business number +44 7365 155 414 with a generic project introduction; no form fields are automatically forwarded.

Analytics (with consent) records WhatsApp as contact_click with contact_channel=whatsapp. It never counts as generate_lead. A confirmed server save emits generate_lead once per reference in the current page, even if optional photo transfer needs a retry. form_variant=compact distinguishes this journey. GA4 event settings and Google Ads conversion selections must continue to use confirmed lead events for enquiry reporting; a WhatsApp click alone cannot establish that a message was sent. No external WhatsApp delivery callback is implemented.

Owner alerts and weekday follow-up reminders remain in the portal. Email notification delivery is not connected; desktop notifications require the portal tab to remain open. This limitation must not be presented as guaranteed background email delivery.

Live Phase 3 QA: a synthetic browser enquiry on 24 October 2026 saved with the submitted name, email, postcode, project text and one confirmed JPEG attachment. Exactly one new-enquiry alert was present. Moving the synthetic record to Contacted in a rolled-back transaction resolved its open alert. The reminder cron is active. Invalid contact input was rejected in the browser. A physical phone/keyboard and actual response-time SLA were not independently measured.
