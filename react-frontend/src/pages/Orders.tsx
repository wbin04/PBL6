import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl, formatDate, isAuthenticated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { paymentService } from "@/services/paymentService";

// Backend Order interface
interface BackendOrderItem {
  id: number;
  food: {
    id: number;
    title: string;
    price: string;
    image?: string;
    image_url?: string;
  };
  food_option?: {
    id: number;
    size_name: string;
    price: string;
  };
  quantity: number;
  food_price: string;
  food_option_price?: string;
  food_note?: string;
  subtotal: string;
}

interface BackendOrder {
  id: number;
  order_status: string;
  delivery_status: string;
  total_money: string; // Chỉ giá món ăn
  payment_method: string;
  payment_status?: string; // Trạng thái thanh toán: PAID, PENDING, CANCELLED
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  note?: string;
  shipping_fee: string;
  // Pricing fields from backend
  total_before_discount?: string; // Giá món + ship
  total_discount?: string; // Số tiền giảm giá
  total_after_discount?: string; // Tổng cuối cùng
  promo_discount?: number; // Discount từ promos
  created_date: string;
  created_date_display: string;
  store_name: string;
  store_id: number;
  items: BackendOrderItem[];
  is_rated?: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  shipper?: {
    id: number;
    username: string;
  };
}

