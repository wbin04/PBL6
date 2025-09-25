import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/services/api';

type Customer = {
  id: number;
  fullname: string;
  phone_number: string;
  email: string;
  role: string;
  is_active: boolean;
  username: string;
  address: string;
  created_date: string;
};

type RootStackParamList = {
  CustomerListScreen: undefined;
  UpdateCustomerScreen: {
    customer: Customer;
    onUpdate: (updated: Customer) => void;
  };
};

const initialCustomers: Customer[] = [];

export default function CustomerListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      console.log('Fetching customers...');
      
      const response: any = await apiClient.get('/auth/admin/customers/', {
        params: searchText ? { search: searchText } : {}
      });
      
      console.log('Full API Response:', response);
      
      // Kiểm tra xem response có phải là data trực tiếp không
      let data = response.data || response;
      console.log('Actual data:', data);
      
      // Xử lý dữ liệu trả về dựa trên cấu trúc thực tế
      if (data) {
        console.log('Processing data...');
        
        // Kiểm tra nhiều cấu trúc có thể
        if (Array.isArray(data)) {
          // Nếu data là array
          console.log('Data is array, setting customers');
          setCustomers(data);
        } else if (data.customers && Array.isArray(data.customers)) {
          // Nếu có customers field và là array
          console.log('Data has customers array, setting customers');
          setCustomers(data.customers);
        } else if (data.results && Array.isArray(data.results)) {
          // Nếu có results field (pagination)
          console.log('Data has results array, setting customers');
          setCustomers(data.results);
        } else {
          // Nếu không có cấu trúc mong đợi, log và hiển thị lỗi
          console.error('Unexpected API response structure:', data);
          setCustomers([]);
          Alert.alert('Lưu ý', 'Dữ liệu có cấu trúc không như mong đợi');
        }
      } else {
        console.error('Empty API response or missing data');
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Không thể tải danh sách khách hàng';
      if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Không có quyền truy cập.';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Search customers
  const handleSearch = () => {
    fetchCustomers();
  };

  const startEdit = (customer: Customer) => {
    setEditId(customer.id);
    setEditName(customer.fullname);
    setEditPhone(customer.phone_number);
    setEditEmail(customer.email);
    setEditAddress(customer.address || '');
  };

  const saveEdit = async () => {
    if (!editId) return;
    
    // Validate input
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Tên không được để trống');
      return;
    }
    
    if (!editPhone.trim()) {
      Alert.alert('Lỗi', 'Số điện thoại không được để trống');
      return;
    }
    
    try {
      setLoading(true);
      const response: any = await apiClient.put(`/auth/admin/customers/${editId}/`, {
        fullname: editName.trim(),
        phone_number: editPhone.trim(),
        address: editAddress.trim()
      });
      
      // Update customer in local state
      setCustomers(prev =>
        prev.map(c => (c.id === editId ? { ...c, ...response.data } : c))
      );
      
      setEditId(null);
      setEditName('');
      setEditPhone('');
      setEditEmail('');
      setEditAddress('');
      
      Alert.alert('Thành công', 'Cập nhật thông tin khách hàng thành công');
    } catch (error: any) {
      console.error('Error updating customer:', error);
      
      let errorMessage = 'Không thể cập nhật thông tin khách hàng';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditPhone('');
    setEditEmail('');
    setEditAddress('');
  };

  const toggleCustomerStatus = async (customerId: number) => {
    try {
      setLoading(true);
      const response: any = await apiClient.post(`/auth/admin/customers/${customerId}/toggle-status/`);
      
      console.log('Toggle status response:', response); // Debug log
      
      // Update customer in local state - handle different response structures
      if (response && response.data && response.data.customer) {
        // Server returns updated customer object
        setCustomers(prev =>
          prev.map(c => (c.id === customerId ? response.data.customer : c))
        );
      } else if (response && response.data) {
        // Server might return customer data directly or just success message
        // Try to find customer in response.data or toggle locally
        if (response.data.id === customerId) {
          // response.data is the customer object
          setCustomers(prev =>
            prev.map(c => (c.id === customerId ? response.data : c))
          );
        } else {
          // Fallback: toggle is_active locally
          setCustomers(prev =>
            prev.map(c => (c.id === customerId ? { ...c, is_active: !c.is_active } : c))
          );
        }
      } else {
        // No useful response data, toggle locally
        setCustomers(prev =>
          prev.map(c => (c.id === customerId ? { ...c, is_active: !c.is_active } : c))
        );
      }
      
      const message = response?.data?.message || 'Đã thay đổi trạng thái khách hàng thành công';
      Alert.alert('Thành công', message);
    } catch (error: any) {
      console.error('Error toggling customer status:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Không thể thay đổi trạng thái khách hàng';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Danh sách khách hàng</Text>
        
        {/* Search Box */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên, SĐT, email..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton} disabled={loading}>
            <Text style={styles.buttonText}>Tìm</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text>Đang tải...</Text>
          </View>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {customers.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có khách hàng nào</Text>
            </View>
          ) : (
            customers.map(c => (
              <View key={c.id} style={styles.card}>
                {editId === c.id ? (
                  <View>
                    <Text style={styles.editLabel}>Cập nhật thông tin</Text>
                    <Text style={styles.inputLabel}>Tên:</Text>
                    <TextInput 
                      value={editName} 
                      onChangeText={setEditName} 
                      style={styles.input}
                      placeholder="Nhập tên khách hàng"
                    />
                    <Text style={styles.inputLabel}>SĐT:</Text>
                    <TextInput 
                      value={editPhone} 
                      onChangeText={setEditPhone} 
                      style={styles.input}
                      placeholder="Nhập số điện thoại"
                      keyboardType="phone-pad"
                    />
                    <Text style={styles.inputLabel}>Địa chỉ:</Text>
                    <TextInput 
                      value={editAddress} 
                      onChangeText={setEditAddress} 
                      style={styles.input}
                      placeholder="Nhập địa chỉ"
                      multiline
                    />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity 
                        onPress={saveEdit} 
                        style={[styles.saveButton, loading && styles.disabledButton]} 
                        disabled={loading}
                      >
                        <Text style={styles.buttonText}>{loading ? 'Đang lưu...' : 'Lưu'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={cancelEdit} 
                        style={styles.cancelButton}
                        disabled={loading}
                      >
                        <Text style={styles.buttonText}>Hủy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.name}>{c.fullname}</Text>
                    <Text style={styles.info}>SĐT: {c.phone_number}</Text>
                    <Text style={styles.info}>Email: {c.email}</Text>
                    <Text style={styles.info}>Địa chỉ: {c.address || 'Chưa cập nhật'}</Text>
                    <Text style={styles.info}>
                      Quyền: <Text style={styles.role}>{c.role || 'Khách hàng'}</Text>
                    </Text>
                    <Text style={styles.info}>
                      Tình trạng:{' '}
                      <Text style={c.is_active ? styles.active : styles.locked}>
                        {c.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </Text>
                    </Text>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity 
                        onPress={() => startEdit(c)} 
                        style={[styles.updateButton, loading && styles.disabledButton]}
                        disabled={loading}
                      >
                        <Text style={styles.buttonText}>Cập nhật</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => toggleCustomerStatus(c.id)} 
                        style={[styles.lockButton, loading && styles.disabledButton]}
                        disabled={loading}
                      >
                        <Text style={styles.buttonText}>
                          {c.is_active ? 'Khóa tài khoản' : 'Mở tài khoản'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff7ed', 
    paddingTop: 12 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#fff7ed', 
    padding: 16 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16,
    textAlign: 'center',
    color: '#ea580c'
  },
  scrollView: { 
    flex: 1 
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  name: { 
    fontWeight: 'bold', 
    fontSize: 16,
    marginBottom: 4,
    color: '#1f2937'
  },
  info: {
    fontSize: 14,
    marginBottom: 2,
    color: '#4b5563'
  },
  role: { 
    color: '#ea580c', 
    fontWeight: 'bold' 
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 8, 
    marginTop: 12
  },
  updateButton: { 
    backgroundColor: '#10b981', 
    padding: 10, 
    borderRadius: 6,
    flex: 1,
    alignItems: 'center'
  },
  saveButton: { 
    backgroundColor: '#10b981', 
    padding: 10, 
    borderRadius: 6,
    flex: 1,
    alignItems: 'center'
  },
  cancelButton: { 
    backgroundColor: '#ef4444', 
    padding: 10, 
    borderRadius: 6,
    flex: 1,
    alignItems: 'center'
  },
  lockButton: { 
    backgroundColor: '#ea580c', 
    padding: 10, 
    borderRadius: 6,
    flex: 1,
    alignItems: 'center'
  },
  buttonText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  editLabel: { 
    fontWeight: 'bold', 
    marginBottom: 8,
    fontSize: 16,
    color: '#ea580c'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 8,
    color: '#374151'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 6, 
    padding: 10, 
    marginBottom: 4,
    backgroundColor: '#f9fafb',
    fontSize: 14
  },
  disabledButton: { 
    backgroundColor: '#d1d5db',
    opacity: 0.6
  },
  active: { 
    color: '#10b981', 
    fontWeight: 'bold' 
  },
  locked: { 
    color: '#ef4444', 
    fontWeight: 'bold' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 16 
  },
  searchInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 6, 
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 14
  },
  searchButton: { 
    backgroundColor: '#ea580c', 
    padding: 10, 
    borderRadius: 6, 
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  loadingContainer: { 
    alignItems: 'center', 
    padding: 20 
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic'
  }
});