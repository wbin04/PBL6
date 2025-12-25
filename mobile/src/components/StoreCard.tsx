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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';
import { getImageSource } from '@/utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/Fonts';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const RADIUS = 18;

export const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.card}>
        {/* Cover image giống bố cục RestaurantCard1 */}
        <View style={styles.coverWrap}>
          <Image
            source={getImageSource(store.image)}
            style={styles.cover}
            resizeMode="cover"
            onError={(error) => {
              console.log('StoreCard - Image load error:', error.nativeEvent.error);
            }}
            defaultSource={require('@/assets/images/placeholder.png')}
          />

          <View style={styles.badgePill}>
            <Ionicons name="storefront" size={12} color={COLORS.white} />
            <Text style={styles.badgeText}>Cửa hàng</Text>
          </View>
        </View>

        {/* Thân card */}
        <View style={styles.body}>
          {/* Title + rating giống titleRow của RestaurantCard1 */}
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {store.store_name}
            </Text>
            <View style={styles.ratingWrap}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {store.average_rating ? store.average_rating.toFixed(1) : '0.0'}
              </Text>
            </View>
          </View>

          {/* Description 1 dòng / 2 dòng */}
          <Text style={styles.description} numberOfLines={2}>
            {store.description || 'Cửa hàng thực phẩm chất lượng'}
          </Text>

          {/* Meta row: số đánh giá + số món, bố cục giống metaRow */}
          <View style={styles.metaRow}>
            <Text style={styles.reviews}>
              ({store.total_ratings || 0} đánh giá)
            </Text>

            <View style={styles.foodMeta}>
              <Ionicons
                name="storefront-outline"
                size={14}
                color={COLORS.gray500}
              />
              <Text style={styles.foodCount}>
                {store.total_foods || 0} món
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    marginVertical: 10,
  },
  card: {
    borderRadius: RADIUS,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#EEF0F2',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },

  // Cover giống RestaurantCard1
  coverWrap: {
    overflow: 'hidden',
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  cover: {
    width: '100%',
    height: 190,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },

  badgePill: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanBold,
  },

  // Body
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
    backgroundColor: '#fff',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    marginRight: 8,
    fontSize: 20,
    color: '#3A1A12',
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },

  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontFamily: Fonts.LeagueSpartanBold,
    fontSize: 16,
    color: '#3A1A12',
  },

  description: {
    fontSize: 14.5,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: Fonts.LeagueSpartanMedium,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'space-between',
  },
  reviews: {
    fontSize: 13,
    color: COLORS.gray500,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  foodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodCount: {
    fontSize: 14,
    color: COLORS.gray500,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
});
