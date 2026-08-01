import { Renderer } from './renderer.js';
import { addVelocities, checkCircleCollision } from './utils/physics.js';
import { CONFIG } from './config.js';
import { shipSVG3, loadSVGString } from './assets.js';
import { World } from './world.js';
import { Camera } from './camera.js';
import { createState } from './state.js';
import { createInput, setupInputListeners } from './input.js';
import { startTimer, triggerGameOver } from './systems/timer.js';
import { Player } from './player.js';
import { createUI } from './ui.js';
import { Ship } from './entities/Ship.js';
import { Dialogue } from './entities/Dialogue.js';
import { Spawner } from './systems/Spawner.js';
import {
    calculateNewPosition,
    logarithmicIncrease,
    countObjectProperties,
    isMobile,
} from './utils/helpers.js';

let game;

class Game {
    constructor() {
        this.lastTime = 0;

        this.renderer = new Renderer();
        this.canvas = this.renderer.canvas;
        this.ctx = this.renderer.ctx;
        this.weaponButton = document.getElementById('weaponButton');
        this.message = document.querySelector('.message');
        this.debugEl = initDebugArea();

        this.ship = null;
        this.asteroids = [];
        this.projectiles = [];
        this.particles = [];
        this.planets = [];
        this.dialogue = null;
        this.beams = []; // Array to track active beams
        this.containers = [];
        this.scrap = [];
        this.world = new World();
        this.camera = new Camera();

        this.MINIMAP_SCALE = 0;
        this.MINIMAP_MARGIN = 0;

        this.resize();

        this.cameraOffset = { x: 0, y: 0 };
        this.entities = [];

        // Game State
        this.state = createState();

        this.CENTER_CIRCLE_RADIUS = 50 * CONFIG.MOBILE_SCALE;  // Radius of the central UI circle for interaction
        // debug(`cw, ch: ${camera.width}, ${camera.height}`);
        this.CENTER_MAXTHRUST_RADIUS = 0.5 * Math.min(this.camera.width, this.camera.height) - 8;  // Radius of the central UI circle for interaction
        this.CENTER_LOWTHRUST_RADIUS = 0.5 * this.CENTER_MAXTHRUST_RADIUS + (0.5 * this.CENTER_CIRCLE_RADIUS);  // Radius of the central UI circle for interaction

        this.mouseContrail = {
            points: [],
            lastUpdateTime: 0,
            updateInterval: 30, // 50ms between updates
            pointLifespan: 100, // 100ms lifespan for each point

            addPoint(x, y) {
                const currentTime = performance.now();
                if (currentTime - this.lastUpdateTime >= this.updateInterval) {
                    this.points.push({ x, y, timestamp: currentTime });
                    this.lastUpdateTime = currentTime;
                }
            },

            update() {
                const currentTime = performance.now();
                // Filter out points that exceed lifespan
                this.points = this.points.filter(point => currentTime - point.timestamp <= this.pointLifespan);
            },

            draw() {
                if (this.points.length < 2) return;

                game.ctx.beginPath();
                game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                game.ctx.lineWidth = 2;

                // Start from the oldest point
                game.ctx.moveTo(this.points[0].x, this.points[0].y);

                // Draw lines to each subsequent point
                for (let i = 1; i < this.points.length; i++) {
                    game.ctx.lineTo(this.points[i].x, this.points[i].y);
                    // Gradually increase opacity for newer points
                    game.ctx.strokeStyle = `rgba(255, 255, 255, ${i / this.points.length * 0.5})`;
                    game.ctx.stroke();
                    game.ctx.beginPath();
                    game.ctx.moveTo(this.points[i].x, this.points[i].y);
                }
            }
        };

        this.actionBtnSize = {
            // button dimensions
            width: ((this.camera.width < 800) ? this.camera.width * 0.2 : this.camera.width * 0.1),
            height: this.camera.height * 0.1,
            // Calculate rectangle position in bottom left corner
            posX: 10,
            posY: this.camera.height - (this.camera.height * 0.1 + 10),
        }

        this.pauseBtnSize = {
            // button dimensions - same size as action button
            width: ((this.camera.width < 800) ? this.camera.width * 0.2 : this.camera.width * 0.1),
            height: this.camera.height * 0.1,
            // Position 10px above the action button
            posX: 10,
            posY: this.camera.height - (this.camera.height * 0.1 + 10) - (this.camera.height * 0.1 + 10),
        }

        this.pauseBtnIcon = {
            // icon dimensions
            width: this.CENTER_CIRCLE_RADIUS * 0.5,
            height: this.CENTER_CIRCLE_RADIUS,
            // icon position
            posX: this.pauseBtnSize.posX + 10,
            posY: this.pauseBtnSize.posY + 10,
        }

        this.cargoBtnSize = {
            width: ((this.camera.width < 800) ? this.camera.width * 0.2 : this.camera.width * 0.1),
            height: this.camera.height * 0.1,
            posX: 10,
            posY: this.camera.height - (this.camera.height * 0.1 + 10) * 3,
        };

        this._menuBtnW = Math.min(308, this.camera.width * 0.66);
        this._menuBtnH = Math.max(50, this.camera.height * 0.09);
        this._menuBtnX = this.camera.width / 2 - this._menuBtnW / 2;

        this.menuStartBtnSize = { width: this._menuBtnW, height: this._menuBtnH, posX: this._menuBtnX, posY: this.camera.height * 0.48 };
        this.menuControlsBtnSize = { width: this._menuBtnW, height: this._menuBtnH, posX: this._menuBtnX, posY: this.camera.height * 0.60 };
        this.menuBackBtnSize = { width: this._menuBtnW * 0.6, height: this._menuBtnH, posX: this.camera.width / 2 - this._menuBtnW * 0.3, posY: this.camera.height * 0.82 };

        // Input State
        this.input = createInput();

        this.ui = createUI();
        this.rectangleDrawTimer = null; // legacy?

        this.player = new Player();
    }

