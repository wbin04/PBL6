import React, { useState, useEffect } from 'react';
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
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { login } from '@/store/slices/authSlice';
import { Button } from '@/components';
import { COLORS, SPACING, VALIDATION, API_CONFIG } from '@/constants';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Login'>>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const [email, setEmail] = useState('bin@gmail.com');
  const [password, setPassword] = useState('123');

  // Debug API configuration on component mount
  useEffect(() => {
    console.log('=== LOGIN SCREEN DEBUG INFO ===');
    console.log('API Base URL:', API_CONFIG.BASE_URL);
    console.log('Platform OS:', Platform.OS);
    console.log('============================');
  }, []);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return false;
    }
    
    if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      Alert.alert('Lỗi', `Mật khẩu phải có ít nhất ${VALIDATION.PASSWORD_MIN_LENGTH} ký tự`);
      return false;
    }
    
    return true;
  };

  const testConnection = async () => {
    // try {
    //   console.log('Testing connection to:', API_CONFIG.BASE_URL);
    //   const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login/`, {
    //     method: 'HEAD',
    //     timeout: 5000,
    //   });
    //   console.log('Connection test response status:', response.status);
    //   Alert.alert('Kết nối', `Server response: ${response.status}`);
    // } catch (error) {
    //   console.error('Connection test failed:', error);
    //   Alert.alert('Lỗi kết nối', `Không thể kết nối tới server: ${API_CONFIG.BASE_URL}\n\nLỗi: ${error.message}`);
    // }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      console.log('Attempting login with:', { email, password });
      console.log('API URL being used:', API_CONFIG.BASE_URL);
      
      await dispatch(login({ email: email.trim(), password })).unwrap();
      console.log('Login successful, navigating to MainTabs');
      navigation.navigate('MainTabs');
    } catch (err: any) {
      console.error('Login error caught in handleLogin:', err);
      const message = typeof err === 'string' ? err : (err.message ?? JSON.stringify(err));
      Alert.alert('Lỗi đăng nhập', `${message}\n\nAPI URL: ${API_CONFIG.BASE_URL}`);
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <Text style={styles.logo}>🍔 FastFood</Text>
        <Text style={styles.subtitle}>Đăng nhập để đặt món</Text>
        {/* Debug info */}
        <Text style={styles.debugText}>{API_CONFIG.BASE_URL}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập email của bạn"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
          />
        </View>

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        {/* Test connection button */}
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={testConnection}
        >
          <Text style={styles.testButtonText}>Test Connection</Text>
        </TouchableOpacity>

        <Button
          title="Đăng nhập"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.loginButton}
        />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
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
  
  forgotPassword: {
    color: COLORS.primary,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  
  testButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  
  testButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  
  loginButton: {
    marginBottom: SPACING.lg,
  },
  
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  registerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});