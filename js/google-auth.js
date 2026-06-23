/**
 * STREAMS — Firebase Authentication
 * Handles Google Sign-In, Email/Password, and auth state
 */

let firebaseAuth = null;
let googleProvider = null;
let firebaseReady = false;

// ========== INITIALIZE FIREBASE ==========
function initFirebaseAuth() {
    if (!isFirebaseConfigured()) {
        console.warn(
            '%c⚠️ Firebase not configured',
            'color: orange; font-size: 14px;',
            '\n\nTo enable Google Sign-In:',
            '\n1. Go to https://console.firebase.google.com',
            '\n2. Create a project',
            '\n3. Add a web app and copy the config',
            '\n4. Paste it in js/firebase-config.js',
            '\n5. Enable Email/Password and Google auth providers',
            '\n\nEmail/password login still works offline without Firebase.'
        );
        return;
    }

    try {
        firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        
        // Fix for 127.0.0.1 — tell Firebase to use the authDomain for popups
        firebaseAuth.useDeviceLanguage();

        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('profile');
        googleProvider.addScope('email');
        firebaseReady = true;

        // Listen for auth state changes
        firebaseAuth.onAuthStateChanged(handleAuthStateChange);

        console.log('✅ Firebase Authentication initialized');
    } catch (e) {
        console.error('Firebase init failed:', e);
    }
}

// ========== AUTH STATE LISTENER ==========
function handleAuthStateChange(firebaseUser) {
    if (!firebaseUser) return;

    // Sync Firebase user to local database
    const user = firebaseUserToLocal(firebaseUser);
    let users = DB.get('users') || [];
    const idx = users.findIndex(u => u.email === user.email);

    if (idx >= 0) {
        // Update existing user
        users[idx] = { ...users[idx], ...user, lastLogin: Date.now() };
    } else {
        // New user
        users.push(user);
    }

    DB.set('users', users);
}

// ========== CONVERT FIREBASE USER TO LOCAL FORMAT ==========
function firebaseUserToLocal(firebaseUser) {
    return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        picture: firebaseUser.photoURL || null,
        provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
        firebaseUid: firebaseUser.uid,
        createdAt: Date.now(),
        lastLogin: Date.now(),
    };
}

// ========== GOOGLE SIGN-IN ==========
async function handleGoogleSignIn() {
    if (!firebaseReady) {
        showToast('Google Sign-In requires Firebase setup. See console for instructions.', 'error');
        console.log(
            '%c📋 Firebase Setup Instructions',
            'color: #4285f4; font-size: 16px; font-weight: bold;',
            '\n\n1. Go to https://console.firebase.google.com',
            '\n2. Click "Create a project" → name it → Continue',
            '\n3. Click the web icon </> → name your app → Register',
            '\n4. Copy the firebaseConfig object',
            '\n5. Open js/firebase-config.js and paste the config',
            '\n6. Go to Authentication → Get Started',
            '\n7. Enable "Email/Password" and "Google" providers',
            '\n8. Refresh your app — Google Sign-In will work!\n'
        );
        return;
    }

    try {
        const result = await firebaseAuth.signInWithPopup(googleProvider);
        const firebaseUser = result.user;

        console.log('✅ Google Sign-In success:', firebaseUser.displayName);

        // Build local user and log in
        const user = firebaseUserToLocal(firebaseUser);
        let users = DB.get('users') || [];
        const idx = users.findIndex(u => u.email === user.email);
        if (idx >= 0) {
            users[idx] = { ...users[idx], ...user, lastLogin: Date.now() };
        } else {
            users.push(user);
        }
        DB.set('users', users);

        currentUser = users.find(u => u.email === user.email);
        DB.set('currentUser', currentUser);

        showToast('Welcome, ' + currentUser.name + '!', 'success');
        showPage('appPage');
        initApp();

    } catch (error) {
        console.error('Google Sign-In error:', error);

        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Sign-in cancelled', 'info');
        } else if (error.code === 'auth/network-request-failed') {
            showToast('Network error. Check your connection.', 'error');
        } else if (error.code === 'auth/unauthorized-domain') {
            showToast('This domain is not authorized. Add it in Firebase Console.', 'error');
        } else {
            showToast('Sign-in failed: ' + error.message, 'error');
        }
    }
}

// ========== FIREBASE EMAIL SIGNUP ==========
async function firebaseEmailSignup(name, email, password) {
    if (!firebaseReady) return false;

    try {
        const result = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: name });
        console.log('✅ Firebase email signup success');
        return true;
    } catch (error) {
        console.warn('Firebase signup (non-critical):', error.message);
        return false;
    }
}

// ========== FIREBASE EMAIL LOGIN ==========
async function firebaseEmailLogin(email, password) {
    if (!firebaseReady) return false;

    try {
        await firebaseAuth.signInWithEmailAndPassword(email, password);
        console.log('✅ Firebase email login success');
        return true;
    } catch (error) {
        console.warn('Firebase login (non-critical):', error.message);
        return false;
    }
}

// ========== FIREBASE SIGN-OUT ==========
function firebaseSignOut() {
    if (firebaseReady && firebaseAuth) {
        firebaseAuth.signOut().catch(e => console.warn('Firebase signout:', e));
    }
}

console.log('🔐 Firebase Auth module loaded');
