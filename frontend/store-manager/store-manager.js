// Store Manager Panel JavaScript
class StoreManager {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.mediaURL = 'http://localhost:8000/media';
        this.currentPage = 1;
        this.currentSection = 'dashboard';
        this.currentUser = null;
        this.storeId = null;
        this.storeName = '';
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadUserStore();
    }

    checkAuth() {
        if (!isAuthenticated()) {
            alert('Bạn cần đăng nhập để truy cập trang này!');
            window.location.href = '../auth/login.html';
            return;
        }
        
        // Verify store manager access
        this.verifyStoreAccess();
    }

    async verifyStoreAccess() {
        try {
            const user = await API.get('/auth/profile/');
            this.currentUser = user;
            
            // Check if user has Store role (ID = 3 or role name = 'Cửa hàng')
            if (user.role !== 'Cửa hàng' && user.role_id !== 3) {
                alert('Bạn không có quyền truy cập trang này!');
                window.location.href = '../index.html';
                return;
            }
            
            console.log('Store manager access verified for user:', user);
        } catch (error) {
            console.error('Error verifying access:', error);
            alert('Lỗi xác thực quyền truy cập!');
            window.location.href = '../auth/login.html';
        }
    }

    async loadUserStore() {
        try {
            // For now, assume the user is associated with the first store
            // In a real implementation, this would be based on user's store assignment
            const storesResponse = await API.get('/stores/');
            if (storesResponse && storesResponse.results && storesResponse.results.length > 0) {
                this.storeId = storesResponse.results[0].id;
                this.storeName = storesResponse.results[0].store_name;
                document.getElementById('store-name').textContent = this.storeName;
            } else {
                // If no stores exist, use a default store ID
                this.storeId = 1;
                this.storeName = 'Cửa hàng mặc định';
                document.getElementById('store-name').textContent = this.storeName;
            }
            
            // Load initial dashboard
            this.loadDashboard();
        } catch (error) {
            console.error('Error loading store info:', error);
            this.storeId = 1;
            this.storeName = 'Cửa hàng mặc định';
            document.getElementById('store-name').textContent = this.storeName;
            this.loadDashboard();
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Food management
        document.getElementById('add-food-btn').addEventListener('click', () => {
            this.showFoodModal();
        });

        document.getElementById('search-foods-btn').addEventListener('click', () => {
            this.loadFoods(1);
        });

        document.getElementById('food-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadFoods(1);
            }
        });

        // Order management
        document.getElementById('filter-orders-btn').addEventListener('click', () => {
            this.loadOrders(1);
        });

        // Food form submission
        document.getElementById('food-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFoodData();
        });

        // Modal close events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Image preview
        document.getElementById('food-image').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('food-image-preview');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;

        // Load data for section
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'foods':
                this.loadCategories();
                this.loadFoods();
                break;
            case 'orders':
                this.loadOrders();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load dashboard statistics for the store
            const [foodsResponse, ordersResponse] = await Promise.all([
                API.get(`/menu/items/?store=${this.storeId}`),
                API.get(`/orders/?store=${this.storeId}`)
            ]);

            // Update statistics
            document.getElementById('total-store-foods').textContent = foodsResponse.count || 0;
            
            if (ordersResponse && ordersResponse.results) {
                const today = new Date().toISOString().split('T')[0];
                const todayOrders = ordersResponse.results.filter(order => 
                    order.created_date && order.created_date.startsWith(today)
                );
                const pendingOrders = ordersResponse.results.filter(order => 
                    order.order_status === 'PENDING' || order.order_status === 'PAID'
                );
                
                document.getElementById('total-store-orders').textContent = todayOrders.length;
                document.getElementById('pending-orders').textContent = pendingOrders.length;
                
                // Calculate daily revenue
                const dailyRevenue = todayOrders.reduce((sum, order) => 
                    sum + parseFloat(order.total_money || 0), 0
                );
                document.getElementById('daily-revenue').textContent = 
                    parseInt(dailyRevenue).toLocaleString('vi-VN') + 'đ';
                
                // Load recent orders
                this.renderRecentOrders(ordersResponse.results.slice(0, 5));
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Set default values on error
            document.getElementById('total-store-foods').textContent = '0';
            document.getElementById('total-store-orders').textContent = '0';
            document.getElementById('pending-orders').textContent = '0';
            document.getElementById('daily-revenue').textContent = '0đ';
        }
    }

    renderRecentOrders(orders) {
        const tbody = document.getElementById('recent-orders-table');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Không có đơn hàng nào</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.receiver_name || 'N/A'}</td>
                <td>${parseInt(order.total_money).toLocaleString('vi-VN')}đ</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(order.order_status)}">
                        ${this.getStatusText(order.order_status)}
                    </span>
                </td>
                <td>${new Date(order.created_date).toLocaleString('vi-VN')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="storeManager.viewOrderDetail(${order.id})">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadCategories() {
        try {
            const response = await API.get('/menu/categories/');
            const categories = response.results || response;
            
            // Populate category filter
            const categoryFilter = document.getElementById('food-category-filter');
            const foodCategorySelect = document.getElementById('food-category');
            
            [categoryFilter, foodCategorySelect].forEach(select => {
                if (select) {
                    // Clear existing options (except first one for filter)
                    const isFilter = select.id === 'food-category-filter';
                    select.innerHTML = isFilter ? '<option value="">Tất cả danh mục</option>' : '<option value="">Chọn danh mục</option>';
                    
                    categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category.id;
                        option.textContent = category.cate_name;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadFoods(page = 1) {
        try {
            const searchQuery = document.getElementById('food-search').value.trim();
            const categoryFilter = document.getElementById('food-category-filter').value;
            
            let url = `/menu/items/?store=${this.storeId}&page=${page}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            if (categoryFilter) url += `&category=${categoryFilter}`;
            
            const response = await API.get(url);
            this.renderFoodsTable(response.results || []);
            
            // Render pagination
            if (response.count) {
                const totalPages = Math.ceil(response.count / 12);
                this.renderPagination('foods', page, totalPages);
            }
        } catch (error) {
            console.error('Error loading foods:', error);
            this.renderFoodsTable([]);
        }
    }

    renderFoodsTable(foods) {
        const tbody = document.getElementById('foods-table-body');
        
        if (!foods || foods.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Không có món ăn nào</td></tr>';
            return;
        }

        tbody.innerHTML = foods.map(food => `
            <tr>
                <td>${food.id}</td>
                <td>
                    ${food.image ? `<img src="${food.image.startsWith('http') ? food.image : this.mediaURL + '/' + food.image}" alt="${food.title}">` : 'No image'}
                </td>
                <td>${food.title}</td>
                <td>${food.description || 'N/A'}</td>
                <td>${parseInt(food.price).toLocaleString('vi-VN')}đ</td>
                <td>${food.category?.cate_name || 'N/A'}</td>
                <td>
                    <span class="status-badge ${food.availability === 'Còn hàng' ? 'status-available' : 'status-unavailable'}">
                        ${food.availability}
                    </span>
                </td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="storeManager.editFood(${food.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="storeManager.deleteFood(${food.id})">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async showFoodModal(food = null) {
        const foodModal = document.getElementById('food-modal');
        const title = document.getElementById('food-modal-title');
        const foodImagePreview = document.getElementById('food-image-preview');
        
        if (food) {
            title.textContent = 'Chỉnh sửa món ăn';
            document.getElementById('food-id').value = food.id;
            document.getElementById('food-title').value = food.title;
            document.getElementById('food-description').value = food.description || '';
            document.getElementById('food-price').value = food.price;
            document.getElementById('food-category').value = food.category?.id || '';
            document.getElementById('food-availability').value = food.availability;
            
            // Show existing image preview
            if (food.image) {
                foodImagePreview.src = food.image.startsWith('http') ? food.image : this.mediaURL + '/' + food.image;
                foodImagePreview.style.display = 'block';
            } else {
                foodImagePreview.style.display = 'none';
            }
        } else {
            title.textContent = 'Thêm món ăn mới';
            document.getElementById('food-form').reset();
            document.getElementById('food-id').value = '';
            foodImagePreview.style.display = 'none';
        }
        
        foodModal.style.display = 'block';
    }

    async editFood(foodId) {
        try {
            const food = await API.get(`/menu/items/${foodId}/`);
            this.showFoodModal(food);
        } catch (error) {
            console.error('Error loading food details:', error);
            alert('Lỗi tải thông tin món ăn!');
        }
    }

    async saveFoodData() {
        try {
            const formData = new FormData();
            const foodId = document.getElementById('food-id').value;
            
            formData.append('title', document.getElementById('food-title').value);
            formData.append('description', document.getElementById('food-description').value);
            formData.append('price', document.getElementById('food-price').value);
            formData.append('category', document.getElementById('food-category').value);
            formData.append('availability', document.getElementById('food-availability').value);
            formData.append('store', this.storeId); // Assign to current store
            
            const imageFile = document.getElementById('food-image').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            }
            
            let response;
            if (foodId) {
                // Update existing food
                response = await API.put(`/menu/items/${foodId}/`, formData);
            } else {
                // Create new food
                response = await API.post('/menu/items/', formData);
            }
            
            this.showSuccess(foodId ? 'Cập nhật món ăn thành công!' : 'Thêm món ăn mới thành công!');
            this.closeModals();
            this.loadFoods(this.currentPage);
        } catch (error) {
            console.error('Error saving food:', error);
            this.showError('Lỗi lưu thông tin món ăn!');
        }
    }

    async deleteFood(foodId) {
        if (!confirm('Bạn có chắc chắn muốn xóa món ăn này?')) {
            return;
        }
        
        try {
            await API.delete(`/menu/items/${foodId}/`);
            this.showSuccess('Xóa món ăn thành công!');
            this.loadFoods(this.currentPage);
        } catch (error) {
            console.error('Error deleting food:', error);
            this.showError('Lỗi xóa món ăn!');
        }
    }

    async loadOrders(page = 1) {
        try {
            const statusFilter = document.getElementById('order-status-filter').value;
            
            let url = `/orders/?store=${this.storeId}&page=${page}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            
            const response = await API.get(url);
            this.renderOrdersTable(response.results || []);
            
            // Render pagination
            if (response.count) {
                const totalPages = Math.ceil(response.count / 12);
                this.renderPagination('orders', page, totalPages);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.renderOrdersTable([]);
        }
    }

    renderOrdersTable(orders) {
        const tbody = document.getElementById('orders-table-body');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Không có đơn hàng nào</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.receiver_name || 'N/A'}</td>
                <td>${parseInt(order.total_money).toLocaleString('vi-VN')}đ</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(order.order_status)}">
                        ${this.getStatusText(order.order_status)}
                    </span>
                </td>
                <td>${new Date(order.created_date).toLocaleString('vi-VN')}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="storeManager.viewOrderDetail(${order.id})">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="storeManager.updateOrderStatus(${order.id})">
                        <i class="fas fa-edit"></i> Cập nhật
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
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

    getStatusText(status) {
        const textMap = {
            'PENDING': 'Chờ xử lý',
            'PAID': 'Đã thanh toán',
            'PREPARING': 'Đang chuẩn bị',
            'READY': 'Sẵn sàng',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        return textMap[status] || status;
    }

    async viewOrderDetail(orderId) {
        try {
            const order = await API.get(`/orders/${orderId}/`);
            this.renderOrderDetail(order);
            document.getElementById('order-detail-modal').style.display = 'block';
        } catch (error) {
            console.error('Error loading order details:', error);
            alert('Lỗi tải chi tiết đơn hàng!');
        }
    }

    renderOrderDetail(order) {
        const content = document.getElementById('order-detail-content');
        content.innerHTML = `
            <div class="order-info">
                <h4>Thông tin đơn hàng #${order.id}</h4>
                <p><strong>Khách hàng:</strong> ${order.receiver_name}</p>
                <p><strong>Số điện thoại:</strong> ${order.phone_number}</p>
                <p><strong>Địa chỉ giao hàng:</strong> ${order.ship_address}</p>
                <p><strong>Trạng thái:</strong> 
                    <span class="status-badge ${this.getStatusClass(order.order_status)}">
                        ${this.getStatusText(order.order_status)}
                    </span>
                </p>
                <p><strong>Ghi chú:</strong> ${order.note || 'Không có'}</p>
                <p><strong>Ngày tạo:</strong> ${new Date(order.created_date).toLocaleString('vi-VN')}</p>
            </div>
            
            <div class="order-items">
                <h4>Danh sách món ăn</h4>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Món ăn</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.food.title}</td>
                                <td>${item.quantity}</td>
                                <td>${parseInt(item.food.price).toLocaleString('vi-VN')}đ</td>
                                <td>${parseInt(item.food.price * item.quantity).toLocaleString('vi-VN')}đ</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="order-total">
                    <strong>Tổng cộng: ${parseInt(order.total_money).toLocaleString('vi-VN')}đ</strong>
                </div>
            </div>
        `;
    }

    async updateOrderStatus(orderId) {
        const newStatus = prompt('Nhập trạng thái mới (PENDING, PAID, PREPARING, READY, COMPLETED, CANCELLED):');
        if (!newStatus) return;
        
        try {
            await API.patch(`/orders/${orderId}/`, { order_status: newStatus.toUpperCase() });
            this.showSuccess('Cập nhật trạng thái đơn hàng thành công!');
            this.loadOrders(this.currentPage);
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError('Lỗi cập nhật trạng thái đơn hàng!');
        }
    }

    renderPagination(type, currentPage, totalPages) {
        const paginationContainer = document.getElementById(`${type}-pagination`);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm" onclick="storeManager.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage - 1})">‹</button>`;
        }
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            const activeClass = i === currentPage ? 'btn-primary' : 'btn-secondary';
            paginationHTML += `<button class="btn btn-sm ${activeClass}" onclick="storeManager.load${type.charAt(0).toUpperCase() + type.slice(1)}(${i})">${i}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="btn btn-sm" onclick="storeManager.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage + 1})">›</button>`;
        }
        
        paginationContainer.innerHTML = paginationHTML;
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Initialize store manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.storeManager = new StoreManager();
    window.storeManager.init();
});