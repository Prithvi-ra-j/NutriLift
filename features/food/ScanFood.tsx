import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { CameraView, Camera } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { lookupBarcode } from "../../lib/services/barcodeScanner";
import { logger } from "../../lib/logger";
import { Button } from "../../components/ui/Button";
import { M3 } from "../../design-system/tokens";

type ScanState = "scanning" | "detecting" | "found" | "not_found" | "error" | "offline";

export default function BarcodeScannerModal() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [torchOn, setTorchOn] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [failedScans, setFailedScans] = useState(0);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      
      if (status !== "granted") {
        logger.warn("Camera permission denied");
      }
    } catch (error) {
      logger.error("Failed to request camera permission", { error });
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setScanState("detecting");
    logger.info("Barcode scanned", { type, barcode: data });

    try {
      const result = await lookupBarcode(data);
      
      if (result.status === "NOT_FOUND") {
        setScanState("not_found");
        setFailedScans(prev => prev + 1);
        
        // Suggest torch after 3 failed scans
        if (failedScans >= 2 && !torchOn) {
          Alert.alert(
            "Having trouble?",
            "Try turning on the torch for better lighting.",
            [
              { text: "Turn on Torch", onPress: () => setTorchOn(true) },
              { text: "Continue", style: "cancel" }
            ]
          );
        }
        
        setTimeout(() => {
          setScanned(false);
          setScanState("scanning");
        }, 2000);
      } else {
        setScanState("found");
        logger.info("Barcode found", { name: result.name, quality: result.dataQuality });
        
        // Navigate to nutrition card with result
        setTimeout(() => {
          router.push({
            pathname: "/modals/nutrition-card",
            params: {
              foodData: JSON.stringify(result),
              source: "barcode"
            }
          });
        }, 500);
      }
    } catch (error) {
      logger.error("Barcode lookup failed", { error });
      setScanState("error");
      
      setTimeout(() => {
        setScanned(false);
        setScanState("scanning");
      }, 2000);
    }
  };

  const handleManualEntry = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert("Error", "Please enter a barcode number");
      return;
    }

    setManualEntry(false);
    setScanState("detecting");
    
    try {
      const result = await lookupBarcode(manualBarcode.trim());
      
      if (result.status === "NOT_FOUND") {
        Alert.alert(
          "Not Found",
          "Product not found in database. Would you like to enter it manually?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Enter Manually",
              onPress: () => {
                router.push({
                  pathname: "/modals/nutrition-card",
                  params: {
                    barcode: manualBarcode.trim(),
                    source: "manual"
                  }
                });
              }
            }
          ]
        );
        setScanState("scanning");
      } else {
        setScanState("found");
        router.push({
          pathname: "/modals/nutrition-card",
          params: {
            foodData: JSON.stringify(result),
            source: "barcode"
          }
        });
      }
    } catch (error) {
      logger.error("Manual barcode lookup failed", { error });
      Alert.alert("Error", "Failed to lookup barcode. Please try again.");
      setScanState("scanning");
    }
  };

  const openSettings = () => {
    Alert.alert(
      "Camera Permission Required",
      "Please enable camera access in your device settings to scan barcodes.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => {
          // On iOS/Android, this would open app settings
          // For now, just show manual entry
          setManualEntry(true);
        }}
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={M3.colors.primary} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name={"camera-off" as any} size={64} color={M3.colors.onSurfaceMuted} />
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorText}>
          Camera permission is required to scan barcodes.
        </Text>
        <Button label="Open Settings" onPress={openSettings} style={{ marginTop: 24 }} />
        <Button label="Enter Barcode Manually" variant="ghost" onPress={() => setManualEntry(true)} style={{ marginTop: 12 }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 4 }} />
      </View>
    );
  }

  if (manualEntry) {
    return (
      <View style={styles.container}>
        <View style={styles.manualEntryContainer}>
          <Text style={styles.manualTitle}>Enter Barcode</Text>
          <Text style={styles.manualSubtitle}>
            Type the barcode number from the product package
          </Text>
          
          <TextInput
            style={styles.manualInput}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="e.g., 8901234567890"
            placeholderTextColor={M3.colors.onSurfaceMuted}
            keyboardType="number-pad"
            autoFocus
          />
          
          <View style={styles.manualButtons}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setManualEntry(false);
                setManualBarcode("");
              }}
              style={{ flex: 1 }}
            />
            <Button
              label="Lookup"
              onPress={handleManualEntry}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "qr",
          ],
        }}
      >
        {/* Header — semi-transparent overlay on camera */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={M3.colors.onSurface} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          
          <TouchableOpacity
            style={styles.torchButton}
            onPress={() => setTorchOn(!torchOn)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={torchOn ? "flash" : "flash-off"}
              size={24}
              color={M3.colors.onSurface}
            />
          </TouchableOpacity>
        </View>

        {/* Scanning Reticle */}
        <View style={styles.reticleContainer}>
          <View
            style={[
              styles.reticle,
              scanState === "detecting" && styles.reticleDetecting,
              scanState === "found" && styles.reticleFound,
              scanState === "not_found" && styles.reticleNotFound,
              scanState === "error" && styles.reticleError,
            ]}
          >
            {scanState === "scanning" && (
              <View style={styles.scanningLine} />
            )}
            
            {scanState === "detecting" && (
              <ActivityIndicator size="large" color={M3.colors.primary} />
            )}
            
            {scanState === "found" && (
              <Ionicons name="checkmark-circle" size={64} color={M3.colors.success} />
            )}
            
            {scanState === "not_found" && (
              <Ionicons name="close-circle" size={64} color={M3.colors.error} />
            )}
            
            {scanState === "error" && (
              <Ionicons name="alert-circle" size={64} color={M3.colors.warning} />
            )}
          </View>
          
          <Text style={styles.reticleText}>
            {scanState === "scanning" ? "Align barcode within frame" :
             scanState === "detecting" ? "Looking up product..." :
             scanState === "found" ? "Product found!" :
             scanState === "not_found" ? "Product not found" :
             scanState === "error" ? "Lookup failed" : ""}
          </Text>
        </View>

        {/* Manual Entry Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => setManualEntry(true)}
          >
            <Ionicons name="keypad" size={20} color={M3.colors.primary} />
            <Text style={styles.manualEntryText}>
              Can't scan? Enter barcode manually
            </Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: M3.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  // Camera overlay header — kept semi-transparent so camera is visible behind
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: M3.colors.scrim + "80",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: M3.colors.scrim + "80",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: M3.colors.onSurface,
    ...M3.typescale.headlineMedium,
  },
  torchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: M3.colors.scrim + "80",
    alignItems: "center",
    justifyContent: "center",
  },
  reticleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    width: 280,
    height: 180,
    borderWidth: 3,
    borderColor: M3.colors.primary,
    borderRadius: M3.shape.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${M3.colors.primary}1A`, // 10% opacity of primary
  },
  reticleDetecting: {
    borderColor: M3.colors.warning,
    backgroundColor: `${M3.colors.warning}1A`,
  },
  reticleFound: {
    borderColor: M3.colors.success,
    backgroundColor: `${M3.colors.success}1A`,
  },
  reticleNotFound: {
    borderColor: M3.colors.error,
    backgroundColor: `${M3.colors.error}1A`,
  },
  reticleError: {
    borderColor: M3.colors.warning,
    backgroundColor: `${M3.colors.warning}1A`,
  },
  scanningLine: {
    width: "100%",
    height: 2,
    backgroundColor: M3.colors.primary,
    position: "absolute",
    top: "50%",
  },
  reticleText: {
    marginTop: 20,
    color: M3.colors.onSurface,
    ...M3.typescale.titleMedium,
    textAlign: "center",
    backgroundColor: M3.colors.scrim + "B3",
    paddingHorizontal: M3.spacing.lg,
    paddingVertical: M3.spacing.sm,
    borderRadius: M3.shape.small,
  },
  // Camera overlay footer — semi-transparent
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: M3.colors.scrim + "80",
  },
  manualEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  manualEntryText: {
    color: M3.colors.primary,
    ...M3.typescale.titleMedium,
  },
  loadingText: {
    marginTop: M3.spacing.lg,
    color: M3.colors.onSurfaceMuted,
    ...M3.typescale.bodyLarge,
  },
  errorTitle: {
    marginTop: M3.spacing.lg,
    color: M3.colors.onSurface,
    ...M3.typescale.headlineMedium,
  },
  errorText: {
    marginTop: M3.spacing.sm,
    color: M3.colors.onSurfaceMuted,
    ...M3.typescale.bodyLarge,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  manualEntryContainer: {
    width: "85%",
    backgroundColor: M3.colors.surface,
    borderRadius: M3.shape.large,
    padding: M3.spacing.xxl,
    borderWidth: 1,
    borderColor: M3.colors.outline,
  },
  manualTitle: {
    color: M3.colors.onSurface,
    ...M3.typescale.headlineLarge,
    marginBottom: M3.spacing.sm,
  },
  manualSubtitle: {
    color: M3.colors.onSurfaceMuted,
    ...M3.typescale.bodyMedium,
    marginBottom: M3.spacing.xl,
  },
  manualInput: {
    backgroundColor: M3.colors.surfaceVariant,
    borderRadius: M3.shape.small,
    padding: M3.spacing.lg,
    color: M3.colors.onSurface,
    fontSize: 18,
    fontFamily: "BebasNeue_400Regular",
    borderWidth: 1,
    borderColor: M3.colors.outline,
    marginBottom: M3.spacing.xl,
  },
  manualButtons: {
    flexDirection: "row",
    gap: 12,
  },
});
