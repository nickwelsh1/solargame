

> **Purpose:** This is the active bug and task backlog — short-term TODOs, known bugs, control tweaks, and feature ideas to implement next. (Previously `devnotes.md`; see `docs/plan.md` for the overall plan and `docs/scratchpad.md` for raw ideas.)

# Bugs & Improvements:

## TODO Priorities:
  - Freighter doesn't appear to take damage
  - mines and shots should deal enough damage to dislodge a container
  - Camera zoom out system
  
  - Armour and Shields system
    - angle of impact affects damage, 90 degree impact = full damage, 0 degree impact = no damage
    - angle of impact affects collision damage too
    - shields absorb damage
    - heat effects
    - armour piercing shots vs energy weapons
    - energy wavelengths affect different materials differently
    - shields allocated to different angles
    - a menu to allocate shields to different angles like a clock face
  
  - Ship energy allocation system
    - energy allocated to weapons, shields (wave lengths 1-4), engines (forward/turning), life support, repair systems, energy asorption (collect energy from sun, shield impacts, debris collection?), 
    - a menu to allocate energy to different angles like a clock face 0-8 / 0-16?

  - Artwork/animation system
    - ship, rockets/thrusters, rocket rails, damaged ship, dead ship, animation states (firing, thrusting, take damage, explode, different ways of dieing, collecting, mining, docking, warping)
  
  - Improve artwork for each entity
    - ship
    - freighter
    - tugship
    - containers
    - debris
    - explosions
    - collisions
    - mines
    - shots
    - asteroids
    - sun

## Gameplay


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


    - idea that you give accurrate orders, and the ship responds but with time from momentum.
  - CHOICE:test how it feels?

- pointer dot should not be drawn in inner circle
- 
done- initial start ship speed should be 0
done- restart button not centered
- flick direction should be more accurate again, just take 200ms to get to new set direction
  - animate transition
- more precise control over speed
done- outer circle should be smaller to allow some room for finger outside? or just remove outer circle?
  
- allow twice as long for flick drag to set speed & direction


## Idea
- fuel system, 100 fuel, 10 fuel used per slow move, 30 fuel per fast move, 4 fuel per brake.
  
- LOW: planets are all the same size & color
- zoom in & out at low speeds vs high speeds?


## Ideas
-shields allocated to different points.
-world of tanks like armour system, angle of impact a
effects penetration and heat distribution

done- pause icon not centered in button

- LOW:asteroid/foreground objects colours don't always standout on background
  - perhaps more fg colour consistency/harmony?
- add thrust button (prototype:thrust vs flick movement system?)

- asteroid hp (large 30hp, medium 20hp, small 10hp), asteroids take small amount of damage on collision. 
- collision fx (sparks/dust)

- LOW: button alignment going off bottom of mobile screen when screen rotated


// -sort out multi-touch shoot & move at same time



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


## Code (Game)
Todo: 
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
radiation, heat, solar winds, heliosphere, gravity, black holes, pulsars, planets, moons, asteroids, rings, space dust, ions, dark matter/anti matter, magnetic fields, solar flares, comets, cold, vacuum, debris, fluid dynamics, magnetic fields, warps, sub space, stargate, wormhole, satellite arrays, nebulae, cosmic rays, space station, science lab, orbit farms, orbital platforms, solar arrays, gasses and ice, freighters, tugs, docks, harbours, 

Boses: harvester/miner robot, alien swarm, alien mothership, alien tank ship, 

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


Goals:
- survive as long as possible
- collect as much as possible
- complete objectives

Tactics:
- shoot weakpoints
- push something heavy into enemy
- right weapon for job
- provoke enemy C against enemy D

Player Decisions:
- which path to take
- which objective to complete
- which weapon to use
- which enemy to target
- which item to pick up
- which item to use

To limit scope, we can add constraints:
- only small map
- only simple objectives
- only simple weapons
- only simple enemies

Double diamond design methodology:
- understand the problem
- define the problem
- generate solutions
- evaluate solutions

Flow state:
- clear goals
- immediate feedback
- challenge-skill balance
- focused attention
- loss of self-consciousness
- sense of control
- altered sense of time
- intrinsic motivation

SMACS:
- Simple - easy to understand, easy to play
- Modular - easy to extend, easy to maintain
- Adaptable - easy to adapt to different platforms
- Composable - easy to compose into larger systems
- Scalable - easy to scale to larger audiences

GAMES
What's in the Games?

What makes a game fun? How does the player feel?
8 ways players can have fun: 1,2,3,4,5,6, Sensation, Challenge, Narative, Fellowship, Fantasy, Discovery, Expression, Submission (unwind)
- Syndicate - fast paced (movement, shooting), tactical (positioning, cover), strategic (resource management, planning)
- Sonic - fast paced (movement, jumping), tactical (timing, precision), strategic (level design, power-ups)
- Mario - fast paced (movement, jumping), tactical (timing, precision), strategic (level design, power-ups)
- Celeste - fast paced (movement, jumping), tactical (timing, precision), strategic (level design, power-ups)
- Papers Please - slow paced (movement, reading), tactical (decision making, resource management), strategic (moral choices, planning)
- Nethack - slow paced (movement, exploration), tactical (resource management, positioning), strategic (level design, planning)
- Stygian Abyss - slow paced (movement, exploration), tactical (resource management, positioning), strategic (level design, planning)

Books:
Game Feel
The Art of Game Design
Theory of Play?
Indie Game Clinic (YouTube)

