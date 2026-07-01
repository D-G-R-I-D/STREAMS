/**
 * STREAMS — CRUD Operations
 * Create, Read, Update, Delete songs with local file storage (IndexedDB)
 */

let selectedAudioFile = null;
let selectedCoverFile = null;

// ========== UPLOAD MODAL ==========
function renderUploadModal() {
    document.getElementById('uploadModal').innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title" id="uploadModalTitle">Upload Music</div>
                <button class="modal-close" onclick="closeModal('uploadModal')"><i class="fas fa-xmark"></i></button>
            </div>

            <div class="upload-drop-zone" id="dropZone">
                <i class="fas fa-cloud-arrow-up"></i>
                <p id="dropZoneText">Click to select or drag audio file here</p>
                <p class="upload-hint">MP3, WAV, OGG, M4A, FLAC, AAC — Max 50MB</p>
                <input type="file" id="fileInput" accept=".mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/flac,audio/aac,audio/*" style="display:none">
            </div>

            <div id="uploadProgressWrap" style="display:none; margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:12px;color:var(--text-secondary);font-weight:600;">Saving...</span>
                    <span style="font-size:12px;color:var(--accent-primary);font-weight:700;" id="uploadPercent">0%</span>
                </div>
                <div style="height:6px;background:var(--border-light);border-radius:3px;overflow:hidden;">
                    <div id="uploadProgressBar" style="height:100%;background:var(--accent-gradient);border-radius:3px;width:0%;transition:width 0.3s;"></div>
                </div>
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
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label>Album</label>
                        <input type="text" class="form-input" id="uploadAlbum" placeholder="Album name">
                    </div>
                    <div class="form-group">
                        <label>Genre</label>
                        <input type="text" class="form-input" id="uploadGenre" placeholder="e.g. Pop, Rock">
                    </div>
                </div>
                <div class="form-group">
                    <label>Duration (auto-detected from file)</label>
                    <input type="text" class="form-input" id="uploadDuration" placeholder="3:45" readonly>
                </div>

                <div class="form-group">
                    <label>Cover Art (optional)</label>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div id="coverPreview" style="width:60px;height:60px;border-radius:8px;background:var(--bg-input);border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;cursor:pointer;" onclick="document.getElementById('coverInput').click()">
                            <i class="fas fa-image" style="color:var(--text-faint);font-size:20px;" id="coverIcon"></i>
                        </div>
                        <div style="flex:1;">
                            <input type="text" class="form-input" id="uploadCover" placeholder="Paste image URL or click square to upload" style="font-size:13px;">
                            <input type="file" id="coverInput" accept="image/*" style="display:none">
                        </div>
                    </div>
                </div>

                <input type="hidden" id="editSongId" value="">
                <button class="auth-btn" id="uploadSubmitBtn" onclick="handleUploadSong()" style="margin-top:4px;">
                    <i class="fas fa-cloud-arrow-up"></i> Upload Song
                </button>
            </form>
        </div>
    `;
    setupFileInputs();
}

// ========== FILE INPUT HANDLERS ==========
function setupFileInputs() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const coverInput = document.getElementById('coverInput');
    if (!dropZone) return;

    dropZone.onclick = (e) => { if (e.target !== fileInput) fileInput.click(); };

    fileInput.onchange = (e) => { if (e.target.files[0]) handleAudioFileSelected(e.target.files[0]); };

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => dropZone.classList.remove('dragover');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleAudioFileSelected(file);
    };

    if (coverInput) {
        coverInput.onchange = (e) => { if (e.target.files[0]) handleCoverFileSelected(e.target.files[0]); };
    }
}

function handleAudioFileSelected(file) {
    if (file.size > 50 * 1024 * 1024) { showToast('File too large. Max 50MB.', 'error'); return; }

    selectedAudioFile = file;
    const dropText = document.getElementById('dropZoneText');
    const dropZone = document.getElementById('dropZone');

    dropZone.style.borderColor = 'var(--accent-primary)';
    dropZone.style.background = 'var(--bg-active)';
    dropText.innerHTML = `<strong style="color:var(--accent-primary);">${file.name}</strong><br>
        <span style="font-size:12px;color:var(--text-muted);">${(file.size / (1024*1024)).toFixed(1)} MB — Click to change</span>`;

    const titleInput = document.getElementById('uploadTitle');
    if (!titleInput.value) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    detectAudioDuration(file);
    showToast('Audio file selected ✓', 'success');
}

function handleCoverFileSelected(file) {
    if (!file.type.startsWith('image/')) { showToast('Select an image file', 'error'); return; }
    selectedCoverFile = file;
    const preview = document.getElementById('coverPreview');
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        document.getElementById('uploadCover').placeholder = 'Image selected ✓';
    };
    reader.readAsDataURL(file);
}

function detectAudioDuration(file) {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
        const s = Math.round(audio.duration);
        document.getElementById('uploadDuration').value = Math.floor(s/60) + ':' + (s%60 < 10 ? '0' : '') + (s%60);
        URL.revokeObjectURL(url);
    });
    audio.addEventListener('error', () => URL.revokeObjectURL(url));
    audio.src = url;
}

// ========== CREATE / UPDATE ==========
async function handleUploadSong() {
    const title = document.getElementById('uploadTitle').value.trim();
    const artist = document.getElementById('uploadArtist').value.trim();
    const album = document.getElementById('uploadAlbum').value.trim();
    const genre = document.getElementById('uploadGenre').value.trim();
    const duration = document.getElementById('uploadDuration').value.trim() || '3:30';
    const coverUrl = document.getElementById('uploadCover').value.trim();
    const editId = document.getElementById('editSongId').value;

    if (!title || !artist) { showToast('Title and Artist are required', 'error'); return; }

    const btn = document.getElementById('uploadSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    let songs = getAllSongs();
    let finalCover = coverUrl || getCover(Math.floor(Math.random() * coverArts.length));

    try {
        const songId = editId || uid();

        // Save audio file to IndexedDB
        if (selectedAudioFile) {
            document.getElementById('uploadProgressWrap').style.display = 'block';
            document.getElementById('uploadProgressBar').style.width = '30%';
            document.getElementById('uploadPercent').textContent = '30%';

            await saveAudioFile(songId, selectedAudioFile);

            document.getElementById('uploadProgressBar').style.width = '70%';
            document.getElementById('uploadPercent').textContent = '70%';
        }

        // Save cover image to IndexedDB
        if (selectedCoverFile) {
            await saveCoverImage(songId, selectedCoverFile);
            finalCover = await getCoverImage(songId);
        }

        document.getElementById('uploadProgressBar').style.width = '90%';
        document.getElementById('uploadPercent').textContent = '90%';

        if (editId) {
            // UPDATE
            const idx = songs.findIndex(s => s.id === editId);
            if (idx >= 0) {
                songs[idx].title = title;
                songs[idx].artist = artist;
                songs[idx].album = album || songs[idx].album;
                songs[idx].genre = genre || songs[idx].genre;
                songs[idx].duration = duration;
                if (finalCover) songs[idx].cover = finalCover;
                if (selectedAudioFile) songs[idx].hasAudio = true;
                DB.set('songs', songs);
                showToast('Song updated!', 'success');
            }
        } else {
            // CREATE
            const song = {
                id: songId,
                title,
                artist,
                album: album || 'Single',
                genre: genre || 'Unknown',
                duration,
                cover: finalCover,
                hasAudio: !!selectedAudioFile,
                uploadedBy: currentUser?.id || 'system',
                createdAt: Date.now(),
                plays: 0,
            };
            songs.unshift(song);
            DB.set('songs', songs);
            showToast('Song uploaded!', 'success');
        }

        document.getElementById('uploadProgressBar').style.width = '100%';
        document.getElementById('uploadPercent').textContent = '100%';

    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
    }

    // Reset
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Upload Song';
    document.getElementById('uploadProgressWrap').style.display = 'none';
    selectedAudioFile = null;
    selectedCoverFile = null;
    closeModal('uploadModal');
    renderView(currentView, currentViewData);
}

// ========== DELETE ==========
async function deleteSong(songId) {
    if (!confirm('Delete this song?')) return;
    let songs = getAllSongs();
    songs = songs.filter(s => s.id !== songId);
    DB.set('songs', songs);

    // Delete audio + cover from IndexedDB
    await deleteAudioFile(songId);
    await deleteCoverImage(songId);

    // Remove from playlists & favorites
    let playlists = getPlaylists();
    playlists.forEach(p => { p.songs = p.songs.filter(sid => sid !== songId); });
    DB.set('playlists_' + currentUser.id, playlists);

    let faves = DB.get('favorites_' + currentUser.id) || [];
    DB.set('favorites_' + currentUser.id, faves.filter(id => id !== songId));

    showToast('Song deleted', 'info');
    renderView(currentView, currentViewData);
}

// ========== EDIT ==========
function editSong(songId) {
    const song = getAllSongs().find(s => s.id === songId);
    if (!song) return;

    selectedAudioFile = null;
    selectedCoverFile = null;

    document.getElementById('uploadTitle').value = song.title;
    document.getElementById('uploadArtist').value = song.artist;
    document.getElementById('uploadAlbum').value = song.album || '';
    document.getElementById('uploadGenre').value = song.genre || '';
    document.getElementById('uploadDuration').value = song.duration;
    document.getElementById('uploadCover').value = '';
    document.getElementById('editSongId').value = song.id;
    document.getElementById('uploadModalTitle').textContent = 'Edit Song';
    document.getElementById('uploadSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Changes';

    const dropText = document.getElementById('dropZoneText');
    const dropZone = document.getElementById('dropZone');
    if (song.hasAudio) {
        dropZone.style.borderColor = 'var(--accent-green)';
        dropText.innerHTML = '<strong style="color:var(--accent-green);">Audio file attached ✓</strong><br><span style="font-size:12px;color:var(--text-muted);">Click to replace</span>';
    }

    if (song.cover) {
        document.getElementById('coverPreview').innerHTML = `<img src="${song.cover}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    openModal('uploadModal');
}

function openUploadModal() {
    selectedAudioFile = null;
    selectedCoverFile = null;
    const form = document.getElementById('uploadForm');
    if (form) form.reset();
    document.getElementById('editSongId').value = '';
    document.getElementById('uploadModalTitle').textContent = 'Upload Music';
    document.getElementById('uploadSubmitBtn').innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Upload Song';

    const dropZone = document.getElementById('dropZone');
    const dropText = document.getElementById('dropZoneText');
    if (dropZone) { dropZone.style.borderColor = ''; dropZone.style.background = ''; }
    if (dropText) dropText.textContent = 'Click to select or drag audio file here';

    document.getElementById('coverPreview').innerHTML = '<i class="fas fa-image" style="color:var(--text-faint);font-size:20px;" id="coverIcon"></i>';
    document.getElementById('uploadProgressWrap').style.display = 'none';

    openModal('uploadModal');
    setTimeout(setupFileInputs, 100);
}
