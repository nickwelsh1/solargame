import * as assets from './assets.js';
import { isUIButtonClicked } from './input.js';
import { isPointOverAsteroid } from './systems/collisions.js';
import { checkTimer } from './systems/timer.js';

function drawWorldBorder(ctx, game) {
    ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    ctx.lineWidth = 4;
    ctx.strokeRect(
        -game.cameraOffset.x,
        -game.cameraOffset.y,
        game.world.width,
        game.world.height,
    );
}

function drawMiniMap(ctx, game) {
    const minimapSize = {
        width: game.MINIMAP_SCALE,
        height: (game.world.height / game.world.width) * game.MINIMAP_SCALE,
    };

    // message.innerText = `| map ${MINIMAP_MARGIN}`;

    // Save the current context state
    ctx.save();

    // Set up the mini-map area
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0, 0, 3, 0.5)';
    ctx.fillRect(
        game.MINIMAP_MARGIN,
        game.MINIMAP_MARGIN,
        minimapSize.width,
        minimapSize.height,
    );

    // Draw mini world border
    ctx.strokeStyle = 'hsl(221, 12.20%, 45.10%)';
    ctx.strokeRect(
        game.MINIMAP_MARGIN,
        game.MINIMAP_MARGIN,
        minimapSize.width,
        minimapSize.height,
    );
    ctx.fill();

    // Calculate the scale factor for objects within the mini-map
    const scaleFactor = minimapSize.width / game.world.width;

    // Draw mini asteroids
    game.asteroids.forEach((asteroid) => {
        ctx.fillStyle = `hsl(0, 100%, 59%)`;
        ctx.fillRect(
            game.MINIMAP_MARGIN + asteroid.x * scaleFactor,
            game.MINIMAP_MARGIN + asteroid.y * scaleFactor,
            2,
            2,
        );
        // ctx.beginPath();
        // ctx.arc(
        //     MINIMAP_MARGIN + asteroid.x * scaleFactor,
        //     MINIMAP_MARGIN + asteroid.y * scaleFactor,
        //     2,
        //     0,
        //     Math.PI * 2
        // );
        ctx.fill();
    });

    // Draw discovered containers
    game.containers.forEach((container) => {
        if (container.discovered) {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(
                game.MINIMAP_MARGIN + container.x * scaleFactor - 1,
                game.MINIMAP_MARGIN + container.y * scaleFactor - 1,
                3,
                3,
            );
        }
    });

    // Draw mini planets
    game.planets.forEach((planet) => {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(
            game.MINIMAP_MARGIN + planet.x * scaleFactor,
            game.MINIMAP_MARGIN + planet.y * scaleFactor,
            4,
            4,
        );
    });

    // Draw mini ship
    ctx.fillStyle = 'yellow';
    ctx.fillRect(
        game.MINIMAP_MARGIN + game.ship.x * scaleFactor,
        game.MINIMAP_MARGIN + game.ship.y * scaleFactor,
        2,
        2,
    );
    // ctx.beginPath();
    // ctx.arc(
    //     MINIMAP_MARGIN + ship.x * scaleFactor,
    //     MINIMAP_MARGIN + ship.y * scaleFactor,
    //     3,
    //     0,
    //     Math.PI * 2
    // );
    ctx.fill();

    // Draw mini view area
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'hsla(170, 60%, 30%, 0.4)';
    ctx.strokeRect(
        game.MINIMAP_MARGIN +
        (game.ship.x - game.camera.width / 2) * scaleFactor,
        game.MINIMAP_MARGIN +
        (game.ship.y - game.camera.height / 2) * scaleFactor,
        game.camera.width * scaleFactor,
        game.camera.height * scaleFactor,
    );

    // Restore the context state
    ctx.restore();
}

function drawPauseIcon(ctx, game) {
    drawRectangle(ctx, game.pauseBtnIcon);
    drawRectangle(ctx, game.pauseBtnIcon, {
        x: game.CENTER_CIRCLE_RADIUS * 0.76,
        y: 0,
    });
}

