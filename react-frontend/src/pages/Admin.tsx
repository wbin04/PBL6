import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, getImageUrl, formatDate, isAuthenticated, getUser } from '@/lib/api';
// Giữ nguyên import type Store
import type { Store, Food, Category, Customer, AdminOrder, ShipperApplication } from '@/types/index-tuan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
    FunnelChart,
    Funnel,
    LabelList,
} from 'recharts';
import {
    LayoutDashboard,
    Store as StoreIcon, // Alias tránh trùng tên type Store
    Users,
    Utensils,
    ShoppingBag,
    TicketPercent,
    Truck,
    BarChart3,
    PieChart as PieChartIcon,
    LogOut,
    ExternalLink,
    Plus,
    Search,
    X,
    Edit2,
    Trash2,
    Eye,
    CheckCircle,
    FileText,
    Filter,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Star,
} from 'lucide-react';

// --- INTERFACES ---
interface RevenueReportData {
    summary: {
        total_revenue: number;
        total_orders: number;
    };
    chart_data: Array<{
        date: string;
        revenue: number;
        orders?: number;
    }>;
    store_id?: number | null;
    period?: string;
}

interface TopProductItem {
    rank: number;
    food_id?: number;
    food_name: string;
    image?: string;
    price?: number;
    total_sold: number;
    revenue_contribution: number;
}

interface TopProductsReport {
    results: TopProductItem[];
    start_date: string;
    end_date: string;
    store_id?: number | null;
}

interface StoreApplication {
    id: number;
    username: string;
    email: string;
    fullname: string;
    phone_number: string;
    address: string;
    created_date: string;
}

interface AdminPromotion {
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

interface FoodRating {
    username: string;
    rating: number;
    content: string;
    created_date?: string;
}

interface FoodSize {
    id: number;
    size_name: string;
    price: string;
    food: number;
}

interface DashboardOverview {
    total_revenue: number;
    total_orders: number;
    total_customers: number;
    total_stores: number;
    total_foods: number;
}

interface RevenuePoint { label: string; revenue: number; orders: number; }
interface TopStoreItem { store_id: number; store_name: string; revenue: number; orders: number; }
interface OrderStatusItem {
    status: string;
    count: number;
    percent: number;
    [key: string]: string | number;
}
interface FunnelStep { step: string; value: number; conversion: number; }
interface HeatmapPoint { hour: number; count: number; }
interface StoreRow { store_id: number; store_name: string; address: string; image: string; total_orders: number; revenue: number; }
interface ShipperListItem {
    id: number;
    user_id?: number;
    username?: string;
    fullname?: string;
    email?: string;
    phone_number?: string;
    address?: string;
    created_date?: string;
    is_active?: boolean;
}
type ShipperApplicationView = ShipperApplication & { address?: string; created_date?: string };
interface StoreDetailStats {
    average_rating?: number;
    total_ratings?: number;
    food_count?: number;
    total_orders?: number;
}

// --- HELPER COMPONENT: PAGINATION ---
// Cho phép nhập số trang để nhảy nhanh
const PaginationControl = ({
    page,
    totalPages,
    onPageChange
}: {
    page: number,
    totalPages: number,
    onPageChange: (p: number) => void
}) => {
    const [inputPage, setInputPage] = useState(page.toString());

    // Sync local input state when prop page changes
    useEffect(() => {
        setInputPage(page.toString());
    }, [page]);

    const handleGo = () => {
        let p = parseInt(inputPage);
        if (isNaN(p)) p = 1;
        if (p < 1) p = 1;
        if (p > totalPages) p = totalPages;
        onPageChange(p);
        setInputPage(p.toString());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleGo();
    };

    return (
        <div className="flex justify-end items-center gap-2 mt-4 text-sm">
            <span className="text-gray-500 mr-2">Trang {page} / {totalPages}</span>

            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                <ChevronLeft size={16} />
            </Button>

            <div className="flex items-center gap-1 border border-orange-200 rounded bg-white px-1 h-8">
                <input
                    className="w-10 h-full text-center outline-none bg-transparent text-sm"
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    onClick={handleGo}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 px-1 uppercase"
                >
                    Go
                </button>
            </div>

            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                <ChevronRight size={16} />
            </Button>
        </div>
    );
};

const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const format = (d: Date) => d.toISOString().slice(0, 10);
    return { start: format(start), end: format(end) };
};


// --- MAIN COMPONENT ---

