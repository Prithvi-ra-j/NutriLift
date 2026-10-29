import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../ui/Button";
import { M3 } from "../../design-system/tokens";
import type { FoodParseResult, ParsedFoodItem } from "../../lib/ai/schemas";

interface VoiceFoodReviewProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  parsedFood: FoodParseResult | null;
  onParseTranscript: () => void;
  onUpdateItem: (index: number, changes: Partial<ParsedFoodItem>) => void;
  isProcessing: boolean;
  isConfirming: boolean;
  onRequestSave: () => void;
  onConfirmSave: () => void;
  onCancelConfirm: () => void;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: M3.colors.surface,
    borderRadius: M3.shape.large,
    padding: 16,
    borderWidth: 1,
    borderColor: M3.colors.outline,
    gap: 12,
  },
  sectionLabel: {
    color: M3.colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: M3.colors.outline,
    borderRadius: M3.shape.small,
    paddingHorizontal: 12,
    color: M3.colors.onSurface,
    backgroundColor: M3.colors.surfaceVariant,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  transcript: { minHeight: 96, paddingVertical: 12 },
  item: {
    backgroundColor: M3.colors.surfaceVariant,
    borderRadius: M3.shape.medium,
    padding: 12,
    gap: 8,
  },
  macroRow: { flexDirection: "row", gap: 8 },
  macroInput: { flex: 1, minWidth: 0 },
  note: {
    color: M3.colors.warning,
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
  },
  confirmation: {
    borderWidth: 1,
    borderColor: M3.colors.primary,
    borderRadius: M3.shape.medium,
    padding: 12,
    gap: 8,
  },
  confirmationText: {
    color: M3.colors.onSurface,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
});

export function VoiceFoodReview({
  transcript,
  onTranscriptChange,
  parsedFood,
  onParseTranscript,
  onUpdateItem,
  isProcessing,
  isConfirming,
  onRequestSave,
  onConfirmSave,
  onCancelConfirm,
}: VoiceFoodReviewProps) {
  if (!transcript) return null;

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionLabel}>TRANSCRIPT REVIEW</Text>
      <TextInput
        accessibilityLabel="Edit voice transcript"
        multiline
        onChangeText={onTranscriptChange}
        style={[styles.input, styles.transcript]}
        value={transcript}
      />

      {!parsedFood ? (
        <Button
          disabled={isProcessing || transcript.trim().length === 0}
          label="Review food items"
          loading={isProcessing}
          onPress={onParseTranscript}
          testID="voice.parse"
        />
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            EDIT FOOD ITEMS ({parsedFood.items.length})
          </Text>
          {parsedFood.items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.item}>
              <TextInput
                accessibilityLabel={`Food ${index + 1} name`}
                onChangeText={(name) => onUpdateItem(index, { name })}
                style={styles.input}
                value={item.name}
              />
              <TextInput
                accessibilityLabel={`Food ${index + 1} quantity`}
                onChangeText={(quantity) => onUpdateItem(index, { quantity })}
                style={styles.input}
                value={item.quantity}
              />
              <View style={styles.macroRow}>
                <TextInput
                  accessibilityLabel={`Food ${index + 1} calories`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    onUpdateItem(index, { calories: Number(value) })
                  }
                  style={[styles.input, styles.macroInput]}
                  value={String(item.calories)}
                />
                <TextInput
                  accessibilityLabel={`Food ${index + 1} protein grams`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    onUpdateItem(index, { protein_g: Number(value) })
                  }
                  style={[styles.input, styles.macroInput]}
                  value={String(item.protein_g)}
                />
              </View>
              <View style={styles.macroRow}>
                <TextInput
                  accessibilityLabel={`Food ${index + 1} carbs grams`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    onUpdateItem(index, { carbs_g: Number(value) })
                  }
                  style={[styles.input, styles.macroInput]}
                  value={String(item.carbs_g)}
                />
                <TextInput
                  accessibilityLabel={`Food ${index + 1} fat grams`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    onUpdateItem(index, { fat_g: Number(value) })
                  }
                  style={[styles.input, styles.macroInput]}
                  value={String(item.fat_g)}
                />
              </View>
              {item.needs_review ? (
                <Text style={styles.note}>
                  Review this estimate before saving.
                </Text>
              ) : null}
            </View>
          ))}
          {parsedFood.parse_notes ? (
            <Text style={styles.note}>{parsedFood.parse_notes}</Text>
          ) : null}
          {isConfirming ? (
            <View style={styles.confirmation}>
              <Text style={styles.confirmationText}>
                Save {parsedFood.items.length} reviewed food item
                {parsedFood.items.length === 1 ? "" : "s"}?
              </Text>
              <Button
                label="Confirm and save"
                onPress={onConfirmSave}
                testID="voice.confirm-save"
              />
              <Button
                label="Back to review"
                onPress={onCancelConfirm}
                testID="voice.cancel-save"
                variant="ghost"
              />
            </View>
          ) : (
            <Button
              label="Save reviewed foods"
              onPress={onRequestSave}
              testID="voice.request-save"
            />
          )}
        </>
      )}
    </View>
  );
}
