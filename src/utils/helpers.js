export function randomMinMax(min = 0, max) {
    return Math.random() * (max - min) + min;
}

export function calculateNewPosition(x, y, angle, speed, maxSpeed, deltaTime) {
    const angleRadians = angle;

    const velocityX =
        logarithmicIncrease(speed, 0.1, maxSpeed) * Math.cos(angleRadians);
    const velocityY =
        logarithmicIncrease(speed, 0.1, maxSpeed) * Math.sin(angleRadians);

    const newX = x + velocityX * deltaTime;
    const newY = y + velocityY * deltaTime;

    return { x: newX, y: newY };
}

export function logarithmicIncrease(currentValue, step, max) {
    if (currentValue <= 0) {
        return currentValue;
    }

    const newValue = Math.min(max, currentValue * 1.1 ** step);
    return newValue;
}

export function countObjectProperties(obj) {
    let count = 0;

    for (const property in obj) {
        if (Object.hasOwn(obj, property)) {
            count++;
        }
    }

    return count;
}

export function checkBoundsRect(point, rect) {
    if (
        countObjectProperties(point) !== 2 ||
        countObjectProperties(rect) !== 4
    ) {
        return false;
    }
    const checkX = point.x > rect.x && point.x < rect.x + rect.w;
    const checkY = point.y > rect.y && point.y < rect.y + rect.h;

    return checkX && checkY;
}
