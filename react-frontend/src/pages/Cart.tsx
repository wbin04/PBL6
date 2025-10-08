import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatPrice, isAuthenticated, type Cart as CartType } from '@/lib/api';
import { Button } from '@/components/ui/button';

const Cart: React.FC = () => {
  const [cart, setCart] = useState<CartType | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthentication();
    loadCart();
  }, []);

  const checkAuthentication = () => {
    if (!isAuthenticated()) {
      alert('Vui lòng đăng nhập để xem giỏ hàng');
      navigate('/login');
      return;
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await API.get<CartType>('/cart/');
      setCart(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
      alert('Lỗi khi tải giỏ hàng: ' + (error instanceof Error ? error.message : String(error)));
      showEmptyCart();
    } finally {
      setLoading(false);
    }
  };

  const showEmptyCart = () => {
    setCart({ items: [], total_price: 0 });
  };

  const updateQuantity = async (foodId: number, newQuantity: number) => {
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
      // Update cart count in header (if function exists)
      if ((window as any).updateCartCount) {
        (window as any).updateCartCount();
      }
      
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Lỗi khi cập nhật số lượng: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const removeFromCart = async (foodId: number) => {
    if (!confirm('Bạn có chắc muốn xóa món này khỏi giỏ hàng?')) {
      return;
    }

    try {
      await API.delete(`/cart/items/${foodId}/remove/`);
      
      // Reload cart to get updated data
      await loadCart();
      // Update cart count in header (if function exists)
      if ((window as any).updateCartCount) {
        (window as any).updateCartCount();
      }
      
      alert('Đã xóa món ăn khỏi giỏ hàng');
      
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Lỗi khi xóa món ăn: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const clearCart = async () => {
    if (!confirm('Bạn có chắc muốn xóa tất cả món ăn trong giỏ hàng?')) {
      return;
    }

    try {
      await API.delete('/cart/clear/');
      
      // Show empty cart
      showEmptyCart();
      // Update cart count in header (if function exists)
      if ((window as any).updateCartCount) {
        (window as any).updateCartCount();
      }
      
      alert('Đã xóa tất cả món ăn trong giỏ hàng');
      
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Lỗi khi xóa giỏ hàng: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const proceedToCheckout = () => {
    if (!cart || !cart.items || cart.items.length === 0) {
      alert('Giỏ hàng trống! Vui lòng thêm món ăn trước khi thanh toán.');
      return;
    }

    // Redirect to checkout page
    navigate('/checkout');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTotalItems = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getSubtotal = () => {
    return cart?.total_price || 0;
  };

  const getDeliveryFee = () => {
    return getSubtotal() > 0 ? 15000 : 0;
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-5">
        <div className="text-center py-12 text-gray-600">
          <p>Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-5">
        <div className="text-center mb-8">
          <h1 className="text-orange-500 text-4xl font-bold mb-2">🛒 Giỏ hàng của bạn</h1>
          <p>Xem lại và chỉnh sửa đơn hàng trước khi thanh toán</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="text-center py-16">
            <div className="text-8xl opacity-30 mb-5">🛒</div>
            <h3 className="text-gray-600 text-xl mb-4">Giỏ hàng của bạn đang trống</h3>
            <p className="text-gray-400 mb-6">Hãy thêm một số món ăn ngon vào giỏ hàng!</p>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg font-bold">
              <Link to="/menu">Khám phá thực đơn</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-5">
      <div className="text-center mb-8">
        <h1 className="text-orange-500 text-4xl font-bold mb-2">🛒 Giỏ hàng của bạn</h1>
        <p>Xem lại và chỉnh sửa đơn hàng trước khi thanh toán</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-5">
          {cart.items.map((item) => (
            <div 
              key={item.food.id}
              className="flex items-center p-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <img
                src={`http://localhost:8000/media/${item.food.image}`}
                alt={item.food.name}
                className="w-20 h-20 rounded-lg object-cover mr-5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 mb-1">{item.food.name}</div>
                <div className="text-orange-500 font-bold text-lg">{formatCurrency(item.food.price)}</div>
              </div>

              <div className="flex items-center mx-5">
                <button
                  className="bg-orange-500 text-white border-0 w-9 h-9 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
                  onClick={() => updateQuantity(item.food.id, item.quantity - 1)}
                >
                  −
                </button>
                <span className="mx-4 text-lg font-bold min-w-8 text-center">
                  {item.quantity}
                </span>
                <button
                  className="bg-orange-500 text-white border-0 w-9 h-9 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
                  onClick={() => updateQuantity(item.food.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="text-xl font-bold text-orange-500 ml-5 min-w-24 text-right">
                {formatCurrency(item.price)}
              </div>

              <button
                className="bg-red-500 text-white border-0 px-4 py-2 rounded-full cursor-pointer ml-4 hover:bg-red-600 transition-colors"
                onClick={() => removeFromCart(item.food.id)}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-6 border-t-2 border-orange-500">
          <div className="flex justify-between mb-4 text-lg">
            <span>Tổng số món:</span>
            <span>{getTotalItems()}</span>
          </div>
          <div className="flex justify-between mb-4 text-lg">
            <span>Tạm tính:</span>
            <span className="text-orange-500 font-bold">{formatCurrency(getSubtotal())}</span>
          </div>
          <div className="flex justify-between mb-4 text-lg">
            <span>Phí giao hàng:</span>
            <span className="text-orange-500 font-bold">{formatCurrency(getDeliveryFee())}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-orange-500 border-t-2 border-gray-300 pt-4">
            <span>Tổng cộng:</span>
            <span>{formatCurrency(getTotal())}</span>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              className="flex-1 py-4 px-8 border-0 rounded-full text-lg font-bold cursor-pointer transition-all bg-gray-500 text-white hover:bg-gray-600"
              onClick={clearCart}
            >
              Xóa tất cả
            </button>
            <button
              className="flex-1 py-4 px-8 border-0 rounded-full text-lg font-bold cursor-pointer transition-all bg-orange-500 text-white hover:bg-orange-600 hover:-translate-y-1"
              onClick={proceedToCheckout}
            >
              Tiến hành thanh toán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;