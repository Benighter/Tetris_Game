import { COLORS, COLS, NEXT_PIECE_COLS, NEXT_PIECE_ROWS, ROWS } from '../core/constants.js';
import {
    canvas,
    context,
    gameContainer,
    gameInfoElement,
    mobileControlsElement,
    nextPieceCanvas,
    nextPieceContext,
    titleElement
} from '../core/dom.js';
import { state } from '../core/state.js';
import { shadeColor } from '../utils/color.js';

function getGapSize(element) {
    const styles = window.getComputedStyle(element);
    const gap = Number.parseFloat(styles.gap || styles.rowGap || '0');
    return Number.isFinite(gap) ? gap : 0;
}

function getOuterHeight(element) {
    if (!element || !element.offsetParent) {
        return 0;
    }

    const rect = element.getBoundingClientRect();
    return rect.height;
}

function getOuterWidth(element) {
    if (!element || !element.offsetParent) {
        return 0;
    }

    const rect = element.getBoundingClientRect();
    return rect.width;
}

export function drawBlock(ctx, x, y, color, blockSize = state.blockSize) {
    const gradient = ctx.createLinearGradient(
        x * blockSize,
        y * blockSize,
        x * blockSize + blockSize,
        y * blockSize + blockSize
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -20));

    ctx.fillStyle = gradient;
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize / 5);
    ctx.fillRect(x * blockSize, y * blockSize, blockSize / 5, blockSize);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
}

export function drawBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (state.settings.showGrid) {
        context.strokeStyle = 'rgba(52, 152, 219, 0.1)';
        context.lineWidth = 0.5;

        for (let x = 0; x <= COLS; x++) {
            context.beginPath();
            context.moveTo(x * state.blockSize, 0);
            context.lineTo(x * state.blockSize, canvas.height);
            context.stroke();
        }

        for (let y = 0; y <= ROWS; y++) {
            context.beginPath();
            context.moveTo(0, y * state.blockSize);
            context.lineTo(canvas.width, y * state.blockSize);
            context.stroke();
        }
    }

    state.board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(context, x, y, COLORS[value]);
            }
        });
    });
}

export function drawNextPieceBoard() {
    nextPieceContext.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (!state.nextPiece) {
        return;
    }

    const { shape, colorIndex } = state.nextPiece;
    const offsetX = Math.floor((NEXT_PIECE_COLS - shape[0].length) / 2);
    const offsetY = Math.floor((NEXT_PIECE_ROWS - shape.length) / 2);

    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(nextPieceContext, x + offsetX, y + offsetY, COLORS[colorIndex], state.nextPieceBlockSize);
            }
        });
    });
}

export function renderGame() {
    drawBoard();
    if (state.currentPiece) {
        state.currentPiece.draw();
    }
}

export function resizeGameBoard() {
    const viewport = window.visualViewport;
    const viewportWidth = Math.floor(viewport?.width || window.innerWidth);
    const viewportHeight = Math.floor(viewport?.height || window.innerHeight);
    const containerStyles = window.getComputedStyle(gameContainer);
    const isColumnLayout = containerStyles.flexDirection === 'column';
    const isMobileViewport = viewportWidth <= 900;
    const gap = getGapSize(gameContainer);
    const controlsHeight = getOuterHeight(mobileControlsElement);
    const infoHeight = getOuterHeight(gameInfoElement);
    const infoWidth = getOuterWidth(gameInfoElement);
    const titleHeight = getOuterHeight(titleElement);
    const baseVerticalPadding = isMobileViewport ? 10 : 64;
    const baseHorizontalPadding = isMobileViewport ? 16 : 80;
    const controlsReserve = isMobileViewport
        ? Math.max(controlsHeight, 48)
        : controlsHeight;

    let maxBoardHeight;
    let maxBoardWidth;

    if (isColumnLayout) {
        maxBoardHeight = viewportHeight - titleHeight - infoHeight - controlsReserve - gap - baseVerticalPadding;
        maxBoardWidth = viewportWidth - baseHorizontalPadding;
    } else {
        maxBoardHeight = viewportHeight - titleHeight - controlsReserve - baseVerticalPadding;
        maxBoardWidth = viewportWidth - infoWidth - gap - baseHorizontalPadding;
    }

    const safeBoardHeight = Math.max(140, maxBoardHeight);
    const safeBoardWidth = Math.max(100, maxBoardWidth);
    const blockFromHeight = Math.floor(safeBoardHeight / ROWS);
    const blockFromWidth = Math.floor(safeBoardWidth / COLS);

    state.blockSize = Math.max(8, Math.min(blockFromHeight, blockFromWidth));
    canvas.width = state.blockSize * COLS;
    canvas.height = state.blockSize * ROWS;

    state.nextPieceBlockSize = Math.floor(state.blockSize * (isMobileViewport ? 0.62 : 0.8));
    nextPieceCanvas.width = state.nextPieceBlockSize * NEXT_PIECE_COLS;
    nextPieceCanvas.height = state.nextPieceBlockSize * NEXT_PIECE_ROWS;

    if (state.board.length > 0) {
        renderGame();
        drawNextPieceBoard();
    }
}
