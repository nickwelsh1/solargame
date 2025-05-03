const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const weaponButton = document.getElementById('weaponButton');
const message = document.querySelector('.message');

let ship, asteroids = [], projectiles = [], particles = [], dialogue;
const world = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 }
const camera = { top: 0, right: 0, bottom: 0, left: 0, center: 0, width: 0, height: 0 };
const cameraOffset = { x: 0, y: 0 };
let currentWeapon = 'laser';
let entities = [];
const MAX_ENTITIES = 200;
const PARTICLE_COUNT = 200;
const MIN_ASTEROID_SIZE = 10;
const INITIAL_ASTEROID_COUNT = 20;
const MINIMAP_SCALE = 0.08; // 8% of the canvas size
const MINIMAP_MARGIN = 10; // Margin from the top-left corner
let GAME_OVER = false;
let isMouseDown = false;
let isShootingAsteroid = false;
let mouseX = 0;
let mouseY = 0;
let dialogueText = '';
let rectangleDrawTimer = null; // legacy?
let score = 0;

const LASER_FIRE_RATE = 1000;  // 1000ms between shots
const BULLET_FIRE_RATE = 200;  // 200ms between shots
const MISSILE_FIRE_RATE = 500; // 500ms between shots
let lastLaserFireTime = 0;
let lastBulletFireTime = 0;
let lastMissileFireTime = 0;

const shipSVG2 = `
<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"> <polygon points="34,12 26,30 28,32 32,30 30,32 30,32 34,30 34,32 36,32 36,30 38,32 38,32 38,30 42,32 44,32" fill=grey /> </svg>
`;

