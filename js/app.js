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
        <button class="nav-item" onclick="navigateTo('settings')"><i class="fas fa-gear"></i> Settings</button>

        <div class="nav-section-title">Playlists</div>
        <div id="sidebarPlaylists"></div>
        <button class="nav-item" onclick="openCreatePlaylistModal()" style="color: var(--accent-primary);">
            <i class="fas fa-plus"></i> New Playlist
        </button>
    `;
}

function renderSidebarUser() {
    const theme = getCurrentTheme();
    const el = document.getElementById('sidebarUser');
    const hasPicture = currentUser?.picture;
    el.innerHTML = `
        ${hasPicture
            ? `<img class="user-avatar-img" src="${currentUser.picture}" alt="" referrerpolicy="no-referrer">`
            : `<div class="user-avatar">${currentUser?.name?.charAt(0).toUpperCase() || 'A'}</div>`
        }
        <div class="user-info" onclick="navigateTo('settings')" style="cursor:pointer;">
            <div class="user-name">${currentUser?.name || 'User'}</div>
            <div class="user-plan">${currentUser?.provider === 'google' ? '<i class="fab fa-google" style="font-size:10px;"></i> ' : ''}Premium</div>
        </div>
        <button class="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Theme">
            <i class="fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i>
        </button>
    `;
}

// ========== RENDER TOP BAR ==========
function renderTopBar() {
    const theme = getCurrentTheme();
    document.getElementById('topBar').innerHTML = `
        <button class="hamburger" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search songs, artists, albums..." id="globalSearch" oninput="handleSearch(this.value)">
        </div>
        <div class="top-bar-actions">
            <button class="top-btn theme-toggle-btn" onclick="toggleTheme()" title="${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}">
                <i class="fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
            </button>
            <button class="top-btn" onclick="openUploadModal()" title="Upload Music"><i class="fas fa-plus"></i></button>
            <button class="top-btn" onclick="navigateTo('settings')" title="Settings"><i class="fas fa-gear"></i></button>
        </div>
    `;
}

// ========== INIT APP ==========
function initApp() {
    if (!currentUser) return;
    initTheme();
    renderSidebar();
    renderSidebarUser();
    renderTopBar();
    renderUploadModal();
    renderPlaylistModal();
    renderAddToPlaylistModal();
    renderSwitchAccountModal();
    updateSidebarPlaylists();
    navigateTo('home');
}

// ========== BOOT ==========
async function boot() {
    console.log('🚀 Starting STREAMS...');
    
    // Initialize IndexedDB
    try {
        await initDatabase();
        await migrateToIndexedDB();
    } catch (e) {
        console.warn('IndexedDB not available, using localStorage fallback');
    }
    
    // Initialize theme
    initTheme();
    
    // Initialize default songs
    initDefaultSongs();
    
    // Render auth pages
    renderAuthPages();

    // Initialize Firebase Auth (Google, Email/Password)
    if (typeof initFirebaseAuth === 'function') {
        initFirebaseAuth();
    }

    // Check for logged in user
    const savedUser = DB.get('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showPage('appPage');
        initApp();
    } else {
        showPage('authPage');
        showAuth('signup');
    }
    
    console.log('✅ STREAMS ready!');
}

// Start
document.addEventListener('DOMContentLoaded', boot);
