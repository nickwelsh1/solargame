const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const weaponButton = document.getElementById('weaponButton');
const message = document.querySelector('.message');
const debugEl = initDebugArea();

let ship, asteroids = [], projectiles = [], particles = [], dialogue;
let world = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 }
let camera = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 };

resizeCanvas();
const cameraOffset = { x: 0, y: 0 };
let currentWeapon = 'laser';
let entities = [];
const MOBILE_SCALE = 0.5;
const MAX_ENTITIES = 200;
const PARTICLE_COUNT = 200;
const MIN_ASTEROID_SIZE = 10;
const INITIAL_ASTEROID_COUNT = 20;
let GAME_OVER = false;
let isDraggingFromCenter = false; // For new drag-from-center movement
const CENTER_CIRCLE_RADIUS = 50 * MOBILE_SCALE;  // Radius of the central UI circle for interaction
// debug(`cw, ch: ${camera.width}, ${camera.height}`);
const CENTER_MAXTHRUST_RADIUS = 0.5 * Math.min(camera.width, camera.height) - 8;  // Radius of the central UI circle for interaction
const CENTER_LOWTHRUST_RADIUS = 0.5 * CENTER_MAXTHRUST_RADIUS + (0.5 *CENTER_CIRCLE_RADIUS);  // Radius of the central UI circle for interaction
let isMouseDown = false;
let isShootingAsteroid = false;
let isShooting = false; // New flag to track if shooting is active
let centerHoldStartTime = 0; // Time when pointer down started in center circle
let isBraking = false; // Whether ship is currently in braking mode
let brakeStartTime = 0; // Time when braking started
let mouseX = 0;
let mouseY = 0;
let dialogueText = '';
let rectangleDrawTimer = null; // legacy?
let score = 0;
let timer = {};

const LASER_FIRE_RATE = 1000;  // 1000ms between shots
const BULLET_FIRE_RATE = 200;  // 200ms between shots
const MISSILE_FIRE_RATE = 500; // 500ms between shots
let lastLaserFireTime = 0;
let lastBulletFireTime = 0;
let lastMissileFireTime = 0;

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

function resizeCanvas() {
    camera.width = canvas.width = window.innerWidth - 8;
    camera.height = canvas.height = window.innerHeight - 60;
    camera.bottom = camera.top + camera.height;
    camera.right = camera.left + camera.width;
    camera.centerX = camera.width * 0.5 + camera.top;
    camera.centerY = camera.height * 0.5 + camera.left;
    world.width = 4000; // 4 * camera.width;
    world.height = 3000; // 4 * camera.height;
}

window.addEventListener('resize', resizeCanvas);


