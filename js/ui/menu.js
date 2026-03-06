import {
    confirmAcceptButton,
    confirmCancelButton,
    confirmMessageElement,
    confirmModalElement,
    confirmTitleElement,
    ghostSettingInput,
    gridSettingInput,
    mainMenuElement,
    menuButton,
    menuSettingsButton,
    menuStartButton,
    menuZenButton,
    particlesSettingInput,
    playerNameSettingInput,
    settingsApplyButton,
    settingsButton,
    settingsCloseButton,
    settingsModalElement,
    settingsResetButton,
    speedProfileSettingInput,
    startingLevelSettingInput
} from '../core/dom.js';
import { defaultSettings, state, updateSettings } from '../core/state.js';
import { closeGameOver, pauseGame, resumeGame, startGame, syncGameSettings } from '../game/game.js';
import {
    getDefaultPlayerName,
    migrateSettingsPlayerName
} from '../data/leaderboard.js';
import { refreshLeaderboardUI } from './leaderboard.js';

const STORAGE_KEY = 'tetris-settings';
let pausedForOverlay = false;
let pausedForConfirmDialog = false;
let confirmAction = null;

function hasActiveRun() {
    return state.board.length > 0 && !state.gameOver;
}

function isMainMenuOpen() {
    return !mainMenuElement.classList.contains('hidden');
}

function isSettingsOpen() {
    return !settingsModalElement.classList.contains('hidden');
}

