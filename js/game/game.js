import { COLS, ROWS } from '../core/constants.js';
import {
    gameOverElement,
    gameOverNameInput,
    gameOverSaveSection,
    levelElement,
    saveScoreButton,
    saveScoreStatus,
    scoreElement,
    startButton
} from '../core/dom.js';
import { resetGameState, state } from '../core/state.js';
import { submitLeaderboardEntry } from '../data/leaderboard.js';
import {
    animateGameStart,
    animateLevelUp,
    animateLineClear,
    createLandingEffect,
    createLineParticles,
    showGameOver
} from '../rendering/effects.js';
import { drawNextPieceBoard, renderGame, resizeGameBoard } from '../rendering/board.js';
import { getRandomPiece } from './piece.js';
import { refreshLeaderboardUI } from '../ui/leaderboard.js';

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function calculateScore(lines) {
    switch (lines) {
        case 1:
            return 40 * state.level;
        case 2:
            return 100 * state.level;
        case 3:
            return 300 * state.level;
        case 4:
            return 1200 * state.level;
        default:
            return 0;
    }
}

function restartGameLoop() {
    if (state.gameInterval) {
        clearInterval(state.gameInterval);
    }
    state.gameInterval = setInterval(gameLoop, getGameSpeed());
}

function resolveSpeedProfile() {
    switch (state.settings.speedProfile) {
        case 'chill':
            return { baseDelay: 1150, levelStep: 45, minDelay: 380 };
        case 'turbo':
            return { baseDelay: 900, levelStep: 70, minDelay: 180 };
        default:
            return { baseDelay: 1000, levelStep: 60, minDelay: 250 };
    }
}

function spawnNextPiece() {
    state.currentPiece = state.nextPiece;
    state.nextPiece = getRandomPiece();
    drawNextPieceBoard();

    if (!state.currentPiece.isValidMove(state.currentPiece.x, state.currentPiece.y, state.currentPiece.shape)) {
        state.gameOver = true;
    }
}

function clearLines() {
    const linesToClear = [];

    for (let y = ROWS - 1; y >= 0; y--) {
        if (state.board[y].every(value => value > 0)) {
            linesToClear.push(y);
        }
    }

    if (linesToClear.length === 0) {
        return false;
    }

    const validatedLines = [...linesToClear].sort((a, b) => b - a);
    state.isClearingLines = true;
    createLineParticles(validatedLines);

    animateLineClear(validatedLines, () => {
        const rowsToClear = new Set(validatedLines);
        const remainingRows = state.board.filter((_, index) => !rowsToClear.has(index));
        const emptyRows = Array.from({ length: validatedLines.length }, () => Array(COLS).fill(0));
        state.board = [...emptyRows, ...remainingRows];

        state.totalLinesCleared += validatedLines.length;
        state.score += calculateScore(validatedLines.length);
        scoreElement.textContent = state.score;

        const newLevel = Math.floor(state.totalLinesCleared / 10) + state.settings.startingLevel;
        if (newLevel > state.level) {
            state.level = newLevel;
            levelElement.textContent = state.level;
            restartGameLoop();
            animateLevelUp();
        }

        state.isClearingLines = false;
        spawnNextPiece();
        renderGame();
    });

    return true;
}

function lockPiece(piece = state.currentPiece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value <= 0) {
                return;
            }

            if (piece.y + y < 0) {
                state.gameOver = true;
                return;
            }

            state.board[piece.y + y][piece.x + x] = piece.colorIndex;
        });
    });

    if (state.gameOver) {
        return;
    }

    if (clearLines()) {
        state.currentPiece = null;
        return;
    }

    spawnNextPiece();
}

function hasPendingLeaderboardEntry() {
    return !state.hasSubmittedScore && (state.score > 0 || state.totalLinesCleared > 0);
}

function syncGameOverSaveUI(message = '') {
    const shouldShowSave = hasPendingLeaderboardEntry();

    gameOverSaveSection.classList.toggle('hidden', !shouldShowSave);
    gameOverNameInput.value = state.settings.playerName;
    gameOverNameInput.disabled = !shouldShowSave;
    saveScoreButton.disabled = !shouldShowSave;
    saveScoreButton.textContent = shouldShowSave ? 'Save Score' : 'Score Saved';
    saveScoreStatus.textContent = message;
}

