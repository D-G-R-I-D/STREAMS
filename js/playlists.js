/**
 * STREAMS — Playlist Management
 * CRUD for playlists, add/remove songs, favorites
 */

// ========== FAVORITES ==========
function getFavorites() {
    const favIds = DB.get('favorites_' + currentUser?.id) || [];
    const songs = getAllSongs();
    return songs.filter(s => favIds.includes(s.id));
}

function toggleFavorite(songId) {
    let favIds = DB.get('favorites_' + currentUser?.id) || [];
    if (favIds.includes(songId)) {
        favIds = favIds.filter(id => id !== songId);
        showToast('Removed from favorites', 'info');
    } else {
        // Favorites are stored as bare ids and resolved against the library, so a song
        // that only exists in live catalog results has to be saved before it's referenced.
        saveCatalogSongToLibrary(songId);
        favIds.push(songId);
        showToast('Added to favorites', 'success');
    }
    DB.set('favorites_' + currentUser.id, favIds);
}

function isFavorite(songId) {
    const favIds = DB.get('favorites_' + currentUser?.id) || [];
    return favIds.includes(songId);
}

// ========== PLAYLISTS ==========
function getPlaylists() {
    return DB.get('playlists_' + currentUser?.id) || [];
}

function handleCreatePlaylist() {
    const name = document.getElementById('playlistName').value.trim();
    const desc = document.getElementById('playlistDesc').value.trim();
    const editId = document.getElementById('editPlaylistId').value;

    if (!name) { showToast('Playlist name is required', 'error'); return; }

    let playlists = getPlaylists();

    if (editId) {
        const idx = playlists.findIndex(p => p.id === editId);
        if (idx >= 0) {
            playlists[idx].name = name;
            playlists[idx].description = desc;
            showToast('Playlist updated!', 'success');
        }
    } else {
        playlists.push({
            id: uid(),
            name,
            description: desc,
            songs: [],
            createdAt: Date.now(),
        });
        showToast('Playlist created!', 'success');
    }

    DB.set('playlists_' + currentUser.id, playlists);
    closeModal('playlistModal');
    updateSidebarPlaylists();
    renderView(currentView);
}

function deletePlaylist(playlistId) {
    if (!confirm('Delete this playlist?')) return;
    let playlists = getPlaylists();
    playlists = playlists.filter(p => p.id !== playlistId);
    DB.set('playlists_' + currentUser.id, playlists);
    showToast('Playlist deleted', 'info');
    updateSidebarPlaylists();
    renderView('playlists');
}

function editPlaylist(playlistId) {
    const playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    document.getElementById('playlistName').value = pl.name;
    document.getElementById('playlistDesc').value = pl.description || '';
    document.getElementById('editPlaylistId').value = pl.id;
    document.getElementById('playlistModalTitle').textContent = 'Edit Playlist';
    document.getElementById('playlistSubmitText').textContent = 'Save Changes';
    openModal('playlistModal');
}

function addSongToPlaylist(songId, playlistId) {
    let playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.songs.includes(songId)) { showToast('Song already in playlist', 'info'); return; }
    saveCatalogSongToLibrary(songId);
    pl.songs.push(songId);
    DB.set('playlists_' + currentUser.id, playlists);
    showToast('Added to ' + pl.name, 'success');
    closeModal('addToPlaylistModal');
}

function removeSongFromPlaylist(songId, playlistId) {
    let playlists = getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    pl.songs = pl.songs.filter(sid => sid !== songId);
    DB.set('playlists_' + currentUser.id, playlists);
    showToast('Removed from playlist', 'info');
    renderView(currentView, { playlistId });
}

// ========== MODALS ==========
function renderPlaylistModal() {
    document.getElementById('playlistModal').innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title" id="playlistModalTitle">Create Playlist</div>
                <button class="modal-close" onclick="closeModal('playlistModal')"><i class="fas fa-xmark"></i></button>
            </div>
            <form onsubmit="return false;">
                <div class="form-group">
                    <label>Playlist Name *</label>
                    <input type="text" class="form-input" id="playlistName" placeholder="My Awesome Playlist" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" class="form-input" id="playlistDesc" placeholder="What's this playlist about?">
                </div>
                <input type="hidden" id="editPlaylistId" value="">
                <button class="auth-btn" onclick="handleCreatePlaylist()">
                    <i class="fas fa-plus"></i> <span id="playlistSubmitText">Create Playlist</span>
                </button>
            </form>
        </div>
    `;
}

function renderAddToPlaylistModal() {
    document.getElementById('addToPlaylistModal').innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">Add to Playlist</div>
                <button class="modal-close" onclick="closeModal('addToPlaylistModal')"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="add-playlist-list" id="addToPlaylistList"></div>
        </div>
    `;
}

function openAddToPlaylistModal(songId) {
    const playlists = getPlaylists();
    const container = document.getElementById('addToPlaylistList');
    if (playlists.length === 0) {
        container.innerHTML = `
            <p style="color:var(--text-muted);text-align:center;padding:20px;">
                No playlists yet. <a style="color:var(--accent-primary);cursor:pointer;" onclick="closeModal('addToPlaylistModal');openModal('playlistModal')">Create one</a>
            </p>`;
    } else {
        container.innerHTML = playlists.map(pl => `
            <div class="playlist-card" onclick="addSongToPlaylist('${songId}','${pl.id}')">
                <div class="playlist-cover-art"><i class="fas fa-music"></i></div>
                <div class="playlist-info">
                    <div class="playlist-name">${pl.name}</div>
                    <div class="playlist-meta">${pl.songs.length} songs</div>
                </div>
            </div>
        `).join('');
    }
    openModal('addToPlaylistModal');
}

function updateSidebarPlaylists() {
    const playlists = getPlaylists();
    const el = document.getElementById('sidebarPlaylists');
    if (el) {
        el.innerHTML = playlists.map(pl => `
            <button class="nav-item" onclick="navigateTo('playlistDetail', {playlistId:'${pl.id}'})">
                <i class="fas fa-music"></i> ${pl.name}
            </button>
        `).join('');
    }
}

function openCreatePlaylistModal() {
    document.getElementById('playlistName').value = '';
    document.getElementById('playlistDesc').value = '';
    document.getElementById('editPlaylistId').value = '';
    document.getElementById('playlistModalTitle').textContent = 'Create Playlist';
    document.getElementById('playlistSubmitText').textContent = 'Create Playlist';
    openModal('playlistModal');
}
