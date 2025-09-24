import { useShipper } from '../context/ShipperContext';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Phone } from 'lucide-react-native';

import type { Shipper } from '../context/ShipperContext';

const ShipperListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { shippers, getOrdersByShipper, getRatingsByShipper } = useShipper();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh sách shipper</Text>
      <ScrollView style={styles.scrollView}>
        {shippers.map(item => {
          const orders = getOrdersByShipper(item.id);
          const ratings = getRatingsByShipper(item.id);
          const avgRating = ratings.length > 0 ? (ratings.reduce((a, r) => a + (r.rating || 0), 0) / ratings.length).toFixed(1) : '0';
          return (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => navigation.navigate('ShipperDetailScreen', { shipperId: item.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={styles.phone}>{item.phone}</Text>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                      <Phone size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.group}>Nhóm: {item.group}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ShipperEditScreen', { shipper: item })}
                >
                  <Text style={styles.editBtn}>Sửa thông tin</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{orders.length}</Text>
                  <Text style={styles.statLabel}>Đã giao</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{avgRating}</Text>
                  <Text style={styles.statLabel}>Đánh giá</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.status, true ? styles.active : styles.busy]}>Đang rảnh</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  scrollView: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f3f3f3', elevation: 2 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#ea580c' },
  phone: { fontSize: 13, color: '#888', marginBottom: 2 },
  group: { fontSize: 13, color: '#888', marginBottom: 2 },
  editBtn: { color: '#22c55e', fontWeight: 'bold', fontSize: 14 },
  callBtn: { marginLeft: 8, backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 2 },
  // callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  statLabel: { fontSize: 12, color: '#888' },
  status: { fontSize: 13, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  active: { color: '#22c55e', backgroundColor: '#e0fbe0' },
  busy: { color: '#f59e0b', backgroundColor: '#fff7ed' },
});

export default ShipperListScreen;
