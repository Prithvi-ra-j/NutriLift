import { Alert } from "react-native";

export function confirmDestructive(
  title: string,
  message: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      resolve(confirmed);
    };

    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => settle(false) },
        { text: "Delete", style: "destructive", onPress: () => settle(true) },
      ],
      { cancelable: true, onDismiss: () => settle(false) },
    );
  });
}
