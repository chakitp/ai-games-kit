# LILY POND

Hold to charge a frog's leap, release to land on the next lily pad; land dead-centre for a PERFECT and a rising bell. Sumi-e ink wash on paper with one vermilion accent. About 70 KB total (HTML + JS + one 28 KB font), no dependencies, procedural audio.

Made with the AI Games Kit to show a *different* look from OFF-CUT. The locked decisions are in [`docs/`](docs): brief, art bible, feel targets, perf budget.

```bash
# from the kit root
node scripts/playtest.mjs examples/lily-pond                       # smoke test, 3 viewports
node scripts/build-portal.mjs examples/lily-pond --portal all      # dist/{poki,crazygames,youtube,itch} + zips
node scripts/audit-bundle.mjs dist/poki --portal poki
node scripts/playtest.mjs dist/poki --mock-sdk poki                # SDK call-order check
```

Debug URLs: `?bot=1` autoplayer, `?clip=1` clean footage mode, `?seed=7` reproducible pads, `?debug` exposes `window.__game`.

Font: Shippori Mincho (SIL OFL 1.1), see `assets/LICENSES.md`.
