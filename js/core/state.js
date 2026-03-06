export const defaultSettings = {
    playerName: 'Player One',
    showGhostPiece: true,
    showGrid: true,
    showParticles: true,
    speedProfile: 'classic',
    startingLevel: 1
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
    currentPiece: null,
    nextPiece: null,
    blockSize: 20,
    nextPieceBlockSize: 20,
    settings: { ...defaultSettings }
};

export function resetGameState() {
    state.board = [];
    state.score = 0;
    state.level = state.settings.startingLevel;
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
    state.settings = {
        ...state.settings,
        ...nextSettings
    };
}