const MINIMAP_SCALE = camera.width / 5; // 8% of the canvas size
const MINIMAP_MARGIN = 10; // Margin from the top-left corner

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
        this.maxSpeed = 500;
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
            pointLifespan: 600, // 100ms lifespan for each point

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
                ctx.strokeStyle = 'rgba(100, 149, 237, 0.3)'; // Cornflower blue with low opacity
                ctx.lineWidth = 3;

                // Start from the oldest point
                const firstPoint = this.points[0];
                ctx.moveTo(firstPoint.x - cameraOffset.x, firstPoint.y - cameraOffset.y);

                // Draw lines to each subsequent point
                for (let i = 1; i < this.points.length; i++) {
                    const point = this.points[i];
                    ctx.lineTo(point.x - cameraOffset.x, point.y - cameraOffset.y);
                    // Gradually increase opacity for newer points
                    ctx.strokeStyle = `rgba(100, 149, 237, ${i / this.points.length * 0.5})`;
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
            baseSpeed = 100;
            this.maxSpeed = 100;
        } else if (distance > CENTER_CIRCLE_RADIUS) {
            baseSpeed = 60;
            this.maxSpeed = 60;
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
        if (isBraking) {
            const currentTime = performance.now();
            const brakeProgress = Math.min(1, (currentTime - brakeStartTime) / 1000);
            
            if (brakeProgress >= 1) {
                // Braking completed
                this.speed = 0;
                this.targetSpeed = 0;
                isBraking = false;
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
        drawSVGImg(shipImg, MOBILE_SCALE);
        ctx.restore();
    }

    shoot() {
        if (entities.length >= MAX_ENTITIES) return;

        const currentTime = performance.now();
        let canFire = false;

        switch (currentWeapon) {
            case 'laser':
                if (currentTime - lastLaserFireTime >= LASER_FIRE_RATE) {
                    canFire = true;
                    lastLaserFireTime = currentTime;
                }
                break;
            case 'machineGun':
                if (currentTime - lastBulletFireTime >= BULLET_FIRE_RATE) {
                    canFire = true;
                    lastBulletFireTime = currentTime;
                }
                break;
            case 'missile':
                if (currentTime - lastMissileFireTime >= MISSILE_FIRE_RATE) {
                    canFire = true;
                    lastMissileFireTime = currentTime;
                }
                break;
        }

        if (!canFire) return;

        let projectile;
        switch (currentWeapon) {
            case 'laser':
                projectile = new Laser(this.x, this.y, this.angle);
                break;
            case 'machineGun':
                projectile = new Bullet(this.x, this.y, this.angle);
                break;
            case 'missile':
                projectile = new Missile(this.x, this.y, this.angle);
                break;
        }
        projectiles.push(projectile);
        entities.push(projectiles);
    }
}


class Asteroid {
    constructor(x, y, radius) {

        this.name = 'asteroid';
        this.x = x || randomMinMax(10, world.width - 100);
        this.y = y || randomMinMax(10, world.height - 100);
        this.radius = radius || randomMinMax(30, 45);
        this.velocityX = (randomMinMax(20, 40)) * 2;
        this.velocityY = (randomMinMax(20, 40)) * 2;
        // color in HSL (degrees, percentage, percentage)
        this.hue = randomMinMax(10, 30); // + 340
        this.saturation = randomMinMax(50, 100);
        this.lightness = randomMinMax(30, 40); // Increased minimum to 45 and range to give 45-80
        this.mass = Math.PI * this.radius * this.radius;
        
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
        // this.x += this.velocityX * deltaTime / 1000;
        // this.y += this.velocityY * deltaTime / 1000;

        // update asteroid position relative to world?
        this.x -= (this.velocityX * deltaTime / 1000); //  - ship.velocityX
        this.y -= (this.velocityY * deltaTime / 1000); //  - ship.velocityY

        // Update rotation angle based on rotation speed and deltaTime
        this.rotationAngle += this.rotationSpeed * deltaTime / 1000;
        
        // Keep rotation angle between 0 and 2*PI
        if (this.rotationAngle > Math.PI * 2) {
            this.rotationAngle -= Math.PI * 2;
        } else if (this.rotationAngle < 0) {
            this.rotationAngle += Math.PI * 2;
        }

        if (this.x < 0 || this.x > world.width) this.velocityX *= -1;
        if (this.y < 0 || this.y > world.height) this.velocityY *= -1;

        this.x = Math.max(0, Math.min(this.x, world.width));
        this.y = Math.max(0, Math.min(this.y, world.height));
    }

    split() {
        if (this.radius < MIN_ASTEROID_SIZE) return [];

        const newRadius = this.radius * 0.5;

        // Add new asteroids
        const newAsteroid1 = new Asteroid(this.x, this.y, newRadius);
        const newAsteroid2 = new Asteroid(this.x, this.y, newRadius);
        
        // Increase rotation speed of the new asteroids (1.5-2.5 times faster)
        const speedMultiplier1 = randomMinMax(2, 5);
        
        newAsteroid1.rotationSpeed = this.rotationSpeed * speedMultiplier1;
        newAsteroid2.rotationSpeed = this.rotationSpeed * speedMultiplier1;
        
        // Add new asteroids directly to the arrays
        asteroids.push(newAsteroid1, newAsteroid2);
        entities.push(newAsteroid1, newAsteroid2);

        return [newAsteroid1, newAsteroid2];
    }
}


class Projectile {
    constructor(x, y, angle, speed, radius, lifespan) {
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
        ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }
}


class Laser extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 1000, 2, 1000);
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
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}


class Bullet extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 1000, 3, 6000);
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
        // update asteroid position relative to world?
        this.x -= (this.speedX * deltaTime / 1000); //  - ship.velocityX
        this.y -= (this.speedY * deltaTime / 1000); //  - ship.velocityY

        // this.x -= this.speedX - ship.velocityX;
        // this.y -= this.speedY - ship.velocityY;

        if (this.x < 0) this.x = world.width;
        if (this.x > world.width) this.x = 0;
        if (this.y < 0) this.y = world.height;
        if (this.y > world.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
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
        this.textWidth = ctx.measureText(dialogueText).width;
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
        if (GAME_OVER === false && dialogueText.length < 1) {
            return;
        }
        ctx.font = `bold ${this.fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the rectangle
        // ctx.fillStyle = 'skyblue'; // Or any color you prefer
        // ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        this.drawRoundedRectangle(this.rectX, this.rectY, this.rectWidth, this.rectHeight);

        this.drawText(this.x, camera.height * 0.45, dialogueText);
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
        if (GAME_OVER === false && dialogueText.length < 1) {
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
    for (let i = 0; i < INITIAL_ASTEROID_COUNT; i++) {
        if (entities.length < MAX_ENTITIES) {
            const asteroid = new Asteroid();
            asteroids.push(asteroid);
            entities.push(asteroid);
        }
    }
    console.log('asteroids spawned:', asteroids.length);
}

function createParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

function handleCollisions() {
    if (GAME_OVER) {
        return;
    }
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];

        // Check collision with projectiles
        for (let j = 0; j < projectiles.length; j++) {
            const projectile = projectiles[j];
            const distance = Math.hypot(projectile.x - asteroid.x, projectile.y - asteroid.y);

            if (distance < asteroid.radius + projectile.radius) {
                score++;
                message.innerText = score;
                // Calculate new velocities based on conservation of momentum and energy
                const totalMass = asteroid.mass + projectile.mass;
                const newVelocityX = (asteroid.mass * asteroid.velocityX + projectile.mass * Math.cos(projectile.angle) * projectile.speed) / totalMass;
                const newVelocityY = (asteroid.mass * asteroid.velocityY + projectile.mass * Math.sin(projectile.angle) * projectile.speed) / totalMass;

                // Split the asteroid
                const newAsteroids = asteroid.split();
                asteroids.splice(i, 1);
                entities.splice(entities.indexOf(asteroid), 1);
                i--;

                // Add new asteroids to the game
                for (const newAsteroid of newAsteroids) {
                    newAsteroid.velocityX = newVelocityX + (Math.random() - 0.5) * 20;
                    newAsteroid.velocityY = newVelocityY + (Math.random() - 0.5) * 20;
                    asteroids.push(newAsteroid);
                    entities.push(newAsteroid);
                }

                // Remove the projectile
                projectiles.splice(j, 1);
                entities.splice(entities.indexOf(projectile), 1);
                j--;

                break;
            }
        }

        // Check collision with ship
        const shipDistance = Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y);
        if (shipDistance < asteroid.radius + ship.radius) {
            // Game over logic
            GAME_OVER = true;
            
            // Stop the timer when game over
            if (timer.interval) {
                clearInterval(timer.interval);
                message.innerText = `${score} | GAME OVER`;
            }
            
            clearEntities();
            console.log("Game over!");
            dialogueText = "Game Over!";
        }
    }
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
        ctx.fillStyle = `hsl(${asteroid.hue}, ${asteroid.saturation}%, ${asteroid.lightness}%)`;
        ctx.beginPath();
        ctx.arc(
            MINIMAP_MARGIN + asteroid.x * scaleFactor,
            MINIMAP_MARGIN + asteroid.y * scaleFactor,
            asteroid.radius * scaleFactor,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    // Draw mini ship
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
        MINIMAP_MARGIN + ship.x * scaleFactor,
        MINIMAP_MARGIN + ship.y * scaleFactor,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Draw mini view area
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
    buttonWidth: ((camera.width < 800) ? camera.width * 0.2 : camera.width * 0.1),
    buttonHeight: camera.height * 0.1,
    // Calculate rectangle position in bottom left corner
    buttonPosX: 10,
    buttonPosY: camera.height - (camera.height * 0.1 + 10),
    // getButtonY : () => {
    //   return height - (height * 0.1 + 10);
    // }
}

const resetBtnSize = {
    // button dimensions
    buttonWidth: camera.width * 0.25, // rectWidth * 0.5 (half of camera.width * 0.5)
    buttonHeight: camera.height * 0.09, // rectHeight * 0.3 (30% of camera.height * 0.3)
    // Position to match the dialogue's drawing position
    buttonPosX: camera.width / 2 - (camera.width * 0.25) / 2, // Center horizontally
    buttonPosY: camera.height / 2 + camera.height * 0.07 - camera.height * 0.045, // Center vertically with text offset
};

function drawButton(buttonSize) {
    // Stroke style
    ctx.strokeStyle = 'pink';
    ctx.lineWidth = 2;

    // Draw the rectangle stroke
    ctx.strokeRect(buttonSize.buttonPosX, buttonSize.buttonPosY, buttonSize.buttonWidth, buttonSize.buttonHeight);
}

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, camera.width, camera.height);

    drawWorldBorder();

    // Update contrails to remove expired points
    ship.contrail.update();
    mouseContrail.update();

    particles.forEach(particle => {
        particle.update(deltaTime);
        particle.draw();
    });

    ship.update(deltaTime);
    ship.draw();

    asteroids.forEach(asteroid => {
        asteroid.update(deltaTime);
        asteroid.draw();
    });

    projectiles.forEach((projectile, index) => {
        projectile.update(deltaTime);
        projectile.draw();

        if (projectile.lifespan <= 0) {
            projectiles.splice(index, 1);
            entities.splice(entities.indexOf(projectile), 1);
        }
    });

    handleCollisions();

    // Draw the UI elements last, so they appear on top
    drawMiniMap();
    drawButton(actionBtnSize); // comment
    drawCenterCircle(CENTER_CIRCLE_RADIUS); // Draw white circle at center of camera
    drawCenterCircle(CENTER_LOWTHRUST_RADIUS); // Draw white circle at center of camera
    drawCenterCircle(CENTER_MAXTHRUST_RADIUS); // Draw white circle at center of camera

    // Draw visual feedback line if dragging from center
    if (isDraggingFromCenter && isMouseDown) { // isMouseDown ensures drag is active
        // Check if pointer has been held in center for 1000ms (for braking)
        const currentTime = performance.now();
        if (centerHoldStartTime > 0 && 
            currentTime - centerHoldStartTime >= 600 && 
            !isBraking) {
            // Start braking if pointer has been held for 600ms and we're not already braking
            isBraking = true;
            brakeStartTime = currentTime;
            console.log('Brake initiated');
        }
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(camera.width / 2, camera.height / 2); // Start from center of camera
        ctx.lineTo(mouseX, mouseY); // End at current mouse position
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        
        // Visual feedback for braking
        if (isBraking) {
            const brakeProgress = Math.min(1, (currentTime - brakeStartTime) / 1000);
            ctx.save();
            ctx.beginPath();
            ctx.arc(camera.width / 2, camera.height / 2, CENTER_CIRCLE_RADIUS * brakeProgress, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 200, 200, ${0.3 + (brakeProgress * 0.3)})`;
            ctx.fill();
            ctx.restore();
        }

    }

    dialogue.update(deltaTime);
    dialogue.draw();

    if (isMouseDown && isShootingAsteroid) {
        ship.shoot();
    }

    // Draw cursor
    const isOverAsteroid = isPointOverAsteroid(mouseX, mouseY);
    
    if (isOverAsteroid) {
        // Draw targeting square
        const squareSize = 22;
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            mouseX - squareSize / 2,
            mouseY - squareSize / 2,
            squareSize,
            squareSize
        );
    }

    // Draw cursor dot
    drawCursorDot(isOverAsteroid);

    requestAnimationFrame(gameLoop);
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
    isMouseDown = true;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouseX = (event.clientX - rect.left) * scaleX;
    mouseY = (event.clientY - rect.top) * scaleY;

    const centerCircleX = camera.width / 2;
    const centerCircleY = camera.height / 2;
    const distToCenter = Math.hypot(mouseX - centerCircleX, mouseY - centerCircleY);

    if (distToCenter <= CENTER_CIRCLE_RADIUS) {
        isDraggingFromCenter = true;
        centerHoldStartTime = performance.now(); // Record the time when center hold started
    } else {
        isDraggingFromCenter = false; // Click is outside the center circle
        centerHoldStartTime = 0; // Reset center hold time
        
        // Start shooting if pointer is outside center circle
        if (!GAME_OVER) {
            isShooting = true;
            ship.shoot(); // Initial shot when pointer is first pressed down
        }
    }

    // Add point to contrail
    mouseContrail.addPoint(mouseX, mouseY);

    console.log('pointer down');

    if (GAME_OVER && isUIButtonClicked(resetBtnSize)) { // if GameOver & reset btn clicked
        // reset game
        console.log('RESET Game');
        console.log('GOOD isUIButtonClicked...', isUIButtonClicked(resetBtnSize));
        GAME_OVER = false;
        dialogueText = ''; // Clear the dialogue text
        initGame(); // This does not reset all of the game, such as Asteroids and Dust
        // Clear all entities and respawn asteroids
        asteroids = [];
        projectiles = [];
        entities = [];
        spawnInitialAsteroids();
    }

    if (!GAME_OVER && isUIButtonClicked(actionBtnSize)) {
        // do stuff like shoot or change weapons
        switch (currentWeapon) {
            case 'laser':
                currentWeapon = 'machineGun';
                // weaponButton.textContent = '🔫';
                break;
            case 'machineGun':
                currentWeapon = 'missile';
                // weaponButton.textContent = '🚀';
                break;
            case 'missile':
                currentWeapon = 'laser';
                // weaponButton.textContent = '🔦';
                break;
        }
        ship.shoot();

    };

    const asteroidClicked = asteroids.some(asteroid => {
        const screenX = asteroid.x - cameraOffset.x;
        const screenY = asteroid.y - cameraOffset.y;
        const distance = Math.hypot(mouseX - screenX, mouseY - screenY);
        return distance <= asteroid.radius;
    });

    if (!GAME_OVER) {
        // && asteroidClicked
        // isShootingAsteroid = true;
        ship.setRotation(mouseX, mouseY);  // Rotate ship to face mouse position before shooting
        ship.shoot();
    }

    if (!GAME_OVER && !asteroidClicked && !isUIButtonClicked(actionBtnSize)) {
        // REMOVED: This block is removed to disable click-anywhere-to-move
        // ship.setTarget(mouseX, mouseY); // screen coords
    }
}

function handlePointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (event.clientX - rect.left) * scaleX;
    mouseY = (event.clientY - rect.top) * scaleY;
    
    // Check if pointer is still within canvas bounds
    const isWithinCanvas = mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height;
    
    // If shooting is active and mouse is still down and within canvas
    if (isShooting && isMouseDown && isWithinCanvas && !GAME_OVER) {
        const centerCircleX = camera.width / 2;
        const centerCircleY = camera.height / 2;
        const distToCenter = Math.hypot(mouseX - centerCircleX, mouseY - centerCircleY);
        
        // Continue shooting if outside center circle
        if (distToCenter > CENTER_CIRCLE_RADIUS) {
            ship.setRotation(mouseX, mouseY);  // Rotate ship to face mouse position before shooting
            ship.shoot();
        } else {
            // If moved back into center circle, stop shooting
            isShooting = false;
        }
    }

    // Add point to contrail
    mouseContrail.addPoint(mouseX, mouseY);

    // REMOVED: This block is removed to disable drag-anywhere-to-move
    // if (isMouseDown && !GAME_OVER && !isShootingAsteroid && !isUIButtonClicked(actionBtnSize)) {
    //     if (!isDraggingFromCenter) {
    //         ship.setTarget(mouseX, mouseY); // screen coords
    //     }
    //     // If isDraggingFromCenter is true, target is set on pointerUp. Visual feedback is drawn in gameLoop.
    // }
}

