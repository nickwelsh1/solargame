import { createExplosion } from './Explosion.js';
import { createScrap } from './Scrap.js';

function initMine(game, x, y) {
    this.name = 'mine';
    this.game = game;
    this.originX = x;
    this.originY = y;
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.triggerRadius = 180;
    this.velocityX = 0;
    this.velocityY = 0;
    this.maxSpeed = 45;
    this.returnSpeed = 25;
    this.health = 10;
    this.state = 'IDLE'; // 'IDLE', 'PURSUING', 'RETURNING'
    this.blinkTimer = 0;
    this.destroyed = false;
}

function findNearestTarget() {
    let closest = null;
    let minDist = this.triggerRadius;

    // 1. Player ship
    const ship = this.game.ship;
    if (ship && !ship.dead) {
        const d = Math.hypot(ship.x - this.x, ship.y - this.y);
        if (d < minDist) {
            minDist = d;
            closest = ship;
        }
    }

    // 2. Freighters
    this.game.freighters?.forEach((f) => {
        const d = Math.hypot(f.x - this.x, f.y - this.y);
        if (d < minDist) {
            minDist = d;
            closest = f;
        }
    });

    // 3. Tugs
    this.game.tugs?.forEach((t) => {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d < minDist) {
            minDist = d;
            closest = t;
        }
    });

    // 4. Satellites
    this.game.satellites?.forEach((sat) => {
        const d = Math.hypot(sat.x - this.x, sat.y - this.y);
        if (d < minDist) {
            minDist = d;
            closest = sat;
        }
    });

    return closest;
}

function update(deltaTime) {
    if (this.destroyed) return;
    this.blinkTimer += deltaTime;

    const target = findNearestTarget.call(this);

    if (target) {
        // Pursuing target
        this.state = 'PURSUING';
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const targetVx = Math.cos(angle) * this.maxSpeed;
        const targetVy = Math.sin(angle) * this.maxSpeed;

        const steerRate = 0.05;
        this.velocityX += (targetVx - this.velocityX) * steerRate;
        this.velocityY += (targetVy - this.velocityY) * steerRate;
    } else {
        // Target moved further than 180 px: slow down, then fly back to origin
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

    // Visual fireball explosion
    if (this.game.explosions) {
        this.game.explosions.push(
            createExplosion(this.game, this.x, this.y, 80, 500),
        );
    }

    const blastRadius = 80;

    // AOE damage to player ship
    const ship = this.game.ship;
    if (ship && !ship.dead) {
        const d = Math.hypot(ship.x - this.x, ship.y - this.y);
        if (d <= blastRadius || damagedShip === ship) {
            const damage = Math.round(30 * (1 - (d / blastRadius) * 0.4));
            ship.takeDamage(damage);
        }
    }

    // AOE damage to tugs
    this.game.tugs?.forEach((tug) => {
        const d = Math.hypot(tug.x - this.x, tug.y - this.y);
        if (d <= blastRadius || damagedShip === tug) {
            tug.takeDamage(30);
        }
    });

    // AOE damage to satellites
    this.game.satellites?.forEach((sat) => {
        const d = Math.hypot(sat.x - this.x, sat.y - this.y);
        if (d <= blastRadius || damagedShip === sat) {
            sat.takeDamage(25);
        }
    });

    // AOE damage / force to freighters
    this.game.freighters?.forEach((freighter) => {
        const d = Math.hypot(freighter.x - this.x, freighter.y - this.y);
        if (d <= blastRadius + freighter.radius || damagedShip === freighter) {
            // Damage closest rocket if near rear
            freighter.rockets.forEach((r) => {
                const rPos = freighter.getRocketWorldPos(r);
                if (
                    Math.hypot(rPos.x - this.x, rPos.y - this.y) <= blastRadius
                ) {
                    freighter.damageRocket(r.id, 20);
                }
            });
            // Also contribute to cargo dislodgement
            freighter.onBump(
                55,
                Math.atan2(freighter.y - this.y, freighter.x - this.x),
            );
        }
    });

    // Kinetic shockwave: knocks nearby scrap debris away
    this.game.scrap?.forEach((s) => {
        const dx = s.x - this.x;
        const dy = s.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d <= 120) {
            const force = (1 - d / 120) * 220;
            s.velocityX += (dx / d) * force;
            s.velocityY += (dy / d) * force;
        }
    });

    // Kinetic shockwave: knocks smaller asteroids
    this.game.asteroids?.forEach((a) => {
        const dx = a.x - this.x;
        const dy = a.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d <= 100) {
            const force = (1 - d / 100) * 60;
            a.velocityX += (dx / d) * force;
            a.velocityY += (dy / d) * force;
        }
    });

    // Creates debris fragments with outward blast velocity
    for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const scrap = createScrap(this.game, this.x, this.y, null);
        const speed = Math.random() * 80 + 40;
        scrap.velocityX = Math.cos(angle) * speed;
        scrap.velocityY = Math.sin(angle) * speed;
        this.game.scrap.push(scrap);
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
    mine.findNearestTarget = findNearestTarget;
    return mine;
}
