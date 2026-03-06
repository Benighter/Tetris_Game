import {
    highscoreTargetElement,
    leaderboardListElement,
    menuHighscoreNameElement,
    menuHighscoreValueElement
} from '../core/dom.js';
import { getHighScore, getTopLeaderboardEntries } from '../data/leaderboard.js';

export function refreshLeaderboardUI() {
    const leaderboard = getTopLeaderboardEntries();
    const [topEntry] = leaderboard;
    const topScore = getHighScore();

    highscoreTargetElement.textContent = topScore;
    menuHighscoreValueElement.textContent = topScore;
    menuHighscoreNameElement.textContent = topEntry
        ? `${topEntry.name} • L${topEntry.level}`
        : 'No local champion yet';

    leaderboardListElement.innerHTML = '';

    if (leaderboard.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'leaderboard-empty';
        emptyItem.textContent = 'No scores logged yet. Start a run and claim the first spot.';
        leaderboardListElement.appendChild(emptyItem);
        return;
    }

    leaderboard.forEach((entry, index) => {
        const item = document.createElement('li');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${entry.name}</span>
            <span class="leaderboard-meta">${entry.score} pts • L${entry.level}</span>
        `;
        leaderboardListElement.appendChild(item);
    });
}
