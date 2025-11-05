import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API} from "@/lib/api";
import type {User} from '@/types/index-ngu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const userDropdown = target.closest('[data-user-dropdown]');
      if (!userDropdown) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
                
                {/* User Dropdown */}
                <div 
                  className="relative"
                  data-user-dropdown>
                  <button
                    className="font-medium transition-colors hover:text-primary flex items-center space-x-1"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    onMouseEnter={() => setIsUserDropdownOpen(true)}>
                    <span>Xin chào, {user.fullname || user.username}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                      onMouseLeave={() => setIsUserDropdownOpen(false)}>
                      <div className="py-1">
                        {/* Account Link */}
                        <Link
                          to="/account"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          👤 Tài khoản của tôi
                        </Link>

                        {/* Store Manager Section */}
                        {/* If user is already a store manager by role */}
                        {(user.role === 'Chủ cửa hàng' || user.role === 'store_manager') && (
                          <Link
                            to="/store-manager"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                            🏪 Quản lý cửa hàng
                          </Link>
                        )}

                        {/* If user is customer and has registered but not yet approved (pending) */}
                        {(user.role === 'Khách hàng' || user.role === 'customer') && user.is_store_registered && (
                          <div className="block px-4 py-2 text-sm text-orange-600 bg-orange-50">
                            ⏳ Đơn đăng ký đang chờ duyệt
                          </div>
                        )}

                        {/* If user is customer and hasn't registered for store management */}
                        {(user.role === 'Khách hàng' || user.role === 'customer') && !user.is_store_registered && (
                          <Link
                            to="/store-manager/register"
                            className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                            📝 Đăng ký làm chủ cửa hàng
                          </Link>
                        )}

                        {/* Admin Link - if user is admin */}
                        {(user.role === 'Admin' || user.role === 'admin' || user.role === 'Quản trị viên') && (
                          <Link
                            to="/admin"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                            ⚙️ Quản trị hệ thống
                          </Link>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-1"></div>

                        {/* Logout */}
                        <button
                          onClick={() => {
                            logout();
                            setIsUserDropdownOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          🚪 Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
