import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API, getImageUrl, type Food, type Category } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Items: React.FC = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_date');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const categoryId = searchParams.get('category');
    if (categoryId && categoryId !== selectedCategory) {
      setSelectedCategory(categoryId);
    }
    loadFoods();
  }, [searchParams, currentPage, sortBy, searchTerm]);

  const loadCategories = async () => {
    try {
      const response = await API.get('/menu/categories/');
      setCategories(response.results || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadFoods = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy) params.append('sort', sortBy);
      params.append('page', currentPage.toString());

      const response = await API.get(`/menu/items/?${params.toString()}`);
      setFoods(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Error loading foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    
    const params = new URLSearchParams(searchParams);
    if (categoryId) {
      params.set('category', categoryId);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    navigate(`/menu/items?${params.toString()}`, { replace: true });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const addToCart = (foodId: number, title: string, price: number) => {
    const cartItem = {
      food_id: foodId,
      title,
      price,
      quantity: 1
    };
    
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItemIndex = existingCart.findIndex((item: any) => item.food_id === foodId);
    
    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(existingCart));
    alert('Đã thêm vào giỏ hàng!');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Trước
          </Button>
        )}
        {pages}
        {currentPage < totalPages && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Sau
          </Button>
        )}
      </div>
    );
  };

  const selectedCategoryName = categories.find(cat => cat.id.toString() === selectedCategory)?.cate_name;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <button onClick={() => navigate('/menu')} className="text-primary hover:underline">
            ← Quay lại danh mục
          </button>
          <h2 className="text-2xl font-bold mt-2">Món ăn</h2>
        </div>
        <div className="text-center text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button onClick={() => navigate('/menu')} className="text-primary hover:underline">
          ← Quay lại danh mục
        </button>
        <h2 className="text-2xl font-bold mt-2">
          {selectedCategoryName ? `Món ăn - ${selectedCategoryName}` : 'Món ăn'}
        </h2>
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tìm kiếm món ăn..."
              className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="created_date">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name">Tên A-Z</option>
            </select>
            
            <Button onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Foods Grid */}
      {foods.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Không tìm thấy món ăn nào</h3>
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
                  className={`transition-transform hover:scale-105 hover:shadow-lg ${!isAvailable ? 'opacity-75' : ''}`}
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
                      
                      {food.average_rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <span key={i}>
                                {i < Math.floor(food.average_rating || 0) ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="text-muted-foreground">
                            ({food.rating_count || 0} đánh giá)
                          </span>
                        </div>
                      )}
                      
                      <div className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
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