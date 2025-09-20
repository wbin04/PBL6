import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { addressEmitter } from '@/utils/AddressEventEmitter';

const AddAddressScreen = () => {
  const navigation = useNavigation();
  
  const [formData, setFormData] = useState({
    contactName: '',
    phoneNumber: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    fullAddress: '',
    addressType: 'Văn Phòng', // Default selection
    isDefault: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressSelected = (addressData: any) => {
    console.log('Address selected:', addressData); // Debug log
    setFormData(prev => ({
      ...prev,
      city: addressData.province.name,
      district: addressData.district.name,
      ward: addressData.ward.name,
      fullAddress: addressData.fullAddress,
    }));
  };

  // Listen for address selection events
  React.useEffect(() => {
    console.log('Setting up address event listener');
    
    const handleAddressEvent = (addressData: any) => {
      console.log('Event received in AddAddressScreen:', addressData);
      handleAddressSelected(addressData);
    };

    addressEmitter.on('addressSelected', handleAddressEvent);

    return () => {
      console.log('Cleaning up address event listener');
      addressEmitter.off('addressSelected', handleAddressEvent);
    };
  }, []);

  const handleSave = () => {
    // Validate form data
    if (!formData.contactName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ');
      return;
    }
    if (!formData.fullAddress.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã');
      return;
    }

    // Create new address object
    const newAddress = {
      id: Date.now().toString(), // Simple ID generation
      name: formData.contactName,
      phone: formData.phoneNumber,
      address: formData.address,
      district: formData.fullAddress,
      addressType: formData.addressType,
      isDefault: formData.isDefault,
    };

    console.log('Saving address:', newAddress);
    
    // Emit event to add new address to selection screen
    addressEmitter.emit('addressAdded', newAddress);
    
    // Navigate back with success
    Alert.alert('Thành công', 'Địa chỉ đã được thêm thành công!', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#E53E3E" />
        </TouchableOpacity>
        <Text style={styles.title}>Địa chỉ mới</Text>
      </View>

      {/* Form */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Liên hệ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên hệ</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Họ và tên</Text>
            <TextInput
              style={styles.textInput}
              value={formData.contactName}
              onChangeText={(text) => handleInputChange('contactName', text)}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Địa chỉ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ</Text>
          
          <TouchableOpacity 
            style={styles.selectContainer}
            onPress={() => (navigation as any).navigate('AddressPicker')}
          >
            <Text style={styles.selectLabel}>Tỉnh/Thành phố, Quận/Huyện, Phường/Xã</Text>
            <View style={styles.selectValue}>
              <Text style={[styles.selectText, formData.fullAddress && styles.selectTextSelected]}>
                {formData.fullAddress || 'Chọn địa chỉ'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Tên đường, Tòa nhà, Số nhà.</Text>
            <TextInput
              style={styles.textInput}
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="Nhập địa chỉ chi tiết"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Cài đặt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          
          {/* Loại địa chỉ */}
          <View style={styles.addressTypeContainer}>
            <Text style={styles.addressTypeLabel}>Loại địa chỉ:</Text>
            <View style={styles.addressTypeButtons}>
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  formData.addressType === 'Văn Phòng' && styles.typeButtonSelected
                ]}
                onPress={() => handleInputChange('addressType', 'Văn Phòng')}
              >
                <Text style={[
                  styles.typeButtonText,
                  formData.addressType === 'Văn Phòng' && styles.typeButtonTextSelected
                ]}>
                  Văn Phòng
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  formData.addressType === 'Nhà Riêng' && styles.typeButtonSelected
                ]}
                onPress={() => handleInputChange('addressType', 'Nhà Riêng')}
              >
                <Text style={[
                  styles.typeButtonText,
                  formData.addressType === 'Nhà Riêng' && styles.typeButtonTextSelected
                ]}>
                  Nhà Riêng
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Đặt làm địa chỉ mặc định */}
          <View style={styles.defaultContainer}>
            <Text style={styles.defaultLabel}>Đặt làm địa chỉ mặc định</Text>
            <Switch
              value={formData.isDefault}
              onValueChange={(value) => handleInputChange('isDefault', value)}
              trackColor={{ false: '#E0E0E0', true: '#E53E3E' }}
              thumbColor={formData.isDefault ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, !formData.contactName.trim() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!formData.contactName.trim()}
        >
          <Text style={[styles.saveButtonText, !formData.contactName.trim() && styles.saveButtonTextDisabled]}>
            HOÀN THÀNH
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  selectContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectText: {
    fontSize: 16,
    color: '#999',
  },
  selectTextSelected: {
    color: '#333',
  },
  addressTypeContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addressTypeLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  addressTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  defaultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingVertical: 4,
  },
  defaultLabel: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#E53E3E',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});

export default AddAddressScreen;