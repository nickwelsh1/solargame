export class Renderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    drawWorldBorder() {
        this.ctx.strokeStyle = 'hsl(220, 60%, 30%)';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(
            -this.game.cameraOffset.x,
            -this.game.cameraOffset.y,
            this.game.world.width,
            this.game.world.height,
        );
    }

    drawMiniMap() {
        const minimapSize = {
            width: this.game.MINIMAP_SCALE,
            height:
                (this.game.world.height / this.game.world.width) *
                this.game.MINIMAP_SCALE,
        };

        // message.innerText = `| map ${MINIMAP_MARGIN}`;

        // Save the current context state
        this.ctx.save();

        // Set up the mini-map area
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = 'rgba(0, 0, 3, 0.5)';
        this.ctx.fillRect(
            this.game.MINIMAP_MARGIN,
            this.game.MINIMAP_MARGIN,
            minimapSize.width,
            minimapSize.height,
        );

        // Draw mini world border
        this.ctx.strokeStyle = 'hsl(221, 12.20%, 45.10%)';
        this.ctx.strokeRect(
            this.game.MINIMAP_MARGIN,
            this.game.MINIMAP_MARGIN,
            minimapSize.width,
            minimapSize.height,
        );
        this.ctx.fill();

        // Calculate the scale factor for objects within the mini-map
        const scaleFactor = minimapSize.width / this.game.world.width;

        // Draw mini asteroids
        this.game.asteroids.forEach((asteroid) => {
            this.ctx.fillStyle = `hsl(0, 100%, 59%)`;
            this.ctx.fillRect(
                this.game.MINIMAP_MARGIN + asteroid.x * scaleFactor,
                this.game.MINIMAP_MARGIN + asteroid.y * scaleFactor,
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
            this.ctx.fill();
        });

        // Draw discovered containers
        this.game.containers.forEach((container) => {
            if (container.discovered) {
                this.ctx.fillStyle = 'yellow';
                this.ctx.fillRect(
                    this.game.MINIMAP_MARGIN + container.x * scaleFactor - 1,
                    this.game.MINIMAP_MARGIN + container.y * scaleFactor - 1,
                    3,
                    3,
                );
            }
        });

        // Draw mini planets
        this.game.planets.forEach((planet) => {
            this.ctx.fillStyle = 'cyan';
            this.ctx.fillRect(
                this.game.MINIMAP_MARGIN + planet.x * scaleFactor,
                this.game.MINIMAP_MARGIN + planet.y * scaleFactor,
                4,
                4,
            );
        });

        // Draw mini ship
        this.ctx.fillStyle = 'yellow';
        this.ctx.fillRect(
            this.game.MINIMAP_MARGIN + this.game.ship.x * scaleFactor,
            this.game.MINIMAP_MARGIN + this.game.ship.y * scaleFactor,
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
        this.ctx.fill();

        // Draw mini view area
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'hsla(170, 60%, 30%, 0.4)';
        this.ctx.strokeRect(
            this.game.MINIMAP_MARGIN +
                (this.game.ship.x - this.game.camera.width / 2) * scaleFactor,
            this.game.MINIMAP_MARGIN +
                (this.game.ship.y - this.game.camera.height / 2) * scaleFactor,
            this.game.camera.width * scaleFactor,
            this.game.camera.height * scaleFactor,
        );

        // Restore the context state
        this.ctx.restore();
    }

    drawPauseIcon() {
        this.drawRectangle(this.game.pauseBtnIcon);
        this.drawRectangle(this.game.pauseBtnIcon, {
            x: this.game.CENTER_CIRCLE_RADIUS * 0.76,
            y: 0,
        });
    }

    drawCargoButton() {
        const hasTowed =
            this.game.ship && this.game.ship.towedContainer !== null;
        const nearbyContainer = this.game.containers.find(
            (c) =>
                !c.isTowed &&
                Math.hypot(this.game.ship.x - c.x, this.game.ship.y - c.y) < 80,
        );
        const canPickup = !hasTowed && nearbyContainer;
        const colour = hasTowed
            ? 'hsla(120, 80%, 35%, 0.85)'
            : canPickup
              ? 'hsla(55, 100%, 45%, 0.75)'
              : 'hsla(0, 0%, 35%, 0.45)';
        this.drawRectangle(this.game.cargoBtnSize, { x: 0, y: 0 }, colour);
        this.ctx.font = `bold ${Math.round(this.game.cargoBtnSize.height * 0.3)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(
            hasTowed ? 'DROP' : 'PICK',
            this.game.cargoBtnSize.posX + this.game.cargoBtnSize.width / 2,
            this.game.cargoBtnSize.posY + this.game.cargoBtnSize.height / 2,
        );
    }

    drawMenuBackground() {
        const bg = this.ctx.createLinearGradient(
            0,
            0,
            0,
            this.game.camera.height,
        );
        bg.addColorStop(0.0, '#7A4827');
        bg.addColorStop(0.33, '#772F1F');
        bg.addColorStop(0.66, '#5D1E18');
        bg.addColorStop(1.0, '#401111');
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(
            0,
            0,
            this.game.camera.width,
            this.game.camera.height,
        );
    }

    drawMenuButton(btnSize, label, active) {
        this.ctx.fillStyle = active
            ? 'hsla(40, 100%, 60%, 0.85)'
            : 'hsla(0, 0%, 100%, 0.12)';
        this.ctx.strokeStyle = active
            ? 'hsla(40, 100%, 75%, 1)'
            : 'rgba(255,255,255,0.35)';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(
            btnSize.posX,
            btnSize.posY,
            btnSize.width,
            btnSize.height,
        );
        this.ctx.strokeRect(
            btnSize.posX,
            btnSize.posY,
            btnSize.width,
            btnSize.height,
        );
        this.ctx.font = `bold ${Math.round(btnSize.height * 0.38)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = active ? '#1a0a00' : 'white';
        this.ctx.fillText(
            label,
            btnSize.posX + btnSize.width / 2,
            btnSize.posY + btnSize.height / 2,
        );
    }

    drawMainMenu() {
        this.drawMenuBackground();
        // Title
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'hsla(40, 100%, 70%, 1)';
        const titleSize = Math.min(
            Math.round(this.game.camera.height * 0.09),
            Math.round(this.game.camera.width * 0.11),
        );
        this.ctx.font = `bold ${titleSize}px sans-serif`;
        this.ctx.fillText(
            'SOLAR GAME',
            this.game.camera.width / 2,
            this.game.camera.height * 0.25,
        );
        // Subtitle
        this.ctx.fillStyle = 'rgba(255,255,255,0.45)';
        const subSize = Math.round(this.game.camera.height * 0.03);
        this.ctx.font = `${subSize}px sans-serif`;
        const subtitle = 'navigate · salvage · survive';
        const subY = this.game.camera.height * 0.34;
        if (
            this.ctx.measureText(subtitle).width >
            this.game.camera.width * 0.82
        ) {
            this.ctx.fillText(
                'navigate · salvage',
                this.game.camera.width / 2,
                subY - subSize * 0.7,
            );
            this.ctx.fillText(
                '· survive',
                this.game.camera.width / 2,
                subY + subSize * 0.7,
            );
        } else {
            this.ctx.fillText(subtitle, this.game.camera.width / 2, subY);
        }
        // Buttons
        const nearStart = this.game.isUIButtonClicked(
            this.game.menuStartBtnSize,
        );
        const nearCtrl = this.game.isUIButtonClicked(
            this.game.menuControlsBtnSize,
        );
        this.drawMenuButton(
            this.game.menuStartBtnSize,
            'START GAME',
            nearStart,
        );
        this.drawMenuButton(
            this.game.menuControlsBtnSize,
            'CONTROLS',
            nearCtrl,
        );
    }

    drawControlsScreen() {
        this.drawMenuBackground();
        // Title
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'hsla(40, 100%, 70%, 1)';
        this.ctx.font = `bold ${Math.round(this.game.camera.height * 0.07)}px sans-serif`;
        this.ctx.fillText(
            'CONTROLS',
            this.game.camera.width / 2,
            this.game.camera.height * 0.14,
        );
        // Control list
        const items = [
            ['Tap / Click', 'Move ship toward cursor'],
            ['Hold center circle', 'Brake'],
            ['Weapon button', 'Cycle weapons'],
            ['Pause button', 'Pause / Unpause'],
            ['PICK button', 'Pick up nearby cargo container'],
            ['DROP button', 'Drop towed cargo container'],
        ];
        const lineH = Math.min(this.game.camera.height * 0.072, 46);
        const startY = this.game.camera.height * 0.26;
        const colLabel = this.game.camera.width * 0.08;
        const colDesc = this.game.camera.width * 0.52;
        const fontSize = Math.round(lineH * 0.38);
        this.ctx.textBaseline = 'middle';
        items.forEach(([label, desc], i) => {
            const y = startY + i * lineH;
            this.ctx.textAlign = 'left';
            this.ctx.font = `bold ${fontSize}px sans-serif`;
            this.ctx.fillStyle = 'hsla(40, 100%, 65%, 1)';
            this.ctx.fillText(label, colLabel, y);
            this.ctx.font = `${fontSize}px sans-serif`;
            this.ctx.fillStyle = 'rgba(255,255,255,0.75)';
            this.ctx.fillText(desc, colDesc, y);
        });
        // Back button
        this.drawMenuButton(
            this.game.menuBackBtnSize,
            'BACK',
            this.game.isUIButtonClicked(this.game.menuBackBtnSize),
        );
    }

    drawHUD() {
        const timeText =
            this.game.state.timer.timerExpired ||
            !this.game.state.timer.startTime
                ? '00:00'
                : this.game.checkTimer();
        const fontSize = Math.min(
            Math.round(
                Math.min(
                    this.game.camera.height * 0.038,
                    this.game.camera.width * 0.045,
                ),
            ),
            16,
        );
        const lineH = fontSize * 1.5;
        const remaining = this.game.containers.filter(
            (c) => !c.destroyed,
        ).length;
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.font = `bold ${fontSize}px sans-serif`;
        this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
        this.ctx.shadowBlur = 6;
        this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
        this.ctx.fillText(
            `Score: ${this.game.state.score}   |   ${timeText}`,
            this.game.camera.width / 2,
            10,
        );
        this.ctx.fillText(
            `${remaining}/${this.game.state.initialContainerCount} containers   |   ${this.game.planets.length} planets`,
            this.game.camera.width / 2,
            10 + lineH,
        );
        this.ctx.restore();
    }

    drawRectangle(buttonSize, offset = { x: 0, y: 0 }, colour) {
        const fill = colour || 'hsla(320, 100%, 83%, 0.50)';
        // Stroke style
        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = 'pink';
        this.ctx.lineWidth = 2;
        // Draw the rectangle fill
        this.ctx.fillRect(
            buttonSize.posX + offset.x,
            buttonSize.posY + offset.y,
            buttonSize.width,
            buttonSize.height,
        );
        // Draw the rectangle stroke
        this.ctx.strokeRect(
            buttonSize.posX + offset.x,
            buttonSize.posY + offset.y,
            buttonSize.width,
            buttonSize.height,
        );
    }

    drawCursorDot(isOverAsteroid) {
        // Draw contrail first
        this.game.mouseContrail.draw();

        // Then draw the cursor dot
        this.ctx.beginPath();
        this.ctx.rect(this.game.ui.mouseX - 3, this.game.ui.mouseY - 3, 6, 6);
        this.ctx.fillStyle = isOverAsteroid ? 'yellow' : 'white';
        this.ctx.fill();
        this.ctx.closePath();
    }

    loadSVGString(svgString) {
        // Get the canvas element
        // const canvas = document.getElementById(canvasId);

        // Create a new image element
        const img = new Image();

        // Set the image source to the SVG string
        // img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);   //
        img.src = `data:image/svg+xml;charset=utf-8,${svgString}`;

        // Load the image
        img.onload = () => {
            this.drawSVGImg(img);
        };

        return img;
    }

    drawSVGImg(img, scale = 1) {
        // Draw the image onto the canvas
        // const ctx = canvas.getContext('2d');
        this.ctx.rotate((90 * Math.PI) / 180);
        this.ctx.scale(0.25 * scale, 0.25 * scale);
        this.ctx.translate(-154, -206);
        this.ctx.drawImage(img, 1, 1, 300, 300);
        this.ctx.translate(154, 206);
        this.ctx.scale(4, 4);
        this.ctx.rotate((-90 * Math.PI) / 180);
        // perhaps timing issue. load svg once. When ready use it?
    }

    drawCenterCircle(radius) {
        const centerX = this.game.camera.width / 2;
        const centerY = this.game.camera.height / 2;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        // ctx.fillStyle = 'white';
        // ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawDragFromCenterLine() {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(
            this.game.camera.width / 2,
            this.game.camera.height / 2,
        );
        this.ctx.lineTo(this.game.ui.mouseX, this.game.ui.mouseY);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawBrakingEffect(brakeProgress) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(
            this.game.camera.width / 2,
            this.game.camera.height / 2,
            this.game.CENTER_CIRCLE_RADIUS * brakeProgress,
            0,
            Math.PI * 2,
        );
        this.ctx.fillStyle = `rgba(200, 200, 200, ${0.3 + brakeProgress * 0.3})`;
        this.ctx.fill();
        this.ctx.restore();
    }

    draw(game, _timestamp) {
        this.game = game;

        if (game.state.screen === 'menu') {
            this.drawMainMenu();
            this.drawCursorDot(false);
            return;
        }
        if (game.state.screen === 'controls') {
            this.drawControlsScreen();
            this.drawCursorDot(false);
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

        this.drawWorldBorder();

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

        this.drawMiniMap();
        this.drawHUD();
        this.drawRectangle(
            game.actionBtnSize,
            { x: 0, y: 0 },
            'hsla(64, 100%, 82%, 0.5)',
        );
        this.drawRectangle(game.pauseBtnSize);
        this.drawPauseIcon(game.pauseBtnIcon);
        this.drawCargoButton();

        this.drawCenterCircle(game.CENTER_CIRCLE_RADIUS);
        this.drawCenterCircle(game.CENTER_LOWTHRUST_RADIUS);
        this.drawCenterCircle(game.CENTER_MAXTHRUST_RADIUS);

        if (game.input.isDraggingFromCenter && game.input.isMouseDown) {
            const currentTime = performance.now();

            this.drawDragFromCenterLine();

            if (game.input.isBraking) {
                const brakeProgress = Math.min(
                    1,
                    (currentTime - game.input.brakeStartTime) / 1000,
                );
                this.drawBrakingEffect(brakeProgress);
            }
        }

        game.dialogue.draw();

        if (game.state.game_over) {
            this.drawRectangle(game.resetBtnSize);
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

        const isOverAsteroid = game.isPointOverAsteroid(
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

        this.drawCursorDot(isOverAsteroid);
    }
}
