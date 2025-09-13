import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { updateOrderStatus } from "@/store/slices/ordersSlice";
import { AppDispatch } from "@/store";
import { ORDER_STATUS } from "@/constants";

const reasons = [
  "Thay đổi số điện thoại",
  "Thay đổi địa chỉ giao hàng",
  "Thay đổi thời gian giao hàng",
  "Thêm mã giảm giá",
  "Không muốn nhận hàng nữa",
  
];

export default function CancelScreen() {
  const [selected, setSelected] = useState<number | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  
  // Get orderId and callback function from route params
  const { orderId, onOrderCancelled } = route.params as { 
    orderId: string; 
    onOrderCancelled: (orderId: string, status: 'Đã hủy') => void;
  };

  const handleCancelOrder = async () => {
    try {
      // Cập nhật trạng thái đơn hàng thành "Đã hủy"
      onOrderCancelled(orderId, 'Đã hủy');
      
      // Navigate back to ManageOrdersScreen  
      navigation.goBack();
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert("Thành công", "Đơn hàng đã được hủy thành công");
      }, 500);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể hủy đơn hàng. Vui lòng thử lại.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E95322" />
      {/* Header tự tạo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hủy đơn hàng</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.cancelTitle}>Lý do hủy đơn hàng</Text>
        {reasons.map((reason, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.reasonRow}
            onPress={() => setSelected(idx)}
            activeOpacity={0.7}
          >
            <Text style={styles.reasonText}>{reason}</Text>
            <View style={styles.radioOuter}>
              {selected === idx && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
        <Text style={styles.othersLabel}>Khác</Text>
        <TextInput
          style={styles.textInput}
          placeholder=""
          placeholderTextColor="#B8A97F"
          value={otherReason}
          onChangeText={setOtherReason}
          multiline
        />
        <TouchableOpacity style={styles.submitBtn} onPress={handleCancelOrder}>
          <Text style={styles.submitText}>Hủy đơn hàng</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E95322" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#E95322',
  },
  backButton: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 28,
  },
  content: {
    padding: 24,
    paddingTop: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 24,
    flexGrow: 1,
  },
  desc: {
    color: "#7C6F62",
    fontSize: 25,
    marginBottom: 25,
    marginTop: 25,
    textAlign: "center",
    
  },
    cancelTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#E95322",
      textAlign: "center",
      marginTop: 16,
      marginBottom: 8,
      letterSpacing: 0.2,
    },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E6C6",
  },
  reasonText: {
    fontSize: 16,
    color: "#3B1F0A",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E95322",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E95322",
  },
  othersLabel: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 15,
    color: "#3B1F0A",
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#FFF7D6",
    borderRadius: 16,
    minHeight: 50,
    padding: 12,
    fontSize: 15,
    color: "#3B1F0A",
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: "#E95322",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 32,
    marginTop: 30,
    marginBottom: 24,
    alignSelf: "center",
    minWidth: 120,
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});