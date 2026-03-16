import { cloneControllerBindings } from '../input/controller-config.js';

export const defaultSettings = {
    playerName: 'Player One',
    showGhostPiece: true,
    showGrid: true,
    showParticles: true,
    controllerBindings: cloneControllerBindings()
};

export const state = {
    board: [],
    score: 0,
    level: 1,
    totalLinesCleared: 0,
    gameOver: false,
    isClearingLines: false,
    isPaused: false,
    hasSubmittedScore: false,
    gameInterval: null,
    renderLoopId: null,
    currentPiece: null,
    nextPiece: null,
    blockSize: 20,
    nextPieceBlockSize: 20,
    settings: {
        ...defaultSettings,
        controllerBindings: cloneControllerBindings(defaultSettings.controllerBindings)
    }
};

export function resetGameState() {
    state.board = [];
    state.score = 0;
    state.level = 1;
    state.totalLinesCleared = 0;
    state.gameOver = false;
    state.isClearingLines = false;
    state.isPaused = false;
    state.hasSubmittedScore = false;
    state.gameInterval = null;
    state.currentPiece = null;
    state.nextPiece = null;
}

export function updateSettings(nextSettings) {
    const {
        startingLevel: _removedStartingLevel,
        renderFps: _removedRenderFps,
        speedProfile: _removedSpeedProfile,
        ...sanitizedNextSettings
    } = nextSettings;
    const {
        startingLevel: _legacyStartingLevel,
        renderFps: _legacyRenderFps,
        speedProfile: _legacySpeedProfile,
        ...currentSettings
    } = state.settings;

    state.settings = {
        ...currentSettings,
        ...sanitizedNextSettings,
        controllerBindings: cloneControllerBindings(sanitizedNextSettings.controllerBindings || currentSettings.controllerBindings)
    };
}
