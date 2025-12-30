import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Login Function
window.signInWithGoogle = () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("Firebase Auth Success:", user.displayName);
            return user.getIdToken();
        })
        .then((token) => {
            // Send token to backend
            return fetch('/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: token })
            });
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                window.location.href = '/dashboard';
            } else {
                alert('Login verification failed: ' + (data.message || 'Unknown error'));
            }
        })
        .catch((error) => {
            console.error("Login Error:", error);
            alert("Login Failed: " + error.message);
        });
};

// Logout Function
window.handleSignOut = () => {
    signOut(auth).then(() => {
        window.location.href = '/';
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
};

// Event Listeners
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.signInWithGoogle();
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.handleSignOut();
    });
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user.email);
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fab fa-google"></i> Go to Dashboard';
                loginBtn.onclick = () => window.location.href = '/dashboard';
                // Remove the previous event listener if possible, or just override behavior
            }
        }
    } else {
        console.log("User is signed out");
        if (window.location.pathname.includes('dashboard')) {
            window.location.href = '/';
        }
    }
});
