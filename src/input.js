import {
    processPointerDown,
    processPointerMove,
    processPointerUp,
} from './schemes.js';
import { checkBoundsRect } from './utils/helpers.js';

export function createInput() {
    return {
        isDraggingFromCenter: false,
        isMouseDown: false,
        isShootingAsteroid: false,
        isShooting: false,
        centerHoldStartTime: 0,
        isBraking: false,
        brakeStartTime: 0,
        brakeDurationMs: 400,
        brakeStartSpeed: 0,
        brakeTargetFraction: 0.5,
        lastCenterTapTime: 0,
        centerDownX: 0,
        centerDownY: 0,
        tether: null,
        pursuit: null,
        wheel: null,
        thrust: false,
    };
}

export function isUIButtonClicked(game, buttonSize) {
    // mouseX and mouseY are in gameCameraCoords
    // buttonSize Width and Height also needs button position to be in gameCameraCoords
    const point = { x: game.ui.mouseX, y: game.ui.mouseY };
    const rect = {
        x: buttonSize.posX,
        y: buttonSize.posY,
        w: buttonSize.width,
        h: buttonSize.height,
    };
    const isInBounds = checkBoundsRect(point, rect);

    // console.log(`x${mouseX} y${mouseY} px${buttonSize.posX} py${buttonSize.posY} bw${buttonSize.width} bh${buttonSize.height}`);
    return isInBounds;
}

export function handlePointerDown(event, game, callbacks) {
    // type of click: mouseDown
    game.input.isMouseDown = true;

    const rect = game.canvas.getBoundingClientRect();
    const scaleX = game.canvas.width / rect.width;
    const scaleY = game.canvas.height / rect.height;

    game.ui.mouseX = (event.clientX - rect.left) * scaleX;
    game.ui.mouseY = (event.clientY - rect.top) * scaleY;

    // Handle menu screens before any game logic
    if (game.state.screen === 'menu') {
        if (isUIButtonClicked(game, game.menuStartBtnSize)) {
            game.state.debugMode = false;
            game.state.inputScheme = 'A';
            callbacks.onStartGame();
        } else if (isUIButtonClicked(game, game.menuDebugBtnSize)) {
            game.state.debugMode = true;
            game.state.inputScheme = 'A';
            callbacks.onStartGame();
        } else if (isUIButtonClicked(game, game.menuControlsBtnSize)) {
            game.state.screen = 'controls';
        }
        return;
    }
    if (game.state.screen === 'controls') {
        if (isUIButtonClicked(game, game.menuBackBtnSize)) {
            game.state.screen = 'menu';
        }
        return;
    }

    const centerCircleX = game.camera.width / 2;
    const centerCircleY = game.camera.height / 2;
    const distToCenter = Math.hypot(
        game.ui.mouseX - centerCircleX,
        game.ui.mouseY - centerCircleY,
    );
    const isInCenterCircle = distToCenter <= game.CENTER_CIRCLE_RADIUS;

    // location of click: center circle
    if (isInCenterCircle) {
        game.input.isDraggingFromCenter = true;
        game.input.centerHoldStartTime = performance.now();
        game.input.centerDownX = game.ui.mouseX;
        game.input.centerDownY = game.ui.mouseY;
    } else {
        game.input.isDraggingFromCenter = false; // Click is outside the center circle
        game.input.centerHoldStartTime = 0; // Reset center hold time
    }

    // Add point to contrail
    game.mouseContrail.addPoint(game.ui.mouseX, game.ui.mouseY);

    console.log('pointer down');

    if (game.state.game_over && isUIButtonClicked(game, game.resetBtnSize)) {
        // if GameOver & reset btn clicked
        // reset game
        console.log('RESET Game');
        console.log(
            'GOOD isUIButtonClicked...',
            isUIButtonClicked(game, game.resetBtnSize),
        );
        callbacks.onResetGame();
    }

    if (!game.state.game_over && isUIButtonClicked(game, game.actionBtnSize)) {
        // do stuff like shoot or change weapons
        switch (game.player.currentWeapon) {
            case 'laser':
                game.player.currentWeapon = 'machineGun';
                // weaponButton.textContent = '🔫';
                break;
            case 'machineGun':
                game.player.currentWeapon = 'missile';
                // weaponButton.textContent = '🚀';
                break;
            case 'missile':
                game.player.currentWeapon = 'beam';
                // weaponButton.textContent = '⚡';
                break;
            case 'beam':
                game.player.currentWeapon = 'laser';
                // weaponButton.textContent = '🔦';
                break;
        }
        // ship.shoot();
    }

    // Handle pause button click
    if (!game.state.game_over && isUIButtonClicked(game, game.pauseBtnSize)) {
        game.state.game_paused = !game.state.game_paused;
        if (game.state.game_paused) {
            game.state.timer.pausedAt = Date.now();
        } else if (game.state.timer.pausedAt) {
            game.state.timer.totalPausedMs +=
                Date.now() - game.state.timer.pausedAt;
            game.state.timer.pausedAt = null;
        }
        console.log('Game paused:', game.state.game_paused);
    }

    // Handle cargo pickup/drop button
    if (!game.state.game_over && isUIButtonClicked(game, game.cargoBtnSize)) {
        if (game.ship.towedContainer) {
            // Drop the container
            const c = game.ship.towedContainer;
            c.isTowed = false;
            c.velocityX =
                Math.cos(game.ship.movementAngle) *
                game.ship.speed *
                1000 *
                0.5;
            c.velocityY =
                Math.sin(game.ship.movementAngle) *
                game.ship.speed *
                1000 *
                0.5;
            game.ship.towedContainer = null;
            console.log('Container dropped');
        } else {
            // Pick up nearest container within range
            const PICKUP_RANGE = 80;
            let nearest = null;
            let nearestDist = Infinity;
            for (const c of game.containers) {
                if (c.isTowed) continue;
                const dist = Math.hypot(game.ship.x - c.x, game.ship.y - c.y);
                if (dist < PICKUP_RANGE && dist < nearestDist) {
                    nearest = c;
                    nearestDist = dist;
                }
            }
            if (nearest) {
                nearest.isTowed = true;
                game.ship.towedContainer = nearest;
                console.log('Container picked up');
            }
        }
    }

    // Handle scheme-swap button in debug mode
    if (
        game.state.debugMode &&
        !game.state.game_over &&
        isUIButtonClicked(game, game.schemeBtnSize)
    ) {
        const schemes = ['A', 'B', 'C', 'D'];
        const nextIndex =
            (schemes.indexOf(game.state.inputScheme) + 1) % schemes.length;
        game.state.inputScheme = schemes[nextIndex];
        game.input.tether = null;
        game.input.pursuit = null;
        game.input.wheel = null;
        game.input.thrust = false;
        game.input.isShooting = false;
        game.input.isDraggingFromCenter = false;
        return;
    }

    // Delegate all in-game pointer handling to the active input scheme
    const isOnUIButton =
        isUIButtonClicked(game, game.actionBtnSize) ||
        isUIButtonClicked(game, game.pauseBtnSize) ||
        isUIButtonClicked(game, game.cargoBtnSize) ||
        (game.state.debugMode && isUIButtonClicked(game, game.schemeBtnSize));
    processPointerDown(game, event, isOnUIButton);
}

