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
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name={"camera-off" as any} size={64} color="#8080A0" />
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorText}>
          Camera permission is required to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => setManualEntry(true)}
        >
          <Text style={styles.manualButtonText}>Enter Barcode Manually</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
            placeholderTextColor="#4A4A6A"
            keyboardType="number-pad"
            autoFocus
          />
          
          <View style={styles.manualButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelBtn]}
              onPress={() => {
                setManualEntry(false);
                setManualBarcode("");
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.lookupBtn]}
              onPress={handleManualEntry}
            >
              <Text style={styles.lookupBtnText}>Lookup</Text>
            </TouchableOpacity>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          
          <TouchableOpacity
            style={styles.torchButton}
            onPress={() => setTorchOn(!torchOn)}
          >
            <Ionicons
              name={torchOn ? "flash" : "flash-off"}
              size={24}
              color="#FFF"
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
              <ActivityIndicator size="large" color="#00D4AA" />
            )}
            
            {scanState === "found" && (
              <Ionicons name="checkmark-circle" size={64} color="#00C875" />
            )}
            
            {scanState === "not_found" && (
              <Ionicons name="close-circle" size={64} color="#FF6B6B" />
            )}
            
            {scanState === "error" && (
              <Ionicons name="alert-circle" size={64} color="#FFB800" />
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
            <Ionicons name="keypad" size={20} color="#00D4AA" />
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
    backgroundColor: "#0A0A0F",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
  },
  torchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    borderColor: "#00D4AA",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 212, 170, 0.1)",
  },
  reticleDetecting: {
    borderColor: "#FFB800",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
  },
  reticleFound: {
    borderColor: "#00C875",
    backgroundColor: "rgba(0, 200, 117, 0.1)",
  },
  reticleNotFound: {
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  reticleError: {
    borderColor: "#FFB800",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
  },
  scanningLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#00D4AA",
    position: "absolute",
    top: "50%",
  },
  reticleText: {
    marginTop: 20,
    color: "#FFF",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  manualEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  manualEntryText: {
    color: "#00D4AA",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },
  loadingText: {
    marginTop: 16,
    color: "#8080A0",
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
  errorTitle: {
    marginTop: 16,
    color: "#F0F0F5",
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
  },
  errorText: {
    marginTop: 8,
    color: "#8080A0",
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  settingsButton: {
    marginTop: 24,
    backgroundColor: "#00D4AA",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: "#0A0A0F",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  manualButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  manualButtonText: {
    color: "#00D4AA",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },
  cancelButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: "#8080A0",
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },
  manualEntryContainer: {
    width: "85%",
    backgroundColor: "#12121A",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#252535",
  },
  manualTitle: {
    color: "#F0F0F5",
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    marginBottom: 8,
  },
  manualSubtitle: {
    color: "#8080A0",
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    marginBottom: 20,
  },
  manualInput: {
    backgroundColor: "#1A1A26",
    borderRadius: 8,
    padding: 16,
    color: "#F0F0F5",
    fontSize: 18,
    fontFamily: "BebasNeue_400Regular",
    borderWidth: 1,
    borderColor: "#252535",
    marginBottom: 20,
  },
  manualButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#1A1A26",
    borderWidth: 1,
    borderColor: "#252535",
  },
  cancelBtnText: {
    color: "#8080A0",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  lookupBtn: {
    backgroundColor: "#00D4AA",
  },
  lookupBtnText: {
    color: "#0A0A0F",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
});
