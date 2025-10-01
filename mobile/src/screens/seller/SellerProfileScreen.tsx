import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

type SellerProfileScreenProps = {
  navigation: any;
};

const SellerProfileScreen: React.FC<SellerProfileScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ người bán</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={28} color="#222" />
        </TouchableOpacity>
      </View>
      {/* Avatar + Name */}
      <View style={styles.avatarBox}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>S</Text>
          <View style={styles.avatarCamera} />
        </View>
        <Text style={styles.sellerName}>Nguyễn Văn Seller</Text>
        <Text style={styles.sellerJoin}>Tham gia từ: 15/08/2023</Text>
      </View>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>1247</Text><Text style={styles.statLabel}>Tổng đơn hàng</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>4.8</Text><Text style={styles.statLabel}>Đánh giá</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>4.5</Text><Text style={styles.statLabel}>Cửa hàng</Text></View>
      </View>
      {/* Personal Info */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <Text style={styles.infoLabel}>Email</Text>
        <Text style={styles.infoValue}>seller@example.com</Text>
        <Text style={styles.infoLabel}>Số điện thoại</Text>
        <Text style={styles.infoValue}>0901234567</Text>
        <Text style={styles.infoLabel}>Địa chỉ</Text>
        <Text style={styles.infoValue}>123 Nguyễn Huệ, Quận 1, TP.HCM</Text>
        <Text style={styles.infoLabel}>Mô tả</Text>
        <Text style={styles.infoValue}>Chuyên phục vụ các món ăn Việt Nam truyền thống với hương vị đậm đà, nguyên liệu tươi ngon.</Text>
      </View>
      {/* Store Info */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Thông tin cửa hàng</Text>
        <Text style={styles.infoLabel}>Tên cửa hàng</Text>
        <Text style={styles.infoValue}>Quán Phở Hà Nội</Text>
        <Text style={styles.infoLabel}>Địa chỉ cửa hàng</Text>
        <Text style={styles.infoValue}>123 Nguyễn Huệ, Quận 1, TP.HCM</Text>
        <Text style={styles.infoLabel}>Trạng thái</Text>
        <View style={styles.statusRow}><Text style={styles.statusDot}>●</Text><Text style={styles.statusText}>Đang mở cửa</Text></View>
      </View>
      {/* Update Button */}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.navigate('SellerProfileEditScreen')}>
          <Text style={styles.updateBtnText}>Cập nhật</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  updateBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  updateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  container: { flex: 1, backgroundColor: '#fff', padding: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#fff7ed', borderBottomWidth: 0, marginTop: 30 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  closeBtn: { padding: 6 },
  avatarBox: { alignItems: 'center', marginTop: 18, marginBottom: 8 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  avatarCamera: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: '#ea580c' },
  sellerName: { fontSize: 18, fontWeight: 'bold', color: '#222', marginTop: 8 },
  sellerJoin: { fontSize: 13, color: '#888', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12, marginHorizontal: 8 },
  statCard: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#ea580c' },
  statLabel: { fontSize: 13, color: '#888' },
  sectionBox: { backgroundColor: '#fff7ed', borderRadius: 12, marginHorizontal: 18, marginTop: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#888', marginTop: 6 },
  infoValue: { fontSize: 15, color: '#222', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { color: '#10b981', fontSize: 18, marginRight: 4 },
  statusText: { color: '#10b981', fontWeight: 'bold', fontSize: 15 },
});

export default SellerProfileScreen;
