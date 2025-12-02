import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Menu, ArrowLeft, X, ShoppingBag, Tag } from 'lucide-react-native';
import { promotionsService, Promotion, CreatePromotionRequest } from '../../services/promotionsService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';

const VoucherEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const promotion: Promotion | null = (route.params as any)?.promotion || null;
  const { user } = useSelector((state: RootState) => state.auth);

  const [form, setForm] = useState({
    name: promotion?.name || '',
    discount_type: promotion?.discount_type || 'PERCENT' as 'PERCENT' | 'AMOUNT',
    discount_value: promotion?.discount_value ? promotion.discount_value.toString() : '',
    start_date: promotion?.start_date ? promotionsService.formatDateForDisplay(new Date(promotion.start_date)) : '',
    end_date: promotion?.end_date ? promotionsService.formatDateForDisplay(new Date(promotion.end_date)) : '',
    minimum_pay: promotion?.minimum_pay ? promotion.minimum_pay.toString() : '',
    max_discount_amount: promotion?.max_discount_amount ? promotion.max_discount_amount.toString() : '',
    is_active: promotion?.is_active ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [typeDropdownVisible, setTypeDropdownVisible] = useState(false);
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start_date' | 'end_date' | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên khuyến mãi');
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá trị giảm giá hợp lệ');
      return;
    }
    if (!form.start_date || !form.end_date) {
      Alert.alert('Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }
    if (!form.minimum_pay || parseFloat(form.minimum_pay) < 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá trị đơn tối thiểu hợp lệ');
      return;
    }

    try {
      setLoading(true);

      // Parse dates
      const startDate = promotionsService.parseDisplayDate(form.start_date);
      const endDate = promotionsService.parseDisplayDate(form.end_date);

      if (!startDate || !endDate) {
        Alert.alert('Lỗi', 'Định dạng ngày không hợp lệ');
        return;
      }

      // Check date validity
      if (endDate <= startDate) {
        Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
        return;
      }

      const data: CreatePromotionRequest = {
        name: form.name.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        start_date: promotionsService.formatDateForAPI(startDate),
        end_date: promotionsService.formatDateForAPI(endDate),
        minimum_pay: parseFloat(form.minimum_pay),
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        is_active: form.is_active,
      };

      if (promotion) {
        // Update existing promotion
        await promotionsService.updatePromotion(promotion.id, data);
        Alert.alert('Thành công', 'Đã cập nhật khuyến mãi');
      } else {
        // Create new promotion
        await promotionsService.createPromotion(data);
        Alert.alert('Thành công', 'Đã tạo khuyến mãi mới');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const openDatePicker = (field: 'start_date' | 'end_date') => {
    const dateStr = form[field];
    if (dateStr) {
      const parsed = promotionsService.parseDisplayDate(dateStr);
      setTempDate(parsed || new Date());
    } else {
      setTempDate(new Date());
    }
    setShowDatePicker(field);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Menu color="#ea580c" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {promotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
          </Text>
          <Text style={styles.headerSubtitle}>Cửa hàng của tôi</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color="#ea580c" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Form Container */}
        <View style={styles.formContainer}>

        {/* Tên khuyến mãi */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.label}>Tên khuyến mãi</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={text => setForm({ ...form, name: text })}
            placeholder="Nhập tên khuyến mãi..."
          />
        </View>

        {/* Loại giảm giá */}
        <View style={{ marginBottom: 10, position: 'relative' }}>
          <Text style={styles.label}>Loại giảm giá</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setTypeDropdownVisible(!typeDropdownVisible)}
          >
            <Text>{form.discount_type === 'PERCENT' ? 'PERCENT - Giảm theo phần trăm' : 'AMOUNT - Giảm số tiền cố định'}</Text>
          </TouchableOpacity>
          {typeDropdownVisible && (
            <View style={styles.dropdownOverlay}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setForm({ ...form, discount_type: 'PERCENT' });
                  setTypeDropdownVisible(false);
                }}
              >
                <Text style={{ fontWeight: 'bold' }}>PERCENT - Giảm theo phần trăm</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Giảm theo % giá trị đơn hàng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setForm({ ...form, discount_type: 'AMOUNT' });
                  setTypeDropdownVisible(false);
                }}
              >
                <Text style={{ fontWeight: 'bold' }}>AMOUNT - Giảm số tiền cố định</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Giảm một khoản tiền cụ thể</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Giá trị giảm */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.label}>
            Giá trị giảm {form.discount_type === 'PERCENT' ? '(%)' : '(VNĐ)'}
          </Text>
          <TextInput
            style={styles.input}
            value={form.discount_value}
            onChangeText={text => setForm({ ...form, discount_value: text })}
            keyboardType="numeric"
            placeholder={form.discount_type === 'PERCENT' ? 'Nhập % giảm (VD: 10 = giảm 10%)' : 'Nhập số tiền (VD: 50000)'}
          />
          {form.discount_type === 'PERCENT' && (
            <Text style={{ fontSize: 12, color: '#ea580c', marginTop: 4, fontStyle: 'italic' }}>
              💡 Nhập giá trị từ 1-100 để giảm theo phần trăm
            </Text>
          )}
          {form.discount_type === 'AMOUNT' && (
            <Text style={{ fontSize: 12, color: '#ea580c', marginTop: 4, fontStyle: 'italic' }}>
              💡 Nhập số tiền cụ thể muốn giảm (VNĐ)
            </Text>
          )}
        </View>

        {/* Giảm tối đa (chỉ cho phần trăm) */}
        {form.discount_type === 'PERCENT' && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.label}>Giảm tối đa (VNĐ) - Tùy chọn</Text>
            <TextInput
              style={styles.input}
              value={form.max_discount_amount}
              onChangeText={text => setForm({ ...form, max_discount_amount: text })}
              keyboardType="numeric"
              placeholder="VD: 100000 (giới hạn số tiền giảm tối đa)"
            />
            <Text style={{ fontSize: 12, color: '#ea580c', marginTop: 4, fontStyle: 'italic' }}>
              💡 Để trống nếu không giới hạn số tiền giảm tối đa
            </Text>
          </View>
        )}

        {/* Đơn tối thiểu */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.label}>Đơn tối thiểu (VNĐ)</Text>
          <TextInput
            style={styles.input}
            value={form.minimum_pay}
            onChangeText={text => setForm({ ...form, minimum_pay: text })}
            keyboardType="numeric"
            placeholder="VD: 300000 (giá trị đơn hàng tối thiểu để áp dụng)"
          />
          <Text style={{ fontSize: 12, color: '#ea580c', marginTop: 4, fontStyle: 'italic' }}>
            💡 Khách hàng phải có đơn hàng từ giá trị này trở lên
          </Text>
        </View>

        {/* Ngày bắt đầu */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.label}>Thời gian bắt đầu</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => openDatePicker('start_date')}
          >
            <Text style={{ fontSize: 15, color: form.start_date ? '#222' : '#999' }}>
              {form.start_date || 'Chọn ngày...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ngày kết thúc */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.label}>Thời gian kết thúc</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => openDatePicker('end_date')}
          >
            <Text style={{ fontSize: 15, color: form.end_date ? '#222' : '#999' }}>
              {form.end_date || 'Chọn ngày...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trạng thái */}
        <View style={{ marginBottom: 10, position: 'relative' }}>
          <Text style={styles.label}>Trạng thái</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setStatusDropdownVisible(!statusDropdownVisible)}
          >
            <Text>{form.is_active ? 'Đang hoạt động' : 'Đã tắt'}</Text>
          </TouchableOpacity>
          {statusDropdownVisible && (
            <View style={styles.dropdownOverlay}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setForm({ ...form, is_active: true });
                  setStatusDropdownVisible(false);
                }}
              >
                <Text>Đang hoạt động</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setForm({ ...form, is_active: false });
                  setStatusDropdownVisible(false);
                }}
              >
                <Text>Đã tắt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* DateTimePicker */}
        {showDatePicker && (
          <>
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerOverlay}>
                <TouchableOpacity
                  style={styles.datePickerBackdrop}
                  activeOpacity={1}
                  onPress={() => {
                    if (tempDate) {
                      setForm({ 
                        ...form, 
                        [showDatePicker]: promotionsService.formatDateForDisplay(tempDate) 
                      });
                    }
                    setShowDatePicker(null);
                    setTempDate(null);
                  }}
                />
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, selected) => {
                      if (selected) setTempDate(selected);
                    }}
                  />
                </View>
              </View>
            )}
            {Platform.OS === 'android' && (
              <DateTimePicker
                value={tempDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selected) => {
                  if (event.type === 'set' && selected) {
                    setForm({ 
                      ...form, 
                      [showDatePicker]: promotionsService.formatDateForDisplay(selected) 
                    });
                  }
                  setShowDatePicker(null);
                }}
              />
            )}
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.5 }]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Lưu</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Hủy</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Sidebar */}
      {sidebarVisible && (
        <>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSidebarVisible(false)} />
          <View style={styles.sidebar}>
            <View style={styles.logoContainer}>
              <View style={styles.logoHeader}>
                <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeButton}>
                  <X width={24} height={24} stroke="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.logoBox}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoEmoji}>🍔</Text>
                </View>
                <Text style={styles.logoText}>BÁN HÀNG</Text>
              </View>
            </View>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  (navigation as any).navigate('DashboardScreen');
                }}
              >
                <Menu width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Trang chủ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  (navigation as any).reset({
                    index: 0,
                    routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
                  });
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Mua hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  (navigation as any).navigate('ManageMenuScreen');
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Quản lí món ăn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                  (navigation as any).navigate('NewOrderListScreen');
                }}
              >
                <ShoppingBag width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Quản lí đơn hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemActive]}
                onPress={() => setSidebarVisible(false)}
              >
                <Tag width={16} height={16} stroke="#fff" />
                <Text style={[styles.menuText, styles.menuTextActive]}>Quản lí khuyến mãi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: '#ea580c' }]}
                onPress={() => {
                  setSidebarVisible(false);
                }}
              >
                <Menu width={16} height={16} stroke="#fff7ed" />
                <Text style={styles.menuText}>Thống kê</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed' },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingTop: 50, 
    paddingBottom: 8, 
    backgroundColor: '#fff7ed',
    borderBottomWidth: 0 
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { fontSize: 20, color: '#1e293b', fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
  },
  label: { 
    fontSize: 14, 
    color: '#64748b', 
    fontWeight: '600', 
    marginBottom: 6 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 12, 
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  dropdown: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 12, 
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  dropdownOverlay: { 
    position: 'absolute', 
    top: '100%', 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    marginTop: 4,
    zIndex: 999, 
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  dropdownItem: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  actions: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 20,
    gap: 12
  },
  saveBtn: { 
    backgroundColor: '#ea580c', 
    padding: 14, 
    borderRadius: 12, 
    flex: 1,
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  cancelBtn: { 
    backgroundColor: '#64748b', 
    padding: 14, 
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  datePickerOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 1000, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  datePickerBackdrop: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  datePickerContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 12, 
    elevation: 6, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    minWidth: 320 
  },
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    zIndex: 1 
  },
  sidebar: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    bottom: 0, 
    width: 260, 
    backgroundColor: '#f5f2f0ff', 
    borderRightWidth: 0, 
    zIndex: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 2, height: 0 }, 
    shadowOpacity: 0.18, 
    shadowRadius: 10, 
    elevation: 10 
  },
  logoContainer: { 
    paddingTop: 24, 
    paddingBottom: 16, 
    borderBottomWidth: 0, 
    alignItems: 'center', 
    backgroundColor: '#ea580c', 
    height: 160
  },
  logoHeader: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    width: '100%', 
    paddingRight: 16 
  },
  closeButton: { 
    padding: 6, 
    backgroundColor: '#ea580c', 
    borderRadius: 16, 
    marginTop: 20
  },
  logoBox: { 
    alignItems: 'center', 
    marginTop: -30 
  },
  logoCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8, 
    shadowColor: '#ea580c', 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 4 
  },
  logoEmoji: { 
    fontSize: 32 
  },
  logoText: { 
    fontSize: 18, 
    color: '#fff', 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
  menuContainer: { 
    flex: 1, 
    paddingVertical: 16 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    marginHorizontal: 12, 
    borderRadius: 10, 
    marginBottom: 8 
  },
  menuItemActive: { 
    backgroundColor: '#fff', 
    borderWidth: 0 
  },
  menuText: { 
    marginLeft: 14, 
    fontSize: 15, 
    color: '#fff', 
    fontWeight: '500' 
  },
  menuTextActive: { 
    color: '#ea580c', 
    fontWeight: 'bold' 
  },
});

export default VoucherEditScreen;
