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
    const response = await fetch("http://127.0.0.1:8000/api/auth/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      return data.access;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
  }
  return null;
};

export default function Menu() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // tải danh mục + param
  useEffect(() => {
    loadCategories();

    const categoryParam = searchParams.get("category");
    const storeParam = searchParams.get("store");

    if (storeParam) {
      const id = parseInt(storeParam);
      setStoreId(id);
      loadStoreAndFoods(id);
    } else if (categoryParam) {
      const id = parseInt(categoryParam);
      setSelectedCategory(id);
      loadFoods(id);
    } else {
      loadFoods();
    }
  }, [searchParams]);

  // tải danh mục
  const loadCategories = async () => {
    try {
      const res = await API.get("/menu/categories/");
      setCategories(res as Category[]);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  // tải món ăn theo category
  const loadFoods = async (categoryId?: number) => {
    try {
      setLoading(true);
      let url = "/menu/items/";
      if (categoryId) url += `?category=${categoryId}`;
      const res = await API.get(url);
      const data = res as { results?: Food[] } | Food[];
      setFoods(Array.isArray(data) ? data : data.results || []);
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
      const storeRes: StoreInfo = await API.get(`/stores/${id}/`);
      setStoreInfo(storeRes);

      const foodsRes = await API.get(`/stores/${id}/foods/`);
      const foodsData = foodsRes as { results?: Food[] } | Food[];
      setFoods(Array.isArray(foodsData) ? foodsData : foodsData.results || []);
    } catch (error) {
      console.error("Error loading store:", error);
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto p-4">
      {/* hiển thị thông tin cửa hàng khi có */}
      {storeInfo && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{storeInfo.store_name}</h1>
          <p className="text-muted-foreground">{storeInfo.description}</p>
          <p className="text-sm">Quản lý: {storeInfo.manager}</p>
          <img
            src={getImageUrl(storeInfo.image)}
            alt={storeInfo.store_name}
            className="my-4 w-32 h-32 object-cover rounded-lg"
          />
        </div>
      )}

      {/* khi không phải store thì hiện danh mục */}
      {!storeId && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => loadFoods(cat.id)}>
              {cat.cate_name}
            </Button>
          ))}
        </div>
      )}

      {/* danh sách món ăn */}
      {loading && <p>Đang tải dữ liệu...</p>}

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
