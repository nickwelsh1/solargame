// Collision Detection Helper Functions

/**
 * Check if two circles collide
 * @param {number} x1 - First circle x position
 * @param {number} y1 - First circle y position
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle x position
 * @param {number} y2 - Second circle y position
 * @param {number} r2 - Second circle radius
 * @returns {boolean} - True if collision detected
 */
export function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    return distance < r1 + r2;
}

/**
 * Calculates the resulting direction and speed from adding two velocities.
 *
 * @param {number} speed1 The magnitude of the first velocity vector.
 * @param {number} direction1 The direction of the first velocity vector in degrees.
 * @param {number} speed2 The magnitude of the second velocity vector.
 * @param {number} direction2 The direction of the second velocity vector in degrees.
 * @param {number} [multiplier=1] Multiplier that controls how much influence the first vector has (higher values give more weight to the first vector)
 * @returns {{speed: number, direction: number}} An object containing the resulting speed and direction in degrees.
 */
export function addVelocities(
    speed1,
    direction1,
    speed2,
    direction2,
    multiplier = 1,
) {
    // Convert directions from degrees to radians for trigonometric functions
    const direction1Rad = (direction1 * Math.PI) / 180;
    const direction2Rad = (direction2 * Math.PI) / 180;

    // Calculate the x and y components of the first velocity (with multiplier)
    const x1 = speed1 * Math.cos(direction1Rad) * multiplier;
    const y1 = speed1 * Math.sin(direction1Rad) * multiplier;

    // Calculate the x and y components of the second velocity
    const x2 = speed2 * Math.cos(direction2Rad);
    const y2 = speed2 * Math.sin(direction2Rad);

    // Add the corresponding x and y components to find the resultant components
    const resultantX = x1 + x2;
    const resultantY = y1 + y2;

    // Calculate the resultant speed (magnitude) using the Pythagorean theorem
    const resultantSpeed = Math.sqrt(
        resultantX * resultantX + resultantY * resultantY,
    );

    // Calculate the resultant direction (angle) using arctangent.
    // Math.atan2 handles the full range of angles and avoids division by zero.
    const resultantDirectionRad = Math.atan2(resultantY, resultantX);

    // Convert the resultant direction back to degrees
    let resultantDirection = (resultantDirectionRad * 180) / Math.PI;

    // Ensure the direction is between 0 and 360 degrees
    if (resultantDirection < 0) {
        resultantDirection += 360;
    }

    return { speed: resultantSpeed, direction: resultantDirection };
}
