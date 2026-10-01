import { createScrap } from './Scrap.js';

function initTugShip(game, freighter) {
    this.name = 'tug';
    this.game = game;
    this.freighter = freighter;
    this.x = freighter ? freighter.x - 60 : game.world.width / 2;
    this.y = freighter ? freighter.y - 60 : game.world.height / 2;
    this.radius = 16;
    this.angle = freighter ? freighter.angle : 0;
    this.speed = 85;
    this.maxSpeed = 85;
    this.health = 100;
    this.maxHealth = 100;
    this.state = 'ESCORT'; // 'ESCORT', 'RETRIEVE_CONTAINER', 'REPAIR_ROCKET'

    this.escortOffsetDist = 85;
    this.escortOffsetAngle = Math.PI * 0.45; // Flanking angle

    this.targetContainer = null;
    this.repairTargetRocket = null;
    this.repairTimer = 0; // ms
    this.REPAIR_DURATION = 50000; // 50 seconds in ms
    this.isRepairing = false;
    this.weldSparkTimer = 0;
}

function interruptRepair() {
    // If attacked or bumped into counts as an interruption and the 50 seconds timer needs to start over.
    if (this.repairTimer > 0 || this.isRepairing) {
        this.repairTimer = 0;
        this.isRepairing = false;
    }
}

function takeDamage(amount) {
    this.health -= amount;
    this.interruptRepair();
    if (this.health <= 0) {
        this.destroy();
    }
}

function onBump() {
    this.interruptRepair();
}

function destroy() {
    for (let i = 0; i < 4; i++) {
        this.game.scrap.push(createScrap(this.game, this.x, this.y, null));
    }
    const tidx = this.game.tugs.indexOf(this);
    if (tidx !== -1) this.game.tugs.splice(tidx, 1);
    const eidx = this.game.entities.indexOf(this);
    if (eidx !== -1) this.game.entities.splice(eidx, 1);
}

function findNearbyContainer() {
    if (!this.freighter || this.freighter.containers.length >= 5) return null;

    const SEARCH_RADIUS = 500;
    let nearest = null;
    let minDist = SEARCH_RADIUS;

    for (const c of this.game.containers) {
        if (c.isTowed) continue;
        const d = Math.hypot(this.freighter.x - c.x, this.freighter.y - c.y);
        if (d < minDist) {
            minDist = d;
            nearest = c;
        }
    }

    return nearest;
}

function update(deltaTime) {
    if (!this.freighter) return;
    this.weldSparkTimer += deltaTime;

    // 1. Check if nearby container needs to be pushed back on freighter
    const nearbyContainer = this.findNearbyContainer();
    if (nearbyContainer) {
        this.state = 'RETRIEVE_CONTAINER';
        this.targetContainer = nearbyContainer;
        this.interruptRepair();
    } else {
        // 2. Check if any freighter rocket is damaged
        const damagedRocket = this.freighter.rockets.find((r) => r.damaged);
        if (damagedRocket) {
            this.state = 'REPAIR_ROCKET';
            this.repairTargetRocket = damagedRocket;
        } else {
            this.state = 'ESCORT';
            this.repairTargetRocket = null;
            this.repairTimer = 0;
            this.isRepairing = false;
        }
    }

    // Execute state behavior
    if (this.state === 'RETRIEVE_CONTAINER') {
        this.handleRetrieveContainer(deltaTime);
    } else if (this.state === 'REPAIR_ROCKET') {
        this.handleRepairRocket(deltaTime);
    } else {
        this.handleEscort(deltaTime);
    }
}

function handleRetrieveContainer(deltaTime) {
    const c = this.targetContainer;
    if (!c || this.game.containers.indexOf(c) === -1 || c.isTowed) {
        this.targetContainer = null;
        this.state = 'ESCORT';
        return;
    }

    // Vector from container to freighter
    const toFreighterX = this.freighter.x - c.x;
    const toFreighterY = this.freighter.y - c.y;
    const distContainerToFreighter = Math.hypot(toFreighterX, toFreighterY);

    // If container reached freighter, attach it!
    if (distContainerToFreighter <= this.freighter.radius + 15) {
        this.freighter.attachContainer(c);
        this.targetContainer = null;
        this.state = 'ESCORT';
        return;
    }

    // Physical push: position tug behind container along the push direction
    const pushAngle = Math.atan2(toFreighterY, toFreighterX);
    const behindX = c.x - Math.cos(pushAngle) * (this.radius + 18);
    const behindY = c.y - Math.sin(pushAngle) * (this.radius + 18);

    const distToBehind = Math.hypot(behindX - this.x, behindY - this.y);

    if (distToBehind > 18) {
        // Fly towards position behind container
        this.steerToward(behindX, behindY, deltaTime);
    } else {
        // Contact push! Push container towards freighter
        this.steerToward(c.x, c.y, deltaTime);
        c.velocityX = Math.cos(pushAngle) * 60;
        c.velocityY = Math.sin(pushAngle) * 60;
    }
}

