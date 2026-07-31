import { describe, expect, it } from 'vitest';
import { addVelocities, checkCircleCollision } from '../src/utils/physics.js';

describe('checkCircleCollision', () => {
    it('returns true when circles overlap', () => {
        expect(checkCircleCollision(0, 0, 5, 3, 4, 5)).toBe(true);
    });

    it('returns false when circles only touch at exactly one point', () => {
        // Distance is 10, sum of radii is 10. Use < so no collision.
        expect(checkCircleCollision(0, 0, 5, 10, 0, 5)).toBe(false);
    });

    it('returns false when circles are separated', () => {
        expect(checkCircleCollision(0, 0, 5, 20, 0, 5)).toBe(false);
    });
});

describe('addVelocities', () => {
    it('adds two velocities in the same direction', () => {
        const result = addVelocities(10, 0, 5, 0);
        expect(result.speed).toBeCloseTo(15);
        expect(result.direction).toBeCloseTo(0);
    });

    it('adds two velocities in opposite directions', () => {
        const result = addVelocities(10, 0, 10, 180);
        // Velocities cancel out when equal and opposite
        expect(result.speed).toBeCloseTo(0);
    });

    it('adds two perpendicular velocities', () => {
        const result = addVelocities(3, 0, 4, 90);
        expect(result.speed).toBeCloseTo(5);
        expect(result.direction).toBeCloseTo(53.13, 1);
    });

    it('wraps negative directions to 0-360', () => {
        const result = addVelocities(1, 180, 2, 0);
        expect(result.direction).toBeGreaterThanOrEqual(0);
        expect(result.direction).toBeLessThan(360);
    });
});
