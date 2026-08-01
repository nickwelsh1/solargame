import { randomMinMax } from '../utils/helpers.js';

export class Asteroid {
    constructor(game, x, y, radius) {
        this.game = game;
        this.name = 'asteroid';
        this.x = x || randomMinMax(10, this.game.world.width - 100);
        this.y = y || randomMinMax(10, this.game.world.height - 100);
        this.radius = radius || randomMinMax(30, 45);
        this.velocityX = randomMinMax(2, 20) * 2;
        this.velocityY = randomMinMax(2, 20) * 2;
        // color in HSL (degrees, percentage, percentage)
        this.hue = randomMinMax(10, 30); // + 340
        this.saturation = randomMinMax(50, 90);
        this.lightness = randomMinMax(10, 20); // Increased minimum to 45 and range to give 45-80
        this.mass = Math.PI * this.radius * this.radius * 3;

        // Add rotation properties
        this.rotationAngle = Math.random() * Math.PI * 2; // Random initial rotation
        this.rotationSpeed = (randomMinMax(2, 20) * Math.PI) / 180; // Random spin

        this.sides = 10;
        this.angleIncrement = (Math.PI * 2) / this.sides;
        this.vertices = [];

        for (let i = 0; i < this.sides; i++) {
            const angle = i * this.angleIncrement + Math.random() * 0.4 - 0.2;
            const r = this.radius * (1 + Math.random() * 0.3 - 0.15);
            this.vertices.push({
                x: r * Math.cos(angle),
                y: r * Math.sin(angle),
            });
        }
    }

    draw() {
        this.game.ctx.save(); // Save the current context state
        this.game.ctx.translate(
            this.x - this.game.cameraOffset.x,
            this.y - this.game.cameraOffset.y,
        ); // Translate to asteroid position
        this.game.ctx.rotate(this.rotationAngle); // Apply rotation

        this.game.ctx.beginPath();
        // Start at the first vertex (now relative to 0,0 since we've translated)
        this.game.ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

        for (let i = 1; i < this.sides; i++) {
            this.game.ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }

        this.game.ctx.closePath();
        this.game.ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
        this.game.ctx.fill();

        this.game.ctx.restore(); // Restore the context state
    }

    update(deltaTime) {
        // deltaTime means time between frames

        // update asteroid position relative to world?
        this.x += (this.velocityX * deltaTime) / 1000;
        this.y += (this.velocityY * deltaTime) / 1000;

        // Update rotation angle based on rotation speed and deltaTime
        this.rotationAngle += (this.rotationSpeed * deltaTime) / 1000;

        // Keep rotation angle between 0 and 2*PI
        if (this.rotationAngle > Math.PI * 2) {
            this.rotationAngle -= Math.PI * 2;
        } else if (this.rotationAngle < 0) {
            this.rotationAngle += Math.PI * 2;
        }

        // keep asteroid bound to world
        if (this.x < 0 || this.x > this.game.world.width) this.velocityX *= -1;
        if (this.y < 0 || this.y > this.game.world.height) this.velocityY *= -1;

        this.x = Math.max(0, Math.min(this.x, this.game.world.width));
        this.y = Math.max(0, Math.min(this.y, this.game.world.height));
    }

    split() {
        if (this.game.entities.length > this.game.CONFIG.MAX_ENTITIES)
            return [];
        if (this.radius < this.game.CONFIG.MIN_ASTEROID_SIZE) return [];

        const newRadius = this.radius * 0.5;

        // Add new asteroids
        const newAsteroid1 = new Asteroid(this.game, this.x, this.y, newRadius);
        const newAsteroid2 = new Asteroid(this.game, this.x, this.y, newRadius);

        // Increase rotation speed of the new asteroids (1.5-2.5 times faster)
        const rotationalSpeedChangeAmt = randomMinMax(2, 5);

        newAsteroid1.rotationSpeed =
            this.rotationSpeed * rotationalSpeedChangeAmt;
        newAsteroid2.rotationSpeed =
            this.rotationSpeed * rotationalSpeedChangeAmt;

        // Add new asteroids directly to the arrays
        this.game.asteroids.push(newAsteroid1, newAsteroid2);
        this.game.entities.push(newAsteroid1, newAsteroid2);

        return [newAsteroid1, newAsteroid2];
    }
}
