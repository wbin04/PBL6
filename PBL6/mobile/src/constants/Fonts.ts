export const Fonts = {
  LeagueSpartanThin: "LeagueSpartan-Thin",
  LeagueSpartanExtraLight: "LeagueSpartan-ExtraLight",
  LeagueSpartanLight: "LeagueSpartan-Light",
  LeagueSpartanRegular: "LeagueSpartan-Regular",
  LeagueSpartanMedium: "LeagueSpartan-Medium",
  LeagueSpartanSemiBold: "LeagueSpartan-SemiBold",
  LeagueSpartanBold: "LeagueSpartan-Bold",
  LeagueSpartanExtraBold: "LeagueSpartan-ExtraBold",
  LeagueSpartanBlack: "LeagueSpartan-Black",
} as const;

export type FontName = keyof typeof Fonts;

export const fontAssets = {
  [Fonts.LeagueSpartanThin]: require("@/assets/fonts/LeagueSpartan-Thin.ttf"),
  [Fonts.LeagueSpartanExtraLight]: require("@/assets/fonts/LeagueSpartan-ExtraLight.ttf"),
  [Fonts.LeagueSpartanLight]: require("@/assets/fonts/LeagueSpartan-Light.ttf"),
  [Fonts.LeagueSpartanRegular]: require("@/assets/fonts/LeagueSpartan-Regular.ttf"),
  [Fonts.LeagueSpartanMedium]: require("@/assets/fonts/LeagueSpartan-Medium.ttf"),
  [Fonts.LeagueSpartanSemiBold]: require("@/assets/fonts/LeagueSpartan-SemiBold.ttf"),
  [Fonts.LeagueSpartanBold]: require("@/assets/fonts/LeagueSpartan-Bold.ttf"),
  [Fonts.LeagueSpartanExtraBold]: require("@/assets/fonts/LeagueSpartan-ExtraBold.ttf"),
  [Fonts.LeagueSpartanBlack]: require("@/assets/fonts/LeagueSpartan-Black.ttf"),
} as const;
