import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useShipper } from '../context/ShipperContext';

interface ShipperDetailPopupProps {
  visible: boolean;
  onClose: () => void;
  shipperId: string;
}

const ShipperDetailPopup: React.FC<ShipperDetailPopupProps> = ({ visible, onClose, shipperId }) => {
  const { shippers, getOrdersByShipper, getRatingsByShipper } = useShipper();
  const shipper = shippers.find(s => s.id === shipperId);
  const orders = getOrdersByShipper(shipperId);
  const ratings = getRatingsByShipper(shipperId);

  if (!shipper) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{shipper.name}</Text>
          <Text style={styles.info}>SĐT: {shipper.phone}</Text>
          <Text style={styles.info}>Nhóm: {shipper.group}</Text>
          <Text style={styles.sectionTitle}>Đơn đã giao</Text>
          <FlatList
            data={orders}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.orderItem}>
                <Text>{item.customerName} - {item.address} ({item.status})</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có đơn nào</Text>}
            style={{ maxHeight: 100 }}
          />
          <Text style={styles.sectionTitle}>Đánh giá</Text>
          <FlatList
            data={ratings}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.ratingItem}>
                <Text>★ {item.rating} - {item.comment}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có đánh giá</Text>}
            style={{ maxHeight: 100 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  popup: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%' },
  closeBtn: { position: 'absolute', right: 10, top: 10, zIndex: 1 },
  closeText: { fontSize: 28, color: '#ea580c' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ea580c', marginBottom: 8, textAlign: 'center' },
  info: { fontSize: 15, color: '#444', marginBottom: 2, textAlign: 'center' },
  sectionTitle: { fontWeight: 'bold', color: '#ea580c', marginTop: 12, marginBottom: 4 },
  orderItem: { paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#eee' },
  ratingItem: { paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#eee' },
  emptyText: { color: '#888', fontStyle: 'italic', textAlign: 'center' },
});

export default ShipperDetailPopup;
