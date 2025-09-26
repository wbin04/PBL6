import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getImageUrl, type Category } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

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
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedCategories();
    loadStores();
  }, []);

  // load categories
  const loadFeaturedCategories = async () => {
    try {
      const response = await API.get("/menu/categories/");
      setCategories(response.results.slice(0, 6));
    } catch (error) {
      console.error("Error loading featured categories:", error);
    }
  };

  // load stores + foods
  const loadStores = async () => {
    try {
      setLoading(true);

      // fetch stores
      let storesResponse = await fetch("http://127.0.0.1:8000/api/stores/", {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (storesResponse.status === 401) {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          storesResponse = await fetch("http://127.0.0.1:8000/api/stores/", {
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
      const limitedStores = storesData.slice(0, 5);

      // fetch foods for each store
      const storesWithFoods: Store[] = await Promise.all(
        limitedStores.map(async (store) => {
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

  // ==== Render ====
  if (loading) {
    return (
      <div className="font-sans">
        <header className="bg-orange-500 text-white px-6 py-3 flex justify-between items-center">
          <div className="flex gap-6">
            <Link to="/" className="font-semibold">
              Trang chủ
            </Link>
            <Link to="/promo">Khuyến mãi</Link>
            <Link to="/contact">Liên hệ</Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="secondary">Giỏ hàng</Button>
            <span className="font-semibold">Người dùng</span>
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
      <header className="bg-orange-500 text-white px-6 py-3 flex justify-between items-center">
        <div className="flex gap-6">
          <Link to="/" className="font-semibold">
            Trang chủ
          </Link>
          <Link to="/promo">Khuyến mãi</Link>
          <Link to="/contact">Liên hệ</Link>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary">Giỏ hàng</Button>
          <span className="font-semibold">Người dùng</span>
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
        <div className="mt-6">
          <input
            type="text"
            placeholder="Tìm cửa hàng/món ăn"
            className="px-4 py-2 rounded-md text-black w-80"
          />
        </div>
      </section>

      {/* Stores */}
      <section className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {stores.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không có cửa hàng nào để hiển thị</p>
            </div>
          ) : (
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
                      <div key={p.id} className="flex items-center gap-3">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = "/images/placeholder.jpg";
                          }}
                        />
                        <div>
                          <p>{p.title}</p>
                          <p>{Number(p.price).toLocaleString()} đ</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="font-bold text-lg mb-4">Món Được Yêu Thích</h2>
          <div className="space-y-4">
            {stores[0]?.products.length > 0 ? (
              stores[0].products.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-12 h-12 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/images/placeholder.jpg";
                    }}
                  />
                  <div>
                    <p>{p.title}</p>
                    <p>{Number(p.price).toLocaleString()} đ</p>
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
      <Footer/>
    </div>
  );
};

export default Home;
