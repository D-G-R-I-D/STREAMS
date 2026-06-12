/**
 * STREAMS — View Renderers
 * All page views: Home, Browse, Search, Library, Playlists, etc.
 */

let currentView = 'home';

function navigateTo(view, data) {
    currentView = view;
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navMap = { home: 0, browse: 1, search: 2, library: 3, playlists: 4, favorites: 5, uploads: 6 };
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
        default: renderHome(el, songs);
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
                    <div class="artist-avatar"><img src="${getArtistImg(i)}" alt="${a.name}" loading="lazy"></div>
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
            ${recentSongs.map((s, i) => musicCard(s, recentSongs, i)).join('')}
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
    updatePlayingHighlight();
}

// ========== BROWSE ==========
function renderBrowse(el, songs) {
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Browse All Artists</h2>
        </div>
        <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
            ${defaultArtists.map((a, i) => `
                <div class="music-card" onclick="navigateTo('artist',{name:'${escapeStr(a.name)}',genre:'${escapeStr(a.genre)}'})">
                    <div class="card-cover">
                        <img src="${getArtistImg(i)}" alt="${a.name}" loading="lazy">
                    </div>
                    <div class="card-title">${a.name}</div>
                    <div class="card-subtitle">${a.genre}</div>
                </div>
            `).join('')}
        </div>

        <div class="section-header" style="margin-top:32px;">
            <h2 class="section-title">All Songs</h2>
        </div>
        ${songList(songs.slice(0, 50))}
    `;
    updatePlayingHighlight();
}

// ========== SEARCH ==========
function renderSearch(el, songs, data) {
    const query = data?.query || '';
    const q = query.toLowerCase();
    const results = songs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q)
    );

    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Search Results ${query ? `for "${escapeHtml(query)}"` : ''}</h2>
            <span style="color:var(--text-muted);font-size:13px;">${results.length} results</span>
        </div>
        ${results.length > 0 ? `
            <div class="cards-grid" style="margin-bottom:24px;">
                ${results.slice(0, 8).map((s, i) => musicCard(s, results, i)).join('')}
            </div>
            ${songList(results)}
        ` : `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No results found. Try a different search.</p>
            </div>
        `}
    `;
    updatePlayingHighlight();
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
        <div id="libraryList">
            ${songList(songs)}
        </div>
    `;
    updatePlayingHighlight();
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
    const list = document.getElementById('libraryList');
    if (list) list.innerHTML = songList(songs);
    updatePlayingHighlight();
}

// ========== PLAYLISTS ==========
function renderPlaylists(el) {
    const playlists = getPlaylists();
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Your Playlists</h2>
            <button class="section-link" onclick="openCreatePlaylistModal()">
                <i class="fas fa-plus"></i> New Playlist
            </button>
        </div>
        ${playlists.length === 0 ? `
            <div class="empty-state">
                <i class="fas fa-list"></i>
                <p>No playlists yet</p>
                <button class="auth-btn" style="max-width:200px;margin:0 auto;" onclick="openCreatePlaylistModal()">Create Playlist</button>
            </div>
        ` : playlists.map(pl => `
            <div class="playlist-card">
                <div class="playlist-cover-art" onclick="navigateTo('playlistDetail',{playlistId:'${pl.id}'})"><i class="fas fa-music"></i></div>
                <div class="playlist-info" onclick="navigateTo('playlistDetail',{playlistId:'${pl.id}'})">
                    <div class="playlist-name">${pl.name}</div>
                    <div class="playlist-meta">${pl.songs.length} songs${pl.description ? ' • ' + pl.description : ''}</div>
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

    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:32px;flex-wrap:wrap;">
            <div class="playlist-cover-art" style="width:120px;height:120px;font-size:48px;border-radius:var(--radius-lg);">
                <i class="fas fa-music"></i>
            </div>
            <div>
                <div style="font-size:12px;font-weight:600;color:var(--accent-primary);letter-spacing:1px;text-transform:uppercase;">PLAYLIST</div>
                <h2 style="font-size:32px;font-weight:800;color:var(--text-white);margin:4px 0;">${pl.name}</h2>
                <p style="color:var(--text-muted);font-size:14px;">${pl.description || 'No description'} • ${songs.length} songs</p>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="auth-btn" style="width:auto;padding:10px 24px;font-size:13px;" onclick="playSong(getAllSongs().find(s=>s.id==='${songs[0]?.id}'), ${JSON.stringify(songs.map(s=>s.id)).replace(/"/g,"'")}.map(id=>getAllSongs().find(s=>s.id===id)).filter(Boolean), 0)">
                        <i class="fas fa-play"></i> Play All
                    </button>
                    <button class="playlist-action-btn" style="padding:10px 16px;" onclick="editPlaylist('${pl.id}')"><i class="fas fa-pen"></i> Edit</button>
                </div>
            </div>
        </div>
        ${songs.length > 0 ? songList(songs, pl.id) : `
            <div style="text-align:center;padding:40px;color:var(--text-muted);">
                <p>No songs in this playlist yet. Browse songs and add them!</p>
            </div>
        `}
    `;
    updatePlayingHighlight();
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
            <div class="cards-grid" style="margin-bottom:24px;">
                ${faves.slice(0, 6).map((s, i) => musicCard(s, faves, i)).join('')}
            </div>
            ${songList(faves)}
        ` : `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>No favorites yet. Click the heart icon on songs you love!</p>
            </div>
        `}
    `;
    updatePlayingHighlight();
}

// ========== UPLOADS ==========
function renderUploads(el) {
    const mySongs = getUserSongs();
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title"><i class="fas fa-cloud-arrow-up" style="color:var(--accent-primary);"></i> My Uploads</h2>
            <button class="section-link" onclick="openUploadModal()">
                <i class="fas fa-plus"></i> Upload New
            </button>
        </div>
        ${mySongs.length > 0 ? `
            ${mySongs.map(s => `
                <div class="playlist-card" style="cursor:default;">
                    <div style="width:52px;height:52px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg-input);">
                        <img src="${s.cover}" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                    </div>
                    <div class="playlist-info" style="cursor:pointer;" onclick="playSong(getAllSongs().find(x=>x.id==='${s.id}'), getUserSongs(), ${mySongs.indexOf(s)})">
                        <div class="playlist-name">${s.title}</div>
                        <div class="playlist-meta">${s.artist} • ${s.duration}</div>
                    </div>
                    <div class="playlist-actions-bar">
                        <button class="playlist-action-btn" onclick="editSong('${s.id}')"><i class="fas fa-pen"></i> Edit</button>
                        <button class="playlist-action-btn delete" onclick="deleteSong('${s.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `).join('')}
        ` : `
            <div class="empty-state">
                <i class="fas fa-cloud-arrow-up"></i>
                <p>You haven't uploaded any songs yet</p>
                <button class="auth-btn" style="max-width:200px;margin:0 auto;" onclick="openUploadModal()">Upload Your First Song</button>
            </div>
        `}
    `;
}

