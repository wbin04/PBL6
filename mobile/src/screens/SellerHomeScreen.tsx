import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  Switch,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Menu,
  X,
  Search,
  Bell,
  Plus,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  Settings,
  Star,
  Clock,
  MapPin,
  Phone,
  Edit,
  Trash2,
  Camera,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';

const { width, height } = Dimensions.get('window');

export const SellerHomeScreen: React.FC = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [addFoodModalVisible, setAddFoodModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [avatarPickerModalVisible, setAvatarPickerModalVisible] = useState(false);
  const [emojiPickerModalVisible, setEmojiPickerModalVisible] = useState(false);
  const [orderDetailModalVisible, setOrderDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState<string>('today');
  const [chartModalVisible, setChartModalVisible] = useState(false);

  // Store info state
  const [storeInfo, setStoreInfo] = useState({
    name: 'Quán Phở Hà Nội',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    phone: '0901234567',
    rating: 4.5,
    status: 'open',
    image: '🍜'
  });

  // Seller profile state
  const [sellerProfile, setSellerProfile] = useState({
    name: 'Nguyễn Văn Seller',
    email: 'seller@example.com',
    phone: '0901234567',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    avatar: 'S',
    joinDate: '15/08/2023',
    totalOrders: 1247,
    rating: 4.8,
    description: 'Chuyên phục vụ các món ăn Việt Nam truyền thống với hương vị đậm đà, nguyên liệu tươi ngon.'
  });

  // Edit profile form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    storeName: '',
    storeAddress: '',
    storePhone: ''
  });

  // Avatar options
  const avatarOptions = ['S', '👨‍💼', '👩‍💼', '🧑‍🍳', '👨‍🍳', '👩‍🍳', '🧑‍💻', '👨‍💻', '👩‍💻'];

  // Analytics data
  const getAnalyticsData = () => {
    const today = new Date();
    const currentHour = today.getHours();
    
    // Mock data based on time filter
    const analyticsData = {
      today: {
        revenue: 2850000,
        orders: 12,
        avgOrderValue: 237500,
        topFood: 'Pizza Hải Sản',
        hourlyData: Array.from({length: 24}, (_, i) => ({
          hour: i,
          revenue: i < currentHour ? Math.floor(Math.random() * 200000) + 50000 : 0,
          orders: i < currentHour ? Math.floor(Math.random() * 5) + 1 : 0
        })),
        categoryData: [
          { name: 'Pizza', value: 40, revenue: 1140000 },
          { name: 'Burger', value: 25, revenue: 712500 },
          { name: 'Sushi', value: 20, revenue: 570000 },
          { name: 'Salad', value: 15, revenue: 427500 }
        ]
      },
      week: {
        revenue: 18500000,
        orders: 85,
        avgOrderValue: 217647,
        topFood: 'Pizza Hải Sản',
        dailyData: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, i) => ({
          day,
          revenue: Math.floor(Math.random() * 3000000) + 1500000,
          orders: Math.floor(Math.random() * 15) + 8
        })),
        categoryData: [
          { name: 'Pizza', value: 35, revenue: 6475000 },
          { name: 'Burger', value: 30, revenue: 5550000 },
          { name: 'Sushi', value: 20, revenue: 3700000 },
          { name: 'Salad', value: 15, revenue: 2775000 }
        ]
      },
      month: {
        revenue: 75200000,
        orders: 340,
        avgOrderValue: 221176,
        topFood: 'Pizza Hải Sản',
        weeklyData: Array.from({length: 4}, (_, i) => ({
          week: `Tuần ${i + 1}`,
          revenue: Math.floor(Math.random() * 20000000) + 15000000,
          orders: Math.floor(Math.random() * 100) + 60
        })),
        categoryData: [
          { name: 'Pizza', value: 38, revenue: 28576000 },
          { name: 'Burger', value: 28, revenue: 21056000 },
          { name: 'Sushi', value: 19, revenue: 14288000 },
          { name: 'Salad', value: 15, revenue: 11280000 }
        ]
      }
    };

    return analyticsData[analyticsTimeFilter as keyof typeof analyticsData] || analyticsData.today;
  };

  // Add food form state
  const [addFoodForm, setAddFoodForm] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    image: '🍽️',
    realImage: null as string | null
  });

  // Food emoji options
  const foodEmojiOptions = ['🍽️', '🍜', '🍲', '🥪', '🍕', '🍔', '🍟', '🌭', '🥙', '🌮', '🌯', '🥗', '🍣', '🍱', '🍙', '🍛', '🍝', '🍤', '🍖', '🥩', '🍗', '🥓', '🍳', '🧀', '🥖', '🍞', '🥐', '🧇', '🥞', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '☕', '🥤', '🍵', '🧋', '🍺', '🍷'];

  // Categories
  const categories = ['Món chính', 'Khai vị', 'Tráng miệng', 'Đồ uống', 'Món nướng', 'Món chiên', 'Món hấp', 'Salad', 'Súp', 'Khác'];

  // Food items state
  const [foods, setFoods] = useState([
    {
      id: 1,
      name: 'Phở Bò Tái',
      price: 65000,
      description: 'Phở bò tái thơm ngon, nước dùng đậm đà',
      image: '🍜',
      realImage: null as string | null,
      category: 'Phở',
      availability: true,
      rating: 4.6,
      orders: 156
    },
    {
      id: 2,
      name: 'Bún Bò Huế',
      price: 55000,
      description: 'Bún bò Huế cay nồng, đúng vị xứ Huế',
      image: '🍲',
      realImage: null as string | null,
      category: 'Bún',
      availability: true,
      rating: 4.3,
      orders: 89
    },
    {
      id: 3,
      name: 'Bánh Mì Thịt',
      price: 25000,
      description: 'Bánh mì thịt nướng giòn rụm, thơm lừng',
      image: '🥪',
      realImage: null as string | null,
      category: 'Bánh Mì',
      availability: false,
      rating: 4.4,
      orders: 234
    }
  ]);

  // Orders state
  const [orders, setOrders] = useState([
    {
      id: 'ORD-001',
      customer: 'Nguyễn Văn A',
      phone: '0901234567',
      items: [
        { name: 'Phở Bò Tái', quantity: 2, price: 65000 },
        { name: 'Trà Sữa', quantity: 1, price: 30000 }
      ],
      total: 160000,
      status: 'pending',
      time: '10:30',
      date: '16/09/2025',
      address: '456 Lê Lợi, Quận 1, TP.HCM',
      paymentMethod: 'COD',
      notes: 'Không hành, ít muối',
      estimatedTime: '25-30 phút',
      customerAvatar: '👨‍💼'
    },
    {
      id: 'ORD-002',
      customer: 'Trần Thị B',
      phone: '0912345678',
      items: [
        { name: 'Bún Bò Huế', quantity: 1, price: 55000 },
        { name: 'Chả Cá', quantity: 1, price: 45000 }
      ],
      total: 100000,
      status: 'preparing',
      time: '10:15',
      date: '16/09/2025',
      address: '789 Nguyễn Trãi, Quận 5, TP.HCM',
      paymentMethod: 'Online',
      notes: 'Giao nhanh nhé',
      estimatedTime: '20-25 phút',
      customerAvatar: '👩‍💻'
    },
    {
      id: 'ORD-003',
      customer: 'Lê Minh C',
      phone: '0923456789',
      items: [
        { name: 'Bánh Mì Thịt', quantity: 3, price: 25000 }
      ],
      total: 75000,
      status: 'ready',
      time: '09:45',
      date: '16/09/2025',
      address: '123 Hai Bà Trưng, Quận 3, TP.HCM',
      paymentMethod: 'COD',
      notes: '',
      estimatedTime: '15-20 phút',
      customerAvatar: '🧑‍🍳'
    },
    {
      id: 'ORD-004',
      customer: 'Phạm Thu D',
      phone: '0934567890',
      items: [
        { name: 'Phở Bò Tái', quantity: 1, price: 65000 },
        { name: 'Nem Rán', quantity: 2, price: 35000 }
      ],
      total: 135000,
      status: 'completed',
      time: '09:30',
      date: '16/09/2025',
      address: '456 Võ Văn Tần, Quận 1, TP.HCM',
      paymentMethod: 'Online',
      notes: 'Cảm ơn quán!',
      estimatedTime: '30-35 phút',
      customerAvatar: '👩‍💼'
    }
  ]);

  // Stats data
  const stats = [
    {
      title: 'Doanh thu hôm nay',
      value: '2.5M ₫',
      icon: DollarSign,
      color: '#ea580c',
      bgColor: '#fed7aa',
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: 'Đơn hàng mới',
      value: '23',
      icon: ShoppingBag,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      change: '+8%',
      changeType: 'increase'
    },
    {
      title: 'Khách hàng',
      value: '156',
      icon: Users,
      color: '#ea580c',
      bgColor: '#fed7aa',
      change: '+15%',
      changeType: 'increase'
    },
    {
      title: 'Đánh giá TB',
      value: '4.5⭐',
      icon: Star,
      color: '#ea580c',
      bgColor: '#fed7aa',
      change: '+0.2',
      changeType: 'increase'
    }
  ];

  // Navigation items
  const navigationItems = [
    { title: 'Tổng quan', icon: TrendingUp, active: activeSection === 'dashboard', section: 'dashboard' },
    { title: 'Đơn hàng', icon: Package, active: activeSection === 'orders', section: 'orders' },
    { title: 'Thực đơn', icon: ShoppingBag, active: activeSection === 'menu', section: 'menu' },
    { title: 'Thống kê', icon: TrendingUp, active: activeSection === 'analytics', section: 'analytics' },
    { title: 'Cài đặt', icon: Settings, active: activeSection === 'settings', section: 'settings' },
  ];

  // Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Đơn hàng mới',
      message: 'Khách hàng Nguyễn Văn A đã đặt đơn hàng #ORD-001',
      time: '2 phút trước',
      isRead: false,
      icon: '🛍️'
    },
    {
      id: 2,
      title: 'Đánh giá mới',
      message: 'Bạn nhận được đánh giá 5 sao cho món Phở Bò Tái',
      time: '15 phút trước',
      isRead: false,
      icon: '⭐'
    },
    {
      id: 3,
      title: 'Hết hàng',
      message: 'Bánh Mì Thịt đã hết hàng',
      time: '1 giờ trước',
      isRead: true,
      icon: '⚠️'
    }
  ]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarVisible(false);
  };

  const handleOrderStatusChange = (orderId: string, newStatus: string) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    
    // Show success message
    const statusText = getOrderStatusText(newStatus);
    Alert.alert('Thành công', `Đơn hàng ${orderId} đã được cập nhật thành "${statusText}"`);
  };

  const handleViewOrderDetail = (order: any) => {
    setSelectedOrder(order);
    setOrderDetailModalVisible(true);
  };

  const handleCallCustomer = (phone: string) => {
    Alert.alert(
      'Gọi khách hàng',
      `Bạn có muốn gọi cho khách hàng số ${phone}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gọi', onPress: () => {
          // Here you would implement actual calling functionality
          Alert.alert('Thông báo', 'Tính năng gọi điện đang được phát triển');
        }}
      ]
    );
  };

  const handleRejectOrder = (orderId: string) => {
    Alert.alert(
      'Từ chối đơn hàng',
      'Bạn có chắc chắn muốn từ chối đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Từ chối', style: 'destructive', onPress: () => {
          setOrders(prev => prev.filter(order => order.id !== orderId));
          Alert.alert('Thành công', 'Đã từ chối đơn hàng');
        }}
      ]
    );
  };

  const getFilteredOrders = () => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter(order => order.status === orderStatusFilter);
  };

  const handleToggleFoodAvailability = (foodId: number) => {
    setFoods(prev =>
      prev.map(food =>
        food.id === foodId ? { ...food, availability: !food.availability } : food
      )
    );
  };

  const handleToggleStoreStatus = () => {
    setStoreInfo(prev => ({
      ...prev,
      status: prev.status === 'open' ? 'closed' : 'open'
    }));
  };

  const handleEditProfile = () => {
    // Initialize form with current data
    setEditForm({
      name: sellerProfile.name,
      email: sellerProfile.email,
      phone: sellerProfile.phone,
      address: sellerProfile.address,
      description: sellerProfile.description,
      storeName: storeInfo.name,
      storeAddress: storeInfo.address,
      storePhone: storeInfo.phone
    });
    
    setProfileModalVisible(false);
    setEditProfileModalVisible(true);
  };

  const handleSaveProfile = () => {
    // Validate form
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tên và email!');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ!');
      return;
    }

    // Update seller profile
    setSellerProfile(prev => ({
      ...prev,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
      description: editForm.description
    }));

    // Update store info
    setStoreInfo(prev => ({
      ...prev,
      name: editForm.storeName,
      address: editForm.storeAddress,
      phone: editForm.storePhone
    }));

    setEditProfileModalVisible(false);
    Alert.alert('Thành công', 'Hồ sơ đã được cập nhật thành công!');
  };

  const handleCancelEdit = () => {
    Alert.alert(
      'Hủy chỉnh sửa',
      'Bạn có chắc chắn muốn hủy? Các thay đổi sẽ không được lưu.',
      [
        { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
        { 
          text: 'Hủy', 
          style: 'destructive',
          onPress: () => setEditProfileModalVisible(false)
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            setProfileModalVisible(false);
            // Handle logout logic
            Alert.alert('Đăng xuất', 'Đã đăng xuất thành công!');
          },
        },
      ]
    );
  };

  const handleAvatarPress = () => {
    setAvatarPickerModalVisible(true);
  };

  const handleAvatarSelect = (selectedAvatar: string) => {
    setSellerProfile(prev => ({
      ...prev,
      avatar: selectedAvatar
    }));
    setAvatarPickerModalVisible(false);
    Alert.alert('Thành công', 'Avatar đã được thay đổi!');
  };

  // Add Food Functions
  const handleAddFood = () => {
    // Reset form
    setAddFoodForm({
      name: '',
      price: '',
      description: '',
      category: '',
      image: '🍽️',
      realImage: null
    });
    setAddFoodModalVisible(true);
  };

  const handleSaveFood = () => {
    // Validate form
    if (!addFoodForm.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn!');
      return;
    }

    if (!addFoodForm.price.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá món ăn!');
      return;
    }

    const price = parseInt(addFoodForm.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Lỗi', 'Giá món ăn không hợp lệ!');
      return;
    }

    if (!addFoodForm.category) {
      Alert.alert('Lỗi', 'Vui lòng chọn danh mục!');
      return;
    }

    // Create new food item
    const newFood = {
      id: foods.length + 1,
      name: addFoodForm.name.trim(),
      price: price,
      description: addFoodForm.description.trim() || 'Không có mô tả',
      image: addFoodForm.image,
      realImage: addFoodForm.realImage,
      category: addFoodForm.category,
      availability: true,
      rating: 4.5,
      orders: 0
    };

    // Add to foods array
    setFoods(prev => [...prev, newFood]);
    setAddFoodModalVisible(false);
    
    Alert.alert('Thành công', `Đã thêm món "${newFood.name}" vào thực đơn!`);
  };

  const handleCancelAddFood = () => {
    Alert.alert(
      'Hủy thêm món',
      'Bạn có chắc chắn muốn hủy? Thông tin đã nhập sẽ bị mất.',
      [
        { text: 'Tiếp tục thêm', style: 'cancel' },
        { 
          text: 'Hủy', 
          style: 'destructive',
          onPress: () => setAddFoodModalVisible(false)
        }
      ]
    );
  };

  const handleEmojiSelect = (selectedEmoji: string) => {
    setAddFoodForm(prev => ({
      ...prev,
      image: selectedEmoji
    }));
    setEmojiPickerModalVisible(false);
  };

  // Image handling functions
  const handleImagePicker = () => {
    Alert.alert(
      'Chọn ảnh món ăn',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thư viện', onPress: pickImageFromLibrary },
        { text: 'Chụp ảnh', onPress: takePicture }
      ]
    );
  };

  const pickImageFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAddFoodForm(prev => ({
        ...prev,
        realImage: result.assets[0].uri
      }));
    }
  };

  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Lỗi', 'Cần cấp quyền truy cập camera!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAddFoodForm(prev => ({
        ...prev,
        realImage: result.assets[0].uri
      }));
    }
  };

  const removeImage = () => {
    setAddFoodForm(prev => ({
      ...prev,
      realImage: null
    }));
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'preparing': return '#3b82f6';
      case 'ready': return '#10b981';
      case 'completed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'preparing': return 'Đang chuẩn bị';
      case 'ready': return 'Sẵn sàng';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  const renderDashboard = () => (
    <>
      {/* Store Status Card */}
      <View style={styles.storeCard}>
        <View style={styles.storeHeader}>
          <Text style={styles.storeEmoji}>{storeInfo.image}</Text>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{storeInfo.name}</Text>
            <View style={styles.storeDetails}>
              <MapPin size={12} color="#6b7280" />
              <Text style={styles.storeAddress}>{storeInfo.address}</Text>
            </View>
            <View style={styles.storeDetails}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.storeRating}>{storeInfo.rating}</Text>
            </View>
          </View>
          <View style={styles.storeStatus}>
            <Switch
              value={storeInfo.status === 'open'}
              onValueChange={handleToggleStoreStatus}
              trackColor={{ false: '#d1d5db', true: '#fed7aa' }}
              thumbColor={storeInfo.status === 'open' ? '#ea580c' : '#9ca3af'}
            />
            <Text style={[
              styles.storeStatusText,
              { color: storeInfo.status === 'open' ? '#10b981' : '#ef4444' }
            ]}>
              {storeInfo.status === 'open' ? 'Mở cửa' : 'Đóng cửa'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                <IconComponent size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={[
                styles.statChange,
                { color: stat.changeType === 'increase' ? '#10b981' : '#ef4444' }
              ]}>
                {stat.change}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
        {orders.slice(0, 3).map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderTime}>{order.time}</Text>
            </View>
            <Text style={styles.orderCustomer}>{order.customer}</Text>
            <Text style={styles.orderItems}>
              {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
            </Text>
            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>{order.total.toLocaleString()} ₫</Text>
              <View style={[
                styles.orderStatus,
                { backgroundColor: getOrderStatusColor(order.status) }
              ]}>
                <Text style={styles.orderStatusText}>
                  {getOrderStatusText(order.status)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  const renderOrders = () => {
    const filteredOrders = getFilteredOrders();
    const statusOptions = [
      { label: 'Tất cả', value: 'all' },
      { label: 'Chờ xác nhận', value: 'pending' },
      { label: 'Đang chuẩn bị', value: 'preparing' },
      { label: 'Sẵn sàng', value: 'ready' },
      { label: 'Hoàn thành', value: 'completed' }
    ];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quản lý đơn hàng</Text>
          <View style={styles.orderStats}>
            <Text style={styles.orderStatsText}>
              {filteredOrders.length} đơn hàng
            </Text>
          </View>
        </View>
        
        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterContainer}>
          <View style={styles.statusFilterRow}>
            {statusOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.statusFilterItem,
                  orderStatusFilter === option.value && styles.statusFilterItemActive
                ]}
                onPress={() => setOrderStatusFilter(option.value)}
              >
                <Text style={[
                  styles.statusFilterText,
                  orderStatusFilter === option.value && styles.statusFilterTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyOrdersContainer}>
            <Text style={styles.emptyOrdersText}>Không có đơn hàng nào</Text>
            <Text style={styles.emptyOrdersSubtext}>
              {orderStatusFilter === 'all' 
                ? 'Chưa có đơn hàng nào được tạo'
                : `Không có đơn hàng ở trạng thái "${statusOptions.find(s => s.value === orderStatusFilter)?.label}"`
              }
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => handleViewOrderDetail(order)}
              activeOpacity={0.7}
            >
              <View style={styles.orderCardHeader}>
                <View style={styles.orderCustomerInfo}>
                  <View style={styles.orderCustomerAvatar}>
                    <Text style={styles.orderCustomerAvatarText}>{order.customerAvatar}</Text>
                  </View>
                  <View style={styles.orderCustomerDetails}>
                    <Text style={styles.orderCustomer}>{order.customer}</Text>
                    <Text style={styles.orderPhone}>{order.phone}</Text>
                  </View>
                </View>
                <View style={styles.orderTimeInfo}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderTime}>{order.time}</Text>
                </View>
              </View>

              <View style={styles.orderContent}>
                <View style={styles.orderItems}>
                  <Text style={styles.orderItemsTitle}>Món đã order:</Text>
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                      <View style={styles.orderItemRight}>
                        <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                        <Text style={styles.orderItemPrice}>{item.price.toLocaleString()} ₫</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.orderTotalContainer}>
                    <Text style={styles.orderTotalLabel}>Tổng cộng:</Text>
                    <Text style={styles.orderTotal}>{order.total.toLocaleString()} ₫</Text>
                  </View>
                  <View style={styles.orderMetaInfo}>
                    <View style={styles.orderPaymentMethod}>
                      <Text style={styles.orderPaymentText}>
                        {order.paymentMethod === 'COD' ? '💰 COD' : '💳 Online'}
                      </Text>
                    </View>
                    <View style={[
                      styles.orderStatus,
                      { backgroundColor: getOrderStatusColor(order.status) }
                    ]}>
                      <Text style={styles.orderStatusText}>
                        {getOrderStatusText(order.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.orderQuickActions}>
                {order.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.orderQuickActionButton, styles.rejectButton]}
                      onPress={() => handleRejectOrder(order.id)}
                    >
                      <Text style={styles.orderQuickActionText}>Từ chối</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.orderQuickActionButton, styles.acceptButton]}
                      onPress={() => handleOrderStatusChange(order.id, 'preparing')}
                    >
                      <Text style={[styles.orderQuickActionText, { color: '#ffffff' }]}>Xác nhận</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {order.status === 'preparing' && (
                  <TouchableOpacity
                    style={[styles.orderQuickActionButton, styles.readyButton]}
                    onPress={() => handleOrderStatusChange(order.id, 'ready')}
                  >
                    <Text style={[styles.orderQuickActionText, { color: '#ffffff' }]}>Sẵn sàng</Text>
                  </TouchableOpacity>
                )}
                
                {order.status === 'ready' && (
                  <TouchableOpacity
                    style={[styles.orderQuickActionButton, styles.completeButton]}
                    onPress={() => handleOrderStatusChange(order.id, 'completed')}
                  >
                    <Text style={[styles.orderQuickActionText, { color: '#ffffff' }]}>Hoàn thành</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.orderQuickActionButton, styles.callButton]}
                  onPress={() => handleCallCustomer(order.phone)}
                >
                  <Text style={styles.orderQuickActionText}>📞 Gọi</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  const renderMenu = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Thực đơn của tôi</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddFood}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addButtonText}>Thêm món</Text>
        </TouchableOpacity>
      </View>
      
      {foods.map((food) => (
        <View key={food.id} style={styles.foodCard}>
          <View style={styles.foodImageContainer}>
            {food.realImage ? (
              <Image source={{ uri: food.realImage }} style={styles.foodImage} />
            ) : (
              <Text style={styles.foodEmoji}>{food.image}</Text>
            )}
          </View>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{food.name}</Text>
            <Text style={styles.foodDescription}>{food.description}</Text>
            <Text style={styles.foodPrice}>{food.price.toLocaleString()} ₫</Text>
            <View style={styles.foodStats}>
              <Text style={styles.foodRating}>⭐ {food.rating}</Text>
              <Text style={styles.foodOrders}>{food.orders} đơn</Text>
            </View>
          </View>
          <View style={styles.foodActions}>
            <Switch
              value={food.availability}
              onValueChange={() => handleToggleFoodAvailability(food.id)}
              trackColor={{ false: '#d1d5db', true: '#fed7aa' }}
              thumbColor={food.availability ? '#ea580c' : '#9ca3af'}
            />
            <TouchableOpacity
              style={styles.foodActionButton}
              onPress={() => {
                setSelectedFood(food);
                setFoodModalVisible(true);
              }}
            >
              <Edit size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff7ed" barStyle="dark-content" />
      
      <View style={styles.wrapper}>
        {/* Sidebar */}
        {sidebarVisible && (
          <>
            <TouchableOpacity
              style={styles.overlay}
              onPress={() => setSidebarVisible(false)}
              activeOpacity={1}
            />
            <View style={styles.sidebar}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Seller Panel</Text>
                <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                  <X size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.sidebarContent}>
                {navigationItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.menuItem, item.active && styles.menuItemActive]}
                      onPress={() => handleSectionChange(item.section)}
                    >
                      <IconComponent
                        size={16}
                        color={item.active ? '#ea580c' : '#6b7280'}
                      />
                      <Text style={[styles.menuText, item.active && styles.menuTextActive]}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setSidebarVisible(true)}
              >
                <Menu size={20} color="#1f2937" />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>
                  {activeSection === 'dashboard' && 'Tổng quan'}
                  {activeSection === 'orders' && 'Đơn hàng'}
                  {activeSection === 'menu' && 'Thực đơn'}
                  {activeSection === 'analytics' && 'Thống kê'}
                  {activeSection === 'settings' && 'Cài đặt'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {activeSection === 'dashboard' && 'Quản lý cửa hàng của bạn'}
                  {activeSection === 'orders' && 'Theo dõi và xử lý đơn hàng'}
                  {activeSection === 'menu' && 'Quản lý thực đơn và món ăn'}
                  {activeSection === 'analytics' && 'Phân tích doanh số'}
                  {activeSection === 'settings' && 'Cấu hình cửa hàng'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setSearchModalVisible(true)}
              >
                <Search size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setNotificationModalVisible(true)}
              >
                <Bell size={18} color="#6b7280" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notifications.filter(n => !n.isRead).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => setProfileModalVisible(true)}
              >
                <Text style={styles.avatarText}>S</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'orders' && renderOrders()}
            {activeSection === 'menu' && renderMenu()}
            {activeSection === 'analytics' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thống kê</Text>
                <Text style={styles.comingSoon}>Tính năng đang phát triển...</Text>
              </View>
            )}
            {activeSection === 'settings' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cài đặt</Text>
                <Text style={styles.comingSoon}>Tính năng đang phát triển...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Notification Modal */}
      <Modal
        visible={notificationModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thông báo</Text>
            <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notificationList}>
            {notifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationItem,
                  { backgroundColor: notification.isRead ? '#ffffff' : '#fef3e2' }
                ]}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.notificationIconText}>{notification.icon}</Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tìm kiếm</Text>
            <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={18} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm món ăn, đơn hàng..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>

          <View style={styles.searchResults}>
            <Text style={styles.comingSoon}>Tính năng tìm kiếm đang phát triển...</Text>
          </View>
        </View>
      </Modal>
      
      {/* Seller Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hồ sơ người bán</Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
            {/* Avatar Section */}
            <View style={styles.profileAvatarSection}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{sellerProfile.avatar}</Text>
                <TouchableOpacity 
                  style={styles.profileCameraButton}
                  onPress={handleAvatarPress}
                >
                  <Camera size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName}>{sellerProfile.name}</Text>
              <Text style={styles.profileJoinDate}>Tham gia từ: {sellerProfile.joinDate}</Text>
            </View>

            {/* Stats Section */}
            <View style={styles.profileStatsContainer}>
              <View style={styles.profileStatCard}>
                <Text style={styles.profileStatValue}>{sellerProfile.totalOrders}</Text>
                <Text style={styles.profileStatLabel}>Tổng đơn hàng</Text>
              </View>
              <View style={styles.profileStatCard}>
                <Text style={styles.profileStatValue}>⭐ {sellerProfile.rating}</Text>
                <Text style={styles.profileStatLabel}>Đánh giá</Text>
              </View>
              <View style={[styles.profileStatCard, { borderRightWidth: 0 }]}>
                <Text style={styles.profileStatValue}>{storeInfo.rating}⭐</Text>
                <Text style={styles.profileStatLabel}>Cửa hàng</Text>
              </View>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileSectionTitle}>Thông tin cá nhân</Text>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Email</Text>
                <Text style={styles.profileInfoValue}>{sellerProfile.email}</Text>
              </View>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Số điện thoại</Text>
                <Text style={styles.profileInfoValue}>{sellerProfile.phone}</Text>
              </View>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Địa chỉ</Text>
                <Text style={styles.profileInfoValue}>{sellerProfile.address}</Text>
              </View>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Mô tả</Text>
                <Text style={styles.profileInfoValue}>{sellerProfile.description}</Text>
              </View>
            </View>

            {/* Store Info */}
            <View style={styles.profileInfoSection}>
              <Text style={styles.profileSectionTitle}>Thông tin cửa hàng</Text>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Tên cửa hàng</Text>
                <Text style={styles.profileInfoValue}>{storeInfo.name}</Text>
              </View>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Địa chỉ cửa hàng</Text>
                <Text style={styles.profileInfoValue}>{storeInfo.address}</Text>
              </View>
              
              <View style={styles.profileInfoItem}>
                <Text style={styles.profileInfoLabel}>Trạng thái</Text>
                <View style={styles.profileStatusContainer}>
                  <Text style={[
                    styles.profileStatusText,
                    { color: storeInfo.status === 'open' ? '#10b981' : '#ef4444' }
                  ]}>
                    {storeInfo.status === 'open' ? '🟢 Đang mở cửa' : '🔴 Đóng cửa'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.profileActionButton}
                onPress={handleEditProfile}
              >
                <Edit size={16} color="#ea580c" />
                <Text style={styles.profileActionButtonText}>Chỉnh sửa hồ sơ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.profileActionButton, styles.profileLogoutButton]}
                onPress={handleLogout}
              >
                <Text style={[styles.profileActionButtonText, { color: '#ef4444' }]}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleCancelEdit}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editProfileContent} showsVerticalScrollIndicator={false}>
            {/* Personal Information Section */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Thông tin cá nhân</Text>
              
              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.name}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, name: value }))}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Email *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.email}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, email: value }))}
                  placeholder="Nhập email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.phone}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, phone: value }))}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Địa chỉ</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.address}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, address: value }))}
                  placeholder="Nhập địa chỉ"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Mô tả bản thân</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editForm.description}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, description: value }))}
                  placeholder="Giới thiệu về bản thân và kinh nghiệm..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Store Information Section */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Thông tin cửa hàng</Text>
              
              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Tên cửa hàng</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.storeName}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, storeName: value }))}
                  placeholder="Nhập tên cửa hàng"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Địa chỉ cửa hàng</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.storeAddress}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, storeAddress: value }))}
                  placeholder="Nhập địa chỉ cửa hàng"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.editFormGroup}>
                <Text style={styles.editLabel}>Số điện thoại cửa hàng</Text>
                <TextInput
                  style={styles.editInput}
                  value={editForm.storePhone}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, storePhone: value }))}
                  placeholder="Nhập số điện thoại cửa hàng"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.editCancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.editCancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.editSaveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.editSaveButtonText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarPickerModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.avatarPickerOverlay}>
          <View style={styles.avatarPickerModal}>
            <View style={styles.avatarPickerHeader}>
              <Text style={styles.avatarPickerTitle}>Chọn avatar</Text>
              <TouchableOpacity onPress={() => setAvatarPickerModalVisible(false)}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.avatarGrid}>
              {avatarOptions.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarOption,
                    sellerProfile.avatar === avatar && styles.avatarOptionSelected
                  ]}
                  onPress={() => handleAvatarSelect(avatar)}
                >
                  <Text style={styles.avatarOptionText}>{avatar}</Text>
                  {sellerProfile.avatar === avatar && (
                    <View style={styles.avatarSelectedIndicator}>
                      <Text style={styles.avatarSelectedCheckmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Food Modal */}
      <Modal
        visible={addFoodModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm món mới</Text>
            <TouchableOpacity onPress={handleCancelAddFood}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.addFoodContent} showsVerticalScrollIndicator={false}>
            {/* Food Image Section */}
            <View style={styles.addFoodImageSection}>
              <Text style={styles.addFoodSectionTitle}>Hình ảnh món ăn</Text>
              
              {/* Real Image Display */}
              {addFoodForm.realImage ? (
                <View style={styles.addFoodImagePreview}>
                  <Image source={{ uri: addFoodForm.realImage }} style={styles.addFoodImageFull} />
                  <TouchableOpacity style={styles.addFoodImageRemove} onPress={removeImage}>
                    <Text style={styles.addFoodImageRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addFoodImageButton}
                  onPress={handleImagePicker}
                >
                  <Text style={styles.addFoodImageIcon}>📷</Text>
                  <Text style={styles.addFoodImageLabel}>Thêm ảnh món ăn</Text>
                  <Text style={styles.addFoodImageSubLabel}>Nhấn để chọn từ thư viện hoặc chụp ảnh</Text>
                </TouchableOpacity>
              )}
              
              
            </View>

            {/* Basic Information */}
            <View style={styles.addFoodSection}>
              <Text style={styles.addFoodSectionTitle}>Thông tin cơ bản</Text>
              
              <View style={styles.addFoodFormGroup}>
                <Text style={styles.addFoodLabel}>Tên món ăn *</Text>
                <TextInput
                  style={styles.addFoodInput}
                  value={addFoodForm.name}
                  onChangeText={(value) => setAddFoodForm(prev => ({ ...prev, name: value }))}
                  placeholder="VD: Phở Bò Tái"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.addFoodFormGroup}>
                <Text style={styles.addFoodLabel}>Giá tiền (VNĐ) *</Text>
                <TextInput
                  style={styles.addFoodInput}
                  value={addFoodForm.price}
                  onChangeText={(value) => setAddFoodForm(prev => ({ ...prev, price: value }))}
                  placeholder="VD: 65000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.addFoodFormGroup}>
                <Text style={styles.addFoodLabel}>Danh mục *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
                  <View style={styles.categoryContainer}>
                    {categories.map((category, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.categoryOption,
                          addFoodForm.category === category && styles.categoryOptionSelected
                        ]}
                        onPress={() => setAddFoodForm(prev => ({ ...prev, category }))}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          addFoodForm.category === category && styles.categoryOptionTextSelected
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.addFoodFormGroup}>
                <Text style={styles.addFoodLabel}>Mô tả món ăn</Text>
                <TextInput
                  style={[styles.addFoodInput, styles.addFoodTextArea]}
                  value={addFoodForm.description}
                  onChangeText={(value) => setAddFoodForm(prev => ({ ...prev, description: value }))}
                  placeholder="Mô tả về hương vị, nguyên liệu..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.addFoodActions}>
              <TouchableOpacity 
                style={styles.addFoodCancelButton}
                onPress={handleCancelAddFood}
              >
                <Text style={styles.addFoodCancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.addFoodSaveButton}
                onPress={handleSaveFood}
              >
                <Text style={styles.addFoodSaveButtonText}>Thêm món</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Emoji Picker Modal */}
      <Modal
        visible={emojiPickerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn emoji món ăn</Text>
            <TouchableOpacity onPress={() => setEmojiPickerModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.emojiPickerContent} showsVerticalScrollIndicator={false}>
            <View style={styles.emojiGrid}>
              {foodEmojiOptions.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.emojiOption,
                    addFoodForm.image === emoji && styles.emojiOptionSelected
                  ]}
                  onPress={() => handleEmojiSelect(emoji)}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                  {addFoodForm.image === emoji && (
                    <View style={styles.emojiSelectedIndicator}>
                      <Text style={styles.emojiSelectedCheckmark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Order Detail Modal */}
      <Modal
        visible={orderDetailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
            <TouchableOpacity onPress={() => setOrderDetailModalVisible(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <ScrollView style={styles.orderDetailContent} showsVerticalScrollIndicator={false}>
              {/* Customer Info */}
              <View style={styles.orderDetailSection}>
                <Text style={styles.orderDetailSectionTitle}>Thông tin khách hàng</Text>
                <View style={styles.orderDetailCustomer}>
                  <View style={styles.orderCustomerAvatar}>
                    <Text style={styles.orderCustomerAvatarText}>{selectedOrder.customerAvatar}</Text>
                  </View>
                  <View style={styles.orderDetailCustomerInfo}>
                    <Text style={styles.orderDetailCustomerName}>{selectedOrder.customer}</Text>
                    <TouchableOpacity onPress={() => handleCallCustomer(selectedOrder.phone)}>
                      <Text style={styles.orderDetailCustomerPhone}>📞 {selectedOrder.phone}</Text>
                    </TouchableOpacity>
                    <Text style={styles.orderDetailCustomerAddress}>📍 {selectedOrder.address}</Text>
                  </View>
                </View>
              </View>

              {/* Order Info */}
              <View style={styles.orderDetailSection}>
                <Text style={styles.orderDetailSectionTitle}>Thông tin đơn hàng</Text>
                <View style={styles.orderDetailInfo}>
                  <View style={styles.orderDetailInfoRow}>
                    <Text style={styles.orderDetailInfoLabel}>Mã đơn hàng:</Text>
                    <Text style={styles.orderDetailInfoValue}>{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.orderDetailInfoRow}>
                    <Text style={styles.orderDetailInfoLabel}>Thời gian đặt:</Text>
                    <Text style={styles.orderDetailInfoValue}>{selectedOrder.time} - {selectedOrder.date}</Text>
                  </View>
                  <View style={styles.orderDetailInfoRow}>
                    <Text style={styles.orderDetailInfoLabel}>Thời gian dự kiến:</Text>
                    <Text style={styles.orderDetailInfoValue}>{selectedOrder.estimatedTime}</Text>
                  </View>
                  <View style={styles.orderDetailInfoRow}>
                    <Text style={styles.orderDetailInfoLabel}>Thanh toán:</Text>
                    <Text style={styles.orderDetailInfoValue}>
                      {selectedOrder.paymentMethod === 'COD' ? '💰 Tiền mặt' : '💳 Online'}
                    </Text>
                  </View>
                  <View style={styles.orderDetailInfoRow}>
                    <Text style={styles.orderDetailInfoLabel}>Trạng thái:</Text>
                    <View style={[
                      styles.orderDetailStatus,
                      { backgroundColor: getOrderStatusColor(selectedOrder.status) }
                    ]}>
                      <Text style={styles.orderDetailStatusText}>
                        {getOrderStatusText(selectedOrder.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Items */}
              <View style={styles.orderDetailSection}>
                <Text style={styles.orderDetailSectionTitle}>Món đã order</Text>
                <View style={styles.orderDetailItems}>
                  {selectedOrder.items.map((item: any, index: number) => (
                    <View key={index} style={styles.orderDetailItem}>
                      <View style={styles.orderDetailItemLeft}>
                        <Text style={styles.orderDetailItemName}>{item.name}</Text>
                        <Text style={styles.orderDetailItemPrice}>{item.price.toLocaleString()} ₫</Text>
                      </View>
                      <Text style={styles.orderDetailItemQuantity}>x{item.quantity}</Text>
                      <Text style={styles.orderDetailItemTotal}>
                        {(item.price * item.quantity).toLocaleString()} ₫
                      </Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.orderDetailTotal}>
                  <Text style={styles.orderDetailTotalLabel}>Tổng cộng:</Text>
                  <Text style={styles.orderDetailTotalValue}>{selectedOrder.total.toLocaleString()} ₫</Text>
                </View>
              </View>

              {/* Notes */}
              {selectedOrder.notes && (
                <View style={styles.orderDetailSection}>
                  <Text style={styles.orderDetailSectionTitle}>Ghi chú</Text>
                  <View style={styles.orderDetailNotes}>
                    <Text style={styles.orderDetailNotesText}>{selectedOrder.notes}</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.orderDetailActions}>
                {selectedOrder.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.orderDetailActionButton, styles.orderDetailRejectButton]}
                      onPress={() => {
                        setOrderDetailModalVisible(false);
                        handleRejectOrder(selectedOrder.id);
                      }}
                    >
                      <Text style={styles.orderDetailActionButtonText}>Từ chối đơn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.orderDetailActionButton, styles.orderDetailAcceptButton]}
                      onPress={() => {
                        handleOrderStatusChange(selectedOrder.id, 'preparing');
                        setOrderDetailModalVisible(false);
                      }}
                    >
                      <Text style={[styles.orderDetailActionButtonText, { color: '#ffffff' }]}>
                        Xác nhận đơn
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {selectedOrder.status === 'preparing' && (
                  <TouchableOpacity
                    style={[styles.orderDetailActionButton, styles.orderDetailReadyButton]}
                    onPress={() => {
                      handleOrderStatusChange(selectedOrder.id, 'ready');
                      setOrderDetailModalVisible(false);
                    }}
                  >
                    <Text style={[styles.orderDetailActionButtonText, { color: '#ffffff' }]}>
                      Đánh dấu sẵn sàng
                    </Text>
                  </TouchableOpacity>
                )}
                
                {selectedOrder.status === 'ready' && (
                  <TouchableOpacity
                    style={[styles.orderDetailActionButton, styles.orderDetailCompleteButton]}
                    onPress={() => {
                      handleOrderStatusChange(selectedOrder.id, 'completed');
                      setOrderDetailModalVisible(false);
                    }}
                  >
                    <Text style={[styles.orderDetailActionButtonText, { color: '#ffffff' }]}>
                      Hoàn thành đơn
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  wrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#ffffff',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sidebarTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 6,
  },
  menuItemActive: {
    backgroundColor: '#fed7aa',
    borderWidth: 1,
    borderColor: '#ea580c',
  },
  menuText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  menuTextActive: {
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  
  mainContent: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ffffff',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Store Card
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  storeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  storeAddress: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginLeft: 4,
  },
  storeRating: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginLeft: 4,
  },
  storeStatus: {
    alignItems: 'center',
  },
  storeStatusText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginTop: 4,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  
  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#ffffff',
  },
  
  // Order Card
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
  },
  orderTime: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderCustomer: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  orderPhone: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 4,
  },
  orderAddress: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 8,
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderItemName: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderItemQuantity: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginHorizontal: 8,
  },
  orderItemPrice: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1e293b',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ea580c',
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#ffffff',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  orderActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderActionText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#ffffff',
  },
  
  // Food Card
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  foodImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  foodEmoji: {
    fontSize: 32,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    marginBottom: 4,
  },
  foodPrice: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ea580c',
    marginBottom: 4,
  },
  foodStats: {
    flexDirection: 'row',
    gap: 12,
  },
  foodRating: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodOrders: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foodActions: {
    alignItems: 'center',
    gap: 8,
  },
  foodActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  
  comingSoon: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
    marginTop: 40,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
  },

  // Notification Modal Styles
  notificationList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
    marginTop: 4,
  },

  // Search Modal Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  searchResults: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Modal Styles
  profileContent: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  profileAvatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  profileAvatarText: {
    fontSize: 24,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ffffff',
  },
  profileCameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  profileJoinDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  
  profileStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingVertical: 20,
  },
  profileStatCard: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  profileStatValue: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },
  
  profileInfoSection: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 16,
  },
  profileInfoItem: {
    marginBottom: 16,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 4,
  },
  profileInfoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 20,
  },
  profileStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileStatusText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  
  profileActions: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ea580c',
    gap: 8,
  },
  profileActionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#ea580c',
  },
  profileLogoutButton: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  // Edit Profile Modal Styles
  editProfileContent: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  editSection: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  editSectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 20,
  },
  editFormGroup: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanRegular,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editCancelButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#64748b',
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ffffff',
  },
  // Avatar Picker Modal Styles
  avatarPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickerModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    width: '90%',
  },
  avatarPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPickerTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1f2937',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fed7aa',
  },
  avatarOptionText: {
    fontSize: 24,
    textAlign: 'center',
  },
  avatarSelectedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelectedCheckmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Add Food Modal Styles
  addFoodContent: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  addFoodImageSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  addFoodSectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  addFoodEmojiButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  addFoodEmojiText: {
    fontSize: 48,
    marginBottom: 8,
  },
  addFoodEmojiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },
  addFoodSection: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  addFoodFormGroup: {
    marginBottom: 20,
  },
  addFoodLabel: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 8,
  },
  addFoodInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanRegular,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addFoodTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryScrollView: {
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  categoryOption: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryOptionSelected: {
    backgroundColor: '#fed7aa',
    borderColor: '#ea580c',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  categoryOptionTextSelected: {
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  addFoodActions: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  addFoodCancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addFoodCancelButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#64748b',
  },
  addFoodSaveButton: {
    flex: 1,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFoodSaveButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ffffff',
  },
  
  // Emoji Picker Modal Styles
  emojiPickerContent: {
    flex: 1,
    backgroundColor: '#fff7ed',
    padding: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiOption: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emojiOptionSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fed7aa',
    borderWidth: 2,
  },
  emojiOptionText: {
    fontSize: 24,
    textAlign: 'center',
  },
  emojiSelectedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ea580c',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiSelectedCheckmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Food Image Styles for Add Food Modal
  addFoodImagePreview: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFoodImageFull: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
  },
  addFoodImageRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFoodImageRemoveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addFoodImageButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    width: 200,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addFoodImageIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addFoodImageLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    textAlign: 'center',
    marginBottom: 4,
  },
  addFoodImageSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },
  addFoodImageDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  addFoodImageDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  addFoodImageDividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  
  // Order Management Styles
  orderStats: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  orderStatsText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  
  // Status Filter Styles
  statusFilterContainer: {
    marginBottom: 16,
  },
  statusFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  statusFilterItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusFilterItemActive: {
    backgroundColor: '#fed7aa',
    borderColor: '#ea580c',
  },
  statusFilterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  statusFilterTextActive: {
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  
  // Empty Orders Styles
  emptyOrdersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyOrdersText: {
    fontSize: 18,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 8,
  },
  emptyOrdersSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Enhanced Order Card Styles
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderCustomerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderCustomerAvatarText: {
    fontSize: 18,
    color: '#ea580c',
  },
  orderCustomerDetails: {
    flex: 1,
  },
  orderTimeInfo: {
    alignItems: 'flex-end',
  },
  
  orderContent: {
    marginBottom: 16,
  },
  orderItemsTitle: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 8,
  },
  orderItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTotalLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPaymentMethod: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderPaymentText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  
  // Quick Actions Styles
  orderQuickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderQuickActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  orderQuickActionText: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  acceptButton: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  readyButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  completeButton: {
    backgroundColor: '#6b7280',
    borderColor: '#6b7280',
  },
  callButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  
  // Order Detail Modal Styles
  orderDetailContent: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  orderDetailSection: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  orderDetailSectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 16,
  },
  orderDetailCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDetailCustomerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderDetailCustomerName: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  orderDetailCustomerPhone: {
    fontSize: 14,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 4,
  },
  orderDetailCustomerAddress: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 18,
  },
  
  orderDetailInfo: {
    gap: 12,
  },
  orderDetailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetailInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderDetailInfoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  orderDetailStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderDetailStatusText: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#ffffff',
  },
  
  orderDetailItems: {
    gap: 12,
    marginBottom: 16,
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  orderDetailItemLeft: {
    flex: 1,
  },
  orderDetailItemName: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1e293b',
    marginBottom: 4,
  },
  orderDetailItemPrice: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  orderDetailItemQuantity: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanMedium,
    marginRight: 16,
  },
  orderDetailItemTotal: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ea580c',
  },
  
  orderDetailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  orderDetailTotalLabel: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#1e293b',
  },
  orderDetailTotalValue: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#ea580c',
  },
  
  orderDetailNotes: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  orderDetailNotesText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: Fonts.LeagueSpartanRegular,
    lineHeight: 20,
  },
  
  orderDetailActions: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  orderDetailActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  orderDetailActionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  orderDetailRejectButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  orderDetailAcceptButton: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  orderDetailReadyButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  orderDetailCompleteButton: {
    backgroundColor: '#6b7280',
    borderColor: '#6b7280',
  },
});

export default SellerHomeScreen;