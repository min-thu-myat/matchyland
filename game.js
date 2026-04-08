// ===== GAME STATE VARIABLES =====
let currentDifficulty = 'easy';
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = 0;
let timerInterval = null;
let gameStarted = false;
let canFlip = true;
let soundEnabled = true;

// ===== NEW FEATURE VARIABLES =====
let isPaused = false;
let hintsLeft = 3;
let hintTimeout = null;
let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];

// Card icons
let cardIcons = ['🐶', '🐱', '🐼', '🦊', '🐸', '🐨', '🦁', '🐧', '🐰', '🦝', '🐙', '🦋'];

// Difficulty settings
const difficultySettings = {
    easy: { rows: 3, cols: 4, pairs: 6 },
    medium: { rows: 4, cols: 4, pairs: 8 },
    hard: { rows: 4, cols: 6, pairs: 12 }
};

// ===== NEW: CONFETTI SYSTEM =====
function initConfetti() {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti-canvas';
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    
    function resizeCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function startConfetti() {
    if (!confettiCanvas) initConfetti();
    
    confettiParticles = [];
    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            size: Math.random() * 8 + 4,
            speedX: (Math.random() - 0.5) * 3,
            speedY: Math.random() * 5 + 3,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
    
    function animateConfetti() {
        if (!confettiCtx) return;
        
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        let stillActive = false;
        for (let i = 0; i < confettiParticles.length; i++) {
            const p = confettiParticles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;
            
            if (p.y < confettiCanvas.height + 100) {
                stillActive = true;
                confettiCtx.save();
                confettiCtx.translate(p.x, p.y);
                confettiCtx.rotate(p.rotation * Math.PI / 180);
                confettiCtx.fillStyle = p.color;
                confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                confettiCtx.restore();
            }
        }
        
        if (stillActive) {
            requestAnimationFrame(animateConfetti);
        } else {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }
    
    animateConfetti();
    
    // Stop confetti after 3 seconds
    setTimeout(() => {
        confettiParticles = [];
        if (confettiCtx) confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }, 3000);
}

function togglePause() {
    if (!gameStarted || matchedPairs === difficultySettings[currentDifficulty].pairs) {
        return;
    }
    
    isPaused = !isPaused;
    const pauseOverlay = document.getElementById('pauseOverlay');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (isPaused) {
        // Pause the game
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        pauseOverlay.style.display = 'flex';
        pauseBtn.textContent = '▶️';
        pauseBtn.title = 'Resume game';
        canFlip = false;
    } else {
        // Resume the game
        if (gameStarted && timerInterval === null) {
            timerInterval = setInterval(() => {
                if (!isPaused && gameStarted) {
                    timer++;
                    document.getElementById('timer').textContent = formatTime(timer);
                }
            }, 1000);
        }
        pauseOverlay.style.display = 'none';
        pauseBtn.textContent = '⏸️';
        pauseBtn.title = 'Pause game';
        canFlip = true;
    }
}

function useHint() {
    // Check if hints are available and game is active
    if (hintsLeft <= 0) {
        showNotification('No hints left! 🎯', 'info');
        return;
    }
    
    if (isPaused) {
        showNotification('Unpause the game to use hints', 'info');
        return;
    }
    
    if (!gameStarted || matchedPairs === difficultySettings[currentDifficulty].pairs) {
        showNotification('Start a game first!', 'info');
        return;
    }
    
    // Find unmatched, unflipped cards
    const availableCards = cards.filter(card => !card.matched && !card.flipped);
    
    if (availableCards.length < 2) {
        showNotification('Almost done! Keep going! 🎉', 'info');
        return;
    }
    
    // Find a matching pair
    let matchingPair = null;
    for (let i = 0; i < availableCards.length; i++) {
        for (let j = i + 1; j < availableCards.length; j++) {
            if (availableCards[i].icon === availableCards[j].icon) {
                matchingPair = [availableCards[i], availableCards[j]];
                break;
            }
        }
        if (matchingPair) break;
    }
    
    if (matchingPair) {
        // Apply penalty: +2 moves for using hint
        moves += 2;
        document.getElementById('moves').textContent = moves;
        
        // Reduce hints left
        hintsLeft--;
        document.getElementById('hintsLeft').textContent = hintsLeft;
        
        // Highlight the matching cards
        const cardElements = document.querySelectorAll('.card');
        cardElements.forEach((cardEl, index) => {
            const cardData = cards[index];
            if (cardData === matchingPair[0] || cardData === matchingPair[1]) {
                cardEl.classList.add('hint-highlight');
            }
        });
        
        // Play hint sound (different from match sound)
        playHintSound();
        
        // Remove highlight after 2 seconds
        if (hintTimeout) clearTimeout(hintTimeout);
        hintTimeout = setTimeout(() => {
            const highlightedCards = document.querySelectorAll('.hint-highlight');
            highlightedCards.forEach(card => {
                card.classList.remove('hint-highlight');
            });
        }, 2000);
        
        showNotification(`💡 Hint used! +2 moves. ${hintsLeft} hints left.`, 'info');
        
        // Update hint button style
        const hintBtn = document.getElementById('hintBtn');
        if (hintsLeft === 0) {
            hintBtn.style.opacity = '0.5';
            hintBtn.disabled = true;
        }
    } else {
        showNotification('No matches found? That should not happen! 🤔', 'error');
    }
}

function playHintSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        
        // Gentle "ding" sound for hint
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(now + 0.3);
    } catch (e) {}
}

