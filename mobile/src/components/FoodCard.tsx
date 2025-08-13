import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { API_CONFIG } from '@/constants';
import { Food } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';

interface FoodCardProps {
  food: Food;
  onPress: () => void;
  onAddToCart?: () => void;
  style?: ViewStyle;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  food,
  onPress,
  onAddToCart,
  style,
}) => {
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(parseInt(price));
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <View style={styles.imageContainer}>
        {/* Load full URL for image: prefix API host if relative path */}
        <Image
          source={{
            uri: food.image.startsWith('http')
              ? food.image
              : `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/media/${food.image}`
          }}
          style={styles.image}
          resizeMode="cover"
        />
        {!food.availability && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Hết hàng</Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {food.title}
        </Text>
        
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(food.price)}</Text>
          
          {food.average_rating && (
            <View style={styles.rating}>
              <Text style={styles.ratingText}>⭐ {food.average_rating.toFixed(1)}</Text>
              {food.rating_count && (
                <Text style={styles.ratingCount}>({food.rating_count})</Text>
              )}
            </View>
          )}
        </View>
        
        {onAddToCart && food.availability && (
          <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
            <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  
  imageContainer: {
    position: 'relative',
    height: 150,
  },
  
  image: {
    width: '100%',
    height: '100%',
  },
  
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  unavailableText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  content: {
    padding: SPACING.md,
  },
  
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  ratingText: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  
  ratingCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
