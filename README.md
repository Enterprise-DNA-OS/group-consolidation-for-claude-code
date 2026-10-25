# Group Consolidation for Claude Code

Your group accounts, translation rates and elimination working papers in a database you own.

## Three ways to own it

- **Do it yourself.** Free under the MIT licence. Install this repo, test the fictional group and bring a supported Calxa export across. Claude Code, Codex, OpenCode or Cursor can run the commands. Hosting and agent usage have their own costs.
- **We customise it.** Enterprise DNA maps your group chart, source exports, review rules and reporting format. We build a web front end or use a different stack when your business needs one. One setup fee, then a retainer.
- **We run it for you.** Omni by Enterprise DNA operates the agreed installation, integrations, backups and support. One setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_medium=readme).

## What this replaces

Calxa's Australian Enterprise plan lists A$1,980 per tenant per month including GST, or A$23,760 for twelve months. Implementation is a separate fee. This is a published plan comparison, not a customer invoice or a claim about every Calxa subscription. [Pricing, checked 25 October 2026](https://www.calxa.com/pricing/).

This build covers a finance team's group management consolidation: importing entity balances, mapping accounts, applying approved currency rates, preparing balanced elimination journals, reconciling sources and reviewing a period pack. It is distinct from client advisory reporting and forward budget planning.

It does not prepare statutory consolidated accounts. Ownership assessments, acquisitions, non-controlling interests, cashflow forecasting, tax, disclosures, permissions and live accounting connections require separately agreed work. The base uses full entity amounts, one group in NZD and explicitly supplied rates. Calxa already offers consolidation and elimination features; this project makes its own narrower working record inspectable and changeable.

## Start with fictional data

Node 20 or later. No API key or paid service required.

```bash
npm install
npm test
npm run demo
npm run group -- weekly-review --period=2026-09
npm run docs
npm run view
```

With DATABASE_URL unset, PGlite stores data in .data/db. Set DATABASE_URL for a controlled PostgreSQL deployment and run npm run migrate. Demo and seed refuse a server URL. Seed skips any database that already contains entities. For real imports, use a separate empty DATA_DIR, run migrations and add your actual entities and periods. Never mix the demo with business records.

## The weekly rituals

1. Read /attention for missing or overdue entity submissions.
2. Use /mapping-gaps and /rate-gaps before reading the group results.
3. Review /intercompany and prepare /add-journal with /add-line. A different reviewer uses /post-journal.
4. Compare /budget-variance, finish /actions-due and record /reconcile against the source ledger.
5. Run /compliance and /draft-pack. /lock-period finishes the management review only after the checks clear.

36 CLI operations, each supporting --json, and 38 slash-command recipes including /customise and /new-view. References accept exact codes, case-insensitive names or partial UUIDs. Ambiguous references list candidates and exit 1. Mutation commands require --actor and run in a database transaction.

## Ten questions this build answers

These questions have working queries today. They are not claims that Calxa cannot answer the same questions.

1. Which entity still owes its September source review? /attention.
2. Which accounts have no group mapping? /mapping-gaps.
3. Which entity needs an average or closing currency rate? /rate-gaps.
4. What changed between each local balance and the translated amount? /balances.
5. How much internal revenue remains before the elimination is posted? /intercompany.
6. Which eliminations have no independent reviewer? /journals.
7. What is group profit after the posted eliminations? /profit.
8. Which group lines differ from their budget and have missing source evidence? /budget-variance and compliance.
9. What was the old value before a source balance was corrected? /history.
10. What is stopping the finance owner from locking this period? /compliance.

## Bring your records

```bash
npm run group -- import calxa --entity=NZ --file=imports/actuals.csv --scenario=actual --basis=closing-balances --sign=debit-positive --source="September ledger export" --actor="Finance owner" --dry-run
```

Remove --dry-run after checking the preview. Organisation-level monthly CSVs are supported. Account Number, Account Path or a unique Account Name identifies each account. Eight documented month formats are recognised. Source CSVs remain stored with a fingerprint and receipt. Repeat identical imports change nothing; a changed file that overlaps existing balances stops for explicit reconciliation. /revise-balance records corrections with the previous value and reason.

Read [the exact mapping and exclusions](docs/replace-calxa.md). Debit-positive signed values are mandatory: credits negative, debits positive. Balance-sheet values must be closing balances for the period; monthly movements must be converted first. Confirm both against the ledger, never infer them from column names. Blank cells remain unknown. Business-unit exports, formulas and report layouts need separate mapping.

## Reading the numbers

Amounts are fixed-decimal database values. Each source account maps to a group line with an average, closing or historical translation rate. Rates multiply local amounts into NZD. Base-currency entities always use 1. Posted elimination journals are in NZD and apply to actuals only. The same entity-period rate policy is applied to budget values; forecast-specific rate sets require customisation.

Group account subtotals are provisional while any entity is missing. /profit withholds the total when the source set has gaps. Read /compliance with every pack. A trial balance must balance locally and after translation; differences are surfaced for review, never filled with a fabricated balancing amount. A single historical rate per entity-period is a management simplification, not a lot-by-lot equity translation engine. Income balances must have a consistent period basis and reconcile to the supplied trial balance.

Locks and reviewer separation are CLI controls. The database owner can change records directly and --actor is not authenticated identity. Deploy team access controls before using it across staff. [Compliance scope](docs/compliance.md).

## Paperwork and read-only views

Edit brand.json once for your business name, colours and logo. npm run docs produces a management pack for each period and an elimination working paper for each journal. npm run view produces the week, group results and intercompany review. /draft-pack writes a private working pack under drafts/ and sends nothing. Reported amounts use debit-positive signs and group currency. [What a screen adds](docs/why-no-front-end.md).

## Your first hour: ten things to ask for

1. Put our business name on the management pack.
2. Add our group companies and their owners.
3. Open the next reporting period with our deadline.
4. Test one Calxa export without saving it.
5. Map our chart to the group reporting lines.
6. Show the accounts that need a currency rate.
7. Prepare the internal-sales elimination working paper.
8. Add our source-reconciliation checklist.
9. Record a correction with its original value visible.
10. Draft this month's management pack for review.

/customise writes a migration and updates the affected commands and checks. /new-view adds a read-only report. No front end is needed for the supplied workflows.

## Verification and operating scope

npm test creates an isolated temporary database, applies migrations twice, seeds twice, exercises every operation and tests import rollback, corrections, review invalidation, locks, balanced journals, retained source files, unknown amounts, CSV edge cases and output escaping. The workflow runs Linux and Windows on Node 20 and 22, plus PostgreSQL 17 when GitHub runners are available. See [verification evidence](docs/verification.md) for what actually ran.

Export all domain records with npm run group -- export --dir=exports/backup. Use database-native backups for disaster recovery and test restoration before use. Import is for Calxa source CSVs, not for restoring that JSON archive. Retain original ledger records and source exports under the applicable policy. Generated reports and exports are private working files, excluded from git.

MIT. Not affiliated with Calxa or Anthropic. [Selection and sources](docs/research.md).
