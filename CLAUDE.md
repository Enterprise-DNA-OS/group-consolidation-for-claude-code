# Group Consolidation for Claude Code: operating instructions

Read README.md and docs/compliance.md before working with real financial records. This is one group's management reporting desk, operated by an authorised finance person. It is not a statutory accounts, tax, payment or live ledger system.

## Working rules

Read the CLI before answering. Use npm run group -- help and the matching .claude/commands recipe. Never invent records, exchange rates, source evidence or completed reconciliations. Every monetary input is a decimal string. Use confirmed debit-positive signs and closing balance-sheet values. Missing data is unknown, never zero.

All writes need the operator's actual --actor name. A journal reviewer must differ from its preparer. These names are self-declared and not authentication. Never bypass a lock with a direct update. Reopen with a reason, then correct with history. Never send, publish, delete, access another customer's records or store secrets in this repo. Drafts stay private. Proposals for team deployment include database access controls, backup restoration tests and approved source storage.

The base assumes every entity is included in every period at full value and the group currency is NZD. Do not add a company to a historical group without checking scope. Never infer ownership, historical rates, minority interests or currency translation adjustments. A finance owner reviews these policies.

## Routing table

| Request | Recipe |
|---|---|
| List the supported operations | /help |
| List the entities in the group | /entities |
| Show reporting periods and decisions | /periods |
| Review source accounts and mappings | /accounts |
| Read the group chart | /group-accounts |
| Trace monthly source figures | /balances |
| Review the group close this week | /attention |
| Find accounts not mapped to the group | /mapping-gaps |
| Find missing translation rates | /rate-gaps |
| Read the consolidated account schedule | /group-results |
| Read the group profit result | /profit |
| Compare actual and budget amounts | /budget-variance |
| Match internal balances before elimination | /intercompany |
| Review elimination working papers | /journals |
| List consolidation follow-ups | /actions-due |
| Run record and close checks | /compliance |
| Read the change record | /history |
| Prepare the weekly group review | /weekly-review |
| Add a group entity | /add-entity |
| Open a reporting period | /add-period |
| Add a group reporting line | /add-group-account |
| Map a source account | /map-account |
| Record an approved currency rate | /set-rate |
| Record source reconciliation | /reconcile |
| Prepare an elimination working paper | /add-journal |
| Add a journal line | /add-line |
| Record journal review and post | /post-journal |
| Log a close follow-up | /add-action |
| Record a completed follow-up | /complete-action |
| Finish the period review | /lock-period |
| Reopen a reviewed period | /reopen-period |
| Bring Calxa monthly exports across | /import |
| Export the full working record | /export |
| Draft a private group report | /draft-pack |
| Correct a source balance with history | /revise-balance |
| Create a correcting reversal | /reverse-journal |
| Change a field or rule | /customise |
| Add a read-only report | /new-view |

## Files

scripts/group.mjs is the only operational CLI. supabase/migrations contains the schema and reporting views. scripts/lib/db.mjs uses PostgreSQL with DATABASE_URL or PGlite under DATA_DIR. brand.json owns document branding. views.json and documents.json define read-only output. docs/replace-calxa.md defines the import contract. docs/compliance.md names each rule and its limit.

Use a fresh numbered migration for schema changes. Test the change in a temporary database, then apply only to the authorised database. Keep database source files, exports and drafts out of git. Use .env.example as the configuration guide. No agent-runtime fork: AGENTS.md points here for Codex, OpenCode and Cursor.
