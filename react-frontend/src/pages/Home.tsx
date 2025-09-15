import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Thêm useNavigate
import { API, getImageUrl, type Category } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Định nghĩa type Store
type Store = {
  id: number;
  name: string;
  address: string;
  phone?: string;
  rating: number;
  products: {
    id: number;
    name: string;
    price: number;
    bought: number;
    rating: number;
    image: string;
  }[];
};

const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Khởi tạo navigate

  useEffect(() => {
    loadFeaturedCategories();
    loadStores();
  }, []);

  const loadFeaturedCategories = async () => {
    try {
      setLoading(true);
      const response = await API.get("/menu/categories/");
      setCategories(response.results.slice(0, 6));
    } catch (error) {
      console.error("Error loading featured categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    // Mock dữ liệu (giữ nguyên như mã gốc)
    setStores([
      {
        id: 1,
        name: "Tiệm cơm Ngừ",
        address: "461 Nguyễn Lương Bằng, Đà Nẵng",
        phone: "0123456789",
        rating: 3,
        products: [
          {
            id: 1,
            name: "Cơm gà xối mỡ",
            price: 35000,
            bought: 3242,
            rating: 4,
            image: "/images/com-ga.jpg",
          },
          {
            id: 2,
            name: "Canh chua cá",
            price: 45000,
            bought: 1021,
            rating: 5,
            image: "/images/canh-chua.jpg",
          },
        ],
      },
      {
        id: 2,
        name: "Pizza Hut",
        address: "123 Nguyễn Văn Linh, Đà Nẵng",
        phone: "0987654321",
        rating: 5,
        products: [
          {
            id: 3,
            name: "Pizza Hải Sản",
            price: 120000,
            bought: 2100,
            rating: 5,
            image: "/images/pizza-seafood.jpg",
          },
          {
            id: 4,
            name: "Pizza Phô Mai",
            price: 99000,
            bought: 1560,
            rating: 4,
            image: "/images/pizza-cheese.jpg",
          },
          {
            id: 5,
            name: "Mỳ Ý Bò Bằm",
            price: 85000,
            bought: 980,
            rating: 4,
            image: "/images/spaghetti.jpg",
          },
        ],
      },
      {
        id: 3,
        name: "Lotteria",
        address: "45 Lê Duẩn, Đà Nẵng",
        phone: "0909090909",
        rating: 4,
        products: [
          {
            id: 6,
            name: "Gà Rán Giòn",
            price: 45000,
            bought: 5000,
            rating: 5,
            image: "/images/fried-chicken.jpg",
          },
          {
            id: 7,
            name: "Burger Bò",
            price: 55000,
            bought: 3200,
            rating: 4,
            image: "/images/burger-beef.jpg",
          },
        ],
      },
    ]);
  };

  // Hàm điều hướng khi click vào cửa hàng
  const viewStore = (storeId: number) => {
    navigate(`/menu/items?store=${storeId}`);
  };

  // Hàm điều hướng khi click vào danh mục
  const viewCategory = (categoryId: number) => {
    navigate(`/menu/items?category=${categoryId}`);
  };

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
          <span className="font-semibold">Đình Hải</span>
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
              onClick={() => viewCategory(cate.id)}
            >
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
          {stores.map((store) => (
            <Card key={store.id} className="p-4">
              <h3
                className="font-bold text-lg cursor-pointer hover:text-blue-600"
                onClick={() => viewStore(store.id)} // Thêm sự kiện click
              >
                {store.name}
              </h3>
              <p>{store.address}</p>
              <p>SDT: {store.phone}</p>
              <p>Đánh giá: {store.rating} sao</p>
              <div className="flex gap-6 mt-4 flex-wrap">
                {store.products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p>{p.name}</p>
                      <p>{p.price.toLocaleString()} đ</p>
                      <p>Lượt mua: {p.bought}</p>
                      <p>Đánh giá: {p.rating} sao</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Sidebar: Favorite */}
        <div>
          <h2 className="font-bold text-lg mb-4">Món Được Yêu Thích</h2>
          <div className="space-y-4">
            {stores[0]?.products.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <p>{p.name}</p>
                  <p>{p.price.toLocaleString()} đ</p>
                  <p>Lượt mua: 343/tuần</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-orange-100 py-8 mt-10">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <h3 className="font-bold mb-2">Hỗ trợ khách hàng</h3>
            <p>Hướng dẫn đặt hàng</p>
            <p>Thanh toán và giao hàng</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Liên hệ</h3>
            <p>54 Nguyễn Lương Bằng, Đà Nẵng</p>
            <p>0365096495</p>
            <p>backkhoa069@gmail.com</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Hệ thống cửa hàng</h3>
            <p>54 Nguyễn Lương Bằng, Đà Nẵng</p>
            <p>34 Nam Cao, Đà Nẵng</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Thông tin khuyến mãi</h3>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <Button className="w-full">Đăng ký</Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;