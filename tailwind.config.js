/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Apex Design System
        background: "#0A0A0F",
        surface: "#12121A",
        "surface-elevated": "#1A1A26",
        "surface-border": "#252535",
        primary: "#00D4AA",
        "primary-dim": "#00A882",
        "text-primary": "#F0F0F5",
        "text-secondary": "#8080A0",
        "text-muted": "#4A4A6A",
        success: "#00C875",
        warning: "#FFB800",
        danger: "#FF4757",
        "pr-gold": "#FFD700",
        // Macro colors
        protein: "#3B82F6",
        carbs: "#22C55E",
        fat: "#F59E0B",
        fiber: "#8B5CF6",
      },
      fontFamily: {
        display: ["BebasNeue_400Regular"],
        body: ["DMSans_400Regular"],
        "body-medium": ["DMSans_500Medium"],
        "body-bold": ["DMSans_700Bold"],
        mono: ["DMSans_400Regular"],
      },
    },
  },
  plugins: [],
};
