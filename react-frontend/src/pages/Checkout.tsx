import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Types
type CartItem = {
  id: number;
  food: {
    id: number;
    title: string;
    price: string;
    image?: string;
    image_url?: string;
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

type Promo = {
  id: number;
  title: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
};

const Checkout: React.FC = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [selectedPromos, setSelectedPromos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    receiver_name: "",
    phone_number: "",
    ship_address: "",
    note: "",
    payment_method: "COD" as "COD" | "ONLINE",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        const response = await API.get("/cart/");
        setCart(response as Cart);
      } catch (error) {
        console.error("Error loading cart:", error);
        alert("Lỗi khi tải giỏ hàng. Vui lòng thử lại!");
        navigate("/cart");
      } finally {
        setLoading(false);
      }
    };

    const loadPromos = async () => {
      try {
        const response = await API.get("/promotions/");
        const promosData = response as { results?: Promo[] } | Promo[];
        setPromos(
          Array.isArray(promosData) ? promosData : promosData.results || []
        );
      } catch (error) {
        console.error("Error loading promos:", error);
      }
    };

    const loadUserProfile = async () => {
      try {
        const response = await API.get("/auth/profile/");
        console.log("User profile loaded:", response);
        // Điền mặc định thông tin người dùng vào form
        const profile = response as {
          fullname?: string;
          phone_number?: string;
          address?: string;
        };
        setFormData((prev) => ({
          ...prev,
          receiver_name: profile.fullname || "",
          phone_number: profile.phone_number || "",
          ship_address: profile.address || "",
        }));
      } catch (error) {
        console.error("Error loading user profile:", error);
        // Không cần thông báo lỗi, chỉ để form trống
      }
    };

    const fetchData = async () => {
      await loadCart();
      await loadPromos();
      await loadUserProfile();
    };

    fetchData();
  }, [navigate]);

  // Calculate totals
  const calculations = useMemo(() => {
    if (!cart) return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 };

    const subtotal = parseFloat(cart.total_money);
    const deliveryFee = 15000; // Fixed delivery fee

    // Calculate discount from selected promos
    let discount = 0;
    selectedPromos.forEach((promoId) => {
      const promo = promos.find((p) => p.id === promoId);
      if (promo && subtotal >= promo.min_order_value) {
        if (promo.discount_type === "PERCENTAGE") {
          let promoDiscount = (subtotal * promo.discount_value) / 100;
          if (promo.max_discount) {
            promoDiscount = Math.min(promoDiscount, promo.max_discount);
          }
          discount += promoDiscount;
        } else {
          discount += promo.discount_value;
        }
      }
    });

    const total = Math.max(0, subtotal + deliveryFee - discount);

    return { subtotal, deliveryFee, discount, total };
  }, [cart, selectedPromos, promos]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePromoToggle = (promoId: number) => {
    setSelectedPromos((prev) =>
      prev.includes(promoId)
        ? prev.filter((id) => id !== promoId)
        : [...prev, promoId]
    );
  };

  const validateForm = () => {
    if (!formData.receiver_name.trim()) {
      alert("Vui lòng nhập tên người nhận");
      return false;
    }
    if (!formData.phone_number.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return false;
    }
    if (!formData.ship_address.trim()) {
      alert("Vui lòng nhập địa chỉ giao hàng");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!cart || cart.items.length === 0) {
      alert("Giỏ hàng trống!");
      return;
    }

    try {
      setSubmitting(true);

      const orderData = {
        ...formData,
        promo_ids: selectedPromos,
        discount_amount: calculations.discount,
      };

      console.log("Submitting order:", orderData);

      // Create order first
      const orderResponse = await API.post("/orders/", orderData);
      console.log("Order created:", orderResponse);

      // If payment method is online, create payment link
      if (formData.payment_method === "ONLINE") {
        try {
          // Extract order ID - handle both array and single object response
          const orders = Array.isArray(orderResponse)
            ? orderResponse
            : [orderResponse];
          const firstOrder = orders[0];
          const orderId = firstOrder?.id;

          if (!orderId) {
            throw new Error("Không nhận được order ID");
          }

          // Create payment link with PayOS
          const paymentResponse = await fetch(
            "http://localhost:8001/create_payment_link",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                order_id: orderId,
                amount: Math.round(calculations.total),
                message: `Thanh toán đơn hàng #${orderId}`,
                user_id: firstOrder?.user?.id,
              }),
            }
          );

          const paymentData = await paymentResponse.json();

          if (paymentData.error) {
            throw new Error(paymentData.error);
          }

          if (paymentData.checkoutUrl) {
            // Redirect to PayOS checkout
            window.location.href = paymentData.checkoutUrl;
            return;
          } else {
            throw new Error("Không nhận được link thanh toán");
          }
        } catch (paymentError) {
          console.error("Payment error:", paymentError);
          alert(
            `Đặt hàng thành công nhưng lỗi thanh toán: ${
              paymentError instanceof Error
                ? paymentError.message
                : paymentError
            }. Bạn có thể thanh toán sau.`
          );
          navigate("/orders");
          return;
        }
      } else {
        // COD payment - just show success message
        alert("Đặt hàng thành công! Thanh toán khi nhận hàng.");
        navigate("/orders");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Lỗi khi đặt hàng. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-5">
        <div className="text-center py-12 text-gray-600">
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-5">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Giỏ hàng trống</h1>
          <p className="mb-6">
            Vui lòng thêm món ăn vào giỏ hàng trước khi thanh toán
          </p>
          <Button onClick={() => navigate("/menu")}>Quay lại menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-5">
      <div className="text-center mb-8">
        <h1 className="text-orange-500 text-4xl font-bold mb-2">
          🛒 Thanh toán
        </h1>
        <p>Xác nhận thông tin và hoàn tất đơn hàng</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Order Form */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6">Thông tin giao hàng</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tên người nhận *
                  </label>
                  <input
                    type="text"
                    name="receiver_name"
                    value={formData.receiver_name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nhập tên người nhận"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    SDT nhận hàng *
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nhập số điện thoại"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Địa chỉ giao hàng *
                  </label>
                  <textarea
                    name="ship_address"
                    value={formData.ship_address}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nhập địa chỉ giao hàng"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ghi chú đơn hàng
                  </label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ghi chú thêm (tùy chọn)"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phương thức thanh toán
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                    <option value="ONLINE">Thanh toán online</option>
                  </select>
                </div>
              </form>

              {/* Promotions */}
              {promos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Khuyến mãi</h3>
                  <div className="space-y-2">
                    {promos.map((promo) => {
                      const isApplicable =
                        calculations.subtotal >= promo.min_order_value;
                      const isSelected = selectedPromos.includes(promo.id);

                      return (
                        <div
                          key={promo.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-orange-500 bg-orange-50"
                              : isApplicable
                              ? "border-gray-300 hover:border-orange-300"
                              : "border-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                          onClick={() =>
                            isApplicable && handlePromoToggle(promo.id)
                          }>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{promo.title}</p>
                              <p className="text-sm text-gray-600">
                                {promo.discount_type === "PERCENTAGE"
                                  ? `Giảm ${promo.discount_value}%`
                                  : `Giảm ${formatCurrency(
                                      promo.discount_value
                                    )}`}
                                {promo.max_discount &&
                                  promo.discount_type === "PERCENTAGE" &&
                                  ` (tối đa ${formatCurrency(
                                    promo.max_discount
                                  )})`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Đơn tối thiểu:{" "}
                                {formatCurrency(promo.min_order_value)}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isApplicable}
                              onChange={() => {}}
                              className="w-4 h-4 text-orange-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6">Tóm tắt đơn hàng</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={getImageUrl(
                          item.food.image_url || item.food.image || ""
                        )}
                        alt={item.food.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          console.log(
                            "Image error for:",
                            item.food.title,
                            "URL:",
                            item.food.image_url || item.food.image
                          );
                          e.currentTarget.src =
                            "https://via.placeholder.com/64x64/f97316/ffffff?text=🍔";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.food.title}</h4>
                      <p className="text-sm text-gray-600">
                        {item.food.store_name}
                      </p>
                      {item.food_option && (
                        <p className="text-sm text-gray-500">
                          {item.food_option.size_name}: +
                          {formatCurrency(parseFloat(item.food_option.price))}
                        </p>
                      )}
                      {item.item_note && (
                        <p className="text-sm text-gray-500">
                          Ghi chú: {item.item_note}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">x{item.quantity}</p>
                      <p className="text-orange-500 font-bold">
                        {formatCurrency(parseFloat(item.subtotal))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(calculations.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí giao hàng:</span>
                  <span>{formatCurrency(calculations.deliveryFee)}</span>
                </div>
                {calculations.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(calculations.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-orange-500 border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span>{formatCurrency(calculations.total)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-4 text-lg font-bold rounded-lg">
                {submitting ? "Đang xử lý..." : "Đặt hàng"}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/cart")}
                className="w-full mt-3">
                Quay lại giỏ hàng
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