const Admin: React.FC = () => {
    const navigate = useNavigate();

    // --- STATE ---
    const [activeSection, setActiveSection] = useState<string>(() => localStorage.getItem('admin_active_section') || 'dashboard');

    // Dashboard
    const [stats, setStats] = useState({ totalCustomers: 0, totalFoods: 0, totalOrders: 0, totalStores: 0, totalRevenue: 0 });
    const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
    const [topStores, setTopStores] = useState<TopStoreItem[]>([]);
    const [orderStatusData, setOrderStatusData] = useState<OrderStatusItem[]>([]);
    const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
    const [storeRows, setStoreRows] = useState<StoreRow[]>([]);
    const [loading, setLoading] = useState(false);

    // Customers
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Stores
    const [stores, setStores] = useState<Store[]>([]);
    const [storePage, setStorePage] = useState(1);
    const [totalStorePages, setTotalStorePages] = useState(1);
    const [totalStoresCount, setTotalStoresCount] = useState(0);
    const [storeSearch, setStoreSearch] = useState('');
    const [newStore, setNewStore] = useState({ store_name: '', image: '', description: '', manager: '', });
    const [showAddStoreModal, setShowAddStoreModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [showEditStoreModal, setShowEditStoreModal] = useState(false);
    const [storeViewMode, setStoreViewMode] = useState<'list' | 'applications'>('list');
    const [applications, setApplications] = useState<StoreApplication[]>([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsPage, setApplicationsPage] = useState(1);
    const [totalApplicationsPages, setTotalApplicationsPages] = useState(1);
    const [totalApplications, setTotalApplications] = useState(0);
    const [applicationsSearch, setApplicationsSearch] = useState('');

    // Shippers
    const [shipperApps, setShipperApps] = useState<ShipperApplicationView[]>([]);
    const [shipperLoading, setShipperLoading] = useState(false);
    const [shipperPage, setShipperPage] = useState(1);
    const [totalShipperPages, setTotalShipperPages] = useState(1);
    const [totalShipperApps, setTotalShipperApps] = useState(0);
    const [shipperViewMode, setShipperViewMode] = useState<'list' | 'applications'>('list');
    const [shipperSearch, setShipperSearch] = useState('');
    const [shipperAppSearch, setShipperAppSearch] = useState('');
    const [shippers, setShippers] = useState<ShipperListItem[]>([]);
    const [shipperListLoading, setShipperListLoading] = useState(false);
    const [shipperListPage, setShipperListPage] = useState(1);
    const [totalShipperListPages, setTotalShipperListPages] = useState(1);
    const [totalShippers, setTotalShippers] = useState(0);
    const [shipperStatusUpdating, setShipperStatusUpdating] = useState<number | null>(null);
    const [customerStatusUpdating, setCustomerStatusUpdating] = useState<number | null>(null);
    const [storeStatusUpdating, setStoreStatusUpdating] = useState<number | null>(null);
    const [storeDetailModalOpen, setStoreDetailModalOpen] = useState(false);
    const [storeDetailLoading, setStoreDetailLoading] = useState(false);
    const [storeDetailInfo, setStoreDetailInfo] = useState<Store | null>(null);
    const [storeDetailStats, setStoreDetailStats] = useState<StoreDetailStats>({});
    const [storeDetailFoods, setStoreDetailFoods] = useState<Food[]>([]);
    const [storeDetailCategories, setStoreDetailCategories] = useState<string[]>([]);
    const [foodDetailModalOpen, setFoodDetailModalOpen] = useState(false);
    const [foodDetail, setFoodDetail] = useState<Food | null>(null);
    const [foodDetailRatings, setFoodDetailRatings] = useState<FoodRating[]>([]);
    const [foodDetailLoading, setFoodDetailLoading] = useState(false);

    // Foods
    const [foods, setFoods] = useState<Food[]>([]);
    const [showAddFoodModal, setShowAddFoodModal] = useState(false);
    const [newFood, setNewFood] = useState({ title: '', description: '', price: '', category_id: '', store_id: '', availability: 'Còn hàng', });
    const [foodSearch, setFoodSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [storeFilter, setStoreFilter] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [foodPage, setFoodPage] = useState(1);
    const [totalFoodPages, setTotalFoodPages] = useState(1);
    const [totalFoods, setTotalFoods] = useState(0);
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);
    const [showEditFoodModal, setShowEditFoodModal] = useState(false);
    const [showManageSizesModal, setShowManageSizesModal] = useState(false);
    const [foodSizes, setFoodSizes] = useState<FoodSize[]>([]);
    const [newSize, setNewSize] = useState({ size_name: '', price: '' });
    const [editingSizeId, setEditingSizeId] = useState<number | null>(null);
    const [editingSizeData, setEditingSizeData] = useState({ size_name: '', price: '' });
    const [foodRatings, setFoodRatings] = useState<FoodRating[]>([]);
    const [ratingsLoading, setRatingsLoading] = useState(false);

    // Orders
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [orderPage, setOrderPage] = useState(1);
    const [totalOrderPages, setTotalOrderPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);

    // Reports
    const monthRange = getCurrentMonthRange();
    const [reportData, setReportData] = useState<RevenueReportData | null>(null);
    const [reportFilters, setReportFilters] = useState({ start_date: monthRange.start, end_date: monthRange.end, period: 'day', store_id: '', });
    const [reportLoading, setReportLoading] = useState(false);
    const [popularFoodsData, setPopularFoodsData] = useState<TopProductsReport | null>(null);
    const [popularFoodsFilters, setPopularFoodsFilters] = useState({ start_date: monthRange.start, end_date: monthRange.end, limit: '10', });
    const [popularFoodsLoading, setPopularFoodsLoading] = useState(false);

    // Promotions
    const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
    const [promoLoading, setPromoLoading] = useState(false);
    const [showAddPromoModal, setShowAddPromoModal] = useState(false);
    const [showEditPromoModal, setShowEditPromoModal] = useState(false);
    const [newPromo, setNewPromo] = useState({ name: '', discount_type: 'PERCENT' as const, discount_value: '', start_date: '', end_date: '', minimum_pay: '', max_discount_amount: '', is_active: true, scope: 'SYSTEM' as const, store_id: 0 });
    const [selectedPromo, setSelectedPromo] = useState<AdminPromotion | null>(null);

    // --- EFFECTS ---

    useEffect(() => {
        if (!isAuthenticated()) { alert('Vui lòng đăng nhập'); navigate('/login'); return; }
        checkAdminAccess();
    }, []);

    useEffect(() => {
        try { localStorage.setItem('admin_active_section', activeSection); } catch { }
        switch (activeSection) {
            case 'dashboard': loadDashboard(); break;
            case 'customers': loadCustomers(1, ''); break;
            case 'shippers':
                setShipperViewMode('list');
                setShipperSearch('');
                setShipperAppSearch('');
                loadShippers(1, '');
                break;
            case 'foods': loadCategories(); loadFoods(1); if (stores.length === 0) loadStores(); break;
            case 'orders': loadOrders(1); break;
            case 'stores': setStoreViewMode('list'); loadStores(); break;
            case 'promotions': loadPromotions(); break;
            case 'revenueReport': if (stores.length === 0) loadStores(); loadRevenueReport(); break;
            case 'popularFoodsReport': loadPopularFoodsReport(); break;
            default: loadDashboard();
        }
    }, [activeSection]);

    const checkAdminAccess = async () => {
        try { const user = getUser(); if (!user || user.role !== 'Quản lý') { alert('Không có quyền Admin!'); navigate('/'); } }
        catch (e) { navigate('/login'); }
    };

    // API Calls
    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [overview, revenueChart, topStoresRes, orderStatusRes, funnelRes, heatmapRes, storesTableRes] = await Promise.all([
                API.get('/admin/dashboard/overview/') as Promise<DashboardOverview>,
                API.get('/admin/dashboard/revenue-chart/'),
                API.get('/admin/dashboard/top-stores/'),
                API.get('/admin/dashboard/order-status/'),
                API.get('/admin/dashboard/funnel/'),
                API.get('/admin/dashboard/order-heatmap/'),
                API.get('/admin/dashboard/stores-table/'),
            ]);

            setStats({
                totalCustomers: overview.total_customers || 0,
                totalFoods: overview.total_foods || 0,
                totalOrders: overview.total_orders || 0,
                totalStores: overview.total_stores || 0,
                totalRevenue: overview.total_revenue || 0,
            });

            setRevenueSeries((revenueChart.data || []).map((p: any) => ({
                label: p.label,
                revenue: Number(p.revenue || 0),
                orders: Number(p.orders || 0),
            })));

            setTopStores((topStoresRes.results || []).map((s: any) => ({
                store_id: s.store_id,
                store_name: s.store_name,
                revenue: Number(s.revenue || 0),
                orders: Number(s.orders || 0),
            })));

            setOrderStatusData((orderStatusRes.statuses || []).map((s: any) => ({
                status: s.status,
                count: Number(s.count || 0),
                percent: Number(s.percent || 0),
            })));

            setFunnelData((funnelRes.steps || []).map((s: any) => ({
                step: s.step,
                value: Number(s.value || 0),
                conversion: Number(s.conversion || 0),
            })));

            setHeatmapData((heatmapRes.data || []).map((p: any) => ({
                hour: Number(p.hour || 0),
                count: Number(p.count || 0),
            })));

            setStoreRows((storesTableRes.results || []).map((s: any) => ({
                store_id: s.store_id,
                store_name: s.store_name,
                address: s.address,
                image: s.image,
                total_orders: Number(s.total_orders || 0),
                revenue: Number(s.revenue || 0),
            })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const loadStores = async (page = 1, s = '') => {
        setLoading(true);
        try {
            const res = await API.get(`/stores/?page=${page}&search=${encodeURIComponent(s)}`);
            const results = res.results || res.stores || res.data?.results || (Array.isArray(res) ? res : []);
            const sorted = [...results].sort((a: any, b: any) => a.id - b.id);
            const count = res.count || res.total_stores || res.data?.count || results.length || 0;
            const pageSize = res.page_size || (Array.isArray(results) ? results.length : (res.results?.length || 10));
            const totalPages = res.total_pages || res.data?.total_pages || (pageSize ? Math.max(1, Math.ceil(count / pageSize)) : 1);
            setStores(sorted);
            setStorePage(page);
            setTotalStorePages(totalPages);
            setTotalStoresCount(count);
            setStoreSearch(s);
        } catch (e) {
            console.error(e);
            setStores([]);
        } finally {
            setLoading(false);
        }
    };
    const handleAddStore = async () => { try { await API.post('/stores/', newStore); alert('Thành công'); setShowAddStoreModal(false); loadStores(); } catch (e) { alert('Lỗi'); } };
    const toggleStoreManagerStatus = async (store: Store) => {
        const managerId = (store as any).manager_id || (store as any).manager_user_id || store.manager;
        if (!managerId) { alert('Không tìm thấy ID quản lý để khoá/mở'); return; }
        try {
            setStoreStatusUpdating(store.id);
            const res: any = await API.post(`/auth/admin/customers/${managerId}/toggle-status/`);
            const updated = res?.customer || res?.data?.customer || res;
            const nextActive = updated?.is_active !== undefined ? updated.is_active : undefined;
            setStores(prev => prev.map(s => s.id === store.id ? { ...s, is_active: nextActive !== undefined ? nextActive : !(s as any).is_active } : s));
            alert(res?.message || res?.data?.message || 'Đã thay đổi trạng thái tài khoản quản lý');
        } catch (e) { alert('Không thể cập nhật trạng thái tài khoản'); }
        finally { setStoreStatusUpdating(null); }
    };
    const viewStoreDetail = async (id: number) => { try { const res = await API.get(`/stores/${id}/`); setSelectedStore(res); setShowEditStoreModal(true); } catch (e) { } };
    const updateStore = async () => { if (!selectedStore) return; try { await API.put(`/stores/${selectedStore.id}/`, selectedStore); alert('Xong'); setShowEditStoreModal(false); loadStores(); } catch (e) { } };
    const deleteStore = async (id: number) => { if (!confirm('Xóa?')) return; try { await API.delete(`/stores/${id}/`); loadStores(); } catch (e) { } };
    const openStoreDetail = async (storeId: number) => {
        setStoreDetailModalOpen(true);
        setStoreDetailLoading(true);
        setStoreDetailInfo(null);
        setStoreDetailStats({});
        setStoreDetailFoods([]);
        setStoreDetailCategories([]);
        try {
            const [infoRes, statsRes] = await Promise.allSettled([
                API.get(`/stores/${storeId}/`),
                API.get(`/dashboard/store/${storeId}/`),
            ]);

            if (infoRes.status === 'fulfilled') {
                setStoreDetailInfo(infoRes.value as Store);
            }

            if (statsRes.status === 'fulfilled') {
                setStoreDetailStats((statsRes.value as any)?.stats || (statsRes.value as any) || {});
            }

            // Fetch total orders for this store (admin orders endpoint should return count)
            try {
                const ordersRes = await API.get(`/orders/admin/?store=${storeId}&page=1&page_size=1`);
                const totalOrders = ordersRes.total_orders || ordersRes.count || ordersRes.data?.total_orders || ordersRes.data?.count || 0;
                setStoreDetailStats(prev => ({ ...prev, total_orders: totalOrders }));
            } catch (orderErr) {
                console.error('Load orders count for store failed', orderErr);
            }

            // Fetch all foods across pages (backend default page size ~10)
            const fetchAllFoods = async () => {
                let page = 1;
                let totalPages = 1;
                const all: Food[] = [];
                do {
                    const res = await API.get(`/menu/admin/foods/?store=${storeId}&page=${page}&page_size=100`);
                    const foodsList = res.foods || res.results || res.data?.foods || res.data?.results || [];
                    const count = res.total_foods || res.count || res.data?.total_foods || res.data?.count || 0;
                    const pageSize = res.page_size || res.data?.page_size || (Array.isArray(foodsList) && foodsList.length ? foodsList.length : 10);
                    totalPages = res.total_pages || res.data?.total_pages || res.num_pages || (pageSize ? Math.max(1, Math.ceil(count / pageSize)) : 1);
                    all.push(...foodsList);
                    page += 1;
                } while (page <= totalPages);
                return all;
            };

            try {
                const foodsList = await fetchAllFoods();
                const categories = Array.from(new Set(
                    foodsList
                        .map((f: any) => f?.category?.cate_name || f?.category?.name || f?.category || '')
                        .filter((c: string) => c)
                )) as string[];
                setStoreDetailFoods(foodsList as Food[]);
                setStoreDetailCategories(categories);
            } catch (foodErr) {
                console.error('Load foods for store failed', foodErr);
            }

            if (infoRes.status === 'rejected' && statsRes.status === 'rejected') {
                alert('Không thể tải chi tiết cửa hàng');
                setStoreDetailModalOpen(false);
            }
        } catch (e) {
            console.error('Store detail load error', e);
            alert('Không thể tải chi tiết cửa hàng');
            setStoreDetailModalOpen(false);
        } finally {
            setStoreDetailLoading(false);
        }
    };
    const closeStoreDetail = () => {
        setStoreDetailModalOpen(false);
        setStoreDetailInfo(null);
        setStoreDetailStats({});
        setStoreDetailFoods([]);
        setStoreDetailCategories([]);
    };
    const openFoodDetailModal = async (food: Food) => {
        setFoodDetailModalOpen(true);
        setFoodDetail(food);
        setFoodDetailRatings([]);
        setFoodDetailLoading(true);
        try {
            const detail = await API.get(`/menu/admin/foods/${food.id}/`);
            setFoodDetail((detail as Food) || food);
            const ratingsRes = await API.get(`/ratings/?food=${food.id}`);
            setFoodDetailRatings(ratingsRes?.results || ratingsRes || []);
        } catch (e) {
            alert('Không thể tải chi tiết món ăn');
        } finally {
            setFoodDetailLoading(false);
        }
    };
    const closeFoodDetailModal = () => {
        setFoodDetailModalOpen(false);
        setFoodDetail(null);
        setFoodDetailRatings([]);
    };

    // Applications
    const loadStoreApplications = async (page = 1, s = '') => { setApplicationsLoading(true); try { const res = await API.get(`/auth/store/applications/?page=${page}&search=${s}`); setApplications(res.applications || []); setTotalApplicationsPages(res.total_pages || 1); setApplicationsPage(page); setTotalApplications(res.total_applications || 0); } catch (e) { } finally { setApplicationsLoading(false); } };
    const handleApproveApplication = async (id: number) => { if (!confirm('Duyệt?')) return; await API.post(`/auth/store/applications/${id}/approve/`); loadStoreApplications(applicationsPage, applicationsSearch); };
    const handleRejectApplication = async (id: number) => { if (!confirm('Từ chối?')) return; await API.post(`/auth/store/applications/${id}/reject/`); loadStoreApplications(applicationsPage, applicationsSearch); };

    // Shippers
    const normalizeShippers = (items: any[]): ShipperListItem[] => {
        return (items || []).map((item: any) => {
            const user = item.user || {};
            const active = item.is_active ?? user.is_active ?? true;
            return {
                id: item.id || user.id,
                user_id: item.user_id || user.id || item.id,
                username: user.username || item.username,
                fullname: user.fullname || item.fullname || user.name,
                email: user.email || item.email,
                phone_number: user.phone_number || user.phone || item.phone_number || item.phone,
                address: user.address || item.address,
                created_date: item.created_date || user.created_date || item.created_at,
                is_active: typeof active === 'boolean' ? active : true,
            } as ShipperListItem;
        });
    };

    const loadShippers = async (page = 1, s = '') => {
        setShipperListLoading(true);
        try {
            const res = await API.get(`/shipper/shippers/?page=${page}&search=${encodeURIComponent(s)}`);
            const results = res.results || res.shippers || res.data?.results || (Array.isArray(res) ? res : []);
            const normalized = normalizeShippers(results || []).sort((a: any, b: any) => a.id - b.id);
            const total = res.count || res.total_shippers || normalized.length || 0;
            const pageSize = (results && results.length) ? results.length : (res.per_page || 10);
            const totalPages = res.total_pages || (pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);
            setShippers(normalized);
            setTotalShippers(total);
            setTotalShipperListPages(totalPages);
            setShipperListPage(page);
            setShipperSearch(s);
        } catch (e) { console.error(e); setShippers([]); }
        finally { setShipperListLoading(false); }
    };

    const loadShipperApplications = async (page = 1, s = '') => { setShipperLoading(true); try { const res = await API.get(`/auth/shipper/applications/?page=${page}&search=${s}`); setShipperApps((res.applications as ShipperApplicationView[]) || []); setTotalShipperPages(res.total_pages || 1); setShipperPage(page); setTotalShipperApps(res.total_applications || 0); setShipperAppSearch(s); } catch (e) { } finally { setShipperLoading(false); } };
    const handleApproveShipper = async (id: number) => { if (!confirm('Duyệt?')) return; await API.post(`/auth/shipper/applications/${id}/approve/`); loadShipperApplications(shipperPage, shipperAppSearch); loadShippers(shipperListPage, shipperSearch); };
    const handleRejectShipper = async (id: number) => { if (!confirm('Từ chối?')) return; await API.post(`/auth/shipper/applications/${id}/reject/`); loadShipperApplications(shipperPage, shipperAppSearch); };
    const handleToggleShipperStatus = async (userId: number) => {
        if (!userId) return;
        try {
            setShipperStatusUpdating(userId);
            const res = await API.post(`/auth/admin/customers/${userId}/toggle-status/`);
            const updated = (res as any).customer || (res as any).data?.customer || res;
            const isActive = updated?.is_active ?? updated?.user?.is_active;
            setShippers(prev => prev.map(s => (s.user_id === userId || s.id === userId) ? { ...s, is_active: typeof isActive === 'boolean' ? isActive : !s.is_active } : s));
            alert('Đã cập nhật trạng thái tài khoản');
        } catch (e) { alert('Không thể cập nhật trạng thái'); }
        finally { setShipperStatusUpdating(null); }
    };

    // Customers
    const loadCustomers = async (page = 1, s = '') => { setLoading(true); try { const res = await API.get(`/auth/admin/customers/?page=${page}&search=${s}`); const list = res.customers || []; setCustomers([...list].sort((a: any, b: any) => a.id - b.id)); setTotalPages(res.total_pages || 1); setCurrentPage(page); setTotalCustomers(res.total_customers || 0); } catch (e) { } finally { setLoading(false); } };
    const viewCustomerDetail = async (id: number) => { const res = await API.get(`/auth/admin/customers/${id}/`); setSelectedCustomer(res); setShowCustomerModal(true); };
    const updateCustomer = async () => { if (!selectedCustomer) return; await API.put(`/auth/admin/customers/${selectedCustomer.id}/`, selectedCustomer); alert('Xong'); setShowCustomerModal(false); loadCustomers(currentPage, search); };
    const toggleCustomerStatus = async (id: number) => {
        if (!id) return;
        try {
            setCustomerStatusUpdating(id);
            const res: any = await API.post(`/auth/admin/customers/${id}/toggle-status/`);
            const updated = res?.customer || res?.data?.customer || res;
            const nextActive = updated?.is_active !== undefined ? updated.is_active : undefined;
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, is_active: nextActive !== undefined ? nextActive : !(c as any).is_active } : c));
            alert(res?.message || res?.data?.message || 'Đã thay đổi trạng thái khách hàng');
        } catch (e) { alert('Không thể cập nhật trạng thái'); }
        finally { setCustomerStatusUpdating(null); }
    };

    // Foods
    const loadCategories = async () => { const res = await API.get('/menu/categories/'); setCategories(res.results || []); };
    const loadFoods = async (page = 1) => { setLoading(true); try { const res = await API.get(`/menu/admin/foods/?page=${page}&search=${foodSearch}&category=${categoryFilter}&store=${storeFilter}`); const list = res.foods || []; setFoods([...list].sort((a: any, b: any) => a.id - b.id)); setFoodPage(page); setTotalFoodPages(res.total_pages || 1); setTotalFoods(res.total_foods || 0); } catch (e) { } finally { setLoading(false); } };
    const handleAddFood = async () => { await API.post('/menu/admin/foods/', newFood); alert('Xong'); setShowAddFoodModal(false); loadFoods(); };
    const viewFoodDetail = async (id: number) => { const res = await API.get(`/menu/admin/foods/${id}/`); setSelectedFood(res); const ratings = await API.get(`/ratings/?food=${id}`); setFoodRatings(ratings || []); setShowEditFoodModal(true); };
    const updateFood = async () => { if (!selectedFood) return; await API.put(`/menu/admin/foods/${selectedFood.id}/`, selectedFood); alert('Xong'); setShowEditFoodModal(false); loadFoods(foodPage); };
    const deleteFood = async (id: number) => { if (!confirm('Xóa?')) return; await API.delete(`/menu/admin/foods/${id}/`); loadFoods(foodPage); };

    // Food Sizes
    const openManageSizesModal = async (f: Food) => { setSelectedFood(f); const res = await API.get(`/menu/admin/foods/${f.id}/sizes/`); setFoodSizes(res); setNewSize({ size_name: '', price: '' }); setEditingSizeId(null); setShowManageSizesModal(true); };
    const handleAddSize = async (e: any) => { e.preventDefault(); await API.post(`/menu/admin/foods/${selectedFood?.id}/sizes/`, newSize); openManageSizesModal(selectedFood!); };
    const handleUpdateSize = async (id: number) => { await API.put(`/menu/admin/foods/${selectedFood?.id}/sizes/${id}/`, editingSizeData); setEditingSizeId(null); openManageSizesModal(selectedFood!); };
    const deleteSize = async (id: number) => { if (!confirm('Xóa?')) return; await API.delete(`/menu/admin/foods/${selectedFood?.id}/sizes/${id}/`); openManageSizesModal(selectedFood!); };

    // Orders
    const loadOrders = async (page = 1) => { setLoading(true); try { const res = await API.get(`/orders/admin/?page=${page}&search=${orderSearch}&status=${orderStatus}`); const list = res.orders || []; setOrders([...list].sort((a: any, b: any) => b.id - a.id)); setOrderPage(page); setTotalOrderPages(res.total_pages || 1); setTotalOrders(res.total_orders || 0); } catch (e) { } finally { setLoading(false); } };
    const viewOrderDetail = async (id: number) => { const res = await API.get(`/orders/admin/${id}/`); setSelectedOrder(res); setShowOrderModal(true); };
    const updateOrderStatus = async (id: number, st: string) => { await API.patch(`/orders/admin/${id}/status/`, { order_status: st }); alert('Xong'); setShowOrderModal(false); loadOrders(orderPage); };

    // Promotions
    const loadPromotions = async () => { setPromoLoading(true); try { const res = await API.get('/promotions/admin/'); setPromotions(res || []); } catch (e) { } finally { setPromoLoading(false); } };

    const handleAddPromo = async (e: any) => {
        e.preventDefault();

        const payload = {
            ...newPromo,
            discount_value: Number(newPromo.discount_value) || 0,
            minimum_pay:
                newPromo.minimum_pay === '' || newPromo.minimum_pay === null
                    ? null
                    : Number(newPromo.minimum_pay),
            max_discount_amount:
                newPromo.max_discount_amount === '' || newPromo.max_discount_amount === null
                    ? null
                    : Number(newPromo.max_discount_amount),
            scope: 'SYSTEM',
            store_id: null,
        };

        try {
            await API.post('/promotions/admin/create/', payload);
            alert('Tạo khuyến mãi thành công');
            setShowAddPromoModal(false);
            loadPromotions();
            // Reset form
            setNewPromo({
                name: '',
                discount_type: 'PERCENT',
                discount_value: '',
                start_date: '',
                end_date: '',
                minimum_pay: '',
                max_discount_amount: '',
                is_active: true,
                scope: 'SYSTEM' as any,
                store_id: 0 as any
            } as any);
        } catch (error: any) {
            console.error("Lỗi tạo KM:", error);
            const msg = error.response?.data?.minimum_pay
                ? `Lỗi: Đơn tối thiểu ${error.response.data.minimum_pay}`
                : error.response?.data?.max_discount_amount
                ? `Lỗi: Giảm tối đa ${error.response.data.max_discount_amount}`
                : 'Có lỗi xảy ra khi tạo khuyến mãi';
            alert(msg);
        }
    };

    const openEditPromoModal = (p: AdminPromotion) => {
        setSelectedPromo({
            ...p,
            start_date: p.start_date.substring(0, 10),
            end_date: p.end_date.substring(0, 10),
            minimum_pay: p.minimum_pay || '',
            max_discount_amount: p.max_discount_amount || ''
        });
        setShowEditPromoModal(true);
    };

    const handleUpdatePromo = async (e: any) => {
        e.preventDefault();
        if (!selectedPromo) return;

        const payload = {
            ...selectedPromo,
            discount_value: Number(selectedPromo.discount_value) || 0,
            minimum_pay:
                selectedPromo.minimum_pay === '' || selectedPromo.minimum_pay === null
                    ? null
                    : Number(selectedPromo.minimum_pay),
            max_discount_amount:
                selectedPromo.max_discount_amount === '' || selectedPromo.max_discount_amount === null
                    ? null
                    : Number(selectedPromo.max_discount_amount),
        };

        try {
            await API.put(`/promotions/admin/${selectedPromo.id}/update/`, payload);
            alert('Cập nhật thành công');
            setShowEditPromoModal(false);
            loadPromotions();
        } catch (error: any) {
            console.error('Lỗi cập nhật KM:', error);
            const msg = error.response?.data?.minimum_pay
                ? `Lỗi: Đơn tối thiểu ${error.response.data.minimum_pay}`
                : error.response?.data?.max_discount_amount
                ? `Lỗi: Giảm tối đa ${error.response.data.max_discount_amount}`
                : 'Lỗi cập nhật';
            alert(msg);
        }
    };
    const deletePromo = async (id: number) => { if (!confirm('Xóa?')) return; await API.delete(`/promotions/admin/${id}/delete/`); loadPromotions(); };

    // Reports
    const loadRevenueReport = async () => {
        setReportLoading(true);
        try {
            const res = await API.get(`/admin/dashboard/stats/revenue/?start_date=${reportFilters.start_date}&end_date=${reportFilters.end_date}&period=${reportFilters.period}${reportFilters.store_id ? `&store_id=${reportFilters.store_id}` : ''}`);
            setReportData(res);
        } catch (e) { alert('Lỗi tải báo cáo'); } finally { setReportLoading(false); }
    };
    const loadPopularFoodsReport = async () => {
        setPopularFoodsLoading(true);
        try {
            const res = await API.get(`/admin/dashboard/stats/top-products/?start_date=${popularFoodsFilters.start_date}&end_date=${popularFoodsFilters.end_date}&limit=${popularFoodsFilters.limit}${reportFilters.store_id ? `&store_id=${reportFilters.store_id}` : ''}`);
            setPopularFoodsData(res);
        } catch (e) { alert('Lỗi tải báo cáo'); } finally { setPopularFoodsLoading(false); }
    };

    // Helpers
    const formatCurrency = (amount: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
    const logout = () => { localStorage.clear(); navigate('/login'); };

    const heatColor = (count: number) => {
        if (count === 0) return '#f5f5f4';
        if (count < 3) return '#fed7aa';
        if (count < 6) return '#fdba74';
        if (count < 10) return '#fb923c';
        return '#ea580c';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Chờ xác nhận': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Đã xác nhận': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Đang chuẩn bị': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Sẵn sàng': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'Đang giao': return 'bg-orange-200 text-orange-900 border-orange-300';
            case 'Đã giao': return 'bg-green-100 text-green-800 border-green-200';
            case 'Đã huỷ': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-orange-50 text-amber-800 border-orange-100';
        }
    };

    const pieColors: Record<string, string> = {
        'Đã giao': '#ea580c',
        'Đang giao': '#fb923c',
        'Đã xác nhận': '#fdba74',
        'Chờ xác nhận': '#fef08a',
        'Đã huỷ': '#ef4444',
    };

    const SidebarItem = ({ id, label, icon: Icon }: any) => (
        <button onClick={() => { setActiveSection(id); }}
            className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all",
                activeSection === id ? "bg-orange-600 text-white shadow-md" : "text-amber-800/80 hover:bg-orange-50 hover:text-orange-800")}>
            <Icon size={18} /> {label}
        </button>
    );

    // --- RENDER ---
    return (
        <div className="flex h-screen bg-[#fffaf3]">
            {/* SIDEBAR */}
            <aside className="w-64 bg-white border-r border-orange-100 shadow-sm hidden md:flex flex-col z-20">
                <div className="p-6 border-b border-orange-100 flex justify-center items-center gap-2">
                    <div className="bg-orange-600 text-white p-1 rounded-lg"><LayoutDashboard size={20} /></div>
                    <h1 className="text-xl font-bold text-[#391713]">ADMIN PANEL</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
                    <p className="text-xs font-bold text-orange-700 uppercase px-4 mb-2 mt-2">Tổng quan</p>
                    <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />

                    <p className="text-xs font-bold text-orange-700 uppercase px-4 mt-6 mb-2">Quản lý</p>
                    <SidebarItem id="customers" label="Khách hàng" icon={Users} />
                    <SidebarItem id="stores" label="Cửa hàng" icon={StoreIcon} />
                    <SidebarItem id="shippers" label="Shipper" icon={Truck} />
                    {/* <SidebarItem id="foods" label="Món ăn" icon={Utensils} /> */}
                    <SidebarItem id="orders" label="Đơn hàng" icon={ShoppingBag} />
                    <SidebarItem id="promotions" label="Khuyến mãi" icon={TicketPercent} />

                    <p className="text-xs font-bold text-orange-700 uppercase px-4 mt-6 mb-2">Báo cáo</p>
                    <SidebarItem id="revenueReport" label="Doanh thu" icon={BarChart3} />
                    <SidebarItem id="popularFoodsReport" label="Món bán chạy" icon={PieChartIcon} />
                </nav>
                <div className="p-4 border-t">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">A</div>
                        <div className="text-sm font-medium">Administrator</div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* HEADER */}
                <header className="h-16 bg-white border-b border-orange-100 shadow-sm flex items-center justify-between px-6 z-10">
                    <h2 className="text-lg font-bold text-[#391713] capitalize">{activeSection.replace(/([A-Z])/g, ' $1').trim()}</h2>
                    <div className="flex gap-4">
                        <Button variant="ghost" className="text-orange-700 hover:bg-orange-50" onClick={() => navigate('/')}> <ExternalLink size={16} className="mr-2" /> Trang chủ</Button>
                        <Button variant="ghost" className="text-orange-700 hover:bg-orange-100" onClick={logout}> <LogOut size={16} className="mr-2" /> Đăng xuất</Button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-[#fff7ec] p-6">
                    <div className="max-w-7xl mx-auto pb-10">

                        {/* 1. DASHBOARD */}
                        {activeSection === 'dashboard' && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {[{ title: 'Tổng doanh thu', val: formatCurrency(stats.totalRevenue), icon: BarChart3, accentBg: 'bg-orange-100', accentText: 'text-orange-700' },
                                    { title: 'Đơn hàng', val: stats.totalOrders, icon: ShoppingBag, accentBg: 'bg-orange-50', accentText: 'text-orange-700' },
                                    { title: 'Cửa hàng', val: stats.totalStores, icon: StoreIcon, accentBg: 'bg-amber-100', accentText: 'text-amber-800' },
                                    { title: 'Khách hàng', val: stats.totalCustomers, icon: Users, accentBg: 'bg-orange-100', accentText: 'text-orange-700' }].map((s, i) => (
                                        <Card key={i} className="border border-orange-100 shadow-sm bg-white">
                                            <CardContent className="p-5 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">{s.title}</p>
                                                    <p className="text-2xl font-bold text-[#391713] mt-2">{s.val}</p>
                                                </div>
                                                <div className={`p-3 rounded-full ${s.accentBg} ${s.accentText}`}><s.icon size={22} /></div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <Card className="shadow-sm border border-orange-100 bg-white">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-amber-800">Biến động doanh thu 6 tháng</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={revenueSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9a3412' }} stroke="#fb923c" />
                                                    <YAxis tick={{ fontSize: 12, fill: '#9a3412' }} stroke="#fb923c" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}m`} />
                                                    <Tooltip formatter={(value: any) => formatCurrency(value)} labelFormatter={(l) => `Tháng ${l}`} />
                                                    <Line type="monotone" dataKey="revenue" stroke="#e95322" strokeWidth={3} dot={{ r: 3, stroke: '#ea580c', fill: '#fff7ec' }} activeDot={{ r: 5, stroke: '#ea580c', fill: '#fff7ec' }} name="Doanh thu" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm border border-orange-100 bg-white">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-amber-800">Top 5 cửa hàng doanh thu</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={topStores} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                                                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}m`} stroke="#fb923c" tick={{ fill: '#9a3412', fontSize: 12 }} />
                                                    <YAxis dataKey="store_name" type="category" width={150} tick={{ fontSize: 12, fill: '#9a3412' }} stroke="#fb923c" />
                                                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                                    <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                    <Card className="shadow-sm border border-orange-100 bg-white">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-amber-800">Phễu chuyển đổi Cart → Order</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <FunnelChart>
                                                    <Tooltip formatter={(v: any) => v} labelFormatter={(l) => l} />
                                                    <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                                                        {funnelData.map((entry, idx) => (
                                                            <Cell key={idx} fill={["#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c"][idx % 5]} />
                                                        ))}
                                                        <LabelList position="right" dataKey={(d: any) => `${d.value} • ${d.conversion}%`} fill="#7c2d12" />
                                                    </Funnel>
                                                </FunnelChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm border border-orange-100 bg-white xl:col-span-2">
                                        <CardHeader>
                                            <CardTitle className="text-sm text-amber-800">Mật độ đơn hàng theo giờ</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={heatmapData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                                                    <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} tick={{ fontSize: 12, fill: '#9a3412' }} stroke="#fb923c" />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9a3412' }} stroke="#fb923c" />
                                                    <Tooltip labelFormatter={(l: any) => `${l}h`} formatter={(v: any) => `${v} đơn`} />
                                                    <Bar dataKey="count">
                                                        {heatmapData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={heatColor(entry.count)} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="shadow-sm border border-orange-100 bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-sm text-amber-800">Tỷ lệ trạng thái đơn hàng</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={orderStatusData} dataKey="count" nameKey="status" cx="40%" cy="50%" outerRadius={110} label={({ percent }) =>
                                                    `${Math.round((percent ?? 0) * 100)}%`
                                                }>
                                                    {orderStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={pieColors[entry.status] || '#f97316'} />
                                                    ))}
                                                </Pie>
                                                <Legend layout="vertical" verticalAlign="middle" align="right" formatter={(value) => value} />
                                                <Tooltip formatter={(value: any) => value} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm border border-orange-100 bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-sm text-amber-800">Danh sách cửa hàng</CardTitle>
                                    </CardHeader>
                                    <CardContent className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-orange-50 border-b border-orange-100 text-xs uppercase text-amber-700">
                                                <tr>
                                                    <th className="p-3 text-left">ID</th>
                                                    <th className="p-3 text-left">Tên cửa hàng</th>
                                                    <th className="p-3 text-left">Địa chỉ</th>
                                                    <th className="p-3 text-left">Đơn</th>
                                                    <th className="p-3 text-left">Doanh thu</th>
                                                    <th className="p-3 text-right">Chi tiết</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-orange-50">
                                                {storeRows.map((s) => (
                                                    <tr key={s.store_id} className="hover:bg-orange-50/80">
                                                        <td className="p-3 font-mono text-amber-800">{s.store_id}</td>
                                                        <td className="p-3 font-semibold text-[#391713]">{s.store_name}</td>
                                                        <td className="p-3 text-amber-900/80">{s.address || '-'}</td>
                                                        <td className="p-3 text-[#391713]">{s.total_orders}</td>
                                                        <td className="p-3 font-bold text-orange-700">{formatCurrency(s.revenue)}</td>
                                                        <td className="p-3 text-right">
                                                            <Button size="sm" variant="outline" className="border-orange-200 text-orange-700" onClick={() => navigate(`/store/${s.store_id}/`)}>Xem chi tiết</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {storeRows.length === 0 && (
                                                    <tr><td colSpan={6} className="p-6 text-center text-amber-700">Chưa có dữ liệu</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* 2. STORES */}
                        {activeSection === 'stores' && (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex bg-orange-50 p-1 rounded-lg border border-orange-100">
                                        <button onClick={() => setStoreViewMode('list')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", storeViewMode === 'list' ? "bg-white shadow text-[#391713]" : "text-amber-700/80")}>Danh sách</button>
                                        <button onClick={() => { setStoreViewMode('applications'); loadStoreApplications(); }} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", storeViewMode === 'applications' ? "bg-white shadow text-[#391713]" : "text-amber-700/80")}>Đơn đăng ký</button>
                                    </div>
                                    {storeViewMode === 'list' && <Button onClick={() => setShowAddStoreModal(true)} className="bg-orange-600 hover:bg-orange-700"><Plus size={16} className="mr-2" /> Thêm Cửa hàng</Button>}
                                </div>

                                {storeViewMode === 'list' ? (
                                    <>
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="flex items-center gap-2 w-full max-w-md">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                                                    <input
                                                        className="pl-8 border border-orange-200 p-2 rounded-lg w-full text-sm bg-white"
                                                        placeholder="Tìm kiếm cửa hàng..."
                                                        value={storeSearch}
                                                        onChange={e => setStoreSearch(e.target.value)}
                                                    />
                                                </div>
                                                <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadStores(1, storeSearch)}>Tìm</Button>
                                            </div>
                                            <div className="text-sm text-amber-700">Tổng: {totalStoresCount} cửa hàng</div>
                                        </div>

                                        <Card className="border border-orange-100 shadow-sm overflow-hidden mt-3 bg-white">
                                            <CardContent className="p-0">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Ảnh</th><th className="p-4">Tên cửa hàng</th><th className="p-4">Mô tả</th><th className="p-4">Quản lý (ID)</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead>
                                                    <tbody className="divide-y divide-orange-50">
                                                        {stores.map(s => {
                                                            const active = s.is_active !== false;
                                                            return (
                                                                <tr key={s.id} className="hover:bg-orange-50">
                                                                    <td className="p-4 font-mono text-amber-800">{s.id}</td>
                                                                    <td className="p-4"><img src={getImageUrl(s.image)} className="w-10 h-10 rounded border border-orange-100 object-cover" /></td>
                                                                    <td className="p-4 font-medium text-[#391713]">{s.store_name}</td>
                                                                    <td className="p-4 max-w-xs truncate text-amber-900/80">{s.description}</td>
                                                                    <td className="p-4 text-amber-900/80">{s.manager}</td>
                                                                    <td className="p-4">
                                                                        <span className={`text-xs px-2 py-1 rounded ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {active ? 'Hoạt động' : 'Đã khóa'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 flex justify-end gap-2">
                                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-700 hover:bg-orange-50" onClick={() => openStoreDetail(s.id)}><Eye size={14} /></Button>
                                                                        <Button size="sm" variant="outline" className="border-orange-200 text-orange-700" onClick={() => viewStoreDetail(s.id)}><Edit2 size={14} /></Button>
                                                                        <Button size="sm" variant="destructive" onClick={() => deleteStore(s.id)}><Trash2 size={14} /></Button>
                                                                        <Button size="sm" variant="secondary" className="bg-orange-100 text-orange-800 border border-orange-200" disabled={storeStatusUpdating === s.id} onClick={() => toggleStoreManagerStatus(s)}>
                                                                            {storeStatusUpdating === s.id ? 'Đang xử lý...' : (active ? 'Khóa' : 'Mở')}
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </CardContent>
                                        </Card>
                                        <PaginationControl page={storePage} totalPages={totalStorePages} onPageChange={(p) => loadStores(p, storeSearch)} />
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-2 top-2.5 text-gray-400" size={16} /><input className="pl-8 border border-orange-200 p-2 rounded-lg w-full text-sm bg-white" placeholder="Tìm kiếm đơn..." value={applicationsSearch} onChange={e => setApplicationsSearch(e.target.value)} /></div><Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadStoreApplications(1, applicationsSearch)}>Tìm</Button></div>
                                        <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">User</th><th className="p-4">Họ tên</th><th className="p-4">Email/SĐT</th><th className="p-4">Địa chỉ</th><th className="p-4">Ngày ĐK</th><th className="p-4 text-right">Thao tác</th></tr></thead>
                                                <tbody className="divide-y divide-orange-50">
                                                    {applications.map(app => (
                                                        <tr key={app.id} className="hover:bg-orange-50">
                                                            <td className="p-4"><div className="font-bold">{app.username}</div><div className="text-xs text-gray-400">ID: {app.id}</div></td>
                                                            <td className="p-4 font-medium">{app.fullname}</td>
                                                            <td className="p-4"><div>{app.email}</div><div className="text-xs text-gray-500">{app.phone_number}</div></td>
                                                            <td className="p-4 max-w-xs truncate">{app.address}</td>
                                                            <td className="p-4 text-xs text-gray-500">{new Date(app.created_date).toLocaleDateString()}</td>
                                                            <td className="p-4 flex justify-end gap-2">
                                                                <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => handleApproveApplication(app.id)}><CheckCircle size={14} className="mr-1" /> Duyệt</Button>
                                                                <Button size="sm" variant="destructive" onClick={() => handleRejectApplication(app.id)}><X size={14} className="mr-1" /> Từ chối</Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent></Card>
                                        {/* PAGINATION FOR STORE APPLICATIONS */}
                                        <PaginationControl page={applicationsPage} totalPages={totalApplicationsPages} onPageChange={(p) => loadStoreApplications(p, applicationsSearch)} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. SHIPPERS */}
                        {activeSection === 'shippers' && (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex bg-orange-50 p-1 rounded-lg border border-orange-100">
                                        <button onClick={() => { setShipperViewMode('list'); loadShippers(1, shipperSearch); }} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", shipperViewMode === 'list' ? "bg-white shadow text-[#391713]" : "text-amber-700/80")}>Danh sách</button>
                                        <button onClick={() => { setShipperViewMode('applications'); loadShipperApplications(1, shipperAppSearch); }} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", shipperViewMode === 'applications' ? "bg-white shadow text-[#391713]" : "text-amber-700/80")}>Đơn đăng ký</button>
                                    </div>
                                    {shipperViewMode === 'list' ? (
                                        <div className="flex gap-2 items-center">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                                                <input className="pl-8 border border-orange-200 p-2 rounded-lg w-64 text-sm bg-white" placeholder="Tìm shipper..." value={shipperSearch} onChange={e => setShipperSearch(e.target.value)} />
                                            </div>
                                            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadShippers(1, shipperSearch)}>Tìm</Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 items-center w-full max-w-md">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                                                <input className="pl-8 border border-orange-200 p-2 rounded-lg w-full text-sm bg-white" placeholder="Tìm đơn đăng ký..." value={shipperAppSearch} onChange={e => setShipperAppSearch(e.target.value)} />
                                            </div>
                                            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadShipperApplications(1, shipperAppSearch)}>Tìm</Button>
                                        </div>
                                    )}
                                </div>

                                {shipperViewMode === 'list' ? (
                                    <>
                                        <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Username</th><th className="p-4">Họ tên</th><th className="p-4">Email</th><th className="p-4">SĐT</th><th className="p-4">Trạng thái</th><th className="p-4">Ngày tạo</th><th className="p-4 text-right">Hành động</th></tr></thead>
                                                <tbody className="divide-y divide-orange-50">
                                                    {shippers.map(shipper => (
                                                        <tr key={`${shipper.user_id || shipper.id}`} className="hover:bg-orange-50">
                                                            <td className="p-4 font-mono text-amber-800">{shipper.id}</td>
                                                            <td className="p-4 font-medium">{shipper.username || shipper.email || '-'}</td>
                                                            <td className="p-4">{shipper.fullname || '-'}</td>
                                                            <td className="p-4">{shipper.email || '-'}</td>
                                                            <td className="p-4">{shipper.phone_number || '-'}</td>
                                                            <td className="p-4">
                                                                <span className={`text-xs px-2 py-1 rounded ${shipper.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {shipper.is_active ? 'Hoạt động' : 'Đã khóa'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-xs text-gray-500">{shipper.created_date ? new Date(shipper.created_date).toLocaleDateString() : '-'}</td>
                                                            <td className="p-4 text-right">
                                                                <Button size="sm" variant="outline" className="border-orange-200 text-orange-700" disabled={shipperStatusUpdating === (shipper.user_id || shipper.id)} onClick={() => handleToggleShipperStatus(shipper.user_id || shipper.id)}>
                                                                    {shipperStatusUpdating === (shipper.user_id || shipper.id) ? 'Đang xử lý...' : shipper.is_active ? 'Khóa' : 'Mở khóa'}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {shippers.length === 0 && (
                                                        <tr><td colSpan={8} className="p-8 text-center text-amber-700">{shipperListLoading ? 'Đang tải...' : 'Chưa có shipper nào.'}</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </CardContent></Card>
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-amber-700">Tổng: {totalShippers} shipper</div>
                                            <PaginationControl page={shipperListPage} totalPages={totalShipperListPages} onPageChange={(p) => loadShippers(p, shipperSearch)} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Username</th><th className="p-4">Họ tên</th><th className="p-4">Email</th><th className="p-4">SĐT</th><th className="p-4">Địa chỉ</th><th className="p-4">Ngày đăng ký</th><th className="p-4 text-right">Hành động</th></tr></thead>
                                                <tbody className="divide-y divide-orange-50">
                                                    {shipperApps.map(app => (
                                                        <tr key={app.id} className="hover:bg-orange-50">
                                                            <td className="p-4 font-mono text-amber-800">{app.id}</td>
                                                            <td className="p-4 font-medium">{app.username}</td>
                                                            <td className="p-4">{app.fullname}</td>
                                                            <td className="p-4">{app.email || '-'}</td>
                                                            <td className="p-4">{app.phone_number || '-'}</td>
                                                            <td className="p-4 max-w-xs truncate">{(app as any).address || '-'}</td>
                                                            <td className="p-4 text-xs text-gray-500">{(app as any).created_date ? new Date((app as any).created_date).toLocaleDateString() : '-'}</td>
                                                            <td className="p-4 flex justify-end gap-2">
                                                                <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => handleApproveShipper(app.id)}>Duyệt</Button>
                                                                <Button size="sm" variant="destructive" onClick={() => handleRejectShipper(app.id)}>Từ chối</Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {shipperApps.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-amber-700">{shipperLoading ? 'Đang tải...' : 'Không có đơn nào.'}</td></tr>}
                                                </tbody>
                                            </table>
                                        </CardContent></Card>
                                        {/* PAGINATION FOR SHIPPER APPLICATIONS */}
                                        <PaginationControl page={shipperPage} totalPages={totalShipperPages} onPageChange={(p) => loadShipperApplications(p, shipperAppSearch)} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. CUSTOMERS */}
                        {activeSection === 'customers' && (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#391713]">Danh sách Khách hàng</h2><div className="flex gap-2"><input className="border border-orange-200 p-2 rounded-lg text-sm bg-white" placeholder="Tìm khách..." value={search} onChange={e => setSearch(e.target.value)} /><Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadCustomers(1, search)}>Tìm</Button></div></div>
                                <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Họ tên</th><th className="p-4">Email</th><th className="p-4">SĐT</th><th className="p-4">Vai trò</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Hành động</th></tr></thead>
                                        <tbody className="divide-y divide-orange-50">
                                            {customers.map(c => {
                                                const active = c.is_active !== false;
                                                return (
                                                    <tr key={c.id} className="hover:bg-orange-50">
                                                        <td className="p-4 text-amber-800 font-mono">{c.id}</td>
                                                        <td className="p-4 font-medium text-[#391713]">{c.fullname}</td>
                                                        <td className="p-4">{c.email}</td>
                                                        <td className="p-4">{c.phone_number}</td>
                                                        <td className="p-4"><span className="bg-orange-50 text-orange-800 text-xs px-2 py-1 rounded border border-orange-100">{c.role}</span></td>
                                                        <td className="p-4">
                                                            <span className={`text-xs px-2 py-1 rounded ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {active ? 'Hoạt động' : 'Đã khóa'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right flex justify-end gap-2">
                                                            <Button size="sm" variant="ghost" className="text-orange-700 hover:bg-orange-50" onClick={() => viewCustomerDetail(c.id)}><Eye size={16} /></Button>
                                                            <Button size="sm" variant="outline" className="border-orange-200 text-orange-700" disabled={customerStatusUpdating === c.id} onClick={() => toggleCustomerStatus(c.id)}>
                                                                {customerStatusUpdating === c.id ? 'Đang xử lý...' : (active ? 'Khóa' : 'Mở')}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </CardContent></Card>
                                {/* PAGINATION FOR CUSTOMERS */}
                                <div className="flex justify-between items-center mt-2">
                                    <div className="text-sm text-amber-700">Tổng: {totalCustomers} khách hàng</div>
                                    <div className="flex-1">
                                        <PaginationControl page={currentPage} totalPages={totalPages} onPageChange={(p) => loadCustomers(p, search)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. FOODS */}
                        {activeSection === 'foods' && (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#391713]">Quản lý Món ăn hệ thống</h2><Button onClick={() => setShowAddFoodModal(true)} className="bg-orange-600 hover:bg-orange-700"><Plus size={16} className="mr-2" /> Thêm món</Button></div>

                                {/* Filters */}
                                <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex flex-wrap gap-3">
                                    <input className="border border-orange-200 p-2 rounded-lg text-sm flex-1 bg-white" placeholder="Tìm tên món..." value={foodSearch} onChange={e => setFoodSearch(e.target.value)} />
                                    <select className="border border-orange-200 p-2 rounded-lg text-sm bg-white" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">Tất cả danh mục</option>{categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}</select>
                                    <select className="border border-orange-200 p-2 rounded-lg text-sm bg-white" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}><option value="">Tất cả cửa hàng</option>{stores.map(s => <option key={s.id} value={s.id}>{s.store_name}</option>)}</select>
                                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadFoods(1)}>Lọc</Button>
                                </div>

                                <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Ảnh</th><th className="p-4">Tên</th><th className="p-4">Giá</th><th className="p-4">Cửa hàng</th><th className="p-4">TT</th><th className="p-4 text-center">Size</th><th className="p-4 text-right">Hành động</th></tr></thead>
                                        <tbody className="divide-y divide-orange-50">
                                            {foods.map(f => (
                                                <tr key={f.id} className="hover:bg-orange-50">
                                                    <td className="p-4 text-amber-800 font-mono">{f.id}</td>
                                                    <td className="p-4"><img src={getImageUrl(f.image)} className="w-10 h-10 rounded border border-orange-100 object-cover" /></td>
                                                    <td className="p-4 font-medium text-[#391713]">{f.title}</td>
                                                    <td className="p-4 text-orange-700 font-bold">{formatCurrency(f.price)}</td>
                                                    <td className="p-4 text-xs text-amber-900/80">{f.store?.store_name}</td>
                                                    <td className="p-4"><span className={`text-xs px-2 py-1 rounded ${f.availability === 'Còn hàng' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{f.availability}</span></td>
                                                    <td className="p-4 text-center"><Button size="sm" variant="ghost" className="h-7 text-xs border border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => openManageSizesModal(f)}>Size</Button></td>
                                                    <td className="p-4 flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-orange-200 text-orange-700" onClick={() => viewFoodDetail(f.id)}><Edit2 size={14} /></Button>
                                                        <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => deleteFood(f.id)}><Trash2 size={14} /></Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent></Card>
                                {/* PAGINATION FOR FOODS */}
                                <PaginationControl page={foodPage} totalPages={totalFoodPages} onPageChange={loadFoods} />
                            </div>
                        )}

                        {/* 6. ORDERS */}
                        {activeSection === 'orders' && (
                            <div className="animate-in fade-in space-y-4">
                                <h2 className="text-xl font-bold text-[#391713]">Quản lý Đơn hàng toàn hệ thống</h2>
                                <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex gap-3">
                                    <input className="border border-orange-200 p-2 rounded-lg text-sm flex-1 bg-white" placeholder="Mã đơn / Tên khách..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                                    <select className="border border-orange-200 p-2 rounded-lg text-sm bg-white" value={orderStatus} onChange={e => setOrderStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="Chờ xác nhận">Chờ xác nhận</option><option value="Đã xác nhận">Đã xác nhận</option><option value="Đang giao">Đang giao</option><option value="Đã giao">Đã giao</option></select>
                                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => loadOrders(1)}>Lọc</Button>
                                </div>
                                <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Khách hàng</th><th className="p-4">Tổng tiền</th><th className="p-4">Trạng thái</th><th className="p-4">Ngày tạo</th><th className="p-4 text-right">Chi tiết</th></tr></thead>
                                        <tbody className="divide-y divide-orange-50">
                                            {orders.map(o => (
                                                <tr key={o.id} className="hover:bg-orange-50">
                                                    <td className="p-4 font-mono font-bold text-orange-700">#{o.id}</td>
                                                    <td className="p-4 font-medium text-[#391713]">{o.user.fullname}</td>
                                                    <td className="p-4 font-bold text-orange-700">{formatCurrency(o.total_money)}</td>
                                                    <td className="p-4"><span className={cn("px-2 py-1 text-xs rounded-full border", getStatusColor(o.order_status))}>{o.order_status}</span></td>
                                                    <td className="p-4 text-xs text-gray-500">{new Date(o.created_date).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right"><Button size="sm" variant="outline" className="border-orange-200 text-orange-700" onClick={() => viewOrderDetail(o.id)}>Xem</Button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent></Card>
                                {/* PAGINATION FOR ORDERS */}
                                <PaginationControl page={orderPage} totalPages={totalOrderPages} onPageChange={loadOrders} />
                            </div>
                        )}

                        {/* 7. PROMOTIONS */}
                        {activeSection === 'promotions' && (
                            <div className="animate-in fade-in space-y-4">
                                <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#391713]">Khuyến mãi Hệ thống</h2><Button onClick={() => setShowAddPromoModal(true)} className="bg-orange-600 hover:bg-orange-700"><Plus size={16} className="mr-2" /> Tạo KM</Button></div>
                                <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-orange-50 border-b border-orange-100 uppercase text-xs text-amber-700"><tr><th className="p-4">ID</th><th className="p-4">Tên</th><th className="p-4">Loại</th><th className="p-4">Giá trị</th><th className="p-4">Hiệu lực</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Hành động</th></tr></thead>
                                        <tbody className="divide-y divide-orange-50">
                                            {promotions.map(p => (
                                                <tr key={p.id} className="hover:bg-orange-50">
                                                    <td className="p-4 text-amber-800 font-mono">{p.id}</td>
                                                    <td className="p-4 font-medium text-[#391713]">{p.name}</td>
                                                    <td className="p-4 text-xs">{p.discount_type}</td>
                                                    <td className="p-4 font-bold text-orange-700">{p.discount_type === 'PERCENT' ? `${p.discount_value}%` : formatCurrency(p.discount_value)}</td>
                                                    <td className="p-4 text-xs">{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</td>
                                                    <td className="p-4"><span className={`text-xs px-2 py-1 rounded ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_active ? 'Active' : 'Paused'}</span></td>
                                                    <td className="p-4 flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" className="text-orange-700 hover:bg-orange-50" onClick={() => openEditPromoModal(p)}><Edit2 size={14} /></Button>
                                                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => deletePromo(p.id)}><Trash2 size={14} /></Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent></Card>
                            </div>
                        )}

                        {/* 8. REPORTS */}
                        {(activeSection === 'revenueReport' || activeSection === 'popularFoodsReport') && (
                            <div className="animate-in fade-in space-y-4">
                                <h2 className="text-xl font-bold text-[#391713]">{activeSection === 'revenueReport' ? 'Báo cáo Doanh thu' : 'Báo cáo Món bán chạy'}</h2>
                                <Card className="border border-orange-100 shadow-sm bg-white"><CardContent className="p-4 flex flex-wrap gap-4 items-end">
                                    {activeSection === 'revenueReport' ? (
                                        <>
                                            <div className="flex-1 min-w-[150px]"><label className="text-xs text-amber-700 block mb-1">Từ ngày</label><input type="date" value={reportFilters.start_date} onChange={e => setReportFilters({ ...reportFilters, start_date: e.target.value })} className="w-full border border-orange-200 p-2 rounded text-sm bg-white" /></div>
                                            <div className="flex-1 min-w-[150px]"><label className="text-xs text-amber-700 block mb-1">Đến ngày</label><input type="date" value={reportFilters.end_date} onChange={e => setReportFilters({ ...reportFilters, end_date: e.target.value })} className="w-full border border-orange-200 p-2 rounded text-sm bg-white" /></div>
                                            <div className="flex-1 min-w-[150px]"><label className="text-xs text-amber-700 block mb-1">Loại</label><select value={reportFilters.period} onChange={e => setReportFilters({ ...reportFilters, period: e.target.value })} className="w-full border border-orange-200 p-2 rounded text-sm bg-white"><option value="day">Ngày</option><option value="month">Tháng</option></select></div>
                                            <Button className="bg-orange-600 hover:bg-orange-700" onClick={loadRevenueReport}>Xem Báo Cáo</Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-[150px]"><label className="text-xs text-amber-700 block mb-1">Từ ngày</label><input type="date" value={popularFoodsFilters.start_date} onChange={e => setPopularFoodsFilters({ ...popularFoodsFilters, start_date: e.target.value })} className="w-full border border-orange-200 p-2 rounded text-sm bg-white" /></div>
                                            <div className="flex-1 min-w-[150px]"><label className="text-xs text-amber-700 block mb-1">Đến ngày</label><input type="date" value={popularFoodsFilters.end_date} onChange={e => setPopularFoodsFilters({ ...popularFoodsFilters, end_date: e.target.value })} className="w-full border border-orange-200 p-2 rounded text-sm bg-white" /></div>
                                            <div className="w-24"><label className="text-xs text-amber-700 block mb-1">Top</label><input type="number" value={popularFoodsFilters.limit} onChange={e => setPopularFoodsFilters({ ...popularFoodsFilters, limit: e.target.value })} className="w-full border border-orange-200 p-2 rounded text-sm bg-white" /></div>
                                            <Button className="bg-orange-600 hover:bg-orange-700" onClick={loadPopularFoodsReport}>Xem</Button>
                                        </>
                                    )}
                                </CardContent></Card>

                                {/* RESULT TABLES */}
                                {activeSection === 'revenueReport' && reportData && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="bg-orange-50 border border-orange-200"><CardContent className="p-6 text-center"><p className="text-amber-700 uppercase text-xs">Tổng doanh thu</p><p className="text-2xl font-bold text-orange-700">{formatCurrency(reportData.summary.total_revenue)}</p></CardContent></Card>
                                            <Card className="bg-amber-50 border border-orange-200"><CardContent className="p-6 text-center"><p className="text-amber-700 uppercase text-xs">Tổng đơn</p><p className="text-2xl font-bold text-orange-700">{reportData.summary.total_orders}</p></CardContent></Card>
                                        </div>
                                        <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                            <table className="w-full text-sm text-left"><thead className="bg-orange-50 border-b border-orange-100 text-amber-700"><tr><th className="p-4">Thời gian</th><th className="p-4">Doanh thu</th></tr></thead><tbody>
                                                {reportData.chart_data.map((d, i) => <tr key={i} className="border-b border-orange-50"><td className="p-4">{new Date(d.date).toLocaleDateString()}</td><td className="p-4 font-bold text-orange-700">{formatCurrency(d.revenue)}</td></tr>)}
                                            </tbody></table>
                                        </CardContent></Card>
                                    </div>
                                )}
                                {activeSection === 'popularFoodsReport' && popularFoodsData && (
                                    <Card className="border border-orange-100 shadow-sm overflow-hidden bg-white"><CardContent className="p-0">
                                        <table className="w-full text-sm text-left"><thead className="bg-orange-50 border-b border-orange-100 text-amber-700"><tr><th className="p-4">#</th><th className="p-4">Món</th><th className="p-4">SL Bán</th><th className="p-4">Doanh thu</th></tr></thead><tbody>
                                            {popularFoodsData.results.map((f) => (
                                                <tr key={f.rank} className="border-b border-orange-50">
                                                    <td className="p-4 font-mono text-amber-800">{f.rank}</td>
                                                    <td className="p-4 flex items-center gap-3">
                                                        <img src={getImageUrl(f.image || '')} className="w-10 h-10 rounded border border-orange-100 object-cover" />
                                                        <span className="font-medium text-[#391713]">{f.food_name}</span>
                                                    </td>
                                                    <td className="p-4 font-semibold text-orange-700">{f.total_sold}</td>
                                                    <td className="p-4 font-bold text-orange-700">{formatCurrency(f.revenue_contribution)}</td>
                                                </tr>
                                            ))}
                                        </tbody></table>
                                    </CardContent></Card>
                                )}
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* --- MODALS --- */}

            {/* STORE DETAIL MODAL */}
            {storeDetailModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-start justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                {((storeDetailInfo as any)?.image || (storeDetailInfo as any)?.image_url) && (
                                    <img
                                        src={getImageUrl((storeDetailInfo as any).image || (storeDetailInfo as any).image_url)}
                                        alt="logo"
                                        className="w-14 h-14 rounded-lg object-cover border"
                                    />
                                )}
                                <div>
                                    <p className="text-xs text-gray-500">Cửa hàng #{storeDetailInfo?.id}</p>
                                    <h3 className="text-xl font-bold">{storeDetailInfo?.store_name || 'Đang tải...'}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">{storeDetailInfo?.description}</p>
                                </div>
                            </div>
                            <button onClick={closeStoreDetail} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-4">
                            {storeDetailLoading ? (
                                <div className="text-center text-sm text-gray-500">Đang tải chi tiết cửa hàng...</div>
                            ) : storeDetailInfo ? (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[{
                                            label: 'Đánh giá trung bình',
                                            value: Number(storeDetailStats.average_rating || (storeDetailInfo as any).average_rating || 0).toFixed(1),
                                            suffix: '/5',
                                            icon: <Star size={16} className="text-amber-500" />,
                                        }, {
                                            label: 'Tổng số đánh giá',
                                            value: storeDetailStats.total_ratings || (storeDetailInfo as any).total_ratings || 0,
                                            icon: <Users size={16} className="text-orange-500" />,
                                        }, {
                                            label: 'Số món',
                                            value: storeDetailStats.food_count || storeDetailFoods.length,
                                            icon: <Utensils size={16} className="text-emerald-500" />,
                                        }, {
                                            label: 'Tổng đơn',
                                            value: storeDetailStats.total_orders || 0,
                                            icon: <ShoppingBag size={16} className="text-purple-500" />,
                                        }].map((item, idx) => (
                                            <div key={idx} className="p-3 border rounded-lg bg-gray-50 flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-full border">{item.icon}</div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                                                    <p className="text-lg font-bold text-gray-800">{item.value}{item.suffix || ''}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {storeDetailCategories.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-gray-700">Danh mục đang bán</p>
                                            <div className="flex flex-wrap gap-2">
                                                {storeDetailCategories.map((cate) => (
                                                    <span key={cate} className="px-3 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-100">{cate}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-700">Danh sách món ({storeDetailFoods.length})</p>
                                            <span className="text-xs text-gray-500">Nhấp để xem chi tiết món</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {storeDetailFoods.map((food) => (
                                                <button
                                                    key={food.id}
                                                    onClick={() => openFoodDetailModal(food)}
                                                    className="text-left border rounded-lg p-3 bg-white hover:shadow-md transition flex gap-3"
                                                >
                                                    <img src={getImageUrl((food as any).image || (food as any).image_url)} alt={food.title} className="w-16 h-16 rounded object-cover border" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-800 truncate">{food.title}</p>
                                                        <p className="text-sm text-orange-700 font-bold">{formatCurrency(food.price)}</p>
                                                        <p className="text-xs text-gray-500 truncate">{(food as any).category?.cate_name || (food as any).category}</p>
                                                    </div>
                                                </button>
                                            ))}
                                            {storeDetailFoods.length === 0 && (
                                                <div className="col-span-full text-center text-sm text-gray-500 py-6 border rounded-lg">Chưa có món nào.</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-sm text-gray-500">Không tìm thấy dữ liệu cửa hàng.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FOOD DETAIL MODAL */}
            {foodDetailModalOpen && foodDetail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-orange-100">
                        <div className="flex items-start justify-between p-4 border-b border-orange-100 bg-orange-50">
                            <div>
                                <p className="text-xs text-amber-700">Món ăn #{foodDetail.id}</p>
                                <h3 className="text-xl font-bold text-[#391713]">{foodDetail.title}</h3>
                                <p className="text-sm text-amber-900/80 line-clamp-2">{foodDetail.description}</p>
                            </div>
                            <button onClick={closeFoodDetailModal} className="p-2 hover:bg-orange-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <img src={getImageUrl((foodDetail as any).image || (foodDetail as any).image_url)} alt={foodDetail.title} className="w-full aspect-square object-cover rounded-lg border border-orange-100" />
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-bold text-orange-700">{formatCurrency(foodDetail.price)}</span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-100">{foodDetail.availability}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <Star size={16} />
                                        <span className="font-semibold text-gray-800">
                                            {foodDetailRatings.length > 0
                                                ? (foodDetailRatings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / foodDetailRatings.length).toFixed(1)
                                                : ((foodDetail as any).average_rating || 'Chưa có đánh giá')}
                                        </span>
                                        {foodDetailRatings.length > 0 && <span className="text-xs text-gray-500">({foodDetailRatings.length} đánh giá)</span>}
                                    </div>
                                    <p className="text-sm text-gray-600 whitespace-pre-line">{foodDetail.description}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-700">Đánh giá</p>
                                {foodDetailLoading ? (
                                    <div className="text-sm text-gray-500">Đang tải đánh giá...</div>
                                ) : foodDetailRatings.length === 0 ? (
                                    <div className="text-sm text-gray-500 border rounded-lg p-3">Chưa có đánh giá cho món này.</div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {foodDetailRatings.map((rating, idx) => (
                                            <div key={idx} className="border border-orange-100 rounded-lg p-3 bg-orange-50">
                                                <div className="flex justify-between text-sm font-semibold text-[#391713]">
                                                    <span>{rating.username || 'Ẩn danh'}</span>
                                                    <span className="flex items-center gap-1 text-amber-500"><Star size={14} /> {rating.rating}</span>
                                                </div>
                                                <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{rating.content}</p>
                                                {rating.created_date && <p className="text-xs text-amber-700 mt-1">{formatDate(rating.created_date)}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT STORE MODAL */}
            {showEditStoreModal && selectedStore && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 border border-orange-100">
                        <h2 className="text-xl font-bold mb-4 text-[#391713]">Sửa Cửa hàng</h2>
                        <div className="space-y-3">
                            <input className="w-full border border-orange-200 p-2 rounded" value={selectedStore.store_name} onChange={e => setSelectedStore({ ...selectedStore, store_name: e.target.value })} placeholder="Tên" />
                            <input className="w-full border border-orange-200 p-2 rounded" value={selectedStore.image} onChange={e => setSelectedStore({ ...selectedStore, image: e.target.value })} placeholder="URL Ảnh" />
                            <textarea className="w-full border border-orange-200 p-2 rounded" value={selectedStore.description} onChange={e => setSelectedStore({ ...selectedStore, description: e.target.value })} placeholder="Mô tả" />
                            <input className="w-full border border-orange-200 p-2 rounded" value={selectedStore.manager} onChange={e => setSelectedStore({ ...selectedStore, manager: Number(e.target.value) })} placeholder="ID Quản lý" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4"><Button variant="outline" className="border-orange-200 text-orange-700" onClick={() => setShowEditStoreModal(false)}>Hủy</Button><Button className="bg-orange-600 hover:bg-orange-700" onClick={updateStore}>Lưu</Button></div>
                    </div>
                </div>
            )}
            {showAddStoreModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 border border-orange-100">
                        <h2 className="text-xl font-bold mb-4 text-[#391713]">Thêm Cửa hàng</h2>
                        <div className="space-y-3">
                            <input className="w-full border border-orange-200 p-2 rounded" value={newStore.store_name} onChange={e => setNewStore({ ...newStore, store_name: e.target.value })} placeholder="Tên" />
                            <input className="w-full border border-orange-200 p-2 rounded" value={newStore.image} onChange={e => setNewStore({ ...newStore, image: e.target.value })} placeholder="URL Ảnh" />
                            <textarea className="w-full border border-orange-200 p-2 rounded" value={newStore.description} onChange={e => setNewStore({ ...newStore, description: e.target.value })} placeholder="Mô tả" />
                            <input className="w-full border border-orange-200 p-2 rounded" value={newStore.manager} onChange={e => setNewStore({ ...newStore, manager: e.target.value })} placeholder="ID Quản lý" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4"><Button variant="outline" className="border-orange-200 text-orange-700" onClick={() => setShowAddStoreModal(false)}>Hủy</Button><Button className="bg-orange-600 hover:bg-orange-700" onClick={handleAddStore}>Thêm</Button></div>
                    </div>
                </div>
            )}

            {/* CUSTOMER MODAL */}
            {showCustomerModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 border border-orange-100">
                        <h2 className="text-xl font-bold mb-4 text-[#391713]">Thông tin khách hàng</h2>
                        <div className="space-y-3">
                            <div><label className="text-xs text-amber-700">Họ tên</label><input className="w-full border border-orange-200 p-2 rounded" value={selectedCustomer.fullname} onChange={e => setSelectedCustomer({ ...selectedCustomer, fullname: e.target.value })} /></div>
                            <div><label className="text-xs text-amber-700">SĐT</label><input className="w-full border border-orange-200 p-2 rounded" value={selectedCustomer.phone_number || ''} onChange={e => setSelectedCustomer({ ...selectedCustomer, phone_number: e.target.value })} /></div>
                            <div><label className="text-xs text-amber-700">Địa chỉ</label><input className="w-full border border-orange-200 p-2 rounded" value={selectedCustomer.address || ''} onChange={e => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })} /></div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4"><Button variant="outline" className="border-orange-200 text-orange-700" onClick={() => setShowCustomerModal(false)}>Hủy</Button><Button className="bg-orange-600 hover:bg-orange-700" onClick={updateCustomer}>Lưu</Button></div>
                    </div>
                </div>
            )}

            {/* ADD/EDIT FOOD MODAL */}
            {(showAddFoodModal || (showEditFoodModal && selectedFood)) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-orange-100">
                        <h2 className="text-xl font-bold mb-4 text-[#391713]">{showAddFoodModal ? 'Thêm Món' : 'Sửa Món'}</h2>
                        <div className="space-y-3">
                            <input className="w-full border border-orange-200 p-2 rounded" value={showAddFoodModal ? newFood.title : selectedFood!.title} onChange={e => showAddFoodModal ? setNewFood({ ...newFood, title: e.target.value }) : setSelectedFood({ ...selectedFood!, title: e.target.value })} placeholder="Tên món" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" className="w-full border border-orange-200 p-2 rounded" value={showAddFoodModal ? newFood.price : selectedFood!.price} onChange={e => showAddFoodModal ? setNewFood({ ...newFood, price: e.target.value }) : setSelectedFood({ ...selectedFood!, price: Number(e.target.value) })} placeholder="Giá" />
                                <select className="border border-orange-200 p-2 rounded bg-white" value={showAddFoodModal ? newFood.availability : selectedFood!.availability} onChange={e => showAddFoodModal ? setNewFood({ ...newFood, availability: e.target.value }) : setSelectedFood({ ...selectedFood!, availability: e.target.value })}><option value="Còn hàng">Còn hàng</option><option value="Hết hàng">Hết hàng</option></select>
                            </div>

                            <select
                                className="w-full border border-orange-200 p-2 rounded bg-white"
                                value={showAddFoodModal ? newFood.category_id : selectedFood!.category?.id}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (showAddFoodModal) {
                                        setNewFood({ ...newFood, category_id: val });
                                    } else {
                                        const newCatId = Number(val);
                                        const foundCat = categories.find(c => c.id === newCatId);
                                        setSelectedFood({
                                            ...selectedFood!,
                                            category: {
                                                id: newCatId,
                                                cate_name: foundCat?.cate_name || ''
                                            }
                                        });
                                    }
                                }}
                            >
                                <option value="">Chọn danh mục</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.cate_name}</option>)}
                            </select>

                            <select
                                className="w-full border border-orange-200 p-2 rounded bg-white"
                                value={showAddFoodModal ? newFood.store_id : selectedFood!.store?.id}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (showAddFoodModal) {
                                        setNewFood({ ...newFood, store_id: val });
                                    } else {
                                        const newStoreId = Number(val);
                                        const foundStore = stores.find(s => s.id === newStoreId);
                                        setSelectedFood({
                                            ...selectedFood!,
                                            store: {
                                                id: newStoreId,
                                                store_name: foundStore?.store_name || ''
                                            }
                                        });
                                    }
                                }}
                            >
                                <option value="">Chọn cửa hàng</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.store_name}</option>)}
                            </select>
                            <textarea className="w-full border border-orange-200 p-2 rounded" rows={2} value={showAddFoodModal ? newFood.description : selectedFood!.description} onChange={e => showAddFoodModal ? setNewFood({ ...newFood, description: e.target.value }) : setSelectedFood({ ...selectedFood!, description: e.target.value })} placeholder="Mô tả" />
                        </div>

                        {!showAddFoodModal && (
                            <div className="mt-4 pt-4 border-t border-orange-100">
                                <h3 className="text-sm font-bold mb-2 text-[#391713]">Đánh giá ({foodRatings.length})</h3>
                                <div className="bg-orange-50 rounded p-2 max-h-40 overflow-y-auto space-y-2">
                                    {ratingsLoading ? <div className="text-center text-xs text-amber-700">Đang tải...</div> : foodRatings.length === 0 ? <div className="text-center text-xs text-amber-700">Chưa có đánh giá</div> : foodRatings.map((r, i) => (<div key={i} className="bg-white p-2 rounded border border-orange-100 text-sm"><div className="font-bold flex justify-between text-[#391713]"><span>{r.username}</span><span className="text-orange-600">{r.rating}★</span></div><div className="text-amber-900/80">{r.content}</div></div>))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4"><Button variant="outline" className="border-orange-200 text-orange-700" onClick={() => { setShowAddFoodModal(false); setShowEditFoodModal(false); }}>Hủy</Button><Button className="bg-orange-600 hover:bg-orange-700" onClick={showAddFoodModal ? handleAddFood : updateFood}>Lưu</Button></div>
                    </div>
                </div>
            )}

            {/* MANAGE SIZE MODAL */}
            {showManageSizesModal && selectedFood && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 border border-orange-100">
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-[#391713]">Size món: {selectedFood.title}</h3><button onClick={() => setShowManageSizesModal(false)} className="text-orange-700"><X size={20} /></button></div>
                        <form onSubmit={handleAddSize} className="flex gap-2 mb-4"><input className="border border-orange-200 p-2 rounded flex-1 text-sm" placeholder="Tên size (VD: L)" value={newSize.size_name} onChange={e => setNewSize({ ...newSize, size_name: e.target.value })} required /><input type="number" className="border border-orange-200 p-2 rounded w-24 text-sm" placeholder="Giá thêm" value={newSize.price} onChange={e => setNewSize({ ...newSize, price: e.target.value })} required /><Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-700"><Plus size={16} /></Button></form>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {foodSizes.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-2 border border-orange-100 rounded bg-orange-50 text-sm">
                                    {editingSizeId === s.id ? (
                                        <div className="flex gap-1 w-full"><input className="flex-1 p-1 border border-orange-200 rounded" value={editingSizeData.size_name} onChange={e => setEditingSizeData({ ...editingSizeData, size_name: e.target.value })} /><input className="w-20 p-1 border border-orange-200 rounded" value={editingSizeData.price} onChange={e => setEditingSizeData({ ...editingSizeData, price: e.target.value })} /><Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => handleUpdateSize(s.id)}>Lưu</Button></div>
                                    ) : (
                                        <><span className="text-[#391713]">{s.size_name} (+{formatCurrency(s.price)})</span><div className="flex gap-1"><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-orange-700 hover:bg-orange-100" onClick={() => { setEditingSizeId(s.id); setEditingSizeData({ size_name: s.size_name, price: s.price }) }}><Edit2 size={12} /></Button><Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" onClick={() => deleteSize(s.id)}><Trash2 size={12} /></Button></div></>
                                    )}
                                </div>
                            ))}
                            {foodSizes.length === 0 && <p className="text-center text-xs text-amber-700">Chưa có size nào</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ORDER DETAIL MODAL */}
            {showOrderModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col border border-orange-100">
                        <div className="flex justify-between items-center p-6 border-b border-orange-100 bg-orange-50"><h2 className="text-xl font-bold text-[#391713]">Chi tiết đơn #{selectedOrder.id}</h2><button onClick={() => setShowOrderModal(false)} className="text-orange-700"><X /></button></div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <p className="font-bold text-[#391713]">Khách hàng</p>
                                    <div className="bg-orange-50 p-3 rounded border border-orange-100 text-sm"><p className="text-[#391713]">{selectedOrder.receiver_name}</p><p className="text-[#391713]">{selectedOrder.phone_number}</p><p className="text-amber-800/80">{selectedOrder.ship_address}</p></div>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-[#391713]">Thông tin đơn</p>
                                    <div className="bg-orange-50 p-3 rounded border border-orange-100 text-sm"><div className="flex justify-between text-[#391713]"><span>Tổng tiền:</span><span className="font-bold text-orange-700">{formatCurrency(selectedOrder.total_money)}</span></div><div className="flex justify-between mt-1 text-[#391713]"><span>Thanh toán:</span><span>{selectedOrder.payment_method}</span></div><div className="flex justify-between mt-1 text-[#391713]"><span>Ngày:</span><span>{new Date(selectedOrder.created_date).toLocaleString()}</span></div></div>
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-[#391713] mb-2">Danh sách món</p>
                                <table className="w-full text-sm border border-orange-100 rounded overflow-hidden"><thead className="bg-orange-50 text-amber-700"><tr><th className="p-2 text-left">Món</th><th className="p-2 text-center">SL</th><th className="p-2 text-right">Giá</th></tr></thead><tbody>
                                    {(selectedOrder.items || []).map((it: any, idx: number) => (<tr key={idx} className="border-t border-orange-50"><td className="p-2 text-[#391713]">{it.food.title}</td><td className="p-2 text-center text-[#391713]">x{it.quantity}</td><td className="p-2 text-right text-orange-700">{formatCurrency(it.food.price)}</td></tr>))}
                                </tbody></table>
                            </div>
                            <div className="flex items-center gap-4 bg-orange-50 p-4 rounded border border-orange-100">
                                <span className="font-medium text-[#391713]">Cập nhật trạng thái:</span>
                                <select id="status_select" className="border border-orange-200 rounded p-1 text-sm flex-1 bg-white" defaultValue={selectedOrder.order_status}>{['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Đang giao', 'Đã giao', 'Đã huỷ'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                                <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { const v = (document.getElementById('status_select') as HTMLSelectElement).value; updateOrderStatus(selectedOrder.id, v) }}>Lưu</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD/EDIT PROMOTION MODAL */}
            {(showAddPromoModal || (showEditPromoModal && selectedPromo)) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-orange-100">
                        <h2 className="text-xl font-bold mb-4 text-[#391713]">{showAddPromoModal ? 'Thêm KM' : 'Sửa KM'}</h2>
                        <form onSubmit={showAddPromoModal ? handleAddPromo : handleUpdatePromo} className="space-y-4">
                            {/* Tên khuyến mãi */}
                            <div>
                                <label className="text-xs text-amber-700 font-bold">Tên chương trình</label>
                                <input required className="w-full border border-orange-200 p-2 rounded mt-1"
                                    value={showAddPromoModal ? newPromo.name : selectedPromo!.name}
                                    onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({ ...newPromo, name: v }) : setSelectedPromo({ ...selectedPromo!, name: v }) }}
                                />
                            </div>

                            {/* Loại và Giá trị giảm */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-amber-700 font-bold">Loại giảm giá</label>
                                    <select className="w-full border border-orange-200 p-2 rounded mt-1 bg-white"
                                        value={showAddPromoModal ? newPromo.discount_type : selectedPromo!.discount_type}
                                        onChange={e => { const v = e.target.value as any; showAddPromoModal ? setNewPromo({ ...newPromo, discount_type: v }) : setSelectedPromo({ ...selectedPromo!, discount_type: v }) }}
                                    >
                                        <option value="PERCENT">% (Phần trăm)</option>
                                        <option value="AMOUNT">VND (Số tiền)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-amber-700 font-bold">Giá trị giảm</label>
                                    <input required type="number" className="w-full border border-orange-200 p-2 rounded mt-1"
                                        value={showAddPromoModal ? newPromo.discount_value : selectedPromo!.discount_value}
                                        onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({ ...newPromo, discount_value: v }) : setSelectedPromo({ ...selectedPromo!, discount_value: v }) }}
                                        placeholder="VD: 10 hoặc 50000"
                                    />
                                </div>
                            </div>

                            {/* --- PHẦN BỔ SUNG: Đơn tối thiểu & Giảm tối đa --- */}
                            <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3 rounded border border-orange-100">
                                <div>
                                    <label className="text-xs text-amber-700 font-bold">Đơn tối thiểu</label>
                                    <input type="number" className="w-full border border-orange-200 p-2 rounded mt-1 bg-white"
                                        // SỬA LỖI Ở ĐÂY: Dùng ?? '' để chuyển null thành chuỗi rỗng
                                        value={(showAddPromoModal ? newPromo.minimum_pay : selectedPromo!.minimum_pay) ?? ''}
                                        onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({ ...newPromo, minimum_pay: v }) : setSelectedPromo({ ...selectedPromo!, minimum_pay: v }) }}
                                        placeholder="0 = Không yêu cầu"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-amber-700 font-bold">Giảm tối đa (Nếu là %)</label>
                                    <input type="number" className="w-full border border-orange-200 p-2 rounded mt-1 bg-white"
                                        // SỬA LỖI Ở ĐÂY: Dùng ?? '' để chuyển null thành chuỗi rỗng
                                        value={(showAddPromoModal ? newPromo.max_discount_amount : selectedPromo!.max_discount_amount) ?? ''}
                                        onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({ ...newPromo, max_discount_amount: v }) : setSelectedPromo({ ...selectedPromo!, max_discount_amount: v }) }}
                                        placeholder="0 = Không giới hạn"
                                    />
                                </div>
                            </div>

                            {/* Ngày hiệu lực */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-amber-700 font-bold">Ngày bắt đầu</label>
                                    <input required type="date" className="w-full border border-orange-200 p-2 rounded mt-1 bg-white"
                                        value={showAddPromoModal ? newPromo.start_date : selectedPromo!.start_date}
                                        onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({ ...newPromo, start_date: v }) : setSelectedPromo({ ...selectedPromo!, start_date: v }) }}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-amber-700 font-bold">Ngày kết thúc</label>
                                    <input required type="date" className="w-full border border-orange-200 p-2 rounded mt-1 bg-white"
                                        value={showAddPromoModal ? newPromo.end_date : selectedPromo!.end_date}
                                        onChange={e => { const v = e.target.value; showAddPromoModal ? setNewPromo({ ...newPromo, end_date: v }) : setSelectedPromo({ ...selectedPromo!, end_date: v }) }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="isActiveCheck" className="w-4 h-4"
                                    checked={showAddPromoModal ? newPromo.is_active : selectedPromo!.is_active}
                                    onChange={e => { const v = e.target.checked; showAddPromoModal ? setNewPromo({ ...newPromo, is_active: v }) : setSelectedPromo({ ...selectedPromo!, is_active: v }) }}
                                />
                                <label htmlFor="isActiveCheck" className="text-sm font-medium text-[#391713]">Kích hoạt ngay</label>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-orange-100">
                                <Button type="button" variant="outline" className="border-orange-200 text-orange-700" onClick={() => { setShowAddPromoModal(false); setShowEditPromoModal(false) }}>Hủy</Button>
                                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Lưu khuyến mãi</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Admin;