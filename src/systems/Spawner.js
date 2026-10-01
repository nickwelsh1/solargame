import { createAsteroid } from '../entities/Asteroid.js';
import { createCargoContainer } from '../entities/CargoContainer.js';
import { createDialogue } from '../entities/Dialogue.js';
import { createFreighter } from '../entities/Freighter.js';
import { createMine } from '../entities/Mine.js';
import { Particle } from '../entities/Particle.js';
import { Planet } from '../entities/Planet.js';
import { createResearchStation } from '../entities/ResearchStation.js';
import { createSatellite } from '../entities/Satellite.js';
import { createShip } from '../entities/Ship.js';
import { createTugShip } from '../entities/TugShip.js';
import { createWarpGate } from '../entities/WarpGate.js';
import { randomMinMax } from '../utils/helpers.js';
import { startTimer } from './timer.js';

export function createSpawner(game) {
    const spawner = {
        spawnInitialAsteroids() {
            console.log('spawnInitialAsteroids');
            for (let i = 0; i < game.CONFIG.INITIAL_ASTEROID_COUNT; i++) {
                if (game.entities.length < game.CONFIG.MAX_ENTITIES) {
                    const asteroid = createAsteroid(game);
                    game.asteroids.push(asteroid);
                    game.entities.push(asteroid);
                }
            }
            console.log('asteroids spawned:', game.asteroids.length);
        },

        spanInitialPlanets() {
            // Spawn 1-3 planets
            const planetCount = randomMinMax(1, 3);

            for (let i = 0; i < planetCount; i++) {
                if (game.entities.length < game.CONFIG.MAX_ENTITIES) {
                    const planet = new Planet(game);
                    game.planets.push(planet);
                    game.entities.push(planet);
                }
            }
            console.log('planets spawned:', game.planets.length);
        },

        spawnSatellites() {
            game.planets.forEach((planet) => {
                const count = randomMinMax(1, 2);
                for (let i = 0; i < count; i++) {
                    const orbitDist = planet.radius + 60 + i * 50;
                    const initialAngle = i * Math.PI + Math.random();
                    const orbitSpeed =
                        (0.0003 + Math.random() * 0.0002) *
                        (Math.random() < 0.5 ? 1 : -1);
                    const satellite = createSatellite(
                        game,
                        planet,
                        orbitDist,
                        initialAngle,
                        orbitSpeed,
                    );
                    game.satellites.push(satellite);
                    game.entities.push(satellite);
                }
            });
            console.log('satellites spawned:', game.satellites.length);
        },

        spawnWarpGates() {
            const gateA = createWarpGate(game, 600, 600, 'Gate Alpha');
            const gateB = createWarpGate(
                game,
                game.world.width - 600,
                game.world.height - 600,
                'Gate Beta',
            );
            gateA.link(gateB);
            gateB.link(gateA);

            game.warpGates.push(gateA, gateB);
            game.entities.push(gateA, gateB);
            console.log('warp gates spawned: 2');
        },

        spawnResearchStation() {
            const stationX = game.world.width * 0.8;
            const stationY = game.world.height * 0.25;
            const station = createResearchStation(game, stationX, stationY);
            game.researchStation = station;
            game.entities.push(station);
            console.log('research station spawned at:', stationX, stationY);
        },

        spawnFreighterAndTug() {
            const fx = randomMinMax(500, game.world.width - 500);
            const fy = randomMinMax(500, game.world.height - 500);
            const angle = Math.random() * Math.PI * 2;
            const freighter = createFreighter(game, fx, fy, angle, 4);
            const tug = createTugShip(game, freighter);

            game.freighters.push(freighter);
            game.tugs.push(tug);
            game.entities.push(freighter, tug);
            console.log('freighter and escort tug spawned');
        },

        spawnMines() {
            const mineCount = 8;
            const minPlayerDist = 300;
            const cx = game.world.width / 2;
            const cy = game.world.height / 2;

            for (let i = 0; i < mineCount; i++) {
                let mx = randomMinMax(150, game.world.width - 150);
                let my = randomMinMax(150, game.world.height - 150);
                while (Math.hypot(mx - cx, my - cy) < minPlayerDist) {
                    mx = randomMinMax(150, game.world.width - 150);
                    my = randomMinMax(150, game.world.height - 150);
                }
                const mine = createMine(game, mx, my);
                game.mines.push(mine);
                game.entities.push(mine);
            }
            console.log('mines spawned:', game.mines.length);
        },

        createParticles() {
            for (let i = 0; i < game.CONFIG.PARTICLE_COUNT; i++) {
                game.particles.push(new Particle(game));
            }
        },

        spawnInitialContainers() {
            for (let i = 0; i < 5; i++) {
                const container = createCargoContainer(game);
                game.containers.push(container);
                game.entities.push(container);
            }
            game.state.initialContainerCount = game.containers.length;
            console.log('containers spawned:', game.containers.length);
        },

        /**
         * Spawn a group of projectiles offset around a primary projectile.
         * @param {Projectile} primaryObj - The projectile to use as a template.
         * @param {number} count - total number of projectiles to include.
         * @param {number} spacing - pixel distance between adjacent projectiles.
         * @param {number} spreadAngle - total angular spread in degrees (0 = parallel).
         * @param {...any} args - extra constructor args for projectile subclasses.
         * @returns {Projectile[]} all projectiles.
         */
        spawnOffsetGroup(
            primaryObj,
            count = 2,
            spacing = 10,
            spreadAngle = 0,
            ...args
        ) {
            if (count < 1) return [];

            const baseAngle = primaryObj.angle;
            const dx = Math.cos(baseAngle + Math.PI / 2);
            const dy = Math.sin(baseAngle + Math.PI / 2);
            const ProjectileClass = primaryObj.constructor;

            const mid = (count - 1) / 2;
            const angleStep =
                count > 1 ? (spreadAngle * Math.PI) / 180 / (count - 1) : 0;
            const _projectiles = [];

            for (let i = 0; i < count; i++) {
                const offsetIndex = i - mid;
                const offsetX = dx * offsetIndex * spacing;
                const offsetY = dy * offsetIndex * spacing;
                const angleOffset = (offsetIndex * angleStep) / 2;

                const angle = baseAngle + angleOffset;

                const newProjectile = new ProjectileClass(
                    primaryObj.game,
                    primaryObj.x + offsetX,
                    primaryObj.y + offsetY,
                    angle,
                    ...args,
                );

                _projectiles.push(newProjectile);
            }

            return _projectiles;
        },
    };

    return spawner;
}