const shipSVG3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="62" height="62"> <path d="m16 1-5 14-9 10 3 2 3-2 4 2v3l1.6-1.1.5 1.2L16 30h1.9l.5-1.1L20 30v-3l4-2 3 2 3-2-9-10z" style="fill:slategrey"/> </svg>
`;

const shipImg = loadSVGString(shipSVG3);

function resizeCanvas() {
    camera.width = canvas.width = window.innerWidth - 8;
    camera.height = canvas.height = window.innerHeight - 60;
    camera.bottom = camera.top + camera.height;
    camera.right = camera.left + camera.width;
    camera.centerX = camera.width * 0.5 + camera.top;
    camera.centerY = camera.height * 0.5 + camera.left;
    world.width = 4 * camera.width;
    world.height = 4 * camera.height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Ship {
    constructor() {
        this.name = 'ship';
        this.x = world.width / 2;
        this.y = world.height / 2;
        this.radius = 20;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 10;
        this.targetX = this.x;
        this.targetY = this.y;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(camera.width / 2, camera.height / 2);
        ctx.rotate(this.angle);
        // ctx.beginPath();
        // ctx.moveTo(this.radius, 0);
        // ctx.lineTo(-this.radius, -this.radius / 2);
        // ctx.lineTo(-this.radius, this.radius / 2);
        // ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
        drawSVGImg(shipImg);
        ctx.restore();
    }

    update(deltaTime) {
        // console.log('ship update');

        // console.log(`values:, x${this.x}, y${this.y}, ang${this.angle}, spd${this.speed}, delT${deltaTime}`);
        let { x, y } = calculateNewPosition(this.x, this.y, this.angle, this.speed, this.maxSpeed, deltaTime);
        // console.log('newX and Y:', x, y);

        this.x = x;
        this.y = y;

        // Update camera offset
        cameraOffset.x = this.x - camera.width / 2;
        cameraOffset.y = this.y - camera.height / 2;

        // keep ship bound to world
        this.x = Math.max(0, Math.min(this.x, world.width));
        this.y = Math.max(0, Math.min(this.y, world.height));
    }

    setTarget(x, y) {
        // console.log('ship setTarget');

        this.targetX = x + cameraOffset.x;
        this.targetY = y + cameraOffset.y;
        const distance = Math.hypot(this.targetX - this.x, this.targetY - this.y);
        const minDistance = Math.min(camera.width, camera.height) * 0.4;
        const speedAdjust = 0.01;

        if (distance > minDistance) {
            this.speed = 100;
            this.maxSpeed = 100;
        } else if (distance > minDistance * 0.8) {
            this.speed = 50;
            this.maxSpeed = 50;
        } else if (distance > minDistance * 0.7) {
            this.speed = 25;
            this.maxSpeed = 25;
        } else if (distance > minDistance * 0.3) {
            this.speed = 10;
            this.maxSpeed = 10;
        } else {
            this.speed = 0;
            this.maxSpeed = 0;
        }
        if (this.speed > 0) {
            this.speed *= speedAdjust;
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const angleRadians = Math.atan2(dy, dx);
        this.angle = angleRadians;
        // convert angle radians to degrees
        // this.angle = angleRadians * (180 / Math.PI);
    }

    shoot() {
        if (entities.length >= MAX_ENTITIES) return;

        const currentTime = performance.now();
        let canFire = false;

        switch (currentWeapon) {
            case 'laser':
                if (currentTime - lastLaserFireTime >= LASER_FIRE_RATE) {
                    canFire = true;
                    lastLaserFireTime = currentTime;
                }
                break;
            case 'machineGun':
                if (currentTime - lastBulletFireTime >= BULLET_FIRE_RATE) {
                    canFire = true;
                    lastBulletFireTime = currentTime;
                }
                break;
            case 'missile':
                if (currentTime - lastMissileFireTime >= MISSILE_FIRE_RATE) {
                    canFire = true;
                    lastMissileFireTime = currentTime;
                }
                break;
        }

        if (!canFire) return;

        let projectile;
        switch (currentWeapon) {
            case 'laser':
                projectile = new Laser(this.x, this.y, this.angle);
                break;
            case 'machineGun':
                projectile = new Bullet(this.x, this.y, this.angle);
                break;
            case 'missile':
                projectile = new Missile(this.x, this.y, this.angle);
                break;
        }
        projectiles.push(projectile);
        entities.push(projectiles);
    }
}


class Asteroid {
    constructor(x, y, radius) {
        this.name = 'asteroid';
        this.x = x || Math.random() * world.width;
        this.y = y || Math.random() * world.height;
        this.radius = radius || Math.random() * 30 + 10;
        this.velocityX = (Math.random() * 6 - 0) * 4;
        this.velocityY = (Math.random() * 6 - 0) * 4;
        this.hue = Math.random() * 20; // + 340
        this.saturation = Math.random() * 50 + 50;
        this.lightness = Math.random() * 45 + 20;
        this.mass = Math.PI * this.radius * this.radius;

        this.sides = 10;
        this.angleIncrement = Math.PI * 2 / this.sides;
        this.vertices = [];

        for (let i = 0; i < this.sides; i++) {
            const angle = i * this.angleIncrement + Math.random() * 0.4 - 0.2;
            const r = this.radius * (1 + Math.random() * 0.3 - 0.15);
            this.vertices.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
        }
    }

    draw() {
        ctx.beginPath();
        // ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.radius, 0, Math.PI * 2);
        ctx.moveTo(this.x - cameraOffset.x + this.vertices[0].x, this.y - cameraOffset.y + this.vertices[0].y);

        for (let i = 1; i < this.sides; i++) {
            ctx.lineTo(this.x - cameraOffset.x + this.vertices[i].x, this.y - cameraOffset.y + this.vertices[i].y);
        }

        ctx.closePath();
        ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
        ctx.fill();
    }

    update(deltaTime) {
        // deltaTime means time between frames
        // this.x += this.velocityX * deltaTime / 1000;
        // this.y += this.velocityY * deltaTime / 1000;

        // update asteroid position relative to world?
        this.x -= (this.velocityX * deltaTime / 1000); //  - ship.velocityX
        this.y -= (this.velocityY * deltaTime / 1000); //  - ship.velocityY

        if (this.x < 0 || this.x > world.width) this.velocityX *= -1;
        if (this.y < 0 || this.y > world.height) this.velocityY *= -1;

        this.x = Math.max(0, Math.min(this.x, world.width));
        this.y = Math.max(0, Math.min(this.y, world.height));
    }

    split() {
        if (this.radius < MIN_ASTEROID_SIZE) return [];

        const newRadius = this.radius * 0.5;


        // Add new asteroids        const newRadius = this.radius * 0.6;
        const newAsteroid1 = new Asteroid(this.x, this.y, newRadius);
        const newAsteroid2 = new Asteroid(this.x, this.y, newRadius);

        // Add new asteroids directly to the arrays
        asteroids.push(newAsteroid1, newAsteroid2);
        entities.push(newAsteroid1, newAsteroid2);

        return [newAsteroid1, newAsteroid2];
    }
}


class Projectile {
    constructor(x, y, angle, speed, radius, lifespan) {
        this.name = 'projectile';
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = radius;
        this.lifespan = lifespan;
        this.mass = Math.PI * this.radius * this.radius;
    }

    update(deltaTime) {
        this.x += Math.cos(this.angle) * this.speed * deltaTime / 1000;
        this.y += Math.sin(this.angle) * this.speed * deltaTime / 1000;
        this.lifespan -= deltaTime;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }
}


class Laser extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 1000, 2, 1000);
        this.name = 'laser';
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(
            this.x - cameraOffset.x + Math.cos(this.angle) * this.speed * this.lifespan / 1000,
            this.y - cameraOffset.y + Math.sin(this.angle) * this.speed * this.lifespan / 1000
        );
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}


class Bullet extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 600, 3, 6000);
        this.name = 'bullet';
    }
}


class Missile extends Projectile {
    constructor(x, y, angle) {
        super(x, y, angle, 10, 5, 6000); // Start with initial speed of 10
        this.name = 'missile';
        this.initialSpeed = 100;
        this.maxSpeed = 1000;
        this.timeSinceLaunch = 0;
    }

    update(deltaTime) {
        this.timeSinceLaunch += deltaTime;
        // Calculate how many 50ms intervals have passed
        const intervals = Math.floor(this.timeSinceLaunch / 50);
        // Speed doubles every interval, but is capped at maxSpeed
        this.speed = Math.min(this.initialSpeed * Math.pow(1.1, intervals), this.maxSpeed);
        
        // Use the parent class's movement logic with our updated speed
        this.x += Math.cos(this.angle) * this.speed * deltaTime / 1000;
        this.y += Math.sin(this.angle) * this.speed * deltaTime / 1000;
        this.lifespan -= deltaTime;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(-this.radius * 2, -this.radius);
        ctx.lineTo(-this.radius * 2, this.radius);
        ctx.closePath();
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.restore();
    }
}


class Contrail extends Projectile {
    constructor(x, y, angle) {
        this.name = 'contrail';
        super(x, y, angle, 0, 2, 6000);
        this.count = 1;
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x - cameraOffset.x, this.y - cameraOffset.y);
        ctx.lineTo(
            this.x - cameraOffset.x + Math.cos(this.angle) * this.speed * this.lifespan / 1000,
            this.y - cameraOffset.y + Math.sin(this.angle) * this.speed * this.lifespan / 1000
        );
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}


class Particle {
    constructor() {
        this.name = 'particle';
        this.x = Math.random() * world.width;
        this.y = Math.random() * world.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }

    update(deltaTime) {
        // update asteroid position relative to world?
        this.x -= (this.speedX * deltaTime / 1000); //  - ship.velocityX
        this.y -= (this.speedY * deltaTime / 1000); //  - ship.velocityY

        // this.x -= this.speedX - ship.velocityX;
        // this.y -= this.speedY - ship.velocityY;

        if (this.x < 0) this.x = world.width;
        if (this.x > world.width) this.x = 0;
        if (this.y < 0) this.y = world.height;
        if (this.y > world.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x - cameraOffset.x, this.y - cameraOffset.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


class Dialogue {

    constructor() {
        this.name = 'dialogue';
        // this.x = world.width / 2;
        // this.x = camera.width / 2;
        // Set text styles
        this.fontSize = 30;
        this.textColor = 'hsl(57, 100%, 83%)';

        // Calculate text position for centering
        this.textWidth = ctx.measureText(dialogueText).width;
        this.textHeight = this.fontSize; // Extract font size
        this.x = camera.width / 2;
        this.y = camera.height / 2;

        // Calculate rectangle dimensions
        this.rectWidth = camera.width * 0.5; // textWidth + 20;
        this.rectHeight = camera.height * 0.3; // textHeight + 20;
        this.rectX = this.x - this.rectWidth / 2;
        this.rectY = this.y - this.rectHeight / 2;

        this.btnDelay = 300;
    }

    draw() {
        // draw the dialogue and text
        if (GAME_OVER === false && dialogueText.length < 1) {
            return;
        }
        ctx.font = `bold ${this.fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the rectangle
        // ctx.fillStyle = 'skyblue'; // Or any color you prefer
        // ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

        this.drawRoundedRectangle(this.rectX, this.rectY, this.rectWidth, this.rectHeight);

        this.drawText(this.x, camera.height * 0.45, dialogueText);
    }

    // would be easier
    drawRoundedRectangle(rectX, rectY, rectWidth, rectHeight) {
        // Draw rounded rectangle
        const radius = 10; // Adjust the radius as needed
        ctx.strokeStyle = this.textColor; // Or any color you prefer
        ctx.lineWidth = 2; // Adjust the stroke width as needed
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectWidth - radius, rectY);
        ctx.arc(rectX + rectWidth - radius, rectY + radius, radius, Math.PI * 3 / 2, Math.PI * 2);
        ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        ctx.arc(rectX + rectWidth - radius, rectY + rectHeight - radius, radius, 0, Math.PI / 2);
        ctx.lineTo(rectX + radius, rectY + rectHeight);
        ctx.arc(rectX + radius, rectY + rectHeight - radius, radius, Math.PI / 2, Math.PI);
        ctx.lineTo(rectX, rectY + radius);
        ctx.arc(rectX + radius, rectY + radius, radius, Math.PI, Math.PI * 3 / 2);
        ctx.closePath();
        ctx.stroke();
    }

    drawText(x, y, text) {
        // Draw the text
        ctx.fillStyle = this.textColor; // Or any color you prefer
        ctx.fillText(text, x, y);
    }

    update(deltaTime) {
        if (GAME_OVER === false && dialogueText.length < 1) {
            return;
        }
        // message.innerText = (deltaTime + "").substring(0, 2);
        // Check if it's time to draw the rectangle
        this.btnDelay -= deltaTime;
        if (this.btnDelay <= 0) {
            // Draw the rectangle
            // ctx.fillStyle = 'blue';
            this.drawRoundedRectangle(this.rectX * 1.5, this.rectY * 1.5, this.rectWidth * 0.5, this.rectHeight * 0.3);
            this.drawText(this.x, this.y + camera.height * 0.07, "restart");
            // ctx.fillRect(this.rectX, this.rectY, this.rectWidth, this.rectHeight);
            this.btnDelay = 0; // Reset the delay
        }
    }
}


