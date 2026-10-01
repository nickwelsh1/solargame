function initExplosion(game, x, y, maxRadius = 70, duration = 450) {
    this.name = 'explosion';
    this.game = game;
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.startTime = performance.now();
    this.finished = false;

    // Fiery blast spark particles
    this.sparks = [];
    const sparkCount = 12;
    for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 0.7 + 0.3) * (maxRadius * 2.8);
        this.sparks.push({
            x: 0,
            y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 2,
        });
    }
}

function update(deltaTime) {
    const elapsed = performance.now() - this.startTime;
    if (elapsed >= this.duration) {
        this.finished = true;
        return true;
    }

    const dtSec = deltaTime / 1000;
    for (let i = 0; i < this.sparks.length; i++) {
        const s = this.sparks[i];
        s.x += s.vx * dtSec;
        s.y += s.vy * dtSec;
        s.vx *= 0.94;
        s.vy *= 0.94;
    }

    return false;
}

function draw() {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(1, elapsed / this.duration);
    const radius = this.maxRadius * Math.sin((progress * Math.PI) / 2);
    const alpha = 1 - progress;

    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    ctx.save();
    ctx.translate(sx, sy);

    // Shockwave blast ring
    ctx.strokeStyle = `rgba(255, 180, 50, ${alpha * 0.8})`;
    ctx.lineWidth = Math.max(1, 4 * (1 - progress));
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Central expanding fireball
    const innerRadius = radius * 0.65;
    if (innerRadius > 1) {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
        grad.addColorStop(0, `rgba(255, 255, 220, ${alpha * 0.95})`);
        grad.addColorStop(0.35, `rgba(255, 140, 20, ${alpha * 0.85})`);
        grad.addColorStop(0.75, `rgba(200, 40, 0, ${alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(100, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Fiery blast embers / sparks
    for (let i = 0; i < this.sparks.length; i++) {
        const s = this.sparks[i];
        ctx.fillStyle = `rgba(255, ${Math.floor(200 * (1 - progress))}, 30, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function createExplosion(game, x, y, maxRadius, duration) {
    const explosion = {};
    initExplosion.call(explosion, game, x, y, maxRadius, duration);
    explosion.update = update;
    explosion.draw = draw;
    return explosion;
}
