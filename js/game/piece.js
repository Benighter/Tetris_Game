import { COLORS, COLS, ROWS, SHAPES } from '../core/constants.js';
import { context } from '../core/dom.js';
import { state } from '../core/state.js';
import { drawBlock } from '../rendering/board.js';

export class Piece {
    constructor(shape, colorIndex) {
        this.shape = shape;
        this.colorIndex = colorIndex;
        this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
        this.rotation = 0;
        this.lastMoveTime = Date.now();
    }

    draw() {
        this.drawGhost();

        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    context.shadowColor = COLORS[this.colorIndex];
                    context.shadowBlur = 10;
                    drawBlock(context, this.x + x, this.y + y, COLORS[this.colorIndex]);
                    context.shadowBlur = 0;
                }
            });
        });
    }

    drawGhost() {
        if (!state.settings.showGhostPiece) {
            return;
        }

        let dropY = this.y;
        while (this.isValidMove(this.x, dropY + 1, this.shape)) {
            dropY++;
        }

        if (dropY <= this.y) {
            return;
        }

        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    context.strokeStyle = COLORS[this.colorIndex];
                    context.lineWidth = 2;
                    context.globalAlpha = 0.2;
                    context.strokeRect(
                        (this.x + x) * state.blockSize,
                        (dropY + y) * state.blockSize,
                        state.blockSize,
                        state.blockSize
                    );
                    context.globalAlpha = 1.0;
                }
            });
        });
    }

    move(dx, dy) {
        if (!this.isValidMove(this.x + dx, this.y + dy, this.shape)) {
            return false;
        }

        this.x += dx;
        this.y += dy;
        return true;
    }

    rotate() {
        const rotatedShape = this.shape[0].map((_, index) => this.shape.map(row => row[index])).reverse();
        let kickX = 0;

        if (!this.isValidMove(this.x, this.y, rotatedShape)) {
            if (this.isValidMove(this.x - 1, this.y, rotatedShape)) {
                kickX = -1;
            } else if (this.isValidMove(this.x + 1, this.y, rotatedShape)) {
                kickX = 1;
            } else if (this.colorIndex === 1 && this.isValidMove(this.x + 2, this.y, rotatedShape)) {
                kickX = 2;
            } else if (this.colorIndex === 1 && this.isValidMove(this.x - 2, this.y, rotatedShape)) {
                kickX = -2;
            } else {
                return;
            }
        }

        this.shape = rotatedShape;
        this.x += kickX;
    }

    isValidMove(newX, newY, shape) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] <= 0) {
                    continue;
                }

                const boardX = newX + x;
                const boardY = newY + y;

                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }

                if (boardY >= 0 && state.board[boardY] && state.board[boardY][boardX] > 0) {
                    return false;
                }
            }
        }

        return true;
    }
}

export function getRandomPiece() {
    const randomIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    return new Piece(SHAPES[randomIndex], randomIndex);
}
