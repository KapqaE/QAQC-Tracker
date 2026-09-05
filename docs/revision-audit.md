# QAQC Tracker professional revision audit

Revision date: 2026-09-05. Source of truth: `C:/Users/ugur.kurt/Desktop/Github/QAQC-Tracker`.
Upload-only copy: `C:/Users/ugur.kurt/Desktop/Github/QAQC-Tracker-GitHub`.

## Outcome and boundaries

Implemented the safe revision in the existing application, without rebuilding it. No live Supabase data or migrations were modified/applied; no Git initialization, commit, push or deployment occurred. Source environment and legacy SQL migrations 001–007 are unchanged (SHA-256 comparison to the pre-revision snapshot). Pong 1 and other projects were not touched.

The application is buildable and ready for staging acceptance/continued development, not a claim of completed production certification. Authenticated browser CRUD on a hosted fresh Supabase database, real scanned/digital PDFs over a forwarded HTTPS URL, and concurrent hosted transactions remain unverified. These need an authorized test instance/session.

## Findings, causes and revisions

| Area | Problem / root cause | Revision |
| --- | --- | --- |
| Architecture | Saved selection was disconnected from downstream pages. Reads could stop at the Supabase response cap. | Request-local project context shared by layout, five registers, Dashboard and Reports; accessible-project lookup; paginated parent/metrics reads. |
| First project | Unclear zero-state entry points, profile provisioning dependency, and optional 007 columns could prevent first creation. | Clear Create Project CTA/header action, existing Projects modal route restored, ensure profile before insert, automatic first selection; base-schema fallback with migration guidance. |
| Project selector | No mobile selector, incomplete loading/error handling, profile preference not consistently consumed. | Mobile-visible selector, pending/error states, RLS-verified selection; secure HTTP-only preference cookie plus profile preference when 007 is available. Stale/inaccessible preference falls back to an accessible project. |
| Auth | Return paths could accept backslashes. | Shared same-origin path validator for login and confirmation; auth.getUser and server-side protections preserved. No seeded identity or service-role key. Existing signup retained, governed by Supabase settings. |
| Dashboard / Reports | Portfolio totals ignored active project; old Reports counted NCR/punch only. Missing RRR controls could look complete. | Real five-module, project-scoped metrics; complete reads; independent RR-4 blocker counts; fail-closed readiness declarations and decisions; L2B tag checks for energization; V2 Reports. |
| WIR | Multi-page OCR skipped page one. Detail query errors looked like absent records. | OCR includes page one; explicit load failure; active-project register, related links. Existing numbering, eight-segment codes, separate filename revision/title, duplicate checks and parser retained. |
| MIR | Edit rows lacked derived project code and could inherit create-only values. | Shared form edit/default handling fixed, active-project selection, explicit detail errors and related-record panel. Existing material/delivery/traceability/review/disposition fields retained. |
| NCR | Legacy severity/status choices omitted; new identifiers could be arbitrary. | Legacy choices preserved; create-only NCR.#### check; active-project register; existing legacy IDs editable; action errors/refresh and related links. |
| SOR | Same shared form/state issues as MIR; action failures poorly surfaced. | Shared fixes and project scoping; distinct observation model preserved; relational action feedback and related links. |
| RRR | Child forms discarded returned errors and lacked corrections; blocker could not be closed. New control/history writes were separate transactions. Releases could bypass separate decisions. | Reusable pending/error ActionForm, ID-preserving child editors, guards on server and database, atomic new controls/history, append-only history, new-revision uniqueness and rollback. RR-1–4, Stage 1/2, Standard/ICT routes, tags, open items, evidence, attendance, signatories and metadata attachments retained. |
| RRR safety | Missing controls/declarations, contradictory Employer release, null decision, open P1/P2 or unsigned L2B could yield unsafe state. | Required gate/declarations; separate Engineer/CxA/Employer; explicit null-safe SQL check; rejected post-release gate regressions. Fixed RRR document/template codes and six digits preserved. |
| Relationships | Polymorphic IDs could point outside their project; deleting parents could orphan links/actions. | Authenticated server validation plus DB triggers for local links/evidence/actions. Local record links use IDs, external Procore references supported. Explicit deletes clean owned actions/outgoing links and preserve incoming references as metadata. Parent project transfers are rejected by 008 to preserve integrity. |
| UI | Mobile controls hidden; fake fixed sidebar progress; inconsistent pending/catch handling; font-family scope caused serif fallback. | Shared form feedback, refresh, mobile project/logout/naming access, fixed font variable scope/fallback, decorative fake progress removed. Navy/teal/MIR-based visual structure preserved. |
| Runtime | Existing safe Vite/hosting configuration and bundled PDF worker already worked. | Configuration retained, not rewritten unnecessarily. Empty SITE_URL falls back safely. Build/start tested as documented below; no ../../node_modules worker URL introduced. |
| Packaging/docs | README described old routes/metrics and suggested demo seed. | Revised setup, V2 routes, exact migration order, first-project workflow, privacy, shared-access limitations, manual checks; safe env placeholders; stronger generated-file ignore rules. |

