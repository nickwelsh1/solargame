import { checkCircleCollision } from '../utils/physics.js';

/**
 * Check if a line segment (beam) collides with a circle
 * @param {Object} beam - Beam object with x, y, angle, length, radius
 * @param {number} circleX - Circle x position
 * @param {number} circleY - Circle y position
 * @param {number} circleRadius - Circle radius
 * @returns {boolean} - True if collision detected
 */
function checkLineCircleCollision(beam, circleX, circleY, circleRadius) {
    // Vector from beam start to circle center
    const dx = circleX - beam.x;
    const dy = circleY - beam.y;

    // Beam direction vector
    const beamDx = Math.cos(beam.angle);
    const beamDy = Math.sin(beam.angle);

    // Project circle center onto beam line
    const projection = dx * beamDx + dy * beamDy;

    // Clamp projection to beam length
    const clampedProjection = Math.max(0, Math.min(projection, beam.length));

    // Find closest point on beam line to circle center
    const closestX = beam.x + beamDx * clampedProjection;
    const closestY = beam.y + beamDy * clampedProjection;

    // Check distance from circle center to closest point on beam
    const distance = Math.hypot(circleX - closestX, circleY - closestY);

    return distance <= circleRadius + beam.radius;
}

/**
 * Increment the game score and update display
 */
function incrementScore(game) {
    game.state.score++;
}

/**
 * Calculate impact velocity based on conservation of momentum
 * @param {Object} asteroid - Asteroid object
 * @param {Object} projectile - Projectile object
 * @returns {Object} - New velocity {x, y}
 */
function calculateImpactVelocity(asteroid, projectile) {
    const totalMass = asteroid.mass + projectile.mass;
    const newVelocityX =
        (asteroid.mass * asteroid.velocityX +
            projectile.mass * Math.cos(projectile.angle) * projectile.speed) /
        totalMass;
    const newVelocityY =
        (asteroid.mass * asteroid.velocityY +
            projectile.mass * Math.sin(projectile.angle) * projectile.speed) /
        totalMass;
    return { x: newVelocityX, y: newVelocityY };
}

/**
 * Destroy an asteroid and spawn fragments
 * @param {Object} game - Game instance
 * @param {Object} asteroid - Asteroid to destroy
 * @param {number} baseVelocityX - Base X velocity for fragments
 * @param {number} baseVelocityY - Base Y velocity for fragments
 * @param {number} velocityRandomness - Random velocity variation (default: 20)
 */
function destroyAsteroid(
    game,
    asteroid,
    baseVelocityX,
    baseVelocityY,
    velocityRandomness = 20,
) {
    // Split the asteroid
    const newAsteroids = asteroid.split();

    // Remove asteroid from arrays
    const asteroidIndex = game.asteroids.indexOf(asteroid);
    if (asteroidIndex !== -1) {
        game.asteroids.splice(asteroidIndex, 1);
    }
    const entityIndex = game.entities.indexOf(asteroid);
    if (entityIndex !== -1) {
        game.entities.splice(entityIndex, 1);
    }

    // Add new asteroids with velocity
    for (const newAsteroid of newAsteroids) {
        newAsteroid.velocityX =
            baseVelocityX + (Math.random() - 0.5) * velocityRandomness;
        newAsteroid.velocityY =
            baseVelocityY + (Math.random() - 0.5) * velocityRandomness;
        game.asteroids.push(newAsteroid);
        game.entities.push(newAsteroid);
    }
}

/**
 * Remove a projectile from game arrays
 * @param {Object} game - Game instance
 * @param {Object} projectile - Projectile to remove
 */
function removeProjectile(game, projectile) {
    const projectileIndex = game.projectiles.indexOf(projectile);
    if (projectileIndex !== -1) {
        game.projectiles.splice(projectileIndex, 1);
    }
    const entityIndex = game.entities.indexOf(projectile);
    if (entityIndex !== -1) {
        game.entities.splice(entityIndex, 1);
    }
}

/**
 * Check collisions between projectiles and asteroids
 */
