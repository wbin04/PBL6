import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, type Category } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await API.get('/menu/categories/');
      setCategories(response.results || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewCategory = (categoryId: number) => {
    navigate(`/menu/items?category=${categoryId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Danh mục thực đơn</h2>
        <div className="text-center text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Danh mục thực đơn</h2>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Chưa có danh mục nào</h3>
          <p className="text-gray-600">Vui lòng thêm danh mục trong Admin panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Danh mục thực đơn</h2>
      
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <h3 className="text-lg font-semibold mb-1">{category.cate_name}</h3>
              <p className="text-sm text-muted-foreground">
                {(category as any).foods_count || 0} món ăn
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Categories;