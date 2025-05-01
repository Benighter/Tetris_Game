const canvas = document.getElementById('game-board');
const context = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const gameOverElement = document.getElementById('game-over');
const particlesContainer = document.getElementById('particles-container');
const gameContainer = document.getElementById('game-container');

const COLS = 10;
const ROWS = 20;
let BLOCK_SIZE = 20; // Will be dynamically calculated
const NEXT_PIECE_COLS = 4;
const NEXT_PIECE_ROWS = 4;
let NEXT_PIECE_BLOCK_SIZE = 20; // Will be dynamically calculated

// Function to resize the game board based on available space
function resizeGameBoard() {
    const containerHeight = gameContainer.clientHeight;
    const containerWidth = gameContainer.clientWidth;
    
    // For mobile (portrait orientation)
    if (window.innerWidth <= 768) {
        // Set canvas size to fit the screen height
        const maxHeight = containerHeight * 0.7; // 70% of container height
        BLOCK_SIZE = Math.floor(maxHeight / ROWS);
        
        canvas.width = BLOCK_SIZE * COLS;
        canvas.height = BLOCK_SIZE * ROWS;
    } else {
        // For desktop/landscape
        const maxHeight = containerHeight * 0.95; // 95% of container height
        BLOCK_SIZE = Math.floor(maxHeight / ROWS);
        
        canvas.width = BLOCK_SIZE * COLS;
        canvas.height = BLOCK_SIZE * ROWS;
    }
    
    // Adjust next piece preview size
    NEXT_PIECE_BLOCK_SIZE = Math.floor(BLOCK_SIZE * 0.8);
    nextPieceCanvas.width = NEXT_PIECE_BLOCK_SIZE * 4;
    nextPieceCanvas.height = NEXT_PIECE_BLOCK_SIZE * 4;
    
    // Redraw the board and pieces if game is in progress
    if (board.length > 0) {
        drawBoard();
        if (currentPiece) currentPiece.draw();
        drawNextPieceBoard();
    }
}

// Listen for window resize events
window.addEventListener('resize', resizeGameBoard);

// Initial resize
window.addEventListener('load', resizeGameBoard);

// Colors for the Tetrominoes
const COLORS = [
    null, // 0 - Empty
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// Tetromino shapes
const SHAPES = [
    [], // Placeholder for empty
    [[1, 1, 1, 1]], // I
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]], // L
    [[1, 1], [1, 1]], // O
    [[0, 1, 1], [1, 1, 0]], // S
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]]  // Z
];

let board = [];
let score = 0;
let level = 1;
let gameOver = false;
let gameInterval;
let currentPiece;
let nextPiece;

// --- Game Board --- 

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBlock(ctx, x, y, color, blockSize = BLOCK_SIZE) {
    // Add gradient effect to blocks
    const gradient = ctx.createLinearGradient(
        x * blockSize, 
        y * blockSize, 
        x * blockSize + blockSize, 
        y * blockSize + blockSize
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -20)); // Darker shade for 3D effect
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    
    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize / 5);
    ctx.fillRect(x * blockSize, y * blockSize, blockSize / 5, blockSize);
    
    // Add border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
}

// Helper function to darken/lighten colors
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;  
    G = (G < 255) ? G : 255;  
    B = (B < 255) ? B : 255;  

    R = Math.max(0, R).toString(16).padStart(2, '0');
    G = Math.max(0, G).toString(16).padStart(2, '0');
    B = Math.max(0, B).toString(16).padStart(2, '0');

    return `#${R}${G}${B}`;
}

function drawBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    context.strokeStyle = 'rgba(52, 152, 219, 0.1)';
    context.lineWidth = 0.5;
    
    // Draw vertical grid lines
    for (let x = 0; x <= COLS; x++) {
        context.beginPath();
        context.moveTo(x * BLOCK_SIZE, 0);
        context.lineTo(x * BLOCK_SIZE, canvas.height);
        context.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y <= ROWS; y++) {
        context.beginPath();
        context.moveTo(0, y * BLOCK_SIZE);
        context.lineTo(canvas.width, y * BLOCK_SIZE);
        context.stroke();
    }
    
    // Draw blocks
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(context, x, y, COLORS[value]);
            }
        });
    });
}

function drawNextPieceBoard() {
    nextPieceContext.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (nextPiece) {
        const shape = nextPiece.shape;
        const color = COLORS[nextPiece.colorIndex];
        // Center the piece in the next piece canvas
        const offsetX = Math.floor((NEXT_PIECE_COLS - shape[0].length) / 2);
        const offsetY = Math.floor((NEXT_PIECE_ROWS - shape.length) / 2);

        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    drawBlock(nextPieceContext, x + offsetX, y + offsetY, color, NEXT_PIECE_BLOCK_SIZE);
                }
            });
        });
    }
}

// --- Tetromino Pieces --- 

class Piece {
    constructor(shape, colorIndex) {
        this.shape = shape;
        this.colorIndex = colorIndex;
        this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
        this.rotation = 0; // Track rotation for animation effects
        this.lastMoveTime = Date.now(); // Track time for ghost effect
    }

    draw() {
        // Draw ghost piece (shadow) first
        this.drawGhost();
        
        // Draw actual piece
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    // Add subtle glow effect to active piece
                    context.shadowColor = COLORS[this.colorIndex];
                    context.shadowBlur = 10;
                    drawBlock(context, this.x + x, this.y + y, COLORS[this.colorIndex]);
                    context.shadowBlur = 0; // Reset shadow for other elements
                }
            });
        });
    }
    
    // Draw a ghost piece showing where the piece will land
    drawGhost() {
        // Find the drop position
        let dropY = this.y;
        while (this.isValidMove(this.x, dropY + 1, this.shape)) {
            dropY++;
        }
        
        // Only draw ghost if it's not at the same position as the actual piece
        if (dropY > this.y) {
            this.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value > 0) {
                        // Draw ghost block (transparent outline)
                        context.strokeStyle = COLORS[this.colorIndex];
                        context.lineWidth = 2;
                        context.globalAlpha = 0.2;
                        context.strokeRect(
                            (this.x + x) * BLOCK_SIZE, 
                            (dropY + y) * BLOCK_SIZE, 
                            BLOCK_SIZE, 
                            BLOCK_SIZE
                        );
                        context.globalAlpha = 1.0;
                    }
                });
            });
        }
    }

    move(dx, dy) {
        if (this.isValidMove(this.x + dx, this.y + dy, this.shape)) {
            this.x += dx;
            this.y += dy;
            return true;
        }
        return false;
    }

    rotate() {
        const originalShape = this.shape;
        const newShape = this.shape[0].map((_, i) => this.shape.map(row => row[i])).reverse();

        // Wall kick logic (basic)
        let kickX = 0;
        if (!this.isValidMove(this.x, this.y, newShape)) {
            // Try kicking left
            if (this.isValidMove(this.x - 1, this.y, newShape)) {
                kickX = -1;
            } 
            // Try kicking right
            else if (this.isValidMove(this.x + 1, this.y, newShape)) {
                kickX = 1;
            }
             // Try kicking further right for I piece
            else if (this.colorIndex === 1 && this.isValidMove(this.x + 2, this.y, newShape)) {
                 kickX = 2;
            }
             // Try kicking further left for I piece
            else if (this.colorIndex === 1 && this.isValidMove(this.x - 2, this.y, newShape)) {
                 kickX = -2;
            }
            else {
                return; // Cannot rotate
            }
        }
        this.shape = newShape;
        this.x += kickX;
    }

    isValidMove(newX, newY, shape) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] > 0) {
                    const boardX = newX + x;
                    const boardY = newY + y;

                    // Check boundaries
                    if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                        return false;
                    }
                    // Check collision with existing blocks (ensure boardY is not negative)
                    if (boardY >= 0 && board[boardY] && board[boardY][boardX] > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

function getRandomPiece() {
    const randomIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    return new Piece(SHAPES[randomIndex], randomIndex);
}

// --- Game Logic --- 

function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                // Check for game over condition
                if (currentPiece.y + y < 0) {
                    gameOver = true;
                    return;
                }
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.colorIndex;
            }
        });
    });
    if (gameOver) return;
    clearLines();
    currentPiece = nextPiece;
    nextPiece = getRandomPiece();
    drawNextPieceBoard();
    // Check if the new piece immediately collides (game over)
    if (!currentPiece.isValidMove(currentPiece.x, currentPiece.y, currentPiece.shape)) {
        gameOver = true;
    }
}

function clearLines() {
    let linesCleared = 0;
    let linesToClear = [];
    
    // Find lines to clear
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(value => value > 0)) {
            linesToClear.push(y);
            linesCleared++;
        }
    }
    
    if (linesCleared > 0) {
        // Create particles for cleared lines immediately
        createLineParticles(linesToClear);
        
        // Animate line clearing
        animateLineClear(linesToClear, () => {
            // After animation completes, actually clear the lines
            // We need to clear from bottom to top to avoid index issues
            linesToClear.sort((a, b) => b - a).forEach(y => {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
            });
            
            // Update score based on number of lines cleared
            score += linesCleared * 100 * level;
            scoreElement.textContent = score;
            
            // Update level (every 10 lines cleared)
            const newLevel = Math.floor(score / 1000) + 1;
            if (newLevel > level) {
                level = newLevel;
                levelElement.textContent = level;
                // Speed up the game using the getGameSpeed function
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, getGameSpeed());
                
                // Level up animation
                animateLevelUp();
            }
            
            // Redraw the board
            drawBoard();
        });
    }
}

function animateLineClear(lines, callback) {
    const flashCount = 3;
    let currentFlash = 0;
    
    const flashInterval = setInterval(() => {
        // Flash the lines
        lines.forEach(y => {
            for (let x = 0; x < COLS; x++) {
                if (currentFlash % 2 === 0) {
                    // Flash to white
                    context.fillStyle = '#FFFFFF';
                } else {
                    // Flash to original color
                    context.fillStyle = COLORS[board[y][x]];
                }
                context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
        
        currentFlash++;
        if (currentFlash >= flashCount * 2) {
            clearInterval(flashInterval);
            if (callback) callback();
        }
    }, 100);
}

function createLineParticles(lines) {
    lines.forEach(y => {
        for (let i = 0; i < 20; i++) { // Create 20 particles per line
            const x = Math.random() * canvas.width;
            createParticle(x, y * BLOCK_SIZE);
        }
    });
}

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    
    // Randomize particle size for more variety
    const size = 3 + Math.random() * 5;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Use more vibrant colors
    const color = getRandomColor();
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.boxShadow = '0 0 10px 2px ' + color;
    
    // Position relative to the game board
    const rect = canvas.getBoundingClientRect();
    particle.style.left = (rect.left + x) + 'px';
    particle.style.top = (rect.top + y) + 'px';
    
    // Add transform for better performance
    particle.style.transform = 'translate3d(0, 0, 0)';
    particle.style.willChange = 'transform, opacity';
    
    particlesContainer.appendChild(particle);
    
    // Animate the particle
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
        
        // Apply slight rotation and scaling for more dynamic effect
        scale -= 0.01;
        opacity -= 0.02;
        
        particle.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
        particle.style.opacity = opacity;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            particlesContainer.removeChild(particle);
        }
    };
    
    requestAnimationFrame(animate);
}

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * (COLORS.length - 1)) + 1];
}

function animateLevelUp() {
    // Flash the level display
    let flashes = 5;
    let flashInterval = setInterval(() => {
        levelElement.style.color = flashes % 2 === 0 ? '#e74c3c' : '#2ecc71';
        flashes--;
        if (flashes < 0) {
            clearInterval(flashInterval);
            levelElement.style.color = '';
        }
    }, 100);
    
    // Create particles around the game board
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            let x, y;
            
            const rect = canvas.getBoundingClientRect();
            
            switch(side) {
                case 0: // top
                    x = rect.left + Math.random() * canvas.width;
                    y = rect.top;
                    break;
                case 1: // right
                    x = rect.left + canvas.width;
                    y = rect.top + Math.random() * canvas.height;
                    break;
                case 2: // bottom
                    x = rect.left + Math.random() * canvas.width;
                    y = rect.top + canvas.height;
                    break;
                case 3: // left
                    x = rect.left;
                    y = rect.top + Math.random() * canvas.height;
                    break;
            }
            
            createParticle(x - rect.left, y - rect.top);
        }, i * 50);
    }
}

function calculateScore(lines) {
    switch (lines) {
        case 1: return 40 * level;
        case 2: return 100 * level;
        case 3: return 300 * level;
        case 4: return 1200 * level; // Tetris!
        default: return 0;
    }
}

function gameLoop() {
    if (gameOver) {
        clearInterval(gameInterval);
        showGameOver();
        return;
    }
    
    if (!currentPiece.move(0, 1)) {
        // Piece has landed
        lockPiece();
        // Add landing effect
        createLandingEffect();
    }
    drawBoard();
    currentPiece.draw();
}

function showGameOver() {
    // Display game over screen with animation
    gameOverElement.style.display = 'flex';
    gameOverElement.style.opacity = '0';
    
    setTimeout(() => {
        gameOverElement.style.opacity = '1';
    }, 100);
    
    // Create explosion particles
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + canvas.width / 2;
    const centerY = rect.top + canvas.height / 2;
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100;
            const x = centerX + Math.cos(angle) * distance - rect.left;
            const y = centerY + Math.sin(angle) * distance - rect.top;
            createParticle(x, y);
        }, i * 30);
    }
}

