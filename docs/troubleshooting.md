# Troubleshooting

**`playwright not found from <dir>`**: run `npm install && npx playwright install chromium` in the game project (the scripts resolve Playwright from the current working directory).

**Playwright can't find a browser** (`Executable doesn't exist`): run `npx playwright install chromium`. In a sandbox with a preinstalled Chromium, set `PW_CHROMIUM=/path/to/chrome` and the scripts will use it.

**`FAIL canvas got N non-finite value(s)`**: some number in your render math is NaN/Infinity. The message shows the first call, e.g. `setTransform(...,NaN,NaN)`. It is almost always a mistyped config key (`CFG.shakeMax` vs `CFG.feel.shakeMax`).

**`mock <portal> SDK loaded no calls`**: the SDK tag is missing from `index.html` (build with `build-portal.mjs`, don't hand-edit `dist/`), or the game doesn't call `window.__PLATFORM__`.

**`FAIL external URLs`** (audit): a request to a third-party host. Self-host fonts and libraries. URLs inside JS comments are ignored; the portal's own SDK host is allowed for that portal.

**`FAIL illegal filename chars`** (YouTube): use only letters, digits, `_`, `-`, `.`.

**`zip not available`**: install `zip`, or zip `dist/<portal>/` yourself with `index.html` at the archive root (exclude `_submission/`).

**No mp4 after recording**: install `ffmpeg`. The `.webm` is still saved.

**Clip is huge**: grainy art compresses poorly. Raise CRF to 26-28 (platforms re-encode anyway) and keep clips out of the game folder so they don't count toward the bundle size.

**Slash commands not found**: make sure the plugin is installed (`/plugin`), and try the namespaced form `/ai-games-kit:game-new`.