function handleRepairRocket(deltaTime) {
    if (!this.repairTargetRocket?.damaged) {
        this.repairTargetRocket = null;
        this.repairTimer = 0;
        this.isRepairing = false;
        return;
    }

    const rocketPos = this.freighter.getRocketWorldPos(this.repairTargetRocket);
    const dist = Math.hypot(rocketPos.x - this.x, rocketPos.y - this.y);

    if (dist > 28) {
        // Fly to rocket position
        this.isRepairing = false;
        this.steerToward(rocketPos.x, rocketPos.y, deltaTime);
    } else {
        // In position to repair
        this.isRepairing = true;
        // Face rocket
        this.angle = Math.atan2(rocketPos.y - this.y, rocketPos.x - this.x);

        // Advance repair timer
        this.repairTimer += deltaTime;

        // Check if 50s completed uninterrupted
        if (this.repairTimer >= this.REPAIR_DURATION) {
            this.freighter.repairRocket(this.repairTargetRocket.id);
            this.repairTimer = 0;
            this.isRepairing = false;
            this.repairTargetRocket = null;
        }
    }
}

function handleEscort(deltaTime) {
    // Escort position alongside freighter
    const flankAngle = this.freighter.angle + this.escortOffsetAngle;
    const targetX =
        this.freighter.x + Math.cos(flankAngle) * this.escortOffsetDist;
    const targetY =
        this.freighter.y + Math.sin(flankAngle) * this.escortOffsetDist;

    this.steerToward(targetX, targetY, deltaTime);
}

function steerToward(targetX, targetY, deltaTime) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 4) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxTurn = 0.005 * deltaTime;
        if (Math.abs(angleDiff) > maxTurn) {
            this.angle += (angleDiff > 0 ? 1 : -1) * maxTurn;
        } else {
            this.angle = targetAngle;
        }

        const moveSpeed = Math.min(this.speed, dist * 3);
        this.x += (Math.cos(this.angle) * moveSpeed * deltaTime) / 1000;
        this.y += (Math.sin(this.angle) * moveSpeed * deltaTime) / 1000;
    }
}

function draw() {
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    // Draw repair beam & sparks if repairing
    if (this.isRepairing && this.repairTargetRocket) {
        const rPos = this.freighter.getRocketWorldPos(this.repairTargetRocket);
        const rx = rPos.x - this.game.cameraOffset.x;
        const ry = rPos.y - this.game.cameraOffset.y;

        ctx.save();
        ctx.strokeStyle = 'hsl(190, 100%, 75%)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'hsl(190, 100%, 75%)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(rx, ry);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Welding sparks
        if (Math.random() < 0.6) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(
                rx + (Math.random() - 0.5) * 8,
                ry + (Math.random() - 0.5) * 8,
                2,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
        ctx.restore();

        // 50s Progress Bar
        const pct = Math.min(1, this.repairTimer / this.REPAIR_DURATION);
        const barW = 40;
        const barH = 5;
        const remainingSec = Math.ceil(
            (this.REPAIR_DURATION - this.repairTimer) / 1000,
        );

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(sx - barW / 2, sy - 28, barW, barH);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(sx - barW / 2, sy - 28, barW * pct, barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - barW / 2, sy - 28, barW, barH);

        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00e5ff';
        ctx.fillText(`REPAIR ${remainingSec}s`, sx, sy - 34);
        ctx.restore();
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // Front push buffers (dual clamps)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.fillRect(10, -12, 6, 8);
    ctx.strokeRect(10, -12, 6, 8);
    ctx.fillRect(10, 4, 6, 8);
    ctx.strokeRect(10, 4, 6, 8);

    // Tug hull (sturdy hexagonal / workboat shape)
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(4, 13);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(4, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wheelhouse / cockpit
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-2, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Rear engine
    ctx.fillStyle = '#475569';
    ctx.fillRect(-15, -4, 4, 8);

    // Caution stripes / amber beacon
    const beacon = Math.floor(this.weldSparkTimer / 300) % 2 === 0;
    ctx.fillStyle = beacon ? '#ffdd00' : '#886600';
    ctx.beginPath();
    ctx.arc(-2, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // State indicator label
    ctx.rotate(-this.angle);
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    if (this.state === 'RETRIEVE_CONTAINER') {
        ctx.fillText('PUSHING CARGO', 0, 24);
    } else if (this.state === 'REPAIR_ROCKET' && !this.isRepairing) {
        ctx.fillText('EN ROUTE TO REPAIR', 0, 24);
    }

    ctx.restore();
}

export function createTugShip(game, freighter) {
    const tug = {};
    initTugShip.call(tug, game, freighter);
    tug.update = update;
    tug.draw = draw;
    tug.interruptRepair = interruptRepair;
    tug.takeDamage = takeDamage;
    tug.onBump = onBump;
    tug.destroy = destroy;
    tug.findNearbyContainer = findNearbyContainer;
    tug.handleRetrieveContainer = handleRetrieveContainer;
    tug.handleRepairRocket = handleRepairRocket;
    tug.handleEscort = handleEscort;
    tug.steerToward = steerToward;
    return tug;
}
