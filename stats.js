let performanceChart = null;
let distributionChart = null;
let currentDifficulty = 'all';

// Get scores from localStorage
function getScores() {
    const scores = localStorage.getItem('matchylandScores');
    if (!scores) {
        return { easy: [], medium: [], hard: [] };
    }
    return JSON.parse(scores);
}

// Get all games as flat array
function getAllGames() {
    const scores = getScores();
    const allGames = [];
    
    for (const difficulty of ['easy', 'medium', 'hard']) {
        for (const game of scores[difficulty]) {
            allGames.push({
                ...game,
                difficulty: difficulty,
                moves: game.moves,
                time: game.time,
                date: game.date
            });
        }
    }
    
    allGames.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
    return allGames;
}

// Filter games by difficulty
function getFilteredGames() {
    const allGames = getAllGames();
    if (currentDifficulty === 'all') {
        return allGames;
    }
    return allGames.filter(game => game.difficulty === currentDifficulty);
}

// Update summary cards
function updateSummaryCards() {
    const allGames = getAllGames();
    const totalGames = allGames.length;
    const winRate = totalGames > 0 ? 100 : 0;
    
    let bestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;
    
    const uniqueDates = [...new Set(allGames.map(g => g.date))].sort();
    for (const dateStr of uniqueDates) {
        if (lastDate) {
            const curr = new Date(dateStr);
            const last = new Date(lastDate);
            const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }
        bestStreak = Math.max(bestStreak, currentStreak);
        lastDate = dateStr;
    }
    
    const totalMoves = allGames.reduce((sum, game) => sum + game.moves, 0);
    
    document.getElementById('totalGames').textContent = totalGames;
    document.getElementById('winRate').textContent = winRate + '%';
    document.getElementById('bestStreak').textContent = bestStreak || 0;
    document.getElementById('totalMoves').textContent = totalMoves;
}

// Update detailed stats table
function updateDetailedStats() {
    const scores = getScores();
    const difficulties = ['easy', 'medium', 'hard'];
    const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    
    const tableBody = document.getElementById('statsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    for (const diff of difficulties) {
        const games = scores[diff];
        const count = games.length;
        
        if (count === 0) {
            tableBody.innerHTML += `
                <tr>
                    <td>${difficultyNames[diff]}</td>
                    <td>0</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
            `;
            continue;
        }
        
        const bestMoves = Math.min(...games.map(g => g.moves));
        const bestTime = Math.min(...games.map(g => g.time));
        const avgMoves = Math.round(games.reduce((s, g) => s + g.moves, 0) / count);
        const avgTime = Math.round(games.reduce((s, g) => s + g.time, 0) / count);
        
        tableBody.innerHTML += `
            <tr>
                <td>${difficultyNames[diff]}</td>
                <td>${count}</td>
                <td><span class="best-value">${bestMoves}</span></td>
                <td><span class="best-value">${formatTime(bestTime)}</span></td>
                <td>${avgMoves}</td>
                <td>${formatTime(avgTime)}</td>
            </tr>
        `;
    }
}

// Create or update performance chart
function updatePerformanceChart() {
    const games = getFilteredGames();
    const canvas = document.getElementById('performanceChart');
    
    if (!canvas) {
        console.error('Performance chart canvas not found');
        return;
    }
    
    if (games.length === 0) {
        if (performanceChart) {
            performanceChart.destroy();
            performanceChart = null;
        }
        // Draw empty message
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Inter';
        ctx.fillStyle = '#718096';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet. Play some games!', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Take last 20 games
    const recentGames = games.slice(0, 20).reverse();
    const labels = recentGames.map((_, i) => `Game ${i + 1}`);
    const movesData = recentGames.map(g => g.moves);
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const isMobile = window.innerWidth < 768;
    
    performanceChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Moves',
                data: movesData,
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#FF6B6B',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: isMobile ? 3 : 5,
                pointHoverRadius: isMobile ? 5 : 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { font: { size: isMobile ? 10 : 12 } }
                },
                tooltip: { 
                    callbacks: { 
                        label: (ctx) => `${ctx.raw} moves` 
                    } 
                }
            },
            scales: {
                y: { 
                    title: { 
                        display: true, 
                        text: 'Moves', 
                        font: { weight: 'bold', size: isMobile ? 10 : 12 } 
                    }, 
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                x: {
                    title: { 
                        display: true, 
                        text: 'Game Number', 
                        font: { weight: 'bold', size: isMobile ? 10 : 12 } 
                    },
                    grid: { display: false },
                    ticks: { 
                        maxRotation: isMobile ? 45 : 0,
                        minRotation: isMobile ? 45 : 0,
                        font: { size: isMobile ? 8 : 10 }
                    }
                }
            }
        }
    });
}

