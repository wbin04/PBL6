import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const StoreManagerRegister: React.FC = () => {
  const [formData, setFormData] = useState({
    store_name: "",
    description: "",
    address: "",
    phone_number: "",
    business_license: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.store_name.trim()) {
      alert("Vui lòng nhập tên cửa hàng");
      return;
    }

    if (!formData.address.trim()) {
      alert("Vui lòng nhập địa chỉ cửa hàng");
      return;
    }

    if (!formData.phone_number.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }

    try {
      setLoading(true);

      // Update store registration status
      await API.post("/auth/registration/store/", {
        is_registered: true,
      });

      alert(
        "Đăng ký thành công! Chúng tôi sẽ xem xét và phản hồi trong vòng 1-2 ngày làm việc."
      );
      navigate("/");
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Có lỗi xảy ra khi đăng ký";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Đăng ký làm chủ cửa hàng
              </h1>
              <p className="text-gray-600">
                Tham gia cùng chúng tôi để mở rộng kinh doanh của bạn
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Store Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên cửa hàng *
                </label>
                <input
                  type="text"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nhập tên cửa hàng của bạn"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả cửa hàng
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Mô tả về cửa hàng, loại thức ăn, đặc sản..."
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ cửa hàng *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại liên hệ *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Số điện thoại để liên hệ"
                  required
                />
              </div>

              {/* Business License */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số giấy phép kinh doanh
                </label>
                <input
                  type="text"
                  name="business_license"
                  value={formData.business_license}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Số giấy phép kinh doanh (nếu có)"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do muốn tham gia
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Chia sẻ lý do bạn muốn tham gia nền tảng của chúng tôi..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3">
                  {loading ? "Đang gửi..." : "Gửi đăng ký"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1 py-3">
                  Quay lại
                </Button>
              </div>
            </form>

            {/* Additional Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                Lưu ý quan trọng:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Chúng tôi sẽ xem xét đăng ký trong vòng 1-2 ngày làm việc
                </li>
                <li>• Bạn sẽ nhận được thông báo qua email về kết quả</li>
                <li>• Thông tin phải chính xác và trung thực</li>
                <li>• Cần có giấy phép kinh doanh hợp lệ (nếu áp dụng)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreManagerRegister;
