import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl, formatDate, isAuthenticated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  total_money: string;
  payment_method: string;
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  note?: string;
  shipping_fee: string;
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
  const [currentRating, setCurrentRating] = useState(0);
  const [ratingContent, setRatingContent] = useState("");

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

  const viewOrderDetail = async (orderId: number) => {
    try {
      const order = await API.get(`/orders/${orderId}/`);
      setSelectedOrder(order as BackendOrder);
      setShowDetailModal(true);
    } catch (error) {
      alert(
        "Không thể tải chi tiết: " +
          (error instanceof Error ? error.message : String(error))
      );
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
      alert(
        "Không thể hủy đơn hàng: " +
          (error instanceof Error ? error.message : String(error))
      );
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
      if (windowWithCartUpdate.updateCartCount) {
        windowWithCartUpdate.updateCartCount();
      }
    } catch (error) {
      console.error("Error reordering:", error);
      alert("Không thể thêm món ăn vào giỏ hàng. Vui lòng thử lại!");
    }
  };

  const openRatingModal = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setCurrentRating(0);
      setRatingContent("");
      setShowRatingModal(true);
    }
  };

  const saveRating = async () => {
    if (!selectedOrder) return;

    if (currentRating < 1) {
      alert("Vui lòng chọn số sao đánh giá");
      return;
    }

    try {
      for (const item of selectedOrder.items) {
        await API.post("/ratings/", {
          food: item.food.id,
          order: selectedOrder.id,
          rating: currentRating,
          content: ratingContent,
        });
      }
      alert("Cảm ơn bạn đã đánh giá!");
      setShowRatingModal(false);
      loadOrders();
    } catch (error) {
      console.error("Rating error:", error);
      alert(
        "Không thể gửi đánh giá: " +
          (error instanceof Error ? error.message : String(error))
      );
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
      alert(
        "Lỗi cập nhật: " +
          (error instanceof Error ? error.message : String(error))
      );
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
              <h2 className="text-xl font-bold mb-4">Chi tiết đơn hàng</h2>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Đánh giá đơn hàng</h2>

              <div className="mb-4">
                <label className="block font-medium mb-2">Điểm đánh giá</label>
                <div className="text-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="text-3xl cursor-pointer hover:text-yellow-400"
                      onClick={() => setCurrentRating(star)}>
                      {star <= currentRating ? "★" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block font-medium mb-2">
                  Nội dung đánh giá
                </label>
                <textarea
                  rows={4}
                  className="w-full p-3 border rounded"
                  value={ratingContent}
                  onChange={(e) => setRatingContent(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={saveRating}>Lưu</Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRatingModal(false)}>
                  Đóng
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
