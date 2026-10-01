function initResearchStation(game, x, y) {
    this.name = 'research_station';
    this.game = game;
    this.x = x || game.world.width * 0.75;
    this.y = y || game.world.height * 0.25;
    this.radius = 55;
    this.deliveryRadius = 95;
    this.deliveredCount = 0;
    this.targetCount = 3;
    this.rotationAngle = 0;
    this.pulseTimer = 0;
}

function checkDelivery() {
    if (this.game.state.game_over || this.game.state.game_won) return;

    for (let i = this.game.containers.length - 1; i >= 0; i--) {
        const c = this.game.containers[i];
        const dist = Math.hypot(this.x - c.x, this.y - c.y);

        if (dist <= this.deliveryRadius) {
            // Container arrived at research station!
            if (this.game.ship && this.game.ship.towedContainer === c) {
                this.game.ship.towedContainer = null;
            }
            c.isTowed = false;

            // Remove container from arrays
            this.game.containers.splice(i, 1);
            const eidx = this.game.entities.indexOf(c);
            if (eidx !== -1) this.game.entities.splice(eidx, 1);

            this.deliveredCount++;
            this.game.state.deliveredContainers = this.deliveredCount;

            // Check win condition
            if (this.deliveredCount >= this.targetCount) {
                this.triggerWin();
            }
            break;
        }
    }
}

function triggerWin() {
    this.game.state.game_won = true;
    this.game.state.game_over = true;

    if (this.game.state.timer.interval) {
        clearInterval(this.game.state.timer.interval);
    }

    this.game.ui.dialogueText =
        'MISSION COMPLETE!\n3 Containers Delivered to Station';
}

function update(deltaTime) {
    this.rotationAngle += 0.0006 * deltaTime;
    this.pulseTimer += deltaTime;
    this.checkDelivery();
}

function draw() {
    const sx = this.x - this.game.cameraOffset.x;
    const sy = this.y - this.game.cameraOffset.y;
    const ctx = this.game.ctx;

    ctx.save();
    ctx.translate(sx, sy);

    // Delivery zone perimeter
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTimer * 0.003);
    ctx.strokeStyle = `rgba(0, 255, 200, ${0.25 + pulse * 0.25})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, this.deliveryRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotating habitat arms and solar arrays
    ctx.save();
    ctx.rotate(this.rotationAngle);

    // 3 Radial arms
    for (let i = 0; i < 3; i++) {
        const armAngle = (i / 3) * Math.PI * 2;
        ctx.save();
        ctx.rotate(armAngle);

        // Arm truss
        ctx.fillStyle = '#445566';
        ctx.fillRect(-5, 0, 10, 48);

        // Outer pod
        ctx.fillStyle = '#00aa99';
        ctx.strokeStyle = '#00ffd5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 48, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Solar panels perpendicular to arm
        ctx.fillStyle = '#103050';
        ctx.strokeStyle = '#3080c0';
        ctx.lineWidth = 1;
        ctx.fillRect(-22, 28, 14, 12);
        ctx.strokeRect(-22, 28, 14, 12);
        ctx.fillRect(8, 28, 14, 12);
        ctx.strokeRect(8, 28, 14, 12);

        ctx.restore();
    }
    ctx.restore();

    // Central hub dome
    ctx.fillStyle = '#1b2838';
    ctx.strokeStyle = '#00ffd5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lab core window
    ctx.fillStyle = '#00ffd5';
    ctx.shadowColor = '#00ffd5';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Delivery progress indicator (e.g. 3 container slots)
    const slotW = 12;
    const slotH = 7;
    const startX = -((3 * slotW + 2 * 4) / 2);
    const boxY = -36;

    for (let i = 0; i < this.targetCount; i++) {
        const bx = startX + i * (slotW + 4);
        const filled = i < this.deliveredCount;
        ctx.fillStyle = filled ? '#00ffd5' : 'rgba(0, 50, 50, 0.6)';
        ctx.strokeStyle = filled ? '#ffffff' : '#00aa88';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx, boxY, slotW, slotH);
        ctx.strokeRect(bx, boxY, slotW, slotH);
    }

    // Station name label
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00ffd5';
    ctx.fillText('RESEARCH STATION', 0, this.deliveryRadius + 16);

    ctx.restore();
}

export function createResearchStation(game, x, y) {
    const station = {};
    initResearchStation.call(station, game, x, y);
    station.checkDelivery = checkDelivery;
    station.triggerWin = triggerWin;
    station.update = update;
    station.draw = draw;
    return station;
}
