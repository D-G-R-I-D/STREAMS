/**
 * STREAMS — Firebase Authentication (Google Sign-In)
 * Firebase Auth only — files stored locally in IndexedDB
 */

let firebaseAuth = null;
let googleProvider = null;
let firebaseReady = false;

// ========== INITIALIZE FIREBASE ==========
function initFirebaseAuth() {
    if (!isFirebaseConfigured()) {
        console.warn('⚠️ Firebase not configured — see js/firebase-config.js');
        return;
    }

    try {
        firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseAuth.useDeviceLanguage();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('profile');
        googleProvider.addScope('email');
        firebaseReady = true;
        firebaseAuth.onAuthStateChanged(handleAuthStateChange);
        console.log('✅ Firebase Auth initialized');
    } catch (e) {
        console.error('Firebase init failed:', e);
    }
}

// ========== AUTH STATE LISTENER ==========
function handleAuthStateChange(firebaseUser) {
    if (!firebaseUser) return;
    const user = firebaseUserToLocal(firebaseUser);
    let users = DB.get('users') || [];
    const idx = users.findIndex(u => u.email === user.email);
    if (idx >= 0) users[idx] = { ...users[idx], ...user, lastLogin: Date.now() };
    else users.push(user);
    DB.set('users', users);
}

function firebaseUserToLocal(fu) {
    return {
        id: fu.uid,
        name: fu.displayName || fu.email.split('@')[0],
        email: fu.email,
        picture: fu.photoURL || null,
        provider: fu.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
        firebaseUid: fu.uid,
        createdAt: Date.now(),
        lastLogin: Date.now(),
    };
}

// ========== GOOGLE SIGN-IN ==========
async function handleGoogleSignIn() {
    if (!firebaseReady) {
        showToast('Firebase not configured. See js/firebase-config.js', 'error');
        return;
    }
    try {
        const result = await firebaseAuth.signInWithPopup(googleProvider);
        const user = firebaseUserToLocal(result.user);
        let users = DB.get('users') || [];
        const idx = users.findIndex(u => u.email === user.email);
        if (idx >= 0) users[idx] = { ...users[idx], ...user, lastLogin: Date.now() };
        else users.push(user);
        DB.set('users', users);
        currentUser = users.find(u => u.email === user.email);
        DB.set('currentUser', currentUser);
        showToast('Welcome, ' + currentUser.name + '!', 'success');
        showPage('appPage');
        initApp();
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') showToast('Sign-in cancelled', 'info');
        else if (error.code === 'auth/unauthorized-domain') showToast('Open from http://localhost:5500 instead of 127.0.0.1', 'error');
        else showToast('Sign-in failed: ' + error.message, 'error');
    }
}

// ========== FIREBASE EMAIL AUTH ==========
async function firebaseEmailSignup(name, email, password) {
    if (!firebaseReady) return false;
    try {
        const result = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: name });
        return true;
    } catch (e) { return false; }
}

async function firebaseEmailLogin(email, password) {
    if (!firebaseReady) return false;
    try {
        await firebaseAuth.signInWithEmailAndPassword(email, password);
        return true;
    } catch (e) { return false; }
}

function firebaseSignOut() {
    if (firebaseReady && firebaseAuth) firebaseAuth.signOut().catch(() => {});
}

console.log('🔐 Firebase Auth module loaded');
