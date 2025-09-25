import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: 'active' | 'locked';
};

type RootStackParamList = {
  CustomerListScreen: undefined;
  UpdateCustomerScreen: {
    customer: Customer;
    onUpdate: (updated: Customer) => void;
  };
};

const initialCustomers: Customer[] = [
  { id: 'KH001', name: 'Nguyễn Văn A', phone: '0901234567', email: 'a@gmail.com', role: 'Khách hàng', status: 'active' },
  { id: 'KH002', name: 'Trần Thị B', phone: '0902345678', email: 'b@gmail.com', role: 'Khách hàng', status: 'active' },
  { id: 'KH003', name: 'Lê Minh C', phone: '0903456789', email: 'c@gmail.com', role: 'Khách hàng', status: 'active' },
];

export default function CustomerListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [lockedIds, setLockedIds] = useState<string[]>([]);

  const startEdit = (customer: Customer) => {
    setEditId(customer.id);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditEmail(customer.email);
  };

  const saveEdit = () => {
    if (!editId) return;
    setCustomers(prev =>
      prev.map(c => (c.id === editId ? { ...c, name: editName, phone: editPhone, email: editEmail } : c))
    );
    setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  const lockAccount = (id: string) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, status: 'locked' } : c)));
  };

  const unlockAccount = (id: string) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, status: 'active' } : c)));
  };

  const setRole = (id: string, role: string) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, role } : c)));
  };

  const handleUpdate = (customer: Customer) => {
    navigation.navigate('UpdateCustomerScreen', {
      customer,
      onUpdate: (updated: Customer) => {
        setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Danh sách khách hàng</Text>
        <ScrollView style={styles.scrollView}>
          {customers.map(c => (
            <View key={c.id} style={styles.card}>
              {editId === c.id ? (
                <View>
                  <Text style={styles.editLabel}>Cập nhật thông tin</Text>
                  <Text>Tên:</Text>
                  <TextInput value={editName} onChangeText={setEditName} style={styles.input} />
                  <Text>SĐT:</Text>
                  <TextInput value={editPhone} onChangeText={setEditPhone} style={styles.input} />
                  <Text>Email:</Text>
                  <TextInput value={editEmail} onChangeText={setEditEmail} style={styles.input} />
                  <View style={styles.buttonRow}>
                    <TouchableOpacity onPress={saveEdit} style={styles.saveButton}>
                      <Text style={styles.buttonText}>Lưu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelEdit} style={styles.cancelButton}>
                      <Text style={styles.buttonText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text>SĐT: {c.phone}</Text>
                  <Text>Email: {c.email}</Text>
                  <Text>
                    Quyền: <Text style={styles.role}>{c.role}</Text>
                  </Text>
                  <Text>
                    Tình trạng:{' '}
                    <Text style={c.status === 'locked' ? styles.locked : styles.active}>
                      {c.status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
                    </Text>
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity onPress={() => handleUpdate(c)} style={styles.updateButton}>
                      <Text style={styles.buttonText}>Cập nhật</Text>
                    </TouchableOpacity>
                    {c.status === 'locked' ? (
                      <TouchableOpacity onPress={() => unlockAccount(c.id)} style={styles.lockButton}>
                        <Text style={styles.buttonText}>Mở tài khoản</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => lockAccount(c.id)} style={styles.lockButton}>
                        <Text style={styles.buttonText}>Khóa tài khoản</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff7ed', paddingTop: 12 },
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  scrollView: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontWeight: 'bold', fontSize: 16 },
  role: { color: '#ea580c', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  updateButton: { backgroundColor: '#10b981', padding: 8, borderRadius: 6, left: 80 },
  saveButton: { backgroundColor: '#10b981', padding: 8, borderRadius: 6},
  cancelButton: { backgroundColor: '#ef4444', padding: 8, borderRadius: 6 },
  buttonText: { color: '#fff' },
  editLabel: { fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 6, marginBottom: 4 },
  lockButton: { backgroundColor: '#ea580c', padding: 8, borderRadius: 6, right: -100 },
  disabledButton: { backgroundColor: '#d1d5db' },
  ownerButton: { backgroundColor: '#10b981', padding: 8, borderRadius: 6 },
  shipperButton: { backgroundColor: '#3b82f6', padding: 8, borderRadius: 6 },
  active: { color: '#10b981', fontWeight: 'bold' },
  locked: { color: '#ef4444', fontWeight: 'bold' },
});
