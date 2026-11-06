---
description: Run automated + exploratory QA and return a SHIP / FIX-THEN-SHIP / NOT READY verdict with reproducible bugs.
argument-hint: [url or dir]
---

Use the `qa-tester` agent on: ${ARGUMENTS:-the current game}. Write `docs/QA_REPORT.md`, return the verdict and the top 3 fixes only.
