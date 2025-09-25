import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, ChevronDown, MapPin, X } from "lucide-react-native";

import { Fonts } from "@/constants/Fonts";
import { useDatabase } from "@/hooks/useDatabase";

const ORANGE = "#e95322";
const BORDER = "#e5e7eb";

type Option = { label: string; value: string };

function normalize(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const PickerModal = React.memo(function PickerModal({
  visible,
  title,
  data,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  data: Option[];
  onClose: () => void;
  onSelect: (val: string) => void;
}) {
  const [q, setQ] = useState("");
  const qNorm = useMemo(() => normalize(q), [q]);

  const filtered = useMemo(() => {
    if (!qNorm) return data;
    return data
      .map((o) => {
        const n = normalize(o.label);
        const idx = n.indexOf(qNorm);
        return idx === -1 ? null : { o, rank: (idx === 0 ? 0 : 1) * n.length + idx };
      })
      .filter(Boolean)
      // @ts-expect-error narrowed above
      .sort((a, b) => a.rank - b.rank)
      // @ts-expect-error narrowed above
      .map((x) => x.o as Option);
  }, [data, qNorm]);

  const ITEM_H = 48;
  const listRef = useRef<FlatList>(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Tìm kiếm nhanh..."
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
            />
            {!!q && (
              <TouchableOpacity onPress={() => setQ("")} style={styles.searchClear}>
                <X size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            ref={listRef}
            data={filtered}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => onSelect(item.value)}
                activeOpacity={0.9}
              >
                <Text style={styles.optionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={40}
            maxToRenderPerBatch={40}
            windowSize={10}
            removeClippedSubviews
            getItemLayout={(_, index) => ({
              length: ITEM_H + 8,
              offset: (ITEM_H + 8) * index,
              index,
            })}
            contentContainerStyle={{ paddingBottom: 8 }}
            style={{ maxHeight: 420 }}
          />
        </View>
      </View>
    </Modal>
  );
});

export default function AddressAddScreen() {
  const navigation = useNavigation<any>();
  const {
    getProvinceOptions,
    getDistrictOptions,
    getWardOptions,
  } = useDatabase();

  const provinceOptions = useMemo<Option[]>(() => getProvinceOptions(), []);

  const addressTypes: Option[] = useMemo(
    () => ["Nhà riêng", "Văn phòng", "Khác"].map((v) => ({ label: v, value: v })),
    []
  );

  const [form, setForm] = useState({
    type: "Nhà riêng",
    name: "",
    phone: "",
    provinceId: "",
    districtId: "",
    wardId: "",
    address: "",
    note: "",
  });

  const [picker, setPicker] = useState<null | "type" | "province" | "district" | "ward">(null);

  const onChange = useCallback((key: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "provinceId") {
        next.districtId = "";
        next.wardId = "";
      } else if (key === "districtId") {
        next.wardId = "";
      }
      return next;
    });
  }, []);

  const districtOptions = useMemo<Option[]>(
    () => (form.provinceId ? getDistrictOptions(Number(form.provinceId)) : []),
    [form.provinceId]
  );

  const wardOptions = useMemo<Option[]>(
    () => (form.districtId ? getWardOptions(Number(form.districtId)) : []),
    [form.districtId]
  );

  const canSave =
    !!form.name &&
    !!form.phone &&
    !!form.provinceId &&
    !!form.districtId &&
    !!form.wardId &&
    !!form.address;

  const handleSave = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm địa chỉ mới</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ padding: 16, paddingBottom: 100 }}>
          {/* Loại địa chỉ */}
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.label}>Loại địa chỉ</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {addressTypes.map((opt) => {
                const active = form.type === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => onChange("type", opt.value)}
                    style={[
                      styles.typeBtn,
                      active && { backgroundColor: ORANGE, borderColor: ORANGE },
                    ]}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[styles.typeBtnText, active && { color: "#fff" }]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Họ tên */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => onChange("name", v)}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />
          </View>

          {/* SĐT */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => onChange("phone", v)}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          {/* Tỉnh/Thành phố */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Tỉnh/Thành phố</Text>
            <TouchableOpacity
              onPress={() => setPicker("province")}
              style={styles.select}
              activeOpacity={0.9}
            >
              <Text style={[styles.selectText, !form.provinceId && { color: "#9ca3af" }]}>
                {form.provinceId
                  ? provinceOptions.find((o) => o.value === form.provinceId)?.label
                  : "Chọn tỉnh/thành phố"}
              </Text>
              <ChevronDown size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Quận/Huyện */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Quận/Huyện</Text>
            <TouchableOpacity
              disabled={!form.provinceId}
              onPress={() => form.provinceId && setPicker("district")}
              style={[styles.select, !form.provinceId && styles.selectDisabled]}
              activeOpacity={form.provinceId ? 0.9 : 1}
            >
              <Text style={[styles.selectText, !form.districtId && { color: "#9ca3af" }]}>
                {form.districtId
                  ? districtOptions.find((o) => o.value === form.districtId)?.label
                  : "Chọn quận/huyện"}
              </Text>
              <ChevronDown size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Phường/Xã */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Phường/Xã</Text>
            <TouchableOpacity
              disabled={!form.districtId}
              onPress={() => form.districtId && setPicker("ward")}
              style={[styles.select, !form.districtId && styles.selectDisabled]}
              activeOpacity={form.districtId ? 0.9 : 1}
            >
              <Text style={[styles.selectText, !form.wardId && { color: "#9ca3af" }]}>
                {form.wardId
                  ? wardOptions.find((o) => o.value === form.wardId)?.label
                  : "Chọn phường/xã"}
              </Text>
              <ChevronDown size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Địa chỉ chi tiết */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Địa chỉ chi tiết</Text>
            <View style={{ position: "relative" }}>
              <View style={{ position: "absolute", left: 12, top: 12 }}>
                <MapPin size={18} color="#9ca3af" />
              </View>
              <TextInput
                value={form.address}
                onChangeText={(v) => onChange("address", v)}
                placeholder="Số nhà, tên đường (ví dụ: 123 Nguyễn Văn A)"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  { paddingLeft: 40, height: 100, textAlignVertical: "top" },
                ]}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          disabled={!canSave}
          onPress={handleSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          activeOpacity={0.9}
        >
          <Text style={styles.saveText}>Lưu địa chỉ</Text>
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      <PickerModal
        visible={picker === "province"}
        title="Chọn tỉnh/thành phố"
        data={provinceOptions}
        onClose={() => setPicker(null)}
        onSelect={(val) => {
          onChange("provinceId", val);
          setPicker(null);
        }}
      />
      <PickerModal
        visible={picker === "district"}
        title="Chọn quận/huyện"
        data={districtOptions}
        onClose={() => setPicker(null)}
        onSelect={(val) => {
          onChange("districtId", val);
          setPicker(null);
        }}
      />
      <PickerModal
        visible={picker === "ward"}
        title="Chọn phường/xã"
        data={wardOptions}
        onClose={() => setPicker(null)}
        onSelect={(val) => {
          onChange("wardId", val);
          setPicker(null);
        }}
      />
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
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 18,
    color: "#111827",
  },
  label: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 13,
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  typeBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  typeBtnText: {
    fontFamily: Fonts.LeagueSpartanMedium,
    fontSize: 14,
    color: "#374151",
  },
  select: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectDisabled: { backgroundColor: "#f3f4f6" },
  selectText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: "#111827",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
    padding: 12,
    paddingBottom: 40,
  },
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: "#d1d5db" },
  saveText: {
    color: "#fff",
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 15,
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: Fonts.LeagueSpartanSemiBold,
    fontSize: 16,
    color: "#111827",
  },
  searchWrap: { position: "relative", marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  searchClear: { position: "absolute", right: 10, top: 10, padding: 6 },
  optionRow: {
    height: 48,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: Fonts.LeagueSpartanRegular,
    fontSize: 14,
    color: "#374151",
  },
});
