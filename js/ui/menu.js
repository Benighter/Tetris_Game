import {
    confirmAcceptButton,
    confirmCancelButton,
    confirmMessageElement,
    confirmModalElement,
    confirmTitleElement,
    controllerBindingPreviewButtons,
    controllerRemapActionButtons,
    controllerRemapCloseButton,
    controllerRemapDoneButton,
    controllerRemapModalElement,
    controllerRemapResetButton,
    controllerRemapStatusElement,
    ghostSettingInput,
    gridSettingInput,
    mainMenuElement,
    menuButton,
    menuSettingsButton,
    menuStartButton,
    menuZenButton,
    openControllerRemapButton,
    particlesSettingInput,
    playerNameSettingInput,
    resetControllerBindingsButton,
    settingsApplyButton,
    settingsButton,
    settingsCloseButton,
    settingsModalElement,
    settingsResetButton
} from '../core/dom.js';
import { defaultSettings, state, updateSettings } from '../core/state.js';
import {
    cloneControllerBindings,
    CONTROLLER_BINDING_ROWS,
    getControllerButtonLabel
} from '../input/controller-config.js';
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
let capturingControllerAction = null;

function getBindingElements() {
    return [...controllerBindingPreviewButtons, ...controllerRemapActionButtons];
}

function setBindingButtonValue(button, buttonName) {
    button.dataset.binding = buttonName;
    const pill = button.querySelector('.controller-binding-pill');
    if (pill) {
        pill.textContent = getControllerButtonLabel(buttonName);
    }
}

function syncControllerBindingsUI(bindings = state.settings.controllerBindings) {
    const nextBindings = cloneControllerBindings(bindings);
    getBindingElements().forEach(button => {
        const action = button.dataset.bindingAction || button.dataset.bindingPreviewAction;
        if (!action) {
            return;
        }

        setBindingButtonValue(button, nextBindings[action]);
        button.classList.toggle('remap-row-active', capturingControllerAction === action);
    });
}

function readControllerBindingsForm() {
    return controllerBindingPreviewButtons.reduce((bindings, button) => {
        const action = button.dataset.bindingPreviewAction;
        if (!action) {
            return bindings;
        }

        bindings[action] = button.dataset.binding || defaultSettings.controllerBindings[action];
        return bindings;
    }, cloneControllerBindings());
}

function setControllerRemapStatus(message) {
    controllerRemapStatusElement.textContent = message;
}

function stopControllerBindingCapture() {
    capturingControllerAction = null;
    syncControllerBindingsUI(readControllerBindingsForm());
    setControllerRemapStatus('Pick an action, press A to capture, then press the controller button you want.');
}

function hasActiveRun() {
    return state.board.length > 0 && !state.gameOver;
}

export function isMainMenuOpen() {
    return !mainMenuElement.classList.contains('hidden');
}

export function isSettingsOpen() {
    return !settingsModalElement.classList.contains('hidden');
}

export function isConfirmOpen() {
    return !confirmModalElement.classList.contains('hidden');
}

export function isControllerRemapOpen() {
    return !controllerRemapModalElement.classList.contains('hidden');
}

