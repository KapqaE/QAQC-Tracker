# QAQC Tracker documentation

## Product decisions

- The original navy/teal engineering dashboard theme is preserved.
- Supabase is the only application source of truth; mock data was removed.
- Server Components read data and Server Actions perform validated mutations.
- Shared MVP records are available to all authenticated users through explicit RLS policies.
- Overdue state and dashboard activity are derived rather than stored.
- Document storage is deferred; Procore CSV import stores metadata only and `file_path` remains nullable.
- Procore naming is source-derived and read-only; imported `Name` values remain authoritative.

## Route map

- `/` — live dashboard
- `/login` — sign in and signup
- `/projects` — project CRUD
- `/wir` and `/wir/[id]` — WIR register and structured inspection detail; `/inspections` redirects here
- `/mir` and `/mir/[id]` — material inspection register and detail
- `/ncr` and `/ncr/[id]` — NCR register, action tracker and detail; `/ncrs` redirects here
- `/sor` and `/sor/[id]` — separate site observation register and actions
- `/rrr` and `/rrr/[id]` — room readiness register and relational workspace
- `/punch-list` — punch-list CRUD and overdue visibility
- `/documents` — Procore-style document register and generated-code CRUD
- `/documents/import` — safe Procore CSV validation, preview, and metadata import
- `/reports` — live management summary
- `/settings` — authenticated account and security summary
- `/settings/naming-convention` — read-only naming structure and code masters

See [revision-audit.md](revision-audit.md) for the revision findings, exact file changes, automated verification, packaging results and outstanding manual acceptance checklist. See the root README for the supported migration order through 008.
