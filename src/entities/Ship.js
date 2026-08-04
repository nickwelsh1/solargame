import { calculateNewPosition } from '../utils/helpers.js';
import { addVelocities } from '../utils/physics.js';
import { Beam } from './Beam.js';
import { Bullet, Laser, Missile } from './Projectile.js';
import { createShipExplosion } from './ShipExplosion.js';

function initShip(game) {
    this.game = game;
    this.name = 'ship';
    this.x = this.game.world.width / 2;
    this.y = this.game.world.height / 2;
    this.radius = 20;
    this.angle = 0;
    this.lastAngle = 0;
    this.lastRotationTime = 0;
    this.movementAngle = 0;
    this.speed = 0;
    this.targetSpeed = 0;
    this.maxSpeed = 0.2;
    this.lastSpeedUpdateTime = 0;
    this.accelerationTimeMs = 1000; // Increased time to reach max speed to 200ms
    this.targetX = this.x;
    this.targetY = this.y;
    this.mass = Math.PI * this.radius * this.radius;
    this.maxRotationSpeed = (Math.PI / 180) * 0.25; // 0.25 degree per ms in radians
    this.towedContainer = null;
    this.health = 50;
    this.maxHealth = 50;
    this.dead = false;
    this.damageWindowStart = 0;
    this.damageWindowMax = 0;

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
            this.points = this.points.filter(
                (point) => currentTime - point.timestamp <= this.pointLifespan,
            );
        },

        draw(offset) {
            if (this.points.length < 2) return;

            this.game.ctx.beginPath();
            this.game.ctx.strokeStyle = 'hsl(200, 100.00%, 100%)'; //
            this.game.ctx.lineWidth = 5;

            // Start from the oldest point
            const firstPoint = this.points[0];
            this.game.ctx.moveTo(
                firstPoint.x - offset.x,
                firstPoint.y - offset.y,
            );

            // Draw lines to each subsequent point
            for (let i = 1; i < this.points.length; i++) {
                const point = this.points[i];
                this.game.ctx.lineTo(point.x - offset.x, point.y - offset.y);
                // Gradually increase opacity for newer points
                this.game.ctx.strokeStyle = `hsla(200, 100%, ${i * 10}%, ${(i / this.points.length) * 0.9})`;
                this.game.ctx.stroke();
                this.game.ctx.beginPath();
                this.game.ctx.moveTo(point.x - offset.x, point.y - offset.y);
            }
        },
    };
    this.contrail.game = this.game;
}

