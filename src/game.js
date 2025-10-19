const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const weaponButton = document.getElementById('weaponButton');
const message = document.querySelector('.message');
const debugEl = initDebugArea();

let ship, asteroids = [], projectiles = [], particles = [], planet, dialogue;
let beams = []; // Array to track active beams
let world = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 }
let camera = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 };

let MINIMAP_SCALE = 0;
let MINIMAP_MARGIN = 0;

resizeCanvas();
const cameraOffset = { x: 0, y: 0 };
let entities = [];

const CONFIG = Object.freeze({
    MOBILE_SCALE: 0.55,
    MAX_ENTITIES: 200,
    PARTICLE_COUNT: 400,
    MIN_ASTEROID_SIZE: 10,
    INITIAL_ASTEROID_COUNT: 20,
});

// Game State
const state = {
    game_over: false,
    game_paused: false,
    score: 0,
    timer: {},
}

const CENTER_CIRCLE_RADIUS = 50 * CONFIG.MOBILE_SCALE;  // Radius of the central UI circle for interaction
// debug(`cw, ch: ${camera.width}, ${camera.height}`);
const CENTER_MAXTHRUST_RADIUS = 0.5 * Math.min(camera.width, camera.height) - 8;  // Radius of the central UI circle for interaction
const CENTER_LOWTHRUST_RADIUS = 0.5 * CENTER_MAXTHRUST_RADIUS + (0.5 * CENTER_CIRCLE_RADIUS);  // Radius of the central UI circle for interaction

// Input State
const input = {
    isDraggingFromCenter: false,  // For new drag-from-center movement
    isMouseDown: false,
    isShootingAsteroid: false,
    isShooting: false, // New flag to track if shooting is active
    centerHoldStartTime: 0, // Time when pointer down started in center circle
    isBraking: false, // Whether ship is currently in braking mode
    brakeStartTime: 0, // Time when braking started
}

const ui = {
    mouseX: 0,
    mouseY: 0,
    dialogueText: '',
}
let rectangleDrawTimer = null; // legacy?