export function getGameSpeed() {
    const profile = resolveSpeedProfile();
    const levelOffset = Math.max(0, state.level - state.settings.startingLevel);
    return Math.max(profile.baseDelay - (levelOffset * profile.levelStep), profile.minDelay);
}

export function startGame() {
    resizeGameBoard();

    if (state.gameInterval) {
        clearInterval(state.gameInterval);
    }

    resetGameState();
    state.board = createBoard();
    scoreElement.textContent = state.score;
    levelElement.textContent = state.level;
    gameOverElement.style.display = 'none';
    startButton.textContent = 'Restart Run';
    syncGameOverSaveUI('');

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    state.currentPiece = getRandomPiece();
    state.nextPiece = getRandomPiece();

    renderGame();
    drawNextPieceBoard();
    refreshLeaderboardUI();
    restartGameLoop();
    animateGameStart();
}

export function gameLoop() {
    if (state.gameOver) {
        clearInterval(state.gameInterval);
        syncGameOverSaveUI('');
        showGameOver();
        return;
    }

    if (state.isClearingLines || state.isPaused || !state.currentPiece) {
        return;
    }

    const landedPiece = state.currentPiece;
    if (!state.currentPiece.move(0, 1)) {
        lockPiece(landedPiece);
        createLandingEffect(landedPiece);
    }

    renderGame();
}

export function moveCurrentPiece(dx, dy) {
    if (!state.currentPiece || state.gameOver || state.isClearingLines || state.isPaused) {
        return false;
    }

    const moved = state.currentPiece.move(dx, dy);
    renderGame();
    return moved;
}

export function rotateCurrentPiece() {
    if (!state.currentPiece || state.gameOver || state.isClearingLines || state.isPaused) {
        return;
    }

    state.currentPiece.rotate();
    renderGame();
}

export function softDropCurrentPiece() {
    if (!state.currentPiece || state.gameOver || state.isClearingLines || state.isPaused) {
        return;
    }

    const landedPiece = state.currentPiece;
    if (!state.currentPiece.move(0, 1)) {
        lockPiece(landedPiece);
        createLandingEffect(landedPiece);
    }

    renderGame();
}

export function hardDropCurrentPiece() {
    if (!state.currentPiece || state.gameOver || state.isClearingLines || state.isPaused) {
        return;
    }

    while (state.currentPiece.move(0, 1)) {
        // Hard drop until the piece lands.
    }

    const landedPiece = state.currentPiece;
    lockPiece(landedPiece);
    createLandingEffect(landedPiece);
    renderGame();
}

export function pauseGame() {
    state.isPaused = true;
}

export function resumeGame() {
    if (!state.gameOver) {
        state.isPaused = false;
    }
}

export function closeGameOver() {
    gameOverElement.style.display = 'none';
}

export function submitPendingLeaderboardEntry(playerName = state.settings.playerName) {
    if (!hasPendingLeaderboardEntry()) {
        return false;
    }

    submitLeaderboardEntry({
        name: playerName,
        score: state.score,
        level: state.level,
        lines: state.totalLinesCleared,
        speedProfile: state.settings.speedProfile
    });

    state.hasSubmittedScore = true;
    refreshLeaderboardUI();

    gameOverNameInput.value = playerName;
    gameOverNameInput.disabled = true;
    saveScoreButton.disabled = true;
    saveScoreButton.textContent = 'Saved';
    saveScoreStatus.textContent = 'Saved to the local top 5.';
    return true;
}

export function syncGameSettings() {
    if (state.board.length > 0 && !state.gameOver) {
        restartGameLoop();
    }

    if (state.board.length === 0 || state.level < state.settings.startingLevel) {
        state.level = state.settings.startingLevel;
        levelElement.textContent = state.level;
    }

    renderGame();
    drawNextPieceBoard();
}
