import { describe, expect, it } from 'vitest';
import { createCargoContainer } from '../src/entities/CargoContainer.js';
import { createFreighter } from '../src/entities/Freighter.js';
import { createMine } from '../src/entities/Mine.js';
import { createResearchStation } from '../src/entities/ResearchStation.js';
import { createSatellite } from '../src/entities/Satellite.js';
import { createScrap } from '../src/entities/Scrap.js';
import { createTugShip } from '../src/entities/TugShip.js';
import { createWarpGate } from '../src/entities/WarpGate.js';
import { createState } from '../src/state.js';
import { handleCollisions } from '../src/systems/collisions.js';

function createMockGame() {
    return {
        world: { width: 4000, height: 3000 },
        camera: { width: 800, height: 600 },
        cameraOffset: { x: 0, y: 0 },
        ctx: {
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            beginPath: () => {},
            arc: () => {},
            rect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            stroke: () => {},
            fill: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            fillText: () => {},
            measureText: () => ({ width: 50 }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            setLineDash: () => {},
        },
        state: createState(),
        ui: { dialogueText: '' },
        ship: {
            x: 500,
            y: 500,
            radius: 20,
            speed: 0.1,
            maxSpeed: 0.2,
            angle: 0,
            movementAngle: 0,
            health: 50,
            maxHealth: 50,
            dead: false,
            takeDamage(amount) {
                this.health -= amount;
                if (this.health <= 0) this.dead = true;
            },
            towedContainer: null,
        },
        containers: [],
        scrap: [],
        satellites: [],
        freighters: [],
        tugs: [],
        warpGates: [],
        researchStation: null,
        mines: [],
        planets: [],
        explosions: [],
        asteroids: [],
        projectiles: [],
        beams: [],
        particles: [],
        entities: [],
    };
}

describe('Satellites', () => {
    it('orbits slowly around planet and updates coordinates', () => {
        const game = createMockGame();
        const planet = { x: 1000, y: 1000, radius: 100 };
        const sat = createSatellite(game, planet, 200, 0, 0.001);

        expect(sat.x).toBeCloseTo(1200);
        expect(sat.y).toBeCloseTo(1000);

        // Advance 1000 ms -> angle advances by 1 radian
        sat.update(1000);
        expect(sat.angle).toBeCloseTo(1);
        expect(sat.x).toBeCloseTo(1000 + Math.cos(1) * 200);
        expect(sat.y).toBeCloseTo(1000 + Math.sin(1) * 200);
    });

    it('has high health and destroys when health reaches 0', () => {
        const game = createMockGame();
        const planet = { x: 500, y: 500, radius: 100 };
        const sat = createSatellite(game, planet, 180, 0, 0.001);
        game.satellites.push(sat);
        game.entities.push(sat);

        expect(sat.health).toBe(200);
        sat.takeDamage(50);
        expect(sat.health).toBe(150);

        sat.takeDamage(150);
        expect(sat.health).toBe(0);
        expect(game.satellites).not.toContain(sat);
        expect(game.scrap.length).toBeGreaterThan(0);
    });

    it('collisions push player, tugs, small asteroids, and empty freighters with reduced damage', () => {
        const game = createMockGame();
        const sat = createSatellite(game, null, 0, 0, 0);
        sat.x = 500;
        sat.y = 500;
        sat.radius = 20;
        game.satellites.push(sat);

        // 1. Ship collision: reduced damage (3 instead of 10)
        game.ship.x = 515;
        game.ship.y = 500;
        game.ship.speed = 0.05; // 50 px/s
        handleCollisions(game);
        expect(game.ship.health).toBe(47); // 50 - 3 = 47
        expect(game.ship.x).toBeGreaterThan(515); // pushed out

        // 2. Small asteroid collision: gets moderate repulsive push, both take damage
        const smallAst = {
            x: 520,
            y: 500,
            radius: 20,
            health: 20,
            maxHealth: 20,
            velocityX: -10,
            velocityY: 0,
            mass: 500,
        };
        const satHealthBefore = sat.health;
        game.asteroids.push(smallAst);
        handleCollisions(game);
        expect(smallAst.velocityX).toBeGreaterThan(0); // bounced away
        expect(smallAst.velocityX).toBeLessThan(30); // moderate force, not excessive
        expect(sat.health).toBeLessThan(satHealthBefore); // satellite took damage
        expect(smallAst.health).toBeLessThan(20); // asteroid took damage

        // 3. Tug collision: pushed away and repair interrupted
        const freighter = createFreighter(game, 800, 800, 0, 0);
        const tug = createTugShip(game, freighter);
        tug.x = 515;
        tug.y = 500;
        tug.repairTimer = 5000;
        game.tugs.push(tug);
        handleCollisions(game);
        expect(tug.x).toBeGreaterThan(530); // pushed away
        expect(tug.repairTimer).toBe(0); // repair interrupted

        // 4. Empty freighter collision: pushed away
        freighter.x = 550;
        freighter.y = 500;
        game.freighters.push(freighter);
        handleCollisions(game);
        expect(freighter.x).toBeGreaterThan(550); // empty freighter deflected
    });
});

describe('Freighter', () => {
    it('calculates speed based on weight (container count) and active rockets', () => {
        const game = createMockGame();
        const freighterEmpty = createFreighter(game, 500, 500, 0, 0);
        const freighterFull = createFreighter(game, 500, 500, 0, 5);

        // More containers = heavier = slower speed
        expect(freighterFull.calculateSpeed()).toBeLessThan(
            freighterEmpty.calculateSpeed(),
        );

        // Damaging a rocket slows down the freighter
        const speed4Rockets = freighterFull.calculateSpeed();
        freighterFull.damageRocket(0, 30);
        expect(freighterFull.rockets[0].damaged).toBe(true);

        const speed3Rockets = freighterFull.calculateSpeed();
        expect(speed3Rockets).toBeLessThan(speed4Rockets);
        expect(speed3Rockets).toBeCloseTo(speed4Rockets * (3 / 4));

        // Repairing rocket restores speed
        freighterFull.repairRocket(0);
        expect(freighterFull.rockets[0].damaged).toBe(false);
        expect(freighterFull.calculateSpeed()).toBeCloseTo(speed4Rockets);
    });

    it('shooting a full freighter dislodges a container after 3 hits', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 5);
        game.freighters.push(freighter);

        expect(freighter.containers.length).toBe(5);

        // Hit 1
        const drop1 = freighter.onShotHit(0);
        expect(drop1).toBeNull();
        expect(freighter.containers.length).toBe(5);

        // Hit 2
        const drop2 = freighter.onShotHit(0);
        expect(drop2).toBeNull();
        expect(freighter.containers.length).toBe(5);

        // Hit 3 -> Dislodges container!
        const drop3 = freighter.onShotHit(0);
        expect(drop3).not.toBeNull();
        expect(freighter.containers.length).toBe(4);
        expect(game.containers).toContain(drop3);
    });

    it('drops containers on force bump with chance proportional to cargo count', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 5);
        game.freighters.push(freighter);

        // Low force does not drop containers
        const noDrop = freighter.onBump(10, 0);
        expect(noDrop).toBeNull();
        expect(freighter.containers.length).toBe(5);

        // Force bump drops container
        let dropped = null;
        for (let i = 0; i < 20; i++) {
            dropped = freighter.onBump(60, 0);
            if (dropped) break;
        }
        expect(dropped).not.toBeNull();
        expect(freighter.containers.length).toBeLessThan(5);
        expect(game.containers).toContain(dropped);
    });

    it('attaches container back to freighter cargo slot', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 2);
        const container = createCargoContainer(game);
        game.containers.push(container);

        expect(freighter.containers.length).toBe(2);
        const attached = freighter.attachContainer(container);
        expect(attached).toBe(true);
        expect(freighter.containers.length).toBe(3);
        expect(game.containers).not.toContain(container);
    });
});