const player = {
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
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="62" height="62"> <path d="m16 1-5 14-9 10 3 2 3-2 4 2v3l1.6-1.1.5 1.2L16 30h1.9l.5-1.1L20 30v-3l4-2 3 2 3-2-9-10z" style="fill:slategrey"/> </svg>
`;

const shipImg = loadSVGString(shipSVG3);



function randomMinMax(min = 0, max) {
    return Math.random() * (max - min) + min;
}






class Ship {
    constructor() {
        this.name = 'ship';
        this.x = world.width / 2;
        this.y = world.height / 2;
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

            draw(cameraOffset) {
                if (this.points.length < 2) return;

                ctx.beginPath();
                ctx.strokeStyle = 'hsl(200, 100.00%, 100%)'; // 
                ctx.lineWidth = 5;

                // Start from the oldest point
                const firstPoint = this.points[0];
                ctx.moveTo(firstPoint.x - cameraOffset.x, firstPoint.y - cameraOffset.y);

                // Draw lines to each subsequent point
                for (let i = 1; i < this.points.length; i++) {
                    const point = this.points[i];
                    ctx.lineTo(point.x - cameraOffset.x, point.y - cameraOffset.y);
                    // Gradually increase opacity for newer points
                    ctx.strokeStyle = `hsla(200, 100%, ${i * 10}%, ${i / this.points.length * 0.9})`;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(point.x - cameraOffset.x, point.y - cameraOffset.y);
                }
            }
        };
    }

    setRotation(x, y) {
        // Only changes the ship's facing angle without affecting movement
        const dx = x + cameraOffset.x - this.x;
        const dy = y + cameraOffset.y - this.y;
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
        this.targetX = x + cameraOffset.x;
        this.targetY = y + cameraOffset.y;
        const distance = Math.hypot(this.targetX - this.x, this.targetY - this.y);
        // const maxDistance = 0.5 *Math.min(camera.width, camera.height) - 10;
        const speedAdjust = 0.005;

        // Determine the new target speed based on distance
        let baseSpeed = 0;
        if (distance > CENTER_LOWTHRUST_RADIUS) {
            baseSpeed = 40;
            this.maxSpeed = 40;
        } else if (distance > CENTER_CIRCLE_RADIUS) {
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
        if (input.isBraking) {
            const currentTime = performance.now();
            const brakeProgress = Math.min(1, (currentTime - input.brakeStartTime) / 1000);

            if (brakeProgress >= 1) {
                // Braking completed
                this.speed = 0;
                this.targetSpeed = 0;
                input.isBraking = false;
            } else {
                // Gradually reduce speed based on brake progress
                const originalSpeed = this.speed;
                this.speed = originalSpeed * (1 - brakeProgress);
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
            cameraOffset.x = this.x - camera.width / 2;
            cameraOffset.y = this.y - camera.height / 2;

            // keep ship bound to world
            this.x = Math.max(0, Math.min(this.x, world.width));
            this.y = Math.max(0, Math.min(this.y, world.height));
        }
    }

    draw() {
        // Draw contrail first
        this.contrail.draw(cameraOffset);

        // Draw ship
        ctx.save();
        ctx.translate(camera.width / 2, camera.height / 2);
        ctx.rotate(this.angle);
        // ctx.fillStyle = 'white';
        // ctx.fill();
        ctx.translate(-8, 0);
        drawSVGImg(shipImg, CONFIG.MOBILE_SCALE * 0.7);
        ctx.restore();
    }

    shoot() {
        if (entities.length >= CONFIG.MAX_ENTITIES + 10) return;

        const currentTime = performance.now();
        let canFire = false;

        switch (player.currentWeapon) {
            case 'laser':
                if (currentTime - player.lastLaserFireTime >= player.LASER_FIRE_RATE) {
                    canFire = true;
                    player.lastLaserFireTime = currentTime;
                }
                break;
            case 'machineGun':
                if (currentTime - player.lastBulletFireTime >= player.BULLET_FIRE_RATE) {
                    canFire = true;
                    player.lastBulletFireTime = currentTime;
                }
                break;
            case 'missile':
                if (currentTime - player.lastMissileFireTime >= player.MISSILE_FIRE_RATE) {
                    canFire = true;
                    player.lastMissileFireTime = currentTime;
                }
                break;
            case 'beam':
                if (currentTime - player.lastBeamFireTime >= player.BEAM_FIRE_RATE) {
                    canFire = true;
                    player.lastBeamFireTime = currentTime;
                }
                break;
        }

        if (!canFire) return;

        // Handle beam weapon separately since it doesn't go into projectiles array
        if (player.currentWeapon === 'beam') {
            const beam = new Beam(this.x, this.y, this.angle);
            beams.push(beam);
            entities.push(beam);
            return;
        }

        let projectile;
        switch (player.currentWeapon) {
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
        projectiles.push(...projectile);
        entities.push(...projectile);
    }
}


class Asteroid {
    constructor(x, y, radius) {

        this.name = 'asteroid';
        this.x = x || randomMinMax(10, world.width - 100);
        this.y = y || randomMinMax(10, world.height - 100);
        this.radius = radius || randomMinMax(30, 45);
        this.velocityX = (randomMinMax(2, 20)) * 2;
        this.velocityY = (randomMinMax(2, 20)) * 2;
        // color in HSL (degrees, percentage, percentage)
        this.hue = randomMinMax(10, 30); // + 340
        this.saturation = randomMinMax(50, 90);
        this.lightness = randomMinMax(30, 40); // Increased minimum to 45 and range to give 45-80
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
        ctx.save(); // Save the current context state
        ctx.translate(this.x - cameraOffset.x, this.y - cameraOffset.y); // Translate to asteroid position
        ctx.rotate(this.rotationAngle); // Apply rotation

        ctx.beginPath();
        // Start at the first vertex (now relative to 0,0 since we've translated)
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

        for (let i = 1; i < this.sides; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }

        ctx.closePath();
        ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
        ctx.fill();

        ctx.restore(); // Restore the context state
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
        if (this.x < 0 || this.x > world.width) this.velocityX *= -1;
        if (this.y < 0 || this.y > world.height) this.velocityY *= -1;

        this.x = Math.max(0, Math.min(this.x, world.width));
        this.y = Math.max(0, Math.min(this.y, world.height));
    }

    split() {
        if (entities.length > CONFIG.MAX_ENTITIES) return [];
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
        asteroids.push(newAsteroid1, newAsteroid2);
        entities.push(newAsteroid1, newAsteroid2);

        return [newAsteroid1, newAsteroid2];
    }
}


class Planet {
    constructor(x, y) {
        this.name = 'planet';
        this.x = x;
        this.y = y;
        this.radius = 100;
    }

    draw() {
        ctx.fillStyle = 'hsl(200, 50%, 50%)';
        ctx.beginPath();
        ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // ctx.closePath();
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
        ctx.beginPath();
        // ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.radius, 0, Math.PI * 2);
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(
            this.x - cameraOffset.x + Math.cos(this.angle) * 10,
            this.y - cameraOffset.y + Math.sin(this.angle) * 10
        );
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
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
        ctx.beginPath();
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(
            this.x - cameraOffset.x + Math.cos(this.angle) * this.speed * this.lifespan / 1000,
            this.y - cameraOffset.y + Math.sin(this.angle) * this.speed * this.lifespan / 1000
        );
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.stroke();
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
        ctx.save();
        ctx.translate(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(-this.radius * 2, -this.radius);
        ctx.lineTo(-this.radius * 2, this.radius);
        ctx.closePath();
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.restore();
    }
}


class Contrail extends Projectile {
    constructor(x, y, angle) {
        this.name = 'contrail';
        super(x, y, angle, 0, 2, 6000);
        this.count = 1;
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(
            this.x - cameraOffset.x + Math.cos(this.angle) * this.speed * this.lifespan / 1000,
            this.y - cameraOffset.y + Math.sin(this.angle) * this.speed * this.lifespan / 1000
        );
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
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
        ctx.save();

        // Create gradient for visual effect
        const gradient = ctx.createLinearGradient(
            this.x - cameraOffset.x,
            this.y - cameraOffset.y,
            this.endX - cameraOffset.x,
            this.endY - cameraOffset.y
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 200, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0.2)');

        ctx.beginPath();
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(this.endX - cameraOffset.x, this.endY - cameraOffset.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Add outer glow
        ctx.beginPath();
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(this.endX - cameraOffset.x, this.endY - cameraOffset.y);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = this.radius * 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
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
        this.x = Math.random() * world.width;
        this.y = Math.random() * world.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }

    update(deltaTime) {
        // update particle position relative to world
        this.x -= (this.speedX * deltaTime / 1000);
        this.y -= (this.speedY * deltaTime / 1000);

        if (this.x < 0) this.x = world.width;
        if (this.x > world.width) this.x = 0;
        if (this.y < 0) this.y = world.height;
        if (this.y > world.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = 'hsla(0, 0.00%, 78.40%, 0.50)';
        ctx.beginPath();
        ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.size, 0, Math.PI * 2);
        ctx.fill();
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
        this.textWidth = ctx.measureText(ui.dialogueText).width;
        this.textHeight = this.fontSize; // Extract font size
        this.x = camera.width / 2;
        this.y = camera.height / 2;

        // Calculate rectangle dimensions
        this.rectWidth = camera.width * 0.5; // textWidth + 20;
        this.rectHeight = camera.height * 0.3; // textHeight + 20;
        this.rectX = this.x - this.rectWidth / 2;
        this.rectY = this.y - this.rectHeight / 2;

        this.btnDelay = 300;
    }

    draw() {
        // draw the dialogue and text
        if (state.game_over === false && ui.dialogueText.length < 1) {
            return;
        }
        ctx.font = `bold ${this.fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the rectangle
        // ctx.fillStyle = 'skyblue'; // Or any color you prefer
        // ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        this.drawRoundedRectangle(this.rectX, this.rectY, this.rectWidth, this.rectHeight);

        this.drawText(this.x, camera.height * 0.45, ui.dialogueText);
    }

    // would be easier
    drawRoundedRectangle(rectX, rectY, rectWidth, rectHeight) {
        // Draw rounded rectangle
        const radius = 10; // Adjust the radius as needed
        ctx.strokeStyle = this.textColor; // Or any color you prefer
        ctx.lineWidth = 2; // Adjust the stroke width as needed
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectWidth - radius, rectY);
        ctx.arc(rectX + rectWidth - radius, rectY + radius, radius, Math.PI * 3 / 2, Math.PI * 2);
        ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        ctx.arc(rectX + rectWidth - radius, rectY + rectHeight - radius, radius, 0, Math.PI / 2);
        ctx.lineTo(rectX + radius, rectY + rectHeight);
        ctx.arc(rectX + radius, rectY + rectHeight - radius, radius, Math.PI / 2, Math.PI);
        ctx.lineTo(rectX, rectY + radius);
        ctx.arc(rectX + radius, rectY + radius, radius, Math.PI, Math.PI * 3 / 2);
        ctx.closePath();
        ctx.stroke();
    }

    drawText(x, y, text) {
        // Draw the text
        ctx.fillStyle = this.textColor; // Or any color you prefer
        ctx.fillText(text, x, y);
    }

    update(deltaTime) {
        if (state.game_over === false && ui.dialogueText.length < 1) {
            return;
        }
        // message.innerText = (deltaTime + "").substring(0, 2);
        // Check if it's time to draw the rectangle
        this.btnDelay -= deltaTime;
        if (this.btnDelay <= 0) {
            // Draw the rectangle
            // ctx.fillStyle = 'blue';
            this.drawRoundedRectangle(this.rectX * 1.5, this.rectY * 1.5, this.rectWidth * 0.5, this.rectHeight * 0.3);
            this.drawText(this.x, this.y + camera.height * 0.07, "restart");
            // ctx.fillRect(this.rectX, this.rectY, this.rectWidth, this.rectHeight);
            this.btnDelay = 0; // Reset the delay
        }
    }
}


