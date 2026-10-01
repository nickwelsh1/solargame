import { randomMinMax } from '../utils/helpers.js';
import { createCargoContainer } from './CargoContainer.js';

function initFreighter(game, x, y, angle = 0, initialContainers = 4) {
    this.name = 'freighter';
    this.game = game;
    this.x = x || randomMinMax(300, game.world.width - 300);
    this.y = y || randomMinMax(300, game.world.height - 300);
    this.angle = angle;
    this.width = 170;
    this.height = 42;
    this.radius = 75; // Collision radius for hull
    this.baseSpeed = 50;
    this.speed = 35;
    this.turnSpeed = 0.0004;
    this.patrolTarget = { x: this.x, y: this.y };
    pickNewTarget.call(this);

    // Containers carried (0 to 5)
    this.containers = [];
    const count = Math.max(0, Math.min(5, initialContainers));
    for (let i = 0; i < count; i++) {
        this.containers.push({ id: i });
    }
    this.shotHits = 0;

    // 4 Rockets at the rear
    this.rockets = [
        {
            id: 0,
            xOffset: -75,
            yOffset: -15,
            radius: 8,
            health: 30,
            maxHealth: 30,
            damaged: false,
        },
        {
            id: 1,
            xOffset: -75,
            yOffset: -5,
            radius: 8,
            health: 30,
            maxHealth: 30,
            damaged: false,
        },
        {
            id: 2,
            xOffset: -75,
            yOffset: 5,
            radius: 8,
            health: 30,
            maxHealth: 30,
            damaged: false,
        },
        {
            id: 3,
            xOffset: -75,
            yOffset: 15,
            radius: 8,
            health: 30,
            maxHealth: 30,
            damaged: false,
        },
    ];

    // Local X offsets for 5 container slots along the spine
    this.slotOffsets = [-42, -21, 0, 21, 42];
}

function pickNewTarget() {
    this.patrolTarget = {
        x: randomMinMax(250, this.game.world.width - 250),
        y: randomMinMax(250, this.game.world.height - 250),
    };
}

function getRocketWorldPos(rocket) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
        x: this.x + rocket.xOffset * cos - rocket.yOffset * sin,
        y: this.y + rocket.xOffset * sin + rocket.yOffset * cos,
    };
}

function calculateSpeed() {
    const activeRockets = this.rockets.filter((r) => !r.damaged).length;
    const thrustMultiplier = activeRockets / 4;
    // Freighters weight is dictated by how many containers they are carrying. weight has an effect on their speed.
    const weightMultiplier = 1 / (1 + 0.16 * this.containers.length);
    return this.baseSpeed * thrustMultiplier * weightMultiplier;
}

function update(deltaTime) {
    this.speed = this.calculateSpeed();

    // Steer toward patrol target
    const dx = this.patrolTarget.x - this.x;
    const dy = this.patrolTarget.y - this.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget < 120) {
        this.pickNewTarget();
    } else {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxTurn = this.turnSpeed * deltaTime;
        if (Math.abs(angleDiff) > maxTurn) {
            this.angle += (angleDiff > 0 ? 1 : -1) * maxTurn;
        } else {
            this.angle = targetAngle;
        }
    }

    // Move forward if engines active
    if (this.speed > 0) {
        this.x += (Math.cos(this.angle) * this.speed * deltaTime) / 1000;
        this.y += (Math.sin(this.angle) * this.speed * deltaTime) / 1000;
    }

    // World bounds clamping
    this.x = Math.max(80, Math.min(this.game.world.width - 80, this.x));
    this.y = Math.max(80, Math.min(this.game.world.height - 80, this.y));
}

function dislodgeContainer(ejectAngle) {
    if (this.containers.length === 0) return null;

    this.containers.pop();
    const count = this.containers.length;
    const slotIdx = Math.min(count, this.slotOffsets.length - 1);
    const slotX = this.slotOffsets[slotIdx];
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const spawnX = this.x + slotX * cos;
    const spawnY = this.y + slotX * sin;

    const newContainer = createCargoContainer(this.game);
    newContainer.x = spawnX;
    newContainer.y = spawnY;
    const angle =
        ejectAngle !== undefined
            ? ejectAngle
            : this.angle + (Math.random() < 0.5 ? 1.5 : -1.5);
    newContainer.velocityX = Math.cos(angle) * 60;
    newContainer.velocityY = Math.sin(angle) * 60;
    newContainer.discovered = true;

    this.game.containers.push(newContainer);
    this.game.entities.push(newContainer);

    this.speed = this.calculateSpeed();
    return newContainer;
}

function onBump(impactSpeed, bumpAngle) {
    // If bumped into with enough force there's a chance a container can fall off.
    // The more containers they are carrying the higher chance that one could be knocked free.
    if (this.containers.length === 0) return null;
    if (impactSpeed < 32) return null;

    const count = this.containers.length;
    // Drop chance scales with container count
    const dropChance = (count / 5) * 0.65 + 0.2;

    if (Math.random() < dropChance) {
        return this.dislodgeContainer(bumpAngle);
    }

    return null;
}

