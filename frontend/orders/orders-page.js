class OrdersPage {
    constructor() {
        this.currentPage = 1;
        this.currentStatus = '';
        this.orders = [];
        this.pagination = {};
        
        this.init();
    }

    init() {
        // Check authentication
        if (!isAuthenticated()) {
            alert('Vui lòng đăng nhập để tiếp tục');
            window.location.href = '../auth/login.html';
            return;
        }
        
        // Update header UI
        updateAuthUI();
        updateCartCount();

        // Setup event listeners
        this.setupEventListeners();
        
        // Load orders
        this.loadOrders();
    }

    setupEventListeners() {
        // Status filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active filter
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update current status and reload
                this.currentStatus = e.target.dataset.status;
                this.currentPage = 1;
                this.loadOrders();
            });
        });

    }

    async loadOrders() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentPage
            });
            
            if (this.currentStatus) {
                params.append('status', this.currentStatus);
            }

            const response = await API.get(`/orders/?${params}`);
            
            // Sử dụng is_rated do server trả về
            this.orders = response.results;
            // Fallback: kiểm tra ratings API cho các đơn Đã giao
            const delivered = this.orders.filter(o => o.order_status === 'Đã giao' || o.order_status === 'DELIVERED');
            await Promise.all(delivered.map(async order => {
                try {
                    const list = await API.get(`/ratings/?order=${order.id}`);
                    order.is_rated = Array.isArray(list) && list.length > 0;
                } catch {
                    // giữ nguyên is_rated
                }
            }));
            this.pagination = {
                count: response.count,
                num_pages: response.num_pages,
                current_page: response.current_page,
                has_next: response.has_next,
                has_previous: response.has_previous
            };

            this.hideLoading();
            this.renderOrders();
            this.renderPagination();
            
        } catch (error) {
            console.error('Error loading orders:', error);
            this.hideLoading();
            this.showError('Không thể tải danh sách đơn hàng. Vui lòng thử lại!');
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('orders-list').style.display = 'none';
        document.getElementById('empty-orders').style.display = 'none';
        document.getElementById('pagination').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    renderOrders() {
        const container = document.getElementById('orders-list');
        
        if (!this.orders || this.orders.length === 0) {
            container.style.display = 'none';
            document.getElementById('empty-orders').style.display = 'block';
            return;
        }

        container.style.display = 'block';
        document.getElementById('empty-orders').style.display = 'none';
        
        container.innerHTML = this.orders.map(order => this.renderOrderCard(order)).join('');
        
        // Setup order action listeners
        this.setupOrderActions();
    }

    renderOrderCard(order) {
        const statusClass = `status-${order.order_status.toLowerCase().replace(/\s+/g, '-')}`;
        const statusText = order.order_status;
        const deliveryStatusText = order.delivery_status || order.order_status;
        const formattedDate = new Date(order.created_date).toLocaleString('vi-VN');
        
        // Store information
        const storeName = order.store_name || 'Cửa hàng chưa xác định';
        const storeImage = order.store_image 
            ? `http://localhost:8000/media/${order.store_image}` 
            : 'http://localhost:8000/media/assets/default-store.png';
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <div class="order-id">Đơn hàng #${order.id}</div>
                        <div class="order-date">${formattedDate}</div>
                        <div class="store-info">
                            <img src="${storeImage}" alt="${storeName}" class="store-image" 
                                 onerror="this.src='http://localhost:8000/media/assets/default-store.png'">
                            <span class="store-name">${storeName}</span>
                        </div>
                    </div>
                    <div class="status-info">
                        <div class="order-status ${statusClass}">${statusText}</div>
                        <div class="delivery-status">${deliveryStatusText}</div>
                    </div>
                </div>
                
                <div class="order-body">
                    <div class="order-summary">
                        <div class="delivery-info">
                            <strong>Người nhận:</strong> ${order.receiver_name}<br>
                            <strong>Số điện thoại:</strong> ${order.phone_number}<br>
                            <strong>Địa chỉ:</strong> ${order.ship_address}<br>
                            ${order.note ? `<strong>Ghi chú:</strong> ${order.note}<br>` : ''}
                            <strong>Phương thức:</strong> ${order.payment_method || 'COD'}
                        </div>
                        <div class="total-amount">
                            ${this.formatCurrency(order.total_money)}
                            ${order.shipping_fee ? `<div class="shipping-fee">Phí ship: ${this.formatCurrency(order.shipping_fee)}</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="order-actions">
                        <button class="action-btn btn-detail" data-action="detail" data-order-id="${order.id}">Chi tiết</button>
                        ${order.order_status === 'Chờ xác nhận' ? `
                            <button class="action-btn btn-cancel" data-action="cancel" data-order-id="${order.id}">Hủy đơn</button>
                        ` : ''}
                        ${order.order_status === 'Đã giao' ? (
                            '<button class="action-btn btn-reorder" data-action="reorder" data-order-id="' + order.id + '">Đặt lại</button>' +
                            (order.is_rated
                                ? '<button class="action-btn btn-secondary" disabled>Đã đánh giá</button>'
                                : '<button class="action-btn btn-rate" data-action="rate" data-order-id="' + order.id + '">Đánh giá</button>')
                        ) : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderOrderItems(items) {
        if (!items || items.length === 0) {
            return '<p>Không có món ăn</p>';
        }

        return items.map(item => `
            <div class="order-item">
                <img src="${getImageUrl(item.food.image)}"
                     alt="${item.food.title}"
                     class="item-image"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22 viewBox=%220 0 50 50%22><rect width=%2250%22 height=%2250%22 fill=%22%23f0f0f0%22/><text x=%2225%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2220%22>🍽️</text></svg>'">
                <div class="item-details">
                    <div class="item-name">${item.food.title}</div>
                    <div class="item-quantity">Số lượng: ${item.quantity}</div>
                    ${item.food_note ? `<div class="item-note">Ghi chú: ${item.food_note}</div>` : ''}
                </div>
                <div class="item-price">
                    ${this.formatCurrency(item.subtotal)}
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'PENDING': 'Chờ xác nhận',
            'CONFIRMED': 'Đã xác nhận',
            'PREPARING': 'Đang chuẩn bị',
            'SHIPPING': 'Đang giao',
            'DELIVERED': 'Đã giao',
            'CANCELLED': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    setupOrderActions() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const orderId = e.target.dataset.orderId;
                
                switch (action) {
                    case 'detail':
                        this.viewOrderDetail(orderId);
                        break;
                    case 'cancel':
                        this.cancelOrder(orderId);
                        break;
                    case 'reorder':
                        this.reorderItems(orderId);
                        break;
                    case 'rate':
                        this.openRatingModal(orderId);
                        break;
                }
            });
        });
    }

    async viewOrderDetail(orderId) {
        // Lấy chi tiết
        try {
            const order = await API.get(`/orders/${orderId}/`);
            
            // Hiển thị modal
            const modal = document.getElementById('order-detail-modal');
            if (!modal) {
                throw new Error('Modal không tìm thấy');
            }
            modal.classList.remove('hidden');
            
            // Hiển thị list món ăn
            const itemsContainer = document.getElementById('detail-order-items');
            if (!itemsContainer) {
                throw new Error('Container món ăn không tìm thấy');
            }
            
            if (order.items && order.items.length > 0) {
                itemsContainer.innerHTML = order.items.map(item => `
                    <div class="modal-order-item">
                        <img src="${getImageUrl(item.food.image)}"
                             alt="${item.food.title}"
                             class="modal-item-image"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22><rect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/><text x=%2230%22 y=%2235%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2224%22>🍽️</text></svg>'">
                        <div class="modal-item-details">
                            <div class="modal-item-name">${item.food.title}</div>
                            <div class="modal-item-quantity">Số lượng: ${item.quantity}</div>
                            ${item.food_note ? `<div class="modal-item-note">Ghi chú: ${item.food_note}</div>` : ''}
                        </div>
                        <div class="modal-item-price">
                            ${this.formatCurrency(item.subtotal)}
                        </div>
                    </div>
                `).join('');
            } else {
                itemsContainer.innerHTML = '<p>Không có món ăn nào</p>';
            }
            
            // Get form elements with null safety
            const receiverNameEl = document.getElementById('detail-receiver_name');
            const phoneNumberEl = document.getElementById('detail-phone_number');
            const shipAddressEl = document.getElementById('detail-ship_address');
            const noteEl = document.getElementById('detail-note');
            const closeBtn = document.getElementById('detail-close');
            const saveBtn = document.getElementById('detail-save');
            
            // Populate form fields
            if (receiverNameEl) receiverNameEl.value = order.receiver_name || '';
            if (phoneNumberEl) phoneNumberEl.value = order.phone_number || '';
            if (shipAddressEl) shipAddressEl.value = order.ship_address || '';
            if (noteEl) noteEl.value = order.note || '';
            
            // Check if order can be edited (status = "Chờ xác nhận")
            const canEdit = order.order_status === 'Chờ xác nhận';
            
            // Set readonly attribute based on order status
            if (receiverNameEl) receiverNameEl.readOnly = !canEdit;
            if (phoneNumberEl) phoneNumberEl.readOnly = !canEdit;
            if (shipAddressEl) shipAddressEl.readOnly = !canEdit;
            if (noteEl) noteEl.readOnly = !canEdit;
            
            // Show/hide save button based on order status
            if (saveBtn) {
                saveBtn.style.display = canEdit ? 'inline-block' : 'none';
                
                // Setup save button click handler
                saveBtn.onclick = async () => {
                    try {
                        await API.put(`/orders/${orderId}/`, {
                            receiver_name: receiverNameEl.value.trim(),
                            phone_number: phoneNumberEl.value.trim(),
                            ship_address: shipAddressEl.value.trim(),
                            note: noteEl.value.trim()
                        });
                        alert('Cập nhật thành công');
                        modal.classList.add('hidden');
                        this.loadOrders();
                    } catch (err) {
                        alert('Lỗi cập nhật: ' + err.message);
                    }
                };
            }
            
            // Đóng modal
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.classList.add('hidden');
                };
            }
            
        } catch (error) {
            console.error('Lỗi chi tiết:', error);
            alert('Không thể tải chi tiết: ' + error.message);
        }
    }

    async cancelOrder(orderId) {
        try {
            // First, check if this order is part of a group and get group details
            const checkResponse = await API.post(`/orders/${orderId}/cancel-group/`, {
                check_only: true
            });

            if (checkResponse.requires_confirmation || checkResponse.group_orders) {
                // Show group cancellation modal
                this.showCancelGroupModal(orderId, checkResponse.group_orders);
            } else if (checkResponse.can_cancel) {
                // Simple single order cancellation
                if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                    await this.performCancelOrder(orderId);
                }
            }
        } catch (error) {
            if (error.message.includes('Không thể hủy nhóm đơn hàng')) {
                alert('Không thể hủy đơn hàng: ' + error.message);
            } else {
                // Fallback to single order cancellation
                if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                    await this.performSingleCancelOrder(orderId);
                }
            }
        }
    }

    showCancelGroupModal(orderId, groupOrders) {
        const modal = document.getElementById('cancel-group-modal');
        const ordersList = document.getElementById('group-orders-list');
        const summary = document.getElementById('cancel-group-summary');
        
        // Populate group orders list
        ordersList.innerHTML = groupOrders.map(order => `
            <div class="group-order-item">
                <div class="group-order-info">
                    <h5>Đơn hàng #${order.id}</h5>
                    <p>${order.store_name}</p>
                    <p>Trạng thái: ${order.order_status}</p>
                </div>
                <div class="group-order-total">
                    ${this.formatCurrency(order.total_money)}
                </div>
            </div>
        `).join('');

        // Summary
        const totalAmount = groupOrders.reduce((sum, order) => sum + order.total_money, 0);
        summary.innerHTML = `
            <p><strong>Tổng số đơn hàng:</strong> ${groupOrders.length}</p>
            <p><strong>Tổng giá trị:</strong> ${this.formatCurrency(totalAmount)}</p>
        `;

        // Show modal
        modal.classList.remove('hidden');

        // Setup event listeners
        document.getElementById('cancel-group-confirm').onclick = async () => {
            await this.performCancelGroup(orderId);
            modal.classList.add('hidden');
        };

        document.getElementById('cancel-group-close').onclick = () => {
            modal.classList.add('hidden');
        };
    }

    async performCancelGroup(orderId) {
        try {
            const response = await API.post(`/orders/${orderId}/cancel-group/`, {
                confirmed: true
            });
            
            alert(response.message || 'Đã hủy nhóm đơn hàng thành công!');
            this.loadOrders();
        } catch (error) {
            alert('Không thể hủy nhóm đơn hàng: ' + error.message);
        }
    }

    async performSingleCancelOrder(orderId) {
        try {
            await API.put(`/orders/${orderId}/status/`, { 
                order_status: 'Đã hủy' 
            });
            alert('Đã hủy đơn hàng thành công!');
            this.loadOrders();
        } catch (error) {
            alert('Không thể hủy đơn hàng: ' + error.message);
        }
    }

    async reorderItems(orderId) {
        if (!confirm('Bạn có muốn thêm tất cả món ăn từ đơn hàng này vào giỏ hàng?')) {
            return;
        }

        try {
            const order = this.orders.find(o => o.id == orderId);
            if (!order || !order.items) {
                throw new Error('Không tìm thấy thông tin đơn hàng');
            }

            // Add each item to cart
            for (const item of order.items) {
                await API.post('/cart/add/', {
                    food_id: item.food.id,
                    quantity: item.quantity
                });
            }
            
            alert('Đã thêm tất cả món ăn vào giỏ hàng!');
            updateCartCount(); // Update cart count
            
        } catch (error) {
            console.error('Error reordering:', error);
            alert('Không thể thêm món ăn vào giỏ hàng. Vui lòng thử lại!');
        }
    }

    openRatingModal(orderId) {
        this.currentOrder = this.orders.find(o => o.id == orderId);
        this.currentRating = 0;
        const starsContainer = document.getElementById('rating-stars');
        starsContainer.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.textContent = '☆';
            star.style.fontSize = '2rem';
            star.style.cursor = 'pointer';
            star.dataset.value = i;
            star.onclick = () => {
                this.currentRating = parseInt(star.dataset.value);
                this.updateStars();
            };
            starsContainer.appendChild(star);
        }
        document.getElementById('rating-content').value = '';
        document.getElementById('rating-modal').classList.remove('hidden');
        document.getElementById('rating-save').onclick = () => this.saveRating();
        document.getElementById('rating-close').onclick = () => {
            document.getElementById('rating-modal').classList.add('hidden');
        };
    }

    updateStars() {
        document.querySelectorAll('#rating-stars span').forEach(star => {
            star.textContent = (parseInt(star.dataset.value) <= this.currentRating) ? '★' : '☆';
        });
    }

    async saveRating() {
        const content = document.getElementById('rating-content').value.trim();
        if (this.currentRating < 1) {
            alert('Vui lòng chọn số sao đánh giá');
            return;
        }
        try {
            for (const item of this.currentOrder.items) {
                await API.post('/ratings/', {
                    food: item.food.id,
                    order: this.currentOrder.id,
                    rating: this.currentRating,
                    content: content
                });
            }
            alert('Cảm ơn bạn đã đánh giá!');
            document.getElementById('rating-modal').classList.add('hidden');
            this.loadOrders();
        } catch (err) {
            console.error('Rating error:', err);
            alert('Không thể gửi đánh giá: ' + err.message);
        }
    }

    renderPagination() {
        const container = document.getElementById('pagination');
        
        if (!this.pagination || this.pagination.num_pages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="page-btn" ${!this.pagination.has_previous ? 'disabled' : ''} 
                    onclick="ordersPage.goToPage(${this.currentPage - 1})">
                ‹ Trước
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.pagination.num_pages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="ordersPage.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        paginationHTML += `
            <button class="page-btn" ${!this.pagination.has_next ? 'disabled' : ''} 
                    onclick="ordersPage.goToPage(${this.currentPage + 1})">
                Sau ›
            </button>
        `;
        container.innerHTML = paginationHTML;
    }
    
    // Chuyển trang phân trang
    goToPage(page) {
        if (page < 1 || page > this.pagination.num_pages) {
            return;
        }
        this.currentPage = page;
        this.loadOrders();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    showError(message) {
        alert(message);
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ordersPage = new OrdersPage();
});
