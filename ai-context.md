# Solar Game — AI Context

## Project at a glance

- **Name:** `solargame`
- **Type:** Single-player HTML5 Canvas web game
- **Stack:** Vanilla JavaScript (ES modules), Vite, HTML/CSS
- **Package manager:** pnpm (lockfile present)
- **Node version:** 22.15.0 (Volta pinned)
- **Vite version:** ^6.2.4
- **pnpm version:** 10.27.0

## How to run

```bash
pnpm run dev      # start Vite dev server
pnpm run build    # production build -> dist/
pnpm run preview  # preview the built dist
```

## Entry points

- `index.html` — loads `/src/main.js`
- `src/main.js` — imports `style.css` and `game.js`
- `src/game.js` — all game logic, ~2,600 lines
- `src/style.css` — basic styling, mostly canvas + UI colors

## Architecture

- **Canvas-based 2D game.** All rendering is manual via `CanvasRenderingContext2D`.
- **Game loop:** `requestAnimationFrame` in `gameLoop()` (see `src/game.js:1768`).
  - Computes `deltaTime` from `timestamp - lastTime`.
  - Update phase runs only when `!state.game_paused`.
  - Draw phase always runs.
- **World & camera:**
  - World size is fixed at `4000 x 3000` (set in `resizeCanvas()`).
  - Camera is centered on the ship via `cameraOffset`.
  - Ship is always drawn at `camera.width / 2, camera.height / 2`.
- **Entity model:** global `entities` array plus typed arrays (`asteroids`, `projectiles`, `particles`, `planets`, `containers`, `scrap`, `beams`).
- **Collision detection:** mostly circle-circle (`checkCircleCollision`). Beam uses line-circle (`checkLineCircleCollision`).
- **Classes of note:**
  - `Ship` — movement, rotation, braking, contrail, shooting, towing cargo
  - `Asteroid` — physics, splitting, rotation
  - `Planet` — static obstacle
  - `Projectile` / `Laser` / `Bullet` / `Missile` / `Contrail` / `Beam` — weapons
  - `Particle` — background starfield
  - `Dialogue` — game over / modal text
  - `CargoContainer` — towable objective item
  - `Scrap` — debris from destroyed containers

## State objects

- `CONFIG` — frozen constants (mobile scale, max entities, particle count, etc.)
- `state` — `screen`, `game_over`, `game_paused`, `score`, `timer`, `initialContainerCount`
- `input` — mouse/touch flags, braking state, drag-from-center state, shooting state
- `player` — current weapon and last fire times
- `ui` — mouse coords, dialogue text
- `world` / `camera` / `cameraOffset` — geometry

## Controls (current implementation)

- **Menu:** `START GAME` / `CONTROLS` buttons.
- **In-game pointer (mouse or touch):**
  - Click/tap outside the center circle → ship rotates toward cursor and shoots continuously.
  - Drag from center circle → sets movement target (two speed bands based on distance).
  - Tap inside center circle → brake (single tap slows to 50%, double tap stops).
  - Action button (bottom-left) → cycle weapon (laser → machineGun → missile → beam).
  - Pause button → pause/unpause.
  - Cargo button → pick up / drop nearby container.
  - On game over, reset button appears in the dialogue box.

## Weapons

- `machineGun` — dual bullets, fast fire rate
- `laser` — fast straight line, high speed
- `missile` — starts slow, accelerates over time
- `beam` — wide area-of-effect line, short lifespan, no projectile array

## Current objective

Destroy asteroids (score) and protect/salvage cargo containers. Timer is currently set to 5 minutes in `initGame()`.

## Known issues & TODOs

Full list of bugs, planned features, and brainstorming is in `windsurf.plan.md` and `scratchpad.md`.

## Coding conventions

- ES6 classes with `update(deltaTime)` and `draw()` methods.
- Use `performance.now()` for per-frame timings and `Date.now()` for timer logic.
- Physics units are generally pixels per second; `deltaTime` is in ms.
- Colors are mostly HSL strings.
- `console.log` is used liberally for debugging; prefer `debug()` if adding persistent UI output.

## Assets

- Ship is rendered from an inline SVG string (`shipSVG3` / `shipSVG` / `shipSVG2`) loaded via `loadSVGString()`.

## Key files

- `src/game.js` — primary logic
- `src/style.css` — basic canvas styling
- `index.html` — app shell
- `windsurf.plan.md` — project plan, features, priorities
- `scratchpad.md` — design ideas and inspirations
- `README.md` — run commands
