/**
 * STREAMS — Music Player Engine
 * Real audio playback via HTML5 Audio — no synthesized/fallback playback of any kind
 */

let playerState = {
    currentSong: null,
    queue: [],
    originalQueue: [],
    queueIndex: -1,
    isPlaying: false,
    isLoading: false,
    isShuffle: false,
    repeatMode: 0,
    volume: 0.7,
    isMuted: false,
    currentTime: 0,
    duration: 0,
};

// Real HTML5 Audio element — the only playback path. There is no synthesized/fallback
// tone anymore, so we can never end up with a fake "song" playing alongside a real one.
let audioElement = new Audio();
audioElement.preload = 'metadata';

// Bumped on every playSong() call. Async lookups check this before touching the audio
// element or UI, so a slow fetch for a song the user has since skipped past can't
// suddenly start playing over whatever is current now.
let loadToken = 0;

// ========== REAL AUDIO EVENT HANDLERS ==========
audioElement.addEventListener('timeupdate', () => {
    playerState.currentTime = audioElement.currentTime;
    playerState.duration = audioElement.duration || durationToSeconds(playerState.currentSong?.duration || '0:00');
    updateProgressUI();
});

audioElement.addEventListener('ended', () => {
    if (playerState.repeatMode === 2) {
        audioElement.currentTime = 0;
        audioElement.play();
    } else {
        playNext();
    }
});

audioElement.addEventListener('loadedmetadata', () => {
    playerState.duration = audioElement.duration;
    updateProgressUI();
});

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

    // Invalidate any in-flight fetch from a previous song so it can't hijack playback later
    const token = ++loadToken;

    audioElement.pause();

    playerState.currentSong = song;
    if (queue) {
        playerState.queue = [...queue];
        playerState.originalQueue = [...queue];
        playerState.queueIndex = index;
        if (playerState.isShuffle) shuffleQueue();
    }
    playerState.currentTime = 0;
    playerState.duration = durationToSeconds(song.duration);

    // Decide: IndexedDB upload vs cached Apple Music stream vs live fetch
    if (song.hasAudio) {
        playerState.isPlaying = true;
        playerState.isLoading = false;
        renderPlayerBar();
        updatePlayingHighlight();
        if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();
        loadAndPlayAudio(song, token);
    } else if (song.audioUrl) {
        playerState.isPlaying = true;
        playerState.isLoading = false;
        renderPlayerBar();
        updatePlayingHighlight();
        if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();
        audioElement.src = song.audioUrl;
        audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
        audioElement.load();
        audioElement.play().catch(() => {
            if (token !== loadToken) return;
            playerState.isPlaying = false;
            updateAllPlayButtons();
            showToast(`⚠️ Preview for "${song.title}" could not start yet.`, 'warning');
        });
    } else {
        // No cached preview yet — show loading state (never a fake fallback sound)
        // and fetch the real track. UI only flips to "playing" once real audio is ready.
        playerState.isPlaying = false;
        playerState.isLoading = true;
        renderPlayerBar();
        updatePlayingHighlight();
        if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();
        showToast(`🎵 Loading "${song.title}"...`, 'info');
        fetchAndPlayAppleMusic(song, token);
    }

    // Warm up the next song in the queue in the background so ⏭ / auto-advance is instant
    // instead of showing a loading spinner while we fetch its preview URL on demand.
    preloadNextTrack();
}

// Resolve & cache the next queued track's audio ahead of time (audio URL + album art),
// then prime the browser's media cache with the actual preview bytes. Fully best-effort:
// any failure is silent and never affects the currently playing song.
async function preloadNextTrack() {
    const q = playerState.queue;
    if (!q || q.length === 0) return;

    let nextIdx = playerState.queueIndex + 1;
    if (nextIdx >= q.length) {
        if (playerState.repeatMode >= 1) nextIdx = 0;
        else return;
    }

    const next = q[nextIdx];
    // Already playable (uploaded file or a resolved preview) — nothing to warm up.
    if (!next || next.hasAudio || next.audioUrl) {
        if (next && next.audioUrl) { try { new Audio().src = next.audioUrl; } catch (e) {} }
        return;
    }
    if (typeof fetchAppleMusicTrack !== 'function') return;

    try {
        const data = await fetchAppleMusicTrack(next.title, next.artist);
        if (!data || !data.audioUrl) return;

        next.audioUrl = data.audioUrl;
        if (data.cover) next.cover = data.cover;
        if (data.album) next.album = data.album;
        if (data.duration) next.duration = data.duration;
        next.appleMusicVerified = true;

        // Persist so this resolution survives navigation and future sessions.
        let songs = DB.get('songs') || [];
        const idx = songs.findIndex(s => s.id === next.id);
        if (idx >= 0) { songs[idx] = next; DB.set('songs', songs); }

        // Prime the actual preview bytes so playback starts immediately when it's this song's turn.
        try { const a = new Audio(); a.preload = 'auto'; a.src = next.audioUrl; } catch (e) {}
    } catch (e) {}
}

