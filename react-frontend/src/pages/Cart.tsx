import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";

type CartItem = {
  id: number;
  food: {
    id: number;
    title: string;
    price: number;
    image: string;
    description: string;
    availability: string;
    store: {
      id: number;
      store_name: string;
      description: string;
      image: string;
    };
  };
  food_option?: {
    id: number;
    size_name: string;
    price: string;
  };
  quantity: number;
  item_note?: string;
  subtotal: number;
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
  const imageSrc = item.food.image ? getImageUrl(item.food.image) : null;

  // Reset states khi item.food.image thay đổi
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [item.food.image]);

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
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (checkAuthentication()) {
      loadCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select all items only when cart loads for the first time
  useEffect(() => {
    if (cart?.items && cart.items.length > 0 && isFirstLoad) {
      setSelectedItems(new Set(cart.items.map((item) => item.id)));
      setIsFirstLoad(false);
    }
  }, [cart?.items, isFirstLoad]);

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

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!cart?.items) return;
    if (selectedItems.size === cart.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cart.items.map((item) => item.id)));
    }
  };

  const orderSelectedItems = async () => {
    if (!cart || selectedItems.size === 0) {
      alert("Vui lòng chọn ít nhất một món để đặt hàng");
      return;
    }

    const unselectedItems = cart.items.filter(
      (item) => !selectedItems.has(item.id)
    );

    try {
      // 1. Remove unselected items temporarily
      const removedItems: CartItem[] = [];
      for (const item of unselectedItems) {
        await API.delete(`/cart/items/${item.food.id}/remove/`);
        removedItems.push(item);
      }

      // 2. Navigate to checkout (which will use remaining items)
      navigate("/checkout");

      // 3. Add back removed items after navigation
      // Note: This happens in background, user won't see it
      setTimeout(async () => {
        for (const item of removedItems) {
          try {
            await API.post("/cart/add/", {
              food_id: item.food.id,
              quantity: item.quantity,
              item_note: item.item_note,
              food_option_id: item.food_option?.id,
            });
          } catch (error) {
            console.error("Error re-adding item:", error);
          }
        }
      }, 2000);
    } catch (error) {
      console.error("Error processing selected items:", error);
      alert("Có lỗi xảy ra khi xử lý đơn hàng");
    }
  };

  /** Tính lại subtotal sau khi thay đổi items */
  const recalcCart = (items: CartItem[]) => {
    const newSubtotal = items.reduce(
      (acc, i) =>
        acc +
        (typeof i.subtotal === "number" ? i.subtotal : parseFloat(i.subtotal)),
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
              subtotal:
                newQuantity *
                  ((typeof i.food.price === "number"
                    ? i.food.price
                    : parseFloat(i.food.price)) +
                    (i.food_option ? parseFloat(i.food_option.price) : 0)) || 0,
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);

  // Group items by store
  const itemsByStore = useMemo(() => {
    if (!cart?.items) return {};

    return cart.items.reduce((acc, item) => {
      const storeId = item.food.store?.id || 0;
      const storeName =
        item.food.store?.store_name || "Không có thông tin cửa hàng";

      if (!acc[storeId]) {
        acc[storeId] = {
          storeName,
          items: [],
        };
      }
      acc[storeId].items.push(item);
      return acc;
    }, {} as Record<number, { storeName: string; items: CartItem[] }>);
  }, [cart?.items]);

  // Calculate totals for selected items only
  const selectedCalculations = useMemo(() => {
    if (!cart) return { subtotal: 0, deliveryFee: 0, total: 0 };

    const selectedItemsArray = cart.items.filter((item) =>
      selectedItems.has(item.id)
    );
    const selectedSubtotal =
      selectedItems.size > 0
        ? selectedItemsArray.reduce(
            (acc, item) =>
              acc +
              (typeof item.subtotal === "number"
                ? item.subtotal
                : parseFloat(item.subtotal)),
            0
          )
        : 0;
    const deliveryFee = selectedSubtotal > 0 ? 15000 : 0;
    const total = selectedSubtotal + deliveryFee;

    return { subtotal: selectedSubtotal, deliveryFee, total };
  }, [cart, selectedItems]);

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
          {/* Select All Header */}
          <div className="flex items-center p-3 border-b-2 border-gray-200 mb-3">
            <input
              type="checkbox"
              id="select-all"
              checked={
                cart.items.length > 0 &&
                selectedItems.size === cart.items.length
              }
              onChange={toggleSelectAll}
              className="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
            />
            <label
              htmlFor="select-all"
              className="ml-3 text-sm font-medium text-gray-700">
              Chọn tất cả ({selectedItems.size}/{cart.items.length})
            </label>
          </div>

          {Object.entries(itemsByStore).map(([storeId, storeGroup]) => {
            const storeItems = storeGroup.items;
            const storeSelectedCount = storeItems.filter((item) =>
              selectedItems.has(item.id)
            ).length;

            // Tính tổng tiền của cửa hàng
            const storeTotal = storeItems.reduce((total, item) => {
              const itemSubtotal =
                typeof item.subtotal === "number"
                  ? item.subtotal
                  : parseFloat(item.subtotal);
              return total + itemSubtotal;
            }, 0);

            return (
              <div key={`store-${storeId}`} className="mb-6">
                {/* Store Header */}
                <div className="bg-orange-50 p-4 border-l-4 border-orange-500 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-lg font-bold text-orange-800">
                        🏪 {storeGroup.storeName}
                      </div>
                      <div className="ml-3 text-sm text-orange-600">
                        ({storeItems.length} món)
                      </div>
                    </div>
                    <div className="text-sm text-orange-600">
                      Đã chọn: {storeSelectedCount}/{storeItems.length}
                    </div>
                  </div>
                </div>

                {/* Store Items */}
                {storeItems.map((item, index) => (
                  <div
                    key={`cart-item-${item.id}-${item.food.id}-${
                      item.food_option?.id || "no-option"
                    }-${index}`}
                    className="flex items-center p-4 ml-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                    {/* Checkbox */}
                    <div className="mr-3">
                      <input
                        type="checkbox"
                        id={`item-${item.id}`}
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                      />
                    </div>
                    <div className="mr-5">
                      <FoodImage item={item} />
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-bold text-gray-800 mb-1">
                        {item.food.title}
                      </div>
                      <div className="text-orange-500 font-bold text-lg">
                        {formatCurrency(
                          typeof item.food.price === "number"
                            ? item.food.price
                            : parseFloat(item.food.price)
                        )}
                        {item.food_option && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.food_option.size_name}: +
                            {formatCurrency(parseFloat(item.food_option.price))}
                            )
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
                      {formatCurrency(
                        typeof item.subtotal === "number"
                          ? item.subtotal
                          : parseFloat(item.subtotal)
                      )}
                    </div>
                    <button
                      className="bg-red-500 text-white border-0 px-4 py-2 rounded-full cursor-pointer ml-4 hover:bg-red-600 transition-colors"
                      onClick={() => removeFromCart(item.food.id)}>
                      Xóa
                    </button>
                  </div>
                ))}

                {/* Store Total */}
                <div className="ml-4 mt-3 mb-3 p-3 bg-gray-50 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">
                      Tổng tiền cửa hàng:
                    </span>
                    <span className="text-xl font-bold text-orange-500">
                      {formatCurrency(storeTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-gray-50 p-6 border-t-2 border-orange-500">
          {selectedItems.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-bold text-blue-700 mb-2">
                Đã chọn ({selectedItems.size} món):
              </h4>
              <div className="flex justify-between text-sm">
                <span>Tổng số lượng:</span>
                <span className="text-blue-600 font-bold">
                  {cart.items
                    .filter((item) => selectedItems.has(item.id))
                    .reduce((total, item) => total + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tạm tính:</span>
                <span className="text-blue-600 font-bold">
                  {formatCurrency(selectedCalculations.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Phí giao hàng:</span>
                <span className="text-blue-600 font-bold">
                  {formatCurrency(selectedCalculations.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-2 mt-2">
                <span>Tổng đã chọn:</span>
                <span className="text-blue-600">
                  {formatCurrency(selectedCalculations.total)}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              className="py-4 px-6 border-0 rounded-full text-sm font-bold cursor-pointer transition-all bg-gray-500 text-white hover:bg-gray-600"
              onClick={clearCart}>
              Xóa tất cả
            </button>
            <button
              className="flex-1 py-4 px-8 border-0 rounded-full text-lg font-bold cursor-pointer transition-all bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={orderSelectedItems}
              disabled={selectedItems.size === 0}>
              Đặt hàng ({selectedItems.size} món)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;