function flipCard(id) {
    if (!canFlip || isPaused) return;
    
    const card = cards.find(c => c.id === id);
    if (card.flipped || card.matched) return;
    if (flippedCards.length === 2) return;
    
    if (!gameStarted) startTimer();
    playFlipSound();
    
    card.flipped = true;
    flippedCards.push(card);
    
    if (flippedCards.length === 2) {
        moves++;
        document.getElementById('moves').textContent = moves;
        
        canFlip = false;
        
        if (flippedCards[0].icon === flippedCards[1].icon) {
            // Match found
            setTimeout(() => {
                playMatchSound();
                flippedCards[0].matched = true;
                flippedCards[1].matched = true;
                matchedPairs++;
                
                // Add celebration animation to matched cards
                const cardElements = document.querySelectorAll('.card');
                cardElements.forEach((cardEl, index) => {
                    if (cards[index] === flippedCards[0] || cards[index] === flippedCards[1]) {
                        cardEl.classList.add('match-celebration');
                        setTimeout(() => {
                            cardEl.classList.remove('match-celebration');
                        }, 600);
                    }
                });
                
                flippedCards = [];
                canFlip = true;
                
                renderBoard();
                
                if (matchedPairs === difficultySettings[currentDifficulty].pairs) {
                    endGame();
                }
            }, 500);
        } else {
            // Wrong match - add shake animation
            const cardElements = document.querySelectorAll('.card');
            cardElements.forEach((cardEl, index) => {
                if (cards[index] === flippedCards[0] || cards[index] === flippedCards[1]) {
                    cardEl.classList.add('wrong-match');
                    setTimeout(() => {
                        cardEl.classList.remove('wrong-match');
                    }, 500);
                }
            });
            
            const delay = window.customMatchDelay || 1000;
            setTimeout(() => {
                flippedCards[0].flipped = false;
                flippedCards[1].flipped = false;
                flippedCards = [];
                canFlip = true;
                renderBoard();
            }, delay);
        }
    }
    
    renderBoard();
}


function playFlipSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
}

function playMatchSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'triangle';
            oscillator.frequency.value = freq;
            
            gainNode.gain.setValueAtTime(0.1, now + i * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(now + i * 0.1);
            oscillator.stop(now + i * 0.1 + 0.2);
        });
    } catch (e) {}
}

function playWinSound() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25];
        
        notes.forEach((freq, index) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = freq;
            
            gainNode.gain.setValueAtTime(0.1, now + index * 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(now + index * 0.15);
            oscillator.stop(now + index * 0.15 + 0.2);
        });
    } catch (e) {}
}

function getScores() {
    const scores = localStorage.getItem('matchylandScores');
    return scores ? JSON.parse(scores) : { easy: [], medium: [], hard: [] };
}

function saveScore(difficulty, moves, time, playerName) {
    const scores = getScores();
    const newScore = {
        name: playerName,
        moves: moves,
        time: time,
        date: new Date().toLocaleDateString()
    };
    
    scores[difficulty].push(newScore);
    scores[difficulty].sort((a, b) => a.moves - b.moves);
    scores[difficulty] = scores[difficulty].slice(0, 10);
    
    localStorage.setItem('matchylandScores', JSON.stringify(scores));
}

