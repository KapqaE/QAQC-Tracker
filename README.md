# QAQC Tracker

An authenticated construction-quality workspace for projects, WIR, MIR, NCR, SOR, RRR (Room Readiness Requests), controlled document metadata, dashboards and reports. Legacy punch-list records remain available. This is a collaborative MVP, not a certified approval or handover system.

## Stack and structure

React 19, TypeScript 5 (strict), Tailwind 4, shadcn/ui, Zod, Supabase Auth/PostgreSQL/RLS, and Vinext 1 beta on Vite 8 with a Cloudflare-compatible local runtime. Server Components read through services; authenticated Server Actions validate changes. The existing Sites integration remains, with safe `.openai/hosting.json`: `{"d1":null,"r2":null}`.

- `app/`: protected routes, authentication and server actions.
- `components/`: shared forms, registers, details, layout and status UI.
- `lib/`: services, project context, naming, WIR browser extraction and readiness rules.
- `database/`: ordered SQL migrations; never run demo seed on production.
- `data/procore/`: runtime code tables and derived naming rules; keep these JSON files.
- `scripts/`: offline verification and optional reference regeneration.
- `docs/revision-audit.md`: findings, changes, test evidence and outstanding acceptance checks.

## Install and configure

Use Node.js 22.13+ and pnpm (validated with Node 24 and pnpm 11). From the project folder:

```sh
pnpm install
```

Copy `.env.example` to `.env.local` and replace placeholders:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Only use the public anon/publishable client key here. Never use a service-role key. Never commit `.env.local`; it is ignored. Restart the server after environment changes. The upload-ready copy intentionally contains no working credentials.

## Supabase migrations

In Supabase SQL Editor, run each complete file once, in this order, against the intended database. For an existing database, apply only unapplied migrations after taking a backup:

1. `database/001_initial_schema.sql`
2. `database/003_procore_document_register.sql`
3. `database/004_wir_integration.sql`
4. `database/005_wir_pdf_metadata.sql`
5. `database/006_quality_records_v2.sql`
6. `database/007_project_context.sql`
7. `database/008_quality_integrity.sql`

`002_seed.sql` is **optional demo data only**. It is not needed for startup, accounts, projects, numbering, or empty states. Do not run it against production data.

007 already existed before this revision. It adds contractor/consultant fields and saved active-project preference. 008 adds relation validation, atomic new RRR controls/revision history, append-only revision history and release guards. It does not rewrite or delete existing records when applied. No migration is applied automatically by the application or verification scripts.

With only 001 and 003–006 applied, base project creation with empty contractor/consultant fields can work and selection is remembered in a cookie. Apply 007 to save those fields and persist selection across devices. Apply 008 for database-enforced release and relationship integrity. Use the full order above for the supported revised setup.

## Authentication

Email/password sign-in and the existing Create account UI are preserved. Public signup is governed by Supabase Auth settings; disable it there for an invite-only workspace. Server checks use `auth.getUser()`; anonymous users cannot read protected records.

