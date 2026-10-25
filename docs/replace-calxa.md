# Replace the Calxa group management reporting workflow

Checked 25 October 2026 against Calxa's [export guide](https://helpme.calxa.com/en/articles/5272402-budgets-scenarios-export) and [spreadsheet formats](https://helpme.calxa.com/en/articles/5272404-import-budgets-file-formats-options).

## Export and establish the basis

In Calxa, open Budgets & Cashflow, then Budgets & Actuals, Budget Tools and Export. Select the organisation and Actuals or the required budget version. Choose a monthly CSV at organisation level. Export each entity and version separately. Keep the untouched original. Calxa's documentation explains that formulas export as calculated values; formulas and comments are outside this importer.

This importer accepts debit-positive signs only and requires closing balance-sheet amounts, with income values on the same trial-balance basis. Check the exported values against the source ledger. If an export has natural-positive income or monthly balance-sheet movements, prepare a reconciled copy first. The mandatory flags record your assertion; software cannot deduce the accounting basis from a CSV. Do not import a report's display totals alongside its underlying accounts.

## Set up once

Use an empty DATA_DIR without DATABASE_URL, or a controlled empty PostgreSQL database. Run npm run migrate, add-entity for each group company and add-period for each exported month. Review the group currency before your first import; the supplied base is NZD and changing it is a migration through /customise. Use add-group-account to define the group chart.

```bash
npm run group -- add-entity --code=NZ --name="Example NZ" --currency=NZD --owner="Finance owner" --actor="Finance owner"
npm run group -- add-period --code=2026-09 --name="September management close" --due=2026-10-10 --actor="Finance owner"
npm run group -- import calxa --entity=NZ --file=imports/actuals.csv --scenario=actual --basis=closing-balances --sign=debit-positive --source="Original export reference" --actor="Finance owner" --dry-run
```

Remove --dry-run after reviewing the result. This is one command per export, once the entity, period, signs and basis are configured. It is not a claim that every Calxa workspace can migrate without mapping.

## Column contract

| Source | Destination |
|---|---|
| Account Number | Entity-scoped source account code |
| Account Path, if no number | Source account code, preserving the full path |
| Account Name, if neither above | Source code by unique name; duplicate names require preparation |
| Account Name | Source name, retained without guessing a group classification |
| Monthly column | Period balance for actual or budget, chosen explicitly |
| Empty monthly cell | Unknown amount, blocking source reconciliation |
| Original file | Raw text, SHA-256 fingerprint, source reference, actor and retention review date |

Accepted headings: YYYY MMM, MMM YYYY, YYYY-MMM, MMM-YYYY, YYYY/MM, MM/YYYY, YYYY-MM and MM-YYYY. Months use English three-letter names. Plain signed decimals only, with at most two decimal places. BOM, CRLF, quoted commas, doubled quotes and multiline cells are parsed.

Unknown columns fail instead of disappearing. Separate business-unit rows, combined number/name columns, annual-only exports and XLSX files are not accepted. Export organisation-level CSV or agree a reviewed conversion first. Empty Business Unit metadata columns are allowed. The supplied fixtures are synthetic examples of the documented layout, not files obtained from a customer account.

## Reconcile and correct

Map every account with map-account. Record the approved translation rates, compare source account counts and totals, check balance-sheet basis and signs, then use reconcile. Review internal balances and prepare elimination journals separately. Record and complete follow-ups. A different reviewer posts a balanced journal. Run compliance and draft-pack before lock-period.

An identical source file is a no-op. A changed file overlapping existing balances fails without partial writes. Use revise-balance with the corrected source reference and reason; both values stay in history and reconciliation is invalidated. Use reverse-journal to create a correcting draft; never edit a posted journal. Check history after any correction.

The importer does not bring Calxa account trees, formulas, forecasts, report layouts, integrations, user permissions, comments, source transactions, attachments or ownership logic across. Rebuild those in the agreed custom version. Both systems should remain available until the finance owner reconciles the agreed record scope and approves the change. The annual subscription price comparison is not a promise of identical feature coverage.
