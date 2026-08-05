

code review
**

Heavy reliance on global state Many modules (e.g., ship, asteroids, world, camera, state) are global let variables declared at the top of game.js. This makes it difficult to reason about side effects and to test in isolation.

DOM and game logic are tightly coupled game.js handles canvas rendering, input, game state, and UI drawing all in one place. Separating input handling, rendering, and game simulation would make the code more testable and easier to modify.

Split game.js into ES modules Move each class and subsystem into its own file:
src/entities/Ship.js, Asteroid.js, Projectile.js, etc.
src/systems/physics.js, input.js, renderer.js
src/state.js or Game.js for the top-level loop

Replace top-level let globals with explicit state management Use a single gameState or Game class and pass it into the systems that need it, rather than mutating global variables from inside every function.

Central Game / World class (easiest first step)
Put all the global arrays and state into one explicitly owned object, then pass it around.



js
// src/game.js
class Game {
  constructor() {
    this.state = new GameState();
    this.world = { width: 4000, height: 3000, ... };
    this.entities = {
      ship: null,
      asteroids: [],
      projectiles: [],
      particles: [],
      ...
    };
    this.input = new InputState();
    this.renderer = new Renderer(this);
    this.physics = new PhysicsSystem(this);
  }
 
  update(dt) { ... }
  draw() { ... }
}
Now a class like Asteroid only touches what it owns, and systems receive game or world in their constructor. This maps directly onto your current state, input, ui, and entities objects, but makes ownership explicit.

propose a concrete module split and file layout,
**



## Gameplay completed

Neither the ship nor asteroids have health yet; only cargo containers do.
Those three need health. The ship should be able to take 5 hits from asteroids before destruction. we need a 1second explosion when the ship gets destroyed. we need a small health bar ui for the ship, somewhere near top of game view.

DONE: Menu with Options:
DONE: - Start Game
DONE: - Controls


## Bugs completed

- Tap (inner circle) to brake 50% over 100ms. double-tap to brake 100% over 100ms.
  - CHOICE: double-tap or long-press to get 100% brake?
  - Currently braking is long press in inner-circle and tapping. Let's change it to single tap-up reduce current speed by 50%, double-tap-up reduce speed to 0. To visually indicate the braking let's add 8 little white triangles distributed evenly around the ship in a circle, each triangle pointing inwards to indicate braking.
- flick drag to set speed & direction, get there over 100ms.
  - Looks like it does this already, might need to slow turning or both a bit?
  - combine with more accurate flick direction against current direction momentum.

- ship health bar 50hp, asteroid impact damage 10hp, 
- collision hp damage relative to collision speed (max 50hp, min 1hp).

//TODO: shooting fixes
// -tapping in inner circle should not instantly stop ship (perhaps only slow 10%?)
// -sort out pointerDown & pointerMove & pointerUpdistinctions and overlap

// -fix shots start position(s)