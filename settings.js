class SettingsManager {
    constructor() {
        this.defaults = {
            // Audio Settings
            soundEnabled: true,
            musicEnabled: false,
            musicStyle: 'lofi',
            volume: 70,
            
            // Gameplay Settings
            flipSpeed: 'normal',
            cardTheme: 'animals',
            matchDelay: 750,
            
            // Visual Settings
            darkMode: false,
            highContrast: false,
            reduceMotion: false,
            cardSize: 'medium',
            autoSaveScores: true,
            
            // ===== ACCESSIBILITY SETTINGS =====
            keyboardNav: true,
            colorblindMode: 'none',
            fontSize: 'medium'
        };
        
        this.settings = this.load();
        this.musicContext = null;
        this.musicGain = null;
        this.isMusicPlaying = false;
        this.currentLoopTimeout = null;
        this.currentOscillators = [];
        this.init();
    }
    
    load() {
        const saved = localStorage.getItem('matchylandSettings');
        if (saved) {
            try {
                return { ...this.defaults, ...JSON.parse(saved) };
            } catch (e) {
                return { ...this.defaults };
            }
        }
        return { ...this.defaults };
    }
    
    save() {
        localStorage.setItem('matchylandSettings', JSON.stringify(this.settings));
        this.applySettings();
        this.showNotification('Settings saved!', 'success');
    }
    
    applySettings() {
        // Apply dark mode
        if (this.settings.darkMode) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
        }
        
        // Apply high contrast
        if (this.settings.highContrast) {
            document.documentElement.classList.add('high-contrast');
            document.body.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
            document.body.classList.remove('high-contrast');
        }
        
        // Apply reduced motion
        if (this.settings.reduceMotion) {
            document.documentElement.classList.add('reduce-motion');
            document.body.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
            document.body.classList.remove('reduce-motion');
        }
        
        // Apply card size
        this.applyCardSize();
        
        // Apply font size
        this.applyFontSize(this.settings.fontSize);
        
        // Apply colorblind mode
        this.applyColorblindMode(this.settings.colorblindMode);
        
        // Sync with game sound
        this.syncWithGameSound();
        
        // Apply music settings (only on game page)
        this.applyMusicSettings();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { 
                darkMode: this.settings.darkMode,
                highContrast: this.settings.highContrast,
                reduceMotion: this.settings.reduceMotion
            } 
        }));
    }
    
    // Apply font size
    applyFontSize(size) {
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '20px',
            xlarge: '24px'
        };
        
        document.documentElement.style.fontSize = sizes[size] || '16px';
        
        // Adjust card sizes proportionally
        const board = document.getElementById('gameBoard');
        if (board) {
            const currentSize = board.getAttribute('data-card-size') || 'medium';
            board.setAttribute('data-card-size', currentSize);
        }
    }
    
    // Apply colorblind mode filter
    applyColorblindMode(mode) {
        const filters = {
            protanopia: 'url(#protanopia-filter)',
            deuteranopia: 'url(#deuteranopia-filter)',
            tritanopia: 'url(#tritanopia-filter)',
            none: 'none'
        };
        
        // Remove existing filters if any
        const existingSvg = document.querySelector('#colorblind-filters');
        if (existingSvg) existingSvg.remove();
        
        // Add SVG filters if not none
        if (mode !== 'none') {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'colorblind-filters';
            svg.style.cssText = 'position: absolute; width: 0; height: 0; pointer-events: none;';
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
        
        document.body.style.filter = filters[mode] || 'none';
    }
    
    // Check if current page is the game page
    isGamePage() {
        return window.location.pathname.includes('game.html') || 
               window.location.pathname.endsWith('/game') ||
               (window.location.pathname === '/' && document.querySelector('#gameBoard'));
    }
    
    // ========== COZY MUSIC STYLES ==========
    
    getMusicStyles() {
        return {
            lofi: { name: '🎧 Lo-Fi Chill', desc: 'Relaxing beats, perfect for focus' },
            piano: { name: '🎹 Soft Piano', desc: 'Gentle piano melody, peaceful' },
            chiptune: { name: '🎮 Cozy Chiptune', desc: 'Warm retro game vibes' },
            ambient: { name: '🌙 Ambient Dream', desc: 'Ethereal, calm atmosphere' }
        };
    }
    
    initMusicSystem() {
        if (this.musicContext) return;
        
        try {
            this.musicContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.musicContext.createGain();
            this.musicGain.connect(this.musicContext.destination);
            this.musicGain.gain.value = this.settings.volume / 100;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }
    
    stopAllOscillators() {
        this.currentOscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch(e) {}
        });
        this.currentOscillators = [];
        if (this.currentLoopTimeout) {
            clearTimeout(this.currentLoopTimeout);
            this.currentLoopTimeout = null;
        }
    }
    
    // STYLE 1: Lo-Fi Chill
    playLofiMusic() {
        if (!this.musicContext || !this.settings.musicEnabled || !this.isGamePage()) return;
        
        this.isMusicPlaying = true;
        
        const chords = [
            { notes: [261.63, 329.63, 392.00, 493.88], duration: 2.5 },
            { notes: [220.00, 261.63, 329.63, 392.00], duration: 2.5 },
            { notes: [174.61, 220.00, 261.63, 349.23], duration: 2.5 },
            { notes: [196.00, 246.94, 293.66, 392.00], duration: 2.5 }
        ];
        
        let chordIndex = 0;
        
        const playChord = () => {
            if (!this.isMusicPlaying || !this.settings.musicEnabled || !this.isGamePage()) return;
            
            const chord = chords[chordIndex % chords.length];
            const startTime = this.musicContext.currentTime;
            
            chord.notes.forEach((freq, i) => {
                const oscillator = this.musicContext.createOscillator();
                const gainNode = this.musicContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                oscillator.detune.value = (Math.random() - 0.5) * 10;
                
                oscillator.connect(gainNode);
                gainNode.connect(this.musicGain);
                
                gainNode.gain.setValueAtTime(0, startTime + i * 0.05);
                gainNode.gain.linearRampToValueAtTime(0.12, startTime + i * 0.05 + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + chord.duration - 0.3);
                
                oscillator.start(startTime + i * 0.05);
                oscillator.stop(startTime + chord.duration);
                
                this.currentOscillators.push(oscillator);
            });
            
            chordIndex++;
            this.currentLoopTimeout = setTimeout(playChord, chord.duration * 1000);
        };
        
        playChord();
    }
    
    // STYLE 2: Soft Piano
    playPianoMusic() {
        if (!this.musicContext || !this.settings.musicEnabled || !this.isGamePage()) return;
        
        this.isMusicPlaying = true;
        
        const melody = [
            { note: 261.63, duration: 0.6 },
            { note: 293.66, duration: 0.6 },
            { note: 329.63, duration: 0.6 },
            { note: 349.23, duration: 1.2 },
            { note: 329.63, duration: 0.6 },
            { note: 293.66, duration: 0.6 },
            { note: 261.63, duration: 1.2 },
            { note: 196.00, duration: 0.6 },
            { note: 220.00, duration: 0.6 },
            { note: 246.94, duration: 0.6 },
            { note: 261.63, duration: 1.5 }
        ];
        
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.isMusicPlaying || !this.settings.musicEnabled || !this.isGamePage()) return;
            if (noteIndex >= melody.length) {
                noteIndex = 0;
                setTimeout(playNote, 500);
                return;
            }
            
            const note = melody[noteIndex];
            const startTime = this.musicContext.currentTime;
            
            const oscillator = this.musicContext.createOscillator();
            const gainNode = this.musicContext.createGain();
            
            oscillator.type = 'triangle';
            oscillator.frequency.value = note.note;
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration - 0.1);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + note.duration);
            
            this.currentOscillators.push(oscillator);
            
            noteIndex++;
            this.currentLoopTimeout = setTimeout(playNote, note.duration * 1000);
        };
        
        playNote();
    }
    
    // STYLE 3: Cozy Chiptune
    playChiptuneMusic() {
        if (!this.musicContext || !this.settings.musicEnabled || !this.isGamePage()) return;
        
        this.isMusicPlaying = true;
        
        const melody = [
            { note: 523.25, duration: 0.3 },
            { note: 523.25, duration: 0.3 },
            { note: 587.33, duration: 0.3 },
            { note: 523.25, duration: 0.3 },
            { note: 659.25, duration: 0.3 },
            { note: 523.25, duration: 0.6 },
            { note: 493.88, duration: 0.3 },
            { note: 493.88, duration: 0.3 },
            { note: 523.25, duration: 0.3 },
            { note: 493.88, duration: 0.3 },
            { note: 440.00, duration: 0.6 },
            { note: 523.25, duration: 0.3 },
            { note: 523.25, duration: 0.3 },
            { note: 587.33, duration: 0.3 },
            { note: 523.25, duration: 0.3 },
            { note: 659.25, duration: 0.6 },
            { note: 523.25, duration: 0.6 },
            { note: 392.00, duration: 0.6 },
            { note: 523.25, duration: 1.2 }
        ];
        
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.isMusicPlaying || !this.settings.musicEnabled || !this.isGamePage()) return;
            if (noteIndex >= melody.length) {
                noteIndex = 0;
                setTimeout(playNote, 300);
                return;
            }
            
            const note = melody[noteIndex];
            const startTime = this.musicContext.currentTime;
            
            const oscillator = this.musicContext.createOscillator();
            const gainNode = this.musicContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.value = note.note;
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration - 0.05);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + note.duration);
            
            this.currentOscillators.push(oscillator);
            
            noteIndex++;
            this.currentLoopTimeout = setTimeout(playNote, note.duration * 1000);
        };
        
        playNote();
    }
    
    // STYLE 4: Ambient Dream
    playAmbientMusic() {
        if (!this.musicContext || !this.settings.musicEnabled || !this.isGamePage()) return;
        
        this.isMusicPlaying = true;
        
        const drones = [
            { note: 261.63, duration: 8 },
            { note: 293.66, duration: 8 },
            { note: 329.63, duration: 8 },
            { note: 349.23, duration: 8 },
            { note: 329.63, duration: 8 },
            { note: 293.66, duration: 8 }
        ];
        
        let droneIndex = 0;
        
        const playDrone = () => {
            if (!this.isMusicPlaying || !this.settings.musicEnabled || !this.isGamePage()) return;
            
            const drone = drones[droneIndex % drones.length];
            const startTime = this.musicContext.currentTime;
            
            [0, 0.02, 0.05].forEach(detune => {
                const oscillator = this.musicContext.createOscillator();
                const gainNode = this.musicContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.value = drone.note;
                oscillator.detune.value = detune * 100;
                
                oscillator.connect(gainNode);
                gainNode.connect(this.musicGain);
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.08, startTime + 2);
                gainNode.gain.linearRampToValueAtTime(0.08, startTime + drone.duration - 3);
                gainNode.gain.linearRampToValueAtTime(0, startTime + drone.duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + drone.duration);
                
                this.currentOscillators.push(oscillator);
            });
            
            droneIndex++;
            this.currentLoopTimeout = setTimeout(playDrone, drone.duration * 1000);
        };
        
        playDrone();
    }
    
    startBackgroundMusic() {
        if (!this.settings.musicEnabled || !this.isGamePage()) {
            return;
        }
        
        if (this.isMusicPlaying) this.stopBackgroundMusic();
        
        this.initMusicSystem();
        
        if (!this.musicContext) return;
        
        if (this.musicContext.state === 'suspended') {
            this.musicContext.resume().then(() => {
                this.playSelectedStyle();
            }).catch(e => console.log('AudioContext resume failed:', e));
        } else {
            this.playSelectedStyle();
        }
    }
    
    playSelectedStyle() {
        this.stopAllOscillators();
        
        switch(this.settings.musicStyle) {
            case 'lofi':
                this.playLofiMusic();
                break;
            case 'piano':
                this.playPianoMusic();
                break;
            case 'chiptune':
                this.playChiptuneMusic();
                break;
            case 'ambient':
                this.playAmbientMusic();
                break;
            default:
                this.playLofiMusic();
        }
    }
    
    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        this.stopAllOscillators();
    }
    
    updateMusicVolume() {
        if (this.musicGain) {
            this.musicGain.gain.value = this.settings.volume / 100;
        }
    }
    
    applyMusicSettings() {
        if (this.isGamePage()) {
            if (this.settings.musicEnabled) {
                this.startBackgroundMusic();
            } else {
                this.stopBackgroundMusic();
            }
        } else {
            this.stopBackgroundMusic();
        }
        this.updateMusicVolume();
    }
    
    enableAudioOnUserInteraction() {
        if (this.musicContext && this.musicContext.state === 'suspended' && this.isGamePage()) {
            this.musicContext.resume().then(() => {
                if (this.settings.musicEnabled && !this.isMusicPlaying) {
                    this.startBackgroundMusic();
                }
            });
        }
    }
    
    applyCardSize() {
        const board = document.getElementById('gameBoard');
        if (board) {
            board.setAttribute('data-card-size', this.settings.cardSize);
        }
    }
    
    syncWithGameSound() {
        const soundBtn = document.getElementById('soundBtn');
        if (soundBtn) {
            soundBtn.textContent = this.settings.soundEnabled ? '🔊' : '🔈';
        }
        
        if (typeof window.soundEnabled !== 'undefined') {
            window.soundEnabled = this.settings.soundEnabled;
        }
        
        if (typeof window.updateSoundFromSettings === 'function') {
            window.updateSoundFromSettings(this.settings.soundEnabled);
        }
    }
    
    update(key, value) {
        this.settings[key] = value;
        
        if (key === 'musicEnabled') {
            if (value && this.isGamePage()) {
                this.startBackgroundMusic();
            } else {
                this.stopBackgroundMusic();
            }
        }
        
        if (key === 'musicStyle') {
            if (this.settings.musicEnabled && this.isGamePage()) {
                this.startBackgroundMusic();
            }
            this.showNotification(`Music style changed to ${this.getMusicStyles()[value].name}`, 'success');
        }
        
        if (key === 'volume') {
            this.updateMusicVolume();
            if (typeof window.updateGameVolume === 'function') {
                window.updateGameVolume(value);
            }
        }
        
        if (key === 'fontSize') {
            this.applyFontSize(value);
        }
        
        if (key === 'colorblindMode') {
            this.applyColorblindMode(value);
        }
        
        this.save();
    }
    
    reset() {
        this.settings = { ...this.defaults };
        this.save();
        this.updateUI();
        this.showNotification('Settings reset to defaults!', 'info');
    }
    
    updateUI() {
        // Audio Settings
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) soundToggle.checked = this.settings.soundEnabled;
        
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.checked = this.settings.musicEnabled;
            musicToggle.disabled = false;
        }
        
        const musicStyleSelect = document.getElementById('musicStyle');
        if (musicStyleSelect) musicStyleSelect.value = this.settings.musicStyle;
        
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) volumeSlider.value = this.settings.volume;
        
        const volumeValue = document.getElementById('volumeValue');
        if (volumeValue) volumeValue.textContent = this.settings.volume + '%';
        
        // Gameplay Settings
        const flipSpeed = document.getElementById('flipSpeed');
        if (flipSpeed) flipSpeed.value = this.settings.flipSpeed;
        
        const matchDelay = document.getElementById('matchDelay');
        if (matchDelay) matchDelay.value = this.settings.matchDelay;
        
        // Visual Settings
        const darkMode = document.getElementById('darkModeToggle');
        if (darkMode) darkMode.checked = this.settings.darkMode;
        
        const highContrast = document.getElementById('highContrastToggle');
        if (highContrast) highContrast.checked = this.settings.highContrast;
        
        const reduceMotion = document.getElementById('reduceMotionToggle');
        if (reduceMotion) reduceMotion.checked = this.settings.reduceMotion;
        
        const autoSave = document.getElementById('autoSaveToggle');
        if (autoSave) autoSave.checked = this.settings.autoSaveScores;
        
        // Accessibility Settings
        const keyboardNavToggle = document.getElementById('keyboardNavToggle');
        if (keyboardNavToggle) keyboardNavToggle.checked = this.settings.keyboardNav;
        
        const colorblindSelect = document.getElementById('colorblindMode');
        if (colorblindSelect) colorblindSelect.value = this.settings.colorblindMode;
        
        // Theme Buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            if (btn.dataset.theme === this.settings.cardTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Card Size Buttons (RED)
        document.querySelectorAll('.size-btn').forEach(btn => {
            if (btn.dataset.size === this.settings.cardSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Font Size Buttons (GREEN) - SEPARATE
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            if (btn.dataset.font === this.settings.fontSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    
    showNotification(message, type = 'info') {
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
    
    exportData() {
        const data = {
            settings: this.settings,
            scores: localStorage.getItem('matchylandScores'),
            exportDate: new Date().toISOString(),
            version: '2.0.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `matchyland-backup-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }
    
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    this.save();
                }
                if (data.scores) {
                    localStorage.setItem('matchylandScores', data.scores);
                }
                this.updateUI();
                this.showNotification('Data imported successfully!', 'success');
            } catch (error) {
                this.showNotification('Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    clearAllData() {
        if (confirm('⚠️ WARNING: This will delete ALL your scores and settings. This cannot be undone. Are you sure?')) {
            localStorage.removeItem('matchylandScores');
            localStorage.removeItem('matchylandSettings');
            this.settings = { ...this.defaults };
            this.save();
            this.updateUI();
            this.showNotification('All data cleared!', 'info');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }
    
    setupEventListeners() {
        // ===== AUDIO SETTINGS =====
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.update('soundEnabled', e.target.checked);
                this.syncWithGameSound();
                this.showNotification(e.target.checked ? '🔊 Sound on' : '🔈 Sound off', 'info');
            });
        }
        
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                this.update('musicEnabled', e.target.checked);
                this.showNotification(e.target.checked ? '🎵 Music on' : '🎵 Music off', 'success');
            });
        }
        
        const musicStyleSelect = document.getElementById('musicStyle');
        if (musicStyleSelect) {
            musicStyleSelect.addEventListener('change', (e) => {
                this.update('musicStyle', e.target.value);
            });
        }
        
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                if (volumeValue) volumeValue.textContent = val + '%';
                this.update('volume', parseInt(val));
            });
        }
        
        // ===== GAMEPLAY SETTINGS =====
        const flipSpeed = document.getElementById('flipSpeed');
        if (flipSpeed) {
            flipSpeed.addEventListener('change', (e) => {
                this.update('flipSpeed', e.target.value);
                this.showNotification(`Flip speed set to ${e.target.options[e.target.selectedIndex].text}`, 'info');
            });
        }
        
        const matchDelay = document.getElementById('matchDelay');
        if (matchDelay) {
            matchDelay.addEventListener('change', (e) => {
                this.update('matchDelay', parseInt(e.target.value));
                this.showNotification(`Match delay set to ${e.target.options[e.target.selectedIndex].text}`, 'info');
            });
        }
        
        // ===== VISUAL SETTINGS =====
        const darkMode = document.getElementById('darkModeToggle');
        if (darkMode) {
            darkMode.addEventListener('change', (e) => {
                this.update('darkMode', e.target.checked);
                this.showNotification(e.target.checked ? '🌙 Dark mode on' : '☀️ Dark mode off', 'info');
            });
        }
        
        const highContrast = document.getElementById('highContrastToggle');
        if (highContrast) {
            highContrast.addEventListener('change', (e) => {
                this.update('highContrast', e.target.checked);
                this.showNotification(e.target.checked ? '👁️ High contrast mode on' : '👁️ High contrast mode off', 'info');
            });
        }
        
        const reduceMotion = document.getElementById('reduceMotionToggle');
        if (reduceMotion) {
            reduceMotion.addEventListener('change', (e) => {
                this.update('reduceMotion', e.target.checked);
                this.showNotification(e.target.checked ? '🎬 Reduced motion enabled' : '🎬 Animations restored', 'info');
            });
        }
        
        const autoSave = document.getElementById('autoSaveToggle');
        if (autoSave) {
            autoSave.addEventListener('change', (e) => {
                this.update('autoSaveScores', e.target.checked);
                this.showNotification(e.target.checked ? '💾 Auto-save enabled' : '💾 Auto-save disabled', 'info');
            });
        }
        
        // Theme Buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.update('cardTheme', theme);
                this.updateUI();
                
                const themeNames = {
                    animals: 'Animals 🐶',
                    food: 'Food 🍕',
                    emojis: 'Emojis 😊',
                    nature: 'Nature 🌿'
                };
                this.showNotification(`Theme changed to ${themeNames[theme]}`, 'success');
            });
        });
        
        // Card Size Buttons (RED)
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                this.update('cardSize', size);
                this.updateUI();
                
                const sizeNames = {
                    small: 'Small',
                    medium: 'Medium',
                    large: 'Large'
                };
                this.showNotification(`Card size set to ${sizeNames[size]}`, 'info');
            });
        });
        
        // ===== ACCESSIBILITY SETTINGS =====
        
        // Keyboard Navigation Toggle
        const keyboardNavToggle = document.getElementById('keyboardNavToggle');
        if (keyboardNavToggle) {
            keyboardNavToggle.addEventListener('change', (e) => {
                this.update('keyboardNav', e.target.checked);
                this.showNotification(e.target.checked ? '⌨️ Keyboard navigation enabled' : 'Keyboard navigation disabled', 'info');
            });
        }
        
        // Colorblind Mode
        const colorblindSelect = document.getElementById('colorblindMode');
        if (colorblindSelect) {
            colorblindSelect.addEventListener('change', (e) => {
                this.update('colorblindMode', e.target.value);
                this.showNotification(`Colorblind mode: ${e.target.options[e.target.selectedIndex].text}`, 'info');
            });
        }
        
        // Font Size Buttons (GREEN) - SEPARATE
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = btn.dataset.font;
                this.update('fontSize', size);
                
                // Update active state
                document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const sizeNames = {
                    small: 'Small',
                    medium: 'Medium',
                    large: 'Large',
                    xlarge: 'X-Large'
                };
                this.showNotification(`Font size set to ${sizeNames[size]}`, 'info');
            });
        });
        
        // ===== DATA MANAGEMENT =====
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        const importBtn = document.getElementById('importDataBtn');
        const importFile = document.getElementById('importFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.importData(e.target.files[0]);
                    importFile.value = '';
                }
            });
        }
        
        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }
        
        const resetBtn = document.getElementById('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
        
        // ===== AUDIO INTERACTION =====
        const enableAudioOnInteraction = () => {
            this.enableAudioOnUserInteraction();
            document.removeEventListener('click', enableAudioOnInteraction);
            document.removeEventListener('touchstart', enableAudioOnInteraction);
            document.removeEventListener('keydown', enableAudioOnInteraction);
        };
        
        document.addEventListener('click', enableAudioOnInteraction);
        document.addEventListener('touchstart', enableAudioOnInteraction);
        document.addEventListener('keydown', enableAudioOnInteraction);
    }
        
        init() {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateUI();
                this.setupEventListeners();
                this.applySettings();
            });
        }
    }

// Initialize settings manager
window.settingsManager = new SettingsManager();
