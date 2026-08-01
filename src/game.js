import { Renderer } from './renderer.js';
import { addVelocities, checkCircleCollision } from './utils/physics.js';
import { World } from './world.js';
import { Camera } from './camera.js';
import { State } from './state.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { CargoContainer } from './entities/CargoContainer.js';
import { Scrap } from './entities/Scrap.js';
import { Planet } from './entities/Planet.js';
import { Particle } from './entities/Particle.js';
import { Beam } from './entities/Beam.js';
import { Projectile, Laser, Bullet, Missile } from './entities/Projectile.js';
import { Asteroid } from './entities/Asteroid.js';
import { Ship } from './entities/Ship.js';
import { Dialogue } from './entities/Dialogue.js';
import {
    randomMinMax,
    calculateNewPosition,
    logarithmicIncrease,
    countObjectProperties,
    checkBoundsRect,
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
        this.state = new State();

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
        this.input = new Input();

        this.ui = new UI();
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
        this.shipImg = this.renderer.loadSVGString(shipSVG3);
        this.resetBtnSize = {
            width: this.camera.width * (isMobile() ? 0.55 : 0.25),
            height: this.camera.height * 0.09,
            posX: this.camera.width / 2 - (this.camera.width * (isMobile() ? 0.55 : 0.25)) / 2,
            posY: this.camera.height / 2 + this.camera.height * 0.07 - this.camera.height * 0.045,
        };
    }
}

const CONFIG = Object.freeze({
    MOBILE_SCALE: 0.55,
    MAX_ENTITIES: 200,
    PARTICLE_COUNT: 400,
    MIN_ASTEROID_SIZE: 10,
    INITIAL_ASTEROID_COUNT: 20,
});

const shipSVG2 = `
<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"> <polygon points="34,12 26,30 28,32 32,30 30,32 30,32 34,30 34,32 36,32 36,30 38,32 38,32 38,30 42,32 44,32" fill=grey /> </svg>
`;

