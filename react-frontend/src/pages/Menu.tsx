import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API, getImageUrl, type Category } from "@/lib/api";
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
  // Nếu API có thêm rating hoặc availability thì khai báo ở đây:
  average_rating?: number;
  rating_count?: number;
  availability_status?: boolean;
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
  const addToCart = async (foodId: number, quantity: number, note?: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
        navigate("/login");
        return;
      }

      let response = await fetch("http://127.0.0.1:8000/api/cart/add/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          food_id: foodId,
          quantity: quantity,
          item_note: note,
        }),
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
            body: JSON.stringify({
              food_id: foodId,
              quantity: quantity,
              item_note: note,
            }),
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
              <div className="space-y-2">
                <h3
                  className="text-lg font-semibold cursor-pointer hover:text-orange-500"
                  onClick={() => openFoodModal(food)}>
                  {food.title}
                </h3>
                {food.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {food.description}
                  </p>
                )}
                <div className="text-lg font-bold text-primary">
                  {Number(food.price).toLocaleString()} đ
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
