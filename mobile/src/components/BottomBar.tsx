import { Link, usePathname } from "expo-router";
import { FileText, Headphones, Heart, Home as HomeIcon, UtensilsCrossed } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type BottomBarItem = {
  key: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  testID?: string;
};

export type BottomBarProps = {
  items?: BottomBarItem[];
  bg?: string;
  activeColor?: string;
  inactiveColor?: string;
  active?: string;
};

const defaultItems: BottomBarItem[] = [
  { key: "home", href: "/", icon: <HomeIcon size={22} color="#fff" /> },
  { key: "restaurants", href: "/restaurants", icon: <UtensilsCrossed size={22} color="#fff" /> },
  { key: "favorites", href: "/favorites", icon: <Heart size={22} color="#fff" /> },
  { key: "orders", href: "/orders", icon: <FileText size={22} color="#fff" /> },
  { key: "support", href: "/support", icon: <Headphones size={22} color="#fff" /> }
];

export default function BottomBar({
  items = defaultItems,
  bg = "#e95322",
  activeColor = "#ffffff",
  inactiveColor = "rgba(255,255,255,0.75)",
  active
}: BottomBarProps) {
  const pathname = usePathname();
  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        {items.map((item) => {
          const isActive = active ? active === item.key : pathname === item.href;
          const color = isActive ? activeColor : inactiveColor;
          return (
            <Link key={item.key} href={item.href as any} asChild>
              <TouchableOpacity style={styles.item} testID={item.testID}>
                {item.activeIcon && isActive
                  ? React.cloneElement(item.activeIcon as any, { color })
                  : React.cloneElement(item.icon as any, { color })}
              </TouchableOpacity>
            </Link>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  item: {
    flex: 1,
    alignItems: "center"
  }
});

