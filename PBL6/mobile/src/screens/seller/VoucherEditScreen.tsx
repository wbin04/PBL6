import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useVoucher } from '../../contexts/VoucherContext';
const { v4: uuidv4 } = require('uuid');

interface Voucher {
  id: string;
  ten: string;
  ma: string;
  loai: 'Phần trăm' | 'Cố định';
  giaTri: string;
  batDau: string;
  ketThuc: string;
  trangThai: 'Đang hoạt động' | 'Chưa kích hoạt' | 'Đã dùng hết';
  daSuDung: number;
  tong: number;
  phanTram: number;
  donToiThieu: string;
  moTa: string;
}

const availableStatus: Voucher['trangThai'][] = [
  'Đang hoạt động',
  'Chưa kích hoạt',
  'Đã dùng hết',
];

const parseDate = (str: string): Date | null => {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  return new Date(
    parseInt(parts[2], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[0], 10),
  );
};

const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const VoucherEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const voucher: Voucher | null = (route.params as any)?.voucher || null;
  const { addVoucher, editVoucher } = useVoucher();

  const [form, setForm] = useState<Omit<Voucher, 'id' | 'daSuDung' | 'phanTram'>>({
    ten: voucher?.ten || '',
    ma: voucher?.ma || '',
    loai: voucher?.loai || 'Phần trăm',
    giaTri: voucher?.giaTri || '',
    batDau: voucher?.batDau || '',
    ketThuc: voucher?.ketThuc || '',
    trangThai: voucher?.trangThai || 'Chưa kích hoạt',
    tong: voucher?.tong || 0,
    donToiThieu: voucher?.donToiThieu || '',
    moTa: voucher?.moTa || '',
  });

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'batDau' | 'ketThuc' | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const handleSave = () => {
    let newId = voucher ? voucher.id : uuidv4();
    // Nếu đang thêm mới, đảm bảo id chưa tồn tại
    const updatedVoucher: Voucher = {
      ...form,
      id: newId,
      daSuDung: voucher?.daSuDung || 0,
      phanTram: voucher?.phanTram || 0,
    };
    if (voucher) {
      editVoucher(updatedVoucher);
    } else {
      addVoucher(updatedVoucher);
    }
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const openDatePicker = (field: 'batDau' | 'ketThuc') => {
    setTempDate(form[field] ? parseDate(form[field]) || new Date() : new Date());
    setShowDatePicker(field);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{voucher ? 'Sửa khuyến mãi test' : 'Thêm khuyến mãi'}</Text>

        {/* Form fields */}
        {[
          { key: 'ten', label: 'Tên khuyến mãi' },
          { key: 'ma', label: 'Mã khuyến mãi' },
          { key: 'giaTri', label: 'Giá trị' },
          { key: 'batDau', label: 'Thời gian bắt đầu', isDate: true },
          { key: 'ketThuc', label: 'Thời gian kết thúc', isDate: true },
          { key: 'tong', label: 'Tổng số lượng' },
          { key: 'moTa', label: 'Mô tả' },
        ].map((f, i) => (
          <View key={i} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 14, color: '#ea580c', fontWeight: 'bold', marginBottom: 4 }}>
              {f.label}
            </Text>
            {f.isDate ? (
              <TouchableOpacity
                style={styles.input}
                onPress={() => openDatePicker(f.key as 'batDau' | 'ketThuc')}
              >
                <Text style={{ fontSize: 15, color: '#222' }}>
                  {(form as any)[f.key] || 'Chọn ngày...'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                value={((form as any)[f.key] ?? '').toString()}
                onChangeText={text =>
                  setForm({ ...form, [f.key]: f.key === 'tong' ? Number(text) : text })
                }
                keyboardType={f.key === 'tong' ? 'numeric' : 'default'}
              />
            )}
          </View>
        ))}

        {/* Dropdown trạng thái */}
        <View style={{ marginBottom: 10, position: 'relative' }}>
          <Text style={{ fontSize: 14, color: '#ea580c', fontWeight: 'bold', marginBottom: 4 }}>
            Trạng thái
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <Text>{form.trangThai}</Text>
          </TouchableOpacity>
          {dropdownVisible && (
            <View style={styles.dropdownOverlay}>
              {availableStatus
                .filter(status => status !== form.trangThai)
                .map(status => (
                  <TouchableOpacity
                    key={status}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setForm({ ...form, trangThai: status });
                      setDropdownVisible(false);
                    }}
                  >
                    <Text>{status}</Text>
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
                      setForm({ ...form, [showDatePicker]: formatDate(tempDate) });
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
                    setForm({ ...form, [showDatePicker]: formatDate(selected) });
                  }
                  setShowDatePicker(null);
                }}
              />
            )}
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Hủy test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ea580c', marginBottom: 12, textAlign: 'center', marginTop: 50 },
  input: { borderWidth: 1, borderColor: '#ea580c', borderRadius: 10, padding: 10, backgroundColor: '#fff7ed' },
  dropdown: { borderWidth: 1, borderColor: '#ea580c', borderRadius: 10, padding: 10, backgroundColor: '#fff7ed' },
  dropdownOverlay: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ea580c', zIndex: 999, elevation: 5 },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderColor: '#f3f3f3' },
  actions: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  saveBtn: { backgroundColor: '#f59e0b', padding: 12, borderRadius: 12, marginRight: 8 },
  cancelBtn: { backgroundColor: '#ea580c', padding: 12, borderRadius: 12 },
  datePickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
  datePickerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  datePickerContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, minWidth: 320 },
});

export default VoucherEditScreen;
