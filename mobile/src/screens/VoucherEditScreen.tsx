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
import { ArrowLeft } from 'lucide-react-native';
import { promotionsService, Promotion } from '../services/promotionsService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/Fonts';

const VoucherEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { promotion, isAdmin }: { promotion: Promotion | null; isAdmin: boolean } = (route.params as any) || { promotion: null, isAdmin: false };

  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState(promotion?.name || '');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>(promotion?.discount_type || 'PERCENT');
  const [discountValue, setDiscountValue] = useState(promotion?.discount_value?.toString() || '');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(promotion?.max_discount_amount?.toString() || '');
  const [minimumPay, setMinimumPay] = useState(promotion?.minimum_pay?.toString() || '');
  const [startDate, setStartDate] = useState(promotion ? new Date(promotion.start_date) : new Date());
  const [endDate, setEndDate] = useState(promotion ? new Date(promotion.end_date) : new Date());
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true);

  const [showDiscountTypeDropdown, setShowDiscountTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  // Format date for display
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Validate form
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên khuyến mãi');
      return false;
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      Alert.alert('Lỗi', 'Giá trị giảm giá phải lớn hơn 0');
      return false;
    }
    if (discountType === 'PERCENT' && parseFloat(discountValue) > 100) {
      Alert.alert('Lỗi', 'Giá trị phần trăm không được vượt quá 100');
      return false;
    }
    if (!minimumPay || parseFloat(minimumPay) < 0) {
      Alert.alert('Lỗi', 'Đơn tối thiểu không hợp lệ');
      return false;
    }
    if (startDate >= endDate) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const data = {
        name: name.trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        minimum_pay: parseFloat(minimumPay),
        max_discount_amount: discountType === 'PERCENT' && maxDiscountAmount 
          ? parseFloat(maxDiscountAmount) 
          : null,
        is_active: isActive,
      };

      if (promotion) {
        // Update existing promotion
        if (isAdmin) {
          await promotionsService.updateAdminPromotion(promotion.id, data);
        } else {
          await promotionsService.updatePromotion(promotion.id, data);
        }
        Alert.alert('Thành công', 'Cập nhật khuyến mãi thành công');
      } else {
        // Create new promotion
        if (isAdmin) {
          await promotionsService.createAdminPromotion(data);
        } else {
          await promotionsService.createPromotion(data);
        }
        Alert.alert('Thành công', 'Tạo khuyến mãi thành công');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      Alert.alert('Lỗi', error.message || 'Không thể lưu khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => navigation.goBack();

  const openDatePicker = (field: 'start' | 'end') => {
    setTempDate(field === 'start' ? startDate : endDate);
    setShowDatePicker(field);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.roundIconBtn}
            activeOpacity={0.8}
          >
            <ArrowLeft size={18} color="#eb5523" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {promotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
          </Text>

          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên khuyến mãi</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên khuyến mãi..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Discount Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Loại giảm giá</Text>
          <Text style={styles.hint}>
            💡 PERCENT: Giảm theo %, AMOUNT: Giảm số tiền cố định
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() =>
              setShowDiscountTypeDropdown(!showDiscountTypeDropdown)
            }
            activeOpacity={0.9}
          >
            <Text style={styles.dropdownText}>
              {discountType === 'PERCENT'
                ? 'PERCENT - Giảm theo phần trăm'
                : 'AMOUNT - Giảm số tiền cố định'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showDiscountTypeDropdown && (
            <View style={styles.dropdownOverlay}>
              {['PERCENT', 'AMOUNT'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setDiscountType(type as 'PERCENT' | 'AMOUNT');
                    setShowDiscountTypeDropdown(false);
                    if (type === 'AMOUNT') {
                      setMaxDiscountAmount(''); // Clear max discount for AMOUNT type
                    }
                  }}
                >
                  <Text style={styles.dropdownItemText}>
                    {type === 'PERCENT'
                      ? 'PERCENT - Giảm theo phần trăm'
                      : 'AMOUNT - Giảm số tiền cố định'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Discount Value */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Giá trị giảm {discountType === 'PERCENT' ? '(%)' : '(VNĐ)'}
          </Text>
          <Text style={styles.hint}>
            💡 {discountType === 'PERCENT' 
              ? 'Nhập % giảm giá (ví dụ: 10 cho 10%)'
              : 'Nhập số tiền giảm cố định (ví dụ: 50000 cho 50,000đ)'}
          </Text>
          <TextInput
            style={styles.input}
            value={discountValue}
            onChangeText={setDiscountValue}
            placeholder={discountType === 'PERCENT' ? 'Ví dụ: 10' : 'Ví dụ: 50000'}
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>

        {/* Max Discount Amount (only for PERCENT) */}
        {discountType === 'PERCENT' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giảm tối đa (VNĐ) - Tùy chọn</Text>
            <Text style={styles.hint}>
              💡 Giới hạn số tiền giảm tối đa. Để trống nếu không giới hạn
            </Text>
            <TextInput
              style={styles.input}
              value={maxDiscountAmount}
              onChangeText={setMaxDiscountAmount}
              placeholder="Ví dụ: 100000"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Minimum Pay */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Đơn hàng tối thiểu (VNĐ)</Text>
          <Text style={styles.hint}>
            💡 Giá trị đơn hàng tối thiểu để áp dụng khuyến mãi
          </Text>
          <TextInput
            style={styles.input}
            value={minimumPay}
            onChangeText={setMinimumPay}
            placeholder="Ví dụ: 100000"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
        </View>

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày bắt đầu</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => openDatePicker('start')}
            activeOpacity={0.9}
          >
            <Text style={styles.inputText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày kết thúc</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => openDatePicker('end')}
            activeOpacity={0.9}
          >
            <Text style={styles.inputText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trạng thái</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            activeOpacity={0.9}
          >
            <Text style={styles.dropdownText}>
              {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showStatusDropdown && (
            <View style={styles.dropdownOverlay}>
              {[
                { value: true, label: 'Đang hoạt động' },
                { value: false, label: 'Không hoạt động' },
              ]
                .filter((s) => s.value !== isActive)
                .map((status) => (
                  <TouchableOpacity
                    key={status.label}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIsActive(status.value);
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{status.label}</Text>
                  </TouchableOpacity>
                ))}
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
                      if (showDatePicker === 'start') {
                        setStartDate(tempDate);
                      } else {
                        setEndDate(tempDate);
                      }
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
                    if (showDatePicker === 'start') {
                      setStartDate(selected);
                    } else {
                      setEndDate(selected);
                    }
                  }
                  setShowDatePicker(null);
                }}
              />
            )}
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {loading ? (
            <ActivityIndicator size="large" color="#eb552d" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.9}
              >
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                activeOpacity={0.9}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // Header giống phong cách VoucherManagementScreen
  headerWrap: {
    backgroundColor: '#f5cb58',
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  roundIconBtn: {
    backgroundColor: '#ffffff',
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
    paddingLeft: 8,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontStyle: 'italic',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  inputText: {
    fontSize: 15,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    color: '#111827',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 999,
    elevation: 5,
    marginTop: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Fonts.LeagueSpartanRegular,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },

  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: 320,
  },
});

export default VoucherEditScreen;
