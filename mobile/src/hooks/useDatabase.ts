import addressRaw from "@/assets/address.json";
import raw from "@/assets/database.json";
import { useMemo } from "react";

export type Province = {
  province_id: number;
  name: string;
  districts: District[];
};
export type District = {
  district_id: number;
  province_id: number;
  name: string;
  wards: Ward[];
};
export type Ward = {
  wards_id: number;
  district_id: number;
  name: string;
};

export type Category = { id: number; name: string; icon?: string };

export type BaseReview = {
  id: number;
  user?: string;
  avatar?: string;
  userId?: number;
  rating: number;
  comment: string;
  date?: string;
  images?: string[];
  helpful?: number;
  verified?: boolean;
  verifiedPurchase?: boolean;
};
export type RestaurantReview = BaseReview;
export type FoodReview = BaseReview;

export type Coords = { lat: number; lng: number };

export type Restaurant = {
  id: number;
  slug: string;
  name: string;
  categories: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  delivery: string;
  time: string;
  image: string;
  category: string;
  address: string;
  phone: string;
  openingHours: string;
  description: string;
  coords: Coords;
  menuIds: number[];
  ownerUserId?: number;
  reviews: RestaurantReview[];
};

export type Food = {
  id: number;
  name: string;
  restaurant: string;
  restaurantId: number | null;
  rating: number;
  price: string;
  image: string;
  category: string;
  reviews?: FoodReview[];
};

export type Banner = { id: number; title: string; discount: string; image: string };

export type Role = "customer" | "admin" | "seller" | "shipper";

export type User = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  roles?: Array<Role>;
  createdAt?: string;
  defaultAddressId?: number;
  defaultPaymentMethod?: { type: "card" | "bank"; id: number };
};

export type Address = {
  id: number;
  userId: number;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  ward?: string;
  district?: string;
  city: string;
  country: string;
  isDefault?: boolean;
  coords?: Coords;
  note?: string;

  // nếu dùng ID địa giới:
  provinceId?: number;
  districtId?: number;
  wardId?: number;
};

export type BankAccount = {
  id: number;
  userId: number;
  bankName: string;
  accountHolder: string;
  accountNumberMasked: string;
  accountNumber: string;
  swiftCode?: string;
  isDefault?: boolean;
  createdAt?: string;
};

export type Card = {
  id: number;
  userId: number;
  brand: string;
  network: "visa" | "mastercard" | "jcb" | string;
  holderName: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
  token?: string;
  billingAddressId?: number;
  createdAt?: string;
};

export type Seller = { userId: number; displayName: string; restaurantIds: number[]; status: "active" | "inactive" };
export type Courier = {
  userId: number;
  vehicle: { type: "motorbike" | "bike" | "car"; plate?: string };
  serviceArea: string[];
  onDuty: boolean;
  rating?: number;
  completedTrips?: number;
};

export type OrderItem = { foodId: number; qty: number; price: number; restaurantId: number };
export type OrderStatus =
  | "pending"
  | "preparing"
  | "delivering"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed"
  | "refunded";

export type Order = {
  id: string;
  userId: number;
  status: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
  items: OrderItem[];
};

type DB = {
  categories: Category[];
  restaurants: Restaurant[];
  foods: Food[];
  banners: Banner[];
  users?: User[];
  auth?: {
    credentials?: Array<{
      userId: number;
      email: string;
      phone: string;
      passwordHash: string;
      status: string;
      lastLoginAt?: string | null;
    }>;
    sessions?: any[];
    rolePermissions?: Record<string, string[]>;
  };
  addresses?: Address[];
  bankAccounts?: BankAccount[];
  cards?: Card[];
  sellers?: Seller[];
  couriers?: Courier[];
  orders?: Order[];
};

