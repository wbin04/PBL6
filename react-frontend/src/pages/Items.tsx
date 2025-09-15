import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getImageUrl, type Food, type Category } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Store = {
  id: number;
  name: string;
  address: string;
  image: string;
  phone?: string;
  rating?: number;
  products: Food[];
};

type Food = {
  id: number;
  title: string;
  price: number;
  description?: string;
  availability: string;
  image: string;
  category?: number;
};

const Items: React.FC = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_date');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const storeId = searchParams.get('store');

  useEffect(() => {
    loadCategories();
    if (storeId) {
      loadStoreDetail(storeId);
    }
  }, [storeId]);

  useEffect(() => {
    const categoryId = searchParams.get('category');
    if (categoryId) setSelectedCategory(categoryId);
    loadFoods();
  }, [searchParams, currentPage, selectedCategory, sortBy]);

  const loadCategories = async () => {
    try {
      // Dữ liệu minh họa cứng cho categories
      const mockCategories: Category[] = [
        { id: 1, cate_name: "Cơm", image: "/images/com.jpg" },
        { id: 2, cate_name: "Pizza", image: "/images/pizza.jpg" },
        { id: 3, cate_name: "Gà Rán", image: "/images/fried-chicken.jpg" },
        { id: 4, cate_name: "Burger", image: "/images/burger.jpg" },
        { id: 5, cate_name: "Mỳ Ý", image: "/images/spaghetti.jpg" },
        { id: 6, cate_name: "Canh", image: "/images/soup.jpg" },
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadStoreDetail = async (id: string) => {
    try {
      // Dữ liệu minh họa cứng cho stores
      const mockStores: Store[] = [
        {
          id: 1,
          name: "Tiệm cơm Ngừ",
          address: "461 Nguyễn Lương Bằng, Đà Nẵng",
          phone: "0123456789",
          rating: 3,
          image: "/images/tiem-com-ngu.jpg",
          products: [
            {
              id: 1,
              title: "Cơm gà xối mỡ",
              price: 35000,
              description: "Cơm gà chiên giòn, xối mỡ thơm ngon",
              availability: "Còn hàng",
              image: "/images/com-ga.jpg",
              category: 1,
            },
            {
              id: 2,
              title: "Canh chua cá",
              price: 45000,
              description: "Canh chua cá lóc nấu với cà chua và dứa",
              availability: "Còn hàng",
              image: "/images/canh-chua.jpg",
              category: 6,
            },
          ],
        },
        {
          id: 2,
          name: "Pizza Hut",
          address: "123 Nguyễn Văn Linh, Đà Nẵng",
          phone: "0987654321",
          rating: 5,
          image: "/images/pizza-hut.jpg",
          products: [
            {
              id: 3,
              title: "Pizza Hải Sản",
              price: 120000,
              description: "Pizza với tôm, mực và phô mai",
              availability: "Còn hàng",
              image: "/images/pizza-seafood.jpg",
              category: 2,
            },
            {
              id: 4,
              title: "Pizza Phô Mai",
              price: 99000,
              description: "Pizza ngập phô mai béo ngậy",
              availability: "Còn hàng",
              image: "/images/pizza-cheese.jpg",
              category: 2,
            },
            {
              id: 5,
              title: "Mỳ Ý Bò Bằm",
              price: 85000,
              description: "Mỳ Ý sốt bò bằm đậm đà",
              availability: "Còn hàng",
              image: "/images/spaghetti.jpg",
              category: 5,
            },
          ],
        },
        {
          id: 3,
          name: "Lotteria",
          address: "45 Lê Duẩn, Đà Nẵng",
          phone: "0909090909",
          rating: 4,
          image: "/images/lotteria.jpg",
          products: [
            {
              id: 6,
              title: "Gà Rán Giòn",
              price: 45000,
              description: "Gà rán giòn rụm, vàng ươm",
              availability: "Còn hàng",
              image: "/images/fried-chicken.jpg",
              category: 3,
            },
            {
              id: 7,
              title: "Burger Bò",
              price: 55000,
              description: "Burger bò nướng với rau tươi",
              availability: "Còn hàng",
              image: "/images/burger-beef.jpg",
              category: 4,
            },
          ],
        },
      ];
      const selectedStore = mockStores.find((s) => s.id === parseInt(id));
      setStore(selectedStore || null);
    } catch (error) {
      console.error('Error loading store detail:', error);
    }
  };

  const loadFoods = async () => {
    try {
      setLoading(true);
      // Dữ liệu minh họa cứng cho foods (lấy từ store.products)
      const mockStores: Store[] = [
        {
          id: 1,
          name: "Tiệm cơm Ngừ",
          address: "461 Nguyễn Lương Bằng, Đà Nẵng",
          phone: "0123456789",
          rating: 3,
          image: "/images/tiem-com-ngu.jpg",
          products: [
            {
              id: 1,
              title: "Cơm gà xối mỡ",
              price: 35000,
              description: "Cơm gà chiên giòn, xối mỡ thơm ngon",
              availability: "Còn hàng",
              image: "/images/com-ga.jpg",
              category: 1,
            },
            {
              id: 2,
              title: "Canh chua cá",
              price: 45000,
              description: "Canh chua cá lóc nấu với cà chua và dứa",
              availability: "Còn hàng",
              image: "/images/canh-chua.jpg",
              category: 6,
            },
          ],
        },
        {
          id: 2,
          name: "Pizza Hut",
          address: "123 Nguyễn Văn Linh, Đà Nẵng",
          phone: "0987654321",
          rating: 5,
          image: "/images/pizza-hut.jpg",
          products: [
            {
              id: 3,
              title: "Pizza Hải Sản",
              price: 120000,
              description: "Pizza với tôm, mực và phô mai",
              availability: "Còn hàng",
              image: "/images/pizza-seafood.jpg",
              category: 2,
            },
            {
              id: 4,
              title: "Pizza Phô Mai",
              price: 99000,
              description: "Pizza ngập phô mai béo ngậy",
              availability: "Còn hàng",
              image: "/images/pizza-cheese.jpg",
              category: 2,
            },
            {
              id: 5,
              title: "Mỳ Ý Bò Bằm",
              price: 85000,
              description: "Mỳ Ý sốt bò bằm đậm đà",
              availability: "Còn hàng",
              image: "/images/spaghetti.jpg",
              category: 5,
            },
          ],
        },
        {
          id: 3,
          name: "Lotteria",
          address: "45 Lê Duẩn, Đà Nẵng",
          phone: "0909090909",
          rating: 4,
          image: "/images/lotteria.jpg",
          products: [
            {
              id: 6,
              title: "Gà Rán Giòn",
              price: 45000,
              description: "Gà rán giòn rụm, vàng ươm",
              availability: "Còn hàng",
              image: "/images/fried-chicken.jpg",
              category: 3,
            },
            {
              id: 7,
              title: "Burger Bò",
              price: 55000,
              description: "Burger bò nướng với rau tươi",
              availability: "Còn hàng",
              image: "/images/burger-beef.jpg",
              category: 4,
            },
          ],
        },
      ];

      let filteredFoods: Food[] = [];
      if (storeId) {
        const selectedStore = mockStores.find((s) => s.id === parseInt(storeId));
        filteredFoods = selectedStore ? selectedStore.products : [];
      } else {
        filteredFoods = mockStores.flatMap((s) => s.products);
      }

      // Lọc theo danh mục
      if (selectedCategory) {
        filteredFoods = filteredFoods.filter(
          (food) => food.category === parseInt(selectedCategory)
        );
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchTerm) {
        filteredFoods = filteredFoods.filter((food) =>
          food.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Sắp xếp
      if (sortBy === 'price_asc') {
        filteredFoods.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price_desc') {
        filteredFoods.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'name') {
        filteredFoods.sort((a, b) => a.title.localeCompare(b.title));
      }

      // Phân trang
      const itemsPerPage = 12;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedFoods = filteredFoods.slice(startIndex, startIndex + itemsPerPage);

      setFoods(paginatedFoods);
      setTotalCount(filteredFoods.length);
    } catch (error) {
      console.error('Error loading foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadFoods();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleSearch();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams);
    if (categoryId) params.set('category', categoryId);
    else params.delete('category');
    params.set('page', '1');
    navigate(`/menu/items?${params.toString()}`, { replace: true });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const addToCart = (foodId: number, title: string, price: number) => {
    const cartItem = { food_id: foodId, title, price, quantity: 1 };
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const index = existingCart.findIndex((item: any) => item.food_id === foodId);

    if (index > -1) existingCart[index].quantity += 1;
    else existingCart.push(cartItem);

    localStorage.setItem('cart', JSON.stringify(existingCart));
    alert('Đã thêm vào giỏ hàng!');
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const renderPagination = () => {
    const itemsPerPage = 12;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="flex justify-center gap-2 mt-8">
        {currentPage > 1 && (
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)}>
            Trước
          </Button>
        )}
        {pages}
        {currentPage < totalPages && (
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)}>
            Sau
          </Button>
        )}
      </div>
    );
  };

  const selectedCategoryName = categories.find((cat) => cat.id.toString() === selectedCategory)?.cate_name;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Quay lại */}
      <div className="mb-6">
        <button onClick={() => navigate('/menu')} className="text-primary hover:underline">
          ← Quay lại danh mục
        </button>
      </div>

      {/* Thông tin cửa hàng */}
      {store && (
        <Card className="mb-8 p-4">
          <div className="flex items-center gap-6">
            <img
              src={getImageUrl(store.image)}
              alt={store.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-2xl font-bold">{store.name}</h2>
              <p className="text-gray-600">Địa chỉ: {store.address}</p>
              {store.phone && <p className="text-gray-600">SDT: {store.phone}</p>}
              {store.rating && (
                <p className="text-gray-600">
                  Đánh giá: {store.rating} sao
                  <span className="text-yellow-500 ml-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < Math.floor(store.rating) ? "★" : "☆"}</span>
                    ))}
                  </span>
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tiêu đề */}
      <h2 className="text-2xl font-bold mb-4">
        {selectedCategoryName ? `Món ăn - ${selectedCategoryName}` : 'Danh sách món ăn'}
      </h2>

      {/* Bộ lọc */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tìm kiếm món ăn..."
              className="flex-1 min-w-[200px] rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.cate_name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="created_date">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name">Tên A-Z</option>
            </select>
            <Button onClick={handleSearch}>Tìm kiếm</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danh sách món ăn */}
      {foods.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4">Không tìm thấy món ăn nào</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {foods.map((food) => {
              const isAvailable = food.availability === 'Còn hàng';
              return (
                <Card
                  key={food.id}
                  className="transition-transform hover:scale-105 hover:shadow-lg"
                >
                  <CardContent className="p-4">
                    <img
                      src={getImageUrl(food.image)}
                      alt={food.title}
                      className="w-full h-48 object-cover rounded-md mb-4"
                    />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{food.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {food.description}
                      </p>
                      <div
                        className={`text-sm font-medium ${
                          isAvailable ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {food.availability}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {formatPrice(food.price)}
                      </div>
                      <Button
                        onClick={() => addToCart(food.id, food.title, food.price)}
                        disabled={!isAvailable}
                        className="w-full"
                      >
                        {isAvailable ? 'Thêm vào giỏ' : 'Tạm hết hàng'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default Items;