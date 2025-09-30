import React, { useState, useEffect } from "react";
import { API, type User } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Account: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    phone_number: "",
    address: "",
    email: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get("/auth/profile/");
      const userData = response as User;
      setUser(userData);
      setFormData({
        fullname: userData.fullname || "",
        phone_number: userData.phone_number || "",
        address: userData.address || "",
        email: userData.email || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      alert("Không thể tải thông tin cá nhân!");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await API.put("/auth/profile/update/", formData);
      const updatedUser = response as User;
      setUser(updatedUser);
      setIsEditing(false);
      alert("Cập nhật thông tin thành công!");

      // Update localStorage user info
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Lỗi khi cập nhật thông tin!");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        fullname: user.fullname || "",
        phone_number: user.phone_number || "",
        address: user.address || "",
        email: user.email || "",
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Không thể tải thông tin người dùng
          </p>
          <Button onClick={() => navigate("/")}>Về trang chủ</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mb-4">
            ← Quay lại
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            Thông tin cá nhân
          </h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Thông tin tài khoản</CardTitle>
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Chỉnh sửa
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}>
                    Hủy
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Đang lưu..." : "Lưu"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Username & Role - Read only */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên đăng nhập
                </label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  {user.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vai trò
                </label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  {user.role}
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập email"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border">
                  {user.email || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập họ và tên"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border">
                  {user.fullname || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border">
                  {user.phone_number || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ
              </label>
              {isEditing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập địa chỉ"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md border min-h-[80px]">
                  {user.address || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {/* Created Date - Read only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày tạo tài khoản
              </label>
              <div className="p-3 bg-gray-50 rounded-md border">
                {new Date(user.created_date).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
