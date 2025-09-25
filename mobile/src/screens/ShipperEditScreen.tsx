
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { shipperApi } from '../services/api';

interface Shipper {
  id: number;
  user_id: number;
  fullname: string;
  phone: string;
  email: string;
  address: string;
  role: string;
  user?: {
    id: number;
    fullname: string;
    phone_number: string;
    email: string;
    address: string;
  };
}

const ShipperEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const shipper: Shipper = (route.params as any)?.shipper;
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullname: shipper?.fullname || '',
    phone: shipper?.phone || '',
    email: shipper?.email || '',
    address: shipper?.address || '',
  });

  const handleSave = async () => {
    if (!form.fullname.trim() || !form.phone.trim() || !form.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      Alert.alert('Lỗi', 'Email không đúng định dạng');
      return;
    }

    // Validate phone format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.phone.replace(/\s/g, ''))) {
      Alert.alert('Lỗi', 'Số điện thoại phải có 10 chữ số');
      return;
    }

    try {
      setLoading(true);
      
      // Update shipper via API
      await shipperApi.updateShipper(shipper.id, {
        fullname: form.fullname.trim(),
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim(),
        address: form.address.trim(),
      });

      Alert.alert('Thành công', 'Cập nhật thông tin shipper thành công', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error updating shipper:', error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật thông tin shipper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chỉnh sửa thông tin shipper</Text>
      
      <Text style={styles.label}>Họ và tên *</Text>
      <TextInput
        style={styles.input}
        value={form.fullname}
        onChangeText={fullname => setForm({ ...form, fullname })}
        placeholder="Nhập họ và tên"
      />
      
      <Text style={styles.label}>Số điện thoại *</Text>
      <TextInput
        style={styles.input}
        value={form.phone}
        keyboardType="phone-pad"
        onChangeText={phone => setForm({ ...form, phone })}
        placeholder="Nhập số điện thoại"
        maxLength={10}
      />
      
      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        value={form.email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={email => setForm({ ...form, email })}
        placeholder="Nhập email"
      />
      
      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.address}
        onChangeText={address => setForm({ ...form, address })}
        placeholder="Nhập địa chỉ"
        multiline
        numberOfLines={3}
      />
      
      <TouchableOpacity 
        style={[styles.saveBtn, loading && styles.disabledBtn]} 
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Lưu</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ea580c', marginBottom: 24, marginTop: 30, textAlign: 'center' },
  label: { fontSize: 14, color: '#ea580c', fontWeight: 'bold', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ea580c', borderRadius: 10, padding: 10, backgroundColor: '#fff', marginBottom: 4 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 12, marginTop: 24, width: 70, alignSelf: 'center', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ShipperEditScreen;
