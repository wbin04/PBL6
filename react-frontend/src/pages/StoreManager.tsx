import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
// Lưu ý: Nếu types/index-tuan chưa có đủ field, bạn có thể dùng interface định nghĩa bên dưới
import type { Food, Category, FoodSize, MyStore } from '@/types/index-tuan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
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
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  User,
  Filter
} from 'lucide-react';

// --- DEFINITIONS BASED ON YOUR JSON ---

// Interface cho Item trong Order (dựa trên JSON)
interface OrderItem {
  id: string;
  food: {
    id: number;
    title: string;
    image_url: string;
  };
  quantity: number;
  food_price: number;
  subtotal: number;
  size_display?: string;
  price_breakdown?: any[];
}

// Interface cho Order (dựa trên JSON)
interface StoreOrder {
  id: number;
  user: {
    id: number;
    fullname: string;
    phone_number: string;
  };
  order_status: string;         // Biến quan trọng để lọc
  delivery_status: string;
  total_money: string;          // JSON trả về string
  payment_method: string;
  receiver_name: string;
  phone_number: string;
  ship_address: string;
  created_date: string;
  note: string;
  shipping_fee: string;
  items: OrderItem[];
}

interface StorePromotion {
  id: number;
  name: string;
  discount_type: "PERCENT" | "AMOUNT";
  discount_value: string;
  start_date: string;
  end_date: string;
  minimum_pay: string | null;
  max_discount_amount: string | null;
  is_active: boolean;
  scope?: string; // Thêm scope để khớp API
  store_id?: number;
}

// Interface cho Rating
interface FoodRating {
  username: string;
  rating: number;
  content: string;
  created_date?: string;
}

// --- HELPER: FORMAT DATE FOR INPUT (Giống Admin.tsx) ---
const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    } catch (e) {
        return '';
    }
};

// --- MAIN COMPONENT ---

