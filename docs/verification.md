# Verification, 25 October 2026

Local Linux, Node 22: npm install completed with no reported vulnerabilities. npm test passed 78 checks across all 36 operations on an isolated PGlite database. The suite checks seed and migration idempotency, signed amounts, missing rates and entities, balanced journals, separate reviewers, reversal, source corrections, import rollback, repeated imports, locks, malformed CSV, every documented month heading, escaping and CLI exit status.

The workflow includes Linux and Windows with Node 20 and 22, plus PostgreSQL 17. Local test success is not evidence those hosted jobs passed. Their actual status is recorded at handoff.

Demo outputs, document rendering and screenshots are checked separately before the private handoff. Financial correctness still depends on the supplied trial-balance basis, scope, mapping and rates. Synthetic fixtures are not a customer migration certification.
