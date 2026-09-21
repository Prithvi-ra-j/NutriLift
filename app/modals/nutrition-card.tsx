import { useState } from "react";
import { getTodayKey } from "../../lib/dates";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";
import { insertFoodLog } from "../../lib/db/queries/nutrition";
import { logger } from "../../lib/logger";
import { ModalHeader } from "../../components/ui/ModalHeader";
import { Button } from "../../components/ui/Button";
import { M3 } from "../../design-system/tokens";
import type { FoodResult } from "../../lib/services/barcodeScanner";

export default function NutritionCardModal() {
  const params = useLocalSearchParams();
  
  // Parse food data
  const foodData: FoodResult | null = params.foodData
    ? JSON.parse(params.foodData as string)
    : null;
  
  const source = (params.source as string) || "manual";
  const barcode = (params.barcode as string) || foodData?.barcode || "";

  // State
  const [name, setName] = useState(foodData?.name || "");
  const [brand, setBrand] = useState(foodData?.brand || "");
  const [calories, setCalories] = useState(
    foodData?.per100g.calories?.toString() || ""
  );
  const [protein, setProtein] = useState(
    foodData?.per100g.protein?.toString() || ""
  );
  const [carbs, setCarbs] = useState(
    foodData?.per100g.carbs?.toString() || ""
  );
  const [fat, setFat] = useState(foodData?.per100g.fat?.toString() || "");
  const [fiber, setFiber] = useState(
    foodData?.per100g.fiber?.toString() || ""
  );
  
  const [quantity, setQuantity] = useState("100");
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "snack" | "dinner">(
    "breakfast"
  );

  const dataQuality = foodData?.dataQuality || "user_entered";
  const warnings = foodData?.warnings || [];

  const handleLog = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a food name");
      return;
    }

    const cal = parseFloat(calories);
    const pro = parseFloat(protein);
    const carb = parseFloat(carbs);
    const f = parseFloat(fat);
    const qty = parseFloat(quantity);

    if (isNaN(cal) || isNaN(pro) || isNaN(carb) || isNaN(f) || isNaN(qty)) {
      Alert.alert("Error", "Please enter valid numbers for all fields");
      return;
    }

    try {
      // Calculate actual values based on quantity
      const factor = qty / 100;

      await insertFoodLog({
        id: uuid.v4() as string,
        date: getTodayKey(),
        meal,
        name: name.trim(),
        quantity_g: qty,
        calories: cal * factor,
        protein_g: pro * factor,
        carbs_g: carb * factor,
        fat_g: f * factor,
        fiber_g: fiber ? parseFloat(fiber) * factor : null,
        sugar_g: null,
        sodium_mg: null,
        source: source === "barcode" ? "barcode" : "manual",
        raw_input: barcode || null,
        created_at: Date.now(),
      });

      logger.info("Food logged", {
        name: name.trim(),
        source,
        meal,
        calories: cal * factor,
      });

      Alert.alert("Success", "Food logged successfully!", [
        {
          text: "OK",
          onPress: () => {
            router.back();
            // Go back twice if came from scanner
            if (source === "barcode") {
              setTimeout(() => router.back(), 100);
            }
          },
        },
      ]);
    } catch (error) {
      logger.error("Failed to log food", { error });
      Alert.alert("Error", "Failed to log food. Please try again.");
    }
  };

  const getQualityBadge = () => {
    switch (dataQuality) {
      case "verified":
        return { icon: "checkmark-circle", color: M3.colors.success, label: "Verified" };
      case "partial":
        return { icon: "alert-circle", color: M3.colors.warning, label: "Partial Data" };
      case "suspect":
        return { icon: "warning", color: M3.colors.error, label: "Suspect Data" };
      case "poor":
        return { icon: "close-circle", color: M3.colors.error, label: "Poor Data" };
      default:
        return { icon: "information-circle", color: M3.colors.onSurfaceVariant, label: "User Entered" };
    }
  };

  const badge = getQualityBadge();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ModalHeader title="Confirm Food" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Data Quality Badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: M3.colors.surface,
            padding: 12,
            borderRadius: M3.shape.medium,
            borderWidth: 1,
            borderColor: M3.colors.outline,
            marginBottom: 16,
          }}
        >
          <Ionicons name={badge.icon as any} size={20} color={badge.color} />
          <Text style={{ color: badge.color, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
            {badge.label}
          </Text>
          {source === "barcode" && (
            <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="barcode" size={16} color={M3.colors.onSurfaceVariant} />
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                Scanned
              </Text>
            </View>
          )}
        </View>

        {/* Warnings */}
        {warnings.length > 0 && (
          <View
            style={{
              backgroundColor: M3.colors.warningContainer,
              borderWidth: 1,
              borderColor: M3.colors.warning + "44",
              borderRadius: M3.shape.medium,
              padding: 12,
              marginBottom: 16,
            }}
          >
            {warnings.map((warning, index) => (
              <View key={index} style={{ flexDirection: "row", gap: 8, marginBottom: index < warnings.length - 1 ? 8 : 0 }}>
                <Ionicons name="warning" size={16} color={M3.colors.warning} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, color: M3.colors.onWarningContainer, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 }}>
                  {warning}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Food Name */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 6 }}>
            FOOD NAME
          </Text>
          <TextInput
            style={{
              backgroundColor: M3.colors.surface,
              borderRadius: M3.shape.medium,
              padding: 14,
              color: M3.colors.onSurface,
              fontSize: 16,
              fontFamily: "DMSans_500Medium",
              borderWidth: 1,
              borderColor: M3.colors.outline,
            }}
            value={name}
            onChangeText={setName}
            placeholder="Enter food name"
            placeholderTextColor={M3.colors.onSurfaceMuted}
          />
        </View>

        {/* Brand (optional) */}
        {brand && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 6 }}>
              BRAND
            </Text>
            <TextInput
              style={{
                backgroundColor: M3.colors.surface,
                borderRadius: M3.shape.medium,
                padding: 14,
                color: M3.colors.onSurface,
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                borderWidth: 1,
                borderColor: M3.colors.outline,
              }}
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand name"
              placeholderTextColor={M3.colors.onSurfaceMuted}
            />
          </View>
        )}

        {/* Nutrition (per 100g) */}
        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 12 }}>
          NUTRITION (PER 100G)
        </Text>

        <View style={{ gap: 12, marginBottom: 20 }}>
          {[
            { label: "Calories", value: calories, setter: setCalories, unit: "kcal" },
            { label: "Protein", value: protein, setter: setProtein, unit: "g" },
            { label: "Carbs", value: carbs, setter: setCarbs, unit: "g" },
            { label: "Fat", value: fat, setter: setFat, unit: "g" },
            { label: "Fiber", value: fiber, setter: setFiber, unit: "g" },
          ].map((field) => (
            <View key={field.label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ flex: 1, color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                {field.label}
              </Text>
              <TextInput
                style={{
                  backgroundColor: M3.colors.surface,
                  borderRadius: M3.shape.medium,
                  padding: 12,
                  color: M3.colors.onSurface,
                  fontSize: 16,
                  fontFamily: "BebasNeue_400Regular",
                  borderWidth: 1,
                  borderColor: M3.colors.outline,
                  width: 100,
                  textAlign: "right",
                }}
                value={field.value}
                onChangeText={field.setter}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={M3.colors.onSurfaceMuted}
              />
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", width: 40 }}>
                {field.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Quantity */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 6 }}>
            QUANTITY
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: M3.colors.surface,
                borderRadius: M3.shape.medium,
                padding: 14,
                color: M3.colors.onSurface,
                fontSize: 18,
                fontFamily: "BebasNeue_400Regular",
                borderWidth: 1,
                borderColor: M3.colors.outline,
              }}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor={M3.colors.onSurfaceMuted}
            />
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 14, fontFamily: "DMSans_400Regular" }}>
              grams
            </Text>
          </View>
        </View>

        {/* Meal */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 8 }}>
            MEAL
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["breakfast", "lunch", "snack", "dinner"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMeal(m)}
                activeOpacity={0.75}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: M3.shape.medium,
                  backgroundColor: meal === m ? M3.colors.primaryContainer : M3.colors.surface,
                  borderWidth: 1,
                  borderColor: meal === m ? M3.colors.primary : M3.colors.outline,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: meal === m ? M3.colors.primary : M3.colors.onSurfaceVariant,
                    fontSize: 12,
                    fontFamily: "DMSans_700Bold",
                    textTransform: "capitalize",
                  }}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Log Button */}
        <Button label="Log Food" onPress={handleLog} />
      </ScrollView>
    </SafeAreaView>
  );
}
