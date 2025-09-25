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
  Alert,
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
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';

const { width } = Dimensions.get('window');

interface ProfileDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isVisible, onClose, onNavigate }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const menuItems = [
    {
      icon: User,
      title: 'Thông tin cá nhân',
      subtitle: 'Cập nhật thông tin tài khoản',
      screen: 'Profile',
      color: '#6366f1',
    },
    {
      icon: ShoppingBag,
      title: 'Đơn hàng của tôi',
      subtitle: 'Xem lịch sử đơn hàng',
      screen: 'Orders',
      color: '#059669',
    },
    {
      icon: MapPin,
      title: 'Địa chỉ giao hàng',
      subtitle: 'Quản lý địa chỉ giao hàng',
      screen: 'AddressList',
      color: '#10b981',
    },
    {
      icon: CreditCard,
      title: 'Phương thức thanh toán',
      subtitle: 'Quản lý thẻ và ví điện tử',
      screen: 'Payment',
      color: '#f59e0b',
    },
    // Show Admin option only for managers
    ...(user?.role === 'Quản lý' ? [{
      icon: Settings,
      title: 'Quản lý cửa hàng',
      subtitle: 'Quản lý đơn hàng và cửa hàng',
      screen: 'AdminHome',
      color: '#8b5cf6',
    }] : []),
    {
      icon: HelpCircle,
      title: 'Trợ giúp & Hỗ trợ',
      subtitle: 'Câu hỏi thường gặp và liên hệ',
      screen: 'Help',
      color: '#06b6d4',
    },
    {
      icon: Settings,
      title: 'Cài đặt',
      subtitle: 'Thông báo và tùy chỉnh ứng dụng',
      screen: 'Settings',
      color: '#64748b',
    },
    {
      icon: LogOut,
      title: 'Đăng xuất',
      subtitle: 'Thoát khỏi tài khoản',
      screen: 'Logout',
      color: '#ef4444',
    },
  ];

  const handleItemPress = (screen: string) => {
    onClose(); // Close drawer first
    
    if (screen === 'Logout') {
      // Show confirmation dialog
      Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất không?',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Đăng xuất',
            style: 'destructive',
            onPress: () => {
              dispatch(logout());
            },
          },
        ]
      );
    } else if (screen === 'Profile') {
      navigation.navigate('Profile');
    } else if (screen === 'Orders') {
      // Navigate to Orders tab in MainTabs
      navigation.navigate('MainTabs', { screen: 'Orders' });
    } else if (screen === 'AddressList') {
      navigation.navigate('AddressList');
    } else if (screen === 'AdminHome') {
      navigation.navigate('AdminHome');
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
                  source={user?.fullname ? 
                    { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=e95322&color=fff&size=200` } :
                    require('@/assets/images/gourmet-burger.png')
                  }
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user?.fullname || 'Người dùng'}
                </Text>
                <Text style={styles.userEmail}>
                  {user?.email || 'email@example.com'}
                </Text>
                {user?.role && (
                  <Text style={styles.userRole}>
                    {user.role}
                  </Text>
                )}
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
  userRole: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.LeagueSpartanMedium,
    opacity: 0.8,
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
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