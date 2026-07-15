/**
 * STREAMS — View Renderers
 * All page views: Home, Browse, Search, Library, Playlists, etc.
 */

let currentView = 'home';
let currentViewData = null;

// Global queue registry — stores song ID arrays so we don't inline them
const _queues = {};
let _queueCounter = 0;

function registerQueue(songIds) {
    const key = 'q' + (++_queueCounter);
    _queues[key] = songIds;
    return key;
}

function getRegisteredQueue(key) {
    return (_queues[key] || []).map(id => findSongById(id)).filter(Boolean);
}

// ========== NAVIGATION ==========
function navigateTo(view, data) {
    currentView = view;
    currentViewData = data;
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = { home: 0, browse: 1, search: 2, library: 3, playlists: 4, favorites: 5, uploads: 6, settings: 7 };
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[view] !== undefined && navItems[navMap[view]]) {
        navItems[navMap[view]].classList.add('active');
    }
    renderView(view, data);
    document.getElementById('mainContent').scrollTop = 0;
}

function renderView(view, data) {
    const el = document.getElementById('pageContent');
    const songs = getAllSongs();
    switch (view) {
        case 'home': renderHome(el, songs); break;
        case 'browse': renderBrowse(el, songs); break;
        case 'search': renderSearch(el, songs, data); break;
        case 'library': renderLibrary(el, songs); break;
        case 'playlists': renderPlaylists(el); break;
        case 'playlistDetail': renderPlaylistDetail(el, data); break;
        case 'favorites': renderFavorites(el); break;
        case 'uploads': renderUploads(el); break;
        case 'artist': renderArtistPage(el, songs, data); break;
        case 'queue': renderQueue(el); break;
        case 'settings': renderSettings(el); break;
        default: renderHome(el, songs);
    }
    // Jump whatever just landed on screen to the front of the enrichment queue so the
    // first song the user is likely to click already has real audio + art ready.
    if (typeof prioritizeVisibleEnrichment === 'function') {
        setTimeout(prioritizeVisibleEnrichment, 0);
    }
}

// ========== HOME ==========
function renderHome(el, songs) {
    const greeting = getGreeting();
    const recentSongs = songs.slice(0, 8);
    const topSongs = [...songs].sort((a,b) => (b.plays||0) - (a.plays||0)).slice(0, 10);
    const genres = [...new Set(songs.map(s => s.genre?.split('/')[0]?.trim()).filter(Boolean))].slice(0, 8);

    el.innerHTML = `
        <div class="hero-banner">
            <h1>${greeting}, ${currentUser?.name?.split(' ')[0] || 'there'}! 🎧</h1>
            <p>Dive into millions of songs. Your personal music universe awaits.</p>
        </div>
        <div class="section-header">
            <h2 class="section-title">Popular Artists</h2>
            <button class="section-link" onclick="navigateTo('browse')">See All</button>
        </div>
        <div class="artists-row">
            ${defaultArtists.map((a, i) => `
                <div class="artist-card" onclick="navigateTo('artist',{name:'${escapeStr(a.name)}',genre:'${escapeStr(a.genre)}'})">
                    <div class="artist-avatar"><img src="${getArtistImg(i)}" alt="${a.name}" loading="lazy" onerror="this.onerror=null;this.src='${getCover(0)}';"></div>
                    <div class="artist-name-label">${a.name}</div>
                    <div class="artist-genre-label">${a.genre.split('/')[0].trim()}</div>
                </div>
            `).join('')}
        </div>
        <div class="section-header">
            <h2 class="section-title">Made For You</h2>
            <button class="section-link" onclick="navigateTo('library')">See All</button>
        </div>
        <div class="cards-grid">
            ${buildCardGrid(recentSongs)}
        </div>
        <div class="section-header">
            <h2 class="section-title">🔥 Top Hits</h2>
        </div>
        ${songList(topSongs)}
        <div class="section-header" style="margin-top:32px;">
            <h2 class="section-title">Browse by Genre</h2>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:32px;">
            ${genres.map(g => `<span class="genre-badge" style="cursor:pointer;padding:8px 20px;font-size:13px;" onclick="navigateTo('search',{query:'${escapeStr(g)}'})">${g}</span>`).join('')}
        </div>
    `;
    updateAllPlayButtons();
}

