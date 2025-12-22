import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, isAuthenticated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    fullname: "Bin",
    email: "bin@gmail.com",
    username: "bin",
    phone_number: "123123123",
    address: "Đà Nẵng",
    password: "123",
    password_confirm: "123",
  });
  const [loading, setLoading] = useState(false);
  const [foodImages, setFoodImages] = useState<string[]>([]);
  const [storeLogos, setStoreLogos] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthenticated()) {
      navigate("/");
    }
    // Load random food images for background
    loadFoodImages();
    loadStoreLogos();
  }, [navigate]);

  const loadFoodImages = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/menu/items/?page_size=20", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        const foods = data.results || [];
        const images = foods.map((f: any) => f.image_url).filter((img: string) => img);
        setFoodImages(images.slice(0, 16));
      }
    } catch (error) {
      console.error("Error loading food images:", error);
    }
  };

  const loadStoreLogos = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/stores/public/", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const stores = await response.json();
        const logos = Array.isArray(stores) ? stores.map((s: any) => s.image).filter((img: string) => img) : [];
        setStoreLogos(logos.slice(0, 10));
      }
    } catch (error) {
      console.error("Error loading store logos:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.password_confirm) {
      alert("Mật khẩu xác nhận không khớp!");
      setLoading(false);
      return;
    }

    try {
      const response = await API.post("/auth/register/", formData, {
        skipAuth: true,
      });

      // Store tokens and user info
      localStorage.setItem("access_token", response.access);
      localStorage.setItem("refresh_token", response.refresh);
      localStorage.setItem("user", JSON.stringify(response.user));

      alert("Đăng ký thành công!");
      navigate("/");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert("Lỗi đăng ký: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-white to-red-100 relative overflow-hidden">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-orange-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-red-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-yellow-500 rounded-full blur-2xl"></div>
      </div>

      {/* Food Icons Pattern */}
      <div className="absolute inset-0 opacity-30 text-6xl pointer-events-none">
        <div className="absolute top-20 left-20">🍔</div>
        <div className="absolute top-40 right-32">🍕</div>
        <div className="absolute bottom-32 left-40">🍟</div>
        <div className="absolute bottom-20 right-20">🌮</div>
        <div className="absolute top-32 right-1/4">🍗</div>
        <div className="absolute bottom-40 left-1/3">🥤</div>
        <div className="absolute top-1/2 right-40">🍜</div>
        <div className="absolute bottom-1/2 left-20">🍦</div>
      </div>

      {/* Real Food Images */}
      {foodImages.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {foodImages.map((img, index) => {
            const positions = [
              { top: '5%', left: '3%' },
              { top: '10%', right: '5%' },
              { top: '25%', left: '8%' },
              { top: '35%', right: '10%' },
              { top: '50%', left: '5%' },
              { top: '60%', right: '8%' },
              { bottom: '25%', left: '10%' },
              { bottom: '15%', right: '5%' },
              { top: '15%', left: '15%' },
              { top: '45%', right: '15%' },
              { bottom: '35%', left: '15%' },
              { bottom: '40%', right: '12%' },
              { top: '70%', left: '7%' },
              { top: '80%', right: '7%' },
              { bottom: '5%', left: '20%' },
              { bottom: '8%', right: '18%' },
            ];
            return (
              <img
                key={index}
                src={img}
                alt="Food"
                className="absolute w-20 h-20 object-cover rounded-full opacity-25 shadow-lg"
                style={positions[index] || {}}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            );
          })}
        </div>
      )}

      {/* Store Logos */}
      {storeLogos.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {storeLogos.map((logo, index) => {
            const positions = [
              { top: '8%', right: '18%' },
              { top: '20%', left: '12%' },
              { top: '40%', right: '13%' },
              { top: '55%', left: '11%' },
              { top: '70%', right: '16%' },
              { bottom: '12%', left: '18%' },
              { top: '30%', left: '20%' },
              { bottom: '30%', right: '15%' },
              { top: '65%', left: '18%' },
              { bottom: '20%', right: '20%' },
            ];
            return (
              <img
                key={`store-${index}`}
                src={`http://127.0.0.1:8000${logo}`}
                alt="Store Logo"
                className="absolute w-16 h-16 object-contain rounded-lg opacity-30 shadow-xl bg-white/60 p-1.5"
                style={positions[index] || {}}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            );
          })}
        </div>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full px-4">
        {/* Welcome Text */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 drop-shadow-lg">
            🍔 Chào mừng đến với Fast Food 🍟
          </div>
        </div>

        <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Đăng ký</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullname" className="text-sm font-medium">
                Họ và tên
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Tên đăng nhập
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone_number" className="text-sm font-medium">
                Số điện thoại
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                Địa chỉ
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                placeholder="Nhập địa chỉ"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mật khẩu
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password_confirm" className="text-sm font-medium">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm">
            <p>
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
            <p>
              <Link to="/" className="text-muted-foreground hover:text-primary">
                ← Về trang chủ
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Register;
