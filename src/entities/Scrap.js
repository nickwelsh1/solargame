import { randomMinMax } from '../utils/helpers.js';

function initScrap(game, x, y, contents) {
    this.name = 'scrap';
    this.game = game;
    this.x = x;
    this.y = y;
    this.contents = contents;
    this.width = contents ? 10 : 5;
    this.height = contents ? 7 : 4;
    this.velocityX = randomMinMax(-40, 40);
    this.velocityY = randomMinMax(-40, 40);
    this.lifespan = contents ? 30000 : 5000;
}

function update(deltaTime) {
    this.x += (this.velocityX * deltaTime) / 1000;
    this.y += (this.velocityY * deltaTime) / 1000;
    this.velocityX *= 0.995;
    this.velocityY *= 0.995;
    this.lifespan -= deltaTime;
}

function draw() {
    const alpha = this.contents ? 1 : Math.min(1, this.lifespan / 1000);
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    this.game.ctx.save();
    this.game.ctx.globalAlpha = Math.max(0, alpha);
    this.game.ctx.fillStyle = this.contents ? '#FFD700' : '#888';
    this.game.ctx.fillRect(
        sx - this.width / 2,
        sy - this.height / 2,
        this.width,
        this.height,
    );
    this.game.ctx.restore();
}

export function createScrap(game, x, y, contents) {
    const scrap = {};
    initScrap.call(scrap, game, x, y, contents);
    scrap.update = update;
    scrap.draw = draw;
    return scrap;
}
