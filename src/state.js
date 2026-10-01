export function createState() {
    return {
        screen: 'menu',
        game_over: false,
        game_won: false,
        game_paused: false,
        score: 0,
        timer: {},
        initialContainerCount: 0,
        deliveredContainers: 0,
        debugMode: false,
        inputScheme: 'A',
    };
}
