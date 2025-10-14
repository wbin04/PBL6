// Promotions page functionality
let allPromotions = [];
let allStores = [];
let filteredPromotions = [];
let isInitialized = false;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (isInitialized) return;
    isInitialized = true;
    
    // Ensure modal is hidden on page load
    const modal = document.getElementById('promo-details-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    
    // Wait for other scripts to load
    setTimeout(() => {
        // Check if API is available
        if (typeof API === 'undefined') {
            console.error('API not loaded, showing error message');
            showError('Không thể kết nối đến server. Vui lòng thử lại sau.');
            return;
        }
        
        // Initialize auth UI if available
        if (typeof updateAuthUI === 'function') {
            updateAuthUI();
        }
        
        // Initialize cart count if available
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
        
        // Start main initialization
        initializePage();
    }, 100);
});

async function initializePage() {
    try {
        // Load stores for filter
        await loadStores();
        
        // Load and display promotions
        await loadPromotions();
        
    } catch (error) {
        console.error('Error initializing promotions page:', error);
        showError('Có lỗi khi tải trang khuyến mãi');
    }
}

// Load all stores for filter dropdown
async function loadStores() {
    try {
        // Ensure API is available
        if (typeof API === 'undefined') {
            throw new Error('API not available');
        }
        
        const stores = await API.get('/stores/');
        
        // Add system store manually for promotions filtering
        const systemStore = {
            id: 0,
            store_name: 'Toàn hệ thống'
        };
        
        allStores = [systemStore, ...stores];
        
        const storeFilter = document.getElementById('store-filter');
        if (!storeFilter) {
            console.error('Store filter element not found');
            return;
        }
        
        storeFilter.innerHTML = '<option value="">Tất cả cửa hàng</option>';
        
        allStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.store_name;
            storeFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading stores:', error);
        // Show user-friendly error
        const storeFilter = document.getElementById('store-filter');
        if (storeFilter) {
            storeFilter.innerHTML = '<option value="">Lỗi tải cửa hàng</option>';
        }
    }
}

