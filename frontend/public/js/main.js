console.log('YouTube Analytics Platform Loaded');

// Check if user is already logged in
const token = localStorage.getItem('auth_token');
if (token) {
    fetch('/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.authenticated) {
                window.location.href = '/dashboard';
            }
        })
        .catch(err => console.log('Auth check failed:', err));
}