function checkProjectileAsteroidCollisions(game) {
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];

        for (let j = game.projectiles.length - 1; j >= 0; j--) {
            const projectile = game.projectiles[j];

            if (
                checkCircleCollision(
                    projectile.x,
                    projectile.y,
                    projectile.radius,
                    asteroid.x,
                    asteroid.y,
                    asteroid.radius,
                )
            ) {
                incrementScore(game);

                // Calculate impact velocity
                const impactVelocity = calculateImpactVelocity(
                    asteroid,
                    projectile,
                );

                // Destroy asteroid and create fragments
                destroyAsteroid(
                    game,
                    asteroid,
                    impactVelocity.x,
                    impactVelocity.y,
                );

                // Remove the projectile
                removeProjectile(game, projectile);

                break; // Move to next asteroid
            }
        }
    }
}

/**
 * Check collisions between beams and asteroids
 */
function checkBeamAsteroidCollisions(game) {
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];

        for (let k = 0; k < game.beams.length; k++) {
            const beam = game.beams[k];

            if (
                checkLineCircleCollision(
                    beam,
                    asteroid.x,
                    asteroid.y,
                    asteroid.radius,
                )
            ) {
                incrementScore(game);

                // Destroy asteroid with its current velocity
                destroyAsteroid(
                    game,
                    asteroid,
                    asteroid.velocityX,
                    asteroid.velocityY,
                );

                // Don't remove the beam - it can hit multiple asteroids
                break; // Move to next asteroid
            }
        }
    }
}

/**
 * Check collisions between ship and asteroids
 */
export function checkShipAsteroidCollisions(game) {
    if (game.ship.dead) return;

    for (let i = 0; i < game.asteroids.length; i++) {
        const asteroid = game.asteroids[i];

        if (
            checkCircleCollision(
                game.ship.x,
                game.ship.y,
                game.ship.radius,
                asteroid.x,
                asteroid.y,
                asteroid.radius,
            )
        ) {
            const shipSpeedX =
                game.ship.speed * 1000 * Math.cos(game.ship.movementAngle);
            const shipSpeedY =
                game.ship.speed * 1000 * Math.sin(game.ship.movementAngle);
            const relativeSpeed = Math.hypot(
                shipSpeedX - asteroid.velocityX,
                shipSpeedY - asteroid.velocityY,
            );

            if (relativeSpeed >= 30) {
                game.ship.takeDamage(10);
            }
        }
    }
}

/**
 * Check collisions between asteroids and handle bouncing
 */
function checkAsteroidAsteroidCollisions(game) {
    // Check each pair of asteroids only once
    for (let i = 0; i < game.asteroids.length - 1; i++) {
        for (let j = i + 1; j < game.asteroids.length; j++) {
            const asteroid1 = game.asteroids[i];
            const asteroid2 = game.asteroids[j];

            if (
                checkCircleCollision(
                    asteroid1.x,
                    asteroid1.y,
                    asteroid1.radius,
                    asteroid2.x,
                    asteroid2.y,
                    asteroid2.radius,
                )
            ) {
                handleAsteroidAsteroidCollision(asteroid1, asteroid2);
            }
        }
    }
}

/**
 * Handle asteroid-asteroid collision with proper physics
 * @param {Object} a - First asteroid
 * @param {Object} b - Second asteroid
 */
function handleAsteroidAsteroidCollision(a, b) {
    // Calculate direction from a to b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);

    // Avoid division by zero
    if (distance === 0) return;

    // Normalize direction vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate relative velocity
    const vx = b.velocityX - a.velocityX;
    const vy = b.velocityY - a.velocityY;

    // Calculate relative velocity in terms of the normal direction
    const velocityAlongNormal = vx * nx + vy * ny;

    // Do not resolve if objects are moving away from each other
    if (velocityAlongNormal > 0) return;

    // Calculate restitution (bounciness)
    const restitution = 0.8;

    // Calculate impulse scalar
    const totalMass = a.mass + b.mass;
    const j =
        (-(1 + restitution) * velocityAlongNormal) / (1 / a.mass + 1 / b.mass);

    // Apply impulse
    const impulseX = j * nx;
    const impulseY = j * ny;

    // Update velocities with impulse
    a.velocityX -= impulseX / a.mass;
    a.velocityY -= impulseY / a.mass;
    b.velocityX += impulseX / b.mass;
    b.velocityY += impulseY / b.mass;

    // Separate asteroids to prevent overlap
    const overlap = (a.radius + b.radius - distance) * 0.5;
    if (overlap > 0) {
        // Move each asteroid away by half the overlap
        const moveX = nx * overlap;
        const moveY = ny * overlap;

        // Move the asteroids apart based on their mass ratio
        const ratioA = b.mass / totalMass;
        const ratioB = a.mass / totalMass;

        a.x -= moveX * ratioA;
        a.y -= moveY * ratioA;
        b.x += moveX * ratioB;
        b.y += moveY * ratioB;
    }
}