function drawDebugSchemeButton(ctx, game) {
    if (!game.state.debugMode) return;
    const label = `SCH: ${game.state.inputScheme}`;
    drawRectangle(ctx, game.schemeBtnSize, { x: 0, y: 0 }, 'hsla(220, 80%, 45%, 0.75)');
    ctx.font = `bold ${Math.round(game.schemeBtnSize.height * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(
        label,
        game.schemeBtnSize.posX + game.schemeBtnSize.width / 2,
        game.schemeBtnSize.posY + game.schemeBtnSize.height / 2,
    );
}

function drawCargoButton(ctx, game) {
    const hasTowed = game.ship && game.ship.towedContainer !== null;
    const nearbyContainer = game.containers.find(
        (c) =>
            !c.isTowed && Math.hypot(game.ship.x - c.x, game.ship.y - c.y) < 80,
    );
    const canPickup = !hasTowed && nearbyContainer;
    const colour = hasTowed
        ? 'hsla(120, 80%, 35%, 0.85)'
        : canPickup
            ? 'hsla(55, 100%, 45%, 0.75)'
            : 'hsla(0, 0%, 35%, 0.45)';
    drawRectangle(ctx, game.cargoBtnSize, { x: 0, y: 0 }, colour);
    ctx.font = `bold ${Math.round(game.cargoBtnSize.height * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(
        hasTowed ? 'DROP' : 'PICK',
        game.cargoBtnSize.posX + game.cargoBtnSize.width / 2,
        game.cargoBtnSize.posY + game.cargoBtnSize.height / 2,
    );
}

function drawMenuBackground(ctx, game) {
    const bg = ctx.createLinearGradient(0, 0, 0, game.camera.height);
    bg.addColorStop(0.0, '#7A4827');
    bg.addColorStop(0.33, '#772F1F');
    bg.addColorStop(0.66, '#5D1E18');
    bg.addColorStop(1.0, '#401111');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, game.camera.width, game.camera.height);
}

function drawMenuButton(ctx, btnSize, label, active) {
    ctx.fillStyle = active
        ? 'hsla(40, 100%, 60%, 0.85)'
        : 'hsla(0, 0%, 100%, 0.12)';
    ctx.strokeStyle = active
        ? 'hsla(40, 100%, 75%, 1)'
        : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.fillRect(btnSize.posX, btnSize.posY, btnSize.width, btnSize.height);
    ctx.strokeRect(btnSize.posX, btnSize.posY, btnSize.width, btnSize.height);
    ctx.font = `bold ${Math.round(btnSize.height * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? '#1a0a00' : 'white';
    ctx.fillText(
        label,
        btnSize.posX + btnSize.width / 2,
        btnSize.posY + btnSize.height / 2,
    );
}

function drawMainMenu(ctx, game) {
    drawMenuBackground(ctx, game);
    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'hsla(40, 100%, 70%, 1)';
    const titleSize = Math.min(
        Math.round(game.camera.height * 0.09),
        Math.round(game.camera.width * 0.11),
    );
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.fillText(
        'SOLAR GAME',
        game.camera.width / 2,
        game.camera.height * 0.25,
    );
    // Subtitle
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const subSize = Math.round(game.camera.height * 0.03);
    ctx.font = `${subSize}px sans-serif`;
    const subtitle = 'navigate · salvage · survive';
    const subY = game.camera.height * 0.34;
    if (ctx.measureText(subtitle).width > game.camera.width * 0.82) {
        ctx.fillText(
            'navigate · salvage',
            game.camera.width / 2,
            subY - subSize * 0.7,
        );
        ctx.fillText('· survive', game.camera.width / 2, subY + subSize * 0.7);
    } else {
        ctx.fillText(subtitle, game.camera.width / 2, subY);
    }
    // Buttons
    const nearStart = isUIButtonClicked(game, game.menuStartBtnSize);
    const nearCtrl = isUIButtonClicked(game, game.menuControlsBtnSize);
    const nearDebug = isUIButtonClicked(game, game.menuDebugBtnSize);
    drawMenuButton(ctx, game.menuStartBtnSize, 'START GAME', nearStart);
    drawMenuButton(ctx, game.menuControlsBtnSize, 'CONTROLS', nearCtrl);
    drawMenuButton(ctx, game.menuDebugBtnSize, 'DEBUG MODE', nearDebug);
}

function drawControlsScreen(ctx, game) {
    drawMenuBackground(ctx, game);
    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'hsla(40, 100%, 70%, 1)';
    ctx.font = `bold ${Math.round(game.camera.height * 0.07)}px sans-serif`;
    ctx.fillText('CONTROLS', game.camera.width / 2, game.camera.height * 0.14);
    // Control list
    const items = [
        ['Tap / Click', 'Move ship toward cursor'],
        ['Hold center circle', 'Brake'],
        ['Weapon button', 'Cycle weapons'],
        ['Pause button', 'Pause / Unpause'],
        ['PICK button', 'Pick up nearby cargo container'],
        ['DROP button', 'Drop towed cargo container'],
    ];
    const lineH = Math.min(game.camera.height * 0.072, 46);
    const startY = game.camera.height * 0.26;
    const colLabel = game.camera.width * 0.08;
    const colDesc = game.camera.width * 0.52;
    const fontSize = Math.round(lineH * 0.38);
    ctx.textBaseline = 'middle';
    items.forEach(([label, desc], i) => {
        const y = startY + i * lineH;
        ctx.textAlign = 'left';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'hsla(40, 100%, 65%, 1)';
        ctx.fillText(label, colLabel, y);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(desc, colDesc, y);
    });
    // Back button
    drawMenuButton(
        ctx,
        game.menuBackBtnSize,
        'BACK',
        isUIButtonClicked(game, game.menuBackBtnSize),
    );
}

function drawHUD(ctx, game) {
    const timeText =
        game.state.timer.timerExpired || !game.state.timer.startTime
            ? '00:00'
            : checkTimer(game);
    const fontSize = Math.min(
        Math.round(
            Math.min(game.camera.height * 0.038, game.camera.width * 0.045),
        ),
        16,
    );
    const lineH = fontSize * 1.5;
    const remaining = game.containers.filter((c) => !c.destroyed).length;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(
        `Score: ${game.state.score}   |   ${timeText}`,
        game.camera.width / 2,
        10,
    );
    ctx.fillText(
        `${remaining}/${game.state.initialContainerCount} containers   |   ${game.planets.length} planets`,
        game.camera.width / 2,
        10 + lineH,
    );
    ctx.restore();
}

function drawRectangle(ctx, buttonSize, offset = { x: 0, y: 0 }, colour) {
    const fill = colour || 'hsla(320, 100%, 83%, 0.50)';
    // Stroke style
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'pink';
    ctx.lineWidth = 2;
    // Draw the rectangle fill
    ctx.fillRect(
        buttonSize.posX + offset.x,
        buttonSize.posY + offset.y,
        buttonSize.width,
        buttonSize.height,
    );
    // Draw the rectangle stroke
    ctx.strokeRect(
        buttonSize.posX + offset.x,
        buttonSize.posY + offset.y,
        buttonSize.width,
        buttonSize.height,
    );
}

function drawCursorDot(ctx, game, isOverAsteroid) {
    // Draw contrail first
    game.mouseContrail.draw();

    // Then draw the cursor dot
    ctx.beginPath();
    ctx.rect(game.ui.mouseX - 3, game.ui.mouseY - 3, 6, 6);
    ctx.fillStyle = isOverAsteroid ? 'yellow' : 'white';
    ctx.fill();
    ctx.closePath();
}

function drawSVGImg(ctx, img, scale = 1) {
    assets.drawSVGImg(ctx, img, scale);
}

function drawCenterCircle(ctx, game, radius) {
    const centerX = game.camera.width / 2;
    const centerY = game.camera.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    // ctx.fillStyle = 'white';
    // ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
}

function drawDragFromCenterLine(ctx, game) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(game.camera.width / 2, game.camera.height / 2);
    ctx.lineTo(game.ui.mouseX, game.ui.mouseY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function drawBrakingEffect(ctx, game, brakeProgress) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
        game.camera.width / 2,
        game.camera.height / 2,
        game.CENTER_CIRCLE_RADIUS * brakeProgress,
        0,
        Math.PI * 2,
    );
    ctx.fillStyle = `rgba(200, 200, 200, ${0.3 + brakeProgress * 0.3})`;
    ctx.fill();
    ctx.restore();
}

export function createRenderer() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    return {
        canvas,
        ctx,
        draw(game, _timestamp) {
            if (game.state.screen === 'menu') {
                drawMainMenu(this.ctx, game);
                drawCursorDot(this.ctx, game, false);
                return;
            }
            if (game.state.screen === 'controls') {
                drawControlsScreen(this.ctx, game);
                drawCursorDot(this.ctx, game, false);
                return;
            }

            const bg = this.ctx.createLinearGradient(
                0,
                -game.cameraOffset.y,
                0,
                game.world.height - game.cameraOffset.y,
            );
            bg.addColorStop(0.0, '#7A4827');
            bg.addColorStop(0.33, '#772F1F');
            bg.addColorStop(0.66, '#5D1E18');
            bg.addColorStop(1.0, '#401111');
            this.ctx.fillStyle = bg;
            this.ctx.fillRect(0, 0, game.camera.width, game.camera.height);

            drawWorldBorder(this.ctx, game);

            game.particles.forEach((particle) => {
                particle.draw();
            });

            game.planets.forEach((planet) => {
                planet.draw();
            });

            game.scrap.forEach((s) => {
                s.draw();
            });

            game.containers.forEach((container) => {
                if (!container.isTowed) container.draw();
            });

            game.ship.draw();

            game.asteroids.forEach((asteroid) => {
                asteroid.draw();
            });

            game.projectiles.forEach((projectile) => {
                projectile.draw();
            });

            game.beams.forEach((beam) => {
                beam.draw();
            });

            drawMiniMap(this.ctx, game);
            drawHUD(this.ctx, game);
            drawRectangle(
                this.ctx,
                game.actionBtnSize,
                { x: 0, y: 0 },
                'hsla(64, 100%, 82%, 0.5)',
            );
            drawRectangle(this.ctx, game.pauseBtnSize);
            drawPauseIcon(this.ctx, game);
            drawCargoButton(this.ctx, game);
            drawDebugSchemeButton(this.ctx, game);

            drawCenterCircle(this.ctx, game, game.CENTER_CIRCLE_RADIUS);
            drawCenterCircle(this.ctx, game, game.CENTER_LOWTHRUST_RADIUS);
            drawCenterCircle(this.ctx, game, game.CENTER_MAXTHRUST_RADIUS);

            if (game.input.isDraggingFromCenter && game.input.isMouseDown) {
                const currentTime = performance.now();

                drawDragFromCenterLine(this.ctx, game);

                if (game.input.isBraking) {
                    const brakeProgress = Math.min(
                        1,
                        (currentTime - game.input.brakeStartTime) / 1000,
                    );
                    drawBrakingEffect(this.ctx, game, brakeProgress);
                }
            }

            game.dialogue.draw();

            if (game.state.game_over) {
                drawRectangle(this.ctx, game.resetBtnSize);
                this.ctx.save();
                this.ctx.fillStyle = 'white';
                this.ctx.font = `bold ${Math.min(game.resetBtnSize.height * 0.5, 20)}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    'RESTART',
                    game.resetBtnSize.posX + game.resetBtnSize.width / 2,
                    game.resetBtnSize.posY + game.resetBtnSize.height / 2,
                );
                this.ctx.restore();
            }

            const isOverAsteroid = isPointOverAsteroid(
                game,
                game.ui.mouseX,
                game.ui.mouseY,
            );

            if (isOverAsteroid) {
                const squareSize = 22;
                this.ctx.strokeStyle = 'yellow';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    game.ui.mouseX - squareSize / 2,
                    game.ui.mouseY - squareSize / 2,
                    squareSize,
                    squareSize,
                );
            }

            drawCursorDot(this.ctx, game, isOverAsteroid);
        },

        drawSVGImg(img, scale = 1) {
            drawSVGImg(this.ctx, img, scale);
        },
    };
}
