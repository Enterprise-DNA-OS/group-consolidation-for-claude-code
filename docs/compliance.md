# Record checks and finance controls

These checks support a finance owner's review. They do not certify accounting, tax or legal compliance and they do not carry out statutory consolidation. Checked 25 October 2026.

## Source-backed NZ record policy

NZ Inland Revenue requires records to be kept for at least seven tax years, in English or Maori unless approved otherwise. Offshore storage requires approval for the business or provider. [IRD record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping), updated 14 May 2026.

NZ-RECORDS flags an imported file whose retention review date is shorter than the minimum policy. Imports retain the original text and a fingerprint, source reference and receipt actor. The default review date is eight years after the later of receipt and the latest imported period, allowing for the remainder of the tax year. Nothing automatically deletes at that date. An accountant checks tax-year boundaries, longer holds and the applicable country requirements before approving disposal. Exporting this database does not replace keeping underlying invoices, ledgers and other source records. Offshore approval and language suitability are deployment checks for a person, not claims made by the CLI.

## Internal controls, not statutory rules

| Check | What happens |
|---|---|
| SCOPE | A period cannot lock with no entities |
| SOURCE | Each group entity must have actual balances for the period |
| DATA | Unmapped accounts, unknown amounts and missing currency rates block reconciliation |
| REVIEW | Every entity needs a recorded source reconciliation |
| JOURNAL | Draft elimination entries block the period lock |
| ACTION | Unfinished review actions block the period lock |
| BALANCE | A local signed trial balance out by more than one cent needs review |
| TRANSLATION | A translated group trial balance out by more than one cent needs review |
| Journal posting | Two or more lines must balance exactly to zero, with a different reviewer |
| Correction | Old and new balances, reason and source remain in activity; signoff is invalidated |
| Period lock | CLI balance, rate, journal and review changes are blocked until a reasoned reopening |

The trial-balance checks assume full debit-positive trial balances, not a balance sheet plus monthly profit lines from inconsistent periods. Equity uses an explicitly selected historical entity-period rate. Currency translation reserves, partial ownership, eliminations of investments and retained earnings movements require finance policy and further implementation. A missing cashflow statement, audit opinion or statutory disclosure is never silently produced.

Calxa documents its own consolidation features, account mapping and methods of eliminating intercompany accounts in its [group reporting guide](https://www.calxa.com/the-best-way-to-do-group-consolidation-reporting/). Our controls are an implementation choice, not a claim that Calxa lacks them.

## Operating boundary

The installed owner role can bypass CLI rules. RLS is enabled and public table privileges are revoked, but the supplied CLI is for a trusted database owner; no team roles or identity provider are included. Actor and reviewer strings are self-declared. Install authenticated access, least-privilege roles, protected backups, storage approval and restore tests before team use. Only run database smoke tests against a disposable test database. No payments, tax submissions, messages or ledger writes are performed.
