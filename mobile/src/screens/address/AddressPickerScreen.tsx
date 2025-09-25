import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import addressData from '@/assets/address.json';
import { addressEmitter } from '@/utils/AddressEventEmitter';

interface Province {
  province_id: number;
  name: string;
  districts: District[];
}

interface District {
  district_id: number;
  province_id: number;
  name: string;
  wards: Ward[];
}

interface Ward {
  wards_id: number;
  district_id: number;
  name: string;
}

interface AddressPickerProps {
  onAddressSelected?: (address: {
    province: Province;
    district: District;
    ward: Ward;
    fullAddress: string;
  }) => void;
}

const AddressPickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [currentStep, setCurrentStep] = useState<'province' | 'district' | 'ward'>('province');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const provinces = addressData as Province[];

  useEffect(() => {
    updateFilteredData();
  }, [currentStep, searchText, selectedProvince, selectedDistrict]);

  const updateFilteredData = () => {
    let data: any[] = [];

    if (currentStep === 'province') {
      data = provinces;
    } else if (currentStep === 'district' && selectedProvince) {
      data = selectedProvince.districts;
    } else if (currentStep === 'ward' && selectedDistrict) {
      data = selectedDistrict.wards;
    }

    if (searchText) {
      data = data.filter(item => 
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredData(data);
  };

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setCurrentStep('district');
    setSearchText('');
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    setSelectedWard(null);
    setCurrentStep('ward');
    setSearchText('');
  };

  const handleWardSelect = (ward: Ward) => {
    setSelectedWard(ward);
    
    if (selectedProvince && selectedDistrict) {
      const fullAddress = `${ward.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;
      
      const addressData = {
        province: selectedProvince,
        district: selectedDistrict,
        ward: ward,
        fullAddress: fullAddress
      };
      
      console.log('Emitting address data:', addressData);
      
      // Navigate back first, then emit event with small delay
      navigation.goBack();
      
      setTimeout(() => {
        addressEmitter.emit('addressSelected', addressData);
      }, 100);
    } else {
      navigation.goBack();
    }
  };

  const handleBack = () => {
    if (currentStep === 'district') {
      setCurrentStep('province');
      setSelectedProvince(null);
    } else if (currentStep === 'ward') {
      setCurrentStep('district');
      setSelectedDistrict(null);
    } else {
      navigation.goBack();
    }
    setSearchText('');
  };

  const getTitle = () => {
    switch (currentStep) {
      case 'province':
        return 'Chọn Tỉnh/Thành phố';
      case 'district':
        return 'Chọn Quận/Huyện';
      case 'ward':
        return 'Chọn Phường/Xã';
      default:
        return 'Chọn địa chỉ';
    }
  };

  const getPlaceholder = () => {
    switch (currentStep) {
      case 'province':
        return 'Tìm tỉnh/thành phố...';
      case 'district':
        return 'Tìm quận/huyện...';
      case 'ward':
        return 'Tìm phường/xã...';
      default:
        return 'Tìm kiếm...';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        if (currentStep === 'province') {
          handleProvinceSelect(item);
        } else if (currentStep === 'district') {
          handleDistrictSelect(item);
        } else if (currentStep === 'ward') {
          handleWardSelect(item);
        }
      }}
    >
      <Text style={styles.itemText}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#E53E3E" />
        </TouchableOpacity>
        <Text style={styles.title}>{getTitle()}</Text>
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>
          {selectedProvince ? selectedProvince.name : 'Chọn tỉnh/thành phố'}
          {selectedDistrict && ` > ${selectedDistrict.name}`}
          {selectedWard && ` > ${selectedWard.name}`}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={getPlaceholder()}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.province_id) return `${currentStep}_province_${item.province_id}_${index}`;
          if (item.district_id) return `${currentStep}_district_${item.district_id}_${index}`;
          if (item.wards_id) return `${currentStep}_ward_${item.wards_id}_${index}`;
          return `${currentStep}_item_${index}`;
        }}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
  breadcrumb: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 1,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});

export default AddressPickerScreen;