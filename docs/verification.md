# Verification, 25 October 2026

- Local Linux, Node 22.23.4: npm install completed with no reported vulnerabilities.
- PGlite: npm test PASS, 78 checks across all 36 CLI operations.
- PostgreSQL 17.10: the same suite PASS, 79 checks including the empty-server-database guard, across all 36 operations. Tested with a disposable local cluster and node-postgres, then stopped the cluster.
- npm run demo: PASS on fictional records. npm run docs produced three branded documents, and npm run view produced three read-only reports.
- The week view and September management pack screenshots were inspected. The comparison page was rendered from the real Astro route and components in an isolated preview. Desktop and mobile screenshots were inspected; the headline was shortened for mobile. The page returned 200, noindex,nofollow, the correctly attributed booking link and no page errors.
- check-page.mjs calxa printed PASS with five sourced dollar figures and no brand errors. The repo prose passed brand checks, with no author placeholders or em dashes.
- Three real command outputs are retained in docs/evidence/demo-runs.json. These are fictional demo figures, not a customer record.

The suite covers migration and seed idempotency, signed amounts, missing entities and rates, journal balance and separate review, reversals, source corrections, import rollback and repeated imports, source signoff invalidation, locked periods, malformed CSV, all eight documented month-heading formats, output escaping and CLI exit status. Demo and seed refuse a server URL before connection.

The [hosted verification run](https://github.com/Enterprise-DNA-OS/group-consolidation-for-claude-code/actions/runs/40241763615) did not start its test steps. GitHub reported an organisation account-payment or spending-limit block. Local Linux and PostgreSQL checks passed separately. Windows and Node 20 remain unverified; the committed workflow covers those environments once runners are available.

The financial result still depends on the supplied trial-balance basis, scope, mappings and approved rates. Synthetic fixtures follow Calxa documentation but are not a customer migration certification. The page preview did not run the entire site's unrelated content build.
