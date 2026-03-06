const SETTINGS_KEY = 'tetris-settings';
const LEADERBOARD_KEY = 'tetris-leaderboard';
const MAX_ENTRIES = 5;

function sortEntries(entries) {
    return [...entries].sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }

        if (right.level !== left.level) {
            return right.level - left.level;
        }

        return new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime();
    });
}

function sanitizeName(name) {
    const normalized = String(name || '').trim().replace(/\s+/g, ' ');
    return normalized.slice(0, 18) || 'Player One';
}

export function getDefaultPlayerName() {
    return 'Player One';
}

export function loadLeaderboard() {
    try {
        const rawEntries = localStorage.getItem(LEADERBOARD_KEY);
        if (!rawEntries) {
            return [];
        }

        const parsedEntries = JSON.parse(rawEntries);
        if (!Array.isArray(parsedEntries)) {
            return [];
        }

        return sortEntries(parsedEntries).slice(0, MAX_ENTRIES);
    } catch {
        return [];
    }
}

export function saveLeaderboard(entries) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sortEntries(entries).slice(0, MAX_ENTRIES)));
}

export function submitLeaderboardEntry(entry) {
    const nextEntry = {
        name: sanitizeName(entry.name),
        score: Number(entry.score) || 0,
        level: Number(entry.level) || 1,
        lines: Number(entry.lines) || 0,
        speedProfile: entry.speedProfile || 'classic',
        playedAt: entry.playedAt || new Date().toISOString()
    };

    const leaderboard = loadLeaderboard();
    leaderboard.push(nextEntry);
    const sortedEntries = sortEntries(leaderboard).slice(0, MAX_ENTRIES);
    saveLeaderboard(sortedEntries);
    return sortedEntries;
}

export function getHighScore() {
    const [topEntry] = loadLeaderboard();
    return topEntry?.score || 0;
}

export function getTopLeaderboardEntries(limit = 5) {
    return loadLeaderboard().slice(0, limit);
}

export function migrateSettingsPlayerName(defaultSettings) {
    try {
        const rawSettings = localStorage.getItem(SETTINGS_KEY);
        if (!rawSettings) {
            return;
        }

        const parsedSettings = JSON.parse(rawSettings);
        if (parsedSettings && typeof parsedSettings === 'object' && !parsedSettings.playerName) {
            parsedSettings.playerName = defaultSettings.playerName;
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsedSettings));
        }
    } catch {
        // Ignore malformed settings and fall back to defaults.
    }
}
