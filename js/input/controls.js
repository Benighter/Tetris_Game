import {
    canvas,
    confirmModalElement,
    controllerRemapModalElement,
    gameOverNameInput,
    gameOverElement,
    gameInfoElement,
    goHomeButton,
    mainMenuElement,
    menuButton,
    mobileControlsElement,
    restartButton,
    saveScoreButton,
    settingsModalElement,
    settingsButton,
    startButton
} from '../core/dom.js';
import { resizeGameBoard } from '../rendering/board.js';
import {
    assignControllerBinding,
    beginControllerBindingCapture,
    closeMainMenu,
    getDisplayedControllerBindings,
    handleAppBackNavigation,
    isControllerBindingCaptureActive,
    isConfirmOpen,
    isControllerRemapOpen,
    isMainMenuOpen,
    isSettingsOpen,
    openMainMenu
} from '../ui/menu.js';
import { state } from '../core/state.js';
import {
    closeGameOver,
    hardDropCurrentPiece,
    moveCurrentPiece,
    rotateCurrentPiece,
    resumeGame,
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
const BOARD_SOFT_DROP_HOLD_DELAY = 267;
const BOARD_SOFT_DROP_REPEAT = 100;
const BOARD_HARD_DROP_DISTANCE = 110;
const BOARD_HARD_DROP_DURATION = 215;
const START_BUTTON_HOLD_DELAY = 650;
let activeGesture = null;
let startButtonHoldTimerId = null;
let controllerConnected = false;
let controllerFocusedElement = null;

function detectBaseInputMode() {
    const hasTouchSupport = navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
    return hasTouchSupport ? 'touch' : 'keyboard';
}

function isElementVisible(element) {
    if (!element) {
        return false;
    }

    const styles = window.getComputedStyle(element);
    return Boolean(element)
        && !element.disabled
        && styles.display !== 'none'
        && styles.visibility !== 'hidden'
        && styles.opacity !== '0'
        && element.getClientRects().length > 0
        && !element.classList.contains('hidden');
}

function clearControllerFocus() {
    controllerFocusedElement?.classList.remove('controller-focus');
    controllerFocusedElement = null;
}

function getControllerScope() {
    if (isControllerRemapOpen()) {
        return controllerRemapModalElement;
    }

    if (isElementVisible(confirmModalElement)) {
        return confirmModalElement;
    }

    if (isElementVisible(settingsModalElement)) {
        return settingsModalElement;
    }

    if (isElementVisible(mainMenuElement)) {
        return mainMenuElement;
    }

    if (isElementVisible(gameOverElement)) {
        return gameOverElement;
    }

    return gameInfoElement;
}

function getControllerFocusableElements() {
    const scope = getControllerScope();
    if (!scope) {
        return [];
    }

    return [...scope.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')].filter(isElementVisible);
}

function cycleSelectValue(selectElement, direction) {
    const options = [...selectElement.options];
    const currentIndex = options.findIndex(option => option.value === selectElement.value);
    if (currentIndex < 0) {
        return false;
    }

    const nextIndex = (currentIndex + direction + options.length) % options.length;
    selectElement.value = options[nextIndex].value;
    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function adjustFocusedSetting(direction) {
    if (!(controllerFocusedElement instanceof HTMLElement)) {
        return false;
    }

    if (controllerFocusedElement instanceof HTMLSelectElement) {
        return cycleSelectValue(controllerFocusedElement, direction);
    }

    if (controllerFocusedElement instanceof HTMLInputElement && controllerFocusedElement.type === 'checkbox') {
        controllerFocusedElement.checked = direction > 0;
        controllerFocusedElement.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    return false;
}

function syncControllerFocus(nextElement = null) {
    if (!controllerConnected) {
        clearControllerFocus();
        return;
    }

    const focusableElements = getControllerFocusableElements();
    if (focusableElements.length === 0) {
        clearControllerFocus();
        return;
    }

    const elementToFocus = focusableElements.includes(nextElement)
        ? nextElement
        : focusableElements.includes(controllerFocusedElement)
            ? controllerFocusedElement
            : focusableElements[0];

    if (controllerFocusedElement && controllerFocusedElement !== elementToFocus) {
        controllerFocusedElement.classList.remove('controller-focus');
    }

    controllerFocusedElement = elementToFocus;
    controllerFocusedElement.classList.add('controller-focus');
    controllerFocusedElement.focus?.({ preventScroll: true });
}

function moveControllerFocus(step) {
    const focusableElements = getControllerFocusableElements();
    if (focusableElements.length === 0) {
        clearControllerFocus();
        return;
    }

    const currentIndex = focusableElements.indexOf(controllerFocusedElement);
    const nextIndex = currentIndex >= 0
        ? (currentIndex + step + focusableElements.length) % focusableElements.length
        : 0;

    syncControllerFocus(focusableElements[nextIndex]);
}

function activateControllerFocus() {
    const focusableElements = getControllerFocusableElements();
    if (focusableElements.length === 0) {
        return;
    }

    if (!focusableElements.includes(controllerFocusedElement)) {
        syncControllerFocus(focusableElements[0]);
    }

    if (controllerFocusedElement instanceof HTMLInputElement) {
        if (controllerFocusedElement.type === 'checkbox') {
            controllerFocusedElement.checked = !controllerFocusedElement.checked;
            controllerFocusedElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            controllerFocusedElement.focus({ preventScroll: true });
            controllerFocusedElement.select?.();
        }
    } else if (controllerFocusedElement instanceof HTMLSelectElement) {
        cycleSelectValue(controllerFocusedElement, 1);
    } else {
        controllerFocusedElement?.click();
    }

    window.setTimeout(() => {
        syncControllerFocus();
    }, 0);
}

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

function isGameOverVisible() {
    return isElementVisible(gameOverElement);
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
    }, 267);

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

export function setControllerConnected(isConnected) {
    controllerConnected = isConnected;
    document.body.classList.toggle('controller-connected', isConnected);
    document.body.dataset.inputMode = isConnected ? 'gamepad' : detectBaseInputMode();

    if (isConnected) {
        syncControllerFocus();
    } else {
        clearControllerFocus();
    }

    resizeGameBoard();
}

export function handleGamepadDirection(direction) {
    if (isControllerBindingCaptureActive()) {
        return;
    }

    if (canControlActivePiece()) {
        triggerControl(direction === 'up' ? 'rotate' : direction);
        return;
    }

    if (isSettingsOpen() || isControllerRemapOpen()) {
        if (direction === 'up') {
            moveControllerFocus(-1);
            return;
        }

        if (direction === 'down') {
            moveControllerFocus(1);
            return;
        }

        if (!adjustFocusedSetting(direction === 'left' ? -1 : 1)) {
            moveControllerFocus(direction === 'left' ? -1 : 1);
        }
        return;
    }

    if (direction === 'left' || direction === 'up') {
        moveControllerFocus(-1);
        return;
    }

    if (direction === 'right' || direction === 'down') {
        moveControllerFocus(1);
    }
}

export function handleGamepadConfirm() {
    if (
        isControllerBindingCaptureActive()
        && controllerFocusedElement instanceof HTMLButtonElement
        && controllerFocusedElement.dataset.bindingAction
    ) {
        beginControllerBindingCapture(controllerFocusedElement.dataset.bindingAction);
        return;
    }

    activateControllerFocus();
}

export function handleGamepadRotate() {
    if (canControlActivePiece()) {
        triggerControl('rotate');
    }
}

export function handleGamepadDrop() {
    if (canControlActivePiece()) {
        triggerControl('drop');
    }
}

export function handleGamepadPause() {
    if (isConfirmOpen() || isSettingsOpen() || isControllerRemapOpen()) {
        handleAppBackNavigation();
        window.setTimeout(() => {
            syncControllerFocus();
        }, 0);
        return;
    }

    if (isMainMenuOpen() && hasActiveRun() && state.isPaused) {
        closeMainMenu();
        resumeGame();
        syncControllerFocus();
        return;
    }

    if (!isGameOverVisible()) {
        openMainMenu();
        syncControllerFocus();
    }
}

export function handleGamepadBack() {
    handleAppBackNavigation();
    window.setTimeout(() => {
        syncControllerFocus();
    }, 0);
}

export function handleGamepadAction(actionName) {
    if (actionName) {
        return;
    }
}

export function handleGamepadButtonPress(buttonName) {
    if (!isControllerBindingCaptureActive()) {
        const bindings = getDisplayedControllerBindings();

        if (canControlActivePiece()) {
            if (buttonName === bindings.pause) {
                handleGamepadPause();
                return;
            }

            if (buttonName === bindings.drop || buttonName === 'south') {
                handleGamepadDrop();
                return;
            }

            if (buttonName === bindings.rotate || buttonName === 'east') {
                handleGamepadRotate();
            }

            return;
        }

        if (buttonName === bindings.pause) {
            handleGamepadPause();
            return;
        }

        if (buttonName === bindings.back) {
            handleGamepadBack();
            return;
        }

        if (buttonName === bindings.confirm) {
            handleGamepadConfirm();
        }

        return;
    }

    if (assignControllerBinding(buttonName)) {
        window.setTimeout(() => {
            syncControllerFocus();
        }, 0);
    }
}

export function isGamepadCaptureActive() {
    return isControllerBindingCaptureActive();
}

export function initControls() {
    document.body.dataset.inputMode = detectBaseInputMode();
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
    document.addEventListener('focusin', event => {
        if (
            !controllerConnected
            || !(
                event.target instanceof HTMLButtonElement
                || event.target instanceof HTMLInputElement
                || event.target instanceof HTMLSelectElement
            )
            || !isElementVisible(event.target)
        ) {
            return;
        }

        syncControllerFocus(event.target);
    });
}
