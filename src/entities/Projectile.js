export class Projectile {
    constructor(game, x, y, angle, speed = 1000, radius, lifespan = 6000) {
        this.name = 'projectile';
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = radius;
        this.lifespan = lifespan;
        this.mass = Math.PI * this.radius * this.radius;
    }

    update(deltaTime) {
        this.x += (Math.cos(this.angle) * this.speed * deltaTime) / 1000;
        this.y += (Math.sin(this.angle) * this.speed * deltaTime) / 1000;
        this.lifespan -= deltaTime;
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.beginPath();
        ctx.moveTo(
            this.x - this.game.cameraOffset.x,
            this.y - this.game.cameraOffset.y,
        );
        ctx.lineTo(
            this.x - this.game.cameraOffset.x + Math.cos(this.angle) * 10,
            this.y - this.game.cameraOffset.y + Math.sin(this.angle) * 10,
        );
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

export class Laser extends Projectile {
    constructor(game, x, y, angle) {
        super(game, x, y, angle, 6000, 10, 100);
        this.name = 'laser';
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.beginPath();
        ctx.moveTo(
            this.x - this.game.cameraOffset.x,
            this.y - this.game.cameraOffset.y,
        );
        ctx.lineTo(
            this.x -
                this.game.cameraOffset.x +
                (Math.cos(this.angle) * this.speed * this.lifespan) / 1000,
            this.y -
                this.game.cameraOffset.y +
                (Math.sin(this.angle) * this.speed * this.lifespan) / 1000,
        );
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

export class Bullet extends Projectile {
    constructor(game, x, y, angle) {
        super(game, x, y, angle, 1000, 3, 3000);
        this.name = 'bullet';
    }
}

export class Missile extends Projectile {
    constructor(game, x, y, angle) {
        super(game, x, y, angle, 10, 5, 6000); // Start with initial speed of 10
        this.name = 'missile';
        this.initialSpeed = 100;
        this.maxSpeed = 1000;
        this.timeSinceLaunch = 0;
    }

    update(deltaTime) {
        this.timeSinceLaunch += deltaTime;
        // Calculate how many 50ms intervals have passed
        const intervals = Math.floor(this.timeSinceLaunch / 50);
        // Speed doubles every interval, but is capped at maxSpeed
        this.speed = Math.min(
            this.initialSpeed * 1.1 ** intervals,
            this.maxSpeed,
        );

        // Use the parent class's movement logic with our updated speed
        this.x += (Math.cos(this.angle) * this.speed * deltaTime) / 1000;
        this.y += (Math.sin(this.angle) * this.speed * deltaTime) / 1000;
        this.lifespan -= deltaTime;
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.save();
        ctx.translate(
            this.x - this.game.cameraOffset.x,
            this.y - this.game.cameraOffset.y,
        );
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(-this.radius * 2, -this.radius);
        ctx.lineTo(-this.radius * 2, this.radius);
        ctx.closePath();
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.restore();
    }
}
