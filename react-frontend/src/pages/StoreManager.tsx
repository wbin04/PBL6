import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
import type { Food, Category } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Interface for a food size, based on API docs
interface FoodSize {
  id: number;
  size_name: string;
  price: string;
  food: number;
}

// Interface for a store order, derived from docs
interface StoreOrder {
  id: number;
  user: { fullname: string };
  total_money: string;
  order_status: string;
  payment_method: string;
  created_date: string;
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  note?: string;
  items?: any[];
}

// *** BẮT ĐẦU PHẦN THÊM MỚI ***
// Interface for My Store, based on API docs
interface MyStore {
  id: number;
  store_name: string;
  image: string; // Tên file ảnh gốc
  image_url: string; // URL đầy đủ để hiển thị
  description: string;
  manager: {
    id: number;
    fullname: string;
    email: string;
  };
}
// *** KẾT THÚC PHẦN THÊM MỚI ***


const StoreManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(() => localStorage.getItem('store_manager_active_section') || 'dashboard');

  // Cập nhật state để sử dụng interface MyStore
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

  // Modal State
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [showManageSizesModal, setShowManageSizesModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // *** BẮT ĐẦU PHẦN THÊM MỚI ***
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [editableStoreInfo, setEditableStoreInfo] = useState<MyStore | null>(null);
  // *** KẾT THÚC PHẦN THÊM MỚI ***

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
      // *** BẮT ĐẦU PHẦN THÊM MỚI ***
      case 'my-store':
        // Không cần tải lại vì `storeInfo` đã có sẵn
        break;
      // *** KẾT THÚC PHẦN THÊM MỚI ***
      default:
        loadDashboard();
    }
  }, [activeSection, storeInfo]);

  const checkStoreManagerAccess = () => {
    const user = getUser();
    if (!user || user.role !== 'Chủ cửa hàng') {
      alert('Bạn không có quyền truy cập trang này!');
      navigate('/');
    }
  };

  const changeSection = (section: string) => {
    setFoodPage(1);
    setOrderPage(1);
    setActiveSection(section);
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
      await API.post('/menu/store/foods/', formData, {
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
      const res = await API.get(`/menu/store/foods/${foodId}/`);
      setSelectedFood(res);
      setShowEditFoodModal(true);
    } catch (error) {
      alert('Không thể tải chi tiết món ăn');
      console.error(error);
    }
  };

  // Trong file: StoreManager.tsx

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
      // Bỏ hoàn toàn tham số thứ 3 (options) đi, vì APIClient đã xử lý
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
      await API.delete(`/menu/store/foods/${selectedFood.id}/sizes/${sizeId}/`);
      loadFoodSizes(selectedFood.id); // Refresh the list
    } catch (error) {
      alert('Không thể xóa size');
      console.error(error);
    }
  };

  // *** BẮT ĐẦU PHẦN THÊM MỚI ***
  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editableStoreInfo) return;

    try {
      const payload = {
        store_name: editableStoreInfo.store_name,
        description: editableStoreInfo.description,
        manager: editableStoreInfo.manager.id,
        image: editableStoreInfo.image, // Gửi lại tên file ảnh cũ
      };

      // Dựa theo API tại mục 8.2
      await API.put(`/stores/${editableStoreInfo.id}/`, payload);
      alert('Cập nhật thông tin cửa hàng thành công!');
      setShowEditStoreModal(false);
      loadMyStore(); // Tải lại thông tin mới nhất
    } catch (error) {
      console.error('Error updating store:', error);
      alert(`Lỗi khi cập nhật cửa hàng: ${error}`);
    }
  };
  // *** KẾT THÚC PHẦN THÊM MỚI ***


  // --- Order Functions ---
  const loadOrders = async (page = 1) => {
    if (!storeInfo?.id) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        status: orderStatusFilter,
      }).toString();
      const res = await API.get(`/stores/${storeInfo.id}/orders/?${params}`);
      setOrders(res.results || []);
      setTotalOrderPages(res.num_pages || 1);
      setOrderPage(res.current_page || 1);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetail = async (orderId: number) => {
    try {
      const res = await API.get(`/api/orders/${orderId}/`); // Assuming generic endpoint works
      setSelectedOrder(res);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error loading order detail:', error);
      alert('Không thể tải chi tiết đơn hàng.');
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      await API.patch(`/api/orders/${orderId}/status/`, { order_status: status });
      alert('Cập nhật trạng thái thành công!');
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, order_status: status });
      }
      loadOrders(orderPage);
    } catch (error) {
      alert(`Lỗi: ${error}`);
      console.error('Error updating order status:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('store_manager_active_section');
    navigate('/login');
  };

  const formatCurrency = (amount: number | string) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  const getStatusClass = (status: string) => ({
    'Chờ xác nhận': 'bg-yellow-100 text-yellow-800', 'Đã xác nhận': 'bg-blue-100 text-blue-800',
    'Đang chuẩn bị': 'bg-indigo-100 text-indigo-800', 'Sẵn sàng': 'bg-purple-100 text-purple-800',
    'Đang giao': 'bg-cyan-100 text-cyan-800', 'Đã giao': 'bg-green-100 text-green-800',
    'Đã hủy': 'bg-red-100 text-red-800'
  }[status] || 'bg-gray-100 text-gray-800');

  // *** BẮT ĐẦU PHẦN THÊM MỚI ***
  const sectionTitles: { [key: string]: string } = {
    dashboard: 'Dashboard',
    foods: 'Món ăn',
    orders: 'Đơn hàng',
    'my-store': 'Cửa hàng của tôi'
  };
  // *** KẾT THÚC PHẦN THÊM MỚI ***

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
          <nav className="flex space-x-4">
            {/* Cập nhật thanh điều hướng */}
            {['dashboard', 'foods', 'orders', 'my-store'].map(section => (
              <button key={section}
                className={`px-4 py-2 rounded transition-colors ${activeSection === section ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'}`}
                onClick={() => changeSection(section)}>
                {sectionTitles[section]}
              </button>
            ))}
            <button className="px-4 py-2 text-gray-600 hover:text-red-500" onClick={logout}>Đăng xuất</button>
          </nav>
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

      {/* *** BẮT ĐẦU PHẦN THÊM MỚI *** */}
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
                    src={getImageUrl(storeInfo.image)}
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
      {/* *** KẾT THÚC PHẦN THÊM MỚI *** */}


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
                {['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đã giao', 'Đã hủy'].map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* *** BẮT ĐẦU PHẦN THÊM MỚI *** */}
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
      {/* *** KẾT THÚC PHẦN THÊM MỚI *** */}

    </div>
  );
};

export default StoreManager;