// Checkout page functionality

document.addEventListener('DOMContentLoaded', async () => {
    // Authentication and UI setup
    if (!isAuthenticated()) {
        alert('Vui lòng đăng nhập để tiếp tục thanh toán');
        window.location.href = '../auth/login.html';
        return;
    }
    updateAuthUI();
    updateCartCount();

    // Prefill user info
    const user = getCurrentUser();
    if (user) {
        document.getElementById('receiver_name').value = user.fullname || '';
        document.getElementById('phone_number').value = user.phone_number || '';
        document.getElementById('ship_address').value = user.address || '';
    }

    // Load cart and render order summary
    const cart = await API.get('/cart/');
    window.checkoutCart = cart;
    renderOrderItems(cart.items);
    updateTotals(cart.total_money);

    // Bind promo code apply button
    const applyBtn = document.getElementById('apply-promo');
    applyBtn.addEventListener('click', applyPromo);

    // Bind place order button
    const placeBtn = document.getElementById('place-order');
    placeBtn.addEventListener('click', placeOrder);
});

function renderOrderItems(items) {
    const container = document.getElementById('summary-items');
    container.innerHTML = items.map(item => {
        return `
            <div class="summary-row">
                <span>${item.food.title} x ${item.quantity}</span>
                <span>${formatCurrency(item.subtotal)}</span>
            </div>
        `;
    }).join('');
}

function updateTotals(subtotal, discount = 0) {
    const subtotalEl = document.getElementById('summary-subtotal');
    const discountEl = document.getElementById('summary-discount');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');

    subtotalEl.textContent = formatCurrency(subtotal);
    discountEl.textContent = formatCurrency(discount);
    // Calculate shipping fee: 15,000 VND if subtotal > 0
    const shippingFee = subtotal > 0 ? 15000 : 0;
    shippingEl.textContent = formatCurrency(shippingFee);
    const total = Number(subtotal) - Number(discount) + shippingFee;
    totalEl.textContent = formatCurrency(total);

    // Store for order placement
    window.checkoutSubtotal = subtotal;
    window.checkoutShipping = shippingFee;
    window.checkoutDiscount = discount;
}

async function applyPromo() {
    const codeInput = document.getElementById('promo_code');
    const messageEl = document.getElementById('promo-message');
    const code = codeInput.value.trim();
    messageEl.textContent = '';

    if (!code) {
        messageEl.textContent = 'Hãy nhập mã khuyến mãi';
        return;
    }
    
    try {
        const response = await API.post('/promotions/validate/', {
            promo_code: code,
            total_amount: window.checkoutSubtotal
        });
        if (response.valid) {
            const discount = parseFloat(response.discount_amount);
            updateTotals(window.checkoutSubtotal, discount);
            messageEl.textContent = `Áp dụng thành công: -${formatCurrency(discount)}`;
        } else {
            messageEl.textContent = response.error || 'Mã không hợp lệ';
        }
    } catch (error) {
        messageEl.textContent = 'Lỗi kiểm tra mã: ' + error.message;
    }
}

async function placeOrder() {
    const receiver = document.getElementById('receiver_name').value.trim();
    const phone = document.getElementById('phone_number').value.trim();
    const address = document.getElementById('ship_address').value.trim();
    const note = document.getElementById('note').value.trim();

    if (!receiver || !phone || !address) {
        alert('Vui lòng điền đầy đủ thông tin giao hàng');
        return;
    }

    const user = getCurrentUser();  // get current user
    const payload = {
        user_id: user ? user.id : undefined,
        receiver_name: receiver,
        phone_number: phone,
        ship_address: address,
        note: note,
        payment_method: 'cash',
        total_money: window.checkoutSubtotal
    };
    if (document.getElementById('promo-message')?.textContent) {
        // promo applied - optional
        payload.promo_id = document.getElementById('promo_code').value.trim();
    }

    try {
        const order = await API.post('/orders/', payload);
        alert('Đặt hàng thành công! Mã đơn: ' + order.id);
    window.location.href = '../orders/orders.html';
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Lỗi khi đặt hàng: ' + error.message);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}
