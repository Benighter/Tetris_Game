import { initParticles } from './rendering/effects.js';
import { resizeGameBoard, startRenderLoop } from './rendering/board.js';
import {
    handleGamepadButtonPress,
    handleGamepadDirection,
    initControls,
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
    startRenderLoop();

    gamepadManager?.destroy?.();
    gamepadManager = createGamepadManager({
        onConnectionChange({ connected }) {
            setControllerConnected(connected);
        },
        onDirection: handleGamepadDirection,
        onButtonPress: handleGamepadButtonPress
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
