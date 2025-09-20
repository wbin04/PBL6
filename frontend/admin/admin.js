// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        // URL for media files
        this.mediaURL = this.baseURL.replace('/api', '') + '/media';
        this.token = localStorage.getItem('access_token');
        this.currentSection = 'dashboard';
        this.currentPage = {
            customers: 1,
            foods: 1,
            orders: 1
        };
        
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadDashboard();
    }

    checkAuth() {
        if (!this.token) {
            window.location.href = '../auth/login.html';
            return;
        }

        // Verify token and check admin role
        this.verifyAdminAccess();
    }

    async verifyAdminAccess() {
        try {
            const response = await fetch(`${this.baseURL}/auth/profile/`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Token invalid');
            }

            const user = await response.json();
            
            // Check if user has admin role (role_id = 2)
            if (!user.role_id || user.role_id !== 2) {
                alert('Bạn không có quyền truy cập trang admin!');
                window.location.href = '../index.html';
                return;
            }

            console.log('Admin access verified:', user);
        } catch (error) {
            console.error('Auth verification failed:', error);
            localStorage.removeItem('access_token');
            window.location.href = '../auth/login.html';
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
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

        // Customer search
        document.getElementById('search-customers-btn').addEventListener('click', () => {
            this.loadCustomers(1);
        });

        document.getElementById('customer-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadCustomers(1);
            }
        });

        // Food search and add
        document.getElementById('search-foods-btn').addEventListener('click', () => {
            this.loadFoods(1);
        });

        document.getElementById('food-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadFoods(1);
            }
        });

        document.getElementById('add-food-btn').addEventListener('click', () => {
            this.showFoodModal();
        });

        // Order search
        document.getElementById('search-orders-btn').addEventListener('click', () => {
            this.loadOrders(1);
        });

        document.getElementById('order-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadOrders(1);
            }
        });

        // Reload orders immediately when status filter changes
        const orderStatusFilter = document.getElementById('order-status-filter');
        if (orderStatusFilter) {
            orderStatusFilter.addEventListener('change', () => this.loadOrders(1));
        }

        // Reload foods immediately when category filter changes
        const foodCategoryFilter = document.getElementById('food-category-filter');
        if (foodCategoryFilter) {
            foodCategoryFilter.addEventListener('change', () => this.loadFoods(1));
        }

        // Modal events: close buttons and overlay clicks
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
            });
        });

        // Close modal when clicking on overlay
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModals();
            });
        });
        // Preview selected image in Food form
        const foodImageInput = document.getElementById('food-image');
        const foodImagePreview = document.getElementById('food-image-preview');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const fileInfo = document.getElementById('file-info');
        const removePreviewBtn = document.getElementById('remove-preview-btn');
        
        if (foodImageInput) {
            foodImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        alert('Vui lòng chọn file hình ảnh!');
                        e.target.value = '';
                        fileInfo.textContent = 'Chọn ảnh để xem trước (Tối đa 5MB)';
                        return;
                    }
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Kích thước ảnh không được vượt quá 5MB!');
                        e.target.value = '';
                        fileInfo.textContent = 'Chọn ảnh để xem trước (Tối đa 5MB)';
                        return;
                    }
                    
                    const url = URL.createObjectURL(file);
                    foodImagePreview.src = url;
                    foodImagePreview.style.display = 'block';
                    removePreviewBtn.style.display = 'flex';
                    imagePreviewContainer.classList.add('has-image');
                    
                    // Show file info
                    const fileSize = (file.size / 1024 / 1024).toFixed(2);
                    fileInfo.textContent = `Đã chọn: ${file.name} (${fileSize}MB)`;
                    fileInfo.style.color = 'var(--success-color)';
                    
                    // Add fade in effect
                    foodImagePreview.style.opacity = '0';
                    setTimeout(() => {
                        foodImagePreview.style.opacity = '1';
                    }, 50);
                } else {
                    foodImagePreview.style.display = 'none';
                    removePreviewBtn.style.display = 'none';
                    imagePreviewContainer.classList.remove('has-image');
                    fileInfo.textContent = 'Chọn ảnh để xem trước (Tối đa 5MB)';
                    fileInfo.style.color = '#6c757d';
                }
            });
        }
        
        // Remove preview button
        if (removePreviewBtn) {
            removePreviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                foodImagePreview.style.display = 'none';
                removePreviewBtn.style.display = 'none';
                imagePreviewContainer.classList.remove('has-image');
                foodImageInput.value = '';
                fileInfo.textContent = 'Chọn ảnh để xem trước (Tối đa 5MB)';
                fileInfo.style.color = '#6c757d';
            });
        }

        // Forms
        document.getElementById('customer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCustomer();
        });

        document.getElementById('food-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFoodData();
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
            case 'customers':
                this.loadCustomers();
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
            const [customersRes, foodsRes, ordersRes] = await Promise.all([
                fetch(`${this.baseURL}/auth/admin/customers/?page=1`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.baseURL}/menu/admin/foods/?page=1`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.baseURL}/orders/admin/?page=1`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            const customersData = await customersRes.json();
            const foodsData = await foodsRes.json();
            const ordersData = await ordersRes.json();

            document.getElementById('total-customers').textContent = customersData.total_customers || 0;
            document.getElementById('total-foods').textContent = foodsData.total_foods || 0;
            document.getElementById('total-orders').textContent = ordersData.total_orders || 0;
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadCustomers(page = 1) {
        try {
            const search = document.getElementById('customer-search').value;
            let url = `${this.baseURL}/auth/admin/customers/?page=${page}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load customers');
            }

            const data = await response.json();
            this.renderCustomersTable(data.customers);
            this.renderPagination('customers', data.current_page, data.total_pages);
            this.currentPage.customers = page;
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Không thể tải danh sách khách hàng');
        }
    }

    renderCustomersTable(customers) {
        const tbody = document.getElementById('customers-table-body');
        
        if (!customers || customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không có khách hàng nào</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.id}</td>
                <td>${customer.fullname}</td>
                <td>${customer.email}</td>
                <td>${customer.phone_number || 'N/A'}</td>
                <td>${customer.address || 'N/A'}</td>
                <td>${new Date(customer.created_date).toLocaleDateString('vi-VN')}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="adminPanel.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async editCustomer(customerId) {
        try {
            const response = await fetch(`${this.baseURL}/auth/admin/customers/${customerId}/`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load customer');
            }

            const customer = await response.json();
            
            document.getElementById('customer-id').value = customer.id;
            document.getElementById('customer-fullname').value = customer.fullname;
            document.getElementById('customer-phone').value = customer.phone_number || '';
            document.getElementById('customer-address').value = customer.address || '';
            
            // Show modal
            document.getElementById('customer-modal').classList.add('active');
            // console.log('Customer modal opened');
        } catch (error) {
            console.error('Error loading customer:', error);
            this.showError('Không thể tải thông tin khách hàng');
        }
    }

    async updateCustomer() {
        try {
            const customerId = document.getElementById('customer-id').value;
            const data = {
                fullname: document.getElementById('customer-fullname').value,
                phone_number: document.getElementById('customer-phone').value,
                address: document.getElementById('customer-address').value
            };

            const response = await fetch(`${this.baseURL}/auth/admin/customers/${customerId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to update customer');
            }

            this.closeModals();
            this.loadCustomers(this.currentPage.customers);
            this.showSuccess('Cập nhật thông tin khách hàng thành công');
        } catch (error) {
            console.error('Error updating customer:', error);
            this.showError('Không thể cập nhật thông tin khách hàng');
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.baseURL}/menu/categories/`);
            const categories = await response.json();
            
            const categorySelect = document.getElementById('food-category');
            const filterSelect = document.getElementById('food-category-filter');
            
            categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
            filterSelect.innerHTML = '<option value="">Tất cả danh mục</option>';
            
            categories.forEach(category => {
                const option = `<option value="${category.id}">${category.cate_name}</option>`;
                categorySelect.innerHTML += option;
                filterSelect.innerHTML += option;
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadFoods(page = 1) {
        try {
            const search = document.getElementById('food-search').value;
            const category = document.getElementById('food-category-filter').value;
            
            let url = `${this.baseURL}/menu/admin/foods/?page=${page}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            if (category) {
                url += `&category=${category}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load foods');
            }

            const data = await response.json();
            this.renderFoodsTable(data.foods);
            this.renderPagination('foods', data.current_page, data.total_pages);
            this.currentPage.foods = page;
        } catch (error) {
            console.error('Error loading foods:', error);
            this.showError('Không thể tải danh sách món ăn');
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
                    <button class="btn btn-warning btn-sm" onclick="adminPanel.editFood(${food.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.deleteFood(${food.id})">
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
    const foodImageInput = document.getElementById('food-image');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const fileInfo = document.getElementById('file-info');
    const removePreviewBtn = document.getElementById('remove-preview-btn');
        
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
                foodImagePreview.style.opacity = '1';
                removePreviewBtn.style.display = 'flex';
                imagePreviewContainer.classList.add('has-image');
                fileInfo.textContent = 'Ảnh hiện tại được hiển thị ở trên';
                fileInfo.style.color = '#6c757d';
            } else {
                foodImagePreview.style.display = 'none';
                removePreviewBtn.style.display = 'none';
                imagePreviewContainer.classList.remove('has-image');
                fileInfo.textContent = 'Chọn ảnh để xem trước (Tối đa 5MB)';
                fileInfo.style.color = '#6c757d';
            }
            // Clear file input
            foodImageInput.value = '';
        } else {
            title.textContent = 'Thêm món ăn mới';
            document.getElementById('food-form').reset();
            document.getElementById('food-id').value = '';
            foodImagePreview.style.display = 'none';
            removePreviewBtn.style.display = 'none';
            imagePreviewContainer.classList.remove('has-image');
            foodImageInput.value = '';
            fileInfo.textContent = 'Chọn ảnh để xem trước (Tối đa 5MB)';
            fileInfo.style.color = '#6c757d';
        }
        
        // Show modal
        document.getElementById('food-modal').classList.add('active');
        // console.log('Food modal opened');
    }

    async editFood(foodId) {
        try {
            const response = await fetch(`${this.baseURL}/menu/admin/foods/${foodId}/`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load food');
            }

            const food = await response.json();
            this.showFoodModal(food);
        } catch (error) {
            console.error('Error loading food:', error);
            this.showError('Không thể tải thông tin món ăn');
        }
    }

    async saveFoodData() {
        try {
            const foodId = document.getElementById('food-id').value;
            // Use FormData to handle file upload
            const formData = new FormData();
            formData.append('title', document.getElementById('food-title').value);
            formData.append('description', document.getElementById('food-description').value);
            formData.append('price', document.getElementById('food-price').value);
            // Category ID required by serializer
            formData.append('category_id', document.getElementById('food-category').value);
            formData.append('availability', document.getElementById('food-availability').value);
            // Get the file input element
            const foodImageInput = document.getElementById('food-image');
            const file = foodImageInput.files[0];
            if (file) formData.append('image_file', file);

            const url = foodId 
                ? `${this.baseURL}/menu/admin/foods/${foodId}/`
                : `${this.baseURL}/menu/admin/foods/`;
            
            const method = foodId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.token}`
                    // Let browser set Content-Type for multipart
                },
                body: formData
            });
            const result = await response.json();
            if (!response.ok) {
                console.error('Save failed:', result);
                // Show first error message or raw JSON
                const msg = result.error || JSON.stringify(result);
                this.showError(msg);
                return;
            }

            this.closeModals();
            this.loadFoods(this.currentPage.foods);
            this.showSuccess(foodId ? 'Cập nhật món ăn thành công' : 'Thêm món ăn thành công');
        } catch (error) {
            console.error('Error saving food:', error);
            this.showError('Không thể lưu thông tin món ăn');
        }
    }

    async deleteFood(foodId) {
        if (!confirm('Bạn có chắc chắn muốn xóa món ăn này?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/menu/admin/foods/${foodId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to delete food');
            }

            this.loadFoods(this.currentPage.foods);
            this.showSuccess('Xóa món ăn thành công');
        } catch (error) {
            console.error('Error deleting food:', error);
            this.showError('Không thể xóa món ăn');
        }
    }

    async loadOrders(page = 1) {
        try {
            const search = document.getElementById('order-search').value;
            const status = document.getElementById('order-status-filter').value;
            
            let url = `${this.baseURL}/orders/admin/?page=${page}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            if (status) {
                url += `&status=${encodeURIComponent(status)}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load orders');
            }

            const data = await response.json();
            this.renderOrdersTable(data.orders);
            this.renderPagination('orders', data.current_page, data.total_pages);
            this.currentPage.orders = page;
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Không thể tải danh sách đơn hàng');
        }
    }

    renderOrdersTable(orders) {
        const tbody = document.getElementById('orders-table-body');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Không có đơn hàng nào</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.user.fullname}</td>
                <td>${parseInt(order.total_money).toLocaleString('vi-VN')}đ</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(order.order_status)}">
                        ${order.order_status}
                    </span>
                </td>
                <td>${order.payment_method}</td>
                <td>${new Date(order.created_date).toLocaleDateString('vi-VN')}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="adminPanel.viewOrderDetail(${order.id})">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
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

    async viewOrderDetail(orderId) {
        try {
            const response = await fetch(`${this.baseURL}/orders/admin/${orderId}/`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load order');
            }

            const order = await response.json();
            this.renderOrderDetail(order);
            
            // Show modal
            document.getElementById('order-modal').classList.add('active');
            // console.log('Order modal opened');
        } catch (error) {
            console.error('Error loading order:', error);
            this.showError('Không thể tải thông tin đơn hàng');
        }
    }

    renderOrderDetail(order) {
        const content = document.getElementById('order-detail-content');
        
        content.innerHTML = `
            <div class="order-info">
                <div class="info-group">
                    <h4>Thông tin đơn hàng</h4>
                    <p><strong>Mã đơn:</strong> #${order.id}</p>
                    <p><strong>Ngày tạo:</strong> ${new Date(order.created_date).toLocaleString('vi-VN')}</p>
                    <p><strong>Tổng tiền:</strong> ${parseInt(order.total_money).toLocaleString('vi-VN')}đ</p>
                    <p><strong>Phương thức TT:</strong> ${order.payment_method}</p>
                </div>
                
                <div class="info-group">
                    <h4>Thông tin khách hàng</h4>
                    <p><strong>Tên:</strong> ${order.user.fullname}</p>
                    <p><strong>Email:</strong> ${order.user.email}</p>
                    <p><strong>SĐT:</strong> ${order.user.phone_number || 'N/A'}</p>
                </div>
                
                <div class="info-group">
                    <h4>Thông tin giao hàng</h4>
                    <p><strong>Người nhận:</strong> ${order.receiver_name}</p>
                    <p><strong>SĐT:</strong> ${order.phone_number}</p>
                    <p><strong>Địa chỉ:</strong> ${order.ship_address}</p>
                    <p><strong>Ghi chú:</strong> ${order.note || 'Không có'}</p>
                </div>
            </div>
            
            <div class="status-update">
                <label for="order-status-select"><strong>Cập nhật trạng thái:</strong></label>
                <select id="order-status-select">
                    <option value="Chờ xác nhận" ${order.order_status === 'Chờ xác nhận' ? 'selected' : ''}>Chờ xác nhận</option>
                    <option value="Đã xác nhận" ${order.order_status === 'Đã xác nhận' ? 'selected' : ''}>Đã xác nhận</option>
                    <option value="Đang chuẩn bị" ${order.order_status === 'Đang chuẩn bị' ? 'selected' : ''}>Đang chuẩn bị</option>
                    <option value="Đang giao" ${order.order_status === 'Đang giao' ? 'selected' : ''}>Đang giao</option>
                    <option value="Đã giao" ${order.order_status === 'Đã giao' ? 'selected' : ''}>Đã giao</option>
                    <option value="Đã hủy" ${order.order_status === 'Đã hủy' ? 'selected' : ''}>Đã hủy</option>
                </select>
                <button class="btn btn-primary" onclick="adminPanel.updateOrderStatus(${order.id})">
                    Cập nhật
                </button>
            </div>
            
            <div class="order-items">
                <h4>Chi tiết món ăn</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Món ăn</th>
                            <th>Số lượng</th>
                            <th>Giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(order.items || []).map(item => `
                            <tr>
                                <td>${item.food.title}</td>
                                <td>${item.quantity}</td>
                                <td>${parseInt(item.food.price).toLocaleString('vi-VN')}đ</td>
                                <td>${(item.quantity * parseInt(item.food.price)).toLocaleString('vi-VN')}đ</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4">Không có thông tin chi tiết</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    async updateOrderStatus(orderId) {
        try {
            const newStatus = document.getElementById('order-status-select').value;
            
            const response = await fetch(`${this.baseURL}/orders/admin/${orderId}/`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order_status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }

            this.closeModals();
            this.loadOrders(this.currentPage.orders);
            this.showSuccess('Cập nhật trạng thái đơn hàng thành công');
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError('Không thể cập nhật trạng thái đơn hàng');
        }
    }

    renderPagination(type, currentPage, totalPages) {
        const container = document.getElementById(`${type}-pagination`);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let pagination = '';
        
        // Previous button
        pagination += `
            <button ${currentPage === 1 ? 'disabled' : ''} onclick="adminPanel.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                pagination += `
                    <button class="${i === currentPage ? 'active' : ''}" onclick="adminPanel.load${type.charAt(0).toUpperCase() + type.slice(1)}(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                pagination += '<span>...</span>';
            }
        }
        
        // Next button
        pagination += `
            <button ${currentPage === totalPages ? 'disabled' : ''} onclick="adminPanel.load${type.charAt(0).toUpperCase() + type.slice(1)}(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        container.innerHTML = pagination;
    }

    closeModals() {
        // console.log('Closing all modals');
        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.classList.remove('active');
        });
    }

    logout() {
        localStorage.removeItem('access_token');
        window.location.href = '../auth/login.html';
    }

    showSuccess(message) {
        alert(message); // Replace with better notification system
    }

    showError(message) {
        alert(message); // Replace with better notification system
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});