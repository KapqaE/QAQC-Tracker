# QAQC Tracker database

Run the files in order from the Supabase SQL Editor:

1. `001_initial_schema.sql` creates tables, relationships, indexes, triggers, and RLS policies.
2. `003_procore_document_register.sql` adds the Procore register fields and inspection relationship without removing existing data.
3. `004_wir_integration.sql` adds structured WIR fields, safe backfills, validation constraints, and duplicate-protection indexes without removing existing inspections.
4. `005_wir_pdf_metadata.sql` adds Procore filename metadata and locally extracted WIR form fields. It stores no PDF content.
5. `006_quality_records_v2.sql` adds the MIR, SOR and RRR registers, extends NCR additively, and creates action, readiness, evidence, attendance, signatory, revision and cross-record link tables with RLS. It does not store source document bytes.
6. Create at least one application user through `/login` so the profile trigger runs.
7. `002_seed.sql` optionally loads the fictional IST Data Center Expansion dataset and attributes it to the earliest profile. Skip this file when preserving a real project dataset.

The application uses the authenticated user's anon-key session. A service-role key is not required by the application and must never be exposed to the browser.