// Load all active promotions
async function loadPromotions() {
    try {
        showLoading();
        
        // Ensure API is available
        if (typeof API === 'undefined') {
            throw new Error('API not available');
        }
        
        // Get all active promotions (public endpoint)
        const promotions = await API.get('/promotions/');
        allPromotions = promotions;
        filteredPromotions = [...promotions];
        
        displayPromotions(filteredPromotions);
        
    } catch (error) {
        console.error('Error loading promotions:', error);
        showError('Không thể tải danh sách khuyến mãi: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Display promotions in grid
function displayPromotions(promotions) {
    const grid = document.getElementById('promotions-grid');
    const noPromotions = document.getElementById('no-promotions');
    
    if (promotions.length === 0) {
        grid.innerHTML = '';
        noPromotions.classList.remove('hidden');
        return;
    }
    
    noPromotions.classList.add('hidden');
    
    grid.innerHTML = promotions.map(promo => createPromotionCard(promo)).join('');
}

// Create promotion card HTML
function createPromotionCard(promo) {
    // Handle store name - special case for store_id=0 (system-wide)
    let storeName = 'Cửa hàng không xác định';
    
    if (promo.store_id === 0) {
        storeName = 'Toàn hệ thống';
    } else if (allStores && Array.isArray(allStores) && promo.store_id !== null && promo.store_id !== undefined) {
        // Find store by ID with proper type comparison and null checks
        let store = null;
        
        // Try different comparison methods
        // Method 1: Direct comparison
        store = allStores.find(s => s && s.id === promo.store_id);
        
        // Method 2: String comparison
        if (!store) {
            store = allStores.find(s => {
                if (s && s.id !== null && s.id !== undefined) {
                    return s.id.toString() === promo.store_id.toString();
                }
                return false;
            });
        }
        
        // Method 3: Number comparison
        if (!store) {
            store = allStores.find(s => {
                if (s && s.id !== null && s.id !== undefined) {
                    return Number(s.id) === Number(promo.store_id);
                }
                return false;
            });
        }
        
        if (store) {
            storeName = store.store_name || `Cửa hàng ID: ${promo.store_id}`;
        } else {
            storeName = `Cửa hàng ID: ${promo.store_id}`;
        }
    } else if (promo.store_id !== null && promo.store_id !== undefined) {
        storeName = `Cửa hàng ID: ${promo.store_id}`;
    }
    
    // Calculate promotion status
    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);
    
    let status = 'active';
    let statusText = 'Đang hoạt động';
    
    if (now < startDate) {
        status = 'upcoming';
        statusText = 'Sắp diễn ra';
    } else if (now > endDate) {
        status = 'expired';
        statusText = 'Đã hết hạn';
    }
    
    // Format discount value
    let discountDisplay = '';
    if (promo.category === 'PERCENT') {
        discountDisplay = `${promo.discount_value}%`;
    } else {
        discountDisplay = `${formatCurrency(promo.discount_value)}`;
    }
    
    return `
        <div class="promotion-card" onclick="showPromotionDetails(${promo.id})">
            <div class="promotion-header">
                <div class="promotion-badge">${promo.category === 'PERCENT' ? 'Giảm %' : 'Giảm tiền'}</div>
                <h3 class="promotion-title">${promo.name}</h3>
            </div>
            
            <div class="promotion-body">
                <div class="promotion-discount">
                    <span class="discount-value">${discountDisplay}</span>
                    <span class="discount-type">${promo.category === 'PERCENT' ? 'Giảm giá' : 'Giảm tiền'}</span>
                </div>
                
                <div class="promotion-details">
                    <div class="detail-row">
                        <span class="detail-label">Đơn tối thiểu:</span>
                        <span class="detail-value">${formatCurrency(promo.minimum_pay)}</span>
                    </div>
                    ${promo.max_discount_amount ? `
                        <div class="detail-row">
                            <span class="detail-label">Giảm tối đa:</span>
                            <span class="detail-value">${formatCurrency(promo.max_discount_amount)}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Có hiệu lực đến:</span>
                        <span class="detail-value">${formatDate(promo.end_date)}</span>
                    </div>
                </div>
            </div>
            
            <div class="promotion-footer">
                <span class="promotion-store">📍 ${storeName}</span>
                <span class="promotion-status status-${status}">${statusText}</span>
            </div>
        </div>
    `;
}

// Filter promotions by store
function filterPromotionsByStore() {
    const storeId = document.getElementById('store-filter').value;
    applyFilters();
}

// Filter promotions by type
function filterPromotionsByType() {
    applyFilters();
}

// Apply all filters
function applyFilters() {
    const storeId = document.getElementById('store-filter').value;
    const promoType = document.getElementById('promo-type-filter').value;
    
    filteredPromotions = allPromotions.filter(promo => {
        // Store filter
        if (storeId) {
            // If a specific store is selected, show promotions for that store AND system-wide promotions (store_id=0)
            if (promo.store_id.toString() !== storeId && promo.store_id !== 0) {
                return false;
            }
        }
        // If no store selected (storeId is empty), show all promotions including system-wide ones
        
        // Type filter
        if (promoType && promo.category !== promoType) {
            return false;
        }
        
        return true;
    });
    
    displayPromotions(filteredPromotions);
}

// Show promotion details in modal
function showPromotionDetails(promoId) {
    const promo = allPromotions.find(p => p.id === promoId);
    if (!promo) {
        console.error('Promotion not found:', promoId);
        return;
    }
    
    // Handle store name - special case for store_id=0 (system-wide)
    let storeName = 'Cửa hàng không xác định';
    
    if (promo.store_id === 0) {
        storeName = 'Toàn hệ thống';
    } else if (allStores && Array.isArray(allStores) && promo.store_id !== null && promo.store_id !== undefined) {
        // Find store by ID with proper type comparison and null checks
        let store = null;
        
        // Try different comparison methods
        // Method 1: Direct comparison
        store = allStores.find(s => s && s.id === promo.store_id);
        
        // Method 2: String comparison
        if (!store) {
            store = allStores.find(s => {
                if (s && s.id !== null && s.id !== undefined) {
                    return s.id.toString() === promo.store_id.toString();
                }
                return false;
            });
        }
        
        // Method 3: Number comparison
        if (!store) {
            store = allStores.find(s => {
                if (s && s.id !== null && s.id !== undefined) {
                    return Number(s.id) === Number(promo.store_id);
                }
                return false;
            });
        }
        
        if (store) {
            storeName = store.store_name || `Cửa hàng ID: ${promo.store_id}`;
        } else {
            storeName = `Cửa hàng ID: ${promo.store_id}`;
        }
    } else if (promo.store_id !== null && promo.store_id !== undefined) {
        storeName = `Cửa hàng ID: ${promo.store_id}`;
    }
    
    const modal = document.getElementById('promo-details-modal');
    const title = document.getElementById('modal-promo-title');
    const content = document.getElementById('modal-promo-content');
    
    title.textContent = promo.name;
    
    content.innerHTML = `
        <div class="promo-detail-content">
            <div class="promo-main-info">
                <h4>Chi tiết khuyến mãi</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Loại khuyến mãi:</strong>
                        <span>${promo.category === 'PERCENT' ? 'Giảm theo phần trăm' : 'Giảm số tiền cố định'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Giá trị giảm:</strong>
                        <span>${promo.category === 'PERCENT' ? promo.discount_value + '%' : formatCurrency(promo.discount_value)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Đơn hàng tối thiểu:</strong>
                        <span>${formatCurrency(promo.minimum_pay)}</span>
                    </div>
                    ${promo.max_discount_amount ? `
                        <div class="detail-item">
                            <strong>Giảm tối đa:</strong>
                            <span>${formatCurrency(promo.max_discount_amount)}</span>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <strong>Thời gian áp dụng:</strong>
                        <span>${formatDate(promo.start_date)} - ${formatDate(promo.end_date)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Cửa hàng:</strong>
                        <span>${storeName}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal-open class to body and show modal
    document.body.classList.add('modal-open');
    
    // Remove hidden class first
    modal.classList.remove('hidden');
    
    // Force modal to cover full screen with inline styles
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.zIndex = '1001';
    modal.style.margin = '0';
    modal.style.padding = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
}

// Close promotion details modal
function closePromoDetailsModal() {
    const modal = document.getElementById('promo-details-modal');
    
    // Remove modal-open class from body and hide modal
    document.body.classList.remove('modal-open');
    
    // Add hidden class first
    modal.classList.add('hidden');
    
    // Clear inline styles
    modal.style.position = '';
    modal.style.top = '';
    modal.style.left = '';
    modal.style.right = '';
    modal.style.bottom = '';
    modal.style.width = '';
    modal.style.height = '';
    modal.style.zIndex = '';
    modal.style.margin = '';
    modal.style.padding = '';
    modal.style.background = '';
    modal.style.display = 'none';
    modal.style.justifyContent = '';
    modal.style.alignItems = '';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
}

// Go to menu page
function goToMenu() {
    // Get the currently opened promotion's store_id
    const modal = document.getElementById('promo-details-modal');
    const promoTitle = document.getElementById('modal-promo-title').textContent;
    
    // Find the promotion by title to get store_id
    const currentPromo = allPromotions.find(p => p.name === promoTitle);
    
    if (!currentPromo) {
        // Fallback: go to categories page without filter
        window.location.href = '../menu/categories.html';
        return;
    }
    
    // If store_id is 0 (system-wide), go to categories page to show all stores
    if (currentPromo.store_id === 0) {
        window.location.href = '../menu/categories.html';
    } else {
        // Go directly to items page filtered by the promotion's store
        window.location.href = `../menu/items.html?store=${currentPromo.store_id}`;
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('promotions-grid').style.display = 'none';
    document.getElementById('no-promotions').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('promotions-grid').style.display = 'grid';
}

function showError(message) {
    const grid = document.getElementById('promotions-grid');
    grid.innerHTML = `
        <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">
            <h3>Có lỗi xảy ra</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadPromotions()">Thử lại</button>
        </div>
    `;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('promo-details-modal');
    if (event.target === modal) {
        closePromoDetailsModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closePromoDetailsModal();
    }
});

// Fallback functions for missing dependencies
if (typeof logout === 'undefined') {
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    };
}
