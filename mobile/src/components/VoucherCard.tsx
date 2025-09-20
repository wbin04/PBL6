import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Fonts } from "@/constants/Fonts";

type Props = {
  percent: string;
  subtitle: string;
  code: string;
  isSaved?: boolean;             
  defaultSaved?: boolean;        
  onToggle?: (next: boolean) => void;
};

export default function VoucherCard({
  percent,
  subtitle,
  code,
  isSaved,
  defaultSaved = false,
  onToggle,
}: Props) {
  const isControlled = typeof isSaved === "boolean";
  const [saved, setSaved] = useState<boolean>(isControlled ? (isSaved as boolean) : defaultSaved);

  useEffect(() => {
    if (isControlled) setSaved(isSaved as boolean);
  }, [isSaved, isControlled]);

  const handlePress = () => {
    const next = !saved;
    if (!isControlled) setSaved(next);
    onToggle?.(next);
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    saved ? (
      <View style={[styles.card, styles.cardSaved]}>{children}</View>
    ) : (
      <LinearGradient
        colors={["#F2602A", "#F9C65A"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.card, styles.cardGradient]}
      >
        {children}
      </LinearGradient>
    );

  return (
    <Wrapper>
      <View style={styles.left}>
        <View style={[styles.badge, saved ? styles.badgeSaved : styles.badgeGradient]}>
          <Text style={[styles.badgeText, saved ? styles.badgeTextSaved : styles.badgeTextGradient]}>
            {saved ? "✓" : "%"}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.percent, saved ? styles.percentSaved : styles.percentGradient]}>{percent}</Text>
          <Text style={[styles.subtitle, saved ? styles.subtitleSaved : styles.subtitleGradient]}>{subtitle}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.codeBtn, saved ? styles.codeBtnSaved : styles.codeBtnGradient]}
      >
        <Text style={[styles.codeText, saved ? styles.codeTextSaved : styles.codeTextGradient]}>
          {saved ? "Đã lưu" : code}
        </Text>
      </TouchableOpacity>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, gap: 12, maxWidth: 320, alignSelf: "flex-start" },
  cardGradient: { borderWidth: 0 },
  cardSaved: { backgroundColor: "transparent", borderWidth: 2, borderColor: "#EB552D" },

  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  badge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badgeGradient: { backgroundColor: "rgba(255,255,255,0.2)" },
  badgeSaved: { backgroundColor: "#EB552D" },

  badgeText: { fontFamily: Fonts.LeagueSpartanBold, fontSize: 16 },
  badgeTextGradient: { color: "#fff" },
  badgeTextSaved: { color: "#fff" },

  percent: { fontSize: 16, fontFamily: Fonts.LeagueSpartanBold },
  percentGradient: { color: "#ffffff" },
  percentSaved: { color: "#391713" },

  subtitle: { fontSize: 13, marginTop: 2, fontFamily: Fonts.LeagueSpartanRegular },
  subtitleGradient: { color: "#ffffff" },
  subtitleSaved: { color: "#6B7280" },

  codeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, minWidth: 84, alignItems: "center" },
  codeBtnGradient: { backgroundColor: "#ffffff" },
  codeBtnSaved: { backgroundColor: "#EB552D" },

  codeText: { fontFamily: Fonts.LeagueSpartanBold },
  codeTextGradient: { color: "#EB552D" },
  codeTextSaved: { color: "#ffffff" },
});

