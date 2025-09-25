// Store Manager JavaScript
let currentUser = null;
let currentStore = null;
let currentFoodId = null;
let currentPromoId = null;
let foodsData = [];
let ordersData = [];
let promosData = [];
let categoriesData = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and role
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '../auth/login.html';
        return;
    }

    try {
        // Get current user info
        currentUser = await API.get('/auth/profile/');
        
        // Check if user has store manager role (role_id = 3)
        if (!currentUser.role_id || currentUser.role_id !== 3) {
            alert('Bạn không có quyền truy cập trang này!');
            window.location.href = '../index.html';
            return;
        }

        // Find user's store
        await findUserStore();
        
        // Update UI
        document.getElementById('user-name').textContent = currentUser.fullname || currentUser.username;
        
        // Load initial data
        await loadCategories();
        await loadDashboardStats();
        await loadFoods();
        await loadPromotions();
        await loadOrders();
        
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('access_token');
        window.location.href = '../auth/login.html';
    }
});

// Find the store that belongs to current user
async function findUserStore() {
    try {
        // Use the new my_store endpoint to get user's assigned store
        currentStore = await API.get('/stores/my_store/');
        document.getElementById('store-name').textContent = currentStore.store_name;
    } catch (error) {
        console.error('Error finding store:', error);
        alert('Bạn chưa được gán quản lý cửa hàng nào!');
        window.location.href = '../index.html';
    }
}

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    
    // Add active class to nav item
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    // Load section data if needed
    if (sectionName === 'foods') {
        loadFoods();
    } else if (sectionName === 'promotions') {
        loadPromotions();
    } else if (sectionName === 'orders') {
        loadOrders();
    } else if (sectionName === 'dashboard') {
        loadDashboardStats();
    }
}

