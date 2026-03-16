import { initParticles } from './rendering/effects.js';
import { resizeGameBoard } from './rendering/board.js';
import { state } from './core/state.js';
import {
    handleGamepadAction,
    handleGamepadButtonPress,
    handleGamepadDirection,
    initControls,
    isGamepadCaptureActive,
    setControllerConnected
} from './input/controls.js';
import { createGamepadManager } from './input/gamepad.js';
import { initMenuUI } from './ui/menu.js';

let gamepadManager = null;

function syncViewportHeight() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
}

function initializeApp() {
    syncViewportHeight();
    resizeGameBoard();
    initMenuUI();
    initControls();
    initParticles();

    gamepadManager?.destroy?.();
    gamepadManager = createGamepadManager({
        getBindings() {
            return state.settings.controllerBindings;
        },
        onConnectionChange({ connected }) {
            setControllerConnected(connected);
        },
        shouldSuppressActions: isGamepadCaptureActive,
        onDirection: handleGamepadDirection,
        onButtonPress: handleGamepadButtonPress,
        onAction: handleGamepadAction
    });
}

window.addEventListener('resize', () => {
    syncViewportHeight();
    resizeGameBoard();
});
window.visualViewport?.addEventListener('resize', () => {
    syncViewportHeight();
    resizeGameBoard();
});
window.addEventListener('load', () => {
    syncViewportHeight();
    resizeGameBoard();
});

initializeApp();
