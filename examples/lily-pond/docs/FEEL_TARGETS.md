# LILY POND: Feel Targets (values live in CFG.feel in game.js)

```
feel:
  inputLatencyFrames: 1       # squash starts the same frame as press
  charge: { maxMs: 900, minHop: 0.12 }
  hitStopMs: { perfect: 50, edge: 20, splash: 120 }
  shake: { decay: 1.6, maxOffsetPx: 10 }          # splash + perfect only, trauma^2
  squash: { charge: [1.18, 0.78], land: [1.3, 0.75], settleMs: 160 }
  zoomPunch: { perfect: 0.035, ms: 140 }
  particles: { perfect: 18, edge: 8, splash: 26, max: 240 }   # ink droplets, short life
  sfx: { pitchJitter: 0.05, comboStepSemitones: 2, scale: pentatonic, comboMax: 10 }
  ui: { scorePopScale: 1.15, popMs: 160 }
  reducedMotion: toggle (R key / label) + prefers-reduced-motion: no shake, no zoom, no hit-stop
```
Audio: procedural. Charge = rising filtered noise/tone; leap = soft whoosh; land = wood-block thock; perfect = bell on pentatonic scale rising with streak; splash = noise burst + low plop. Master limiter, mute persisted, auto-mute on hidden tab / portal ad.
