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
} from 'react-native';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Fonts } from '@/constants/Fonts';
import { RootState, AppDispatch } from '@/store';
import { updateProfile, clearError } from '@/store/slices/authSlice';
import { User } from '@/types';

type Nav = any;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  
  const [profileData, setProfileData] = useState({
    fullname: '',
    email: '',
    phone_number: '',
    address: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfileData({
        fullname: user.fullname || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
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
      await dispatch(updateProfile(profileData)).unwrap();
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

  const handleInputChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
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
            <Text style={styles.fieldLabel}>Địa chỉ</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Nhập địa chỉ của bạn"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
  fieldLabel: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#333',
    marginBottom: 8,
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
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
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
});

