import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { API_CONFIG } from '@/constants';
import { IMAGE_MAP, type ImageName } from "@/assets/imageMap";

function getImageSource(imageValue?: ImageName | string) {
  if (!imageValue) {
    return require('@/assets/images/gourmet-burger.png');
  }
  // If image is already a full URL
  if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
    return { uri: imageValue };
  }
  // If it's a string path from API
  if (typeof imageValue === 'string') {
    if (IMAGE_MAP[imageValue]) {
      return IMAGE_MAP[imageValue];
    }
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    const fullUrl = `${baseUrl}/media/${imageValue}`;
    return { uri: fullUrl };
  }
  return imageValue;
}

const formatPrice = (price: any) => {
  if (typeof price === 'number') {
    return `${price.toLocaleString('vi-VN')}₫`;
  }
  if (!price) return '0₫';
  // Try to parse string to number
  const num = parseInt(price);
  if (!isNaN(num)) return `${num.toLocaleString('vi-VN')}₫`;
  return price;
};

const FoodDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    foodId,
    id,
    image,
    title,
    price,
    description,
    sizes = null,
    reviews: routeReviews = [],
    rating: routeRating,
  } = route.params as any || {};

  // Use foodId if available, otherwise use id
  const actualFoodId = foodId || id;

  const [selectedSize, setSelectedSize] = useState(sizes && Array.isArray(sizes) && sizes.length > 0 ? sizes[0] : null);
  const [reviews, setReviews] = useState<any[]>(routeReviews);
  const [averageRating, setAverageRating] = useState(routeRating || 0);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Fetch ratings from API
  useEffect(() => {
    const fetchRatings = async () => {
      if (!actualFoodId) {
        console.log('No foodId available, skipping ratings fetch');
        return;
      }
      
      try {
        setLoadingReviews(true);
        console.log('Fetching ratings for food:', actualFoodId);
        const response = await axios.get(`${API_CONFIG.BASE_URL}/ratings/?food=${actualFoodId}`);
        console.log('Ratings response:', response.data);
        
        let ratingsData = [];
        if (Array.isArray(response.data)) {
          ratingsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          ratingsData = response.data.results;
        }

        // Transform ratings data to match UI format
        const transformedReviews = ratingsData.map((rating: any) => ({
          user: rating.username || rating.user?.fullname || rating.user?.username || 'Ẩn danh',
          rating: rating.rating || rating.stars || 0,
          text: rating.content || rating.comment || 'Không có nội dung',
          time: rating.created_date ? new Date(rating.created_date).toLocaleDateString('vi-VN') : 'gần đây',
          likes: 0, // API doesn't provide likes, default to 0
        }));

        setReviews(transformedReviews);

        // Calculate average rating
        if (transformedReviews.length > 0) {
          const avg = transformedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / transformedReviews.length;
          setAverageRating(avg);
        }

        console.log('Loaded', transformedReviews.length, 'reviews');
      } catch (error) {
        console.error('Error fetching ratings:', error);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchRatings();
  }, [actualFoodId]);

  // Calculate total price including selected size
  const getTotalPrice = () => {
    // Base price from food
    const basePrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    
    // Additional price from selected size
    let sizePrice = 0;
    if (selectedSize?.price) {
      sizePrice = typeof selectedSize.price === 'number' 
        ? selectedSize.price 
        : parseFloat(selectedSize.price) || 0;
    }
    
    // Total = base + size additional price
    const total = basePrice + sizePrice;
    console.log('Price calculation:', { basePrice, sizePrice, total, selectedSize: selectedSize?.displayName || selectedSize?.name });
    return total;
  };

  // Render review item
  const renderReviewItem = ({ item }: { item: any }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user?.[0]?.toUpperCase() || 'A'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewUser}>{item.user ?? 'Ẩn danh'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {[...Array(Math.floor(item.rating || 0))].map((_, i) => (
              <Text key={i} style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 15 }}>★</Text>
            ))}
            <Text style={styles.reviewTime}>{item.time || 'gần đây'}</Text>
          </View>
        </View>
        <Text style={styles.reviewMore}>...</Text>
      </View>
      <Text style={styles.reviewText}>{item.text ?? 'Không có nội dung'}</Text>
      <View style={styles.reviewActions}>
        <Text style={styles.reviewAction}>👍 Hữu ích ({item.likes ?? 0})</Text>
        <Text style={styles.reviewAction}>Báo cáo</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>
      <View style={styles.container}>
        <View style={styles.card}>
          <Image
            source={getImageSource(image)}
            style={styles.foodImage}
          />
          <Text style={styles.foodName}>{title}</Text>
          <Text style={styles.foodPrice}>{formatPrice(getTotalPrice())}</Text>
          {description && (
            <Text style={styles.foodDescDetail}>{description}</Text>
          )}
          {/* Only show sizes if they exist */}
          {sizes && Array.isArray(sizes) && sizes.length > 0 && (
            <View style={styles.sizeSelectorContainer}>
              <Text style={styles.sizeSelectorTitle}>Chọn size:</Text>
              <View style={styles.sizeSelectorRow}>
                {sizes.map((size: any, index: number) => {
                  // Format display name with price if not already included
                  let displayText = size.displayName || size.name || size.size_name;
                  
                  // If displayName doesn't include price info and price exists, add it
                  if (displayText && size.price && size.price > 0 && !displayText.includes('+')) {
                    const sizePrice = typeof size.price === 'number' ? size.price : parseFloat(size.price || 0);
                    if (sizePrice > 0) {
                      displayText = `${displayText} (+${sizePrice.toLocaleString('vi-VN')}₫)`;
                    }
                  }
                  
                  return (
                    <TouchableOpacity
                      key={size.id || index}
                      style={[
                        styles.sizeOption,
                        selectedSize?.id === size.id && styles.sizeOptionSelected
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[
                        styles.sizeOptionText,
                        selectedSize?.id === size.id && styles.sizeOptionTextSelected
                      ]}>
                        {displayText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        <View style={styles.reviewSection}>
          {/* Tổng quan đánh giá */}
          <View style={styles.ratingSummaryBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.ratingAvg}>{(reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0')}</Text>
              <Text style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 'bold', fontSize: 18 }}>★</Text>
            </View>
            <Text style={styles.ratingCount}>{reviews.length} đánh giá</Text>
            {[5,4,3,2,1].map(star => {
              const count = reviews.filter((r: any) => Math.floor(r.rating) === star).length;
              return (
                <View key={star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarStar}>{star}</Text>
                  <Text style={{ color: '#f59e0b', fontWeight: 'bold', marginRight: 4 }}>★</Text>
                  <View style={styles.ratingBarBg}>
                    <View style={[styles.ratingBarFill, { width: `${(reviews.length > 0 ? (count / reviews.length) * 100 : 0)}%` }]} />
                  </View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              );
            })}
          </View>
          {/* List đánh giá */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
            <Text style={styles.reviewTitle}>Đánh giá món ăn</Text>
            <View style={styles.sortBtn}><Text style={styles.sortBtnText}>Mới nhất</Text></View>
          </View>
          {loadingReviews ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={{ color: '#6b7280', marginTop: 8 }}>Đang tải đánh giá...</Text>
            </View>
          ) : (
            <FlatList
              data={reviews}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={renderReviewItem}
              ListEmptyComponent={<Text style={styles.noReview}>Chưa có đánh giá nào</Text>}
              style={{ marginTop: 8 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  backBtn: {
    position: 'absolute',
    top: 38,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 22,
    color: '#ea580c',
    fontWeight: 'bold',
  },
  container: { flex: 1, padding: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  foodImage: { width: 160, height: 160, borderRadius: 16, marginBottom: 12 },
  foodName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  foodPrice: { fontSize: 18, color: '#ef4444', fontWeight: 'bold', marginBottom: 4 },
  foodDesc: { fontSize: 15, color: '#6b7280', marginBottom: 10, textAlign: 'center' },
  foodDescDetail: { fontSize: 14, color: '#374151', marginBottom: 8, textAlign: 'center', fontStyle: 'italic' },
  sizeSelectorContainer: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  sizeSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  sizeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sizeOptionSelected: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  sizeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  sizeOptionTextSelected: {
    color: '#fff',
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  ratingSummaryBox: {
  backgroundColor: '#fbbf24',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  ratingAvg: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  ratingCount: { color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ratingBarStar: { color: '#fff', fontWeight: 'bold', fontSize: 15, width: 16 },
  ratingBarBg: { height: 8, backgroundColor: '#fde68a', borderRadius: 4, flex: 1, marginHorizontal: 4 },
  ratingBarFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  ratingBarCount: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  sortBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginLeft: 10 },
  sortBtnText: { color: '#ea580c', fontWeight: 'bold' },
  reviewTitle: { fontSize: 17, fontWeight: 'bold', color: '#ea580c' },
  reviewItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  reviewUser: { fontWeight: 'bold', color: '#ea580c', fontSize: 15 },
  reviewRating: { color: '#f59e0b', fontWeight: 'bold', fontSize: 14 },
  reviewTime: { color: '#6b7280', fontSize: 13, marginLeft: 8 },
  reviewMore: { color: '#6b7280', fontWeight: 'bold', fontSize: 18, marginLeft: 8 },
  reviewText: { color: '#374151', fontSize: 15, marginTop: 4 },
  reviewActions: { flexDirection: 'row', marginTop: 6 },
  reviewAction: { color: '#ea580c', fontWeight: 'bold', marginRight: 18, fontSize: 13 },
  noReview: { color: '#6b7280', fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
});

export default FoodDetailScreen;