## Database and RLS

New migration: **database/008_quality_integrity.sql**. 007 was already occupied by `007_project_context.sql`; it was not overwritten.

Order for a fresh database:

1. 001_initial_schema.sql
2. 003_procore_document_register.sql
3. 004_wir_integration.sql
4. 005_wir_pdf_metadata.sql
5. 006_quality_records_v2.sql
6. 007_project_context.sql
7. 008_quality_integrity.sql

Run each entire file in Supabase SQL Editor; on an existing database apply only unapplied files after backup. 002_seed.sql is optional fictional demo data, never required and not appropriate for production.

008 adds invoker-rights functions/triggers, no service-role path, and retains RLS. It does not update/delete existing data when applied. History UPDATE/DELETE is revoked for authenticated clients; explicit parent deletion still cascades its owned history. Migration creates future guards, not a retroactive cleanup of potentially inconsistent historical rows.

The established model intentionally shares project/quality records among all authenticated users. Anonymous access is denied and creator checks apply on inserts; profile edits are owner-only. This is not per-project membership isolation or role-based signing authority. Engineer/CxA/Employer decisions are structured fields, not authenticated electronic signatures. Expanding to multi-tenant or certified approval requires a separate access-design task.

Pre-007 compatibility allows base project creation with contractor/consultant empty and cookie selection. Full revised setup requires 007 (project metadata/persisted preference) and 008 (database integrity). Pre-008 app fallbacks are not atomic; they show explicit partial-initialization/history warnings. No seed dependence.

## Tests and evidence

| Test | Result / scope |
| --- | --- |
| Source pnpm install | Passed; PGlite added as a dev-only test dependency |
| Source lint / TypeScript | Passed, zero errors |
| Source production build | Passed; non-failing large-chunk/plugin-time warnings and Vinext static route-classification limitations remain |
| WIR verification | Passed: next number, duplicate validation, official code tables, all six supplied filename patterns, full pile descriptions and structured parser mappings |
| Procore verification | Passed with the original CSV supplied as an external argument: 205 rows, 204 structured patterns reproduced, 1 invalid row correctly detected, 0 duplicates |
| V2 verification | Passed: MIR/NCR/SOR/RRR sequences, fixed RRR identity, five readiness controls, 13 RLS table checks, browser-only import source checks |
| Revision verification | Passed: redirect path safety, missing/partial RR-4, declarations, P1 blockers, separate decisions/status agreement, paginated 1,201-row read and read-error behavior |
| Isolated database verification | Passed: seven migrations in order, empty database, first project under authenticated RLS, profile ownership, five-module CRUD, attendance/signatory/attachment metadata, links/actions, revision rollback, RRR gates and 24 rejection cases |
| Built worker runtime | pnpm start on port 3002: login 200; / and /wir 307 to login. Local-only; no deployment. Both test servers were stopped after checks. |
| Development runtime | pnpm dev started on local port 3001; all seven protected paths returned 307 to /login; login returned 200; legacy paths were also protected |
| Browser login | Rendered successfully; font correction visually verified; no captured browser error/warning logs |
| Hosted authenticated flows | Not performed: no authorized test Supabase browser session supplied. In-memory DB tests do not replace Auth/PostgREST/browser acceptance |
| Browser PDF/OCR via Codespaces HTTPS | Not performed in this environment. Parser/source/build checks pass; worker/OCR network/CSP behavior must be checked on the real forwarded origin |
| Destination validation / cleanup | Install, lint, TypeScript, build, V2, revision and isolated DB tests passed; generated files moved out after testing |

