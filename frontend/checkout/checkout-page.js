// Checkout page functionality

// Initialize global variables
window.appliedPromos = null;
window.checkoutSubtotal = 0;

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

    // Bind choose promo button
    const chooseBtn = document.getElementById('choose-promo');
    chooseBtn.addEventListener('click', openPromoModal);

    // Bind place order button
    const placeBtn = document.getElementById('place-order');
    placeBtn.addEventListener('click', placeOrder);

    // Setup promo modal
    setupPromoModal();
});

function renderOrderItems(items) {
    const container = document.getElementById('summary-items');
    
    // Group items by store
    const itemsByStore = {};
    items.forEach(item => {
        const storeId = item.food.store.id;
        if (!itemsByStore[storeId]) {
            itemsByStore[storeId] = {
                store: item.food.store,
                items: []
            };
        }
        itemsByStore[storeId].items.push(item);
    });
    
    // Debug: Check appliedPromos
    
    // Generate HTML for each store group
    const storeGroupsHTML = Object.keys(itemsByStore).map(storeId => {
        const storeGroup = itemsByStore[storeId];
        const store = storeGroup.store;
        const storeItems = storeGroup.items;
        
        // Calculate store subtotal
        const storeSubtotal = storeItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        // Get discount for this store (if any)
        let storeDiscount = 0;
        
        if (window.appliedPromos && Array.isArray(window.appliedPromos)) {
            // Calculate discount based on the proportional allocation from applyMultiplePromos
            const totalCartAmount = window.checkoutSubtotal || 0;
            
            window.appliedPromos.forEach(ap => {
                const promoStoreId = ap.promo?.store_id;
                
                if (promoStoreId == storeId) {
                    // Store-specific promo - use full discount for this store
                    storeDiscount += ap.discount;
                } else if (promoStoreId === 0 && totalCartAmount > 0) {
                    // System-wide promo - distribute proportionally based on store subtotal
                    const storeRatio = storeSubtotal / totalCartAmount;
                    const systemDiscountForThisStore = ap.discount * storeRatio;
                    storeDiscount += systemDiscountForThisStore;
                }
            });
        }
        
        const storeItemsHTML = storeItems.map(item => `
            <div class="summary-item">
                <img src="http://localhost:8000/media/${item.food.image}" 
                     alt="${item.food.title}" 
                     class="item-image" 
                     onerror="this.style.display='none'">
                <div class="item-details">
                    <div class="item-name">${item.food.title}</div>
                    <div class="item-quantity">Số lượng: ${item.quantity}</div>
                    <div class="item-price">${formatCurrency(item.food.price)} x ${item.quantity}</div>
                    ${item.item_note ? `<div class="item-note">Ghi chú: ${item.item_note}</div>` : ''}
                </div>
                <div class="item-total">${formatCurrency(item.subtotal)}</div>
            </div>
        `).join('');
        
        return `
            <div class="store-order-group">
                <div class="store-header">
                    <img src="http://localhost:8000/media/${store.image}" 
                         alt="${store.store_name}" 
                         class="store-logo"
                         onerror="this.style.display='none'">
                    <h4 class="store-name">${store.store_name}</h4>
                </div>
                <div class="store-items">
                    ${storeItemsHTML}
                </div>
                <div class="store-summary">
                    <div class="summary-row">
                        <span>Tạm tính cửa hàng:</span>
                        <span>${formatCurrency(storeSubtotal)}</span>
                    </div>
                    ${storeDiscount > 0 ? `
                    <div class="summary-row store-discount">
                        <span>Giảm giá:</span>
                        <span>-${formatCurrency(storeDiscount)}</span>
                    </div>
                    ` : ''}
                    <div class="summary-row">
                        <span>Phí vận chuyển:</span>
                        <span>${formatCurrency(15000)}</span>
                    </div>
                    <div class="summary-row store-total">
                        <span>Tổng cửa hàng:</span>
                        <span>${formatCurrency(storeSubtotal - storeDiscount + 15000)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = storeGroupsHTML;
}

function updateTotals(subtotal, discount = 0) {
    const subtotalEl = document.getElementById('summary-subtotal');
    const discountEl = document.getElementById('summary-discount');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');

    subtotalEl.textContent = formatCurrency(subtotal);
    discountEl.textContent = formatCurrency(discount);
    
    // Calculate shipping fee based on number of stores
    const cart = window.checkoutCart;
    const storeIds = new Set();
    if (cart && cart.items) {
        cart.items.forEach(item => {
            storeIds.add(item.food.store.id);
        });
    }
    const numberOfStores = storeIds.size;
    const shippingFee = numberOfStores * 15000;
    
    shippingEl.textContent = formatCurrency(shippingFee);
    const total = Number(subtotal) - Number(discount) + shippingFee;
    totalEl.textContent = formatCurrency(total);

    // Store for order placement
    window.checkoutSubtotal = subtotal;
    window.checkoutShipping = shippingFee;
    window.checkoutDiscount = discount;
}

async function applyMultiplePromos() {
    const messageEl = document.getElementById('promo-message');
    messageEl.textContent = '';

    if (!window.selectedPromos || window.selectedPromos.length === 0) {
        messageEl.textContent = 'Chưa chọn mã khuyến mãi nào';
        // Clear any existing applied promos
        window.appliedPromos = null;
        updateTotals(window.checkoutSubtotal, 0);
        const cart = window.checkoutCart;
        renderOrderItems(cart.items);
        return;
    }
    
    try {
        let totalDiscount = 0;
        let appliedPromos = [];
        let hasError = false;

        // Calculate subtotal for each store from cart items
        const cart = window.checkoutCart;
        const storeSubtotals = {};
        
        cart.items.forEach(item => {
            const storeId = item.food.store.id;
            if (!storeSubtotals[storeId]) {
                storeSubtotals[storeId] = 0;
            }
            storeSubtotals[storeId] += item.subtotal;
        });

        // Apply each promo separately with correct store subtotal
        for (const promo of window.selectedPromos) {
            try {
                // For system-wide promos (store_id = 0), use total cart amount
                // For store-specific promos, use that store's subtotal
                let amountToValidate;
                if (promo.store_id === 0) {
                    amountToValidate = window.checkoutSubtotal;
                } else {
                    // Convert both to strings for reliable comparison
                    const promoStoreIdStr = String(promo.store_id);
                    let storeAmount = 0;
                    
                    // Find the correct store amount
                    for (const [storeId, amount] of Object.entries(storeSubtotals)) {
                        if (String(storeId) === promoStoreIdStr) {
                            storeAmount = amount;
                            break;
                        }
                    }
                    
                    if (storeAmount > 0) {
                        amountToValidate = storeAmount;
                    } else {
                        amountToValidate = window.checkoutSubtotal;
                    }
                }

                const response = await API.post('/promotions/validate/', {
                    promo_id: promo.id,
                    total_amount: amountToValidate
                });
                
                if (response.valid) {
                    let discount = parseFloat(response.discount_amount);
                    totalDiscount += discount;
                    appliedPromos.push({
                        promo: promo,
                        discount: discount,
                        storeAmount: promo.store_id === 0 ? window.checkoutSubtotal : storeSubtotals[promo.store_id]
                    });
                }
            } catch (error) {
                console.error(`Error validating promo ${promo.id}:`, error);
                hasError = true;
            }
        }

        if (appliedPromos.length > 0) {
            // Store applied promos for order placement FIRST
            window.appliedPromos = appliedPromos;
            
            updateTotals(window.checkoutSubtotal, totalDiscount);
            
            // Re-render order items to show store-level discounts
            const cart = window.checkoutCart;
            renderOrderItems(cart.items);
            
            const promoNames = appliedPromos.map(ap => ap.promo.name.split(' - ')[0]).join(', ');
            messageEl.textContent = `Áp dụng thành công ${appliedPromos.length} mã: ${promoNames} - Tổng giảm: ${formatCurrency(totalDiscount)}`;
            messageEl.style.color = '#28a745';
        } else {
            messageEl.textContent = 'Không có mã nào hợp lệ';
            messageEl.style.color = '#dc3545';
            window.appliedPromos = null;
        }

        if (hasError) {
            messageEl.textContent += ' (Một số mã có lỗi kiểm tra)';
        }

    } catch (error) {
        console.error('Multiple promo validation error:', error);
        messageEl.textContent = 'Lỗi kiểm tra mã: ' + error.message;
        messageEl.style.color = '#dc3545';
        window.appliedPromos = null;
    }
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

    // Check if it's multiple codes (comma separated)
    if (code.includes(',')) {
        const codes = code.split(',').map(c => c.trim());
        await applyMultiplePromoCodes(codes);
        return;
    }
    
    try {
        let requestData = {
            total_amount: window.checkoutSubtotal
        };

        // Check if code is in format "PROMO{id}" (from promo selection)
        if (code.startsWith('PROMO')) {
            const promoId = code.replace('PROMO', '');
            requestData.promo_id = parseInt(promoId);
        } else {
            // Traditional promo code
            requestData.promo_code = code;
        }

        const response = await API.post('/promotions/validate/', requestData);
        
        if (response.valid) {
            const discount = parseFloat(response.discount_amount);
            updateTotals(window.checkoutSubtotal, discount);
            
            // Re-render order items to show store-level discounts for single promo
            const cart = window.checkoutCart;
            if (requestData.promo_id) {
                // Find the promo and create appliedPromos structure
                const promo = window.availablePromos?.find(p => p.id === requestData.promo_id);
                if (promo) {
                    window.appliedPromos = [{
                        promo: promo,
                        discount: discount
                    }];
                } else {
                    // Create minimal promo structure if not found
                    window.appliedPromos = [{
                        promo: {
                            id: requestData.promo_id,
                            store_id: response.promo?.store_id || 0
                        },
                        discount: discount
                    }];
                }
            } else {
                // For promo_code, create structure with store info from response
                window.appliedPromos = [{
                    promo: {
                        id: response.promo?.id,
                        store_id: response.promo?.store_id || 0
                    },
                    discount: discount
                }];
            }
            renderOrderItems(cart.items);
            
            messageEl.textContent = `Áp dụng thành công: -${formatCurrency(discount)}`;
            messageEl.style.color = '#28a745';
        } else {
            messageEl.textContent = response.error || 'Mã không hợp lệ';
            messageEl.style.color = '#dc3545';
            window.appliedPromos = null;
        }
    } catch (error) {
        console.error('Promo validation error:', error);
        messageEl.textContent = 'Lỗi kiểm tra mã: ' + error.message;
        messageEl.style.color = '#dc3545';
        window.appliedPromos = null;
    }
}

async function applyMultiplePromoCodes(codes) {
    const messageEl = document.getElementById('promo-message');
    
    try {
        let totalDiscount = 0;
        let appliedPromos = [];
        
        for (const code of codes) {
            if (!code) continue;
            
            let requestData = {
                total_amount: window.checkoutSubtotal
            };

            if (code.startsWith('PROMO')) {
                const promoId = code.replace('PROMO', '');
                requestData.promo_id = parseInt(promoId);
            } else {
                requestData.promo_code = code;
            }

            try {
                const response = await API.post('/promotions/validate/', requestData);
                
                if (response.valid) {
                    const discount = parseFloat(response.discount_amount);
                    totalDiscount += discount;
                    appliedPromos.push({
                        promo: {
                            id: response.promo?.id,
                            store_id: response.promo?.store_id || 0,
                            name: response.promo?.name || code
                        },
                        discount: discount,
                        code: code
                    });
                }
            } catch (error) {
                console.warn(`Error validating code ${code}:`, error);
            }
        }

        if (appliedPromos.length > 0) {
            // Store applied promos FIRST
            window.appliedPromos = appliedPromos;
            
            updateTotals(window.checkoutSubtotal, totalDiscount);
            
            // Re-render order items to show store-level discounts
            const cart = window.checkoutCart;
            renderOrderItems(cart.items);
            
            messageEl.textContent = `Áp dụng thành công ${appliedPromos.length} mã - Tổng giảm: ${formatCurrency(totalDiscount)}`;
            messageEl.style.color = '#28a745';
        } else {
            messageEl.textContent = 'Không có mã nào hợp lệ';
            messageEl.style.color = '#dc3545';
            window.appliedPromos = null;
        }
    } catch (error) {
        console.error('Multiple promo codes error:', error);
        messageEl.textContent = 'Lỗi kiểm tra mã: ' + error.message;
        messageEl.style.color = '#dc3545';
        window.appliedPromos = null;
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
        payment_method: 'COD',
        shipping_fee: window.checkoutShipping || 15000
    };
    
    // Add promo if applied successfully
    if (window.appliedPromos && window.appliedPromos.length > 0) {
        console.log('Applied promos before order:', window.appliedPromos);
        payload.promo_ids = window.appliedPromos.map(ap => ap.promo?.id || ap.id);
        payload.discount_amount = window.appliedPromos.reduce((sum, ap) => sum + ap.discount, 0);
        
        // Include detailed promo info for backend to save correctly
        payload.promo_details = window.appliedPromos.map(ap => ({
            promo_id: ap.promo?.id || ap.id,
            store_id: ap.promo?.store_id || 0,
            discount: ap.discount
        }));
        
        console.log('Promo payload:', { 
            promo_ids: payload.promo_ids, 
            discount_amount: payload.discount_amount,
            promo_details: payload.promo_details
        });
    }

    console.log('Final order payload:', payload);

    // Validate payload before sending
    if (payload.promo_ids && payload.discount_amount) {
        if (payload.discount_amount > 10000000) { // 10 million limit
            alert('Lỗi: Số tiền giảm giá quá lớn: ' + formatCurrency(payload.discount_amount));
            return;
        }
        console.log('Promo validation passed:', payload.discount_amount);
    }

    try {
        const order = await API.post('/orders/', payload);
        if (order.message) {
            alert(order.message);
        } else {
            alert('Đặt hàng thành công! Mã đơn: ' + order.id);
        }
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

// Promo modal functionality
function setupPromoModal() {
    const modal = document.getElementById('promo-modal');
    const closeBtn = document.querySelector('.promo-modal-close');
    const cancelBtn = document.getElementById('cancel-promo');
    const selectBtn = document.getElementById('select-promo');

    // Close modal events
    closeBtn.addEventListener('click', cancelPromoSelection);
    cancelBtn.addEventListener('click', cancelPromoSelection);
    
    // Click outside modal to close
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            cancelPromoSelection();
        }
    });

    // Select promo button
    selectBtn.addEventListener('click', selectPromo);
}

async function openPromoModal() {
    const modal = document.getElementById('promo-modal');
    modal.style.display = 'block';
    
    // Load available promotions
    await loadAvailablePromos();
}

function closePromoModal() {
    const modal = document.getElementById('promo-modal');
    modal.style.display = 'none';
}

function cancelPromoSelection() {
    // Clear selection only when canceling
    window.selectedPromos = [];
    const selectButton = document.getElementById('select-promo');
    selectButton.disabled = true;
    selectButton.textContent = 'Chọn mã này';
    
    closePromoModal();
}

async function loadAvailablePromos() {
    const promoList = document.getElementById('promo-list');
    const cart = window.checkoutCart;
    
    if (!cart || !cart.items || cart.items.length === 0) {
        promoList.innerHTML = '<div class="promo-empty"><p>Giỏ hàng trống</p></div>';
        return;
    }

    try {
        // Get unique store IDs from cart
        const storeIds = [...new Set(cart.items.map(item => item.food.store.id))];
        
        // Load promotions for these stores + system-wide (store_id = 0)
        const allStoreIds = [0, ...storeIds]; // Include system-wide promotions
        
        const promoPromises = allStoreIds.map(storeId => 
            API.get(`/promotions/?store=${storeId}&active=true`)
        );
        
        const promoResponses = await Promise.all(promoPromises);
        
        // Combine all promotions
        let allPromos = [];
        promoResponses.forEach((response, index) => {
            if (response.results) {
                allPromos = allPromos.concat(response.results);
            } else if (Array.isArray(response)) {
                allPromos = allPromos.concat(response);
            }
        });

        // Remove duplicates (in case of API overlaps)
        const uniquePromos = allPromos.filter((promo, index, self) => 
            index === self.findIndex(p => p.id === promo.id)
        );

        // Store globally for access in other functions
        window.availablePromos = uniquePromos;

        if (uniquePromos.length === 0) {
            promoList.innerHTML = `
                <div class="promo-empty">
                    <p>Không có khuyến mãi nào</p>
                    <small>Các cửa hàng (${storeIds.join(', ')}) trong giỏ hàng chưa có khuyến mãi</small>
                </div>
            `;
            return;
        }

        // Group promotions by store
        const promosByStore = {};
        
        // Create a map of store info from cart items
        const storeInfoMap = {};
        cart.items.forEach(item => {
            const store = item.food.store;
            storeInfoMap[store.id] = {
                id: store.id,
                name: store.store_name
            };
        });
        
        uniquePromos.forEach(promo => {
            const storeKey = promo.store_id === 0 ? 'system' : promo.store_id;
            let storeName;
            
            if (promo.store_id === 0) {
                storeName = 'Toàn hệ thống';
            } else {
                // Try to get store name from cart items first, then from promo data, then fallback
                storeName = storeInfoMap[promo.store_id]?.name || 
                           promo.store?.store_name || 
                           `Cửa hàng ${promo.store_id}`;
            }
            
            if (!promosByStore[storeKey]) {
                promosByStore[storeKey] = {
                    name: storeName,
                    promos: []
                };
            }
            promosByStore[storeKey].promos.push(promo);
        });

        // Generate HTML grouped by store
        let promosHTML = '';
        
        // Sort stores: system first, then others
        const sortedStores = Object.keys(promosByStore).sort((a, b) => {
            if (a === 'system') return -1;
            if (b === 'system') return 1;
            return 0;
        });

        sortedStores.forEach(storeKey => {
            const storeGroup = promosByStore[storeKey];
            
            promosHTML += `
                <div class="promo-store-group">
                    <h4 class="promo-store-title">${storeGroup.name}</h4>
                    <div class="promo-store-items">
            `;

            storeGroup.promos.forEach(promo => {
                const discount = promo.category === 'PERCENT' 
                    ? `Giảm ${promo.discount_value}%`
                    : `Giảm ${formatCurrency(promo.discount_value)}`;
                
                const minPay = promo.minimum_pay > 0 
                    ? ` (đơn tối thiểu ${formatCurrency(promo.minimum_pay)})`
                    : '';

                const maxDiscount = promo.category === 'PERCENT' && promo.max_discount_amount 
                    ? ` (tối đa ${formatCurrency(promo.max_discount_amount)})`
                    : '';

                // Check if promo meets minimum payment requirement
                const minPayAmount = parseFloat(promo.minimum_pay) || 0;
                const isEligible = cart.total_money >= minPayAmount;
                const disabledClass = isEligible ? '' : 'promo-disabled';
                const disabledAttr = isEligible ? '' : 'data-disabled="true"';

                promosHTML += `
                    <div class="promo-item ${disabledClass}" data-promo-id="${promo.id}" ${disabledAttr}>
                        <div class="promo-name">${promo.name}</div>
                        <div class="promo-details">${discount}${minPay}${maxDiscount}</div>
                        ${!isEligible ? `<div class="promo-requirement">Cần thêm ${formatCurrency(minPayAmount - cart.total_money)} để đạt điều kiện</div>` : ''}
                    </div>
                `;
            });

            promosHTML += `
                    </div>
                </div>
            `;
        });

        promoList.innerHTML = promosHTML;

        // Add click handlers
        document.querySelectorAll('.promo-item').forEach(item => {
            item.addEventListener('click', () => {
                // Check if promo is disabled
                if (item.hasAttribute('data-disabled')) {
                    return; // Don't allow selection of disabled promos
                }

                const promoId = parseInt(item.dataset.promoId);
                const selectedPromo = uniquePromos.find(p => p.id === promoId);
                const storeId = selectedPromo.store_id;

                // Initialize selected promos array if not exists
                if (!window.selectedPromos) {
                    window.selectedPromos = [];
                }

                // Check if this promo is already selected
                const isCurrentlySelected = item.classList.contains('selected');
                
                if (isCurrentlySelected) {
                    // Deselect this promo
                    item.classList.remove('selected');
                    window.selectedPromos = window.selectedPromos.filter(p => p.id !== promoId);
                } else {
                    // Remove any existing selection from the same store
                    window.selectedPromos = window.selectedPromos.filter(p => p.store_id !== storeId);
                    
                    // Remove visual selection from same store
                    document.querySelectorAll('.promo-item').forEach(otherItem => {
                        const otherPromoId = parseInt(otherItem.dataset.promoId);
                        const otherPromo = uniquePromos.find(p => p.id === otherPromoId);
                        if (otherPromo && otherPromo.store_id === storeId) {
                            otherItem.classList.remove('selected');
                        }
                    });
                    
                    // Select this promo
                    item.classList.add('selected');
                    window.selectedPromos.push(selectedPromo);
                }

                // Enable/disable select button based on selection
                const selectButton = document.getElementById('select-promo');
                if (window.selectedPromos.length > 0) {
                    selectButton.disabled = false;
                    selectButton.textContent = `Chọn ${window.selectedPromos.length} mã`;
                } else {
                    selectButton.disabled = true;
                    selectButton.textContent = 'Chọn mã này';
                }
            });
        });

    } catch (error) {
        console.error('Error loading promotions:', error);
        promoList.innerHTML = `
            <div class="promo-empty">
                <p>Lỗi tải khuyến mãi</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function selectPromo() {
    if (!window.selectedPromos || window.selectedPromos.length === 0) return;
    
    const promoInput = document.getElementById('promo_code');
    
    // Create a combined promo code from selected promos
    const promoCodes = window.selectedPromos.map(promo => `PROMO${promo.id}`);
    promoInput.value = promoCodes.join(',');
    
    // Close modal
    closePromoModal();
    
    // Auto apply the promos
    applyMultiplePromos();
}
