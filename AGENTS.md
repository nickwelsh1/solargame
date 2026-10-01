# Solar Game — Agent Guidelines & Architecture (AGENTS.md)

> **Purpose:** Concise, up-to-date overview for AI coding agents. Update when structure, controls, or conventions change.

## Project at a glance

- **Name:** `solargame`
- **Type:** Single-player HTML5 Canvas web game
- **Stack:** Vanilla JavaScript (ES modules), Vite, HTML/CSS
- **Package manager:** pnpm (lockfile present)
- **Node version:** 22.15.0 (Volta pinned)
- **Vite version:** ^6.2.4
- **Vitest version:** ^4.1.10
- **Biome version:** 2.2.5 (installed globally)— enforces linting and formatting

## How to run / verify

```bash
pnpm run dev          # start Vite dev server
pnpm run build        # production build -> dist/
pnpm run preview      # preview the built dist
pnpm test             # vitest unit tests (single run)
pnpm run test:watch   # vitest in watch mode
pnpm run lint         # biome check . (lint + format verification)
pnpm run format       # biome format --write . (format files)
```

Refer to `SMOKE_TESTS.md` for the manual gameplay verification checklist.

## Entry points

- `index.html` — loads `/src/main.js` and provides the canvas shell
- `src/main.js` — imports `style.css` and the `{ game }` singleton from `src/game.js`, then calls `game.start()`
- `src/game.js` — creates the `game` hub object, sets up canvas dimensions, initializes systems, and runs the animation loops
- `src/style.css` — styling for full-screen canvas and UI elements

## Architecture

- **Canvas-based 2D game:** All rendering is manual via `CanvasRenderingContext2D`.
- **Game state:** Plain `game` state object created by `createGame()` in `src/game.js`. No top-level `Game` class.
- **Game loops:** `game.loop(timestamp)` (active gameplay) and `game.menuLoop(timestamp)` (menus/screens) via `requestAnimationFrame`.
- **World & camera:**
  - Geometry backed by `World` (`src/world.js`) and `Camera` (`src/camera.js`).
  - World size is fixed at `4000 x 3000` (set in `resize(game)`).
  - Camera is centered on the ship via `game.cameraOffset`.
  - Ship is drawn at `game.camera.width / 2, game.camera.height / 2`.
- **Entity model:** Typed arrays (`asteroids`, `projectiles`, `particles`, `planets`, `containers`, `scrap`, `beams`) plus a composite `entities` array.
- **Collision detection:** System functions in `src/systems/collisions.js`; circle-circle (`checkCircleCollision` in `src/utils/physics.js`) and line-circle for beams.
- **Entities & Factories / Classes:**
  - *Factories (plain objects):*
    - `src/game.js` — `createGame()`
    - `src/renderer.js` — `createRenderer()`
    - `src/entities/Ship.js` — `createShip(game)`
    - `src/entities/Asteroid.js` — `createAsteroid(game, x, y, size)`
    - `src/entities/CargoContainer.js` — `createCargoContainer(game)`
    - `src/entities/Scrap.js` — `createScrap(game, x, y, contents)`
    - `src/entities/Dialogue.js` — `createDialogue(game)`
    - `src/entities/ShipExplosion.js` — `createShipExplosion(game, ship)`
    - `src/systems/Spawner.js` — `createSpawner(game)`
    - `src/state.js` — `createState()`
    - `src/input.js` — `createInput()`
    - `src/ui.js` — `createUI()`
  - *Classes:*
    - `src/world.js` — `World`
    - `src/camera.js` — `Camera`
    - `src/player.js` — `Player`
    - `src/entities/Planet.js` — `Planet`
    - `src/entities/Particle.js` — `Particle`
    - `src/entities/Beam.js` — `Beam`
    - `src/entities/Projectile.js` — `Projectile`, `Laser`, `Bullet`, `Missile`

## Systems & Modules

- `src/systems/collisions.js` — `handleCollisions(game)`, `handleAsteroidProjectileCollisions(game)`, `checkShipAsteroidCollisions(game)`, `isPointOverAsteroid(game, x, y)`
- `src/systems/Spawner.js` — `createSpawner(game)`, `initGame(game)`, `resetGame(game)`
- `src/systems/timer.js` — `startTimer(game, durationMins)`, `checkTimer(game)`, `triggerGameOver(game)`
- `src/schemes.js` — Input scheme processors: `processPointerDown`, `processPointerMove`, `processPointerUp` for schemes A, B, C, D
- `src/input.js` — `createInput()`, `setupInputListeners(game, callbacks)`, `handlePointerDown()`, `handlePointerMove()`, `handlePointerUp()`, `isUIButtonClicked()`
- `src/renderer.js` — `createRenderer()` (draws background gradient, entities, world borders, minimap, UI buttons, controls, and dialogue)
- `src/utils/physics.js` — math and collision geometry: `checkCircleCollision()`, `addVelocities()`
- `src/utils/helpers.js` — helpers: `calculateNewPosition()`, `checkBoundsRect()`, `randomMinMax()`, `isMobile()`