function spawnInitialAsteroids() {
    console.log('spawnInitialAsteroids');
    for (let i = 0; i < INITIAL_ASTEROID_COUNT; i++) {
        if (entities.length < MAX_ENTITIES) {
            const asteroid = new Asteroid();
            asteroids.push(asteroid);
            entities.push(asteroid);
        }
    }
    console.log('asteroids spawned:', asteroids.length);
}

function createParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

function handleCollisions() {
    if (GAME_OVER) {
        return;
    }
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];

        // Check collision with projectiles
        for (let j = 0; j < projectiles.length; j++) {
            const projectile = projectiles[j];
            const distance = Math.hypot(projectile.x - asteroid.x, projectile.y - asteroid.y);

            if (distance < asteroid.radius + projectile.radius) {
                score++;
                message.innerText = score;
                // Calculate new velocities based on conservation of momentum and energy
                const totalMass = asteroid.mass + projectile.mass;
                const newVelocityX = (asteroid.mass * asteroid.velocityX + projectile.mass * Math.cos(projectile.angle) * projectile.speed) / totalMass;
                const newVelocityY = (asteroid.mass * asteroid.velocityY + projectile.mass * Math.sin(projectile.angle) * projectile.speed) / totalMass;

                // Split the asteroid
                const newAsteroids = asteroid.split();
                asteroids.splice(i, 1);
                entities.splice(entities.indexOf(asteroid), 1);
                i--;

                // Add new asteroids to the game
                for (const newAsteroid of newAsteroids) {
                    newAsteroid.velocityX = newVelocityX + (Math.random() - 0.5) * 20;
                    newAsteroid.velocityY = newVelocityY + (Math.random() - 0.5) * 20;
                    asteroids.push(newAsteroid);
                    entities.push(newAsteroid);
                }

                // Remove the projectile
                projectiles.splice(j, 1);
                entities.splice(entities.indexOf(projectile), 1);
                j--;

                break;
            }
        }

        // Check collision with ship
        const shipDistance = Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y);
        if (shipDistance < asteroid.radius + ship.radius) {
            // Game over logic can be added here
            GAME_OVER = true;
            clearEntities();
            console.log("Game over!");
            dialogueText = "Game Over!";
        }
    }
}




