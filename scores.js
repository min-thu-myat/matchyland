// ===== SCORES.JS - COMPLETE REPLACEMENT FILE =====

let currentDifficulty = 'easy';

function getScores() {
    const scores = localStorage.getItem('matchylandScores');
    return scores ? JSON.parse(scores) : { easy: [], medium: [], hard: [] };
}

function showDifficulty(difficulty) {
    currentDifficulty = difficulty;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayScores();
}

function displayScores() {
    const scores = getScores();
    const leaderboard = document.getElementById('leaderboard');
    const difficultyScores = scores[currentDifficulty];
    
    if (difficultyScores.length === 0) {
        leaderboard.innerHTML = `
            <div class="score-card" style="justify-content: center; padding: 40px;">
                <p style="color: #718096;">No scores yet. Play a game to set a record!</p>
            </div>
        `;
        return;
    }
    
    leaderboard.innerHTML = difficultyScores.map((score, index) => {
        let medalClass = '';
        if (index === 0) medalClass = 'gold';
        else if (index === 1) medalClass = 'silver';
        else if (index === 2) medalClass = 'bronze';
        
        return `
            <div class="score-card ${medalClass}">
                <div class="score-rank">${index + 1}</div>
                <div class="score-player">
                    <span class="player-name">${escapeHtml(score.name)}</span>
                    <span class="player-date">${score.date}</span>
                </div>
                <div class="score-details">
                    <span class="score-moves">${score.moves} moves</span>
                    <span class="score-time">${formatTime(score.time)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function clearAllScores() {
    if (confirm('Are you sure you want to clear all scores?')) {
        localStorage.removeItem('matchylandScores');
        displayScores();
        showNotification('All scores cleared!', 'info');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add showNotification function if needed
function showNotification(message, type = 'info') {
    let toast = document.getElementById('notificationToast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'notificationToast';
        toast.className = 'notification-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `notification-toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on page load
window.onload = () => {
    displayScores();
};