interface PaginationInfo {
  count: number;
  num_pages: number;
  current_page: number;
  has_next: boolean;
  has_previous: boolean;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStatus, setCurrentStatus] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    count: 0,
    num_pages: 0,
    current_page: 1,
    has_next: false,
    has_previous: false,
  });
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [foodRatings, setFoodRatings] = useState<
    Record<number, { rating: number; content: string }>
  >({});

  const navigate = useNavigate();

  const statusFilters = [
    { key: "", label: "Tất cả" },
    { key: "Chờ xác nhận", label: "Chờ xác nhận" },
    { key: "Đã xác nhận", label: "Đã xác nhận" },
    { key: "Đang chuẩn bị", label: "Đang chuẩn bị" },
    { key: "Đang giao", label: "Đang giao" },
    { key: "Đã giao", label: "Đã giao" },
    { key: "Đã huỷ", label: "Đã huỷ" },
  ];

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
      });

      if (currentStatus) {
        params.append("status", currentStatus);
      }

      const response = await API.get(`/orders/?${params}`);

      // Type the response
      const ordersResponse = response as {
        results: BackendOrder[];
        count: number;
        num_pages: number;
        current_page: number;
        has_next: boolean;
        has_previous: boolean;
      };

      // Check rating status for delivered orders
      const ordersData = ordersResponse.results;
      const delivered = ordersData.filter(
        (o: BackendOrder) =>
          o.order_status === "Đã giao" || o.delivery_status === "Đã giao"
      );
      await Promise.all(
        delivered.map(async (order: BackendOrder) => {
          try {
            const ratingList = await API.get(`/ratings/?order=${order.id}`);
            order.is_rated = Array.isArray(ratingList) && ratingList.length > 0;
          } catch {
            // Keep original is_rated value
          }
        })
      );

      setOrders(ordersData);
      setPagination({
        count: ordersResponse.count,
        num_pages: ordersResponse.num_pages,
        current_page: ordersResponse.current_page,
        has_next: ordersResponse.has_next,
        has_previous: ordersResponse.has_previous,
      });
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("Không thể tải danh sách đơn hàng. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentStatus]);

  useEffect(() => {
    if (!isAuthenticated()) {
      alert("Vui lòng đăng nhập để tiếp tục");
      navigate("/login");
      return;
    }

    loadOrders();
  }, [loadOrders, navigate]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
      PREPARING: "Đang chuẩn bị",
      SHIPPING: "Đang giao",
      DELIVERED: "Đã giao",
      CANCELLED: "Đã huỷ",
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    const statusClassMap: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-green-100 text-green-800",
      PREPARING: "bg-blue-100 text-blue-800",
      SHIPPING: "bg-gray-100 text-gray-800",
      DELIVERED: "bg-cyan-100 text-cyan-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return statusClassMap[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Helper function để tính tổng tiền chính xác từ backend data
  const getOrderTotal = (order: BackendOrder): number => {
    // Ưu tiên sử dụng total_after_discount nếu có
    if (order.total_after_discount) {
      return parseFloat(order.total_after_discount);
    }

    // Fallback: total_money (giá món) + shipping_fee - discounts
    let total = parseFloat(order.total_money);

    if (order.shipping_fee) {
      total += parseFloat(order.shipping_fee);
    }

    if (order.total_discount) {
      total -= parseFloat(order.total_discount);
    } else if (order.promo_discount) {
      total -= order.promo_discount;
    }

    return Math.max(total, parseFloat(order.shipping_fee || "0")); // Tối thiểu = phí ship
  };

  const viewOrderDetail = async (orderId: number) => {
    try {
      const order = await API.get(`/orders/${orderId}/`);
      setSelectedOrder(order as BackendOrder);
      setShowDetailModal(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert("Không thể tải chi tiết: " + errorMsg);
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
      return;
    }

    try {
      await API.put(`/orders/${orderId}/status/`, {
        order_status: "Đã huỷ",
      });
      alert("Đã huỷ đơn hàng thành công!");
      loadOrders();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert("Không thể hủy đơn hàng: " + errorMsg);
    }
  };

  const reorderItems = async (orderId: number) => {
    if (
      !confirm("Bạn có muốn thêm tất cả món ăn từ đơn hàng này vào giỏ hàng?")
    ) {
      return;
    }

    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order || !order.items) {
        throw new Error("Không tìm thấy thông tin đơn hàng");
      }

      // Add each item to cart
      for (const item of order.items) {
        await API.post("/cart/add/", {
          food_id: item.food.id,
          quantity: item.quantity,
        });
      }

      alert("Đã thêm tất cả món ăn vào giỏ hàng!");
      // Update cart count in header if function exists
      const windowWithCartUpdate = window as typeof window & {
        updateCartCount?: () => void;
      };
      if (windowWithCartUpdate.updateCartUpdate) {
        windowWithCartUpdate.updateCartCount();
      }
    } catch (error) {
      console.error("Error reordering:", error);
      alert("Không thể thêm món ăn vào giỏ hàng. Vui lòng thử lại!");
    }
  };

  const retryPayment = async (order: BackendOrder) => {
    if (!confirm("Bạn có muốn thanh toán lại đơn hàng này?")) {
      return;
    }

    try {
      const paymentData = await paymentService.createPaymentLink({
        order_id: order.id,
        amount: Math.round(getOrderTotal(order)),
        message: `Thanh toán đơn hàng #${order.id}`,
        user_id: order.user?.id,
      });

      if (paymentData.checkoutUrl) {
        window.location.href = paymentData.checkoutUrl;
      } else {
        throw new Error("Không nhận được link thanh toán");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert(`Không thể tạo link thanh toán: ${errorMsg}`);
    }
  };

  const openRatingModal = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      // Initialize ratings for each food item
      const initialRatings: Record<
        number,
        { rating: number; content: string }
      > = {};
      order.items.forEach((item) => {
        initialRatings[item.food.id] = { rating: 0, content: "" };
      });
      setFoodRatings(initialRatings);
      setShowRatingModal(true);
    }
  };

  const updateFoodRating = (foodId: number, rating: number) => {
    setFoodRatings((prev) => ({
      ...prev,
      [foodId]: { ...prev[foodId], rating },
    }));
  };

  const updateFoodContent = (foodId: number, content: string) => {
    // Limit to 100 characters as per backend
    const limitedContent = content.slice(0, 100);
    setFoodRatings((prev) => ({
      ...prev,
      [foodId]: { ...prev[foodId], content: limitedContent },
    }));
  };

  const saveRating = async () => {
    if (!selectedOrder) return;

    // Check if at least one food has a rating
    const hasAnyRating = Object.values(foodRatings).some((r) => r.rating > 0);
    if (!hasAnyRating) {
      alert("Vui lòng đánh giá ít nhất một món ăn");
      return;
    }

    try {
      // Submit ratings for each food that has a rating
      for (const item of selectedOrder.items) {
        const foodRating = foodRatings[item.food.id];
        if (foodRating && foodRating.rating > 0) {
          await API.post("/ratings/", {
            food: item.food.id,
            order: selectedOrder.id,
            rating: foodRating.rating,
            content: foodRating.content || "",
          });
        }
      }
      alert("Cảm ơn bạn đã đánh giá!");
      setShowRatingModal(false);
      loadOrders();
    } catch (error) {
      console.error("Rating error:", error);
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert("Không thể gửi đánh giá: " + errorMsg);
    }
  };

  const updateDetailOrder = async () => {
    if (!selectedOrder) return;

    try {
      const receiverName = (
        document.getElementById("detail-receiver_name") as HTMLInputElement
      )?.value.trim();
      const phoneNumber = (
        document.getElementById("detail-phone_number") as HTMLInputElement
      )?.value.trim();
      const shipAddress = (
        document.getElementById("detail-ship_address") as HTMLTextAreaElement
      )?.value.trim();
      const note = (
        document.getElementById("detail-note") as HTMLTextAreaElement
      )?.value.trim();

      await API.put(`/orders/${selectedOrder.id}/`, {
        receiver_name: receiverName,
        phone_number: phoneNumber,
        ship_address: shipAddress,
        note: note,
      });

      alert("Cập nhật thành công");
      setShowDetailModal(false);
      loadOrders();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert("Lỗi cập nhật: " + errorMsg);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.num_pages) {
      return;
    }
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-8 px-4">
        <div className="text-center py-12 text-gray-600">
          <p>Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Đơn hàng của tôi</h1>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              className={`px-4 py-2 rounded border transition-all ${
                currentStatus === filter.key
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500"
              }`}
              onClick={() => {
                setCurrentStatus(filter.key);
                setCurrentPage(1);
              }}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Bạn chưa có đơn hàng nào
            </h3>
            <p className="text-gray-600 mb-6">
              Hãy khám phá thực đơn và đặt món yêu thích của bạn!
            </p>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link to="/menu">Xem thực đơn</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">
                      Đơn hàng #{order.id}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.created_date)}
                    </p>
                    {order.store_name && (
                      <p className="text-sm text-orange-600 font-medium">
                        🏪 {order.store_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {order.payment_method === "ONLINE"
                          ? "💳 Thanh toán online"
                          : "💵 Thanh toán khi nhận hàng"}
                      </span>
                      {order.payment_method === "ONLINE" &&
                        order.payment_status && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              order.payment_status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : order.payment_status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                            {order.payment_status === "PAID"
                              ? "✓ Đã thanh toán"
                              : order.payment_status === "CANCELLED"
                              ? "✗ Đã hủy"
                              : "⏳ Chưa thanh toán"}
                          </span>
                        )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusClass(
                      order.order_status
                    )}`}>
                    {getStatusText(order.order_status)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {/* Order Items */}
                <div className="mb-4">
                  {order.items.map((item) => (
                    <div
                      key={`${item.food.id}-${order.id}`}
                      className="flex items-center gap-4 mb-3 p-2 bg-gray-50 rounded">
                      <img
                        src={getImageUrl(
                          item.food.image_url || item.food.image
                        )}
                        alt={item.food.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">
                          {item.food.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          Số lượng: {item.quantity}
                        </div>
                      </div>
                      <div className="font-semibold text-orange-500">
                        {formatCurrency(parseFloat(item.subtotal))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="mb-4 p-3 bg-orange-50 rounded border border-orange-200">
                  <div className="flex justify-between items-center text-lg font-bold text-orange-700">
                    <span>Tổng tiền:</span>
                    <span>{formatCurrency(getOrderTotal(order))}</span>
                  </div>
                  {(order.total_discount || order.promo_discount) && (
                    <div className="text-sm text-green-600 mt-1">
                      Đã giảm:{" "}
                      {formatCurrency(
                        parseFloat(order.total_discount || "0") ||
                          order.promo_discount ||
                          0
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Info */}
                <div className="mb-4 text-sm text-gray-600">
                  <div>
                    <strong>Giao đến:</strong> {order.ship_address}
                  </div>
                  <div>
                    <strong>Người nhận:</strong> {order.receiver_name} -{" "}
                    {order.phone_number}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOrderDetail(order.id)}>
                    Chi tiết
                  </Button>

                  {order.order_status === "Chờ xác nhận" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelOrder(order.id)}>
                      Hủy đơn
                    </Button>
                  )}

                  {/* Nút thanh toán lại cho đơn ONLINE chưa thanh toán */}
                  {order.payment_method === "ONLINE" &&
                    order.payment_status !== "PAID" &&
                    order.order_status !== "Đã huỷ" &&
                    order.order_status !== "Đã giao" && (
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                        onClick={() => retryPayment(order)}>
                        💳 Thanh toán ngay
                      </Button>
                    )}

                  {order.order_status === "Đã giao" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => reorderItems(order.id)}>
                        Đặt lại
                      </Button>
                      {order.is_rated ? (
                        <Button variant="outline" size="sm" disabled>
                          Đã đánh giá
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600"
                          onClick={() => openRatingModal(order.id)}>
                          Đánh giá
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.num_pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.has_previous}
            onClick={() => goToPage(currentPage - 1)}>
            ‹ Trước
          </Button>

          {Array.from({ length: Math.min(5, pagination.num_pages) }, (_, i) => {
            const startPage = Math.max(1, currentPage - 2);
            const page = startPage + i;
            if (page > pagination.num_pages) return null;

            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(page)}>
                {page}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.has_next}
            onClick={() => goToPage(currentPage + 1)}>
            Sau ›
          </Button>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Chi tiết đơn hàng #{selectedOrder.id}
              </h2>

              {/* Order Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-3">Thông tin đơn hàng</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Giá món ăn:</span>
                    <span>
                      {formatCurrency(parseFloat(selectedOrder.total_money))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí giao hàng:</span>
                    <span>
                      {formatCurrency(
                        parseFloat(selectedOrder.shipping_fee || "0")
                      )}
                    </span>
                  </div>
                  {(selectedOrder.total_discount ||
                    selectedOrder.promo_discount) && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá:</span>
                      <span>
                        -
                        {formatCurrency(
                          parseFloat(selectedOrder.total_discount || "0") ||
                            selectedOrder.promo_discount ||
                            0
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Tổng cộng:</span>
                    <span className="text-orange-600">
                      {formatCurrency(getOrderTotal(selectedOrder))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">
                    Tên người nhận
                  </label>
                  <input
                    type="text"
                    id="detail-receiver_name"
                    className="w-full p-3 border rounded"
                    defaultValue={selectedOrder.receiver_name}
                    disabled={selectedOrder.order_status !== "Chờ xác nhận"}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    id="detail-phone_number"
                    className="w-full p-3 border rounded"
                    defaultValue={selectedOrder.phone_number}
                    disabled={selectedOrder.order_status !== "Chờ xác nhận"}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    Địa chỉ giao hàng
                  </label>
                  <textarea
                    id="detail-ship_address"
                    rows={3}
                    className="w-full p-3 border rounded"
                    defaultValue={selectedOrder.ship_address}
                    disabled={selectedOrder.order_status !== "Chờ xác nhận"}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Ghi chú</label>
                  <textarea
                    id="detail-note"
                    rows={2}
                    className="w-full p-3 border rounded"
                    defaultValue={selectedOrder.note || ""}
                    disabled={selectedOrder.order_status !== "Chờ xác nhận"}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                {selectedOrder.order_status === "Chờ xác nhận" && (
                  <Button onClick={updateDetailOrder}>Lưu</Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Đánh giá đơn hàng #{selectedOrder.id}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Đánh giá và nhận xét của bạn sẽ giúp người khác có thêm thông
                tin tham khảo
              </p>

              {/* List of food items to rate */}
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 bg-gray-50">
                    {/* Food info */}
                    <div className="flex gap-3 mb-4">
                      <img
                        src={
                          item.food.image_url ||
                          getImageUrl(item.food.image) ||
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E"
                        }
                        alt={item.food.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.food.title}</h4>
                        {item.food_option && (
                          <p className="text-sm text-gray-600">
                            {item.food_option.size_name}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Số lượng: {item.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Star rating */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">
                        Đánh giá sao
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            className="text-2xl cursor-pointer hover:scale-110 transition-transform"
                            onClick={() =>
                              updateFoodRating(item.food.id, star)
                            }>
                            <span
                              className={
                                star <= (foodRatings[item.food.id]?.rating || 0)
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }>
                              ★
                            </span>
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-600 self-center">
                          {foodRatings[item.food.id]?.rating > 0
                            ? `${foodRatings[item.food.id]?.rating} sao`
                            : "Chưa đánh giá"}
                        </span>
                      </div>
                    </div>

                    {/* Review content */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nhận xét (tùy chọn)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Chia sẻ trải nghiệm của bạn về món ăn này..."
                        maxLength={100}
                        value={foodRatings[item.food.id]?.content || ""}
                        onChange={(e) =>
                          updateFoodContent(item.food.id, e.target.value)
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {foodRatings[item.food.id]?.content?.length || 0}/100 ký
                        tự
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowRatingModal(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={saveRating}
                  className="bg-orange-500 hover:bg-orange-600">
                  Gửi đánh giá
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