The first Procore command without a CSV argument reported usage; rerun with the supplied external CSV passed. No reference CSV was copied into the upload folder.

PGlite provides real in-memory PostgreSQL semantics with synthetic local Auth roles/users. The test removes only the pgcrypto extension statement from the in-memory SQL execution because core gen_random_uuid is available; it never changes migration files. It never loads secrets or connects to Supabase. Hosted behavior, PostgREST schema cache, network issues and concurrent race conditions are not covered by this harness.

## PDF privacy

Browser imports parse filename then PDF text/OCR and retain editable structured values. No source PDF/DOCX bytes, base64, blob or full extracted text is sent to Supabase. File input and workers/buffers are cleaned after extraction; source/generated filenames are metadata only. PDF.js source is bundled by Vite and instantiated as a temporary module Blob worker, avoiding file:///node_modules paths. Tesseract remains local, may download runtime/language assets, and does not upload the document. Limit: 60 MB / first seven pages. No speculative OCR mappings were added for other modules.

## Exact source file changes

### Added

- `app/actions/record-links.ts`
- `components/quality-records/action-form.tsx`
- `components/quality-records/child-editor.tsx`
- `components/quality-records/record-links.tsx`
- `components/shared/project-required.tsx`
- `database/008_quality_integrity.sql`
- `docs/revision-audit.md`
- `lib/auth-redirect.ts`
- `lib/project-context.ts`
- `lib/project-preference.ts`
- `lib/quality-records/rrr-gate.ts`
- `lib/services/read-all.ts`
- `lib/services/record-links.ts`
- `scripts/verify-database.ts`
- `scripts/verify-revision.ts`

### Updated

- `.env.example`
- `.gitignore`
- `README.md`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/mir/[id]/page.tsx`
- `app/(dashboard)/mir/page.tsx`
- `app/(dashboard)/ncr/[id]/page.tsx`
- `app/(dashboard)/ncr/page.tsx`
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/projects/page.tsx`
- `app/(dashboard)/reports/page.tsx`
- `app/(dashboard)/rrr/[id]/page.tsx`
- `app/(dashboard)/rrr/page.tsx`
- `app/(dashboard)/sor/[id]/page.tsx`
- `app/(dashboard)/sor/page.tsx`
- `app/(dashboard)/wir/[id]/page.tsx`
- `app/(dashboard)/wir/page.tsx`
- `app/actions/quality-records.ts`
- `app/actions/records.ts`
- `app/auth/confirm/route.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/login/actions.ts`
- `components/crud/crud-manager.tsx`
- `components/layout/navbar.tsx`
- `components/layout/project-selector.tsx`
- `components/layout/sidebar.tsx`
- `components/quality-records/action-tracker.tsx`
- `components/quality-records/quality-record-manager.tsx`
- `components/quality-records/rrr-workspace.tsx`
- `database/README.md`
- `docs/README.md`
- `lib/quality-records/form-config.ts`
- `lib/quality-records/model.ts`
- `lib/services/inspections.ts`
- `lib/services/ncrs.ts`
- `lib/services/projects.ts`
- `lib/services/quality-dashboard.ts`
- `lib/services/quality-records.ts`
- `lib/services/shared.ts`
- `lib/wir/pdf-extraction.client.ts`
- `package.json`
- `pnpm-lock.yaml`

### Removed

None. Old SQL/source/reference data and original .env.local were preserved. Generated files are removed only from the GitHub-ready copy after its tests.

## Packaging result

