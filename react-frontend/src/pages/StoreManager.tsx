import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
import type { Food, Category, FoodSize, StoreOrder, MyStore } from '@/types/index-tuan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
// Import Icons
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingBag, 
  TicketPercent, 
  Store, 
  LogOut, 
  ExternalLink,
  X,
  Upload,
  Plus,
  Save,
  Trash2,
  Edit2,
  CheckCircle
} from 'lucide-react';

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
  category: string; 
}

const StoreManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>(() => localStorage.getItem('store_manager_active_section') || 'dashboard');

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

  // Promotion State
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [showEditPromoModal, setShowEditPromoModal] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    discount_type: 'PERCENT' as 'PERCENT' | 'AMOUNT',
    discount_value: '',
    start_date: '', 
    end_date: '', 
    minimum_pay: '',
    max_discount_amount: '',
    is_active: true,
  });
  const [selectedPromo, setSelectedPromo] = useState<StorePromotion | null>(null);

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
  const [editingSizeId, setEditingSizeId] = useState<number | null>(null);
  const [editingSizeData, setEditingSizeData] = useState({ size_name: '', price: '' });

  const addImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);

  // --- Initial Data Loading ---
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
    if (!user || (user.role !== 'Cửa hàng' && user.role !== 'Chủ cửa hàng')) {
      alert('Bạn không có quyền truy cập trang này!');
      navigate('/');
    }
  };

  const changeSection = (section: string) => {
    setFoodPage(1);
    setOrderPage(1);
    setActiveSection(section);
  };

  // --- API Functions ---
  const loadMyStore = async () => {
    try {
      setLoading(true);
      const res = await API.get<MyStore>('/stores/my_store/');
      setStoreInfo(res);
      setEditableStoreInfo(res);
    } catch (error) {
      console.error('Error loading store info:', error);
      // Không alert ngay để tránh chặn render
      // logout(); // Tạm comment để debug nếu cần
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
    if (newFoodImage) formData.append('image_file', newFoodImage);

    try {
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
      const res = await API.get(`/menu/store/foods/${foodId}/`);
      setSelectedFood(res);
      setShowEditFoodModal(true);
    } catch (error) {
      alert('Không thể tải chi tiết món ăn');
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
    if (editFoodImage) formData.append('image_file', editFoodImage);

    try {
      await API.put(`/menu/store/foods/${selectedFood.id}/`, formData);
      alert('Cập nhật món ăn thành công!');
      setShowEditFoodModal(false);
      setEditFoodImage(null);
      if (editImageRef.current) editImageRef.current.value = '';
      loadFoods(foodPage);
    } catch (error) {
      alert(`Lỗi: ${error}`);
    }
  };

  const deleteFood = async (foodId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa món ăn này?')) return;
    try {
      await API.delete(`/menu/store/foods/${foodId}/`);
      alert('Xóa món ăn thành công!');
      loadFoods(foodPage);
    } catch (error) {
      alert('Không thể xóa món ăn');
    }
  };

  // --- Size Functions ---
  const openManageSizesModal = async (food: Food) => {
    setSelectedFood(food);
    await loadFoodSizes(food.id);
    setEditingSizeId(null); 
    setEditingSizeData({ size_name: '', price: '' });
    setShowManageSizesModal(true);
  };

  const loadFoodSizes = async (foodId: number) => {
    try {
      const res = await API.get(`/menu/store/foods/${foodId}/sizes/`);
      setFoodSizes(res);
    } catch (error) {
      console.error('Error loading sizes:', error);
      setFoodSizes([]);
    }
  };

  const handleAddSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !newSize.size_name || !newSize.price) return;
    try {
      await API.post(`/menu/store/foods/${selectedFood.id}/sizes/`, newSize);
      setNewSize({ size_name: '', price: '' });
      loadFoodSizes(selectedFood.id);
    } catch (error) {
      alert(`Lỗi khi thêm size: ${error}`);
    }
  };
  
  const startEditingSize = (size: FoodSize) => {
    setEditingSizeId(size.id);
    setEditingSizeData({ size_name: size.size_name, price: size.price.toString() });
  };

  const handleUpdateSize = async (sizeId: number) => {
    if (!selectedFood || !editingSizeData.size_name || !editingSizeData.price) return;
    try {
      await API.put(`/menu/store/foods/${selectedFood.id}/sizes/${sizeId}/`, editingSizeData);
      alert('Cập nhật size thành công!');
      setEditingSizeId(null);
      loadFoodSizes(selectedFood.id);
    } catch (error: any) {
      alert(`Lỗi: ${error.message || 'Không thể cập nhật'}`);
    }
  };

  const deleteSize = async (sizeId: number) => {
    if (!selectedFood || !window.confirm('Bạn có chắc muốn xóa size này?')) return;
    try {
      await API.delete(`/menu/store/foods/${selectedFood.id}/sizes/${sizeId}/`);
      loadFoodSizes(selectedFood.id);
    } catch (error) {
      alert('Không thể xóa size');
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
      await API.put(`/stores/${editableStoreInfo.id}/`, payload);
      alert('Cập nhật thành công!');
      setShowEditStoreModal(false);
      loadMyStore();
    } catch (error) {
      alert(`Lỗi: ${error}`);
    }
  };

  // --- Order Functions ---
  const loadOrders = async (page = 1) => {
    if (!storeInfo?.id) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), status: orderStatusFilter }).toString();
      const res = await API.get(`/stores/${storeInfo.id}/orders/?${params}`);
      setOrders(res || []);
      setTotalOrderPages(1); // Fix API pending
      setOrderPage(1);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetail = async (orderId: number) => {
    try {
      const res = await API.get(`/orders/admin/${orderId}/`);
      setSelectedOrder(res);
      setShowOrderModal(true);
    } catch (error) {
      alert('Không thể tải chi tiết đơn hàng.');
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    if (!storeInfo) return;
    try {
      await API.patch(`/stores/${storeInfo.id}/orders/${orderId}/status/`, { order_status: status });
      alert('Cập nhật trạng thái thành công!');
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, order_status: status });
      setShowOrderModal(false);
      loadOrders(orderPage);
    } catch (error) {
      alert(`Lỗi: ${error}`);
    }
  };

  // --- Promotion Functions ---
  const loadPromotions = async () => {
    setPromoLoading(true);
    try {
      const res = await API.get<StorePromotion[]>('/promotions/');
      setPromotions(res || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
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
      await API.post('/promotions/create/', {
        ...newPromo,
        minimum_pay: newPromo.minimum_pay || null,
        max_discount_amount: newPromo.max_discount_amount || null,
      });
      alert('Thêm khuyến mãi thành công');
      setShowAddPromoModal(false);
      setNewPromo({ name: '', discount_type: 'PERCENT', discount_value: '', start_date: '', end_date: '', minimum_pay: '', max_discount_amount: '', is_active: true });
      loadPromotions();
    } catch (error) {
      alert(`Lỗi: ${error}`);
    }
  };

  const openEditPromoModal = (promo: StorePromotion) => {
    const formatForDateInput = (dateStr: string) => dateStr ? dateStr.substring(0, 10) : '';
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
      loadPromotions();
    } catch (error) {
      alert(`Lỗi: ${error}`);
    }
  };

  const deletePromo = async (promoId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa khuyến mãi này?')) return;
    try {
      await API.delete(`/promotions/${promoId}/delete/`);
      alert('Xóa khuyến mãi thành công');
      loadPromotions();
    } catch (error) {
      alert(`Lỗi: ${error}`);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('store_manager_active_section');
    navigate('/login');
  };

  // Utility
  const formatCurrency = (amount: number | string) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  const formatPromoDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : 'N/A';
  const getStatusClass = (status: string) => ({
    'Chờ xác nhận': 'bg-yellow-100 text-yellow-800', 'Đã xác nhận': 'bg-blue-100 text-blue-800',
    'Đang chuẩn bị': 'bg-indigo-100 text-indigo-800', 'Sẵn sàng': 'bg-purple-100 text-purple-800',
    'Đang giao': 'bg-cyan-100 text-cyan-800', 'Đã giao': 'bg-green-100 text-green-800',
    'Đã hủy': 'bg-red-100 text-red-800'
  }[status] || 'bg-gray-100 text-gray-800');

  // Helper Component for consistent Labels
  const Label = ({ children, required = false }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );

  // Helper for consistent Input styles
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";

  // === FIX QUAN TRỌNG: KIỂM TRA LOADING TRƯỚC KHI RENDER UI CHÍNH ===
  // Nếu đang loading và chưa có storeInfo thì hiển thị màn hình chờ
  // Điều này ngăn chặn lỗi truy cập property của null/undefined
  if (loading && !storeInfo) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-600 flex-col gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p>Đang tải thông tin cửa hàng...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* --- SIDEBAR (Fixed Left) --- */}
      <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col flex-shrink-0 z-20">
        <div className="p-6 border-b flex items-center justify-center">
           <h1 className="text-xl font-bold text-blue-600 uppercase tracking-wide flex items-center gap-2">
              <Store size={24} /> Quản lý cửa hàng
           </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-xs font-bold text-gray-400 uppercase px-4 mb-3 mt-2 tracking-wider">Tổng quan</p>
            <button 
                onClick={() => changeSection('dashboard')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all", 
                activeSection === 'dashboard' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
            >
                <LayoutDashboard size={18} /> Dashboard
            </button>

            <p className="text-xs font-bold text-gray-400 uppercase px-4 mt-6 mb-3 tracking-wider">Quản lý</p>
            <button 
                onClick={() => changeSection('foods')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all", 
                activeSection === 'foods' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
            >
                <Utensils size={18} /> Món ăn
            </button>
            <button 
                onClick={() => changeSection('orders')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all", 
                activeSection === 'orders' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
            >
                <ShoppingBag size={18} /> Đơn hàng
            </button>
            <button 
                onClick={() => changeSection('promotions')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all", 
                activeSection === 'promotions' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
            >
                <TicketPercent size={18} /> Khuyến mãi
            </button>

            <p className="text-xs font-bold text-gray-400 uppercase px-4 mt-6 mb-3 tracking-wider">Cấu hình</p>
            <button 
                onClick={() => changeSection('my-store')}
                className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all", 
                activeSection === 'my-store' ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
            >
                <Store size={18} /> Thông tin Cửa hàng
            </button>
        </nav>

        <div className="p-4 border-t bg-gray-50/50">
           <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold border border-blue-200">
                 {/* FIX LỖI: Thêm ?. vào manager và fullname để tránh crash khi chưa load xong */}
                 {storeInfo?.manager?.fullname?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="font-medium text-sm text-gray-900 truncate">{storeInfo?.manager?.fullname || 'Người dùng'}</p>
                 <p className="text-gray-500 text-xs truncate">Quản lý cửa hàng</p>
              </div>
           </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* --- TOPBAR --- */}
        <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6 flex-shrink-0 z-10">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    {storeInfo?.image ? (
                        <img src={getImageUrl(storeInfo.image)} alt="Logo" className="w-10 h-10 rounded-full object-cover border shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {/* FIX LỖI: Thêm ?. vào store_name */}
                            {storeInfo?.store_name?.charAt(0) || 'S'}
                        </div>
                    )}
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg leading-tight">{storeInfo?.store_name || 'Đang tải...'}</h2>
                        <div className="flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-gray-500">Đang hoạt động</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                    onClick={() => navigate('/')}
                >
                    <ExternalLink size={16} /> <span className="hidden sm:inline">Trang Khách Hàng</span>
                </Button>
                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2" 
                    onClick={logout}
                >
                    <LogOut size={16} /> <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
            </div>
        </header>

        {/* --- CONTENT AREA --- */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8 relative">
          <div className="max-w-6xl mx-auto pb-10">
            
            {/* Dashboard */}
            {activeSection === 'dashboard' && (
                <div className="animate-in fade-in duration-500">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Thống kê hoạt động</h2>
                    {loading ? <p>Đang tải...</p> : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 uppercase">Doanh thu</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-800">{formatCurrency(stats.total_revenue || 0)}</div></CardContent></Card>
                        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 uppercase">Đơn hàng</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-800">{stats.total_orders || 0}</div></CardContent></Card>
                        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 uppercase">Món ăn</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-800">{stats.total_foods || 0}</div></CardContent></Card>
                        <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-all"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 uppercase">Đánh giá</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-800">{Number(stats.average_rating || 0).toFixed(1)} ⭐</div></CardContent></Card>
                        </div>
                    )}
                </div>
            )}

             {/* Foods Section */}
             {activeSection === 'foods' && (
                <div className="animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý món ăn</h2>
                        <Button onClick={() => setShowAddFoodModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm"><Plus size={18} className="mr-2"/> Thêm món mới</Button>
                    </div>
                    <div className="flex gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <input type="text" placeholder="Tìm kiếm theo tên..." value={foodSearch} onChange={e => setFoodSearch(e.target.value)} className="border border-gray-200 p-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Tất cả danh mục</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
                        </select>
                        <Button onClick={() => loadFoods(1)} variant="secondary">Lọc</Button>
                    </div>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0 overflow-hidden rounded-lg border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-xs"><tr>
                                {['ID', 'Ảnh', 'Thông tin món', 'Giá', 'Danh mục', 'Trạng thái', 'Size', 'Thao tác'].map(h => <th key={h} className="p-4">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y">
                                {foods.map(food => (
                                    <tr key={food.id} className="hover:bg-gray-50 transition-colors bg-white">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{food.id}</td>
                                        <td className="px-4 py-3"><img src={getImageUrl(food.image_url)} alt={food.title} className="w-12 h-12 object-cover rounded-lg border" /></td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{food.title}</p>
                                            <p className="text-xs text-gray-500 max-w-[180px] truncate">{food.description || 'Chưa có mô tả'}</p>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-blue-600">{formatCurrency(food.price)}</td>
                                        <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">{food.category?.cate_name}</span></td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full font-medium ${food.availability === 'Còn hàng' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{food.availability}</span></td>
                                        <td className="px-4 py-3">
                                            <Button size="sm" variant="ghost" className="h-8 text-xs border" onClick={() => openManageSizesModal(food)}>Quản lý</Button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => viewFoodDetail(food.id)}><Edit2 size={14}/></Button>
                                                <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => deleteFood(food.id)}><Trash2 size={14}/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            {foods.length === 0 && <div className="p-12 text-center text-gray-500">Không tìm thấy món ăn nào.</div>}
                        </CardContent>
                    </Card>
                     <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-gray-500">Trang {foodPage} / {totalFoodPages}</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => loadFoods(foodPage - 1)} disabled={foodPage <= 1}>Trước</Button>
                            <Button variant="outline" size="sm" onClick={() => loadFoods(foodPage + 1)} disabled={foodPage >= totalFoodPages}>Sau</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Section */}
            {activeSection === 'orders' && (
                <div className="animate-in fade-in duration-500">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Quản lý đơn hàng</h2>
                    <div className="flex gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} className="border border-gray-200 p-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Tất cả trạng thái</option>
                            {['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đang giao', 'Đã giao', 'Đã hủy'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Button onClick={() => loadOrders(1)}>Lọc đơn hàng</Button>
                    </div>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0 overflow-hidden rounded-lg border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-xs"><tr>
                                {['Mã đơn', 'Khách hàng', 'Tổng tiền', 'Trạng thái', 'Thời gian', 'Thao tác'].map(h => <th key={h} className="p-4">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors bg-white">
                                        <td className="p-4 font-mono font-bold text-blue-600">#{order.id}</td>
                                        <td className="p-4">
                                            <p className="font-medium text-gray-900">{order.receiver_name}</p>
                                            <p className="text-xs text-gray-500">{order.phone_number}</p>
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">{formatCurrency(order.total_money)}</td>
                                        <td className="p-4"><span className={`px-3 py-1 text-xs rounded-full font-medium shadow-sm ${getStatusClass(order.order_status)}`}>{order.order_status}</span></td>
                                        <td className="p-4 text-gray-500 text-xs">{formatDate(order.created_date)}</td>
                                        <td className="p-4"><Button size="sm" variant="outline" className="h-8" onClick={() => viewOrderDetail(order.id)}>Xem chi tiết</Button></td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            {orders.length === 0 && <div className="p-12 text-center text-gray-500">Chưa có đơn hàng nào.</div>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Promotions Section */}
            {activeSection === 'promotions' && (
                <div className="animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý Khuyến mãi</h2>
                        <Button onClick={() => setShowAddPromoModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm"><Plus size={18} className="mr-2"/> Tạo khuyến mãi</Button>
                    </div>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0 overflow-hidden rounded-lg border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-xs"><tr>
                                    <th className="px-4 py-3">Tên chương trình</th>
                                    <th className="px-4 py-3">Giảm giá</th>
                                    <th className="px-4 py-3">Thời gian</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr></thead>
                                <tbody className="divide-y">
                                {promotions.map(promo => (
                                    <tr key={promo.id} className="hover:bg-gray-50 transition-colors bg-white">
                                        <td className="px-4 py-4 font-medium text-gray-900">{promo.name}</td>
                                        <td className="px-4 py-4 text-blue-600 font-bold">{promo.discount_type === 'PERCENT' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)}</td>
                                        <td className="px-4 py-4 text-xs text-gray-500">{formatPromoDate(promo.start_date)} - {formatPromoDate(promo.end_date)}</td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {promo.is_active ? 'Đang chạy' : 'Tạm dừng'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditPromoModal(promo)}><Edit2 size={14}/></Button>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deletePromo(promo.id)}><Trash2 size={14}/></Button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            {promotions.length === 0 && <div className="p-12 text-center text-gray-500">Chưa có chương trình khuyến mãi nào.</div>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* My Store Section */}
            {activeSection === 'my-store' && storeInfo && (
                 <div className="animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Thông tin cửa hàng</h2>
                        <Button onClick={() => setShowEditStoreModal(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50"><Edit2 size={16} className="mr-2"/> Chỉnh sửa</Button>
                    </div>
                    <Card className="overflow-hidden border-0 shadow-md rounded-xl">
                        <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/30 to-transparent"></div>
                        </div>
                        <CardContent className="p-8 relative bg-white">
                            <div className="absolute -top-20 left-8 p-1.5 bg-white rounded-2xl shadow-lg">
                                <img src={getImageUrl(storeInfo.image)} alt={storeInfo.store_name} className="w-36 h-36 object-cover rounded-xl border border-gray-100" />
                            </div>
                            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-4">{storeInfo.store_name}</h3>
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <span className="text-xs font-bold text-gray-400 uppercase block mb-2">Mô tả cửa hàng</span>
                                            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{storeInfo.description}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                     <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><CheckCircle size={18}/> Thông tin quản lý</h4>
                                        <div className="space-y-4">
                                            <div className="flex border-b border-blue-100 pb-3">
                                                <div className="w-32 text-sm text-blue-600">Họ và tên</div>
                                                {/* FIX: thêm ?. */}
                                                <div className="font-medium text-gray-800">{storeInfo.manager?.fullname}</div>
                                            </div>
                                            <div className="flex border-b border-blue-100 pb-3">
                                                <div className="w-32 text-sm text-blue-600">Email</div>
                                                {/* FIX: thêm ?. */}
                                                <div className="font-medium text-gray-800">{storeInfo.manager?.email}</div>
                                            </div>
                                            <div className="flex">
                                                <div className="w-32 text-sm text-blue-600">ID Cửa hàng</div>
                                                <div className="font-mono font-medium text-gray-800">#{storeInfo.id}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                 </div>
            )}
          </div>
        </main>
      </div>

      {/* --- REFACTORED MODALS --- */}
      
      {/* 1. ADD FOOD MODAL */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Utensils size={20} className="text-blue-600"/> Thêm món ăn mới</h2>
               <button onClick={() => setShowAddFoodModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
                <form id="add-food-form" onSubmit={handleAddFood} className="space-y-5">
                    <div>
                        <Label required>Tên món ăn</Label>
                        <input required value={newFood.title} onChange={e => setNewFood({ ...newFood, title: e.target.value })} className={inputClass} placeholder="Ví dụ: Cơm gà xối mỡ" />
                    </div>
                    <div>
                        <Label required>Mô tả chi tiết</Label>
                        <textarea required rows={3} value={newFood.description} onChange={e => setNewFood({ ...newFood, description: e.target.value })} className={inputClass} placeholder="Thành phần, hương vị..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Giá bán (VNĐ)</Label>
                            <input required type="number" value={newFood.price} onChange={e => setNewFood({ ...newFood, price: e.target.value })} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                            <Label required>Danh mục</Label>
                            <select required value={newFood.category_id} onChange={e => setNewFood({ ...newFood, category_id: e.target.value })} className={inputClass}>
                                <option value="">-- Chọn --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label>Trạng thái</Label>
                        <select value={newFood.availability} onChange={e => setNewFood({ ...newFood, availability: e.target.value })} className={inputClass}>
                            <option value="Còn hàng">Còn hàng</option>
                            <option value="Hết hàng">Hết hàng</option>
                        </select>
                    </div>
                    <div>
                        <Label>Ảnh đại diện</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => addImageRef.current?.click()}>
                             <input type="file" ref={addImageRef} onChange={e => setNewFoodImage(e.target.files ? e.target.files[0] : null)} className="hidden" accept="image/*" />
                             <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                             <p className="text-sm text-gray-600">{newFoodImage ? newFoodImage.name : "Nhấn để tải ảnh lên"}</p>
                        </div>
                    </div>
                </form>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddFoodModal(false)}>Hủy bỏ</Button>
                <Button type="submit" form="add-food-form" className="bg-blue-600 hover:bg-blue-700">Thêm món ăn</Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT FOOD MODAL */}
      {showEditFoodModal && selectedFood && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Edit2 size={20} className="text-blue-600"/> Chỉnh sửa món ăn</h2>
               <button onClick={() => setShowEditFoodModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto">
                <form id="edit-food-form" onSubmit={updateFood} className="space-y-5">
                    <div>
                        <Label required>Tên món ăn</Label>
                        <input required value={selectedFood.title} onChange={e => setSelectedFood({ ...selectedFood, title: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                        <Label required>Mô tả</Label>
                        <textarea required rows={3} value={selectedFood.description} onChange={e => setSelectedFood({ ...selectedFood, description: e.target.value })} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Giá (VNĐ)</Label>
                            <input required type="number" value={selectedFood.price} onChange={e => setSelectedFood({ ...selectedFood, price: Number(e.target.value) })} className={inputClass} />
                        </div>
                        <div>
                            <Label required>Danh mục</Label>
                            <select required value={selectedFood.category?.id} onChange={e => setSelectedFood({ ...selectedFood, category: { id: Number(e.target.value), cate_name: '' } })} className={inputClass}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label>Trạng thái</Label>
                        <select value={selectedFood.availability} onChange={e => setSelectedFood({ ...selectedFood, availability: e.target.value })} className={inputClass}>
                            <option value="Còn hàng">Còn hàng</option>
                            <option value="Hết hàng">Hết hàng</option>
                        </select>
                    </div>
                    <div>
                        <Label>Ảnh mới (nếu muốn thay đổi)</Label>
                         <div className="flex items-center gap-4">
                             <img src={getImageUrl(selectedFood.image_url)} className="w-16 h-16 rounded object-cover border" alt="Current" />
                             <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:bg-gray-50 cursor-pointer" onClick={() => editImageRef.current?.click()}>
                                 <input type="file" ref={editImageRef} onChange={e => setEditFoodImage(e.target.files ? e.target.files[0] : null)} className="hidden" accept="image/*" />
                                 <p className="text-sm text-gray-500">{editFoodImage ? editFoodImage.name : "Chọn ảnh khác"}</p>
                             </div>
                         </div>
                    </div>
                </form>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEditFoodModal(false)}>Hủy bỏ</Button>
                <Button type="submit" form="edit-food-form" className="bg-blue-600 hover:bg-blue-700">Lưu thay đổi</Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MANAGE SIZES MODAL */}
      {showManageSizesModal && selectedFood && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
             <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
               <h2 className="text-lg font-bold text-gray-800">Size & Tùy chọn <span className="text-sm font-normal text-gray-500 ml-2">({selectedFood.title})</span></h2>
               <button onClick={() => setShowManageSizesModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <div className="p-6">
                <form onSubmit={handleAddSize} className="flex gap-2 mb-6 items-end bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Tên Size</label>
                        <input required value={newSize.size_name} onChange={e => setNewSize({ ...newSize, size_name: e.target.value })} placeholder="VD: Size L" className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="w-28">
                         <label className="text-xs font-bold text-gray-500 mb-1 block">Giá thêm</label>
                        <input required type="number" value={newSize.price} onChange={e => setNewSize({ ...newSize, price: e.target.value })} placeholder="0" className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <Button type="submit" size="sm" className="h-[34px] bg-blue-600"><Plus size={16}/></Button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {foodSizes.length > 0 ? foodSizes.map(size => (
                        <div key={size.id} className="flex justify-between items-center p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow group">
                        {editingSizeId === size.id ? (
                            <div className="flex gap-2 w-full items-center animate-in fade-in">
                                <input className="flex-1 px-2 py-1 border rounded text-sm" value={editingSizeData.size_name} onChange={(e) => setEditingSizeData({...editingSizeData, size_name: e.target.value})} autoFocus />
                                <input className="w-24 px-2 py-1 border rounded text-sm" type="number" value={editingSizeData.price} onChange={(e) => setEditingSizeData({...editingSizeData, price: e.target.value})} />
                                <button onClick={() => handleUpdateSize(size.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={18}/></button>
                                <button onClick={() => { setEditingSizeId(null); setEditingSizeData({ size_name: '', price: '' }); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={18}/></button>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <span className="font-semibold text-gray-800">{size.size_name}</span>
                                    <span className="text-gray-500 text-sm ml-2">+{formatCurrency(size.price)}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" onClick={() => startEditingSize(size)}><Edit2 size={14}/></Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => deleteSize(size.id)}><Trash2 size={14}/></Button>
                                </div>
                            </>
                        )}
                        </div>
                    )) : <div className="text-center py-8 text-gray-400 text-sm">Chưa có size tùy chọn nào.</div>}
                </div>
            </div>
             <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                <Button variant="ghost" onClick={() => setShowManageSizesModal(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ORDER DETAIL MODAL */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                     <h2 className="text-lg font-bold text-gray-800">Đơn hàng #{selectedOrder.id}</h2>
                     <span className={`px-3 py-1 text-xs rounded-full font-bold ${getStatusClass(selectedOrder.order_status)}`}>{selectedOrder.order_status}</span>
                </div>
               <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                           <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Thông tin khách hàng</h3>
                                <p className="text-lg font-medium text-gray-900">{selectedOrder.receiver_name}</p>
                                <p className="text-gray-600">{selectedOrder.phone_number}</p>
                           </div>
                           <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Địa chỉ giao hàng</h3>
                                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedOrder.ship_address}</p>
                           </div>
                      </div>
                      <div className="space-y-4">
                           <div className="text-right md:text-left">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Tổng thanh toán</h3>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedOrder.total_money)}</p>
                                <p className="text-sm text-gray-400">{formatDate(selectedOrder.created_date)}</p>
                           </div>
                           <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Ghi chú</h3>
                                <p className="text-gray-600 italic text-sm">{selectedOrder.note || 'Không có ghi chú'}</p>
                           </div>
                      </div>
                 </div>
                 
                 {/* Status Actions */}
                 <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><CheckCircle size={18}/> Cập nhật trạng thái đơn hàng</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                           <select id="status-update-select" defaultValue={selectedOrder.order_status} className="flex-1 px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
                                <option value="Chờ xác nhận">Chờ xác nhận</option>
                                <option value="Đã xác nhận">Đã xác nhận</option>
                                <option value="Đang chuẩn bị">Đang chuẩn bị</option>
                                <option value="Sẵn sàng">Sẵn sàng (Chờ giao)</option>
                                <option value="Đã hủy">Đã hủy</option>
                           </select>
                           <Button onClick={() => {
                                const newStatus = (document.getElementById('status-update-select') as HTMLSelectElement).value;
                                updateOrderStatus(selectedOrder.id, newStatus);
                           }} className="bg-blue-600 hover:bg-blue-700">Xác nhận cập nhật</Button>
                      </div>
                 </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                <Button variant="outline" onClick={() => setShowOrderModal(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EDIT STORE INFO MODAL */}
      {showEditStoreModal && editableStoreInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Store size={20} className="text-blue-600"/> Cập nhật thông tin</h2>
               <button onClick={() => setShowEditStoreModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <div className="p-6">
                <form id="edit-store-form" onSubmit={handleUpdateStore} className="space-y-5">
                    <div>
                        <Label required>Tên cửa hàng</Label>
                        <input required value={editableStoreInfo.store_name} onChange={e => setEditableStoreInfo({ ...editableStoreInfo, store_name: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                        <Label required>Mô tả giới thiệu</Label>
                        <textarea required rows={5} value={editableStoreInfo.description} onChange={e => setEditableStoreInfo({ ...editableStoreInfo, description: e.target.value })} className={inputClass} />
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs text-yellow-800">
                        <strong>Lưu ý:</strong> Để thay đổi ảnh đại diện hoặc người quản lý, vui lòng liên hệ Admin hệ thống.
                    </div>
                </form>
            </div>

             <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEditStoreModal(false)}>Hủy bỏ</Button>
                <Button type="submit" form="edit-store-form" className="bg-blue-600 hover:bg-blue-700">Lưu thông tin</Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PROMOTION MODAL (ADD & EDIT) */}
      {(showAddPromoModal || (showEditPromoModal && selectedPromo)) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
             <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <TicketPercent size={20} className="text-blue-600"/> 
                   {showAddPromoModal ? 'Tạo khuyến mãi mới' : 'Cập nhật khuyến mãi'}
               </h2>
               <button onClick={() => showAddPromoModal ? setShowAddPromoModal(false) : setShowEditPromoModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto">
                <form id="promo-form" onSubmit={showAddPromoModal ? handleAddPromo : handleUpdatePromo} className="space-y-5">
                    <div>
                        <Label required>Tên chương trình</Label>
                        <input required name="name" value={showAddPromoModal ? newPromo.name : selectedPromo!.name} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className={inputClass} placeholder="VD: Mừng khai trương" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Loại giảm giá</Label>
                            <select required name="discount_type" value={showAddPromoModal ? newPromo.discount_type : selectedPromo!.discount_type} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className={inputClass}>
                                <option value="PERCENT">Theo phần trăm (%)</option>
                                <option value="AMOUNT">Số tiền cố định (VNĐ)</option>
                            </select>
                        </div>
                        <div>
                            <Label required>Giá trị giảm</Label>
                            <input required type="number" name="discount_value" value={showAddPromoModal ? newPromo.discount_value : selectedPromo!.discount_value} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className={inputClass} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <Label required>Ngày bắt đầu</Label>
                             <input required type="date" name="start_date" value={showAddPromoModal ? newPromo.start_date : selectedPromo!.start_date} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className={inputClass} />
                         </div>
                         <div>
                             <Label required>Ngày kết thúc</Label>
                             <input required type="date" name="end_date" value={showAddPromoModal ? newPromo.end_date : selectedPromo!.end_date} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className={inputClass} />
                         </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase">Điều kiện áp dụng (Tùy chọn)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Đơn tối thiểu (VNĐ)</Label>
                                <input type="number" name="minimum_pay" value={showAddPromoModal ? newPromo.minimum_pay : (selectedPromo!.minimum_pay || '')} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className="bg-white w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                            </div>
                            <div>
                                <Label>Giảm tối đa (VNĐ)</Label>
                                <input type="number" name="max_discount_amount" value={showAddPromoModal ? newPromo.max_discount_amount : (selectedPromo!.max_discount_amount || '')} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} className="bg-white w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <input type="checkbox" name="is_active" checked={showAddPromoModal ? newPromo.is_active : selectedPromo!.is_active} onChange={showAddPromoModal ? handleNewPromoChange : handleEditPromoChange} id="is_active_chk" className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
                        <label htmlFor="is_active_chk" className="text-sm font-medium text-gray-700 cursor-pointer">Kích hoạt chương trình ngay</label>
                    </div>
                </form>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => showAddPromoModal ? setShowAddPromoModal(false) : setShowEditPromoModal(false)}>Hủy bỏ</Button>
                <Button type="submit" form="promo-form" className="bg-blue-600 hover:bg-blue-700">{showAddPromoModal ? 'Tạo khuyến mãi' : 'Lưu cập nhật'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManager;