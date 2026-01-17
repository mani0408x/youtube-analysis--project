// Auth Logic: Email/Pass + Google

const API_BASE = '/auth';

// --- Shared Helper: Handle Auth Success ---
function handleAuthSuccess(data) {
    if (data.status === 'success' && data.token) {
        console.log("Auth Success:", data);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));

        // Redirect based on params
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        if (redirect === 'my-channels') {
            window.location.href = '/dashboard#section-my-channels';
        } else {
            window.location.href = '/dashboard';
        }
    } else {
        alert('Authentication failed: Invalid response from server.');
    }
}

// --- Email / Password Login ---
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button');

    try {
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            handleAuthSuccess(data);
        } else {
            alert(data.error || 'Login failed');
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    } catch (err) {
        console.error(err);
        alert('Network error during login');
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// --- Email / Password Signup ---
async function handleSignupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const btn = e.target.querySelector('button');

    try {
        btn.disabled = true;
        btn.textContent = 'Creating Account...';

        const res = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        if (res.ok) {
            handleAuthSuccess(data);
        } else {
            alert(data.error || 'Signup failed');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    } catch (err) {
        console.error(err);
        alert('Network error during signup');
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

// --- Google Auth ---
window.handleGoogleCredentialResponse = (response) => {
    console.log("Google Token received. Verifying...");

    // Verify with backend
    fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: response.credential })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                handleAuthSuccess(data);
            } else {
                alert('Google Login validation failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch((error) => {
            console.error("Google Login Error:", error);
            alert("Google Login error: " + error.message);
        });
}

function initGoogleAuth() {
    fetch('/api/config/public')
        .then(res => res.json())
        .then(config => {
            if (config.google_client_id) {
                // Initialize
                google.accounts.id.initialize({
                    client_id: config.google_client_id,
                    callback: window.handleGoogleCredentialResponse
                });

                // Render Button if container exists (in login.html)
                const googleBtnParams = {
                    theme: 'filled_black',
                    size: 'large',
                    text: 'continue_with',
                    width: 250
                };

                const btnContainer = document.getElementById("g_id_signin");
                if (btnContainer) {
                    google.accounts.id.renderButton(btnContainer, googleBtnParams);
                }

            } else {
                console.error("CRITICAL: Google Client ID is missing in backend config.");
                // visible feedback
                const btnContainer = document.getElementById("g_id_signin");
                if (btnContainer) {
                    btnContainer.innerHTML = '<div style="color: grey; text-align: center; font-size: 0.9em; margin-top: 10px;">(Google Sign-In unavailable: Missing Client ID)</div>';
                }
            }
        })
        .catch(e => {
            console.error("Config fetch error:", e);
        });
}

// --- Initialization ---
window.addEventListener('load', () => {
    // Check if we are on login page
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
        initGoogleAuth();
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }
});

// Logout Helper
window.handleSignOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    sessionStorage.removeItem('auto_analyzed');
    if (window.google && window.google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    window.location.href = '/'; // Redirect to Landing Page
};

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.handleSignOut();
    });
}
