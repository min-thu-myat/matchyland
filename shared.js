(function() {
    const savedSettings = localStorage.getItem('matchylandSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        if (settings.darkMode) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        }
        
        if (settings.highContrast) {
            document.documentElement.classList.add('high-contrast');
            document.body.classList.add('high-contrast');
        }
        
        if (settings.reduceMotion) {
            document.documentElement.classList.add('reduce-motion');
            document.body.classList.add('reduce-motion');
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // ===== WORKING HAMBURGER MENU WITH CROSS ICON =====
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileMenuBtn && navLinks) {
        function openMenu() {
            navLinks.classList.add('show');
            mobileMenuBtn.innerHTML = '✕';
            mobileMenuBtn.setAttribute('aria-label', 'Close menu');
            document.body.style.overflow = 'hidden';
            mobileMenuBtn.classList.add('active');
        }
        
        function closeMenu() {
            navLinks.classList.remove('show');
            mobileMenuBtn.innerHTML = '☰';
            mobileMenuBtn.setAttribute('aria-label', 'Open menu');
            document.body.style.overflow = '';
            mobileMenuBtn.classList.remove('active');
        }
        
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (navLinks.classList.contains('show')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });
        
        const mainContent = document.querySelector('.main');
        if (mainContent) {
            mainContent.addEventListener('click', () => {
                if (navLinks.classList.contains('show')) {
                    closeMenu();
                }
            });
        }
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navLinks.classList.contains('show')) {
                closeMenu();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('show')) {
                closeMenu();
            }
        });
    }
    
    applySavedSettings();
    highlightCurrentPage();
});

function applySavedSettings() {
    const savedSettings = localStorage.getItem('matchylandSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        const board = document.getElementById('gameBoard');
        if (board && settings.cardSize) {
            board.setAttribute('data-card-size', settings.cardSize);
        }
        
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn && typeof settings.soundEnabled !== 'undefined') {
            soundBtn.textContent = settings.soundEnabled ? '🔊' : '🔈';
            if (typeof window.soundEnabled !== 'undefined') {
                window.soundEnabled = settings.soundEnabled;
            }
        }
    }
}

function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        } else if (currentPage === '' && linkHref === 'index.html') {
            link.classList.add('active');
        }
    });
}

function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

if (isTouchDevice()) {
    document.body.classList.add('touch-device');
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

// Keyboard Navigation for Game
let keyboardEnabled = true;
let currentCardIndex = 0;
let cardElements = [];

function initKeyboardNavigation() {
    const saved = localStorage.getItem('matchylandSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        keyboardEnabled = settings.keyboardNav !== false;
    }
    
    if (!keyboardEnabled) return;
    
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleKeyboardNavigation(e) {
    const board = document.getElementById('gameBoard');
    if (!board || board.style.display === 'none') return;
    
    cardElements = document.querySelectorAll('.card:not(.matched)');
    if (cardElements.length === 0) return;
    
    const gridCols = getGridColumns();
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            currentCardIndex = Math.max(0, currentCardIndex - 1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            currentCardIndex = Math.min(cardElements.length - 1, currentCardIndex + 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            currentCardIndex = Math.max(0, currentCardIndex - gridCols);
            break;
        case 'ArrowDown':
            e.preventDefault();
            currentCardIndex = Math.min(cardElements.length - 1, currentCardIndex + gridCols);
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            const card = cardElements[currentCardIndex];
            if (card && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
                const cardId = parseInt(card.getAttribute('data-id'));
                if (typeof flipCard === 'function') {
                    flipCard(cardId);
                }
            }
            return;
        default:
            return;
    }
    
    // Highlight current card
    cardElements.forEach((card, i) => {
        if (i === currentCardIndex) {
            card.style.outline = '3px solid #FF6B6B';
            card.style.outlineOffset = '2px';
        } else {
            card.style.outline = '';
        }
    });
}

function getGridColumns() {
    const board = document.getElementById('gameBoard');
    const style = window.getComputedStyle(board);
    return style.gridTemplateColumns.split(' ').length;
}

// Colorblind Mode Filters
function applyColorblindMode(mode) {
    const filters = {
        protanopia: 'url(#protanopia-filter)',
        deuteranopia: 'url(#deuteranopia-filter)',
        tritanopia: 'url(#tritanopia-filter)',
        none: 'none'
    };
    
    if (!document.querySelector('#colorblind-filters') && mode !== 'none') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'colorblind-filters';
        svg.style.cssText = 'position: absolute; width: 0; height: 0;';
        svg.innerHTML = `
            <defs>
                <filter id="protanopia-filter">
                    <feColorMatrix type="matrix" values="0.567,0.433,0,0,0  0.558,0.442,0,0,0  0,0.242,0.758,0,0  0,0,0,1,0"/>
                </filter>
                <filter id="deuteranopia-filter">
                    <feColorMatrix type="matrix" values="0.625,0.375,0,0,0  0.7,0.3,0,0,0  0,0.3,0.7,0,0  0,0,0,1,0"/>
                </filter>
                <filter id="tritanopia-filter">
                    <feColorMatrix type="matrix" values="0.95,0.05,0,0,0  0,0.433,0.567,0,0  0,0.475,0.525,0,0  0,0,0,1,0"/>
                </filter>
            </defs>
        `;
        document.body.prepend(svg);
    }
    
    document.body.style.filter = filters[mode];
}

// Font Size Management
function applyFontSize(size) {
    const sizes = {
        small: '14px',
        medium: '16px',
        large: '20px',
        xlarge: '24px'
    };
    
    document.documentElement.style.fontSize = sizes[size] || '16px';
    
    const board = document.getElementById('gameBoard');
    if (board) {
        const currentSize = board.getAttribute('data-card-size') || 'medium';
        board.setAttribute('data-card-size', currentSize);
    }
}

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
    initKeyboardNavigation();
    
    const saved = localStorage.getItem('matchylandSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        if (settings.colorblindMode && settings.colorblindMode !== 'none') {
            applyColorblindMode(settings.colorblindMode);
        }
        if (settings.fontSize) {
            applyFontSize(settings.fontSize);
        }
    }
});

// Export for settings page
window.accessibility = {
    applyColorblindMode,
    applyFontSize
};