function createLandingEffect() {
    // Create a small particle effect when a piece lands
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] > 0) {
                const blockX = (currentPiece.x + x) * BLOCK_SIZE;
                const blockY = (currentPiece.y + y) * BLOCK_SIZE;
                
                // Create 2-3 particles per block
                const particleCount = 2 + Math.floor(Math.random() * 2);
                for (let i = 0; i < particleCount; i++) {
                    createParticle(
                        blockX + Math.random() * BLOCK_SIZE,
                        blockY + Math.random() * BLOCK_SIZE
                    );
                }
            }
        }
    }
}

// --- Input Handling --- 

document.addEventListener('keydown', (event) => {
    if (!currentPiece || gameOver) return;

    switch (event.key) {
        case 'ArrowLeft':
        case 'a': // Add WASD controls
            currentPiece.move(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
            currentPiece.move(1, 0);
            break;
        case 'ArrowDown':
        case 's':
            if (!currentPiece.move(0, 1)) {
                // If moving down fails, lock the piece immediately
                lockPiece();
            }
            break;
        case 'ArrowUp':
        case 'w': // Rotate
            currentPiece.rotate();
            break;
        case ' ': // Hard drop (optional - basic implementation)
             while (currentPiece.move(0, 1)) { /* Keep moving down */ }
             lockPiece();
             break;
    }
    // Redraw after move/rotate to feel responsive
    drawBoard();
    currentPiece.draw();
});

// --- Start Game --- 

// --- Game Initialization ---

// Calculate game speed based on level
function getGameSpeed() {
    // Base speed at level 1 is 1000ms (1 second)
    // Each level reduces the time by 100ms, with a minimum of 100ms
    return Math.max(1000 - ((level - 1) * 100), 100);
}

function startGame() {
    // Resize the game board first
    resizeGameBoard();
    
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    board = createBoard();
    score = 0;
    level = 1;
    gameOver = false;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    gameOverElement.style.display = 'none';
    
    // Create the first piece
    currentPiece = getRandomPiece();
    nextPiece = getRandomPiece();
    
    // Draw the initial state
    drawBoard();
    currentPiece.draw();
    drawNextPieceBoard();
    
    // Start the game loop with the appropriate speed
    gameInterval = setInterval(gameLoop, getGameSpeed());
    startButton.textContent = "Restart Game";
    
    // Keyboard controls are already set up with the main event listener
    // No need to add another event listener here
    
    // Add start animation
    animateGameStart();
}

function animateGameStart() {
    // Animate the game board appearing
    canvas.style.opacity = '0';
    canvas.style.transform = 'scale(0.9) rotateY(10deg)';
    
    setTimeout(() => {
        canvas.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
        canvas.style.opacity = '1';
        canvas.style.transform = 'scale(1) rotateY(0deg)';
    }, 100);
    
    // Create some initial particles in a circular pattern
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2;
    
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            const angle = (i / 40) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius * Math.random();
            const y = centerY + Math.sin(angle) * radius * Math.random();
            createParticle(x, y);
        }, i * 30);
    }
    
    // Add a flash effect to the title
    const title = document.querySelector('h1');
    title.style.textShadow = '0 0 20px #fff, 0 0 30px #3498db, 0 0 40px #3498db';
    setTimeout(() => {
        title.style.transition = 'text-shadow 1s ease';
        title.style.textShadow = '';
    }, 1000);
}

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Initialize particles system
function initParticles() {
    // Create some ambient floating particles
    setInterval(() => {
        if (!gameOver && Math.random() < 0.3) { // 30% chance each interval
            const rect = canvas.getBoundingClientRect();
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(side) {
                case 0: // top
                    x = Math.random() * canvas.width;
                    y = -5;
                    break;
                case 1: // right
                    x = canvas.width + 5;
                    y = Math.random() * canvas.height;
                    break;
                case 2: // bottom
                    x = Math.random() * canvas.width;
                    y = canvas.height + 5;
                    break;
                case 3: // left
                    x = -5;
                    y = Math.random() * canvas.height;
                    break;
            }
            
            createParticle(x, y);
        }
    }, 500);
}

// Initialize the particles system
initParticles();

// Initial setup (optional: draw empty board on load)
// drawBoard(); 
// drawNextPieceBoard();