import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Flame, Star, TrendingUp, DollarSign } from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';
import { API_CONFIG } from '@/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 160;
const CARD_MARGIN = 8;

export interface RecommendationItem {
  id: number;
  title: string;
  price: number | string;
  image: string;
  image_url?: string;
  badge: string;
  badge_type: 'best_seller' | 'top_rated' | 'trending' | 'cheap_eats' | '';
  store_name?: string;
  store_id?: number;
  total_sold?: number;
  average_rating?: number;
}

interface ChatbotRecommendationProps {
  data: RecommendationItem[];
  onPressItem?: (item: RecommendationItem) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export const ChatbotRecommendation: React.FC<ChatbotRecommendationProps> = ({
  data,
  onPressItem,
  showViewAll = true,
  onViewAll,
}) => {
  const navigation = useNavigation<any>();

  const handlePressItem = (item: RecommendationItem) => {
    if (onPressItem) {
      onPressItem(item);
    } else {
      navigation.navigate('FoodDetail', { foodId: item.id });
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigation.navigate('Menu');
    }
  };

  const getImageUrl = (item: RecommendationItem): string => {
    const imageUrl = item.image_url || item.image;
    
    if (!imageUrl) {
      return 'https://via.placeholder.com/160';
    }
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    
    if (imageUrl.startsWith('/media')) {
      return `${baseUrl}${imageUrl}`;
    }
    
    return `${baseUrl}/media${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  };

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numPrice);
  };

  const getBadgeStyle = (badgeType: string) => {
    switch (badgeType) {
      case 'best_seller':
        return { backgroundColor: '#ef4444', icon: Flame };
      case 'top_rated':
        return { backgroundColor: '#f59e0b', icon: Star };
      case 'trending':
        return { backgroundColor: '#8b5cf6', icon: TrendingUp };
      case 'cheap_eats':
        return { backgroundColor: '#10b981', icon: DollarSign };
      default:
        return { backgroundColor: '#6b7280', icon: Star };
    }
  };

  const renderBadge = (item: RecommendationItem) => {
    if (!item.badge) return null;
    
    const badgeStyle = getBadgeStyle(item.badge_type);
    const IconComponent = badgeStyle.icon;
    
    return (
      <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
        <IconComponent size={10} color="#fff" />
        <Text style={styles.badgeText} numberOfLines={1}>
          {item.badge}
        </Text>
      </View>
    );
  };

  const renderCard = ({ item, index }: { item: RecommendationItem; index: number }) => (
    <TouchableOpacity
      style={[
        styles.card,
        index === 0 && styles.firstCard,
      ]}
      onPress={() => handlePressItem(item)}
      activeOpacity={0.8}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getImageUrl(item) }}
          style={styles.image}
          resizeMode="cover"
        />
        {renderBadge(item)}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        
        {item.store_name && (
          <Text style={styles.storeName} numberOfLines={1}>
            📍 {item.store_name}
          </Text>
        )}
        
        <Text style={styles.price}>
          {formatPrice(item.price)}
        </Text>

        {/* Stats Row */}
        {(item.total_sold || item.average_rating) && (
          <View style={styles.statsRow}>
            {item.total_sold ? (
              <Text style={styles.statsText}>🔥 {item.total_sold}</Text>
            ) : null}
            {item.average_rating ? (
              <Text style={styles.statsText}>⭐ {item.average_rating.toFixed(1)}</Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderViewAllCard = () => (
    <TouchableOpacity
      style={[styles.card, styles.viewAllCard]}
      onPress={handleViewAll}
      activeOpacity={0.8}
    >
      <View style={styles.viewAllContent}>
        <View style={styles.viewAllIconContainer}>
          <ChevronRight size={32} color="#e95322" />
        </View>
        <Text style={styles.viewAllText}>Xem tất cả</Text>
        <Text style={styles.viewAllSubtext}>Khám phá thêm</Text>
      </View>
    </TouchableOpacity>
  );

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={showViewAll ? renderViewAllCard : null}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        decelerationRate="fast"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  listContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  firstCard: {
    marginLeft: 0,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: CARD_WIDTH - 24,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#fff',
    flexShrink: 1,
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#111827',
    marginBottom: 4,
    height: 36,
    lineHeight: 18,
  },
  storeName: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#6b7280',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#e95322',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#6b7280',
  },
  viewAllCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef3f0',
    borderWidth: 2,
    borderColor: '#e95322',
    borderStyle: 'dashed',
  },
  viewAllContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewAllIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#e95322',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#e95322',
    marginBottom: 4,
  },
  viewAllSubtext: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#9ca3af',
  },
});

export default ChatbotRecommendation;
