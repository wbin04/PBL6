import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Store } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';
import { getImageSource } from '@/utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={getImageSource(store.image)}
          style={styles.image}
          resizeMode="cover"
          onError={(error) => {
            console.log('StoreCard - Image load error:', error.nativeEvent.error);
          }}
          defaultSource={require('@/assets/images/placeholder.png')}
        />
        <View style={styles.overlay}>
          <View style={styles.badge}>
            <Ionicons name="storefront" size={12} color={COLORS.white} />
            <Text style={styles.badgeText}>Cửa hàng</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {store.store_name}
        </Text>
        
        <Text style={styles.description} numberOfLines={2}>
          {store.description || 'Cửa hàng thực phẩm chất lượng'}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.rating}>
              {store.average_rating ? store.average_rating.toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.reviews}>
              ({store.total_ratings || 0} đánh giá)
            </Text>
          </View>
          
          <View style={styles.deliveryInfo}>
            <Ionicons name="storefront-outline" size={14} color={COLORS.gray500} />
            <Text style={styles.deliveryTime}>
              {store.total_foods || 0} món
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    width: CARD_WIDTH,
    marginRight: SPACING.md,
    ...SHADOWS.md,
  },
  
  imageContainer: {
    position: 'relative',
    height: 120,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  
  image: {
    width: '100%',
    height: '100%',
  },
  
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: SPACING.sm,
  },
  
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  content: {
    padding: SPACING.md,
  },
  
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  reviews: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  deliveryTime: {
    fontSize: 12,
    color: COLORS.gray500,
  },
});