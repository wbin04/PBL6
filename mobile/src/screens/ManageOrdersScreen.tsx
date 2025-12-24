import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
import { Order } from '@/types';
import ImageWithFallback from '@/components/ImageWithFallback';
import { Fonts } from '@/constants/Fonts'; // thêm giống index

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString()}đ`;
};

// Canonical cancelled status (match DB spelling)
const CANCELLED_STATUS_VALUE = 'Đã huỷ';

// Helper to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case ORDER_STATUS_LABELS[ORDER_STATUS.PENDING]:
      return '#3b82f6'; // Chờ xác nhận - xanh dương
    case ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED]:
      return '#8b5cf6'; // Đã xác nhận - tím
    case ORDER_STATUS_LABELS[ORDER_STATUS.PREPARING]:
      return '#f97316'; // Đang chuẩn bị - cam
    case ORDER_STATUS_LABELS[ORDER_STATUS.READY]:
      return '#06b6d4'; // Sẵn sàng - xanh cyan
    case ORDER_STATUS_LABELS[ORDER_STATUS.DELIVERED]:
      return '#10b981'; // Đã giao - xanh lá
    case ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED]:
      return '#ef4444'; // Đã hủy - đỏ
    default:
      return '#6b7280'; // xám
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
    const foodItems = order.items.map(item => {
      let displayName = item.food.title;

      if (item.price_breakdown && item.price_breakdown.length > 0) {
        const foodDisplay = item.price_breakdown.find(p => p.type === 'food')?.display;
        const sizeDisplay = item.price_breakdown.find(p => p.type === 'size')?.display;

        if (foodDisplay) {
          displayName = foodDisplay;
          if (sizeDisplay) {
            displayName += `\n${sizeDisplay}`;
          }
        }
      } else {
        displayName = `${item.food.title} ${formatCurrency(item.food_price)}`;

        if (item.food_option_price && item.food_option_price > 0) {
          const sizeInfo =
            item.size_display ||
            (item.food_option
              ? `Size ${item.food_option.size_name}: +${formatCurrency(item.food_option_price)}`
              : '');
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
        food_note: item.food_note,
      };
    });

    const subtotal = parseFloat(order.total_money);
    const shippingFee = parseFloat(order.shipping_fee || '15000');
    const promoDiscount = order.promo_discount || 0;

    const finalTotal = subtotal + shippingFee - promoDiscount;

    const shippingDiscount = 0;
    const voucherDiscount = promoDiscount > 0 ? -promoDiscount : 0;

    return {
      orderId: order.id,
      shopName: order.items[0]?.food.store?.store_name || 'Cửa hàng',
      foodItems: foodItems,
      totalAmount: formatCurrency(finalTotal),
      subtotalAmount: formatCurrency(subtotal),
      shippingFee,
      shippingDiscount,
      voucherDiscount,
      paymentMethod: order.payment_method,
      trackingCode: `VDN${order.id.toString().padStart(8, '0')}`,
      phoneNumber: order.phone_number,
      deliveryAddress: order.ship_address,
      customerName: order.receiver_name,
      estimatedDelivery: '15:30 - 16:00 hôm nay',
      orderDate: new Date(order.created_date).toLocaleDateString('vi-VN'),
      orderTime: new Date(order.created_date).toLocaleTimeString('vi-VN'),
      status: order.order_status,
      note: order.note,
      appliedPromos: order.applied_promos || [],
    };
  };

  // Function để cập nhật trạng thái đơn hàng
  const updateOrderStatus = async (
    orderId: number,
    newStatus: string,
    cancelReason?: string,
    refundPayload?: { refund_requested?: boolean; bank_name?: string; bank_account?: string },
  ) => {
    try {
      setIsLoading(true);
      console.log('=== UPDATE ORDER STATUS ===');
      console.log('orderId:', orderId);
      console.log('newStatus:', newStatus);
      console.log('cancelReason:', cancelReason);

      const userString = await SecureStore.getItemAsync('user');
      const user = userString ? JSON.parse(userString) : null;

      let updatedOrder;
      if (user && user.role === 'Quản lý') {
        console.log('Using admin endpoint...');
        updatedOrder = await ordersService.adminUpdateOrderStatus(orderId, newStatus, cancelReason, refundPayload);
      } else {
        console.log('Using customer endpoint...');
        updatedOrder = await ordersService.updateOrderStatus(orderId, newStatus, cancelReason, refundPayload);
      }

      console.log('Updated order response:', updatedOrder);

      setOrders(prevOrders =>
        prevOrders.map(order => (order.id === orderId ? updatedOrder : order))
      );

      if (newStatus === 'Đã hủy' || newStatus === 'Đã huỷ') {
        setSelectedTab(CANCELLED_STATUS_VALUE);
      }

      console.log('Order status updated successfully');
      console.log('=== END UPDATE ORDER STATUS ===');

      Alert.alert('Thành công', 'Cập nhật trạng thái đơn hàng thành công');
    } catch (error: any) {
      console.error('=== UPDATE ORDER STATUS ERROR ===');
      console.error('Error updating order status:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('=== END ERROR ===');

      const errorMessage =
        error?.message ||
        error?.error ||
        'Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại sau.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const status = order.order_status;
    if (selectedTab === CANCELLED_STATUS_VALUE) {
      return status === 'Đã huỷ' || status === 'Đã hủy';
    }
    return status === selectedTab;
  });

  const sortOrders = (orders: Order[]): Order[] => {
    return [...orders].sort((a, b) => {
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });
  };

  const sortedOrders = sortOrders(filteredOrders);

  const handleReorder = async (order: Order) => {
    try {
      setIsLoading(true);

      for (const item of order.items) {
        await cartService.addToCart({
          food_id: item.food.id,
          quantity: item.quantity,
        });
      }

      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error reordering:', error);
      Alert.alert(
        'Lỗi',
        'Không thể thêm các món ăn vào giỏ hàng. Vui lòng thử lại sau.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabButton = (status: string, label: string) => {
    const isActive = selectedTab === status;
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
        ]}
        onPress={() => setSelectedTab(status)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.tabText,
            isActive && styles.tabTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOrderButtons = (order: Order) => {
    if (order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.PENDING]) {
      return (
        <View style={styles.singleButtonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              (navigation as any).navigate('Cancel', {
                orderId: order.id,
                paymentMethod: order.payment_method,
                onOrderCancelled: async (
                  orderId: string,
                  status: string,
                  cancelReason?: string,
                  refundPayload?: { bank_name?: string; bank_account?: string }
                ) => {
                  try {
                    const refundData = refundPayload
                      ? {
                          refund_requested: true,
                          bank_name: refundPayload?.bank_name,
                          bank_account: refundPayload?.bank_account,
                        }
                      : undefined;

                    await updateOrderStatus(
                      parseInt(orderId),
                      status,
                      cancelReason,
                      refundData,
                    );
                  } catch (error) {
                    console.error(
                      'Failed to cancel order from callback:',
                      error
                    );
                  }
                },
              })
            }
          >
            <Text style={styles.cancelButtonText}>Hủy đơn</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (
      order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.PREPARING] ||
      order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED] ||
      order.order_status === ORDER_STATUS_LABELS[ORDER_STATUS.READY]
    ) {
      return (
        <View style={styles.singleButtonRow}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() =>
              (navigation as any).navigate('Tracking', {
                trackingInfo: generateTrackingInfo(order),
              })
            }
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
              navigation.navigate('CancelDetail', {
                orderId: order.id.toString(),
                shopName:
                  order.items[0]?.food.store?.store_name || 'Cửa hàng',
                productName: order.items[0]?.food.title || 'Sản phẩm',
                productPrice: formatCurrency(parseFloat(order.total_money)),
                productImage:
                  order.items[0]?.food.image ||
                  require('@/assets/images/placeholder-logo.png'),
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

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const shopName = order.items[0]?.food.store?.store_name || 'Cửa hàng không xác định';

    const itemsSummary = order.items
      .map(it => it.food.title + (it.quantity ? ` x${it.quantity}` : ''))
      .join(', ');

    const refundStatus = order.refund_status;
    const showRefund = order.order_status === CANCELLED_STATUS_VALUE && refundStatus;

    const createdDate = new Date(order.created_date);
    const dateText =
      createdDate.toLocaleDateString('vi-VN') +
      ' ' +
      createdDate.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const total = parseFloat(order.total_money);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          const trackingInfo = generateTrackingInfo(order);
          (navigation as any).navigate('Tracking', { trackingInfo });
        }}
        activeOpacity={0.85}
      >
        {/* Hình cover + badge */}
        <View style={styles.cardImageWrapper}>
          <ImageWithFallback
            source={
              getOrderImage(order) ? { uri: getOrderImage(order)! } : undefined
            }
            fallbackSource={require('@/assets/images/placeholder-logo.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardIdBadge}>
            <Text style={styles.cardIdText}>#{order.id}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.order_status) },
            ]}
          >
            <Text style={styles.statusBadgeText}>{order.order_status}</Text>
          </View>
        </View>

        {/* Nội dung card */}
        <View style={styles.cardContent}>
          {/* Tên cửa hàng */}
          <View style={styles.cardHeaderRow}>
            <Text style={styles.shopName}>{shopName}</Text>
          </View>

          {/* Món ăn */}
          <Text style={styles.itemsText} numberOfLines={2}>
            {itemsSummary}
          </Text>

          {showRefund && (
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>Hoàn tiền:</Text>
              <View style={styles.refundBadge}>
                <Text style={styles.refundText}>{refundStatus}</Text>
              </View>
            </View>
          )}

          {/* Tổng & thời gian */}
          <View style={styles.cardFooterRow}>
            <View style={styles.totalWrapper}>
              <Text style={styles.totalLabel}>Tổng: </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(total)}
              </Text>
            </View>
            <Text style={styles.dateText}>{dateText}</Text>
          </View>

          {/* Action buttons */}
          {renderOrderButtons(order)}
        </View>
      </TouchableOpacity>
    );
  };

  // Render content based on loading/error state
  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#EB552D" />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#EB552D" />
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
          <Ionicons name="cart-outline" size={48} color="#EB552D" />
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
        keyExtractor={item => `order_${item.id}_${selectedTab}`}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#EB552D']}
            tintColor="#EB552D"
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5cb58" />

      {/* Header: giống web */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#eb552d" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Danh sách đơn hàng</Text>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => loadOrders()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={24} color="#eb552d" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Nội dung chính */}
      <View style={styles.content}>
        {/* Tabs pill: 1 dòng, scroll ngang giống admin OrderList */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {renderTabButton(
            ORDER_STATUS_LABELS[ORDER_STATUS.PENDING],
            'Chờ xác nhận'
          )}
          {renderTabButton(
            ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED],
            'Đã xác nhận'
          )}
          {renderTabButton(
            ORDER_STATUS_LABELS[ORDER_STATUS.PREPARING],
            'Đang chuẩn bị'
          )}
          {renderTabButton(
            ORDER_STATUS_LABELS[ORDER_STATUS.READY],
            'Sẵn sàng'
          )}
          {renderTabButton(
            ORDER_STATUS_LABELS[ORDER_STATUS.DELIVERED],
            'Đã giao'
          )}
          {renderTabButton(
            CANCELLED_STATUS_VALUE,
            'Đã huỷ'
          )}
        </ScrollView>

        {/* Result bar giống foundWrap của index */}
        <View style={styles.foundWrap}>
          <Text style={styles.foundText}>
            Tìm thấy <Text style={styles.foundNum}>{filteredOrders.length}</Text> đơn hàng
          </Text>
        </View>

        {/* Danh sách / loading / error */}
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const CONTENT_PADDING = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  /* HEADER */
  header: {
    backgroundColor: '#f5cb58',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    fontSize: 18,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  /* CONTENT */
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Tabs: 1 dòng, scroll ngang
  tabsContainer: {
    marginTop: 0,
    backgroundColor: '#fff',
    maxHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CONTENT_PADDING,
    paddingVertical: 10,
  },
  tabButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F2F3F5',
    height: 36,
    minWidth: 90,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  tabButtonActive: {
    backgroundColor: '#EB552D',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
    lineHeight: 18,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    lineHeight: 18,
  },

  foundWrap: {
    // marginTop: 8,
    backgroundColor: '#F6F7F8',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: '#6B7280',
    marginLeft: 6,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foundNum: {
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  ordersList: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },

  /* CARD */
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImageWrapper: {
    width: '100%',
    height: 130,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardIdBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: '#EB552D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardIdText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  statusBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  cardHeaderRow: {
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    color: '#391713',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  itemsText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  refundLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  refundBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  refundText: {
    fontSize: 12,
    color: '#b45309',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  totalWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  totalValue: {
    fontSize: 15,
    color: '#EB552D',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  /* BUTTONS */
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    columnGap: 20,
  },
  singleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#EB552D',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  trackButton: {
    borderWidth: 1,
    borderColor: '#EB552D',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  trackButtonText: {
    color: '#EB552D',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  reorderButton: {
    backgroundColor: '#EB552D',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  ratingButton: {
    borderWidth: 1,
    borderColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  ratingButtonText: {
    color: '#FF9800',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  detailButton: {
    borderWidth: 1,
    borderColor: '#757575',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  detailButtonText: {
    color: '#757575',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  /* STATES */
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  errorText: {
    fontSize: 16,
    color: '#EB552D',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  retryButton: {
    backgroundColor: '#EB552D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  shopNowButton: {
    backgroundColor: '#EB552D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  shopNowButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
});

export default ManageOrdersScreen;
