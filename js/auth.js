/**
 * STREAMS — Authentication System
 * Email/password + Google via Firebase, with local fallback
 */

let currentUser = null;

// ========== RENDER AUTH PAGES ==========
function renderAuthPages() {
    const container = document.getElementById('authContainer');
    container.innerHTML = `
        <!-- Signup Page -->
        <div id="signupPage" class="auth-page">
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-logo">
                        <div class="auth-logo-icon"><i class="fas fa-headphones"></i></div>
                        <div class="auth-logo-text">STREAMS</div>
                    </div>
                    <p class="auth-subtitle">Create your account and start streaming</p>
                    <div class="auth-error" id="signupError"></div>
                    <form id="signupForm" onsubmit="return false;">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" class="form-input" id="signupName" placeholder="Enter your name" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" class="form-input" id="signupEmail" placeholder="you@example.com" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" class="form-input" id="signupPassword" placeholder="Min 6 characters" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm Password</label>
                            <input type="password" class="form-input" id="signupConfirmPassword" placeholder="Re-enter password" required>
                        </div>
                        <button type="submit" class="auth-btn" onclick="handleSignup()">Create Account</button>
                    </form>
                    <div class="auth-divider">OR</div>
                    <div class="auth-social-btns">
                        <button class="social-btn" onclick="handleGoogleSignIn()">
                            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                            <span>Continue with Google</span>
                        </button>
                    </div>
                    <div class="auth-footer">
                        Already have an account? <a onclick="showAuth('login')">Sign In</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Login Page -->
        <div id="loginPage" class="auth-page hidden">
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-logo">
                        <div class="auth-logo-icon"><i class="fas fa-headphones"></i></div>
                        <div class="auth-logo-text">STREAMS</div>
                    </div>
                    <p class="auth-subtitle">Welcome back! Sign in to continue</p>
                    <div class="auth-error" id="loginError"></div>
                    <form id="loginForm" onsubmit="return false;">
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" class="form-input" id="loginEmail" placeholder="you@example.com" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" class="form-input" id="loginPassword" placeholder="Enter password" required>
                        </div>
                        <button type="submit" class="auth-btn" onclick="handleLogin()">Sign In</button>
                    </form>
                    <div class="auth-divider">OR</div>
                    <div class="auth-social-btns">
                        <button class="social-btn" onclick="handleGoogleSignIn()">
                            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                            <span>Continue with Google</span>
                        </button>
                    </div>
                    <div class="auth-footer">
                        Don't have an account? <a onclick="showAuth('signup')">Sign Up</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showAuth(type) {
    document.getElementById('signupPage').classList.toggle('hidden', type !== 'signup');
    document.getElementById('loginPage').classList.toggle('hidden', type !== 'login');
}

// ========== SIGNUP ==========
async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirmPassword').value;
    const errEl = document.getElementById('signupError');
    errEl.classList.remove('show');

    if (!name || !email || !password) { showAuthError(errEl, 'Please fill all fields'); return; }
    if (password.length < 6) { showAuthError(errEl, 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { showAuthError(errEl, 'Passwords do not match'); return; }

    let users = DB.get('users') || [];
    if (users.find(u => u.email === email)) { showAuthError(errEl, 'Email already registered'); return; }

    // Try Firebase signup (non-blocking — works without Firebase too)
    if (typeof firebaseEmailSignup === 'function') {
        await firebaseEmailSignup(name, email, password);
    }

    const user = {
        id: uid(),
        name,
        email,
        password: btoa(password),
        provider: 'email',
        createdAt: Date.now()
    };
    users.push(user);
    DB.set('users', users);

    currentUser = user;
    DB.set('currentUser', user);
    showToast('Account created! Welcome to Streams', 'success');
    showPage('appPage');
    initApp();
}

// ========== LOGIN ==========
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.classList.remove('show');

    if (!email || !password) { showAuthError(errEl, 'Please fill all fields'); return; }

    const users = DB.get('users') || [];
    const user = users.find(u => u.email === email);

    if (!user) { showAuthError(errEl, 'No account found with this email'); return; }

    if (user.provider === 'google' && !user.password) {
        showAuthError(errEl, 'This account uses Google Sign-In. Click "Continue with Google" below.');
        return;
    }

    if (atob(user.password) !== password) { showAuthError(errEl, 'Incorrect password'); return; }

    // Try Firebase login (non-blocking)
    if (typeof firebaseEmailLogin === 'function') {
        await firebaseEmailLogin(email, password);
    }

    currentUser = user;
    DB.set('currentUser', user);
    showToast('Welcome back, ' + user.name + '!', 'success');
    showPage('appPage');
    initApp();
}

// ========== LOGOUT ==========
function handleLogout() {
    if (typeof firebaseSignOut === 'function') firebaseSignOut();
    currentUser = null;
    DB.remove('currentUser');
    playerState.isPlaying = false;
    stopTone();
    clearInterval(progressInterval);
    if (audioContext) {
        try { audioContext.close(); } catch(e) {}
        audioContext = null;
    }
    showPage('authPage');
    showAuth('login');
    showToast('Logged out successfully', 'info');
}

// ========== ERROR HELPER ==========
function showAuthError(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
}
