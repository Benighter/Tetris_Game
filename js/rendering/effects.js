import { canvas, gameOverElement, levelElement, particlesContainer, titleElement } from '../core/dom.js';
import { COLORS } from '../core/constants.js';
import { state } from '../core/state.js';

export function animateLineClear(lines, callback) {
    const flashCount = 3;
    let currentFlash = 0;

    const flashInterval = setInterval(() => {
        const context = canvas.getContext('2d');
        lines.forEach(y => {
            for (let x = 0; x < state.board[y].length; x++) {
                context.fillStyle = currentFlash % 2 === 0 ? '#FFFFFF' : COLORS[state.board[y][x]];
                context.fillRect(x * state.blockSize, y * state.blockSize, state.blockSize, state.blockSize);
            }
        });

        currentFlash++;
        if (currentFlash >= flashCount * 2) {
            clearInterval(flashInterval);
            if (callback) {
                callback();
            }
        }
    }, 100);
}

export function createParticle(x, y) {
    if (!state.settings.showParticles) {
        return;
    }

    const particle = document.createElement('div');
    particle.style.position = 'absolute';

    const size = 3 + Math.random() * 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    const color = getRandomColor();
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.boxShadow = `0 0 10px 2px ${color}`;

    const rect = canvas.getBoundingClientRect();
    particle.style.left = `${rect.left + x}px`;
    particle.style.top = `${rect.top + y}px`;
    particle.style.transform = 'translate3d(0, 0, 0)';
    particle.style.willChange = 'transform, opacity';

    particlesContainer.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    let opacity = 1;
    let scale = 1;
    let posX = 0;
    let posY = 0;

    const animate = () => {
        posX += vx;
        posY += vy;
        scale -= 0.01;
        opacity -= 0.02;

        particle.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
        particle.style.opacity = opacity;

        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else if (particle.parentNode === particlesContainer) {
            particlesContainer.removeChild(particle);
        }
    };

    requestAnimationFrame(animate);
}

export function createLineParticles(lines) {
    lines.forEach(y => {
        for (let index = 0; index < 20; index++) {
            createParticle(Math.random() * canvas.width, y * state.blockSize);
        }
    });
}

export function createLandingEffect(piece = state.currentPiece) {
    if (!piece) {
        return;
    }

    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x] > 0) {
                const blockX = (piece.x + x) * state.blockSize;
                const blockY = (piece.y + y) * state.blockSize;
                const particleCount = 2 + Math.floor(Math.random() * 2);

                for (let index = 0; index < particleCount; index++) {
                    createParticle(
                        blockX + Math.random() * state.blockSize,
                        blockY + Math.random() * state.blockSize
                    );
                }
            }
        }
    }
}

export function animateLevelUp() {
    let flashes = 5;
    const flashInterval = setInterval(() => {
        levelElement.style.color = flashes % 2 === 0 ? '#e74c3c' : '#2ecc71';
        flashes--;
        if (flashes < 0) {
            clearInterval(flashInterval);
            levelElement.style.color = '';
        }
    }, 100);

    for (let index = 0; index < 30; index++) {
        setTimeout(() => {
            const side = Math.floor(Math.random() * 4);
            const rect = canvas.getBoundingClientRect();
            let x;
            let y;

            switch (side) {
                case 0:
                    x = rect.left + Math.random() * canvas.width;
                    y = rect.top;
                    break;
                case 1:
                    x = rect.left + canvas.width;
                    y = rect.top + Math.random() * canvas.height;
                    break;
                case 2:
                    x = rect.left + Math.random() * canvas.width;
                    y = rect.top + canvas.height;
                    break;
                default:
                    x = rect.left;
                    y = rect.top + Math.random() * canvas.height;
                    break;
            }

            createParticle(x - rect.left, y - rect.top);
        }, index * 50);
    }
}

export function showGameOver() {
    gameOverElement.style.display = 'flex';
    gameOverElement.style.opacity = '0';

    setTimeout(() => {
        gameOverElement.style.opacity = '1';
    }, 100);

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + canvas.width / 2;
    const centerY = rect.top + canvas.height / 2;

    for (let index = 0; index < 50; index++) {
        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100;
            const x = centerX + Math.cos(angle) * distance - rect.left;
            const y = centerY + Math.sin(angle) * distance - rect.top;
            createParticle(x, y);
        }, index * 30);
    }
}

export function animateGameStart() {
    canvas.style.opacity = '0';
    canvas.style.transform = 'scale(0.9) rotateY(10deg)';

    setTimeout(() => {
        canvas.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
        canvas.style.opacity = '1';
        canvas.style.transform = 'scale(1) rotateY(0deg)';
    }, 100);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2;

    for (let index = 0; index < 40; index++) {
        setTimeout(() => {
            const angle = (index / 40) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius * Math.random();
            const y = centerY + Math.sin(angle) * radius * Math.random();
            createParticle(x, y);
        }, index * 30);
    }

    titleElement.style.textShadow = '0 0 20px #fff, 0 0 30px #3498db, 0 0 40px #3498db';
    setTimeout(() => {
        titleElement.style.transition = 'text-shadow 1s ease';
        titleElement.style.textShadow = '';
    }, 1000);
}

export function initParticles() {
    setInterval(() => {
        if (!state.gameOver && state.settings.showParticles && Math.random() < 0.3) {
            const side = Math.floor(Math.random() * 4);
            let x;
            let y;

            switch (side) {
                case 0:
                    x = Math.random() * canvas.width;
                    y = -5;
                    break;
                case 1:
                    x = canvas.width + 5;
                    y = Math.random() * canvas.height;
                    break;
                case 2:
                    x = Math.random() * canvas.width;
                    y = canvas.height + 5;
                    break;
                default:
                    x = -5;
                    y = Math.random() * canvas.height;
                    break;
            }

            createParticle(x, y);
        }
    }, 500);
}

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * (COLORS.length - 1)) + 1];
}