// Create or update distribution chart
function updateDistributionChart() {
    const games = getFilteredGames();
    const canvas = document.getElementById('distributionChart');
    
    if (!canvas) {
        console.error('Distribution chart canvas not found');
        return;
    }
    
    if (games.length === 0) {
        if (distributionChart) {
            distributionChart.destroy();
            distributionChart = null;
        }
        // Draw empty message
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Inter';
        ctx.fillStyle = '#718096';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet. Play some games!', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const ranges = [
        { min: 0, max: 20, label: '0-20' },
        { min: 21, max: 30, label: '21-30' },
        { min: 31, max: 40, label: '31-40' },
        { min: 41, max: 50, label: '41-50' },
        { min: 51, max: 70, label: '51-70' },
        { min: 71, max: 100, label: '71-100' },
        { min: 101, max: 999, label: '100+' }
    ];
    
    const counts = ranges.map(range => 
        games.filter(g => g.moves >= range.min && g.moves <= range.max).length
    );
    
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    const isMobile = window.innerWidth < 768;
    
    distributionChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ranges.map(r => r.label),
            datasets: [{
                label: 'Number of Games',
                data: counts,
                backgroundColor: '#6BCB77',
                borderRadius: 8,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { font: { size: isMobile ? 10 : 12 } }
                },
                tooltip: { 
                    callbacks: { 
                        label: (ctx) => `${ctx.raw} game(s)` 
                    } 
                }
            },
            scales: {
                y: { 
                    title: { 
                        display: true, 
                        text: 'Games', 
                        font: { weight: 'bold', size: isMobile ? 10 : 12 } 
                    }, 
                    beginAtZero: true, 
                    stepSize: 1,
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                x: {
                    title: { 
                        display: true, 
                        text: 'Move Range', 
                        font: { weight: 'bold', size: isMobile ? 10 : 12 } 
                    },
                    grid: { display: false },
                    ticks: { 
                        font: { size: isMobile ? 10 : 12 },
                        maxRotation: isMobile ? 45 : 0,
                        minRotation: isMobile ? 45 : 0
                    }
                }
            }
        }
    });
}

// Update recent games list
function updateRecentGames() {
    const games = getFilteredGames();
    const recentList = document.getElementById('recentGamesList');
    
    if (!recentList) return;
    
    if (games.length === 0) {
        recentList.innerHTML = '<div class="recent-empty">🎮 No games played yet. Play a game to see your history!</div>';
        return;
    }
    
    const difficultyEmojis = { easy: '🟢', medium: '🟡', hard: '🔴' };
    const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    
    recentList.innerHTML = games.slice(0, 10).map(game => `
        <div class="recent-item">
            <div class="recent-difficulty">
                <span class="difficulty-badge ${game.difficulty}">${difficultyEmojis[game.difficulty]} ${difficultyNames[game.difficulty]}</span>
            </div>
            <div class="recent-stats">
                <span class="recent-moves">🎯 ${game.moves} moves</span>
                <span class="recent-time">⏱️ ${formatTime(game.time)}</span>
            </div>
            <div class="recent-date">📅 ${game.date}</div>
        </div>
    `).join('');
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Refresh all statistics
function refreshAllStats() {
    updateSummaryCards();
    updateDetailedStats();
    updatePerformanceChart();
    updateDistributionChart();
    updateRecentGames();
    showNotification('Statistics refreshed!', 'success');
}

// Handle window resize for responsive charts
function handleResize() {
    setTimeout(() => {
        if (performanceChart) {
            performanceChart.resize();
            // Update chart options for mobile
            const isMobile = window.innerWidth < 768;
            performanceChart.options.plugins.legend.labels.font.size = isMobile ? 10 : 12;
            performanceChart.options.scales.y.title.font.size = isMobile ? 10 : 12;
            performanceChart.options.scales.x.title.font.size = isMobile ? 10 : 12;
            performanceChart.options.scales.x.ticks.font.size = isMobile ? 8 : 10;
            performanceChart.options.scales.x.ticks.maxRotation = isMobile ? 45 : 0;
            performanceChart.options.scales.x.ticks.minRotation = isMobile ? 45 : 0;
            performanceChart.options.elements.point.radius = isMobile ? 3 : 5;
            performanceChart.update();
        }
        if (distributionChart) {
            distributionChart.resize();
            const isMobile = window.innerWidth < 768;
            distributionChart.options.plugins.legend.labels.font.size = isMobile ? 10 : 12;
            distributionChart.options.scales.y.title.font.size = isMobile ? 10 : 12;
            distributionChart.options.scales.x.title.font.size = isMobile ? 10 : 12;
            distributionChart.options.scales.x.ticks.font.size = isMobile ? 10 : 12;
            distributionChart.options.scales.x.ticks.maxRotation = isMobile ? 45 : 0;
            distributionChart.options.scales.x.ticks.minRotation = isMobile ? 45 : 0;
            distributionChart.update();
        }
    }, 100);
}

// Handle tab switching
function setupTabListeners() {
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.stats-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.dataset.difficulty;
            refreshAllStats();
        });
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Statistics page loaded');
    setupTabListeners();
    refreshAllStats();
    
    // Add resize listener for responsiveness
    window.addEventListener('resize', handleResize);
});

// Listen for storage changes
window.addEventListener('storage', (e) => {
    if (e.key === 'matchylandScores') {
        refreshAllStats();
    }
});

// Make refresh function global
window.refreshAllStats = refreshAllStats;