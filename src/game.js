import { addVelocities, checkCircleCollision } from './utils/physics.js';
import {
    randomMinMax,
    calculateNewPosition,
    logarithmicIncrease,
    countObjectProperties,
    checkBoundsRect,
} from './utils/helpers.js';

let game;

class Game {
    constructor() { }

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
        requestAnimationFrame(menuLoop);
    }
}

game = new Game();

game.canvas = document.getElementById('gameCanvas');
game.ctx = game.canvas.getContext('2d');
game.weaponButton = document.getElementById('weaponButton');
game.message = document.querySelector('.message');
game.debugEl = initDebugArea();

game.ship = null;
game.asteroids = [];
game.projectiles = [];
game.particles = [];
game.planets = [];
game.dialogue = null;
game.beams = []; // Array to track active beams
game.containers = [];
game.scrap = [];
game.world = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 }
game.camera = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 };

game.MINIMAP_SCALE = 0;
game.MINIMAP_MARGIN = 0;

game.resize();
game.cameraOffset = { x: 0, y: 0 };
game.entities = [];

const CONFIG = Object.freeze({
    MOBILE_SCALE: 0.55,
    MAX_ENTITIES: 200,
    PARTICLE_COUNT: 400,
    MIN_ASTEROID_SIZE: 10,
    INITIAL_ASTEROID_COUNT: 20,
});

// Game State
game.state = {
    screen: 'menu', // 'menu' | 'controls' | 'game'
    game_over: false,
    game_paused: false,
    score: 0,
    timer: {},
    initialContainerCount: 0,
}

game.CENTER_CIRCLE_RADIUS = 50 * CONFIG.MOBILE_SCALE;  // Radius of the central UI circle for interaction
// debug(`cw, ch: ${camera.width}, ${camera.height}`);
game.CENTER_MAXTHRUST_RADIUS = 0.5 * Math.min(game.camera.width, game.camera.height) - 8;  // Radius of the central UI circle for interaction
game.CENTER_LOWTHRUST_RADIUS = 0.5 * game.CENTER_MAXTHRUST_RADIUS + (0.5 * game.CENTER_CIRCLE_RADIUS);  // Radius of the central UI circle for interaction

// Input State
game.input = {
    isDraggingFromCenter: false,  // For new drag-from-center movement
    isMouseDown: false,
    isShootingAsteroid: false,
    isShooting: false, // New flag to track if shooting is active
    centerHoldStartTime: 0, // Time when pointer down started in center circle
    isBraking: false, // Whether ship is currently in braking mode
    brakeStartTime: 0, // Time when braking started
    brakeStartSpeed: 0, // Ship speed at start of brake
    brakeTargetFraction: 0.5, // 0.5 = half speed, 0 = full stop
    lastCenterTapTime: 0, // For double-tap detection
    centerDownX: 0, // Pointer X when center circle was pressed
    centerDownY: 0, // Pointer Y when center circle was pressed
}

game.ui = {
    mouseX: 0,
    mouseY: 0,
    dialogueText: '',
}
game.rectangleDrawTimer = null; // legacy?

game.player = {
    currentWeapon: 'machineGun',
    BULLET_FIRE_RATE: 100,  // 100ms between shots
    MISSILE_FIRE_RATE: 500, // 500ms between shots
    LASER_FIRE_RATE: 1000,  // 1000ms between shots
    BEAM_FIRE_RATE: 800,    // 800ms between shots
    lastLaserFireTime: 0,
    lastBulletFireTime: 0,
    lastMissileFireTime: 0,
    lastBeamFireTime: 0,
}

const shipSVG2 = `
<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"> <polygon points="34,12 26,30 28,32 32,30 30,32 30,32 34,30 34,32 36,32 36,30 38,32 38,32 38,30 42,32 44,32" fill=grey /> </svg>
`;

