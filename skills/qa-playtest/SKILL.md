---
name: qa-playtest
description: QA method and checklists for web games: automated smoke test via Playwright, exploratory playtest, portal-policy checks, severity rules and bug report format. Use before any release or after large changes.
---

# QA Playtest

## Automated (always first)
```
node scripts/playtest.mjs <url | dir containing index.html> [--perf] [--out .aigk/qa]
```
Runs desktop (1280x720), portrait phone (390x844, touch) and landscape phone (844x390). Produces `report.json` and screenshots. Fails on: console errors/uncaught exceptions, **non-finite (NaN/Infinity) values reaching canvas calls** (silently ignored transforms break rendering; usually a typo'd config key), failed requests (incl. external hosts), median fps < 55 (60 fps targets) or p95 frame > 25 ms, horizontal scroll, canvas not filling the viewport, no response to input (pixel diff before/after inputs), and load > budget.

`--mock-sdk <poki|crazygames|youtube>` loads an offline fake of that portal's SDK (`scripts/mock-sdks/`) and validates the recorded call sequence (see `portal-export`).

## Manual / exploratory checklist
**First run**: understand the goal in 10 s without text? First fail teaches rather than punishes? Time to first fun < 15 s?
**Controls**: every action works with keyboard, mouse and touch; no stuck keys after blur; no ghosting on multi-touch; touch targets >= 44 px; no page scroll or pull-to-refresh; right-click/long-press doesn't open menus.
**Flow**: pause (Esc/P/button), resume, restart (<2 s), back to menu, mute persists, settings persist after reload; localStorage disabled does not crash.
**Edge cases**: resize/rotate mid-game, tab hidden for 30 s then return (no huge dt, audio resumes), rapid input spam, simultaneous inputs, window minimized, very small viewport, 4x CPU throttle, Slow 3G.
**Long session**: bot-play 5 minutes (random inputs): no memory growth trend (heap sample every 10 s), no entity leaks, fps stable.
**Difficulty**: can a new player pass the first minute? Is there a cheap exploit? Is death always understandable?
**Content**: typos, text overflow with long strings, language toggle if present, clear controls help.
**Portal-policy**: no external requests, no debug UI, no outbound links without privacy policy, cutscenes skippable, SDK events not duplicated, audio muted during ads, no purchase UI (Poki), file/path rules satisfied (`audit-bundle`).

## Severity
Blocker (crash, softlock, data loss, policy violation) -> Major (core loop broken on a target platform, severe perf) -> Minor -> Polish.

## Bug format
`ID | Severity | Area | Steps (numbered) | Expected | Actual | Evidence | Seed/build`. Reproduce twice. One bug per row. No speculation about fixes unless obvious.

## Verdict
SHIP (no Blocker/Major) / FIX-THEN-SHIP (Majors only, list them) / NOT READY (any Blocker). Return the verdict plus top-3 fixes in chat and the full table in `docs/QA_REPORT.md`.

## Always LOOK at the screenshots
Automated checks passed on a game whose whole world was drawn unscaled (a NaN transform). Open `.aigk/qa/*.png` for every viewport and check: world visible and scaled, ground reaches the screen edge, text fits, nothing overlaps, HUD readable. A passing report is not a visual review.
