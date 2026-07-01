/**
 * STREAMS — Music Player Engine
 * Real audio playback via HTML5 Audio + Web Audio API fallback
 */

let playerState = {
    currentSong: null,
    queue: [],
    originalQueue: [],
    queueIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0,
    volume: 0.7,
    isMuted: false,
    currentTime: 0,
    duration: 0,
};

// Real HTML5 Audio element for actual playback
let audioElement = new Audio();
audioElement.preload = 'metadata';

// Web Audio API fallback for demo songs (no real audio file)
let audioContext = null;
let oscillator = null;
let gainNode = null;
let progressInterval = null;

// Track whether we're playing a real file or simulating
let isRealAudio = false;

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
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(noteFreqs[Math.abs(hash) % noteFreqs.length], audioContext.currentTime);
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

// ========== REAL AUDIO EVENT HANDLERS ==========
audioElement.addEventListener('timeupdate', () => {
    if (!isRealAudio) return;
    playerState.currentTime = audioElement.currentTime;
    playerState.duration = audioElement.duration || durationToSeconds(playerState.currentSong?.duration || '0:00');
    updateProgressUI();
});

audioElement.addEventListener('ended', () => {
    if (!isRealAudio) return;
    if (playerState.repeatMode === 2) {
        audioElement.currentTime = 0;
        audioElement.play();
    } else {
        playNext();
    }
});

audioElement.addEventListener('loadedmetadata', () => {
    if (!isRealAudio) return;
    playerState.duration = audioElement.duration;
    updateProgressUI();
});

// ========== SIMULATED PROGRESS (for demo songs without audio files) ==========
function startSimulatedProgress() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (!playerState.isPlaying) return;
        playerState.currentTime += 0.25;
        if (playerState.currentTime >= playerState.duration) {
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
    const pct = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = pct + '%';
    const ct = document.getElementById('currentTime');
    if (ct) ct.textContent = secondsToTime(playerState.currentTime);
    const tt = document.getElementById('totalTime');
    if (tt) tt.textContent = secondsToTime(playerState.duration);
}

// ========== PLAY SONG ==========
async function playSong(song, queue, index) {
    if (!song) return;

    // Stop any current playback
    audioElement.pause();
    stopTone();
    clearInterval(progressInterval);

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
    updatePlayingHighlight();
    if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();

    // Decide: IndexedDB upload vs Apple Music stream vs fallback
    if (song.hasAudio) {
        // Real user upload — load from IndexedDB and play
        isRealAudio = true;
        loadAndPlayAudio(song);
    } else if (song.audioUrl) {
        // Real stream URL (already fetched from Apple Music)
        isRealAudio = true;
        audioElement.src = song.audioUrl;
        audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
        audioElement.play().catch(e => {
            console.warn('Cached audio URL playback failed, querying Apple Music...', e.message);
            fetchAndPlayAppleMusic(song, index);
        });
    } else {
        // Query Apple Music live right now!
        fetchAndPlayAppleMusic(song, index);
    }
}

async function fetchAndPlayAppleMusic(song, index) {
    if (typeof fetchAppleMusicTrack !== 'function') {
        playFallbackAudio(song, index);
        return;
    }

    showToast(`🎵 Connecting to Apple Music for "${song.title}"...`, 'info');

    try {
        const realData = await fetchAppleMusicTrack(song.title, song.artist);
        if (realData && realData.audioUrl && playerState.currentSong?.id === song.id) {
            song.audioUrl = realData.audioUrl;
            if (realData.cover) song.cover = realData.cover;
            if (realData.album) song.album = realData.album;
            song.appleMusicVerified = true;

            // Update database silently
            let songs = DB.get('songs') || [];
            const idx = songs.findIndex(s => s.id === song.id);
            if (idx >= 0) {
                songs[idx] = song;
                DB.set('songs', songs);
            }

            // Update UI with real artwork
            renderPlayerBar();
            if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();

            isRealAudio = true;
            audioElement.src = song.audioUrl;
            audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
            await audioElement.play();
            return;
        }
    } catch(e) {
        console.warn('Apple Music live fetch error:', e);
    }

    // If Apple Music preview restricted or offline, play real open stream
    playFallbackAudio(song, index);
}

