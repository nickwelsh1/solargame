import { Asteroid } from '../entities/Asteroid.js';
import { CargoContainer } from '../entities/CargoContainer.js';
import { Particle } from '../entities/Particle.js';
import { Planet } from '../entities/Planet.js';
import { randomMinMax } from '../utils/helpers.js';

export class Spawner {
    constructor(game) {
        this.game = game;
    }

    spawnInitialAsteroids() {
        console.log('spawnInitialAsteroids');
        for (let i = 0; i < this.game.CONFIG.INITIAL_ASTEROID_COUNT; i++) {
            if (this.game.entities.length < this.game.CONFIG.MAX_ENTITIES) {
                const asteroid = new Asteroid(this.game);
                this.game.asteroids.push(asteroid);
                this.game.entities.push(asteroid);
            }
        }
        console.log('asteroids spawned:', this.game.asteroids.length);
    }

    spanInitialPlanets() {
        // Clear existing planets
        // planets = [];

        // Spawn 1-3 planets
        const planetCount = randomMinMax(1, 3);

        for (let i = 0; i < planetCount; i++) {
            if (this.game.entities.length < this.game.CONFIG.MAX_ENTITIES) {
                const planet = new Planet(this.game);
                this.game.planets.push(planet);
                this.game.entities.push(planet);
            }
        }
        console.log('planets spawned:', this.game.planets.length);
    }

    createParticles() {
        for (let i = 0; i < this.game.CONFIG.PARTICLE_COUNT; i++) {
            this.game.particles.push(new Particle(this.game));
        }
    }

    spawnInitialContainers() {
        for (let i = 0; i < 5; i++) {
            const container = new CargoContainer(this.game);
            this.game.containers.push(container);
            this.game.entities.push(container);
        }
        this.game.state.initialContainerCount = this.game.containers.length;
        console.log('containers spawned:', this.game.containers.length);
    }

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
    }
}
