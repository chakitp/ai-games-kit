---
name: portal-export
description: Build, validate and package a web game per portal (Poki, CrazyGames, YouTube Playables, itch.io, GameDistribution) with the right SDK adapter, size/file rules, and a submission kit. Use when the user says export, publish, submit, ship, or names any portal.
---

# Portal Export

One source tree -> one build per portal. Portal rules change, so **re-verify against the live docs** (URLs in each reference file) before declaring a build compliant; if a number differs, trust the live page and tell the user.

## Steps
1. Confirm the portal list (default: poki, crazygames, youtube, itch). Read `docs/PERF_BUDGET.md`.
2. For each portal, read `references/<portal>.md` (rules, SDK calls, adapter snippet, submission checklist).
3. Build: `node scripts/build-portal.mjs <gameDir> --portal <p|all> --out dist`. It copies the game (minus docs/marketing/maps), writes `platforms/<p>.js` as `platform.js`, injects the SDK `<script>` + `platform.js` before the game's first script, writes `_submission/`, and zips. The game must use `window.__PLATFORM__` (adapter contract in `web-game-architecture`), never a portal SDK directly.
4. `node scripts/audit-bundle.mjs dist/<portal> --portal <portal>`; fix until zero FAIL. WARN items go into the report.
5. `node scripts/playtest.mjs dist/<portal> --mock-sdk <portal>` (smoke test of the final build with an offline fake SDK; it fails on duplicate/missing gameplay or loading events, wrong YouTube ready order, no SDK calls at all). itch has no SDK: omit the flag.
6. The build script already zipped (`dist/<portal>.zip`, `index.html` at root, `_submission/` excluded).
7. Write `dist/<portal>/_submission/` (outside the zip): `listing.md` (title <= 30 chars, one-line hook, 2-3 sentence description, controls, tags, category, age notes), thumbnails at the sizes the portal asks for, and `TODO-human.md` (account creation, forms, uploads, review-wait notes).

## Cross-portal rules (apply to all)
- Relative paths only; `index.html` at root; filenames limited to `[A-Za-z0-9_.-]`.
- No runtime requests to third-party hosts (fonts/CDNs/analytics) unless the portal explicitly allows and requires a privacy policy.
- localStorage in try/catch with in-memory fallback.
- Pause + mute on `visibilitychange` and whenever the portal pauses/plays an ad.
- Fire gameplay start only on the first real player input, and gameplay stop on pause/menu/death/level end; never fire the same event twice in a row.
- Make intros/cutscenes skippable; no splash screens (a small studio logo on the loader is OK on Poki).
- Remove debug overlays, test levels, `console.log` spam, localhost references.
- Provide mouse/keyboard and touch; cover 16:9 desktop and portrait/landscape phones as the portal requires.
- Thumbnails: design them (readable at 150 px, one focal subject, no tiny text); supply static + animated where asked.

## Portal status snapshot (verify live)
| Portal | Access | Initial size | SDK |
|---|---|---|---|
| Poki | Curated submission; web-exclusive | target <= 8 MB | Poki SDK required for ads/events |
| CrazyGames | Open submit; Basic Launch (no ads) then Full Launch | <= 50 MB (<= 20 MB for mobile homepage) | SDK v3 (full launch needs it) |
| YouTube Playables | Invitation / developer portal + certification | must < 30 MiB, should < 15 MiB | ytgame SDK (`gameReady`, `firstFrameReady`, save data, pause/audio hooks) |
| itch.io | Open | 500 MB extracted | none |
| GameDistribution | Open application | check docs | GD SDK |

## Revenue notes (do not oversell)
Rev share terms differ per portal and change; summarize what the live docs say and never promise traffic or income. Poki typically splits ad revenue on its own traffic; CrazyGames shares ad revenue after Full Launch; YouTube monetization settings are still evolving.