function drawWorldBorder() {
    ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-cameraOffset.x, -cameraOffset.y, world.width, world.height);
}


//////
function drawMiniMap() {
    const minimapSize = {
        width: camera.width * MINIMAP_SCALE,
        height: camera.height * MINIMAP_SCALE
    };

    // message.innerText = `| map ${MINIMAP_MARGIN}`;

    // Save the current context state
    ctx.save();

    // Set up the mini-map area
    ctx.fillStyle = 'rgba(0, 0, 3, 0.5)';
    ctx.fillRect(MINIMAP_MARGIN, MINIMAP_MARGIN, minimapSize.width, minimapSize.height);

    // Draw mini world border
    ctx.strokeStyle = 'hsl(220, 60%, 30%)';
    ctx.strokeRect(MINIMAP_MARGIN, MINIMAP_MARGIN, minimapSize.width, minimapSize.height);
    ctx.fill();

    // Calculate the scale factor for objects within the mini-map
    const scaleFactor = minimapSize.width / world.width;

    // Draw mini asteroids
    asteroids.forEach(asteroid => {
        ctx.fillStyle = `hsl(${asteroid.hue}, ${asteroid.saturation}%, ${asteroid.lightness}%)`;
        ctx.beginPath();
        ctx.arc(
            MINIMAP_MARGIN + asteroid.x * scaleFactor,
            MINIMAP_MARGIN + asteroid.y * scaleFactor,
            asteroid.radius * scaleFactor,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    // Draw mini ship
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
        MINIMAP_MARGIN + ship.x * scaleFactor,
        MINIMAP_MARGIN + ship.y * scaleFactor,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Draw mini view area
    ctx.strokeStyle = 'hsla(170, 60%, 30%, 0.4)';
    ctx.strokeRect(
        MINIMAP_MARGIN + (ship.x - camera.width / 2) * scaleFactor,
        MINIMAP_MARGIN + (ship.y - camera.height / 2) * scaleFactor,
        camera.width * scaleFactor,
        camera.height * scaleFactor
    );

    // Restore the context state
    ctx.restore();
}
///////

const actionBtnSize = {
    // button dimensions
    buttonWidth: ((camera.width < 800) ? camera.width * 0.2 : camera.width * 0.1),
    buttonHeight: camera.height * 0.1,
    // Calculate rectangle position in bottom left corner
    buttonPosX: 10,
    buttonPosY: camera.height - (camera.height * 0.1 + 10),
    // getButtonY : () => {
    //   return height - (height * 0.1 + 10);
    // }
}

const resetBtnSize = {
    // button dimensions
    buttonWidth: camera.width * 0.25, // rectWidth * 0.5 (half of camera.width * 0.5)
    buttonHeight: camera.height * 0.09, // rectHeight * 0.3 (30% of camera.height * 0.3)
    // Position to match the dialogue's drawing position
    buttonPosX: camera.width / 2 - (camera.width * 0.25) / 2, // Center horizontally
    buttonPosY: camera.height / 2 + camera.height * 0.07 - camera.height * 0.045, // Center vertically with text offset
};

function drawButton(buttonSize) {
    // Stroke style
    ctx.strokeStyle = 'pink';
    ctx.lineWidth = 2;

    // Draw the rectangle stroke
    ctx.strokeRect(buttonSize.buttonPosX, buttonSize.buttonPosY, buttonSize.buttonWidth, buttonSize.buttonHeight);
}

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, camera.width, camera.height);

    drawWorldBorder();

    particles.forEach(particle => {
        particle.update(deltaTime);
        particle.draw();
    });

    ship.update(deltaTime);
    ship.draw();

    asteroids.forEach(asteroid => {
        asteroid.update(deltaTime);
        asteroid.draw();
    });

    projectiles.forEach((projectile, index) => {
        projectile.update(deltaTime);
        projectile.draw();

        if (projectile.lifespan <= 0) {
            projectiles.splice(index, 1);
            entities.splice(entities.indexOf(projectile), 1);
        }
    });

    handleCollisions();

    // Draw the UI elements last, so they appear on top
    drawMiniMap();
    drawButton(actionBtnSize); // comment
    dialogue.update(deltaTime);
    dialogue.draw();

    if (isMouseDown && isShootingAsteroid) {
        ship.shoot();
    }

    // Draw cursor
    const isOverAsteroid = isPointOverAsteroid(mouseX, mouseY);
    
    if (isOverAsteroid) {
        // Draw targeting square
        const squareSize = 22;
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            mouseX - squareSize / 2,
            mouseY - squareSize / 2,
            squareSize,
            squareSize
        );
    }

    // Draw cursor dot
    drawCursorDot(isOverAsteroid);

    requestAnimationFrame(gameLoop);
}