function isConfirmOpen() {
    return !confirmModalElement.classList.contains('hidden');
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function syncSettingsForm() {
    playerNameSettingInput.value = state.settings.playerName;
    ghostSettingInput.checked = state.settings.showGhostPiece;
    gridSettingInput.checked = state.settings.showGrid;
    particlesSettingInput.checked = state.settings.showParticles;
    speedProfileSettingInput.value = state.settings.speedProfile;
    startingLevelSettingInput.value = String(state.settings.startingLevel);
}

function readSettingsForm() {
    return {
        playerName: playerNameSettingInput.value.trim() || getDefaultPlayerName(),
        showGhostPiece: ghostSettingInput.checked,
        showGrid: gridSettingInput.checked,
        showParticles: particlesSettingInput.checked,
        speedProfile: speedProfileSettingInput.value,
        startingLevel: Number(startingLevelSettingInput.value)
    };
}

function applySettings(nextSettings) {
    updateSettings(nextSettings);
    saveSettings();
    syncSettingsForm();
    syncGameSettings();
    refreshLeaderboardUI();
}

function updateMenuButtonLabel() {
    menuStartButton.textContent = hasActiveRun() && state.isPaused ? 'Resume Run' : 'Start Run';
}

export function openMainMenu() {
    if (hasActiveRun()) {
        pauseGame();
    }

    updateMenuButtonLabel();
    mainMenuElement.classList.remove('hidden');
}

export function closeMainMenu() {
    mainMenuElement.classList.add('hidden');
}

function closeConfirmDialog({ shouldResume = true } = {}) {
    confirmModalElement.classList.add('hidden');
    confirmModalElement.setAttribute('aria-hidden', 'true');
    confirmAction = null;

    if (shouldResume && pausedForConfirmDialog && !isMainMenuOpen() && !isSettingsOpen()) {
        resumeGame();
    }

    pausedForConfirmDialog = false;
}

function openConfirmDialog({ title, message, acceptLabel, onAccept }) {
    const shouldPauseGame = hasActiveRun() && !state.isPaused && !isMainMenuOpen();
    pausedForConfirmDialog = shouldPauseGame;
    if (shouldPauseGame) {
        pauseGame();
    }

    confirmTitleElement.textContent = title;
    confirmMessageElement.textContent = message;
    confirmAcceptButton.textContent = acceptLabel;
    confirmAction = onAccept;
    confirmModalElement.classList.remove('hidden');
    confirmModalElement.setAttribute('aria-hidden', 'false');
}

function confirmExitApp() {
    openConfirmDialog({
        title: 'Exit Tetris?',
        message: 'Press confirm to close the game. Tap anywhere outside this popup to stay.',
        acceptLabel: 'Exit',
        onAccept: () => {
            closeConfirmDialog({ shouldResume: false });
            window.Capacitor?.Plugins?.App?.exitApp?.();
        }
    });
}

function confirmAbandonRun() {
    openConfirmDialog({
        title: 'Leave This Run?',
        message: 'Go back to the main menu and lose your current progress?',
        acceptLabel: 'Go To Menu',
        onAccept: () => {
            closeConfirmDialog({ shouldResume: false });
            closeGameOver();
            openMainMenu();
        }
    });
}

function handleConfirmAccept() {
    const nextAction = confirmAction;
    if (!nextAction) {
        closeConfirmDialog();
        return;
    }

    nextAction();
}

export function openSettings() {
    syncSettingsForm();
    pausedForOverlay = hasActiveRun() && !state.isPaused;
    if (pausedForOverlay) {
        pauseGame();
    }

    settingsModalElement.classList.remove('hidden');
    settingsModalElement.setAttribute('aria-hidden', 'false');
}

export function closeSettings() {
    settingsModalElement.classList.add('hidden');
    settingsModalElement.setAttribute('aria-hidden', 'true');

    if (pausedForOverlay && mainMenuElement.classList.contains('hidden')) {
        resumeGame();
    }

    pausedForOverlay = false;
}

function startFromMenu() {
    if (hasActiveRun() && state.isPaused) {
        closeConfirmDialog({ shouldResume: false });
        closeMainMenu();
        closeGameOver();
        resumeGame();
        return;
    }

    closeMainMenu();
    closeGameOver();
    startGame();
}

function startZenRun() {
    closeConfirmDialog({ shouldResume: false });
    applySettings({
        showParticles: false,
        speedProfile: 'chill'
    });
    closeMainMenu();
    closeGameOver();
    startGame();
}

function loadSavedSettings() {
    migrateSettingsPlayerName(defaultSettings);
    const rawSettings = localStorage.getItem(STORAGE_KEY);
    if (!rawSettings) {
        syncSettingsForm();
        return;
    }

    try {
        const savedSettings = JSON.parse(rawSettings);
        updateSettings({
            ...defaultSettings,
            ...savedSettings
        });
    } catch {
        updateSettings(defaultSettings);
    }

    syncSettingsForm();
}

function resetSettings() {
    applySettings(defaultSettings);
}

function handleAppBackNavigation() {
    if (isConfirmOpen()) {
        closeConfirmDialog();
        return;
    }

    if (isSettingsOpen()) {
        closeSettings();
        return;
    }

    if (isMainMenuOpen()) {
        confirmExitApp();
        return;
    }

    if (hasActiveRun()) {
        confirmAbandonRun();
        return;
    }

    if (state.gameOver) {
        closeGameOver();
        openMainMenu();
        return;
    }

    confirmExitApp();
}

function registerNativeBackHandler() {
    const appPlugin = window.Capacitor?.Plugins?.App;
    const isNativePlatform = typeof window.Capacitor?.isNativePlatform === 'function'
        ? window.Capacitor.isNativePlatform()
        : window.Capacitor?.getPlatform?.() !== 'web';

    if (!appPlugin?.addListener || !isNativePlatform) {
        return;
    }

    Promise.resolve(appPlugin.addListener('backButton', () => {
        handleAppBackNavigation();
    })).catch(() => {
        // Ignore listener registration failures outside native contexts.
    });
}

export function initMenuUI() {
    loadSavedSettings();
    syncGameSettings();
    refreshLeaderboardUI();
    updateMenuButtonLabel();
    registerNativeBackHandler();

    menuStartButton.addEventListener('click', startFromMenu);
    menuZenButton.addEventListener('click', startZenRun);
    menuSettingsButton.addEventListener('click', openSettings);
    settingsButton.addEventListener('click', openSettings);
    menuButton.addEventListener('click', openMainMenu);
    settingsCloseButton.addEventListener('click', closeSettings);
    settingsApplyButton.addEventListener('click', () => {
        applySettings(readSettingsForm());
        closeSettings();
    });
    settingsResetButton.addEventListener('click', resetSettings);
    settingsModalElement.addEventListener('click', event => {
        if (event.target === settingsModalElement) {
            closeSettings();
        }
    });
    confirmCancelButton.addEventListener('click', () => {
        closeConfirmDialog();
    });
    confirmAcceptButton.addEventListener('click', handleConfirmAccept);
    confirmModalElement.addEventListener('click', event => {
        if (event.target === confirmModalElement) {
            closeConfirmDialog();
        }
    });
}
