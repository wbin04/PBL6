// Shopping cart utilities
async function addToCart(foodId, foodTitle, foodPrice) {
    if (!isAuthenticated()) {
        alert('Vui lòng đăng nhập để thêm vào giỏ hàng');
        window.location.href = '/auth/login.html';
        return;
    }

    try {
        await API.post('/cart/add/', {
            food_id: foodId,
            quantity: 1
        });
        
        // Show success message with option to view cart
        if (confirm(`Đã thêm "${foodTitle}" vào giỏ hàng!\n\nBạn có muốn xem giỏ hàng không?`)) {
            window.location.href = '/cart/cart.html';
        }
        
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Lỗi thêm vào giỏ hàng: ' + error.message);
    }
}

async function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;

    if (!isAuthenticated()) {
        cartCountElement.textContent = '0';
        return;
    }

    try {
        const cart = await API.get('/cart/');
        const totalItems = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        cartCountElement.textContent = totalItems.toString();
    } catch (error) {
        console.error('Error updating cart count:', error);
        cartCountElement.textContent = '0';
    }
}

async function proceedToCheckout() {
    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
        alert('Giỏ hàng trống! Vui lòng thêm món ăn trước khi thanh toán.');
        return;
    }

    // Redirect to checkout page
    window.location.href = '../checkout/checkout.html';
}

// Initialize cart count when DOM is loaded
document.addEventListener('DOMContentLoaded', updateCartCount);