// Dashboard functions
async function loadDashboardStats() {
    try {
        if (!currentStore) return;
        
        // Load store statistics from stores endpoint
        const stats = await API.get(`/stores/${currentStore.id}/stats/`);
        document.getElementById('total-foods').textContent = stats.total_foods || 0;
        document.getElementById('today-orders').textContent = stats.total_orders || 0;
        document.getElementById('today-revenue').textContent = formatPrice(stats.total_revenue || 0);
        
        // For pending orders, we can use the orders endpoint
        const ordersResponse = await API.get(`/stores/${currentStore.id}/orders/`);
        const pendingCount = ordersResponse.filter(o => o.order_status === 'Chờ xác nhận').length;
        document.getElementById('pending-orders').textContent = pendingCount;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Categories functions
async function loadCategories() {
    try {
        const response = await API.get('/menu/categories/');
        categoriesData = response.results;
        
        // Populate category filter
        const categoryFilter = document.getElementById('category-filter');
        const foodCategorySelect = document.getElementById('food-category');
        
        categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
        foodCategorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
        
        categoriesData.forEach(category => {
            const option1 = document.createElement('option');
            option1.value = category.id;
            option1.textContent = category.cate_name;
            categoryFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = category.id;
            option2.textContent = category.cate_name;
            foodCategorySelect.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Foods functions
async function loadFoods() {
    try {
        if (!currentStore) return;
        
        // Fetch foods for current store using the stores endpoint
        const response = await API.get(`/stores/${currentStore.id}/foods/`);
        foodsData = response;
        displayFoods(foodsData);
    } catch (error) {
        console.error('Error loading foods:', error);
        document.getElementById('foods-table-body').innerHTML = 
            '<tr><td colspan="6" class="text-center">Lỗi khi tải dữ liệu món ăn</td></tr>';
    }
}

function displayFoods(foods) {
    const tbody = document.getElementById('foods-table-body');
    
    if (!foods || foods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có món ăn nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = foods.map(food => {
        const category = categoriesData.find(cat => cat.id === food.category?.id) || food.category;
        const isAvailable = food.availability === 'Còn hàng';
        
        return `
            <tr>
                <td>
                    <img src="${food.image_url || getImageUrl(food.image)}" alt="${food.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>${food.title}</td>
                <td>${category?.cate_name || 'N/A'}</td>
                <td>${formatPrice(food.price)}</td>
                <td>
                    <span class="status-badge ${isAvailable ? 'available' : 'unavailable'}">
                        ${food.availability}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-edit" onclick="editFood(${food.id})">Sửa</button>
                        <button class="btn btn-sm btn-delete" onclick="deleteFood(${food.id})">Xóa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function searchFoods() {
    const searchTerm = document.getElementById('food-search').value.toLowerCase();
    const filtered = foodsData.filter(food => 
        food.title.toLowerCase().includes(searchTerm) ||
        food.description.toLowerCase().includes(searchTerm)
    );
    displayFoods(filtered);
}

function filterFoodsByCategory() {
    const categoryId = document.getElementById('category-filter').value;
    if (!categoryId) {
        displayFoods(foodsData);
        return;
    }
    
    const filtered = foodsData.filter(food => food.category?.id == categoryId);
    displayFoods(filtered);
}

// Food Modal functions
function openAddFoodModal() {
    currentFoodId = null;
    document.getElementById('food-modal-title').textContent = 'Thêm món ăn';
    document.getElementById('food-form').reset();
    document.getElementById('current-image').classList.add('hidden');
    document.getElementById('image-preview-container').classList.add('hidden');
    document.getElementById('food-modal').classList.remove('hidden');
}

function editFood(foodId) {
    const food = foodsData.find(f => f.id === foodId);
    if (!food) return;
    
    currentFoodId = foodId;
    document.getElementById('food-modal-title').textContent = 'Sửa món ăn';
    
    // Fill form
    document.getElementById('food-title').value = food.title;
    document.getElementById('food-description').value = food.description || '';
    document.getElementById('food-price').value = food.price;
    document.getElementById('food-category').value = food.category?.id || '';
    document.getElementById('food-availability').value = food.availability;
    
    // Show current image
    if (food.image) {
        document.getElementById('current-image').classList.remove('hidden');
        document.getElementById('current-image-preview').src = food.image_url || getImageUrl(food.image);
    }
    
    // Hide preview container for edit mode
    document.getElementById('image-preview-container').classList.add('hidden');
    
    document.getElementById('food-modal').classList.remove('hidden');
}

function closeFoodModal() {
    document.getElementById('food-modal').classList.add('hidden');
    document.getElementById('food-form').reset();
    document.getElementById('image-preview-container').classList.add('hidden');
    currentFoodId = null;
}

// Image Preview Functions
function handleImagePreview(input) {
    const file = input.files[0];
    const previewContainer = document.getElementById('image-preview-container');
    const preview = document.getElementById('image-preview');
    const imageName = document.getElementById('image-name');
    const imageSize = document.getElementById('image-size');
    
    if (!file) {
        previewContainer.classList.add('hidden');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh hợp lệ!');
        input.value = '';
        previewContainer.classList.add('hidden');
        return;
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('Kích thước file không được vượt quá 5MB!');
        input.value = '';
        previewContainer.classList.add('hidden');
        return;
    }
    
    // Read and display file
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
        imageName.textContent = file.name;
        imageSize.textContent = formatFileSize(file.size);
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImagePreview() {
    const fileInput = document.getElementById('food-image');
    const previewContainer = document.getElementById('image-preview-container');
    
    fileInput.value = '';
    previewContainer.classList.add('hidden');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Promotions functions
async function loadPromotions() {
    try {
        if (!currentStore) return;
        
        // Fetch promotions for current store (API will auto-filter by user's store)
        const response = await API.get('/promotions/');
        promosData = response;
        displayPromotions(promosData);
    } catch (error) {
        console.error('Error loading promotions:', error);
        document.getElementById('promos-table-body').innerHTML = 
            '<tr><td colspan="9" class="text-center">Lỗi khi tải dữ liệu khuyến mãi: ' + error.message + '</td></tr>';
    }
}

function displayPromotions(promos) {
    const tbody = document.getElementById('promos-table-body');
    
    if (!promos || promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Chưa có khuyến mãi nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = promos.map(promo => {
        const status = getPromoStatus(promo);
        const maxDiscount = promo.max_discount_amount 
            ? formatPrice(promo.max_discount_amount) 
            : 'Không giới hạn';
        
        const valueDisplay = promo.category === 'PERCENT' 
            ? `${promo.discount_value}%`
            : formatPrice(promo.discount_value);
            
        return `
            <tr>
                <td>${promo.id}</td>
                <td>${promo.name}</td>
                <td>
                    <span class="status-badge ${promo.category.toLowerCase()}">
                        ${promo.category === 'PERCENT' ? 'Giảm %' : 'Giảm tiền'}
                    </span>
                </td>
                <td class="promo-value">${valueDisplay}</td>
                <td>${formatPrice(promo.minimum_pay)}</td>
                <td>${maxDiscount}</td>
                <td class="promo-dates">
                    ${formatDateRange(promo.start_date, promo.end_date)}
                </td>
                <td>
                    <span class="status-badge ${status.class}">
                        ${status.text}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-edit" onclick="editPromo(${promo.id})">Sửa</button>
                        <button class="btn btn-sm btn-delete" onclick="deletePromo(${promo.id})">Xóa</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getPromoStatus(promo) {
    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);
    
    if (now < startDate) {
        return { class: 'upcoming', text: 'Sắp diễn ra' };
    } else if (now > endDate) {
        return { class: 'expired', text: 'Hết hạn' };
    } else {
        return { class: 'active', text: 'Đang hoạt động' };
    }
}

function formatDateRange(startDate, endDate) {
    const start = new Date(startDate).toLocaleDateString('vi-VN');
    const end = new Date(endDate).toLocaleDateString('vi-VN');
    return `${start} - ${end}`;
}

function searchPromos() {
    const searchTerm = document.getElementById('promo-search').value.toLowerCase();
    const filtered = promosData.filter(promo => 
        promo.name.toLowerCase().includes(searchTerm) ||
        promo.id.toString().includes(searchTerm)
    );
    displayPromotions(filtered);
}

function filterPromosByCategory() {
    const category = document.getElementById('promo-category-filter').value;
    if (!category) {
        displayPromotions(promosData);
        return;
    }
    
    const filtered = promosData.filter(promo => promo.category === category);
    displayPromotions(filtered);
}

function filterPromosByStatus() {
    const status = document.getElementById('promo-status-filter').value;
    if (!status) {
        displayPromotions(promosData);
        return;
    }
    
    const filtered = promosData.filter(promo => {
        const promoStatus = getPromoStatus(promo);
        return promoStatus.class === status;
    });
    displayPromotions(filtered);
}

// Promotion Modal functions
function openAddPromoModal() {
    currentPromoId = null;
    document.getElementById('promo-modal-title').textContent = 'Thêm khuyến mãi';
    document.getElementById('promo-form').reset();
    document.getElementById('max-discount-group').style.display = 'none';
    document.getElementById('promo-modal').classList.remove('hidden');
}

function editPromo(promoId) {
    const promo = promosData.find(p => p.id === promoId);
    if (!promo) return;
    
    currentPromoId = promoId;
    document.getElementById('promo-modal-title').textContent = 'Sửa khuyến mãi';
    
    // Fill form
    document.getElementById('promo-name').value = promo.name;
    document.getElementById('promo-category').value = promo.category;
    document.getElementById('promo-discount-value').value = promo.discount_value;
    document.getElementById('promo-minimum-pay').value = promo.minimum_pay;
    document.getElementById('promo-max-discount').value = promo.max_discount_amount || '';
    
    // Format dates for datetime-local input
    document.getElementById('promo-start-date').value = formatDateTimeLocal(promo.start_date);
    document.getElementById('promo-end-date').value = formatDateTimeLocal(promo.end_date);
    
    // Show/hide max discount field
    toggleMaxDiscountField();
    
    document.getElementById('promo-modal').classList.remove('hidden');
}

function closePromoModal() {
    document.getElementById('promo-modal').classList.add('hidden');
    document.getElementById('promo-form').reset();
    currentPromoId = null;
}

function toggleMaxDiscountField() {
    const category = document.getElementById('promo-category').value;
    const maxDiscountGroup = document.getElementById('max-discount-group');
    const discountValueHint = document.getElementById('discount-value-hint');
    
    if (category === 'PERCENT') {
        maxDiscountGroup.style.display = 'block';
        discountValueHint.textContent = 'Nhập phần trăm (0-100)';
    } else {
        maxDiscountGroup.style.display = 'none';
        discountValueHint.textContent = 'Nhập số tiền cố định';
    }
}

async function savePromoForm(event) {
    event.preventDefault();
    
    try {
        const formData = {
            name: document.getElementById('promo-name').value,
            category: document.getElementById('promo-category').value,
            discount_value: document.getElementById('promo-discount-value').value,
            minimum_pay: document.getElementById('promo-minimum-pay').value,
            start_date: document.getElementById('promo-start-date').value,
            end_date: document.getElementById('promo-end-date').value,
            store: currentStore.id
        };
        
        // Add max_discount_amount for PERCENT category
        if (formData.category === 'PERCENT') {
            const maxDiscount = document.getElementById('promo-max-discount').value;
            if (maxDiscount) {
                formData.max_discount_amount = maxDiscount;
            }
        }
        
        let response;
        if (currentPromoId) {
            // Update existing promotion
            response = await API.put(`/promotions/${currentPromoId}/update/`, formData);
        } else {
            // Create new promotion
            response = await API.post('/promotions/create/', formData);
        }
        
        alert(currentPromoId ? 'Cập nhật khuyến mãi thành công!' : 'Thêm khuyến mãi thành công!');
        closePromoModal();
        await loadPromotions();
        
    } catch (error) {
        console.error('Error saving promotion:', error);
        alert('Lỗi khi lưu khuyến mãi: ' + (error.message || 'Unknown error'));
    }
}

async function deletePromo(promoId) {
    if (!confirm('Bạn có chắc chắn muốn xóa khuyến mãi này?')) return;
    
    try {
        const response = await API.delete(`/promotions/${promoId}/delete/`);
        
        // Check if response indicates success
        if (response && (response.success === true || response.message)) {
            alert('Xóa khuyến mãi thành công!');
        } else {
            // Even if no explicit success response, still reload to check
            alert('Xóa khuyến mãi thành công!');
        }
        
        await loadPromotions();
    } catch (error) {
        console.error('Error deleting promotion:', error);
        
        // Check if the error is 404 - promotion might already be deleted
        if (error.message.includes('404') || error.message.includes('not found')) {
            alert('Khuyến mãi đã được xóa thành công!');
            await loadPromotions();
        } else {
            alert('Lỗi khi xóa khuyến mãi: ' + (error.message || 'Unknown error'));
        }
    }
}

function formatDateTimeLocal(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function saveFoodForm(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData();
        formData.append('title', document.getElementById('food-title').value);
        formData.append('description', document.getElementById('food-description').value);
        formData.append('price', document.getElementById('food-price').value);
        formData.append('category_id', document.getElementById('food-category').value);
        formData.append('store_id', currentStore.id);
        formData.append('availability', document.getElementById('food-availability').value);
        
        const imageFile = document.getElementById('food-image').files[0];
        if (imageFile) {
            formData.append('image_file', imageFile);
        }
        
        let response;
        if (currentFoodId) {
            // Update existing food
            response = await API.putFormData(`/menu/admin/foods/${currentFoodId}/`, formData);
        } else {
            // Create new food
            response = await API.postFormData('/menu/admin/foods/', formData);
        }
        
        alert(currentFoodId ? 'Cập nhật món ăn thành công!' : 'Thêm món ăn thành công!');
        closeFoodModal();
        await loadFoods();
        
    } catch (error) {
        console.error('Error saving food:', error);
        alert('Lỗi khi lưu món ăn: ' + (error.message || 'Unknown error'));
    }
}

async function deleteFood(foodId) {
    if (!confirm('Bạn có chắc chắn muốn xóa món ăn này?')) return;
    
    try {
        await API.delete(`/menu/admin/foods/${foodId}/`);
        alert('Xóa món ăn thành công!');
        await loadFoods();
    } catch (error) {
        console.error('Error deleting food:', error);
        alert('Lỗi khi xóa món ăn: ' + (error.message || 'Unknown error'));
    }
}

// Orders functions
async function loadOrders() {
    try {
        if (!currentStore) {
            console.log('No current store found');
            return;
        }
        
        console.log('Loading orders for store:', currentStore);
        
        // Fetch orders for this store using admin orders endpoint
        const response = await API.get('/orders/admin/');
        
        console.log('Orders API response:', response);
        
        // Check response structure based on views.py
        const orders = response.orders || response.results || response;
        
        if (!Array.isArray(orders)) {
            console.error('Orders is not an array:', orders);
            throw new Error('Invalid response format');
        }
        
        ordersData = orders.map(order => ({
            id: order.id,
            customer: order.user?.fullname || order.user?.username || 'N/A',
            customer_phone: order.user?.phone_number || order.phone_number || 'N/A',
            receiver_name: order.receiver_name,
            receiver_phone: order.phone_number,
            ship_address: order.ship_address,
            note: order.note,
            items: order.items || [],
            total: order.total_money || 0,
            payment_method: order.payment_method,
            shipping_fee: order.shipping_fee || 0,
            status: mapOrderStatus(order.order_status),
            order_status: order.order_status,
            created_date: order.created_date
        }));
        
        console.log('Processed orders data:', ordersData);
        displayOrders(ordersData);
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center">Lỗi khi tải dữ liệu đơn hàng: ' + error.message + '</td></tr>';
    }
}

function mapOrderStatus(status) {
    const statusMap = {
        'Chờ xác nhận': 'pending',
        'Đã xác nhận': 'confirmed', 
        'Đang chuẩn bị': 'preparing',
        'Sẵn sàng': 'ready',
        'Đang giao': 'shipping',
        'Đã giao': 'completed',
        'Đã hủy': 'cancelled'
    };
    return statusMap[status] || 'unknown';
}

function displayOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có đơn hàng nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.items.length > 0 ? order.items.map(item => item.food?.title || 'N/A').join(', ') : 'Không có món'}</td>
            <td>${formatPrice(order.total)}</td>
            <td>
                <span class="status-badge ${order.status}">
                    ${order.order_status}
                </span>
            </td>
            <td>${formatDateTime(order.created_date)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-view" onclick="viewOrderDetail(${order.id})">Xem</button>
                    ${order.status === 'pending' ? 
                        `<button class="btn btn-sm btn-primary" onclick="quickUpdateStatus(${order.id}, 'Đã xác nhận')">Xác nhận</button>` : ''}
                    ${order.status === 'confirmed' ? 
                        `<button class="btn btn-sm btn-primary" onclick="quickUpdateStatus(${order.id}, 'Đang chuẩn bị')">Chuẩn bị</button>` : ''}
                    ${order.status === 'preparing' ? 
                        `<button class="btn btn-sm btn-primary" onclick="quickUpdateStatus(${order.id}, 'Sẵn sàng')">Sẵn sàng</button>` : ''}
                    ${order.status === 'ready' ? 
                        `<button class="btn btn-sm btn-primary" onclick="quickUpdateStatus(${order.id}, 'Đang giao')">Giao hàng</button>` : ''}
                    ${order.status === 'shipping' ? 
                        `<button class="btn btn-sm btn-primary" onclick="quickUpdateStatus(${order.id}, 'Đã giao')">Hoàn thành</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function searchOrders() {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const filtered = ordersData.filter(order => 
        order.customer.toLowerCase().includes(searchTerm) ||
        order.receiver_name.toLowerCase().includes(searchTerm) ||
        order.id.toString().includes(searchTerm)
    );
    displayOrders(filtered);
}

function filterOrdersByStatus() {
    const status = document.getElementById('status-filter').value;
    if (!status) {
        displayOrders(ordersData);
        return;
    }
    
    const filtered = ordersData.filter(order => order.order_status === status);
    displayOrders(filtered);
}

function filterOrdersByDate() {
    const date = document.getElementById('date-filter').value;
    if (!date) {
        displayOrders(ordersData);
        return;
    }
    
    const filtered = ordersData.filter(order => {
        const orderDate = new Date(order.created_date).toISOString().split('T')[0];
        return orderDate === date;
    });
    displayOrders(filtered);
}

async function viewOrderDetail(orderId) {
    try {
        // Fetch detailed order information
        const order = ordersData.find(o => o.id === orderId);
        if (!order) return;
        
        const orderDetailHtml = `
            <div style="padding: 1.5rem;">
                <div class="order-header">
                    <h4>Đơn hàng #${order.id}</h4>
                    <span class="status-badge ${order.status}">${order.order_status}</span>
                </div>
                
                <div class="order-info-grid">
                    <div class="info-section">
                        <h5>Thông tin khách hàng</h5>
                        <p><strong>Tên khách hàng:</strong> ${order.customer}</p>
                        <p><strong>Số điện thoại:</strong> ${order.customer_phone}</p>
                    </div>
                    
                    <div class="info-section">
                        <h5>Thông tin người nhận</h5>
                        <p><strong>Tên người nhận:</strong> ${order.receiver_name}</p>
                        <p><strong>Số điện thoại:</strong> ${order.receiver_phone}</p>
                        <p><strong>Địa chỉ giao hàng:</strong> ${order.ship_address}</p>
                        ${order.note ? `<p><strong>Ghi chú:</strong> ${order.note}</p>` : ''}
                    </div>
                </div>
                
                <div class="info-section">
                    <h5>Danh sách món ăn</h5>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <div class="item-image">
                                    <img src="${item.food?.image_url || getImageUrl(item.food?.image)}" alt="${item.food?.title}">
                                </div>
                                <div class="item-info">
                                    <div class="item-name">${item.food?.title || 'N/A'}</div>
                                    ${item.food_note ? `<div class="item-note">Ghi chú: ${item.food_note}</div>` : ''}
                                </div>
                                <div class="item-quantity">x${item.quantity}</div>
                                <div class="item-price">${formatPrice(item.price)}</div>
                                <div class="item-subtotal">${formatPrice(item.subtotal)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="order-summary">
                    <div class="summary-row">
                        <span>Tạm tính:</span>
                        <span>${formatPrice(order.total - order.shipping_fee)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Phí giao hàng:</span>
                        <span>${formatPrice(order.shipping_fee)}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Tổng cộng:</span>
                        <span>${formatPrice(order.total)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Phương thức thanh toán:</span>
                        <span>${order.payment_method}</span>
                    </div>
                </div>
                
                <div class="status-update-section">
                    <h5>Cập nhật trạng thái đơn hàng</h5>
                    <div class="status-update-form">
                        <select id="new-status-${order.id}" class="status-select">
                            <option value="Chờ xác nhận" ${order.order_status === 'Chờ xác nhận' ? 'selected' : ''}>Chờ xác nhận</option>
                            <option value="Đã xác nhận" ${order.order_status === 'Đã xác nhận' ? 'selected' : ''}>Đã xác nhận</option>
                            <option value="Đang chuẩn bị" ${order.order_status === 'Đang chuẩn bị' ? 'selected' : ''}>Đang chuẩn bị</option>
                            <option value="Sẵn sàng" ${order.order_status === 'Sẵn sàng' ? 'selected' : ''}>Sẵn sàng</option>
                            <option value="Đang giao" ${order.order_status === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
                            <option value="Đã giao" ${order.order_status === 'Đã giao' ? 'selected' : ''}>Đã giao</option>
                            <option value="Đã hủy" ${order.order_status === 'Đã hủy' ? 'selected' : ''}>Đã hủy</option>
                        </select>
                        <button class="btn btn-primary" onclick="updateOrderStatus(${order.id})">Cập nhật trạng thái</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('order-detail-content').innerHTML = orderDetailHtml;
        document.getElementById('order-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading order detail:', error);
        alert('Lỗi khi tải chi tiết đơn hàng!');
    }
}

async function updateOrderStatus(orderId) {
    try {
        const newStatus = document.getElementById(`new-status-${orderId}`).value;
        
        if (!newStatus) {
            alert('Vui lòng chọn trạng thái!');
            return;
        }
        
        // Update order status via API
        await API.put(`/orders/admin/${orderId}/`, {
            order_status: newStatus
        });
        
        // Update local data
        const orderIndex = ordersData.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            ordersData[orderIndex].order_status = newStatus;
            ordersData[orderIndex].status = mapOrderStatus(newStatus);
        }
        
        alert('Cập nhật trạng thái đơn hàng thành công!');
        closeOrderModal();
        displayOrders(ordersData);
        
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Lỗi khi cập nhật trạng thái đơn hàng: ' + (error.message || 'Unknown error'));
    }
}

async function quickUpdateStatus(orderId, newStatus) {
    try {
        // Update order status via API
        await API.put(`/orders/admin/${orderId}/`, {
            order_status: newStatus
        });
        
        // Update local data
        const orderIndex = ordersData.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            ordersData[orderIndex].order_status = newStatus;
            ordersData[orderIndex].status = mapOrderStatus(newStatus);
        }
        
        alert('Cập nhật trạng thái đơn hàng thành công!');
        displayOrders(ordersData);
        
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Lỗi khi cập nhật trạng thái đơn hàng: ' + (error.message || 'Unknown error'));
    }
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        // Update order status in data (mock update)
        const order = ordersData.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            displayOrders(ordersData);
            alert('Cập nhật trạng thái đơn hàng thành công!');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Lỗi khi cập nhật trạng thái đơn hàng!');
    }
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
}

function getImageUrl(imagePath) {
    if (!imagePath) return '../assets/images/placeholder.png';
    if (imagePath.startsWith('http')) return imagePath;
    // Ensure correct path: avoid double 'assets/' prefix
    const normalizedPath = imagePath.startsWith('assets/') ? imagePath : `assets/${imagePath}`;
    // Return full URL to media
    return `http://localhost:8000/media/${normalizedPath}`;
}

function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '../auth/login.html';
    }
}
