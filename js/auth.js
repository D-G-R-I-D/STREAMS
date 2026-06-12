/**
 * STREAMS — Authentication System
 * Sign up, login, logout, session management
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
                        <button class="social-btn" title="Google"><i class="fab fa-google"></i></button>
                        <button class="social-btn" title="Apple"><i class="fab fa-apple"></i></button>
                        <button class="social-btn" title="Facebook"><i class="fab fa-facebook-f"></i></button>
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
                        <button class="social-btn" title="Google"><i class="fab fa-google"></i></button>
                        <button class="social-btn" title="Apple"><i class="fab fa-apple"></i></button>
                        <button class="social-btn" title="Facebook"><i class="fab fa-facebook-f"></i></button>
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
function handleSignup() {
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

    const user = { id: uid(), name, email, password: btoa(password), createdAt: Date.now() };
    users.push(user);
    DB.set('users', users);

    currentUser = user;
    DB.set('currentUser', user);
    showToast('Account created! Welcome to STREAMS', 'success');
    showPage('appPage');
    initApp();
}

// ========== LOGIN ==========
function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.classList.remove('show');

    if (!email || !password) { showAuthError(errEl, 'Please fill all fields'); return; }

    const users = DB.get('users') || [];
    const user = users.find(u => u.email === email && atob(u.password) === password);
    if (!user) { showAuthError(errEl, 'Invalid email or password'); return; }

    currentUser = user;
    DB.set('currentUser', user);
    showToast('Welcome back, ' + user.name + '!', 'success');
    showPage('appPage');
    initApp();
}

// ========== LOGOUT ==========
function handleLogout() {
    currentUser = null;
    DB.remove('currentUser');
    playerState.isPlaying = false;
    if (audioContext) { audioContext.close(); audioContext = null; }
    showPage('authPage');
    showAuth('login');
    showToast('Logged out successfully', 'info');
}

// ========== ERROR HELPER ==========
function showAuthError(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
}
