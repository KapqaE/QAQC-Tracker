# QAQC Tracker

QAQC Tracker is an authenticated quality-records workspace for construction and data-center projects. It manages structured quality records, controlled document metadata, readiness gates, actions, reviews, and closeout using Supabase.

## Main modules

- Dashboard — live Supabase metrics, recent records, actions, and room-readiness status
- WIR — Work Inspection Requests with EAS-6-B codes and browser-only PDF/OCR pre-fill
- MIR — Material Inspection Requests, traceability, compliance, review, and release
- NCR — Non-Conformance Reports, corrective action, verification, and closeout
- SOR — Site Observation Reports, responses, actions, and assessment
- RRR — Room Readiness Requests with RR-1 through RR-4 controls and release gates
- Documents — controlled document register and local Procore CSV preview/import
- Reports — project quality reporting views

## Technology

- React 19, TypeScript, and Tailwind CSS
- Next.js App Router APIs through the Vinext/Vite runtime
- Supabase Auth, PostgreSQL, Data API, and Row Level Security
- Zod validation and authenticated server actions
- PDF.js and Tesseract.js for temporary browser-side WIR extraction

## Requirements

- Node.js 22.13 or newer
- pnpm
- A Supabase project

## Install

```bash
pnpm install
```

## Environment setup

Copy `.env.example` to `.env.local` and replace the placeholders with your own public Supabase settings:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Only use the public/anon key. Never expose a Supabase service-role key to this application.

Do not commit `.env.local`; it is excluded by `.gitignore`.

## Development

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Validation and production build

```bash
pnpm run lint
pnpm exec tsc --noEmit
pnpm run build
```

Optional project verification:

```bash
pnpm run verify:wir
pnpm run verify:v2
pnpm run verify:procore "C:\path\to\Documents.csv"
```

The Procore CSV is selected from your local computer and is not included in this repository.

## Supabase setup

For a new Supabase database, run these files from the SQL Editor in order:

1. `database/001_initial_schema.sql`
2. `database/003_procore_document_register.sql`
3. `database/004_wir_integration.sql`
4. `database/005_wir_pdf_metadata.sql`
5. `database/006_quality_records_v2.sql`

If the existing database already has migrations `001`, `003`, `004`, and `005`, run only `006_quality_records_v2.sql`.

`database/002_seed.sql` is optional fictional demo data. Run it only after creating an application user, and never run it against production or a real project dataset.

Configure the Supabase authentication Site URL and add `/auth/confirm` to the allowed redirect URLs. The application uses server-readable token-hash confirmation links and protected cookie sessions.

## Import privacy

WIR PDF extraction runs in the browser. PDF.js and the Tesseract.js OCR fallback use the selected file temporarily to pre-fill editable fields. The source PDF, its bytes, blobs, base64 content, and OCR working data are discarded and are not uploaded to Supabase Storage or stored in the database.

The Procore import stores validated structured document metadata only. Original Procore exports and reference PDFs, DOCX, XLSX, and CSV files are intentionally not included in this repository.

## Security notes

- Protected routes require a valid Supabase session.
- Server actions resolve the current authenticated user server-side.
- Database migrations enable RLS and revoke anonymous table access.
- `.env`, `.env.local`, generated output, caches, logs, and local reference files are excluded from Git.
- The application does not require a Supabase service-role key.

## Repository structure

```text
app/          routes, layouts, authentication, and server actions
components/   reusable UI, registers, forms, and record workspaces
data/         runtime naming/code reference JSON
database/     schema, additive migrations, and optional demo seed
docs/         project documentation placeholders
hooks/        shared React hooks
lib/          Supabase services, naming, parsing, and validation
public/       public runtime assets
scripts/      verification and reference-generation utilities
types/        application and database TypeScript types
```

No Git repository is initialized by this folder-creation process. Initialize and publish it only when you are ready.
