import { createScrap } from './Scrap.js';

function initMine(game, x, y) {
    this.name = 'mine';
    this.game = game;
    this.originX = x;
    this.originY = y;
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.triggerRadius = 60;
    this.velocityX = 0;
    this.velocityY = 0;
    this.maxSpeed = 45;
    this.returnSpeed = 25;
    this.health = 10;
    this.state = 'IDLE'; // 'IDLE', 'PURSUING', 'RETURNING'
    this.blinkTimer = 0;
    this.destroyed = false;
}

function update(deltaTime) {
    if (this.destroyed) return;
    this.blinkTimer += deltaTime;

    const ship = this.game.ship;
    let distToShip = Infinity;
    if (ship && !ship.dead) {
        distToShip = Math.hypot(ship.x - this.x, ship.y - this.y);
    }

    if (distToShip <= this.triggerRadius) {
        // Pursuing player ship
        this.state = 'PURSUING';
        const angle = Math.atan2(ship.y - this.y, ship.x - this.x);
        const targetVx = Math.cos(angle) * this.maxSpeed;
        const targetVy = Math.sin(angle) * this.maxSpeed;

        const steerRate = 0.05;
        this.velocityX += (targetVx - this.velocityX) * steerRate;
        this.velocityY += (targetVy - this.velocityY) * steerRate;
    } else {
        // Player moved further than 60 px: slow down, then fly back to origin
        const distToOrigin = Math.hypot(
            this.originX - this.x,
            this.originY - this.y,
        );
        if (
            distToOrigin > 1 ||
            Math.hypot(this.velocityX, this.velocityY) > 0.5
        ) {
            this.state = 'RETURNING';
            // Slow down existing momentum
            this.velocityX *= 0.96;
            this.velocityY *= 0.96;

            // Steer back to origin
            const angleToOrigin = Math.atan2(
                this.originY - this.y,
                this.originX - this.x,
            );
            const targetVx = Math.cos(angleToOrigin) * this.returnSpeed;
            const targetVy = Math.sin(angleToOrigin) * this.returnSpeed;

            const returnSteer = 0.03;
            this.velocityX += (targetVx - this.velocityX) * returnSteer;
            this.velocityY += (targetVy - this.velocityY) * returnSteer;
        } else {
            this.state = 'IDLE';
            this.velocityX *= 0.9;
            this.velocityY *= 0.9;
            if (Math.hypot(this.velocityX, this.velocityY) < 0.1) {
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }
    }

    this.x += (this.velocityX * deltaTime) / 1000;
    this.y += (this.velocityY * deltaTime) / 1000;
}

function explode(damagedShip = null) {
    if (this.destroyed) return;
    this.destroyed = true;

    if (damagedShip && !damagedShip.dead) {
        damagedShip.takeDamage(30);
    }

    // Creates debris fragments
    for (let i = 0; i < 3; i++) {
        this.game.scrap.push(createScrap(this.game, this.x, this.y, null));
    }

    const midx = this.game.mines.indexOf(this);
    if (midx !== -1) this.game.mines.splice(midx, 1);
    const eidx = this.game.entities.indexOf(this);
    if (eidx !== -1) this.game.entities.splice(eidx, 1);
}

function takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
        this.explode(null);
    }
}

function bounceOff(otherX, otherY, otherRadius) {
    const dx = this.x - otherX;
    const dy = this.y - otherY;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // Separate
    const overlap = this.radius + otherRadius - dist;
    if (overlap > 0) {
        this.x += nx * overlap;
        this.y += ny * overlap;
    }

    // Reflect velocity
    const dot = this.velocityX * nx + this.velocityY * ny;
    if (dot < 0) {
        this.velocityX -= 1.6 * dot * nx;
        this.velocityY -= 1.6 * dot * ny;
    }
}

function draw() {
    if (this.destroyed) return;
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    ctx.save();
    ctx.translate(sx, sy);

    // Spikes (8 spikes)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(
            Math.cos(a) * (this.radius + 4),
            Math.sin(a) * (this.radius + 4),
        );
        ctx.stroke();
    }

    // Main mine body
    ctx.fillStyle = '#2d2d2d';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flashing center warning light
    const blinkInterval = this.state === 'PURSUING' ? 120 : 600;
    const isLit = Math.floor(this.blinkTimer / blinkInterval) % 2 === 0;
    ctx.fillStyle = isLit ? '#ff2200' : '#440000';
    ctx.shadowColor = isLit ? '#ff2200' : 'transparent';
    ctx.shadowBlur = isLit ? 8 : 0;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Trigger ring indicator when pursuing
    if (this.state === 'PURSUING') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 34, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, this.triggerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

export function createMine(game, x, y) {
    const mine = {};
    initMine.call(mine, game, x, y);
    mine.update = update;
    mine.draw = draw;
    mine.explode = explode;
    mine.takeDamage = takeDamage;
    mine.bounceOff = bounceOff;
    return mine;
}