describe('Tug Ship', () => {
    it('escorts freighter and detects damaged rockets', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 2);
        const tug = createTugShip(game, freighter);

        expect(tug.state).toBe('ESCORT');

        // When a rocket is damaged, tug switches to repair state
        freighter.damageRocket(1, 30);
        tug.update(16);
        expect(tug.state).toBe('REPAIR_ROCKET');
        expect(tug.repairTargetRocket.id).toBe(1);
    });

    it('repairs rocket after 50 seconds uninterrupted', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 2);
        const tug = createTugShip(game, freighter);
        freighter.damageRocket(0, 30);

        // Place tug right next to the rocket
        const rocketPos = freighter.getRocketWorldPos(freighter.rockets[0]);
        tug.x = rocketPos.x;
        tug.y = rocketPos.y;

        tug.update(1000);
        expect(tug.isRepairing).toBe(true);
        expect(tug.repairTimer).toBe(1000);

        // Advance 49000 ms more (total 50,000 ms = 50s)
        tug.update(49000);
        expect(freighter.rockets[0].damaged).toBe(false);
        expect(tug.repairTimer).toBe(0);
        expect(tug.isRepairing).toBe(false);
    });

    it('resets 50s repair timer when interrupted by bump or attack', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 2);
        const tug = createTugShip(game, freighter);
        freighter.damageRocket(0, 30);

        const rocketPos = freighter.getRocketWorldPos(freighter.rockets[0]);
        tug.x = rocketPos.x;
        tug.y = rocketPos.y;

        tug.update(25000); // 25 seconds in
        expect(tug.repairTimer).toBe(25000);

        // Bump occurs
        tug.onBump();
        expect(tug.repairTimer).toBe(0);
        expect(tug.isRepairing).toBe(false);

        // Resumes and gets attacked
        tug.update(10000);
        expect(tug.repairTimer).toBe(10000);
        tug.takeDamage(10);
        expect(tug.repairTimer).toBe(0);
    });

    it('physically pushes nearby dropped container back to freighter', () => {
        const game = createMockGame();
        const freighter = createFreighter(game, 500, 500, 0, 2);
        const tug = createTugShip(game, freighter);

        // Container dropped 100px away
        const lostContainer = createCargoContainer(game);
        lostContainer.x = 600;
        lostContainer.y = 500;
        game.containers.push(lostContainer);

        tug.update(16);
        expect(tug.state).toBe('RETRIEVE_CONTAINER');
        expect(tug.targetContainer).toBe(lostContainer);
    });
});

