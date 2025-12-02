import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchCart, updateCartItem, removeFromCart, clearCart } from '@/store/slices/cartSlice';
import { CartItem as CartItemType, RootStackParamList } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';
import { getImageSource } from '@/utils/imageUtils';
import { CartItem } from '@/components';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { cart, loading: cartLoading } = useSelector((state: RootState) => state.cart);

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [updating, setUpdating] = useState<Set<number>>(new Set());

  const SHIPPING_FEE = 15000;

  // Fetch cart when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchCart());
    }, [dispatch])
  );

  useEffect(() => {
    if (cart?.items) {
      // Select all items by default
      const allItemIds = new Set(cart.items.map((item: CartItemType) => item.id));
      setSelectedItems(allItemIds);
    }
  }, [cart]);

  const cartItems = cart?.items || [];

  const handleSelectItem = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      const allItemIds = new Set(cartItems.map((item: CartItemType) => item.id));
      setSelectedItems(allItemIds);
    }
  };

const handleQuantityChange = async (itemId: number, delta: number) => {
  console.log('handleQuantityChange called with:', { itemId, delta });
  
  const item = cartItems.find(item => item.id === itemId);
  if (!item) {
    console.log('Item not found for itemId:', itemId);
    return;
  }

  console.log('Found item:', { id: item.id, quantity: item.quantity, foodId: item.food.id });

  const newQuantity = item.quantity + delta;
  
  // Validation checks
  if (newQuantity <= 0) {
    handleRemoveItem(itemId);
    return;
  }

  const maxQuantity = 10; 
  if (newQuantity > maxQuantity) {
    Alert.alert(
      'Thông báo', 
      `Số lượng tối đa cho món này là ${maxQuantity}`,
      [{ text: 'OK' }]
    );
    return;
  }

  // Prevent multiple rapid clicks
  if (updating.has(itemId)) return;

  try {
    setUpdating(prev => new Set(prev).add(itemId));
    
    console.log('Updating cart item:', { itemId, newQuantity });
    
    const result = await dispatch(updateCartItem({ 
      itemId: itemId, 
      quantity: newQuantity 
    }));
    
    console.log('Update result:', result);
    
    // Check if the action was fulfilled
    if (updateCartItem.fulfilled.match(result)) {
      console.log('Cart updated successfully');
    } else if (updateCartItem.rejected.match(result)) {
      throw new Error(result.payload as string || 'Cập nhật thất bại');
    }
    
  } catch (error: any) {
    console.error('Error updating quantity:', error);
    
    // Xử lý các loại lỗi cụ thể
    let errorMessage = 'Không thể cập nhật số lượng';
    if (error.message?.includes('stock')) {
      errorMessage = 'Số lượng vượt quá hàng tồn kho';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Lỗi kết nối mạng';
    }
    
    Alert.alert('Lỗi', errorMessage);
  } finally {
    setUpdating(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }
};

  const handleRemoveItem = async (itemId: number) => {
    const item = cartItems.find((item: CartItemType) => item.id === itemId);
    if (!item) return;

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn xóa "${item.food.title}" khỏi giỏ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeFromCart(itemId));
              setSelectedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
              });
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Lỗi', 'Không thể xóa món khỏi giỏ hàng');
            }
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;

    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa tất cả món trong giỏ hàng?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(clearCart());
              setSelectedItems(new Set());
            } catch (error) {
              console.error('Error clearing cart:', error);
              Alert.alert('Lỗi', 'Không thể xóa giỏ hàng');
            }
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (selectedItems.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một món để thanh toán');
      return;
    }

    if (!user) {
      Alert.alert('Thông báo', 'Bạn cần đăng nhập để thanh toán');
      return;
    }

    // Navigate to checkout screen
  navigation.navigate('Checkout', { selectedIds: Array.from(selectedItems) });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  // Use centralized helper if needed elsewhere
  const getImageUri = (imageUrl?: string | null) => getImageSource(imageUrl as any);

  const selectedCartItems = cartItems.filter(item => selectedItems.has(item.id));
  const totalItems = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selectedCartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal + (selectedCartItems.length > 0 ? SHIPPING_FEE : 0);

  // Show loading only when fetching initial cart data
  if (cartLoading && !cart) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user ? `Giỏ hàng của ${user.username} đã sẵn sàng!` : 'Giỏ hàng của bạn đã sẵn sàng!'}
        </Text>
        <Text style={styles.subtitle}>Bạn muốn thưởng thức ngay bây giờ chứ?</Text>
      </View>
      
      {/* Select All */}
      {cartItems.length > 0 && (
        <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
          {selectedItems.size === cartItems.length ? (
            <Ionicons name="checkbox" size={20} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
          ) : (
            <Ionicons name="square-outline" size={20} color={COLORS.gray400} style={{ marginRight: SPACING.xs }} />
          )}
          <Text style={styles.selectAllText}>
            {selectedItems.size === cartItems.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Text>
        </TouchableOpacity>
      )}

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.gray400} />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptySubtitle}>
            Hãy thêm một số món ăn ngon vào giỏ hàng của bạn
          </Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => navigation.getParent()?.navigate('Menu')}
          >
            <Text style={styles.shopNowText}>Mua sắm ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Cart Items */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                isUpdating={updating.has(item.id)}
                onSelect={handleSelectItem}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
                onPress={(foodId) => navigation.navigate('FoodDetail', { foodId })}
                formatPrice={formatPrice}
              />
            ))}
          </ScrollView>

          {/* Bottom Summary */}
          <View style={styles.bottomContainer}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng số món:</Text>
                <Text style={styles.summaryValue}>{totalItems}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tạm tính:</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phí giao hàng:</Text>
                <Text style={styles.summaryValue}>
                  {selectedCartItems.length > 0 ? formatPrice(SHIPPING_FEE) : formatPrice(0)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Tổng cộng:</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearCart}
                disabled={cartItems.length === 0}
              >
                <Text style={styles.clearButtonText}>Xóa tất cả</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.checkoutButton,
                  selectedItems.size === 0 && styles.checkoutButtonDisabled
                ]}
                onPress={handleCheckout}
                disabled={selectedItems.size === 0}
              >
                <Text style={styles.checkoutButtonText}>Thanh toán ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
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
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  selectAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
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
  shopNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  shopNowText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    ...SHADOWS.md,
  },
  summaryContainer: {
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;