// ========== BROWSE ==========
function renderBrowse(el, songs) {
    el.innerHTML = `
        <div class="section-header"><h2 class="section-title">Browse All Artists</h2></div>
        <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
            ${defaultArtists.map((a, i) => `
                <div class="music-card" onclick="navigateTo('artist',{name:'${escapeStr(a.name)}',genre:'${escapeStr(a.genre)}'})">
                    <div class="card-cover"><img src="${getArtistImg(i)}" alt="${a.name}" loading="lazy" onerror="this.onerror=null;this.src='${getCover(0)}';"></div>
                    <div class="card-title">${a.name}</div>
                    <div class="card-subtitle">${a.genre}</div>
                </div>
            `).join('')}
        </div>
        <div class="section-header" style="margin-top:32px;"><h2 class="section-title">All Songs</h2></div>
        ${songList(songs.slice(0, 50))}
    `;
    updateAllPlayButtons();
}

// ========== SEARCH ==========
// Live catalog results for the query currently on screen. renderSearch() is re-run on
// every background enrichment pass, so results are kept here rather than refetched.
const catalogSearch = { query: '', status: 'idle', results: [], token: 0 };
let _catalogSearchTimer = null;

function songMatchKey(song) {
    return normalizeAppleText(song.title) + '|' + normalizeAppleText(song.artist);
}

function scheduleCatalogSearch(query) {
    clearTimeout(_catalogSearchTimer);
    const token = ++catalogSearch.token;
    catalogSearch.query = query.toLowerCase();
    catalogSearch.status = 'loading';
    catalogSearch.results = [];
    // Debounced: handleSearch fires on every keystroke, and we don't want a
    // network request per character.
    _catalogSearchTimer = setTimeout(() => runCatalogSearch(query, token), 350);
}

async function runCatalogSearch(query, token) {
    let results = [];
    try {
        results = await searchMusicCatalog(query, 25);
    } catch (e) {
        results = [];
    }

    // The user kept typing while this was in flight — drop the stale result.
    if (token !== catalogSearch.token) return;

    rememberCatalogSongs(results);
    catalogSearch.results = results;
    catalogSearch.status = results.length ? 'done' : 'empty';

    if (currentView === 'search') renderView('search', currentViewData);
}

function renderSearch(el, songs, data) {
    const query = data?.query || '';
    const q = query.toLowerCase().trim();
    const results = q ? songs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q)
    ) : [];

    if (!q) {
        catalogSearch.query = '';
        catalogSearch.status = 'idle';
        catalogSearch.results = [];
    } else if (catalogSearch.query !== q) {
        scheduleCatalogSearch(query);
    }

    // Don't show a catalog result we already have in the library above it.
    const localKeys = new Set(results.map(songMatchKey));
    const catalogResults = catalogSearch.query === q
        ? catalogSearch.results.filter(s => !localKeys.has(songMatchKey(s)))
        : [];
    const isLoading = catalogSearch.query === q && catalogSearch.status === 'loading';

    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Search Results ${query ? 'for "' + escapeHtml(query) + '"' : ''}</h2>
            <span style="color:var(--text-muted);font-size:13px;">${results.length + catalogResults.length} results</span>
        </div>
        ${results.length > 0 ? `
            <div class="cards-grid" style="margin-bottom:24px;">
                ${buildCardGrid(results.slice(0, 8))}
            </div>
            ${songList(results)}
        ` : ''}
        ${isLoading ? `
            <div style="display:flex;align-items:center;gap:10px;color:var(--text-muted);font-size:13px;padding:20px;">
                <i class="fas fa-spinner fa-spin"></i> Searching millions more songs...
            </div>
        ` : ''}
        ${catalogResults.length > 0 ? `
            <div class="section-header" style="margin-top:${results.length ? '32px' : '0'};">
                <h2 class="section-title">More From Apple Music</h2>
                <span style="color:var(--text-muted);font-size:13px;">${catalogResults.length} songs</span>
            </div>
            ${songList(catalogResults)}
        ` : ''}
        ${!results.length && !catalogResults.length && !isLoading ? `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>${q ? 'No results found. Try a different search.' : 'Type to search songs, artists, albums...'}</p>
            </div>
        ` : ''}
    `;
    updateAllPlayButtons();
}

// ========== LIBRARY ==========
function renderLibrary(el, songs) {
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">All Songs</h2>
            <span style="color:var(--text-muted);font-size:13px;">${songs.length} songs</span>
        </div>
        <div class="tab-bar">
            <button class="tab-item active" onclick="sortLibrary('default', this)">Default</button>
            <button class="tab-item" onclick="sortLibrary('title', this)">By Title</button>
            <button class="tab-item" onclick="sortLibrary('artist', this)">By Artist</button>
            <button class="tab-item" onclick="sortLibrary('recent', this)">Recent</button>
        </div>
        <div id="libraryList">${songList(songs)}</div>
    `;
    updateAllPlayButtons();
}

