function initWarpGate(game, x, y, id) {
    this.name = 'warpgate';
    this.game = game;
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = 45;
    this.targetGate = null;
    this.cooldown = 0;
    this.vortexAngle = 0;
}

function link(otherGate) {
    this.targetGate = otherGate;
}

function update(deltaTime) {
    this.vortexAngle += 0.003 * deltaTime;
    if (this.cooldown > 0) {
        this.cooldown -= deltaTime;
    }
}

function teleport(ship) {
    if (this.cooldown > 0 || !this.targetGate) return false;

    const dest = this.targetGate;
    const cooldownDuration = 2500;
    this.cooldown = cooldownDuration;
    dest.cooldown = cooldownDuration;

    // Teleport ship slightly ahead in its movement angle
    const exitAngle =
        ship.movementAngle !== undefined ? ship.movementAngle : ship.angle;
    const exitDist = 65;
    ship.x = dest.x + Math.cos(exitAngle) * exitDist;
    ship.y = dest.y + Math.sin(exitAngle) * exitDist;

    // Ensure within world bounds
    ship.x = Math.max(
        ship.radius,
        Math.min(this.game.world.width - ship.radius, ship.x),
    );
    ship.y = Math.max(
        ship.radius,
        Math.min(this.game.world.height - ship.radius, ship.y),
    );

    // Teleport towed container along with the ship
    if (ship.towedContainer) {
        ship.towedContainer.x = ship.x - Math.cos(ship.angle) * 50;
        ship.towedContainer.y = ship.y - Math.sin(ship.angle) * 50;
        ship.towedContainer.velocityX = 0;
        ship.towedContainer.velocityY = 0;
    }

    // Immediately snap camera to ship
    this.game.cameraOffset.x = ship.x - this.game.camera.width / 2;
    this.game.cameraOffset.y = ship.y - this.game.camera.height / 2;

    return true;
}

function draw() {
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    ctx.save();
    ctx.translate(sx, sy);

    const isReady = this.cooldown <= 0;
    const primaryColor = isReady ? 'hsl(280, 100%, 70%)' : 'hsl(30, 90%, 55%)';
    const glowColor = isReady
        ? 'rgba(180, 50, 255, 0.4)'
        : 'rgba(255, 120, 0, 0.3)';

    // Swirling portal vortex
    const vortexRadius = this.radius * 0.75;
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, vortexRadius);
    grad.addColorStop(
        0,
        isReady ? 'rgba(240, 200, 255, 0.95)' : 'rgba(255, 200, 150, 0.9)',
    );
    grad.addColorStop(
        0.5,
        isReady ? 'rgba(150, 0, 240, 0.6)' : 'rgba(200, 80, 0, 0.5)',
    );
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, vortexRadius, 0, Math.PI * 2);
    ctx.fill();

    // Swirl streaks
    ctx.rotate(this.vortexAngle);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, vortexRadius * 0.65, a, a + Math.PI * 0.45);
        ctx.stroke();
    }

    // Outer structural ring
    ctx.rotate(-this.vortexAngle);
    ctx.strokeStyle = '#445577';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing energy ring
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isReady ? 15 : 6;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4 Emitter pylons
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Label
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.id ? this.id.toUpperCase() : 'GATE', 0, this.radius + 16);

    ctx.restore();
}

export function createWarpGate(game, x, y, id) {
    const gate = {};
    initWarpGate.call(gate, game, x, y, id);
    gate.link = link;
    gate.update = update;
    gate.teleport = teleport;
    gate.draw = draw;
    return gate;
}