// ========== ARTIST PAGE ==========
function renderArtistPage(el, songs, data) {
    const artistName = data?.name || '';
    const genre = data?.genre || '';
    const artistSongs = songs.filter(s => s.artist === artistName);
    const ai = defaultArtists.findIndex(a => a.name === artistName);
    const img = ai >= 0 ? getArtistImg(ai) : getCover(0);
    const totalPlays = artistSongs.reduce((acc, s) => acc + (s.plays || 0), 0);

    el.innerHTML = `
        <div class="artist-hero">
            <div class="artist-hero-avatar"><img src="${img}" alt="${artistName}" loading="lazy"></div>
            <div class="artist-hero-info">
                <div style="font-size:11px;font-weight:700;color:var(--accent-primary);letter-spacing:1.5px;text-transform:uppercase;">ARTIST</div>
                <h1>${artistName}</h1>
                <div class="artist-meta"><span class="genre-badge">${genre}</span> • ${formatNumber(totalPlays)} plays • ${artistSongs.length} songs</div>
                <div class="artist-hero-actions">
                    <button class="auth-btn" style="width:auto;padding:12px 28px;font-size:14px;" onclick="playArtist('${escapeStr(artistName)}')">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button class="playlist-action-btn" style="padding:12px 20px;font-size:13px;" onclick="shuffleArtist('${escapeStr(artistName)}')">
                        <i class="fas fa-shuffle"></i> Shuffle
                    </button>
                </div>
            </div>
        </div>

        <div class="section-header">
            <h2 class="section-title">Popular Songs</h2>
        </div>
        ${songList(artistSongs)}
    `;
    updatePlayingHighlight();
}

function playArtist(name) {
    const songs = getAllSongs().filter(s => s.artist === name);
    if (songs.length) playSong(songs[0], songs, 0);
}

function shuffleArtist(name) {
    const songs = getAllSongs().filter(s => s.artist === name);
    if (songs.length) {
        playerState.isShuffle = true;
        const btn = document.getElementById('shuffleBtn');
        if (btn) btn.classList.add('active');
        playSong(songs[0], songs, 0);
    }
}

