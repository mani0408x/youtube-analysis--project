console.log('YouTube Analytics Platform Loaded');

// Check if user is already logged in
fetch('/auth/me')
    .then(res => res.json())
    .then(data => {
        if (data.authenticated) {
            window.location.href = '/dashboard';
        }
    })
    .catch(err => console.log('Auth check failed:', err));
