
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useShipper } from '../context/ShipperContext';


const ShipperDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { shipperId } = route.params as { shipperId: string };
  const { shippers, getOrdersByShipper, getRatingsByShipper } = useShipper();
  const shipper = shippers.find(s => s.id === shipperId);
  const orders = getOrdersByShipper(shipperId);
  const ratings = getRatingsByShipper(shipperId);

  if (!shipper) return <View style={styles.container}><Text>Không tìm thấy shipper</Text></View>;

  // Tính toán tổng quan đánh giá
  const ratingAvg = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1) : '0.0';

  // Header for reviews list
  const renderHeader = () => (
    <>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>{'←'}</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{shipper.name[0]?.toUpperCase() || 'S'}</Text></View>
        <Text style={styles.shipperName}>{shipper.name}</Text>
        <Text style={styles.shipperPhone}>SĐT: {shipper.phone}</Text>
        <Text style={styles.shipperGroup}>Nhóm: {shipper.group}</Text>
      </View>
      <View style={styles.reviewSection}>
        {/* Tổng quan đánh giá */}
        <View style={styles.ratingSummaryBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.ratingAvg}>{ratingAvg}</Text>
            <Text style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 'bold', fontSize: 18 }}>★</Text>
          </View>
          <Text style={styles.ratingCount}>{ratings.length} đánh giá</Text>
          {/* Bar số lượng từng mức sao */}
          {[5,4,3,2,1].map(star => {
            const count = ratings.filter(r => r.rating === star).length;
            return (
              <View key={star} style={styles.ratingBarRow}>
                <Text style={styles.ratingBarStar}>{star}</Text>
                <Text style={{ color: '#f59e0b', fontWeight: 'bold', marginRight: 4 }}>★</Text>
                <View style={styles.ratingBarBg}>
                  <View style={[styles.ratingBarFill, { width: `${(count / (ratings.length || 1)) * 100}%` }]} />
                </View>
                <Text style={styles.ratingBarCount}>{count}</Text>
              </View>
            );
          })}
        </View>
        {/* List đánh giá title/sort */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
          <Text style={styles.reviewTitle}>Đánh giá shipper</Text>
          <View style={styles.sortBtn}><Text style={styles.sortBtnText}>Mới nhất</Text></View>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={ratings}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={styles.avatarSmall}><Text style={styles.avatarText}>{shipper.name[0]?.toUpperCase() || 'S'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewUser}>Ẩn danh</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  {[...Array(item.rating || 0)].map((_, i) => (
                    <Text key={i} style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 15 }}>★</Text>
                  ))}
                  <Text style={styles.reviewTime}>gần đây</Text>
                </View>
              </View>
              <Text style={styles.reviewMore}>...</Text>
            </View>
            <Text style={styles.reviewText}>{item.comment ?? 'Không có nội dung'}</Text>
            <View style={styles.reviewActions}>
              <Text style={styles.reviewAction}>👍 Hữu ích (0)</Text>
              <Text style={styles.reviewAction}>Báo cáo</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noReview}>Chưa có đánh giá nào</Text>}
        contentContainerStyle={{ padding: 18, paddingBottom: 0 }}
        style={{ flexGrow: 0 }}
      />
      <Text style={[styles.sectionTitle, { marginLeft: 18, marginTop: 10 }]}>Đơn đã giao</Text>
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Text>{item.customerName} - {item.address} ({item.status})</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có đơn nào</Text>}
        style={{ marginHorizontal: 18, maxHeight: 120 }}
      />
    </View>
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
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
  shipperName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  shipperPhone: { fontSize: 15, color: '#6b7280', marginBottom: 2 },
  shipperGroup: { fontSize: 15, color: '#6b7280', marginBottom: 2 },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 18,
  },
  ratingSummaryBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  ratingAvg: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  ratingCount: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingBarStar: {
    fontWeight: 'bold',
    color: '#f59e0b',
    marginRight: 2,
    width: 18,
    textAlign: 'right',
  },
  ratingBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  ratingBarCount: {
    width: 24,
    textAlign: 'left',
    color: '#6b7280',
    fontSize: 13,
  },
  reviewTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  sortBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  sortBtnText: {
    color: '#ea580c',
    fontWeight: 'bold',
    fontSize: 13,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUser: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 14,
  },
  reviewTime: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 8,
  },
  reviewMore: {
    color: '#6b7280',
    fontSize: 18,
    marginLeft: 8,
  },
  reviewText: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 6,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewAction: {
    color: '#ea580c',
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 16,
  },
  noReview: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1f2937',
    marginTop: 18,
    marginBottom: 8,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default ShipperDetailScreen;
