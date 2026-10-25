---
description: Bring Calxa monthly exports across
---

Read CLAUDE.md. Read docs/replace-calxa.md first. Run the dry run, show the findings, then remove --dry-run within the authorised import. Imports require existing entities and periods. Never assume signs or balance-sheet basis. Retain the original export.

Run `npm run group -- import calxa --entity=<entity> --file=<file.csv> --scenario=<actual|budget> --basis=closing-balances --sign=debit-positive --source=<source-reference> --actor=<operator> --dry-run`. Substitute confirmed values and quote values containing spaces. Use `--json` when inspecting records programmatically. Present the returned evidence and any unresolved checks. Never send anything.
