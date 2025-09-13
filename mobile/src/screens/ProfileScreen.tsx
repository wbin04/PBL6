import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '@/constants/Fonts';

type Nav = any;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  
  const [profileData, setProfileData] = useState({
    fullName: 'John Smith',
    dateOfBirth: '09 / 10 / 1991',
    email: 'johnsmith@example.com',
    phoneNumber: '+123 567 89000',
  });

  const handleUpdateProfile = () => {
    // Handle profile update logic here
    console.log('Updating profile...', profileData);
    // You can add API call or navigation back here
  };

  const handleInputChange = (field: string, value: string) => {
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
        <Text style={styles.headerTitle}>My profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('@/assets/images/gourmet-burger.png')}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.cameraButton}>
              <Camera size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.dateOfBirth}
              onChangeText={(value) => handleInputChange('dateOfBirth', value)}
              placeholder="DD / MM / YYYY"
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
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Update Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProfile}>
            <Text style={styles.updateButtonText}>Update Profile</Text>
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
  updateButton: {
    backgroundColor: '#e95322',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanBold,
  },
});

