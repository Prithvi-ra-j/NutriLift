import { useState } from "react";
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
        date: new Date().toISOString().split("T")[0],
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
        return { icon: "checkmark-circle", color: "#00C875", label: "Verified" };
      case "partial":
        return { icon: "alert-circle", color: "#FFB800", label: "Partial Data" };
      case "suspect":
        return { icon: "warning", color: "#FF6B6B", label: "Suspect Data" };
      case "poor":
        return { icon: "close-circle", color: "#FF6B6B", label: "Poor Data" };
      default:
        return { icon: "information-circle", color: "#8080A0", label: "User Entered" };
    }
  };

  const badge = getQualityBadge();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#8080A0" />
          </TouchableOpacity>
          <Text style={{ color: "#F0F0F5", fontSize: 20, fontFamily: "DMSans_700Bold" }}>
            Confirm Food
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Data Quality Badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#12121A",
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#252535",
            marginBottom: 16,
          }}
        >
          <Ionicons name={badge.icon as any} size={20} color={badge.color} />
          <Text style={{ color: badge.color, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
            {badge.label}
          </Text>
          {source === "barcode" && (
            <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="barcode" size={16} color="#8080A0" />
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                Scanned
              </Text>
            </View>
          )}
        </View>

        {/* Warnings */}
        {warnings.length > 0 && (
          <View
            style={{
              backgroundColor: "#FFB80022",
              borderWidth: 1,
              borderColor: "#FFB80044",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            {warnings.map((warning, index) => (
              <View key={index} style={{ flexDirection: "row", gap: 8, marginBottom: index < warnings.length - 1 ? 8 : 0 }}>
                <Ionicons name="warning" size={16} color="#FFB800" style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, color: "#FFB800", fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 18 }}>
                  {warning}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Food Name */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 6 }}>
            FOOD NAME
          </Text>
          <TextInput
            style={{
              backgroundColor: "#1A1A26",
              borderRadius: 8,
              padding: 14,
              color: "#F0F0F5",
              fontSize: 16,
              fontFamily: "DMSans_500Medium",
              borderWidth: 1,
              borderColor: "#252535",
            }}
            value={name}
            onChangeText={setName}
            placeholder="Enter food name"
            placeholderTextColor="#4A4A6A"
          />
        </View>

        {/* Brand (optional) */}
        {brand && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 6 }}>
              BRAND
            </Text>
            <TextInput
              style={{
                backgroundColor: "#1A1A26",
                borderRadius: 8,
                padding: 14,
                color: "#F0F0F5",
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                borderWidth: 1,
                borderColor: "#252535",
              }}
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand name"
              placeholderTextColor="#4A4A6A"
            />
          </View>
        )}

        {/* Nutrition (per 100g) */}
        <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 12 }}>
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
              <Text style={{ flex: 1, color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                {field.label}
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#1A1A26",
                  borderRadius: 8,
                  padding: 12,
                  color: "#F0F0F5",
                  fontSize: 16,
                  fontFamily: "BebasNeue_400Regular",
                  borderWidth: 1,
                  borderColor: "#252535",
                  width: 100,
                  textAlign: "right",
                }}
                value={field.value}
                onChangeText={field.setter}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#4A4A6A"
              />
              <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", width: 40 }}>
                {field.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Quantity */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 6 }}>
            QUANTITY
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: "#1A1A26",
                borderRadius: 8,
                padding: 14,
                color: "#F0F0F5",
                fontSize: 18,
                fontFamily: "BebasNeue_400Regular",
                borderWidth: 1,
                borderColor: "#252535",
              }}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor="#4A4A6A"
            />
            <Text style={{ color: "#8080A0", fontSize: 14, fontFamily: "DMSans_400Regular" }}>
              grams
            </Text>
          </View>
        </View>

        {/* Meal */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium", marginBottom: 8 }}>
            MEAL
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["breakfast", "lunch", "snack", "dinner"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMeal(m)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: meal === m ? "#00D4AA22" : "#1A1A26",
                  borderWidth: 1,
                  borderColor: meal === m ? "#00D4AA" : "#252535",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: meal === m ? "#00D4AA" : "#8080A0",
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
        <TouchableOpacity
          onPress={handleLog}
          style={{
            backgroundColor: "#00D4AA",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#0A0A0F", fontSize: 16, fontFamily: "DMSans_700Bold" }}>
            Log Food
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