function drawCursorDot(isOverAsteroid) {
    ctx.beginPath();
    // ctx.arc(mouseX, mouseY, 3, 0, Math.PI * 2);
    ctx.rect(mouseX - 3, mouseY - 3, 6, 6);
    ctx.fillStyle = isOverAsteroid ? 'yellow' : 'white';
    ctx.fill();
    ctx.closePath();
}

function clearEntities() {
    // console.log('the entities', entities);
    // TODO: this won't clear the entities yet
    let names = [];
    for (let i = 0; i < entities.length; i++) {
        names.push(entities[i].name);
    }
    console.log('clearEntities names:', names);
}

function initGame() {
    dialogue = new Dialogue();
    entities.push(dialogue);
    ship = new Ship();
    entities.push(ship);
    createParticles();
    spawnInitialAsteroids();
    requestAnimationFrame(gameLoop);
}

initGame();

function isPointOverAsteroid(x, y) {
    // Convert screen coordinates to world coordinates by adding camera offset
    const worldX = x + cameraOffset.x;
    const worldY = y + cameraOffset.y;
    
    return asteroids.some(asteroid => {
        const dx = worldX - asteroid.x;
        const dy = worldY - asteroid.y;
        return Math.sqrt(dx * dx + dy * dy) <= asteroid.radius;
    });
}