export function handlePointerMove(event, game) {
    const rect = game.canvas.getBoundingClientRect();
    const scaleX = game.canvas.width / rect.width;
    const scaleY = game.canvas.height / rect.height;
    game.ui.mouseX = (event.clientX - rect.left) * scaleX;
    game.ui.mouseY = (event.clientY - rect.top) * scaleY;

    // Check if pointer is still within canvas bounds
    const isWithinCanvas =
        game.ui.mouseX >= 0 &&
        game.ui.mouseX <= game.canvas.width &&
        game.ui.mouseY >= 0 &&
        game.ui.mouseY <= game.canvas.height;

    if (isWithinCanvas && !game.state.game_over) {
        // Add point to contrail
        game.mouseContrail.addPoint(game.ui.mouseX, game.ui.mouseY);

        // Delegate movement/rotation to the active input scheme
        const isOnUIButton =
            isUIButtonClicked(game, game.actionBtnSize) ||
            isUIButtonClicked(game, game.pauseBtnSize) ||
            isUIButtonClicked(game, game.cargoBtnSize) ||
            (game.state.debugMode &&
                isUIButtonClicked(game, game.schemeBtnSize));
        processPointerMove(game, isOnUIButton);
    }
}

export function handlePointerUp(game) {
    if (!game.state.game_over) {
        processPointerUp(game, false);
    }

    game.input.isMouseDown = false;
    game.input.centerHoldStartTime = 0;
    console.log('pointer up');
}

export function setupInputListeners(game, callbacks) {
    game.canvas.addEventListener('mousedown', (e) =>
        handlePointerDown(e, game, callbacks),
    );
    game.canvas.addEventListener('mousemove', (e) =>
        handlePointerMove(e, game),
    );
    game.canvas.addEventListener('mouseup', () => handlePointerUp(game));
    game.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handlePointerDown(e.touches[0], game, callbacks);
    });
    game.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handlePointerMove(e.touches[0], game);
    });
    game.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        handlePointerUp(game);
    });
}
