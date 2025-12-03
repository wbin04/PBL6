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
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { promotionsService, Promotion, CreatePromotionRequest } from '../../services/promotionsService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/Fonts';

const ORANGE = "#e95322";
const BORDER = "#e5e7eb";

const VoucherEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const promotion: Promotion | null = (route.params as any)?.promotion || null;

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

      const startDate = promotionsService.parseDisplayDate(form.start_date);
      const endDate = promotionsService.parseDisplayDate(form.end_date);

      if (!startDate || !endDate) {
        Alert.alert('Lỗi', 'Định dạng ngày không hợp lệ');
        return;
      }

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
        await promotionsService.updatePromotion(promotion.id, data);
        Alert.alert('Thành công', 'Đã cập nhật khuyến mãi');
      } else {
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={['top', 'bottom']}>
        {/* Header giống EditFoodScreen */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {promotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {/* Thông tin cơ bản */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Thông tin khuyến mãi</Text>

            {/* Tên khuyến mãi */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Tên khuyến mãi</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Giảm 20% cho đơn từ 300k"
                placeholderTextColor="#9ca3af"
                value={form.name}
                onChangeText={text => setForm({ ...form, name: text })}
              />
            </View>

            {/* Loại giảm giá */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Loại giảm giá</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setTypeDropdownVisible(!typeDropdownVisible)}
                activeOpacity={0.9}
              >
                <Text style={styles.dropdownText}>
                  {form.discount_type === 'PERCENT' ? '📊 Giảm theo phần trăm' : '💵 Giảm số tiền cố định'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Giá trị giảm */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>
                Giá trị giảm {form.discount_type === 'PERCENT' ? '(%)' : '(VND)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={form.discount_type === 'PERCENT' ? 'VD: 20' : 'VD: 50000'}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={form.discount_value}
                onChangeText={text => setForm({ ...form, discount_value: text })}
              />
              <Text style={styles.helperText}>
                {form.discount_type === 'PERCENT' 
                  ? '💡 Nhập giá trị từ 1-100 để giảm theo phần trăm'
                  : '💡 Nhập số tiền cụ thể muốn giảm (VND)'}
              </Text>
            </View>

            {/* Giảm tối đa (chỉ cho PERCENT) */}
            {form.discount_type === 'PERCENT' && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Giảm tối đa (VND) - Tùy chọn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 100000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={form.max_discount_amount}
                  onChangeText={text => setForm({ ...form, max_discount_amount: text })}
                />
                <Text style={styles.helperText}>
                  💡 Để trống nếu không giới hạn số tiền giảm tối đa
                </Text>
              </View>
            )}

            {/* Đơn tối thiểu */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Đơn tối thiểu (VND)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 300000"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={form.minimum_pay}
                onChangeText={text => setForm({ ...form, minimum_pay: text })}
              />
              <Text style={styles.helperText}>
                💡 Khách hàng phải có đơn hàng từ giá trị này trở lên
              </Text>
            </View>
          </View>

          {/* Thời gian áp dụng */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Thời gian áp dụng</Text>

            {/* Ngày bắt đầu */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Thời gian bắt đầu</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => openDatePicker('start_date')}
                activeOpacity={0.9}
              >
                <Text style={{ color: form.start_date ? '#111827' : '#9ca3af', fontSize: 14 }}>
                  {form.start_date || 'Chọn ngày bắt đầu...'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ngày kết thúc */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Thời gian kết thúc</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => openDatePicker('end_date')}
                activeOpacity={0.9}
              >
                <Text style={{ color: form.end_date ? '#111827' : '#9ca3af', fontSize: 14 }}>
                  {form.end_date || 'Chọn ngày kết thúc...'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trạng thái */}
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Trạng thái</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setStatusDropdownVisible(!statusDropdownVisible)}
                activeOpacity={0.9}
              >
                <Text style={styles.dropdownText}>
                  {form.is_active ? '🟢 Đang hoạt động' : '🔴 Đã tắt'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom bar giống EditFoodScreen */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.cancelBtn, loading && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Lưu khuyến mãi</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal Loại giảm giá */}
        <Modal
          visible={typeDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTypeDropdownVisible(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.backdrop}
              onPress={() => setTypeDropdownVisible(false)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn loại giảm giá</Text>
                <TouchableOpacity
                  onPress={() => setTypeDropdownVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 18, color: "#6B7280" }}>×</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setForm({ ...form, discount_type: 'PERCENT' });
                  setTypeDropdownVisible(false);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.optionTitle}>📊 Giảm theo phần trăm</Text>
                <Text style={styles.optionDesc}>Giảm theo % giá trị đơn hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setForm({ ...form, discount_type: 'AMOUNT' });
                  setTypeDropdownVisible(false);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.optionTitle}>💵 Giảm số tiền cố định</Text>
                <Text style={styles.optionDesc}>Giảm một khoản tiền cụ thể</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Trạng thái */}
        <Modal
          visible={statusDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setStatusDropdownVisible(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.backdrop}
              onPress={() => setStatusDropdownVisible(false)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn trạng thái</Text>
                <TouchableOpacity
                  onPress={() => setStatusDropdownVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 18, color: "#6B7280" }}>×</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setForm({ ...form, is_active: true });
                  setStatusDropdownVisible(false);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.optionTitle}>🟢 Đang hoạt động</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setForm({ ...form, is_active: false });
                  setStatusDropdownVisible(false);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.optionTitle}>🔴 Đã tắt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* DateTimePicker giữ nguyên logic */}
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
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 18,
    color: "#111827",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionLabel: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
  },
  label: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  helperText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
    color: "#111827",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
    padding: 12,
    paddingBottom: 40,
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#6b7280",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
  },

  // Modal giống EditFoodScreen
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 16,
    color: "#111827",
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  optionTitle: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: "#111827",
    marginBottom: 2,
  },
  optionDesc: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: "#6b7280",
  },

  // DateTimePicker
  datePickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: 320,
  },
});

export default VoucherEditScreen;
