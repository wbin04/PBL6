import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
// Lưu ý: Nếu types/index-tuan chưa có đủ field, bạn có thể dùng interface định nghĩa bên dưới
import type { Food, Category, FoodSize, MyStore } from '@/types/index-tuan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AddressPicker from '@/components/AddressPicker';
import { cn } from "@/lib/utils";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    BarChart,
    Bar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    RadialBarChart,
    RadialBar,
} from 'recharts';
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
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Copy
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
  refund_requested?: boolean;
  refund_status?: 'Không' | 'Chờ xử lý' | 'Đã hoàn thành';
  bank_name?: string | null;
  bank_account?: string | null;
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
}

// Interface cho Rating (Mới thêm)
interface FoodRating {
  username: string;
  rating: number;
  content: string;
  created_date?: string;
}

// --- MAIN COMPONENT ---

const StoreManager: React.FC = () => {
  const navigate = useNavigate();
  const { id: storeIdParam } = useParams();
  
  // State quản lý section
  const [activeSection, setActiveSection] = useState<string>(() => localStorage.getItem('store_manager_active_section') || 'dashboard');

  // State dữ liệu chung
  const [storeInfo, setStoreInfo] = useState<MyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [storeDash, setStoreDash] = useState<any>(null);

  // --- ORDER STATE ---
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState<StoreOrder | null>(null);
  const [processingRefund, setProcessingRefund] = useState(false);
  
  // State lọc trạng thái đơn hàng
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
  const [addFoodPreview, setAddFoodPreview] = useState<string | null>(null);
  const [editFoodPreview, setEditFoodPreview] = useState<string | null>(null);
  const addImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);

  // --- FOOD RATING STATE (Mới thêm) ---
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
    name: '', discount_type: 'PERCENT' as const, discount_value: '', start_date: '', end_date: '', minimum_pay: '', max_discount_amount: '', is_active: true,
  });

  // --- STORE INFO EDIT STATE ---
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [editableStoreInfo, setEditableStoreInfo] = useState<MyStore | null>(null);
  const [storeImageFile, setStoreImageFile] = useState<File | null>(null);
  const [storeImagePreview, setStoreImagePreview] = useState<string | null>(null);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
  const storeImageRef = useRef<HTMLInputElement>(null);


  // --- INITIAL LOAD ---
  useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const user = getUser();
        const isAdminViewingStore = !!storeIdParam && user && user.role === 'Quản lý';
        const isStoreManager = user && (user.role === 'Cửa hàng' || user.role === 'Chủ cửa hàng');
        if (!isAdminViewingStore && !isStoreManager) {
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
            const url = storeIdParam ? `/stores/${storeIdParam}/` : '/stores/my_store/';
            const res = await API.get<MyStore>(url);
            setStoreInfo(res as any);
            setEditableStoreInfo(res as any);
        } catch (error) {
            console.error('Lỗi tải thông tin cửa hàng:', error);
        } finally {
            setLoading(false);
        }
    };

  const loadDashboardStats = async () => {
        if (!storeInfo?.id) return;
        try {
            const res = await API.get(`/dashboard/store/${storeInfo.id}/`);
            setStats(res.stats || {});
            setStoreDash(res);
        } catch (e) { console.error(e); }
  };

  // --- API ORDER ---
  const loadOrders = async () => {
    if (!storeInfo?.id) return;
    try {
      setLoading(true);
      // Gọi API lấy tất cả đơn hàng (hoặc phân trang tùy backend, ở đây giả sử lấy list về)
      const res = await API.get(`/stores/${storeInfo.id}/orders/`);
      // API có thể trả về array trực tiếp hoặc object { results: [] }
      const orderList = Array.isArray(res) ? res : (res.results || []);
      setOrders(orderList);
    } catch (error) {
      console.error('Lỗi tải đơn hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERING LOGIC (Trọng tâm yêu cầu) ---
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'Tất cả') {
      return orders;
    }
    return orders.filter(order => order.order_status === filterStatus);
  }, [orders, filterStatus]);

  // Danh sách các trạng thái để hiển thị Tabs
  const ORDER_STATUSES = [
    'Tất cả',
    'Chờ xác nhận',
    'Đã xác nhận',
    'Đang chuẩn bị',
    'Sẵn sàng',
    'Đang giao',
    'Đã giao',
    'Đã huỷ'
  ];

    const colorPalette = ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

    const bestSellers = storeDash?.top_foods_pie || [];
    const hourlySeries = storeDash?.hourly_revenue?.series || [];
    const sizeStackRaw = storeDash?.size_stack || [];
    const ratingRadar = storeDash?.rating_radar || [];
    const loyalCustomers = storeDash?.loyal_customers || [];
    const recentReviews = storeDash?.recent_reviews || [];
    const availability = storeDash?.availability || { in_stock: 0, total: 0 };
    const availabilityRatio = availability.total ? Math.round((availability.in_stock * 100) / availability.total) : 0;

    const sizeStackData = useMemo(() => {
        const map: Record<string, any> = {};
        sizeStackRaw.forEach((item: any) => {
            if (!map[item.food_name]) map[item.food_name] = { food_name: item.food_name };
            map[item.food_name][item.size] = item.quantity;
        });
        return Object.values(map);
    }, [sizeStackRaw]);

  // Hàm đếm số lượng đơn theo trạng thái (Optional UI enhancement)
  const getStatusCount = (status: string) => {
    if (status === 'Tất cả') return orders.length;
    return orders.filter(o => o.order_status === status).length;
  };


  // --- API FOODS ---
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
    try {
      const res = await API.get('/menu/categories/');
      setCategories(res.results || []);
    } catch (e) { console.error(e); }
  };

  // --- CRUD FOOD HANDLERS (Giữ nguyên logic cũ nhưng rút gọn) ---
    const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setNewFoodImage(file);
        setAddFoodPreview(URL.createObjectURL(file));
    };

    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditFoodImage(file);
        setEditFoodPreview(URL.createObjectURL(file));
    };

    const closeFoodModals = () => {
        setShowAddFoodModal(false);
        setShowEditFoodModal(false);
        setSelectedFood(null);
        setNewFood({ title: '', description: '', price: '', category_id: '', availability: 'Còn hàng' });
        setNewFoodImage(null);
        setEditFoodImage(null);
        setAddFoodPreview(null);
        setEditFoodPreview(null);
        if (addImageRef.current) addImageRef.current.value = '';
        if (editImageRef.current) editImageRef.current.value = '';
    };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newFood.title);
    formData.append('description', newFood.description);
    formData.append('price', newFood.price);
    formData.append('category_id', newFood.category_id);
    formData.append('availability', newFood.availability);
        if (storeInfo?.id) formData.append('store_id', String(storeInfo.id));
    if (newFoodImage) formData.append('image_file', newFoodImage);
    try {
        // Backend only allows POST on admin endpoint; let fetch set multipart boundary automatically.
        await API.post('/menu/admin/foods/', formData);
        alert('Thêm thành công!');
        setNewFood({ title: '', description: '', price: '', category_id: '', availability: 'Còn hàng' });
        setNewFoodImage(null);
        setAddFoodPreview(null);
        if (addImageRef.current) addImageRef.current.value = '';
        setShowAddFoodModal(false);
        loadFoods();
    } catch (e: any) {
        const message = e?.message || 'Lỗi không xác định';
        alert(`Lỗi: ${message}`);
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
        alert('Cập nhật thành công!');
        setEditFoodImage(null);
        setEditFoodPreview(null);
        if (editImageRef.current) editImageRef.current.value = '';
        setShowEditFoodModal(false);
        loadFoods(foodPage);
    } catch (e) { alert(`Lỗi: ${e}`); }
  };

  // --- HÀM XỬ LÝ CLICK NÚT SỬA MÓN (CÓ LOAD RATINGS) ---
  const handleEditFoodClick = async (food: Food) => {
    setSelectedFood(food);
        setEditFoodImage(null);
        setEditFoodPreview(food.image_url ? getImageUrl(food.image_url) : null);
    setShowEditFoodModal(true);
    setRatingsLoading(true);
    try {
        // Gọi API lấy đánh giá cho món ăn này
        const res = await API.get(`/ratings/?food=${food.id}`);
        setFoodRatings(res || []);
    } catch (e) {
        console.error("Lỗi tải đánh giá:", e);
        setFoodRatings([]);
    } finally {
        setRatingsLoading(false);
    }
  };

  const deleteFood = async (id: number) => {
      if(!confirm('Xóa món này?')) return;
      try { await API.delete(`/menu/store/foods/${id}/`); loadFoods(foodPage); } catch(e) { alert('Lỗi xóa'); }
  };

  // --- SIZES HANDLERS ---
  const openManageSizes = async (food: Food) => {
      setSelectedFood(food); setShowManageSizesModal(true);
      try { const res = await API.get(`/menu/store/foods/${food.id}/sizes/`); setFoodSizes(res); } catch(e) {}
  };
  const handleAddSize = async (e: React.FormEvent) => {
      e.preventDefault(); if(!selectedFood) return;
      try { await API.post(`/menu/store/foods/${selectedFood.id}/sizes/`, newSize); 
      setNewSize({size_name:'', price:''}); openManageSizes(selectedFood); } catch(e) {alert('Lỗi thêm size');}
  };
  const handleUpdateSize = async (id: number) => {
      if(!selectedFood) return;
      try { await API.put(`/menu/store/foods/${selectedFood.id}/sizes/${id}/`, editingSizeData); 
      setEditingSizeId(null); openManageSizes(selectedFood); } catch(e) {alert('Lỗi sửa size');}
  };
  const deleteSize = async (id: number) => {
      if(!selectedFood || !confirm('Xóa size?')) return;
      try { await API.delete(`/menu/store/foods/${selectedFood.id}/sizes/${id}/`); openManageSizes(selectedFood); } catch(e) {}
  };

  // --- ORDER HANDLERS ---
  const updateOrderStatus = async (
      orderId: number,
      status: string,
      extraData?: {
          refund_requested?: boolean;
          refund_status?: 'Không' | 'Chờ xử lý' | 'Đã hoàn thành';
          bank_name?: string | null;
          bank_account?: string | null;
      }
  ) => {
      if(!storeInfo) return;
      try {
          const payload: any = { order_status: status };
          if (extraData) {
              Object.entries(extraData).forEach(([key, val]) => {
                  if (val !== undefined) payload[key] = val;
              });
          }
          await API.patch(`/stores/${storeInfo.id}/orders/${orderId}/status/`, payload);
          alert('Cập nhật trạng thái thành công!');
          // Cập nhật state local
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: status, ...extraData } : o));
          if(selectedOrder) setSelectedOrder({...selectedOrder, order_status: status, ...extraData});
          setShowOrderModal(false);
      } catch (e) { alert(`Lỗi: ${e}`); }
  };

  const isCancelledStatus = (status: string) => {
      const s = (status || '').toLowerCase();
      return s.includes('huỷ') || s.includes('hủy');
  };

  const isRefundPending = (order: StoreOrder) => (
      isCancelledStatus(order.order_status) && order.payment_method && order.payment_method !== 'cash' && !!order.refund_requested
  );

  const openRefundModal = (order: StoreOrder) => {
      setRefundOrder(order);
      setShowRefundModal(true);
  };

  const copyBankAccount = async () => {
      if (!refundOrder?.bank_account) return;
      try {
          await navigator.clipboard.writeText(refundOrder.bank_account);
          alert('Đã sao chép số tài khoản');
      } catch (e) {
          alert('Không thể sao chép, vui lòng thử lại');
      }
  };

  const handleCompleteRefund = async () => {
      if (!refundOrder) return;
      try {
          setProcessingRefund(true);
          await updateOrderStatus(refundOrder.id, refundOrder.order_status, {
              refund_requested: false,
              refund_status: 'Đã hoàn thành',
          });
          setShowRefundModal(false);
          setRefundOrder(null);
      } catch (e: any) {
          alert(e?.message || 'Không thể cập nhật hoàn tiền');
      } finally {
          setProcessingRefund(false);
      }
  };

  // --- PROMOTIONS HANDLERS ---
  const loadPromotions = async () => {
    try { const res = await API.get<StorePromotion[]>('/promotions/'); setPromotions(res || []); } catch (e) { console.error(e); }
  };
  const formatDateInput = (d?: string | null) => {
      if (!d) return '';
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
  };
  const closePromoModals = () => {
      setShowAddPromoModal(false);
      setShowEditPromoModal(false);
      setSelectedPromo(null);
      setNewPromo({
        name: '', discount_type: 'PERCENT', discount_value: '', start_date: '', end_date: '', minimum_pay: '', max_discount_amount: '', is_active: true,
      });
  };
  const handlePromoSubmit = async (e: React.FormEvent, isEdit: boolean) => {
      e.preventDefault();
      const src = isEdit && selectedPromo ? selectedPromo : newPromo;
      const payload = {
          ...src,
          start_date: src.start_date ? formatDateInput(src.start_date) : '',
          end_date: src.end_date ? formatDateInput(src.end_date) : '',
          minimum_pay: src.minimum_pay || null,
          max_discount_amount: src.max_discount_amount || null,
      } as any;
      try {
          if (isEdit && selectedPromo) await API.put(`/promotions/${selectedPromo.id}/update/`, payload);
          else await API.post('/promotions/create/', payload);
          alert('Thành công!'); closePromoModals(); loadPromotions();
      } catch(e: any) { alert(`Lỗi: ${e?.message || e}`); }
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

  // --- STORE INFO HANDLERS ---
  const handleStoreFieldChange = (field: keyof MyStore, value: any) => {
      setEditableStoreInfo(prev => prev ? { ...prev, [field]: value } : prev);
  };
  const handleStoreImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setStoreImageFile(file);
      setStoreImagePreview(URL.createObjectURL(file));
  };
  const parseNullableNumber = (value: string) => {
      if (value === '' || value === null || value === undefined) return null;
      const n = parseFloat(value);
      return Number.isNaN(n) ? null : n;
  };

  const currentCoords = useMemo(() => {
      if (!editableStoreInfo) return null;
      const lat = parseNullableNumber((editableStoreInfo as any).latitude as any);
      const lng = parseNullableNumber((editableStoreInfo as any).longitude as any);
      return lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null;
  }, [editableStoreInfo]);
  const saveStoreInfo = async () => {
      if (!editableStoreInfo?.id) return;
      try {
          const commonFields = {
              store_name: editableStoreInfo.store_name,
              description: editableStoreInfo.description,
              address: (editableStoreInfo as any).address || '',
              latitude: parseNullableNumber((editableStoreInfo as any).latitude as any),
              longitude: parseNullableNumber((editableStoreInfo as any).longitude as any),
          };

          if (storeImageFile) {
              const formData = new FormData();
              Object.entries(commonFields).forEach(([k, v]) => {
                  if (v !== undefined && v !== null) formData.append(k, String(v));
              });
              formData.append('image_file', storeImageFile);
              await API.put(`/stores/${editableStoreInfo.id}/`, formData);
          } else {
              await API.put(`/stores/${editableStoreInfo.id}/`, commonFields);
          }

          // Refresh store info
          const updated = { ...storeInfo!, ...commonFields };
          if (storeImageFile && storeImagePreview) {
              updated.image = storeImagePreview;
          }
          setStoreInfo(updated as any);
          setEditableStoreInfo(prev => prev ? { ...prev, ...updated } : prev);
          setShowEditStoreModal(false);
          setStoreImageFile(null);
          setStoreImagePreview(null);
          if (storeImageRef.current) storeImageRef.current.value = '';
          alert('Cập nhật cửa hàng thành công');
      } catch (e: any) {
          alert(`Lỗi cập nhật cửa hàng: ${e?.message || e}`);
      }
  };

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
                    <div className="space-y-6 animate-in fade-in">
                        {/* Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[{ title: 'Doanh thu', val: formatCurrency(stats.revenue_today || stats.total_revenue || 0), sub: 'Hôm nay', color: 'emerald' },
                              { title: 'Đơn thành công', val: stats.delivered_orders || 0, sub: 'Đã giao', color: 'blue' },
                              { title: 'Món đang bán', val: stats.total_foods || 0, sub: 'availability', color: 'indigo' },
                              { title: 'Rating', val: `${Number(stats.average_rating || 0).toFixed(1)} / 5`, sub: `${stats.total_ratings || 0} reviews`, color: 'amber' }].map((c, idx) => (
                                <Card key={idx} className={`border-l-4 border-l-${c.color}-500 shadow-sm`}>
                                    <CardContent className="p-5">
                                        <p className="text-sm text-gray-500 uppercase font-medium">{c.title}</p>
                                        <div className="flex items-baseline gap-2 mt-2">
                                            <span className="text-2xl font-bold text-gray-800">{c.val}</span>
                                            <span className="text-xs text-gray-400">{c.sub}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <Card className="shadow-sm border-0 xl:col-span-2">
                                <CardHeader><CardTitle className="text-sm text-gray-600">Doanh thu theo giờ (Hôm nay vs Hôm qua)</CardTitle></CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={hourlySeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="hour" tickFormatter={(v)=>`${v}h`} stroke="#9ca3af" />
                                            <YAxis tickFormatter={(v)=>`${(v/1000).toFixed(0)}k`} stroke="#9ca3af" />
                                            <Tooltip formatter={(v:any)=>formatCurrency(v)} labelFormatter={(l)=>`${l}h`} />
                                            <Line type="monotone" dataKey="today" stroke="#22c55e" strokeWidth={2} dot={false} name="Hôm nay" />
                                            <Line type="monotone" dataKey="yesterday" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Hôm qua" strokeDasharray="4 4" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-0">
                                <CardHeader><CardTitle className="text-sm text-gray-600">Tỷ lệ món bán chạy</CardTitle></CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={bestSellers} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                                {bestSellers.map((_: any, idx: number) => (<Cell key={idx} fill={colorPalette[idx % colorPalette.length]} />))}
                                            </Pie>
                                            <Legend />
                                            <Tooltip formatter={(v:any)=>v} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Row 2 */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <Card className="shadow-sm border-0 xl:col-span-2">
                                <CardHeader><CardTitle className="text-sm text-gray-600">Doanh số theo Size (Stacked)</CardTitle></CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={sizeStackData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="food_name" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            {['S','M','L','XL','Mặc định'].map((key: string, idx: number)=>(
                                                <Bar key={key} dataKey={key} stackId="sizes" fill={colorPalette[idx % colorPalette.length]} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-0">
                                <CardHeader><CardTitle className="text-sm text-gray-600">Phân bố điểm đánh giá</CardTitle></CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={ratingRadar} outerRadius={90}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="score" />
                                            <PolarRadiusAxis angle={30} domain={[0, Math.max(5, ...(ratingRadar.map((r:any)=>r.count||0)))]} />
                                            <Radar name="Ratings" dataKey="count" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Tables & lists */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Card className="shadow-sm border-0 lg:col-span-2">
                                <CardHeader><CardTitle className="text-sm text-gray-600">5 đơn hàng mới nhất</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                            <tr><th className="p-3">Mã</th><th className="p-3">Khách</th><th className="p-3">Tổng</th><th className="p-3">Trạng thái</th><th className="p-3">Thời gian</th></tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(storeDash?.recent_orders || []).map((o:any) => (
                                                <tr key={o.order_id} className="hover:bg-gray-50">
                                                    <td className="p-3 font-mono text-blue-600">#{o.order_id}</td>
                                                    <td className="p-3">{o.customer}</td>
                                                    <td className="p-3 font-semibold">{formatCurrency(o.total)}</td>
                                                    <td className="p-3"><span className={cn('px-2 py-1 text-xs rounded-full border', getStatusColor(o.status))}>{o.status}</span></td>
                                                    <td className="p-3 text-xs text-gray-500">{formatDate(o.created_at)}</td>
                                                </tr>
                                            ))}
                                            {(storeDash?.recent_orders || []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">Chưa có đơn.</td></tr>}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <Card className="shadow-sm border-0">
                                    <CardHeader><CardTitle className="text-sm text-gray-600">Tồn kho (Availability)</CardTitle></CardHeader>
                                    <CardContent className="flex items-center justify-center h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={14} data={[{ name: 'Available', value: availabilityRatio }]}>
                                                <RadialBar dataKey="value" fill="#22c55e" background cornerRadius={8} />
                                                <Legend content={() => <div className="text-center text-sm text-gray-600">{availability.in_stock}/{availability.total} món còn hàng</div>} />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border-0">
                                    <CardHeader><CardTitle className="text-sm text-gray-600">Khách hàng thân thiết</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {loyalCustomers.map((c:any, idx:number) => (
                                            <div key={c.user_id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">{idx+1}</span><div>{c.fullname || 'Khách'}</div></div>
                                                <div className="text-right">
                                                    <div className="font-semibold">{c.orders} đơn</div>
                                                    <div className="text-xs text-gray-500">{formatCurrency(c.total_spent)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {loyalCustomers.length === 0 && <p className="text-center text-gray-500 text-sm">Chưa có dữ liệu</p>}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Reviews */}
                        <Card className="shadow-sm border-0">
                            <CardHeader><CardTitle className="text-sm text-gray-600">Phản hồi mới nhất</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {recentReviews.map((r:any) => (
                                    <div key={r.id} className="p-3 border rounded-lg bg-white shadow-sm">
                                        <div className="flex justify-between text-sm font-semibold text-gray-800"><span>{r.user}</span><span className="text-amber-500">{r.rating}★</span></div>
                                        <div className="text-xs text-gray-500 mt-1">{r.food}</div>
                                        <p className="text-sm text-gray-700 mt-2 line-clamp-3">{r.content || 'Không có nội dung'}</p>
                                    </div>
                                ))}
                                {recentReviews.length === 0 && <p className="text-gray-500 text-sm">Chưa có đánh giá.</p>}
                            </CardContent>
                        </Card>
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
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                                                isActive 
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105" 
                                                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                        >
                                            {status}
                                            {count > 0 && (
                                                <span className={cn("text-xs py-0.5 px-1.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700")}>
                                                    {count}
                                                </span>
                                            )}
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
                                        <tr>
                                            <th className="p-4">Mã đơn</th>
                                            <th className="p-4">Khách hàng</th>
                                            <th className="p-4">Tổng tiền</th>
                                            <th className="p-4">Trạng thái</th>
                                            <th className="p-4">Hoàn tiền</th>
                                            <th className="p-4">Thời gian</th>
                                            <th className="p-4 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-gray-50 bg-white transition-colors">
                                                <td className="p-4 font-mono font-bold text-blue-600">#{order.id}</td>
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900">{order.receiver_name}</div>
                                                    <div className="text-xs text-gray-500">{order.phone_number}</div>
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">{formatCurrency(order.total_money)}</td>
                                                <td className="p-4">
                                                    <span className={cn("px-3 py-1 text-xs rounded-full font-bold border", getStatusColor(order.order_status))}>
                                                        {order.order_status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {order.refund_status === 'Đã hoàn thành' ? (
                                                        <span className="text-xs px-2 py-1 rounded-full border border-green-200 bg-green-50 text-green-700">
                                                            Đã hoàn thành
                                                        </span>
                                                    ) : isRefundPending(order) ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                                                                {order.refund_status || 'Chờ xử lý'}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white"
                                                                onClick={() => openRefundModal(order)}
                                                            >
                                                                Hoàn tiền
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-500 text-xs">{formatDate(order.created_date)}</td>
                                                <td className="p-4 text-right">
                                                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>
                                                        Xem chi tiết
                                                    </Button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Không có đơn hàng nào ở trạng thái này.</td></tr>
                                        )}
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
                        {/* Filter Bar */}
                        <div className="flex gap-2">
                             <input className="border p-2 rounded-lg flex-1" placeholder="Tìm tên món..." value={foodSearch} onChange={e=>setFoodSearch(e.target.value)}/>
                             <select className="border p-2 rounded-lg" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
                                 <option value="">Tất cả danh mục</option>
                                 {categories.map(c=><option key={c.id} value={c.id}>{c.cate_name}</option>)}
                             </select>
                             <Button onClick={() => loadFoods(1)} variant="secondary">Lọc</Button>
                        </div>
                        {/* Food Table */}
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
                                                {/* Đã thay đổi handler onClick để gọi handleEditFoodClick */}
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={()=>handleEditFoodClick(f)}><Edit2 size={14}/></Button>
                                                <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={()=>deleteFood(f.id)}><Trash2 size={14}/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
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
                            <Button onClick={() => setShowAddPromoModal(true)} className="bg-blue-600"><Plus size={18} className="mr-2"/>Thêm khuyến mãi</Button>
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
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={()=>{setSelectedPromo(p); setShowEditPromoModal(true);}}><Edit2 size={14}/></Button>
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
                            <Button onClick={() => { setEditableStoreInfo(storeInfo); setShowEditStoreModal(true); }} variant="outline"><Edit2 size={16} className="mr-2"/> Chỉnh sửa</Button>
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
                      <h2 className="text-lg font-bold flex items-center gap-2">
                          Đơn hàng #{selectedOrder.id} 
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border", getStatusColor(selectedOrder.order_status))}>{selectedOrder.order_status}</span>
                      </h2>
                      <button onClick={()=>setShowOrderModal(false)}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                          <div>
                              <div className="flex items-start gap-3 mb-4">
                                  <User className="text-gray-400 mt-1" size={18}/>
                                  <div>
                                      <p className="text-xs font-bold text-gray-500 uppercase">Người nhận</p>
                                      <p className="font-medium text-lg">{selectedOrder.receiver_name}</p>
                                      <p className="text-blue-600">{selectedOrder.phone_number}</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-3">
                                  <MapPin className="text-gray-400 mt-1" size={18}/>
                                  <div>
                                      <p className="text-xs font-bold text-gray-500 uppercase">Địa chỉ</p>
                                      <p className="text-gray-700 bg-gray-50 p-2 rounded text-sm border">{selectedOrder.ship_address}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                               <div className="flex justify-between text-sm"><span className="text-gray-500">Phí ship</span><span>{formatCurrency(selectedOrder.shipping_fee)}</span></div>
                               <div className="flex justify-between text-lg font-bold pt-2 border-t"><span className="text-gray-800">Tổng cộng</span><span className="text-blue-600">{formatCurrency(selectedOrder.total_money)}</span></div>
                               <div className="text-xs text-gray-400 text-right mt-1">{formatDate(selectedOrder.created_date)}</div>
                               {isRefundPending(selectedOrder) && (
                                   <div className="mt-3 space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                       <div className="flex items-center gap-2">
                                           <span className="text-sm font-semibold text-amber-800">Hoàn tiền</span>
                                           <span className="text-xs px-2 py-1 rounded-full border border-amber-300 bg-white text-amber-700">
                                               {selectedOrder.refund_status || 'Chờ xử lý'}
                                           </span>
                                       </div>
                                       <div className="text-sm text-gray-700 space-y-1">
                                           <p>Ngân hàng: <span className="font-semibold">{selectedOrder.bank_name || '—'}</span></p>
                                           <p>Số tài khoản: <span className="font-semibold">{selectedOrder.bank_account || '—'}</span></p>
                                       </div>
                                       {selectedOrder.refund_status !== 'Đã hoàn thành' && (
                                           <div className="flex gap-2">
                                               <Button
                                                   size="sm"
                                                   variant="outline"
                                                   className="border-amber-400 text-amber-700 hover:bg-amber-100"
                                                   onClick={() => openRefundModal(selectedOrder)}
                                               >
                                                   Hoàn tiền
                                               </Button>
                                           </div>
                                       )}
                                   </div>
                               )}
                          </div>
                      </div>

                      {/* Items List */}
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
                      
                      {/* Action */}
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

      {/* REFUND MODAL */}
      {showRefundModal && refundOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-800">Thông tin tài khoản</h3>
                      <button onClick={() => { setShowRefundModal(false); setRefundOrder(null); }} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <p className="text-sm text-gray-500 mb-1">Tên ngân hàng</p>
                          <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-800">
                              {refundOrder.bank_name || '—'}
                          </div>
                      </div>
                      <div>
                          <p className="text-sm text-gray-500 mb-1">Số tài khoản</p>
                          <div className="flex items-center gap-2">
                              <div className="flex-1 border rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-800">
                                  {refundOrder.bank_account || '—'}
                              </div>
                              <Button variant="outline" size="sm" className="gap-2" onClick={copyBankAccount}>
                                  <Copy size={16}/> Sao chép
                              </Button>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Trạng thái hoàn tiền:</span>
                          <span className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs">{refundOrder.refund_status || 'Chờ xử lý'}</span>
                      </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                      <Button variant="ghost" onClick={() => { setShowRefundModal(false); setRefundOrder(null); }}>
                          Huỷ
                      </Button>
                      <Button
                          className="bg-amber-600 hover:bg-amber-700"
                          disabled={processingRefund}
                          onClick={handleCompleteRefund}
                      >
                          {processingRefund ? 'Đang xử lý...' : 'Hoàn tiền'}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* ADD/EDIT FOOD MODALS (Simplified for brevity, similar structure to previous) */}
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
                       <div>
                           <label className="block text-sm font-medium mb-1">Hình ảnh</label>
                           <div className="flex items-center gap-3">
                               <div className="w-24 h-24 rounded border bg-gray-50 flex items-center justify-center overflow-hidden">
                                   { (showAddFoodModal ? addFoodPreview : editFoodPreview) ? (
                                       <img src={(showAddFoodModal ? addFoodPreview : editFoodPreview) as string} alt="food" className="w-full h-full object-cover" />
                                   ) : (
                                       <span className="text-xs text-gray-400 text-center px-2">Chưa có ảnh</span>
                                   )}
                               </div>
                               <div className="flex flex-col gap-2">
                                   <input ref={showAddFoodModal ? addImageRef : editImageRef} type="file" accept="image/*" className="hidden" onChange={showAddFoodModal ? handleAddImageChange : handleEditImageChange} />
                                   <Button type="button" variant="outline" onClick={() => (showAddFoodModal ? addImageRef : editImageRef).current?.click()} className="w-fit">
                                       <Upload size={16} className="mr-2"/> Chọn ảnh
                                   </Button>
                                   {(showAddFoodModal ? addFoodPreview : editFoodPreview) && (
                                       <Button type="button" variant="ghost" className="w-fit text-red-500" onClick={() => {
                                           if (showAddFoodModal) {
                                               setNewFoodImage(null);
                                               setAddFoodPreview(null);
                                               if (addImageRef.current) addImageRef.current.value = '';
                                           } else {
                                               setEditFoodImage(null);
                                               setEditFoodPreview(selectedFood?.image_url ? getImageUrl(selectedFood.image_url) : null);
                                               if (editImageRef.current) editImageRef.current.value = '';
                                           }
                                       }}>
                                           Xóa ảnh
                                       </Button>
                                   )}
                               </div>
                           </div>
                       </div>
                       <div><label className="block text-sm font-medium">Mô tả</label><textarea className="w-full border p-2 rounded" rows={2} value={showAddFoodModal ? newFood.description : selectedFood!.description} onChange={e => showAddFoodModal ? setNewFood({...newFood, description: e.target.value}) : setSelectedFood({...selectedFood!, description: e.target.value})}/></div>
                       <div>
                           <label className="block text-sm font-medium">Tình trạng</label>
                           <select className="w-full border p-2 rounded" value={showAddFoodModal ? newFood.availability : selectedFood!.availability} onChange={e => showAddFoodModal ? setNewFood({...newFood, availability: e.target.value}) : setSelectedFood({...selectedFood!, availability: e.target.value})}>
                               <option value="Còn hàng">Còn hàng</option>
                               <option value="Hết hàng">Hết hàng</option>
                           </select>
                       </div>
                       
                       {/* --- HIỂN THỊ ĐÁNH GIÁ (Chỉ hiện khi sửa món) --- */}
                       {!showAddFoodModal && (
                           <div className="mt-4 pt-4 border-t">
                               <h3 className="text-sm font-bold mb-2">Đánh giá ({foodRatings.length})</h3>
                               <div className="bg-gray-50 rounded p-2 max-h-40 overflow-y-auto space-y-2">
                                   {ratingsLoading ? (
                                       <div className="text-center text-xs text-gray-500">Đang tải đánh giá...</div>
                                   ) : foodRatings.length === 0 ? (
                                       <div className="text-center text-xs text-gray-400">Chưa có đánh giá nào</div>
                                   ) : (
                                       foodRatings.map((r, i) => (
                                           <div key={i} className="bg-white p-2 rounded border text-sm shadow-sm">
                                               <div className="font-bold flex justify-between items-center mb-1">
                                                   <span>{r.username}</span>
                                                   <span className="text-yellow-500 text-xs">{r.rating} ⭐</span>
                                               </div>
                                               <div className="text-gray-600 text-xs">{r.content}</div>
                                           </div>
                                       ))
                                   )}
                               </div>
                           </div>
                       )}

                       <div className="flex justify-end gap-2 mt-4"><Button type="button" variant="ghost" onClick={closeFoodModals}>Hủy</Button><Button type="submit" className="bg-blue-600">Lưu</Button></div>
                   </form>
               </div>
          </div>
      )}

      {/* ADD/EDIT PROMO MODAL */}
      {(showAddPromoModal || (showEditPromoModal && selectedPromo)) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4">{showAddPromoModal ? 'Thêm khuyến mãi' : 'Sửa khuyến mãi'}</h2>
                  <form className="space-y-4" onSubmit={(e)=>handlePromoSubmit(e, !!selectedPromo)}>
                      <div>
                          <label className="block text-sm font-medium">Tên khuyến mãi</label>
                          <input className="w-full border p-2 rounded" required
                              value={showAddPromoModal ? newPromo.name : selectedPromo?.name || ''}
                              onChange={e => showAddPromoModal ? setNewPromo({...newPromo, name: e.target.value}) : setSelectedPromo({...selectedPromo!, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-sm font-medium">Loại giảm</label>
                              <select className="w-full border p-2 rounded"
                                  value={showAddPromoModal ? newPromo.discount_type : selectedPromo?.discount_type || 'PERCENT'}
                                  onChange={e => showAddPromoModal ? setNewPromo({...newPromo, discount_type: e.target.value as any}) : setSelectedPromo({...selectedPromo!, discount_type: e.target.value as any})}
                              >
                                  <option value="PERCENT">Phần trăm</option>
                                  <option value="AMOUNT">Số tiền</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium">Giá trị</label>
                              <input type="number" className="w-full border p-2 rounded" min="0" step="0.01" required
                                  value={showAddPromoModal ? newPromo.discount_value : selectedPromo?.discount_value || ''}
                                  onChange={e => showAddPromoModal ? setNewPromo({...newPromo, discount_value: e.target.value}) : setSelectedPromo({...selectedPromo!, discount_value: e.target.value})}
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-sm font-medium">Bắt đầu</label>
                              <input type="date" className="w-full border p-2 rounded" required
                                  value={showAddPromoModal ? formatDateInput(newPromo.start_date) : formatDateInput(selectedPromo?.start_date)}
                                  onChange={e => showAddPromoModal ? setNewPromo({...newPromo, start_date: e.target.value}) : setSelectedPromo({...selectedPromo!, start_date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium">Kết thúc</label>
                              <input type="date" className="w-full border p-2 rounded" required
                                  value={showAddPromoModal ? formatDateInput(newPromo.end_date) : formatDateInput(selectedPromo?.end_date)}
                                  onChange={e => showAddPromoModal ? setNewPromo({...newPromo, end_date: e.target.value}) : setSelectedPromo({...selectedPromo!, end_date: e.target.value})}
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-sm font-medium">Đơn tối thiểu</label>
                              <input type="number" className="w-full border p-2 rounded" min="0" required
                                  value={showAddPromoModal ? newPromo.minimum_pay : selectedPromo?.minimum_pay || ''}
                                  onChange={e => showAddPromoModal ? setNewPromo({...newPromo, minimum_pay: e.target.value}) : setSelectedPromo({...selectedPromo!, minimum_pay: e.target.value})}
                              />
                          </div>
                          {(showAddPromoModal ? newPromo.discount_type : selectedPromo?.discount_type) === 'PERCENT' && (
                              <div>
                                  <label className="block text-sm font-medium">Giảm tối đa</label>
                                  <input type="number" className="w-full border p-2 rounded" min="0"
                                      value={showAddPromoModal ? newPromo.max_discount_amount : selectedPromo?.max_discount_amount || ''}
                                      onChange={e => showAddPromoModal ? setNewPromo({...newPromo, max_discount_amount: e.target.value}) : setSelectedPromo({...selectedPromo!, max_discount_amount: e.target.value})}
                                  />
                              </div>
                          )}
                      </div>
                      <div>
                          <label className="block text-sm font-medium">Trạng thái</label>
                          <select className="w-full border p-2 rounded"
                              value={showAddPromoModal ? (newPromo.is_active ? 'true' : 'false') : (selectedPromo?.is_active ? 'true' : 'false')}
                              onChange={e => {
                                  const val = e.target.value === 'true';
                                  showAddPromoModal ? setNewPromo({...newPromo, is_active: val}) : setSelectedPromo({...selectedPromo!, is_active: val});
                              }}
                          >
                              <option value="true">Hoạt động</option>
                              <option value="false">Tắt</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <Button type="button" variant="ghost" onClick={closePromoModals}>Hủy</Button>
                          <Button type="submit" className="bg-blue-600">Lưu</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* EDIT STORE INFO MODAL */}
      {showEditStoreModal && editableStoreInfo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4">Chỉnh sửa thông tin cửa hàng</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium">Tên cửa hàng</label>
                          <input className="w-full border p-2 rounded" value={editableStoreInfo.store_name || ''} onChange={e=>handleStoreFieldChange('store_name', e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium">Mô tả</label>
                          <textarea className="w-full border p-2 rounded" rows={3} value={editableStoreInfo.description || ''} onChange={e=>handleStoreFieldChange('description', e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium">Ảnh cửa hàng</label>
                          <div className="flex items-center gap-3">
                              <div className="w-24 h-24 rounded border bg-gray-50 flex items-center justify-center overflow-hidden">
                                  {storeImagePreview || editableStoreInfo.image ? (
                                      <img src={storeImagePreview || getImageUrl(editableStoreInfo.image)} className="w-full h-full object-cover" />
                                  ) : (
                                      <span className="text-xs text-gray-400 text-center px-2">Chưa có ảnh</span>
                                  )}
                              </div>
                              <div className="flex flex-col gap-2">
                                  <input ref={storeImageRef} type="file" accept="image/*" className="hidden" onChange={handleStoreImageChange} />
                                  <Button type="button" variant="outline" onClick={() => storeImageRef.current?.click()} className="w-fit">
                                      <Upload size={16} className="mr-2"/> Chọn ảnh
                                  </Button>
                                  {(storeImagePreview || editableStoreInfo.image) && (
                                      <Button type="button" variant="ghost" className="w-fit text-red-500" onClick={() => {
                                          setStoreImageFile(null);
                                          setStoreImagePreview(null);
                                          if (storeImageRef.current) storeImageRef.current.value = '';
                                      }}>
                                          Xóa ảnh tạm
                                      </Button>
                                  )}
                              </div>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium">Địa chỉ</label>
                          <div className="flex gap-2">
                              <input className="w-full border p-2 rounded" value={(editableStoreInfo as any).address || ''} onChange={e=>handleStoreFieldChange('address' as any, e.target.value)} />
                              <Button type="button" variant="outline" onClick={() => setShowAddressPicker(true)} className="whitespace-nowrap">
                                  <MapPin size={16} className="mr-2" /> Chọn trên bản đồ
                              </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Chọn trên bản đồ sẽ tự động điền địa chỉ và tọa độ.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-sm font-medium">Vĩ độ</label>
                              <input type="number" className="w-full border p-2 rounded" value={(editableStoreInfo as any).latitude ?? ''} onChange={e=>handleStoreFieldChange('latitude' as any, e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium">Kinh độ</label>
                              <input type="number" className="w-full border p-2 rounded" value={(editableStoreInfo as any).longitude ?? ''} onChange={e=>handleStoreFieldChange('longitude' as any, e.target.value)} />
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                          <Button variant="ghost" onClick={() => { setShowEditStoreModal(false); setEditableStoreInfo(storeInfo); setStoreImageFile(null); setStoreImagePreview(null); setShowAddressPicker(false); if (storeImageRef.current) storeImageRef.current.value = ''; }}>Hủy</Button>
                          <Button className="bg-blue-600" onClick={saveStoreInfo}>Lưu</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <AddressPicker
          open={showAddressPicker}
          onClose={() => setShowAddressPicker(false)}
          onSelect={(data) => {
              handleStoreFieldChange('address' as any, data.address);
              handleStoreFieldChange('latitude' as any, data.latitude);
              handleStoreFieldChange('longitude' as any, data.longitude);
              setShowAddressPicker(false);
          }}
          initialAddress={(editableStoreInfo as any)?.address || ''}
          initialCoords={currentCoords}
      />
      
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
    </div>
  );
};

export default StoreManager;