/**
 * Main collision handler - orchestrates all collision checks
 */
function checkAsteroidPlanetCollisions(game) {
    // if no planets, return
    if (game.planets.length === 0) return;

    for (let j = 0; j < game.planets.length; j++) {
        const planet = game.planets[j];
        for (let i = 0; i < game.asteroids.length; i++) {
            const asteroid = game.asteroids[i];

            // Calculate direction from planet to asteroid (normal points away from planet)
            const dx = asteroid.x - planet.x;
            const dy = asteroid.y - planet.y;
            const distance = Math.hypot(dx, dy);

            // Check if asteroid is colliding with planet
            if (distance < asteroid.radius + planet.radius) {
                // Avoid division by zero
                if (distance === 0) continue;

                // Normalize direction vector
                const nx = dx / distance;
                const ny = dy / distance;

                // Calculate velocity along the normal
                // (planet is immovable, so relative velocity is just asteroid's velocity)
                const velocityAlongNormal =
                    asteroid.velocityX * nx + asteroid.velocityY * ny;

                // Do not resolve if asteroid is moving away from planet
                if (velocityAlongNormal > 0) continue;

                // Calculate restitution (bounciness)
                const restitution = 0.7;

                // Calculate impulse scalar (planet has infinite mass)
                const j = -(1 + restitution) * velocityAlongNormal;

                // Apply impulse to asteroid
                asteroid.velocityX += j * nx;
                asteroid.velocityY += j * ny;

                // Separate asteroid from planet to prevent overlap
                const overlap = asteroid.radius + planet.radius - distance;
                if (overlap > 0) {
                    // Push asteroid away from planet
                    asteroid.x += overlap * nx;
                    asteroid.y += overlap * ny;
                }

                // TODO: Add some visual feedback
            }
        }
    }
}

function checkAsteroidContainerCollisions(game) {
    for (let i = game.containers.length - 1; i >= 0; i--) {
        const container = game.containers[i];
        const containerRadius = Math.hypot(
            container.width / 2,
            container.height / 2,
        );
        for (let j = 0; j < game.asteroids.length; j++) {
            const asteroid = game.asteroids[j];
            if (
                checkCircleCollision(
                    asteroid.x,
                    asteroid.y,
                    asteroid.radius,
                    container.x,
                    container.y,
                    containerRadius,
                )
            ) {
                const relativeSpeed = Math.hypot(
                    container.velocityX - asteroid.velocityX,
                    container.velocityY - asteroid.velocityY,
                );

                if (relativeSpeed >= 30) {
                    container.takeDamage(10);
                }
                break;
            }
        }
    }
}

