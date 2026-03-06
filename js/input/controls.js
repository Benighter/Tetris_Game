import {
    canvas,
    gameOverNameInput,
    goHomeButton,
    menuButton,
    mobileControlsElement,
    restartButton,
    saveScoreButton,
    settingsButton,
    startButton
} from '../core/dom.js';
import { openMainMenu } from '../ui/menu.js';
import { state } from '../core/state.js';
import {
    closeGameOver,
    hardDropCurrentPiece,
    moveCurrentPiece,
    rotateCurrentPiece,
    softDropCurrentPiece,
    submitPendingLeaderboardEntry,
    startGame
} from '../game/game.js';

const controlledKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'a', 'd', 's', 'w']);
const repeatableTouchControls = new Set(['left', 'right', 'down']);
const activeTouchRepeats = new Map();
let activeGesture = null;

function blurFocusedButton() {
    if (
        document.activeElement === startButton
        || document.activeElement === restartButton
        || document.activeElement === settingsButton
        || document.activeElement === menuButton
    ) {
        document.activeElement.blur();
    }
}

function handleKeydown(event) {
    if (!state.currentPiece || state.gameOver || state.isClearingLines || state.isPaused) {
        return;
    }

    if (controlledKeys.has(event.key)) {
        event.preventDefault();
    }

    blurFocusedButton();

    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            moveCurrentPiece(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
            moveCurrentPiece(1, 0);
            break;
        case 'ArrowDown':
        case 's':
            softDropCurrentPiece();
            break;
        case 'ArrowUp':
        case 'w':
            rotateCurrentPiece();
            break;
        case ' ':
            hardDropCurrentPiece();
            break;
        default:
            break;
    }
}

function canControlActivePiece() {
    return Boolean(state.currentPiece) && !state.gameOver && !state.isClearingLines && !state.isPaused;
}

function triggerControl(action) {
    if (!canControlActivePiece()) {
        return;
    }

    switch (action) {
        case 'left':
            moveCurrentPiece(-1, 0);
            break;
        case 'right':
            moveCurrentPiece(1, 0);
            break;
        case 'down':
            softDropCurrentPiece();
            break;
        case 'rotate':
            rotateCurrentPiece();
            break;
        case 'drop':
            hardDropCurrentPiece();
            break;
        default:
            break;
    }
}

function stopTouchRepeat(action) {
    const repeatHandle = activeTouchRepeats.get(action);
    if (!repeatHandle) {
        return;
    }

    window.clearTimeout(repeatHandle.timeoutId);
    window.clearInterval(repeatHandle.intervalId);
    activeTouchRepeats.delete(action);
}

function startTouchRepeat(action) {
    stopTouchRepeat(action);

    if (!repeatableTouchControls.has(action)) {
        return;
    }

    const timeoutId = window.setTimeout(() => {
        const intervalId = window.setInterval(() => {
            triggerControl(action);
        }, 80);

        const repeatState = activeTouchRepeats.get(action);
        if (repeatState) {
            repeatState.intervalId = intervalId;
        }
    }, 170);

    activeTouchRepeats.set(action, {
        timeoutId,
        intervalId: null
    });
}

function stopAllTouchRepeats() {
    for (const action of activeTouchRepeats.keys()) {
        stopTouchRepeat(action);
    }
}

function handleTouchControlStart(event) {
    const button = event.target.closest('[data-control]');
    if (!button) {
        return;
    }

    const { control } = button.dataset;
    if (!control) {
        return;
    }

    event.preventDefault();
    triggerControl(control);
    startTouchRepeat(control);
}

function handleTouchControlEnd(event) {
    const button = event.target.closest('[data-control]');
    if (!button) {
        stopAllTouchRepeats();
        return;
    }

    const { control } = button.dataset;
    if (control) {
        stopTouchRepeat(control);
    }
}

function handleBoardGestureStart(event) {
    if (event.pointerType === 'mouse') {
        return;
    }

    activeGesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now()
    };

    canvas.setPointerCapture(event.pointerId);
}

function handleBoardGestureEnd(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) {
        return;
    }

    const deltaX = event.clientX - activeGesture.startX;
    const deltaY = event.clientY - activeGesture.startY;
    const elapsed = performance.now() - activeGesture.startTime;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (horizontalDistance < 14 && verticalDistance < 14 && elapsed < 260) {
        triggerControl('rotate');
    } else if (horizontalDistance > verticalDistance && horizontalDistance > 22) {
        const steps = Math.max(1, Math.min(4, Math.floor(horizontalDistance / 26)));
        const direction = deltaX < 0 ? -1 : 1;
        for (let step = 0; step < steps; step += 1) {
            moveCurrentPiece(direction, 0);
        }
    } else if (deltaY > 24) {
        if (verticalDistance > 110 || elapsed < 220) {
            triggerControl('drop');
        } else {
            const steps = Math.max(1, Math.min(5, Math.floor(verticalDistance / 28)));
            for (let step = 0; step < steps; step += 1) {
                softDropCurrentPiece();
            }
        }
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }

    activeGesture = null;
}

function handleBoardGestureCancel(event) {
    if (activeGesture && activeGesture.pointerId === event.pointerId && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }

    activeGesture = null;
}

function saveScoreFromGameOver() {
    submitPendingLeaderboardEntry(gameOverNameInput.value);
}

function restartFromGameOver() {
    submitPendingLeaderboardEntry(gameOverNameInput.value);
    startGame();
}

function goHomeFromGameOver() {
    submitPendingLeaderboardEntry(gameOverNameInput.value);
    closeGameOver();
    openMainMenu();
}

export function initControls() {
    document.addEventListener('keydown', handleKeydown);
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartFromGameOver);
    goHomeButton.addEventListener('click', goHomeFromGameOver);
    saveScoreButton.addEventListener('click', saveScoreFromGameOver);
    mobileControlsElement.addEventListener('pointerdown', handleTouchControlStart);
    mobileControlsElement.addEventListener('pointerup', handleTouchControlEnd);
    mobileControlsElement.addEventListener('pointercancel', handleTouchControlEnd);
    mobileControlsElement.addEventListener('pointerleave', handleTouchControlEnd);
    canvas.addEventListener('pointerdown', handleBoardGestureStart);
    canvas.addEventListener('pointerup', handleBoardGestureEnd);
    canvas.addEventListener('pointercancel', handleBoardGestureCancel);
    gameOverNameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveScoreFromGameOver();
        }
    });
}