function calculateNewPosition(x, y, angle, speed, maxSpeed, deltaTime) {
    // Convert angle to radians
    // const angleRadians = angle * (Math.PI / 180);
    const angleRadians = angle;

    // Calculate velocity components
    const velocityX = logarithmicIncrease(speed, 0.1, maxSpeed) * Math.cos(angleRadians);
    const velocityY = logarithmicIncrease(speed, 0.1, maxSpeed) * Math.sin(angleRadians);

    // Update position
    const newX = x + velocityX * deltaTime;
    const newY = y + velocityY * deltaTime;

    return { x: newX, y: newY };
}


function logarithmicIncrease(currentValue, step, max) {
    // Prevent division by zero
    if (currentValue <= 0) {
        return currentValue;
    }

    // Calculate the new value based on the logarithmic function
    const newValue = Math.min(max, currentValue * Math.pow(1.1, step));
    return newValue;
}

function countObjectProperties(obj) {
    let count = 0;

    // Iterate over object properties using for...in loop
    for (let property in obj) {
        // Check if the property is not a prototype property
        if (obj.hasOwnProperty(property)) {
            count++;
        }
    }

    return count;
}

function checkBoundsRect(point, rect) {
    // point expect point.x, point.y
    // rect expect rect.x, rect.y, rect.h, rect.w
    // what is anchor of rect x, y ?? lets assume top-left?
    // validate
    if (countObjectProperties(point) !== 2 || countObjectProperties(rect) !== 4) {
        return false;
    }
    const checkX = (point.x > rect.x && point.x < (rect.x + rect.w));
    const checkY = (point.y > rect.y && point.y < (rect.y + rect.h));
    // console.log(`checkX ${checkX}, checkY ${checkY}`);

    return (checkX && checkY); // both must be true to return true
}


