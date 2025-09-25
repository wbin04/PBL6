import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Check, MapPin, Plus } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

type AddressItem = {
  id: number;
  userId: number;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  ward?: string;
  district?: string;
  city: string;
  country: string;
  isDefault?: boolean;
  note?: string;
};

const ORANGE = "#e95322";

export default function AddressListScreen() {
  const navigation = useNavigation<any>();
  const { getUserById, getAddressesByUser } = useDatabase();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("currentUserId");
        let uid: number | null = stored ? Number(stored) : null;
        if (!uid || !Number.isFinite(uid)) {
          uid = 2;
          await AsyncStorage.setItem("currentUserId", String(uid));
        }
        if (mounted) setCurrentUserId(uid);
      } catch {
        if (mounted) setCurrentUserId(2);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    setLoading(true);

    const user = getUserById(currentUserId);
    const list = (getAddressesByUser(currentUserId) ?? []) as AddressItem[];

    if (!mounted) return;

    setAddresses((prev) => {
      const sameLen = prev.length === list.length;
      const same =
        sameLen && prev.every((x, i) => x.id === list[i]?.id);
      return same ? prev : list;
    });

    if (user?.defaultAddressId && list.some((a) => a.id === user.defaultAddressId)) {
      setSelectedAddressId(user.defaultAddressId);
    } else if (list.length) {
      const def = list.find((a) => a.isDefault) ?? list[0];
      setSelectedAddressId(def.id);
    } else {
      setSelectedAddressId(null);
    }

    setLoading(false);
    return () => {
      mounted = false;
    };
  }, [currentUserId]); 

  const handleSelect = useCallback((id: number) => {
    setSelectedAddressId(id);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedAddressId) return;
    const selected = addresses.find((a) => a.id === selectedAddressId);
    if (selected) {
      await AsyncStorage.setItem("selectedAddress", JSON.stringify(selected));
    }
    navigation.goBack();
  }, [addresses, selectedAddressId, navigation]);

  const headerTitle = useMemo(() => "Địa chỉ giao hàng", []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 16, paddingBottom: 0 }}>
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedAddressId;
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item.id)}
                activeOpacity={0.9}
                style={[
                  styles.card,
                  isSelected ? { borderColor: ORANGE, backgroundColor: "#FFF7F2" } : {},
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <MapPin size={16} color={ORANGE} />
                      <Text style={styles.badge}>{item.label || "Địa chỉ"}</Text>
                    </View>

                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.textLine}>
                      {item.line1}
                      {item.line2 ? `, ${item.line2}` : ""}
                    </Text>
                    <Text style={styles.textLine}>
                      {item.ward ? `${item.ward}, ` : ""}
                      {item.district ? `${item.district}, ` : ""}
                      {item.city}
                    </Text>
                    <Text style={styles.phone}>{item.phone}</Text>
                    {!!item.note && <Text style={styles.note}>Ghi chú: {item.note}</Text>}
                  </View>

                  {isSelected && <Check size={20} color={ORANGE} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 24 }}>
              <Text style={styles.emptyText}>Chưa có địa chỉ. Thêm địa chỉ mới để tiếp tục.</Text>
            </View>
          }
        />

        <TouchableOpacity
          onPress={() => navigation.navigate("AddAddress")}
          activeOpacity={0.9}
          style={styles.addBtn}
        >
          <Plus size={18} color="#555" />
          <Text style={styles.addBtnText}>Thêm địa chỉ mới</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleConfirm} activeOpacity={0.9} style={styles.confirmBtn}>
          <Text style={styles.confirmText}>Xác nhận địa chỉ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 18,
    color: "#111",
  },
  card: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FFE8DC",
    color: ORANGE,
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 12,
  },
  name: { fontFamily: Fonts.LeagueSpartanSemiBold, fontSize: 16, color: "#111", marginTop: 5, marginBottom: 10 },
  textLine: { fontFamily: Fonts.LeagueSpartanRegular, fontSize: 14, color: "#444", marginBottom: 7 },
  phone: { fontFamily: Fonts.LeagueSpartanMedium, fontSize: 14, color: "#444", marginTop: 2 },
  note: { fontFamily: Fonts.LeagueSpartanLight, fontSize: 12, color: "#777", marginTop: 7 },
  emptyText: { textAlign: "center", fontFamily: Fonts.LeagueSpartanRegular, fontSize: 14, color: "#666" },
  addBtn: {
    marginTop: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  addBtnText: { fontFamily: Fonts.LeagueSpartanMedium, fontSize: 14, color: "#555" },
  bottomBar: {
    position: "absolute", 
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    padding: 12,
    paddingBottom: 40,
  },
  confirmBtn: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#fff", fontFamily: Fonts.LeagueSpartanSemiBold, fontSize: 15 },
});
