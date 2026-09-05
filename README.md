# QAQC Tracker

QAQC Tracker is a production-style MVP for construction and data-center quality teams. It provides one authenticated workspace for projects, inspections, non-conformance reports, punch items, controlled document metadata, deadlines, and closeout reporting.

## Features

- Email/password authentication and signup with Supabase Auth
- Server-side route protection with refreshed cookie sessions
- Automatic profile provisioning from `auth.users`
- Supabase PostgreSQL schema with UUID keys, relationships, indexes, and timestamps
- Row-level security on every application table
- Project, WIR/inspection, NCR, punch-list, and document-metadata CRUD
- Required-field validation, duplicate-submit protection, delete confirmation, and feedback states
- Search and status/project/discipline filtering where relevant
- Live dashboard metrics, NCR status chart, inspection summary, recent activity, and deadlines
- Dynamic overdue NCR and punch-item calculation
- CSV-derived Procore code master data and document naming engine
- Safe Procore CSV preview/import with required-column validation and duplicate skipping
- Live generated document codes, type-specific number validation, and WIR next-number assistance
- Structured WIR fields, project-scoped next-number assistance, live full-code generation, and automatic matching-document linkage
- Responsive enterprise dashboard UI with loading, error, setup, and empty states

## Screenshots

Add product screenshots to `docs/` after connecting a Supabase project and loading the demo dataset.

## Architecture

The application uses Next.js App Router conventions through the existing Vinext/Vite Sites runtime. Server Components load protected data through reusable services; Server Actions validate and mutate records; `@supabase/ssr` shares the Supabase Auth session between browser, proxy, Server Components, and actions.

```text
app/
  (dashboard)/       protected pages and shared application layout
  actions/           authenticated Server Actions
  auth/confirm/      email confirmation callback
  login/             sign-in and signup experience
components/
  crud/              reusable CRUD table, filters, forms, and dialogs
  dashboard/         live dashboard summaries
  documents/         Procore register, naming form, and CSV import UI
  inspections/       project WIR register, structured form, and code preview
  layout/            sidebar, navbar, and account controls
lib/
  procore/           naming, CSV parsing, source-derived master data, and validation
  services/          Supabase data-access layer
  supabase/          browser, server, proxy, and environment helpers
database/
  001_initial_schema.sql
  002_seed.sql
  003_procore_document_register.sql
  004_wir_integration.sql
data/procore/         generated code/label reference JSON
scripts/              repeatable Procore reference generation and CSV verification
types/               database-safe and product TypeScript types
```

## Technology stack

- React 19 with Next.js App Router APIs
- TypeScript 5 in strict mode
- Tailwind CSS 4 and shadcn/ui primitives
- Supabase Auth, PostgreSQL, Data API, and RLS
- `@supabase/ssr` for cookie-based server rendering
- Zod for Server Action validation
- Recharts for dashboard visualization
- Vinext/Vite Cloudflare Worker-compatible runtime inherited from the existing project

## Supabase Setup

### 1. Create a Supabase project

