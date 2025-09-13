import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import {
  ShoppingBag,
  User,
  MapPin,
  CreditCard,
  Phone,
  HelpCircle,
  Settings,
  LogOut,
  X,
} from 'lucide-react-native';
import { Fonts } from '@/constants/Fonts';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface ProfileDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isVisible, onClose, onNavigate }) => {
  const navigation = useNavigation<any>();
  
  const menuItems = [
   
    {
      icon: User,
      title: 'My Profile',
      subtitle: 'Thông tin cá nhân',
      screen: 'Profile',
      color: '#6366f1',
    },
    {
      icon: MapPin,
      title: 'Delivery Address',
      subtitle: 'Địa chỉ giao hàng',
      screen: 'Address',
      color: '#10b981',
    },
    {
      icon: CreditCard,
      title: 'Payment Methods',
      subtitle: 'Phương thức thanh toán',
      screen: 'Payment',
      color: '#f59e0b',
    },
   
    {
      icon: HelpCircle,
      title: 'Help & FAQs',
      subtitle: 'Trợ giúp & Câu hỏi',
      screen: 'Help',
      color: '#06b6d4',
    },
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'Cài đặt ứng dụng',
      screen: 'Settings',
      color: '#64748b',
    },
    {
      icon: LogOut,
      title: 'Log Out',
      subtitle: 'Đăng xuất',
      screen: 'Logout',
      color: '#ef4444',
    },
  ];

  const handleItemPress = (screen: string) => {
    onClose(); // Close drawer first
    
    if (screen === 'Logout') {
      // Navigate to Login screen
      navigation.navigate('Login');
    } else if (screen === 'Profile') {
      navigation.navigate('Profile');
    } else if (onNavigate) {
      onNavigate(screen);
    }
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={styles.overlay}>
        {/* Background overlay */}
        <TouchableOpacity style={styles.background} onPress={onClose} />
        
        {/* Drawer content */}
        <View style={styles.drawer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Image
                  source={require('@/assets/images/gourmet-burger.png')}
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>John Smith</Text>
                <Text style={styles.userEmail}>Loremipsum@email.com</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleItemPress(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                    <IconComponent size={20} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.arrow}>
                    <Text style={styles.arrowText}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  background: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    backgroundColor: '#e95322',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.LeagueSpartanBold,
    marginBottom: 4,
  },
  userEmail: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.LeagueSpartanRegular,
    opacity: 0.9,
  },
  closeButton: {
    padding: 8,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    color: '#666',
  },
  arrow: {
    paddingLeft: 10,
  },
  arrowText: {
    fontSize: 24,
    color: '#ccc',
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});

export default ProfileDrawer;