Set Supabase Auth Site URL and allowed confirmation redirect to your actual development origin and `/auth/confirm`. For Codespaces, use the forwarded HTTPS origin instead of localhost. If email confirmation is enabled, use a token-hash confirmation link compatible with the server callback:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm email</a>
```

Confirm email when required, then sign in. There is no dependency on seeded users. Authenticated users share this workspace's project and QA/QC records under the existing RLS model; this is **not tenant-isolated or role-separated authorization**. Profiles are self-editable, notifications are user-scoped, and record creators are derived from the verified session. Do not treat the Engineer/CxA/Employer fields as role-restricted digital signatures.

## Create the first project

1. Sign in, then click **Create Project** on the empty dashboard/header, or open **Projects**.
2. Enter project name/code, employer, location and optional contractor, consultant and description.
3. Save. The first project becomes active automatically; its name/code appears in the header.
4. Use the header selector to switch projects or create another. Dashboard, Reports and all five quality registers follow that selection.

Example values are placeholders, not compulsory defaults: IL05.1 Istanbul Data Center / IL051 / EQUINIX / SERBAN CONSTRUCTION CO. / ARUP / Istanbul.

The supplied official naming tables are project-specific to IL051 (IL05 maps to IL051). Other project records may be managed, but do not invent official codes for a new project without approved naming configuration. RRR uses the supplied IL051 template only. Documents retain explicit target-project selection.

## Modules and identities

| Module | Identity and workflow |
| --- | --- |
| WIR | `WIR.0001`; eight-part EAS-6-B code; inspection, references and engineer result |
| MIR | `MIR.0001`; material receipt, delivery/traceability, review and disposition |
| NCR | `NCR.0001` for new records; legacy identifiers preserved on edit; root cause, actions and closeout |
| SOR | `SOR.0001`; separate observation, contractor proposal, actions and closeout |
| RRR | `RRR.000001`; six-digit identity, fixed CDE code `IL051-RP-G-RRR`, template `SBI-EQIL5-KLT-FR-RRR` |

Canonical routes are `/wir`, `/mir`, `/ncr`, `/sor`, `/rrr`, with `/[id]` details. Legacy `/inspections` and `/ncrs` redirect. Registers provide create/edit/delete, filters and explicit feedback. Later review/closure fields are not mandatory at initial creation.

NCR/SOR/RRR actions have description, responsible person, due date, Open/In Progress/Verified/Closed status, completion date and verification note. Completing an action requires verification. Related-record panels support local record IDs or external Procore references. Local relationships must remain within the same project.

RRR keeps RR-1 through RR-4 controls, tags, open items, evidence, attendance, declarations, signatories, metadata-only attachments and revision history. Use each row's **Edit** disclosure to correct child records or close blockers. For resubmission, change the submission revision to a new value; history is appended atomically with migration 008.

Release requires complete RR-4, no open P1/P2, declarations, separate Engineer verification and CxA acceptance, and matching Employer release/status. Energization additionally requires referenced and signed L2B tags. After release, changes that would invalidate the gate are rejected; return the record and Employer decision to a non-released state before revising the gate. Readiness does not constitute handover, operational acceptance or automatic energization.

## WIR PDF privacy and naming

WIR PDF prefill is entirely browser-side using PDF.js and Tesseract.js. Filename metadata is parsed first; PDF fields fill remaining values, with conflicts shown for manual correction. The PDF's inspection item and pile numbers are retained. Only explicit Save submits structured fields.

```text
Document code: IL051-IP-S-WIR.0015-XX-XX-XXXX-SRB
Revision: R00
Inspection item: Bored Piling Works (2-5-8-26-28)
Filename metadata: IL051-IP-S-WIR.0015-XX-XX-XXXX-SRB-R00-WIR Bored Piling Works (2-5-8-26-28).pdf
```

Revision/title are not document-code segments. No PDF bytes, blobs, base64 or source text are uploaded to Supabase or permanently stored. Workers, temporary buffers and file inputs are cleaned after extraction. OCR scans up to seven pages, including page one. Current limit: 60 MB. OCR is fallible; always review editable values. OCR runtime/language assets may be downloaded from third-party CDNs, but document bytes are processed locally. A restrictive CSP must allow the worker/runtime assets and blob workers. HTTPS-forwarded browser behavior still requires environment-specific acceptance testing.

No automatic MIR/NCR/SOR/RRR OCR mappings were added. Attachments are references/metadata only. There is no Procore API synchronization: the document register imports user-selected CSV metadata and skips duplicates. Reference PDF/DOCX/Excel/CSV files are not distributed; derived runtime JSON is retained intentionally.

## Run and verify

```sh
pnpm dev
pnpm run lint
pnpm exec tsc --noEmit
pnpm run verify:wir
pnpm run verify:v2
pnpm run verify:revision
pnpm run verify:database
pnpm run build
pnpm start
```

Dev normally serves port 3000. `pnpm start` runs the built worker locally using Wrangler and `dist/server/wrangler.json`; it does not deploy. The optional CSV check is:

```sh
pnpm run verify:procore "C:/path/to/Documents.csv"
```

`verify:database` runs migrations and CRUD/RLS/gate cases in an isolated in-memory PostgreSQL engine (PGlite), with an Auth-role shim. It never loads `.env`, contacts Supabase or modifies application data. It is not a replacement for testing hosted Auth/PostgREST or concurrent transactions.

Dashboard/Reports use real active-project Supabase rows; paginated reads avoid the default response cap. Empty tables produce zeros. Unavailable tables produce error feedback. Module status terminology remains distinct. Room-ready metrics require actual release decisions and complete gates, not a generic Approved flag.

## GitHub and acceptance

The clean `QAQC-Tracker-GitHub` folder contains source, configuration, all migrations, runtime JSON and placeholder environment example only. Install dependencies after cloning. No Git repository is initialized and nothing is committed, pushed or deployed by this revision.

Do not upload generated dependencies, dist/build/cache output, OCR language files, logs, credentials or reference exports. Keep `.openai/hosting.json` and `data/procore/*.json`.

Before production use, test an authenticated fresh database end-to-end: first-project creation/selection; create, view, edit and delete disposable records in all five modules; RRR blocker closure and release; duplicate rejection; and digital/scanned PDF extraction over the real forwarded HTTPS URL. The audit report distinguishes completed automated tests from these outstanding checks.

Known scope limits: shared authenticated access (no project memberships), client-side filtering over fully loaded registers, beta Vinext runtime, no immutable full audit log or signature authorization, no Procore API sync, and no source-document storage. These require separate product/security decisions, not silent migration changes.
