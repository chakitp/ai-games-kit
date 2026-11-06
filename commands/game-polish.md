---
description: Polish pass on an existing game: anti-slop art review, game-feel juice, perf budget and QA, with a ranked change list applied.
argument-hint: [focus: art | feel | perf | all]
---

Use the `game-director` agent to run a polish pass on the current game. Focus: ${ARGUMENTS:-all}.

1. qa-tester: baseline `node scripts/playtest.mjs` + screenshots.
2. art-director: slop-tell review of the screenshots; apply the top 3 visual fixes.
3. game-feel: P0 checklist gaps; add missing juice with tunables in config.
4. perf-engineer: measure, fix top 3 costs, show before/after.
5. qa-tester: re-run and give the verdict.

Report only the evidence table and remaining gaps.
