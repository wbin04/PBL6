import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, isAuthenticated, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [foodImages, setFoodImages] = useState<string[]>([]);
  const [storeLogos, setStoreLogos] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/");
    }
    // Load random food images for background
    loadFoodImages();
    loadStoreLogos();
  }, [navigate]);

  const loadFoodImages = async () => {
    try {
      const data = await API.get("/menu/items/?page_size=20", { skipAuth: true });
      const foods = data.results || [];
      const images = foods
        .map((f: any) => f.image_url)
        .filter((img: string) => img);
      setFoodImages(images.slice(0, 16));
    } catch (error) {
      console.error("Error loading food images:", error);
    }
  };

  const loadStoreLogos = async () => {
    try {
      const stores = await API.get("/stores/public/", { skipAuth: true });
      const logos = Array.isArray(stores)
        ? stores.map((s: any) => s.image).filter((img: string) => img)
        : [];
      setStoreLogos(logos.slice(0, 10));
    } catch (error) {
      console.error("Error loading store logos:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post("/auth/login/", formData, {
        skipAuth: true,
      });

      // Store tokens and user info
      localStorage.setItem("access_token", response.access);
      localStorage.setItem("refresh_token", response.refresh);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Redirect based on role
      if (response.user.role === "Quản lý") {
        navigate("/admin");
      } else if (response.user.role === "Chủ cửa hàng") {
        navigate("/storemanager");
      } else {
        navigate("/");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      alert("Lỗi đăng nhập: " + errorMsg);
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
              { top: "5%", left: "3%" },
              { top: "10%", right: "5%" },
              { top: "25%", left: "8%" },
              { top: "35%", right: "10%" },
              { top: "50%", left: "5%" },
              { top: "60%", right: "8%" },
              { bottom: "25%", left: "10%" },
              { bottom: "15%", right: "5%" },
              { top: "15%", left: "15%" },
              { top: "45%", right: "15%" },
              { bottom: "35%", left: "15%" },
              { bottom: "40%", right: "12%" },
              { top: "70%", left: "7%" },
              { top: "80%", right: "7%" },
              { bottom: "5%", left: "20%" },
              { bottom: "8%", right: "18%" },
            ];
            return (
              <img
                key={index}
                src={img}
                alt="Food"
                className="absolute w-20 h-20 object-cover rounded-full opacity-25 shadow-lg"
                style={positions[index] || {}}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
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
              { top: "8%", right: "18%" },
              { top: "20%", left: "12%" },
              { top: "40%", right: "13%" },
              { top: "55%", left: "11%" },
              { top: "70%", right: "16%" },
              { bottom: "12%", left: "18%" },
              { top: "30%", left: "20%" },
              { bottom: "30%", right: "15%" },
              { top: "65%", left: "18%" },
              { bottom: "20%", right: "20%" },
            ];
            return (
              <img
                key={`store-${index}`}
                src={getImageUrl(logo)}
                alt="Store Logo"
                className="absolute w-16 h-16 object-contain rounded-lg opacity-30 shadow-xl bg-white/60 p-1.5"
                style={positions[index] || {}}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
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
            <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email / tên đăng nhập / số điện thoại
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin / bin"
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center text-sm">
              <p>
                <Link
                  to="/reset-password"
                  className="text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </p>
              <p>
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-primary hover:underline">
                  Đăng ký ngay
                </Link>
              </p>
              <p>
                <Link
                  to="/"
                  className="text-muted-foreground hover:text-primary">
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

export default Login;
