import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { promotionsService, Promotion } from '../services/promotionsService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Fonts } from '@/constants/Fonts';
import { SafeAreaView } from 'react-native-safe-area-context';

const VoucherManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  const isAdmin = user?.role === 'Quản lý' || user?.role_id === 2;

  const loadPromotions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const data = isAdmin 
        ? await promotionsService.getAdminPromotions()
        : await promotionsService.getStorePromotions();
      
      setPromotions(data);
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPromotions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPromotions(false);
  };

  const handleAdd = () => {
    navigation.navigate('VoucherEditScreen', { promotion: null, isAdmin });
  };

  const handleEdit = (promotion: Promotion) => {
    navigation.navigate('VoucherEditScreen', { promotion, isAdmin });
  };

  const handleDelete = async (promotion: Promotion) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa khuyến mãi "${promotion.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const result = isAdmin
                ? await promotionsService.deleteAdminPromotion(promotion.id)
                : await promotionsService.deletePromotion(promotion.id);
              
              if (result.success) {
                Alert.alert('Thành công', result.message);
                loadPromotions();
              }
            } catch (error: any) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Lỗi', error.message || 'Không thể xóa khuyến mãi');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDiscount = (promotion: Promotion) => {
    if (promotion.discount_type === 'PERCENT') {
      const maxDiscount = promotion.max_discount_amount 
        ? ` (tối đa ${parseInt(promotion.max_discount_amount.toString()).toLocaleString('vi-VN')}đ)`
        : '';
      return `${promotion.discount_value}%${maxDiscount}`;
    } else {
      return `${parseInt(promotion.discount_value.toString()).toLocaleString('vi-VN')}đ cố định`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getStatusDisplay = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (!promotion.is_active) {
      return { emoji: '🔴', text: 'Không hoạt động', type: 'expired' };
    } else if (now < startDate) {
      return { emoji: '⚪', text: 'Chưa bắt đầu', type: 'active' };
    } else if (now > endDate) {
      return { emoji: '🔴', text: 'Đã hết hạn', type: 'expired' };
    } else {
      return { emoji: '🟢', text: 'Đang hoạt động', type: 'active' };
    }
  };

  const filteredPromotions = promotions
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toString().includes(searchQuery)
    )
    .filter(p => {
      if (statusFilter === 'all') return true;
      const status = getStatusDisplay(p);
      return status.type === statusFilter;
    });

  const totalFound = filteredPromotions.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminDashboard' }],
              })
            }
            style={styles.roundIconBtn}
          >
            <ArrowLeft size={18} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Khuyến mãi</Text>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên hoặc mã..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.searchBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterPillText, statusFilter === 'all' && styles.filterPillTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterPill, statusFilter === 'active' && styles.filterPillActive]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[styles.filterPillText, statusFilter === 'active' && styles.filterPillTextActive]}>
            Đang hoạt động
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterPill, statusFilter === 'expired' && styles.filterPillActive]}
          onPress={() => setStatusFilter('expired')}
        >
          <Text style={[styles.filterPillText, statusFilter === 'expired' && styles.filterPillTextActive]}>
            Đã hết hạn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAdd}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy <Text style={styles.foundNum}>{totalFound}</Text> khuyến mãi
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EB552D" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPromotions}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#EB552D']}
              tintColor="#EB552D"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Không tìm thấy khuyến mãi phù hợp'
                  : 'Chưa có khuyến mãi nào'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = getStatusDisplay(item);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.username}>#{item.id}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      status.emoji === '🟢'
                        ? styles.statusBadgeActive
                        : styles.statusBadgeLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        status.emoji === '🟢'
                          ? styles.statusTextActive
                          : styles.statusTextLocked,
                      ]}
                    >
                      {status.text}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.infoLine}>
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color="#e95322"
                      />
                    </View>
                    <Text style={styles.infoText}>
                      Giảm: {formatDiscount(item)}
                    </Text>
                  </View>

                  <View style={styles.infoLine}>
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name="cash-outline"
                        size={18}
                        color="#e95322"
                      />
                    </View>
                    <Text style={styles.infoText}>
                      Đơn tối thiểu:{' '}
                      {parseInt(item.minimum_pay.toString()).toLocaleString('vi-VN')}đ
                    </Text>
                  </View>

                  <View style={styles.infoLine}>
                    <View style={[styles.iconCircle, styles.iconCircleMuted]}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#6b7280"
                      />
                    </View>
                    <Text style={styles.infoSubText}>
                      {formatDate(item.start_date)} → {formatDate(item.end_date)}
                    </Text>
                  </View>

                  {isAdmin && (
                    <View style={styles.infoLine}>
                      <View style={[styles.iconCircle, styles.iconCircleMuted]}>
                        <Ionicons
                          name="globe-outline"
                          size={18}
                          color="#6b7280"
                        />
                      </View>
                      <Text style={styles.infoSubText}>Toàn hệ thống</Text>
                    </View>
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={[styles.updateButton, loading && styles.disabledButton]}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Cập nhật</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={[styles.lockButton, loading && styles.disabledButton]}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  headerWrap: {
    backgroundColor: '#f5cb58',
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  roundIconBtn: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontFamily: Fonts.LeagueSpartanExtraBold,
  },
  searchRow: {
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  clearBtn: {
    paddingHorizontal: 4,
  },
  searchBtn: {
    height: 42,
    width: 42,
    borderRadius: 999,
    backgroundColor: '#EB552D',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F2F3F5',
  },
  filterPillActive: {
    backgroundColor: '#EB552D',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterPillText: {
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },
  addButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#10b981',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
  },

  foundWrap: {
    marginTop: 12,
    backgroundColor: '#F6F7F8',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  foundText: {
    color: '#6B7280',
    marginLeft: 6,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  foundNum: {
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanBold,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 16,
    marginBottom: 2,
    color: '#391713',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  username: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderColor: '#10b981',
  },
  statusBadgeLocked: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  statusTextActive: {
    color: '#047857',
  },
  statusTextLocked: {
    color: '#b91c1c',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(233,83,34,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMuted: {
    backgroundColor: '#e5e7eb',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  infoSubText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  updateButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 999,
    flex: 1,
    alignItems: 'center',
  },
  lockButton: {
    backgroundColor: '#e95322',
    paddingVertical: 10,
    borderRadius: 999,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    opacity: 0.7,
  },

  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    textAlign: 'center',
  },
});

export default VoucherManagementScreen;
