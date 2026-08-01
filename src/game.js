import { createRenderer } from './renderer.js';
import { CONFIG } from './config.js';
import { shipSVG3, loadSVGString } from './assets.js';
import { World } from './world.js';
import { Camera } from './camera.js';
import { createState } from './state.js';
import { createInput, setupInputListeners } from './input.js';
import { Player } from './player.js';
import { createUI } from './ui.js';
import { createSpawner, initGame, resetGame } from './systems/Spawner.js';
import { handleCollisions } from './systems/collisions.js';
import { isMobile } from './utils/helpers.js';

function createGame() {
    const game = {};
    initGameObject(game);
    return game;
}

function initGameObject(game) {
    game.lastTime = 0;

    game.renderer = createRenderer();
    game.canvas = game.renderer.canvas;
    game.ctx = game.renderer.ctx;
    game.weaponButton = document.getElementById('weaponButton');
    game.message = document.querySelector('.message');
    game.debugEl = initDebugArea();

    game.ship = null;
    game.asteroids = [];
    game.projectiles = [];
    game.particles = [];
    game.planets = [];
    game.dialogue = null;
    game.beams = [];
    game.containers = [];
    game.scrap = [];
    game.world = new World();
    game.camera = new Camera();

    game.MINIMAP_SCALE = 0;
    game.MINIMAP_MARGIN = 0;

    game.resize = () => resize(game);
    game.menuLoop = (timestamp) => menuLoop(game, timestamp);
    game.loop = (timestamp) => loop(game, timestamp);
    game.start = () => start(game);
    game.init = () => init(game);

    resize(game);

    game.cameraOffset = { x: 0, y: 0 };
    game.entities = [];

    game.state = createState();

    game.CENTER_CIRCLE_RADIUS = 50 * CONFIG.MOBILE_SCALE;
    game.CENTER_MAXTHRUST_RADIUS = 0.5 * Math.min(game.camera.width, game.camera.height) - 8;
    game.CENTER_LOWTHRUST_RADIUS = 0.5 * game.CENTER_MAXTHRUST_RADIUS + (0.5 * game.CENTER_CIRCLE_RADIUS);

    game.mouseContrail = {
        points: [],
        lastUpdateTime: 0,
        updateInterval: 30,
        pointLifespan: 100,

        addPoint(x, y) {
            const currentTime = performance.now();
            if (currentTime - this.lastUpdateTime >= this.updateInterval) {
                this.points.push({ x, y, timestamp: currentTime });
                this.lastUpdateTime = currentTime;
            }
        },

        update() {
            const currentTime = performance.now();
            this.points = this.points.filter(point => currentTime - point.timestamp <= this.pointLifespan);
        },

        draw() {
            if (this.points.length < 2) return;

            game.ctx.beginPath();
            game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            game.ctx.lineWidth = 2;

            game.ctx.moveTo(this.points[0].x, this.points[0].y);

            for (let i = 1; i < this.points.length; i++) {
                game.ctx.lineTo(this.points[i].x, this.points[i].y);
                game.ctx.strokeStyle = `rgba(255, 255, 255, ${i / this.points.length * 0.5})`;
                game.ctx.stroke();
                game.ctx.beginPath();
                game.ctx.moveTo(this.points[i].x, this.points[i].y);
            }
        }
    };

    game.actionBtnSize = {
        width: ((game.camera.width < 800) ? game.camera.width * 0.2 : game.camera.width * 0.1),
        height: game.camera.height * 0.1,
        posX: 10,
        posY: game.camera.height - (game.camera.height * 0.1 + 10),
    };

    game.pauseBtnSize = {
        width: ((game.camera.width < 800) ? game.camera.width * 0.2 : game.camera.width * 0.1),
        height: game.camera.height * 0.1,
        posX: 10,
        posY: game.camera.height - (game.camera.height * 0.1 + 10) - (game.camera.height * 0.1 + 10),
    };

    game.pauseBtnIcon = {
        width: game.CENTER_CIRCLE_RADIUS * 0.5,
        height: game.CENTER_CIRCLE_RADIUS,
        posX: game.pauseBtnSize.posX + 10,
        posY: game.pauseBtnSize.posY + 10,
    };

    game.cargoBtnSize = {
        width: ((game.camera.width < 800) ? game.camera.width * 0.2 : game.camera.width * 0.1),
        height: game.camera.height * 0.1,
        posX: 10,
        posY: game.camera.height - (game.camera.height * 0.1 + 10) * 3,
    };

    game._menuBtnW = Math.min(308, game.camera.width * 0.66);
    game._menuBtnH = Math.max(50, game.camera.height * 0.09);
    game._menuBtnX = game.camera.width / 2 - game._menuBtnW / 2;

    game.menuStartBtnSize = { width: game._menuBtnW, height: game._menuBtnH, posX: game._menuBtnX, posY: game.camera.height * 0.48 };
    game.menuControlsBtnSize = { width: game._menuBtnW, height: game._menuBtnH, posX: game._menuBtnX, posY: game.camera.height * 0.60 };
    game.menuBackBtnSize = { width: game._menuBtnW * 0.6, height: game._menuBtnH, posX: game.camera.width / 2 - game._menuBtnW * 0.3, posY: game.camera.height * 0.82 };

    game.input = createInput();

    game.ui = createUI();
    game.rectangleDrawTimer = null;

    game.player = new Player();
}

