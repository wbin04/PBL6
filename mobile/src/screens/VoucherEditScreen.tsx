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
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <TouchableOpacity onPress={handleCancel} style={{ padding: 4 }}>
          <ArrowLeft color="#ea580c" size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {promotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
          {isAdmin && ' (Toàn hệ thống)'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
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
            onPress={() => setShowDiscountTypeDropdown(!showDiscountTypeDropdown)}
          >
            <Text style={{ color: '#1f2937' }}>
              {discountType === 'PERCENT' ? 'PERCENT - Giảm theo phần trăm' : 'AMOUNT - Giảm số tiền cố định'}
            </Text>
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
                  <Text>
                    {type === 'PERCENT' ? 'PERCENT - Giảm theo phần trăm' : 'AMOUNT - Giảm số tiền cố định'}
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
          >
            <Text style={{ fontSize: 15, color: '#222' }}>
              {formatDate(startDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ngày kết thúc</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => openDatePicker('end')}
          >
            <Text style={{ fontSize: 15, color: '#222' }}>
              {formatDate(endDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Trạng thái</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Text style={{ color: '#1f2937' }}>
              {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
            </Text>
          </TouchableOpacity>
          {showStatusDropdown && (
            <View style={styles.dropdownOverlay}>
              {[
                { value: true, label: 'Đang hoạt động' },
                { value: false, label: 'Không hoạt động' }
              ].filter(s => s.value !== isActive).map((status) => (
                <TouchableOpacity
                  key={status.label}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setIsActive(status.value);
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text>{status.label}</Text>
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
            <ActivityIndicator size="large" color="#ea580c" />
          ) : (
            <>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Hủy</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 20 },
  headerBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingBottom: 10, 
    borderBottomWidth: 1, 
    borderColor: '#f59e0b',
    marginTop: 20,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#ea580c', 
    marginLeft: 10,
    flex: 1,
  },
  inputGroup: { 
    marginBottom: 16,
  },
  label: { 
    fontSize: 14, 
    color: '#ea580c', 
    fontWeight: 'bold', 
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ea580c', 
    borderRadius: 10, 
    padding: 12, 
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#222',
  },
  dropdown: { 
    borderWidth: 1, 
    borderColor: '#ea580c', 
    borderRadius: 10, 
    padding: 12, 
    backgroundColor: '#fff',
  },
  dropdownOverlay: { 
    position: 'absolute', 
    top: '100%', 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ea580c', 
    zIndex: 999, 
    elevation: 5,
    marginTop: 4,
  },
  dropdownItem: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderColor: '#f3f3f3',
  },
  actions: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 20,
    marginBottom: 20,
    gap: 10,
  },
  saveBtn: { 
    backgroundColor: '#f59e0b', 
    padding: 14, 
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelBtn: { 
    backgroundColor: '#ea580c', 
    padding: 14, 
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
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
    backgroundColor: '#fff', 
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
