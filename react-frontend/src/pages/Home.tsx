import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import type { Category } from "@/types/index-ngu";
import { Card } from "@/components/ui/card";
import Footer from "@/components/Footer";
import FoodDetailModal from "@/components/FoodDetailModal";
import { searchFoodItems, type DetailedFood } from "@/services/menuService";

// ==== Types ====
type Store = {
  id: number;
  store_name: string;
  image: string;
  description: string;
  manager: string;
  products: Food[];
};

type StoreResponse = {
  id: number;
  store_name: string;
  image: string;
  description: string;
  manager: string;
};

type Food = {
  id: number;
  title: string;
  price: string;
  image_url: string;
  description: string;
};

// ==== Helpers ====
const getAccessToken = () =>
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("access_token");

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const refreshAccessToken = async () => {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;

  try {
    const response = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) throw new Error("Failed to refresh token");

    const data = await response.json();
    localStorage.setItem("access_token", data.access);
    return data.access;
  } catch (error) {
    console.error("Refresh token failed:", error);
    return null;
  }
};

// ==== Component ====
const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DetailedFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [allStores, setAllStores] = useState<Store[]>([]); // Store all stores
  const [totalStores, setTotalStores] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const storesPerPage = 6;

  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedCategories();
    loadStores();
  }, []); // Load once

  // Update displayed stores when page changes
  useEffect(() => {
    if (allStores.length > 0) {
      updatePaginationInfo();
    }
  }, [currentPage, allStores]);

  // load categories
  const loadFeaturedCategories = async () => {
    try {
      const response = await API.get("/menu/categories/");
      const data = response as { results: Category[] };
      setCategories(data.results.slice(0, 6));
    } catch (error) {
      console.error("Error loading featured categories:", error);
    }
  };

  // load stores + foods (load all stores once, paginate client-side)
  const loadStores = async () => {
    try {
      setLoading(true);

      // Fetch all stores using PUBLIC endpoint (so all users see all stores)
      const url = `http://127.0.0.1:8000/api/stores/public/`;
      console.log("🔄 Fetching stores from:", url);

      let storesResponse = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      console.log("📡 Response status:", storesResponse.status);

      if (!storesResponse.ok) {
        throw new Error(`HTTP error! status: ${storesResponse.status}`);
      }

      const responseData = await storesResponse.json();

      // Handle both array and object response formats
      const storesData: StoreResponse[] = Array.isArray(responseData)
        ? responseData
        : responseData.results || [];

      console.log("🔍 DEBUG Loaded stores:", {
        responseType: Array.isArray(responseData) ? "array" : "object",
        total: storesData.length,
        storesData: storesData,
      });

      // fetch foods for each store using PUBLIC menu API (keep only 3 foods per store)
      const storesWithFoods: Store[] = await Promise.all(
        storesData.map(async (store) => {
          try {
            // Use public menu API with store filter instead of authenticated stores API
            const foodsResponse = await fetch(
              `http://127.0.0.1:8000/api/menu/items/?store=${store.id}&page_size=3`,
              { method: "GET", headers: { "Content-Type": "application/json" } }
            );

            if (!foodsResponse.ok) {
              throw new Error(
                `Failed to fetch foods for store ${store.id}, status: ${foodsResponse.status}`
              );
            }

            const foodsData = await foodsResponse.json();
            const foodsList: Food[] = Array.isArray(foodsData)
              ? foodsData
              : foodsData.results || [];

            return { ...store, products: foodsList.slice(0, 3) };
          } catch (error) {
            console.error(`Error loading foods for store ${store.id}:`, error);
            return { ...store, products: [] };
          }
        })
      );

      // Store all stores for client-side pagination
      setAllStores(storesWithFoods);
      setTotalStores(storesWithFoods.length);

      // Calculate pagination
      const numPages = Math.ceil(storesWithFoods.length / storesPerPage);
      setTotalPages(numPages);

      // Set initial page display
      const startIndex = (currentPage - 1) * storesPerPage;
      const endIndex = startIndex + storesPerPage;
      const paginatedStores = storesWithFoods.slice(startIndex, endIndex);

      setStores(paginatedStores);
      setHasNext(currentPage < numPages);
      setHasPrevious(currentPage > 1);

      console.log("📄 Initial pagination:", {
        totalStores: storesWithFoods.length,
        totalPages: numPages,
        currentPage,
        displayingStores: paginatedStores.length,
      });
    } catch (error) {
      console.error("Error loading stores:", error);
      setAllStores([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  // Update pagination info and displayed stores based on current page
  const updatePaginationInfo = () => {
    if (allStores.length === 0) return;

    const startIndex = (currentPage - 1) * storesPerPage;
    const endIndex = startIndex + storesPerPage;
    const paginatedStores = allStores.slice(startIndex, endIndex);

    setStores(paginatedStores);
    setHasNext(currentPage < totalPages);
    setHasPrevious(currentPage > 1);

    console.log("📄 Pagination updated:", {
      currentPage,
      totalPages,
      totalStores: allStores.length,
      displayingStores: paginatedStores.length,
      startIndex,
      endIndex,
    });
  };

  // navigate
  const viewStore = (storeId: number) => {
    navigate(`/menu/items?store=${storeId}`);
  };

  const viewCategory = (categoryId: number) => {
    navigate(`/menu/items?category=${categoryId}`);
  };

  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchFoodItems(searchQuery.trim());
      setSearchResults(results.results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching foods:", error);
      alert("Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại!");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Modal handlers
  const openFoodModal = (food: Food) => {
    setSelectedFood(food);
    setIsModalOpen(true);
  };

  const closeFoodModal = () => {
    setIsModalOpen(false);
    setSelectedFood(null);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      // Scroll to stores section
      const storesSection = document.getElementById("stores-section");
      if (storesSection) {
        storesSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const goToPreviousPage = () => {
    if (hasPrevious) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (hasNext) {
      goToPage(currentPage + 1);
    }
  };

  // Add to cart function
  const addToCart = async (
    foodId: number,
    quantity: number,
    note?: string,
    foodOptionId?: number
  ) => {
    try {
      const token = getAccessToken();
      if (!token) {
        alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
        navigate("/auth/login");
        return;
      }

      const requestBody: {
        food_id: number;
        quantity: number;
        item_note?: string;
        food_option_id?: number;
      } = {
        food_id: foodId,
        quantity: quantity,
        item_note: note,
      };

      if (foodOptionId) {
        requestBody.food_option_id = foodOptionId;
      }

      let response = await fetch("http://127.0.0.1:8000/api/cart/add/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (response.status === 401) {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          response = await fetch("http://127.0.0.1:8000/api/cart/add/", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${newAccess}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(`Đã thêm ${result.item.food.title} vào giỏ hàng!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại!");
    }
  };

  // ==== Render ====
  if (loading) {
    return (
      <div className="font-sans">
        <header className="bg-orange-500 text-white px-6 py-3 flex justify-center items-center">
          <div className="flex gap-6">
            <Link to="/" className="font-semibold">
              Trang chủ
            </Link>
            <Link to="/promo">Khuyến mãi</Link>
            <Link to="/contact">Liên hệ</Link>
          </div>
        </header>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-xl">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-gradient-to-b from-orange-50 via-white to-red-50 min-h-screen">
      {/* Hero Section with Beautiful Background */}
      <section className="relative bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 text-white text-center py-16 overflow-hidden">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-yellow-300 rounded-full blur-2xl"></div>
        </div>

        {/* Food Icons Pattern */}
        <div className="absolute inset-0 opacity-5 text-6xl pointer-events-none">
          <div className="absolute top-20 left-20">🍔</div>
          <div className="absolute top-40 right-32">🍕</div>
          <div className="absolute bottom-32 left-40">🍟</div>
          <div className="absolute bottom-20 right-20">🌮</div>
          <div className="absolute top-32 right-1/4">🍗</div>
          <div className="absolute bottom-40 left-1/3">🥤</div>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Chào mừng đến FastFood
          </h1>
          <p className="text-xl mb-8 text-yellow-100 drop-shadow-md">
            Đặt món ăn ngon, giao hàng nhanh chóng! 🚀
          </p>
          <div className="flex justify-center gap-8 flex-wrap mb-8">
            {categories.map((cate) => (
              <div
                key={cate.id}
                className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform duration-300 group"
                onClick={() => viewCategory(cate.id)}>
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl group-hover:bg-white/30 transition-all shadow-lg">
                  <img
                    src={getImageUrl(cate.image)}
                    alt={cate.cate_name}
                    className="w-16 h-16"
                  />
                </div>
                <span className="mt-3 font-semibold text-yellow-100 group-hover:text-white transition-colors">
                  {cate.cate_name}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Tìm món ăn yêu thích của bạn..."
                className="px-6 py-3 rounded-full text-black w-96 shadow-2xl focus:ring-4 focus:ring-yellow-300 focus:outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchInputKeyPress}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-8 py-3 bg-white text-red-600 rounded-full font-bold shadow-2xl hover:bg-yellow-100 hover:scale-105 transform transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isSearching ? "⏳ Đang tìm..." : "🔍 Tìm kiếm"}
            </button>
            {showSearchResults && (
              <button
                onClick={clearSearch}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-full font-medium shadow-xl hover:scale-105 transform transition-all">
                ✕ Xóa
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Search Results */}
      {showSearchResults && (
        <section className="container mx-auto px-4 py-8 relative">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100/30 to-red-100/30 rounded-3xl -z-10"></div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              🎯 Kết quả tìm kiếm cho "{searchQuery}"{" "}
              <span className="text-orange-600">
                ({searchResults.length} món)
              </span>
            </h2>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không tìm thấy món ăn nào phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map((food) => {
                // Debug: log dữ liệu rating
                console.log("Food rating data:", {
                  id: food.id,
                  title: food.title,
                  average_rating: food.average_rating,
                  rating_count: food.rating_count,
                });

                return (
                  <Card
                    key={food.id}
                    className="p-4 hover:shadow-lg transition-shadow">
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        openFoodModal({
                          id: food.id,
                          title: food.title,
                          price: food.price,
                          image_url: food.image_url,
                          description: food.description,
                        })
                      }>
                      <img
                        src={food.image_url}
                        alt={food.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                        onError={(e) => {
                          e.currentTarget.src = "/images/placeholder.jpg";
                        }}
                      />
                      <div className="space-y-3">
                        {/* Tên món ăn - màu đen đậm, nổi bật */}
                        <h3 className="text-xl font-bold text-gray-900 cursor-pointer hover:text-orange-600 transition-colors">
                          {food.title}
                        </h3>

                        {/* Tên cửa hàng - màu xanh dương đậm */}
                        {food.store?.store_name && (
                          <p className="text-sm font-semibold text-blue-700">
                            🏪 Cửa hàng: {food.store.store_name}
                          </p>
                        )}

                        {/* Mô tả món ăn - màu xám đậm */}
                        {food.description && (
                          <p
                            className="text-sm text-gray-800 leading-relaxed overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as const,
                            }}>
                            {food.description}
                          </p>
                        )}

                        {/* Giá tiền - màu đỏ cam rất nổi bật với background */}
                        <div className="text-xl font-black text-red-600 bg-yellow-50 px-3 py-2 rounded-lg inline-block border-l-4 border-red-500">
                          {Number(food.price).toLocaleString()} đ
                        </div>

                        {/* Đánh giá */}
                        {/* Đánh giá */}
                        {food.average_rating !== undefined &&
                          food.average_rating > 0 && (
                            <div className="flex items-center text-sm text-gray-500">
                              <span className="text-yellow-400">★</span>
                              <span className="ml-1">
                                {food.average_rating.toFixed(1)}
                              </span>
                              {food.rating_count && food.rating_count > 0 && (
                                <span className="ml-1">
                                  ({food.rating_count})
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Stores */}
      <section
        id="stores-section"
        className="container mx-auto px-4 py-10 relative">
        {/* Decorative circles background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-0 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-0 w-72 h-72 bg-red-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="space-y-6">
          {/* Stores header */}
          {!loading && totalStores > 0 && (
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-4xl">🏪</span> Cửa hàng ({totalStores})
              </h2>
              {totalPages > 0 && (
                <div className="text-sm text-gray-600 bg-orange-100 px-4 py-2 rounded-full font-medium">
                  Trang {currentPage} / {totalPages}
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải cửa hàng...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && stores.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Không có cửa hàng nào để hiển thị</p>
            </div>
          )}

          {/* Stores list */}
          {!loading &&
            stores.length > 0 &&
            stores.map((store) => (
              <Card
                key={store.id}
                className="p-6 hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-white to-orange-50">
                <div className="flex gap-6">
                  {/* Thông tin cửa hàng và món ăn bên trái */}
                  <div className="flex-1 flex flex-col justify-between h-48">
                    {/* Thông tin cửa hàng */}
                    <div>
                      <h3
                        className="font-bold text-2xl cursor-pointer hover:text-orange-600 transition-colors mb-1"
                        onClick={() => viewStore(store.id)}>
                        {store.store_name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-1">
                        {store.description}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        Quản lý: {store.manager}
                      </p>
                    </div>

                    {/* Danh sách món ăn */}
                    <div className="flex gap-3 flex-wrap">
                      {store.products.length === 0 ? (
                        <p className="text-gray-500 italic text-sm">
                          Không có món ăn
                        </p>
                      ) : (
                        store.products.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded-xl transition-all duration-300 hover:shadow-md group border border-transparent hover:border-orange-200"
                            onClick={() => openFoodModal(p)}>
                            <img
                              src={p.image_url}
                              alt={p.title}
                              className="w-24 h-24 object-cover rounded-lg shadow-md group-hover:scale-110 transition-transform"
                              onError={(e) => {
                                e.currentTarget.src = "/images/placeholder.jpg";
                              }}
                            />
                            <div>
                              <p className="text-gray-900 font-bold group-hover:text-orange-600 transition-colors">
                                {p.title}
                              </p>
                              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-lg inline-block mt-1 shadow-sm">
                                <span className="font-bold text-sm">
                                  {Number(p.price).toLocaleString()} đ
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Logo cửa hàng bên phải */}
                  <div className="flex-shrink-0 w-48">
                    <img
                      src={
                        getImageUrl(store.image) || "/images/placeholder.jpg"
                      }
                      alt={store.store_name}
                      className="w-full h-48 object-contain rounded-2xl shadow-xl border-4 border-white bg-white p-3 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => viewStore(store.id)}
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder.jpg";
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-3 mt-10">
              <button
                onClick={goToPreviousPage}
                disabled={!hasPrevious}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  hasPrevious
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transform hover:-translate-x-1"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}>
                ← Trước
              </button>

              <div className="flex space-x-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-12 h-12 rounded-xl font-bold transition-all duration-300 ${
                        currentPage === pageNum
                          ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-110"
                          : "bg-white text-gray-700 hover:bg-orange-100 hover:text-orange-600 border-2 border-gray-200 hover:border-orange-300 hover:scale-105"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goToNextPage}
                disabled={!hasNext}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  hasNext
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transform hover:translate-x-1"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}>
                Tiếp →
              </button>
            </div>
          )}

          {/* Store count info */}
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Food Detail Modal */}
      <FoodDetailModal
        isOpen={isModalOpen}
        onClose={closeFoodModal}
        food={selectedFood}
        onAddToCart={addToCart}
      />
    </div>
  );
};

export default Home;