function onShotHit(shotAngle) {
    // Shooting a freighter should increase the chances of it dislodging a cargo container.
    // If a freighter is full as little as 3 hits should be enough to dislodge a container.
    if (this.containers.length === 0) return null;

    this.shotHits = (this.shotHits || 0) + 1;
    // When full (5 containers), threshold is 3 hits. When less full, requires more hits.
    const threshold = Math.max(3, 8 - this.containers.length);

    if (this.shotHits >= threshold) {
        this.shotHits = 0;
        return this.dislodgeContainer(shotAngle);
    }

    return null;
}

function damageRocket(rocketIndex, amount) {
    const rocket = this.rockets[rocketIndex];
    if (!rocket || rocket.damaged) return;

    rocket.health -= amount;
    if (rocket.health <= 0) {
        rocket.health = 0;
        rocket.damaged = true;
    }
}

function repairRocket(rocketIndex) {
    const rocket = this.rockets[rocketIndex];
    if (!rocket) return;
    rocket.damaged = false;
    rocket.health = rocket.maxHealth;
}

function attachContainer(container) {
    if (this.containers.length >= 5) return false;

    this.containers.push({ id: this.containers.length });

    // Remove from world
    if (container) {
        const cidx = this.game.containers.indexOf(container);
        if (cidx !== -1) this.game.containers.splice(cidx, 1);
        const eidx = this.game.entities.indexOf(container);
        if (eidx !== -1) this.game.entities.splice(eidx, 1);
    }

    return true;
}

function draw() {
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // 4 Rockets at the rear
    this.rockets.forEach((r) => {
        // Rocket housing
        ctx.fillStyle = r.damaged ? '#3a2020' : '#4a5568';
        ctx.strokeStyle = r.damaged ? '#ff3300' : '#2d3748';
        ctx.lineWidth = 1.5;
        ctx.fillRect(r.xOffset - 4, r.yOffset - 3.5, 10, 7);
        ctx.strokeRect(r.xOffset - 4, r.yOffset - 3.5, 10, 7);

        if (!r.damaged && this.speed > 0) {
            // Thruster flame
            ctx.fillStyle = 'rgba(255, 150, 0, 0.85)';
            ctx.beginPath();
            ctx.moveTo(r.xOffset - 4, r.yOffset - 3);
            ctx.lineTo(r.xOffset - 4 - randomMinMax(8, 16), r.yOffset);
            ctx.lineTo(r.xOffset - 4, r.yOffset + 3);
            ctx.closePath();
            ctx.fill();
        } else if (r.damaged) {
            // Smoke / sparks
            if (Math.random() < 0.4) {
                ctx.fillStyle = '#ff5500';
                ctx.beginPath();
                ctx.arc(
                    r.xOffset - 6 + Math.random() * 4,
                    r.yOffset + (Math.random() - 0.5) * 6,
                    2,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
        }
    });

    // Main hull body
    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;

    // Cockpit bow (front)
    ctx.beginPath();
    ctx.moveTo(60, -18);
    ctx.lineTo(82, 0);
    ctx.lineTo(60, 18);
    ctx.lineTo(-65, 18);
    ctx.lineTo(-65, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bridge viewport
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(62, -8);
    ctx.lineTo(74, 0);
    ctx.lineTo(62, 8);
    ctx.closePath();
    ctx.fill();

    // 5 Cargo container slots
    const slotW = 18;
    const slotH = 24;
    for (let i = 0; i < 5; i++) {
        const slotX = this.slotOffsets[i];
        if (i < this.containers.length) {
            // Loaded container
            ctx.fillStyle = '#C8A012';
            ctx.strokeStyle = '#7A6000';
            ctx.lineWidth = 1.5;
            ctx.fillRect(slotX - slotW / 2, -slotH / 2, slotW, slotH);
            ctx.strokeRect(slotX - slotW / 2, -slotH / 2, slotW, slotH);

            // Container detail lines
            ctx.strokeStyle = '#997a00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(slotX, -slotH / 2);
            ctx.lineTo(slotX, slotH / 2);
            ctx.stroke();
        } else {
            // Empty container bay frame
            ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(slotX - slotW / 2, -slotH / 2, slotW, slotH);
            ctx.setLineDash([]);
        }
    }

    // Rocket health bars at rear
    this.rockets.forEach((r) => {
        if (r.health < r.maxHealth) {
            ctx.fillStyle = '#111';
            ctx.fillRect(r.xOffset - 4, r.yOffset - 6, 8, 2);
            ctx.fillStyle = r.damaged ? '#ff2222' : '#22c55e';
            ctx.fillRect(
                r.xOffset - 4,
                r.yOffset - 6,
                8 * (r.health / r.maxHealth),
                2,
            );
        }
    });

    // Freighter label
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`FREIGHTER [${this.containers.length}/5]`, 0, -25);

    ctx.restore();
}

export function createFreighter(game, x, y, angle, initialContainers) {
    const freighter = {};
    initFreighter.call(freighter, game, x, y, angle, initialContainers);
    freighter.update = update;
    freighter.draw = draw;
    freighter.onBump = onBump;
    freighter.onShotHit = onShotHit;
    freighter.dislodgeContainer = dislodgeContainer;
    freighter.damageRocket = damageRocket;
    freighter.repairRocket = repairRocket;
    freighter.attachContainer = attachContainer;
    freighter.calculateSpeed = calculateSpeed;
    freighter.getRocketWorldPos = getRocketWorldPos;
    freighter.pickNewTarget = pickNewTarget;
    return freighter;
}
