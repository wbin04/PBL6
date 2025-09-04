import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem as CartItemType } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';

interface CartItemProps {
  item: CartItemType;
  isSelected: boolean;
  isUpdating: boolean;
  onSelect: (itemId: number) => void;
  onQuantityChange: (itemId: number, delta: number) => void;
  onRemove: (itemId: number) => void;
  onPress: (foodId: number) => void;
  formatPrice: (price: number) => string;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  isSelected,
  isUpdating,
  onSelect,
  onQuantityChange,
  onRemove,
  onPress,
  formatPrice,
}) => {
  const getImageUri = (imageUrl: string) => {
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/media/${imageUrl}`;
  };

  return (
    <TouchableOpacity
      style={styles.cartItemCard}
      activeOpacity={0.8}
      onPress={() => onPress(item.food.id)}
    >
      {/* Main Content Layout: Checkbox | Image | Content */}
      <View style={styles.cartItemContent}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => onSelect(item.id)}
        >
          {isSelected ? (
            <Ionicons name="checkbox" size={24} color={COLORS.primary} />
          ) : (
            <Ionicons name="square-outline" size={24} color={COLORS.gray400} />
          )}
        </TouchableOpacity>

        {/* Image */}
        <Image
          source={{ uri: getImageUri(item.food.image) }}
          style={styles.itemImage}
          resizeMode="cover"
        />

        {/* Content Area */}
        <View style={styles.itemInfo}>
          {/* Title */}
          <Text style={styles.itemTitle}>{item.food.title}</Text>
          
          {/* Description */}
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.food.description}
          </Text>

          {/* Bottom Row: Quantity Controls | Delete & Price */}
          <View style={styles.bottomRow}>
            {/* Quantity Controls */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onQuantityChange(item.id, -1)}
                disabled={isUpdating}
              >
                <Ionicons name="remove" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => onQuantityChange(item.id, 1)}
                disabled={isUpdating || item.quantity >= 99}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Delete & Price Section */}
            <View style={styles.rightActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onRemove(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
              <Text style={styles.itemPrice}>{formatPrice(item.subtotal)}</Text>
            </View>
          </View>
        </View>
      </View>

      {isUpdating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cartItemCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginVertical: SPACING.xs,
    padding: SPACING.md,
    ...SHADOWS.sm,
    position: 'relative',
  },
  cartItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
    alignSelf: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  itemDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xs,
  },
  quantityButton: {
    padding: SPACING.xs,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    minWidth: 30,
    textAlign: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
});

export default CartItem;

