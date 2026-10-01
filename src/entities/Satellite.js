import { createScrap } from './Scrap.js';

function initSatellite(game, planet, orbitRadius, initialAngle, orbitSpeed) {
    this.name = 'satellite';
    this.game = game;
    this.planet = planet;
    this.orbitRadius = orbitRadius || (planet ? planet.radius + 80 : 180);
    this.angle =
        initialAngle !== undefined ? initialAngle : Math.random() * Math.PI * 2;
    this.orbitSpeed = orbitSpeed !== undefined ? orbitSpeed : 0.00035;
    this.radius = 20;
    this.health = 200;
    this.maxHealth = 200;
    this.mass = 8000;
    this.beaconTimer = 0;

    const px = this.planet ? this.planet.x : this.game.world.width / 2;
    const py = this.planet ? this.planet.y : this.game.world.height / 2;
    this.x = px + Math.cos(this.angle) * this.orbitRadius;
    this.y = py + Math.sin(this.angle) * this.orbitRadius;
}

function update(deltaTime) {
    if (this.planet) {
        this.angle += this.orbitSpeed * deltaTime;
        if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
        if (this.angle < 0) this.angle += Math.PI * 2;
        this.x = this.planet.x + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.planet.y + Math.sin(this.angle) * this.orbitRadius;
    }
    this.beaconTimer += deltaTime;
}

function takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
        this.destroy();
    }
}

function destroy() {
    for (let i = 0; i < 6; i++) {
        this.game.scrap.push(createScrap(this.game, this.x, this.y, null));
    }
    const idx = this.game.satellites.indexOf(this);
    if (idx !== -1) this.game.satellites.splice(idx, 1);
    const eidx = this.game.entities.indexOf(this);
    if (eidx !== -1) this.game.entities.splice(eidx, 1);
}

function draw() {
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle + Math.PI / 2);

    // Solar panels
    ctx.fillStyle = '#1a446c';
    ctx.strokeStyle = '#5db0e6';
    ctx.lineWidth = 1;

    // Left panel
    ctx.fillRect(-32, -8, 18, 16);
    ctx.strokeRect(-32, -8, 18, 16);
    // Left panel grid
    ctx.beginPath();
    ctx.moveTo(-23, -8);
    ctx.lineTo(-23, 8);
    ctx.moveTo(-32, 0);
    ctx.lineTo(-14, 0);
    ctx.stroke();

    // Right panel
    ctx.fillRect(14, -8, 18, 16);
    ctx.strokeRect(14, -8, 18, 16);
    // Right panel grid
    ctx.beginPath();
    ctx.moveTo(23, -8);
    ctx.lineTo(23, 8);
    ctx.moveTo(14, 0);
    ctx.lineTo(32, 0);
    ctx.stroke();

    // Truss connectors
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    // Main chassis (central gold/silver hub)
    ctx.fillStyle = '#b0a040';
    ctx.strokeStyle = '#f0e080';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);

    // Communications dish
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -12, 6, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -17);
    ctx.stroke();

    // Blinking beacon
    const blink = Math.floor(this.beaconTimer / 400) % 2 === 0;
    ctx.fillStyle = blink ? '#00ff88' : '#004422';
    ctx.beginPath();
    ctx.arc(0, -17, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Health bar if damaged
    if (this.health < this.maxHealth) {
        ctx.fillStyle = '#222';
        ctx.fillRect(-16, 14, 32, 4);
        ctx.fillStyle = `hsl(${(this.health / this.maxHealth) * 120}, 100%, 45%)`;
        ctx.fillRect(-16, 14, 32 * (this.health / this.maxHealth), 4);
    }

    ctx.restore();
}

export function createSatellite(
    game,
    planet,
    orbitRadius,
    initialAngle,
    orbitSpeed,
) {
    const satellite = {};
    initSatellite.call(
        satellite,
        game,
        planet,
        orbitRadius,
        initialAngle,
        orbitSpeed,
    );
    satellite.update = update;
    satellite.draw = draw;
    satellite.takeDamage = takeDamage;
    satellite.destroy = destroy;
    return satellite;
}
