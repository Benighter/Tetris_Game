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
const repeatableTouchControls = new Set(['down']);
const activeTouchRepeats = new Map();
const BOARD_TAP_DISTANCE = 14;
const BOARD_TAP_DURATION = 230;
const BOARD_HORIZONTAL_STEP = 22;
const BOARD_SOFT_DROP_STEP = 26;
const BOARD_SOFT_DROP_HOLD_DELAY = 170;
const BOARD_SOFT_DROP_REPEAT = 72;
const BOARD_HARD_DROP_DISTANCE = 110;
const BOARD_HARD_DROP_DURATION = 215;
const START_BUTTON_HOLD_DELAY = 650;
let activeGesture = null;
let startButtonHoldTimerId = null;

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

function hasActiveRun() {
    return state.board.length > 0 && !state.gameOver;
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

function stopBoardSoftDrop(gestureState = activeGesture) {
    if (!gestureState) {
        return;
    }

    if (gestureState.softDropDelayId) {
        window.clearTimeout(gestureState.softDropDelayId);
        gestureState.softDropDelayId = null;
    }

    if (gestureState.softDropIntervalId) {
        window.clearInterval(gestureState.softDropIntervalId);
        gestureState.softDropIntervalId = null;
    }
}

function scheduleBoardSoftDrop(gestureState) {
    stopBoardSoftDrop(gestureState);

    gestureState.softDropDelayId = window.setTimeout(() => {
        if (!activeGesture || activeGesture.pointerId !== gestureState.pointerId || !canControlActivePiece()) {
            return;
        }

        gestureState.usedSoftDrop = true;
        softDropCurrentPiece();
        gestureState.softDropIntervalId = window.setInterval(() => {
            if (!canControlActivePiece()) {
                stopBoardSoftDrop(gestureState);
                return;
            }

            gestureState.usedSoftDrop = true;
            softDropCurrentPiece();
        }, BOARD_SOFT_DROP_REPEAT);
    }, BOARD_SOFT_DROP_HOLD_DELAY);
}

function resetStartButtonHoldState() {
    if (startButtonHoldTimerId) {
        window.clearTimeout(startButtonHoldTimerId);
        startButtonHoldTimerId = null;
    }

    startButton.classList.remove('start-button-arming');
    if (hasActiveRun()) {
        startButton.textContent = 'Hold For New Run';
    }
}

function handleStartButtonClick(event) {
    if (hasActiveRun()) {
        event.preventDefault();
        startButton.textContent = 'Hold For New Run';
        return;
    }

    startGame();
}

function handleStartButtonPressStart(event) {
    if (!hasActiveRun()) {
        return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
    }

    event.preventDefault();
    resetStartButtonHoldState();
    startButton.classList.add('start-button-arming');
    startButton.textContent = 'Keep Holding...';
    startButtonHoldTimerId = window.setTimeout(() => {
        startButtonHoldTimerId = null;
        startButton.classList.remove('start-button-arming');
        startGame();
    }, START_BUTTON_HOLD_DELAY);
}

function handleStartButtonPressEnd() {
    resetStartButtonHoldState();
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
    if (event.pointerType === 'mouse' || !canControlActivePiece()) {
        return;
    }

    event.preventDefault();

    activeGesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        startTime: performance.now(),
        horizontalCarry: 0,
        verticalCarry: 0,
        usedSoftDrop: false,
        usedHorizontalMove: false,
        softDropDelayId: null,
        softDropIntervalId: null
    };

    scheduleBoardSoftDrop(activeGesture);
    canvas.setPointerCapture(event.pointerId);
}

function handleBoardGestureMove(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) {
        return;
    }

    event.preventDefault();

    const deltaX = event.clientX - activeGesture.lastX;
    const deltaY = event.clientY - activeGesture.lastY;
    const totalX = event.clientX - activeGesture.startX;
    const totalY = event.clientY - activeGesture.startY;

    activeGesture.lastX = event.clientX;
    activeGesture.lastY = event.clientY;

    if (Math.abs(totalX) > BOARD_TAP_DISTANCE || totalY < -BOARD_TAP_DISTANCE) {
        stopBoardSoftDrop(activeGesture);
    }

    activeGesture.horizontalCarry += deltaX;
    while (Math.abs(activeGesture.horizontalCarry) >= BOARD_HORIZONTAL_STEP) {
        const direction = activeGesture.horizontalCarry < 0 ? -1 : 1;
        moveCurrentPiece(direction, 0);
        activeGesture.usedHorizontalMove = true;
        activeGesture.horizontalCarry -= BOARD_HORIZONTAL_STEP * direction;
        stopBoardSoftDrop(activeGesture);
    }

    if (deltaY > 0) {
        activeGesture.verticalCarry += deltaY;
        while (activeGesture.verticalCarry >= BOARD_SOFT_DROP_STEP) {
            softDropCurrentPiece();
            activeGesture.usedSoftDrop = true;
            activeGesture.verticalCarry -= BOARD_SOFT_DROP_STEP;
        }
    }
}

function handleBoardGestureEnd(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) {
        return;
    }

    event.preventDefault();

    const deltaX = event.clientX - activeGesture.startX;
    const deltaY = event.clientY - activeGesture.startY;
    const elapsed = performance.now() - activeGesture.startTime;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    stopBoardSoftDrop(activeGesture);

    if (!activeGesture.usedHorizontalMove && !activeGesture.usedSoftDrop && horizontalDistance < BOARD_TAP_DISTANCE && verticalDistance < BOARD_TAP_DISTANCE && elapsed < BOARD_TAP_DURATION) {
        triggerControl('rotate');
    } else if (deltaY > BOARD_HARD_DROP_DISTANCE && elapsed <= BOARD_HARD_DROP_DURATION) {
        triggerControl('drop');
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }

    activeGesture = null;
}

function handleBoardGestureCancel(event) {
    if (!activeGesture || activeGesture.pointerId !== event.pointerId) {
        return;
    }

    stopBoardSoftDrop(activeGesture);

    if (canvas.hasPointerCapture(event.pointerId)) {
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
    startButton.addEventListener('click', handleStartButtonClick);
    startButton.addEventListener('pointerdown', handleStartButtonPressStart);
    startButton.addEventListener('pointerup', handleStartButtonPressEnd);
    startButton.addEventListener('pointercancel', handleStartButtonPressEnd);
    startButton.addEventListener('pointerleave', handleStartButtonPressEnd);
    restartButton.addEventListener('click', restartFromGameOver);
    goHomeButton.addEventListener('click', goHomeFromGameOver);
    saveScoreButton.addEventListener('click', saveScoreFromGameOver);
    mobileControlsElement.addEventListener('pointerdown', handleTouchControlStart);
    mobileControlsElement.addEventListener('pointerup', handleTouchControlEnd);
    mobileControlsElement.addEventListener('pointercancel', handleTouchControlEnd);
    mobileControlsElement.addEventListener('pointerleave', handleTouchControlEnd);
    canvas.addEventListener('pointerdown', handleBoardGestureStart);
    canvas.addEventListener('pointermove', handleBoardGestureMove);
    canvas.addEventListener('pointerup', handleBoardGestureEnd);
    canvas.addEventListener('pointercancel', handleBoardGestureCancel);
    gameOverNameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveScoreFromGameOver();
        }
    });
}
