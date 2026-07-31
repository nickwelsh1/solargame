# Smoke Tests

> **Purpose:** Run these checks after any refactor, dependency/tooling change, or before committing to verify the game still works.

Run these checks after any refactor or dependency/tooling change.

## Static checks

- `pnpm run lint` passes.
- `pnpm test` passes.
- `pnpm run build` completes without errors.

## Menu

- Open the app.
- `Solar Game` title is visible.
- `START GAME` and `CONTROLS` buttons are clickable.

## Movement

- Start a game.
- Drag from the center circle: the ship accelerates toward the drag target.
- Tap the center circle once: the ship brakes to half speed.
- Double-tap the center circle: the ship comes to a full stop.

## Weapons

- Click outside the center circle: the ship rotates toward the cursor and fires the current weapon.
- Cycle weapons with the bottom-left action button.
- Confirm some weapons work:
  - `missile`: starts slow and accelerates.
  - `beam`: wide area-of-effect line.

## Cargo

- Move the ship near a cargo container.
- Press the cargo button: the container is towed.
- Move the ship, then press cargo button again: the container is dropped.

## Asteroids

- Shoot an asteroid: it splits or is destroyed and leaves particles.
- Check that asteroids collide with each other and with planets.

## Timer and game over

- Play until the 5-minute timer expires.
- Game over screen appears.
- Reset button restarts the game.
