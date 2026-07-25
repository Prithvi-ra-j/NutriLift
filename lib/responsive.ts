import { Dimensions, Platform } from "react-native";

// Get device dimensions
export const getDeviceDimensions = () => {
  const { width, height } = Dimensions.get("window");
  return { width, height };
};

// Device type detection
export const getDeviceType = () => {
  const { width } = getDeviceDimensions();
  
  if (Platform.OS === "web") {
    // Web breakpoints
    if (width < 640) return "mobile";
    if (width < 768) return "tablet-sm";
    if (width < 1024) return "tablet";
    if (width < 1280) return "desktop";
    return "desktop-lg";
  } else {
    // Native breakpoints
    if (width < 375) return "mobile-sm";
    if (width < 414) return "mobile";
    if (width < 768) return "mobile-lg";
    if (width < 1024) return "tablet";
    return "tablet-lg";
  }
};

// Responsive values
export const responsive = {
  // Padding
  padding: {
    mobile: 16,
    tablet: 24,
    desktop: 32,
  },
  
  // Font sizes
  fontSize: {
    xs: { mobile: 11, tablet: 12, desktop: 13 },
    sm: { mobile: 13, tablet: 14, desktop: 15 },
    base: { mobile: 15, tablet: 16, desktop: 17 },
    lg: { mobile: 18, tablet: 20, desktop: 22 },
    xl: { mobile: 22, tablet: 26, desktop: 30 },
    "2xl": { mobile: 28, tablet: 32, desktop: 36 },
  },
  
  // Spacing
  spacing: {
    xs: { mobile: 4, tablet: 6, desktop: 8 },
    sm: { mobile: 8, tablet: 10, desktop: 12 },
    md: { mobile: 12, tablet: 16, desktop: 20 },
    lg: { mobile: 16, tablet: 20, desktop: 24 },
    xl: { mobile: 20, tablet: 28, desktop: 32 },
  },
  
  // Card widths
  cardWidth: {
    mobile: "100%",
    tablet: "48%",
    desktop: "32%",
  },
  
  // Max content width
  maxWidth: {
    mobile: "100%",
    tablet: 768,
    desktop: 1200,
  },
};

// Hook for responsive values
export const useResponsive = () => {
  const deviceType = getDeviceType();
  const { width, height } = getDeviceDimensions();
  
  const isWeb = Platform.OS === "web";
  const isMobile = deviceType.includes("mobile");
  const isTablet = deviceType.includes("tablet");
  const isDesktop = deviceType.includes("desktop");
  
  // Get responsive value
  const getValue = (values: { mobile: any; tablet: any; desktop: any }) => {
    if (isDesktop) return values.desktop;
    if (isTablet) return values.tablet;
    return values.mobile;
  };
  
  return {
    deviceType,
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    getValue,
    responsive,
  };
};

// Utility to get responsive padding
export const getResponsivePadding = () => {
  const deviceType = getDeviceType();
  if (deviceType.includes("desktop")) return 32;
  if (deviceType.includes("tablet")) return 24;
  return 16;
};

// Utility to get responsive font size
export const getResponsiveFontSize = (size: keyof typeof responsive.fontSize) => {
  const deviceType = getDeviceType();
  const sizes = responsive.fontSize[size];
  
  if (deviceType.includes("desktop")) return sizes.desktop;
  if (deviceType.includes("tablet")) return sizes.tablet;
  return sizes.mobile;
};

// Utility to check if screen is wide enough for multi-column layout
export const shouldUseMultiColumn = () => {
  const { width } = getDeviceDimensions();
  return width >= 768; // Tablet and above
};

// Get number of columns based on screen width
export const getColumnCount = () => {
  const { width } = getDeviceDimensions();
  if (width >= 1280) return 3; // Desktop large
  if (width >= 1024) return 3; // Desktop
  if (width >= 768) return 2;  // Tablet
  return 1; // Mobile
};

// Responsive container style
export const getContainerStyle = () => {
  const padding = getResponsivePadding();
  const { width } = getDeviceDimensions();
  const maxWidth = width >= 1200 ? 1200 : "100%";
  
  return {
    paddingHorizontal: padding,
    maxWidth,
    width: "100%",
    alignSelf: "center" as const,
  };
};
