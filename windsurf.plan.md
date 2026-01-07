# Solar Game - Project Plan

## Project Overview

**Name:** Solar Game  
**Type:** Web Game  
**Framework:** Vanilla JavaScript  
**Build Tool:** Vite

**Description:** HTML5 Canvas-based asteroids game with advanced features including multiple weapon types, planets, particle effects, and mobile-friendly controls.

---

## Architecture

### Overview

Client-side canvas game with object-oriented design pattern

### Structure

- **Entry Point:** `src/main.js`
- **Game Logic:** `src/game.js`
- **Styles:** `src/style.css`
- **HTML:** `index.html`

### Design Patterns

- Object-oriented programming with ES6 classes
- Game loop with delta time
- Entity-component pattern
- Camera system with offset tracking

---

## Features

### Implemented Features

#### 1. Ship Controls

- **Description:** Drag-from-center movement with momentum physics, rotation, and contrail effects
- **Files:** `src/game.js`

#### 2. Multiple Weapons

- **Description:** Machine gun (dual bullets), laser, missile, and beam weapons with different fire rates
- **Files:** `src/game.js`

#### 3. Asteroids

- **Description:** Procedurally generated asteroids with rotation, splitting mechanics, and collision detection
- **Files:** `src/game.js`

#### 4. Planets

- **Description:** Static planet entities with collision detection
- **Files:** `src/game.js`

#### 5. Particle System

- **Description:** Background star particles for visual depth
- **Files:** `src/game.js`

#### 6. Camera System

- **Description:** Follows ship with offset tracking for large world space
- **Files:** `src/game.js`

#### 7. Collision Detection

- **Description:** Projectile-asteroid, ship-asteroid, and asteroid-planet collisions
- **Files:** `src/game.js`

#### 8. Responsive Canvas

- **Description:** Auto-resizing canvas with mobile scaling support
- **Files:** `src/game.js`

#### 9. Game State Management

- **Description:** Score tracking, game over, pause functionality
- **Files:** `src/game.js`

#### 10. Dialogue System

- **Description:** In-game messages and restart functionality
- **Files:** `src/game.js`

### Planned Features

| Feature                         | Description                                                                      | Priority |
| ------------------------------- | -------------------------------------------------------------------------------- | -------- |
| **Sound Effects**               | Add audio for shooting, explosions, and background music                         | Medium   |
| **Power-ups**                   | Collectible items for weapon upgrades, shields, or speed boosts                  | Medium   |
| **Enemy Ships**                 | AI-controlled enemy ships that shoot back                                        | High     |
| **Level System**                | Progressive difficulty with waves of asteroids                                   | Medium   |
| **Minimap**                     | Small map showing world overview (variables exist but not implemented)           | Low      |
| **Local Storage**               | Save high scores and player preferences                                          | Low      |
| **Touch Controls Optimization** | Improve mobile touch interface with visual feedback                              | High     |
| **Weapon Selection UI**         | Better weapon switching interface (weaponButton exists but needs implementation) | Medium   |

---

## Code Structure

### Classes

#### Ship

- **Purpose:** Player-controlled spaceship with movement, rotation, and shooting
- **Key Methods:** `setRotation`, `setTarget`, `update`, `draw`, `shoot`
- **Properties:** position, angle, speed, contrail, weapons

#### Asteroid

- **Purpose:** Destructible space rocks with physics and splitting
- **Key Methods:** `update`, `draw`, `split`
- **Properties:** vertices, rotation, velocity, mass

#### Planet

- **Purpose:** Static celestial bodies with collision
- **Key Methods:** `update`, `draw`
- **Properties:** position, radius

#### Projectile

- **Purpose:** Base class for all weapon projectiles
- **Key Methods:** `update`, `draw`
- **Properties:** position, angle, speed, lifespan

#### Laser

- **Purpose:** Fast, instant-hit laser weapon
- **Extends:** Projectile

#### Bullet

- **Purpose:** Standard machine gun projectile
- **Extends:** Projectile

#### Missile

- **Purpose:** Accelerating projectile with increasing speed
- **Extends:** Projectile

#### Beam

- **Purpose:** Wide area-of-effect weapon
- **Key Methods:** `isPointInBeam`, `update`, `draw`

#### Particle

- **Purpose:** Background star particles for visual effect
- **Key Methods:** `update`, `draw`

