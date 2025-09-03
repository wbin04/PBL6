import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API, getImageUrl, formatPrice, type Category, type Food } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Menu: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadCategories();
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const categoryId = parseInt(categoryParam);
      setSelectedCategory(categoryId);
      loadFoods(categoryId);
    }
  }, [searchParams]);

  const loadCategories = async () => {
    try {
      const response = await API.get('/menu/categories/');
      setCategories(response.results);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadFoods = async (categoryId?: number) => {
    try {
      setLoading(true);
      const endpoint = categoryId ? `/menu/foods/?category=${categoryId}` : '/menu/foods/';
      const response = await API.get(endpoint);
      setFoods(response.results);
    } catch (error) {
      console.error('Error loading foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (categoryId: number) => {
    setSelectedCategory(categoryId);
    loadFoods(categoryId);
  };

  const addToCart = async (foodId: number) => {
    try {
      await API.post('/cart/add/', {
        food_id: foodId,
        quantity: 1
      });
      alert('Đã thêm vào giỏ hàng!');
    } catch (error) {
      alert('Lỗi khi thêm vào giỏ hàng: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">☆</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">☆</span>);
    }

    return stars;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Thực đơn</h1>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Danh mục</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              className="h-auto p-4"
              onClick={() => {
                setSelectedCategory(null);
                loadFoods();
              }}
            >
              Tất cả
            </Button>
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => selectCategory(category.id)}
              >
                <CardContent className="p-3 text-center">
                  <img
                    src={getImageUrl(category.image)}
                    alt={category.cate_name}
                    className="mx-auto mb-2 h-16 w-full rounded object-cover"
                  />
                  <h3 className="text-sm font-medium">{category.cate_name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Foods */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          {selectedCategory 
            ? categories.find(c => c.id === selectedCategory)?.cate_name || 'Danh mục' 
            : 'Tất cả món ăn'
          }
        </h2>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Đang tải...</div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {foods.map((food) => (
            <Card key={food.id} className="overflow-hidden transition-transform hover:scale-105">
              <img
                src={getImageUrl(food.image)}
                alt={food.name}
                className="h-48 w-full object-cover"
              />
              <CardHeader>
                <CardTitle className="text-lg">{food.name}</CardTitle>
                {food.description && (
                  <p className="text-sm text-muted-foreground">{food.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-lg font-bold text-primary">
                  {formatPrice(food.price)}
                </div>
                
                {food.average_rating > 0 && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex">
                      {renderStars(food.average_rating)}
                    </div>
                    <span>({food.rating_count} đánh giá)</span>
                  </div>
                )}

                <div className="mb-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      food.availability_status
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {food.availability_status ? 'Có sẵn' : 'Hết hàng'}
                  </span>
                </div>

                <Button
                  className="w-full"
                  disabled={!food.availability_status}
                  onClick={() => addToCart(food.id)}
                >
                  {food.availability_status ? 'Thêm vào giỏ' : 'Hết hàng'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && foods.length === 0 && (
        <div className="text-center text-muted-foreground">
          Không có món ăn nào trong danh mục này.
        </div>
      )}
    </div>
  );
};

export default Menu;