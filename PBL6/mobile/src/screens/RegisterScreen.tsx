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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { register } from '@/store/slices/authSlice';
import { Button } from '@/components';
import { COLORS, SPACING, VALIDATION, API_CONFIG } from '@/constants';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Register'>>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const validateForm = () => {
    if (!fullname.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return false;
    }

    if (fullname.length < VALIDATION.NAME_MIN_LENGTH || fullname.length > VALIDATION.NAME_MAX_LENGTH) {
      Alert.alert('Lỗi', `Họ tên phải từ ${VALIDATION.NAME_MIN_LENGTH} đến ${VALIDATION.NAME_MAX_LENGTH} ký tự`);
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }

    if (!username.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập');
      return false;
    }

    if (username.length < VALIDATION.NAME_MIN_LENGTH) {
      Alert.alert('Lỗi', `Tên đăng nhập phải có ít nhất ${VALIDATION.NAME_MIN_LENGTH} ký tự`);
      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return false;
    }

    if (!VALIDATION.PHONE_REGEX.test(phoneNumber)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return false;
    }

    if (!address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ');
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

    if (password !== passwordConfirm) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    try {
      console.log('Attempting register with:', { 
        fullname, 
        email, 
        username, 
        phone_number: phoneNumber, 
        address 
      });
      console.log('API URL being used:', API_CONFIG.BASE_URL);
      
      await dispatch(register({ 
        email: email.trim(), 
        password,
        password_confirm: passwordConfirm,
        fullname: fullname.trim(),
        username: username.trim(),
        phone_number: phoneNumber.trim(),
        address: address.trim()
      })).unwrap();
      
      console.log('Registration successful');
      Alert.alert('Thành công', 'Đăng ký thành công!');
    } catch (err: any) {
      console.error('Registration error caught in handleRegister:', err);
      const message = typeof err === 'string' ? err : (err.message ?? JSON.stringify(err));
      Alert.alert('Lỗi đăng ký', `${message}\n\nAPI URL: ${API_CONFIG.BASE_URL}`);
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
        <Text style={styles.subtitle}>Tạo tài khoản mới</Text>
        {/* Debug info */}
        <Text style={styles.debugText}>{API_CONFIG.BASE_URL}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            value={fullname}
            onChangeText={setFullname}
            placeholder="Nhập họ và tên"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />
        </View>

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
          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Nhập tên đăng nhập"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Nhập số điện thoại"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Nhập địa chỉ"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={2}
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Xác nhận mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
          />
        </View>

        <Button
          title="Đăng ký"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.registerButton}
        />

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.loginLink}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  
  scrollView: {
    flex: 1,
  },
  
  form: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
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
  
  registerButton: {
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  loginLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

