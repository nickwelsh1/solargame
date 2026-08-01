export class Player {
    constructor() {
        this.currentWeapon = 'machineGun';
        this.BULLET_FIRE_RATE = 100;
        this.MISSILE_FIRE_RATE = 500;
        this.LASER_FIRE_RATE = 1000;
        this.BEAM_FIRE_RATE = 800;
        this.lastLaserFireTime = 0;
        this.lastBulletFireTime = 0;
        this.lastMissileFireTime = 0;
        this.lastBeamFireTime = 0;
    }
}