/* ================== Images ================== */
const IMAGE_MAP: Record<string, any> = {
  "placeholder.png": require("@/assets/images/placeholder.png"),
  "restaurant-meat-vegetables.png": require("@/assets/images/restaurant-meat-vegetables.png"),
  "delicious-toppings-pizza.png": require("@/assets/images/delicious-toppings-pizza.png"),
  "fresh-salad-bowl.png": require("@/assets/images/fresh-salad-bowl.png"),
  "gourmet-burger.png": require("@/assets/images/gourmet-burger.png"),
  "chocolate-berry-cupcake.png": require("@/assets/images/chocolate-berry-cupcake.png"),
  "fresh-vegetable-spring-rolls.png": require("@/assets/images/fresh-vegetable-spring-rolls.png"),
  "vegetable-rice-bowl.png": require("@/assets/images/vegetable-rice-bowl.png"),
  "assorted-sushi.png": require("@/assets/images/assorted-sushi.png"),
  "lasagna-slice.png": require("@/assets/images/lasagna-slice.png"),
};

const pickImage = (fileName?: string | null) => {
  if (!fileName) return IMAGE_MAP["placeholder.png"];
  const key = fileName.split("/").pop() || fileName;
  return IMAGE_MAP[key] || IMAGE_MAP["placeholder.png"];
};

const COMPLETED_STATUSES = new Set<OrderStatus>(["delivered", "completed"]);

export function hasPurchasedFood(orders: Order[] = [], userId: number, foodId: number) {
  return orders.some(
    (o) =>
      o.userId === userId && COMPLETED_STATUSES.has(o.status) && o.items.some((it) => it.foodId === foodId)
  );
}

export function hasPurchasedFromRestaurant(orders: Order[] = [], userId: number, restaurantId: number) {
  return orders.some(
    (o) =>
      o.userId === userId &&
      COMPLETED_STATUSES.has(o.status) &&
      o.items.some((it) => it.restaurantId === restaurantId)
  );
}

export function canCreateReview(opts: {
  user: User;
  orders?: Order[];
  foodId?: number;
  restaurantId?: number;
  mode?: "food" | "restaurant";
}) {
  const { user, orders = [], foodId, restaurantId, mode = "food" } = opts;
  const roleOk = (user.roles ?? []).some((r) => r === "customer" || r === "admin");
  if (!roleOk) return false;
  if (mode === "food" && typeof foodId === "number") return hasPurchasedFood(orders, user.id, foodId);
  if (mode === "restaurant" && typeof restaurantId === "number")
    return hasPurchasedFromRestaurant(orders, user.id, restaurantId);
  return false;
}

const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
const isPhone = (v: string) => v.replace(/\s+/g, "").match(/^\+?\d{9,15}$/);

