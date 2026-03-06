# Tetris Game

## Description
This is a classic Tetris game implemented in JavaScript, HTML, and CSS. The game features a responsive design, smooth animations, and a modern look.

## Live Demo
Check out the live demo [here](https://tetris-game-self-phi.vercel.app/).

## Features
- Responsive design for mobile and desktop
- Touch controls with tap, swipe, and hold support for mobile play
- Smooth animations and transitions
- Score and level tracking
- Next piece preview
- Game over screen with restart option
- Capacitor-based Android packaging support

## Project Structure
- `script.js` and `style.css` are now thin entrypoints.
- `js/core/` contains shared config, DOM references, and mutable game state.
- `js/game/` contains Tetromino and game loop logic.
- `js/rendering/` contains board drawing and visual effects.
- `js/input/` contains keyboard and button controls.
- `styles/main.css` contains the main stylesheet.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Benighter/Tetris_Game.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Tetris_Game
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Open `index.html` in your browser or run `npm run build` to produce a `dist/` bundle.

## Usage
- Use the arrow keys to move and rotate the Tetris pieces.
- Press the spacebar to drop the piece instantly.
- On mobile, tap the board to rotate, swipe to move, or use the on-screen control deck.
- Try to complete lines to score points and advance levels.

## Android APK
1. Install dependencies with `npm install`.
2. Build the web bundle with `npm run build`.
3. Create the Android project once with `npx cap add android`.
4. Sync the web assets with `npm run cap:sync`.
5. Build a debug APK with `npm run android:debug`.

## Dependencies
- No external dependencies are required.

## Author
Bennet Nkolele
- GitHub: [Benighter](https://github.com/Benighter)
- LinkedIn: [Bennet Nkolele](https://www.linkedin.com/in/bennet-nkolele-321285249/)
- Portfolio: [My Work](https://react-personal-portfolio-alpha.vercel.app/)

## Contributing
Feel free to submit issues or pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.