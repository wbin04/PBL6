// Authentication utilities
function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function getUserRole() {
    const user = getCurrentUser();
    return user?.role_id || null;
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login.html';
}

function requireAuth() {
    if (!isAuthenticated()) {
        alert('Vui lòng đăng nhập để tiếp tục');
        window.location.href = '/auth/login.html';
        return false;
    }
    return true;
}

function requireRole(requiredRole) {
    const userRole = getUserRole();
    if (userRole !== requiredRole) {
        alert('Bạn không có quyền truy cập trang này');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Update UI based on auth status
function updateAuthUI() {
    const userMenu = document.getElementById('user-menu');
    const guestMenu = document.getElementById('guest-menu');
    const userNameSpan = document.getElementById('user-name');
    
    if (isAuthenticated()) {
        const user = getCurrentUser();
        if (userMenu) userMenu.classList.remove('hidden');
        if (guestMenu) guestMenu.classList.add('hidden');
        if (userNameSpan) userNameSpan.textContent = user.username;
    } else {
        if (userMenu) userMenu.classList.add('hidden');
        if (guestMenu) guestMenu.classList.remove('hidden');
    }
}

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', updateAuthUI);
