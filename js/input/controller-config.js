export const CONTROLLER_BUTTON_INDEXES = {
    south: 0,
    east: 1,
    west: 2,
    north: 3,
    leftShoulder: 4,
    rightShoulder: 5,
    leftTrigger: 6,
    rightTrigger: 7,
    select: 8,
    start: 9
};

export const CONTROLLER_BUTTON_ORDER = Object.keys(CONTROLLER_BUTTON_INDEXES);

export const CONTROLLER_BUTTON_LABELS = {
    south: 'A',
    east: 'B',
    west: 'X',
    north: 'Y',
    leftShoulder: 'LB',
    rightShoulder: 'RB',
    leftTrigger: 'LT',
    rightTrigger: 'RT',
    select: 'Select',
    start: 'Start'
};

export const DEFAULT_CONTROLLER_BINDINGS = {
    confirm: 'south',
    rotate: 'west',
    drop: 'rightShoulder',
    pause: 'start',
    back: 'east'
};

export const CONTROLLER_BINDING_ROWS = [
    {
        action: 'confirm',
        label: 'Menu Select',
        hint: 'Used for menus, dialogs, and overlays.'
    },
    {
        action: 'rotate',
        label: 'Rotate Piece',
        hint: 'Primary in-run action for turning pieces.'
    },
    {
        action: 'drop',
        label: 'Hard Drop',
        hint: 'Slam the current piece into place.'
    },
    {
        action: 'pause',
        label: 'Pause / Menu',
        hint: 'Open the menu or pause a live run.'
    },
    {
        action: 'back',
        label: 'Back / Cancel',
        hint: 'Leave overlays or step back a layer.'
    }
];

export function cloneControllerBindings(bindings = DEFAULT_CONTROLLER_BINDINGS) {
    return {
        ...DEFAULT_CONTROLLER_BINDINGS,
        ...bindings
    };
}

export function getControllerButtonLabel(buttonName) {
    return CONTROLLER_BUTTON_LABELS[buttonName] || 'Unbound';
}