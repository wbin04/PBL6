import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { X, RefreshCcw } from 'lucide-react-native';
import { RootState } from '@/store';
import { Store } from '@/types';
import { storesService } from '@/services';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header mới, đồng bộ EditFood / Dashboard */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ người bán</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + tên */}
        <View style={styles.avatarBox}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
            <View style={styles.avatarCamera} />
          </View>
          <Text style={styles.sellerName}>
            {store?.store_name || user?.fullname || '—'}
          </Text>
          <Text style={styles.sellerJoin}>
            Tham gia từ: {formatDate(user?.created_date)}
          </Text>
        </View>

        {/* Thống kê nhanh */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsToDisplay.total_orders}
            </Text>
            <Text style={styles.statLabel}>Tổng đơn hàng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsToDisplay.average_rating
                ? statsToDisplay.average_rating.toFixed(1)
                : '0.0'}
            </Text>
            <Text style={styles.statLabel}>Điểm đánh giá</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {statsToDisplay.total_foods}
            </Text>
            <Text style={styles.statLabel}>Món đang bán</Text>
          </View>
        </View>

        {/* Lỗi / retry */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleLoadProfile}
            >
              <RefreshCcw size={16} color="#ea580c" />
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Thông tin cá nhân */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ và tên</Text>
            <Text style={styles.infoValue}>{user?.fullname || '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại</Text>
            <Text style={styles.infoValue}>{user?.phone_number || '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ</Text>
            <Text style={styles.infoValue}>{user?.address || '—'}</Text>
          </View>
        </View>

        {/* Thông tin cửa hàng */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cửa hàng</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên cửa hàng</Text>
            <Text style={styles.infoValue}>
              {store?.store_name || 'Chưa cập nhật'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ</Text>
            <Text style={styles.infoValue}>
              {store?.address || 'Chưa cập nhật'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mô tả</Text>
            <Text style={styles.infoValue}>
              {store?.description || 'Chưa có mô tả'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.statusDot, { color: statusColor }]}>●</Text>
              <Text
                style={[styles.statusText, { color: statusColor }]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Nút cập nhật */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.updateBtn,
              (!store || loading) && styles.updateBtnDisabled,
            ]}
            onPress={() =>
              navigation.navigate('SellerProfileEditScreen', { store })
            }
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },

  // Header mới
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },

  // Avatar
  avatarBox: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 34,
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  avatarCamera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ea580c',
  },
  sellerName: {
    marginTop: 10,
    fontSize: 18,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  sellerJoin: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 18,
    color: '#ea580c',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  // Error
  errorContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  errorText: {
    color: '#b45309',
    fontSize: 13,
    marginBottom: 6,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  retryText: {
    color: '#ea580c',
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // Sections
  sectionBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 15,
    color: '#ea580c',
    marginBottom: 10,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  infoRow: {
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  infoValue: {
    marginTop: 2,
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    fontSize: 18,
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  // Footer button
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  updateBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  updateBtnDisabled: {
    backgroundColor: '#f59e0b',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.5,
    fontFamily: Fonts.LeagueSpartanBold,
  },
});

export default SellerProfileScreen;
