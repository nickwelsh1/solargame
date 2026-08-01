import { Renderer } from './renderer.js';
import { CONFIG } from './config.js';
import { shipSVG3, loadSVGString } from './assets.js';
import { World } from './world.js';
import { Camera } from './camera.js';
import { createState } from './state.js';
import { createInput, setupInputListeners } from './input.js';
import { Player } from './player.js';
import { createUI } from './ui.js';
import { createSpawner, initGame, resetGame } from './systems/Spawner.js';
import { handleCollisions, isPointOverAsteroid } from './systems/collisions.js';
import {
    calculateNewPosition,
    logarithmicIncrease,
    countObjectProperties,
    isMobile,
} from './utils/helpers.js';

let game;

class Game {
    constructor() {
        this.lastTime = 0;

        this.renderer = new Renderer();
        this.canvas = this.renderer.canvas;
        this.ctx = this.renderer.ctx;
        this.weaponButton = document.getElementById('weaponButton');
        this.message = document.querySelector('.message');
        this.debugEl = initDebugArea();

        this.ship = null;
        this.asteroids = [];
        this.projectiles = [];
        this.particles = [];
        this.planets = [];
        this.dialogue = null;
        this.beams = []; // Array to track active beams
        this.containers = [];
        this.scrap = [];
        this.world = new World();
        this.camera = new Camera();

        this.MINIMAP_SCALE = 0;
        this.MINIMAP_MARGIN = 0;

        this.resize();

        this.cameraOffset = { x: 0, y: 0 };
        this.entities = [];

        // Game State
        this.state = createState();

        this.CENTER_CIRCLE_RADIUS = 50 * CONFIG.MOBILE_SCALE;  // Radius of the central UI circle for interaction
        // debug(`cw, ch: ${camera.width}, ${camera.height}`);
        this.CENTER_MAXTHRUST_RADIUS = 0.5 * Math.min(this.camera.width, this.camera.height) - 8;  // Radius of the central UI circle for interaction
        this.CENTER_LOWTHRUST_RADIUS = 0.5 * this.CENTER_MAXTHRUST_RADIUS + (0.5 * this.CENTER_CIRCLE_RADIUS);  // Radius of the central UI circle for interaction

        this.mouseContrail = {
            points: [],
            lastUpdateTime: 0,
            updateInterval: 30, // 50ms between updates
            pointLifespan: 100, // 100ms lifespan for each point

            addPoint(x, y) {
                const currentTime = performance.now();
                if (currentTime - this.lastUpdateTime >= this.updateInterval) {
                    this.points.push({ x, y, timestamp: currentTime });
                    this.lastUpdateTime = currentTime;
                }
            },

            update() {
                const currentTime = performance.now();
                // Filter out points that exceed lifespan
                this.points = this.points.filter(point => currentTime - point.timestamp <= this.pointLifespan);
            },

            draw() {
                if (this.points.length < 2) return;

                game.ctx.beginPath();
                game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                game.ctx.lineWidth = 2;

                // Start from the oldest point
                game.ctx.moveTo(this.points[0].x, this.points[0].y);

                // Draw lines to each subsequent point
                for (let i = 1; i < this.points.length; i++) {
                    game.ctx.lineTo(this.points[i].x, this.points[i].y);
                    // Gradually increase opacity for newer points
                    game.ctx.strokeStyle = `rgba(255, 255, 255, ${i / this.points.length * 0.5})`;
                    game.ctx.stroke();
                    game.ctx.beginPath();
                    game.ctx.moveTo(this.points[i].x, this.points[i].y);
                }
            }
        };

        this.actionBtnSize = {
            // button dimensions
            width: ((this.camera.width < 800) ? this.camera.width * 0.2 : this.camera.width * 0.1),
            height: this.camera.height * 0.1,
            // Calculate rectangle position in bottom left corner
            posX: 10,
            posY: this.camera.height - (this.camera.height * 0.1 + 10),
        }

        this.pauseBtnSize = {
            // button dimensions - same size as action button
            width: ((this.camera.width < 800) ? this.camera.width * 0.2 : this.camera.width * 0.1),
            height: this.camera.height * 0.1,
            // Position 10px above the action button
            posX: 10,
            posY: this.camera.height - (this.camera.height * 0.1 + 10) - (this.camera.height * 0.1 + 10),
        }

        this.pauseBtnIcon = {
            // icon dimensions
            width: this.CENTER_CIRCLE_RADIUS * 0.5,
            height: this.CENTER_CIRCLE_RADIUS,
            // icon position
            posX: this.pauseBtnSize.posX + 10,
            posY: this.pauseBtnSize.posY + 10,
        }

        this.cargoBtnSize = {
            width: ((this.camera.width < 800) ? this.camera.width * 0.2 : this.camera.width * 0.1),
            height: this.camera.height * 0.1,
            posX: 10,
            posY: this.camera.height - (this.camera.height * 0.1 + 10) * 3,
        };

        this._menuBtnW = Math.min(308, this.camera.width * 0.66);
        this._menuBtnH = Math.max(50, this.camera.height * 0.09);
        this._menuBtnX = this.camera.width / 2 - this._menuBtnW / 2;

        this.menuStartBtnSize = { width: this._menuBtnW, height: this._menuBtnH, posX: this._menuBtnX, posY: this.camera.height * 0.48 };
        this.menuControlsBtnSize = { width: this._menuBtnW, height: this._menuBtnH, posX: this._menuBtnX, posY: this.camera.height * 0.60 };
        this.menuBackBtnSize = { width: this._menuBtnW * 0.6, height: this._menuBtnH, posX: this.camera.width / 2 - this._menuBtnW * 0.3, posY: this.camera.height * 0.82 };

        // Input State
        this.input = createInput();

        this.ui = createUI();
        this.rectangleDrawTimer = null; // legacy?

        this.player = new Player();
    }

