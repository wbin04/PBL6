import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Tag, ArrowLeft } from 'lucide-react-native';
import { useVoucher } from '../../contexts/VoucherContext';

interface Voucher {
  id: string;
  ten: string;
  ma: string;
  loai: 'Phần trăm' | 'Cố định';
  giaTri: string;
  batDau: string;
  ketThuc: string;
  trangThai: 'Đang hoạt động' | 'Chưa kích hoạt' | 'Đã dùng hết';
  daSuDung: number;
  tong: number;
  phanTram: number;
  donToiThieu: string;
  moTa: string;
}

const VoucherManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vouchers, deleteVoucher, editVoucher } = useVoucher();

  const handleAdd = () => {
  navigation.navigate('SellerVoucherEditScreen', { voucher: null });
  };

  const handleEdit = (voucher: Voucher) => {
  navigation.navigate('SellerVoucherEditScreen', { voucher });
  };

  const handleDelete = (id: string) => {
    deleteVoucher(id);
  };

  const total = vouchers.length;
  const active = vouchers.filter((v: Voucher) => v.trangThai === 'Đang hoạt động').length;
  const used = vouchers.reduce((sum: number, v: Voucher) => sum + v.daSuDung, 0);
  const conversion = total ? ((used / vouchers.reduce((s: number, v: Voucher) => s + v.tong, 0)) * 100).toFixed(1) : '0';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Tag color="#ea580c" size={28} />
          <Text style={styles.headerTitle}>Quản lý khuyến mãi</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[{ label: 'Tổng khuyến mãi', value: total },
          { label: 'Đang hoạt động', value: active, color: '#ea580c' },
          { label: 'Lượt sử dụng', value: used, color: '#ea580c' },
          { label: 'Tỷ lệ chuyển đổi', value: conversion + '%', color: '#ea580c' }
        ].map((s, i) => (
          <View style={styles.statCard} key={i}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.color || '#222' }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} placeholder="Tìm kiếm theo tên hoặc mã..." placeholderTextColor="#bdbdbd" />
      </View>

      {/* List */}
      <View style={styles.listBox}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Danh sách khuyến mãi abc</Text>
          <TouchableOpacity style={styles.addButtonTable} onPress={handleAdd}>
            <Text style={styles.addButtonTextTable}>+ Thêm</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={vouchers}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderItem={({ item }) => (
            <View style={styles.voucherItemCard}>
              <Text style={styles.voucherItemName}>{item.ten}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 10 }}>
                <Text style={styles.voucherItemCode}>{item.ma}</Text>
                <Text style={styles.voucherItemStatus}>
                  {item.trangThai === 'Đang hoạt động' ? '🟢' : item.trangThai === 'Chưa kích hoạt' ? '⚪' : '🔴'} {item.trangThai}
                </Text>
              </View>
              <Text style={styles.voucherItemDesc}>{item.moTa}</Text>
              <Text style={styles.voucherExtraText}>Lượt sử dụng: {item.daSuDung}/{item.tong}</Text>
              <Text style={styles.voucherExtraText}>Thời gian: {item.batDau} → {item.ketThuc}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <TouchableOpacity style={styles.voucherItemEdit} onPress={() => handleEdit(item)}>
                  <Text style={styles.voucherItemEditText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.voucherItemDelete} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.voucherItemDeleteText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingTop: 30 },
  headerBox: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, marginTop:-15,  borderColor: '#f59e0b' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#ea580c', marginLeft: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#f59e0b' },
  statLabel: { fontSize: 13, color: '#ea580c', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  searchBox: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f59e0b', paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 15, color: '#222' },
  listBox: { flex: 1, backgroundColor: '#fff7ed', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#f59e0b' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#ea580c' },
  addButtonTable: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addButtonTextTable: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  voucherItemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 2, borderColor: '#f59e0b' },
  voucherItemName: { fontSize: 17, fontWeight: 'bold', color: '#ea580c', marginBottom: 2 },
  voucherItemCode: { fontSize: 14, color: '#f59e0b', fontWeight: 'bold' },
  voucherItemStatus: { fontSize: 13, color: '#ea580c', fontWeight: 'bold' },
  voucherItemDesc: { fontSize: 14, color: '#444', marginBottom: 2 },
  voucherExtraText: { fontSize: 13, color: '#ea580c' },
  voucherItemEdit: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, left:100 },
  voucherItemEditText: { color: '#fff', fontWeight: 'bold' },
  voucherItemDelete: { backgroundColor: '#ea580c', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, right:100 },
  voucherItemDeleteText: { color: '#fff', fontWeight: 'bold' },
});

export default VoucherManagementScreen;