    resize() {
        this.camera.width = this.canvas.width = window.innerWidth - 8;
        this.camera.height = this.canvas.height = window.innerHeight - 60;
        this.camera.bottom = this.camera.top + this.camera.height;
        this.camera.right = this.camera.left + this.camera.width;
        this.camera.centerX = this.camera.width * 0.5 + this.camera.top;
        this.camera.centerY = this.camera.height * 0.5 + this.camera.left;
        this.world.width = 4000; // 4 * camera.width;
        this.world.height = 3000; // 4 * camera.height;

        this.MINIMAP_SCALE = this.camera.width / 5; // 8% of the canvas size
        this.MINIMAP_MARGIN = 10; // Margin from the top-left corner
    }

    start() {
        this.state.screen = 'menu';
        requestAnimationFrame(() => game.menuLoop());
    }

    init() {
        this.shipImg = loadSVGString(shipSVG3);
        this.resetBtnSize = {
            width: this.camera.width * (isMobile() ? 0.55 : 0.25),
            height: this.camera.height * 0.09,
            posX: this.camera.width / 2 - (this.camera.width * (isMobile() ? 0.55 : 0.25)) / 2,
            posY: this.camera.height / 2 + this.camera.height * 0.07 - this.camera.height * 0.045,
        };

        this.spawner = new Spawner(game);
    }
}


game = new Game();
game.CONFIG = CONFIG;
game.init();
setupInputListeners(game, { onStartGame: () => initGame(game), onResetGame: () => resetGame(game) });













// Collision Detection Helper Functions

/**
 * Check if a line segment (beam) collides with a circle
 * @param {Object} beam - Beam object with x, y, angle, length, radius
 * @param {number} circleX - Circle x position
 * @param {number} circleY - Circle y position
 * @param {number} circleRadius - Circle radius
 * @returns {boolean} - True if collision detected
 */
function checkLineCircleCollision(beam, circleX, circleY, circleRadius) {
    // Vector from beam start to circle center
    const dx = circleX - beam.x;
    const dy = circleY - beam.y;

    // Beam direction vector
    const beamDx = Math.cos(beam.angle);
    const beamDy = Math.sin(beam.angle);

    // Project circle center onto beam line
    const projection = dx * beamDx + dy * beamDy;

    // Clamp projection to beam length
    const clampedProjection = Math.max(0, Math.min(projection, beam.length));

    // Find closest point on beam line to circle center
    const closestX = beam.x + beamDx * clampedProjection;
    const closestY = beam.y + beamDy * clampedProjection;

    // Check distance from circle center to closest point on beam
    const distance = Math.hypot(circleX - closestX, circleY - closestY);

    return distance <= circleRadius + beam.radius;
}

/**
 * Increment the game score and update display
 */
function incrementScore() {
    game.state.score++;
}

/**
 * Calculate impact velocity based on conservation of momentum
 * @param {Object} asteroid - Asteroid object
 * @param {Object} projectile - Projectile object
 * @returns {Object} - New velocity {x, y}
 */
function calculateImpactVelocity(asteroid, projectile) {
    const totalMass = asteroid.mass + projectile.mass;
    const newVelocityX = (
        asteroid.mass * asteroid.velocityX +
        projectile.mass * Math.cos(projectile.angle) * projectile.speed
    ) / totalMass;
    const newVelocityY = (
        asteroid.mass * asteroid.velocityY +
        projectile.mass * Math.sin(projectile.angle) * projectile.speed
    ) / totalMass;
    return { x: newVelocityX, y: newVelocityY };
}

