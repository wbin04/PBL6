import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/Fonts';

interface NotificationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string, params?: any) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isVisible, onClose, onNavigate }) => {
  console.log('Modal render, isVisible:', isVisible); // Debug log

  const notifications = [
    {
      id: 1,
      icon: '🍴',
      title: 'Chúng tôi đã thêm một sản phẩm bạn có thể thích.',
      bgColor: '#FF8A65',
      screen: 'Restaurants',
    },
    {
      id: 2,
      icon: '❤️',
      title: 'Món ăn bạn yêu thích đang có khuyến mãi.',
      bgColor: '#FF7043',
      screen: 'Favorites',
    },
    {
      id: 3,
      icon: '🛍️',
      title: 'Đơn hàng của bạn đã được giao',
      bgColor: '#FF6F43',
      screen: 'Orders',
      params: { selectedTab: 'Đã giao' },
    },
    {
      id: 4,
      icon: '🏍️',
      title: 'Đơn hàng của bạn đang trên đường giao',
      bgColor: '#FF5722',
      screen: 'Orders',
      params: { selectedTab: 'Đang giao' },
    },
  ];

  const handleNotificationPress = (notification: any) => {
    onClose(); // Đóng modal trước
    if (onNavigate) {
      onNavigate(notification.screen, notification.params);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Ionicons name="notifications" size={28} color="#fff" />
              <Text style={styles.headerTitle}>Thông báo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Divider Line */}
          <View style={styles.headerDivider} />
        </View>

        {/* Notifications List */}
        <ScrollView 
          style={styles.notificationsList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        >
          {notifications.map((notification, index) => (
            <TouchableOpacity 
              key={notification.id} 
              style={styles.notificationItem}
              activeOpacity={0.7}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.notificationEmoji}>{notification.icon}</Text>
              </View>
              
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
              </View>
              
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#e95322',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Fonts.LeagueSpartanBold,
    color: '#fff',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  headerDivider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 20,
  },
  notificationsList: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e95322',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationEmoji: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
    paddingRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
    color: '#333',
    lineHeight: 22,
  },
  arrowContainer: {
    padding: 4,
  },
});

export default NotificationModal;