async function fetchAndPlayAppleMusic(song, token) {
    const finishLoading = () => {
        if (token !== loadToken) return false;
        playerState.isLoading = false;
        return true;
    };

    if (typeof fetchAppleMusicTrack !== 'function') {
        if (finishLoading()) {
            updateAllPlayButtons();
            showToast(`⚠️ Preview for "${song.title}" is not available right now.`, 'warning');
        }
        return;
    }

    try {
        const realData = await fetchAppleMusicTrack(song.title, song.artist);

        // The user moved on to a different song while this was in flight — drop the result.
        if (token !== loadToken) return;

        if (realData && realData.audioUrl) {
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

            playerState.isLoading = false;
            playerState.isPlaying = true;
            renderPlayerBar();
            if (typeof updateAllPlayButtons === 'function') updateAllPlayButtons();

            audioElement.src = song.audioUrl;
            audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
            audioElement.load();
            await audioElement.play();
            return;
        }
    } catch(e) {
        console.warn('Apple Music live fetch error:', e);
    }

    if (finishLoading()) {
        playerState.isPlaying = false;
        updateAllPlayButtons();
        showToast(`⚠️ Preview for "${song.title}" is not available right now.`, 'warning');
    }
}

function togglePlay() {
    if (!playerState.currentSong || playerState.isLoading) return;
    playerState.isPlaying = !playerState.isPlaying;

    const btn = document.getElementById('mainPlayBtn');
    if (btn) btn.innerHTML = playerState.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

    if (playerState.isPlaying) audioElement.play();
    else audioElement.pause();

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
        audioElement.currentTime = 0;
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
    if (!playerState.currentSong || playerState.isLoading) return;
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * playerState.duration;
    playerState.currentTime = newTime;
    audioElement.currentTime = newTime;
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
    updateVolumeIcon();
}

function toggleMute() {
    playerState.isMuted = !playerState.isMuted;
    const vol = playerState.isMuted ? 0 : playerState.volume;
    audioElement.volume = vol;
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
            <div class="player-cover"><img src="${song.cover || getCover(0)}" alt="" onerror="this.onerror=null;this.src='${getCover(0)}';"></div>
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
                <button class="play-pause-btn" id="mainPlayBtn" onclick="togglePlay()" ${playerState.isLoading ? 'disabled' : ''}>
                    <i class="fas ${playerState.isLoading ? 'fa-spinner fa-spin' : playerState.isPlaying ? 'fa-pause' : 'fa-play'}"></i>
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
async function loadAndPlayAudio(song, token) {
    try {
        const audioRecord = await getAudioFile(song.id);
        if (token !== loadToken) return;
        if (audioRecord && audioRecord.data) {
            const blob = new Blob([audioRecord.data], { type: audioRecord.type || 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            audioElement.src = url;
            audioElement.volume = playerState.isMuted ? 0 : playerState.volume;
            await audioElement.play();
            console.log('▶️ Playing:', song.title);
        } else if (token === loadToken) {
            playerState.isPlaying = false;
            updateAllPlayButtons();
            showToast(`⚠️ Audio file for "${song.title}" is not available yet.`, 'warning');
        }
    } catch (e) {
        console.warn('Audio load failed:', e.message);
        if (token !== loadToken) return;
        playerState.isPlaying = false;
        updateAllPlayButtons();
        showToast(`⚠️ Audio file for "${song.title}" could not be loaded.`, 'warning');
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
