

> **Purpose:** This is the active bug and task backlog — short-term TODOs, known bugs, control tweaks, and feature ideas to implement next. (Previously `devnotes.md`; see `docs/plan.md` for the overall plan and `docs/scratchpad.md` for raw ideas.)

# Bugs & Improvements:

## TODO Priorities:

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

## Gameplay

Neither the ship nor asteroids have health yet; only cargo containers do.
Those three need health. The ship should be able to take 5 hits from asteroids before destruction. we need a 1second explosion when the ship gets destroyed. we need a small health bar ui for the ship, somewhere near top of game view.

DONE: Menu with Options:
DONE: - Start Game
DONE: - Controls

Controls Options for Prototyping movement:

1.  simple TOUCH: existing click anywhere (direction & shoot) + thrust button
    - simple KB & MOUSE: existing click anywhere (direction & shoot) + thrust KB button
      -- simple? GAMEPAD: (ship movement) + button (shoot) [no way to test]

2.  current TOUCH: flick drag to set speed & direction + click anywhere (direction & shoot)
    - shooting should be burst of fire with required cooldowns.
    -
    - complex multi-TOUCH: existing click anywhere (shoot direction) + screen joystick corner (ship movement)
    - complex KB & MOUSE: arrow keys (ship movement) + mouse click (shoot)

Bugs:

- Tap (inner circle) to brake 50% over 100ms. double-tap to brake 100% over 100ms.
  - CHOICE: double-tap or long-press to get 100% brake?
  - Currently braking is long press in inner-circle and tapping. Let's change it to single tap-up reduce current speed by 50%, double-tap-up reduce speed to 0. To visually indicate the braking let's add 8 little white triangles distributed evenly around the ship in a circle, each triangle pointing inwards to indicate braking.
- flick drag to set speed & direction, get there over 100ms.
  - Looks like it does this already, might need to slow turning or both a bit?
  - combine with more accurate flick direction against current direction momentum.
    - idea that you give accurrate orders, and the ship responds but with time from momentum.
  - CHOICE:test how it feels?
- initial start ship speed should be 0
- pointer dot should not be drawn in inner circle
- restart button not centered
- flick direction should be more accurate again, just take 200ms to get to new set direction
  - animate transition
- more precise control over speed
- outer circle should be smaller to allow some room for finger outside? or just remove outer circle?
- allow twice as long for flick drag to set speed & direction
- fuel system, 100 fuel, 10 fuel used per slow move, 30 fuel per fast move, 4 fuel per brake.
- LOW: planets are all the same size & color
- pause icon not centered in button
- LOW:asteroid/foreground objects colours don't always standout on background
  - perhaps more fg colour consistency/harmony?
- add thrust button (prototype:thrust vs flick movement system?)
- zoom in & out at low speeds vs high speeds?
- ship health bar 100hp, asteroid impact damage 10hp, asteroid hp (large 30hp, medium 20hp, small 10hp), asteroids take small amount of damage on collision. collision hp damage relative to collision speed (max 50hp, min 1hp).
- collision fx (sparks/dust)
- LOW: button alignment going off bottom of mobile screen when screen rotated

//TODO: shooting fixes
// -tapping in inner circle should not instantly stop ship (perhaps only slow 10%?)
// -sort out multi-touch shoot & move at same time
// -sort out pointerDown & pointerMove & pointerUpdistinctions and overlap

// -fix shots start position(s)

//TODO: -Animation: ship explosion, asteroid explosion
// -Animation: and effects

//TODO: -entities that reach edge of world should instead wrap around to other side of world ?
//TODO: .-camera should not be bound to world, and should also be able to wrap around as ship approaches/crosses world boundary
//TODO: -support camera shake
//TODO: .-basic dialogue/modal (text, delay)
//
//TODO: shoot key for desktops
// -shoot button for gamepads
// -controls for gamepads
//TODO: -UI buttons [shoot/interact, change weapon, boost?]
// should UI buttons be circles (for finger touch)?
//
//TODO: FX ship at max speed effect
//TODO: FX dust should streak at speed
//TODO: FX effects when asteroids hit
// .-use SVG for sprites e.g. ship/shots/effects/asteroid texture
//DONE: mouse position fixes
//DONE: ship/mouse alignment. center of ship appears about 15px left or mouse.
//DONE: draw mouse cursor crosshair in canvas instead of CSS?

