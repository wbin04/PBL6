import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatPrice, formatDate, isAuthenticated, getUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Customer {
  id: number;
  fullname: string;
  email: string;
  phone_number?: string;
  address?: string;
  created_date: string;
}

interface Food {
  id: number;
  title: string;
  description?: string;
  price: number;
  image?: string;
  category?: { id: number; cate_name: string };
  availability: string;
}

interface AdminOrder {
  id: number;
  user: { fullname: string; email: string; phone_number?: string };
  total_money: number;
  order_status: string;
  payment_method: string;
  created_date: string;
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  note?: string;
  items?: Array<{
    food: { id: number; title: string; price: number };
    quantity: number;
  }>;
}

const Admin: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalFoods: 0,
    totalOrders: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication and admin role
    if (!isAuthenticated()) {
      alert('Vui lòng đăng nhập để tiếp tục');
      navigate('/login');
      return;
    }
    
    checkAdminAccess();
    loadDashboard();
  }, []);

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

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Load basic stats (simplified)
      const [customersRes, foodsRes, ordersRes] = await Promise.all([
        API.get('/auth/admin/customers/?page=1').catch(() => ({ customers: [], total_customers: 0 })),
        API.get('/menu/admin/foods/?page=1').catch(() => ({ foods: [], total_foods: 0 })),
        API.get('/orders/admin/?page=1').catch(() => ({ orders: [], total_orders: 0 }))
      ]);

      setStats({
        totalCustomers: customersRes.total_customers || 0,
        totalFoods: foodsRes.total_foods || 0,
        totalOrders: ordersRes.total_orders || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await API.get('/auth/admin/customers/');
      setCustomers(response.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadFoods = async () => {
    try {
      setLoading(true);
      const response = await API.get('/menu/admin/foods/');
      setFoods(response.foods || []);
    } catch (error) {
      console.error('Error loading foods:', error);
      alert('Không thể tải danh sách món ăn');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await API.get('/orders/admin/');
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const showSection = (section: string) => {
    setActiveSection(section);
    
    switch (section) {
      case 'customers':
        loadCustomers();
        break;
      case 'foods':
        loadFoods();
        break;
      case 'orders':
        loadOrders();
        break;
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
      await API.put(`/orders/admin/${orderId}/`, {
        order_status: newStatus
      });
      
      alert('Cập nhật trạng thái đơn hàng thành công');
      setShowOrderModal(false);
      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      'Chờ xác nhận': 'bg-yellow-100 text-yellow-800',
      'Đã xác nhận': 'bg-green-100 text-green-800',
      'Đang chuẩn bị': 'bg-blue-100 text-blue-800',
      'Đang giao': 'bg-gray-100 text-gray-800',
      'Đã giao': 'bg-cyan-100 text-cyan-800',
      'Đã hủy': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
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
                className={`px-4 py-2 rounded transition-colors ${
                  activeSection === 'dashboard' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                }`}
                onClick={() => {
                  setActiveSection('dashboard');
                  loadDashboard();
                }}
              >
                Dashboard
              </button>
              <button
                className={`px-4 py-2 rounded transition-colors ${
                  activeSection === 'customers' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                }`}
                onClick={() => showSection('customers')}
              >
                Khách hàng
              </button>
              <button
                className={`px-4 py-2 rounded transition-colors ${
                  activeSection === 'foods' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                }`}
                onClick={() => showSection('foods')}
              >
                Món ăn
              </button>
              <button
                className={`px-4 py-2 rounded transition-colors ${
                  activeSection === 'orders' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-500'
                }`}
                onClick={() => showSection('orders')}
              >
                Đơn hàng
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Customers Section */}
      {activeSection === 'customers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý khách hàng</h2>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số ĐT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {loading ? 'Đang tải...' : 'Không có khách hàng nào'}
                        </td>
                      </tr>
                    ) : (
                      customers.map(customer => (
                        <tr key={customer.id}>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.id}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.fullname}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.email}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.phone_number || 'N/A'}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{customer.address || 'N/A'}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {new Date(customer.created_date).toLocaleDateString('vi-VN')}
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

      {/* Foods Section */}
      {activeSection === 'foods' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý món ăn</h2>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
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
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              food.availability === 'Còn hàng' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {food.availability}
                            </span>
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

      {/* Orders Section */}
      {activeSection === 'orders' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Quản lý đơn hàng</h2>
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
                    <option value="Đã hủy">Đã hủy</option>
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
    </div>
  );
};

export default Admin;