import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { getImageSource } from '@/utils/imageUtils';
import { Food } from '@/types';
import { Fonts } from '@/constants/Fonts';

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

  const imageSource = food.image_url
    ? { uri: food.image_url }
    : getImageSource(food.image);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {/* Ảnh + badge rating */}
        <View style={{ position: 'relative' }}>
          <Image source={imageSource} style={styles.image} resizeMode="cover" />

          {/* Badge rating */}
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>
              {food.average_rating?.toFixed(1) || '0.0'}
            </Text>
            <Star size={12} color="#facc15" fill="#facc15" />
          </View>

          {/* Overlay hết hàng */}
          {!food.availability && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Hết hàng</Text>
            </View>
          )}
        </View>

        {/* Nội dung */}
        <View style={styles.content}>
          {/* Tên món */}
          <Text numberOfLines={1} style={styles.title}>
            {food.title}
          </Text>

          {/* Tên quán (nếu có store) */}
          {food.store?.store_name && (
            <Text numberOfLines={1} style={styles.storeName}>
              {food.store.store_name}
            </Text>
          )}

          {/* Giá + nút thêm */}
          <View style={styles.footer}>
            <Text style={styles.price}>{formatPrice(food.price)}</Text>

            {onAddToCart && food.availability && (
              <TouchableOpacity
                onPress={onAddToCart}
                activeOpacity={0.9}
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    borderRadius: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 1, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: 120,
  },

  ratingBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ratingText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 12,
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
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  content: {
    padding: 12,
  },

  title: {
    color: '#391713',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
    marginBottom: 2,
  },

  storeName: {
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
    marginBottom: 8,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  price: {
    color: '#391713',
    fontFamily: Fonts.LeagueSpartanBlack,
    fontSize: 18,
  },

  addButton: {
    backgroundColor: '#e95322',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 20,
    lineHeight: 20,
  },
});