#### Dialogue

- **Purpose:** In-game UI for messages and game over screen
- **Key Methods:** `draw`, `update`, `drawRoundedRectangle`, `drawText`

### Global State

- **CONFIG:** Frozen configuration object with game constants
- **state:** Game state (game_over, game_paused, score, timer)
- **input:** Input state tracking (mouse, touch, shooting)
- **player:** Player state (current weapon, fire rates)
- **world:** World boundaries and dimensions
- **camera:** Camera viewport and position
- **entities:** Array of all game entities for unified updates

---

## Technical Details

### Rendering

- **Engine:** HTML5 Canvas 2D Context
- **Approach:** Clear and redraw each frame
- **Optimization:** Entity limit (MAX_ENTITIES: 200)

### Physics

- **Movement:** Velocity-based with delta time
- **Collision:** Circle-circle collision detection
- **Momentum:** Velocity vector combination with momentum factor

### Controls

- **Mobile:** Touch-based with mobile scaling (MOBILE_SCALE: 0.55)
- **Desktop:** Mouse-based drag-from-center movement
- **Shooting:** Continuous fire while pointer is down

### Performance

- **Entity Limit:** 200
- **Particle Count:** 400
- **Frame Rate:** Unlocked with requestAnimationFrame

---

## Development

### Setup Commands

```bash
# Run development server
pnpm run dev

# Build for production
pnpm run build
```

### Dependencies

**Dev Dependencies:**

- vite: ^6.2.4

**Runtime:**

- Node.js: 22.15.0
- pnpm: 10.27.0

### File Structure

```
solargame/
├── public/          # Static assets
├── src/
│   ├── game.js      # Main game logic (2191 lines)
│   ├── main.js      # Entry point
│   ├── style.css    # Game styling
│   └── counter.js   # (unused)
├── index.html       # HTML structure
├── package.json
└── README.md
```

---

## Improvements

### Code Quality

| Issue                                        | Suggestion                                                    | Priority |
| -------------------------------------------- | ------------------------------------------------------------- | -------- |
| Large monolithic game.js file (2191 lines)   | Split into modules: entities/, systems/, utils/               | Medium   |
| Global state management                      | Implement state management pattern or use a lightweight store | Medium   |
| Unused code (counter.js, commented sections) | Clean up unused imports and files                             | Low      |
| Magic numbers in code                        | Move more constants to CONFIG object                          | Low      |

### Features

| Feature             | Note                                                          | Priority |
| ------------------- | ------------------------------------------------------------- | -------- |
| Weapon selection UI | weaponButton element exists in HTML but not fully implemented | Medium   |
| Minimap             | MINIMAP_SCALE and MINIMAP_MARGIN variables exist but unused   | Low      |
| Debug mode          | debugEl initialized but debug functionality incomplete        | Low      |

### Performance

| Optimization                                 | Benefit                                | Priority |
| -------------------------------------------- | -------------------------------------- | -------- |
| Object pooling for projectiles and particles | Reduce garbage collection              | Medium   |
| Spatial partitioning for collision detection | Improve performance with many entities | Low      |
| Offscreen canvas for static elements         | Reduce draw calls                      | Low      |

---

## Testing

### Manual Testing Checklist

- [ ] Ship movement and rotation
- [ ] Weapon switching and firing
- [ ] Asteroid collision and splitting
- [ ] Game over and restart
- [ ] Mobile touch controls
- [ ] Canvas resizing

### Automated Testing

**Status:** Not implemented

**Suggestions:**

- Unit tests for physics calculations
- Integration tests for collision detection
- E2E tests for game flow

---

## Deployment

### Target

Static web hosting

### Build Output

`dist/`

### Recommended Platforms

- Cloudflare Pages (static hosting)
- or GitHub Pages

---

## Notes

### Strengths

- ✅ Clean OOP design with ES6 classes
- ✅ Smooth physics and movement
- ✅ Multiple weapon types implemented
- ✅ Mobile-friendly controls
- ✅ Efficient entity management

### Challenges

- ⚠️ Large single file needs refactoring
- ⚠️ Some incomplete features (minimap, weapon UI)
- ⚠️ No test coverage
- ⚠️ Limited documentation in code

### Next Steps

1. Refactor game.js into modules
2. Implement weapon selection UI
3. Add sound effects
4. Create enemy AI
5. Add level progression system

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
