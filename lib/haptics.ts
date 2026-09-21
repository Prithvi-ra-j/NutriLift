import { Platform, Vibration } from "react-native";

/** Small dependency-free tactile feedback layer. Upgrade to expo-haptics later if desired. */
export function impactLight(): void {
  if (Platform.OS !== "web") Vibration.vibrate(8);
}
export function impactMedium(): void {
  if (Platform.OS !== "web") Vibration.vibrate(14);
}
export function selection(): void {
  if (Platform.OS !== "web") Vibration.vibrate(6);
}
export function success(): void {
  if (Platform.OS !== "web") Vibration.vibrate([0, 8, 30, 8]);
}
export function warning(): void {
  if (Platform.OS !== "web") Vibration.vibrate([0, 18, 40, 18]);
}