export function initGame(game) {
    game.state.screen = 'game';
    game.state.score = 0;
    game.state.game_over = false;
    game.state.game_won = false;
    game.state.deliveredContainers = 0;
    game.ui.dialogueText = '';

    game.asteroids = [];
    game.projectiles = [];
    game.beams = [];
    game.containers = [];
    game.scrap = [];
    game.particles = [];
    game.planets = [];
    game.satellites = [];
    game.warpGates = [];
    game.researchStation = null;
    game.freighters = [];
    game.tugs = [];
    game.mines = [];
    game.entities = [];
    game.shipExplosion = null;

    startTimer(game, 5);
    game.dialogue = createDialogue(game);
    game.entities.push(game.dialogue);
    game.ship = createShip(game);
    game.entities.push(game.ship);

    game.spawner.spanInitialPlanets();
    game.spawner.spawnSatellites();
    game.spawner.spawnWarpGates();
    game.spawner.spawnResearchStation();
    game.spawner.spawnFreighterAndTug();
    game.spawner.spawnMines();
    game.spawner.createParticles();
    game.spawner.spawnInitialAsteroids();
    game.spawner.spawnInitialContainers();

    requestAnimationFrame((timestamp) => game.loop(timestamp));
}

export function resetGame(game) {
    game.state.game_over = false;
    game.state.game_won = false;
    game.state.deliveredContainers = 0;
    game.ui.dialogueText = '';
    game.shipExplosion = null;
    initGame(game);
}
