# Procore reference data

These JSON files were generated from `Documents - All Documents (10).csv` with:

```bash
node scripts/generate-procore-reference.mjs "C:\path\to\Documents.csv"
```

The files contain normalized code/label/count reference values, detected numbering patterns, naming-slot evidence, the EAS-6-B segment grammar, a complete grouped comparison, and a compact source summary. They intentionally do not copy personnel assignments, the full source CSV, or the official workbook into the repository.

- `eas6b-segment-rules.json` defines the official eight-segment document reference, four additional electronic-filename segments, combined subfields, optionality, and document-type applicability.
- `procore-pattern-comparison.json` accounts for every structured Procore Name and records where project practice differs from EAS-6-B.
- `eas6b-file-types.json`, `eas6b-disciplines.json`, `eas6b-levels.json`, `eas6b-plan-areas.json`, `eas6b-volumes.json`, `eas6b-classifications.json`, and `eas6b-originators.json` contain the official workbook code tables used by the WIR form.

Important source observations:

- 205 rows were parsed; 204 contain an eight-part structured document code.
- The dominant naming prefix is `IL051` (203 structured records); `IL05` occurs once as a valid alias.
- The fifth code segment is a naming/location slot and does not always equal the exported `Location` field.
- The sixth segment matches `Volume / System` for all structured records.
- Five Names contain suffix text after the eight-part core.
- One Name is free text and is rejected by the safe importer.

Imported `Name` values remain authoritative. Official deviations are reported instead of silently rewriting historical Procore identifiers. Regenerate the CSV-derived files before importing an export that introduces new codes or numbering formats.
