import { randomMinMax } from '../utils/helpers.js';
import { createScrap } from './Scrap.js';

function initCargoContainer(game) {
    this.name = 'container';
    this.x = randomMinMax(80, game.world.width - 80);
    this.y = randomMinMax(80, game.world.height - 80);
    this.width = 40;
    this.height = 24;
    this.health = 50;
    this.maxHealth = 50;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isTowed = false;
    this.discovered = false;
    this.contents = Math.random() < 0.7 ? 'salvage' : null;
    this.damageWindowStart = 0;
    this.damageWindowMax = 0;
    this.game = game;
}

function update(deltaTime) {
    if (this.isTowed) return;
    this.x += (this.velocityX * deltaTime) / 1000;
    this.y += (this.velocityY * deltaTime) / 1000;
    this.velocityX *= 0.99;
    this.velocityY *= 0.99;
    if (
        this.x - this.width / 2 < 0 ||
        this.x + this.width / 2 > this.game.world.width
    )
        this.velocityX *= -1;
    if (
        this.y - this.height / 2 < 0 ||
        this.y + this.height / 2 > this.game.world.height
    )
        this.velocityY *= -1;
    this.x = Math.max(
        this.width / 2,
        Math.min(this.x, this.game.world.width - this.width / 2),
    );
    this.y = Math.max(
        this.height / 2,
        Math.min(this.y, this.game.world.height - this.height / 2),
    );
}

function draw() {
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const w = this.width;
    const h = this.height;
    this.game.ctx.save();
    this.game.ctx.translate(sx, sy);
    // Body
    this.game.ctx.fillStyle = '#C8A012';
    this.game.ctx.fillRect(-w / 2, -h / 2, w, h);
    // Border
    this.game.ctx.strokeStyle = '#7A6000';
    this.game.ctx.lineWidth = 2;
    this.game.ctx.strokeRect(-w / 2, -h / 2, w, h);
    // Cross dividers
    this.game.ctx.beginPath();
    this.game.ctx.moveTo(0, -h / 2);
    this.game.ctx.lineTo(0, h / 2);
    this.game.ctx.moveTo(-w / 2, 0);
    this.game.ctx.lineTo(w / 2, 0);
    this.game.ctx.lineWidth = 1;
    this.game.ctx.stroke();
    // Health bar
    this.game.ctx.fillStyle = '#222';
    this.game.ctx.fillRect(-w / 2, -h / 2 - 7, w, 4);
    this.game.ctx.fillStyle = `hsl(${(this.health / this.maxHealth) * 120}, 100%, 45%)`;
    this.game.ctx.fillRect(
        -w / 2,
        -h / 2 - 7,
        w * (this.health / this.maxHealth),
        4,
    );
    // Tow indicator
    if (this.isTowed) {
        this.game.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        this.game.ctx.lineWidth = 1;
        this.game.ctx.setLineDash([3, 3]);
        this.game.ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
        this.game.ctx.setLineDash([]);
    }
    this.game.ctx.restore();
}

function takeDamage(amount) {
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
    if (this.isTowed && this.game.ship.towedContainer === this) {
        this.game.ship.towedContainer = null;
    }
    // 50% chance to drop contents as collectable scrap
    if (this.contents && Math.random() < 0.5) {
        const drop = createScrap(this.game, this.x, this.y, this.contents);
        this.game.scrap.push(drop);
    }
    // Debris fragments
    for (let i = 0; i < 4; i++) {
        this.game.scrap.push(createScrap(this.game, this.x, this.y, null));
    }
    const idx = this.game.containers.indexOf(this);
    if (idx !== -1) this.game.containers.splice(idx, 1);
    const eidx = this.game.entities.indexOf(this);
    if (eidx !== -1) this.game.entities.splice(eidx, 1);
}

export function createCargoContainer(game) {
    const container = {};
    initCargoContainer.call(container, game);
    container.update = update;
    container.draw = draw;
    container.takeDamage = takeDamage;
    container.destroy = destroy;
    return container;
}