const shipSVG3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="62" height="62"> <path d="m16 1-5 14-9 10 3 2 3-2 4 2v3l1.6-1.1.5 1.2L16 30h1.9l.5-1.1L20 30v-3l4-2 3 2 3-2-9-10z" style="fill:hsl(200 20% 20%)"/> </svg>
`;

game = new Game();
game.CONFIG = CONFIG;
game.init();













function spawnInitialAsteroids() {
    console.log('spawnInitialAsteroids');
    for (let i = 0; i < CONFIG.INITIAL_ASTEROID_COUNT; i++) {
        if (game.entities.length < CONFIG.MAX_ENTITIES) {
            const asteroid = new Asteroid(game);
            game.asteroids.push(asteroid);
            game.entities.push(asteroid);
        }
    }
    console.log('asteroids spawned:', game.asteroids.length);
}

function spanInitialPlanets() {
    // Clear existing planets
    // planets = [];

    // Spawn 1-3 planets
    const planetCount = randomMinMax(1, 3);

    for (let i = 0; i < planetCount; i++) {
        if (game.entities.length < CONFIG.MAX_ENTITIES) {
            const planet = new Planet(game);
            game.planets.push(planet);
            game.entities.push(planet);
        }
    }
    console.log('planets spawned:', game.planets.length);
}

function createParticles() {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        game.particles.push(new Particle(game));
    }
}

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
 * Handle game over state
 */
function triggerGameOver() {
    game.state.game_over = true;

    // Stop the timer when game over
    if (game.state.timer.interval) {
        clearInterval(game.state.timer.interval);
    }

    clearEntities();
    console.log("Game over!");
    game.ui.dialogueText = "Game Over!";
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
            triggerGameOver();
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


function handlePointerDown(event) {
    // type of click: mouseDown
    game.input.isMouseDown = true;

    const rect = game.canvas.getBoundingClientRect();
    const scaleX = game.canvas.width / rect.width;
    const scaleY = game.canvas.height / rect.height;

    game.ui.mouseX = (event.clientX - rect.left) * scaleX;
    game.ui.mouseY = (event.clientY - rect.top) * scaleY;

    // Handle menu screens before any game logic
    if (game.state.screen === 'menu') {
        if (isUIButtonClicked(game.menuStartBtnSize)) {
            initGame();
        } else if (isUIButtonClicked(game.menuControlsBtnSize)) {
            game.state.screen = 'controls';
        }
        return;
    }
    if (game.state.screen === 'controls') {
        if (isUIButtonClicked(game.menuBackBtnSize)) {
            game.state.screen = 'menu';
        }
        return;
    }

    const centerCircleX = game.camera.width / 2;
    const centerCircleY = game.camera.height / 2;
    const distToCenter = Math.hypot(game.ui.mouseX - centerCircleX, game.ui.mouseY - centerCircleY);
    const isInCenterCircle = (distToCenter <= game.CENTER_CIRCLE_RADIUS);

    // location of click: center circle
    if (isInCenterCircle) {
        game.input.isDraggingFromCenter = true;
        game.input.centerHoldStartTime = performance.now();
        game.input.centerDownX = game.ui.mouseX;
        game.input.centerDownY = game.ui.mouseY;
    } else {
        game.input.isDraggingFromCenter = false; // Click is outside the center circle
        game.input.centerHoldStartTime = 0; // Reset center hold time
    }

    // Add point to contrail
    game.mouseContrail.addPoint(game.ui.mouseX, game.ui.mouseY);

    console.log('pointer down');

    if (game.state.game_over && isUIButtonClicked(game.resetBtnSize)) { // if GameOver & reset btn clicked
        // reset game
        console.log('RESET Game');
        console.log('GOOD isUIButtonClicked...', isUIButtonClicked(game.resetBtnSize));
        game.state.game_over = false;
        game.ui.dialogueText = ''; // Clear the dialogue text
        initGame(); // This does not reset all of the game, such as Asteroids and Dust
        // Clear all entities and respawn asteroids
        game.asteroids = [];
        game.projectiles = [];
        game.beams = [];
        game.containers = [];
        game.scrap = [];
        game.entities = [];
        spawnInitialAsteroids();
    }

    if (!game.state.game_over && isUIButtonClicked(game.actionBtnSize)) {
        // do stuff like shoot or change weapons
        switch (game.player.currentWeapon) {
            case 'laser':
                game.player.currentWeapon = 'machineGun';
                // weaponButton.textContent = '🔫';
                break;
            case 'machineGun':
                game.player.currentWeapon = 'missile';
                // weaponButton.textContent = '🚀';
                break;
            case 'missile':
                game.player.currentWeapon = 'beam';
                // weaponButton.textContent = '⚡';
                break;
            case 'beam':
                game.player.currentWeapon = 'laser';
                // weaponButton.textContent = '🔦';
                break;
        }
        // ship.shoot();
    }

    // Handle pause button click
    if (!game.state.game_over && isUIButtonClicked(game.pauseBtnSize)) {
        game.state.game_paused = !game.state.game_paused;
        if (game.state.game_paused) {
            game.state.timer.pausedAt = Date.now();
        } else if (game.state.timer.pausedAt) {
            game.state.timer.totalPausedMs += Date.now() - game.state.timer.pausedAt;
            game.state.timer.pausedAt = null;
        }
        console.log('Game paused:', game.state.game_paused);
    }

    // Handle cargo pickup/drop button
    if (!game.state.game_over && isUIButtonClicked(game.cargoBtnSize)) {
        if (game.ship.towedContainer) {
            // Drop the container
            const c = game.ship.towedContainer;
            c.isTowed = false;
            c.velocityX = Math.cos(game.ship.movementAngle) * game.ship.speed * 1000 * 0.5;
            c.velocityY = Math.sin(game.ship.movementAngle) * game.ship.speed * 1000 * 0.5;
            game.ship.towedContainer = null;
            console.log('Container dropped');
        } else {
            // Pick up nearest container within range
            const PICKUP_RANGE = 80;
            let nearest = null;
            let nearestDist = Infinity;
            for (const c of game.containers) {
                if (c.isTowed) continue;
                const dist = Math.hypot(game.ship.x - c.x, game.ship.y - c.y);
                if (dist < PICKUP_RANGE && dist < nearestDist) {
                    nearest = c;
                    nearestDist = dist;
                }
            }
            if (nearest) {
                nearest.isTowed = true;
                game.ship.towedContainer = nearest;
                console.log('Container picked up');
            }
        }
    }

    const asteroidClicked = game.asteroids.some(asteroid => {
        const screenX = asteroid.x - game.cameraOffset.x;
        const screenY = asteroid.y - game.cameraOffset.y;
        const distance = Math.hypot(game.ui.mouseX - screenX, game.ui.mouseY - screenY);
        return distance <= asteroid.radius;
    });

    // Start shooting if pointer is outside center circle and not on any UI button
    const isOnUIButton = isUIButtonClicked(game.actionBtnSize) || isUIButtonClicked(game.pauseBtnSize) || isUIButtonClicked(game.cargoBtnSize);
    if (!game.state.game_over && !isInCenterCircle && !isOnUIButton) {
        // Rotate ship to face mouse position before shooting
        game.input.isShooting = true;
        game.ship.setRotation(game.ui.mouseX, game.ui.mouseY);
    }

}

function handlePointerMove(event) {
    const rect = game.canvas.getBoundingClientRect();
    const scaleX = game.canvas.width / rect.width;
    const scaleY = game.canvas.height / rect.height;
    game.ui.mouseX = (event.clientX - rect.left) * scaleX;
    game.ui.mouseY = (event.clientY - rect.top) * scaleY;

    // Check if pointer is still within canvas bounds
    const isWithinCanvas = game.ui.mouseX >= 0 && game.ui.mouseX <= game.canvas.width && game.ui.mouseY >= 0 && game.ui.mouseY <= game.canvas.height;

    // If shooting is active and mouse is still down and within canvas
    if (game.input.isShooting && game.input.isMouseDown && isWithinCanvas && !game.state.game_over) {
        const centerCircleX = game.camera.width / 2;
        const centerCircleY = game.camera.height / 2;
        const distToCenter = Math.hypot(game.ui.mouseX - centerCircleX, game.ui.mouseY - centerCircleY);
        const isOutsideCenterCircle = (distToCenter > game.CENTER_CIRCLE_RADIUS);

        // Continue shooting if outside center circle
        if (isOutsideCenterCircle) {
            game.ship.setRotation(game.ui.mouseX, game.ui.mouseY);  // Rotate ship to face mouse position before shooting
            // ship.shoot();
        } else {
            // If moved back into center circle, stop shooting
            game.input.isShooting = false;
        }
    }

    // Add point to contrail
    game.mouseContrail.addPoint(game.ui.mouseX, game.ui.mouseY);

    // REMOVED: This block is removed to disable drag-anywhere-to-move
    // if (isMouseDown && !GAME_OVER && !isShootingAsteroid && !isUIButtonClicked(actionBtnSize)) {
    //     if (!isDraggingFromCenter) {
    //         ship.setTarget(mouseX, mouseY); // screen coords
    //     }
    //     // If isDraggingFromCenter is true, target is set on pointerUp. Visual feedback is drawn in gameLoop.
    // }
}

function handlePointerUp() {
    if (game.input.isDraggingFromCenter) {
        const dragDist = Math.hypot(game.ui.mouseX - game.input.centerDownX, game.ui.mouseY - game.input.centerDownY);
        if (dragDist > 20) {
            // Dragged far enough — steer to target, cancel any brake
            game.input.isBraking = false;
            game.ship.setTarget(game.ui.mouseX, game.ui.mouseY);
        } else {
            // Tap (no significant drag) — apply single or double-tap brake
            const now = performance.now();
            const isDoubleTap = (now - game.input.lastCenterTapTime) < 350 && game.input.lastCenterTapTime > 0;
            game.input.isBraking = true;
            game.input.brakeStartTime = now;
            game.input.brakeStartSpeed = game.ship.speed;
            game.input.brakeTargetFraction = isDoubleTap ? 0 : 0.5;
            game.input.lastCenterTapTime = isDoubleTap ? 0 : now;
        }
        game.input.isDraggingFromCenter = false; // Reset the flag
    }

    // Stop shooting when pointer is released
    game.input.isShooting = false;

    game.input.isMouseDown = false;
    game.input.centerHoldStartTime = 0; // Reset center hold time when pointer is released
    console.log('pointer up');
}


function clearEntities() {
    // console.log('the entities', entities);
    // TODO: this won't clear the entities yet
    let names = [];
    for (let i = 0; i < game.entities.length; i++) {
        names.push(game.entities[i].name);
    }
    console.log('clearEntities names:', names);
}

function spawnInitialContainers() {
    for (let i = 0; i < 5; i++) {
        const container = new CargoContainer(game);
        game.containers.push(container);
        game.entities.push(container);
    }
    game.state.initialContainerCount = game.containers.length;
    console.log('containers spawned:', game.containers.length);
}

function initGame() {
    game.state.screen = 'game';
    game.state.score = 0;
    game.containers = [];
    game.scrap = [];
    startTimer(5);
    game.dialogue = new Dialogue(game);
    game.entities.push(game.dialogue);
    game.ship = new Ship(game);
    game.entities.push(game.ship);
    spanInitialPlanets();
    createParticles();
    spawnInitialAsteroids();
    spawnInitialContainers();
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











function isUIButtonClicked(buttonSize) {
    // mouseX and mouseY are in gameCameraCoords
    // buttonSize Width and Height also needs button position to be in gameCameraCoords
    let point = { x: game.ui.mouseX, y: game.ui.mouseY };
    let rect = { x: buttonSize.posX, y: buttonSize.posY, w: buttonSize.width, h: buttonSize.height };
    let isInBounds = checkBoundsRect(point, rect);

    // console.log(`x${mouseX} y${mouseY} px${buttonSize.posX} py${buttonSize.posY} bw${buttonSize.width} bh${buttonSize.height}`);
    return (isInBounds);
}

game.canvas.addEventListener('mousedown', handlePointerDown);
game.canvas.addEventListener('mousemove', handlePointerMove);
game.canvas.addEventListener('mouseup', handlePointerUp);
game.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handlePointerDown(e.touches[0]);
});
game.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handlePointerMove(e.touches[0]);
});
game.canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handlePointerUp();
});


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



Game.prototype.isUIButtonClicked = isUIButtonClicked;
Game.prototype.checkTimer = checkTimer;
Game.prototype.isPointOverAsteroid = isPointOverAsteroid;

export { Game, game };

if (isMobile()) {
    console.log('Mobile device detected');
}



// Function to draw a white circle at the center of the camera

function startTimer(durationMins) {
    game.state.timer.startTime = Date.now(); // in milliseconds
    game.state.timer.duration = durationMins * 60 * 1000; // x minutes in ms
    game.state.timer.timerExpired = false;
    game.state.timer.totalPausedMs = 0;
    game.state.timer.pausedAt = null;

    // Start a timer that updates every second to show score and remaining time
    if (game.state.timer.interval) {
        clearInterval(game.state.timer.interval);
    }

    game.state.timer.interval = setInterval(() => {
        isTimerExpired();
    }, 1000); // Check expiry every second
}

function checkTimer() {
    const pausedMs = (game.state.timer.totalPausedMs || 0) +
        (game.state.timer.pausedAt ? Date.now() - game.state.timer.pausedAt : 0);
    const elapsed = Date.now() - game.state.timer.startTime - pausedMs;
    const remaining = Math.max(0, game.state.timer.duration - elapsed);

    // Format remaining time
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    //   console.log(`Remaining: ${formatted}`);

    return formatted;
}

function isTimerExpired() {
    // Always consider timer expired if game is over
    if (game.state.game_over) {
        return true;
    }

    // Calculate effective elapsed time (excluding paused duration)
    const pausedMs = (game.state.timer.totalPausedMs || 0) +
        (game.state.timer.pausedAt ? Date.now() - game.state.timer.pausedAt : 0);
    const elapsed = Date.now() - game.state.timer.startTime - pausedMs;

    // Check if timer has expired
    if (!game.state.timer.timerExpired && elapsed >= game.state.timer.duration) {
        game.state.timer.timerExpired = true;
        // Clear our interval when the timer expires
        if (game.state.timer.interval) {
            clearInterval(game.state.timer.interval);
        }
        console.log("Timer expired! Perform your action here.");
        return true;
    }

    return false;
}

/**
 * Spawns a group of projectiles in a line or fan shape.
 *
 * @param {Projectile} primaryObj - The projectile to use as a template.
 * @param {number} count - total number of projectiles to include.
 * @param {number} spacing - pixel distance between adjacent projectiles.
 * @param {number} spreadAngle - total angular spread in degrees (0 = parallel).
 * @param {...any} args - extra constructor args for projectile subclasses.
 * @returns {Projectile[]} all projectiles.
 */
function spawnOffsetGroup(primaryObj, count = 2, spacing = 10, spreadAngle = 0, ...args) {
    if (count < 1) return [];

    const baseAngle = primaryObj.angle;
    // This was converting degrees to radians, but angle is already in radians.
    // const radians = baseAngle * (Math.PI / 180); 
    const dx = Math.cos(baseAngle + Math.PI / 2);
    const dy = Math.sin(baseAngle + Math.PI / 2);
    const ProjectileClass = primaryObj.constructor;

    const mid = (count - 1) / 2;
    const angleStep = count > 1 ? (spreadAngle * Math.PI / 180) / (count - 1) : 0; // Convert spreadAngle to radians
    const _projectiles = [];

    for (let i = 0; i < count; i++) {
        const offsetIndex = i - mid;
        const offsetX = dx * offsetIndex * spacing;
        const offsetY = dy * offsetIndex * spacing;
        const angleOffset = (offsetIndex * angleStep) / 2; // symmetric spread

        const angle = baseAngle + angleOffset;

        // Create a new projectile for each item in the group
        const newProjectile = new ProjectileClass(
            primaryObj.game,
            primaryObj.x + offsetX,
            primaryObj.y + offsetY,
            angle,
            ...args
        );

        _projectiles.push(newProjectile);
    }

    return _projectiles;
}



const shipSVG = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1110" height="1110" viewBox="817.5,362.5,110,110"><g id="document" fill="#ffffff" fill-rule="nonzero" stroke="#000000" stroke-width="0" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" ><rect x="5202.27273" y="1647.72727" transform="scale(0.15714,0.22)" width="700" height="500" id="Shape 1 1" vector-effect="non-scaling-stroke"/></g><g fill="white" fill-rule="nonzero" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"><g id="stage"><g id="layer1 1"><path d="M821.60345,466.98276l41.81819,-87.88263l7.42319,-15.60013l52.65517,102.79311l-51.44828,-27.18965z" id="Path 3"/><path d="M868.01726,412.38048l6.75056,-0.02159l5.04149,20.55973l-16.36421,0.3818z" id="Path 3"/><path d="M870.87479,369.24255l0.64607,43.36469" id="Path 3"/><path d="M871.85375,460.37879l5.79776,-5.75343l-12.15152,-0.03429z" id="Path 3"/><path d="M874.15248,426.12645" id="Path 3"/><path d="M849.41412,447.8546l21.46448,-78.27112l24.75585,78.18049" id="Path 3"/><path d="M822.40716,465.29373l49.43258,-31.91997l51.00257,31.63544" id="Path 1 1"/><path d="M863.26579,444.29662l2.23421,7.02571h12l2.14622,-8.20529" id="Path 3"/><path d="M864.93246,450.72458l-5.90909,3.33333l-2.87879,-2.12121l1.61797,-4.9366" id="Path 3"/><path d="M878.65151,450.52932l5.90909,3.33333l2.87879,-2.12121l-1.61797,-4.9366" id="Path 2 1"/><path d="M871.75064,438.9064l-0.30303,12.41593" id="Path 3"/><path d="M872.81125,411.78519" id="Path 3"/></g></g></g></svg>
`;
game.spawnOffsetGroup = spawnOffsetGroup;
export { Scrap };