export function isControllerBindingCaptureActive() {
    return Boolean(capturingControllerAction);
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function syncSettingsForm() {
    playerNameSettingInput.value = state.settings.playerName;
    ghostSettingInput.checked = state.settings.showGhostPiece;
    gridSettingInput.checked = state.settings.showGrid;
    particlesSettingInput.checked = state.settings.showParticles;
    syncControllerBindingsUI(state.settings.controllerBindings);
}

function readSettingsForm() {
    return {
        playerName: playerNameSettingInput.value.trim() || getDefaultPlayerName(),
        showGhostPiece: ghostSettingInput.checked,
        showGrid: gridSettingInput.checked,
        showParticles: particlesSettingInput.checked,
        controllerBindings: readControllerBindingsForm()
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

export function openControllerRemap() {
    syncControllerBindingsUI(readControllerBindingsForm());
    controllerRemapModalElement.classList.remove('hidden');
    controllerRemapModalElement.setAttribute('aria-hidden', 'false');
    stopControllerBindingCapture();
}

export function closeControllerRemap() {
    stopControllerBindingCapture();
    controllerRemapModalElement.classList.add('hidden');
    controllerRemapModalElement.setAttribute('aria-hidden', 'true');
}

function resetControllerBindingsForm() {
    syncControllerBindingsUI(defaultSettings.controllerBindings);
}

export function beginControllerBindingCapture(action) {
    capturingControllerAction = action;
    syncControllerBindingsUI(readControllerBindingsForm());

    const bindingMeta = CONTROLLER_BINDING_ROWS.find(row => row.action === action);
    setControllerRemapStatus(`Waiting for a button for ${bindingMeta?.label || 'this action'}...`);
}

export function assignControllerBinding(buttonName) {
    if (!capturingControllerAction) {
        return false;
    }

    const bindings = readControllerBindingsForm();
    const previousButton = bindings[capturingControllerAction];
    const conflictingAction = Object.entries(bindings).find(([action, binding]) => action !== capturingControllerAction && binding === buttonName)?.[0] || null;

    bindings[capturingControllerAction] = buttonName;
    if (conflictingAction) {
        bindings[conflictingAction] = previousButton;
    }

    syncControllerBindingsUI(bindings);
    setControllerRemapStatus(`Bound ${CONTROLLER_BINDING_ROWS.find(row => row.action === capturingControllerAction)?.label || 'action'} to ${getControllerButtonLabel(buttonName)}.`);
    capturingControllerAction = null;
    syncControllerBindingsUI(bindings);
    return true;
}

export function getDisplayedControllerBindings() {
    return readControllerBindingsForm();
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
    closeControllerRemap();
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
        showParticles: false
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
        const {
            startingLevel: _removedStartingLevel,
            renderFps: _removedRenderFps,
            speedProfile: _removedSpeedProfile,
            ...sanitizedSavedSettings
        } = savedSettings;
        updateSettings({
            ...defaultSettings,
            ...sanitizedSavedSettings,
            controllerBindings: cloneControllerBindings(sanitizedSavedSettings.controllerBindings)
        });
    } catch {
        updateSettings(defaultSettings);
    }

    syncSettingsForm();
}

function resetSettings() {
    applySettings({
        ...defaultSettings,
        controllerBindings: cloneControllerBindings(defaultSettings.controllerBindings)
    });
}

export function handleAppBackNavigation() {
    if (isControllerBindingCaptureActive()) {
        stopControllerBindingCapture();
        return;
    }

    if (isControllerRemapOpen()) {
        closeControllerRemap();
        return;
    }

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
    openControllerRemapButton.addEventListener('click', openControllerRemap);
    resetControllerBindingsButton.addEventListener('click', resetControllerBindingsForm);
    settingsApplyButton.addEventListener('click', () => {
        applySettings(readSettingsForm());
        closeSettings();
    });
    settingsResetButton.addEventListener('click', resetSettings);
    controllerBindingPreviewButtons.forEach(button => {
        button.addEventListener('click', openControllerRemap);
    });
    controllerRemapCloseButton.addEventListener('click', closeControllerRemap);
    controllerRemapDoneButton.addEventListener('click', closeControllerRemap);
    controllerRemapResetButton.addEventListener('click', resetControllerBindingsForm);
    controllerRemapActionButtons.forEach(button => {
        button.addEventListener('click', () => {
            beginControllerBindingCapture(button.dataset.bindingAction);
        });
    });
    settingsModalElement.addEventListener('click', event => {
        if (event.target === settingsModalElement) {
            closeSettings();
        }
    });
    controllerRemapModalElement.addEventListener('click', event => {
        if (event.target === controllerRemapModalElement) {
            closeControllerRemap();
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
