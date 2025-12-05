import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/services/api';
import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

type Customer = {
  id: number;
  fullname: string;
  phone_number: string;
  email: string;
  role: string;
  is_active: boolean;
  username: string;
  address: string;
  created_date: string;
};

type RootStackParamList = {
  CustomerListScreen: undefined;
  UpdateCustomerScreen: {
    customer: Customer;
    onUpdate: (updated: Customer) => void;
  };
};

const initialCustomers: Customer[] = [];

type CustomerListScreenProps = {
  searchQuery?: string;
};

export default function CustomerListScreen({ searchQuery = '' }: CustomerListScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [localSearchText, setLocalSearchText] = useState('');

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const params: any = {};
      const searchTerm = localSearchText || searchQuery;
      if (searchTerm) params.search = searchTerm;

      const response: any = await apiClient.get('/auth/admin/customers/', {
        params,
        timeout: 10000,
      });

      let data = response.data || response;

      if (data) {
        if (Array.isArray(data)) {
          setAllCustomers(data);
        } else if (data.customers && Array.isArray(data.customers)) {
          setAllCustomers(data.customers);
        } else if (data.results && Array.isArray(data.results)) {
          setAllCustomers(data.results);
        } else {
          if (__DEV__) console.error('Unexpected API response structure:', data);
          setAllCustomers([]);
          Alert.alert('Lưu ý', 'Dữ liệu có cấu trúc không như mong đợi');
        }
      } else {
        if (__DEV__) console.error('Empty API response or missing data');
        setAllCustomers([]);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error fetching customers:', error.message);
      }

      let errorMessage = 'Không thể tải danh sách khách hàng';
      if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Không có quyền truy cập.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Kết nối quá chậm. Vui lòng thử lại.';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on status
  useEffect(() => {
    let filtered = [...allCustomers];

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((c) => c.is_active === true);
    } else if (statusFilter === 'locked') {
      filtered = filtered.filter((c) => c.is_active === false);
    }

    setCustomers(filtered);
  }, [allCustomers, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, localSearchText]);

  const handleSearch = () => {
    fetchCustomers();
  };

  const startEdit = (customer: Customer) => {
    setEditId(customer.id);
    setEditName(customer.fullname);
    setEditPhone(customer.phone_number);
    setEditEmail(customer.email);
    setEditAddress(customer.address || '');
  };

  const saveEdit = async () => {
    if (!editId) return;

    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Tên không được để trống');
      return;
    }

    if (!editPhone.trim()) {
      Alert.alert('Lỗi', 'Số điện thoại không được để trống');
      return;
    }

    try {
      setLoading(true);
      const response: any = await apiClient.put(`/auth/admin/customers/${editId}/`, {
        fullname: editName.trim(),
        phone_number: editPhone.trim(),
        address: editAddress.trim(),
      });

      setAllCustomers((prev) =>
        prev.map((c) => (c.id === editId ? { ...c, ...response.data } : c)),
      );

      setEditId(null);
      setEditName('');
      setEditPhone('');
      setEditEmail('');
      setEditAddress('');

      Alert.alert('Thành công', 'Cập nhật thông tin khách hàng thành công');
    } catch (error: any) {
      console.error('Error updating customer:', error);

      let errorMessage = 'Không thể cập nhật thông tin khách hàng';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditPhone('');
    setEditEmail('');
    setEditAddress('');
  };

  const toggleCustomerStatus = async (customerId: number) => {
    try {
      setLoading(true);
      const response: any = await apiClient.post(
        `/auth/admin/customers/${customerId}/toggle-status/`,
      );

      console.log('Toggle status response:', response);

      if (response && response.data && response.data.customer) {
        setAllCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? response.data.customer : c)),
        );
      } else if (response && response.data) {
        if (response.data.id === customerId) {
          setAllCustomers((prev) =>
            prev.map((c) => (c.id === customerId ? response.data : c)),
          );
        } else {
          setAllCustomers((prev) =>
            prev.map((c) =>
              c.id === customerId ? { ...c, is_active: !c.is_active } : c,
            ),
          );
        }
      } else {
        setAllCustomers((prev) =>
          prev.map((c) =>
            c.id === customerId ? { ...c, is_active: !c.is_active } : c,
          ),
        );
      }

      const message =
        response?.data?.message || 'Đã thay đổi trạng thái khách hàng thành công';
      Alert.alert('Thành công', message);
    } catch (error: any) {
      console.error('Error toggling customer status:', error);
      console.error('Error response:', error.response?.data);

      let errorMessage = 'Không thể thay đổi trạng thái khách hàng';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalFound = customers.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.roundIconBtn}
          >
            <ArrowLeft size={18} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Khách hàng</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Thanh tìm kiếm trong header - đổi UI như StoreListScreen */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên, SĐT, email..."
              placeholderTextColor="#9ca3af"
              value={localSearchText}
              onChangeText={setLocalSearchText}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {localSearchText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setLocalSearchText('');
                  handleSearch();
                }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* FILTER PILLS như restaurants/index.tsx */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            statusFilter === 'all' && styles.filterPillActive,
          ]}
          onPress={() => setStatusFilter('all')}
        >
          <Text
            style={[
              styles.filterPillText,
              statusFilter === 'all' && styles.filterPillTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterPill,
            statusFilter === 'active' && styles.filterPillActive,
          ]}
          onPress={() => setStatusFilter('active')}
        >
          <Text
            style={[
              styles.filterPillText,
              statusFilter === 'active' && styles.filterPillTextActive,
            ]}
          >
            Hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterPill,
            statusFilter === 'locked' && styles.filterPillActive,
          ]}
          onPress={() => setStatusFilter('locked')}
        >
          <Text
            style={[
              styles.filterPillText,
              statusFilter === 'locked' && styles.filterPillTextActive,
            ]}
          >
            Đã khóa
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thanh kết quả giống restaurants/index.tsx */}
      <View style={styles.foundWrap}>
        <Text style={styles.foundText}>
          Tìm thấy <Text style={styles.foundNum}>{totalFound}</Text> khách hàng
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EB552D" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {customers.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có khách hàng nào</Text>
          </View>
        ) : (
          customers.map((c) => (
            <View key={c.id} style={styles.card}>
              {editId === c.id ? (
                <View>
                  <Text style={styles.editLabel}>Cập nhật thông tin</Text>

                  <Text style={styles.inputLabel}>Tên khách hàng</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.input}
                    placeholder="Nhập tên khách hàng"
                  />

                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    style={styles.input}
                    placeholder="Nhập số điện thoại"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>Địa chỉ</Text>
                  <TextInput
                    value={editAddress}
                    onChangeText={setEditAddress}
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Nhập địa chỉ"
                    multiline
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={saveEdit}
                      style={[
                        styles.saveButton,
                        loading && styles.disabledButton,
                      ]}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={cancelEdit}
                      style={styles.cancelButton}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.name}>{c.fullname}</Text>
                      {!!c.username && (
                        <Text style={styles.username}>@{c.username}</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        c.is_active
                          ? styles.statusBadgeActive
                          : styles.statusBadgeLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          c.is_active
                            ? styles.statusTextActive
                            : styles.statusTextLocked,
                        ]}
                      >
                        {c.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.infoLine}>
                      <View style={styles.iconCircle}>
                        <Ionicons
                          name="call-outline"
                          size={18}
                          color="#e95322"
                        />
                      </View>
                      <Text style={styles.infoText}>
                        {c.phone_number || 'Chưa có số điện thoại'}
                      </Text>
                    </View>

                    <View style={styles.infoLine}>
                      <View style={styles.iconCircle}>
                        <Ionicons
                          name="mail-outline"
                          size={18}
                          color="#e95322"
                        />
                      </View>
                      <Text style={styles.infoText}>
                        {c.email || 'Chưa cập nhật email'}
                      </Text>
                    </View>

                    <View style={styles.infoLine}>
                      <View style={styles.iconCircle}>
                        <Ionicons
                          name="location-outline"
                          size={18}
                          color="#e95322"
                        />
                      </View>
                      <Text style={styles.infoText} numberOfLines={2}>
                        {c.address || 'Chưa cập nhật địa chỉ'}
                      </Text>
                    </View>

                    <View style={styles.infoLine}>
                      <View style={[styles.iconCircle, styles.iconCircleMuted]}>
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color="#6b7280"
                        />
                      </View>
                      <Text style={styles.infoSubText}>
                        Tạo tài khoản: {c.created_date}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() => startEdit(c)}
                      style={[
                        styles.updateButton,
                        loading && styles.disabledButton,
                      ]}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>Cập nhật</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleCustomerStatus(c.id)}
                      style={[
                        styles.lockButton,
                        loading && styles.disabledButton,
                      ]}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {c.is_active ? 'Khóa tài khoản' : 'Mở tài khoản'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  // chỉnh lại giống StoreListScreen (nút tìm nền cam bên phải)
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

  // Found bar
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

  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
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
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 999,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
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
  editLabel: {
    marginBottom: 8,
    fontSize: 16,
    color: '#e95322',
    fontFamily: Fonts.LeagueSpartanBold,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
    color: '#374151',
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    backgroundColor: '#f9fafb',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
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
    fontSize: 16,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});
