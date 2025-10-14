// Cart page functionality
let currentCart = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadCart();
});

function checkAuthentication() {
    if (!isAuthenticated()) {
        alert('Vui lòng đăng nhập để xem giỏ hàng');
        window.location.href = '../auth/login.html';
        return;
    }
}

async function loadCart() {
    const loadingEl = document.getElementById('loading');
    const emptyCartEl = document.getElementById('empty-cart');
    const cartItemsEl = document.getElementById('cart-items');
    const cartSummaryEl = document.getElementById('cart-summary');

    try {
        showLoading(true);
        const cart = await API.get('/cart/');
        currentCart = cart;

        if (!cart.items || cart.items.length === 0) {
            showEmptyCart();
        } else {
            displayCartItems(cart.items);
            updateCartSummary(cart);
            showCartContent();
        }

    } catch (error) {
        console.error('Error loading cart:', error);
        alert('Lỗi khi tải giỏ hàng: ' + error.message);
        showEmptyCart();
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = show ? 'block' : 'none';
}

function showEmptyCart() {
    document.getElementById('empty-cart').style.display = 'block';
    document.getElementById('cart-items').style.display = 'none';
    document.getElementById('cart-summary').style.display = 'none';
}

function showCartContent() {
    document.getElementById('empty-cart').style.display = 'none';
    document.getElementById('cart-items').style.display = 'block';
    document.getElementById('cart-summary').style.display = 'block';
}

function displayCartItems(items) {
    const cartItemsEl = document.getElementById('cart-items');
    
    // Group items by store
    const itemsByStore = {};
    items.forEach(item => {
        const storeId = item.food.store.id; // Store info is now nested in food.store
        if (!itemsByStore[storeId]) {
            itemsByStore[storeId] = {
                store: item.food.store, // Store info from food.store object
                items: []
            };
        }
        itemsByStore[storeId].items.push(item);
    });
    
    // Generate HTML for each store group
    const storeGroupsHTML = Object.keys(itemsByStore).map(storeId => {
        const storeGroup = itemsByStore[storeId];
        const store = storeGroup.store;
        const storeItems = storeGroup.items;
        
        // Calculate store subtotal
        const storeSubtotal = storeItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        const storeItemsHTML = storeItems.map(item => `
            <div class="cart-item" data-food-id="${item.food.id}">
                <img src="http://localhost:8000/media/${item.food.image}" 
                     alt="${item.food.title}" 
                     class="item-image" 
                     onerror="this.style.display='none'">
                
                <div class="item-details">
                    <div class="item-name">${item.food.title}</div>
                    <div class="item-price">${formatCurrency(item.food.price)}</div>
                    <div class="item-note-section">
                        <textarea class="item-note-input" 
                                  placeholder="Thêm ghi chú cho món này (VD: không cay, thêm rau...)"
                                  rows="2"
                                  onblur="updateItemNote(${item.food.id}, this.value)"
                                  onchange="updateItemNote(${item.food.id}, this.value)">${item.item_note || ''}</textarea>
                    </div>
                </div>

                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.food.id}, ${item.quantity - 1})">
                        −
                    </button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.food.id}, ${item.quantity + 1})">
                        +
                    </button>
                </div>

                <div class="item-total">
                    ${formatCurrency(item.subtotal)}
                </div>

                <button class="remove-btn" onclick="removeFromCart(${item.food.id})">
                    Xóa
                </button>
            </div>
        `).join('');
        
        return `
            <div class="store-group">
                <div class="store-header">
                    <img src="http://localhost:8000/media/${store.image}" 
                         alt="${store.store_name}" 
                         class="store-logo"
                         onerror="this.style.display='none'">
                    <div class="store-info">
                        <h3 class="store-name">${store.store_name}</h3>
                    </div>
                </div>
                <div class="store-items">
                    ${storeItemsHTML}
                </div>
                <div class="store-shipping">
                    <div class="shipping-fee">
                        <span>Phí vận chuyển: </span>
                        <span class="shipping-amount">${formatCurrency(15000)}</span>
                    </div>
                    <div class="store-total">
                        <span>Tổng cửa hàng: </span>
                        <span class="store-total-amount">${formatCurrency(storeSubtotal + 15000)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    cartItemsEl.innerHTML = storeGroupsHTML;
}

function updateCartSummary(cart) {
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.total_money;
    
    // Calculate number of stores for delivery fee
    const storeIds = new Set();
    cart.items.forEach(item => {
        storeIds.add(item.food.store.id);
    });
    const numberOfStores = storeIds.size;
    const totalDeliveryFee = numberOfStores * 15000;
    const total = parseInt(subtotal) + totalDeliveryFee;

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    
    // Update delivery fee display
    const deliveryFeeEl = document.getElementById('delivery-fee');
    if (deliveryFeeEl) {
        deliveryFeeEl.textContent = formatCurrency(totalDeliveryFee);
    }
    
    document.getElementById('total-amount').textContent = formatCurrency(total);
}

async function updateQuantity(foodId, newQuantity) {
    if (newQuantity < 1) {
        await removeFromCart(foodId);
        return;
    }

    try {
        await API.put(`/cart/items/${foodId}/`, {
            quantity: newQuantity
        });
        
        // Reload cart to get updated data
        await loadCart();
        updateCartCount();
        
    } catch (error) {
        console.error('Error updating quantity:', error);
        alert('Lỗi khi cập nhật số lượng: ' + error.message);
    }
}

async function updateItemNote(foodId, note) {
    try {
        await API.put(`/cart/items/${foodId}/`, {
            item_note: note
        });
        
        // Update current cart data without full reload
        if (currentCart && currentCart.items) {
            const item = currentCart.items.find(item => item.food.id === foodId);
            if (item) {
                item.item_note = note;
            }
        }
        
    } catch (error) {
        console.error('Error updating item note:', error);
        alert('Lỗi khi cập nhật ghi chú: ' + error.message);
    }
}

async function removeFromCart(foodId) {
    if (!confirm('Bạn có chắc muốn xóa món này khỏi giỏ hàng?')) {
        return;
    }

    try {
        await API.delete(`/cart/items/${foodId}/remove/`);
        
        // Reload cart to get updated data
        await loadCart();
        updateCartCount();
        
        alert('Đã xóa món ăn khỏi giỏ hàng');
        
    } catch (error) {
        console.error('Error removing item:', error);
        alert('Lỗi khi xóa món ăn: ' + error.message);
    }
}

async function clearCart() {
    if (!confirm('Bạn có chắc muốn xóa tất cả món ăn trong giỏ hàng?')) {
        return;
    }

    try {
        await API.delete('/cart/clear/');
        
        // Show empty cart
        showEmptyCart();
        updateCartCount();
        
        alert('Đã xóa tất cả món ăn trong giỏ hàng');
        
    } catch (error) {
        console.error('Error clearing cart:', error);
        alert('Lỗi khi xóa giỏ hàng: ' + error.message);
    }
}

function proceedToCheckout() {
    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
        alert('Giỏ hàng trống! Vui lòng thêm món ăn trước khi thanh toán.');
        return;
    }

    // Redirect to checkout page
    window.location.href = '../checkout/checkout.html';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}

// Export functions for use in other scripts
window.cartPage = {
    loadCart,
    updateQuantity,
    updateItemNote,
    removeFromCart,
    clearCart,
    proceedToCheckout
};
