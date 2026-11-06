---
name: game-feel
description: Concrete game-feel ("juice") recipes, tunable defaults, and an audio checklist for web games. Use for polish passes, for "feels floaty/flat/stiff" complaints, and when writing FEEL_TARGETS.md.
---

# Game Feel

Principle: every player action gets an immediate, proportionate, multi-sensory response. Juice supports readability; it never hides hazards.

## FEEL_TARGETS.md template (copy to docs/, tune to genre)
```
feel:
  inputLatencyFrames: 1          # action visible same frame
  inputBufferMs: 120             # jump/shoot pressed slightly early still counts
  coyoteMs: 90                   # platformers
  hitStopMs: { light: 40, heavy: 90, death: 140 }
  shake: { decay: 1.6, maxOffsetPx: 14, maxAngleDeg: 2 }   # trauma^2 model
  squash: { land: [1.25, 0.8], jump: [0.85, 1.2], settleMs: 140 }
  zoomPunch: { amount: 0.04, ms: 120 }
  flashMs: 70
  particles: { perHit: 8, perKill: 24, perReward: 16, max: 400 }
  sfx: { pitchJitter: 0.08, volJitter: 0.1, layersPerKey: 3 }
  ui: { popScale: 1.12, popMs: 160, staggerMs: 45, numberTickMs: 600 }
  comboPitchStepSemitones: 1      # up to 12
  haptics: { tapMs: 10, hitMs: 25, deathMs: 60 }
  reducedMotion: false            # toggle in settings; also read prefers-reduced-motion
```

## P0 recipes (always)
- **Easing everywhere**: tween with easeOutBack (pops), easeOutCubic (settles), easeInOutQuad (slides). Never linear for UI.
- **Hit-stop**: freeze gameplay sim for `hitStopMs` on impact (keep rendering particles).
- **Trauma shake**: `trauma += x` (0..1), offset = maxOffset * trauma^2 * noise(t); trauma decays. Rotate camera slightly too.
- **Squash and stretch** on the player on jump/land/hit; preserve volume (scaleX * scaleY ~ 1).
- **Particles** for: hit sparks, dust on land/turn, pickup sparkle, death burst. Short life (200-500 ms), size shrink, additive blend only where readable.
- **Number feel**: score ticks up with a small scale pop; big combos grow the number and shift its color token.
- **Button feel**: press = scale 0.94 + sound; release = overshoot pop; disabled has distinct look.
- **Camera**: lerp-follow with lead in movement direction; slight zoom out when fast.
- **Audio**: see below.

## P1 recipes
Anticipation (2-3 frame wind-up before big actions), trails on fast objects, damage flash (white 70 ms), screen-edge vignette pulse at low health, enemy telegraphs (flash + sound 300-600 ms before attack), idle breathing animations, slow-mo on last-hit/near-miss (0.3x for 150 ms), combo-driven music layers, haptics via `navigator.vibrate` (feature-detect; no-op on iOS Safari).

## Audio checklist
- WebAudio; create/resume context on first user gesture (iOS needs `resume()` inside a gesture handler).
- Every key event has 2-3 layers (transient click + body + tail) and pitch/volume jitter; variations (3-5 samples) for frequent sounds.
- Rising pitch for streaks; distinct sounds for good/bad/neutral.
- Music: loopable, seamless, ducks 6-9 dB under big SFX; separate music/sfx volume + persisted mute; auto-mute on `visibilitychange` and portal ads.
- Generate SFX procedurally (oscillator + envelope + filter + noise burst; sfxr-style param sets) when no pack is licensed. Keep files small (SFX mono OGG/MP3 64-96 kbps, music 96-128 kbps).
- Normalize loudness: SFX peak around -6 dBFS, music around -14 dBFS; no clipping on stacked sounds (use a limiter/compressor node on the master bus).

## Restraint
Cap simultaneous shake, flash <= 3 per second (photosensitivity), provide a reduced-motion toggle, never obscure the player or incoming hazards. If a juice effect doesn't improve clarity or satisfaction in a side-by-side clip, remove it.

## Debug overlay
`?debug=1` shows fps, entity counts, trauma, and sliders bound to `config.feel.*` so values can be tuned live and copied back. Remove or gate the overlay out of production builds (portals reject debug code).
