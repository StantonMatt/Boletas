# Boletas

Boletas is a browser-based utility invoice PDF generator for small water and
sanitation operators in Chile.

The app accepts an Excel workbook exported from the billing workflow, maps each
customer row into a formatted invoice, and produces a multi-page PDF using a
fixed template. It is designed for maintainers who need a transparent,
inspectable way to generate monthly utility boletas without sending customer
data to a server.

Live app: https://stantonmatt.github.io/Boletas/

## What It Does

- Reads `.xlsx` and `.xls` billing sheets in the browser.
- Lets operators generate all invoices or only selected customer numbers.
- Supports comma-separated customer selections and numeric ranges.
- Preserves billing-period and folio rules for monthly utility workflows.
- Injects per-customer notices and notice colors into generated PDFs.
- Renders utility-consumption fields including water, sanitation, subsidies,
  prior balances, discounts, reconnection charges, and totals.
- Generates the final PDF client-side with `pdf-lib`.

## Why This Is Open Source

Small utility providers often depend on fragile spreadsheets, manual PDF edits,
and locally maintained billing rules. This repository keeps that workflow
auditable: operators can inspect the source, verify the billing rules, adapt the
template, and run the generator from a static GitHub Pages deployment.

The project is maintained as practical infrastructure for a real-world billing
workflow. Recent maintenance has focused on deployment reliability, asset
handling, period/folio correctness, PDF output size, and field-level billing
changes.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

The production build is published to GitHub Pages from the `dist` directory.

## Maintainer Workflows

Ongoing maintenance includes:

- reviewing billing-rule changes before monthly invoice runs;
- validating Excel parsing against new workbook exports;
- checking generated PDF layout after template changes;
- keeping browser build tooling and dependencies current;
- reducing generated PDF size without losing required invoice fields;
- auditing public assets and client-side data handling.

These are the workflows where Codex and API credits would reduce maintainer
load: regression-test generation, PR review, release checklists, dependency
updates, and privacy/security review for a client-side billing tool.

## License

ISC