Todo: Code (Game)
Priority: intuitive movement mechanics, ui to indicate selected weapon, and what buttons do (choose thrust button, or rts style select to move (move mode vs fire mode)?) UI/UX
Entities - planets, warp exit, (Levels, objectives)
Objectives - destroy enemies, get to destination/pickup tools

Controls - additional buttons [pause, thrust {fine control?}, dash (through soft enemies), brake] - Layout? push/pull, grapple/tow, juggle, ride
Controls - tap to slow, double tap to stop ?
Controls - smoother control of speeds

make first weapon bullets
resources to collect ($$$ / rings / salvage)

Obstacles/forces - solar winds, shockwaves, fast asteroids, spinning turret beams, lava flood/wave, solar flare, destructable objects, ice geysers,

Limits - fuel, ammo, health, life support? food?
Slower speed, reduce collision dmg with asteroids?

Entities - heavy and light objects that can be pushed and pulled around (additional properties, like heat resistant/shielding, light obscuring, absorb enemy shots, obscure enemy vision)
Entities - configurable JSON (i.e. can have health, weight, direction, speed, isExplosive, drops[array], aggroRadius, attractTo: player, friendlyFire, patrolPath, patrolZone, attackTypes[move, shoot, missile, areaAttack], homingArc, heat, heatResistance, cold, coldResistance, hearingRadius, coolDown, evasionStrategy[avoidsClose, trysToGetClose], solarPowered, energy)
Entities - exploding barrels/fuel tanks
Entities - enemy mines (radius drift toward player) & drone turrets

Enemy - zones or patrol paths they are unlikely to leave (gravity?)
Enemy - wall of spikes like attack/enemy you need to dash to dodge
Enemy - fast weak charging enemy
Enemy - large enemy that tries to chomp you
Enemy - boss fights, telegraphed attacks, timed weak spots

Interesting enemies (drift mines, stationary drone, missile , enemy fighters)
Transferable, combinable properties/mechanics
Controls - virtual joystick

Entities - destinations (planets, stations, warp gates)

Player - health to take more hits OR asteroids less dangerous?
Player - shields / placeable shield wall, player & asteroid bounce physics
Player - after taking dmg, no new dmg for 30ms

Header - "gameover" does not need to display in header.
Menus - on gameover screen show last top 5 scores
Asteroids - split too small (too dangerous, too hard?) - smallest chunks should be a resource$$$
PUZZLES? weapon A most effective against enemy A, strategy B against enemy B, scan to reveal hidden things, lure enemies (hit bell), borrow an enemies ability, tie an object to another, be towed by an entity, set trap, hack/control entity, enemy that is only visible every 2 seconds?, reflect enemy shots back at them, carry things, push/pull things, open doors, levers, objects that can act like keys,
STRATEGIES? shoot weakpoints, push something heavy into enemy, right weapon for job, provoke enemy C against enemy D,
TOOLS? magic like tools? build limit break attack, push/dodge/teleport,

Bug: copy of dust particles frozen in lower right corner sometimes
Entities - Stationary enemy that shoots in your direction , enemy alertness range, enemy that deploys a wall, enemy that can push, enemy telegraphs a charge, enemy with weakness at back
Entities - enemy drones/types/ mining
Controls - Brake animation occurs too late
Level goal, fly to X / destroy 2 asteroids / take a to b (pick up items) /
Animation - ship thrusters should take 30ms to get to set power,
Add pinball bumpers, paddles and ramps/curves? Spinning stations act as paddles? Or vortexes?
Have three onscreen buttons (next item, use item, grab/throw)
Shoot could slow/push asteroid momentum
Zoom out view out at higher speeds
FX - Fatter contrail / double contrail
Count moves/fuel use
Entities - Asteroids drop power ups (points, fuel, ammo, weapons, portal, grappling hook link)
Weapons - more unique as tools, rail through objects, rockets area of effect
As a Mining ship could grab/push/throw asteroids to refinery. Grab could act like a shield
Zoom camera out with speed? All distances would need to be scaled by a multiplier . Too fast on mobile
Controls - game: slowmo, interact
NOTES - SCAMPER: indie game clinic , secrets, environmental storytelling
