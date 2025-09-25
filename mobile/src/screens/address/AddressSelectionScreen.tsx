import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addressEmitter } from '@/utils/AddressEventEmitter';

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  isDefault?: boolean;
}

const AddressSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [selectedAddress, setSelectedAddress] = useState<string>('1');

  // State for dynamic address list
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: '1',
      name: 'Lý Hoàng Quyên',
      phone: '(+84) 867 517 503',
      address: '142/18 Au Co',
      district: 'Phường Hòa Khánh Bắc, Quận Liên Chiều, Đà Nẵng',
      isDefault: true,
    },
    {
      id: '2',
      name: 'Lý Quyên',
      phone: '(+84) 867 517 503',
      address: 'Đội 3, Tập Phước, dưới trường Lê Lợi, đối diện cắt tóc Anh Đào',
      district: 'Xã Đại Chánh, Huyện Đại Lộc, Quảng Nam',
    },
    {
      id: '3',
      name: 'Lý Hoàng Quyên',
      phone: '(+84) 772 490 480',
      address: '8 Nguyễn Xuân Khoát',
      district: 'Phường Tân Thạnh, Quận Tân Phú, TP. Hồ Chí Minh',
    },
  ]);

  // Listen for new address events
  React.useEffect(() => {
    const handleAddressAdded = (newAddress: Address) => {
      console.log('New address added:', newAddress);
      setAddresses(prev => [...prev, newAddress]);
    };

    addressEmitter.on('addressAdded', handleAddressAdded);

    return () => {
      addressEmitter.off('addressAdded', handleAddressAdded);
    };
  }, []);

  // No longer need to get callback function from route params

  const handleSelectAddress = (addressId: string) => {
    setSelectedAddress(addressId);
  };

  const handleConfirmAddress = () => {
    const selected = addresses.find(addr => addr.id === selectedAddress);
    if (selected) {
      // Emit event instead of calling callback
      addressEmitter.emit('addressFromSelectionSelected', {
        name: selected.name,
        phone: selected.phone,
        address: selected.address,
        district: selected.district,
        fullAddress: `${selected.address}, ${selected.district}`,
      });
      
      navigation.goBack();
    }
  };

  const handleAddNewAddress = () => {
    (navigation as any).navigate('AddAddress');
  };

  const renderAddressItem = (address: Address) => (
    <TouchableOpacity
      key={address.id}
      style={styles.addressItem}
      onPress={() => handleSelectAddress(address.id)}
    >
      <View style={styles.radioContainer}>
        <View style={[
          styles.radioButton,
          selectedAddress === address.id && styles.radioButtonSelected
        ]}>
          {selectedAddress === address.id && <View style={styles.radioButtonInner} />}
        </View>
      </View>
      
      <View style={styles.addressContent}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{address.name}</Text>
          <Text style={styles.phone}>{address.phone}</Text>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editText}>Sửa</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.address}>{address.address}</Text>
        <Text style={styles.district}>{address.district}</Text>
        
        {address.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Mặc định</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Chọn địa chỉ nhận hàng</Text>
      </View>

      {/* Address List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Địa chỉ</Text>
        
        {addresses.map((address) => (
          <View key={`address_${address.id}`}>
            {renderAddressItem(address)}
          </View>
        ))}
        
        {/* Add New Address Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewAddress}
        >
          <Ionicons name="add-circle" size={24} color="#E53E3E" />
          <Text style={styles.addButtonText}>Thêm Địa Chỉ Mới</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmAddress}
        >
          <Text style={styles.confirmButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  addressItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
  },
  radioContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#E53E3E',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53E3E',
  },
  addressContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  editButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editText: {
    fontSize: 14,
    color: '#E53E3E',
  },
  address: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  district: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  defaultText: {
    fontSize: 12,
    color: '#E53E3E',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E53E3E',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: '#E53E3E',
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#E53E3E',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AddressSelectionScreen;