import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { ratingService, menuService } from '@/services';
import { FoodRating, FoodDetail, RootStackParamList, CreateRatingRequest } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, API_CONFIG } from '@/constants';

type RatingScreenRouteProp = RouteProp<RootStackParamList, 'RatingScreen'>;
type RatingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RatingScreen'>;

const RatingScreen: React.FC = () => {
  const route = useRoute<RatingScreenRouteProp>();
  const navigation = useNavigation<RatingScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [foodDetail, setFoodDetail] = useState<FoodDetail | null>(null);
  const [ratings, setRatings] = useState<FoodRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showAddRating, setShowAddRating] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (route.params?.foodId) {
      loadData();
    }
  }, [route.params?.foodId]);

  const loadData = async () => {
    if (!route.params?.foodId) return;
    
    console.log('RatingScreen - Loading data for foodId:', route.params.foodId);
    
    try {
      setLoading(true);
      // Load food detail and ratings
      const [foodData, ratingsData] = await Promise.all([
        menuService.getFoodDetail(route.params.foodId),
        ratingService.getRatingsForFood(route.params.foodId)
      ]);
      
      console.log('RatingScreen - Food data loaded:', foodData?.title);
      console.log('RatingScreen - Ratings data loaded:', ratingsData?.length, 'ratings');
      
      setFoodDetail(foodData);
      setRatings(ratingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: number = 16, interactive: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => interactive && setNewRating(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? '#FFD700' : COLORS.gray400}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderRatingItem = ({ item }: { item: FoodRating }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingCardHeader}>
        <Text style={styles.username}>{item.username}</Text>
        <View style={styles.ratingPoints}>
          {renderStars(item.rating, 16)}
        </View>
      </View>
      {item.content && (
        <Text style={styles.ratingContent}>{item.content}</Text>
      )}
    </View>
  );

  const getImageUri = (imageUrl: string) => {
    return imageUrl.startsWith('http')
      ? imageUrl
      : `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}/media/${imageUrl}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!foodDetail) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không tìm thấy thông tin món ăn</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá sản phẩm</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Food Info */}
        <View style={styles.foodInfo}>
          <Image
            source={{ uri: getImageUri(foodDetail.image) }}
            style={styles.foodImage}
            resizeMode="cover"
          />
          <View style={styles.foodDetails}>
            <Text style={styles.foodTitle}>{foodDetail.title}</Text>
            <View style={styles.ratingOverview}>
              {renderStars(foodDetail.average_rating || 0)}
              <Text style={styles.ratingText}>
                {foodDetail.average_rating?.toFixed(1) || '0.0'} ({foodDetail.rating_count || 0} đánh giá)
              </Text>
            </View>
          </View>
        </View>

        {/* Ratings List */}
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>
            Đánh giá từ khách hàng ({ratings.length})
          </Text>
          
          {ratings.length > 0 ? (
            <FlatList
              data={ratings}
              renderItem={renderRatingItem}
              keyExtractor={(item, index) => `${item.username}-${index}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noRatings}>
              <Ionicons name="chatbubble-outline" size={48} color={COLORS.gray400} />
              <Text style={styles.noRatingsText}>Chưa có đánh giá nào</Text>
              <Text style={styles.noRatingsSubtext}>
                Hãy là người đầu tiên đánh giá món ăn này!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingTop: 60,
  },
  backIcon: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginHorizontal: SPACING.md,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  foodInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  foodDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  foodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  ratingSummary: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryContent: {
    alignItems: 'center',
  },
  averageRating: {
    alignItems: 'center',
  },
  averageNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  totalRatings: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  addRatingSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  addRatingButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  addRatingText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  addRatingForm: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  ratingSelector: {
    marginBottom: SPACING.lg,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: SPACING.xs,
  },
  commentSection: {
    marginBottom: SPACING.lg,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    height: 100,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  formButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  ratingsSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.sm,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ratingPoints: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContent: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  noRatings: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noRatingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  noRatingsSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default RatingScreen;

