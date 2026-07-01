/**
 * STREAMS — Settings & Theme Management
 * Dark mode, user preferences, account management
 */

// ========== THEME MANAGEMENT ==========
function initTheme() {
    const savedTheme = DB.get('theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    DB.set('theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`${newTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode enabled`, 'success');
    // Re-render settings if on settings page
    if (currentView === 'settings') {
        renderView('settings');
    }
}

function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || DB.get('theme') || 'light';
}

// ========== SETTINGS VIEW ==========
function renderSettings(el) {
    const theme = getCurrentTheme();
    const user = currentUser;
    const allUsers = DB.get('users') || [];
    const otherUsers = allUsers.filter(u => u.id !== user?.id);
//|| user?.name?.charAt(0).toUpperCase() || 'A'
    el.innerHTML = `
        <div class="section-header">
            <h2 class="section-title"><i class="fas fa-gear"></i> Settings</h2>
        </div>

        <!-- Profile Section -->
        <div class="settings-section">
            <div class="settings-section-title">Profile</div>
            <div class="settings-card">
                <div class="profile-header">
                    <div class="profile-avatar-large"><img class="user-avatar-img" src="${currentUser?.picture}" alt="" referrerpolicy="no-referrer"></div>
                    <div class="profile-info">
                        <h3>${user?.name || 'User'}</h3>
                        <p>${user?.email || 'email@example.com'}</p>
                        <span class="profile-badge"><i class="fas fa-crown"></i> Premium Member</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Appearance Section -->
        <div class="settings-section">
            <div class="settings-section-title">Appearance</div>
            <div class="settings-card">
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-icon ${theme === 'dark' ? 'dark' : ''}">
                            <i class="fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i>
                        </div>
                        <div>
                            <div class="settings-item-title">Dark Mode</div>
                            <div class="settings-item-desc">Switch between light and dark themes</div>
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" ${theme === 'dark' ? 'checked' : ''} onchange="toggleTheme()">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Playback Section -->
        <div class="settings-section">
            <div class="settings-section-title">Playback</div>
            <div class="settings-card">
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-volume-high"></i></div>
                        <div>
                            <div class="settings-item-title">Audio Quality</div>
                            <div class="settings-item-desc">High quality streaming (320kbps)</div>
                        </div>
                    </div>
                    <span class="settings-value">High</span>
                </div>
                <div class="settings-divider"></div>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-crosshairs"></i></div>
                        <div>
                            <div class="settings-item-title">Crossfade</div>
                            <div class="settings-item-desc">Smooth transition between songs</div>
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-divider"></div>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-forward"></i></div>
                        <div>
                            <div class="settings-item-title">Autoplay</div>
                            <div class="settings-item-desc">Keep playing similar songs when queue ends</div>
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Account Section -->
        <div class="settings-section">
            <div class="settings-section-title">Account</div>
            <div class="settings-card">
                ${otherUsers.length > 0 ? `
                    <div class="settings-item clickable" onclick="openSwitchAccountModal()">
                        <div class="settings-item-info">
                            <div class="settings-item-icon"><i class="fas fa-users"></i></div>
                            <div>
                                <div class="settings-item-title">Switch Account</div>
                                <div class="settings-item-desc">${otherUsers.length} other account${otherUsers.length > 1 ? 's' : ''} available</div>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right" style="color:var(--text-faint);"></i>
                    </div>
                    <div class="settings-divider"></div>
                ` : ''}
                <div class="settings-item clickable" onclick="openAddAccountModal()">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-user-plus"></i></div>
                        <div>
                            <div class="settings-item-title">Add Another Account</div>
                            <div class="settings-item-desc">Sign in with a different account</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--text-faint);"></i>
                </div>
                <div class="settings-divider"></div>
                <div class="settings-item clickable" onclick="handleLogout()">
                    <div class="settings-item-info">
                        <div class="settings-item-icon logout"><i class="fas fa-arrow-right-from-bracket"></i></div>
                        <div>
                            <div class="settings-item-title" style="color:var(--accent-red);">Log Out</div>
                            <div class="settings-item-desc">Sign out of ${user?.name || 'your account'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Storage Section -->
        <div class="settings-section">
            <div class="settings-section-title">Storage & Data</div>
            <div class="settings-card">
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-database"></i></div>
                        <div>
                            <div class="settings-item-title">Local Storage</div>
                            <div class="settings-item-desc">Data stored in browser localStorage</div>
                        </div>
                    </div>
                    <span class="settings-value">${getStorageSize()}</span>
                </div>
                <div class="settings-divider"></div>
                <div class="settings-item clickable" onclick="clearCache()">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-broom"></i></div>
                        <div>
                            <div class="settings-item-title">Clear Cache</div>
                            <div class="settings-item-desc">Remove temporary data (keeps your account)</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:var(--text-faint);"></i>
                </div>
            </div>
        </div>

        <!-- About Section -->
        <div class="settings-section">
            <div class="settings-section-title">About</div>
            <div class="settings-card">
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-icon"><i class="fas fa-info-circle"></i></div>
                        <div>
                            <div class="settings-item-title">Version</div>
                            <div class="settings-item-desc">STREAMS.. Music Streaming</div>
                        </div>
                    </div>
                    <span class="settings-value">1.0.0</span>
                </div>
            </div>
        </div>

        <div style="text-align:center;padding:24px 0;color:var(--text-faint);font-size:12px;">
            <p>Made with <i class="fas fa-heart" style="color:var(--accent-pink);"></i> by STREAMS Team</p>
        </div>
    `;
}

