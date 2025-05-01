# Tetris Game Fix Plan

## Issues Identified
- [x] Tetris pieces don't drop automatically
- [x] Pieces only drop when arrow down or space is pressed

## Solution
- [x] Add getGameSpeed() function to calculate drop speed based on level
- [x] Ensure gameInterval is properly set up in startGame()
- [x] Verify gameLoop() is correctly moving pieces down

## Implementation Details
- The getGameSpeed() function will return a time in milliseconds that decreases as level increases
- Higher levels will have faster drop speeds
- The function will be called when setting up the gameInterval