// ========== QUEUE ==========
function renderQueue(el) {
    const q = playerState.queue;
    const idx = playerState.queueIndex;
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Queue</h2>
            <span style="color:var(--text-muted);font-size:13px;">${q.length} songs</span>
        </div>
        ${playerState.currentSong ? `
            <div style="margin-bottom:24px;">
                <div style="font-size:12px;font-weight:600;color:var(--accent-primary);margin-bottom:8px;letter-spacing:1px;">NOW PLAYING</div>
                ${songList([playerState.currentSong])}
            </div>
        ` : ''}
        ${q.length > idx + 1 ? `
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;letter-spacing:1px;">NEXT UP</div>
            ${songList(q.slice(idx + 1))}
        ` : ''}
    `;
    updatePlayingHighlight();
}

// ========== SEARCH HANDLER ==========
function handleSearch(query) {
    if (query.trim().length > 0) {
        navigateTo('search', { query: query.trim() });
    }
}

// ========== REUSABLE COMPONENTS ==========
function musicCard(song, queue, index) {
    const qIds = JSON.stringify(queue.map(q => q.id));
    return `
        <div class="music-card" onclick="playSong(getAllSongs().find(s=>s.id==='${song.id}'), getAllSongs().filter(s=>${qIds}.includes(s.id)), ${index})">
            <div class="card-cover">
                <img src="${song.cover || getCover(index)}" alt="${song.title}" loading="lazy">
                <button class="card-play-btn" onclick="event.stopPropagation();playSong(getAllSongs().find(s=>s.id==='${song.id}'), getAllSongs().filter(s=>${qIds}.includes(s.id)), ${index})">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="card-title">${song.title}</div>
            <div class="card-subtitle">${song.artist}</div>
        </div>
    `;
}

function songList(songs, playlistId) {
    if (!songs || songs.length === 0) return '<p style="color:var(--text-muted);padding:20px;text-align:center;">No songs to display</p>';

    let html = `
        <div class="song-list">
            <div class="song-list-header">
                <span>#</span>
                <span></span>
                <span>TITLE</span>
                <span>ALBUM</span>
                <span style="text-align:right;"><i class="far fa-clock"></i></span>
                <span></span>
            </div>
    `;

    songs.forEach((song, i) => {
        const isPlaying = playerState.currentSong?.id === song.id;
        html += `
            <div class="song-row ${isPlaying ? 'playing' : ''}" data-song-id="${song.id}"
                 onclick="playSong(getAllSongs().find(s=>s.id==='${song.id}'), ${JSON.stringify(songs.map(s=>s.id)).replace(/"/g,"'")}.map(id=>getAllSongs().find(s=>s.id===id)).filter(Boolean), ${i})">
                <div>
                    <span class="song-num">${isPlaying ? '<div class="eq-bars' + (playerState.isPlaying ? '' : ' paused') + '"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>' : (i + 1)}</span>
                    <span class="song-play-icon"><i class="fas fa-play"></i></span>
                </div>
                <div class="song-thumb"><img src="${song.cover || getCover(i)}" alt="" loading="lazy"></div>
                <div>
                    <div class="song-title-text">${song.title}</div>
                    <div class="song-artist-text">${song.artist}</div>
                </div>
                <div class="song-album-text">${song.album || '—'}</div>
                <div class="song-duration">${song.duration}</div>
                <div class="song-actions">
                    <button class="song-action-btn" onclick="event.stopPropagation();toggleFavorite('${song.id}');renderView(currentView)" title="Favorite">
                        <i class="${isFavorite(song.id) ? 'fas' : 'far'} fa-heart" style="${isFavorite(song.id) ? 'color:var(--accent-pink)' : ''}"></i>
                    </button>
                    <button class="song-action-btn" onclick="event.stopPropagation();openAddToPlaylistModal('${song.id}')" title="Add to playlist">
                        <i class="fas fa-plus"></i>
                    </button>
                    ${playlistId ? `<button class="song-action-btn" onclick="event.stopPropagation();removeSongFromPlaylist('${song.id}','${playlistId}')" title="Remove"><i class="fas fa-xmark"></i></button>` : ''}
                    ${song.uploadedBy === currentUser?.id ? `
                        <button class="song-action-btn" onclick="event.stopPropagation();editSong('${song.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="song-action-btn" onclick="event.stopPropagation();deleteSong('${song.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// ========== STRING HELPERS ==========
function escapeStr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
