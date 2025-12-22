import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { paymentService } from "@/services/paymentService";

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

// Backend promo response type (with different field names)
type BackendPromo = {
  id: number;
  name: string;
  title?: string;
  discount_type: "PERCENTAGE" | "FIXED" | "PERCENT" | "AMOUNT";
  discount_value: number;
  minimum_pay: number;
  min_order_value?: number;
  max_discount?: number;
};

const Checkout: React.FC = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [selectedPromos, setSelectedPromos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tooltip state for voucher details
  const [hoveredPromo, setHoveredPromo] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Form data
  const [formData, setFormData] = useState({
    receiver_name: "",
    phone_number: "",
    ship_address: "",
    note: "",
    payment_method: "COD" as "COD" | "ONLINE",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const selectionState = (location.state || {}) as {
    selectedItemIds?: number[];
  };

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        const response = (await API.get("/cart/")) as Cart;

        const selectedIds = selectionState.selectedItemIds || [];
        let finalItems = response.items;

        if (selectedIds.length > 0) {
          finalItems = response.items.filter((item) =>
            selectedIds.includes(item.id)
          );

          // Recalculate summary fields based on selection
          const recalculatedTotal = finalItems.reduce((sum, item) => {
            const itemSubtotal = parseFloat(item.subtotal || "0") || 0;
            return sum + itemSubtotal;
          }, 0);

          const filteredCart: Cart = {
            ...response,
            items: finalItems,
            items_count: finalItems.length,
            total_money: recalculatedTotal.toString(),
          };

          setCart(filteredCart);
        } else {
          setCart(response);
        }
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
        const finalPromos = Array.isArray(promosData)
          ? promosData
          : promosData.results || [];
        setPromos(finalPromos);
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
  }, [navigate, selectionState.selectedItemIds]);

  // Helper function to get minimum order value from backend data
  const getPromoMinOrder = (promo: Promo | BackendPromo): number => {
    try {
      return (promo as BackendPromo).minimum_pay || promo.min_order_value || 0;
    } catch (error) {
      console.error("Error getting promo min order:", error, promo);
      return 0;
    }
  };

  // Calculate totals
  const calculations = useMemo(() => {
    try {
      if (!cart) return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 };

      const subtotal = parseFloat(cart.total_money) || 0;

      // Calculate estimated delivery fee (actual fee calculated by backend based on distance)
      // Base fee: 15,000 VND + 4,000 VND per km from store to customer
      const storeNames = new Set();
      cart.items.forEach((item) => {
        try {
          // Backend trả về store object, cần access đúng cách
          const foodData = item.food as Record<string, unknown>;
          let storeName = null;

          // Try different possible structures
          if (foodData.store && typeof foodData.store === "object") {
            const storeData = foodData.store as Record<string, unknown>;
            storeName = storeData.store_name as string;
          } else if (typeof foodData.store_name === "string") {
            storeName = foodData.store_name;
          }

          if (storeName) {
            storeNames.add(storeName);
          }
        } catch (error) {
          console.error("Error processing store name:", error, item);
        }
      });
      const numberOfStores = storeNames.size || 1; // At least 1 store

      // Backend shipping formula: 15,000đ base + 4,000đ per km for each store
      // Estimated average distance: 3km per delivery
      const BASE_FEE = 15000;
      const PER_KM_FEE = 4000;
      const ESTIMATED_AVG_DISTANCE_KM = 3;
      const estimatedFeePerStore =
        BASE_FEE + PER_KM_FEE * ESTIMATED_AVG_DISTANCE_KM;
      const deliveryFee = numberOfStores * estimatedFeePerStore;

      // Calculate discount from selected promos
      let discount = 0;
      selectedPromos.forEach((promoId) => {
        try {
          const promo = promos.find((p) => p.id === promoId);
          if (promo && subtotal >= getPromoMinOrder(promo)) {
            if (promo.discount_type === "PERCENTAGE") {
              let promoDiscount =
                (subtotal * Number(promo.discount_value)) / 100;
              if (promo.max_discount) {
                promoDiscount = Math.min(
                  promoDiscount,
                  Number(promo.max_discount)
                );
              }
              discount += promoDiscount;
            } else {
              discount += Number(promo.discount_value);
            }
          }
        } catch (error) {
          console.error("Error calculating promo discount:", error, promoId);
        }
      });

      const total = Math.max(0, subtotal + deliveryFee - discount);

      // Validate all numbers
      const result = {
        subtotal: isNaN(subtotal) ? 0 : subtotal,
        deliveryFee: isNaN(deliveryFee) ? 0 : deliveryFee,
        discount: isNaN(discount) ? 0 : discount,
        total: isNaN(total) ? 0 : total,
      };

      if (selectedPromos.length > 0) {
        console.log("Multiple promo calculation:", {
          selectedPromos,
          subtotal,
          deliveryFee,
          discount,
          total,
          result,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in calculations:", error);
      return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 };
    }
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
    try {
      setSelectedPromos((prev) => {
        const newSelected = prev.includes(promoId)
          ? prev.filter((id) => id !== promoId)
          : [...prev, promoId];
        return newSelected;
      });
    } catch (error) {
      console.error("Error toggling promo:", error, promoId);
    }
  };

  // Helper function to format voucher details for tooltip
  const getVoucherDetails = (promo: Promo) => {
    const details = [];

    // Discount info
    if (promo.discount_type === "PERCENTAGE") {
      details.push(`🎯 Giảm ${promo.discount_value}% giá trị đơn hàng`);
      if (promo.max_discount) {
        details.push(`💰 Tối đa: ${formatCurrency(promo.max_discount)}`);
      }
    } else {
      details.push(
        `💰 Giảm ${formatCurrency(promo.discount_value)} cho đơn hàng`
      );
    }

    // Minimum order
    details.push(
      `📦 Đơn tối thiểu: ${formatCurrency(getPromoMinOrder(promo))}`
    );

    return details;
  };

  // Handle mouse events for tooltip
  const handlePromoMouseEnter = (e: React.MouseEvent, promoId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top,
    });
    setHoveredPromo(promoId);
  };

  const handlePromoMouseLeave = () => {
    setHoveredPromo(null);
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

      const orderData: any = {
        ...formData,
        promo_ids: selectedPromos,
        discount_amount: calculations.discount,
      };

      // Only send selected_item_ids when checkout was initiated with a subset of cart items
      if (
        selectionState.selectedItemIds &&
        selectionState.selectedItemIds.length > 0
      ) {
        orderData.selected_item_ids = selectionState.selectedItemIds;
      }

      console.log("Submitting order:", orderData);

      // Create order first
      const orderResponse = await API.post("/orders/", orderData);
      console.log("Order created:", orderResponse);
      console.log("Order response type:", typeof orderResponse);
      console.log("Is array:", Array.isArray(orderResponse));

      // If payment method is online, create payment link
      if (formData.payment_method === "ONLINE") {
        try {
          // Extract order ID - handle both array and single object response
          let orderId = null;
          let userId = null;

          // Case 1: Response has 'orders' array (grouped orders)
          if (orderResponse && typeof orderResponse === "object") {
            const response = orderResponse as {
              orders?: Array<{ id?: number; user?: { id?: number } }>;
              id?: number;
              user?: { id?: number };
            };

            if (
              response.orders &&
              Array.isArray(response.orders) &&
              response.orders.length > 0
            ) {
              orderId = response.orders[0]?.id;
              userId = response.orders[0]?.user?.id;
            }
            // Case 2: Response is a single order object
            else if (response.id) {
              orderId = response.id;
              userId = response.user?.id;
            }
          }
          // Case 3: Response is an array of orders
          else if (Array.isArray(orderResponse) && orderResponse.length > 0) {
            orderId = orderResponse[0]?.id;
            userId = orderResponse[0]?.user?.id;
          }

          console.log("Extracted orderId:", orderId);
          console.log("Extracted userId:", userId);

          if (!orderId) {
            console.error(
              "Could not extract order ID from response:",
              orderResponse
            );
            throw new Error("Không nhận được order ID");
          }

          // Create payment link with PayOS using payment service
          const paymentData = await paymentService.createPaymentLink({
            order_id: orderId,
            amount: Math.round(calculations.total),
            message: `Thanh toán đơn hàng #${orderId}`,
            user_id: userId,
          });

          if (paymentData.checkoutUrl) {
            // Redirect to PayOS checkout
            window.location.href = paymentData.checkoutUrl;
            return;
          } else {
            throw new Error("Không nhận được link thanh toán");
          }
        } catch (paymentError) {
          console.error("Payment error:", paymentError);
          const errorMsg =
            paymentError instanceof Error
              ? paymentError.message
              : "Đã xảy ra lỗi";
          alert(
            `Đặt hàng thành công nhưng lỗi thanh toán: ${errorMsg}. Bạn có thể thanh toán sau.`
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

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numericAmount =
      typeof amount === "number" ? amount : parseFloat(String(amount || 0));
    if (isNaN(numericAmount)) {
      console.error("formatCurrency received NaN:", amount);
      return "0 ₫";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(numericAmount);
  };

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
                      try {
                        const isApplicable =
                          calculations.subtotal >= getPromoMinOrder(promo);
                        const isSelected = selectedPromos.includes(promo.id);

                        return (
                          <div
                            key={promo.id}
                            className={`relative p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "border-orange-500 bg-orange-50"
                                : isApplicable
                                ? "border-gray-300 hover:border-orange-300"
                                : "border-gray-200 opacity-50 cursor-not-allowed"
                            }`}
                            onClick={() =>
                              isApplicable && handlePromoToggle(promo.id)
                            }
                            onMouseEnter={(e) =>
                              handlePromoMouseEnter(e, promo.id)
                            }
                            onMouseLeave={handlePromoMouseLeave}>
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
                                  {formatCurrency(getPromoMinOrder(promo))}
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
                      } catch (error) {
                        console.error("Error rendering promo:", error, promo);
                        return null;
                      }
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
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23f97316' width='64' height='64'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='32'%3E🍔%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.food.title}</h4>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const foodData = item.food as Record<string, unknown>;
                          if (
                            foodData.store &&
                            typeof foodData.store === "object"
                          ) {
                            const storeData = foodData.store as Record<
                              string,
                              unknown
                            >;
                            return storeData.store_name as string;
                          } else if (typeof foodData.store_name === "string") {
                            return foodData.store_name;
                          }
                          return "Unknown Store";
                        })()}
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
                  <span>Phí giao hàng (ước tính):</span>
                  <span>{formatCurrency(calculations.deliveryFee)}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-blue-800 font-medium">
                    📦 Cách tính phí giao hàng:
                  </p>
                  <p className="text-xs text-blue-700">
                    • Phí cơ bản: <strong>15,000đ</strong> / cửa hàng
                  </p>
                  <p className="text-xs text-blue-700">
                    • Phí theo km: <strong>4,000đ/km</strong> (tính theo khoảng
                    cách thực tế)
                  </p>
                  <p className="text-xs text-blue-600 italic mt-1">
                    * Ước tính trên dựa trên khoảng cách trung bình ~3km. Phí
                    chính xác sẽ được tính khi đặt hàng.
                  </p>
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

      {/* Voucher Tooltip */}
      {hoveredPromo && (
        <div
          className="fixed z-50 bg-gray-800 text-white p-3 rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateY(-50%)",
          }}>
          <div className="text-sm font-semibold mb-2">Chi tiết voucher</div>
          <div className="text-xs space-y-1">
            {getVoucherDetails(promos.find((p) => p.id === hoveredPromo)!).map(
              (detail, index) => (
                <div key={index}>{detail}</div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
