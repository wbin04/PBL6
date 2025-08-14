import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '@/types';
import { RootState, AppDispatch } from '@/store';
import { logout, updateProfile } from '@/store/slices/authSlice';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants';

// Navigation prop type combining Tab and Stack
type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const globalLoading = useSelector((state: RootState) => state.auth.loading);
  const [localLoading, setLocalLoading] = useState(false);

  const [fullname, setFullname] = useState(user?.fullname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [address, setAddress] = useState(user?.address || '');

  const handleSave = async () => {
    setLocalLoading(true);
    try {
      await dispatch(updateProfile({ fullname, phone_number: phone, address })).unwrap();
      Alert.alert('Thành công', 'Cập nhật thông tin thành công');
    } catch (err: any) {
        const msg = typeof err === 'string'
          ? err
          : err.message || JSON.stringify(err);
        Alert.alert('Lỗi', msg);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <View style={styles.container}>
      {(localLoading || globalLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đây là hồ sơ của bạn.</Text>
        <Text style={styles.headerSubtitle}>Bạn muốn cập nhật thông tin chứ?</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Họ tên</Text>
          <TextInput style={styles.input} value={fullname} onChangeText={setFullname} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} editable={false} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />
        </View>
        <TouchableOpacity
          style={[styles.saveButton, (localLoading || globalLoading) && styles.disabledButton]}
          onPress={handleSave}
          disabled={localLoading || globalLoading}
        >
          <Text style={styles.saveButtonText}>
            {localLoading || globalLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.md,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 14, color: COLORS.white, marginTop: SPACING.xs },
  content: { padding: SPACING.lg },
  formGroup: { marginBottom: SPACING.md },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  disabledButton: {
    backgroundColor: COLORS.gray300,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  logoutButtonText: { color: COLORS.error, fontSize: 16, fontWeight: '600' },
});