## Shared state objects

- `CONFIG` — frozen constants in `src/config.js` (`MAX_ENTITIES`, `SPAWN_RATE`, `MOBILE_SCALE`, etc.)
- `state` — `screen` ('menu' | 'controls' | 'game'), `game_over`, `game_paused`, `score`, `timer`, `initialContainerCount`, `debugMode`, `inputScheme` ('A' | 'B' | 'C' | 'D')
- `input` — pointer tracking, braking flags/durations, `isShooting`, `isDraggingFromCenter`, plus scheme state (`tether`, `pursuit`, `wheel`, `thrust`)
- `player` — current weapon and fire rates / fire timestamp records
- `ui` — mouse coordinates (`mouseX`, `mouseY`) and `dialogueText`
- `world` / `camera` / `cameraOffset` — geometry and camera translation

## Controls & Input Schemes

- **Menu:**
  - `START GAME` — starts the game in normal mode (Scheme A).
  - `CONTROLS` — displays the controls reference screen.
  - `DEBUG` — starts the game in debug mode (enables in-game scheme switcher).
- **In-game buttons:**
  - Action button (bottom left) → cycles weapon (`machineGun` → `missile` → `beam` → `laser`).
  - Pause button → pauses/unpauses the game and adjusts timer pause duration.
  - Cargo button → picks up nearest cargo container in range or drops towed container.
  - Scheme button (debug mode only) → cycles active input scheme (`A` → `B` → `C` → `D`).
  - Reset button (on game over) → restarts game.
- **Input schemes (`src/schemes.js`):**
  - **Scheme A (Default / Drag-from-center):**
    - Drag from center circle sets target speed and movement direction.
    - Tap inside center circle brakes (single tap = 50%, double tap = full stop).
    - Click/tap outside center circle aims and fires weapon.
  - **Scheme B (Spring Tether / Slingshot):**
    - Dragging inside the inner low-thrust circle pulls ship with spring tether physics.
    - Dragging/clicking outside fires weapon.
  - **Scheme C (Touch Target Pursuit):**
    - Active pointer pulls ship toward cursor; middle click triggers emergency brake.
  - **Scheme D (Radial Steering Wheel):**
    - Left half of screen steers radial heading wheel; right half applies thrust and fires.

## Weapons

- `machineGun` — dual bullets, rapid fire rate
- `laser` — fast straight projectile, high velocity
- `missile` — starts slow, accelerates forward
- `beam` — instant wide area-of-effect ray, short duration, penetrates targets

## Coding conventions

- **ES modules** with explicit `import`/`export`.
- **Factory functions preferred** for new game entities and state; pass `game` explicitly rather than relying on globals.
- **Timings:** `performance.now()` for per-frame physics/deltas; `Date.now()` for wall-clock timer and pause tracking.
- **Physics units:** pixels per second; `deltaTime` in ms.
- **Styling:** Colors primarily defined using HSL / HSLA strings.
- **Formatting and Linting:** Run `pnpm run lint` before committing. Biome formatting must pass (`indentWidth: 4`, single quotes for JS).

## Assets

- `src/assets.js` — ship SVG strings and `loadSVGString()` / `drawSVGImg(ctx, img, scale)` helpers.

## Key files

- `src/game.js` — `createGame()` and main wiring hub
- `src/renderer.js` — `createRenderer()` canvas renderer
- `src/schemes.js` — input schemes A, B, C, D
- `src/input.js` — input event handling & delegation
- `src/systems/collisions.js` — collision handling
- `src/systems/Spawner.js` — entity spawning & lifecycle (`initGame`, `resetGame`)
- `src/systems/timer.js` — game clock and game-over handling
- `src/config.js` — frozen configuration constants
- `src/assets.js` — SVG assets and loader
- `src/utils/physics.js` — math & collision physics
- `src/utils/helpers.js` — general utilities
- `SMOKE_TESTS.md` — manual test script
- `docs/backlog.md` — active bugs and feature roadmap
- `docs/initialplan.md` — initial project plan
- `docs/done.md` — completed refactoring milestones
- `docs/scratchpad.md` — design ideas
- `README.md` — project overview and launch instructions
