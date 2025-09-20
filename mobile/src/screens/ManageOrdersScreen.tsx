import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image as RNImage,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { ordersService, cartService } from '@/services';
import { ORDER_STATUS, ORDER_STATUS_LABELS, API_CONFIG } from '@/constants';
import { Order, OrderItem as OrderItemType } from '@/types';
import ImageWithFallback from '@/components/ImageWithFallback';

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString()}đ`;
};

// Helper to get status text
const getStatusText = (status: string): string => {
  return status || '';
};

// Helper to get status color
const getStatusColor = (status: string): string => {
  switch(status) {
    case ORDER_STATUS_LABELS[ORDER_STATUS.PENDING]:
      return '#FF9800'; // Orange
    case ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED]:
      return '#2196F3'; // Blue
    case ORDER_STATUS_LABELS[ORDER_STATUS.PREPARING]:
      return '#FF6B35'; // Primary
    case ORDER_STATUS_LABELS[ORDER_STATUS.READY]:
      return '#4CAF50'; // Green
    case ORDER_STATUS_LABELS[ORDER_STATUS.DELIVERED]:
      return '#4CAF50'; // Green
    case ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED]:
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Grey
  }
};

const ManageOrdersScreen: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>(ORDER_STATUS_LABELS[ORDER_STATUS.PENDING]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  // Xử lý parameter từ navigation
  useEffect(() => {
    if (route.params && (route.params as any).selectedTab) {
      const paramTab = (route.params as any).selectedTab;
      if (Object.values(ORDER_STATUS_LABELS).includes(paramTab)) {
        setSelectedTab(paramTab);
      }
    }
  }, [route.params]);

  // Function to load orders from API
  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);

    try {
      // Debug token status before making API call
      const accessToken = await SecureStore.getItemAsync('access_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const user = await SecureStore.getItemAsync('user');
      
      console.log('=== TOKEN DEBUG BEFORE ORDERS API ===');
      console.log('Access token exists:', !!accessToken);
      console.log('Refresh token exists:', !!refreshToken);
      console.log('User exists:', !!user);
      
      if (accessToken) {
        console.log('Access token preview:', `${accessToken.substring(0, 30)}...`);
        console.log('Token length:', accessToken.length);
      } else {
        console.log('❌ NO ACCESS TOKEN - User may need to login again');
      }
      
      const response = await ordersService.getOrders();
      console.log('Loaded orders:', response.results);
      
      // Log the first order's food image URL for debugging
      if (response.results.length > 0 && response.results[0].items.length > 0) {
        console.log('First order food image URL:', response.results[0].items[0].food.image);
        console.log('API base URL:', API_CONFIG.BASE_URL);
      }
      
      setOrders(response.results);
    } catch (err) {
      console.error('Error loading orders:', err);
      console.log('=== ERROR DETAILS ===');
      console.log('Error type:', typeof err);
      console.log('Error message:', (err as any)?.message || 'No message');
      console.log('Error object:', JSON.stringify(err, null, 2));
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load orders when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders(false);
  };

  // Function để tạo thông tin theo dõi từ dữ liệu order thực tế
  const generateTrackingInfo = (order: Order) => {
    // Format food items from order data - include full food object and image info
    const foodItems = order.items.map(item => {
      // Sử dụng price_breakdown để tạo display name đẹp
      let displayName = item.food.title;
      
      if (item.price_breakdown && item.price_breakdown.length > 0) {
        // Sử dụng display từ price_breakdown
        const foodDisplay = item.price_breakdown.find(p => p.type === 'food')?.display;
        const sizeDisplay = item.price_breakdown.find(p => p.type === 'size')?.display;
        
        if (foodDisplay) {
          displayName = foodDisplay;
          if (sizeDisplay) {
            displayName += `\n${sizeDisplay}`;
          }
        }
      } else {
        // Fallback: tạo display name thủ công
        displayName = `${item.food.title} ${formatCurrency(item.food_price)}`;
        
        // Thêm thông tin size nếu có
        if (item.food_option_price && item.food_option_price > 0) {
          const sizeInfo = item.size_display || 
            (item.food_option ? `Size ${item.food_option.size_name}: +${formatCurrency(item.food_option_price)}` : '');
          if (sizeInfo) {
            displayName += `\n${sizeInfo}`;
          }
        }
      }
      
      return {
        name: displayName,
        quantity: item.quantity,
        price: formatCurrency(item.subtotal),
        image: item.food.image,
        food: item.food,
        food_note: item.food_note, // Thêm food_note
      };
    });

    // Calculate shipping details based on order
    const subtotal = parseFloat(order.total_money);
    const shippingFee = 15000;
    const shippingDiscount = order.promo ? -15000 : 0;
    const voucherDiscount = order.promo ? -50000 : 0;
    
    return {
      orderId: order.id,
      shopName: order.items[0]?.food.store?.store_name || 'Cửa hàng',
      foodItems: foodItems,
      totalAmount: formatCurrency(subtotal),
      subtotalAmount: formatCurrency(subtotal - shippingFee - shippingDiscount - voucherDiscount),
      shippingFee,
      shippingDiscount,
      voucherDiscount,
      paymentMethod: order.payment_method,
      trackingCode: `VDN${order.id.toString().padStart(8, '0')}`,
      phoneNumber: order.phone_number,
      deliveryAddress: order.ship_address,
      customerName: order.receiver_name,
      estimatedDelivery: "15:30 - 16:00 hôm nay",
      orderDate: new Date(order.created_date).toLocaleDateString('vi-VN'),
      orderTime: new Date(order.created_date).toLocaleTimeString('vi-VN'),
      status: order.order_status,
      note: order.note, // Thêm note cho toàn đơn hàng
    };
  };

  // Function để cập nhật trạng thái đơn hàng
  const updateOrderStatus = async (orderId: number, newStatus: string, cancelReason?: string) => {
    try {
      setIsLoading(true);
      console.log('=== UPDATE ORDER STATUS ===');
      console.log('orderId:', orderId);
      console.log('newStatus:', newStatus);
      console.log('cancelReason:', cancelReason);
      
      // Check user role to determine which endpoint to use
      const userString = await SecureStore.getItemAsync('user');
      const user = userString ? JSON.parse(userString) : null;
      
      let updatedOrder;
      if (user && user.role === 'Quản lý') {
        // Use admin endpoint for managers
        console.log('Using admin endpoint...');
        updatedOrder = await ordersService.adminUpdateOrderStatus(orderId, newStatus, cancelReason);
      } else {
        // Use regular customer endpoint
        console.log('Using customer endpoint...');
        updatedOrder = await ordersService.updateOrderStatus(orderId, newStatus, cancelReason);
      }
      
      console.log('Updated order response:', updatedOrder);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? updatedOrder : order
        )
      );
      
      // Chuyển sang tab mới nếu đơn hàng bị hủy
      if (newStatus === 'Đã hủy') {
        setSelectedTab(ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED]);
      }
      
      console.log('Order status updated successfully');
      console.log('=== END UPDATE ORDER STATUS ===');
      
      // Show success message
      Alert.alert('Thành công', 'Cập nhật trạng thái đơn hàng thành công');
    } catch (error: any) {
      console.error('=== UPDATE ORDER STATUS ERROR ===');
      console.error('Error updating order status:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('=== END ERROR ===');
      
      // Check if error has specific message from backend
      const errorMessage = error?.message || error?.error || 'Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại sau.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => order.order_status === selectedTab);

  // Sort orders by creation date (newest first)
  const sortOrders = (orders: Order[]): Order[] => {
    return [...orders].sort((a, b) => {
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });
  };
  
  const sortedOrders = sortOrders(filteredOrders);

  const handleReorder = async (order: Order) => {
    try {
      setIsLoading(true);

      // Add each item from the order to the cart (don't clear existing cart)
      for (const item of order.items) {
        await cartService.addToCart({
          food_id: item.food.id,
          quantity: item.quantity
        });
      }

      // Navigate to cart
      navigation.navigate('Cart');

    } catch (error) {
      console.error('Error reordering:', error);
      Alert.alert('Lỗi', 'Không thể thêm các món ăn vào giỏ hàng. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabButton = (status: string, label: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        selectedTab === status && styles.tabButtonActive,
      ]}
      onPress={() => setSelectedTab(status)}
    >
      <Text style={[
        styles.tabText,
        selectedTab === status && styles.tabTextActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderButtons = (order: Order) => {
    if (order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.PENDING]) {
      return (
        <View style={styles.singleButtonRow}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => (navigation as any).navigate('Cancel', { 
              orderId: order.id,
              onOrderCancelled: async (orderId: string, status: string, cancelReason?: string) => {
                try {
                  await updateOrderStatus(parseInt(orderId), status, cancelReason);
                } catch (error) {
                  console.error('Failed to cancel order from callback:', error);
                  // Don't show additional error here as updateOrderStatus already handles it
                }
              }
            })}
          >
            <Text style={styles.cancelButtonText}>Hủy đơn</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.PREPARING] || 
              order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED] ||
              order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.READY]) {
      return (
        <View style={styles.singleButtonRow}>
          <TouchableOpacity 
            style={styles.trackButton}
            onPress={() => (navigation as any).navigate('Tracking', { 
              trackingInfo: generateTrackingInfo(order) 
            })}
          >
            <Text style={styles.trackButtonText}>Theo dõi</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.DELIVERED]) {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => handleReorder(order)}
          >
            <Text style={styles.reorderButtonText}>Mua lại</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ratingButton}
            onPress={() => {
              // Chuyển đến màn hình đánh giá mới
              navigation.navigate('Review', { orderId: order.id });
            }}
          >
            <Text style={styles.ratingButtonText}>Đánh giá</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED]) {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => handleReorder(order)}
          >
            <Text style={styles.reorderButtonText}>Mua lại</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => {
              // Chuyển đến màn hình chi tiết đơn hủy với đầy đủ thông tin
              navigation.navigate('CancelDetail', { 
                orderId: order.id.toString(),
                shopName: order.items[0]?.food.store?.store_name || 'Cửa hàng',
                productName: order.items[0]?.food.title || 'Sản phẩm',
                productPrice: formatCurrency(parseFloat(order.total_money)),
                productImage: order.items[0]?.food.image || require('@/assets/images/placeholder-logo.png'),
              });
            }}
          >
            <Text style={styles.detailButtonText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const getOrderImage = (order: Order): string | undefined => {
    if (order.items && order.items.length > 0 && order.items[0].food.image) {
      return order.items[0].food.image;
    }
    return undefined;
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => {
        // Navigate to tracking screen with order details
        const trackingInfo = generateTrackingInfo(order);
        (navigation as any).navigate('Tracking', { trackingInfo });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.shopContainer}>
        {/* Store name header - moved above status badge */}
        <View style={styles.shopHeaderSection}>
          <Text style={styles.shopName}>
            {order.items[0]?.food.store?.store_name || 'Cửa hàng không xác định'}
          </Text>
        </View>

        {/* Status badge positioned below shop header */}
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(order.order_status) }
        ]}>
          <Text style={styles.statusBadgeText}>
            {order.order_status}
          </Text>
        </View>

        {/* Order details */}
        <View style={styles.orderHeader}>
          <ImageWithFallback 
            source={getOrderImage(order) ? { uri: getOrderImage(order) } : undefined}
            style={styles.foodImage} 
            fallbackSource={require('@/assets/images/placeholder-logo.png')}
            resizeMode="cover"
          />
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>
              {order.items && order.items.length > 0 ? order.items[0].food.title : 'Sản phẩm'}
              {order.items && order.items.length > 1 ? ` và ${order.items.length - 1} món khác` : ''}
            </Text>
            <Text style={styles.orderDate}>
              {new Date(order.created_date).toLocaleDateString('vi-VN')}, 
              {new Date(order.created_date).toLocaleTimeString('vi-VN')}
            </Text>
            <Text style={styles.orderDate}>
              Mã đơn: #{order.id}
            </Text>
          </View>
          <Text style={styles.orderPrice}>{formatCurrency(parseFloat(order.total_money))}</Text>
        </View>
        
        {/* Order action buttons */}
        {renderOrderButtons(order)}
      </View>
    </TouchableOpacity>
  );

  // Render content based on loading/error state
  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E95322" />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#E95322" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadOrders()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="cart-outline" size={48} color="#E95322" />
          <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopNowButtonText}>Mua sắm ngay</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={sortedOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => `order_${item.id}_${selectedTab}`}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#E95322"]}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F4A460" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
        >
          {renderTabButton(ORDER_STATUS_LABELS[ORDER_STATUS.PENDING], 'Chờ xác nhận')}
          {renderTabButton(ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED], 'Đã xác nhận')}
          {renderTabButton(ORDER_STATUS_LABELS[ORDER_STATUS.PREPARING], 'Đang chuẩn bị')}
          {renderTabButton(ORDER_STATUS_LABELS[ORDER_STATUS.READY], 'Sẵn sàng')}
          {renderTabButton(ORDER_STATUS_LABELS[ORDER_STATUS.DELIVERED], 'Đã giao')}
          {renderTabButton(ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED], 'Đã hủy')}
        </ScrollView>

        {/* Orders List or Loading/Error states */}
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    backgroundColor: '#F4A460',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  statusBadge: {
    position: 'absolute',
    top: 50,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 16,
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    height: 35,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#E95322',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E95322',
  },
  tabTextActive: {
    color: '#FFF',
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  // Shop styles
  shopContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    paddingTop: 40, // Add padding to make room for status badge
  },
  shopHeaderSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderCard: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E95322',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
  },
  singleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  cancelButton: {
    backgroundColor: '#E95322',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E95322',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#E95322',
    fontSize: 14,
    fontWeight: '600',
  },
  reorderButton: {
    backgroundColor: '#E95322',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  ratingButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  detailButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#757575',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
  },
  // Loading and error states
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#E95322',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#E95322',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shopNowButton: {
    backgroundColor: '#E95322',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  shopNowButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ManageOrdersScreen;