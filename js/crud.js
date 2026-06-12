/**
 * STREAMS — CRUD Operations
 * Create, Read, Update, Delete for songs
 */

// ========== UPLOAD MODAL ==========
function renderUploadModal() {
    document.getElementById('uploadModal').innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title" id="uploadModalTitle">Upload Music</div>
                <button class="modal-close" onclick="closeModal('uploadModal')"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="upload-drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
                <i class="fas fa-cloud-arrow-up"></i>
                <p>Click or drag audio files here</p>
                <p class="upload-hint">Supports MP3, WAV, FLAC, OGG • Max 50MB</p>
                <input type="file" id="fileInput" accept="audio/*" multiple style="display:none" onchange="handleFileSelect(event)">
            </div>
            <form id="uploadForm" onsubmit="return false;">
                <div class="form-group">
                    <label>Song Title *</label>
                    <input type="text" class="form-input" id="uploadTitle" placeholder="Enter song title" required>
                </div>
                <div class="form-group">
                    <label>Artist Name *</label>
                    <input type="text" class="form-input" id="uploadArtist" placeholder="Enter artist name" required>
                </div>
                <div class="form-group">
                    <label>Album</label>
                    <input type="text" class="form-input" id="uploadAlbum" placeholder="Enter album name">
                </div>
                <div class="form-group">
                    <label>Genre</label>
                    <input type="text" class="form-input" id="uploadGenre" placeholder="e.g., Pop, Rock, R&B">
                </div>
                <div class="form-group">
                    <label>Duration (e.g., 3:45)</label>
                    <input type="text" class="form-input" id="uploadDuration" placeholder="3:45">
                </div>
                <div class="form-group">
                    <label>Cover Art URL (optional)</label>
                    <input type="text" class="form-input" id="uploadCover" placeholder="https://...">
                </div>
                <input type="hidden" id="editSongId" value="">
                <button class="auth-btn" id="uploadSubmitBtn" onclick="handleUploadSong()">
                    <i class="fas fa-cloud-arrow-up"></i> Upload Song
                </button>
            </form>
        </div>
    `;

    // Drag & drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                document.getElementById('fileInput').files = e.dataTransfer.files;
                handleFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('uploadTitle').value = file.name.replace(/\.[^/.]+$/, '');
        showToast('File selected: ' + file.name, 'info');
    }
}

// ========== CREATE / UPDATE ==========
function handleUploadSong() {
    const title = document.getElementById('uploadTitle').value.trim();
    const artist = document.getElementById('uploadArtist').value.trim();
    const album = document.getElementById('uploadAlbum').value.trim();
    const genre = document.getElementById('uploadGenre').value.trim();
    const duration = document.getElementById('uploadDuration').value.trim() || '3:30';
    const cover = document.getElementById('uploadCover').value.trim();
    const editId = document.getElementById('editSongId').value;

    if (!title || !artist) { showToast('Title and Artist are required', 'error'); return; }

    let songs = getAllSongs();

    if (editId) {
        // UPDATE
        const idx = songs.findIndex(s => s.id === editId);
        if (idx >= 0) {
            songs[idx].title = title;
            songs[idx].artist = artist;
            songs[idx].album = album || songs[idx].album;
            songs[idx].genre = genre || songs[idx].genre;
            songs[idx].duration = duration;
            if (cover) songs[idx].cover = cover;
            DB.set('songs', songs);
            showToast('Song updated successfully!', 'success');
        }
    } else {
        // CREATE
        const song = {
            id: uid(),
            title, artist,
            album: album || 'Single',
            genre: genre || 'Unknown',
            duration,
            cover: cover || getCover(Math.floor(Math.random() * coverArts.length)),
            uploadedBy: currentUser?.id || 'system',
            createdAt: Date.now(),
            plays: 0,
        };
        songs.unshift(song);
        DB.set('songs', songs);
        showToast('Song uploaded successfully!', 'success');
    }

    closeModal('uploadModal');
    renderView(currentView);
}

// ========== DELETE ==========
function deleteSong(songId) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    let songs = getAllSongs();
    songs = songs.filter(s => s.id !== songId);
    DB.set('songs', songs);

    // Remove from playlists
    let playlists = getPlaylists();
    playlists.forEach(p => { p.songs = p.songs.filter(sid => sid !== songId); });
    DB.set('playlists_' + currentUser.id, playlists);

    // Remove from favorites
    let faves = DB.get('favorites_' + currentUser.id) || [];
    faves = faves.filter(id => id !== songId);
    DB.set('favorites_' + currentUser.id, faves);

    showToast('Song deleted', 'info');
    renderView(currentView);
}

// ========== EDIT ==========
function editSong(songId) {
    const songs = getAllSongs();
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    document.getElementById('uploadTitle').value = song.title;
    document.getElementById('uploadArtist').value = song.artist;
    document.getElementById('uploadAlbum').value = song.album;
    document.getElementById('uploadGenre').value = song.genre;
    document.getElementById('uploadDuration').value = song.duration;
    document.getElementById('uploadCover').value = song.cover || '';
    document.getElementById('editSongId').value = song.id;
    document.getElementById('uploadModalTitle').textContent = 'Edit Song';
    document.getElementById('uploadSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Changes';

    openModal('uploadModal');
}

function openUploadModal() {
    document.getElementById('uploadForm')?.reset();
    document.getElementById('editSongId').value = '';
    document.getElementById('uploadModalTitle').textContent = 'Upload Music';
    document.getElementById('uploadSubmitBtn').innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Upload Song';
    openModal('uploadModal');
}