// ========== STORAGE HELPERS ==========
function getStorageSize() {
    // Combine localStorage + estimate IndexedDB
    const lsSize = DB.getSize();
    // We can't synchronously measure IndexedDB, so show localStorage for now
    const total = lsSize;
    if (total < 1024) return total + ' B';
    if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' KB';
    return (total / (1024 * 1024)).toFixed(2) + ' MB';
}

// Async version that counts IndexedDB audio files
async function getFullStorageInfo() {
    try {
        const audioCount = await StreamsDB.count('audioFiles');
        const coverCount = await StreamsDB.count('coverImages');
        return { audioFiles: audioCount, coverImages: coverCount };
    } catch(e) {
        return { audioFiles: 0, coverImages: 0 };
    }
}

function clearCache() {
    if (!confirm('Clear all cached data? Your account and uploaded songs will be preserved.')) return;
    // Keep essential data
    const users = DB.get('users');
    const currentUserData = DB.get('currentUser');
    const songs = DB.get('songs');
    const theme = DB.get('theme');
    const playlists = DB.get('playlists_' + currentUser?.id);
    const favorites = DB.get('favorites_' + currentUser?.id);
    
    // Clear all
    DB.clearAll();
    
    // Restore essentials
    if (users) DB.set('users', users);
    if (currentUserData) DB.set('currentUser', currentUserData);
    if (songs) DB.set('songs', songs);
    if (theme) DB.set('theme', theme);
    if (playlists) DB.set('playlists_' + currentUser?.id, playlists);
    if (favorites) DB.set('favorites_' + currentUser?.id, favorites);
    
    showToast('Cache cleared successfully', 'success');
}

// function clearCache() {
//     if (!confirm('Clear all cached data? Your account and uploaded songs will be preserved.')) return;
//     // Keep essential data
//     const users = DB.get('users');
//     const currentUserData = DB.get('currentUser');
//     const theme = DB.get('theme');
    
//     // Clear localStorage streams keys (except essentials)
//     const keysToKeep = ['users', 'currentUser', 'songs', 'theme'];
//     for (let key in localStorage) {
//         if (key.startsWith('streams_')) {
//             const shortKey = key.replace('streams_', '');
//             if (!keysToKeep.includes(shortKey) && !shortKey.startsWith('playlists_') && !shortKey.startsWith('favorites_')) {
//                 localStorage.removeItem(key);
//             }
//         }
//     }
//     showToast('Cache cleared successfully', 'success');
// }

// ========== SWITCH ACCOUNT ==========
function openSwitchAccountModal() {
    const allUsers = DB.get('users') || [];
    const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);
    
    const modal = document.getElementById('switchAccountModal');
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">Switch Account</div>
                <button class="modal-close" onclick="closeModal('switchAccountModal')"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="account-list">
                ${otherUsers.map(user => `
                    <div class="account-item" onclick="switchToAccount('${user.id}')">
                        <div class="account-avatar">${user.name.charAt(0).toUpperCase()}</div>
                        <div class="account-info">
                            <div class="account-name">${user.name}</div>
                            <div class="account-email">${user.email}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color:var(--text-faint);"></i>
                    </div>
                `).join('')}
            </div>
            <button class="auth-btn" style="margin-top:16px;" onclick="closeModal('switchAccountModal');openAddAccountModal()">
                <i class="fas fa-plus"></i> Add Another Account
            </button>
        </div>
    `;
    openModal('switchAccountModal');
}

function switchToAccount(userId) {
    const users = DB.get('users') || [];
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    currentUser = user;
    DB.set('currentUser', user);
    closeModal('switchAccountModal');
    
    // Stop playback
    playerState.isPlaying = false;
    audioElement.pause();

    // Reinitialize app
    initApp();
    showToast(`Switched to ${user.name}`, 'success');
}

function openAddAccountModal() {
    // Logout but keep users in storage, then show signup
    currentUser = null;
    DB.remove('currentUser');
    playerState.isPlaying = false;
    audioElement.pause();
    showPage('authPage');
    showAuth('signup');
    showToast('Sign in with another account', 'info');
}

// ========== RENDER SETTINGS MODAL (for Switch Account) ==========
function renderSwitchAccountModal() {
    // Create modal container if doesn't exist
    let modal = document.getElementById('switchAccountModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'switchAccountModal';
        modal.className = 'modal-overlay';
        modal.onclick = function(e) { if (e.target === this) closeModal('switchAccountModal'); };
        document.body.appendChild(modal);
    }
}
