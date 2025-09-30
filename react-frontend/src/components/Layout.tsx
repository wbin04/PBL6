import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API, type User } from "@/lib/api";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const updateAuthUI = async () => {
      const token = localStorage.getItem("access_token");

      if (token) {
        try {
          const userProfile = await API.get("/auth/profile/");
          const userData = userProfile as User;
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.error("Error fetching user profile:", error);
          logout();
        }
      } else {
        setUser(null);
      }
    };

    updateAuthUI();
  }, [logout]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="text-xl font-bold text-primary">
            🍔 FastFood
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`font-medium transition-colors hover:text-primary ${
                isActive("/") ? "text-primary" : "text-foreground"
              }`}>
              Trang chủ
            </Link>
            <Link
              to="/menu"
              className={`font-medium transition-colors hover:text-primary ${
                isActive("/menu") ? "text-primary" : "text-foreground"
              }`}>
              Thực đơn
            </Link>

            {!user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="font-medium transition-colors hover:text-primary">
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="font-medium transition-colors hover:text-primary">
                  Đăng ký
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/cart"
                  className="font-medium transition-colors hover:text-primary">
                  🛒 Giỏ hàng
                </Link>
                <Link
                  to="/orders"
                  className="font-medium transition-colors hover:text-primary">
                  Đơn hàng
                </Link>
                {user.role === "Admin" && (
                  <Link
                    to="/admin"
                    className="font-medium transition-colors hover:text-primary">
                    Admin
                  </Link>
                )}
                <Link
                  to="/account"
                  className="font-medium transition-colors hover:text-primary">
                  Xin chào, {user.fullname || user.username}
                </Link>
                <button
                  onClick={logout}
                  className="font-medium transition-colors hover:text-primary">
                  Đăng xuất
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}>
            ☰
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="flex flex-col gap-2 p-4">
              <Link
                to="/"
                className={`py-2 font-medium transition-colors hover:text-primary ${
                  isActive("/") ? "text-primary" : "text-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}>
                Trang chủ
              </Link>
              <Link
                to="/menu"
                className={`py-2 font-medium transition-colors hover:text-primary ${
                  isActive("/menu") ? "text-primary" : "text-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}>
                Thực đơn
              </Link>

              {!user ? (
                <>
                  <Link
                    to="/login"
                    className="py-2 font-medium transition-colors hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}>
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="py-2 font-medium transition-colors hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}>
                    Đăng ký
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/cart"
                    className="py-2 font-medium transition-colors hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}>
                    🛒 Giỏ hàng
                  </Link>
                  <Link
                    to="/orders"
                    className="py-2 font-medium transition-colors hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}>
                    Đơn hàng
                  </Link>
                  {user.role === "Admin" && (
                    <Link
                      to="/admin"
                      className="py-2 font-medium transition-colors hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/account"
                    className="py-2 font-medium transition-colors hover:text-primary"
                    onClick={() => setIsMenuOpen(false)}>
                    Tài khoản
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="py-2 text-left font-medium transition-colors hover:text-primary">
                    Đăng xuất
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