function checkSatelliteCollisions(game) {
    if (!game.satellites || game.satellites.length === 0) return;

    for (let sIdx = 0; sIdx < game.satellites.length; sIdx++) {
        const sat = game.satellites[sIdx];

        // 1. Ship vs Satellite (bounce)
        if (game.ship && !game.ship.dead) {
            if (
                checkCircleCollision(
                    game.ship.x,
                    game.ship.y,
                    game.ship.radius,
                    sat.x,
                    sat.y,
                    sat.radius,
                )
            ) {
                const dx = game.ship.x - sat.x;
                const dy = game.ship.y - sat.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                // Push ship out of overlap
                const overlap = game.ship.radius + sat.radius - dist;
                if (overlap > 0) {
                    game.ship.x += nx * overlap;
                    game.ship.y += ny * overlap;
                }

                // Bounce ship velocity / direction
                const shipSpeed = game.ship.speed;
                const shipAngle = game.ship.movementAngle;
                const vx = Math.cos(shipAngle) * shipSpeed;
                const vy = Math.sin(shipAngle) * shipSpeed;
                const dot = vx * nx + vy * ny;

                if (dot < 0) {
                    const rvx = vx - 1.8 * dot * nx;
                    const rvy = vy - 1.8 * dot * ny;
                    game.ship.movementAngle = Math.atan2(rvy, rvx);
                    game.ship.angle = game.ship.movementAngle;
                }

                if (shipSpeed * 1000 >= 30) {
                    game.ship.takeDamage(10);
                }
            }
        }

        // 2. Asteroids vs Satellite (bounce)
        for (let aIdx = 0; aIdx < game.asteroids.length; aIdx++) {
            const ast = game.asteroids[aIdx];
            if (
                checkCircleCollision(
                    ast.x,
                    ast.y,
                    ast.radius,
                    sat.x,
                    sat.y,
                    sat.radius,
                )
            ) {
                const dx = ast.x - sat.x;
                const dy = ast.y - sat.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                const overlap = ast.radius + sat.radius - dist;
                if (overlap > 0) {
                    ast.x += nx * overlap;
                    ast.y += ny * overlap;
                }

                const dot = ast.velocityX * nx + ast.velocityY * ny;
                if (dot < 0) {
                    ast.velocityX -= 1.8 * dot * nx;
                    ast.velocityY -= 1.8 * dot * ny;
                }
            }
        }

        // 3. Projectiles vs Satellite
        for (let pIdx = game.projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = game.projectiles[pIdx];
            if (
                checkCircleCollision(
                    proj.x,
                    proj.y,
                    proj.radius,
                    sat.x,
                    sat.y,
                    sat.radius,
                )
            ) {
                sat.takeDamage(15);
                removeProjectile(game, proj);
            }
        }

        // 4. Beams vs Satellite
        for (let bIdx = 0; bIdx < game.beams.length; bIdx++) {
            const beam = game.beams[bIdx];
            if (checkLineCircleCollision(beam, sat.x, sat.y, sat.radius)) {
                sat.takeDamage(25);
            }
        }
    }
}

function checkFreighterCollisions(game) {
    if (!game.freighters || game.freighters.length === 0) return;

    for (let fIdx = 0; fIdx < game.freighters.length; fIdx++) {
        const freighter = game.freighters[fIdx];

        // 1. Ship vs Freighter
        if (game.ship && !game.ship.dead) {
            if (
                checkCircleCollision(
                    game.ship.x,
                    game.ship.y,
                    game.ship.radius,
                    freighter.x,
                    freighter.y,
                    freighter.radius,
                )
            ) {
                const dx = game.ship.x - freighter.x;
                const dy = game.ship.y - freighter.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                const shipSpeed = game.ship.speed * 1000;
                const freighterSpeed = freighter.speed;
                const relSpeed = Math.hypot(
                    Math.cos(game.ship.movementAngle) * shipSpeed -
                        Math.cos(freighter.angle) * freighterSpeed,
                    Math.sin(game.ship.movementAngle) * shipSpeed -
                        Math.sin(freighter.angle) * freighterSpeed,
                );

                // Push ship out
                const overlap = game.ship.radius + freighter.radius - dist;
                if (overlap > 0) {
                    game.ship.x += nx * overlap;
                    game.ship.y += ny * overlap;
                }

                // Bump mechanics: force check
                freighter.onBump(relSpeed, Math.atan2(dy, dx));

                if (relSpeed >= 35) {
                    game.ship.takeDamage(10);
                }
            }
        }

        // 2. Asteroids vs Freighter
        for (let aIdx = 0; aIdx < game.asteroids.length; aIdx++) {
            const ast = game.asteroids[aIdx];
            if (
                checkCircleCollision(
                    ast.x,
                    ast.y,
                    ast.radius,
                    freighter.x,
                    freighter.y,
                    freighter.radius,
                )
            ) {
                const dx = ast.x - freighter.x;
                const dy = ast.y - freighter.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                const astSpeed = Math.hypot(ast.velocityX, ast.velocityY);
                freighter.onBump(astSpeed, Math.atan2(dy, dx));

                const overlap = ast.radius + freighter.radius - dist;
                if (overlap > 0) {
                    ast.x += nx * overlap;
                    ast.y += ny * overlap;
                }

                const dot = ast.velocityX * nx + ast.velocityY * ny;
                if (dot < 0) {
                    ast.velocityX -= 1.6 * dot * nx;
                    ast.velocityY -= 1.6 * dot * ny;
                }
            }
        }

        // 3. Projectiles / Beams vs 4 Rockets & Hull
        for (let rIdx = 0; rIdx < freighter.rockets.length; rIdx++) {
            const rocket = freighter.rockets[rIdx];
            const rPos = freighter.getRocketWorldPos(rocket);

            // Projectiles vs Rocket
            for (let pIdx = game.projectiles.length - 1; pIdx >= 0; pIdx--) {
                const proj = game.projectiles[pIdx];
                if (
                    checkCircleCollision(
                        proj.x,
                        proj.y,
                        proj.radius,
                        rPos.x,
                        rPos.y,
                        rocket.radius + 4,
                    )
                ) {
                    freighter.damageRocket(rocket.id, 15);
                    removeProjectile(game, proj);
                }
            }

            // Beams vs Rocket
            for (let bIdx = 0; bIdx < game.beams.length; bIdx++) {
                const beam = game.beams[bIdx];
                if (
                    checkLineCircleCollision(
                        beam,
                        rPos.x,
                        rPos.y,
                        rocket.radius + 4,
                    )
                ) {
                    freighter.damageRocket(rocket.id, 20);
                }
            }
        }

        // Projectiles vs Main Hull
        for (let pIdx = game.projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = game.projectiles[pIdx];
            if (
                checkCircleCollision(
                    proj.x,
                    proj.y,
                    proj.radius,
                    freighter.x,
                    freighter.y,
                    freighter.radius,
                )
            ) {
                removeProjectile(game, proj);
            }
        }
    }
}

