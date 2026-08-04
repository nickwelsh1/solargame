import { randomMinMax } from '../utils/helpers.js';

const SPAWN_INTERVAL = 20;
const EFFECT_DURATION = 800;
const SQUARE_LIFE = 100;

function initShipExplosion(game, ship) {
    this.game = game;
    this.shipX = ship.x;
    this.shipY = ship.y;
    this.shipMomentumX = ship.speed * 1000 * Math.cos(ship.movementAngle);
    this.shipMomentumY = ship.speed * 1000 * Math.sin(ship.movementAngle);
    this.startTime = performance.now();
    this.lastSpawnTime = -Infinity;
    this.squares = [];
    this.finished = false;
    this.fullSize = ship.radius * 4;
}

function spawnSquare(now) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomMinMax(100, 300);
    const outwardX = Math.cos(angle) * speed;
    const outwardY = Math.sin(angle) * speed;

    this.squares.push({
        x: this.shipX,
        y: this.shipY,
        outwardX,
        outwardY,
        spawnTime: now,
    });
}

function update(deltaTime) {
    const now = performance.now();
    const elapsed = now - this.startTime;

    if (elapsed >= EFFECT_DURATION) {
        this.finished = true;
    }

    if (!this.finished && now - this.lastSpawnTime >= SPAWN_INTERVAL) {
        this.lastSpawnTime = now;
        spawnSquare.call(this, now);
    }

    for (let i = this.squares.length - 1; i >= 0; i--) {
        const square = this.squares[i];
        const age = now - square.spawnTime;
        const progress = Math.min(1, age / SQUARE_LIFE);

        if (progress >= 1) {
            this.squares.splice(i, 1);
            continue;
        }

        const momentumFactor = 1 - progress;
        const vx = square.outwardX + this.shipMomentumX * momentumFactor;
        const vy = square.outwardY + this.shipMomentumY * momentumFactor;

        square.x += (vx * deltaTime) / 1000;
        square.y += (vy * deltaTime) / 1000;
    }

    return this.finished && this.squares.length === 0;
}

function draw() {
    const now = performance.now();
    const ctx = this.game.ctx;
    const offset = this.game.cameraOffset;

    ctx.save();
    for (const square of this.squares) {
        const age = now - square.spawnTime;
        const progress = Math.min(1, age / SQUARE_LIFE);
        const size = this.fullSize * progress;
        const alpha = 1 - 0.9 * progress;

        ctx.fillStyle = `hsla(35, 100%, 55%, ${alpha})`;
        ctx.fillRect(
            square.x - offset.x - size / 2,
            square.y - offset.y - size / 2,
            size,
            size,
        );
    }
    ctx.restore();
}

export function createShipExplosion(game, ship) {
    const explosion = {};
    initShipExplosion.call(explosion, game, ship);
    explosion.update = update;
    explosion.draw = draw;
    return explosion;
}