/**
 * Destroy an asteroid and spawn fragments
 * @param {Object} asteroid - Asteroid to destroy
 * @param {number} baseVelocityX - Base X velocity for fragments
 * @param {number} baseVelocityY - Base Y velocity for fragments
 * @param {number} velocityRandomness - Random velocity variation (default: 20)
 */
function destroyAsteroid(asteroid, baseVelocityX, baseVelocityY, velocityRandomness = 20) {
    // Split the asteroid
    const newAsteroids = asteroid.split();

    // Remove asteroid from arrays
    const asteroidIndex = game.asteroids.indexOf(asteroid);
    if (asteroidIndex !== -1) {
        game.asteroids.splice(asteroidIndex, 1);
    }
    const entityIndex = game.entities.indexOf(asteroid);
    if (entityIndex !== -1) {
        game.entities.splice(entityIndex, 1);
    }

    // Add new asteroids with velocity
    for (const newAsteroid of newAsteroids) {
        newAsteroid.velocityX = baseVelocityX + (Math.random() - 0.5) * velocityRandomness;
        newAsteroid.velocityY = baseVelocityY + (Math.random() - 0.5) * velocityRandomness;
        game.asteroids.push(newAsteroid);
        game.entities.push(newAsteroid);
    }
}

/**
 * Remove a projectile from game arrays
 * @param {Object} projectile - Projectile to remove
 */
function removeProjectile(projectile) {
    const projectileIndex = game.projectiles.indexOf(projectile);
    if (projectileIndex !== -1) {
        game.projectiles.splice(projectileIndex, 1);
    }
    const entityIndex = game.entities.indexOf(projectile);
    if (entityIndex !== -1) {
        game.entities.splice(entityIndex, 1);
    }
}

/**
 * Check collisions between projectiles and asteroids
 */
function checkProjectileAsteroidCollisions() {
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];

        for (let j = game.projectiles.length - 1; j >= 0; j--) {
            const projectile = game.projectiles[j];

            if (checkCircleCollision(
                projectile.x, projectile.y, projectile.radius,
                asteroid.x, asteroid.y, asteroid.radius
            )) {
                incrementScore();

                // Calculate impact velocity
                const impactVelocity = calculateImpactVelocity(asteroid, projectile);

                // Destroy asteroid and create fragments
                destroyAsteroid(asteroid, impactVelocity.x, impactVelocity.y);

                // Remove the projectile
                removeProjectile(projectile);

                break; // Move to next asteroid
            }
        }
    }
}

/**
 * Check collisions between beams and asteroids
 */
function checkBeamAsteroidCollisions() {
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];

        for (let k = 0; k < game.beams.length; k++) {
            const beam = game.beams[k];

            if (checkLineCircleCollision(beam, asteroid.x, asteroid.y, asteroid.radius)) {
                incrementScore();

                // Destroy asteroid with its current velocity
                destroyAsteroid(asteroid, asteroid.velocityX, asteroid.velocityY);

                // Don't remove the beam - it can hit multiple asteroids
                break; // Move to next asteroid
            }
        }
    }
}

/**
 * Check collisions between ship and asteroids
 */
function checkShipAsteroidCollisions() {
    for (let i = 0; i < game.asteroids.length; i++) {
        const asteroid = game.asteroids[i];

        if (checkCircleCollision(
            game.ship.x, game.ship.y, game.ship.radius,
            asteroid.x, asteroid.y, asteroid.radius
        )) {
            triggerGameOver(game);
            return; // Exit immediately on game over
        }
    }
}

/**
 * Check collisions between asteroids and handle bouncing
 */
function checkAsteroidAsteroidCollisions() {
    // Check each pair of asteroids only once
    for (let i = 0; i < game.asteroids.length - 1; i++) {
        for (let j = i + 1; j < game.asteroids.length; j++) {
            const asteroid1 = game.asteroids[i];
            const asteroid2 = game.asteroids[j];

            if (checkCircleCollision(
                asteroid1.x, asteroid1.y, asteroid1.radius,
                asteroid2.x, asteroid2.y, asteroid2.radius
            )) {
                handleAsteroidAsteroidCollision(asteroid1, asteroid2);
            }
        }
    }
}


/**
 * Handle asteroid-asteroid collision with proper physics
 * @param {Object} a - First asteroid
 * @param {Object} b - Second asteroid
 */