Destination: `C:/Users/ugur.kurt/Desktop/Github/QAQC-Tracker-GitHub`.

- 215 included files: 15 added, 43 updated, 157 unchanged compared to the pre-sync destination. No source files removed. Added/updated lists match the source change lists above.
- Source/destination file SHA-256 comparison: zero mismatches after synchronization.
- All source candidates scanned for private-key/token/JWT signatures and exact non-local environment values without printing values: no matches found.
- No .env.local, .env, credential files, PDF/DOCX/XLS/XLSX/CSV reference exports, eng.traineddata, logs, Git metadata, dependencies or build/cache output included.
- Placeholder-only .env.example, safe .openai/hosting.json, package.json, pnpm-lock.yaml and migrations 006/007/008 are present.
- Runtime data/procore JSON retained intentionally. No reference/source exports copied.
- Destination pnpm install, lint, tsc --noEmit and build passed without any real environment file. Additional verify:v2, verify:revision and verify:database passed.
- Generated node_modules, dist, .next, .vinext, .wrangler, next-env.d.ts and tsconfig.tsbuildinfo were removed from the destination by moving them to a recoverable temporary directory. Direct deletion was blocked by the environment. They can be regenerated; no source files were removed.
- Recoverable test output: `C:/Users/ugur.kurt/AppData/Local/Temp/qaqc-upload-validation-ef567b55391d4ac797916db2e59c1d50`.
- Final logical folder size: 2215279 bytes (source/config/documentation only).
- Safe as the requested clean GitHub-upload copy, subject to your normal review of intentionally included project naming/reference JSON. This is not a claim of live production acceptance.

Top-level contents:

```text
QAQC-Tracker-GitHub/
  .openai/hosting.json
  app/
  components/
  data/
  database/
  docs/
  hooks/
  lib/
  public/
  scripts/
  types/
  .env.example
  .gitignore
  .oxfmtrc.json
  .oxlintrc.json
  components.json
  next.config.ts
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  proxy.ts
  README.md
  tsconfig.json
  vite.config.ts
```

## Manual acceptance checklist

1. Back up your Supabase database. Review and run only unapplied migrations, through 008. Do not rerun 002 or old migrations on real data.
2. For a clean clone, copy .env.example to ignored .env.local, supply public Supabase values, set the real SITE_URL and configure Supabase confirmation redirects.
3. Run pnpm install and pnpm dev. Sign in with an authorized test account.
4. With no projects, use Create Project; enter your real name/code/employer/location and optional contractor/consultant. Verify the first project appears in the header and selector. Create/switch a second disposable project and confirm five registers and Dashboard/Reports follow selection.
5. In the IL051 test project, create WIR.0001, MIR.0001, NCR.0001, SOR.0001 and RRR.000001. View, edit and delete disposable records only. Confirm duplicate identifiers/full codes are rejected and legacy records remain available.
6. For WIR, verify the core ends at originator and revision/title stay separate. Test both digital and scanned PDFs over the actual forwarded HTTPS URL; inspect browser Network and Supabase to confirm only structured Save payloads and no PDF upload.
7. For NCR/SOR, add an action, mark In Progress, then Verified/Closed with a note/date. Check live action/overdue counts.
8. For RRR, complete RR-1–4, add/correct tags/evidence/attendance/signatories/metadata attachments; add P1/P2 and prove release is blocked. Close blockers, finish declarations and separate Engineer/CxA decisions, then match Employer release/status. Energization must fail without referenced/signed L2B. Resubmit with a new revision; confirm old history is immutable. Reopening a released gate must be rejected.
9. Verify zero-data and error states on the actual hosted database, and responsive protected pages with your authenticated session.
10. Upload only the clean folder contents to GitHub when ready. This revision does not create a repository, commit, push or deploy.

Intentionally deferred: live hosted authenticated acceptance, forwarded HTTPS PDF/OCR tests, concurrency/load testing, project memberships/role-restricted approvals, richer local-record pickers (local links currently accept UUIDs), a complete immutable audit trail, server-side register filtering/pagination, and automatic Procore API sync.