function sortLibrary(type, btn) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    let songs = getAllSongs();
    switch(type) {
        case 'title': songs.sort((a,b) => a.title.localeCompare(b.title)); break;
        case 'artist': songs.sort((a,b) => a.artist.localeCompare(b.artist)); break;
        case 'recent': songs.sort((a,b) => (b.createdAt||0) - (a.createdAt||0)); break;
    }
    document.getElementById('libraryList').innerHTML = songList(songs);
    updateAllPlayButtons();
}

// ========== PLAYLISTS ==========
function renderPlaylists(el) {
    const playlists = getPlaylists();
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Your Playlists</h2>
            <button class="section-link" onclick="openCreatePlaylistModal()"><i class="fas fa-plus"></i> New Playlist</button>
        </div>
        ${playlists.length === 0 ? `
            <div class="empty-state">
                <i class="fas fa-list"></i><p>No playlists yet</p>
                <button class="auth-btn" style="max-width:200px;margin:0 auto;" onclick="openCreatePlaylistModal()">Create Playlist</button>
            </div>
        ` : playlists.map(pl => `
            <div class="playlist-card">
                <div class="playlist-cover-art" onclick="navigateTo('playlistDetail',{playlistId:'${pl.id}'})"><i class="fas fa-music"></i></div>
                <div class="playlist-info" onclick="navigateTo('playlistDetail',{playlistId:'${pl.id}'})">
                    <div class="playlist-name">${pl.name}</div>
                    <div class="playlist-meta">${pl.songs.length} songs${pl.description ? ' · ' + pl.description : ''}</div>
                </div>
                <div class="playlist-actions-bar">
                    <button class="playlist-action-btn" onclick="editPlaylist('${pl.id}')"><i class="fas fa-pen"></i></button>
                    <button class="playlist-action-btn delete" onclick="deletePlaylist('${pl.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('')}
    `;
}

// ========== PLAYLIST DETAIL ==========
function renderPlaylistDetail(el, data) {
    const playlists = getPlaylists();
    const pl = playlists.find(p => p.id === data?.playlistId);
    if (!pl) { navigateTo('playlists'); return; }
    const allSongs = getAllSongs();
    const songs = pl.songs.map(sid => allSongs.find(s => s.id === sid)).filter(Boolean);
    const isPlayingPl = songs.some(s => s.id === playerState.currentSong?.id);
    const isPlaying = isPlayingPl && playerState.isPlaying;

    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:32px;flex-wrap:wrap;">
            <div class="playlist-cover-art" style="width:120px;height:120px;font-size:48px;border-radius:var(--radius-lg);"><i class="fas fa-music"></i></div>
            <div>
                <div style="font-size:12px;font-weight:600;color:var(--accent-primary);letter-spacing:1px;text-transform:uppercase;">PLAYLIST</div>
                <h2 style="font-size:32px;font-weight:800;color:var(--text-primary);margin:4px 0;">${pl.name}</h2>
                <p style="color:var(--text-muted);font-size:14px;">${pl.description || 'No description'} · ${songs.length} songs</p>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    ${songs.length > 0 ? `
                        <button class="auth-btn playlist-play-btn" data-playlist="${pl.id}" style="width:auto;padding:10px 24px;font-size:13px;" onclick="togglePlaylistPlay('${pl.id}')">
                            <i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isPlaying ? 'Pause' : 'Play All'}
                        </button>
                        <button class="playlist-action-btn" style="padding:10px 16px;" onclick="shufflePlaylist('${pl.id}')"><i class="fas fa-shuffle"></i> Shuffle</button>
                    ` : ''}
                    <button class="playlist-action-btn" style="padding:10px 16px;" onclick="editPlaylist('${pl.id}')"><i class="fas fa-pen"></i> Edit</button>
                </div>
            </div>
        </div>
        ${songs.length > 0 ? songList(songs, pl.id) : '<div style="text-align:center;padding:40px;color:var(--text-muted);"><p>No songs yet. Browse and add some!</p></div>'}
    `;
    updateAllPlayButtons();
}

function togglePlaylistPlay(playlistId) {
    const pl = getPlaylists().find(p => p.id === playlistId);
    if (!pl) return;
    const songs = pl.songs.map(sid => getAllSongs().find(s => s.id === sid)).filter(Boolean);
    if (songs.some(s => s.id === playerState.currentSong?.id)) {
        togglePlay();
        updateAllPlayButtons();
    } else if (songs.length) {
        playSong(songs[0], songs, 0);
    }
}

function shufflePlaylist(playlistId) {
    const pl = getPlaylists().find(p => p.id === playlistId);
    if (!pl) return;
    const songs = pl.songs.map(sid => getAllSongs().find(s => s.id === sid)).filter(Boolean);
    if (songs.length) {
        playerState.isShuffle = true;
        playSong(songs[0], songs, 0);
        showToast('Shuffle enabled', 'info');
    }
}

// ========== FAVORITES ==========
function renderFavorites(el) {
    const faves = getFavorites();
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title"><i class="fas fa-heart" style="color:var(--accent-pink);"></i> Your Favorites</h2>
            <span style="color:var(--text-muted);font-size:13px;">${faves.length} songs</span>
        </div>
        ${faves.length > 0 ? `
            <div class="cards-grid" style="margin-bottom:24px;">${buildCardGrid(faves.slice(0, 6))}</div>
            ${songList(faves)}
        ` : `<div class="empty-state"><i class="fas fa-heart"></i><p>No favorites yet. Click the heart on songs you love!</p></div>`}
    `;
    updateAllPlayButtons();
}

// ========== UPLOADS ==========
function renderUploads(el) {
    const mySongs = getUserSongs();
    const qKey = registerQueue(mySongs.map(s => s.id));
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title"><i class="fas fa-cloud-arrow-up" style="color:var(--accent-primary);"></i> My Uploads</h2>
            <button class="section-link" onclick="openUploadModal()"><i class="fas fa-plus"></i> Upload New</button>
        </div>
        ${mySongs.length > 0 ? mySongs.map((s, idx) => {
            const isCur = playerState.currentSong?.id === s.id;
            const isP = isCur && playerState.isPlaying;
            return `
            <div class="playlist-card upload-song-card ${isCur ? 'playing' : ''}" data-song-id="${s.id}">
                <div class="upload-song-cover" onclick="handleQueuePlay('${s.id}','${qKey}',${idx})">
                    <img src="${s.cover}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${getCover(0)}';">
                    <div class="upload-song-play-overlay"><i class="fas ${isP ? 'fa-pause' : 'fa-play'}"></i></div>
                </div>
                <div class="playlist-info" style="cursor:pointer;" onclick="handleQueuePlay('${s.id}','${qKey}',${idx})">
                    <div class="playlist-name">${s.title}</div>
                    <div class="playlist-meta">${s.artist} · ${s.duration}</div>
                </div>
                <div class="playlist-actions-bar">
                    <button class="playlist-action-btn" onclick="event.stopPropagation();editSong('${s.id}')"><i class="fas fa-pen"></i> Edit</button>
                    <button class="playlist-action-btn delete" onclick="event.stopPropagation();deleteSong('${s.id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>`;
        }).join('') : `
            <div class="empty-state"><i class="fas fa-cloud-arrow-up"></i><p>You haven't uploaded any songs yet</p>
                <button class="auth-btn" style="max-width:200px;margin:0 auto;" onclick="openUploadModal()">Upload Your First Song</button>
            </div>`}
    `;
    updateAllPlayButtons();
}

// ========== ARTIST PAGE ==========
function renderArtistPage(el, songs, data) {
    const artistName = data?.name || '';
    const genre = data?.genre || '';
    const artistSongs = songs.filter(s => s.artist === artistName);
    const ai = defaultArtists.findIndex(a => a.name === artistName);
    const img = ai >= 0 ? getArtistImg(ai) : getCover(0);
    const totalPlays = artistSongs.reduce((acc, s) => acc + (s.plays || 0), 0);
    const isPlayingArtist = artistSongs.some(s => s.id === playerState.currentSong?.id);
    const isPlaying = isPlayingArtist && playerState.isPlaying;

    el.innerHTML = `
        <div class="artist-hero">
            <div class="artist-hero-avatar"><img src="${img}" alt="${artistName}" loading="lazy" onerror="this.onerror=null;this.src='${getCover(0)}';"></div>
            <div class="artist-hero-info">
                <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1.5px;text-transform:uppercase;">ARTIST</div>
                <h1>${artistName}</h1>
                <div class="artist-meta"><span class="genre-badge">${genre}</span> · ${formatNumber(totalPlays)} plays · ${artistSongs.length} songs</div>
                <div class="artist-hero-actions">
                    <button class="auth-btn artist-play-btn" data-artist="${escapeStr(artistName)}" style="width:auto;padding:12px 28px;font-size:14px;" onclick="toggleArtistPlay('${escapeStr(artistName)}')">
                        <i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button class="playlist-action-btn" style="padding:12px 20px;font-size:13px;" onclick="shuffleArtist('${escapeStr(artistName)}')">
                        <i class="fas fa-shuffle"></i> Shuffle
                    </button>
                </div>
            </div>
        </div>
        <div class="section-header"><h2 class="section-title">Popular Songs</h2></div>
        ${songList(artistSongs)}
    `;
    updateAllPlayButtons();
}

function toggleArtistPlay(name) {
    const songs = getAllSongs().filter(s => s.artist === name);
    if (songs.some(s => s.id === playerState.currentSong?.id)) {
        togglePlay();
        updateAllPlayButtons();
    } else if (songs.length) {
        playSong(songs[0], songs, 0);
    }
}

function playArtist(name) {
    const songs = getAllSongs().filter(s => s.artist === name);
    if (songs.length) playSong(songs[0], songs, 0);
}

function shuffleArtist(name) {
    const songs = getAllSongs().filter(s => s.artist === name);
    if (songs.length) {
        playerState.isShuffle = true;
        playSong(songs[0], songs, 0);
        showToast('Shuffle enabled', 'info');
    }
}

// ========== QUEUE ==========
function renderQueue(el) {
    const q = playerState.queue;
    const idx = playerState.queueIndex;
    el.innerHTML = `
        <div class="section-header"><h2 class="section-title">Queue</h2>
            <span style="color:var(--text-muted);font-size:13px;">${q.length} songs</span>
        </div>
        ${playerState.currentSong ? `
            <div style="margin-bottom:24px;">
                <div style="font-size:12px;font-weight:600;color:var(--accent-primary);margin-bottom:8px;letter-spacing:1px;">NOW PLAYING</div>
                ${songList([playerState.currentSong])}
            </div>` : ''}
        ${q.length > idx + 1 ? `
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;letter-spacing:1px;">NEXT UP</div>
            ${songList(q.slice(idx + 1))}` : ''}
    `;
    updateAllPlayButtons();
}

// ========== SEARCH HANDLER ==========
function handleSearch(query) {
    const trimmed = query.trim();
    if (trimmed.length > 0) navigateTo('search', { query: trimmed });
    else if (currentView === 'search') navigateTo('search', { query: '' });
}

// ==========================================================
//  REUSABLE COMPONENTS — Cards, Song Lists, Play Handlers
// ==========================================================

// Build a grid of cards from songs array
function buildCardGrid(songs) {
    const qKey = registerQueue(songs.map(s => s.id));
    return songs.map((song, i) => {
        const isCur = playerState.currentSong?.id === song.id;
        const isP = isCur && playerState.isPlaying;
        return `
        <div class="music-card ${isCur ? 'playing' : ''}" data-song-id="${song.id}" onclick="handleQueuePlay('${song.id}','${qKey}',${i})">
            <div class="card-cover">
                <img src="${song.cover || getCover(i)}" alt="${song.title}" loading="lazy" onerror="this.onerror=null;this.src='${getCover(i)}';">
                <button class="card-play-btn ${isCur ? 'active' : ''}" onclick="event.stopPropagation();handleQueuePlay('${song.id}','${qKey}',${i})">
                    <i class="fas ${isP ? 'fa-pause' : 'fa-play'}"></i>
                </button>
            </div>
            <div class="card-title">${song.title}</div>
            <div class="card-subtitle">${song.artist}</div>
        </div>`;
    }).join('');
}

// Song list table
function songList(songs, playlistId) {
    if (!songs || songs.length === 0) return '<p style="color:var(--text-muted);padding:20px;text-align:center;">No songs to display</p>';

    const qKey = registerQueue(songs.map(s => s.id));

    let html = `<div class="song-list">
        <div class="song-list-header">
            <span>#</span><span></span><span>TITLE</span><span>ALBUM</span>
            <span style="text-align:right;"><i class="far fa-clock"></i></span><span></span>
        </div>`;

    songs.forEach((song, i) => {
        const isCur = playerState.currentSong?.id === song.id;
        const isP = isCur && playerState.isPlaying;

        html += `
        <div class="song-row ${isCur ? 'playing' : ''}" data-song-id="${song.id}" onclick="handleQueuePlay('${song.id}','${qKey}',${i})">
            <div class="song-num-col">
                ${isCur ? `<div class="eq-bars ${isP ? '' : 'paused'}"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>` : `<span class="song-num">${i + 1}</span>`}
                <button class="song-play-btn" onclick="event.stopPropagation();handleQueuePlay('${song.id}','${qKey}',${i})">
                    <i class="fas ${isP ? 'fa-pause' : 'fa-play'}"></i>
                </button>
            </div>
            <div class="song-thumb"><img src="${song.cover || getCover(i)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${getCover(i)}';"></div>
            <div><div class="song-title-text">${song.title}</div><div class="song-artist-text">${song.artist}</div></div>
            <div class="song-album-text">${song.album || '—'}</div>
            <div class="song-duration">${song.duration}</div>
            <div class="song-actions">
                <button class="song-action-btn" onclick="event.stopPropagation();toggleFavorite('${song.id}');renderView(currentView, currentViewData)" title="Favorite">
                    <i class="${isFavorite(song.id) ? 'fas' : 'far'} fa-heart" style="${isFavorite(song.id) ? 'color:var(--accent-pink)' : ''}"></i>
                </button>
                <button class="song-action-btn" onclick="event.stopPropagation();openAddToPlaylistModal('${song.id}')" title="Add to playlist"><i class="fas fa-plus"></i></button>
                ${playlistId ? `<button class="song-action-btn" onclick="event.stopPropagation();removeSongFromPlaylist('${song.id}','${playlistId}')" title="Remove"><i class="fas fa-xmark"></i></button>` : ''}
                ${song.uploadedBy === currentUser?.id ? `
                    <button class="song-action-btn" onclick="event.stopPropagation();editSong('${song.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="song-action-btn" onclick="event.stopPropagation();deleteSong('${song.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                ` : ''}
            </div>
        </div>`;
    });

    html += '</div>';
    return html;
}

// ==========================================================
//  UNIFIED PLAY HANDLER — used by cards, rows, uploads
// ==========================================================
function handleQueuePlay(songId, queueKey, index) {
    if (playerState.currentSong?.id === songId) {
        togglePlay();
    } else {
        const queue = getRegisteredQueue(queueKey);
        const song = queue[index] || findSongById(songId);
        playSong(song, queue, index);
    }
    updateAllPlayButtons();
}

// ==========================================================
//  UPDATE ALL PLAY BUTTONS — single source of truth
// ==========================================================
function updateAllPlayButtons() {
    const currentId = playerState.currentSong?.id;
    const isPlaying = playerState.isPlaying;

    // Music cards
    document.querySelectorAll('.music-card[data-song-id]').forEach(card => {
        const id = card.dataset.songId;
        const isThis = id === currentId;
        card.classList.toggle('playing', isThis);
        const btn = card.querySelector('.card-play-btn');
        if (btn) {
            btn.classList.toggle('active', isThis);
            const icon = btn.querySelector('i');
            if (icon) icon.className = `fas ${isThis && isPlaying ? 'fa-pause' : 'fa-play'}`;
        }
    });

    // Song rows
    document.querySelectorAll('.song-row[data-song-id]').forEach(row => {
        const id = row.dataset.songId;
        const isThis = id === currentId;
        row.classList.toggle('playing', isThis);

        const numCol = row.querySelector('.song-num-col');
        const eqBars = row.querySelector('.eq-bars');
        const songNum = row.querySelector('.song-num');
        const playBtn = row.querySelector('.song-play-btn i');

        if (isThis) {
            // Show eq bars, hide number
            if (songNum) songNum.style.display = 'none';
            if (!eqBars && numCol) {
                // Inject eq bars if they don't exist
                const eq = document.createElement('div');
                eq.className = `eq-bars ${isPlaying ? '' : 'paused'}`;
                eq.innerHTML = '<div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>';
                numCol.insertBefore(eq, numCol.firstChild);
            } else if (eqBars) {
                eqBars.classList.toggle('paused', !isPlaying);
            }
            if (playBtn) playBtn.className = `fas ${isPlaying ? 'fa-pause' : 'fa-play'}`;
        } else {
            // Show number, remove eq bars
            if (songNum) songNum.style.display = '';
            if (eqBars) eqBars.remove();
            if (playBtn) playBtn.className = 'fas fa-play';
        }
    });

    // Upload cards
    document.querySelectorAll('.upload-song-card[data-song-id]').forEach(card => {
        const id = card.dataset.songId;
        const isThis = id === currentId;
        card.classList.toggle('playing', isThis);
        const icon = card.querySelector('.upload-song-play-overlay i');
        if (icon) icon.className = `fas ${isThis && isPlaying ? 'fa-pause' : 'fa-play'}`;
    });

    // Artist play button
    const artistBtn = document.querySelector('.artist-play-btn');
    if (artistBtn) {
        const name = artistBtn.dataset.artist;
        const artistSongs = getAllSongs().filter(s => s.artist === name);
        const active = artistSongs.some(s => s.id === currentId) && isPlaying;
        artistBtn.innerHTML = `<i class="fas ${active ? 'fa-pause' : 'fa-play'}"></i> ${active ? 'Pause' : 'Play'}`;
    }

    // Playlist play button
    const plBtn = document.querySelector('.playlist-play-btn');
    if (plBtn) {
        const pl = getPlaylists().find(p => p.id === plBtn.dataset.playlist);
        if (pl) {
            const plSongs = pl.songs.map(sid => getAllSongs().find(s => s.id === sid)).filter(Boolean);
            const active = plSongs.some(s => s.id === currentId) && isPlaying;
            plBtn.innerHTML = `<i class="fas ${active ? 'fa-pause' : 'fa-play'}"></i> ${active ? 'Pause' : 'Play All'}`;
        }
    }
}

// Legacy compat
function updatePlayingHighlight() { updateAllPlayButtons(); }

// ========== STRING HELPERS ==========
function escapeStr(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
