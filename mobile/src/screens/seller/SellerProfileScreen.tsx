import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { X, RefreshCcw } from 'lucide-react-native';
import { RootState } from '@/store';
import { Store } from '@/types';
import { storesService } from '@/services';

type SellerProfileScreenProps = {
  navigation: any;
};

type StoreStats = {
  total_foods: number;
  total_orders: number;
  total_revenue: number;
  average_rating: number;
  total_ratings: number;
};

const SellerProfileScreen: React.FC<SellerProfileScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [store, setStore] = useState<Store | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultStats: StoreStats = useMemo(() => ({
    total_foods: 0,
    total_orders: 0,
    total_revenue: 0,
    average_rating: 0,
    total_ratings: 0,
  }), []);

  const avatarLetter = useMemo(() => {
    const source = store?.store_name || user?.fullname || 'S';
    return source.charAt(0).toUpperCase();
  }, [store?.store_name, user?.fullname]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch (err) {
      return dateString;
    }
  };

  const handleLoadProfile = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const myStore = await storesService.getMyStore();
      setStore(myStore);

      try {
        const stats = await storesService.getStoreStats(myStore.id);
        setStoreStats(stats);
      } catch (statsError) {
        console.log('Failed to load store stats:', statsError);
        setStoreStats(defaultStats);
      }
    } catch (err: any) {
      console.log('Failed to load seller profile:', err);
      setError(err?.message || 'Không thể tải thông tin cửa hàng.');
      setStore(null);
      setStoreStats(defaultStats);
    } finally {
      setLoading(false);
    }
  }, [user, defaultStats]);

  useFocusEffect(
    useCallback(() => {
      handleLoadProfile();
    }, [handleLoadProfile])
  );

  const statsToDisplay = storeStats || defaultStats;
  const statusLabel = store ? 'Đang hoạt động' : 'Chưa đăng ký';
  const statusColor = store ? '#10b981' : '#f97316';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ người bán</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={28} color="#222" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarBox}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
            <View style={styles.avatarCamera} />
          </View>
          <Text style={styles.sellerName}>{store?.store_name || user?.fullname || '—'}</Text>
          <Text style={styles.sellerJoin}>Tham gia từ: {formatDate(user?.created_date)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statsToDisplay.total_orders}</Text>
            <Text style={styles.statLabel}>Tổng đơn hàng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsToDisplay.average_rating ? statsToDisplay.average_rating.toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.statLabel}>Điểm đánh giá</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statsToDisplay.total_foods}</Text>
            <Text style={styles.statLabel}>Món đang bán</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleLoadProfile}>
              <RefreshCcw size={16} color="#ea580c" />
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <Text style={styles.infoLabel}>Họ và tên</Text>
          <Text style={styles.infoValue}>{user?.fullname || '—'}</Text>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          <Text style={styles.infoLabel}>Số điện thoại</Text>
          <Text style={styles.infoValue}>{user?.phone_number || '—'}</Text>
          <Text style={styles.infoLabel}>Địa chỉ</Text>
          <Text style={styles.infoValue}>{user?.address || '—'}</Text>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cửa hàng</Text>
          <Text style={styles.infoLabel}>Tên cửa hàng</Text>
          <Text style={styles.infoValue}>{store?.store_name || 'Chưa cập nhật'}</Text>
          <Text style={styles.infoLabel}>Địa chỉ</Text>
          <Text style={styles.infoValue}>{store?.address || 'Chưa cập nhật'}</Text>
          <Text style={styles.infoLabel}>Mô tả</Text>
          <Text style={styles.infoValue}>{store?.description || 'Chưa có mô tả'}</Text>
          <Text style={styles.infoLabel}>Trạng thái</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusDot, { color: statusColor }]}>●</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 24 }}>
          <TouchableOpacity
            style={[styles.updateBtn, (!store || loading) && styles.updateBtnDisabled]}
            onPress={() => navigation.navigate('SellerProfileEditScreen', { store })}
            disabled={!store || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateBtnText}>Cập nhật</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 60,
  },
  updateBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  updateBtnDisabled: {
    backgroundColor: '#f59e0b',
  },
  updateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  container: { flex: 1, backgroundColor: '#fff', padding: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff7ed', borderBottomWidth: 0, marginTop: 30 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  closeBtn: { padding: 6 },
  avatarBox: { alignItems: 'center', marginTop: 18, marginBottom: 8 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  avatarCamera: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: '#ea580c' },
  sellerName: { fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 8 },
  sellerJoin: { fontSize: 13, color: '#888', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12, marginHorizontal: 8 },
  statCard: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#ea580c' },
  statLabel: { fontSize: 13, color: '#888' },
  sectionBox: { backgroundColor: '#fff7ed', borderRadius: 12, marginHorizontal: 18, marginTop: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#888', marginTop: 6 },
  infoValue: { fontSize: 15, color: '#222', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { fontSize: 18, marginRight: 4 },
  statusText: { fontWeight: 'bold', fontSize: 15 },
  errorContainer: { marginHorizontal: 18, marginTop: 8, padding: 12, backgroundColor: '#fef3c7', borderRadius: 10 },
  errorText: { color: '#b45309', fontSize: 14, marginBottom: 6 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { color: '#ea580c', fontWeight: '600' },
});

export default SellerProfileScreen;