Create a project at [database.new](https://database.new) and wait for provisioning to finish.

### 2. Copy the public API values

In the Supabase dashboard, open **Project Settings → API** (or the project **Connect** panel) and copy:

- Project URL
- Public/anon key

Never use the service-role key in this application or expose it through a `NEXT_PUBLIC_` variable.

### 3. Create `.env.local`

Copy `.env.example` to `.env.local` and add:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

`.env.local` is ignored by Git. Restart the development server whenever these values change.

### 4. Run the database schema

Open **SQL Editor** in Supabase, paste the entire contents of `database/001_initial_schema.sql`, and run it once. This creates:

- `profiles`
- `projects`
- `inspections`
- `ncrs`
- `punch_items`
- `documents`
- `notifications`
- profile and updated-at triggers
- indexes, grants, and RLS policies

Then run migrations `003` through `007` in filename order. Migration `007_project_context.sql` adds contractor and consultant fields to projects and stores each authenticated user's active-project selection. All migrations are additive and preserve existing records. `database/002_seed.sql` is optional demo data and should not be run against production data.

### 5. Configure authentication

In **Authentication → URL Configuration**:

- Set the Site URL to `http://localhost:3000` for local development.
- Add `http://localhost:3000/auth/confirm` as an allowed redirect URL.

In **Authentication → Email Templates → Confirm signup**, replace the confirmation link with this server-readable token-hash link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Confirm your email</a
>
```

This template change is required for cookie-based SSR authentication. The default confirmation URL can return the session in a URL fragment, which is not available to the server callback.

Email/password auth is enabled by default on most Supabase projects. If email confirmation is enabled, new users must follow the confirmation email before signing in. The `handle_new_user` database trigger creates the matching profile.

### 6. Create the first account

Start the application, open `/login`, choose **Create account**, and register the first QA/QC user. Confirm the email if required.

### 7. Load demo data

After at least one profile exists, run `database/002_seed.sql` from the SQL Editor. It assigns the fictional IST Data Center Expansion records to the earliest real profile; it does not use a fake auth UUID.

## Procore document register

The source export `Documents - All Documents (10).csv` contains 205 records. The detected eight-part core is:

```text
Project-Type-Discipline-Number-LocationSlot-Volume/System-Classification-Originator
```

Imported `Name` values remain authoritative. The importer takes the first eight hyphen-delimited segments as `document_code` and preserves the full original name separately. This matters because the source contains valid suffixes, legacy three-character classification slots, several observed location-slot variants, and one invalid free-text Name.

Reference values are generated under `data/procore/`. To regenerate them from a future export:

```bash
node scripts/generate-procore-reference.mjs "C:\path\to\Documents.csv"
```

Use `/documents/import` to select a CSV, validate required columns, preview rows, choose the target QAQC project, and import metadata. Existing document codes and duplicates inside the CSV are skipped by default. The import never uploads referenced PDF files and never calls the Procore API.

Manual document creation is available from `/documents`. Project codes must map to the source project's observed `IL05`/`IL051` identity. The generated code is read-only, number formats are validated by document type, and a unique database index provides the final duplicate guard.

## WIR / inspections

The existing `/inspections` route is the project WIR register; there is no separate WIR application. New records use official EAS-6-B discipline, level, plan-area, volume, classification, and originator tables. `IP` is fixed as the file type and `WIR.####` remains one Segment 4 value.

The form suggests the next project WIR number, displays the eight generated segments before save, rejects duplicate WIR numbers and full codes, and links an existing Procore document with the same code. Legacy inspections remain visible and are converted to the structured WIR shape only when edited and saved.

WIR PDF pre-fill is browser-only. Digital text or scanned-page OCR is processed in temporary memory, the file input and extraction workers are cleared after every attempt, and neither PDF bytes, base64 content, file metadata, nor Storage objects are sent to Supabase. Only the corrected structured form fields are submitted when the user explicitly saves the WIR.

## Installation and development

The repository currently uses a pnpm lockfile:

```bash
pnpm install
pnpm dev
```

The requested npm commands are also available:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Other useful commands:

```bash
pnpm run verify:procore "C:\path\to\Documents.csv"
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
```

## Authentication and authorization

- `proxy.ts` refreshes Supabase cookies and redirects unauthenticated application requests to `/login`.
- Protected layouts verify the current user again on the server.
- Server Actions never accept a creator/user ID from the browser; they use the verified session user.
- PostgreSQL RLS denies anonymous access.
- For this collaborative MVP, authenticated users can manage shared QA/QC project records. Notifications remain user-scoped, and profiles are self-editable only.

## Dashboard calculation

Completion percentage is:

```text
(closed NCRs + closed punch items) / (all NCRs + all punch items) × 100
```

The result is `0%` when there are no quality items. Overdue items are calculated at read time when `due_date` is before today and status is not `Closed`; overdue is not stored as a status.

## Security checklist

- No service-role key is used or committed
- `.env.local` and all `.env*` files are ignored
- Anonymous database access is revoked
- RLS is enabled for all seven application tables
- Auth identity is verified server-side
- Mutations use Zod validation and safe user-facing errors
- Procore CSV rows are revalidated on the server before insertion
- Duplicate document codes are blocked in the UI, Server Action, and PostgreSQL unique index
- File paths are metadata-only until Supabase Storage is implemented

## Current limitations

- Document file upload and Supabase Storage are intentionally deferred.
- Authenticated users share one collaborative data scope; project membership and role permissions are not implemented yet.
- Recent activity is derived from record timestamps rather than a dedicated audit log.
- Notification generation and read-management workflows are not automated yet; the navigation displays unread stored notifications.
- Register filtering is performed on the loaded MVP dataset; server-side pagination is a future scalability step.
- Naming reference data reflects the supplied CSV snapshot and must be regenerated when new Procore codes are introduced.
- Direct Procore API authentication and synchronization are intentionally not implemented.

## Roadmap

1. Add organizations, project membership, and role-based RLS.
2. Add Supabase Storage document uploads with file validation and signed URLs.
3. Add an administrator-approved workflow for changing naming rules and code masters.
4. Add direct Procore API synchronization after CSV workflows are accepted.
5. Add audit-log events, automated notifications, pagination, and broader integration tests.
