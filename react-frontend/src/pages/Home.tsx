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

      // Fetch all stores (backend returns all without pagination)
      const url = `http://127.0.0.1:8000/api/stores/`;
      console.log("🔄 Fetching stores from:", url);

      let storesResponse = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      console.log("📡 Response status:", storesResponse.status);

      if (storesResponse.status === 401) {
        console.log("🔑 Token expired, refreshing...");
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          storesResponse = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${newAccess}`,
              "Content-Type": "application/json",
            },
          });
          console.log("📡 Retry response status:", storesResponse.status);
        }
      }

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

      // fetch foods for each store (keep only 3 foods per store)
      const storesWithFoods: Store[] = await Promise.all(
        storesData.map(async (store) => {
          try {
            let foodsResponse = await fetch(
              `http://127.0.0.1:8000/api/stores/${store.id}/foods/`,
              { method: "GET", headers: getAuthHeaders() }
            );

            if (foodsResponse.status === 401) {
              const newAccess = await refreshAccessToken();
              if (newAccess) {
                foodsResponse = await fetch(
                  `http://127.0.0.1:8000/api/stores/${store.id}/foods/`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${newAccess}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
              }
            }

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
    <div className="font-sans">
      {/* Navbar */}
      <header className="bg-orange-500 text-white px-6 py-3 flex justify-center items-center">
        <div className="flex gap-6">
          <Link to="/" className="font-semibold">
            Trang chủ
          </Link>
          <Link to="/promo">Khuyến mãi</Link>
          <Link to="/contact">Liên hệ</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-red-600 text-white text-center py-10">
        <h1 className="text-3xl font-bold mb-2">Chào mừng đến FastFood</h1>
        <p className="mb-6">Đặt món ăn ngon, giao hàng nhanh chóng!</p>
        <div className="flex justify-center gap-6 flex-wrap">
          {categories.map((cate) => (
            <div
              key={cate.id}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => viewCategory(cate.id)}>
              <img
                src={getImageUrl(cate.image)}
                alt={cate.cate_name}
                className="w-12 h-12 mb-2"
              />
              <span>{cate.cate_name}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center items-center gap-2">
          <input
            type="text"
            placeholder="Tìm món ăn..."
            className="px-4 py-2 rounded-md text-black w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchInputKeyPress}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {isSearching ? "Đang tìm..." : "Tìm kiếm"}
          </button>
          {showSearchResults && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md">
              Xóa
            </button>
          )}
        </div>
      </section>

      {/* Search Results */}
      {showSearchResults && (
        <section className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Kết quả tìm kiếm cho "{searchQuery}" ({searchResults.length} món)
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
        className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Stores header */}
          {!loading && totalStores > 0 && (
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Cửa hàng ({totalStores})
              </h2>
              {totalPages > 0 && (
                <div className="text-sm text-gray-600">
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
              <Card key={store.id} className="p-4">
                <h3
                  className="font-bold text-lg cursor-pointer hover:text-blue-600"
                  onClick={() => viewStore(store.id)}>
                  {store.store_name}
                </h3>
                <p>{store.description}</p>
                <p>Quản lý: {store.manager}</p>
                <div className="flex gap-6 mt-4 flex-wrap">
                  {store.products.length === 0 ? (
                    <p className="text-gray-500">Không có món ăn</p>
                  ) : (
                    store.products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        onClick={() => openFoodModal(p)}>
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = "/images/placeholder.jpg";
                          }}
                        />
                        <div>
                          <p className="text-gray-900 font-bold">{p.title}</p>
                          <div className="bg-red-50 px-2 py-1 rounded-md inline-block mt-1">
                            <span className="text-red-600 font-bold">
                              {Number(p.price).toLocaleString()} đ
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={goToPreviousPage}
                disabled={!hasPrevious}
                className={`px-4 py-2 rounded-md ${
                  hasPrevious
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}>
                ← Trước
              </button>

              <div className="flex space-x-1">
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
                      className={`px-3 py-2 rounded-md ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goToNextPage}
                disabled={!hasNext}
                className={`px-4 py-2 rounded-md ${
                  hasNext
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}>
                Tiếp →
              </button>
            </div>
          )}

          {/* Store count info */}
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="font-bold text-lg mb-4">Món Được Yêu Thích</h2>
          <div className="space-y-4">
            {stores[0]?.products.length > 0 ? (
              stores[0].products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  onClick={() => openFoodModal(p)}>
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-12 h-12 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/images/placeholder.jpg";
                    }}
                  />
                  <div>
                    <p className="text-gray-900 font-bold">{p.title}</p>
                    <div className="bg-red-50 px-2 py-1 rounded-md inline-block mt-1">
                      <span className="text-red-600 font-bold">
                        {Number(p.price).toLocaleString()} đ
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Không có món yêu thích</p>
            )}
          </div>
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
