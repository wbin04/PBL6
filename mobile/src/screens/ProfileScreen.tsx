import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ChevronLeft, Camera, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Fonts } from '@/constants/Fonts';
import { RootState, AppDispatch } from '@/store';
import { updateProfile, clearError } from '@/store/slices/authSlice';
import { User } from '@/types';
import { AddressPickerModal } from '@/components';
import { authService } from '@/services';

type Nav = any;

type ProfileFormData = {
  fullname: string;
  email: string;
  phone_number: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  
  const [profileData, setProfileData] = useState<ProfileFormData>({
    fullname: '',
    email: '',
    phone_number: '',
    address: '',
    latitude: null,
    longitude: null,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddressPickerVisible, setAddressPickerVisible] = useState(false);
  const [isChangePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfileData({
        fullname: user.fullname || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        latitude: user.latitude ?? null,
        longitude: user.longitude ?? null,
      });
    }
  }, [user]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleUpdateProfile = async () => {
    if (!profileData.fullname.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return;
    }

    if (!profileData.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    setIsUpdating(true);
    try {
      const payload: Partial<User> = {
        ...profileData,
        latitude: profileData.latitude ?? undefined,
        longitude: profileData.longitude ?? undefined,
      };

      await dispatch(updateProfile(payload)).unwrap();
      Alert.alert(
        'Thành công',
        'Cập nhật thông tin cá nhân thành công!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (
    field: keyof Omit<ProfileFormData, 'latitude' | 'longitude'>,
    value: string,
  ) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationSelected = (data: { address: string; latitude: number; longitude: number }) => {
    setProfileData(prev => ({
      ...prev,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    }));
    setAddressPickerVisible(false);
  };

  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = changePasswordData;

    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });

      Alert.alert('Thành công', 'Đổi mật khẩu thành công', [
        {
          text: 'OK',
          onPress: () => setChangePasswordVisible(false),
        },
      ]);
      setChangePasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const message = err?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f5cb58" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={user?.fullname ? 
                { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=e95322&color=fff&size=200` } :
                require('@/assets/images/gourmet-burger.png')
              }
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          {user?.fullname && (
            <Text style={styles.userName}>{user.fullname}</Text>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.fullname}
              onChangeText={(value) => handleInputChange('fullname', value)}
              placeholder="Nhập họ và tên của bạn"
              placeholderTextColor="#999"
            />
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Nhập email của bạn"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.phone_number}
              onChangeText={(value) => handleInputChange('phone_number', value)}
              placeholder="Nhập số điện thoại của bạn"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Address */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, styles.fieldLabelTight]}>Địa chỉ</Text>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => setAddressPickerVisible(true)}
              >
                <MapPin size={16} color="#e95322" />
                <Text style={styles.mapPickerButtonText}>Chọn trên bản đồ</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              value={profileData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Nhập địa chỉ của bạn"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
            {profileData.latitude !== null && profileData.longitude !== null && (
              <Text style={styles.locationMeta}>
                {`Vĩ độ: ${profileData.latitude.toFixed(5)} | Kinh độ: ${profileData.longitude.toFixed(5)}`}
              </Text>
            )}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Change Password Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={() => setChangePasswordVisible(true)}
          >
            <Text style={styles.changePasswordText}>Thay đổi mật khẩu</Text>
          </TouchableOpacity>
        </View>

        {/* Update Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.updateButton, (isUpdating || loading) && styles.updateButtonDisabled]} 
            onPress={handleUpdateProfile}
            disabled={isUpdating || loading}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>Cập nhật thông tin</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isChangePasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thay đổi mật khẩu</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mật khẩu cũ"
              placeholderTextColor="#999"
              secureTextEntry
              value={changePasswordData.oldPassword}
              onChangeText={(value) => setChangePasswordData(prev => ({ ...prev, oldPassword: value }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor="#999"
              secureTextEntry
              value={changePasswordData.newPassword}
              onChangeText={(value) => setChangePasswordData(prev => ({ ...prev, newPassword: value }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#999"
              secureTextEntry
              value={changePasswordData.confirmPassword}
              onChangeText={(value) => setChangePasswordData(prev => ({ ...prev, confirmPassword: value }))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setChangePasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setChangePasswordVisible(false);
                }}
                disabled={isChangingPassword}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddressPickerModal
        visible={isAddressPickerVisible}
        onClose={() => setAddressPickerVisible(false)}
        onSelect={handleLocationSelected}
        initialAddress={profileData.address}
        initialCoords={
          profileData.latitude !== null && profileData.longitude !== null
            ? { latitude: profileData.latitude, longitude: profileData.longitude }
            : undefined
        }
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
    backgroundColor: '#f5cb58',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#e95322',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    marginTop: 12,
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#333',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#333',
    marginBottom: 8,
  },
  fieldLabelTight: {
    marginBottom: 0,
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapPickerButtonText: {
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: '#e95322',
  },
  textInput: {
    backgroundColor: '#f5cb58',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#333',
    opacity: 0.8,
  },
  locationMeta: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#666',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  changePasswordButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e95322',
  },
  changePasswordText: {
    color: '#e95322',
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  errorContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorText: {
    color: '#e95322',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanMedium,
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#e95322',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#333',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#f1f1f1',
  },
  modalButtonPrimary: {
    backgroundColor: '#e95322',
  },
  modalButtonText: {
    fontSize: 15,
    fontFamily: Fonts.LeagueSpartanMedium,
    color: '#333',
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
});

