import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CheckoutResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "cancel" | "error"
  >("success");

  useEffect(() => {
    const payosParam = searchParams.get("payos");

    if (payosParam === "success") {
      setPaymentStatus("success");
    } else if (payosParam === "cancel") {
      setPaymentStatus("cancel");
    } else {
      setPaymentStatus("error");
    }

    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-5">
        <div className="text-center py-12">
          <p>Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-5">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          {paymentStatus === "success" && "🎉 Thanh toán thành công!"}
          {paymentStatus === "cancel" && "❌ Thanh toán bị hủy"}
          {paymentStatus === "error" && "⚠️ Lỗi thanh toán"}
        </h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          {paymentStatus === "success" && (
            <>
              <div className="text-6xl mb-6">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">
                Đặt hàng và thanh toán thành công!
              </h2>
              <p className="text-gray-600 mb-6">
                Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý và sẽ
                được giao trong thời gian sớm nhất.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/orders")}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3">
                  Xem đơn hàng của tôi
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/menu")}
                  className="w-full">
                  Tiếp tục mua sắm
                </Button>
              </div>
            </>
          )}

          {paymentStatus === "cancel" && (
            <>
              <div className="text-6xl mb-6">🚫</div>
              <h2 className="text-2xl font-bold text-orange-600 mb-4">
                Thanh toán bị hủy
              </h2>
              <p className="text-gray-600 mb-6">
                Bạn đã hủy quá trình thanh toán. Đơn hàng có thể đã được tạo
                nhưng chưa thanh toán.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/orders")}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3">
                  Kiểm tra đơn hàng
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/checkout")}
                  className="w-full">
                  Thử lại thanh toán
                </Button>
              </div>
            </>
          )}

          {paymentStatus === "error" && (
            <>
              <div className="text-6xl mb-6">⚠️</div>
              <h2 className="text-2xl font-bold text-red-600 mb-4">
                Lỗi thanh toán
              </h2>
              <p className="text-gray-600 mb-6">
                Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc
                liên hệ hỗ trợ.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/checkout")}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3">
                  Thử lại
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/cart")}
                  className="w-full">
                  Quay lại giỏ hàng
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutResult;
