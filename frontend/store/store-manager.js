// Store Manager Panel JavaScript
class StoreManagerPanel {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.mediaURL = 'http://localhost:8000/media';
        this.token = localStorage.getItem('access_token');
        this.currentSection = 'dashboard';
        this.currentPage = 1;
        this.isEditMode = false;
        this.editingFoodId = null;
        
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadDashboard();
    }

    checkAuth() {
        if (!this.token) {
            alert('Vui lòng đăng nhập để tiếp tục');
            window.location.href = '../auth/login.html';
            return;
        }

        this.verifyStoreManagerAccess();
    }

    async verifyStoreManagerAccess() {
        try {
            const user = getCurrentUser();
            if (!user || user.role?.id !== 3) {
                alert('Bạn không có quyền truy cập trang này');
                window.location.href = '../index.html';
                return;
            }
            
            // Update user name in header
            document.getElementById('user-name').textContent = user.fullname || user.username;
        } catch (error) {
            console.error('Error verifying access:', error);
            window.location.href = '../auth/login.html';
        }
    }

    bindEvents() {
        // Navigation events
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Food management events
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

        document.getElementById('food-category-filter').addEventListener('change', () => {
            this.loadFoods(1);
        });

        // Order management events
        document.getElementById('search-orders-btn').addEventListener('click', () => {
            this.loadOrders(1);
        });

        document.getElementById('order-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadOrders(1);
            }
        });

        document.getElementById('order-status-filter').addEventListener('change', () => {
            this.loadOrders(1);
        });

        // Modal events
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        document.getElementById('food-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFoodData();
        });

        // File preview
        document.getElementById('food-image').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.store-section').forEach(sec => {
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
            // Load statistics
            const [foodsRes, ordersRes] = await Promise.all([
                fetch(`${this.baseURL}/menu/store/foods/?page=1`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.baseURL}/orders/store/?page=1`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            const foodsData = await foodsRes.json();
            const ordersData = await ordersRes.json();

            document.getElementById('total-foods').textContent = foodsData.total_foods || 0;
            document.getElementById('total-orders').textContent = ordersData.total_orders || 0;

            // Count pending and completed orders
            if (ordersData.orders) {
                const pendingCount = ordersData.orders.filter(order => 
                    ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị'].includes(order.order_status)
                ).length;
                const completedCount = ordersData.orders.filter(order => 
                    order.order_status === 'Đã giao'
                ).length;

                document.getElementById('pending-orders').textContent = pendingCount;
                document.getElementById('completed-orders').textContent = completedCount;
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.baseURL}/menu/categories/`);
            const data = await response.json();
            
            const categoryFilter = document.getElementById('food-category-filter');
            const categorySelect = document.getElementById('food-category');
            
            // Clear existing options (keep "All categories" for filter)
            categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
            categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
            
            data.results.forEach(category => {
                categoryFilter.innerHTML += `<option value="${category.id}">${category.cate_name}</option>`;
                categorySelect.innerHTML += `<option value="${category.id}">${category.cate_name}</option>`;
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadFoods(page = 1) {
        try {
            const search = document.getElementById('food-search').value;
            const category = document.getElementById('food-category-filter').value;
            
            let url = `${this.baseURL}/menu/store/foods/?page=${page}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (category) url += `&category=${category}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();

            this.renderFoodsTable(data.foods || []);
            this.renderPagination('foods', data.current_page, data.total_pages);
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
                    <button class="btn btn-warning btn-sm" onclick="storeManagerPanel.editFood(${food.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="storeManagerPanel.deleteFood(${food.id})">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadOrders(page = 1) {
        try {
            const search = document.getElementById('order-search').value;
            const status = document.getElementById('order-status-filter').value;
            
            let url = `${this.baseURL}/orders/store/?page=${page}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (status) url += `&status=${encodeURIComponent(status)}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();

            this.renderOrdersTable(data.orders || []);
            this.renderPagination('orders', data.current_page, data.total_pages);
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
                <td>${order.user?.fullname || order.user?.username || 'N/A'}</td>
                <td>${new Date(order.created_date).toLocaleDateString('vi-VN')}</td>
                <td>${parseInt(order.total_money).toLocaleString('vi-VN')}đ</td>
                <td>
                    <span class="status-badge ${this.getOrderStatusClass(order.order_status)}">
                        ${order.order_status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="storeManagerPanel.viewOrderDetail(${order.id})">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                    ${this.canUpdateOrderStatus(order.order_status) ? 
                        `<button class="btn btn-success btn-sm" onclick="storeManagerPanel.updateOrderStatus(${order.id}, '${this.getNextStatus(order.order_status)}')">
                            <i class="fas fa-check"></i> Cập nhật
                        </button>` : ''
                    }
                </td>
            </tr>
        `).join('');
    }

    getOrderStatusClass(status) {
        const statusMap = {
            'Chờ xác nhận': 'status-pending',
            'Đã xác nhận': 'status-confirmed',
            'Đang chuẩn bị': 'status-preparing',
            'Đang giao': 'status-shipping',
            'Đã giao': 'status-delivered',
            'Đã hủy': 'status-cancelled'
        };
        return statusMap[status] || 'status-pending';
    }

    canUpdateOrderStatus(status) {
        return ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị'].includes(status);
    }

    getNextStatus(currentStatus) {
        const statusFlow = {
            'Chờ xác nhận': 'Đã xác nhận',
            'Đã xác nhận': 'Đang chuẩn bị',
            'Đang chuẩn bị': 'Đang giao'
        };
        return statusFlow[currentStatus] || currentStatus;
    }

    renderPagination(type, currentPage, totalPages) {
        const container = document.getElementById(`${type}-pagination`);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '';
        
        // Previous button
        pagination += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="storeManagerPanel.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pagination += `<button class="${i === currentPage ? 'active' : ''}" onclick="storeManagerPanel.load${type.charAt(0).toUpperCase() + type.slice(1)}(${i})">
                    ${i}
                </button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                pagination += '<span>...</span>';
            }
        }
        
        // Next button
        pagination += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="storeManagerPanel.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        container.innerHTML = pagination;
    }

    showFoodModal(food = null) {
        this.isEditMode = !!food;
        this.editingFoodId = food?.id || null;
        
        document.getElementById('food-modal-title').textContent = 
            this.isEditMode ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới';
        
        // Clear form
        document.getElementById('food-form').reset();
        document.getElementById('food-image-preview').style.display = 'none';
        
        // Fill form if editing
        if (food) {
            document.getElementById('food-title').value = food.title || '';
            document.getElementById('food-description').value = food.description || '';
            document.getElementById('food-price').value = food.price || '';
            document.getElementById('food-category').value = food.category?.id || '';
            document.getElementById('food-availability').value = food.availability || 'Còn hàng';
            
            if (food.image) {
                const preview = document.getElementById('food-image-preview');
                preview.src = food.image.startsWith('http') ? food.image : this.mediaURL + '/' + food.image;
                preview.style.display = 'block';
            }
        }
        
        document.getElementById('food-modal').classList.add('show');
    }

    async editFood(foodId) {
        try {
            const response = await fetch(`${this.baseURL}/menu/store/foods/${foodId}/`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const food = await response.json();
            this.showFoodModal(food);
        } catch (error) {
            console.error('Error loading food:', error);
            alert('Lỗi khi tải thông tin món ăn');
        }
    }

    async saveFoodData() {
        const formData = new FormData();
        const form = document.getElementById('food-form');
        
        // Add form fields
        formData.append('title', document.getElementById('food-title').value);
        formData.append('description', document.getElementById('food-description').value);
        formData.append('price', document.getElementById('food-price').value);
        formData.append('category', document.getElementById('food-category').value);
        formData.append('availability', document.getElementById('food-availability').value);
        
        // Add image if selected
        const imageFile = document.getElementById('food-image').files[0];
        if (imageFile) {
            formData.append('image_file', imageFile);
        }

        try {
            const url = this.isEditMode 
                ? `${this.baseURL}/menu/store/foods/${this.editingFoodId}/`
                : `${this.baseURL}/menu/store/foods/`;
            
            const method = this.isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            if (response.ok) {
                alert(this.isEditMode ? 'Cập nhật món ăn thành công!' : 'Thêm món ăn thành công!');
                this.closeModals();
                this.loadFoods(this.currentPage);
                this.loadDashboard(); // Update stats
            } else {
                const error = await response.json();
                alert('Lỗi: ' + (error.message || 'Không thể lưu món ăn'));
            }
        } catch (error) {
            console.error('Error saving food:', error);
            alert('Lỗi khi lưu món ăn');
        }
    }

    async deleteFood(foodId) {
        if (!confirm('Bạn có chắc chắn muốn xóa món ăn này?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/menu/store/foods/${foodId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                alert('Xóa món ăn thành công!');
                this.loadFoods(this.currentPage);
                this.loadDashboard(); // Update stats
            } else {
                alert('Lỗi khi xóa món ăn');
            }
        } catch (error) {
            console.error('Error deleting food:', error);
            alert('Lỗi khi xóa món ăn');
        }
    }

    async viewOrderDetail(orderId) {
        try {
            const response = await fetch(`${this.baseURL}/orders/store/${orderId}/`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const order = await response.json();

            this.renderOrderDetail(order);
            document.getElementById('order-modal').classList.add('show');
        } catch (error) {
            console.error('Error loading order detail:', error);
            alert('Lỗi khi tải chi tiết đơn hàng');
        }
    }

    renderOrderDetail(order) {
        const content = document.getElementById('order-detail-content');
        
        content.innerHTML = `
            <div class="order-info">
                <div class="info-grid">
                    <div class="info-group">
                        <h4>Thông tin đơn hàng</h4>
                        <p><strong>Mã đơn hàng:</strong> #${order.id}</p>
                        <p><strong>Ngày đặt:</strong> ${new Date(order.created_date).toLocaleString('vi-VN')}</p>
                        <p><strong>Trạng thái:</strong> 
                            <span class="status-badge ${this.getOrderStatusClass(order.order_status)}">
                                ${order.order_status}
                            </span>
                        </p>
                        <p><strong>Tổng tiền:</strong> ${parseInt(order.total_money).toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div class="info-group">
                        <h4>Thông tin khách hàng</h4>
                        <p><strong>Họ tên:</strong> ${order.user?.fullname || 'N/A'}</p>
                        <p><strong>Email:</strong> ${order.user?.email || 'N/A'}</p>
                        <p><strong>Số điện thoại:</strong> ${order.user?.phone_number || 'N/A'}</p>
                    </div>
                    <div class="info-group">
                        <h4>Thông tin giao hàng</h4>
                        <p><strong>Người nhận:</strong> ${order.receiver_name || 'N/A'}</p>
                        <p><strong>Địa chỉ:</strong> ${order.ship_address || 'N/A'}</p>
                        <p><strong>Số điện thoại:</strong> ${order.phone_number || 'N/A'}</p>
                    </div>
                </div>
                
                ${order.note ? `
                    <div class="info-group">
                        <h4>Ghi chú</h4>
                        <p>${order.note}</p>
                    </div>
                ` : ''}
                
                <div class="order-items">
                    <h4>Chi tiết món ăn</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Món ăn</th>
                                <th>Số lượng</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.order_details ? order.order_details.map(detail => `
                                <tr>
                                    <td>${detail.food?.title || 'N/A'}</td>
                                    <td>${detail.quantity}</td>
                                    <td>${parseInt(detail.food?.price || 0).toLocaleString('vi-VN')}đ</td>
                                    <td>${parseInt(detail.quantity * (detail.food?.price || 0)).toLocaleString('vi-VN')}đ</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4">Không có chi tiết</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                ${this.canUpdateOrderStatus(order.order_status) ? `
                    <div class="status-update">
                        <h4>Cập nhật trạng thái</h4>
                        <select id="new-order-status">
                            <option value="Chờ xác nhận" ${order.order_status === 'Chờ xác nhận' ? 'selected' : ''}>Chờ xác nhận</option>
                            <option value="Đã xác nhận" ${order.order_status === 'Đã xác nhận' ? 'selected' : ''}>Đã xác nhận</option>
                            <option value="Đang chuẩn bị" ${order.order_status === 'Đang chuẩn bị' ? 'selected' : ''}>Đang chuẩn bị</option>
                            <option value="Đang giao" ${order.order_status === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
                            <option value="Đã giao" ${order.order_status === 'Đã giao' ? 'selected' : ''}>Đã giao</option>
                            <option value="Đã hủy" ${order.order_status === 'Đã hủy' ? 'selected' : ''}>Đã hủy</option>
                        </select>
                        <button class="btn btn-primary" onclick="storeManagerPanel.updateOrderStatusFromModal(${order.id})">
                            Cập nhật
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetch(`${this.baseURL}/orders/store/${orderId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_status: newStatus })
            });

            if (response.ok) {
                alert('Cập nhật trạng thái thành công!');
                this.loadOrders(this.currentPage);
                this.loadDashboard(); // Update stats
            } else {
                alert('Lỗi khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Lỗi khi cập nhật trạng thái');
        }
    }

    async updateOrderStatusFromModal(orderId) {
        const newStatus = document.getElementById('new-order-status').value;
        await this.updateOrderStatus(orderId, newStatus);
        this.closeModals();
    }

    previewImage(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('food-image-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }
}

// Initialize store manager panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.storeManagerPanel = new StoreManagerPanel();
});