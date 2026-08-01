export class State {
    constructor() {
        this.screen = 'menu';
        this.game_over = false;
        this.game_paused = false;
        this.score = 0;
        this.timer = {};
        this.initialContainerCount = 0;
    }
}
