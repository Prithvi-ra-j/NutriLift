import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ elevated = false, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? "#1A1A26" : "#12121A",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#252535",
          padding: 16,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
