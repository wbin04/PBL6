
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useShipper } from '../context/ShipperContext';

interface Shipper {
  id: string;
  name: string;
  phone: string;
  group: string;
}

const ShipperEditScreen: React.FC = () => {

  const navigation = useNavigation();
  const route = useRoute();
  const shipper: Shipper = (route.params as any)?.shipper;
  const { updateShipper } = useShipper();

  const [form, setForm] = useState({
    name: shipper?.name || '',
    phone: shipper?.phone || '',
    group: shipper?.group || '',
  });


  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.group.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    updateShipper({ ...shipper, ...form });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chỉnh sửa thông tin shipper</Text>
      <Text style={styles.label}>Tên</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={name => setForm({ ...form, name })}
      />
      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        value={form.phone}
        keyboardType="phone-pad"
        onChangeText={phone => setForm({ ...form, phone })}
      />
      <Text style={styles.label}>Nhóm</Text>
      <TextInput
        style={styles.input}
        value={form.group}
        onChangeText={group => setForm({ ...form, group })}
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Lưu</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ea580c', marginBottom: 24, marginTop: 30, textAlign: 'center' },
  label: { fontSize: 14, color: '#ea580c', fontWeight: 'bold', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ea580c', borderRadius: 10, padding: 10, backgroundColor: '#fff', marginBottom: 4 },
  saveBtn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 12, marginTop: 24, width: 70, alignSelf: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ShipperEditScreen;