function handleAsteroidAsteroidCollision(a, b) {
    // Calculate direction from a to b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);

    // Avoid division by zero
    if (distance === 0) return;

    // Normalize direction vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate relative velocity
    const vx = b.velocityX - a.velocityX;
    const vy = b.velocityY - a.velocityY;

    // Calculate relative velocity in terms of the normal direction
    const velocityAlongNormal = vx * nx + vy * ny;

    // Do not resolve if objects are moving away from each other
    if (velocityAlongNormal > 0) return;

    // Calculate restitution (bounciness)
    const restitution = 0.8;

    // Calculate impulse scalar
    const totalMass = a.mass + b.mass;
    const j = -(1 + restitution) * velocityAlongNormal / (1 / a.mass + 1 / b.mass);

    // Apply impulse
    const impulseX = j * nx;
    const impulseY = j * ny;

    // Update velocities with impulse
    a.velocityX -= impulseX / a.mass;
    a.velocityY -= impulseY / a.mass;
    b.velocityX += impulseX / b.mass;
    b.velocityY += impulseY / b.mass;

    // Separate asteroids to prevent overlap
    const overlap = (a.radius + b.radius - distance) * 0.5;
    if (overlap > 0) {
        // Move each asteroid away by half the overlap
        const moveX = nx * overlap;
        const moveY = ny * overlap;

        // Move the asteroids apart based on their mass ratio
        const ratioA = b.mass / totalMass;
        const ratioB = a.mass / totalMass;

        a.x -= moveX * ratioA;
        a.y -= moveY * ratioA;
        b.x += moveX * ratioB;
        b.y += moveY * ratioB;
    }
}




/**
 * Main collision handler - orchestrates all collision checks
 */
function checkAsteroidPlanetCollisions() {
    // if no planets, return
    if (game.planets.length === 0) return;

    for (let j = 0; j < game.planets.length; j++) {
        const planet = game.planets[j];
        for (let i = 0; i < game.asteroids.length; i++) {
            const asteroid = game.asteroids[i];

            // Calculate direction from planet to asteroid (normal points away from planet)
            const dx = asteroid.x - planet.x;
            const dy = asteroid.y - planet.y;
            const distance = Math.hypot(dx, dy);

            // Check if asteroid is colliding with planet
            if (distance < asteroid.radius + planet.radius) {
                // Avoid division by zero
                if (distance === 0) continue;

                // Normalize direction vector
                const nx = dx / distance;
                const ny = dy / distance;

                // Calculate velocity along the normal
                // (planet is immovable, so relative velocity is just asteroid's velocity)
                const velocityAlongNormal = asteroid.velocityX * nx + asteroid.velocityY * ny;

                // Do not resolve if asteroid is moving away from planet
                if (velocityAlongNormal > 0) continue;

                // Calculate restitution (bounciness)
                const restitution = 0.7;

                // Calculate impulse scalar (planet has infinite mass)
                const j = -(1 + restitution) * velocityAlongNormal;

                // Apply impulse to asteroid
                asteroid.velocityX += j * nx;
                asteroid.velocityY += j * ny;

                // Separate asteroid from planet to prevent overlap
                const overlap = asteroid.radius + planet.radius - distance;
                if (overlap > 0) {
                    // Push asteroid away from planet
                    asteroid.x += overlap * nx;
                    asteroid.y += overlap * ny;
                }

                // TODO: Add some visual feedback
            }
        }
    }
}

function checkAsteroidContainerCollisions() {
    for (let i = game.containers.length - 1; i >= 0; i--) {
        const container = game.containers[i];
        const containerRadius = Math.hypot(container.width / 2, container.height / 2);
        for (let j = 0; j < game.asteroids.length; j++) {
            const asteroid = game.asteroids[j];
            if (checkCircleCollision(
                asteroid.x, asteroid.y, asteroid.radius,
                container.x, container.y, containerRadius
            )) {
                container.takeDamage(10);
                break;
            }
        }
    }
}

function handleCollisions() {
    if (game.state.game_paused) {
        return;
    }

    checkProjectileAsteroidCollisions();
    checkBeamAsteroidCollisions();
    checkShipAsteroidCollisions();
    checkAsteroidAsteroidCollisions();
    checkAsteroidPlanetCollisions();
    checkAsteroidContainerCollisions();
}






//////
///////













Game.prototype.menuLoop = function () {
    this.renderer.draw(this);
    if (this.state.screen !== 'game') {
        requestAnimationFrame(() => this.menuLoop());
    }
};

