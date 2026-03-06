import { initParticles } from './rendering/effects.js';
import { resizeGameBoard } from './rendering/board.js';
import { initControls } from './input/controls.js';
import { initMenuUI } from './ui/menu.js';

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
