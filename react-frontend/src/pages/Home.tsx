import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API, getImageUrl, type Category } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedCategories();
  }, []);

  const loadFeaturedCategories = async () => {
    try {
      setLoading(true);
      const response = await API.get('/menu/categories/');
      setCategories(response.results.slice(0, 6));
    } catch (error) {
      console.error('Error loading featured categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewCategory = (categoryId: number) => {
    window.location.href = `/menu/items?category=${categoryId}`;
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-red-600 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Chào mừng đến FastFood</h1>
          <p className="mb-8 text-xl">Đặt món ăn ngon, giao hàng nhanh chóng!</p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/menu">Xem thực đơn</Link>
          </Button>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-3xl font-bold">Danh mục phổ biến</h2>
          
          {loading ? (
            <div className="text-center text-muted-foreground">Đang tải...</div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Card 
                  key={category.id} 
                  className="cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
                  onClick={() => viewCategory(category.id)}
                >
                  <CardContent className="p-4 text-center">
                    <img
                      src={getImageUrl(category.image)}
                      alt={category.cate_name}
                      className="mx-auto mb-3 h-32 w-full rounded-md object-cover"
                    />
                    <h3 className="text-lg font-semibold">{category.cate_name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;