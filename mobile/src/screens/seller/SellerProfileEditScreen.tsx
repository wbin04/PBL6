import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AddressPickerModal } from '@/components';
import { RootState, AppDispatch } from '@/store';
import { storesService, StoreUpdatePayload } from '@/services';
import { Store, User } from '@/types';
import { updateProfile } from '@/store/slices/authSlice';

type SellerProfileEditScreenProps = {
  navigation: any;
  route: { params?: { store?: Store } };
};

type ProfileFormState = {
  fullname: string;
  email: string;
  phone_number: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

type StoreFormState = {
  id: number | null;
  store_name: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

const normalizeCoordinate = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const SellerProfileEditScreen: React.FC<SellerProfileEditScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const initialStore = route?.params?.store;

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    fullname: user?.fullname || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    address: user?.address || '',
    latitude: normalizeCoordinate(user?.latitude) ?? null,
    longitude: normalizeCoordinate(user?.longitude) ?? null,
  });

  const [storeForm, setStoreForm] = useState<StoreFormState>({
    id: initialStore?.id ?? null,
    store_name: initialStore?.store_name || '',
    description: initialStore?.description || '',
    address: initialStore?.address || '',
    latitude: normalizeCoordinate(initialStore?.latitude) ?? null,
    longitude: normalizeCoordinate(initialStore?.longitude) ?? null,
  });

  const [loadingStore, setLoadingStore] = useState(!initialStore);
  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState<'user' | 'store' | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullname: user.fullname || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        latitude: normalizeCoordinate(user.latitude) ?? null,
        longitude: normalizeCoordinate(user.longitude) ?? null,
      });
    }
  }, [user]);

  useEffect(() => {
    if (initialStore) {
      setStoreForm({
        id: initialStore.id,
        store_name: initialStore.store_name || '',
        description: initialStore.description || '',
        address: initialStore.address || '',
        latitude: normalizeCoordinate(initialStore.latitude) ?? null,
        longitude: normalizeCoordinate(initialStore.longitude) ?? null,
      });
      setLoadingStore(false);
    }
  }, [initialStore]);

  useEffect(() => {
    if (initialStore) {
      return;
    }
    const fetchStore = async () => {
      try {
        const myStore = await storesService.getMyStore();
        setStoreForm({
          id: myStore.id,
          store_name: myStore.store_name || '',
          description: myStore.description || '',
          address: myStore.address || '',
          latitude: normalizeCoordinate(myStore.latitude) ?? null,
          longitude: normalizeCoordinate(myStore.longitude) ?? null,
        });
      } catch (error: any) {
        Alert.alert('Lỗi', error?.message || 'Không thể tải thông tin cửa hàng.');
      } finally {
        setLoadingStore(false);
      }
    };
    fetchStore();
  }, [initialStore]);

  const handleProfileChange = (field: keyof ProfileFormState, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStoreChange = (field: keyof StoreFormState, value: string) => {
    setStoreForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressSelected = (payload: { address: string; latitude: number; longitude: number }) => {
    if (!activePicker) {
      return;
    }
    if (activePicker === 'user') {
      setProfileForm(prev => ({
        ...prev,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
      }));
    } else {
      setStoreForm(prev => ({
        ...prev,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
      }));
    }
    setActivePicker(null);
  };

  const currentPickerAddress = useMemo(() => {
    if (activePicker === 'user') {
      return profileForm.address;
    }
    if (activePicker === 'store') {
      return storeForm.address;
    }
    return '';
  }, [activePicker, profileForm.address, storeForm.address]);

  const currentPickerCoords = useMemo(() => {
    if (activePicker === 'user' && profileForm.latitude !== null && profileForm.longitude !== null) {
      return { latitude: profileForm.latitude, longitude: profileForm.longitude };
    }
    if (activePicker === 'store' && storeForm.latitude !== null && storeForm.longitude !== null) {
      return { latitude: storeForm.latitude, longitude: storeForm.longitude };
    }
    return undefined;
  }, [activePicker, profileForm.latitude, profileForm.longitude, storeForm.latitude, storeForm.longitude]);

  const validateForm = () => {
    if (!profileForm.fullname.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên.');
      return false;
    }
    if (!profileForm.email.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email.');
      return false;
    }
    if (!storeForm.store_name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cửa hàng.');
      return false;
    }
    if (!storeForm.address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn địa chỉ cửa hàng.');
      return false;
    }
    if (!storeForm.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin cửa hàng để cập nhật.');
      return false;
    }
    return true;
  };

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }
    setSaving(true);
    try {
      const userPayload: Partial<User> = {
        fullname: profileForm.fullname,
        email: profileForm.email,
        phone_number: profileForm.phone_number,
        address: profileForm.address,
        latitude: profileForm.latitude ?? undefined,
        longitude: profileForm.longitude ?? undefined,
      };

      const storePayload: StoreUpdatePayload = {
        store_name: storeForm.store_name,
        description: storeForm.description,
        address: storeForm.address,
        latitude: storeForm.latitude,
        longitude: storeForm.longitude,
      };

      await Promise.all([
        dispatch(updateProfile(userPayload)).unwrap(),
        storesService.updateStore(storeForm.id as number, storePayload),
      ]);

      Alert.alert('Thành công', 'Đã cập nhật hồ sơ người bán.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  }, [dispatch, navigation, profileForm, storeForm]);

  const renderCoordinateMeta = (latitude: number | null, longitude: number | null) => {
    if (latitude === null || longitude === null) {
      return null;
    }
    return (
      <Text style={styles.locationMeta}>{`Vĩ độ: ${latitude.toFixed(5)} | Kinh độ: ${longitude.toFixed(5)}`}</Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={28} color="#222" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <Text style={styles.inputLabel}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            value={profileForm.fullname}
            onChangeText={value => handleProfileChange('fullname', value)}
            placeholder="Nhập họ tên"
          />
          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            value={profileForm.email}
            onChangeText={value => handleProfileChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="seller@example.com"
          />
          <Text style={styles.inputLabel}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={profileForm.phone_number}
            onChangeText={value => handleProfileChange('phone_number', value)}
            keyboardType="phone-pad"
            placeholder="0901234567"
          />
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Địa chỉ</Text>
            <TouchableOpacity style={styles.mapPickerButton} onPress={() => setActivePicker('user')}>
              <MapPin size={16} color="#ea580c" />
              <Text style={styles.mapPickerText}>Chọn trên bản đồ</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={profileForm.address}
            onChangeText={value => handleProfileChange('address', value)}
            placeholder="Nhập địa chỉ cá nhân"
            multiline
          />
          {renderCoordinateMeta(profileForm.latitude, profileForm.longitude)}
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Thông tin cửa hàng</Text>
          {loadingStore ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#ea580c" />
              <Text style={styles.loadingText}>Đang tải dữ liệu cửa hàng...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.inputLabel}>Tên cửa hàng *</Text>
              <TextInput
                style={styles.input}
                value={storeForm.store_name}
                onChangeText={value => handleStoreChange('store_name', value)}
                placeholder="Nhập tên cửa hàng"
              />
              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={storeForm.description}
                onChangeText={value => handleStoreChange('description', value)}
                placeholder="Giới thiệu ngắn về cửa hàng"
                multiline
              />
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Địa chỉ *</Text>
                <TouchableOpacity style={styles.mapPickerButton} onPress={() => setActivePicker('store')}>
                  <MapPin size={16} color="#ea580c" />
                  <Text style={styles.mapPickerText}>Chọn trên bản đồ</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={storeForm.address}
                onChangeText={value => handleStoreChange('address', value)}
                placeholder="Địa chỉ cửa hàng"
                multiline
              />
              {renderCoordinateMeta(storeForm.latitude, storeForm.longitude)}
            </>
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <TouchableOpacity
            style={[styles.saveBtn, (saving || loadingStore) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || loadingStore}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddressPickerModal
        visible={!!activePicker}
        onClose={() => setActivePicker(null)}
        onSelect={handleAddressSelected}
        initialAddress={currentPickerAddress}
        initialCoords={currentPickerCoords}
      />
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
  multilineInput: { minHeight: 60, textAlignVertical: 'top' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  mapPickerButton: { flexDirection: 'row', alignItems: 'center' },
  mapPickerText: { color: '#ea580c', marginLeft: 4, fontWeight: '600' },
  saveBtn: { backgroundColor: '#ea580c', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, shadowColor: '#ea580c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, minWidth: 160, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  locationMeta: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  loadingBox: { alignItems: 'center', paddingVertical: 12 },
  loadingText: { marginTop: 8, color: '#6b7280' },
});

export default SellerProfileEditScreen;