const shipSVG3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="62" height="62"> <path d="m16 1-5 14-9 10 3 2 3-2 4 2v3l1.6-1.1.5 1.2L16 30h1.9l.5-1.1L20 30v-3l4-2 3 2 3-2-9-10z" style="fill:hsl(200 20% 20%)"/> </svg>
`;

game.shipImg = loadSVGString(shipSVG3);










class Ship {
    constructor() {
        this.name = 'ship';
        this.x = game.world.width / 2;
        this.y = game.world.height / 2;
        this.radius = 20;
        this.angle = 0;
        this.lastAngle = 0;
        this.lastRotationTime = 0;
        this.movementAngle = 0;
        this.speed = 0;
        this.targetSpeed = 0;
        this.maxSpeed = 400;
        this.lastSpeedUpdateTime = 0;
        this.accelerationTimeMs = 1000; // Increased time to reach max speed to 200ms
        this.targetX = this.x;
        this.targetY = this.y;
        this.mass = Math.PI * this.radius * this.radius;
        this.maxRotationSpeed = Math.PI / 180 * 0.25; // 0.25 degree per ms in radians
        this.towedContainer = null;

        // Initialize ship's contrail
        this.contrail = {
            points: [],
            lastUpdateTime: 0,
            updateInterval: 50,
            pointLifespan: 800, // 100ms lifespan for each point

            addPoint(x, y) {
                const currentTime = performance.now();
                // this.points.push({ x, y, timestamp: currentTime });
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

            draw(offset) {
                if (this.points.length < 2) return;

                game.ctx.beginPath();
                game.ctx.strokeStyle = 'hsl(200, 100.00%, 100%)'; // 
                game.ctx.lineWidth = 5;

                // Start from the oldest point
                const firstPoint = this.points[0];
                game.ctx.moveTo(firstPoint.x - offset.x, firstPoint.y - offset.y);

                // Draw lines to each subsequent point
                for (let i = 1; i < this.points.length; i++) {
                    const point = this.points[i];
                    game.ctx.lineTo(point.x - offset.x, point.y - offset.y);
                    // Gradually increase opacity for newer points
                    game.ctx.strokeStyle = `hsla(200, 100%, ${i * 10}%, ${i / this.points.length * 0.9})`;
                    game.ctx.stroke();
                    game.ctx.beginPath();
                    game.ctx.moveTo(point.x - offset.x, point.y - offset.y);
                }
            }
        };
    }

    setRotation(x, y) {
        // Only changes the ship's facing angle without affecting movement
        const dx = x + game.cameraOffset.x - this.x;
        const dy = y + game.cameraOffset.y - this.y;
        const targetAngle = Math.atan2(dy, dx);

        // Calculate time elapsed since last rotation
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastRotationTime;

        // Calculate maximum angle change allowed (1 degree per ms)
        const maxChange = this.maxRotationSpeed * elapsed;

        // Find the shortest angle between current and target
        let angleDiff = targetAngle - this.angle;

        // Normalize angle difference to be between -PI and PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Limit the rotation to the maximum allowed by elapsed time
        if (Math.abs(angleDiff) > maxChange) {
            // Clamp to maximum change
            const direction = angleDiff > 0 ? 1 : -1;
            this.angle += direction * maxChange;

            // Ensure angle stays within 0 to 2*PI range
            if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
            if (this.angle < 0) this.angle += Math.PI * 2;
        } else {
            // Can reach target angle within time constraint
            this.angle = targetAngle;
        }

        // Update the last rotation time
        this.lastRotationTime = currentTime;
        this.lastAngle = this.angle;
    }

    setTarget(x, y) {
        this.targetX = x + game.cameraOffset.x;
        this.targetY = y + game.cameraOffset.y;
        const distance = Math.hypot(this.targetX - this.x, this.targetY - this.y);
        // const maxDistance = 0.5 *Math.min(camera.width, camera.height) - 10;
        const speedAdjust = 0.005;

        // Determine the new target speed based on distance
        let baseSpeed = 0;
        if (distance > game.CENTER_LOWTHRUST_RADIUS) {
            baseSpeed = 40;
            this.maxSpeed = 40;
        } else if (distance > game.CENTER_CIRCLE_RADIUS) {
            baseSpeed = 20;
            this.maxSpeed = 20;
        } else {
            baseSpeed = 0;
            this.maxSpeed = 0;
        }

        // Apply speed adjustment factor (as was done in the original code)
        this.targetSpeed = baseSpeed > 0 ? baseSpeed * speedAdjust : 0;

        // Reset speed update timer to start acceleration/deceleration
        this.lastSpeedUpdateTime = performance.now();

        // Calculate the new direction in degrees
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const newDirectionRad = Math.atan2(dy, dx);
        const newDirectionDeg = newDirectionRad * 180 / Math.PI;

        // Get the current movement direction in degrees
        const currentDirectionDeg = this.movementAngle * 180 / Math.PI;

        // Only combine velocities if we already have speed
        if (this.speed > 0 && this.targetSpeed > 0) {
            // Use a momentum factor of 0.8 - adjust this value to control how much momentum is preserved
            const momentumFactor = 0.8;

            // Combine the current velocity with the new velocity
            const combinedVelocity = addVelocities(
                this.speed, currentDirectionDeg,
                this.targetSpeed, newDirectionDeg,
                momentumFactor // Pass the momentum factor as the multiplier
            );

            // Update movement angle based on the combined velocity
            // Note: We don't set this.speed here anymore since it's handled by the exponential acceleration
            this.movementAngle = combinedVelocity.direction * Math.PI / 180; // Convert back to radians
        } else {
            // If currently not moving, just set the new direction
            this.movementAngle = newDirectionRad;
        }

        // Set rotation to match movement direction
        this.angle = this.movementAngle;
    }

    update(deltaTime) {
        // Handle braking if active
        if (game.input.isBraking) {
            const currentTime = performance.now();
            const brakeProgress = Math.min(1, (currentTime - game.input.brakeStartTime) / 400);
            const targetSpeed = game.input.brakeStartSpeed * game.input.brakeTargetFraction;

            if (brakeProgress >= 1) {
                // Braking completed
                this.speed = targetSpeed;
                this.targetSpeed = targetSpeed;
                game.input.isBraking = false;
            } else {
                // Linearly interpolate toward target speed
                this.speed = game.input.brakeStartSpeed + (targetSpeed - game.input.brakeStartSpeed) * brakeProgress;
            }
        } else {
            // Handle exponential acceleration/deceleration toward target speed
            const currentTime = performance.now();
            const elapsedMs = currentTime - this.lastSpeedUpdateTime;

            if (this.speed !== this.targetSpeed) {
                // Calculate progress factor based on acceleration time
                const progressFactor = Math.min(1, elapsedMs / this.accelerationTimeMs);

                // Exponential ease-in-out function for smooth acceleration/deceleration
                const easeInOutExpo = (t) => {
                    return t === 0 ? 0 : t === 1 ? 1
                        : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2
                            : (2 - Math.pow(2, -20 * t + 10)) / 2;
                };

                // Apply the easing function to the progress
                const easedProgress = easeInOutExpo(progressFactor);

                // Interpolate between current speed and target speed
                const speedDiff = this.targetSpeed - this.speed;
                this.speed += speedDiff * easedProgress;

                // If we're very close to the target speed, snap to it
                if (Math.abs(this.speed - this.targetSpeed) < 0.1) {
                    this.speed = this.targetSpeed;
                }

                // Update the last speed update time if we've completed this acceleration
                if (progressFactor >= 1) {
                    this.lastSpeedUpdateTime = currentTime;
                }
            }
        }

        // Move the ship if it has speed
        if (this.speed > 0) {
            const newPos = calculateNewPosition(
                this.x,
                this.y,
                this.movementAngle,
                this.speed,
                this.maxSpeed,
                deltaTime
            );
            this.x = newPos.x;
            this.y = newPos.y;

            // Add point to contrail when moving
            if (this.speed > 0.1) { // Only add points when actually moving
                this.contrail.addPoint(this.x, this.y);
            }

            // Update camera offset
            game.cameraOffset.x = this.x - game.camera.width / 2;
            game.cameraOffset.y = this.y - game.camera.height / 2;

            // keep ship bound to world
            this.x = Math.max(0, Math.min(this.x, game.world.width));
            this.y = Math.max(0, Math.min(this.y, game.world.height));
        }

        // Update towed container position (behind the ship)
        if (this.towedContainer) {
            const towDist = 50;
            this.towedContainer.x = this.x - Math.cos(this.angle) * towDist;
            this.towedContainer.y = this.y - Math.sin(this.angle) * towDist;
        }
    }

    draw() {
        // Draw towed container behind ship
        if (this.towedContainer) {
            this.towedContainer.draw();
        }

        // Draw contrail first
        this.contrail.draw(game.cameraOffset);

        // Draw brake indicator: 8 inward-pointing triangles around ship
        if (game.input.isBraking) {
            const sx = this.x - game.cameraOffset.x;
            const sy = this.y - game.cameraOffset.y;
            const radius = 36;
            const triSize = 8;
            game.ctx.save();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const cx = sx + Math.cos(a) * radius;
                const cy = sy + Math.sin(a) * radius;
                // tip points inward toward ship center
                const tipX = cx - Math.cos(a) * triSize * 0.65;
                const tipY = cy - Math.sin(a) * triSize * 0.65;
                // base midpoint (outward)
                const baseMidX = cx + Math.cos(a) * triSize * 0.4;
                const baseMidY = cy + Math.sin(a) * triSize * 0.4;
                // gradient: white at tip, transparent at base
                const grad = game.ctx.createLinearGradient(tipX, tipY, baseMidX, baseMidY);
                grad.addColorStop(0, 'rgba(255,255,255,0.85)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                game.ctx.fillStyle = grad;
                // base corners spread perpendicular, offset outward
                const lbX = cx - Math.sin(a) * triSize * 0.5 + Math.cos(a) * triSize * 0.4;
                const lbY = cy + Math.cos(a) * triSize * 0.5 + Math.sin(a) * triSize * 0.4;
                const rbX = cx + Math.sin(a) * triSize * 0.5 + Math.cos(a) * triSize * 0.4;
                const rbY = cy - Math.cos(a) * triSize * 0.5 + Math.sin(a) * triSize * 0.4;
                game.ctx.beginPath();
                game.ctx.moveTo(tipX, tipY);
                game.ctx.lineTo(lbX, lbY);
                game.ctx.lineTo(rbX, rbY);
                game.ctx.closePath();
                game.ctx.fill();
            }
            game.ctx.restore();
        }

        // Draw ship
        game.ctx.save();
        game.ctx.translate(game.camera.width / 2, game.camera.height / 2);
        game.ctx.rotate(this.angle);
        // ctx.fillStyle = 'white';
        // ctx.fill();
        game.ctx.translate(-8, 0);
        drawSVGImg(game.shipImg, CONFIG.MOBILE_SCALE * 0.7);
        game.ctx.restore();
    }

    shoot() {
        if (game.entities.length >= CONFIG.MAX_ENTITIES + 10) return;

        const currentTime = performance.now();
        let canFire = false;

        switch (game.player.currentWeapon) {
            case 'laser':
                if (currentTime - game.player.lastLaserFireTime >= game.player.LASER_FIRE_RATE) {
                    canFire = true;
                    game.player.lastLaserFireTime = currentTime;
                }
                break;
            case 'machineGun':
                if (currentTime - game.player.lastBulletFireTime >= game.player.BULLET_FIRE_RATE) {
                    canFire = true;
                    game.player.lastBulletFireTime = currentTime;
                }
                break;
            case 'missile':
                if (currentTime - game.player.lastMissileFireTime >= game.player.MISSILE_FIRE_RATE) {
                    canFire = true;
                    game.player.lastMissileFireTime = currentTime;
                }
                break;
            case 'beam':
                if (currentTime - game.player.lastBeamFireTime >= game.player.BEAM_FIRE_RATE) {
                    canFire = true;
                    game.player.lastBeamFireTime = currentTime;
                }
                break;
        }

        if (!canFire) return;

        // Handle beam weapon separately since it doesn't go into projectiles array
        if (game.player.currentWeapon === 'beam') {
            const beam = new Beam(this.x, this.y, this.angle);
            game.beams.push(beam);
            game.entities.push(beam);
            return;
        }

        let projectile;
        switch (game.player.currentWeapon) {
            case 'laser':
                projectile = [new Laser(this.x, this.y, this.angle)];
                break;
            case 'machineGun':
                let bullet = new Bullet(this.x, this.y, this.angle);
                projectile = spawnOffsetGroup(bullet, 2, 10); // dual
                break;
            case 'missile':
                projectile = [new Missile(this.x, this.y, this.angle)];
                break;
        }
        game.projectiles.push(...projectile);
        game.entities.push(...projectile);
    }
}


class Asteroid {
    constructor(x, y, radius) {

        this.name = 'asteroid';
        this.x = x || randomMinMax(10, game.world.width - 100);
        this.y = y || randomMinMax(10, game.world.height - 100);
        this.radius = radius || randomMinMax(30, 45);
        this.velocityX = (randomMinMax(2, 20)) * 2;
        this.velocityY = (randomMinMax(2, 20)) * 2;
        // color in HSL (degrees, percentage, percentage)
        this.hue = randomMinMax(10, 30); // + 340
        this.saturation = randomMinMax(50, 90);
        this.lightness = randomMinMax(10, 20); // Increased minimum to 45 and range to give 45-80
        this.mass = Math.PI * this.radius * this.radius * 3;

        // Add rotation properties
        this.rotationAngle = Math.random() * Math.PI * 2; // Random initial rotation
        this.rotationSpeed = randomMinMax(2, 20) * Math.PI / 180; // Random spin

        this.sides = 10;
        this.angleIncrement = Math.PI * 2 / this.sides;
        this.vertices = [];

        for (let i = 0; i < this.sides; i++) {
            const angle = i * this.angleIncrement + Math.random() * 0.4 - 0.2;
            const r = this.radius * (1 + Math.random() * 0.3 - 0.15);
            this.vertices.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
        }


    }

    draw() {
        game.ctx.save(); // Save the current context state
        game.ctx.translate(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y); // Translate to asteroid position
        game.ctx.rotate(this.rotationAngle); // Apply rotation

        game.ctx.beginPath();
        // Start at the first vertex (now relative to 0,0 since we've translated)
        game.ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

        for (let i = 1; i < this.sides; i++) {
            game.ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }

        game.ctx.closePath();
        game.ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
        game.ctx.fill();

        game.ctx.restore(); // Restore the context state
    }

    update(deltaTime) {
        // deltaTime means time between frames

        // update asteroid position relative to world?
        this.x += (this.velocityX * deltaTime / 1000);
        this.y += (this.velocityY * deltaTime / 1000);

        // Update rotation angle based on rotation speed and deltaTime
        this.rotationAngle += this.rotationSpeed * deltaTime / 1000;

        // Keep rotation angle between 0 and 2*PI
        if (this.rotationAngle > Math.PI * 2) {
            this.rotationAngle -= Math.PI * 2;
        } else if (this.rotationAngle < 0) {
            this.rotationAngle += Math.PI * 2;
        }

        // keep asteroid bound to world
        if (this.x < 0 || this.x > game.world.width) this.velocityX *= -1;
        if (this.y < 0 || this.y > game.world.height) this.velocityY *= -1;

        this.x = Math.max(0, Math.min(this.x, game.world.width));
        this.y = Math.max(0, Math.min(this.y, game.world.height));
    }

    split() {
        if (game.entities.length > CONFIG.MAX_ENTITIES) return [];
        if (this.radius < CONFIG.MIN_ASTEROID_SIZE) return [];

        const newRadius = this.radius * 0.5;

        // Add new asteroids
        const newAsteroid1 = new Asteroid(this.x, this.y, newRadius);
        const newAsteroid2 = new Asteroid(this.x, this.y, newRadius);

        // Increase rotation speed of the new asteroids (1.5-2.5 times faster)
        const rotationalSpeedChangeAmt = randomMinMax(2, 5);

        newAsteroid1.rotationSpeed = this.rotationSpeed * rotationalSpeedChangeAmt;
        newAsteroid2.rotationSpeed = this.rotationSpeed * rotationalSpeedChangeAmt;

        // Add new asteroids directly to the arrays
        game.asteroids.push(newAsteroid1, newAsteroid2);
        game.entities.push(newAsteroid1, newAsteroid2);

        return [newAsteroid1, newAsteroid2];
    }
}


class Planet {
    constructor(x, y) {
        this.name = 'planet';
        this.radius = 100;
        // If x,y not provided, generate random position within world bounds
        this.x = x !== undefined ? x : this.radius + Math.random() * (game.world.width - this.radius * 2);
        this.y = y !== undefined ? y : this.radius + Math.random() * (game.world.height - this.radius * 2);
    }

    update() {
        // Planets don't move, but we need this method for the game loop
    }

    draw() {
        game.ctx.fillStyle = 'hsl(200, 50%, 50%)';
        game.ctx.beginPath();
        game.ctx.arc(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y, this.radius, 0, Math.PI * 2);
        game.ctx.fill();
    }
}


class Projectile {
    constructor(x, y, angle, speed = 1000, radius, lifespan = 6000) {
        this.name = 'projectile';
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = radius;
        this.lifespan = lifespan;
        this.mass = Math.PI * this.radius * this.radius;
    }

    update(deltaTime) {
        this.x += Math.cos(this.angle) * this.speed * deltaTime / 1000;
        this.y += Math.sin(this.angle) * this.speed * deltaTime / 1000;
        this.lifespan -= deltaTime;
    }

    draw() {
        game.ctx.beginPath();
        // ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.radius, 0, Math.PI * 2);
        game.ctx.moveTo(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y);
        game.ctx.lineTo(
            this.x - game.cameraOffset.x + Math.cos(this.angle) * 10,
            this.y - game.cameraOffset.y + Math.sin(this.angle) * 10
        );
        game.ctx.strokeStyle = 'white';
        game.ctx.lineWidth = 3;
        game.ctx.stroke();
        // ctx.fillStyle = 'white';
        // ctx.fill();
    }
}


class Laser extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 6000, 10, 100);
        this.name = 'laser';
    }

    draw() {
        game.ctx.beginPath();
        game.ctx.moveTo(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y);
        game.ctx.lineTo(
            this.x - game.cameraOffset.x + Math.cos(this.angle) * this.speed * this.lifespan / 1000,
            this.y - game.cameraOffset.y + Math.sin(this.angle) * this.speed * this.lifespan / 1000
        );
        game.ctx.strokeStyle = 'red';
        game.ctx.lineWidth = 3;
        game.ctx.stroke();
    }
}


class Bullet extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 1000, 3, 3000);
        this.name = 'bullet';
    }
}


class Missile extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 10, 5, 6000); // Start with initial speed of 10
        this.name = 'missile';
        this.initialSpeed = 100;
        this.maxSpeed = 1000;
        this.timeSinceLaunch = 0;
    }

    update(deltaTime) {
        this.timeSinceLaunch += deltaTime;
        // Calculate how many 50ms intervals have passed
        const intervals = Math.floor(this.timeSinceLaunch / 50);
        // Speed doubles every interval, but is capped at maxSpeed
        this.speed = Math.min(this.initialSpeed * Math.pow(1.1, intervals), this.maxSpeed);

        // Use the parent class's movement logic with our updated speed
        this.x += Math.cos(this.angle) * this.speed * deltaTime / 1000;
        this.y += Math.sin(this.angle) * this.speed * deltaTime / 1000;
        this.lifespan -= deltaTime;
    }

    draw() {
        game.ctx.save();
        game.ctx.translate(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y);
        game.ctx.rotate(this.angle);
        game.ctx.beginPath();
        game.ctx.moveTo(this.radius * 2, 0);
        game.ctx.lineTo(-this.radius * 2, -this.radius);
        game.ctx.lineTo(-this.radius * 2, this.radius);
        game.ctx.closePath();
        game.ctx.fillStyle = 'yellow';
        game.ctx.fill();
        game.ctx.restore();
    }
}


class Contrail extends Projectile {
    constructor(x, y, angle) {
        this.name = 'contrail';
        super(x, y, angle, 0, 2, 6000);
        this.count = 1;
    }

    draw() {
        game.ctx.beginPath();
        game.ctx.moveTo(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y);
        game.ctx.lineTo(
            this.x - game.cameraOffset.x + Math.cos(this.angle) * this.speed * this.lifespan / 1000,
            this.y - game.cameraOffset.y + Math.sin(this.angle) * this.speed * this.lifespan / 1000
        );
        game.ctx.strokeStyle = 'red';
        game.ctx.lineWidth = 2;
        game.ctx.stroke();
    }
}


class Beam {
    constructor(x, y, angle) {
        this.name = 'beam';
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.length = 400;      // Length of the beam
        this.radius = 8;         // Width/radius of the beam
        this.lifespan = 200;     // How long the beam stays active (ms)
        this.createdAt = performance.now();

        // Calculate end point of the beam
        this.endX = this.x + Math.cos(this.angle) * this.length;
        this.endY = this.y + Math.sin(this.angle) * this.length;
    }

    update(deltaTime) {
        this.lifespan -= deltaTime;
    }

    draw() {
        // Draw the beam as a thick line
        game.ctx.save();

        // Create gradient for visual effect
        const gradient = game.ctx.createLinearGradient(
            this.x - game.cameraOffset.x,
            this.y - game.cameraOffset.y,
            this.endX - game.cameraOffset.x,
            this.endY - game.cameraOffset.y
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 200, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0.2)');

        game.ctx.beginPath();
        game.ctx.moveTo(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y);
        game.ctx.lineTo(this.endX - game.cameraOffset.x, this.endY - game.cameraOffset.y);
        game.ctx.strokeStyle = gradient;
        game.ctx.lineWidth = this.radius * 2;
        game.ctx.lineCap = 'round';
        game.ctx.stroke();

        // Add outer glow
        game.ctx.beginPath();
        game.ctx.moveTo(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y);
        game.ctx.lineTo(this.endX - game.cameraOffset.x, this.endY - game.cameraOffset.y);
        game.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        game.ctx.lineWidth = this.radius * 3;
        game.ctx.lineCap = 'round';
        game.ctx.stroke();

        game.ctx.restore();
    }

    // Check if a point is within the beam's area
    isPointInBeam(px, py) {
        // Vector from beam start to point
        const dx = px - this.x;
        const dy = py - this.y;

        // Beam direction vector
        const beamDx = Math.cos(this.angle);
        const beamDy = Math.sin(this.angle);

        // Project point onto beam line
        const projection = dx * beamDx + dy * beamDy;

        // Check if projection is within beam length
        if (projection < 0 || projection > this.length) {
            return false;
        }

        // Find closest point on beam line
        const closestX = this.x + beamDx * projection;
        const closestY = this.y + beamDy * projection;

        // Check distance from point to closest point on line
        const distance = Math.hypot(px - closestX, py - closestY);

        return distance <= this.radius;
    }
}


class Particle {
    constructor() {
        this.name = 'particle';
        this.x = Math.random() * game.world.width;
        this.y = Math.random() * game.world.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }

    update(deltaTime) {
        // update particle position relative to world
        this.x -= (this.speedX * deltaTime / 1000);
        this.y -= (this.speedY * deltaTime / 1000);

        if (this.x < 0) this.x = game.world.width;
        if (this.x > game.world.width) this.x = 0;
        if (this.y < 0) this.y = game.world.height;
        if (this.y > game.world.height) this.y = 0;
    }

    draw() {
        game.ctx.fillStyle = 'hsla(0, 0.00%, 78.40%, 0.50)';
        game.ctx.beginPath();
        game.ctx.arc(this.x - game.cameraOffset.x, this.y - game.cameraOffset.y, this.size, 0, Math.PI * 2);
        game.ctx.fill();
    }
}


class Dialogue {

    constructor() {
        this.name = 'dialogue';
        // this.x = world.width / 2;
        // this.x = camera.width / 2;
        // Set text styles
        this.fontSize = 30;
        this.textColor = 'hsl(57, 100%, 83%)';

        // Calculate text position for centering
        this.textWidth = game.ctx.measureText(game.ui.dialogueText).width;
        this.textHeight = this.fontSize; // Extract font size
        this.x = game.camera.width / 2;
        this.y = game.camera.height / 2;

        // Calculate rectangle dimensions
        this.rectWidth = game.camera.width * (isMobile() ? 0.9 : 0.5); // textWidth + 20;
        this.rectHeight = game.camera.height * 0.3; // textHeight + 20;
        this.rectX = this.x - this.rectWidth / 2;
        this.rectY = this.y - this.rectHeight / 2;

        this.btnDelay = 300;
    }

    draw() {
        // draw the dialogue and text
        if (game.state.game_over === false && game.ui.dialogueText.length < 1) {
            return;
        }
        game.ctx.font = `bold ${this.fontSize}px sans-serif`;
        game.ctx.textAlign = 'center';
        game.ctx.textBaseline = 'middle';

        // Draw the rectangle
        // ctx.fillStyle = 'skyblue'; // Or any color you prefer
        // ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        this.drawRoundedRectangle(this.rectX, this.rectY, this.rectWidth, this.rectHeight);

        this.drawText(this.x, game.camera.height * 0.45, game.ui.dialogueText);
    }

    // would be easier
    drawRoundedRectangle(rectX, rectY, rectWidth, rectHeight) {
        // Draw rounded rectangle
        const radius = 10; // Adjust the radius as needed
        game.ctx.strokeStyle = this.textColor; // Or any color you prefer
        game.ctx.lineWidth = 2; // Adjust the stroke width as needed
        game.ctx.beginPath();
        game.ctx.moveTo(rectX + radius, rectY);
        game.ctx.lineTo(rectX + rectWidth - radius, rectY);
        game.ctx.arc(rectX + rectWidth - radius, rectY + radius, radius, Math.PI * 3 / 2, Math.PI * 2);
        game.ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        game.ctx.arc(rectX + rectWidth - radius, rectY + rectHeight - radius, radius, 0, Math.PI / 2);
        game.ctx.lineTo(rectX + radius, rectY + rectHeight);
        game.ctx.arc(rectX + radius, rectY + rectHeight - radius, radius, Math.PI / 2, Math.PI);
        game.ctx.lineTo(rectX, rectY + radius);
        game.ctx.arc(rectX + radius, rectY + radius, radius, Math.PI, Math.PI * 3 / 2);
        game.ctx.closePath();
        game.ctx.stroke();
    }

    drawText(x, y, text) {
        // Draw the text
        game.ctx.fillStyle = this.textColor; // Or any color you prefer
        game.ctx.fillText(text, x, y);
    }

    update(deltaTime) {
        if (game.state.game_over === false && game.ui.dialogueText.length < 1) {
            return;
        }
        // message.innerText = (deltaTime + "").substring(0, 2);
        // Check if it's time to draw the rectangle
        this.btnDelay -= deltaTime;
        if (this.btnDelay <= 0) {
            // Draw the rectangle
            // ctx.fillStyle = 'blue';
            this.drawRoundedRectangle(this.rectX * 1.5, this.rectY * 1.5, this.rectWidth * 0.5, this.rectHeight * 0.3);
            this.drawText(this.x, this.y + game.camera.height * 0.07, "restart");
            // ctx.fillRect(this.rectX, this.rectY, this.rectWidth, this.rectHeight);
            this.btnDelay = 0; // Reset the delay
        }
    }
}


class CargoContainer {
    constructor(x, y) {
        this.name = 'container';
        this.x = x !== undefined ? x : randomMinMax(80, game.world.width - 80);
        this.y = y !== undefined ? y : randomMinMax(80, game.world.height - 80);
        this.width = 40;
        this.height = 24;
        this.health = 30;
        this.maxHealth = 30;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isTowed = false;
        this.discovered = false;
        this.contents = Math.random() < 0.7 ? 'salvage' : null;
    }

    update(deltaTime) {
        if (this.isTowed) return;
        this.x += this.velocityX * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;
        this.velocityX *= 0.99;
        this.velocityY *= 0.99;
        if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > game.world.width) this.velocityX *= -1;
        if (this.y - this.height / 2 < 0 || this.y + this.height / 2 > game.world.height) this.velocityY *= -1;
        this.x = Math.max(this.width / 2, Math.min(this.x, game.world.width - this.width / 2));
        this.y = Math.max(this.height / 2, Math.min(this.y, game.world.height - this.height / 2));
    }

    draw() {
        const sx = this.x - game.cameraOffset.x;
        const sy = this.y - game.cameraOffset.y;
        const w = this.width;
        const h = this.height;
        game.ctx.save();
        game.ctx.translate(sx, sy);
        // Body
        game.ctx.fillStyle = '#C8A012';
        game.ctx.fillRect(-w / 2, -h / 2, w, h);
        // Border
        game.ctx.strokeStyle = '#7A6000';
        game.ctx.lineWidth = 2;
        game.ctx.strokeRect(-w / 2, -h / 2, w, h);
        // Cross dividers
        game.ctx.beginPath();
        game.ctx.moveTo(0, -h / 2);
        game.ctx.lineTo(0, h / 2);
        game.ctx.moveTo(-w / 2, 0);
        game.ctx.lineTo(w / 2, 0);
        game.ctx.lineWidth = 1;
        game.ctx.stroke();
        // Health bar
        game.ctx.fillStyle = '#222';
        game.ctx.fillRect(-w / 2, -h / 2 - 7, w, 4);
        game.ctx.fillStyle = `hsl(${(this.health / this.maxHealth) * 120}, 100%, 45%)`;
        game.ctx.fillRect(-w / 2, -h / 2 - 7, w * (this.health / this.maxHealth), 4);
        // Tow indicator
        if (this.isTowed) {
            game.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            game.ctx.lineWidth = 1;
            game.ctx.setLineDash([3, 3]);
            game.ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
            game.ctx.setLineDash([]);
        }
        game.ctx.restore();
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.isTowed && game.ship.towedContainer === this) {
            game.ship.towedContainer = null;
        }
        // 50% chance to drop contents as collectable scrap
        if (this.contents && Math.random() < 0.5) {
            const drop = new Scrap(this.x, this.y, this.contents);
            game.scrap.push(drop);
        }
        // Debris fragments
        for (let i = 0; i < 4; i++) {
            game.scrap.push(new Scrap(this.x, this.y, null));
        }
        const idx = game.containers.indexOf(this);
        if (idx !== -1) game.containers.splice(idx, 1);
        const eidx = game.entities.indexOf(this);
        if (eidx !== -1) game.entities.splice(eidx, 1);
    }
}


class Scrap {
    constructor(x, y, contents) {
        this.name = 'scrap';
        this.x = x;
        this.y = y;
        this.contents = contents;
        this.width = contents ? 10 : 5;
        this.height = contents ? 7 : 4;
        this.velocityX = randomMinMax(-40, 40);
        this.velocityY = randomMinMax(-40, 40);
        this.lifespan = contents ? 30000 : 5000;
    }

    update(deltaTime) {
        this.x += this.velocityX * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;
        this.velocityX *= 0.995;
        this.velocityY *= 0.995;
        this.lifespan -= deltaTime;
    }

    draw() {
        const alpha = this.contents ? 1 : Math.min(1, this.lifespan / 1000);
        const sx = this.x - game.cameraOffset.x;
        const sy = this.y - game.cameraOffset.y;
        game.ctx.save();
        game.ctx.globalAlpha = Math.max(0, alpha);
        game.ctx.fillStyle = this.contents ? '#FFD700' : '#888';
        game.ctx.fillRect(sx - this.width / 2, sy - this.height / 2, this.width, this.height);
        game.ctx.restore();
    }
}


function spawnInitialAsteroids() {
    console.log('spawnInitialAsteroids');
    for (let i = 0; i < CONFIG.INITIAL_ASTEROID_COUNT; i++) {
        if (game.entities.length < CONFIG.MAX_ENTITIES) {
            const asteroid = new Asteroid();
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
            const planet = new Planet();
            game.planets.push(planet);
            game.entities.push(planet);
        }
    }
    console.log('planets spawned:', game.planets.length);
}

function createParticles() {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        game.particles.push(new Particle());
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




function drawWorldBorder() {
    game.ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    game.ctx.lineWidth = 4;
    game.ctx.strokeRect(-game.cameraOffset.x, -game.cameraOffset.y, game.world.width, game.world.height);
}


//////
function drawMiniMap() {

    const minimapSize = {
        width: game.MINIMAP_SCALE,
        height: game.world.height / game.world.width * game.MINIMAP_SCALE
    };

    // message.innerText = `| map ${MINIMAP_MARGIN}`;

    // Save the current context state
    game.ctx.save();

    // Set up the mini-map area
    game.ctx.lineWidth = 1;
    game.ctx.fillStyle = 'rgba(0, 0, 3, 0.5)';
    game.ctx.fillRect(game.MINIMAP_MARGIN, game.MINIMAP_MARGIN, minimapSize.width, minimapSize.height);

    // Draw mini world border
    game.ctx.strokeStyle = 'hsl(221, 12.20%, 45.10%)';
    game.ctx.strokeRect(game.MINIMAP_MARGIN, game.MINIMAP_MARGIN, minimapSize.width, minimapSize.height);
    game.ctx.fill();

    // Calculate the scale factor for objects within the mini-map
    const scaleFactor = minimapSize.width / game.world.width;

    // Draw mini asteroids
    game.asteroids.forEach(asteroid => {
        game.ctx.fillStyle = `hsl(0, 100%, 59%)`;
        game.ctx.fillRect(game.MINIMAP_MARGIN + asteroid.x * scaleFactor, game.MINIMAP_MARGIN + asteroid.y * scaleFactor, 2, 2);
        // ctx.beginPath();
        // ctx.arc(
        //     MINIMAP_MARGIN + asteroid.x * scaleFactor,
        //     MINIMAP_MARGIN + asteroid.y * scaleFactor,
        //     2,
        //     0,
        //     Math.PI * 2
        // );
        game.ctx.fill();
    });

    // Draw discovered containers
    game.containers.forEach(container => {
        if (container.discovered) {
            game.ctx.fillStyle = 'yellow';
            game.ctx.fillRect(game.MINIMAP_MARGIN + container.x * scaleFactor - 1, game.MINIMAP_MARGIN + container.y * scaleFactor - 1, 3, 3);
        }
    });

    // Draw mini planets
    game.planets.forEach(planet => {
        game.ctx.fillStyle = 'cyan';
        game.ctx.fillRect(game.MINIMAP_MARGIN + planet.x * scaleFactor, game.MINIMAP_MARGIN + planet.y * scaleFactor, 4, 4);
    });

    // Draw mini ship
    game.ctx.fillStyle = 'yellow';
    game.ctx.fillRect(game.MINIMAP_MARGIN + game.ship.x * scaleFactor, game.MINIMAP_MARGIN + game.ship.y * scaleFactor, 2, 2);
    // ctx.beginPath();
    // ctx.arc(
    //     MINIMAP_MARGIN + ship.x * scaleFactor,
    //     MINIMAP_MARGIN + ship.y * scaleFactor,
    //     3,
    //     0,
    //     Math.PI * 2
    // );
    game.ctx.fill();

    // Draw mini view area
    game.ctx.lineWidth = 1;
    game.ctx.strokeStyle = 'hsla(170, 60%, 30%, 0.4)';
    game.ctx.strokeRect(
        game.MINIMAP_MARGIN + (game.ship.x - game.camera.width / 2) * scaleFactor,
        game.MINIMAP_MARGIN + (game.ship.y - game.camera.height / 2) * scaleFactor,
        game.camera.width * scaleFactor,
        game.camera.height * scaleFactor
    );

    // Restore the context state
    game.ctx.restore();
}
///////

game.actionBtnSize = {
    // button dimensions
    width: ((game.camera.width < 800) ? game.camera.width * 0.2 : game.camera.width * 0.1),
    height: game.camera.height * 0.1,
    // Calculate rectangle position in bottom left corner
    posX: 10,
    posY: game.camera.height - (game.camera.height * 0.1 + 10),
}

game.pauseBtnSize = {
    // button dimensions - same size as action button
    width: ((game.camera.width < 800) ? game.camera.width * 0.2 : game.camera.width * 0.1),
    height: game.camera.height * 0.1,
    // Position 10px above the action button
    posX: 10,
    posY: game.camera.height - (game.camera.height * 0.1 + 10) - (game.camera.height * 0.1 + 10),
}

game.pauseBtnIcon = {
    // icon dimensions
    width: game.CENTER_CIRCLE_RADIUS * 0.5,
    height: game.CENTER_CIRCLE_RADIUS,
    // icon position
    posX: game.pauseBtnSize.posX + 10,
    posY: game.pauseBtnSize.posY + 10,
}

function drawPauseIcon() {
    drawRectangle(game.pauseBtnIcon);
    drawRectangle(game.pauseBtnIcon, { x: game.CENTER_CIRCLE_RADIUS * 0.76, y: 0 });
}

game.cargoBtnSize = {
    width: ((game.camera.width < 800) ? game.camera.width * 0.2 : game.camera.width * 0.1),
    height: game.camera.height * 0.1,
    posX: 10,
    posY: game.camera.height - (game.camera.height * 0.1 + 10) * 3,
};

function drawCargoButton() {
    const hasTowed = game.ship && game.ship.towedContainer !== null;
    const nearbyContainer = game.containers.find(c => !c.isTowed && Math.hypot(game.ship.x - c.x, game.ship.y - c.y) < 80);
    const canPickup = !hasTowed && nearbyContainer;
    const colour = hasTowed
        ? 'hsla(120, 80%, 35%, 0.85)'
        : canPickup ? 'hsla(55, 100%, 45%, 0.75)' : 'hsla(0, 0%, 35%, 0.45)';
    drawRectangle(game.cargoBtnSize, { x: 0, y: 0 }, colour);
    game.ctx.font = `bold ${Math.round(game.cargoBtnSize.height * 0.3)}px sans-serif`;
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'middle';
    game.ctx.fillStyle = 'white';
    game.ctx.fillText(
        hasTowed ? 'DROP' : 'PICK',
        game.cargoBtnSize.posX + game.cargoBtnSize.width / 2,
        game.cargoBtnSize.posY + game.cargoBtnSize.height / 2
    );
}

game.resetBtnSize = {
    // button dimensions
    width: game.camera.width * (isMobile() ? 0.55 : 0.25), // rectWidth * 0.5 (half of camera.width * 0.5)
    height: game.camera.height * 0.09, // rectHeight * 0.3 (30% of camera.height * 0.3)
    // Position to match the dialogue's drawing position
    posX: game.camera.width / 2 - (game.camera.width * (isMobile() ? 0.55 : 0.25)) / 2, // Center horizontally
    posY: game.camera.height / 2 + game.camera.height * 0.07 - game.camera.height * 0.045, // Center vertically with text offset
};

game._menuBtnW = Math.min(308, game.camera.width * 0.66);
game._menuBtnH = Math.max(50, game.camera.height * 0.09);
game._menuBtnX = game.camera.width / 2 - game._menuBtnW / 2;

game.menuStartBtnSize = { width: game._menuBtnW, height: game._menuBtnH, posX: game._menuBtnX, posY: game.camera.height * 0.48 };
game.menuControlsBtnSize = { width: game._menuBtnW, height: game._menuBtnH, posX: game._menuBtnX, posY: game.camera.height * 0.60 };
game.menuBackBtnSize = { width: game._menuBtnW * 0.6, height: game._menuBtnH, posX: game.camera.width / 2 - game._menuBtnW * 0.3, posY: game.camera.height * 0.82 };

function drawMenuBackground() {
    const bg = game.ctx.createLinearGradient(0, 0, 0, game.camera.height);
    bg.addColorStop(0.0, '#7A4827');
    bg.addColorStop(0.33, '#772F1F');
    bg.addColorStop(0.66, '#5D1E18');
    bg.addColorStop(1.0, '#401111');
    game.ctx.fillStyle = bg;
    game.ctx.fillRect(0, 0, game.camera.width, game.camera.height);
}

function drawMenuButton(btnSize, label, active) {
    game.ctx.fillStyle = active ? 'hsla(40, 100%, 60%, 0.85)' : 'hsla(0, 0%, 100%, 0.12)';
    game.ctx.strokeStyle = active ? 'hsla(40, 100%, 75%, 1)' : 'rgba(255,255,255,0.35)';
    game.ctx.lineWidth = 2;
    game.ctx.fillRect(btnSize.posX, btnSize.posY, btnSize.width, btnSize.height);
    game.ctx.strokeRect(btnSize.posX, btnSize.posY, btnSize.width, btnSize.height);
    game.ctx.font = `bold ${Math.round(btnSize.height * 0.38)}px sans-serif`;
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'middle';
    game.ctx.fillStyle = active ? '#1a0a00' : 'white';
    game.ctx.fillText(label, btnSize.posX + btnSize.width / 2, btnSize.posY + btnSize.height / 2);
}

function drawMainMenu() {
    drawMenuBackground();
    // Title
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'middle';
    game.ctx.fillStyle = 'hsla(40, 100%, 70%, 1)';
    const titleSize = Math.min(Math.round(game.camera.height * 0.09), Math.round(game.camera.width * 0.11));
    game.ctx.font = `bold ${titleSize}px sans-serif`;
    game.ctx.fillText('SOLAR GAME', game.camera.width / 2, game.camera.height * 0.25);
    // Subtitle
    game.ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const subSize = Math.round(game.camera.height * 0.03);
    game.ctx.font = `${subSize}px sans-serif`;
    const subtitle = 'navigate · salvage · survive';
    const subY = game.camera.height * 0.34;
    if (game.ctx.measureText(subtitle).width > game.camera.width * 0.82) {
        game.ctx.fillText('navigate · salvage', game.camera.width / 2, subY - subSize * 0.7);
        game.ctx.fillText('· survive', game.camera.width / 2, subY + subSize * 0.7);
    } else {
        game.ctx.fillText(subtitle, game.camera.width / 2, subY);
    }
    // Buttons
    const nearStart = isUIButtonClicked(game.menuStartBtnSize);
    const nearCtrl = isUIButtonClicked(game.menuControlsBtnSize);
    drawMenuButton(game.menuStartBtnSize, 'START GAME', nearStart);
    drawMenuButton(game.menuControlsBtnSize, 'CONTROLS', nearCtrl);
}

function drawControlsScreen() {
    drawMenuBackground();
    // Title
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'middle';
    game.ctx.fillStyle = 'hsla(40, 100%, 70%, 1)';
    game.ctx.font = `bold ${Math.round(game.camera.height * 0.07)}px sans-serif`;
    game.ctx.fillText('CONTROLS', game.camera.width / 2, game.camera.height * 0.14);
    // Control list
    const items = [
        ['Tap / Click', 'Move ship toward cursor'],
        ['Hold center circle', 'Brake'],
        ['Weapon button', 'Cycle weapons'],
        ['Pause button', 'Pause / Unpause'],
        ['PICK button', 'Pick up nearby cargo container'],
        ['DROP button', 'Drop towed cargo container'],
    ];
    const lineH = Math.min(game.camera.height * 0.072, 46);
    const startY = game.camera.height * 0.26;
    const colLabel = game.camera.width * 0.08;
    const colDesc = game.camera.width * 0.52;
    const fontSize = Math.round(lineH * 0.38);
    game.ctx.textBaseline = 'middle';
    items.forEach(([label, desc], i) => {
        const y = startY + i * lineH;
        game.ctx.textAlign = 'left';
        game.ctx.font = `bold ${fontSize}px sans-serif`;
        game.ctx.fillStyle = 'hsla(40, 100%, 65%, 1)';
        game.ctx.fillText(label, colLabel, y);
        game.ctx.font = `${fontSize}px sans-serif`;
        game.ctx.fillStyle = 'rgba(255,255,255,0.75)';
        game.ctx.fillText(desc, colDesc, y);
    });
    // Back button
    drawMenuButton(game.menuBackBtnSize, 'BACK', isUIButtonClicked(game.menuBackBtnSize));
}

function drawHUD() {
    const timeText = (game.state.timer.timerExpired || !game.state.timer.startTime) ? '00:00' : checkTimer();
    const fontSize = Math.min(Math.round(Math.min(game.camera.height * 0.038, game.camera.width * 0.045)), 16);
    const lineH = fontSize * 1.5;
    const remaining = game.containers.filter(c => !c.destroyed).length;
    game.ctx.save();
    game.ctx.textAlign = 'center';
    game.ctx.textBaseline = 'top';
    game.ctx.font = `bold ${fontSize}px sans-serif`;
    game.ctx.shadowColor = 'rgba(0,0,0,0.7)';
    game.ctx.shadowBlur = 6;
    game.ctx.fillStyle = 'rgba(255,255,255,0.9)';
    game.ctx.fillText(`Score: ${game.state.score}   |   ${timeText}`, game.camera.width / 2, 10);
    game.ctx.fillText(`${remaining}/${game.state.initialContainerCount} containers   |   ${game.planets.length} planets`, game.camera.width / 2, 10 + lineH);
    game.ctx.restore();
}

function drawRectangle(buttonSize, offset = { x: 0, y: 0 }, colour) {

    let fill = colour || 'hsla(320, 100%, 83%, 0.50)';
    // Stroke style
    game.ctx.fillStyle = fill;
    game.ctx.strokeStyle = 'pink';
    game.ctx.lineWidth = 2;
    // Draw the rectangle fill
    game.ctx.fillRect(buttonSize.posX + offset.x, buttonSize.posY + offset.y, buttonSize.width, buttonSize.height);
    // Draw the rectangle stroke
    game.ctx.strokeRect(buttonSize.posX + offset.x, buttonSize.posY + offset.y, buttonSize.width, buttonSize.height);
}

function menuLoop() {
    if (game.state.screen === 'menu') {
        drawMainMenu();
    } else if (game.state.screen === 'controls') {
        drawControlsScreen();
    }
    drawCursorDot(false);
    if (game.state.screen !== 'game') {
        requestAnimationFrame(menuLoop);
    }
}

game.lastTime = 0;
function gameLoop(timestamp) {
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

    // ===== DRAW PHASE (always runs) =====
    drawWorldBorder();

    // Draw particles
    game.particles.forEach(particle => {
        particle.draw();
    });

    // Draw planet
    game.planets.forEach(planet => {
        planet.draw();
    });

    // Draw scrap
    game.scrap.forEach(s => {
        s.draw();
    });

    // Draw free containers (towed container is drawn by ship.draw)
    game.containers.forEach(container => {
        if (!container.isTowed) container.draw();
    });

    // Draw ship
    game.ship.draw();

    // Draw asteroids
    game.asteroids.forEach(asteroid => {
        asteroid.draw();
    });

    // Draw projectiles
    game.projectiles.forEach(projectile => {
        projectile.draw();
    });

    // Draw beams
    game.beams.forEach(beam => {
        beam.draw();
    });

    // Draw the UI elements last, so they appear on top
    drawMiniMap();
    drawHUD();
    drawRectangle(game.actionBtnSize, { x: 0, y: 0 }, 'hsla(64, 100%, 82%, 0.5)');
    drawRectangle(game.pauseBtnSize);
    drawPauseIcon(game.pauseBtnIcon);
    drawCargoButton();

    drawCenterCircle(game.CENTER_CIRCLE_RADIUS);
    drawCenterCircle(game.CENTER_LOWTHRUST_RADIUS);
    drawCenterCircle(game.CENTER_MAXTHRUST_RADIUS);

    // Draw visual feedback line if dragging from center
    if (game.input.isDraggingFromCenter && game.input.isMouseDown) {
        const currentTime = performance.now();

        drawDragFromCenterLine();

        // Visual feedback for braking
        if (game.input.isBraking) {
            const brakeProgress = Math.min(1, (currentTime - game.input.brakeStartTime) / 1000);
            drawBrakingEffect(brakeProgress);
        }
    }

    // Draw dialogue
    game.dialogue.draw();

    // Draw cursor
    const isOverAsteroid = isPointOverAsteroid(game.ui.mouseX, game.ui.mouseY);

    if (isOverAsteroid) {
        const squareSize = 22;
        game.ctx.strokeStyle = 'yellow';
        game.ctx.lineWidth = 1;
        game.ctx.strokeRect(
            game.ui.mouseX - squareSize / 2,
            game.ui.mouseY - squareSize / 2,
            squareSize,
            squareSize
        );
    }

    drawCursorDot(isOverAsteroid);

    requestAnimationFrame(gameLoop);

    function drawDragFromCenterLine() {
        game.ctx.save();
        game.ctx.beginPath();
        game.ctx.moveTo(game.camera.width / 2, game.camera.height / 2); // Start from center of camera
        game.ctx.lineTo(game.ui.mouseX, game.ui.mouseY); // End at current mouse position
        game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        game.ctx.lineWidth = 2;
        game.ctx.stroke();
        game.ctx.restore();
    }

    function drawBrakingEffect(brakeProgress) {
        game.ctx.save();
        game.ctx.beginPath();
        game.ctx.arc(game.camera.width / 2, game.camera.height / 2, game.CENTER_CIRCLE_RADIUS * brakeProgress, 0, Math.PI * 2);
        game.ctx.fillStyle = `rgba(200, 200, 200, ${0.3 + (brakeProgress * 0.3)})`;
        game.ctx.fill();
        game.ctx.restore();
    }
}

// Mouse contrail tracking
game.mouseContrail = {
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

function drawCursorDot(isOverAsteroid) {
    // Draw contrail first
    game.mouseContrail.draw();

    // Then draw the cursor dot
    game.ctx.beginPath();
    game.ctx.rect(game.ui.mouseX - 3, game.ui.mouseY - 3, 6, 6);
    game.ctx.fillStyle = isOverAsteroid ? 'yellow' : 'white';
    game.ctx.fill();
    game.ctx.closePath();
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
        const container = new CargoContainer();
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
    game.dialogue = new Dialogue();
    game.entities.push(game.dialogue);
    game.ship = new Ship();
    game.entities.push(game.ship);
    spanInitialPlanets();
    createParticles();
    spawnInitialAsteroids();
    spawnInitialContainers();
    requestAnimationFrame(gameLoop);
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

function debug(text) {
    const codeElement = document.createElement('code');
    codeElement.textContent = text;
    game.debugEl.appendChild(codeElement);
}

function isMobile() {
    let mobileChance = 0;

    debug(`screen.orientation: ${screen.orientation.type}`);
    // debug(navigator.userAgent);
    debug(`navigator.maxTouchPoints: ${navigator.maxTouchPoints}`);
    debug(`screen w & h: ${window.screen.width}, ${window.screen.height}`);
    debug(`min of screen w & h: ${Math.min(window.screen.width, window.screen.height)}`);
    // debug(`window.matchMedia(): ${window.matchMedia("only screen and (max-width: 760px)").matches}`)
    if (typeof screen.orientation !== "undefined") {
        mobileChance++;
    }
    if (navigator.userAgent.indexOf('Mobi') > -1) {
        mobileChance++;
    }
    if (Math.min(window.screen.width, window.screen.height) < 768) {
        mobileChance++;
    }
    return (mobileChance > 2);
}

export { Game, game };

if (isMobile()) {
    console.log('Mobile device detected');
    debug('Mobile device detected');
}

function loadSVGString(svgString) {
    // Get the canvas element
    // const canvas = document.getElementById(canvasId);

    // Create a new image element
    const img = new Image();

    // Set the image source to the SVG string
    // img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);   // 
    img.src = 'data:image/svg+xml;charset=utf-8,' + svgString;

    // Load the image
    img.onload = function () {
        drawSVGImg(img);
    };

    return img;
}

function drawSVGImg(img, scale = 1) {
    // Draw the image onto the canvas
    // const ctx = canvas.getContext('2d');
    game.ctx.rotate((90 * Math.PI) / 180);
    game.ctx.scale(0.25 * scale, 0.25 * scale);
    game.ctx.translate(-154, -206);
    game.ctx.drawImage(img, 1, 1, 300, 300);
    game.ctx.translate(154, 206);
    game.ctx.scale(4, 4);
    game.ctx.rotate((-90 * Math.PI) / 180);
    // perhaps timing issue. load svg once. When ready use it?
}

// Function to draw a white circle at the center of the camera
function drawCenterCircle(radius) {
    const centerX = game.camera.width / 2;
    const centerY = game.camera.height / 2;

    game.ctx.save();
    game.ctx.beginPath();
    game.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    // ctx.fillStyle = 'white';
    // ctx.fill();
    game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    game.ctx.lineWidth = 0.5;
    game.ctx.stroke();
    game.ctx.restore();
}

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