function spawnInitialAsteroids() {
    console.log('spawnInitialAsteroids');
    for (let i = 0; i < CONFIG.INITIAL_ASTEROID_COUNT; i++) {
        if (entities.length < CONFIG.MAX_ENTITIES) {
            const asteroid = new Asteroid();
            asteroids.push(asteroid);
            entities.push(asteroid);
        }
    }
    console.log('asteroids spawned:', asteroids.length);
}

function createParticles() {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

// Collision Detection Helper Functions

/**
 * Check if two circles collide
 * @param {number} x1 - First circle x position
 * @param {number} y1 - First circle y position
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle x position
 * @param {number} y2 - Second circle y position
 * @param {number} r2 - Second circle radius
 * @returns {boolean} - True if collision detected
 */
function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    return distance < r1 + r2;
}

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
    state.score++;
    message.innerText = state.score;
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
    const asteroidIndex = asteroids.indexOf(asteroid);
    if (asteroidIndex !== -1) {
        asteroids.splice(asteroidIndex, 1);
    }
    const entityIndex = entities.indexOf(asteroid);
    if (entityIndex !== -1) {
        entities.splice(entityIndex, 1);
    }

    // Add new asteroids with velocity
    for (const newAsteroid of newAsteroids) {
        newAsteroid.velocityX = baseVelocityX + (Math.random() - 0.5) * velocityRandomness;
        newAsteroid.velocityY = baseVelocityY + (Math.random() - 0.5) * velocityRandomness;
        asteroids.push(newAsteroid);
        entities.push(newAsteroid);
    }
}

/**
 * Remove a projectile from game arrays
 * @param {Object} projectile - Projectile to remove
 */
function removeProjectile(projectile) {
    const projectileIndex = projectiles.indexOf(projectile);
    if (projectileIndex !== -1) {
        projectiles.splice(projectileIndex, 1);
    }
    const entityIndex = entities.indexOf(projectile);
    if (entityIndex !== -1) {
        entities.splice(entityIndex, 1);
    }
}

/**
 * Handle game over state
 */
function triggerGameOver() {
    state.game_over = true;

    // Stop the timer when game over
    if (state.timer.interval) {
        clearInterval(state.timer.interval);
        message.innerText = `${state.score} | GAME OVER`;
    }

    clearEntities();
    console.log("Game over!");
    ui.dialogueText = "Game Over!";
}

/**
 * Check collisions between projectiles and asteroids
 */
