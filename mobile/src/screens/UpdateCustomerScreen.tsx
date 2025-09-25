import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function UpdateCustomerScreen({ route, navigation }: any) {
  const nav = useNavigation();
  const customer = route?.params?.customer || {
    id: '',
    name: '',
    phone: '',
    email: '',
    role: 'Khách hàng',
  };
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [role, setRole] = useState(customer.role);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const allRoles = ['Khách hàng', 'Chủ cửa hàng', 'Shipper'];
  const availableRoles = allRoles.filter(r => r !== role);

  const handleSave = () => {
    navigation.goBack();
    if (route.params?.onUpdate) {
      route.params.onUpdate({ ...customer, name, phone, email, role });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f5cb58" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cập nhật tài khoản</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Nhập email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldContainer}>
  <Text style={styles.fieldLabel}>Quyền</Text>
  <TouchableOpacity
    style={styles.dropdown}
    onPress={() => setDropdownVisible(!dropdownVisible)}
  >
    <Text>{role}</Text>
  </TouchableOpacity>
  {dropdownVisible && (
    <View style={styles.dropdownOverlay}>
      {availableRoles.map(r => (
        <TouchableOpacity
          key={r}
          style={styles.dropdownItem}
          onPress={() => {
            setRole(r);
            setDropdownVisible(false);
          }}
        >
          <Text>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.cancelButton}>
              <Text style={styles.saveButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 32 },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  formContainer: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  fieldContainer: { marginBottom: 24 },
  fieldLabel: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '600' },
  textInput: {
    backgroundColor: '#f5cb58',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    opacity: 0.8,
  },
  dropdown: {
    backgroundColor: '#f5cb58',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginTop: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOverlay: {
  position: "absolute",
  top: 80, // chỉnh cho khớp vị trí ngay dưới ô dropdown
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 12,
  zIndex: 1000, // nằm đè
  elevation: 5, // Android shadow
},

  cancelButton: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
