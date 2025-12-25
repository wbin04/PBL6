import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/api";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!formData.identifier || !formData.new_password || !formData.new_password_confirm) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (formData.new_password !== formData.new_password_confirm) {
      setError("Mật khẩu mới và xác nhận không khớp");
      return;
    }

    if (formData.new_password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);

    try {
      const data = await API.post("/auth/reset-password/", formData, { skipAuth: true }) as { message?: string };
      setSuccess(data.message || "Đặt lại mật khẩu thành công!");
      setFormData({
        identifier: "",
        new_password: "",
        new_password_confirm: "",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-white to-red-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">🔑 Quên Mật Khẩu</CardTitle>
          <p className="text-center text-sm text-orange-100 mt-2">
            Đặt lại mật khẩu của bạn
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier (Email/Username/Phone) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email / Tên đăng nhập / Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Nhập email, username hoặc số điện thoại"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPasswords.new ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="new_password_confirm"
                  value={formData.new_password_confirm}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPasswords.confirm ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span>{success}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-lg shadow-lg">
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </Button>
              <Button
                type="button"
                onClick={() => navigate("/login")}
                variant="outline"
                className="w-full border-2 border-gray-300 hover:bg-gray-100 font-semibold py-3 rounded-lg">
                Quay lại đăng nhập
              </Button>
            </div>
          </form>

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Lưu ý:</strong> Hệ thống sẽ đặt lại mật khẩu ngay lập tức mà không cần xác thực qua email. 
                Vui lòng đảm bảo bạn nhập đúng thông tin tài khoản.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
