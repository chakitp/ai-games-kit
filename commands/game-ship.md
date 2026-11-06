---
description: Export portal-specific builds with audit, smoke test, zip and a submission kit.
argument-hint: <poki | crazygames | youtube | itch | gamedistribution | all>
---

Use the `portal-exporter` agent to build and validate for: ${ARGUMENTS:-poki,crazygames,youtube,itch}.

Re-verify each portal's live requirements first, build with `scripts/build-portal.mjs`, run `scripts/audit-bundle.mjs` and `scripts/playtest.mjs --mock-sdk <portal>` on each build, zip, and generate `dist/<portal>/_submission/`. Report a table: portal | audit | zip | human steps left.
