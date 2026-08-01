export class Particle {
    constructor(game) {
        this.name = 'particle';
        this.game = game;
        this.x = Math.random() * game.world.width;
        this.y = Math.random() * game.world.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }

    update(deltaTime) {
        this.x -= (this.speedX * deltaTime) / 1000;
        this.y -= (this.speedY * deltaTime) / 1000;

        if (this.x < 0) this.x = this.game.world.width;
        if (this.x > this.game.world.width) this.x = 0;
        if (this.y < 0) this.y = this.game.world.height;
        if (this.y > this.game.world.height) this.y = 0;
    }

    draw() {
        this.game.ctx.fillStyle = 'hsla(0, 0.00%, 78.40%, 0.50)';
        this.game.ctx.beginPath();
        this.game.ctx.arc(
            this.x - this.game.cameraOffset.x,
            this.y - this.game.cameraOffset.y,
            this.size,
            0,
            Math.PI * 2,
        );
        this.game.ctx.fill();
    }
}
