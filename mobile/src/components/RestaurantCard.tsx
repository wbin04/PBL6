import React from "react";
import { Image, View, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Star, Truck, Clock3 } from "lucide-react-native";
import { Fonts } from "@/constants/Fonts";

export function RestaurantCard({
  item,
  onPress,
  requireImage,
}: {
  item: any;
  onPress: () => void;
  requireImage: (f: string) => any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 256,
        backgroundColor: "#fff",
        borderRadius: 16, 
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 1, height: 2 },
        elevation: 3,
        marginBottom: 3,
      }}
    >
      {/* Ảnh cover */}
      <Image
        source={requireImage(item.image)}
        style={{ width: "100%", height: 120 }}
        resizeMode="cover"
      />

      <View style={{ padding: 12 }}>
        {/* Tên quán */}
        <ThemedText
          numberOfLines={1}
          style={{
            color: "#391713",
            fontFamily: Fonts.LeagueSpartanBold,
            fontSize: 16,
            marginBottom: 2,
          }}
        >
          {item.name}
        </ThemedText>

        {/* Nhóm món / tags */}
        <ThemedText
          numberOfLines={1}
          style={{
            color: "#6B7280",
            fontFamily: Fonts.LeagueSpartanRegular,
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          {item.categories}
        </ThemedText>

        {/* Hàng dưới: rating + giao hàng + thời gian */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Trái: rating + giao hàng */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* rating */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Star size={12} color="#e95322" fill="#e95322" />
              <ThemedText
                style={{
                  fontFamily: Fonts.LeagueSpartanSemiBold,
                  fontSize: 12,
                  color: "#391713",
                }}
              >
                {item.rating}
              </ThemedText>
            </View>

            {/* khoảng cách */}
            <View style={{ width: 12 }} />

            {/* Giao hàng */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: "#e95322",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Truck size={12} color="#fff" />
              </View>
              <ThemedText
                style={{
                  fontFamily: Fonts.LeagueSpartanSemiBold,
                  fontSize: 12,
                  color: "#391713",
                }}
              >
                {item.delivery}
              </ThemedText>
            </View>
          </View>

          {/* Phải: thời gian */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Clock3 size={14} color="#9CA3AF" />
            <ThemedText
              style={{
                fontFamily: Fonts.LeagueSpartanRegular,
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              {item.time}
            </ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