const StoreManager: React.FC = () => {
  const navigate = useNavigate();
  
  // State quản lý section
  const [activeSection, setActiveSection] = useState<string>(() => localStorage.getItem('store_manager_active_section') || 'dashboard');

  // State dữ liệu chung
  const [storeInfo, setStoreInfo] = useState<MyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});

  // --- ORDER STATE ---
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('Tất cả');

  // --- FOOD STATE ---
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [foodPage, setFoodPage] = useState(1);
  const [totalFoodPages, setTotalFoodPages] = useState(1);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [showManageSizesModal, setShowManageSizesModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [newFood, setNewFood] = useState({ title: '', description: '', price: '', category_id: '', availability: 'Còn hàng' });
  const [newFoodImage, setNewFoodImage] = useState<File | null>(null);
  const [editFoodImage, setEditFoodImage] = useState<File | null>(null);
  
  // --- FOOD RATING STATE ---
  const [foodRatings, setFoodRatings] = useState<FoodRating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // --- FOOD SIZE STATE ---
  const [foodSizes, setFoodSizes] = useState<FoodSize[]>([]);
  const [newSize, setNewSize] = useState({ size_name: '', price: '' });
  const [editingSizeId, setEditingSizeId] = useState<number | null>(null);
  const [editingSizeData, setEditingSizeData] = useState({ size_name: '', price: '' });

  // --- PROMOTION STATE ---
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [showAddPromoModal, setShowAddPromoModal] = useState(false);
  const [showEditPromoModal, setShowEditPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<StorePromotion | null>(null);
  const [newPromo, setNewPromo] = useState({
    name: '', 
    discount_type: 'PERCENT' as const, 
    discount_value: '', 
    start_date: '', 
    end_date: '', 
    minimum_pay: '', 
    max_discount_amount: '', 
    is_active: true,
  });

  // --- STORE INFO EDIT STATE ---
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [editableStoreInfo, setEditableStoreInfo] = useState<MyStore | null>(null);


  // --- INITIAL LOAD ---
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    const user = getUser();
    if (!user || (user.role !== 'Cửa hàng' && user.role !== 'Chủ cửa hàng')) {
      alert('Bạn không có quyền truy cập!');
      navigate('/');
      return;
    }
    loadMyStore();
    loadCategories();
  }, []);

  useEffect(() => {
    if (!storeInfo) return;
    localStorage.setItem('store_manager_active_section', activeSection);
    switch (activeSection) {
      case 'dashboard': loadDashboardStats(); break;
      case 'foods': loadFoods(1); break;
      case 'orders': loadOrders(); break;
      case 'promotions': loadPromotions(); break;
      default: break;
    }
  }, [activeSection, storeInfo]);

  // --- API CALLS ---
  const loadMyStore = async () => {
    try {
      setLoading(true);
      const res = await API.get<MyStore>('/stores/my_store/');
      setStoreInfo(res);
      setEditableStoreInfo(res);
    } catch (error) {
      console.error('Lỗi tải thông tin cửa hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    if (!storeInfo?.id) return;
    try { const res = await API.get(`/stores/${storeInfo.id}/stats/`); setStats(res); } catch (e) { console.error(e); }
  };

  const loadOrders = async () => {
    if (!storeInfo?.id) return;
    try {
      setLoading(true);
      const res = await API.get(`/stores/${storeInfo.id}/orders/`);
      const orderList = Array.isArray(res) ? res : (res.results || []);
      setOrders(orderList);
    } catch (error) { console.error('Lỗi tải đơn hàng:', error); } finally { setLoading(false); }
  };

  // --- FILTERING LOGIC ---
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'Tất cả') return orders;
    return orders.filter(order => order.order_status === filterStatus);
  }, [orders, filterStatus]);

  const ORDER_STATUSES = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng', 'Đang giao', 'Đã giao', 'Đã huỷ'];
  const getStatusCount = (status: string) => {
    if (status === 'Tất cả') return orders.length;
    return orders.filter(o => o.order_status === status).length;
  };

  const loadFoods = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), search: foodSearch, category: categoryFilter }).toString();
      const res = await API.get(`/menu/store/foods/?${params}`);
      setFoods(res.results || []);
      setTotalFoodPages(res.num_pages || 1);
      setFoodPage(res.current_page || 1);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try { const res = await API.get('/menu/categories/'); setCategories(res.results || []); } catch (e) { console.error(e); }
  };

  // --- CRUD FOOD HANDLERS ---
  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newFood.title);
    formData.append('description', newFood.description);
    formData.append('price', newFood.price);
    formData.append('category_id', newFood.category_id);
    formData.append('availability', newFood.availability);
    if (newFoodImage) formData.append('image_file', newFoodImage);
    try { await API.post('/menu/admin/foods/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); alert('Thêm thành công!'); setShowAddFoodModal(false); loadFoods(); } catch (e) { alert(`Lỗi: ${e}`); }
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
    try { await API.put(`/menu/store/foods/${selectedFood.id}/`, formData); alert('Cập nhật thành công!'); setShowEditFoodModal(false); loadFoods(foodPage); } catch (e) { alert(`Lỗi: ${e}`); }
  };

  const handleEditFoodClick = async (food: Food) => {
    setSelectedFood(food); setShowEditFoodModal(true); setRatingsLoading(true);
    try { const res = await API.get(`/ratings/?food=${food.id}`); setFoodRatings(res || []); } catch (e) { setFoodRatings([]); } finally { setRatingsLoading(false); }
  };

  const deleteFood = async (id: number) => { if(!confirm('Xóa món này?')) return; try { await API.delete(`/menu/store/foods/${id}/`); loadFoods(foodPage); } catch(e) { alert('Lỗi xóa'); } };

  // --- SIZES HANDLERS ---
  const openManageSizes = async (food: Food) => { setSelectedFood(food); setShowManageSizesModal(true); try { const res = await API.get(`/menu/store/foods/${food.id}/sizes/`); setFoodSizes(res); } catch(e) {} };
  const handleAddSize = async (e: React.FormEvent) => { e.preventDefault(); if(!selectedFood) return; try { await API.post(`/menu/store/foods/${selectedFood.id}/sizes/`, newSize); setNewSize({size_name:'', price:''}); openManageSizes(selectedFood); } catch(e) {alert('Lỗi thêm size');} };
  const handleUpdateSize = async (id: number) => { if(!selectedFood) return; try { await API.put(`/menu/store/foods/${selectedFood.id}/sizes/${id}/`, editingSizeData); setEditingSizeId(null); openManageSizes(selectedFood); } catch(e) {alert('Lỗi sửa size');} };
  const deleteSize = async (id: number) => { if(!selectedFood || !confirm('Xóa size?')) return; try { await API.delete(`/menu/store/foods/${selectedFood.id}/sizes/${id}/`); openManageSizes(selectedFood); } catch(e) {} };

  // --- ORDER HANDLERS ---
  const updateOrderStatus = async (orderId: number, status: string) => {
      if(!storeInfo) return;
      try {
          await API.patch(`/stores/${storeInfo.id}/orders/${orderId}/status/`, { order_status: status });
          alert('Cập nhật trạng thái thành công!');
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: status } : o));
          if(selectedOrder) setSelectedOrder({...selectedOrder, order_status: status});
          setShowOrderModal(false);
      } catch (e) { alert(`Lỗi: ${e}`); }
  };

  // --- PROMOTIONS HANDLERS (UPDATED) ---
  const loadPromotions = async () => {
    try { const res = await API.get<StorePromotion[]>('/promotions/'); setPromotions(res || []); } catch (e) { console.error(e); }
  };

  // Xử lý khi nhấn nút Sửa KM - Format lại date để input hiển thị đúng
  const handleEditPromoClick = (p: StorePromotion) => {
    setSelectedPromo({
        ...p,
        // Format ngày về YYYY-MM-DD theo múi giờ VN để input date hiển thị đúng
        start_date: formatDateForInput(p.start_date),
        end_date: formatDateForInput(p.end_date),
        // Chuyển null thành chuỗi rỗng để input không lỗi controlled/uncontrolled
        minimum_pay: p.minimum_pay || '',
        max_discount_amount: p.max_discount_amount || ''
    });
    setShowEditPromoModal(true);
  };

  const handlePromoSubmit = async (e: React.FormEvent, isEdit: boolean) => {
      e.preventDefault();
      
      // Lấy data từ form
      const data = isEdit && selectedPromo ? selectedPromo : newPromo;

      // Chuẩn bị payload theo đúng yêu cầu API
      const payload = {
          ...data,
          store_id: storeInfo?.id, // Đảm bảo luôn gửi store_id
          scope: 'STORE',          // Mặc định scope là STORE
          // Xử lý logic null: Nếu rỗng thì gửi null, ngược lại gửi giá trị
          minimum_pay: (data.minimum_pay === '' || data.minimum_pay === null) ? null : data.minimum_pay,
          max_discount_amount: (data.max_discount_amount === '' || data.max_discount_amount === null) ? null : data.max_discount_amount
      };
      
      try {
          if (isEdit && selectedPromo) {
              // Gọi API update
              await API.put(`/promotions/${selectedPromo.id}/update/`, payload);
          } else {
              // Gọi API create
              await API.post('/promotions/create/', payload);
          }
          alert('Thao tác thành công!'); 
          setShowAddPromoModal(false); 
          setShowEditPromoModal(false); 
          loadPromotions();
      } catch(e: any) { 
          console.error(e);
          alert(`Lỗi: ${JSON.stringify(e.response?.data || e.message)}`); 
      }
  };

  const deletePromo = async (id: number) => {
      if(!confirm('Xóa KM này?')) return;
      try { await API.delete(`/promotions/${id}/delete/`); loadPromotions(); } catch(e) { alert('Lỗi xóa'); }
  };

  // --- UTILS ---
  const formatCurrency = (amount: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  const getStatusColor = (status: string) => {
      switch (status) {
          case 'Chờ xác nhận': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'Đã xác nhận': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'Đang chuẩn bị': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
          case 'Sẵn sàng': return 'bg-purple-100 text-purple-800 border-purple-200';
          case 'Đang giao': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
          case 'Đã giao': return 'bg-green-100 text-green-800 border-green-200';
          case 'Đã huỷ': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  // --- RENDER HELPERS ---
  const SidebarItem = ({ id, label, icon: Icon }: any) => (
      <button onClick={() => { setActiveSection(id); if(id === 'foods') setFoodPage(1); }}
          className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all", 
          activeSection === id ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
          <Icon size={18} /> {label}
      </button>
  );

  if (loading && !storeInfo) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col z-20">
        <div className="p-6 border-b flex justify-center"><h1 className="text-xl font-bold text-blue-600 flex gap-2"><Store/> QUẢN LÝ</h1></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-xs font-bold text-gray-400 uppercase px-4 mb-2 mt-2">Tổng quan</p>
            <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
            <p className="text-xs font-bold text-gray-400 uppercase px-4 mt-6 mb-2">Quản lý</p>
            <SidebarItem id="foods" label="Món ăn" icon={Utensils} />
            <SidebarItem id="orders" label="Đơn hàng" icon={ShoppingBag} />
            <SidebarItem id="promotions" label="Khuyến mãi" icon={TicketPercent} />
            <p className="text-xs font-bold text-gray-400 uppercase px-4 mt-6 mb-2">Hệ thống</p>
            <SidebarItem id="my-store" label="Thông tin Cửa hàng" icon={Store} />
        </nav>
        <div className="p-4 border-t"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{storeInfo?.manager?.fullname?.[0]}</div><div className="text-sm font-medium truncate">{storeInfo?.manager?.fullname}</div></div></div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6 z-10">
             <h2 className="text-lg font-bold text-gray-800">{storeInfo?.store_name}</h2>
             <div className="flex gap-4">
                 <Button variant="ghost" onClick={() => navigate('/')}><ExternalLink size={16} className="mr-2"/> Trang chủ</Button>
                 <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={logout}><LogOut size={16} className="mr-2"/> Đăng xuất</Button>
             </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
            <div className="max-w-6xl mx-auto pb-10">
                
                {/* 1. DASHBOARD */}
                {activeSection === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
                        {[
                            { title: 'Doanh thu', val: formatCurrency(stats.total_revenue || 0), color: 'blue' },
                            { title: 'Đơn hàng', val: stats.total_orders || 0, color: 'green' },
                            { title: 'Món ăn', val: stats.total_foods || 0, color: 'orange' },
                            { title: 'Đánh giá', val: `${Number(stats.average_rating || 0).toFixed(1)} ⭐`, color: 'yellow' }
                        ].map((s, i) => (
                            <Card key={i} className={`border-l-4 border-l-${s.color}-500 shadow-sm`}><CardContent className="p-6">
                                <p className="text-sm text-gray-500 uppercase font-medium">{s.title}</p>
                                <p className="text-2xl font-bold text-gray-800 mt-2">{s.val}</p>
                            </CardContent></Card>
                        ))}
                    </div>
                )}

                {/* 2. ORDERS SECTION */}
                {activeSection === 'orders' && (
                    <div className="animate-in fade-in space-y-6">
                        <div className="flex justify-between items-end">
                            <h2 className="text-2xl font-bold text-gray-800">Quản lý Đơn hàng</h2>
                            <Button variant="outline" size="sm" onClick={loadOrders}><Clock size={16} className="mr-2"/> Làm mới</Button>
                        </div>
                        {/* STATUS FILTER TABS */}
                        <div className="bg-white p-2 rounded-xl border shadow-sm overflow-x-auto no-scrollbar">
                            <div className="flex space-x-2 min-w-max">
                                {ORDER_STATUSES.map(status => {
                                    const isActive = filterStatus === status;
                                    const count = getStatusCount(status);
                                    return (
                                        <button key={status} onClick={() => setFilterStatus(status)}
                                            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isActive ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105" : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900")}>
                                            {status} {count > 0 && (<span className={cn("text-xs py-0.5 px-1.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700")}>{count}</span>)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* ORDERS TABLE */}
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase text-xs">
                                        <tr><th className="p-4">Mã đơn</th><th className="p-4">Khách hàng</th><th className="p-4">Tổng tiền</th><th className="p-4">Trạng thái</th><th className="p-4">Thời gian</th><th className="p-4 text-right">Thao tác</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 bg-white transition-colors">
                                                <td className="p-4 font-mono font-bold text-blue-600">#{order.id}</td>
                                                <td className="p-4"><div className="font-medium text-gray-900">{order.receiver_name}</div><div className="text-xs text-gray-500">{order.phone_number}</div></td>
                                                <td className="p-4 font-bold text-gray-800">{formatCurrency(order.total_money)}</td>
                                                <td className="p-4"><span className={cn("px-3 py-1 text-xs rounded-full font-bold border", getStatusColor(order.order_status))}>{order.order_status}</span></td>
                                                <td className="p-4 text-gray-500 text-xs">{formatDate(order.created_date)}</td>
                                                <td className="p-4 text-right"><Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>Xem chi tiết</Button></td>
                                            </tr>
                                        )) : (<tr><td colSpan={6} className="p-8 text-center text-gray-500">Không có đơn hàng nào ở trạng thái này.</td></tr>)}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 3. FOODS SECTION */}
                {activeSection === 'foods' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between">
                            <h2 className="text-2xl font-bold">Quản lý món ăn</h2>
                            <Button onClick={() => setShowAddFoodModal(true)} className="bg-blue-600"><Plus size={18} className="mr-2"/> Thêm món</Button>
                        </div>
                        <div className="flex gap-2">
                             <input className="border p-2 rounded-lg flex-1" placeholder="Tìm tên món..." value={foodSearch} onChange={e=>setFoodSearch(e.target.value)}/>
                             <select className="border p-2 rounded-lg" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
                                 <option value="">Tất cả danh mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.cate_name}</option>)}
                             </select>
                             <Button onClick={() => loadFoods(1)} variant="secondary">Lọc</Button>
                        </div>
                        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b"><tr><th className="p-3">ID</th><th className="p-3">Ảnh</th><th className="p-3">Tên</th><th className="p-3">Giá</th><th className="p-3">TT</th><th className="p-3">Size</th><th className="p-3">Hành động</th></tr></thead>
                                <tbody className="divide-y">
                                    {foods.map(f => (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="p-3 text-gray-500">{f.id}</td>
                                            <td className="p-3"><img src={getImageUrl(f.image_url)} className="w-10 h-10 rounded border object-cover"/></td>
                                            <td className="p-3 font-medium">{f.title}</td>
                                            <td className="p-3 text-blue-600 font-bold">{formatCurrency(f.price)}</td>
                                            <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${f.availability==='Còn hàng'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{f.availability}</span></td>
                                            <td className="p-3"><Button size="sm" variant="ghost" className="h-7 text-xs border" onClick={()=>openManageSizes(f)}>Size</Button></td>
                                            <td className="p-3 flex gap-2">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={()=>handleEditFoodClick(f)}><Edit2 size={14}/></Button>
                                                <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={()=>deleteFood(f.id)}><Trash2 size={14}/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Trang {foodPage}/{totalFoodPages}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={foodPage<=1} onClick={()=>loadFoods(foodPage-1)}>Trước</Button>
                                <Button variant="outline" size="sm" disabled={foodPage>=totalFoodPages} onClick={()=>loadFoods(foodPage+1)}>Sau</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. PROMOTIONS SECTION */}
                {activeSection === 'promotions' && (
                    <div className="animate-in fade-in">
                         <div className="flex justify-between mb-4">
                            <h2 className="text-2xl font-bold">Khuyến mãi</h2>
                            <Button onClick={() => setShowAddPromoModal(true)} className="bg-blue-600"><Plus size={18} className="mr-2"/> Tạo KM</Button>
                        </div>
                        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b"><tr><th className="p-3">Tên</th><th className="p-3">Giảm</th><th className="p-3">Thời gian</th><th className="p-3">Trạng thái</th><th className="p-3 text-right">Hành động</th></tr></thead>
                                <tbody className="divide-y">
                                    {promotions.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">{p.name}</td>
                                            <td className="p-3 font-bold text-blue-600">{p.discount_type === 'PERCENT' ? `${p.discount_value}%` : formatCurrency(p.discount_value)}</td>
                                            <td className="p-3 text-xs text-gray-500">{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</td>
                                            <td className="p-3"><span className={`text-xs px-2 py-1 rounded ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{p.is_active ? 'Active' : 'Paused'}</span></td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={()=>handleEditPromoClick(p)}><Edit2 size={14}/></Button>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={()=>deletePromo(p.id)}><Trash2 size={14}/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {/* 5. STORE INFO */}
                {activeSection === 'my-store' && storeInfo && (
                     <div className="animate-in fade-in">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-2xl font-bold">Thông tin cửa hàng</h2>
                            <Button onClick={() => setShowEditStoreModal(true)} variant="outline"><Edit2 size={16} className="mr-2"/> Chỉnh sửa</Button>
                        </div>
                        <Card className="overflow-hidden border-0 shadow-md">
                            <div className="h-32 bg-blue-600 relative"></div>
                            <CardContent className="p-8 relative pt-16">
                                <img src={getImageUrl(storeInfo.image)} className="absolute -top-16 left-8 w-32 h-32 rounded-xl border-4 border-white shadow-md bg-white object-cover" />
                                <h3 className="text-2xl font-bold mb-4">{storeInfo.store_name}</h3>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="bg-gray-50 p-4 rounded-lg border"><p className="text-gray-600 whitespace-pre-line">{storeInfo.description}</p></div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm"><User className="text-blue-600" size={18}/><span className="font-medium">{storeInfo.manager?.fullname}</span></div>
                                        <div className="flex items-center gap-3 text-sm"><Store className="text-blue-600" size={18}/><span className="font-mono">ID: #{storeInfo.id}</span></div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                     </div>
                )}
            </div>
        </main>
      </div>

      {/* --- MODALS --- */}

      {/* ORDER DETAIL MODAL */}
      {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center px-6 py-4 border-b">
                      <h2 className="text-lg font-bold flex items-center gap-2">Đơn hàng #{selectedOrder.id} <span className={cn("text-xs px-2 py-0.5 rounded-full border", getStatusColor(selectedOrder.order_status))}>{selectedOrder.order_status}</span></h2>
                      <button onClick={()=>setShowOrderModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                          <div>
                              <div className="flex items-start gap-3 mb-4">
                                  <User className="text-gray-400 mt-1" size={18}/>
                                  <div><p className="text-xs font-bold text-gray-500 uppercase">Người nhận</p><p className="font-medium text-lg">{selectedOrder.receiver_name}</p><p className="text-blue-600">{selectedOrder.phone_number}</p></div>
                              </div>
                              <div className="flex items-start gap-3">
                                  <MapPin className="text-gray-400 mt-1" size={18}/>
                                  <div><p className="text-xs font-bold text-gray-500 uppercase">Địa chỉ</p><p className="text-gray-700 bg-gray-50 p-2 rounded text-sm border">{selectedOrder.ship_address}</p></div>
                              </div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                               <div className="flex justify-between text-sm"><span className="text-gray-500">Phí ship</span><span>{formatCurrency(selectedOrder.shipping_fee)}</span></div>
                               <div className="flex justify-between text-lg font-bold pt-2 border-t"><span className="text-gray-800">Tổng cộng</span><span className="text-blue-600">{formatCurrency(selectedOrder.total_money)}</span></div>
                               <div className="text-xs text-gray-400 text-right mt-1">{formatDate(selectedOrder.created_date)}</div>
                          </div>
                      </div>
                      <div>
                          <p className="text-sm font-bold text-gray-500 uppercase mb-3 border-b pb-1">Chi tiết món ăn ({selectedOrder.items.length})</p>
                          <div className="space-y-3">
                              {selectedOrder.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex gap-4 p-3 bg-white border rounded-lg hover:shadow-sm">
                                      <img src={getImageUrl(item.food.image_url)} className="w-16 h-16 object-cover rounded-md bg-gray-100" />
                                      <div className="flex-1">
                                          <p className="font-bold text-gray-800">{item.food.title}</p>
                                          <p className="text-sm text-gray-500">Số lượng: <span className="font-bold text-black">x{item.quantity}</span></p>
                                          {item.size_display && <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">{item.size_display}</p>}
                                      </div>
                                      <div className="font-bold text-gray-700">{formatCurrency(item.subtotal)}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                          <span className="font-medium text-blue-900 flex items-center gap-2"><CheckCircle size={18}/> Cập nhật trạng thái:</span>
                          <div className="flex gap-2 w-full sm:w-auto">
                              <select id="status_select" defaultValue={selectedOrder.order_status} className="border border-blue-300 rounded px-3 py-2 text-sm flex-1">
                                  {ORDER_STATUSES.filter(s => s !== 'Tất cả').map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <Button onClick={() => {
                                  const val = (document.getElementById('status_select') as HTMLSelectElement).value;
                                  updateOrderStatus(selectedOrder.id, val);
                              }} className="bg-blue-600 hover:bg-blue-700">Lưu</Button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ADD/EDIT FOOD MODALS */}
      {(showAddFoodModal || (showEditFoodModal && selectedFood)) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                   <h2 className="text-xl font-bold mb-4">{showAddFoodModal ? 'Thêm món mới' : 'Sửa món ăn'}</h2>
                   <form onSubmit={showAddFoodModal ? handleAddFood : updateFood} className="space-y-4">
                       <div><label className="block text-sm font-medium">Tên món</label><input required className="w-full border p-2 rounded" value={showAddFoodModal ? newFood.title : selectedFood!.title} onChange={e => showAddFoodModal ? setNewFood({...newFood, title: e.target.value}) : setSelectedFood({...selectedFood!, title: e.target.value})}/></div>
                       <div><label className="block text-sm font-medium">Giá</label><input type="number" required className="w-full border p-2 rounded" value={showAddFoodModal ? newFood.price : selectedFood!.price} onChange={e => showAddFoodModal ? setNewFood({...newFood, price: e.target.value}) : setSelectedFood({...selectedFood!, price: Number(e.target.value)})}/></div>
                       <div><label className="block text-sm font-medium">Danh mục</label>
                           <select className="w-full border p-2 rounded" value={showAddFoodModal ? newFood.category_id : selectedFood!.category?.id} onChange={e => showAddFoodModal ? setNewFood({...newFood, category_id: e.target.value}) : setSelectedFood({...selectedFood!, category: {id: Number(e.target.value), cate_name:''}})}>
                               <option value="">Chọn danh mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.cate_name}</option>)}
                           </select>
                       </div>
                       <div><label className="block text-sm font-medium">Mô tả</label><textarea className="w-full border p-2 rounded" rows={2} value={showAddFoodModal ? newFood.description : selectedFood!.description} onChange={e => showAddFoodModal ? setNewFood({...newFood, description: e.target.value}) : setSelectedFood({...selectedFood!, description: e.target.value})}/></div>
                       {!showAddFoodModal && (
                           <div className="mt-4 pt-4 border-t">
                               <h3 className="text-sm font-bold mb-2">Đánh giá ({foodRatings.length})</h3>
                               <div className="bg-gray-50 rounded p-2 max-h-40 overflow-y-auto space-y-2">
                                   {ratingsLoading ? (<div className="text-center text-xs text-gray-500">Đang tải đánh giá...</div>) : foodRatings.length === 0 ? (<div className="text-center text-xs text-gray-400">Chưa có đánh giá nào</div>) : (
                                       foodRatings.map((r, i) => (<div key={i} className="bg-white p-2 rounded border text-sm shadow-sm"><div className="font-bold flex justify-between items-center mb-1"><span>{r.username}</span><span className="text-yellow-500 text-xs">{r.rating} ⭐</span></div><div className="text-gray-600 text-xs">{r.content}</div></div>))
                                   )}
                               </div>
                           </div>
                       )}
                       <div className="flex justify-end gap-2 mt-4"><Button type="button" variant="ghost" onClick={()=>{setShowAddFoodModal(false); setShowEditFoodModal(false);}}>Hủy</Button><Button type="submit" className="bg-blue-600">Lưu</Button></div>
                   </form>
               </div>
          </div>
      )}
      
      {/* MANAGE SIZE MODAL */}
      {showManageSizesModal && selectedFood && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                  <div className="flex justify-between mb-4"><h3 className="font-bold">Size món: {selectedFood.title}</h3><button onClick={()=>setShowManageSizesModal(false)}><X size={20}/></button></div>
                  <form onSubmit={handleAddSize} className="flex gap-2 mb-4"><input className="border p-2 rounded flex-1 text-sm" placeholder="Tên size (VD: L)" value={newSize.size_name} onChange={e=>setNewSize({...newSize, size_name:e.target.value})} required/><input type="number" className="border p-2 rounded w-24 text-sm" placeholder="Giá thêm" value={newSize.price} onChange={e=>setNewSize({...newSize, price:e.target.value})} required/><Button type="submit" size="sm"><Plus size={16}/></Button></form>
                  <div className="space-y-2 max-h-60 overflow-y-auto">{foodSizes.map(s=><div key={s.id} className="flex justify-between items-center p-2 border rounded bg-gray-50 text-sm"><span>{s.size_name} (+{formatCurrency(s.price)})</span><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={()=>deleteSize(s.id)}><Trash2 size={14}/></Button></div>)}</div>
              </div>
          </div>
      )}

      {/* ADD/EDIT PROMOTION MODAL (UPDATED TO MATCH ADMIN STYLE) */}
       {(showAddPromoModal || (showEditPromoModal && selectedPromo)) && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                   <h2 className="text-xl font-bold mb-4">{showAddPromoModal ? 'Tạo Khuyến mãi mới' : 'Cập nhật Khuyến mãi'}</h2>
                   <form onSubmit={(e) => handlePromoSubmit(e, !showAddPromoModal)} className="space-y-4">
                       {/* Name */}
                       <div>
                           <label className="text-xs text-gray-500 block mb-1">Tên KM</label>
                           <input required className="w-full border p-2 rounded" 
                               value={showAddPromoModal ? newPromo.name : selectedPromo!.name} 
                               onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({...newPromo, name: v}) : setSelectedPromo({...selectedPromo!, name: v}) }}
                           />
                       </div>

                       {/* Type & Value */}
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs text-gray-500 block mb-1">Loại</label>
                               <select className="w-full border p-2 rounded" 
                                   value={showAddPromoModal ? newPromo.discount_type : selectedPromo!.discount_type} 
                                   onChange={e => { const v = e.target.value as any; showAddPromoModal ? setNewPromo({...newPromo, discount_type: v}) : setSelectedPromo({...selectedPromo!, discount_type: v}) }}>
                                   <option value="PERCENT">%</option>
                                   <option value="AMOUNT">VND</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-xs text-gray-500 block mb-1">Giá trị giảm</label>
                               <input required type="number" className="w-full border p-2 rounded" 
                                   value={showAddPromoModal ? newPromo.discount_value : selectedPromo!.discount_value} 
                                   onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({...newPromo, discount_value: v}) : setSelectedPromo({...selectedPromo!, discount_value: v}) }}
                               />
                           </div>
                       </div>
                       
                       {/* Min Pay & Max Discount */}
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs text-gray-500 block mb-1">Đơn tối thiểu</label>
                               <input type="number" className="w-full border p-2 rounded" placeholder="0 hoặc bỏ trống"
                                   value={(showAddPromoModal ? newPromo.minimum_pay : selectedPromo!.minimum_pay) || ''} 
                                   onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({...newPromo, minimum_pay: v}) : setSelectedPromo({...selectedPromo!, minimum_pay: v}) }}
                               />
                           </div>
                           <div>
                               <label className="text-xs text-gray-500 block mb-1">Giảm tối đa</label>
                               <input type="number" className="w-full border p-2 rounded" placeholder="0 hoặc bỏ trống"
                                   value={(showAddPromoModal ? newPromo.max_discount_amount : selectedPromo!.max_discount_amount) || ''} 
                                   onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({...newPromo, max_discount_amount: v}) : setSelectedPromo({...selectedPromo!, max_discount_amount: v}) }}
                               />
                           </div>
                       </div>

                       {/* Dates */}
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs text-gray-500 block mb-1">Bắt đầu</label>
                               <input required type="date" className="w-full border p-2 rounded" 
                                   value={showAddPromoModal ? newPromo.start_date : selectedPromo!.start_date} 
                                   onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({...newPromo, start_date: v}) : setSelectedPromo({...selectedPromo!, start_date: v}) }}
                               />
                           </div>
                           <div>
                               <label className="text-xs text-gray-500 block mb-1">Kết thúc</label>
                               <input required type="date" className="w-full border p-2 rounded" 
                                   value={showAddPromoModal ? newPromo.end_date : selectedPromo!.end_date} 
                                   onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({...newPromo, end_date: v}) : setSelectedPromo({...selectedPromo!, end_date: v}) }}
                               />
                           </div>
                       </div>

                       {/* Active Checkbox */}
                       <div className="flex items-center gap-2">
                           <input type="checkbox" id="promo_active"
                               checked={showAddPromoModal ? newPromo.is_active : selectedPromo!.is_active} 
                               onChange={e => { const v = e.target.checked; showAddPromoModal ? setNewPromo({...newPromo, is_active: v}) : setSelectedPromo({...selectedPromo!, is_active: v}) }}
                           /> 
                           <label htmlFor="promo_active" className="text-sm cursor-pointer select-none">Kích hoạt khuyến mãi này</label>
                       </div>

                       <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                           <Button type="button" variant="outline" onClick={() => { setShowAddPromoModal(false); setShowEditPromoModal(false); }}>Hủy</Button>
                           <Button type="submit" className="bg-blue-600">Lưu thay đổi</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}

    </div>
  );
};

export default StoreManager;