function setRotation(x, y) {
    if (this.dead) return;
    // Only changes the ship's facing angle without affecting movement
    const dx = x + this.game.cameraOffset.x - this.x;
    const dy = y + this.game.cameraOffset.y - this.y;
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

function setTarget(x, y) {
    if (this.dead) return;
    this.targetX = x + this.game.cameraOffset.x;
    this.targetY = y + this.game.cameraOffset.y;
    const distance = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    // const maxDistance = 0.5 *Math.min(camera.width, camera.height) - 10;
    const speedAdjust = 0.005;

    // Determine the new target speed based on distance
    let baseSpeed = 0;
    if (distance > this.game.CENTER_LOWTHRUST_RADIUS) {
        baseSpeed = 40;
    } else if (distance > this.game.CENTER_CIRCLE_RADIUS) {
        baseSpeed = 20;
    } else {
        baseSpeed = 0;
    }

    // Apply speed adjustment factor (as was done in the original code)
    this.maxSpeed = baseSpeed * speedAdjust;
    this.targetSpeed = this.maxSpeed;

    // Reset speed update timer to start acceleration/deceleration
    this.lastSpeedUpdateTime = performance.now();

    // Calculate the new direction in degrees
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const newDirectionRad = Math.atan2(dy, dx);
    const newDirectionDeg = (newDirectionRad * 180) / Math.PI;

    // Get the current movement direction in degrees
    const currentDirectionDeg = (this.movementAngle * 180) / Math.PI;

    // Only combine velocities if we already have speed
    if (this.speed > 0 && this.targetSpeed > 0) {
        // Use a momentum factor of 0.8 - adjust this value to control how much momentum is preserved
        const momentumFactor = 0.8;

        // Combine the current velocity with the new velocity
        const combinedVelocity = addVelocities(
            this.speed,
            currentDirectionDeg,
            this.targetSpeed,
            newDirectionDeg,
            momentumFactor, // Pass the momentum factor as the multiplier
        );

        // Update movement angle based on the combined velocity
        // Note: We don't set this.speed here anymore since it's handled by the exponential acceleration
        this.movementAngle = (combinedVelocity.direction * Math.PI) / 180; // Convert back to radians
    } else {
        // If currently not moving, just set the new direction
        this.movementAngle = newDirectionRad;
    }

    // Set ship facing and start thrust toward the new target
    this.setThrust(this.targetSpeed, this.movementAngle);
}

function setThrust(targetSpeed, movementAngle) {
    this.targetSpeed = Math.min(Math.max(targetSpeed, 0), this.maxSpeed);
    this.movementAngle = movementAngle;
    this.angle = movementAngle;
    this.lastSpeedUpdateTime = performance.now();
}

function applyThrust(speed, angle) {
    if (this.dead) return;
    this.setThrust(speed, angle);
}

function applyBrake(targetFraction = 0, durationMs = 400) {
    if (this.dead) return;
    const currentTime = performance.now();
    this.game.input.isBraking = true;
    this.game.input.brakeStartTime = currentTime;
    this.game.input.brakeDurationMs = durationMs;
    this.game.input.brakeStartSpeed = this.speed;
    this.game.input.brakeTargetFraction = targetFraction;
}

function update(deltaTime) {
    if (!this.dead) {
        // Handle braking if active
        if (this.game.input.isBraking) {
            const currentTime = performance.now();
            const brakeProgress = Math.min(
                1,
                (currentTime - this.game.input.brakeStartTime) /
                    (this.game.input.brakeDurationMs || 400),
            );
            const targetSpeed =
                this.game.input.brakeStartSpeed *
                this.game.input.brakeTargetFraction;

            if (brakeProgress >= 1) {
                // Braking completed
                this.speed = targetSpeed;
                this.targetSpeed = targetSpeed;
                this.game.input.isBraking = false;
            } else {
                // Linearly interpolate toward target speed
                this.speed =
                    this.game.input.brakeStartSpeed +
                    (targetSpeed - this.game.input.brakeStartSpeed) *
                        brakeProgress;
            }
        } else {
            // Handle exponential acceleration/deceleration toward target speed
            const currentTime = performance.now();
            const elapsedMs = currentTime - this.lastSpeedUpdateTime;

            if (this.speed !== this.targetSpeed) {
                // Calculate progress factor based on acceleration time
                const progressFactor = Math.min(
                    1,
                    elapsedMs / this.accelerationTimeMs,
                );

                // Exponential ease-in-out function for smooth acceleration/deceleration
                const easeInOutExpo = (t) => {
                    return t === 0
                        ? 0
                        : t === 1
                          ? 1
                          : t < 0.5
                            ? 2 ** (20 * t - 10) / 2
                            : (2 - 2 ** (-20 * t + 10)) / 2;
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

        this.speed = Math.min(this.speed, this.maxSpeed);
    }

    // Move the ship if it has speed
    if (this.speed > 0) {
        const newPos = calculateNewPosition(
            this.x,
            this.y,
            this.movementAngle,
            this.speed,
            this.maxSpeed,
            deltaTime,
        );
        this.x = newPos.x;
        this.y = newPos.y;

        // Add point to contrail when moving
        if (this.speed > 0.1) {
            // Only add points when actually moving
            this.contrail.addPoint(this.x, this.y);
        }

        // Update camera offset
        this.game.cameraOffset.x = this.x - this.game.camera.width / 2;
        this.game.cameraOffset.y = this.y - this.game.camera.height / 2;

        // keep ship bound to world
        this.x = Math.max(0, Math.min(this.x, this.game.world.width));
        this.y = Math.max(0, Math.min(this.y, this.game.world.height));
    }

    // Update towed container position (behind the ship)
    if (this.towedContainer) {
        const towDist = 50;
        this.towedContainer.x = this.x - Math.cos(this.angle) * towDist;
        this.towedContainer.y = this.y - Math.sin(this.angle) * towDist;
    }
}

function draw() {
    // Draw towed container behind ship
    if (this.towedContainer) {
        this.towedContainer.draw();
    }

    // Draw contrail first
    this.contrail.draw(this.game.cameraOffset);

    // Draw brake indicator: 8 inward-pointing triangles around ship
    if (this.game.input.isBraking) {
        const sx = this.x - this.game.cameraOffset.x;
        const sy = this.y - this.game.cameraOffset.y;
        const radius = 36;
        const triSize = 8;
        this.game.ctx.save();
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
            const grad = this.game.ctx.createLinearGradient(
                tipX,
                tipY,
                baseMidX,
                baseMidY,
            );
            grad.addColorStop(0, 'rgba(255,255,255,0.85)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            this.game.ctx.fillStyle = grad;
            // base corners spread perpendicular, offset outward
            const lbX =
                cx - Math.sin(a) * triSize * 0.5 + Math.cos(a) * triSize * 0.4;
            const lbY =
                cy + Math.cos(a) * triSize * 0.5 + Math.sin(a) * triSize * 0.4;
            const rbX =
                cx + Math.sin(a) * triSize * 0.5 + Math.cos(a) * triSize * 0.4;
            const rbY =
                cy - Math.cos(a) * triSize * 0.5 + Math.sin(a) * triSize * 0.4;
            this.game.ctx.beginPath();
            this.game.ctx.moveTo(tipX, tipY);
            this.game.ctx.lineTo(lbX, lbY);
            this.game.ctx.lineTo(rbX, rbY);
            this.game.ctx.closePath();
            this.game.ctx.fill();
        }
        this.game.ctx.restore();
    }

    // Draw ship
    this.game.ctx.save();
    this.game.ctx.translate(
        this.game.camera.width / 2,
        this.game.camera.height / 2,
    );
    this.game.ctx.rotate(this.angle);
    // ctx.fillStyle = 'white';
    // ctx.fill();
    this.game.ctx.translate(-8, 0);
    this.game.renderer.drawSVGImg(
        this.dead && this.game.shipBlackImg
            ? this.game.shipBlackImg
            : this.game.shipImg,
        this.game.CONFIG.MOBILE_SCALE * 0.7,
    );
    this.game.ctx.restore();
}

function shoot() {
    if (this.dead) return;
    if (this.game.entities.length >= this.game.CONFIG.MAX_ENTITIES + 10) return;

    const currentTime = performance.now();
    let canFire = false;

    switch (this.game.player.currentWeapon) {
        case 'laser':
            if (
                currentTime - this.game.player.lastLaserFireTime >=
                this.game.player.LASER_FIRE_RATE
            ) {
                canFire = true;
                this.game.player.lastLaserFireTime = currentTime;
            }
            break;
        case 'machineGun':
            if (
                currentTime - this.game.player.lastBulletFireTime >=
                this.game.player.BULLET_FIRE_RATE
            ) {
                canFire = true;
                this.game.player.lastBulletFireTime = currentTime;
            }
            break;
        case 'missile':
            if (
                currentTime - this.game.player.lastMissileFireTime >=
                this.game.player.MISSILE_FIRE_RATE
            ) {
                canFire = true;
                this.game.player.lastMissileFireTime = currentTime;
            }
            break;
        case 'beam':
            if (
                currentTime - this.game.player.lastBeamFireTime >=
                this.game.player.BEAM_FIRE_RATE
            ) {
                canFire = true;
                this.game.player.lastBeamFireTime = currentTime;
            }
            break;
    }

    if (!canFire) return;

    // Handle beam weapon separately since it doesn't go into projectiles array
    if (this.game.player.currentWeapon === 'beam') {
        const beam = new Beam(this.game, this.x, this.y, this.angle);
        this.game.beams.push(beam);
        this.game.entities.push(beam);
        return;
    }

    let projectile;
    switch (this.game.player.currentWeapon) {
        case 'laser':
            projectile = [new Laser(this.game, this.x, this.y, this.angle)];
            break;
        case 'machineGun': {
            const bullet = new Bullet(this.game, this.x, this.y, this.angle);
            projectile = this.game.spawner.spawnOffsetGroup(bullet, 2, 10); // dual
            break;
        }
        case 'missile':
            projectile = [new Missile(this.game, this.x, this.y, this.angle)];
            break;
    }
    this.game.projectiles.push(...projectile);
    this.game.entities.push(...projectile);
}

function takeDamage(amount) {
    if (this.dead) return;
    const now = performance.now();
    if (now - this.damageWindowStart >= 300) {
        this.damageWindowStart = now;
        this.damageWindowMax = 0;
    }
    const toApply = Math.max(0, amount - this.damageWindowMax);
    this.health -= toApply;
    this.damageWindowMax = Math.max(this.damageWindowMax, amount);
    if (this.health <= 0) {
        this.destroy();
    }
}

function destroy() {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.game.input.isBraking = false;
    this.game.input.isDraggingFromCenter = false;
    this.game.shipExplosion = createShipExplosion(this.game, this);
}

export function createShip(game) {
    const ship = {};
    initShip.call(ship, game);
    ship.setRotation = setRotation;
    ship.setTarget = setTarget;
    ship.setThrust = setThrust;
    ship.applyThrust = applyThrust;
    ship.applyBrake = applyBrake;
    ship.update = update;
    ship.draw = draw;
    ship.shoot = shoot;
    ship.takeDamage = takeDamage;
    ship.destroy = destroy;
    return ship;
}
