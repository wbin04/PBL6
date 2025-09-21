import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, Bell, MessageCircle, Phone, Mail, HelpCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/Fonts"; 

import Sidebar from "@/components/sidebar";

const YELLOW = "#f5cb58";
const ORANGE = "#e95322";

export default function ShipperSupportScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentRole="shipper"
        onSwitchRole={() => {}}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.headerIconBtn}>
            <Menu size={24} color={ORANGE} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <View style={styles.headerIconBtn}>
            <Bell size={24} color={ORANGE} />
          </View>
        </View>

        <View>
          <Text style={styles.headerTitle}>Hỗ trợ</Text>
          <Text style={styles.headerSubtitle}>Chúng tôi luôn sẵn sàng giúp đỡ bạn</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentWrap}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Liên hệ nhanh */}
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Liên hệ nhanh</Text>

            <View style={{ gap: 12 }}>
              <TouchableOpacity activeOpacity={0.85} style={[styles.quickItem, styles.quickItemBlue]}>
                <View style={[styles.quickIcon, { backgroundColor: "#3b82f6" }]}>
                  <MessageCircle size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickTitle}>Chat trực tuyến</Text>
                  <Text style={styles.quickDesc}>Phản hồi ngay lập tức</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} style={[styles.quickItem, styles.quickItemGreen]}>
                <View style={[styles.quickIcon, { backgroundColor: "#22c55e" }]}>
                  <Phone size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickTitle}>Hotline: 1900-1234</Text>
                  <Text style={styles.quickDesc}>24/7 hỗ trợ khẩn cấp</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} style={[styles.quickItem, styles.quickItemOrange]}>
                <View style={[styles.quickIcon, { backgroundColor: ORANGE }]}>
                  <Mail size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickTitle}>Email hỗ trợ</Text>
                  <Text style={styles.quickDesc}>support@fooddelivery.com</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQ */}
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>

            <View style={{ gap: 12 }}>
              <View style={styles.faqCard}>
                <View style={styles.faqRow}>
                  <HelpCircle size={20} color={ORANGE} />
                  <Text style={styles.faqQuestion}>Làm sao để nhận được nhiều đơn hàng hơn?</Text>
                </View>
                <Text style={styles.faqAnswer}>
                  Giữ trạng thái online, phản hồi nhanh chóng và duy trì đánh giá cao từ khách hàng.
                </Text>
              </View>

              <View style={styles.faqCard}>
                <View style={styles.faqRow}>
                  <HelpCircle size={20} color={ORANGE} />
                  <Text style={styles.faqQuestion}>Khi nào tôi nhận được tiền?</Text>
                </View>
                <Text style={styles.faqAnswer}>
                  Tiền sẽ được chuyển vào tài khoản của bạn vào cuối mỗi tuần (Chủ nhật).
                </Text>
              </View>

              <View style={styles.faqCard}>
                <View style={styles.faqRow}>
                  <HelpCircle size={20} color={ORANGE} />
                  <Text style={styles.faqQuestion}>Tôi có thể hủy đơn hàng không?</Text>
                </View>
                <Text style={styles.faqAnswer}>
                  Bạn chỉ có thể hủy đơn hàng trong vòng 2 phút sau khi nhận. Sau đó cần liên hệ hỗ trợ.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <SafeAreaView style={{ backgroundColor: "#fff" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: YELLOW },
  header: {
    backgroundColor: YELLOW,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconBtn: {
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 8,
  },
  headerTitle: {
    color: "#fff",
    marginBottom: 4,
    fontSize: 32,
    fontFamily: Fonts.LeagueSpartanBlack,
  },
  headerSubtitle: {
    color: "#e95322",
    fontSize: 16,
    fontFamily: Fonts.LeagueSpartanSemiBold,
  },
  contentWrap: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    marginBottom: 12,
  },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  quickItemBlue: { backgroundColor: "#eff6ff" },
  quickItemGreen: { backgroundColor: "#ecfdf5" },
  quickItemOrange: { backgroundColor: "#fff7ed" },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  quickTitle: {
    fontSize: 16,
    color: "#111827",
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  quickDesc: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
    fontFamily: Fonts.LeagueSpartanRegular,
  },
  faqCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    marginLeft: 8,
    fontFamily: Fonts.LeagueSpartanMedium,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#4b5563",
    marginLeft: 28,
    fontFamily: Fonts.LeagueSpartanRegular,
  },
});