Game.prototype.loop = function (timestamp) {
    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;

    // ctx.clearRect(0, 0, camera.width, camera.height);
    // Background gradient
    // const bg = ctx.createLinearGradient(0, 0, 0, camera.height); // top -> bottom
    // world Y=0 appears at screen Y = -cameraOffset.y
    // world Y=world.height appears at screen Y = world.height - cameraOffset.y
    const bg = game.ctx.createLinearGradient(
        0,
        -game.cameraOffset.y,
        0,
        game.world.height - game.cameraOffset.y
    );
    bg.addColorStop(0.0, '#7A4827');  // was #F5914E
    bg.addColorStop(0.33, '#772F1F'); // was #EF5E3F
    bg.addColorStop(0.66, '#5D1E18'); // was #BB3C30
    bg.addColorStop(1.0, '#401111');  // was #802323
    game.ctx.fillStyle = bg;
    game.ctx.fillRect(0, 0, game.camera.width, game.camera.height);

    // ===== UPDATE PHASE (skip if paused) =====
    if (!game.state.game_paused) {
        // Update contrails to remove expired points
        game.ship.contrail.update();
        game.mouseContrail.update();

        // Update particles
        game.particles.forEach(particle => {
            particle.update(deltaTime);
        });

        // Update ship
        if (game.input.isShooting) {
            game.ship.shoot();
        }
        game.ship.update(deltaTime);

        // Update asteroids
        game.asteroids.forEach(asteroid => {
            asteroid.update(deltaTime);
        });

        // Update projectiles
        game.projectiles.forEach((projectile, index) => {
            projectile.update(deltaTime);

            if (projectile.lifespan <= 0) {
                game.projectiles.splice(index, 1);
                game.entities.splice(game.entities.indexOf(projectile), 1);
            }
        });

        // Update beams
        game.beams.forEach((beam, index) => {
            beam.update(deltaTime);

            if (beam.lifespan <= 0) {
                game.beams.splice(index, 1);
                game.entities.splice(game.entities.indexOf(beam), 1);
            }
        });

        // Update containers and check if they enter the player's view
        game.containers.forEach(container => {
            container.update(deltaTime);
            if (!container.discovered) {
                const sx = container.x - game.cameraOffset.x;
                const sy = container.y - game.cameraOffset.y;
                if (sx >= 0 && sx <= game.camera.width && sy >= 0 && sy <= game.camera.height) {
                    container.discovered = true;
                }
            }
        });

        // Update scrap and remove expired
        for (let i = game.scrap.length - 1; i >= 0; i--) {
            game.scrap[i].update(deltaTime);
            if (game.scrap[i].lifespan <= 0) {
                game.scrap.splice(i, 1);
            }
        }

        // Handle collisions
        handleCollisions();

        // Update dialogue
        game.dialogue.update(deltaTime);

        // (braking is triggered on tap, see handlePointerDown)
    }

    this.renderer.draw(this, timestamp);

    requestAnimationFrame((timestamp) => game.loop(timestamp));
};


function resetGame(game) {
    game.state.game_over = false;
    game.ui.dialogueText = '';
    initGame(game);
    game.asteroids = [];
    game.projectiles = [];
    game.beams = [];
    game.containers = [];
    game.scrap = [];
    game.entities = [];
    game.spawner.spawnInitialAsteroids();
}

function initGame(game) {
    game.state.screen = 'game';
    game.state.score = 0;
    game.containers = [];
    game.scrap = [];
    startTimer(game, 5);
    game.dialogue = new Dialogue(game);
    game.entities.push(game.dialogue);
    game.ship = new Ship(game);
    game.entities.push(game.ship);
    game.spawner.spanInitialPlanets();
    game.spawner.createParticles();
    game.spawner.spawnInitialAsteroids();
    game.spawner.spawnInitialContainers();
    requestAnimationFrame((timestamp) => game.loop(timestamp));
}



function isPointOverAsteroid(x, y) {
    // Convert screen coordinates to world coordinates by adding camera offset
    const worldX = x + game.cameraOffset.x;
    const worldY = y + game.cameraOffset.y;

    return game.asteroids.some(asteroid => {
        const dx = worldX - asteroid.x;
        const dy = worldY - asteroid.y;
        return Math.sqrt(dx * dx + dy * dy) <= asteroid.radius;
    });
}











window.addEventListener('resize', () => game.resize());

function initDebugArea() {
    const debugLimit = 50;
    let debugCount = 0;
    let bodyEl = document.querySelector('body');
    const el = document.createElement('pre');
    el.id = 'debug';
    bodyEl.appendChild(el);
    return el;
}



Game.prototype.isPointOverAsteroid = isPointOverAsteroid;

export { Game, game };

if (isMobile()) {
    console.log('Mobile device detected');
}









