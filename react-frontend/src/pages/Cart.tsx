import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getImageUrl, formatPrice } from '@/lib/api';
import { Button } from '@/components/ui/button';

// Định nghĩa type CartItem và Cart
type CartItem = {
  food_id: number;
  title: string;
  price: number;
  quantity: number;
  image?: string; // Thêm image để hiển thị
};

type Cart = {
  items: CartItem[];
  total_price: number;
};

const Cart: React.FC = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthentication();
    loadCart();
  }, []);

  // Kiểm tra đăng nhập (giả lập, vì không có API)
  const checkAuthentication = () => {
    // Giả sử luôn đăng nhập cho dữ liệu cứng
    // Nếu cần kiểm tra thực tế, bạn có thể thêm logic kiểm tra token trong localStorage
    return true;
  };

  const loadCart = () => {
    try {
      setLoading(true);
      // Lấy dữ liệu từ localStorage (được lưu từ Items.tsx)
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      
      // Tạo dữ liệu minh họa cứng để bổ sung thông tin hình ảnh
      const mockFoods = [
        {
          id: 1,
          title: "Cơm gà xối mỡ",
          price: 35000,
          image: "/images/com-ga.jpg",
        },
        {
          id: 2,
          title: "Canh chua cá",
          price: 45000,
          image: "/images/canh-chua.jpg",
        },
        {
          id: 3,
          title: "Pizza Hải Sản",
          price: 120000,
          image: "/images/pizza-seafood.jpg",
        },
        {
          id: 4,
          title: "Pizza Phô Mai",
          price: 99000,
          image: "/images/pizza-cheese.jpg",
        },
        {
          id: 5,
          title: "Mỳ Ý Bò Bằm",
          price: 85000,
          image: "/images/spaghetti.jpg",
        },
        {
          id: 6,
          title: "Gà Rán Giòn",
          price: 45000,
          image: "/images/fried-chicken.jpg",
        },
        {
          id: 7,
          title: "Burger Bò",
          price: 55000,
          image: "/images/burger-beef.jpg",
        },
      ];

      // Bổ sung thông tin hình ảnh cho cart items
      const enrichedCartItems = cartData.map((item: CartItem) => {
        const food = mockFoods.find((f) => f.id === item.food_id);
        return {
          ...item,
          image: food ? food.image : '/images/placeholder.jpg',
        };
      });

      const total_price = enrichedCartItems.reduce(
        (sum: number, item: CartItem) => sum + item.price * item.quantity,
        0
      );

      setCart({ items: enrichedCartItems, total_price });
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

  const updateQuantity = (foodId: number, newQuantity: number) => {
    try {
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      if (newQuantity < 1) {
        removeFromCart(foodId);
        return;
      }

      const updatedCart = cartData.map((item: CartItem) =>
        item.food_id === foodId ? { ...item, quantity: newQuantity } : item
      );

      localStorage.setItem('cart', JSON.stringify(updatedCart));
      loadCart(); // Tải lại giỏ hàng
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Lỗi khi cập nhật số lượng: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const removeFromCart = (foodId: number) => {
    if (!confirm('Bạn có chắc muốn xóa món này khỏi giỏ hàng?')) {
      return;
    }

    try {
      const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
      const updatedCart = cartData.filter((item: CartItem) => item.food_id !== foodId);

      localStorage.setItem('cart', JSON.stringify(updatedCart));
      loadCart(); // Tải lại giỏ hàng
      alert('Đã xóa món ăn khỏi giỏ hàng');
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Lỗi khi xóa món ăn: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const clearCart = () => {
    if (!confirm('Bạn có chắc muốn xóa tất cả món ăn trong giỏ hàng?')) {
      return;
    }

    try {
      localStorage.setItem('cart', JSON.stringify([]));
      showEmptyCart();
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

    navigate('/checkout');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
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
              key={item.food_id}
              className="flex items-center p-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <img
                src={getImageUrl(item.image || '/images/placeholder.jpg')}
                alt={item.title}
                className="w-20 h-20 rounded-lg object-cover mr-5"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                }}
              />
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 mb-1">{item.title}</div>
                <div className="text-orange-500 font-bold text-lg">{formatCurrency(item.price)}</div>
              </div>
              <div className="flex items-center mx-5">
                <button
                  className="bg-orange-500 text-white border-0 w-9 h-9 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
                  onClick={() => updateQuantity(item.food_id, item.quantity - 1)}
                >
                  −
                </button>
                <span className="mx-4 text-lg font-bold min-w-8 text-center">
                  {item.quantity}
                </span>
                <button
                  className="bg-orange-500 text-white border-0 w-9 h-9 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
                  onClick={() => updateQuantity(item.food_id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <div className="text-xl font-bold text-orange-500 ml-5 min-w-24 text-right">
                {formatCurrency(item.price * item.quantity)}
              </div>
              <button
                className="bg-red-500 text-white border-0 px-4 py-2 rounded-full cursor-pointer ml-4 hover:bg-red-600 transition-colors"
                onClick={() => removeFromCart(item.food_id)}
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