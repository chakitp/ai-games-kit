---
name: anti-slop-art
description: Checklist and method for making a game's visuals, UI, and copy look intentionally designed instead of AI-generated or template-made. Lists the tells of "AI slop" games and how to replace each. Use for any art direction, UI design, asset creation, or visual review.
---

# Anti-Slop Art

"Slop" = the average of everything. The fix is **specificity + constraint + craft**. Details in `references/slop-tells.md` and `references/directions.md`.

## Method (do in order)
1. **Pick a lineage**, not adjectives. Offer the user 3 from `references/directions.md` (or invent specific ones). Write the choice into `docs/ART_BIBLE.md`.
2. **Tokenize**: <= 6 colors with roles, 2 fonts, 1 shape language, 1 outline/shadow rule, 1 light direction, 1 motion personality (snappy / bouncy / heavy).
3. **Build the hero frame first**: one gameplay screenshot at final quality (player, enemy, background, HUD). Review it against the tells before making any other asset.
4. **Production** only after the hero frame passes. Reuse tokens everywhere.
5. **Review**: run the checklist below on screenshots (desktop + phone). Fix criticals, list majors.

## Critical tells (any = fail)
1. Purple/blue/cyan neon gradient on near-black as the whole identity
2. Emoji or unicode symbols used as sprites/icons
3. Flat colored rectangles/circles as final art with no outline, texture, or shading logic
4. Default system/Inter/Arial/Roboto text for titles and HUD
5. Title screen = centered title + one rounded "Play" button on gradient
6. Glassmorphism cards / generic rounded-rect panels / drop shadows everywhere
7. Gradient text on headings; rainbow gradients
8. Everything perfectly centered and symmetric, same size, same spacing, no focal point
9. Pure linear motion; no easing, no anticipation, no overshoot
10. Placeholder or absent audio; one beep for everything
11. Copy like "Embark on an epic journey", "Unleash", "Ultimate", "Level Up Your..." and generic names ("Neon Runner 3D")
12. Stock-looking AI raster art mixed with flat vector UI (style collision)

## Majors
Inconsistent line weight/scale/pixel density between assets; low value contrast between player and background; tiny touch targets (<44 px); text over busy art without a plate; more than ~2 type sizes competing; hue-only encoding of meaning; menus that ignore the world's materials; no visible personality in idle states.

## Craft moves that read as "human"
- **Asymmetry with intent**: off-center compositions, a clear focal point, one oversized element.
- **Material cues**: paper grain, ink bleed, scanlines, sticker edges, worn paint: pick ONE and apply everywhere.
- **Imperfection budget**: slight rotation jitter on UI, hand-lettered numerals, irregular outlines, but consistent.
- **Specific palette**: derive from a real reference (a painting, a film still, a product); sample 5 colors; adjust, don't invent from "vibrant".
- **Typography with a point of view**: a characterful display face for titles/numbers (self-hosted OFL font, e.g. from Fontsource) + a quiet text face. Numbers (score, combos) deserve the most design.
- **Layered backgrounds**: 3 parallax or depth layers with atmospheric perspective (farther = lower contrast, cooler).
- **Motion personality**: define the easing family (e.g. easeOutBack for pops, easeInOutQuint for slides) and use it everywhere.
- **Font handling**: wide display faces (e.g. Bowlby One) need smaller sizes than Arial Black; set the weight the family actually ships (usually 400, never fake-bold via 900); wait for `document.fonts.load()` before the first canvas draw. Texture/halftone colors must differ from the base color or they vanish.
- **Naming and copy**: short, concrete, funny or evocative; one voice. Name the game something you can imagine on a lunchbox.

## Asset sourcing (in order of preference)
1. Procedurally drawn / hand-authored SVG with the tokens (crisp, tiny, themeable).
2. Pixel art on a fixed grid + fixed palette (e.g. 16x16 or 32x32 tiles, <= 16 colors per sprite sheet).
3. CC0 packs (Kenney, OpenGameArt CC0, itch CC0): recolor to the palette and restyle outlines so packs don't clash. Record sources in `assets/LICENSES.md`.
4. Generated raster images only for backgrounds/key art, then paint over / palette-map / add grain so they match; never for sprites that need consistent frames.

## Output of a review
Score: criticals found (list), majors (list), and exactly 3 changes ranked by visual impact. Attach the screenshot path.