function handlePointerUp() {
    if (isDraggingFromCenter) {
        // Only set new target if we're not in braking mode
        if (!isBraking) {
            ship.setTarget(mouseX, mouseY); // Use current mouseX, mouseY (screen coords) as target
        }
        isDraggingFromCenter = false; // Reset the flag
    }
    
    // Stop shooting when pointer is released
    isShooting = false;
    
    isMouseDown = false;
    centerHoldStartTime = 0; // Reset center hold time when pointer is released
    console.log('pointer up');
}

function drawCursorDot(isOverAsteroid) {
    // Draw contrail first
    mouseContrail.draw();

    // Then draw the cursor dot
    ctx.beginPath();
    ctx.rect(mouseX - 3, mouseY - 3, 6, 6);
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
    score = 0;
    startTimer(5);
    message.innerText = score;
    dialogue = new Dialogue();
    entities.push(dialogue);
    ship = new Ship();
    entities.push(ship);
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
    let point = { x: mouseX, y: mouseY };
    let rect = { x: buttonSize.buttonPosX, y: buttonSize.buttonPosY, w: buttonSize.buttonWidth, h: buttonSize.buttonHeight };
    let isInBounds = checkBoundsRect(point, rect);

    // console.log(`x${mouseX} y${mouseY} px${buttonSize.buttonPosX} py${buttonSize.buttonPosY} bw${buttonSize.buttonWidth} bh${buttonSize.buttonHeight}`);
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


//TODO: shooting fixes
//        -fix shots start position(s)

//
//TODO:    -fix game re-init of asteroids
//         -fix re-init of dust
//         -fix re-init of UI elements

//TODO:    -Animation: ship explosion
//         -Physics: asteroid collision & bounce
//         -Animation: and effects

//TODO: -entities that reach edge of world should instead wrap around to other side of world
//TODO: .-camera should be able to wrap around as ship approaches/crosses world boundary
//TODO: .-basic dialogue/modal (text, delay)
// 
//TODO: shoot key for desktops
//        -shoot button for gamepads
//        -controls for gamepads
//TODO: -UI buttons [shoot/interact, change weapon, boost?]
//        should UI buttons be circles (for finger touch)?
//
//TODO: FX ship at max speed effect
//TODO: FX dust should streak at speed
//TODO: FX effects when asteroids hit
//TODO: x-use SVG
//        .-use SVG for sprites e.g. ship/shots/effects/asteroid texture

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
    // const radius = 50; // Size of the circle - now using global CENTER_CIRCLE_RADIUS
    
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
    timer.startTime = Date.now(); // in milliseconds
    timer.duration = durationMins * 60 * 1000; // x minutes in ms
    timer.timerExpired = false;
    
    // Start a timer that updates every second to show score and remaining time
    if (timer.interval) {
        clearInterval(timer.interval);
    }
    
    timer.interval = setInterval(() => {
        if (!isTimerExpired()) {
            // Update the message with score and timer
            const timeFormatted = checkTimer();
            message.innerText = `${score} | Timer: ${timeFormatted}`;
        }
    }, 1000); // Update every second
}

function checkTimer() {
  const elapsed = Date.now() - timer.startTime;
  const remaining = Math.max(0, timer.duration - elapsed);
  
  // Format remaining time
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
//   console.log(`Remaining: ${formatted}`);

  return formatted;
}

function isTimerExpired() {
    // Always consider timer expired if game is over
    if (GAME_OVER) {
        return true;
    }
    
    // Calculate elapsed time
    const elapsed = Date.now() - timer.startTime;
    
    // Check if timer has expired
    if (!timer.timerExpired && elapsed >= timer.duration) {
        timer.timerExpired = true;
        // Clear our interval when the timer expires
        if (timer.interval) {
            clearInterval(timer.interval);
        }
        console.log("Timer expired! Perform your action here.");
        // Final update of the message when timer expires
        message.innerText = `GAME OVER | Final Score: ${score}`;
        return true;
    }
    
    return false;
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
