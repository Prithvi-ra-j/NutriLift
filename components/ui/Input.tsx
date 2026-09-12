import { useState } from "react";
import { TextInput, TextInputProps } from "react-native";
import { M3 } from "../../design-system/tokens";

interface InputProps extends TextInputProps {
  containerStyle?: object;
}

export function Input({ style, onFocus, onBlur, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      onFocus={(e) => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      placeholderTextColor={M3.colors.onSurfaceMuted}
      style={[
        {
          backgroundColor: M3.colors.surfaceVariant,
          borderRadius: 8,
          padding: 12,
          color: M3.colors.onSurface,
          fontSize: 14,
          fontFamily: "DMSans_400Regular",
          borderWidth: 1,
          borderColor: isFocused ? M3.colors.primary : M3.colors.outline,
        },
        style,
      ]}
      {...props}
    />
  );
}