describe('Warp Gates', () => {
    it('teleports ship and towed cargo to destination gate', () => {
        const game = createMockGame();
        const gateA = createWarpGate(game, 200, 200, 'Gate A');
        const gateB = createWarpGate(game, 3000, 2000, 'Gate B');
        gateA.link(gateB);
        gateB.link(gateA);

        const container = createCargoContainer(game);
        container.isTowed = true;
        game.ship.towedContainer = container;

        game.ship.x = 200;
        game.ship.y = 200;

        const jumped = gateA.teleport(game.ship);
        expect(jumped).toBe(true);
        expect(gateA.cooldown).toBeGreaterThan(0);
        expect(gateB.cooldown).toBeGreaterThan(0);

        // Ship is now near Gate B
        expect(
            Math.hypot(game.ship.x - gateB.x, game.ship.y - gateB.y),
        ).toBeLessThan(100);
        // Towed container also moved near ship at Gate B
        expect(
            Math.hypot(container.x - game.ship.x, container.y - game.ship.y),
        ).toBeLessThan(60);
    });
});

describe('Research Station', () => {
    it('accepts delivered containers and triggers level win at 3 containers', () => {
        const game = createMockGame();
        const station = createResearchStation(game, 1000, 1000);
        game.researchStation = station;

        const c1 = createCargoContainer(game);
        c1.x = 1000;
        c1.y = 1000;
        game.containers.push(c1);

        station.update(16);
        expect(station.deliveredCount).toBe(1);
        expect(game.state.deliveredContainers).toBe(1);
        expect(game.containers).not.toContain(c1);
        expect(game.state.game_won).toBe(false);

        // Deliver container 2
        const c2 = createCargoContainer(game);
        c2.x = 1000;
        c2.y = 1000;
        game.containers.push(c2);
        station.update(16);
        expect(station.deliveredCount).toBe(2);

        // Deliver container 3 -> Win!
        const c3 = createCargoContainer(game);
        c3.x = 1000;
        c3.y = 1000;
        game.containers.push(c3);
        station.update(16);
        expect(station.deliveredCount).toBe(3);
        expect(game.state.game_won).toBe(true);
        expect(game.state.game_over).toBe(true);
        expect(game.ui.dialogueText).toContain('MISSION COMPLETE');
    });
});

