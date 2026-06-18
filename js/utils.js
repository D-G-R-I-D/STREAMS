/**
 * STREAMS — Utility Functions
 * Shared helpers for the music streaming platform
 */

// ========== UNIQUE ID GENERATOR ==========
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ========== TIME FORMATTERS ==========
function durationToSeconds(dur) {
    const parts = dur.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function secondsToTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ========== NUMBER FORMATTER ==========
function formatNumber(n) {
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
}

// ========== GREETING ==========
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== PAGE NAVIGATION ==========
function showPage(pageId) {
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');

    if (pageId === 'appPage') {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
}

// ========== SIDEBAR TOGGLE ==========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// ========== MODAL HELPERS ==========
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ========== ESCAPE KEY HANDLER ==========
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal('uploadModal');
        closeModal('playlistModal');
        closeModal('addToPlaylistModal');
    }
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (typeof togglePlay === 'function') togglePlay();
    }
});

// ========== MODAL OVERLAY CLICK ==========
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('show');
    });
});
