export class Beam {
    constructor(game, x, y, angle) {
        this.name = 'beam';
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.length = 400;
        this.radius = 8;
        this.lifespan = 200;
        this.createdAt = performance.now();
        this.endX = this.x + Math.cos(this.angle) * this.length;
        this.endY = this.y + Math.sin(this.angle) * this.length;
    }

    update(deltaTime) {
        this.lifespan -= deltaTime;
    }

    draw() {
        const ctx = this.game.ctx;
        const offset = this.game.cameraOffset;

        ctx.save();

        const gradient = ctx.createLinearGradient(
            this.x - offset.x,
            this.y - offset.y,
            this.endX - offset.x,
            this.endY - offset.y,
        );
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 200, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0.2)');

        ctx.beginPath();
        ctx.moveTo(this.x - offset.x, this.y - offset.y);
        ctx.lineTo(this.endX - offset.x, this.endY - offset.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.radius * 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.x - offset.x, this.y - offset.y);
        ctx.lineTo(this.endX - offset.x, this.endY - offset.y);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = this.radius * 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    }

    isPointInBeam(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const beamDx = Math.cos(this.angle);
        const beamDy = Math.sin(this.angle);
        const projection = dx * beamDx + dy * beamDy;

        if (projection < 0 || projection > this.length) {
            return false;
        }

        const closestX = this.x + beamDx * projection;
        const closestY = this.y + beamDy * projection;
        const distance = Math.hypot(px - closestX, py - closestY);

        return distance <= this.radius;
    }
}