function isUIButtonClicked(buttonSize) {
    // mouseX and mouseY are in gameCameraCoords
    // buttonSize Width and Height also needs button position to be in gameCameraCoords
    let point = { x: mouseX, y: mouseY };
    let rect = { x: buttonSize.buttonPosX, y: buttonSize.buttonPosY, w: buttonSize.buttonWidth, h: buttonSize.buttonHeight };
    let isInBounds = checkBoundsRect(point, rect);

    // console.log(`x${mouseX} y${mouseY} px${buttonSize.buttonPosX} py${buttonSize.buttonPosY} bw${buttonSize.buttonWidth} bh${buttonSize.buttonHeight}`);
    return (isInBounds);
}

function handlePointerDown(event) {
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();

    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    console.log('pointer down');

    if (GAME_OVER && isUIButtonClicked(resetBtnSize)) { // if GameOver & reset btn clicked
        // reset game
        console.log('RESET Game');
        console.log('GOOD isUIButtonClicked...', isUIButtonClicked(resetBtnSize));
        GAME_OVER = false;
        dialogueText = ''; // Clear the dialogue text
        initGame(); // This does not reset all of the game, such as Asteroids and Dust
        // Clear all entities and respawn asteroids
        asteroids = [];
        projectiles = [];
        entities = [];
        spawnInitialAsteroids();
    }

    if (!GAME_OVER && isUIButtonClicked(actionBtnSize)) {
        // do stuff like shoot or change weapons
        switch (currentWeapon) {
            case 'laser':
                currentWeapon = 'machineGun';
                // weaponButton.textContent = '🔫';
                break;
            case 'machineGun':
                currentWeapon = 'missile';
                // weaponButton.textContent = '🚀';
                break;
            case 'missile':
                currentWeapon = 'laser';
                // weaponButton.textContent = '🔦';
                break;
        }
        ship.shoot();


    };

    const asteroidClicked = asteroids.some(asteroid => {
        const screenX = asteroid.x - cameraOffset.x;
        const screenY = asteroid.y - cameraOffset.y;
        const distance = Math.hypot(mouseX - screenX, mouseY - screenY);
        return distance <= asteroid.radius;
    });

    if (!GAME_OVER && asteroidClicked) {
        isShootingAsteroid = true;
        ship.shoot();
    }

    if (!GAME_OVER && !asteroidClicked && !isUIButtonClicked(actionBtnSize)) {
        ship.setTarget(mouseX, mouseY);
    }
}

function handlePointerMove(event) {
    // x and y relative to the canvas rect
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;

    if (isMouseDown && !GAME_OVER && !isShootingAsteroid && !isUIButtonClicked(actionBtnSize)) {
        ship.setTarget(mouseX, mouseY);
    }
}

function handlePointerUp() {
    isMouseDown = false;
    isShootingAsteroid = false;
    console.log('pointer up');
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handlePointerDown(e.touches[0]);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handlePointerMove(e.touches[0]);
});
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    handlePointerUp();
});

//TODO: -ship thruster effect
//        -ship contrails effect at speed
// 
//TODO: shooting fixes
//        -fix shots start position(s)