function checkTugCollisions(game) {
    if (!game.tugs || game.tugs.length === 0) return;

    for (let tIdx = 0; tIdx < game.tugs.length; tIdx++) {
        const tug = game.tugs[tIdx];

        // Ship vs Tug
        if (game.ship && !game.ship.dead) {
            if (
                checkCircleCollision(
                    game.ship.x,
                    game.ship.y,
                    game.ship.radius,
                    tug.x,
                    tug.y,
                    tug.radius,
                )
            ) {
                tug.onBump();
                const dx = tug.x - game.ship.x;
                const dy = tug.y - game.ship.y;
                const dist = Math.hypot(dx, dy) || 1;
                tug.x += (dx / dist) * 15;
                tug.y += (dy / dist) * 15;
            }
        }

        // Asteroids vs Tug
        for (let aIdx = 0; aIdx < game.asteroids.length; aIdx++) {
            const ast = game.asteroids[aIdx];
            if (
                checkCircleCollision(
                    ast.x,
                    ast.y,
                    ast.radius,
                    tug.x,
                    tug.y,
                    tug.radius,
                )
            ) {
                tug.onBump();
                const dx = tug.x - ast.x;
                const dy = tug.y - ast.y;
                const dist = Math.hypot(dx, dy) || 1;
                tug.x += (dx / dist) * 15;
                tug.y += (dy / dist) * 15;
            }
        }

        // Projectiles vs Tug
        for (let pIdx = game.projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = game.projectiles[pIdx];
            if (
                checkCircleCollision(
                    proj.x,
                    proj.y,
                    proj.radius,
                    tug.x,
                    tug.y,
                    tug.radius,
                )
            ) {
                tug.takeDamage(15);
                removeProjectile(game, proj);
            }
        }

        // Beams vs Tug
        for (let bIdx = 0; bIdx < game.beams.length; bIdx++) {
            const beam = game.beams[bIdx];
            if (checkLineCircleCollision(beam, tug.x, tug.y, tug.radius)) {
                tug.takeDamage(20);
            }
        }
    }
}

function checkWarpGateCollisions(game) {
    if (
        !game.warpGates ||
        game.warpGates.length === 0 ||
        !game.ship ||
        game.ship.dead
    )
        return;

    for (let i = 0; i < game.warpGates.length; i++) {
        const gate = game.warpGates[i];
        if (
            gate.cooldown <= 0 &&
            checkCircleCollision(
                game.ship.x,
                game.ship.y,
                game.ship.radius,
                gate.x,
                gate.y,
                gate.radius,
            )
        ) {
            gate.teleport(game.ship);
            break;
        }
    }
}

