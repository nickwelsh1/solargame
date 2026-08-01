export function startTimer(game, durationMins) {
    game.state.timer.startTime = Date.now(); // in milliseconds
    game.state.timer.duration = durationMins * 60 * 1000; // x minutes in ms
    game.state.timer.timerExpired = false;
    game.state.timer.totalPausedMs = 0;
    game.state.timer.pausedAt = null;

    // Start a timer that updates every second to show score and remaining time
    if (game.state.timer.interval) {
        clearInterval(game.state.timer.interval);
    }

    game.state.timer.interval = setInterval(() => {
        isTimerExpired(game);
    }, 1000); // Check expiry every second
}

function isTimerExpired(game) {
    // Always consider timer expired if game is over
    if (game.state.game_over) {
        return true;
    }

    // Calculate effective elapsed time (excluding paused duration)
    const pausedMs =
        (game.state.timer.totalPausedMs || 0) +
        (game.state.timer.pausedAt
            ? Date.now() - game.state.timer.pausedAt
            : 0);
    const elapsed = Date.now() - game.state.timer.startTime - pausedMs;

    // Check if timer has expired
    if (
        !game.state.timer.timerExpired &&
        elapsed >= game.state.timer.duration
    ) {
        game.state.timer.timerExpired = true;
        // Clear our interval when the timer expires
        if (game.state.timer.interval) {
            clearInterval(game.state.timer.interval);
        }
        console.log('Timer expired! Perform your action here.');
        return true;
    }

    return false;
}

export function checkTimer(game) {
    const pausedMs =
        (game.state.timer.totalPausedMs || 0) +
        (game.state.timer.pausedAt
            ? Date.now() - game.state.timer.pausedAt
            : 0);
    const elapsed = Date.now() - game.state.timer.startTime - pausedMs;
    const remaining = Math.max(0, game.state.timer.duration - elapsed);

    // Format remaining time
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    //   console.log(`Remaining: ${formatted}`);

    return formatted;
}

function clearEntities(game) {
    // console.log('the entities', entities);
    // TODO: this won't clear the entities yet
    const names = [];
    for (let i = 0; i < game.entities.length; i++) {
        names.push(game.entities[i].name);
    }
    console.log('clearEntities names:', names);
}

export function triggerGameOver(game) {
    game.state.game_over = true;

    // Stop the timer when game over
    if (game.state.timer.interval) {
        clearInterval(game.state.timer.interval);
    }

    clearEntities(game);
    console.log('Game over!');
    game.ui.dialogueText = 'Game Over!';
}
