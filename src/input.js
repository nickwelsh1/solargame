export class Input {
    constructor() {
        this.isDraggingFromCenter = false;
        this.isMouseDown = false;
        this.isShootingAsteroid = false;
        this.isShooting = false;
        this.centerHoldStartTime = 0;
        this.isBraking = false;
        this.brakeStartTime = 0;
        this.brakeStartSpeed = 0;
        this.brakeTargetFraction = 0.5;
        this.lastCenterTapTime = 0;
        this.centerDownX = 0;
        this.centerDownY = 0;
    }
}
