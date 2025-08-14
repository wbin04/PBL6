import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { CartItem } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, API_CONFIG } from '@/constants';

interface CheckoutFoodItemProps {
  item: CartItem;
  formatPrice: (price: number) => string;
  onPress?: (foodId: number) => void;
}

const CheckoutFoodItem: React.FC<CheckoutFoodItemProps> = ({
  item,
  formatPrice,
  onPress,
}) => {
  const getImageUri = (imageUrl: string) => {
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/media/${imageUrl}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(item.food.id)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getImageUri(item.food.image) }}
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {item.food.title}
          </Text>
          <Text style={styles.quantity}>
            Số lượng: {item.quantity}
          </Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {formatPrice(item.subtotal)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray100,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  quantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default CheckoutFoodItem;
