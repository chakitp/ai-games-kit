---
name: game-brief
description: Turn a vague game idea into locked, written decisions (brief, art bible, feel targets, perf budget) in one pass with at most one batched question. Use at the start of every new game, or when scope/direction keeps drifting.
---

# Game Brief

Goal: decide once so nobody re-prompts. Produce four short files in `docs/`. Total under ~2 pages.

## Step 1: one batched question (skip anything the user already stated)
Ask via AskUserQuestion, max 4 questions, each with a recommended default first:
1. **Core verb** (what the player does every second: dodge, stack, merge, shoot, slide, aim...)
2. **Target portals** (default: Poki + CrazyGames + YouTube Playables) and input (default: mouse/touch first, keyboard optional)
3. **Art direction** pick from 3 specific options you propose (see `anti-slop-art`; each is a named lineage, not an adjective)
4. **Session shape** (default: 30-90 s runs, instant restart, 5-10 min median session)

Anything unanswered: choose the default and record it under "Assumptions".

## Step 2: write the files

### docs/GAME_BRIEF.md
- **Pitch** (one sentence a stranger understands in 3 seconds)
- **Hook**: what makes it clip-worthy / different from the top 3 similar games (name them)
- **Core loop** (verb -> feedback -> reward -> escalation), **fail state**, **win/score**
- **First 10 seconds** script (what the player sees, does, learns; no text walls)
- **Progression**: what is new at 30 s, 2 min, 5 min
- **Out of scope** (explicit list; protects against feature creep)
- **Assumptions**

### docs/ART_BIBLE.md
Created by art-director from `anti-slop-art` (placeholder with chosen direction if running alone).

### docs/FEEL_TARGETS.md
Start from skill `game-feel` template, tuned to the genre: input latency, response curves, hit-stop ms, shake trauma, audio layers.

### docs/PERF_BUDGET.md
Use the strictest of the selected portals. Defaults:
- First interactive frame: <= 3 s desktop broadband, <= 5 s mid phone
- Initial download: <= 8 MB (Poki target), hard cap 15 MB (YouTube should), absolute cap 20 MB (CrazyGames mobile)
- Total: <= 100 MB; files: <= 500
- Frame: 60 fps median, p95 <= 20 ms on 4x CPU throttle
- JS heap peak <= 150 MB (hard ceiling 512 MB)
- Individual file <= 512 KiB where possible (YouTube recommendation)

## Rules
- Never expand scope after the brief is written without logging it under a "Changes" heading with a reason.
- The brief must be readable in 60 seconds. Cut ruthlessly.