export function useDatabase() {
  const db = useMemo(() => raw as unknown as DB, []);

  // -------- Categories
  const getCategories = () => db.categories;
  const getCategoryNames = () => db.categories.map((c) => c.name);

  // -------- Foods
  const getFoods = () => db.foods;
  const getFoodById = (id: number) => db.foods.find((f) => f.id === id) || null;
  const getFoodsByCategory = (categoryName: string) => db.foods.filter((f) => f.category === categoryName);
  const getFoodsByRestaurantId = (restaurantId: number) => db.foods.filter((f) => f.restaurantId === restaurantId);
  const searchFoods = (keyword: string) => {
    const q = keyword.trim().toLowerCase();
    if (!q) return db.foods;
    return db.foods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.restaurant.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  };
  const getBestSellers = (limit = 6) => [...db.foods].sort((a, b) => b.rating - a.rating).slice(0, limit);
  const getFoodReviews = (foodId: number) => getFoodById(foodId)?.reviews ?? [];

  // -------- Address tree (VN)
  const provinces = useMemo<Province[]>(() => addressRaw as Province[], []);
  const provinceById = useMemo(
    () => new Map<number, Province>(provinces.map((p) => [p.province_id, p])),
    [provinces]
  );
  const districtById = useMemo(() => {
    const map = new Map<number, District>();
    provinces.forEach((p) => p.districts.forEach((d) => map.set(d.district_id, d)));
    return map;
  }, [provinces]);
  const wardsById = useMemo(() => {
    const map = new Map<number, Ward>();
    provinces.forEach((p) => p.districts.forEach((d) => d.wards.forEach((w) => map.set(w.wards_id, w))));
    return map;
  }, [provinces]);

  const getProvinces = () => provinces;
  const getDistrictsByProvinceId = (provinceId: number) => provinceById.get(provinceId)?.districts ?? [];
  const getWardsByDistrictId = (districtId: number) => districtById.get(districtId)?.wards ?? [];

  const findProvinceByName = (name: string) =>
    provinces.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()) || null;

  const findDistrictByName = (provinceName: string, districtName: string) => {
    const p = findProvinceByName(provinceName);
    if (!p) return null;
    return p.districts.find((d) => d.name.trim().toLowerCase() === districtName.trim().toLowerCase()) || null;
  };

  const findWardByName = (districtName: string, wardName: string) => {
    for (const p of provinces) {
      const d = p.districts.find((dx) => dx.name.trim().toLowerCase() === districtName.trim().toLowerCase());
      if (!d) continue;
      const w = d.wards.find((wx) => wx.name.trim().toLowerCase() === wardName.trim().toLowerCase()) || null;
      if (w) return w;
    }
    return null;
  };

  const getProvinceOptions = () => provinces.map((p) => ({ label: p.name, value: String(p.province_id) }));
  const getDistrictOptions = (provinceId: number) =>
    getDistrictsByProvinceId(provinceId).map((d) => ({ label: d.name, value: String(d.district_id) }));
  const getWardOptions = (districtId: number) =>
    getWardsByDistrictId(districtId).map((w) => ({ label: w.name, value: String(w.wards_id) }));

  const getProvinceNameById = (provinceId?: number) =>
    provinceId ? provinceById.get(provinceId)?.name ?? "" : "";
  const getDistrictNameById = (districtId?: number) =>
    districtId ? districtById.get(districtId)?.name ?? "" : "";
  const getWardNameById = (wardId?: number) =>
    wardId ? wardsById.get(wardId)?.name ?? "" : "";
  // -------- Restaurants
  const getRestaurants = () => db.restaurants;
  const getRestaurantById = (id: number) => db.restaurants.find((r) => r.id === id) || null;
  const getRestaurantBySlug = (slug: string) => db.restaurants.find((r) => r.slug === slug) || null;
  const getRestaurantsByCategory = (categoryName: string) => db.restaurants.filter((r) => r.category === categoryName);
  const searchRestaurants = (keyword: string) => {
    const q = keyword.trim().toLowerCase();
    if (!q) return db.restaurants;
    return db.restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.categories.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
    );
  };
  const getRestaurantReviews = (restaurantId: number) => getRestaurantById(restaurantId)?.reviews ?? [];

  // -------- Users / Addresses / Payments
  const getUsers = () => db.users ?? [];
  const getUserById = (id: number) => getUsers().find((u) => u.id === id) ?? null;

  const getAddressesByUser = (userId: number) => (db.addresses ?? []).filter((a) => a.userId === userId);
  const getCardsByUser = (userId: number) => (db.cards ?? []).filter((c) => c.userId === userId);
  const getBanksByUser = (userId: number) => (db.bankAccounts ?? []).filter((b) => b.userId === userId);

  const getDefaultPayment = (userId: number) => {
    const u = getUserById(userId);
    if (!u) return null;
    if (u.defaultPaymentMethod) {
      const { type, id } = u.defaultPaymentMethod;
      if (type === "card") return (db.cards ?? []).find((c) => c.id === id) ?? null;
      if (type === "bank") return (db.bankAccounts ?? []).find((b) => b.id === id) ?? null;
    }
    const card = (db.cards ?? []).find((c) => c.userId === userId && c.isDefault);
    if (card) return card;
    const bank = (db.bankAccounts ?? []).find((b) => b.userId === userId && b.isDefault);
    return bank ?? null;
  };

  // -------- Sellers / Couriers
  const getSellers = () => db.sellers ?? [];
  const getVendorRestaurants = (userId: number) => getSellers().find((s) => s.userId === userId)?.restaurantIds ?? [];
  const getCouriers = () => db.couriers ?? [];

  // -------- Orders
  const getOrders = () => db.orders ?? [];
  const getOrdersByUser = (userId: number) => getOrders().filter((o) => o.userId === userId);

  // -------- Banners
  const getBanners = () => db.banners;

  // -------- Images
  const requireImage = pickImage;

  // -------- Auth: Register User
  const registerUser = (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
  }) => {
    const name = input.fullName?.trim();
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone?.replace(/\s+/g, "");
    if (!name) throw new Error("Vui lòng nhập họ và tên");
    if (!email || !isEmail(email)) throw new Error("Email không hợp lệ");
    if (!phone || !isPhone(phone)) throw new Error("Số điện thoại không hợp lệ");
    if (!input.password || input.password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");
    if (!["customer", "seller", "shipper", "admin"].includes(input.role)) throw new Error("Vai trò không hợp lệ");

    const users = db.users ?? [];
    const creds = db.auth?.credentials ?? [];
    const duplicated =
      users.some((u) => u.email.toLowerCase() === email || u.phone === phone) ||
      creds.some((c) => c.email?.toLowerCase() === email || c.phone === phone);
    if (duplicated) throw new Error("Tài khoản đã tồn tại");

    const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const now = new Date().toISOString();

    const user: User = {
      id: nextId,
      fullName: name,
      email,
      phone,
      avatar: name[0]?.toUpperCase() || "U",
      roles: [input.role],
      createdAt: now,
    };

    const cred = {
      userId: nextId,
      email,
      phone,
      passwordHash: "hash_" + input.password, // demo
      status: "active",
      lastLoginAt: null as string | null,
    };

    users.push(user);
    if (!db.auth) db.auth = {};
    if (!db.auth.credentials) db.auth.credentials = [];
    db.auth.credentials.push(cred);
    db.users = users;

    if (input.role === "seller") {
      if (!db.sellers) db.sellers = [];
      db.sellers.push({ userId: nextId, displayName: name, restaurantIds: [], status: "active" });
    }
    if (input.role === "shipper") {
      if (!db.couriers) db.couriers = [];
      db.couriers.push({
        userId: nextId,
        vehicle: { type: "motorbike" },
        serviceArea: ["Quận 1"],
        onDuty: false,
        rating: 5,
        completedTrips: 0,
      });
    }

    return { user };
  };

  return {
    // raw
    db,

    // categories
    getCategories,
    getCategoryNames,

    // foods
    getFoods,
    getFoodById,
    getFoodsByCategory,
    getFoodsByRestaurantId,
    searchFoods,
    getBestSellers,
    getFoodReviews,

    // restaurants
    getRestaurants,
    getRestaurantById,
    getRestaurantBySlug,
    getRestaurantsByCategory,
    searchRestaurants,
    getRestaurantReviews,

    // users / payments / orders
    getUsers,
    getUserById,
    getAddressesByUser,
    getCardsByUser,
    getBanksByUser,
    getDefaultPayment,
    getSellers,
    getVendorRestaurants,
    getCouriers,
    getOrders,
    getOrdersByUser,

    // purchase & permissions
    hasPurchasedFood,
    hasPurchasedFromRestaurant,
    canCreateReview,

    // banners & images
    getBanners,
    requireImage,

    // auth
    registerUser,

    // address tree
    getProvinces,
    getDistrictsByProvinceId,
    getWardsByDistrictId,
    findProvinceByName,
    findDistrictByName,
    findWardByName,
    getProvinceOptions,
    getDistrictOptions,
    getWardOptions,

    getProvinceNameById,
    getDistrictNameById,
    getWardNameById,
  };
}

