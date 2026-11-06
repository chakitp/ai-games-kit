# Contributing

Issues and PRs are welcome, especially:

- Corrections to portal requirements or SDK calls (link the official doc page and the date you checked).
- New art-direction starters (`skills/anti-slop-art/references/directions.md`) and slop tells.
- Adapters for more portals (`platforms/<name>.js` + `scripts/mock-sdks/<name>.js` + a reference file).
- Bugs in the scripts: please include the command, the output, and your Node version.

## Rules of thumb

- Scripts stay dependency-free Node ES modules (Playwright is the only exception, for browser work).
- Every portal claim needs a source and a "verified on" date.
- Keep agents and skills short: reports under ~150 words, details in `references/` files loaded on demand.
- Run before opening a PR:

```bash
for f in scripts/*.mjs platforms/*.js scripts/mock-sdks/*.js; do node --check "$f"; done
npm run demo:build && npm run demo:audit && npm run demo:test
```
