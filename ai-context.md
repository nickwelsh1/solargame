# Solar Game — AI Context

> **Purpose:** Concise, up-to-date overview for AI assistants. Update when structure or conventions change.

## Project at a glance

- **Name:** `solargame`
- **Type:** Single-player HTML5 Canvas web game
- **Stack:** Vanilla JavaScript (ES modules), Vite, HTML/CSS
- **Package manager:** pnpm (lockfile present)
- **Node version:** 22.15.0 (Volta pinned)
- **Vite version:** ^6.2.4
- **pnpm version:** 10.27.0
- **Biome version:** 2.2.5 (installed globally) — enforces linting and formatting

## How to run / verify

```bash
pnpm run dev      # start Vite dev server
pnpm run build    # production build -> dist/
pnpm run preview  # preview the built dist
pnpm lint         # biome check (lint + format)
pnpm test         # vitest unit tests
pnpm exec biome format --write <file>  # format a specific file
```

## Entry points

- `index.html` — loads `/src/main.js`
- `src/main.js` — imports `style.css` and the `{ game }` singleton from `src/game.js`, then calls `game.start()`
- `src/game.js` — creates the plain `game` state object; now a thin wiring/hub file
- `src/style.css` — basic styling, canvas + UI colors

## Architecture (after refactor)

- **Canvas-based 2D game.** All rendering is manual via `CanvasRenderingContext2D`.
- **Game state:** plain `game` object created by `createGame()` in `src/game.js`. No `Game` class.
- **Game loop:** `game.loop(timestamp)` and `game.menuLoop(timestamp)` are closures that call `loop(game, timestamp)` / `menuLoop(game, timestamp)`.
- **World & camera:**
  - World size is fixed at `4000 x 3000` (set in `resize(game)`).
  - Camera is centered on the ship via `game.cameraOffset`.
  - Ship is drawn at `game.camera.width / 2, game.camera.height / 2`.
- **Entity model:** typed arrays (`asteroids`, `projectiles`, `particles`, `planets`, `containers`, `scrap`, `beams`) plus a generic `entities` array.
- **Collision detection:** system functions in `src/systems/collisions.js`; circle-circle (`checkCircleCollision`) and line-circle for beams.
- **Factories over classes:**
  - `src/game.js` — `createGame()`
  - `src/renderer.js` — `createRenderer()`
  - `src/entities/Ship.js` — `createShip(game)`
  - `src/entities/Asteroid.js` — `createAsteroid(game, x, y, size)`
  - `src/entities/CargoContainer.js` — `createCargoContainer(game)`
  - `src/entities/Scrap.js` — `createScrap(game, x, y, contents)`
  - `src/entities/Dialogue.js` — `createDialogue(game)`
  - `src/systems/Spawner.js` — `createSpawner(game)`
  - `src/state.js` — `createState()`
  - `src/input.js` — `createInput()`
  - `src/ui.js` — `createUI()`

## Systems

- `src/systems/collisions.js` — `handleCollisions(game)`, `handleAsteroidProjectileCollisions(game)`, `checkShipAsteroidCollisions(game)`, `isPointOverAsteroid(game, x, y)`
- `src/systems/Spawner.js` — `createSpawner(game)`, `initGame(game)`, `resetGame(game)`
- `src/systems/timer.js` — `startTimer(game, durationMins)`, `checkTimer(game)`, `triggerGameOver(game)`
- `src/input.js` — `createInput()`, `setupInputListeners(game, callbacks)`, `handlePointerDown(event, game, callbacks)`, `handlePointerMove(event, game)`, `handlePointerUp(game)`
- `src/renderer.js` — `createRenderer()` and standalone `drawX(ctx, game)` helpers

## Shared state objects

- `CONFIG` — frozen constants in `src/config.js`
- `state` — `screen`, `game_over`, `game_paused`, `score`, `timer`, `initialContainerCount`
- `input` — mouse/touch flags, braking, drag-from-center, shooting
- `player` — current weapon and last fire times
- `ui` — mouse coords, dialogue text
- `world` / `camera` / `cameraOffset` — geometry

## Controls

- **Menu:** `START GAME` / `CONTROLS` buttons.
- **In-game pointer (mouse or touch):**
  - Click/tap outside the center circle → ship rotates toward cursor and shoots.
  - Drag from center circle → sets movement target (two speed bands).
  - Tap inside center circle → brake (single tap to 50%, double tap to 0).
  - Action button → cycle weapon (laser → machineGun → missile → beam).
  - Pause button → pause/unpause.
  - Cargo button → pick up / drop nearby container.
  - On game over, reset button appears in the dialogue box.

## Weapons

- `machineGun` — dual bullets, fast fire rate
- `laser` — fast straight line, high speed
- `missile` — starts slow, accelerates
- `beam` — wide area-of-effect line, short lifespan, no projectile array

## Coding conventions

- **ES modules** with explicit `import`/`export`.
- **Factory functions**, not classes. Use `createX(game, ...)` and return plain objects.
- **Pass `game` explicitly** to system/entity functions; avoid `this` in new code.
- `performance.now()` for per-frame timings, `Date.now()` for wall-clock/timer logic.
- Physics units are pixels per second; `deltaTime` is in ms.
- Colors are mostly HSL strings.
- `console.log` is used for runtime debugging; use `debugEl` for persistent UI output.
- Run `pnpm lint` before committing. Biome formatting must pass.

## Assets

- `src/assets.js` — ship SVG strings and `loadSVGString()` / `drawSVGImg(ctx, img, scale)` helpers.

## Key files

- `src/game.js` — createGame() and main wiring
- `src/renderer.js` — createRenderer() and drawing helpers
- `src/systems/collisions.js` — all collision handling
- `src/systems/Spawner.js` — spawning and game lifecycle (initGame/resetGame)
- `src/systems/timer.js` — timer and game-over
- `src/input.js` — all input handling
- `src/config.js` — CONFIG constants
- `src/assets.js` — SVG and image loading
- `index.html` — app shell
- `src/style.css` — canvas styling
- `docs/plan.md` — project plan
- `docs/backlog.md` — active bugs/tasks
- `docs/scratchpad.md` — design ideas
- `README.md` — run commands
