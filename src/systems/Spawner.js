import { createAsteroid } from '../entities/Asteroid.js';
import { createCargoContainer } from '../entities/CargoContainer.js';
import { createDialogue } from '../entities/Dialogue.js';
import { Particle } from '../entities/Particle.js';
import { Planet } from '../entities/Planet.js';
import { createShip } from '../entities/Ship.js';
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
            // Clear existing planets
            // planets = [];

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
    game.ui.dialogueText = '';
    game.containers = [];
    game.scrap = [];
    game.shipExplosion = null;
    startTimer(game, 5);
    game.dialogue = createDialogue(game);
    game.entities.push(game.dialogue);
    game.ship = createShip(game);
    game.entities.push(game.ship);
    game.spawner.spanInitialPlanets();
    game.spawner.createParticles();
    game.spawner.spawnInitialAsteroids();
    game.spawner.spawnInitialContainers();
    requestAnimationFrame((timestamp) => game.loop(timestamp));
}

export function resetGame(game) {
    game.state.game_over = false;
    game.ui.dialogueText = '';
    game.shipExplosion = null;
    initGame(game);
    game.asteroids = [];
    game.projectiles = [];
    game.beams = [];
    game.containers = [];
    game.scrap = [];
    game.entities = [];
    game.spawner.spawnInitialAsteroids();
}
