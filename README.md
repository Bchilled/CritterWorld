# CritterWorld

Desktop idle sim — lives above your taskbar.

## Setup

```
cd C:\Users\me\Dev\CritterWorld
npm install
npm start
```

## Controls

| Input | Action |
|-------|--------|
| Right-click canvas | Hide window |
| Right-click tray icon | Menu (show/hide/speed/quit) |
| Left-click critter | Pet it |
| Arrow keys | Scroll world |
| Space | Pause |
| Scroll wheel | Scroll world |

## Controls (UI)
- `+` / `-` — zoom (coming)
- `||` — pause
- `1x` button — cycle speed (0.5x / 1x / 2x / 4x)

## Structure

```
CritterWorld/
  main.js          ← Electron main (window, tray, IPC)
  preload.js       ← IPC bridge
  package.json
  src/
    index.html     ← World UI shell
    world.js       ← Sim engine (biomes, critters, AI, rendering)
  assets/
    tray.png       ← 16x16 tray icon (optional)
  scripts/
    gen-icon.js    ← Icon generator helper
```

## What's in v1

- 5 biomes (Forest, Tundra, Desert, Moon, Wasteland) — side scrolling
- Autonomous critter AI with needs (hunger, fatigue)
- Personality system (hunger rate, sleep rate, work speed, bravery, laziness)
- Life stages (baby → teen → adult → elder → death)
- 20 egg styles with hatch timer
- Trees (5 types, 3 sizes), rocks, cookie bushes
- Resource tracking (wood, stone, food, metal)
- Thought bubbles (!, ?, zzz, etc)

## Coming next

- Item drag & drop (cookie, axe, spear, rod)
- Breeding system
- Building construction
- Hunting animals (deer, rabbit, bird, fish)
- Rocket ship endgame
- Intro cinematic (HTML)
