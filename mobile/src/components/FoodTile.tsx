import React, { useCallback } from "react";
import { Image, View, TouchableOpacity } from "react-native";
import { Heart, Star } from "lucide-react-native";
import { ThemedText } from "@/components/ThemedText";
import { useToast } from "@/components/use-toast";
import { Fonts } from "@/constants/Fonts";

export function FoodTile({
  item,
  onOpen,
  onToggleFav,
  isFav,
  requireImage,
  onPress, 
}: {
  item: any;
  onOpen: () => void;
  onToggleFav: () => void;
  isFav: boolean;
  requireImage: (f: string) => any;
  onPress?: () => void; 
}) {
  const { toast } = useToast();

  const toggle = useCallback(() => {
    onToggleFav();
    toast({
      title: isFav ? "Đã bỏ khỏi yêu thích" : "Đã thêm vào yêu thích",
      open: true,
      onOpenChange: () => {},
    });
  }, [isFav, onToggleFav, toast]);

  return (
    <View
      style={{
        width: "48%",
        borderRadius: 20,
        backgroundColor: "#fff",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 1, height: 2 },
        elevation: 3,
        overflow: "hidden",
      }}
    >
      {/* Toàn bộ card bấm để vào chi tiết */}
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {/* Ảnh + nút tim + badge rating */}
        <View style={{ position: "relative" }}>
          <Image
            source={requireImage(item.image)}
            style={{ width: "100%", height: 120 }}
            resizeMode="cover"
          />

          {/* Nút tim */}
          <TouchableOpacity
            onPress={toggle}
            activeOpacity={0.8}
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 1, height: 1 },
              elevation: 2,
            }}
          >
            <Heart
              size={16}
              color={isFav ? "#e95322" : "#98A2B3"}
              fill={isFav ? "#e95322" : "transparent"}
            />
          </TouchableOpacity>

          {/* Badge rating */}
          <View
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              backgroundColor: "rgba(0,0,0,0.7)",
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ThemedText
              style={{
                color: "#fff",
                fontFamily: Fonts.LeagueSpartanSemiBold,
                fontSize: 12,
              }}
            >
              {item.rating}
            </ThemedText>
            <Star size={12} color="#facc15" fill="#facc15" />
          </View>
        </View>

        {/* Nội dung */}
        <View style={{ padding: 12 }}>
          {/* Tên món */}
          <ThemedText
            numberOfLines={1}
            style={{
              color: "#391713",
              fontFamily: Fonts.LeagueSpartanSemiBold,
              fontSize: 15,
              marginBottom: 2,
            }}
          >
            {item.name}
          </ThemedText>

          {/* Tên quán */}
          <ThemedText
            numberOfLines={1}
            style={{
              color: "#6B7280",
              fontFamily: Fonts.LeagueSpartanRegular,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {item.restaurant}
          </ThemedText>

          {/* Giá + nút thêm */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ThemedText
              style={{
                color: "#391713",
                fontFamily: Fonts.LeagueSpartanBlack,
                fontSize: 18,
              }}
            >
              {item.price}
            </ThemedText>

            <TouchableOpacity
              onPress={onOpen}
              activeOpacity={0.9}
              style={{
                backgroundColor: "#e95322",
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ThemedText
                style={{
                  color: "#fff",
                  fontFamily: Fonts.LeagueSpartanBold,
                  fontSize: 20,
                  lineHeight: 20,
                }}
              >
                +
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

