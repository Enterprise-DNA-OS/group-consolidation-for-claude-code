---
description: Record source reconciliation
---

Read CLAUDE.md. Compare account count, signs, balances, source date and scope against the original. Require actual completed checks. This records the decision, it does not perform the human reconciliation.

Run `npm run group -- reconcile --period=<period> --entity=<entity> --source=<ledger-reference> --note=<checks-completed> --actor=<operator>`. Substitute confirmed values and quote values containing spaces. Use `--json` when inspecting records programmatically. Present the returned evidence and any unresolved checks. Never send anything.
