import type { ReactNode } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../design-system/tokens";
import { fireAndLog } from "../../lib/async";
import type { SetForm } from "./workoutTypes";

interface SetFormFieldsProps {
  form: SetForm;
  onChange: (partial: Partial<SetForm>) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  extraActions?: ReactNode;
}

const inputStyle = {
  backgroundColor: M3.colors.surfaceVariant,
  borderRadius: M3.shape.medium,
  padding: 10,
  color: M3.colors.onSurface,
  fontSize: 16,
  fontFamily: "BebasNeue_400Regular",
  borderWidth: 1,
  borderColor: M3.colors.outline,
  textAlign: "center" as const,
};

export function SetFormFields({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  extraActions,
}: SetFormFieldsProps) {
  const { exerciseType } = form;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(exerciseType === "weight_reps" || exerciseType === "bodyweight_reps") && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                {exerciseType === "bodyweight_reps" ? "Added load (kg)" : "Weight (kg)"}
              </Text>
              <TextInput
                value={form.weight}
                onChangeText={(value) => onChange({ weight: value })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                Reps
              </Text>
              <TextInput
                value={form.reps}
                onChangeText={(value) => onChange({ reps: value })}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                RPE
              </Text>
              <TextInput
                value={form.rpe}
                onChangeText={(value) => onChange({ rpe: value })}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
          </>
        )}

        {exerciseType === "reps_only" && (
          <>
            <View style={{ flex: 2 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                Reps / Count
              </Text>
              <TextInput
                value={form.reps}
                onChangeText={(value) => onChange({ reps: value })}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                RPE
              </Text>
              <TextInput
                value={form.rpe}
                onChangeText={(value) => onChange({ rpe: value })}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
          </>
        )}

        {exerciseType === "duration" && (
          <View style={{ flex: 1 }}>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
              Duration (seconds)
            </Text>
            <TextInput
              value={form.durationSec}
              onChangeText={(value) => onChange({ durationSec: value })}
              keyboardType="number-pad"
              placeholder="e.g. 60"
              placeholderTextColor={M3.colors.onSurfaceMuted}
              style={inputStyle}
            />
          </View>
        )}

        {exerciseType === "distance_duration" && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                Distance (km)
              </Text>
              <TextInput
                value={form.distanceKm}
                onChangeText={(value) => onChange({ distanceKm: value })}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                Duration (min)
              </Text>
              <TextInput
                value={form.durationMin}
                onChangeText={(value) => onChange({ durationMin: value })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={M3.colors.onSurfaceMuted}
                style={inputStyle}
              />
            </View>
          </>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(exerciseType === "weight_reps" || exerciseType === "reps_only") && (
          <TouchableOpacity
            onPress={() => onChange({ isWarmup: !form.isWarmup })}
            style={{
              flex: 1,
              backgroundColor: form.isWarmup ? M3.colors.warningContainer : M3.colors.surfaceVariant,
              borderRadius: 8,
              padding: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: form.isWarmup ? M3.colors.warning : M3.colors.surfaceContainer,
            }}
          >
            <Text style={{ color: form.isWarmup ? M3.colors.warning : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
              Warmup
            </Text>
          </TouchableOpacity>
        )}

        {extraActions}

        <TouchableOpacity
          onPress={() => fireAndLog(onSubmit(), "Workout set submission failed")}
          style={{
            flex: 2,
            backgroundColor: M3.colors.primary,
            borderRadius: 8,
            padding: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: M3.colors.background, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
            {submitLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCancel}
          style={{
            backgroundColor: M3.colors.surfaceVariant,
            borderRadius: 8,
            padding: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="x" size={16} color={M3.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
