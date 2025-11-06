import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
import type { Food, Category, FoodSize, StoreOrder, MyStore } from '@/types/index-tuan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


interface StorePromotion {
  id: number;
  name: string;
  scope: string;
  discount_type: "PERCENT" | "AMOUNT";
  discount_value: string;
  start_date: string;
  end_date: string;
  minimum_pay: string | null;
  max_discount_amount: string | null;
  store_id: number;
  store: {
    id: number;
    store_name: string;
  };
  is_active: boolean;
  category: string; // 
}



const StoreManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(() => localStorage.getItem('store_manager_active_section') || 'dashboard');

  //Thêm state cho dropdown ***
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [storeInfo, setStoreInfo] = useState<MyStore | null>(null);
  const [stats, setStats] = useState<any>({ total_foods: 0, total_orders: 0, total_revenue: 0, average_rating: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Food Management State
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [newFood, setNewFood] = useState({ title: '', description: '', price: '', category_id: '', availability: 'Còn hàng' });
  const [newFoodImage, setNewFoodImage] = useState<File | null>(null);
  const [editFoodImage, setEditFoodImage] = useState<File | null>(null);
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [foodPage, setFoodPage] = useState(1);
  const [totalFoodPages, setTotalFoodPages] = useState(1);

  // Order Management State
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [totalOrderPages, setTotalOrderPages] = useState(1);

  // *** START: Thêm state cho Khuyến mãi ***
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [showEditPromoModal, setShowEditPromoModal] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    discount_type: 'PERCENT' as 'PERCENT' | 'AMOUNT',
    discount_value: '',
    start_date: '', // Sẽ dùng YYYY-MM-DD
    end_date: '', // Sẽ dùng YYYY-MM-DD
    minimum_pay: '',
    max_discount_amount: '',
    is_active: true,
  });
  const [selectedPromo, setSelectedPromo] = useState<StorePromotion | null>(null);
  // *** END: Thêm state cho Khuyến mãi ***

  // Modal State
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [showManageSizesModal, setShowManageSizesModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [editableStoreInfo, setEditableStoreInfo] = useState<MyStore | null>(null);

  // Food Sizes State
  const [foodSizes, setFoodSizes] = useState<FoodSize[]>([]);
  const [newSize, setNewSize] = useState({ size_name: '', price: '' });

  const addImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);

  // Initial authentication and data loading
  useEffect(() => {
    if (!isAuthenticated()) {
      alert('Vui lòng đăng nhập để tiếp tục');
      navigate('/login');
      return;
    }
    checkStoreManagerAccess();
    loadMyStore();
    loadCategories();
  }, []);

  // Fetch section-specific data when section or storeInfo changes
  useEffect(() => {
    if (!storeInfo) return;
    localStorage.setItem('store_manager_active_section', activeSection);

    switch (activeSection) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'foods':
        loadFoods(1);
        break;
      case 'orders':
        loadOrders(1);
        break;
      case 'promotions':
        loadPromotions();
        break;
      case 'my-store':
        break;
      default:
        loadDashboard();
    }
  }, [activeSection, storeInfo]);

  const checkStoreManagerAccess = () => {
    const user = getUser();
    // Cập nhật check role
    if (!user || (user.role !== 'Cửa hàng' && user.role !== 'Chủ cửa hàng')) {
      alert('Bạn không có quyền truy cập trang này!');
      navigate('/');
    }
  };

  const changeSection = (section: string) => {
    setFoodPage(1);
    setOrderPage(1);
    setActiveSection(section);
    setOpenDropdown(null); // Đóng dropdown khi chọn
  };

  const loadMyStore = async () => {
    try {
      setLoading(true);
      const res = await API.get<MyStore>('/stores/my_store/');
      setStoreInfo(res);
      setEditableStoreInfo(res); // Khởi tạo dữ liệu cho modal sửa
    } catch (error) {
      console.error('Error loading store info:', error);
      alert('Không thể tải thông tin cửa hàng của bạn. Vui lòng đăng nhập lại.');
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!storeInfo?.id) return;
    try {
      setLoading(true);
      const res = await API.get(`/stores/${storeInfo.id}/stats/`);
      setStats(res);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFoods = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        search: foodSearch,
        category: categoryFilter,
      }).toString();
      // API 2.9.1
      const res = await API.get(`/menu/store/foods/?${params}`);
      setFoods(res.results || []);
      setTotalFoodPages(res.num_pages || 1);
      setFoodPage(res.current_page || 1);
    } catch (error) {
      console.error('Error loading foods:', error);
      alert('Không thể tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await API.get('/menu/categories/');
      setCategories(res.results || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newFood.title);
    formData.append('description', newFood.description);
    formData.append('price', newFood.price);
    formData.append('category_id', newFood.category_id);
    formData.append('availability', newFood.availability);
    if (newFoodImage) {
      formData.append('image_file', newFoodImage);
    }

    try {
      // API 10.4
      await API.post('/menu/admin/foods/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Thêm món ăn thành công!');
      setShowAddFoodModal(false);
      setNewFood({ title: '', description: '', price: '', category_id: '', availability: 'Còn hàng' });
      setNewFoodImage(null);
      if (addImageRef.current) addImageRef.current.value = '';
      loadFoods();
    } catch (error) {
      console.error('Error adding food:', error);
      alert(`Lỗi: ${error}`);
    }
  };

  const viewFoodDetail = async (foodId: number) => {
    try {
      // API 2.9.2
      const res = await API.get(`/menu/store/foods/${foodId}/`);
      setSelectedFood(res);
      setShowEditFoodModal(true);
    } catch (error) {
      alert('Không thể tải chi tiết món ăn');
      console.error(error);
    }
  };

  const updateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) return;

    const formData = new FormData();
    formData.append('title', selectedFood.title);
    formData.append('description', selectedFood.description);
    formData.append('price', String(selectedFood.price));
    formData.append('category_id', String(selectedFood.category?.id || ''));
    formData.append('availability', selectedFood.availability);
    if (editFoodImage) {
      formData.append('image_file', editFoodImage);
    }

    try {
      // API 2.9.3
      await API.put(`/menu/store/foods/${selectedFood.id}/`, formData);

      alert('Cập nhật món ăn thành công!');
      setShowEditFoodModal(false);
      setEditFoodImage(null);
      if (editImageRef.current) editImageRef.current.value = '';
      loadFoods(foodPage);
    } catch (error) {
      alert(`Lỗi: ${error}`);
      console.error(error);
    }
  };

  const deleteFood = async (foodId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa món ăn này? Hành động này không thể hoàn tác.')) return;
    try {
      // API 2.9.4
      await API.delete(`/menu/store/foods/${foodId}/`);
      alert('Xóa món ăn thành công!');
      loadFoods(foodPage);
    } catch (error) {
      alert('Không thể xóa món ăn');
      console.error(error);
    }
  };

  // --- Food Size Functions ---
  const openManageSizesModal = async (food: Food) => {
    setSelectedFood(food);
    await loadFoodSizes(food.id);
    setShowManageSizesModal(true);
  };

  const loadFoodSizes = async (foodId: number) => {
    try {
      // API 2.9.5
      const res = await API.get(`/menu/store/foods/${foodId}/sizes/`);
      setFoodSizes(res);
    } catch (error) {
      console.error('Error loading food sizes:', error);
      setFoodSizes([]);
    }
  };

  const handleAddSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !newSize.size_name || !newSize.price) {
      alert('Vui lòng nhập tên và giá cho size.');
      return;
    }
    try {
      // API 2.9.5
      await API.post(`/menu/store/foods/${selectedFood.id}/sizes/`, newSize);
      setNewSize({ size_name: '', price: '' });
      loadFoodSizes(selectedFood.id); // Refresh the list
    } catch (error) {
      alert(`Lỗi khi thêm size: ${error}`);
      console.error(error);
    }
  };

  const deleteSize = async (sizeId: number) => {
    if (!selectedFood || !window.confirm('Bạn có chắc muốn xóa size này?')) return;
    try {
      // API 2.9.5
      await API.delete(`/menu/store/foods/${selectedFood.id}/sizes/${sizeId}/`);
      loadFoodSizes(selectedFood.id); // Refresh the list
    } catch (error) {
      alert('Không thể xóa size');
      console.error(error);
    }
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editableStoreInfo) return;

    try {
      const payload = {
        store_name: editableStoreInfo.store_name,
        description: editableStoreInfo.description,
        manager: editableStoreInfo.manager.id,
        image: editableStoreInfo.image,
      };

      // API 8.2
      await API.put(`/stores/${editableStoreInfo.id}/`, payload);
      alert('Cập nhật thông tin cửa hàng thành công!');
      setShowEditStoreModal(false);
      loadMyStore();
    } catch (error) {
      console.error('Error updating store:', error);
      alert(`Lỗi khi cập nhật cửa hàng: ${error}`);
    }
  };

  // --- Order Functions ---
  const loadOrders = async (page = 1) => {
    if (!storeInfo?.id) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        status: orderStatusFilter,
      }).toString();

      // API 10.2.1
      const res = await API.get(`/stores/${storeInfo.id}/orders/?${params}`);

      setOrders(res || []);

      // Tạm thời fix phân trang vì API 10.2.1 không trả về
      setTotalOrderPages(1);
      setOrderPage(1);

    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetail = async (orderId: number) => {
    try {
      // API 10.1.2 (Dùng chung cho Admin/Manager)
      const res = await API.get(`/orders/admin/${orderId}/`);
      setSelectedOrder(res);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error loading order detail:', error);
      alert('Không thể tải chi tiết đơn hàng.');
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    if (!storeInfo) return;
    try {
      // API 10.2.2
      await API.patch(`/stores/${storeInfo.id}/orders/${orderId}/status/`, { order_status: status });
      alert('Cập nhật trạng thái thành công!');
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, order_status: status });
      }
      setShowOrderModal(false);
      loadOrders(orderPage);
    } catch (error) {
      alert(`Lỗi: ${error}`);
      console.error('Error updating order status:', error);
    }
  };

  // *** START: Thêm hàm CRUD cho Khuyến mãi (Store Manager) ***
  const loadPromotions = async () => {
    setPromoLoading(true);
    try {
      // API doc 6.1
      const res = await API.get<StorePromotion[]>('/promotions/');
      setPromotions(res || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
      alert('Không thể tải danh sách khuyến mãi');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleNewPromoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setNewPromo(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setNewPromo(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API doc 6A.1
      await API.post('/promotions/create/', {
        ...newPromo,
        minimum_pay: newPromo.minimum_pay || null,
        max_discount_amount: newPromo.max_discount_amount || null,
      });
      alert('Thêm khuyến mãi thành công');
      setShowAddPromoModal(false);
      setNewPromo({ // Reset form
        name: '',
        discount_type: 'PERCENT',
        discount_value: '',
        start_date: '',
        end_date: '',
        minimum_pay: '',
        max_discount_amount: '',
        is_active: true,
      });
      loadPromotions(); // Tải lại danh sách
    } catch (error) {
      console.error('Error adding promotion:', error);
      alert(`Lỗi khi thêm khuyến mãi: ${error}`);
    }
  };

  const openEditPromoModal = (promo: StorePromotion) => {
    const formatForDateInput = (dateStr: string) => dateStr ? dateStr.split('T')[0] : '';

    setSelectedPromo({
      ...promo,
      start_date: formatForDateInput(promo.start_date),
      end_date: formatForDateInput(promo.end_date),
      minimum_pay: promo.minimum_pay || '',
      max_discount_amount: promo.max_discount_amount || '',
    });
    setShowEditPromoModal(true);
  };

  const handleEditPromoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!selectedPromo) return;
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setSelectedPromo(prev => ({ ...prev!, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setSelectedPromo(prev => ({ ...prev!, [name]: value }));
    }
  };

  const handleUpdatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromo) return;

    try {
      // API doc 6A.3
      await API.put(`/promotions/${selectedPromo.id}/update/`, {
        name: selectedPromo.name,
        discount_type: selectedPromo.discount_type,
        discount_value: selectedPromo.discount_value,
        start_date: selectedPromo.start_date,
        end_date: selectedPromo.end_date,
        minimum_pay: selectedPromo.minimum_pay || null,
        max_discount_amount: selectedPromo.max_discount_amount || null,
        is_active: selectedPromo.is_active,
      });
      alert('Cập nhật khuyến mãi thành công');
      setShowEditPromoModal(false);
      setSelectedPromo(null);
      loadPromotions(); // Tải lại danh sách
    } catch (error) {
      console.error('Error updating promotion:', error);
      alert(`Lỗi khi cập nhật: ${error}`);
    }
  };

  const deletePromo = async (promoId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa khuyến mãi này?')) return;
    try {
      // API doc 6A.4
      await API.delete(`/promotions/${promoId}/delete/`);
      alert('Xóa khuyến mãi thành công');
      loadPromotions(); // Tải lại danh sách
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert(`Lỗi khi xóa: ${error}`);
    }
  };
  // *** END: Thêm hàm CRUD cho Khuyến mãi (Store Manager) ***

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('store_manager_active_section');
    navigate('/login');
  };

  const formatCurrency = (amount: number | string) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  const formatPromoDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };
  const getStatusClass = (status: string) => ({
    'Chờ xác nhận': 'bg-yellow-100 text-yellow-800', 'Đã xác nhận': 'bg-blue-100 text-blue-800',
    'Đang chuẩn bị': 'bg-indigo-100 text-indigo-800', 'Sẵn sàng': 'bg-purple-100 text-purple-800',
    'Đang giao': 'bg-cyan-100 text-cyan-800', 'Đã giao': 'bg-green-100 text-green-800',
    'Đã hủy': 'bg-red-100 text-red-800'
  }[status] || 'bg-gray-100 text-gray-800');

  const isManagementActive = ['foods', 'orders', 'promotions'].includes(activeSection);
  // *** END: Cập nhật Titles và Dropdown Check ***


  if (loading && !storeInfo) {
    return <div className="text-center p-10">Đang tải thông tin cửa hàng...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg mb-6 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏪 Quản lý cửa hàng</h1>
            <p className="text-gray-600">{storeInfo?.store_name}</p>
          </div>
          {/* *** START: Cập nhật thanh điều hướng (NAV) *** */}
          <nav className="flex space-x-4">
            <button
              className={`px-4 py-2 rounded transition-colors ${activeSection === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => changeSection('dashboard')}>
              Dashboard
            </button>

            {/* Dropdown Quản lý */}
            <div className="relative">
              <button
                className={`px-4 py-2 rounded transition-colors flex items-center gap-1 ${isManagementActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-blue-500'
                  }`}
                onClick={() => setOpenDropdown(openDropdown === 'management' ? null : 'management')}
              >
                Quản lý
                <span className={`text-xs transition-transform ${openDropdown === 'management' ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {openDropdown === 'management' && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => changeSection('foods')}
                  >
                    Món ăn
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => changeSection('orders')}
                  >
                    Đơn hàng
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => changeSection('promotions')}
                  >
                    Khuyến mãi
                  </button>
                </div>
              )}
            </div>

            <button
              className={`px-4 py-2 rounded transition-colors ${activeSection === 'my-store' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => changeSection('my-store')}>
              Cửa hàng
            </button>

            <button
              className="px-4 py-2 text-gray-600 hover:text-green-600 transition-colors"
              onClick={() => navigate('/')}
            >
              Trang Khách Hàng
            </button>

            <button className="px-4 py-2 text-gray-600 hover:text-red-500" onClick={logout}>Đăng xuất</button>
          </nav>
          {/* *** END: Cập nhật thanh điều hướng (NAV) *** */}
        </div>
      </div>

      {/* Dashboard Section */}
      {activeSection === 'dashboard' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Thống kê cửa hàng</h2>
          {loading ? <p>Đang tải...</p> : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card><CardHeader><CardTitle>Tổng Doanh thu</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.total_revenue || 0)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Tổng Đơn hàng</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total_orders || 0}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Tổng Món ăn</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total_foods || 0}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Đánh giá TB</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{Number(stats.average_rating || 0).toFixed(1)} ⭐</div></CardContent></Card>
            </div>
          )}
        </div>
      )}

      {/* Foods Section */}
      {activeSection === 'foods' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý món ăn</h2>
            <Button onClick={() => setShowAddFoodModal(true)}>+ Thêm món</Button>
          </div>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={foodSearch}
              onChange={e => setFoodSearch(e.target.value)}
              className="border p-2 rounded" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border p-2 rounded">
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
            </select>
            <Button onClick={() => loadFoods(1)}>Lọc</Button>
          </div>
          {/* Food Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  {['ID', 'Ảnh', 'Tên món', 'Giá', 'Trạng thái', 'Thao tác', 'Sửa', 'Xóa'].map(h =>
                    <th key={h} className="p-3 text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} className="p-4 text-center">Đang tải...</td></tr> :
                    foods.map(food => (
                      <tr key={food.id} className="border-b">
                        <td className="px-4 py-4">{food.id}</td>
                        <td className="px-4 py-4"><img src={getImageUrl(food.image_url)} alt={food.title} className="w-12 h-12 object-cover rounded" /></td>
                        <td className="px-4 py-4 font-medium">{food.title}</td>
                        <td className="px-4 py-4">{formatCurrency(food.price)}</td>
                        <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${food.availability === 'Còn hàng' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{food.availability}</span></td>
                        <td className="px-4 py-4">
                          <Button size="sm" onClick={() => openManageSizesModal(food)}>Sizes</Button>
                        </td>
                        <td className="px-4 py-4">
                          <Button size="sm" variant="outline" onClick={() => viewFoodDetail(food.id)}>Sửa</Button>
                        </td>
                        <td className="px-4 py-4">
                          <Button size="sm" variant="destructive" onClick={() => deleteFood(food.id)}>Xóa</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {/* Pagination */}
          <div className="flex justify-end items-center mt-4 gap-2">
            <Button onClick={() => loadFoods(foodPage - 1)} disabled={foodPage <= 1}>Trước</Button>
            <span>Trang {foodPage}/{totalFoodPages}</span>
            <Button onClick={() => loadFoods(foodPage + 1)} disabled={foodPage >= totalFoodPages}>Sau</Button>
          </div>
        </div>
      )}

      {/* Orders Section */}
      {activeSection === 'orders' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Quản lý đơn hàng</h2>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} className="border p-2 rounded">
              <option value="">Tất cả trạng thái</option>
              {['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đang giao', 'Đã giao', 'Đã hủy'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button onClick={() => loadOrders(1)}>Lọc</Button>
          </div>
          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  {['ID', 'Khách hàng', 'Tổng tiền', 'Trạng thái', 'Ngày đặt', 'Thao tác'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} className="p-4 text-center">Đang tải...</td></tr> :
                    orders.map(order => (
                      <tr key={order.id} className="border-b">
                        <td className="p-3 font-bold">#{order.id}</td>
                        <td className="p-3">{order.receiver_name}</td>
                        <td className="p-3">{formatCurrency(order.total_money)}</td>
                        <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(order.order_status)}`}>{order.order_status}</span></td>
                        <td className="p-3">{formatDate(order.created_date)}</td>
                        <td className="p-3"><Button size="sm" onClick={() => viewOrderDetail(order.id)}>Xem</Button></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </CardContent>
          </Card>
          {/* Pagination */}
          <div className="flex justify-end items-center mt-4 gap-2">
            <Button onClick={() => loadOrders(orderPage - 1)} disabled={orderPage <= 1}>Trước</Button>
            <span>Trang {orderPage}/{totalOrderPages}</span>
            <Button onClick={() => loadOrders(orderPage + 1)} disabled={orderPage >= totalOrderPages}>Sau</Button>
          </div>
        </div>
      )}

      {/* *** START: Thêm mục Khuyến mãi (Store) *** */}
      {activeSection === 'promotions' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý Khuyến mãi (Cửa hàng)</h2>
            <Button onClick={() => setShowAddPromoModal(true)}>+ Thêm khuyến mãi</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá trị</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày BĐ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày KT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {promotions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          {promoLoading ? 'Đang tải...' : 'Không có khuyến mãi nào'}
                        </td>
                      </tr>
                    ) : (
                      promotions.map(promo => (
                        <tr key={promo.id}>
                          <td className="px-4 py-4 text-sm">{promo.id}</td>
                          <td className="px-4 py-4 text-sm font-medium">{promo.name}</td>
                          <td className="px-4 py-4 text-sm">
                            {promo.discount_type === 'PERCENT' ? 'Phần trăm' : 'Số tiền'}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {promo.discount_type === 'PERCENT'
                              ? `${promo.discount_value}%`
                              : formatCurrency(promo.discount_value)}
                          </td>
                          <td className="px-4 py-4 text-sm">{formatPromoDate(promo.start_date)}</td>
                          <td className="px-4 py-4 text-sm">{formatPromoDate(promo.end_date)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${promo.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                              {promo.is_active ? 'Hoạt động' : 'Tạm dừng'}
                            </span>
                          </td>
                          <td className="px-4 py-4 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditPromoModal(promo)}>✏️ Sửa</Button>
                            <Button size="sm" variant="destructive" onClick={() => deletePromo(promo.id)}>🗑️ Xóa</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* *** END: Thêm mục Khuyến mãi (Store) *** */}

      {/* My Store Section */}
      {activeSection === 'my-store' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Thông tin cửa hàng của tôi</h2>
            <Button onClick={() => setShowEditStoreModal(true)}>Chỉnh sửa thông tin</Button>
          </div>
          {storeInfo ? (
            <Card>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <img
                    src={getImageUrl(storeInfo.image_url)} // Sử dụng image_url
                    alt={storeInfo.store_name}
                    className="w-full h-auto object-cover rounded-lg shadow-lg"
                  />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500">Tên cửa hàng</label>
                    <p className="text-2xl font-bold text-gray-800">{storeInfo.store_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500">Mô tả</label>
                    <p className="text-gray-700 whitespace-pre-line">{storeInfo.description}</p>
                  </div>
                  <div className="border-t pt-4">
                    <label className="text-sm font-semibold text-gray-500">Thông tin quản lý</label>
                    <p className="text-gray-700"><strong>Họ tên:</strong> {storeInfo.manager.fullname}</p>
                    <p className="text-gray-700"><strong>Email:</strong> {storeInfo.manager.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p>Đang tải thông tin...</p>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      {/* Add Food Modal */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Thêm món ăn mới</h2>
            <form onSubmit={handleAddFood} className="space-y-4">
              <input required placeholder="Tên món ăn" value={newFood.title} onChange={e => setNewFood({ ...newFood, title: e.target.value })} className="w-full p-2 border rounded" />
              <textarea required placeholder="Mô tả" value={newFood.description} onChange={e => setNewFood({ ...newFood, description: e.target.value })} className="w-full p-2 border rounded" />
              <input required type="number" placeholder="Giá" value={newFood.price} onChange={e => setNewFood({ ...newFood, price: e.target.value })} className="w-full p-2 border rounded" />
              <select required value={newFood.category_id} onChange={e => setNewFood({ ...newFood, category_id: e.target.value })} className="w-full p-2 border rounded">
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
              </select>
              <select value={newFood.availability} onChange={e => setNewFood({ ...newFood, availability: e.target.value })} className="w-full p-2 border rounded">
                <option value="Còn hàng">Còn hàng</option>
                <option value="Hết hàng">Hết hàng</option>
              </select>
              <div><label className="text-sm">Ảnh món ăn</label><input type="file" ref={addImageRef} onChange={e => setNewFoodImage(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddFoodModal(false)}>Hủy</Button>
                <Button type="submit">Thêm</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {showEditFoodModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa món ăn</h2>
            <form onSubmit={updateFood} className="space-y-4">
              <input required value={selectedFood.title} onChange={e => setSelectedFood({ ...selectedFood, title: e.target.value })} className="w-full p-2 border rounded" />
              <textarea required value={selectedFood.description} onChange={e => setSelectedFood({ ...selectedFood, description: e.target.value })} className="w-full p-2 border rounded" />
              <input required type="number" value={selectedFood.price} onChange={e => setSelectedFood({ ...selectedFood, price: Number(e.target.value) })} className="w-full p-2 border rounded" />
              <select required value={selectedFood.category?.id} onChange={e => setSelectedFood({ ...selectedFood, category: { id: Number(e.target.value), cate_name: '' } })} className="w-full p-2 border rounded">
                {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
              </select>
              <select value={selectedFood.availability} onChange={e => setSelectedFood({ ...selectedFood, availability: e.target.value })} className="w-full p-2 border rounded">
                <option value="Còn hàng">Còn hàng</option>
                <option value="Hết hàng">Hết hàng</option>
              </select>
              <div><label className="text-sm">Thay đổi ảnh (tùy chọn)</label><input type="file" ref={editImageRef} onChange={e => setEditFoodImage(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditFoodModal(false)}>Hủy</Button>
                <Button type="submit">Lưu thay đổi</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Sizes Modal */}
      {showManageSizesModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Quản lý Sizes cho "{selectedFood.title}"</h2>
            {/* Add Size Form */}
            <form onSubmit={handleAddSize} className="flex gap-2 mb-4">
              <input required value={newSize.size_name} onChange={e => setNewSize({ ...newSize, size_name: e.target.value })} placeholder="Tên size (e.g, Lớn)" className="w-full p-2 border rounded" />
              <input required type="number" value={newSize.price} onChange={e => setNewSize({ ...newSize, price: e.target.value })} placeholder="Giá thêm" className="w-full p-2 border rounded" />
              <Button type="submit">Thêm</Button>
            </form>
            {/* Sizes List */}
            <div className="max-h-60 overflow-y-auto">
              {foodSizes.length > 0 ? foodSizes.map(size => (
                <div key={size.id} className="flex justify-between items-center p-2 border-b">
                  <span>{size.size_name} (+{formatCurrency(size.price)})</span>
                  <Button variant="destructive" size="sm" onClick={() => deleteSize(size.id)}>Xóa</Button>
                </div>
              )) : <p className="text-gray-500">Chưa có size nào.</p>}
            </div>
            <div className="flex justify-end pt-4"><Button variant="outline" onClick={() => setShowManageSizesModal(false)}>Đóng</Button></div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Chi tiết đơn hàng #{selectedOrder.id}</h2>
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><strong>Người nhận:</strong> {selectedOrder.receiver_name}</div>
              <div><strong>SĐT:</strong> {selectedOrder.phone_number}</div>
              <div className="col-span-2"><strong>Địa chỉ:</strong> {selectedOrder.ship_address}</div>
              <div><strong>Tổng tiền:</strong> {formatCurrency(selectedOrder.total_money)}</div>
              <div><strong>Ngày đặt:</strong> {formatDate(selectedOrder.created_date)}</div>
              <div className="col-span-2"><strong>Ghi chú:</strong> {selectedOrder.note || 'Không có'}</div>
            </div>
            {/* Status Update */}
            <div className="flex items-center gap-2 mb-4">
              <select id="status-update-select" defaultValue={selectedOrder.order_status} className="border p-2 rounded">
                {/* Store Manager chỉ có thể chuyển đổi các trạng thái này */}
                <option value="Chờ xác nhận">Chờ xác nhận</option>
                <option value="Đã xác nhận">Đã xác nhận</option>
                <option value="Đang chuẩn bị">Đang chuẩn bị</option>
                <option value="Sẵn sàng">Sẵn sàng (Chờ giao)</option>
                <option value="Đã hủy">Đã hủy</option>
              </select>
              <Button onClick={() => {
                const newStatus = (document.getElementById('status-update-select') as HTMLSelectElement).value;
                updateOrderStatus(selectedOrder.id, newStatus);
              }}>Cập nhật</Button>
            </div>
            {/* Items */}
            {/* Add item rendering logic here if needed */}
            <div className="flex justify-end pt-4"><Button variant="outline" onClick={() => setShowOrderModal(false)}>Đóng</Button></div>
          </div>
        </div>
      )}


      {/* Edit Store Modal */}
      {showEditStoreModal && editableStoreInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa thông tin cửa hàng</h2>
            <form onSubmit={handleUpdateStore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên cửa hàng</label>
                <input
                  required
                  value={editableStoreInfo.store_name}
                  onChange={e => setEditableStoreInfo({ ...editableStoreInfo, store_name: e.target.value })}
                  className="w-full p-2 mt-1 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  required
                  rows={5}
                  value={editableStoreInfo.description}
                  onChange={e => setEditableStoreInfo({ ...editableStoreInfo, description: e.target.value })}
                  className="w-full p-2 mt-1 border rounded"
                />
              </div>
              <p className="text-xs text-gray-500">Lưu ý: Bạn không thể thay đổi ảnh đại diện hay người quản lý tại đây.</p>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditStoreModal(false)}>Hủy</Button>
                <Button type="submit">Lưu thay đổi</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* *** START: Thêm Modals cho Khuyến mãi (Store) *** */}
      {/* Add Promotion Modal */}
      {showAddPromoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddPromo} className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Thêm Khuyến mãi Cửa hàng</h2>

            <div>
              <label className="block text-sm font-medium">Tên khuyến mãi</label>
              <input required name="name" value={newPromo.name} onChange={handleNewPromoChange} className="w-full p-2 border rounded" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Loại giảm giá</label>
                <select required name="discount_type" value={newPromo.discount_type} onChange={handleNewPromoChange} className="w-full p-2 border rounded">
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="AMOUNT">Số tiền (VND)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Giá trị giảm</label>
                <input required type="number" name="discount_value" value={newPromo.discount_value} onChange={handleNewPromoChange} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Ngày bắt đầu</label>
                <input required type="date" name="start_date" value={newPromo.start_date} onChange={handleNewPromoChange} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium">Ngày kết thúc</label>
                <input required type="date" name="end_date" value={newPromo.end_date} onChange={handleNewPromoChange} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Giá trị đơn tối thiểu (VND)</label>
                <input type="number" name="minimum_pay" value={newPromo.minimum_pay} onChange={handleNewPromoChange} className="w-full p-2 border rounded" placeholder="Bỏ trống nếu không áp dụng" />
              </div>
              <div>
                <label className="block text-sm font-medium">Giảm tối đa (VND)</label>
                <input type="number" name="max_discount_amount" value={newPromo.max_discount_amount} onChange={handleNewPromoChange} className="w-full p-2 border rounded" placeholder="Chỉ áp dụng cho loại %" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_active" checked={newPromo.is_active} onChange={handleNewPromoChange} id="is_active_add" className="h-4 w-4" />
              <label htmlFor="is_active_add" className="text-sm font-medium">Kích hoạt</label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddPromoModal(false)}>Hủy</Button>
              <Button type="submit">Thêm</Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Promotion Modal */}
      {showEditPromoModal && selectedPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdatePromo} className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Sửa Khuyến mãi Cửa hàng</h2>

            <div>
              <label className="block text-sm font-medium">Tên khuyến mãi</label>
              <input required name="name" value={selectedPromo.name} onChange={handleEditPromoChange} className="w-full p-2 border rounded" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Loại giảm giá</label>
                <select required name="discount_type" value={selectedPromo.discount_type} onChange={handleEditPromoChange} className="w-full p-2 border rounded">
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="AMOUNT">Số tiền (VND)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Giá trị giảm</label>
                <input required type="number" name="discount_value" value={selectedPromo.discount_value} onChange={handleEditPromoChange} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Ngày bắt đầu</label>
                <input required type="date" name="start_date" value={selectedPromo.start_date} onChange={handleEditPromoChange} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium">Ngày kết thúc</label>
                <input required type="date" name="end_date" value={selectedPromo.end_date} onChange={handleEditPromoChange} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Giá trị đơn tối thiểu (VND)</label>
                <input type="number" name="minimum_pay" value={selectedPromo.minimum_pay || ''} onChange={handleEditPromoChange} className="w-full p-2 border rounded" placeholder="Bỏ trống nếu không áp dụng" />
              </div>
              <div>
                <label className="block text-sm font-medium">Giảm tối đa (VND)</label>
                <input type="number" name="max_discount_amount" value={selectedPromo.max_discount_amount || ''} onChange={handleEditPromoChange} className="w-full p-2 border rounded" placeholder="Chỉ áp dụng cho loại %" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_active" checked={selectedPromo.is_active} onChange={handleEditPromoChange} id="is_active_edit" className="h-4 w-4" />
              <label htmlFor="is_active_edit" className="text-sm font-medium">Kích hoạt</label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditPromoModal(false)}>Hủy</Button>
              <Button type="submit">Lưu thay đổi</Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default StoreManager;