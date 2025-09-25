// Main application logic
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app
    updateAuthUI();
    updateCartCount();
    
    // Load featured categories on home page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadFeaturedCategories();
    }
});

async function updateAuthUI() {
    const token = localStorage.getItem('access_token');
    const guestMenu = document.getElementById('guest-menu');
    const userMenu = document.getElementById('user-menu');
    const adminLink = document.getElementById('admin-link');
    const userNameElement = document.getElementById('user-name');

    if (token) {
        try {
            // Get user profile to check role
            const user = await API.get('/auth/profile/');
            
            if (guestMenu) guestMenu.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userNameElement) userNameElement.textContent = user.username;
            
            // Show admin link if user has admin role (role_id = 2)
            if (adminLink && user.role_id === 2) {
                adminLink.classList.remove('hidden');
            } else if (adminLink) {
                adminLink.classList.add('hidden');
            }
            
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Token might be invalid
            logout();
        }
    } else {
        if (guestMenu) guestMenu.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        if (adminLink) adminLink.classList.add('hidden');
    }
}

async function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
}

async function updateCartCount() {
    const token = localStorage.getItem('access_token');
    const cartCountElement = document.getElementById('cart-count');
    
    if (!token || !cartCountElement) return;
    
    try {
        const cart = await API.get('/cart/');
        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        cartCountElement.style.display = totalItems > 0 ? 'inline' : 'none';
    } catch (error) {
        console.error('Error loading cart count:', error);
        cartCountElement.textContent = '0';
        cartCountElement.style.display = 'none';
    }
}

async function loadFeaturedCategories() {
    try {
        const categories_response = await API.get('/menu/categories/');
        const categories = categories_response.results;
        const container = document.getElementById('categories-grid');
        
        if (container) {
            container.innerHTML = categories.slice(0, 6).map(category => `
                <div class="category-card" onclick="viewCategory(${category.id})">
                    <img src="${getImageUrl(category.image)}" alt="${category.cate_name}">
                    <h3>${category.cate_name}</h3>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading featured categories:', error);
    }
}

function viewCategory(categoryId) {
    window.location.href = `menu/items.html?category=${categoryId}`;
}

// Utility functions
function getImageUrl(imagePath) {
    if (!imagePath) return 'https://via.placeholder.com/200';
    if (imagePath.startsWith('http')) return imagePath;
    let fullUrl;
    if (imagePath.startsWith('/media/')) {
        fullUrl = `http://localhost:8000${imagePath}`;
    } else {
        fullUrl = `http://localhost:8000/media/${imagePath}`;
    }
    // Encode URI to handle spaces and special characters
    // Append timestamp to avoid browser caching old images
    return encodeURI(fullUrl) + `?v=${new Date().getTime()}`;
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Đang tải...</div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loading = element.querySelector('.loading');
        if (loading) loading.remove();
    }
}

// Order status helpers
function getStatusText(status) {
    const statusMap = {
        'PENDING': 'Chờ thanh toán',
        'PAID': 'Đã thanh toán',
        'PREPARING': 'Đang chuẩn bị',
        'READY': 'Sẵn sàng',
        'COMPLETED': 'Hoàn thành',
        'CANCELLED': 'Đã huỷ'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'PENDING': 'status-pending',
        'PAID': 'status-paid',
        'PREPARING': 'status-preparing',
        'READY': 'status-ready',
        'COMPLETED': 'status-completed',
        'CANCELLED': 'status-cancelled'
    };
    return classMap[status] || 'status-default';
}

function displayFoods(foods) {
    const container = document.getElementById('foods-list');
    if (!container) return;

    container.innerHTML = foods.map(food => `
                    <div class="food-card" data-food-id="${food.id}">
                        <img src="${getImageUrl(food.image)}" alt="${food.name}">
                        <h3>${food.name}</h3>
                        <p class="price">${formatPrice(food.price)}</p>
                        <div class="food-rating">
                            <span class="stars">${'★'.repeat(Math.floor(food.average_rating || 0))}${'☆'.repeat(5 - Math.floor(food.average_rating || 0))}</span>
                            <span class="rating-count clickable" onclick="toggleRatings(${food.id})">(${food.rating_count} đánh giá)</span>
                        </div>
                    </div>
                `).join('');
}

// Open ratings modal
function toggleRatings(foodId) {
    // Load ratings into modal and show
    loadRatings(foodId);
    const overlay = document.getElementById('rating-modal-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

// Close modal on X button
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('rating-modal-close');
    const overlay = document.getElementById('rating-modal-overlay');
    if (closeBtn && overlay) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.add('hidden');
        });
    }
});

async function loadRatings(foodId) {
    try {
        // Fetch ratings for the specific food
        const ratings = await API.get(`/ratings/?food=${foodId}`);
        const modalContent = document.getElementById('rating-modal-content');
        if (modalContent) {
            if (!ratings || ratings.length === 0) {
                modalContent.innerHTML = `<div class="no-ratings">Chưa có đánh giá nào</div>`;
            } else {
                // Normalize star count
                const normalized = ratings.map(r => ({
                    ...r,
                    stars: r.rating !== undefined ? r.rating : r.rating_value
                }));
                modalContent.innerHTML = normalized.map(rating => `
                <div class="rating-item">
                    <div class="rating-user"><strong>${rating.username}</strong></div>
                    <div class="rating-stars">
                        ${'★'.repeat(Math.floor(rating.stars))}${'☆'.repeat(5 - Math.floor(rating.stars))}
                    </div>
                    <div class="rating-content">${rating.content}</div>
                </div>
            `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading ratings:', error);
    }
}
