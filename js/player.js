/**
 * STREAMS — Music Player Engine
 * Web Audio API playback, controls, progress, volume
 */

let playerState = {
    currentSong: null,
    queue: [],
    originalQueue: [],
    queueIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0, // 0: off, 1: all, 2: one
    volume: 0.7,
    isMuted: false,
    currentTime: 0,
    duration: 0,
};

let audioContext = null;
let oscillator = null;
let gainNode = null;
let progressInterval = null;

// ========== AUDIO INIT ==========
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone() {
    if (!audioContext) initAudio();
    stopTone();

    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();

    const song = playerState.currentSong;
    let hash = 0;
    for (let i = 0; i < song.title.length; i++) hash = ((hash << 5) - hash) + song.title.charCodeAt(i);
    const noteFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const freq = noteFreqs[Math.abs(hash) % noteFreqs.length];

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(playerState.volume * 0.05, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
}

function stopTone() {
    if (oscillator) {
        try { oscillator.stop(); } catch(e) {}
        oscillator = null;
    }
}

// ========== PROGRESS TRACKING ==========
function startProgress() {
    clearInterval(progressInterval);
    const totalSec = playerState.duration;

    progressInterval = setInterval(() => {
        if (!playerState.isPlaying) return;
        playerState.currentTime += 0.25;
        if (playerState.currentTime >= totalSec) {
            if (playerState.repeatMode === 2) {
                playerState.currentTime = 0;
            } else {
                playNext();
                return;
            }
        }
        updateProgressUI();
    }, 250);
}

function updateProgressUI() {
    const pct = (playerState.currentTime / playerState.duration) * 100;
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = pct + '%';
    const ct = document.getElementById('currentTime');
    if (ct) ct.textContent = secondsToTime(playerState.currentTime);
    const tt = document.getElementById('totalTime');
    if (tt) tt.textContent = secondsToTime(playerState.duration);
}

// ========== PLAY SONG ==========
function playSong(song, queue, index) {
    if (!song) return;
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    playerState.currentSong = song;
    if (queue) {
        playerState.queue = [...queue];
        playerState.originalQueue = [...queue];
        playerState.queueIndex = index;
        if (playerState.isShuffle) shuffleQueue();
    }
    playerState.isPlaying = true;
    playerState.currentTime = 0;
    playerState.duration = durationToSeconds(song.duration);

    renderPlayerBar();
    playTone();
    startProgress();
    updatePlayingHighlight();
    
    // Update all play buttons across the UI
    if (typeof updateAllPlayButtons === 'function') {
        updateAllPlayButtons();
    }
}

function togglePlay() {
    if (!playerState.currentSong) return;
    playerState.isPlaying = !playerState.isPlaying;
    const btn = document.getElementById('mainPlayBtn');
    if (btn) btn.innerHTML = playerState.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

    if (playerState.isPlaying) playTone();
    else stopTone();
    updatePlayingHighlight();
    
    // Update all play buttons across the UI
    if (typeof updateAllPlayButtons === 'function') {
        updateAllPlayButtons();
    }
}

function playNext() {
    if (playerState.queue.length === 0) return;
    let idx = playerState.queueIndex + 1;
    if (idx >= playerState.queue.length) {
        if (playerState.repeatMode >= 1) idx = 0;
        else { playerState.isPlaying = false; stopTone(); clearInterval(progressInterval); return; }
    }
    playerState.queueIndex = idx;
    playSong(playerState.queue[idx], null, idx);
}

function playPrev() {
    if (playerState.queue.length === 0) return;
    if (playerState.currentTime > 3) {
        playerState.currentTime = 0;
        updateProgressUI();
        return;
    }
    let idx = playerState.queueIndex - 1;
    if (idx < 0) idx = playerState.queue.length - 1;
    playerState.queueIndex = idx;
    playSong(playerState.queue[idx], null, idx);
}

// ========== SHUFFLE ==========
function toggleShuffle() {
    playerState.isShuffle = !playerState.isShuffle;
    const btn = document.getElementById('shuffleBtn');
    if (btn) btn.classList.toggle('active', playerState.isShuffle);
    if (playerState.isShuffle) {
        shuffleQueue();
        showToast('Shuffle enabled', 'info');
    } else {
        playerState.queue = [...playerState.originalQueue];
        const ci = playerState.queue.findIndex(s => s.id === playerState.currentSong?.id);
        if (ci >= 0) playerState.queueIndex = ci;
        showToast('Shuffle disabled', 'info');
    }
}

function shuffleQueue() {
    const current = playerState.currentSong;
    let q = playerState.queue.filter(s => s.id !== current?.id);
    for (let i = q.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
    }
    if (current) q.unshift(current);
    playerState.queue = q;
    playerState.queueIndex = 0;
}

// ========== REPEAT ==========
function toggleRepeat() {
    playerState.repeatMode = (playerState.repeatMode + 1) % 3;
    const btn = document.getElementById('repeatBtn');
    if (btn) {
        btn.classList.toggle('active', playerState.repeatMode > 0);
        btn.innerHTML = playerState.repeatMode === 2 ?
            '<i class="fas fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:800;top:2px;right:2px;">1</span>' :
            '<i class="fas fa-repeat"></i>';
        btn.style.position = 'relative';
    }
    const labels = ['Repeat off', 'Repeat all', 'Repeat one'];
    showToast(labels[playerState.repeatMode], 'info');
}

// ========== SEEK ==========
function seekTrack(e) {
    if (!playerState.currentSong) return;
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    playerState.currentTime = pct * playerState.duration;
    updateProgressUI();
}

// ========== VOLUME ==========
function changeVolume(e) {
    const bar = document.getElementById('volumeBar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerState.volume = pct;
    playerState.isMuted = pct === 0;
    const fill = document.getElementById('volumeFill');
    if (fill) fill.style.width = (pct * 100) + '%';
    if (gainNode) gainNode.gain.setValueAtTime(pct * 0.05, audioContext.currentTime);
    updateVolumeIcon();
}

function toggleMute() {
    playerState.isMuted = !playerState.isMuted;
    if (playerState.isMuted) {
        if (gainNode) gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        const fill = document.getElementById('volumeFill');
        if (fill) fill.style.width = '0%';
    } else {
        if (gainNode) gainNode.gain.setValueAtTime(playerState.volume * 0.05, audioContext.currentTime);
        const fill = document.getElementById('volumeFill');
        if (fill) fill.style.width = (playerState.volume * 100) + '%';
    }
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const btn = document.getElementById('volumeBtn');
    if (!btn) return;
    const icon = playerState.isMuted || playerState.volume === 0 ? 'fa-volume-xmark' :
                 playerState.volume < 0.3 ? 'fa-volume-low' :
                 playerState.volume < 0.7 ? 'fa-volume-low' : 'fa-volume-high';
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
}

// ========== LIKE CURRENT ==========
function toggleLikeCurrent() {
    if (!playerState.currentSong) return;
    toggleFavorite(playerState.currentSong.id);
    renderPlayerBar();
}

// ========== UPDATE PLAYING HIGHLIGHT ==========
function updatePlayingHighlight() {
    document.querySelectorAll('.song-row').forEach(r => {
        const isCurrentSong = r.dataset.songId === playerState.currentSong?.id;
        r.classList.toggle('playing', isCurrentSong);
        
        // Update eq bars and play button
        const eqBars = r.querySelector('.eq-bars');
        const playBtn = r.querySelector('.song-play-btn i');
        const songNum = r.querySelector('.song-num');
        const numCol = r.querySelector('.song-num-col');
        
        if (isCurrentSong) {
            // Show eq bars, hide number
            if (songNum) songNum.style.display = 'none';
            if (eqBars) {
                eqBars.style.display = 'flex';
                eqBars.classList.toggle('paused', !playerState.isPlaying);
            }
            if (playBtn) playBtn.className = `fas ${playerState.isPlaying ? 'fa-pause' : 'fa-play'}`;
        } else {
            // Show number, no eq bars
            if (songNum) songNum.style.display = '';
        }
    });
}

// ========== RENDER PLAYER BAR ==========
function renderPlayerBar() {
    const song = playerState.currentSong;
    const bar = document.getElementById('playerBar');
    if (!song) { bar.style.display = 'none'; return; }

    const faves = getFavorites();
    const isLiked = faves.some(f => f.id === song.id);

    bar.style.display = 'grid';
    bar.innerHTML = `
        <div class="player-track">
            <div class="player-cover"><img src="${song.cover || getCover(0)}" alt=""></div>
            <div class="player-track-info">
                <div class="player-track-name">${song.title}</div>
                <div class="player-track-artist">${song.artist}</div>
            </div>
            <button class="player-like ${isLiked ? 'liked' : ''}" onclick="toggleLikeCurrent()">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
        <div class="player-controls">
            <div class="player-buttons">
                <button class="player-btn ${playerState.isShuffle ? 'active' : ''}" id="shuffleBtn" onclick="toggleShuffle()" title="Shuffle"><i class="fas fa-shuffle"></i></button>
                <button class="player-btn" onclick="playPrev()" title="Previous"><i class="fas fa-backward-step"></i></button>
                <button class="play-pause-btn" id="mainPlayBtn" onclick="togglePlay()">
                    <i class="fas ${playerState.isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                </button>
                <button class="player-btn" onclick="playNext()" title="Next"><i class="fas fa-forward-step"></i></button>
                <button class="player-btn ${playerState.repeatMode > 0 ? 'active' : ''}" id="repeatBtn" onclick="toggleRepeat()" title="Repeat">
                    <i class="fas fa-repeat"></i>
                </button>
            </div>
            <div class="player-progress">
                <span class="player-time" id="currentTime">${secondsToTime(playerState.currentTime)}</span>
                <div class="progress-bar-container" id="progressBar" onclick="seekTrack(event)">
                    <div class="progress-bar-fill" id="progressFill" style="width:${(playerState.currentTime/playerState.duration*100)||0}%"></div>
                </div>
                <span class="player-time" id="totalTime">${song.duration}</span>
            </div>
        </div>
        <div class="player-extras">
            <button class="player-btn" onclick="navigateTo('queue')" title="Queue"><i class="fas fa-bars-staggered"></i></button>
            <div class="volume-control">
                <button class="volume-btn" id="volumeBtn" onclick="toggleMute()"><i class="fas fa-volume-high"></i></button>
                <div class="volume-slider-container" id="volumeBar" onclick="changeVolume(event)">
                    <div class="volume-slider-fill" id="volumeFill" style="width:${playerState.volume*100}%"></div>
                </div>
            </div>
        </div>
    `;

    updateVolumeIcon();
}

// ========== DRAG SUPPORT ==========
let isDraggingProgress = false;
let isDraggingVolume = false;

document.addEventListener('mousedown', e => {
    const pb = document.getElementById('progressBar');
    const vb = document.getElementById('volumeBar');
    if (pb && (e.target === pb || pb.contains(e.target))) isDraggingProgress = true;
    if (vb && (e.target === vb || vb.contains(e.target))) isDraggingVolume = true;
});

document.addEventListener('mousemove', e => {
    if (isDraggingProgress) seekTrack(e);
    if (isDraggingVolume) changeVolume(e);
});

document.addEventListener('mouseup', () => {
    isDraggingProgress = false;
    isDraggingVolume = false;
});
