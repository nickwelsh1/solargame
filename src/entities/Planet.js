export class Planet {
    constructor(game, x, y) {
        this.name = 'planet';
        this.game = game;
        this.radius = 100;
        this.x =
            x !== undefined
                ? x
                : this.radius +
                  Math.random() * (game.world.width - this.radius * 2);
        this.y =
            y !== undefined
                ? y
                : this.radius +
                  Math.random() * (game.world.height - this.radius * 2);
    }

    update() {
        // Planets don't move, but we need this method for the game loop
    }

    draw() {
        this.game.ctx.fillStyle = 'hsl(200, 50%, 50%)';
        this.game.ctx.beginPath();
        this.game.ctx.arc(
            this.x - this.game.cameraOffset.x,
            this.y - this.game.cameraOffset.y,
            this.radius,
            0,
            Math.PI * 2,
        );
        this.game.ctx.fill();
    }
}
