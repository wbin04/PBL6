import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";

type CartItem = {
  id: number;
  food: {
    id: number;
    title: string;
    price: string;
    image_url: string;
    store_name: string;
  };
  food_option?: {
    id: number;
    size_name: string;
    price: string;
  };
  quantity: number;
  item_note?: string;
  subtotal: string;
};

type Cart = {
  id: number;
  total_money: string;
  items_count: number;
  items: CartItem[];
};

// Component riêng cho hình ảnh món ăn để tránh re-render không cần thiết
const FoodImage: React.FC<{ item: CartItem }> = React.memo(({ item }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Tính toán imageSrc với fallback tốt hơn
  const imageSrc = item.food.image_url
    ? getImageUrl(item.food.image_url)
    : null;

  // Reset states khi item.food.image_url thay đổi
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [item.food.image_url]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Đặt thành true để ẩn loading spinner
  };

  return (
    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
      {imageSrc && !imageError ? (
        <img
          src={imageSrc}
          alt={item.food.title}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        // Hiển thị placeholder text/icon thay vì ảnh placeholder
        <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
          <div className="text-2xl mb-1">🍽️</div>
          <span>Món ăn</span>
        </div>
      )}

      {imageSrc && !imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
});

FoodImage.displayName = "FoodImage";

const Cart: React.FC = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (checkAuthentication()) {
      loadCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthentication = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/auth/login");
      return false;
    }
    return true;
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await API.get("/cart/");
      setCart(response as Cart);
    } catch (error: unknown) {
      console.error("Error loading cart:", error);
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        (error as { response: { status: number } }).response?.status === 401
      ) {
        navigate("/auth/login");
      } else {
        alert(
          "Lỗi khi tải giỏ hàng: " +
            (error instanceof Error ? error.message : "Vui lòng thử lại")
        );
        showEmptyCart();
      }
    } finally {
      setLoading(false);
    }
  };

  const showEmptyCart = () => {
    setCart({ id: 0, total_money: "0.00", items_count: 0, items: [] });
  };

  /** Tính lại subtotal sau khi thay đổi items */
  const recalcCart = (items: CartItem[]) => {
    const newSubtotal = items.reduce(
      (acc, i) => acc + parseFloat(i.subtotal),
      0
    );
    return {
      ...cart!,
      items,
      items_count: items.length,
      total_money: newSubtotal.toString(),
    };
  };

  const updateQuantity = async (foodId: number, newQuantity: number) => {
    if (!cart) return;
    if (newQuantity < 1) {
      removeFromCart(foodId);
      return;
    }
    try {
      // Gửi API trước => lưu DB
      await API.put(`/cart/items/${foodId}/`, { quantity: newQuantity });

      // Cập nhật state cục bộ
      const newItems = cart.items.map((i) =>
        i.food.id === foodId
          ? {
              ...i,
              quantity: newQuantity,
              subtotal: (
                newQuantity *
                  (parseFloat(i.food.price) +
                    (i.food_option ? parseFloat(i.food_option.price) : 0)) || 0
              ).toString(),
            }
          : i
      );
      setCart(recalcCart(newItems));
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert(
        "Lỗi khi cập nhật số lượng: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const removeFromCart = async (foodId: number) => {
    if (!confirm("Bạn có chắc muốn xóa món này khỏi giỏ hàng?")) return;
    if (!cart) return;

    try {
      await API.delete(`/cart/items/${foodId}/remove/`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const newItems = cart.items.filter((i) => i.food.id !== foodId);
      setCart(recalcCart(newItems));
      alert("Đã xóa món ăn khỏi giỏ hàng");
    } catch (error) {
      console.error("Error removing item:", error);
      alert(
        "Lỗi khi xóa món ăn: " +
          (error instanceof Error ? error.message : "Vui lòng thử lại")
      );
    }
  };

  const clearCart = async () => {
    if (!confirm("Bạn có chắc muốn xóa tất cả món ăn trong giỏ hàng?")) return;

    try {
      await API.delete("/cart/clear/", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      showEmptyCart();
      alert("Đã xóa tất cả món ăn trong giỏ hàng");
    } catch (error) {
      console.error("Error clearing cart:", error);
      alert(
        "Lỗi khi xóa giỏ hàng: " +
          (error instanceof Error ? error.message : "Vui lòng thử lại")
      );
    }
  };

  const proceedToCheckout = () => {
    if (!cart || !cart.items || cart.items.length === 0) {
      alert("Giỏ hàng trống! Vui lòng thêm món ăn trước khi thanh toán.");
      return;
    }
    navigate("/checkout");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);

  // Memoize các calculations để tránh re-render không cần thiết
  const calculations = useMemo(() => {
    const subtotal = cart ? parseFloat(cart.total_money) : 0;
    const deliveryFee = subtotal > 0 ? 15000 : 0;
    const total = subtotal + deliveryFee;

    return { subtotal, deliveryFee, total };
  }, [cart]);

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
          <h1 className="text-orange-500 text-4xl font-bold mb-2">
            🛒 Giỏ hàng của bạn
          </h1>
          <p>Xem lại và chỉnh sửa đơn hàng trước khi thanh toán</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="text-center py-16">
            <div className="text-8xl opacity-30 mb-5">🛒</div>
            <h3 className="text-gray-600 text-xl mb-4">
              Giỏ hàng của bạn đang trống
            </h3>
            <p className="text-gray-400 mb-6">
              Hãy thêm một số món ăn ngon vào giỏ hàng!
            </p>
            <Button
              asChild
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg font-bold">
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
        <h1 className="text-orange-500 text-4xl font-bold mb-2">
          🛒 Giỏ hàng của bạn
        </h1>
        <p>Xem lại và chỉnh sửa đơn hàng trước khi thanh toán</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-5">
          {cart.items.map((item, index) => (
            <div
              key={`cart-item-${item.id}-${item.food.id}-${
                item.food_option?.id || "no-option"
              }-${index}`}
              className="flex items-center p-5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
              <div className="mr-5">
                <FoodImage item={item} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 mb-1">
                  {item.food.title}
                </div>
                <div className="text-sm text-gray-500 mb-1">
                  {item.food.store_name}
                </div>
                <div className="text-orange-500 font-bold text-lg">
                  {formatCurrency(parseFloat(item.food.price))}
                  {item.food_option && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({item.food_option.size_name}: +
                      {formatCurrency(parseFloat(item.food_option.price))})
                    </span>
                  )}
                </div>
                {item.item_note && (
                  <div className="text-sm text-gray-500 italic">
                    Ghi chú: {item.item_note}
                  </div>
                )}
              </div>
              <div className="flex items-center mx-5">
                <button
                  className="bg-orange-500 text-white border-0 w-9 h-9 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
                  onClick={() =>
                    updateQuantity(item.food.id, item.quantity - 1)
                  }>
                  −
                </button>
                <span className="mx-4 text-lg font-bold min-w-8 text-center">
                  {item.quantity}
                </span>
                <button
                  className="bg-orange-500 text-white border-0 w-9 h-9 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
                  onClick={() =>
                    updateQuantity(item.food.id, item.quantity + 1)
                  }>
                  +
                </button>
              </div>
              <div className="text-xl font-bold text-orange-500 ml-5 min-w-24 text-right">
                {formatCurrency(parseFloat(item.subtotal))}
              </div>
              <button
                className="bg-red-500 text-white border-0 px-4 py-2 rounded-full cursor-pointer ml-4 hover:bg-red-600 transition-colors"
                onClick={() => removeFromCart(item.food.id)}>
                Xóa
              </button>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 p-6 border-t-2 border-orange-500">
          <div className="flex justify-between mb-4 text-lg">
            <span>Tổng số món:</span>
            <span>{cart.items_count}</span>
          </div>
          <div className="flex justify-between mb-4 text-lg">
            <span>Tạm tính:</span>
            <span className="text-orange-500 font-bold">
              {formatCurrency(calculations.subtotal)}
            </span>
          </div>
          <div className="flex justify-between mb-4 text-lg">
            <span>Phí giao hàng:</span>
            <span className="text-orange-500 font-bold">
              {formatCurrency(calculations.deliveryFee)}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold text-orange-500 border-t-2 border-gray-300 pt-4">
            <span>Tổng cộng:</span>
            <span>{formatCurrency(calculations.total)}</span>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              className="flex-1 py-4 px-8 border-0 rounded-full text-lg font-bold cursor-pointer transition-all bg-gray-500 text-white hover:bg-gray-600"
              onClick={clearCart}>
              Xóa tất cả
            </button>
            <button
              className="flex-1 py-4 px-8 border-0 rounded-full text-lg font-bold cursor-pointer transition-all bg-orange-500 text-white hover:bg-orange-600 hover:-translate-y-1"
              onClick={proceedToCheckout}>
              Tiến hành thanh toán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