function getPersonalBest(difficulty) {
    const scores = getScores();
    const best = scores[difficulty][0];
    return best ? `${best.moves} moves · ${formatTime(best.time)}` : 'Not played yet';
}

function updatePersonalBest() {
    const best = getPersonalBest(currentDifficulty);
    document.getElementById('bestScore').textContent = best;
    
    const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    document.querySelector('.pb-label').textContent = `🏆 Personal Best (${difficultyNames[currentDifficulty]})`;
}

function startTimer() {
    if (!gameStarted && !isPaused) {
        gameStarted = true;
        timerInterval = setInterval(() => {
            if (!isPaused && gameStarted) {
                timer++;
                document.getElementById('timer').textContent = formatTime(timer);
            }
        }, 1000);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function initGame() {
    // Reset new feature variables
    isPaused = false;
    hintsLeft = 3;
    document.getElementById('hintsLeft').textContent = hintsLeft;
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('pauseBtn').textContent = '⏸️';
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.style.opacity = '1';
        hintBtn.disabled = false;
    }
    
    const settings = difficultySettings[currentDifficulty];
    const totalPairs = settings.pairs;
    
    let cardPairs = [];
    for (let i = 0; i < totalPairs; i++) {
        const icon = cardIcons[i % cardIcons.length];
        cardPairs.push(icon);
        cardPairs.push(icon);
    }
    
    cards = cardPairs.sort(() => Math.random() - 0.5).map((icon, index) => ({
        id: index,
        icon: icon,
        flipped: false,
        matched: false
    }));
    
    matchedPairs = 0;
    moves = 0;
    timer = 0;
    gameStarted = false;
    canFlip = true;
    flippedCards = [];
    
    document.getElementById('moves').textContent = moves;
    document.getElementById('timer').textContent = '00:00';
    
    renderBoard();
    updatePersonalBest();
}

function renderBoard() {
    const board = document.getElementById('gameBoard');
    const settings = difficultySettings[currentDifficulty];
    
    board.className = `board ${currentDifficulty}`;
    
    board.innerHTML = cards.map((card, index) => `
        <div class="card ${card.flipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}" 
             data-id="${card.id}" 
             data-icon="${card.icon}"
             onclick="flipCard(${card.id})">
        </div>
    `).join('');
}

function endGame() {
    gameStarted = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    playWinSound();
    
    // Start confetti celebration!
    startConfetti();
    
    document.getElementById('finalMoves').textContent = moves;
    document.getElementById('finalTime').textContent = formatTime(timer);
    
    showNameInputModal();
}

function showNameInputModal() {
    const modal = document.getElementById('gameOverModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <h2 class="modal-title">Great job! 🎉</h2>
        <div class="modal-stats">
            <div class="modal-stat">
                <span class="modal-stat-label">Moves</span>
                <span class="modal-stat-value">${moves}</span>
            </div>
            <div class="modal-stat">
                <span class="modal-stat-label">Time</span>
                <span class="modal-stat-value">${formatTime(timer)}</span>
            </div>
            <div class="modal-stat">
                <span class="modal-stat-label">Hints Used</span>
                <span class="modal-stat-value">${3 - hintsLeft}</span>
            </div>
        </div>
        <div style="margin: 20px 0;">
            <label style="display: block; text-align: left; margin-bottom: 8px; font-weight: 600; color: #4a5568;">Enter your name:</label>
            <input type="text" id="playerNameInput" placeholder="Your name" maxlength="20" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 40px; font-size: 1rem; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#FF6B6B'" onblur="this.style.borderColor='#e2e8f0'">
        </div>
        <div class="modal-actions">
            <button onclick="saveScoreWithName()" class="btn btn-primary">Save Score</button>
            <button onclick="closeModalAndRestart()" class="btn btn-secondary">Skip</button>
        </div>
        <button onclick="closeModalAndRestart()" class="modal-close">✕</button>
    `;
    
    modal.style.display = 'flex';
}

function saveScoreWithName() {
    const nameInput = document.getElementById('playerNameInput');
    let playerName = nameInput.value.trim();
    
    if (playerName === '') {
        playerName = 'Anonymous';
    }
    
    saveScore(currentDifficulty, moves, timer, playerName);
    showNotification(`✅ Score saved for ${playerName}!`, 'success');
    closeModalAndRestart();
}

function restartGame() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameStarted = false;
    isPaused = false;
    initGame();
}

function changeDifficulty(difficulty) {
    currentDifficulty = difficulty;
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    restartGame();
}

function playAgain() {
    closeModal();
    restartGame();
}

function closeModal() {
    const modal = document.getElementById('gameOverModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeModalAndRestart() {
    closeModal();
    restartGame();
}

// Settings functions
let gameSettings = {};

function loadGameSettings() {
    const saved = localStorage.getItem('matchylandSettings');
    if (saved) {
        gameSettings = JSON.parse(saved);
        
        if (typeof soundEnabled !== 'undefined') {
            soundEnabled = gameSettings.soundEnabled !== false;
            const soundBtn = document.getElementById('soundBtn');
            if (soundBtn) {
                soundBtn.textContent = soundEnabled ? '🔊' : '🔈';
            }
        }
        
        applyGameSettings();
    }
}

function applyGameSettings() {
    const board = document.getElementById('gameBoard');
    if (board && gameSettings.cardSize) {
        board.setAttribute('data-card-size', gameSettings.cardSize);
    }
    
    if (gameSettings.matchDelay) {
        window.customMatchDelay = gameSettings.matchDelay;
    }
    
    if (gameSettings.cardTheme) {
        updateCardTheme(gameSettings.cardTheme);
    }
}

function updateCardTheme(theme) {
    const themes = {
        animals: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐨', '🦁', '🐧', '🐰', '🦝', '🐙', '🦋'],
        food: ['🍎', '🍕', '🍔', '🍦', '🍩', '🍪', '🍫', '🍓', '🍉', '🥝', '🍒', '🥑'],
        emojis: ['😀', '😎', '🥳', '😍', '🔥', '⭐', '❤️', '💪', '🎉', '🏆', '✨', '🌟'],
        nature: ['🌿', '🌸', '🌺', '🌻', '🍃', '🍂', '🌲', '🌵', '🌊', '⛰️', '🌈', '☀️']
    };
    
    if (themes[theme]) {
        cardIcons = themes[theme];
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundBtn = document.getElementById('soundBtn');
    soundBtn.textContent = soundEnabled ? '🔊' : '🔈';
    
    if (window.settingsManager) {
        window.settingsManager.update('soundEnabled', soundEnabled);
    } else {
        const savedSettings = localStorage.getItem('matchylandSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            settings.soundEnabled = soundEnabled;
            localStorage.setItem('matchylandSettings', JSON.stringify(settings));
        } else {
            const newSettings = { soundEnabled: soundEnabled };
            localStorage.setItem('matchylandSettings', JSON.stringify(newSettings));
        }
    }
    
    showNotification(soundEnabled ? '🔊 Sound on' : '🔈 Sound off', 'info');
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
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize game
window.onload = () => {
    loadGameSettings();
    initGame();
    initConfetti();
    
    window.onclick = function(event) {
        const modal = document.getElementById('gameOverModal');
        if (event.target == modal) {
            closeModalAndRestart();
        }
        // Also resume on clicking outside pause overlay
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (event.target == pauseOverlay && isPaused) {
            togglePause();
        }
    };
};

window.addEventListener('themeChanged', (e) => {
    const board = document.getElementById('gameBoard');
    if (board) {
        board.style.display = 'none';
        setTimeout(() => {
            board.style.display = 'grid';
        }, 10);
    }
});

window.addEventListener('storage', (e) => {
    if (e.key === 'matchylandSettings') {
        const newSettings = JSON.parse(e.newValue);
        
        if (newSettings.darkMode) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
        }
        
        if (newSettings.highContrast) {
            document.documentElement.classList.add('high-contrast');
            document.body.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
            document.body.classList.remove('high-contrast');
        }
        
        if (newSettings.reduceMotion) {
            document.documentElement.classList.add('reduce-motion');
            document.body.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
            document.body.classList.remove('reduce-motion');
        }
        
        showNotification('Settings updated', 'info');
    }
});