function resize(game) {
    game.camera.width = game.canvas.width = window.innerWidth - 8;
    game.camera.height = game.canvas.height = window.innerHeight - 60;
    game.camera.bottom = game.camera.top + game.camera.height;
    game.camera.right = game.camera.left + game.camera.width;
    game.camera.centerX = game.camera.width * 0.5 + game.camera.top;
    game.camera.centerY = game.camera.height * 0.5 + game.camera.left;
    game.world.width = 4000;
    game.world.height = 3000;

    game.MINIMAP_SCALE = game.camera.width / 5;
    game.MINIMAP_MARGIN = 10;
}

function start(game) {
    if (game._started) return;
    game._started = true;
    game.state.screen = 'menu';
    requestAnimationFrame(game.menuLoop);
}

function init(game) {
    game.shipImg = loadSVGString(shipSVG3);
    game.resetBtnSize = {
        width: game.camera.width * (isMobile() ? 0.55 : 0.25),
        height: game.camera.height * 0.09,
        posX: game.camera.width / 2 - (game.camera.width * (isMobile() ? 0.55 : 0.25)) / 2,
        posY: game.camera.height / 2 + game.camera.height * 0.07 - game.camera.height * 0.045,
    };

    game.spawner = createSpawner(game);
}

function menuLoop(game, timestamp) {
    game.renderer.draw(game);
    if (game.state.screen !== 'game') {
        requestAnimationFrame(game.menuLoop);
    }
}

function loop(game, timestamp) {
    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;

    const bg = game.ctx.createLinearGradient(
        0,
        -game.cameraOffset.y,
        0,
        game.world.height - game.cameraOffset.y
    );
    bg.addColorStop(0.0, '#7A4827');
    bg.addColorStop(0.33, '#772F1F');
    bg.addColorStop(0.66, '#5D1E18');
    bg.addColorStop(1.0, '#401111');
    game.ctx.fillStyle = bg;
    game.ctx.fillRect(0, 0, game.camera.width, game.camera.height);

    if (!game.state.game_paused) {
        game.ship.contrail.update();
        game.mouseContrail.update();

        game.particles.forEach(particle => {
            particle.update(deltaTime);
        });

        if (game.input.isShooting) {
            game.ship.shoot();
        }
        game.ship.update(deltaTime);

        game.asteroids.forEach(asteroid => {
            asteroid.update(deltaTime);
        });

        game.projectiles.forEach((projectile, index) => {
            projectile.update(deltaTime);

            if (projectile.lifespan <= 0) {
                game.projectiles.splice(index, 1);
                game.entities.splice(game.entities.indexOf(projectile), 1);
            }
        });

        game.beams.forEach((beam, index) => {
            beam.update(deltaTime);

            if (beam.lifespan <= 0) {
                game.beams.splice(index, 1);
                game.entities.splice(game.entities.indexOf(beam), 1);
            }
        });

        game.containers.forEach(container => {
            container.update(deltaTime);
            if (!container.discovered) {
                const sx = container.x - game.cameraOffset.x;
                const sy = container.y - game.cameraOffset.y;
                if (sx >= 0 && sx <= game.camera.width && sy >= 0 && sy <= game.camera.height) {
                    container.discovered = true;
                }
            }
        });

        for (let i = game.scrap.length - 1; i >= 0; i--) {
            game.scrap[i].update(deltaTime);
            if (game.scrap[i].lifespan <= 0) {
                game.scrap.splice(i, 1);
            }
        }

        handleCollisions(game);

        game.dialogue.update(deltaTime);
    }

    game.renderer.draw(game, timestamp);

    requestAnimationFrame((timestamp) => game.loop(timestamp));
}

const game = createGame();
game.CONFIG = CONFIG;
game.init();
setupInputListeners(game, { onStartGame: () => initGame(game), onResetGame: () => resetGame(game) });
game.start();

window.addEventListener('resize', () => game.resize());

function initDebugArea() {
    const debugLimit = 50;
    let debugCount = 0;
    let bodyEl = document.querySelector('body');
    const el = document.createElement('pre');
    el.id = 'debug';
    bodyEl.appendChild(el);
    return el;
}

export { game, createGame };

if (isMobile()) {
    console.log('Mobile device detected');
}
