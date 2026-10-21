# Cool Interior enquiry desk

The existing Vercel/GitHub website now includes `/admin`, a private customer enquiry workflow, and `/api/enquiries`. It stays on the existing domain and hosting provider.

## Live infrastructure

- Supabase project: `ysvmbvnnwpsqtqgnsccb`, **Cool Interior Enquiries**, London `eu-west-2`.
- Tables: `ci_enquiries`, `ci_rate_limits`, `ci_panel_owner`.
- Edge gateway: `https://ysvmbvnnwpsqtqgnsccb.supabase.co/functions/v1/ci-panel-gateway`.
- Tables have RLS enabled with no client read/write grants. This intentionally denies anonymous and ordinary authenticated access. Only the server-side gateway uses the service role.
- Gateway requires a high-entropy bearer credential; only its SHA-256 fingerprint is in its deployed source. Never put the credential in browser code or Git.

## Vercel production configuration

Set these **sensitive, production-only** environment variables on the Vercel project actually serving `www.coolinterior.co.uk`:

| Key | Value |
| --- | --- |
| `PANEL_GATEWAY_URL` | The gateway URL above |
| `PANEL_GATEWAY_SECRET` | The matching generated gateway credential, supplied securely during setup |
| `PANEL_SESSION_SECRET` | Independent random secret of at least 32 characters |
| `ENQUIRIES_ENABLED` | `true` |

Redeploy the exact approved GitHub source after configuring variables. Do not configure a live customer database on arbitrary preview deployments.

The password is not an environment variable. An owner is provisioned with a random, one-time setup token; only its SHA-256 hash is stored in `ci_panel_owner.setup_token_hash`. The setup URL is `/admin#setup=TOKEN`. The fragment is immediately removed from browser history; this page has no analytics. The owner chooses a password of at least 14 characters. Setup is atomic and cannot be repeated after the hash is stored. If the initial token is lost before use, generate a new token and update only its hash in the database. Do not log or commit the token.

After setup, direct delivery activates automatically when `/api/enquiries?action=health` confirms the database and owner password are ready. Until then, the existing WhatsApp/email flow remains available. Do not tell customers a submission has been received before the database acknowledgement succeeds.

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
- No outbound notification emails or photo uploads are implemented in this version. Customers can share photographs when the team contacts them. This is an enquiry CRM, not invoicing, accounting or a multi-role staff identity system.

## Checks

`node --test tests/enquiry-panel.test.cjs`

Syntax checks: `node --check api/enquiries.js`, `node --check assets/panel.js`, `node --check assets/site.js`.

Additional DOM checks exercised sample records, search, board/list, safe note rendering, stage changes and direct enquiry confirmation. A live gateway/database smoke test created, read, updated and deleted a system test record. Browser visual QA has not been performed.

## Initial activation status

Database and gateway deployed; no public database access granted. Vercel connection lists the user's projects but returned 403 for team `daoddees-projects` (`team_c5zudjHFeCSdIXmaoyqKlWgq`). The user must grant this team access before automated production environment setup can finish. Do not activate a guessed project: confirm which of the three Cool Interior projects serves the live domain first.