    resize() {
        this.camera.width = this.canvas.width = window.innerWidth - 8;
        this.camera.height = this.canvas.height = window.innerHeight - 60;
        this.camera.bottom = this.camera.top + this.camera.height;
        this.camera.right = this.camera.left + this.camera.width;
        this.camera.centerX = this.camera.width * 0.5 + this.camera.top;
        this.camera.centerY = this.camera.height * 0.5 + this.camera.left;
        this.world.width = 4000; // 4 * camera.width;
        this.world.height = 3000; // 4 * camera.height;

        this.MINIMAP_SCALE = this.camera.width / 5; // 8% of the canvas size
        this.MINIMAP_MARGIN = 10; // Margin from the top-left corner
    }

    start() {
        this.state.screen = 'menu';
        requestAnimationFrame(() => game.menuLoop());
    }

    init() {
        this.shipImg = loadSVGString(shipSVG3);
        this.resetBtnSize = {
            width: this.camera.width * (isMobile() ? 0.55 : 0.25),
            height: this.camera.height * 0.09,
            posX: this.camera.width / 2 - (this.camera.width * (isMobile() ? 0.55 : 0.25)) / 2,
            posY: this.camera.height / 2 + this.camera.height * 0.07 - this.camera.height * 0.045,
        };

        this.spawner = createSpawner(this);
    }
}


game = new Game();
game.CONFIG = CONFIG;
game.init();
setupInputListeners(game, { onStartGame: () => initGame(game), onResetGame: () => resetGame(game) });














Game.prototype.menuLoop = function () {
    this.renderer.draw(this);
    if (this.state.screen !== 'game') {
        requestAnimationFrame(() => this.menuLoop());
    }
};

Game.prototype.loop = function (timestamp) {
    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;

    // ctx.clearRect(0, 0, camera.width, camera.height);
    // Background gradient
    // const bg = ctx.createLinearGradient(0, 0, 0, camera.height); // top -> bottom
    // world Y=0 appears at screen Y = -cameraOffset.y
    // world Y=world.height appears at screen Y = world.height - cameraOffset.y
    const bg = game.ctx.createLinearGradient(
        0,
        -game.cameraOffset.y,
        0,
        game.world.height - game.cameraOffset.y
    );
    bg.addColorStop(0.0, '#7A4827');  // was #F5914E
    bg.addColorStop(0.33, '#772F1F'); // was #EF5E3F
    bg.addColorStop(0.66, '#5D1E18'); // was #BB3C30
    bg.addColorStop(1.0, '#401111');  // was #802323
    game.ctx.fillStyle = bg;
    game.ctx.fillRect(0, 0, game.camera.width, game.camera.height);

    // ===== UPDATE PHASE (skip if paused) =====
    if (!game.state.game_paused) {
        // Update contrails to remove expired points
        game.ship.contrail.update();
        game.mouseContrail.update();

        // Update particles
        game.particles.forEach(particle => {
            particle.update(deltaTime);
        });

        // Update ship
        if (game.input.isShooting) {
            game.ship.shoot();
        }
        game.ship.update(deltaTime);

        // Update asteroids
        game.asteroids.forEach(asteroid => {
            asteroid.update(deltaTime);
        });

        // Update projectiles
        game.projectiles.forEach((projectile, index) => {
            projectile.update(deltaTime);

            if (projectile.lifespan <= 0) {
                game.projectiles.splice(index, 1);
                game.entities.splice(game.entities.indexOf(projectile), 1);
            }
        });

        // Update beams
        game.beams.forEach((beam, index) => {
            beam.update(deltaTime);

            if (beam.lifespan <= 0) {
                game.beams.splice(index, 1);
                game.entities.splice(game.entities.indexOf(beam), 1);
            }
        });

        // Update containers and check if they enter the player's view
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

        // Update scrap and remove expired
        for (let i = game.scrap.length - 1; i >= 0; i--) {
            game.scrap[i].update(deltaTime);
            if (game.scrap[i].lifespan <= 0) {
                game.scrap.splice(i, 1);
            }
        }

        // Handle collisions
        handleCollisions(this);

        // Update dialogue
        game.dialogue.update(deltaTime);

        // (braking is triggered on tap, see handlePointerDown)
    }

    this.renderer.draw(this, timestamp);

    requestAnimationFrame((timestamp) => game.loop(timestamp));
};


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



export { Game, game };

if (isMobile()) {
    console.log('Mobile device detected');
}