function checkMineCollisions(game) {
    if (!game.mines || game.mines.length === 0) return;

    for (let mIdx = game.mines.length - 1; mIdx >= 0; mIdx--) {
        const mine = game.mines[mIdx];
        if (!mine || mine.destroyed) continue;

        // 1. Mine vs Player Ship: explodes doing 30 damage, destroys mine, becomes debris
        if (game.ship && !game.ship.dead) {
            if (
                checkCircleCollision(
                    game.ship.x,
                    game.ship.y,
                    game.ship.radius,
                    mine.x,
                    mine.y,
                    mine.radius,
                )
            ) {
                mine.explode(game.ship);
                continue;
            }
        }

        // 2. Mine vs Asteroids: won't explode if collision with asteroids or planets
        for (let aIdx = 0; aIdx < game.asteroids.length; aIdx++) {
            const ast = game.asteroids[aIdx];
            if (
                checkCircleCollision(
                    ast.x,
                    ast.y,
                    ast.radius,
                    mine.x,
                    mine.y,
                    mine.radius,
                )
            ) {
                mine.bounceOff(ast.x, ast.y, ast.radius);
            }
        }

        // 3. Mine vs Planets: won't explode if collision with asteroids or planets
        for (let plIdx = 0; plIdx < game.planets.length; plIdx++) {
            const planet = game.planets[plIdx];
            if (
                checkCircleCollision(
                    planet.x,
                    planet.y,
                    planet.radius,
                    mine.x,
                    mine.y,
                    mine.radius,
                )
            ) {
                mine.bounceOff(planet.x, planet.y, planet.radius);
            }
        }

        // 4. Projectiles vs Mine: explodes safely from range
        for (let pIdx = game.projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = game.projectiles[pIdx];
            if (
                checkCircleCollision(
                    proj.x,
                    proj.y,
                    proj.radius,
                    mine.x,
                    mine.y,
                    mine.radius,
                )
            ) {
                removeProjectile(game, proj);
                mine.explode(null);
                break;
            }
        }

        // 5. Beams vs Mine
        if (!mine.destroyed) {
            for (let bIdx = 0; bIdx < game.beams.length; bIdx++) {
                const beam = game.beams[bIdx];
                if (
                    checkLineCircleCollision(beam, mine.x, mine.y, mine.radius)
                ) {
                    mine.explode(null);
                    break;
                }
            }
        }
    }
}

/**
 * Handle collisions between projectiles/beams and asteroids
 * @param {Object} game - Game instance
 */
export function handleAsteroidProjectileCollisions(game) {
    checkProjectileAsteroidCollisions(game);
    checkBeamAsteroidCollisions(game);
}

/**
 * Main collision handler - orchestrates all collision checks
 * @param {Object} game - Game instance
 */
export function handleCollisions(game) {
    if (game.state.game_paused) {
        return;
    }

    handleAsteroidProjectileCollisions(game);
    checkShipAsteroidCollisions(game);
    checkAsteroidAsteroidCollisions(game);
    checkAsteroidPlanetCollisions(game);
    checkAsteroidContainerCollisions(game);
    checkSatelliteCollisions(game);
    checkFreighterCollisions(game);
    checkTugCollisions(game);
    checkWarpGateCollisions(game);
    checkMineCollisions(game);
}

/**
 * Check if a point is over an asteroid
 * @param {Object} game - Game instance
 * @param {number} x - Screen x coordinate
 * @param {number} y - Screen y coordinate
 * @returns {boolean} - True if point is over an asteroid
 */
export function isPointOverAsteroid(game, x, y) {
    // Convert screen coordinates to world coordinates by adding camera offset
    const worldX = x + game.cameraOffset.x;
    const worldY = y + game.cameraOffset.y;

    return game.asteroids.some((asteroid) => {
        const dx = worldX - asteroid.x;
        const dy = worldY - asteroid.y;
        return Math.sqrt(dx * dx + dy * dy) <= asteroid.radius;
    });
}
