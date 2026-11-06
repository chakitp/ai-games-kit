---
name: short-form-video
description: Capture real gameplay and produce 15-30 s vertical videos (TikTok, YouTube Shorts, Reels) with hooks, captions and a posting plan to get a web game discovered organically. Use after the game is playable, for launch marketing, or to analyze what's working.
---

# Short-form Video

Goal: 3 hook variants per game per week, all from real gameplay, each driving to one play link.

## 1. Make the game clip-ready
- `?clip=1` URL mode (also hide the game-over/"tap to retry" overlays and restart within ~0.6 s so no reel frame is a UI screen): hides debug/cursor, fixes a seed (so a great run is replayable), skips menus, boosts readability (larger HUD numbers), optional scripted "showcase" input track (`marketing/showcase.json`).
- Pre-compose the 9:16 view: portrait games record as-is; landscape games either crop to the action (camera punch-in) or use a blurred-background letterbox, never tiny gameplay in a big black frame.

## 2. Capture
```
node scripts/record-clip.mjs <url-or-dir> --seconds 25 --size 540x960 --actions marketing/showcase.json --out marketing/raw
```
Records WebM via Playwright (actions: `{"t":ms,"type":"key|click|move|wait","key":"Space","x":0.5,"y":0.7}`; coordinates are 0-1 of the viewport). Record 5-10 takes with different seeds; keep the best 2-3. For real human-feeling input, the user can instead screen-record on their phone/desktop and drop files into `marketing/raw`.

## 3. Edit (ffmpeg)
```
# upscale to 1080x1920, 60 fps, h264, faststart
ffmpeg -i raw.webm -vf "scale=1080:1920:flags=lanczos,fps=60" -c:v libx264 -crf 24 -preset veryfast -pix_fmt yuv420p -movflags +faststart out.mp4
```
Trim with `-ss/-to`; speed ramps with `setpts`; add captions with ffmpeg `drawtext` (big, bold, 2 lines max, outline + shadow, inside safe zones) or burn an `.ass` subtitle file; mix a CC0/own music track at -18 dB under gameplay SFX; add a 0.4 s freeze-frame/zoom on the payoff.

Keep clips OUT of the game folder (`marketing/`, not `dist/` or the game root): portal audits count every file in the bundle. Textured/grainy art compresses badly; if a 25 s clip exceeds ~20 MB, raise CRF to 26-28 (platforms re-encode anyway).

## 4. Hooks (first 1.5 s decides everything)
Pick one per variant; show the payoff or tension immediately, then explain.
- **Satisfaction**: the most oddly satisfying 3 seconds of your game, looped slightly.
- **Clutch**: near-death save with slow-mo and a rising sound.
- **Challenge**: "99% fail at level 2" with a visible counter; must be true to the game.
- **Escalation**: starts small, ends absurd; text "wait for it" is acceptable only if the payoff lands by second 12.
- **Before/after juice**: split-screen flat vs polished (great for dev audiences).
- **Dev story**: "I made a game where X" with a real number (days, players) only if accurate.
Avoid: logo intros, long explanations, fake gameplay, bait that the game can't fulfill.

## 5. Structure (20 s)
0-1.5 s hook visual -> 1.5-12 s core loop at its best -> 12-18 s escalation/payoff -> 18-20 s on-screen CTA ("Play free, link in bio") + pinned comment with link.

## 6. Packaging and posting
- Title/caption: 1 line hook + 3-5 tags (#indiegame #browsergame #html5game plus genre) - platform-specific, short.
- Cadence: 3 posts/week/platform for 4 weeks; same clip cross-posted to TikTok, Shorts, Reels (remove watermarks of other apps).
- Track per video: 3-sec hold %, average view duration, shares, link clicks/plays (use portal analytics or UTM on the itch/own page). Keep winners' hooks, kill losers after 2 tries.
- Respond to the first 20 comments within 2 hours; turn requests into the next video.
- Write `marketing/POSTING_PLAN.md` with the calendar, captions, tags and the metric table.

## Rules
Only real footage; disclose nothing misleading; use CC0/own music only; keep text in safe zones (avoid bottom ~20% and right ~12% where platform UI sits).
