import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, RootStackParamList } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { OrderItem } from '@/components';
import { Order } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants';
import { fetchOrders, clearOrders } from '@/store/slices/ordersSlice';

type OrdersNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Orders'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const OrderScreen: React.FC = () => {
  const navigation = useNavigation<OrdersNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { orders, loading, error } = useSelector((state: RootState) => state.orders);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // Thêm state riêng cho load more

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'Chờ xác nhận', label: 'Chờ xác nhận' },
    { value: 'Đã xác nhận', label: 'Đã xác nhận' },
    { value: 'Đang chuẩn bị', label: 'Đang chuẩn bị' },
    { value: 'Đang giao', label: 'Đang giao' },
    { value: 'Đã giao', label: 'Đã giao' },
    { value: 'Đã hủy', label: 'Đã hủy' },
  ];

  useEffect(() => {
    loadOrders(1, true);
  }, []);

  // Reset khi thay đổi filter
  useEffect(() => {
    if (selectedStatus !== 'all') {
      // Reset page và hasMore khi filter thay đổi
      setPage(1);
      setHasMore(true);
    }
  }, [selectedStatus]);

  const loadOrders = async (pageNumber: number = 1, replace: boolean = false) => {
    try {
      if (replace) {
        dispatch(clearOrders());
        setPage(1);
        setHasMore(true);
      }
      
      if (pageNumber > 1) {
        setIsLoadingMore(true);
      }

      const response = await dispatch(fetchOrders(pageNumber)).unwrap();
      const results = (response as any).results as Order[];
      
      // Cải thiện logic kiểm tra hasMore
      if (results.length === 0) {
        // Nếu không có data nào, dừng load more
        setHasMore(false);
      } else if (results.length < 10) {
        // Nếu số lượng ít hơn page size, đây là trang cuối
        setHasMore(false);
      } else {
        // Kiểm tra thêm: nếu có next page trong response
        const hasNext = (response as any).next !== null;
        setHasMore(hasNext);
      }
      
      setPage(pageNumber);
    } catch (error) {
      console.error('Error loading orders:', error);
      setHasMore(false); // Dừng load more nếu có lỗi
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadOrders(1, true);
    setRefreshing(false);
  };
  
  const handleLoadMore = async () => {
    // Cải thiện điều kiện check load more
    if (loading || isLoadingMore || !hasMore) {
      console.log('Load more blocked:', { loading, isLoadingMore, hasMore });
      return;
    }
    
    console.log('Loading more orders, page:', page + 1);
    await loadOrders(page + 1, false);
  };

  const getSelectedStatusLabel = () => {
    const status = statusOptions.find(option => option.value === selectedStatus);
    return status?.label || 'Tất cả';
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setShowStatusModal(false);
    // Reset pagination khi đổi filter
    setPage(1);
    setHasMore(true);
  };

  const handleOrderPress = (orderId: number) => {
    navigation.navigate('OrderDetail', { orderId });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  // Tối ưu filter và đảm bảo unique orders
  const filteredOrders = React.useMemo(() => {
    let filtered = selectedStatus === 'all' 
      ? orders 
      : orders.filter(order => order.order_status === selectedStatus);
    
    // Loại bỏ duplicate orders dựa trên id
    const uniqueOrders = filtered.reduce((acc: Order[], current: Order) => {
      const existing = acc.find(order => order.id === current.id);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    return uniqueOrders;
  }, [orders, selectedStatus]);

  // Tạo unique key cho FlatList
  const getUniqueKey = (item: Order, index: number) => {
    return `order-${item.id}-${index}`;
  };

  if (loading && page === 1) { // Chỉ show loader khi load trang đầu
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {user ? `Đơn hàng của ${user.username} luôn sẵn sàng.` : 'Đơn hàng của bạn luôn cập nhật mới.'}
          </Text>
          <Text style={styles.subtitle}>Xem chi tiết đơn nào?</Text>
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (error && filteredOrders.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {user ? `Đơn hàng của ${user.username} luôn sẵn sàng.` : 'Đơn hàng của bạn luôn cập nhật mới.'}
          </Text>
          <Text style={styles.subtitle}>Xem chi tiết đơn nào?</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={COLORS.error} />
          <Text style={styles.errorTitle}>Có lỗi xảy ra</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadOrders(1, true)}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user ? `Đơn hàng của ${user.username} luôn sẵn sàng.` : 'Đơn hàng của bạn luôn cập nhật mới.'}
        </Text>
        <Text style={styles.subtitle}>Xem chi tiết đơn nào?</Text>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Đơn hàng của tôi</Text>
        <TouchableOpacity
          style={styles.statusSelector}
          onPress={() => setShowStatusModal(true)}
        >
          <View style={styles.statusSelectorContent}>
            <Ionicons 
              name="receipt" 
              size={20} 
              color={COLORS.primary} 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>
              {getSelectedStatusLabel()}
            </Text>
            <Ionicons 
              name="chevron-down" 
              size={20} 
              color={COLORS.gray500}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lọc trạng thái đơn hàng</Text>
              <TouchableOpacity
                onPress={() => setShowStatusModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={statusOptions}
              keyExtractor={(item) => `status-${item.value}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    selectedStatus === item.value && styles.selectedStatusOption
                  ]}
                  onPress={() => handleStatusChange(item.value)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    selectedStatus === item.value && styles.selectedStatusOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {selectedStatus === item.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={COLORS.gray400} />
          <Text style={styles.emptyTitle}>Không có đơn hàng nào</Text>
          <Text style={styles.emptySubtitle}>
            {selectedStatus === 'all' 
              ? 'Bạn chưa có đơn hàng nào. Hãy đặt hàng ngay!'
              : `Không có đơn hàng nào ở trạng thái "${getSelectedStatusLabel()}"`
            }
          </Text>
          {selectedStatus === 'all' && (
            <TouchableOpacity 
              style={styles.orderNowButton}
              onPress={() => navigation.getParent()?.navigate('Menu')}
            >
              <Text style={styles.orderNowText}>Đặt hàng ngay</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item, index }) => (
            <OrderItem
              order={item}
              onPress={handleOrderPress}
              formatPrice={formatPrice}
            />
          )}
          keyExtractor={getUniqueKey}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1} // Giảm threshold để tránh trigger nhiều lần
          removeClippedSubviews={true} // Tối ưu hiệu suất
          maxToRenderPerBatch={10} // Giới hạn số item render mỗi batch
          ListFooterComponent={() => (
            isLoadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
              </View>
            ) : null
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  statusSelector: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  statusIcon: {
    marginRight: SPACING.xs,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    width: '85%',
    maxHeight: '70%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  selectedStatusOption: {
    backgroundColor: `${COLORS.primary}10`,
  },
  statusOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectedStatusOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  orderNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderNowText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  // Thêm style cho load more indicator
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  loadMoreText: {
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});

export default OrderScreen;