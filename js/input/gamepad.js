import {
    CONTROLLER_BUTTON_INDEXES,
    CONTROLLER_BUTTON_ORDER
} from './controller-config.js';

const AXIS_THRESHOLD = 0.55;
const BUTTON_THRESHOLD = 0.45;
const INITIAL_REPEAT_DELAY = 170;
const HELD_REPEAT_DELAY = 85;
const REPEATABLE_DIRECTIONS = new Set(['left', 'right', 'down']);

function isPressed(button) {
    return Boolean(button) && (button.pressed || button.value > BUTTON_THRESHOLD);
}

function getGamepads() {
    if (typeof navigator.getGamepads !== 'function') {
        return [];
    }

    return Array.from(navigator.getGamepads()).filter(Boolean);
}

function getConnectionKey(gamepads) {
    return gamepads.map(gamepad => `${gamepad.index}:${gamepad.id}`).join('|');
}

function resolveDirectionalInput(gamepad) {
    const buttons = gamepad.buttons || [];
    if (isPressed(buttons[14])) {
        return 'left';
    }
    if (isPressed(buttons[15])) {
        return 'right';
    }
    if (isPressed(buttons[13])) {
        return 'down';
    }
    if (isPressed(buttons[12])) {
        return 'up';
    }

    const axes = gamepad.axes || [];
    const axisX = axes[0] || 0;
    const axisY = axes[1] || 0;

    if (Math.abs(axisX) >= Math.abs(axisY) && Math.abs(axisX) > AXIS_THRESHOLD) {
        return axisX < 0 ? 'left' : 'right';
    }

    if (Math.abs(axisY) > AXIS_THRESHOLD) {
        return axisY < 0 ? 'up' : 'down';
    }

    return null;
}

export function createGamepadManager(callbacks = {}) {
    let activeGamepadIndex = null;
    let animationFrameId = 0;
    let connectionKey = '';
    const buttonState = new Map();
    const directionRepeatState = new Map();

    function emitConnectionChange(gamepads) {
        const activeGamepad = gamepads.find(gamepad => gamepad.index === activeGamepadIndex) || gamepads[0] || null;
        activeGamepadIndex = activeGamepad?.index ?? null;
        callbacks.onConnectionChange?.({
            connected: gamepads.length > 0,
            gamepad: activeGamepad,
            gamepads
        });
    }

    function fireDirectionalInput(direction, now) {
        if (!direction) {
            directionRepeatState.clear();
            return;
        }

        for (const key of directionRepeatState.keys()) {
            if (key !== direction) {
                directionRepeatState.delete(key);
            }
        }

        const nextRepeatAt = directionRepeatState.get(direction);
        if (nextRepeatAt && now < nextRepeatAt) {
            return;
        }

        callbacks.onDirection?.(direction);
        callbacks.onInteraction?.();

        if (!REPEATABLE_DIRECTIONS.has(direction)) {
            directionRepeatState.set(direction, Number.POSITIVE_INFINITY);
            return;
        }

        directionRepeatState.set(direction, now + (nextRepeatAt ? HELD_REPEAT_DELAY : INITIAL_REPEAT_DELAY));
    }

    function fireButtonPress(name, isActive, callback) {
        const wasActive = buttonState.get(name) || false;
        buttonState.set(name, isActive);
        if (isActive && !wasActive) {
            callback?.();
            callbacks.onInteraction?.();
        }
    }

    function tick() {
        const gamepads = getGamepads();
        const nextConnectionKey = getConnectionKey(gamepads);

        if (nextConnectionKey !== connectionKey) {
            connectionKey = nextConnectionKey;
            emitConnectionChange(gamepads);
        }

        const activeGamepad = gamepads.find(gamepad => gamepad.index === activeGamepadIndex) || gamepads[0] || null;
        activeGamepadIndex = activeGamepad?.index ?? null;

        if (activeGamepad) {
            const buttons = activeGamepad.buttons || [];
            fireDirectionalInput(resolveDirectionalInput(activeGamepad), performance.now());
            CONTROLLER_BUTTON_ORDER.forEach(buttonName => {
                const buttonIndex = CONTROLLER_BUTTON_INDEXES[buttonName];
                fireButtonPress(buttonName, isPressed(buttons[buttonIndex]), () => {
                    callbacks.onButtonPress?.(buttonName);
                });
            });
        } else {
            buttonState.clear();
            directionRepeatState.clear();
        }

        animationFrameId = window.requestAnimationFrame(tick);
    }

    function handleConnected(event) {
        activeGamepadIndex = event.gamepad?.index ?? activeGamepadIndex;
    }

    function handleDisconnected(event) {
        if (event.gamepad?.index === activeGamepadIndex) {
            activeGamepadIndex = null;
        }
    }

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);
    animationFrameId = window.requestAnimationFrame(tick);

    return {
        destroy() {
            window.cancelAnimationFrame(animationFrameId);
            window.removeEventListener('gamepadconnected', handleConnected);
            window.removeEventListener('gamepaddisconnected', handleDisconnected);
        }
    };
}