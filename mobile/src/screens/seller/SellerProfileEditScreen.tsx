import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AddressPickerModal } from '@/components';
import { RootState, AppDispatch } from '@/store';
import { storesService, StoreUpdatePayload } from '@/services';
import { Store, User } from '@/types';
import { updateProfile } from '@/store/slices/authSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/Fonts';
import { API_CONFIG } from '@/constants';

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
  image: string | null;
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

const ORANGE = '#e95322';
const BORDER = '#e5e7eb';

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
    image: initialStore?.image || null,
  });

  const [loadingStore, setLoadingStore] = useState(!initialStore);
  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState<'user' | 'store' | null>(null);
  const [storeImageChanged, setStoreImageChanged] = useState(false);

  const getStoreImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    // API base ends with /api
    return `${API_CONFIG.BASE_URL.replace(/\/?api$/, '')}/media/${imagePath}`;
  };

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
          image: initialStore.image || null,
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
          image: myStore.image || null,
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

  const handlePickStoreImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setStoreForm(prev => ({ ...prev, image: uri }));
        setStoreImageChanged(true);
      }
    } catch (error) {
      console.error('pick store image error', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh cửa hàng.');
    }
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

      const storePromise = async () => {
        if (storeImageChanged && storeForm.image) {
          const uri = storeForm.image;
          const filename = uri.split('/').pop() || `store-${Date.now()}.jpg`;
          const extension = filename.split('.').pop() || 'jpg';
          const formData = new FormData();

          formData.append('store_name', storePayload.store_name || '');
          formData.append('description', storePayload.description || '');
          formData.append('address', storePayload.address || '');
          if (storePayload.latitude !== undefined) formData.append('latitude', storePayload.latitude as any);
          if (storePayload.longitude !== undefined) formData.append('longitude', storePayload.longitude as any);
          formData.append('image_file', {
            uri,
            name: filename,
            type: `image/${extension}`,
          } as any);

          return storesService.updateStoreWithImage(storeForm.id as number, formData);
        }
        return storesService.updateStore(storeForm.id as number, storePayload);
      };

      await Promise.all([
        dispatch(updateProfile(userPayload)).unwrap(),
        storePromise(),
      ]);

      setStoreImageChanged(false);

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
  }, [dispatch, navigation, profileForm, storeForm, storeImageChanged]);

  const renderCoordinateMeta = (latitude: number | null, longitude: number | null) => {
    if (latitude === null || longitude === null) {
      return null;
    }
    return (
      <Text style={styles.locationMeta}>{`Vĩ độ: ${latitude.toFixed(5)} | Kinh độ: ${longitude.toFixed(5)}`}</Text>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Header giống AddFoodScreen / EditFood */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* Thông tin cá nhân */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Thông tin cá nhân</Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              value={profileForm.fullname}
              onChangeText={value => handleProfileChange('fullname', value)}
              placeholder="Nhập họ tên"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={profileForm.email}
              onChangeText={value => handleProfileChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="seller@example.com"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={profileForm.phone_number}
              onChangeText={value => handleProfileChange('phone_number', value)}
              keyboardType="phone-pad"
              placeholder="0901234567"
              placeholderTextColor="#9ca3af"
            />
          </View>

              <View style={{ marginBottom: 12 }}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Địa chỉ</Text>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => setActivePicker('user')}
              >
                <MapPin size={16} color={ORANGE} />
                <Text style={styles.mapPickerText}>Chọn trên bản đồ</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 6 }]}
              value={profileForm.address}
              onChangeText={value => handleProfileChange('address', value)}
              placeholder="Nhập địa chỉ cá nhân"
              placeholderTextColor="#9ca3af"
              multiline
            />
            {renderCoordinateMeta(profileForm.latitude, profileForm.longitude)}
          </View>
        </View>

        {/* Thông tin cửa hàng */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Thông tin cửa hàng</Text>

          {loadingStore ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={ORANGE} />
              <Text style={styles.loadingText}>Đang tải dữ liệu cửa hàng...</Text>
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Tên cửa hàng *</Text>
                <TextInput
                  style={styles.input}
                  value={storeForm.store_name}
                  onChangeText={value => handleStoreChange('store_name', value)}
                  placeholder="Nhập tên cửa hàng"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  value={storeForm.description}
                  onChangeText={value => handleStoreChange('description', value)}
                  placeholder="Giới thiệu ngắn về cửa hàng"
                  placeholderTextColor="#9ca3af"
                  multiline
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>Ảnh cửa hàng</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
                  <View style={{ width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}>
                    {storeForm.image ? (
                      <Image source={{ uri: storeForm.image.startsWith('http') ? storeForm.image : (getStoreImageUrl(storeForm.image) as string) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ color: '#9ca3af', fontSize: 12 }}>Chưa có ảnh</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={handlePickStoreImage} style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: ORANGE, borderRadius: 10 }}>
                    <Text style={{ color: '#fff', fontFamily: Fonts.LeagueSpartanSemiBold }}>Chọn ảnh</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginBottom: 4 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Địa chỉ *</Text>
                  <TouchableOpacity
                    style={styles.mapPickerButton}
                    onPress={() => setActivePicker('store')}
                  >
                    <MapPin size={16} color={ORANGE} />
                    <Text style={styles.mapPickerText}>Chọn trên bản đồ</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 6 }]}
                  value={storeForm.address}
                  onChangeText={value => handleStoreChange('address', value)}
                  placeholder="Địa chỉ cửa hàng"
                  placeholderTextColor="#9ca3af"
                  multiline
                />
                {renderCoordinateMeta(storeForm.latitude, storeForm.longitude)}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar giống AddFoodScreen */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || loadingStore) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || loadingStore}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </View>

      <AddressPickerModal
        visible={!!activePicker}
        onClose={() => setActivePicker(null)}
        onSelect={handleAddressSelected}
        initialAddress={currentPickerAddress}
        initialCoords={currentPickerCoords}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 18,
    color: '#111827',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionLabel: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  label: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapPickerText: {
    marginLeft: 4,
    color: ORANGE,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 12,
  },

  locationMeta: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },

  loadingBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 13,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: 40,
  },
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
  },
});

export default SellerProfileEditScreen;
