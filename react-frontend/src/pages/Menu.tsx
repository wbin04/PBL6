import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API, getImageUrl, type Category } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export default function Menu() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();

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
      setCategories(res);
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
      setFoods(res.results || res);
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
      setFoods(foodsRes.results || foodsRes);
    } catch (error) {
      console.error("Error loading store:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (foodId: number, title: string, price: string) => {
    const cartItem = { food_id: foodId, title, price: Number(price), quantity: 1 };
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const index = existingCart.findIndex((item: { food_id: number }) => item.food_id === foodId);

    if (index > -1) {
      existingCart[index].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));
    alert('Đã thêm vào giỏ hàng!');
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
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{food.title}</h3>
                {food.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {food.description}
                  </p>
                )}
                <div className="text-lg font-bold text-primary">
                  {Number(food.price).toLocaleString()} đ
                </div>
                <Button className="w-full" onClick={() => addToCart(food.id, food.title, food.price)}>
                  Thêm vào giỏ
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
