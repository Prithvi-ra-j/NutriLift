type Colors = typeof import("../design-system/tokens").colors;
const { colors }: { colors: Colors } = require("../design-system/tokens.ts");

type ColorName = keyof Colors;

const textPairs: { foreground: ColorName; background: ColorName }[] = [
  { foreground: "onBackground", background: "background" },
  { foreground: "onSurface", background: "surface" },
  { foreground: "onSurface", background: "surfaceVariant" },
  { foreground: "onSurfaceVariant", background: "surface" },
  { foreground: "onSurfaceVariant", background: "surfaceVariant" },
  { foreground: "onSurfaceMuted", background: "surface" },
  { foreground: "onSurfaceMuted", background: "surfaceVariant" },
  { foreground: "onPrimary", background: "primary" },
  { foreground: "onPrimaryContainer", background: "primaryContainer" },
  { foreground: "onSecondary", background: "secondary" },
  { foreground: "onSecondaryContainer", background: "secondaryContainer" },
  { foreground: "onTertiary", background: "tertiary" },
  { foreground: "onTertiaryContainer", background: "tertiaryContainer" },
  { foreground: "onError", background: "error" },
  { foreground: "onErrorContainer", background: "errorContainer" },
  { foreground: "onWarningContainer", background: "warningContainer" },
  { foreground: "onSuccessContainer", background: "successContainer" },
  { foreground: "onPrimary", background: "inverseSurface" },
];

function linearize(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const channels = color.match(/[0-9a-f]{2}/gi);
  if (!channels || channels.length !== 3) {
    throw new Error(`Invalid color token: ${color}`);
  }
  const redHex = channels[0];
  const greenHex = channels[1];
  const blueHex = channels[2];
  if (redHex === undefined || greenHex === undefined || blueHex === undefined) {
    throw new Error(`Invalid color token: ${color}`);
  }
  const red = linearize(Number.parseInt(redHex, 16));
  const green = linearize(Number.parseInt(greenHex, 16));
  const blue = linearize(Number.parseInt(blueHex, 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const failures = textPairs.flatMap(({ foreground, background }) => {
  const ratio = contrastRatio(colors[foreground], colors[background]);
  return ratio < 4.5
    ? [`${foreground} on ${background}: ${ratio.toFixed(2)}:1`]
    : [];
});

if (failures.length > 0) {
  process.stderr.write(
    `Contrast check failed (minimum 4.5:1):\n${failures.join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Contrast check passed for ${textPairs.length} text token pairs.\n`,
  );
}