function playFallbackAudio(song, index) {
    if (playerState.currentSong?.id !== song.id) return;
    const fallbackStream = typeof getFallbackRealStream === 'function' ? getFallbackRealStream(index) : null;
    if (fallbackStream) {
        isRealAudio = true;
        audioElement.src = fallbackStream;
        audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
        audioElement.play().catch(() => {
            isRealAudio = false;
            initAudio();
            if (audioContext.state === 'suspended') audioContext.resume();
            playTone();
            startSimulatedProgress();
        });
    } else {
        isRealAudio = false;
        initAudio();
        if (audioContext.state === 'suspended') audioContext.resume();
        playTone();
        startSimulatedProgress();
    }
}

function togglePlay() {
    if (!playerState.currentSong) return;
    playerState.isPlaying = !playerState.isPlaying;

    const btn = document.getElementById('mainPlayBtn');
    if (btn) btn.innerHTML = playerState.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

    if (isRealAudio) {
        if (playerState.isPlaying) audioElement.play();
        else audioElement.pause();
    } else {
        if (playerState.isPlaying) playTone();
        else stopTone();
    }

    updatePlayingHighlight();
    if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();
}

function playNext() {
    if (playerState.queue.length === 0) return;
    let idx = playerState.queueIndex + 1;
    if (idx >= playerState.queue.length) {
        if (playerState.repeatMode >= 1) idx = 0;
        else {
            playerState.isPlaying = false;
            audioElement.pause();
            stopTone();
            clearInterval(progressInterval);
            if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();
            return;
        }
    }
    playerState.queueIndex = idx;
    playSong(playerState.queue[idx], null, idx);
}

function playPrev() {
    if (playerState.queue.length === 0) return;
    if (playerState.currentTime > 3) {
        playerState.currentTime = 0;
        if (isRealAudio) audioElement.currentTime = 0;
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
    showToast(['Repeat off', 'Repeat all', 'Repeat one'][playerState.repeatMode], 'info');
}

// ========== SEEK ==========
function seekTrack(e) {
    if (!playerState.currentSong) return;
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * playerState.duration;
    playerState.currentTime = newTime;
    if (isRealAudio) audioElement.currentTime = newTime;
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

    audioElement.volume = pct;
    if (gainNode) gainNode.gain.setValueAtTime(pct * 0.05, audioContext.currentTime);
    updateVolumeIcon();
}

function toggleMute() {
    playerState.isMuted = !playerState.isMuted;
    const vol = playerState.isMuted ? 0 : playerState.volume;
    audioElement.volume = vol;
    if (gainNode) gainNode.gain.setValueAtTime(vol * 0.05, audioContext?.currentTime || 0);
    const fill = document.getElementById('volumeFill');
    if (fill) fill.style.width = (vol * 100) + '%';
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const btn = document.getElementById('volumeBtn');
    if (!btn) return;
    const v = playerState.isMuted ? 0 : playerState.volume;
    const icon = v === 0 ? 'fa-volume-xmark' : v < 0.5 ? 'fa-volume-low' : 'fa-volume-high';
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
}

// ========== LIKE CURRENT ==========
function toggleLikeCurrent() {
    if (!playerState.currentSong) return;
    toggleFavorite(playerState.currentSong.id);
    renderPlayerBar();
}

// ========== UPDATE PLAYING HIGHLIGHT (overridden by views.js) ==========
function updatePlayingHighlight() {
    if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();
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
                <span class="player-time" id="totalTime">${secondsToTime(playerState.duration)}</span>
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

// ========== LOAD AUDIO FROM INDEXEDDB ==========
async function loadAndPlayAudio(song) {
    try {
        const audioRecord = await getAudioFile(song.id);
        if (audioRecord && audioRecord.data) {
            const blob = new Blob([audioRecord.data], { type: audioRecord.type || 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            audioElement.src = url;
            audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
            await audioElement.play();
            console.log('▶️ Playing:', song.title);
        } else {
            // No file found in IndexedDB — fall back to simulated
            console.warn('Audio file not found in database, simulating playback');
            isRealAudio = false;
            initAudio();
            if (audioContext.state === 'suspended') audioContext.resume();
            playTone();
            startSimulatedProgress();
        }
    } catch (e) {
        console.warn('Audio load failed:', e.message);
        isRealAudio = false;
        playTone();
        startSimulatedProgress();
    }
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
