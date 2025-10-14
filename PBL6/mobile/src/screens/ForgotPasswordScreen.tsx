import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Button } from '@/components';
import { COLORS, SPACING, VALIDATION, API_CONFIG } from '@/constants';
import { authService } from '@/services';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>>();
  
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!identifier.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email, tên đăng nhập hoặc số điện thoại');
      return false;
    }
    
    if (!newPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return false;
    }
    
    if (newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      Alert.alert('Lỗi', `Mật khẩu phải có ít nhất ${VALIDATION.PASSWORD_MIN_LENGTH} ký tự`);
      return false;
    }

    if (newPassword !== newPasswordConfirm) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      console.log('Attempting password reset for:', identifier);
      console.log('API URL being used:', API_CONFIG.BASE_URL);
      
      const response = await authService.resetPassword({
        identifier: identifier.trim(),
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm
      });
      
      console.log('Password reset successful');
      Alert.alert(
        'Thành công', 
        'Đặt lại mật khẩu thành công!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (err: any) {
      console.error('Password reset error:', err);
      const message = typeof err === 'string' ? err : (err.message ?? JSON.stringify(err));
      Alert.alert('Lỗi', `${message}\n\nAPI URL: ${API_CONFIG.BASE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <Text style={styles.logo}>🍔 FastFood</Text>
        <Text style={styles.subtitle}>Đặt lại mật khẩu</Text>
        {/* Debug info */}
        <Text style={styles.debugText}>{API_CONFIG.BASE_URL}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email / Tên đăng nhập / Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Nhập email, tên đăng nhập hoặc số điện thoại"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mật khẩu mới</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nhập mật khẩu mới"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <TextInput
            style={styles.input}
            value={newPasswordConfirm}
            onChangeText={setNewPasswordConfirm}
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
          />
        </View>

        <Button
          title="Đặt lại mật khẩu"
          onPress={handleResetPassword}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.resetButton}
        />

        <View style={styles.backContainer}>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.backLink}>← Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
  
  debugText: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.7,
    marginTop: 4,
  },
  
  form: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  
  resetButton: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  
  backContainer: {
    alignItems: 'center',
  },
  
  backLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