describe('Mines', () => {
    it('pursues target within 180 px and returns to origin when outside 180 px', () => {
        const game = createMockGame();
        const mine = createMine(game, 500, 500);

        // Ship outside 180 px (dist = 220)
        game.ship.x = 720;
        game.ship.y = 500;
        mine.update(100);
        expect(mine.state).toBe('IDLE');

        // Ship enters 180 px range (dist = 140)
        game.ship.x = 640;
        game.ship.y = 500;
        mine.update(100);
        expect(mine.state).toBe('PURSUING');
        expect(mine.velocityX).toBeGreaterThan(0);

        // Ship moves away outside 180 px (dist = 300)
        game.ship.x = 800;
        mine.update(100);
        expect(mine.state).toBe('RETURNING');
    });

    it('attracted to freighters, tug ships, and satellites within 180 px', () => {
        const game = createMockGame();
        game.ship.dead = true; // disable ship

        const mine = createMine(game, 500, 500);

        // Freighter within 150 px
        const freighter = createFreighter(game, 620, 500, 0, 2);
        game.freighters.push(freighter);
        mine.update(100);
        expect(mine.state).toBe('PURSUING');
        expect(mine.velocityX).toBeGreaterThan(0);

        // Tug within range
        game.freighters = [];
        const tug = createTugShip(game, freighter);
        tug.x = 420;
        tug.y = 500;
        game.tugs.push(tug);
        mine.update(100);
        expect(mine.state).toBe('PURSUING');

        // Satellite within range
        game.tugs = [];
        const sat = createSatellite(game, null, 0, 0, 0);
        sat.x = 500;
        sat.y = 620;
        game.satellites.push(sat);
        mine.update(100);
        expect(mine.state).toBe('PURSUING');
    });

    it('creates explosion with AOE damage and shockwave knocking scrap when detonated or shot', () => {
        const game = createMockGame();
        const mine = createMine(game, 500, 500);
        game.mines.push(mine);

        // Place a tug and scrap nearby
        const freighter = createFreighter(game, 800, 800, 0, 0);
        const tug = createTugShip(game, freighter);
        tug.x = 540;
        tug.y = 500;
        game.tugs.push(tug);

        const scrap = createScrap(game, 520, 500, null);
        game.scrap.push(scrap);

        game.ship.x = 550;
        game.ship.y = 500;

        // Shoot mine with projectile
        const proj = { x: 500, y: 500, radius: 5, angle: 0 };
        game.projectiles.push(proj);

        handleCollisions(game);

        expect(mine.destroyed).toBe(true);
        expect(game.mines).not.toContain(mine);
        // Visual explosion spawned
        expect(game.explosions.length).toBeGreaterThan(0);
        // AOE damage applied to ship and tug
        expect(game.ship.health).toBeLessThan(50);
        expect(tug.health).toBeLessThan(100);
        // Scrap knocked away by shockwave
        expect(scrap.velocityX).toBeGreaterThan(50);
    });

    it('bounces off asteroids or planets without exploding', () => {
        const game = createMockGame();
        const mine = createMine(game, 500, 500);
        mine.velocityX = 20;

        // Collision with asteroid at (510, 500)
        mine.bounceOff(510, 500, 20);

        expect(mine.destroyed).toBe(false);
        // Velocity along normal was reflected
        expect(mine.velocityX).toBeLessThan(0);
    });
});

describe('Scrap Debris', () => {
    it('is knocked about by collisions with ship, asteroids, and projectiles', () => {
        const game = createMockGame();
        const scrap = createScrap(game, 500, 500, null);
        scrap.velocityX = 0;
        scrap.velocityY = 0;
        game.scrap.push(scrap);

        // 1. Ship knocks scrap
        game.ship.x = 490;
        game.ship.y = 500;
        game.ship.speed = 0.1; // 100 px/s
        game.ship.movementAngle = 0;
        handleCollisions(game);
        expect(scrap.velocityX).toBeGreaterThan(50);

        // 2. Asteroid knocks scrap
        scrap.velocityX = 0;
        scrap.velocityY = 0;
        scrap.x = 500;
        scrap.y = 500;
        const ast = {
            x: 480,
            y: 500,
            radius: 25,
            velocityX: 40,
            velocityY: 0,
        };
        game.asteroids.push(ast);
        handleCollisions(game);
        expect(scrap.velocityX).toBeGreaterThan(40);

        // 3. Projectile knocks scrap
        scrap.velocityX = 0;
        scrap.velocityY = 0;
        scrap.x = 500;
        scrap.y = 500;
        game.asteroids = [];
        const proj = { x: 500, y: 500, radius: 4, angle: 0 };
        game.projectiles.push(proj);
        handleCollisions(game);
        expect(scrap.velocityX).toBeGreaterThan(100);
        expect(game.projectiles).not.toContain(proj);
    });
});
