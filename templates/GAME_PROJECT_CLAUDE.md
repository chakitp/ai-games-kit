# Game project rules (copy to your game repo as CLAUDE.md)

Built with the AI Games Kit. Start with `/game-new <idea>` or `game-director`.

- Decisions live in `docs/` (GAME_BRIEF, ART_BIBLE, FEEL_TARGETS, PERF_BUDGET). Read them before changing anything; update them instead of re-asking.
- Code: fixed-timestep loop, all tunables in `src/config.js`, all portal calls through `src/platform.js`, no runtime external requests.
- Never use emoji as art, default fonts for HUD/titles, or linear tweens for UI.
- Before saying "done": `node scripts/playtest.mjs .` passes and, for releases, `node scripts/audit-bundle.mjs dist/<portal> --portal <portal>` passes.
- Reports stay short: evidence table + gaps + next step.
- Setup once: `npm i -D playwright && npx playwright install chromium` (scripts resolve it from this project).
