import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API, getImageUrl } from "@/lib/api";
import type { Category } from "@/types/index-ngu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FoodDetailModal from "@/components/FoodDetailModal";

// ==== Types ====
type Food = {
  id: number;
  title: string;
  description: string;
  price: string;
  image_url: string;
  // Thông tin giảm giá từ API
  discount_info?: {
    type: "percent" | "amount";
    value: number;
    amount: number;
    final_price: number;
  };
  // Nếu API có thêm rating hoặc availability thì khai báo ở đây:
  average_rating?: number;
  rating_count?: number;
  availability_status?: boolean;
  store?: {
    id: number;
    store_name: string;
  };
};

type StoreInfo = {
  id: number;
  store_name: string;
  image: string;
  description: string;
  manager: string;
};

type Store = {
  id: number;
  store_name: string;
  image: string;
  description: string;
  manager: string;
  products?: Food[];
};

// Helper functions từ Home.tsx
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
    const data = await API.post("/token/refresh/", { refresh }, { skipAuth: true }) as { access: string };
    localStorage.setItem("access_token", data.access);
    return data.access;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

export default function Menu() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Store search states
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [storeSearchResults, setStoreSearchResults] = useState<Store[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTab, setSearchTab] = useState<"foods" | "stores">("foods");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_date");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // tải danh mục + param
  useEffect(() => {
    loadCategories();
    loadAllStores();

    const categoryParam = searchParams.get("category");
    const storeParam = searchParams.get("store");

    if (storeParam) {
      const id = parseInt(storeParam);
      setStoreId(id);
      setSelectedCategory(null);
      loadStoreAndFoods(id);
      setInitialLoadDone(true);
    } else if (categoryParam) {
      const id = parseInt(categoryParam);
      setSelectedCategory(id);
      setStoreId(null);
      setInitialLoadDone(true);
    } else {
      // No params - show all
      setSelectedCategory(null);
      setStoreId(null);
      setInitialLoadDone(true);
    }
  }, [searchParams]);

  // Load foods khi thay đổi filters hoặc pagination
  useEffect(() => {
    // Wait for initial load to complete
    if (!initialLoadDone) return;

    // Không load nếu đang ở store view
    if (storeId) return;

    // Load foods with current category filter (null = all foods)
    loadFoods(selectedCategory === null ? undefined : selectedCategory);
  }, [selectedCategory, currentPage, sortBy, initialLoadDone, storeId]);

  // tải danh mục
  const loadCategories = async () => {
    try {
      const res = await API.get("/menu/categories/");
      const data = res as { results?: Category[] } | Category[];
      setCategories(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  // tải tất cả cửa hàng cho search
  const loadAllStores = async () => {
    try {
      const res = await API.get("/stores/public/");
      const data = Array.isArray(res) ? res : [];
      setAllStores(data);
    } catch (err) {
      console.error("Error loading stores:", err);
    }
  };

  // tải món ăn theo category với phân trang, tìm kiếm và sắp xếp
  const loadFoods = async (categoryId?: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryId) params.append("category", categoryId.toString());
      if (searchTerm) params.append("search", searchTerm);
      if (sortBy) params.append("sort", sortBy);
      params.append("page", currentPage.toString());
      params.append("page_size", "12");

      const url = `/menu/items/?${params.toString()}`;
      const res = await API.get(url);
      const data = res as {
        results?: Food[];
        count?: number;
        num_pages?: number;
        has_next?: boolean;
        has_previous?: boolean;
      };

      setFoods(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(data.num_pages || 0);
      setHasNext(data.has_next || false);
      setHasPrevious(data.has_previous || false);
    } catch (err) {
      console.error("Error loading foods:", err);
    } finally {
      setLoading(false);
    }
  };

  // tải info store + foods của store
  const loadStoreAndFoods = async (id: number) => {
    try {
      setLoading(true);

      // Gọi API để lấy danh sách món ăn theo store từ menu app
      const foodsRes = await API.get(`/menu/items/?store=${id}`);
      const foodsData = foodsRes as { results?: Food[] } | Food[];
      setFoods(Array.isArray(foodsData) ? foodsData : foodsData.results || []);

      // Thử lấy thông tin store từ public endpoint (optional, không bắt buộc)
      try {
        const allStoresRes = await API.get(`/stores/public/`);
        const allStores = Array.isArray(allStoresRes) ? allStoresRes : [];
        const foundStore = allStores.find((s: StoreInfo) => s.id === id);
        if (foundStore) {
          setStoreInfo(foundStore);
        }
      } catch (storeError) {
        console.warn(
          "Store info not found, but foods loaded successfully:",
          storeError
        );
        // Không set error, vì foods đã load được
      }
    } catch (error) {
      console.error("Error loading store foods:", error);
      // Nếu không load được foods, chuyển về trang chủ hoặc hiện thông báo
      alert("Không tìm thấy cửa hàng này hoặc cửa hàng không có món ăn!");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Search and filter handlers - tìm cả món ăn và cửa hàng
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setShowSearchResults(false);
      setCurrentPage(1);
      loadFoods(selectedCategory || undefined);
      return;
    }

    const query = searchTerm.trim().toLowerCase();

    // Load foods với search term (API sẽ xử lý search)
    setCurrentPage(1);
    loadFoods(selectedCategory || undefined);

    // Tìm kiếm cửa hàng local
    const filteredStores = allStores.filter(
      (store) =>
        store.store_name.toLowerCase().includes(query) ||
        store.description.toLowerCase().includes(query) ||
        store.manager.toLowerCase().includes(query)
    );
    setStoreSearchResults(filteredStores);

    // Hiển thị kết quả search
    setShowSearchResults(true);

    // Tự động chọn tab có kết quả
    if (foods.length > 0) {
      setSearchTab("foods");
    } else if (filteredStores.length > 0) {
      setSearchTab("stores");
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    // Update URL to reflect the selected category
    navigate(`/menu/items?category=${categoryId}`);
  };

  const handleShowAll = () => {
    setSelectedCategory(null);
    setCurrentPage(1);
    setSearchTerm("");
    // Navigate without category parameter to show all foods
    navigate("/menu/items");
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  // Enhanced add to cart function
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
        navigate("/login");
        return;
      }

      console.log("🛒 addToCart called with:", {
        foodId,
        quantity,
        note,
        foodOptionId,
        foodOptionIdType: typeof foodOptionId
      });

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

      console.log("🛒 Request body being sent:", requestBody);

      const result = await API.post("/cart/add/", requestBody);
      console.log("🛒 API response:", result);
      alert(`Đã thêm ${result.item.food.title} vào giỏ hàng!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại!");
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* hiển thị thông tin cửa hàng khi có */}
      {storeInfo && (
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-stretch gap-8">
            {/* Logo cửa hàng bên trái */}
            <div className="flex-shrink-0">
              <img
                src={getImageUrl(storeInfo.image)}
                alt={storeInfo.store_name}
                className="w-48 h-48 object-contain rounded-2xl shadow-lg border-4 border-white bg-white p-3"
              />
            </div>

            {/* Thông tin cửa hàng bên phải - Chiếm 2/3 không gian */}
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-5xl font-bold text-gray-800 mb-4">
                {storeInfo.store_name}
              </h1>
              <p className="text-xl text-gray-600 mb-4 leading-relaxed">
                {storeInfo.description}
              </p>
              <p className="text-base text-gray-500 flex items-center gap-3">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-medium">
                  Quản lý: {storeInfo.manager}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* khi không phải store thì hiện danh mục */}
      {!storeId && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={handleShowAll}>
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => handleCategoryChange(cat.id)}>
              {cat.cate_name}
            </Button>
          ))}
        </div>
      )}

      {/* Thanh tìm kiếm và bộ lọc */}
      {!storeId && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="🔍 Tìm món ăn hoặc cửa hàng..."
                className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="created_date">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="name">Tên A-Z</option>
              </select>

              <Button onClick={handleSearch}>Tìm kiếm</Button>
              {showSearchResults && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setShowSearchResults(false);
                    setStoreSearchResults([]);
                    setCurrentPage(1);
                    loadFoods(selectedCategory || undefined);
                  }}>
                  ✕ Xóa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results Tabs */}
      {showSearchResults && searchTerm && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 mb-4">
              <Button
                variant={searchTab === "foods" ? "default" : "outline"}
                onClick={() => setSearchTab("foods")}>
                🍔 Món ăn ({foods.length})
              </Button>
              <Button
                variant={searchTab === "stores" ? "default" : "outline"}
                onClick={() => setSearchTab("stores")}>
                🏪 Cửa hàng ({storeSearchResults.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hiển thị kết quả tìm kiếm cửa hàng */}
      {showSearchResults && searchTab === "stores" && (
        <div className="mb-6">
          {storeSearchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Không tìm thấy cửa hàng nào phù hợp
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {storeSearchResults.map((store) => (
                <Card
                  key={store.id}
                  className="p-6 hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-white to-orange-50">
                  <div className="flex gap-6">
                    <div className="flex-1">
                      <h3
                        className="font-bold text-2xl cursor-pointer hover:text-orange-600 transition-colors mb-2"
                        onClick={() =>
                          navigate(`/menu/items?store=${store.id}`)
                        }>
                        {store.store_name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {store.description}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        Quản lý: {store.manager}
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() =>
                          navigate(`/menu/items?store=${store.id}`)
                        }>
                        Xem thực đơn
                      </Button>
                    </div>
                    <div className="flex-shrink-0 w-32">
                      <img
                        src={
                          getImageUrl(store.image) || "/images/placeholder.jpg"
                        }
                        alt={store.store_name}
                        className="w-32 h-32 object-contain rounded-xl shadow-lg border-2 border-white bg-white p-2 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() =>
                          navigate(`/menu/items?store=${store.id}`)
                        }
                        onError={(e) => {
                          e.currentTarget.src = "/images/placeholder.jpg";
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* danh sách món ăn */}
      {loading && <p>Đang tải dữ liệu...</p>}

      {/* Hiển thị thông tin phân trang */}
      {!loading &&
        totalCount > 0 &&
        (!showSearchResults || searchTab === "foods") && (
          <div className="mb-4 text-sm text-gray-600">
            Hiển thị {foods.length} trong tổng số {totalCount} món ăn (Trang{" "}
            {currentPage}/{totalPages})
          </div>
        )}

      {/* Chỉ hiển thị danh sách món ăn khi không phải tab stores */}
      {(!showSearchResults || searchTab === "foods") && (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {foods.map((food) => (
            <Card
              key={food.id}
              className="transition-transform hover:scale-105 hover:shadow-lg">
              <CardContent className="p-4">
                <img
                  src={food.image_url}
                  alt={food.title}
                  className="w-full h-48 object-cover rounded-md mb-4 cursor-pointer"
                  onClick={() => openFoodModal(food)}
                />
                <div className="space-y-3">
                  {/* Tên món ăn - màu đen đậm, nổi bật */}
                  <h3
                    className="text-xl font-bold text-gray-900 cursor-pointer hover:text-orange-600 transition-colors"
                    onClick={() => openFoodModal(food)}>
                    {food.title}
                  </h3>

                  {/* Tên cửa hàng - màu xanh dương đậm */}
                  {(food.store?.store_name || storeInfo?.store_name) && (
                    <p className="text-sm font-semibold text-blue-700">
                      🏪 Cửa hàng:{" "}
                      {food.store?.store_name || storeInfo?.store_name}
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

                  {/* Đánh giá */}
                  {food.average_rating !== undefined &&
                    food.average_rating > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="text-yellow-400 text-lg">★</span>
                        <span className="ml-1 font-semibold">
                          {food.average_rating.toFixed(1)}
                        </span>
                        {food.rating_count && food.rating_count > 0 && (
                          <span className="ml-1 text-gray-500">
                            ({food.rating_count})
                          </span>
                        )}
                      </div>
                    )}

                  {/* Giá tiền - với giảm giá nếu có */}
                  <div className="space-y-2">
                    {food.discount_info ? (
                      <div className="text-xl font-black text-red-600 bg-yellow-50 px-3 py-2 rounded-lg inline-block border-l-4 border-red-500">
                        <span className="text-2xl">
                          {food.discount_info.final_price.toLocaleString()} đ
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm line-through text-gray-500">
                            {Number(food.price).toLocaleString()} đ
                          </span>
                          <span className="text-sm font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {food.discount_info.type === "percent"
                              ? `-${food.discount_info.value}%`
                              : `-${food.discount_info.amount.toLocaleString()}đ`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xl font-black text-red-600 bg-yellow-50 px-3 py-2 rounded-lg inline-block border-l-4 border-red-500">
                        {Number(food.price).toLocaleString()} đ
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Phân trang */}
      {!loading &&
        totalPages > 1 &&
        (!showSearchResults || searchTab === "foods") && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={!hasPrevious}>
              ← Trước
            </Button>

            <div className="flex gap-1">
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
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={!hasNext}>
              Tiếp →
            </Button>
          </div>
        )}

      {/* Food Detail Modal */}
      <FoodDetailModal
        isOpen={isModalOpen}
        onClose={closeFoodModal}
        food={selectedFood}
        onAddToCart={addToCart}
      />
    </div>
  );
}
