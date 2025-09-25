import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Alert, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGE_MAP } from '../assets/imageMap';
import { API_CONFIG } from "@/constants";
import { apiClient } from '@/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FoodDetailPopup = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    foodId,
    image,
    name,
    price,
    description,
    sizes = null, // Change default to null instead of array
    reviews: routeReviews = [],
    rating: routeRating,
  } = route.params as any || {};

  console.log('=== FoodDetailPopup Debug ===');
  console.log('Route params:', route.params);
  console.log('foodId:', foodId, typeof foodId);
  console.log('name:', name);
  console.log('sizes:', sizes);
  console.log('sizes type:', typeof sizes);
  console.log('sizes is array:', Array.isArray(sizes));
  console.log('===========================');
  
  const [selectedSize, setSelectedSize] = useState(sizes && Array.isArray(sizes) && sizes.length > 0 ? sizes[0] : null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(routeRating || 0);
  const [reviewsFetched, setReviewsFetched] = useState(false);

  // Calculate total price including selected size
  const getTotalPrice = () => {
    const basePrice = typeof price === 'number' ? price : 0;
    const sizePrice = selectedSize?.price ? selectedSize.price : 0;
    return basePrice + sizePrice;
  };

  // Function to create image source URL
  const getImageSource = (imageValue: any) => {
    if (!imageValue) {
      return require('../assets/images/placeholder.png');
    }
    
    // If image is already a full URL
    if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
      return { uri: imageValue };
    }
    
    // If it's a string path from API
    if (typeof imageValue === 'string') {
      // Check if it's an IMAGE_MAP key first (for backward compatibility)
      if (IMAGE_MAP[imageValue]) {
        return IMAGE_MAP[imageValue];
      }
      
      // Otherwise, construct full URL from media path
      const baseUrl = API_CONFIG.BASE_URL.replace("/api", ""); // Remove /api from base URL
      const fullUrl = `${baseUrl}/media/${imageValue}`;
      console.log('Food detail image URL:', fullUrl);
      return { uri: fullUrl };
    }
    
    // If it's already an object (local require) or number
    return imageValue;
  };

  // Format price for display
  const formatPrice = (price: any) => {
    if (typeof price === 'number') {
      return `${price.toLocaleString('vi-VN')}₫`;
    }
    return price || '0₫';
  };

  // Helper function to format time ago
  const getTimeAgo = (dateString: string): string => {
    if (!dateString) return 'gần đây';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'vừa xong';
      if (diffInHours < 24) return `${diffInHours} giờ trước`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} ngày trước`;
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks} tuần trước`;
      
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return 'gần đây';
    }
  };

  // Fetch reviews from API - removed useCallback to avoid dependency issues
  const fetchReviews = async () => {
    if (!foodId || reviewsFetched) {
      console.log('Skipping fetch: foodId =', foodId, 'reviewsFetched =', reviewsFetched);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching reviews for food:', foodId);
      
      const response: any = await apiClient.get('/ratings/', {
        params: { food: foodId }
      });
      
      console.log('Full Reviews API Response:', response);
      console.log('Response data:', response.data);
      
      // Handle different response structures - FIX: Simplified logic
      let reviewsData = [];
      
      if (response?.data && Array.isArray(response.data)) {
        reviewsData = response.data;
      } else if (Array.isArray(response)) {
        reviewsData = response;
      } else {
        console.log('Unexpected response format, using empty array');
        reviewsData = [];
      }
      
      console.log('Raw reviews data length:', reviewsData.length);
      console.log('Raw reviews data:', reviewsData);
      
      if (reviewsData.length === 0) {
        console.log('No reviews found for food ID:', foodId);
        setReviews([]);
        setReviewsFetched(true);
        return;
      }
      
      // FIX: Create unique mapped reviews with proper IDs
      const mappedReviews = reviewsData.map((review: any, index: number) => ({
        id: review.id || `review_${foodId}_${index}`, // Ensure unique IDs
        user: review.username || 'Ẩn danh',
        rating: parseFloat(review.rating) || 0,
        text: review.content || 'Không có nội dung',
        likes: Math.floor(Math.random() * 10), // Random likes since API doesn't provide
        created_date: review.created_date || new Date().toISOString(),
        time: review.created_date ? getTimeAgo(review.created_date) : 'gần đây'
      }));
      
      console.log('Final mapped reviews count:', mappedReviews.length);
      console.log('Final mapped reviews:', mappedReviews);
      
      // FIX: Set reviews only once and mark as fetched
      setReviews(mappedReviews);
      setReviewsFetched(true);
      
      // Calculate average rating
      if (mappedReviews.length > 0) {
        const avgRating = mappedReviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / mappedReviews.length;
        setAverageRating(Number(avgRating.toFixed(1)));
        console.log('Calculated average rating:', avgRating);
      }
      
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Set empty reviews and mark as fetched to prevent retry
      setReviews([]);
      setReviewsFetched(true);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Always prioritize API data over route reviews for real data
  useEffect(() => {
    console.log('=== useEffect triggered ===');
    console.log('foodId:', foodId);
    console.log('routeReviews:', routeReviews);
    console.log('routeReviews length:', routeReviews?.length);
    console.log('reviewsFetched:', reviewsFetched);
    
    // Reset everything when foodId changes
    if (foodId) {
      setReviews([]);
      setReviewsFetched(false);
      setLoading(false);
      
      // Always fetch from API if foodId is available (ignore route reviews)
      console.log('Fetching from API for real data');
      fetchReviews();
    }
    
    console.log('=== useEffect end ===');
  }, [foodId]); // Only depend on foodId to avoid infinite loops

  // Render review item
  const renderReviewItem = ({ item }: { item: any }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.user?.[0]?.toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={styles.reviewHeaderContent}>
          <Text style={styles.reviewUser} numberOfLines={1}>{item.user ?? 'Ẩn danh'}</Text>
          <View style={styles.reviewRatingRow}>
            {[...Array(Math.floor(item.rating || 0))].map((_, i) => (
              <Text key={i} style={styles.starIcon}>★</Text>
            ))}
            <Text style={styles.reviewTime}>{item.time || 'gần đây'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.reviewMore}>
          <Text style={styles.reviewMoreText}>⋯</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.reviewText} numberOfLines={3}>{item.text ?? 'Không có nội dung'}</Text>
      <View style={styles.reviewActions}>
        <TouchableOpacity style={styles.reviewActionBtn}>
          <Text style={styles.reviewAction}>👍 Hữu ích ({item.likes ?? 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reviewActionBtn}>
          <Text style={styles.reviewAction}>Báo cáo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Food Info Card */}
        <View style={styles.card}>
          <Image
            source={getImageSource(image)}
            style={styles.foodImage}
            onError={() => console.log('Food detail image load error:', name)}
          />
          <Text style={styles.foodName} numberOfLines={2}>{name}</Text>
          <Text style={styles.foodPrice}>{formatPrice(getTotalPrice())}</Text>
          <Text style={styles.foodDesc} numberOfLines={3}>{description}</Text>
          {/* Only show sizes if they exist */}
          {sizes && Array.isArray(sizes) && sizes.length > 0 && (
            <>
              {/* Size selector */}
              <View style={styles.sizeSelectorContainer}>
                <Text style={styles.sizeSelectorTitle}>Chọn size:</Text>
                <View style={styles.sizeSelectorRow}>
                  {sizes.map((size, index) => (
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
                        {size.displayName || size.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View> 
              </View>
            </>
          )}
        </View>

        {/* Review Section */}
        <View style={styles.reviewSection}>
          {/* Rating Summary */}
          <View style={styles.ratingSummaryBox}>
            <View style={styles.ratingMainRow}>
              <Text style={styles.ratingAvg}>
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.ratingStarLarge}>★</Text>
            </View>
            <Text style={styles.ratingCount}>{reviews.length} đánh giá</Text>
            
            {/* Rating bars */}
            <View style={styles.ratingBarsContainer}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter((r: any) => Math.floor(r.rating) === star).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <View key={star} style={styles.ratingBarRow}>
                    <Text style={styles.ratingBarStar}>{star}</Text>
                    <Text style={styles.ratingBarStarIcon}>★</Text>
                    <View style={styles.ratingBarBg}>
                      <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.ratingBarCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Review List Header */}
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>Đánh giá món ăn</Text>
            <TouchableOpacity style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>Mới nhất</Text>
            </TouchableOpacity>
            {loading && (
              <ActivityIndicator 
                size="small" 
                color="#ea580c" 
                style={styles.loadingIndicator}
              />
            )}
          </View>

          {/* Review List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ea580c" />
              <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.noReview}>
                {foodId ? 'Chưa có đánh giá nào cho món ăn này' : 'Chưa có đánh giá nào'}
              </Text>
            </View>
          ) : (
            <View style={styles.reviewListContainer}>
              {reviews.map((item: any, idx: number) => (
                <View key={item.id?.toString() || idx.toString()}>
                  {renderReviewItem({ item })}
                </View>
              ))}
              {/* DEBUG: Show total count */}
              <Text style={styles.debugText}>
                Tổng số đánh giá hiển thị: {reviews.length}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  backIcon: {
    fontSize: 20,
    color: '#ea580c',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  foodImage: { 
    width: 140, 
    height: 140, 
    borderRadius: 12, 
    marginBottom: 12 
  },
  foodName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1f2937', 
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 26
  },
  foodPrice: { 
    fontSize: 18, 
    color: '#ef4444', 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  foodDesc: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginBottom: 12, 
    textAlign: 'center',
    lineHeight: 20
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingSummaryBox: {
    backgroundColor: '#fbbf24',
    borderRadius: 16,
    padding: 16,
    margin: 16,
  },
  ratingMainRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  ratingAvg: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  ratingStarLarge: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 20, 
    marginLeft: 6 
  },
  ratingCount: { 
    color: '#fff', 
    fontWeight: '600', 
    marginBottom: 12,
    fontSize: 15
  },
  ratingBarsContainer: {
    gap: 4,
  },
  ratingBarRow: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  ratingBarStar: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14, 
    width: 12 
  },
  ratingBarStarIcon: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12, 
    marginRight: 6 
  },
  ratingBarBg: { 
    height: 6, 
    backgroundColor: '#fde68a', 
    borderRadius: 3, 
    flex: 1, 
    marginRight: 8 
  },
  ratingBarFill: { 
    height: 6, 
    backgroundColor: '#fff', 
    borderRadius: 3 
  },
  ratingBarCount: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12, 
    minWidth: 20,
    textAlign: 'right'
  },
  reviewHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  reviewTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ea580c',
    flex: 1
  },
  sortBtn: { 
    backgroundColor: '#f3f4f6', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 6
  },
  sortBtnText: { 
    color: '#ea580c', 
    fontWeight: '600',
    fontSize: 13
  },
  loadingIndicator: {
    marginLeft: 8
  },
  reviewListContainer: {
    maxHeight: screenHeight * 0.5,
    padding: 16,
  },
  reviewItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#ea580c', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  reviewHeaderContent: {
    flex: 1,
    marginLeft: 10,
  },
  reviewUser: { 
    fontWeight: 'bold', 
    color: '#ea580c', 
    fontSize: 14,
    marginBottom: 2
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    color: '#f59e0b',
    fontSize: 12,
    marginRight: 1
  },
  reviewTime: { 
    color: '#6b7280', 
    fontSize: 12, 
    marginLeft: 6 
  },
  reviewMore: {
    padding: 4,
  },
  reviewMoreText: { 
    color: '#6b7280', 
    fontSize: 16 
  },
  reviewText: { 
    color: '#374151', 
    fontSize: 14, 
    lineHeight: 20,
    marginBottom: 8
  },
  reviewActions: { 
    flexDirection: 'row',
    gap: 16
  },
  reviewActionBtn: {
    paddingVertical: 2,
  },
  reviewAction: { 
    color: '#ea580c', 
    fontWeight: '600', 
    fontSize: 13 
  },
  loadingContainer: { 
    padding: 40, 
    alignItems: 'center' 
  },
  loadingText: {
    color: '#6b7280', 
    marginTop: 8,
    fontSize: 14
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  noReview: { 
    color: '#6b7280', 
    fontStyle: 'italic', 
    textAlign: 'center',
    fontSize: 14
  },
  debugText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
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
});

export default FoodDetailPopup;