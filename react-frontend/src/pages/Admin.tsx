//$env:DB_PASSWORD="123456"
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
import type { Store, Food, Category, Customer, AdminOrder } from '@/types/index-tuan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueReportData {
  period: string;
  start_date: string;
  end_date: string;
  total_revenue: string;
  total_orders: number;
  data: Array<{
    date: string;
    revenue: string;
    orders: number;
  }>;
}

// Interface cho báo cáo món ăn bán chạy
interface PopularFoodItem {
  food_id: number;
  food_name: string;
  category: string;
  store_name: string;
  total_quantity: number;
  total_revenue: string;
  order_count: number;
}

interface PopularFoodsReport {
  period: string;
  foods: PopularFoodItem[];
}

const Admin: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(() => {
    return localStorage.getItem('admin_active_section') || 'dashboard';
  });
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalFoods: 0,
    totalOrders: 0,
    totalStores: 0
  });
  const [loading, setLoading] = useState(false);
  //Khách hàng
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  //Cửa hàng
  const [stores, setStores] = useState<Store[]>([]);
  const [newStore, setNewStore] = useState({
    store_name: '',
    image: '',
    description: '',
    manager: '',
  });
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);

  //Món ăn
  const [foods, setFoods] = useState<Food[]>([]);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [newFood, setNewFood] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    store_id: '',
    availability: 'Còn hàng',
  });
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodPage, setFoodPage] = useState(1);
  const [totalFoodPages, setTotalFoodPages] = useState(1);
  const [totalFoods, setTotalFoods] = useState(0);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  //Đơn hàng
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [totalOrderPages, setTotalOrderPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // State cho báo cáo doanh thu
  const [reportData, setReportData] = useState<RevenueReportData | null>(null);
  const [reportFilters, setReportFilters] = useState({
    start_date: '',
    end_date: '',
    period: 'daily',
    store_id: '',
  });
  const [reportLoading, setReportLoading] = useState(false);


  // State cho báo cáo món ăn bán chạy
  const [popularFoodsData, setPopularFoodsData] = useState<PopularFoodsReport | null>(null);
  const [popularFoodsFilters, setPopularFoodsFilters] = useState({
    start_date: '',
    end_date: '',
    limit: '10', // Mặc định là 10 theo API doc
  });
  const [popularFoodsLoading, setPopularFoodsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      alert('Vui lòng đăng nhập để tiếp tục');
      navigate('/login');
      return;
    }

    checkAdminAccess();
  }, []);

  useEffect(() => {
    // backup persist (nếu có trường hợp setActiveSection mà không gọi changeSection)
    try { localStorage.setItem('admin_active_section', activeSection); } catch { }

    switch (activeSection) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'customers':
        loadCustomers(1, '');
        break;
      case 'foods':
        loadCategories();
        loadFoods(1);
        if (stores.length === 0) {
          loadStores();
        }
        break;
      case 'orders':
        loadOrders(1);
        break;
      case 'stores':
        loadStores();
        break;
      case 'revenueReport':
        // Tải danh sách cửa hàng nếu chưa có để dùng cho bộ lọc
        if (stores.length === 0) {
          loadStores();
        }
        break;
      case 'popularFoodsReport':
        // Không cần tải gì trước khi người dùng nhấn nút
        break;
      default:
        loadDashboard();
    }
  }, [activeSection]);


  const checkAdminAccess = async () => {
    try {
      const user = getUser();
      if (!user || user.role !== 'Quản lý') {
        alert('Bạn không có quyền truy cập trang admin!');
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      navigate('/login');
    }
  };

  const changeSection = (section: string) => {
    setActiveSection(section);
    
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Load basic stats (simplified)
      const [customersRes, foodsRes, ordersRes, storesRes] = await Promise.all([
        API.get('/auth/admin/customers/?page=1').catch(() => ({ customers: [], total_customers: 0 })),
        API.get('/menu/admin/foods/?page=1').catch(() => ({ foods: [], total_foods: 0 })),
        API.get('/orders/admin/?page=1').catch(() => ({ orders: [], total_orders: 0 })),
        API.get('/stores/').catch(() => ({ results: [] }))
      ]);

      setStats({
        totalCustomers: customersRes.total_customers || 0,
        totalFoods: foodsRes.total_foods || 0,
        totalOrders: ordersRes.total_orders || 0,
        totalStores: (storesRes.results?.length || 0)
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  //load Cửa hàng
  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await API.get('/stores/');
      setStores(res.results || []); // vì chắc chắn backend trả { results: [...] }
    } catch (error) {
      console.error('Error loading stores:', error);
      alert('Không thể tải danh sách cửa hàng');
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  // Thêm cửa hàng
  const handleAddStore = async () => {
    try {
      await API.post('/stores/', newStore);
      alert('Thêm cửa hàng thành công');
      setShowAddStoreModal(false);
      setNewStore({ store_name: '', image: '', description: '', manager: '' });
      loadStores();
    } catch (error) {
      console.error('Error adding store:', error);
      alert('Không thể thêm cửa hàng');
    }
  };

  // Xem chi tiết cửa hàng
  const viewStoreDetail = async (id: number) => {
    try {
      const response = await API.get(`/stores/${id}/`);
      setSelectedStore(response);
      setShowEditStoreModal(true);
    } catch (error) {
      console.error('Error loading store detail:', error);
      alert('Không thể tải thông tin cửa hàng');
    }
  };

  // Cập nhật cửa hàng
  const updateStore = async () => {
    if (!selectedStore) return;
    try {
      await API.put(`/stores/${selectedStore.id}/`, {
        store_name: selectedStore.store_name,
        image: selectedStore.image,
        description: selectedStore.description,
        manager: selectedStore.manager,
      });
      alert('Cập nhật cửa hàng thành công');
      setShowEditStoreModal(false);
      loadStores();
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Không thể cập nhật cửa hàng');
    }
  };

  // Xóa cửa hàng
  const deleteStore = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa cửa hàng này?')) return;
    try {
      await API.delete(`/stores/${id}/`);
      alert('Xóa cửa hàng thành công');
      loadStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Không thể xóa cửa hàng');
    }
  };


  // ==== Hàm load customers (có phân trang & tìm kiếm) ====
  const loadCustomers = async (page = 1, searchQuery = '') => {
    try {
      setLoading(true);
      const response = await API.get(
        `/auth/admin/customers/?page=${page}&search=${searchQuery}`
      );
      setCustomers(response.customers || []);
      setTotalPages(response.total_pages || 1);
      setCurrentPage(response.current_page || 1);
      setTotalCustomers(response.total_customers || 0);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  // ==== Hàm xem chi tiết ====
  const viewCustomerDetail = async (id: number) => {
    try {
      const response = await API.get(`/auth/admin/customers/${id}/`);
      setSelectedCustomer(response);
      setShowCustomerModal(true);
    } catch (error) {
      console.error('Error loading customer detail:', error);
      alert('Không thể tải thông tin khách hàng');
    }
  };

  // ==== Hàm cập nhật khách hàng ====
  const updateCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      await API.put(`/auth/admin/customers/${selectedCustomer.id}/`, {
        fullname: selectedCustomer.fullname,
        phone_number: selectedCustomer.phone_number,
        address: selectedCustomer.address,
      });
      alert('Cập nhật thành công');
      setShowCustomerModal(false);
      loadCustomers(currentPage, search);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Không thể cập nhật thông tin khách hàng');
    }
  };
  // ==== Load categories cho filter & thêm món ăn ====
  const loadCategories = async () => {
    try {
      const res = await API.get('/menu/categories/');
      setCategories(res.results || []); // backend trả {results: [...]}
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  // ==== Hàm load món ăn (có phân trang & tìm kiếm & lọc) ====
  const loadFoods = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(
        `/menu/admin/foods/?page=${page}&search=${foodSearch}&category=${categoryFilter}&store=${storeFilter}`
      );
      setFoods(response.foods || []);
      setFoodPage(response.current_page || 1);
      setTotalFoodPages(response.total_pages || 1);
      setTotalFoods(response.total_foods || 0);
    } catch (error) {
      console.error('Error loading foods:', error);
      alert('Không thể tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  };

  // ==== Hàm thêm món ăn mới ====
  const handleAddFood = async () => {
    try {
      await API.post('/menu/admin/foods/', newFood);
      alert('Thêm món ăn thành công');
      setShowAddFoodModal(false);
      setNewFood({
        title: '',
        description: '',
        price: '',
        category_id: '',
        store_id: '',
        availability: 'Còn hàng',
      });
      loadFoods(); // reload lại danh sách
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Không thể thêm món ăn');
    }
  };

  const viewFoodDetail = async (id: number) => {
    try {
      const response = await API.get(`/menu/admin/foods/${id}/`);
      setSelectedFood(response);
      setShowEditFoodModal(true);
    } catch (error) {
      console.error('Error loading food detail:', error);
      alert('Không thể tải thông tin món ăn');
    }
  };

  const updateFood = async () => {
    if (!selectedFood) return;
    try {
      await API.put(`/menu/admin/foods/${selectedFood.id}/`, {
        title: selectedFood.title,
        description: selectedFood.description,
        price: selectedFood.price,
        category_id: selectedFood.category?.id,
        availability: selectedFood.availability,
      });
      alert('Cập nhật món ăn thành công');
      setShowEditFoodModal(false);
      loadFoods(foodPage);
    } catch (error) {
      console.error('Error updating food:', error);
      alert('Không thể cập nhật món ăn');
    }
  };

  const deleteFood = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa món ăn này?')) return;
    try {
      await API.delete(`/menu/admin/foods/${id}/`);
      alert('Xóa món ăn thành công');
      loadFoods(foodPage);
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Không thể xóa món ăn');
    }
  };


  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(
        `/orders/admin/?page=${page}&search=${orderSearch}&status=${orderStatus}`
      );

      setOrders(response.orders || []);
      setOrderPage(response.current_page || 1);
      setTotalOrderPages(response.total_pages || 1);
      setTotalOrders(response.total_orders || 0);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };


  const viewOrderDetail = async (orderId: number) => {
    try {
      const response = await API.get(`/orders/admin/${orderId}/`);
      setSelectedOrder(response);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error loading order detail:', error);
      alert('Không thể tải thông tin đơn hàng');
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      // Sửa từ .put thành .patch và thêm /status/ vào cuối URL
      await API.patch(`/orders/admin/${orderId}/status/`, {
        order_status: newStatus
      });

      alert('Cập nhật trạng thái đơn hàng thành công');
      
      // Tùy chọn: Cập nhật lại list ngay sau khi thành công
      if (selectedOrder) {
          setSelectedOrder({ ...selectedOrder, order_status: newStatus });
      }
      loadOrders(orderPage); // Tải lại danh sách đơn hàng
      setShowOrderModal(false); // Đóng modal

    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Không thể cập nhật trạng thái đơn hàng: ${error}`);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReportFilters(prev => ({ ...prev, [name]: value }));
  };

  const loadRevenueReport = async () => {
    if (!reportFilters.start_date || !reportFilters.end_date) {
      alert("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
      return;
    }
    setReportLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: reportFilters.start_date,
        end_date: reportFilters.end_date,
        period: reportFilters.period,
      });
      if (reportFilters.store_id) {
        params.append('store_id', reportFilters.store_id);
      }
      const response = await API.get(`/admin/reports/revenue/?${params.toString()}`);
      setReportData(response);
    } catch (error) {
      console.error("Error loading revenue report:", error);
      alert("Không thể tải báo cáo doanh thu.");
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePopularFoodsFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPopularFoodsFilters(prev => ({ ...prev, [name]: value }));
  };

  const loadPopularFoodsReport = async () => {
    if (!popularFoodsFilters.start_date || !popularFoodsFilters.end_date) {
      alert("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }
    setPopularFoodsLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: popularFoodsFilters.start_date,
        end_date: popularFoodsFilters.end_date,
        limit: popularFoodsFilters.limit,
      }).toString();
      
      const response = await API.get(`/admin/reports/popular-foods/?${params}`);
      setPopularFoodsData(response);
    } catch (error) {
      console.error("Error loading popular foods report:", error);
      alert("Không thể tải báo cáo món ăn bán chạy.");
      setPopularFoodsData(null);
    } finally {
      setPopularFoodsLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      'Chờ xác nhận': 'bg-yellow-100 text-yellow-800',
      'Đã xác nhận': 'bg-green-100 text-green-800',
      'Đang chuẩn bị': 'bg-blue-100 text-blue-800',
      'Đang giao': 'bg-teal-100 text-teal-800', // <-- đổi sang teal
      'Đã giao': 'bg-cyan-100 text-cyan-800',
      'Đã huỷ': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };
  

  const formatCurrency = (amount: number | string) => {
    // Chuyển đổi amount thành number trước khi format
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Number(amount));
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_active_section');
    navigate('/login');
  };

  if (loading && activeSection === 'dashboard') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🍔 Admin Panel</h1>
            </div>
            <nav className="flex space-x-6">
              <button
                className={`px-4 py-2 rounded transition-colors ${activeSection === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                  }`}
                onClick={() => {
                  changeSection('dashboard');
                }}
              >
                Dashboard
              </button>

              <button
                className={`px-4 py-2 rounded transition-colors ${activeSection === 'stores'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
                  }`}
                onClick={() => changeSection('stores')}
              >
                Cửa hàng
              </button>


              <button
                className={`px-4 py-2 rounded transition-colors ${activeSection === 'customers' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                  }`}
                onClick={() => changeSection('customers')}
              >
                Khách hàng
              </button>
              <button
                className={`px-4 py-2 rounded transition-colors ${activeSection === 'foods' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                  }`}
                onClick={() => changeSection('foods')}
              >
                Món ăn
              </button>
              <button
                className={`px-4 py-2 rounded transition-colors ${activeSection === 'orders' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                  }`}
                onClick={() => changeSection('orders')}
              >
                Đơn hàng
              </button>
              <button
                className={`px-3 py-2 rounded transition-colors text-sm md:text-base ${activeSection === 'revenueReport' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'}`}
                onClick={() => changeSection('revenueReport')}
              >
                Báo cáo
              </button>
              <button className={`px-3 py-2 rounded transition-colors text-sm md:text-base ${activeSection === 'popularFoodsReport' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'}`} onClick={() => changeSection('popularFoodsReport')}>BC Món ăn</button>
              <button
                className="px-4 py-2 text-gray-600 hover:text-red-500 transition-colors"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Dashboard Section */}
      {activeSection === 'dashboard' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng cửa hàng</CardTitle>
                <div className="text-2xl">🏬</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStores}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng khách hàng</CardTitle>
                <div className="text-2xl">👥</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng món ăn</CardTitle>
                <div className="text-2xl">🍽️</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalFoods}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
                <div className="text-2xl">🛒</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Stores Section */}
      {activeSection === 'stores' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý cửa hàng</h2>
            <Button onClick={() => setShowAddStoreModal(true)}>+ Thêm cửa hàng</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Hình ảnh</th>
                      <th className="px-4 py-3">Tên cửa hàng</th>
                      <th className="px-4 py-3">Mô tả</th>
                      <th className="px-4 py-3">Quản lý</th>
                      <th className="px-4 py-3">Sửa</th>
                      <th className="px-4 py-3">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(!stores || stores.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {loading ? 'Đang tải...' : 'Không có cửa hàng nào'}
                        </td>
                      </tr>
                    ) : (
                      stores.map((store) => (
                        <tr key={store.id}>
                          <td className="px-4 py-4">{store.id}</td>
                          <td className="px-4 py-4">
                            {store.image ? (
                              <img src={getImageUrl(store.image)} alt={store.store_name} className="w-12 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">No image</div>
                            )}

                          </td>
                          <td className="px-4 py-4">{store.store_name}</td>
                          <td className="px-4 py-4">{store.description}</td>
                          <td className="px-4 py-4">{store.manager}</td>
                          <td className="px-4 py-4">
                            <Button size="sm" onClick={() => viewStoreDetail(store.id)}>✏️ Sửa</Button>
                          </td>
                          <td className="px-4 py-4">
                            <Button size="sm" variant="destructive" onClick={() => deleteStore(store.id)}>🗑️ Xóa</Button>
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



      {/* Customers Section */}
      {activeSection === 'customers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý khách hàng</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border px-3 py-2 rounded"
              />
              <Button onClick={() => loadCustomers(1, search)}>Tìm</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số ĐT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          {loading ? 'Đang tải...' : 'Không có khách hàng nào'}
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.id}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.username}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.fullname}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.email}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.phone_number || 'N/A'}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.address || 'N/A'}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.role}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {new Date(customer.created_date).toLocaleDateString('vi-VN')}
                          </td>
                          <td>
                            <Button size="sm" onClick={() => viewCustomerDetail(customer.id)}>
                              👁️ Xem
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">Tổng: {totalCustomers} khách hàng</p>
            <div>
              <Button
                disabled={currentPage === 1}
                onClick={() => loadCustomers(currentPage - 1, search)}
              >
                Trang trước
              </Button>
              <span className="mx-2">
                Trang {currentPage}/{totalPages}
              </span>
              <Button
                disabled={currentPage === totalPages}
                onClick={() => loadCustomers(currentPage + 1, search)}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Foods Section */}
      {activeSection === 'foods' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý món ăn</h2>
            <Button onClick={() => setShowAddFoodModal(true)}>+ Thêm món ăn</Button>
          </div>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mô tả"
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              className="border px-3 py-2 rounded"
            />

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Tất cả danh mục</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.cate_name}</option>
              ))}
            </select>
            <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
              <option value="">Tất cả cửa hàng</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.store_name}</option>
              ))}
            </select>
            <Button onClick={() => loadFoods(1)}>Lọc</Button>
          </div>


          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hình ảnh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên món</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cửa hàng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đánh giá TB</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lượt đánh giá</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sửa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {foods.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {loading ? 'Đang tải...' : 'Không có món ăn nào'}
                        </td>
                      </tr>
                    ) : (
                      foods.map(food => (
                        <tr key={food.id}>
                          <td className="px-4 py-4 text-sm text-gray-900">{food.id}</td>
                          <td className="px-4 py-4">
                            {food.image ? (
                              <img
                                src={getImageUrl(food.image)}
                                alt={food.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs">
                                No image
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{food.title}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                            {food.description || 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(food.price)}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {food.category?.cate_name || 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {food.store?.store_name || 'N/A'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                              ${food.availability === 'Còn hàng'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                              {food.availability}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{food.average_rating ?? 'N/A'}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{food.rating_count ?? 0}</td>
                          <td className="px-4 py-4">
                            <Button size="sm" onClick={() => viewFoodDetail(food.id)}>✏️ Sửa</Button>
                          </td>
                          <td className="px-4 py-4">
                            <Button size="sm" variant="destructive" onClick={() => deleteFood(food.id)}>🗑️ Xóa</Button>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {/* Phân trang món ăn */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">Tổng: {totalFoods} món ăn</p>
            <div>
              <Button disabled={foodPage === 1} onClick={() => loadFoods(foodPage - 1)}>
                Trang trước
              </Button>
              <span className="mx-2">
                Trang {foodPage}/{totalFoodPages}
              </span>
              <Button disabled={foodPage === totalFoodPages} onClick={() => loadFoods(foodPage + 1)}>
                Trang sau
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* Trang con thêm món ăn */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Thêm món ăn</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Tên món</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={newFood.title}
                  onChange={(e) => setNewFood({ ...newFood, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Mô tả</label>
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  value={newFood.description}
                  onChange={(e) => setNewFood({ ...newFood, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Giá</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  value={newFood.price}
                  onChange={(e) => setNewFood({ ...newFood, price: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Danh mục</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={newFood.category_id}
                  onChange={(e) => setNewFood({ ...newFood, category_id: e.target.value })}
                >
                  <option value="">--Chọn danh mục--</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.cate_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Cửa hàng</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={newFood.store_id}
                  onChange={(e) => setNewFood({ ...newFood, store_id: e.target.value })}
                >
                  <option value="">--Chọn cửa hàng--</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Trạng thái</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={newFood.availability}
                  onChange={(e) => setNewFood({ ...newFood, availability: e.target.value })}
                >
                  <option value="Còn hàng">Còn hàng</option>
                  <option value="Hết hàng">Hết hàng</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddFoodModal(false)}>Đóng</Button>
              <Button onClick={handleAddFood}>Thêm</Button>
            </div>
          </div>
        </div>
      )}

      {/* Trang con sửa món ăn */}
      {showEditFoodModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Sửa món ăn</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Tên món</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={selectedFood.title}
                  onChange={(e) => setSelectedFood({ ...selectedFood, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Mô tả</label>
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  value={selectedFood.description}
                  onChange={(e) => setSelectedFood({ ...selectedFood, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Giá</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  value={selectedFood.price}
                  onChange={(e) => setSelectedFood({ ...selectedFood, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Trạng thái</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={selectedFood.availability}
                  onChange={(e) => setSelectedFood({ ...selectedFood, availability: e.target.value })}
                >
                  <option value="Còn hàng">Còn hàng</option>
                  <option value="Hết hàng">Hết hàng</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowEditFoodModal(false)}>Đóng</Button>
              <Button onClick={updateFood}>Lưu</Button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Section */}
      {activeSection === 'orders' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý đơn hàng</h2>
          </div>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Tìm theo ID hoặc khách hàng"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="border px-3 py-2 rounded"
            />

            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="border px-3 py-2 rounded"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Chờ xác nhận">Chờ xác nhận</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
              <option value="Đang chuẩn bị">Đang chuẩn bị</option>
              <option value="Đang giao">Đang giao</option>
              <option value="Đã giao">Đã giao</option>
              <option value="Đã huỷ">Đã huỷ</option>
            </select>

            <Button onClick={() => loadOrders(1)}>Lọc</Button>
          </div>


          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phương thức TT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {loading ? 'Đang tải...' : 'Không có đơn hàng nào'}
                        </td>
                      </tr>
                    ) : (
                      orders.map(order => (
                        <tr key={order.id}>
                          <td className="px-4 py-4 text-sm text-gray-900">#{order.id}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{order.user.fullname}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(order.total_money)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.order_status)}`}>
                              {order.order_status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{order.payment_method}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {new Date(order.created_date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              size="sm"
                              onClick={() => viewOrderDetail(order.id)}
                            >
                              👁️ Xem
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {/* Phân trang đơn hàng  */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">Tổng: {totalOrders} đơn hàng</p>
            <div>
              <Button
                disabled={orderPage === 1}
                onClick={() => loadOrders(orderPage - 1)}
              >
                Trang trước
              </Button>
              <span className="mx-2">
                Trang {orderPage}/{totalOrderPages}
              </span>
              <Button
                disabled={orderPage === totalOrderPages}
                onClick={() => loadOrders(orderPage + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* Revenue Report Section */}
      {activeSection === 'revenueReport' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Báo cáo Doanh thu</h2>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium">Từ ngày</label>
                <input type="date" name="start_date" value={reportFilters.start_date} onChange={handleFilterChange} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Đến ngày</label>
                <input type="date" name="end_date" value={reportFilters.end_date} onChange={handleFilterChange} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Giai đoạn</label>
                <select name="period" value={reportFilters.period} onChange={handleFilterChange} className="border p-2 rounded w-full">
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Cửa hàng</label>
                <select name="store_id" value={reportFilters.store_id} onChange={handleFilterChange} className="border p-2 rounded w-full">
                  <option value="">Tất cả cửa hàng</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.store_name}</option>)}
                </select>
              </div>
              <Button onClick={loadRevenueReport} disabled={reportLoading}>
                {reportLoading ? 'Đang tải...' : 'Xem báo cáo'}
              </Button>
            </CardContent>
          </Card>

          {/* Report Results */}
          {reportData && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader><CardTitle>Tổng doanh thu</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{formatCurrency(reportData.total_revenue)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Tổng đơn hàng</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{reportData.total_orders}</p></CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đơn hàng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.data.length === 0 ? (
                          <tr><td colSpan={3} className="text-center p-6 text-gray-500">Không có dữ liệu cho khoảng thời gian này.</td></tr>
                        ) : (
                          reportData.data.map(item => (
                            <tr key={item.date}>
                              <td className="px-4 py-4">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                              <td className="px-4 py-4 font-semibold">{formatCurrency(item.revenue)}</td>
                              <td className="px-4 py-4">{item.orders}</td>
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

        </div>
      )}


      {/* Popular Foods Report Section */}
      {activeSection === 'popularFoodsReport' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">Báo cáo Món ăn bán chạy</h2>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium">Từ ngày</label>
                <input type="date" name="start_date" value={popularFoodsFilters.start_date} onChange={handlePopularFoodsFilterChange} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Đến ngày</label>
                <input type="date" name="end_date" value={popularFoodsFilters.end_date} onChange={handlePopularFoodsFilterChange} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Số lượng Top</label>
                <input type="number" name="limit" value={popularFoodsFilters.limit} onChange={handlePopularFoodsFilterChange} className="border p-2 rounded w-full" min="1" />
              </div>
              <Button onClick={loadPopularFoodsReport} disabled={popularFoodsLoading}>
                {popularFoodsLoading ? 'Đang tải...' : 'Xem báo cáo'}
              </Button>
            </CardContent>
          </Card>

          {/* Report Results */}
          {popularFoodsData && (
            <Card>
              <CardHeader>
                <CardTitle>Kết quả báo cáo</CardTitle>
                <p className="text-sm text-gray-500">Giai đoạn: {popularFoodsData.period}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Món</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên món ăn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cửa hàng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL bán</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lượt đặt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {popularFoodsData.foods.length === 0 ? (
                        <tr><td colSpan={7} className="text-center p-6 text-gray-500">Không có dữ liệu.</td></tr>
                      ) : (
                        popularFoodsData.foods.map(food => (
                          <tr key={food.food_id}>
                            <td className="px-4 py-4">{food.food_id}</td>
                            <td className="px-4 py-4 font-semibold">{food.food_name}</td>
                            <td className="px-4 py-4">{food.category}</td>
                            <td className="px-4 py-4">{food.store_name}</td>
                            <td className="px-4 py-4">{food.total_quantity}</td>
                            <td className="px-4 py-4">{formatCurrency(food.total_revenue)}</td>
                            <td className="px-4 py-4">{food.order_count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}


    
      

      

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Chi tiết đơn hàng</h2>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowOrderModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Thông tin đơn hàng</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Mã đơn:</strong> #{selectedOrder.id}</p>
                    <p><strong>Ngày tạo:</strong> {formatDate(selectedOrder.created_date)}</p>
                    <p><strong>Tổng tiền:</strong> {formatCurrency(selectedOrder.total_money)}</p>
                    <p><strong>Phương thức TT:</strong> {selectedOrder.payment_method}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Thông tin khách hàng</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Tên:</strong> {selectedOrder.user.fullname}</p>
                    <p><strong>Email:</strong> {selectedOrder.user.email}</p>
                    <p><strong>SĐT:</strong> {selectedOrder.user.phone_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="font-semibold mb-2">Thông tin giao hàng</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Người nhận:</strong> {selectedOrder.receiver_name}</p>
                    <p><strong>SĐT:</strong> {selectedOrder.phone_number}</p>
                    <p><strong>Địa chỉ:</strong> {selectedOrder.ship_address}</p>
                    <p><strong>Ghi chú:</strong> {selectedOrder.note || 'Không có'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold mb-2">Cập nhật trạng thái</h4>
                <div className="flex items-center gap-4">
                  <select
                    id="order-status-select"
                    className="border border-gray-300 rounded px-3 py-2"
                    defaultValue={selectedOrder.order_status}
                  >
                    <option value="Chờ xác nhận">Chờ xác nhận</option>
                    <option value="Đã xác nhận">Đã xác nhận</option>
                    <option value="Đang chuẩn bị">Đang chuẩn bị</option>
                    <option value="Đang giao">Đang giao</option>
                    <option value="Đã giao">Đã giao</option>
                    <option value="Đã huỷ">Đã huỷ</option>
                  </select>
                  <Button
                    onClick={() => {
                      const select = document.getElementById('order-status-select') as HTMLSelectElement;
                      updateOrderStatus(selectedOrder.id, select.value);
                    }}
                  >
                    Cập nhật
                  </Button>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Chi tiết món ăn</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Món ăn</th>
                          <th className="px-3 py-2 text-left">Số lượng</th>
                          <th className="px-3 py-2 text-left">Giá</th>
                          <th className="px-3 py-2 text-left">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2">{item.food.title}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">{formatCurrency(item.food.price)}</td>
                            <td className="px-3 py-2">{formatCurrency(item.quantity * item.food.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Trang con xem chi tiết khách hàng */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Chi tiết khách hàng</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Họ tên</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={selectedCustomer.fullname}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, fullname: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Số điện thoại</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={selectedCustomer.phone_number || ''}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, phone_number: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Địa chỉ</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={selectedCustomer.address || ''}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, address: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCustomerModal(false)}>
                Đóng
              </Button>
              <Button onClick={updateCustomer}>Lưu</Button>
            </div>
          </div>
        </div>
      )}

      {/* Trang con thêm cửa hàng */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Thêm cửa hàng</h2>
            <div className="space-y-3">
              <input className="border rounded px-3 py-2 w-full" placeholder="Tên cửa hàng"
                value={newStore.store_name} onChange={(e) => setNewStore({ ...newStore, store_name: e.target.value })} />
              <input className="border rounded px-3 py-2 w-full" placeholder="Hình ảnh"
                value={newStore.image} onChange={(e) => setNewStore({ ...newStore, image: e.target.value })} />
              <textarea className="border rounded px-3 py-2 w-full" placeholder="Mô tả"
                value={newStore.description} onChange={(e) => setNewStore({ ...newStore, description: e.target.value })} />
              <input className="border rounded px-3 py-2 w-full" placeholder="ID Quản lý"
                value={newStore.manager} onChange={(e) => setNewStore({ ...newStore, manager: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddStoreModal(false)}>Đóng</Button>
              <Button onClick={handleAddStore}>Thêm</Button>
            </div>
          </div>
        </div>
      )}
      {/* Trang con sửa cửa hàng */}
      {showEditStoreModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Sửa cửa hàng</h2>
            <div className="space-y-3">
              <input className="border rounded px-3 py-2 w-full" value={selectedStore.store_name}
                onChange={(e) => setSelectedStore({ ...selectedStore, store_name: e.target.value })} />
              <input className="border rounded px-3 py-2 w-full" value={selectedStore.image}
                onChange={(e) => setSelectedStore({ ...selectedStore, image: e.target.value })} />
              <textarea className="border rounded px-3 py-2 w-full" value={selectedStore.description}
                onChange={(e) => setSelectedStore({ ...selectedStore, description: e.target.value })} />
              <input className="border rounded px-3 py-2 w-full" value={selectedStore.manager}
                onChange={(e) => setSelectedStore({ ...selectedStore, manager: Number(e.target.value) })} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowEditStoreModal(false)}>Đóng</Button>
              <Button onClick={updateStore}>Lưu</Button>
            </div>
          </div>
        </div>
      )}





    </div>
  );
};

export default Admin;