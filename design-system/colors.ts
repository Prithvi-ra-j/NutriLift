export const colors = {
  background:"#0F0F13", surface:"#16161E", surfaceVariant:"#1E1E2A", surfaceContainer:"#22222F", surfaceContainerHigh:"#282838", inverseSurface:"#E8E8F0",
  primary:"#00D4AA", onPrimary:"#001A14", primaryContainer:"#003829", onPrimaryContainer:"#7FF5DB",
  secondary:"#7CACF8", onSecondary:"#00235F", secondaryContainer:"#09397A", onSecondaryContainer:"#D5E3FF",
  tertiary:"#B69DF8", onTertiary:"#27006C", tertiaryContainer:"#3E0096", onTertiaryContainer:"#E8DEFF",
  error:"#FF5449", onError:"#690005", errorContainer:"#930006", onErrorContainer:"#FFDAD6",
  warning:"#FFB800", warningContainer:"#3D2800", onWarningContainer:"#FFDE9C",
  success:"#00C875", successContainer:"#003920", onSuccessContainer:"#7EFFC4",
  onBackground:"#E8E8F0", onSurface:"#E8E8F0", onSurfaceVariant:"#909090", onSurfaceMuted:"#8080A0",
  outline:"#2E2E3F", outlineVariant:"#3A3A50", shadow:"#000000",
} as const;
export type ColorToken = keyof typeof colors;
export const dayTypeColors: Record<string,string> = {"Push A":"#FF6B6B","Push B":"#FF8C6B","Pull A":"#4ECDC4","Pull B":"#45B7D1","Legs A":"#B69DF8","Legs B":"#9B7EF0","Cardio":"#FF5449","Marathon":"#FF5449","Rest":"#909090"};
export const macroColors = { protein:colors.secondary, carbs:"#4ADE80", fat:"#FBBF24", calories:colors.primary } as const;