function checkProjectileAsteroidCollisions() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];

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
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        for (let k = 0; k < beams.length; k++) {
            const beam = beams[k];

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
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];

        if (checkCircleCollision(
            ship.x, ship.y, ship.radius,
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
    for (let i = 0; i < asteroids.length - 1; i++) {
        for (let j = i + 1; j < asteroids.length; j++) {
            const asteroid1 = asteroids[i];
            const asteroid2 = asteroids[j];

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
function handleCollisions() {
    if (state.game_paused) {
        return;
    }

    checkProjectileAsteroidCollisions();
    checkBeamAsteroidCollisions();
    checkShipAsteroidCollisions();
    checkAsteroidAsteroidCollisions();
}




function drawWorldBorder() {
    ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-cameraOffset.x, -cameraOffset.y, world.width, world.height);
}


//////
function drawMiniMap() {

    const minimapSize = {
        width: MINIMAP_SCALE,
        height: world.height / world.width * MINIMAP_SCALE
    };

    // message.innerText = `| map ${MINIMAP_MARGIN}`;

    // Save the current context state
    ctx.save();

    // Set up the mini-map area
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0, 0, 3, 0.5)';
    ctx.fillRect(MINIMAP_MARGIN, MINIMAP_MARGIN, minimapSize.width, minimapSize.height);

    // Draw mini world border
    ctx.strokeStyle = 'hsl(221, 12.20%, 45.10%)';
    ctx.strokeRect(MINIMAP_MARGIN, MINIMAP_MARGIN, minimapSize.width, minimapSize.height);
    ctx.fill();

    // Calculate the scale factor for objects within the mini-map
    const scaleFactor = minimapSize.width / world.width;

    // Draw mini asteroids
    asteroids.forEach(asteroid => {
        ctx.fillStyle = `hsl(0, 100%, 59%)`;
        ctx.fillRect(MINIMAP_MARGIN + asteroid.x * scaleFactor, MINIMAP_MARGIN + asteroid.y * scaleFactor, 2, 2);
        // ctx.beginPath();
        // ctx.arc(
        //     MINIMAP_MARGIN + asteroid.x * scaleFactor,
        //     MINIMAP_MARGIN + asteroid.y * scaleFactor,
        //     2,
        //     0,
        //     Math.PI * 2
        // );
        ctx.fill();
    });

    // Draw mini ship
    ctx.fillStyle = 'yellow';
    ctx.fillRect(MINIMAP_MARGIN + ship.x * scaleFactor, MINIMAP_MARGIN + ship.y * scaleFactor, 2, 2);
    // ctx.beginPath();
    // ctx.arc(
    //     MINIMAP_MARGIN + ship.x * scaleFactor,
    //     MINIMAP_MARGIN + ship.y * scaleFactor,
    //     3,
    //     0,
    //     Math.PI * 2
    // );
    ctx.fill();

    // Draw mini view area
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'hsla(170, 60%, 30%, 0.4)';
    ctx.strokeRect(
        MINIMAP_MARGIN + (ship.x - camera.width / 2) * scaleFactor,
        MINIMAP_MARGIN + (ship.y - camera.height / 2) * scaleFactor,
        camera.width * scaleFactor,
        camera.height * scaleFactor
    );

    // Restore the context state
    ctx.restore();
}
///////

const actionBtnSize = {
    // button dimensions
    width: ((camera.width < 800) ? camera.width * 0.2 : camera.width * 0.1),
    height: camera.height * 0.1,
    // Calculate rectangle position in bottom left corner
    posX: 10,
    posY: camera.height - (camera.height * 0.1 + 10),
}

const pauseBtnSize = {
    // button dimensions - same size as action button
    width: ((camera.width < 800) ? camera.width * 0.2 : camera.width * 0.1),
    height: camera.height * 0.1,
    // Position 10px above the action button
    posX: 10,
    posY: camera.height - (camera.height * 0.1 + 10) - (camera.height * 0.1 + 10),
}

const pauseBtnIcon = {
    // icon dimensions
    width: CENTER_CIRCLE_RADIUS * 0.5,
    height: CENTER_CIRCLE_RADIUS,
    // icon position
    posX: pauseBtnSize.posX + 10,
    posY: pauseBtnSize.posY + 10,
}

function drawPauseIcon() {
    drawRectangle(pauseBtnIcon);
    drawRectangle(pauseBtnIcon, { x: CENTER_CIRCLE_RADIUS * 0.76, y: 0 });
}

const resetBtnSize = {
    // button dimensions
    width: camera.width * 0.25, // rectWidth * 0.5 (half of camera.width * 0.5)
    height: camera.height * 0.09, // rectHeight * 0.3 (30% of camera.height * 0.3)
    // Position to match the dialogue's drawing position
    posX: camera.width / 2 - (camera.width * 0.25) / 2, // Center horizontally
    posY: camera.height / 2 + camera.height * 0.07 - camera.height * 0.045, // Center vertically with text offset
};

function drawRectangle(buttonSize, offset = { x: 0, y: 0 }, colour) {

    let fill = colour || 'hsla(320, 100%, 83%, 0.50)';
    // Stroke style
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'pink';
    ctx.lineWidth = 2;
    // Draw the rectangle fill
    ctx.fillRect(buttonSize.posX + offset.x, buttonSize.posY + offset.y, buttonSize.width, buttonSize.height);
    // Draw the rectangle stroke
    ctx.strokeRect(buttonSize.posX + offset.x, buttonSize.posY + offset.y, buttonSize.width, buttonSize.height);
}

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, camera.width, camera.height);

    // ===== UPDATE PHASE (skip if paused) =====
    if (!state.game_paused) {
        // Update contrails to remove expired points
        ship.contrail.update();
        mouseContrail.update();

        // Update particles
        particles.forEach(particle => {
            particle.update(deltaTime);
        });

        // Update ship
        if (input.isShooting) {
            ship.shoot();
        }
        ship.update(deltaTime);

        // Update asteroids
        asteroids.forEach(asteroid => {
            asteroid.update(deltaTime);
        });

        // Update projectiles
        projectiles.forEach((projectile, index) => {
            projectile.update(deltaTime);

            if (projectile.lifespan <= 0) {
                projectiles.splice(index, 1);
                entities.splice(entities.indexOf(projectile), 1);
            }
        });

        // Update beams
        beams.forEach((beam, index) => {
            beam.update(deltaTime);

            if (beam.lifespan <= 0) {
                beams.splice(index, 1);
                entities.splice(entities.indexOf(beam), 1);
            }
        });

        // Handle collisions
        handleCollisions();

        // Update dialogue
        dialogue.update(deltaTime);

        // Handle braking logic (if dragging from center)
        if (input.isDraggingFromCenter && input.isMouseDown) {
            const currentTime = performance.now();
            if (input.centerHoldStartTime > 0 &&
                currentTime - input.centerHoldStartTime >= 600 &&
                !input.isBraking) {
                input.isBraking = true;
                input.brakeStartTime = currentTime;
                console.log('Brake initiated');
            }
        }
    }

    // ===== DRAW PHASE (always runs) =====
    drawWorldBorder();

    // Draw particles
    particles.forEach(particle => {
        particle.draw();
    });

    // Draw planet
    if (planet) {
        planet.draw();
    }

    // Draw ship
    ship.draw();

    // Draw asteroids
    asteroids.forEach(asteroid => {
        asteroid.draw();
    });

    // Draw projectiles
    projectiles.forEach(projectile => {
        projectile.draw();
    });

    // Draw beams
    beams.forEach(beam => {
        beam.draw();
    });

    // Draw the UI elements last, so they appear on top
    drawMiniMap();
    drawRectangle(actionBtnSize, { x: 0, y: 0 }, 'hsla(64, 100%, 82%, 0.5)');
    drawRectangle(pauseBtnSize);
    drawPauseIcon(pauseBtnIcon);

    drawCenterCircle(CENTER_CIRCLE_RADIUS);
    drawCenterCircle(CENTER_LOWTHRUST_RADIUS);
    drawCenterCircle(CENTER_MAXTHRUST_RADIUS);

    // Draw visual feedback line if dragging from center
    if (input.isDraggingFromCenter && input.isMouseDown) {
        const currentTime = performance.now();

        drawDragFromCenterLine();

        // Visual feedback for braking
        if (input.isBraking) {
            const brakeProgress = Math.min(1, (currentTime - input.brakeStartTime) / 1000);
            drawBrakingEffect(brakeProgress);
        }
    }

    // Draw dialogue
    dialogue.draw();

    // Draw cursor
    const isOverAsteroid = isPointOverAsteroid(ui.mouseX, ui.mouseY);

    if (isOverAsteroid) {
        const squareSize = 22;
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            ui.mouseX - squareSize / 2,
            ui.mouseY - squareSize / 2,
            squareSize,
            squareSize
        );
    }

    drawCursorDot(isOverAsteroid);

    requestAnimationFrame(gameLoop);

    function drawDragFromCenterLine() {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(camera.width / 2, camera.height / 2); // Start from center of camera
        ctx.lineTo(ui.mouseX, ui.mouseY); // End at current mouse position
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    function drawBrakingEffect(brakeProgress) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(camera.width / 2, camera.height / 2, CENTER_CIRCLE_RADIUS * brakeProgress, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 200, 200, ${0.3 + (brakeProgress * 0.3)})`;
        ctx.fill();
        ctx.restore();
    }
}

// Mouse contrail tracking
const mouseContrail = {
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

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        // Start from the oldest point
        ctx.moveTo(this.points[0].x, this.points[0].y);

        // Draw lines to each subsequent point
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
            // Gradually increase opacity for newer points
            ctx.strokeStyle = `rgba(255, 255, 255, ${i / this.points.length * 0.5})`;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.points[i].x, this.points[i].y);
        }
    }
};

function handlePointerDown(event) {
    // type of click: mouseDown
    input.isMouseDown = true;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ui.mouseX = (event.clientX - rect.left) * scaleX;
    ui.mouseY = (event.clientY - rect.top) * scaleY;

    const centerCircleX = camera.width / 2;
    const centerCircleY = camera.height / 2;
    const distToCenter = Math.hypot(ui.mouseX - centerCircleX, ui.mouseY - centerCircleY);
    const isInCenterCircle = (distToCenter <= CENTER_CIRCLE_RADIUS);

    // location of click: center circle
    if (isInCenterCircle) {
        input.isDraggingFromCenter = true;
        input.centerHoldStartTime = performance.now(); // Record the time when center hold started
    } else {
        input.isDraggingFromCenter = false; // Click is outside the center circle
        input.centerHoldStartTime = 0; // Reset center hold time


    }

    // Add point to contrail
    mouseContrail.addPoint(ui.mouseX, ui.mouseY);

    console.log('pointer down');

    if (state.game_over && isUIButtonClicked(resetBtnSize)) { // if GameOver & reset btn clicked
        // reset game
        console.log('RESET Game');
        console.log('GOOD isUIButtonClicked...', isUIButtonClicked(resetBtnSize));
        state.game_over = false;
        ui.dialogueText = ''; // Clear the dialogue text
        initGame(); // This does not reset all of the game, such as Asteroids and Dust
        // Clear all entities and respawn asteroids
        asteroids = [];
        projectiles = [];
        beams = [];
        entities = [];
        spawnInitialAsteroids();
    }

    if (!state.game_over && isUIButtonClicked(actionBtnSize)) {
        // do stuff like shoot or change weapons
        switch (player.currentWeapon) {
            case 'laser':
                player.currentWeapon = 'machineGun';
                // weaponButton.textContent = '🔫';
                break;
            case 'machineGun':
                player.currentWeapon = 'missile';
                // weaponButton.textContent = '🚀';
                break;
            case 'missile':
                player.currentWeapon = 'beam';
                // weaponButton.textContent = '⚡';
                break;
            case 'beam':
                player.currentWeapon = 'laser';
                // weaponButton.textContent = '🔦';
                break;
        }
        // ship.shoot();
    }

    // Handle pause button click
    if (!state.game_over && isUIButtonClicked(pauseBtnSize)) {
        state.game_paused = !state.game_paused;
        console.log('Game paused:', state.game_paused);
    }

    const asteroidClicked = asteroids.some(asteroid => {
        const screenX = asteroid.x - cameraOffset.x;
        const screenY = asteroid.y - cameraOffset.y;
        const distance = Math.hypot(ui.mouseX - screenX, ui.mouseY - screenY);
        return distance <= asteroid.radius;
    });

    // Start shooting if pointer is outside center circle
    if (!state.game_over && !isInCenterCircle && !isUIButtonClicked(actionBtnSize)) {
        // Rotate ship to face mouse position before shooting
        input.isShooting = true;
        ship.setRotation(ui.mouseX, ui.mouseY);
    }

}

function handlePointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ui.mouseX = (event.clientX - rect.left) * scaleX;
    ui.mouseY = (event.clientY - rect.top) * scaleY;

    // Check if pointer is still within canvas bounds
    const isWithinCanvas = ui.mouseX >= 0 && ui.mouseX <= canvas.width && ui.mouseY >= 0 && ui.mouseY <= canvas.height;

    // If shooting is active and mouse is still down and within canvas
    if (input.isShooting && input.isMouseDown && isWithinCanvas && !state.game_over) {
        const centerCircleX = camera.width / 2;
        const centerCircleY = camera.height / 2;
        const distToCenter = Math.hypot(ui.mouseX - centerCircleX, ui.mouseY - centerCircleY);
        const isOutsideCenterCircle = (distToCenter > CENTER_CIRCLE_RADIUS);

        // Continue shooting if outside center circle
        if (isOutsideCenterCircle) {
            ship.setRotation(ui.mouseX, ui.mouseY);  // Rotate ship to face mouse position before shooting
            // ship.shoot();
        } else {
            // If moved back into center circle, stop shooting
            input.isShooting = false;
        }
    }

    // Add point to contrail
    mouseContrail.addPoint(ui.mouseX, ui.mouseY);

    // REMOVED: This block is removed to disable drag-anywhere-to-move
    // if (isMouseDown && !GAME_OVER && !isShootingAsteroid && !isUIButtonClicked(actionBtnSize)) {
    //     if (!isDraggingFromCenter) {
    //         ship.setTarget(mouseX, mouseY); // screen coords
    //     }
    //     // If isDraggingFromCenter is true, target is set on pointerUp. Visual feedback is drawn in gameLoop.
    // }
}

function handlePointerUp() {
    if (input.isDraggingFromCenter) {
        // Only set new target if we're not in braking mode
        if (!input.isBraking) {
            ship.setTarget(ui.mouseX, ui.mouseY); // Use current mouseX, mouseY (screen coords) as target
        }
        input.isDraggingFromCenter = false; // Reset the flag
    }

    // Stop shooting when pointer is released
    input.isShooting = false;

    input.isMouseDown = false;
    input.centerHoldStartTime = 0; // Reset center hold time when pointer is released
    console.log('pointer up');
}

function drawCursorDot(isOverAsteroid) {
    // Draw contrail first
    mouseContrail.draw();

    // Then draw the cursor dot
    ctx.beginPath();
    ctx.rect(ui.mouseX - 3, ui.mouseY - 3, 6, 6);
    ctx.fillStyle = isOverAsteroid ? 'yellow' : 'white';
    ctx.fill();
    ctx.closePath();
}

function clearEntities() {
    // console.log('the entities', entities);
    // TODO: this won't clear the entities yet
    let names = [];
    for (let i = 0; i < entities.length; i++) {
        names.push(entities[i].name);
    }
    console.log('clearEntities names:', names);
}

function initGame() {
    state.score = 0;
    startTimer(5);
    message.innerText = state.score;
    dialogue = new Dialogue();
    entities.push(dialogue);
    ship = new Ship();
    entities.push(ship);
    planet = new Planet(world.width * 0.5, world.width * 0.5);
    entities.push(planet);
    createParticles();
    spawnInitialAsteroids();
    requestAnimationFrame(gameLoop);
}

initGame();

function isPointOverAsteroid(x, y) {
    // Convert screen coordinates to world coordinates by adding camera offset
    const worldX = x + cameraOffset.x;
    const worldY = y + cameraOffset.y;

    return asteroids.some(asteroid => {
        const dx = worldX - asteroid.x;
        const dy = worldY - asteroid.y;
        return Math.sqrt(dx * dx + dy * dy) <= asteroid.radius;
    });
}

function calculateNewPosition(x, y, angle, speed, maxSpeed, deltaTime) {
    // Convert angle to radians
    // const angleRadians = angle * (Math.PI / 180);
    const angleRadians = angle;

    // Calculate velocity components
    const velocityX = logarithmicIncrease(speed, 0.1, maxSpeed) * Math.cos(angleRadians);
    const velocityY = logarithmicIncrease(speed, 0.1, maxSpeed) * Math.sin(angleRadians);

    // Update position
    const newX = x + velocityX * deltaTime;
    const newY = y + velocityY * deltaTime;

    return { x: newX, y: newY };
}


function logarithmicIncrease(currentValue, step, max) {
    // Prevent division by zero
    if (currentValue <= 0) {
        return currentValue;
    }

    // Calculate the new value based on the logarithmic function
    const newValue = Math.min(max, currentValue * Math.pow(1.1, step));
    return newValue;
}

function countObjectProperties(obj) {
    let count = 0;

    // Iterate over object properties using for...in loop
    for (let property in obj) {
        // Check if the property is not a prototype property
        if (obj.hasOwnProperty(property)) {
            count++;
        }
    }

    return count;
}

function checkBoundsRect(point, rect) {
    // point expect point.x, point.y
    // rect expect rect.x, rect.y, rect.h, rect.w
    // what is anchor of rect x, y ?? lets assume top-left?
    // validate
    if (countObjectProperties(point) !== 2 || countObjectProperties(rect) !== 4) {
        return false;
    }
    const checkX = (point.x > rect.x && point.x < (rect.x + rect.w));
    const checkY = (point.y > rect.y && point.y < (rect.y + rect.h));
    // console.log(`checkX ${checkX}, checkY ${checkY}`);

    return (checkX && checkY); // both must be true to return true
}


function isUIButtonClicked(buttonSize) {
    // mouseX and mouseY are in gameCameraCoords
    // buttonSize Width and Height also needs button position to be in gameCameraCoords
    let point = { x: ui.mouseX, y: ui.mouseY };
    let rect = { x: buttonSize.posX, y: buttonSize.posY, w: buttonSize.width, h: buttonSize.height };
    let isInBounds = checkBoundsRect(point, rect);

    // console.log(`x${mouseX} y${mouseY} px${buttonSize.posX} py${buttonSize.posY} bw${buttonSize.width} bh${buttonSize.height}`);
    return (isInBounds);
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handlePointerDown(e.touches[0]);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handlePointerMove(e.touches[0]);
});
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handlePointerUp();
});


window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    camera.width = canvas.width = window.innerWidth - 8;
    camera.height = canvas.height = window.innerHeight - 60;
    camera.bottom = camera.top + camera.height;
    camera.right = camera.left + camera.width;
    camera.centerX = camera.width * 0.5 + camera.top;
    camera.centerY = camera.height * 0.5 + camera.left;
    world.width = 4000; // 4 * camera.width;
    world.height = 3000; // 4 * camera.height;

    MINIMAP_SCALE = camera.width / 5; // 8% of the canvas size
    MINIMAP_MARGIN = 10; // Margin from the top-left corner
}

//TODO: shooting fixes
//        -too much shooting and asteroids likely hits entity limit preventing more bullets/shooting
//        -count / console log number of entities
//        -tapping in inner circle should not instantly stop ship (perhaps only slow 10%?)
//        -sort out multi-touch shoot & move at same time
//        -sort out pointerDown & pointerMove & pointerUpdistinctions and overlap
//        -continue shooting if pointerDown but no dragging

//        -fix shots start position(s)

//
//TODO:    -fix game re-init of asteroids
//         -fix re-init of dust
//         -fix re-init of UI elements

//TODO:    -Animation: ship explosion, asteroid explosion
//         -Physics: asteroid collision & bounce
//         -Animation: and effects

//TODO: -entities that reach edge of world should instead wrap around to other side of world
//TODO: .-camera should not be bound to world, and should also be able to wrap around as ship approaches/crosses world boundary
//TODO: .-basic dialogue/modal (text, delay)
// 
//TODO: shoot key for desktops
//        -shoot button for gamepads
//        -controls for gamepads
//TODO: -UI buttons [shoot/interact, change weapon, boost?]
//        should UI buttons be circles (for finger touch)?
//        -add change weapon button in canvas
//
//TODO: FX ship at max speed effect
//TODO: FX dust should streak at speed
//TODO: ship should take N ms to accelerate to speed
//TODO: FX effects when asteroids hit
//TODO: varied asteroid speeds
//TODO: x-use SVG
//        .-use SVG for sprites e.g. ship/shots/effects/asteroid texture
//TODO: mouse position fixes
//        .-ship/mouse alignment. center of ship appears about 15px left or mouse.
//        -draw mouse cursor crosshair in canvas instead of CSS?

// broken asteroids
// working on entities array so we can clear them


function initDebugArea() {
    const debugLimit = 50;
    let debugCount = 0;
    let bodyEl = document.querySelector('body');
    const debugEl = document.createElement('pre');
    debugEl.id = 'debug';
    bodyEl.appendChild(debugEl);
    return debugEl;
}

function debug(text) {
    const codeElement = document.createElement('code');
    codeElement.textContent = text;
    debugEl.appendChild(codeElement);
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
    ctx.rotate((90 * Math.PI) / 180);
    ctx.scale(0.25 * scale, 0.25 * scale);
    ctx.translate(-154, -206);
    ctx.drawImage(img, 1, 1, 300, 300);
    ctx.translate(154, 206);
    ctx.scale(4, 4);
    ctx.rotate((-90 * Math.PI) / 180);
    // perhaps timing issue. load svg once. When ready use it?
}

// Function to draw a white circle at the center of the camera
function drawCenterCircle(radius) {
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    // ctx.fillStyle = 'white';
    // ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
}

function startTimer(durationMins) {
    state.timer.startTime = Date.now(); // in milliseconds
    state.timer.duration = durationMins * 60 * 1000; // x minutes in ms
    state.timer.timerExpired = false;

    // Start a timer that updates every second to show score and remaining time
    if (state.timer.interval) {
        clearInterval(state.timer.interval);
    }

    state.timer.interval = setInterval(() => {
        if (!isTimerExpired()) {
            // Update the message with score and timer
            const timeFormatted = checkTimer();
            message.innerText = `${state.score} | Timer: ${timeFormatted}`;
        }
    }, 1000); // Update every second
}

function checkTimer() {
    const elapsed = Date.now() - state.timer.startTime;
    const remaining = Math.max(0, state.timer.duration - elapsed);

    // Format remaining time
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    //   console.log(`Remaining: ${formatted}`);

    return formatted;
}

function isTimerExpired() {
    // Always consider timer expired if game is over
    if (state.game_over) {
        return true;
    }

    // Calculate elapsed time
    const elapsed = Date.now() - state.timer.startTime;

    // Check if timer has expired
    if (!state.timer.timerExpired && elapsed >= state.timer.duration) {
        state.timer.timerExpired = true;
        // Clear our interval when the timer expires
        if (state.timer.interval) {
            clearInterval(state.timer.interval);
        }
        console.log("Timer expired! Perform your action here.");
        // Final update of the message when timer expires
        message.innerText = `GAME OVER | Final Score: ${state.score}`;
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
    const projectiles = [];

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

        projectiles.push(newProjectile);
    }

    return projectiles;
}



/**
 * Calculates the resulting direction and speed from adding two velocities.
 *
 * @param {number} speed1 The magnitude of the first velocity vector.
 * @param {number} direction1 The direction of the first velocity vector in degrees.
 * @param {number} speed2 The magnitude of the second velocity vector.
 * @param {number} direction2 The direction of the second velocity vector in degrees.
 * @param {number} [multiplier=1] Multiplier that controls how much influence the first vector has (higher values give more weight to the first vector)
 * @returns {{speed: number, direction: number}} An object containing the resulting speed and direction in degrees.
 */
function addVelocities(speed1, direction1, speed2, direction2, multiplier = 1) {
    // Convert directions from degrees to radians for trigonometric functions
    const direction1Rad = direction1 * Math.PI / 180;
    const direction2Rad = direction2 * Math.PI / 180;

    // Calculate the x and y components of the first velocity (with multiplier)
    const x1 = speed1 * Math.cos(direction1Rad) * multiplier;
    const y1 = speed1 * Math.sin(direction1Rad) * multiplier;

    // Calculate the x and y components of the second velocity
    const x2 = speed2 * Math.cos(direction2Rad);
    const y2 = speed2 * Math.sin(direction2Rad);

    // Add the corresponding x and y components to find the resultant components
    const resultantX = x1 + x2;
    const resultantY = y1 + y2;

    // Calculate the resultant speed (magnitude) using the Pythagorean theorem
    const resultantSpeed = Math.sqrt(resultantX * resultantX + resultantY * resultantY);

    // Calculate the resultant direction (angle) using arctangent.
    // Math.atan2 handles the full range of angles and avoids division by zero.
    let resultantDirectionRad = Math.atan2(resultantY, resultantX);

    // Convert the resultant direction back to degrees
    let resultantDirection = resultantDirectionRad * 180 / Math.PI;

    // Ensure the direction is between 0 and 360 degrees
    if (resultantDirection < 0) {
        resultantDirection += 360;
    }

    return { speed: resultantSpeed, direction: resultantDirection };
}

const shipSVG = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1110" height="1110" viewBox="817.5,362.5,110,110"><g id="document" fill="#ffffff" fill-rule="nonzero" stroke="#000000" stroke-width="0" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" ><rect x="5202.27273" y="1647.72727" transform="scale(0.15714,0.22)" width="700" height="500" id="Shape 1 1" vector-effect="non-scaling-stroke"/></g><g fill="white" fill-rule="nonzero" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"><g id="stage"><g id="layer1 1"><path d="M821.60345,466.98276l41.81819,-87.88263l7.42319,-15.60013l52.65517,102.79311l-51.44828,-27.18965z" id="Path 3"/><path d="M868.01726,412.38048l6.75056,-0.02159l5.04149,20.55973l-16.36421,0.3818z" id="Path 3"/><path d="M870.87479,369.24255l0.64607,43.36469" id="Path 3"/><path d="M871.85375,460.37879l5.79776,-5.75343l-12.15152,-0.03429z" id="Path 3"/><path d="M874.15248,426.12645" id="Path 3"/><path d="M849.41412,447.8546l21.46448,-78.27112l24.75585,78.18049" id="Path 3"/><path d="M822.40716,465.29373l49.43258,-31.91997l51.00257,31.63544" id="Path 1 1"/><path d="M863.26579,444.29662l2.23421,7.02571h12l2.14622,-8.20529" id="Path 3"/><path d="M864.93246,450.72458l-5.90909,3.33333l-2.87879,-2.12121l1.61797,-4.9366" id="Path 3"/><path d="M878.65151,450.52932l5.90909,3.33333l2.87879,-2.12121l-1.61797,-4.9366" id="Path 2 1"/><path d="M871.75064,438.9064l-0.30303,12.41593" id="Path 3"/><path d="M872.81125,411.78519" id="Path 3"/></g></g></g></svg>
`;
