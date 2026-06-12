/**
 * STREAMS — Main Application Controller
 * Boot, initialization, sidebar rendering, top bar
 */

// ========== RENDER SIDEBAR ==========
function renderSidebar() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = `
        <div class="nav-section-title">Menu</div>
        <button class="nav-item active" onclick="navigateTo('home')"><i class="fas fa-house"></i> Home</button>
        <button class="nav-item" onclick="navigateTo('browse')"><i class="fas fa-compass"></i> Browse</button>
        <button class="nav-item" onclick="navigateTo('search')"><i class="fas fa-search"></i> Search</button>

        <div class="nav-section-title">Library</div>
        <button class="nav-item" onclick="navigateTo('library')"><i class="fas fa-music"></i> All Songs</button>
        <button class="nav-item" onclick="navigateTo('playlists')"><i class="fas fa-list"></i> Playlists</button>
        <button class="nav-item" onclick="navigateTo('favorites')"><i class="fas fa-heart"></i> Favorites</button>
        <button class="nav-item" onclick="navigateTo('uploads')"><i class="fas fa-cloud-arrow-up"></i> My Uploads</button>

        <div class="nav-section-title">Playlists</div>
        <div id="sidebarPlaylists"></div>
        <button class="nav-item" onclick="openCreatePlaylistModal()" style="color: var(--accent-primary);">
            <i class="fas fa-plus"></i> New Playlist
        </button>
    `;
}

function renderSidebarUser() {
    const el = document.getElementById('sidebarUser');
    el.innerHTML = `
        <div class="user-avatar" id="userAvatar">${currentUser?.name?.charAt(0).toUpperCase() || 'A'}</div>
        <div class="user-info">
            <div class="user-name" id="userName">${currentUser?.name || 'User'}</div>
            <div class="user-plan">Premium</div>
        </div>
        <button class="user-logout" onclick="handleLogout()" title="Logout"><i class="fas fa-arrow-right-from-bracket"></i></button>
    `;
}

// ========== RENDER TOP BAR ==========
function renderTopBar() {
    document.getElementById('topBar').innerHTML = `
        <button class="hamburger" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search songs, artists, albums..." id="globalSearch" oninput="handleSearch(this.value)">
        </div>
        <div class="top-bar-actions">
            <button class="top-btn" onclick="openUploadModal()" title="Upload Music"><i class="fas fa-plus"></i></button>
            <button class="top-btn" title="Notifications"><i class="fas fa-bell"></i></button>
        </div>
    `;
}

// ========== INIT APP ==========
function initApp() {
    if (!currentUser) return;
    renderSidebar();
    renderSidebarUser();
    renderTopBar();
    renderUploadModal();
    renderPlaylistModal();
    renderAddToPlaylistModal();
    updateSidebarPlaylists();
    navigateTo('home');
}

// ========== BOOT ==========
function boot() {
    initDefaultSongs();
    renderAuthPages();

    const savedUser = DB.get('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showPage('appPage');
        initApp();
    } else {
        showPage('authPage');
        showAuth('signup');
    }
}

// Start
document.addEventListener('DOMContentLoaded', boot);
