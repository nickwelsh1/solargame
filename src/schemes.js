const TETHER_MAX = 250; // px; farther drag = more thrust
const PURSUIT_MAX = 300; // px; distance at which max thrust is requested

export function processPointerDown(game, event, isOnUi) {
    if (!game.ship || game.state.game_over) return;
    const scheme = game.state.inputScheme;
    switch (scheme) {
        case 'A':
            downA(game, event, isOnUi);
            break;
        case 'B':
            downB(game, isOnUi);
            break;
        case 'C':
            downC(game, event, isOnUi);
            break;
        case 'D':
            downD(game, isOnUi);
            break;
    }
}

export function processPointerMove(game, isOnUi) {
    if (!game.ship || game.state.game_over) return;
    const scheme = game.state.inputScheme;
    switch (scheme) {
        case 'A':
            moveA(game, isOnUi);
            break;
        case 'B':
            moveB(game);
            break;
        case 'C':
            moveC(game, isOnUi);
            break;
        case 'D':
            moveD(game);
            break;
    }
}

export function processPointerUp(game, isOnUi) {
    if (!game.ship || game.state.game_over) return;
    const scheme = game.state.inputScheme;
    switch (scheme) {
        case 'A':
            upA(game);
            break;
        case 'B':
            upB(game);
            break;
        case 'C':
            upC(game);
            break;
        case 'D':
            upD(game);
            break;
    }
}

/* =========================================================
   Scheme A - Original drag-from-center
   ========================================================= */

function downA(game, event, isOnUi) {
    const cx = game.camera.width / 2;
    const cy = game.camera.height / 2;
    const dist = Math.hypot(game.ui.mouseX - cx, game.ui.mouseY - cy);
    game.input.isDraggingFromCenter = dist <= game.CENTER_CIRCLE_RADIUS;

    if (game.input.isDraggingFromCenter) {
        game.input.centerHoldStartTime = performance.now();
        game.input.centerDownX = game.ui.mouseX;
        game.input.centerDownY = game.ui.mouseY;
    } else if (!isOnUi) {
        game.input.isShooting = true;
        game.ship.setRotation(game.ui.mouseX, game.ui.mouseY);
    }
}

function moveA(game, isOnUi) {
    if (game.input.isShooting && game.input.isMouseDown) {
        const cx = game.camera.width / 2;
        const cy = game.camera.height / 2;
        const dist = Math.hypot(game.ui.mouseX - cx, game.ui.mouseY - cy);
        if (dist > game.CENTER_CIRCLE_RADIUS) {
            game.ship.setRotation(game.ui.mouseX, game.ui.mouseY);
        } else {
            game.input.isShooting = false;
        }
    }
}

function upA(game) {
    if (game.input.isDraggingFromCenter) {
        const dragDist = Math.hypot(
            game.ui.mouseX - game.input.centerDownX,
            game.ui.mouseY - game.input.centerDownY,
        );
        if (dragDist > 20) {
            game.input.isBraking = false;
            game.ship.setTarget(game.ui.mouseX, game.ui.mouseY);
        } else {
            const now = performance.now();
            const isDoubleTap =
                now - game.input.lastCenterTapTime < 350 &&
                game.input.lastCenterTapTime > 0;
            game.ship.applyBrake(isDoubleTap ? 0 : 0.5, 400);
            game.input.lastCenterTapTime = isDoubleTap ? 0 : now;
        }
        game.input.isDraggingFromCenter = false;
    }
    game.input.isShooting = false;
}

/* =========================================================
   Scheme B - Spring Tether / Slingshot
   Left half = aim+tether; right half = fire
   ========================================================= */

function downB(game, isOnUi) {
    if (isOnUi) return;
    if (game.ui.mouseX < game.camera.width / 2) {
        game.input.tether = {
            active: true,
            anchorX: game.ui.mouseX,
            anchorY: game.ui.mouseY,
        };
    } else {
        game.input.isShooting = true;
        game.ship.setRotation(game.ui.mouseX, game.ui.mouseY);
    }
}

function moveB(game) {
    if (game.input.tether?.active) {
        const t = game.input.tether;
        const dx = game.ui.mouseX - t.anchorX;
        const dy = game.ui.mouseY - t.anchorY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const force = Math.min(1, dist / TETHER_MAX);
        const targetSpeed = force * game.ship.maxSpeed;
        game.ship.applyThrust(targetSpeed, angle);
    }
    if (game.input.isShooting) {
        game.ship.setRotation(game.ui.mouseX, game.ui.mouseY);
    }
}

function upB(game) {
    game.input.tether = null;
    game.input.isShooting = false;
}

/* =========================================================
   Scheme C - Touch Target Pursuit
   Active pointer pulls the ship; middle mouse = emergency brake
   ========================================================= */

function downC(game, event, isOnUi) {
    if (isOnUi) return;
    // Middle mouse button = reverse/pulse brake
    if (event && event.button === 1) {
        game.ship.applyBrake(0, 250);
        return;
    }
    game.input.pursuit = {
        active: true,
        x: game.ui.mouseX,
        y: game.ui.mouseY,
    };
    game.input.isShooting = true;
    applyPursuitThrust(game);
}

function moveC(game, isOnUi) {
    if (!game.input.pursuit?.active) return;
    if (isOnUi) {
        game.input.pursuit.active = false;
        game.input.isShooting = false;
        return;
    }
    game.input.pursuit.x = game.ui.mouseX;
    game.input.pursuit.y = game.ui.mouseY;
    game.input.isShooting = true;
    applyPursuitThrust(game);
}

function upC(game) {
    game.input.pursuit = null;
    game.input.isShooting = false;
}

function applyPursuitThrust(game) {
    const p = game.input.pursuit;
    const sx = game.camera.width / 2;
    const sy = game.camera.height / 2;
    const dx = p.x - sx;
    const dy = p.y - sy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const force = Math.min(1, dist / PURSUIT_MAX);
    const targetSpeed = force * game.ship.maxSpeed;
    game.ship.applyThrust(targetSpeed, angle);
}

/* =========================================================
   Scheme D - Radial Steering Wheel
   Left half = wheel/heading; right half = thrust + fire
   ========================================================= */

function downD(game, isOnUi) {
    if (isOnUi) return;
    if (game.ui.mouseX < game.camera.width / 2) {
        game.input.wheel = {
            active: true,
            cx: game.ui.mouseX,
            cy: game.ui.mouseY,
        };
    } else {
        game.input.thrust = true;
        game.input.isShooting = true;
    }
}

function moveD(game) {
    if (game.input.wheel?.active) {
        const w = game.input.wheel;
        const dx = game.ui.mouseX - w.cx;
        const dy = game.ui.mouseY - w.cy;
        if (Math.hypot(dx, dy) > 8) {
            const angle = Math.atan2(dy, dx);
            game.ship.applyThrust(0, angle);
        }
    }
    if (game.input.thrust) {
        game.ship.applyThrust(game.ship.maxSpeed, game.ship.angle);
    }
    if (game.input.isShooting) {
        // ship.angle already aligned by the wheel or previous heading
    }
}

function upD(game) {
    if (game.input.wheel?.active) {
        game.input.wheel = null;
    }
    game.input.thrust = false;
    game.input.isShooting = false;
}
