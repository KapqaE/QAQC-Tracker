# QAQC Tracker database

Run the files in order from the Supabase SQL Editor:

1. `001_initial_schema.sql` creates tables, relationships, indexes, triggers, and RLS policies.
2. `003_procore_document_register.sql` adds the Procore register fields and inspection relationship without removing existing data.
3. `004_wir_integration.sql` adds structured WIR fields, safe backfills, validation constraints, and duplicate-protection indexes without removing existing inspections.
4. `005_wir_pdf_metadata.sql` adds Procore filename metadata and locally extracted WIR form fields. It stores no PDF content.
5. `006_quality_records_v2.sql` adds the MIR, SOR and RRR registers, extends NCR additively, and creates action, readiness, evidence, attendance, signatory, revision and cross-record link tables with RLS. It does not store source document bytes.
6. `007_project_context.sql` adds contractor and consultant project fields plus each user's active-project preference. Existing project and profile RLS remains unchanged.
7. `008_quality_integrity.sql` adds same-project relation checks, atomic RRR initialization/revision history and release guards. It preserves existing rows and RLS. History becomes append-only for authenticated clients. Explicit record deletion cleans owned actions and preserves incoming links as external references.
8. Create an application user through the existing `/login` account flow or your administrator's Supabase process. Create the first project in the UI; no seed data is needed.

`002_seed.sql` is optional fictional demo data only. Do not run it against production data. For an existing database, back up first and apply only unapplied migrations. None of these files is applied automatically by the app. Existing migrations 001–007 have not been rewritten by the revision.

`pnpm run verify:database` validates the ordered migrations and CRUD/RLS/release cases in isolated in-memory PostgreSQL, without connecting to Supabase. Hosted Auth/PostgREST and concurrency acceptance checks remain separate.

The application uses the authenticated user's anon-key session. A service-role key is not required by the application and must never be exposed to the browser.
