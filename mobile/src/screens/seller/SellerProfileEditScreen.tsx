import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';

const initialProfile = {
  name: 'Nguyễn Văn Seller',
  email: 'seller@example.com',
  phone: '0901234567',
  address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
  description: 'Chuyên phục vụ các món ăn Việt Nam truyền thống với hương vị đậm đà, nguyên liệu tươi ngon.',
  storeName: 'Quán Phở Hà Nội',
  storeAddress: '123 Nguyễn Huệ, Quận 1, TP.HCM',
};

const SellerProfileEditScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState(initialProfile);

  const handleChange = (field: string, value: string) => {
    setProfile({ ...profile, [field]: value });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={28} color="#222" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Personal Info */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <Text style={styles.inputLabel}>Họ và tên *</Text>
          <TextInput style={styles.input} value={profile.name} onChangeText={v => handleChange('name', v)} />
          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput style={styles.input} value={profile.email} onChangeText={v => handleChange('email', v)} keyboardType="email-address" />
          <Text style={styles.inputLabel}>Số điện thoại</Text>
          <TextInput style={styles.input} value={profile.phone} onChangeText={v => handleChange('phone', v)} keyboardType="phone-pad" />
          <Text style={styles.inputLabel}>Địa chỉ</Text>
          <TextInput style={styles.input} value={profile.address} onChangeText={v => handleChange('address', v)} />
          <Text style={styles.inputLabel}>Mô tả bản thân</Text>
          <TextInput style={[styles.input, { height: 60 }]} value={profile.description} onChangeText={v => handleChange('description', v)} multiline />
        </View>
        {/* Store Info */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cửa hàng</Text>
          <Text style={styles.inputLabel}>Tên cửa hàng</Text>
          <TextInput style={styles.input} value={profile.storeName} onChangeText={v => handleChange('storeName', v)} />
          <Text style={styles.inputLabel}>Địa chỉ cửa hàng</Text>
          <TextInput style={styles.input} value={profile.storeAddress} onChangeText={v => handleChange('storeAddress', v)} />
        </View>
        {/* Save Button */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.saveBtnText}>Lưu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff7ed', borderBottomWidth: 0, marginTop: 30 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  closeBtn: { padding: 6 },
  sectionBox: { backgroundColor: '#fff7ed', borderRadius: 12, marginHorizontal: 18, marginTop: 18, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 },
  inputLabel: { fontSize: 13, color: '#888', marginTop: 10 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#222', marginTop: 4 },
  saveBtn: { backgroundColor: '#ea580c', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, shadowColor: '#ea580c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});

export default SellerProfileEditScreen;
