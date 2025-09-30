import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl, type Category } from "@/lib/api";
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
  const [totalStores, setTotalStores] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const storesPerPage = 6; // Hiển thị 6 cửa hàng mỗi trang

  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedCategories();
    loadStores(currentPage);
  }, [currentPage]);

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

  // load stores + foods with pagination
  const loadStores = async (page: number = 1) => {
    try {
      setLoading(true);

      // fetch stores with pagination
      const url = `http://127.0.0.1:8000/api/stores/?page=${page}&page_size=${storesPerPage}`;
      let storesResponse = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (storesResponse.status === 401) {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          storesResponse = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${newAccess}`,
              "Content-Type": "application/json",
            },
          });
        }
      }

      if (!storesResponse.ok) {
        throw new Error(`HTTP error! status: ${storesResponse.status}`);
      }

      const data = await storesResponse.json();
      const storesData: StoreResponse[] = data.results || [];

      // Update pagination info
      setTotalStores(data.count || 0);
      setTotalPages(data.num_pages || 0);
      setHasNext(data.has_next || false);
      setHasPrevious(data.has_previous || false);

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

      setStores(storesWithFoods);
    } catch (error) {
      console.error("Error loading stores:", error);
      setStores([]);
    } finally {
      setLoading(false);
    }
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
              {searchResults.map((food) => (
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
                    <h3 className="font-bold text-lg mb-2">{food.title}</h3>
                    <p
                      className="text-gray-600 text-sm mb-2 overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                      }}>
                      {food.description}
                    </p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-orange-600 font-semibold">
                        {Number(food.price).toLocaleString()} đ
                      </span>
                      {food.rating_count &&
                        food.rating_count > 0 &&
                        food.average_rating && (
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="text-yellow-400">★</span>
                            <span className="ml-1">
                              {food.average_rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">
                      <p>Cửa hàng: {food.store?.store_name || "N/A"}</p>
                      <p>Danh mục: {food.category?.cate_name || "N/A"}</p>
                    </div>
                  </div>
                </Card>
              ))}
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
              <div className="text-sm text-gray-600">
                Trang {currentPage} / {totalPages}
              </div>
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
                          <p className="font-medium">{p.title}</p>
                          <p className="text-orange-600 font-semibold">
                            {Number(p.price).toLocaleString()} đ
                          </p>
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
                  let pageNum;
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
          {totalStores > 0 && (
            <div className="text-center mt-4 text-gray-600">
              Hiển thị {(currentPage - 1) * storesPerPage + 1} -{" "}
              {Math.min(currentPage * storesPerPage, totalStores)}
              trong tổng số {totalStores} cửa hàng
            </div>
          )}
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
                    <p className="font-medium">{p.title}</p>
                    <p className="text-orange-600 font-semibold">
                      {Number(p.price).toLocaleString()} đ
                    </p>
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