//
//TODO:    -fix game re-init of asteroids
//         -fix re-init of dust
//         -fix re-init of UI elements
//TODO:    -Animation: ship explosion
//         -Physics: asteroid collision & bounce
//         -Animation: and effects
//TODO: -entities that reach edge of world should instead wrap around to other side of world
//TODO: .-camera should not be bound to world, and should also be able to wrap around as ship approaches/crosses world boundary
//TODO: .-basic dialogue/modal (text, delay)
// 
//TODO: shoot key for desktops
//        -shoot button for gamepads
//        -controls for gamepads
//TODO: -UI buttons [shoot/interact, change weapon, boost?]
//        should UI buttons be circles (for finger touch)?
//        -add change weapon button in canvas
//
//TODO: FX ship at max speed effect
//TODO: FX dust should streak at speed
//TODO: ship should take N ms to accelerate to speed
//TODO: FX effects when asteroids hit
//TODO: varied asteroid speeds
//TODO: x-use SVG
//        .-use SVG for sprites e.g. ship/shots/effects/asteroid texture
//TODO: mouse position fixes
//        .-ship/mouse alignment. center of ship appears about 15px left or mouse.
//        -draw mouse cursor crosshair in canvas instead of CSS?

// broken asteroids
// working on entities array so we can clear them



function loadSVGString(svgString) {
    // Get the canvas element
    // const canvas = document.getElementById(canvasId);

    // Create a new image element
    const img = new Image();

    // Set the image source to the SVG string
    // img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);   // 
    img.src = 'data:image/svg+xml;charset=utf-8,' + svgString;

    // Load the image
    img.onload = function () {
        drawSVGImg(img);
    };

    return img;
}

function drawSVGImg(img) {
    // Draw the image onto the canvas
    // const ctx = canvas.getContext('2d');
    ctx.rotate((90 * Math.PI) / 180);
    ctx.scale(0.25, 0.25);
    ctx.translate(-154, -206);
    ctx.drawImage(img, 1, 1, 300, 300);
    ctx.translate(154, 206);
    ctx.scale(4, 4);
    ctx.rotate((-90 * Math.PI) / 180);
    // perhaps timing issue. load svg once. When ready use it?
}

const shipSVG = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1110" height="1110" viewBox="817.5,362.5,110,110"><g id="document" fill="#ffffff" fill-rule="nonzero" stroke="#000000" stroke-width="0" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" ><rect x="5202.27273" y="1647.72727" transform="scale(0.15714,0.22)" width="700" height="500" id="Shape 1 1" vector-effect="non-scaling-stroke"/></g><g fill="white" fill-rule="nonzero" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"><g id="stage"><g id="layer1 1"><path d="M821.60345,466.98276l41.81819,-87.88263l7.42319,-15.60013l52.65517,102.79311l-51.44828,-27.18965z" id="Path 3"/><path d="M868.01726,412.38048l6.75056,-0.02159l5.04149,20.55973l-16.36421,0.3818z" id="Path 3"/><path d="M870.87479,369.24255l0.64607,43.36469" id="Path 3"/><path d="M871.85375,460.37879l5.79776,-5.75343l-12.15152,-0.03429z" id="Path 3"/><path d="M874.15248,426.12645" id="Path 3"/><path d="M849.41412,447.8546l21.46448,-78.27112l24.75585,78.18049" id="Path 3"/><path d="M822.40716,465.29373l49.43258,-31.91997l51.00257,31.63544" id="Path 1 1"/><path d="M863.26579,444.29662l2.23421,7.02571h12l2.14622,-8.20529" id="Path 3"/><path d="M864.93246,450.72458l-5.90909,3.33333l-2.87879,-2.12121l1.61797,-4.9366" id="Path 3"/><path d="M878.65151,450.52932l5.90909,3.33333l2.87879,-2.12121l-1.61797,-4.9366" id="Path 2 1"/><path d="M871.75064,438.9064l-0.30303,12.41593" id="Path 3"/><path d="M872.81125,411.78519" id="Path 3"/></g></g></g></svg>
`;
