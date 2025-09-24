
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGE_MAP } from '../assets/imageMap';

const FoodDetailPopup = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    image,
    name,
    price,
    description,
    sizes = ['Nhỏ', 'Vừa', 'Lớn'],
    reviews = [],
  } = route.params as any || {};
  const [selectedSize, setSelectedSize] = useState(sizes[0]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>
      <View style={styles.container}>
        <View style={styles.card}>
          <Image
            source={
              typeof image === 'number'
                ? image
                : IMAGE_MAP[image] || require('../assets/images/placeholder.png')
            }
            style={styles.foodImage}
          />
          <Text style={styles.foodName}>{name}</Text>
          <Text style={styles.foodPrice}>{price}</Text>
          <Text style={styles.foodDesc}>{description}</Text>
          <Text style={styles.sizeTitle}>Các size: <Text style={styles.sizeText}>{sizes.join(', ')}</Text></Text>
        </View>
        <View style={styles.reviewSection}>
          {/* Tổng quan đánh giá */}
          <View style={styles.ratingSummaryBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.ratingAvg}>{(reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0')}</Text>
              <Text style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 'bold', fontSize: 18 }}>★</Text>
            </View>
            <Text style={styles.ratingCount}>{reviews.length} đánh giá</Text>
            {/* Bar số lượng từng mức sao */}
            {[5,4,3,2,1].map(star => {
              const count = reviews.filter((r: any) => r.rating === star).length;
              return (
                <View key={star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarStar}>{star}</Text>
                  <Text style={{ color: '#f59e0b', fontWeight: 'bold', marginRight: 4 }}>★</Text>
                  <View style={styles.ratingBarBg}>
                    <View style={[styles.ratingBarFill, { width: `${(count / (reviews.length || 1)) * 100}%` }]} />
                  </View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              );
            })}
          </View>
          {/* List đánh giá */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
            <Text style={styles.reviewTitle}>Đánh giá món ăn</Text>
            {/* Sắp xếp, tuỳ chọn... */}
            <View style={styles.sortBtn}><Text style={styles.sortBtnText}>Mới nhất</Text></View>
          </View>
          <FlatList
            data={reviews}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{item.user?.[0]?.toUpperCase() || 'A'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewUser}>{item.user ?? 'Ẩn danh'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      {[...Array(item.rating || 0)].map((_, i) => (
                        <Text key={i} style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 15 }}>★</Text>
                      ))}
                      <Text style={styles.reviewTime}>gần đây</Text>
                    </View>
                  </View>
                  {/* ... */}
                  <Text style={styles.reviewMore}>...</Text>
                </View>
                <Text style={styles.reviewText}>{item.text ?? 'Không có nội dung'}</Text>
                <View style={styles.reviewActions}>
                  <Text style={styles.reviewAction}>👍 Hữu ích ({item.likes ?? 0})</Text>
                  <Text style={styles.reviewAction}>Báo cáo</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.noReview}>Chưa có đánh giá nào</Text>}
            style={{ marginTop: 8 }}
          />
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
  sizeTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, alignSelf: 'flex-start' },
  sizeList: { flexDirection: 'row', marginBottom: 10 },
  sizeItem: {
    backgroundColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeItemActive: {
    backgroundColor: '#fbbf24',
    borderColor: '#ea580c',
  },
  sizeText: { color: '#b45309', fontWeight: 'bold', fontSize: 15 },
  sizeTextActive: { color: '#ea580c' },
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

export default FoodDetailPopup;
