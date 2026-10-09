import { Modal, View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../../design-system/tokens";
import type { ExerciseType } from "../../../lib/constants/exercises";

// ─── Template Selector Modal ──────────────────────────────────────────────────

interface TemplateExercise {
  name: string;
  muscle_group: string;
  equipment: string;
  sets: number;
  reps: string;
}

interface TemplateSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDayType: string;
  templateExercises: TemplateExercise[];
  selectedExercises: Set<string>;
  onToggleExercise: (name: string) => void;
  onAdd: () => void;
}

export function TemplateSelectorModal({
  visible, onClose, selectedDayType, templateExercises,
  selectedExercises, onToggleExercise, onAdd,
}: TemplateSelectorModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, gap: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                {selectedDayType} TEMPLATE
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
              Select exercises to add to your workout
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {templateExercises.map((ex) => {
                  const isSelected = selectedExercises.has(ex.name);
                  return (
                    <TouchableOpacity
                      key={ex.name}
                      onPress={() => onToggleExercise(ex.name)}
                      style={{
                        backgroundColor: isSelected ? M3.colors.primaryContainer : M3.colors.surface,
                        borderRadius: 10, borderWidth: 1,
                        borderColor: isSelected ? M3.colors.primary : M3.colors.surfaceContainer,
                        padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                          {ex.name}
                        </Text>
                        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2, textTransform: "capitalize" }}>
                          {ex.muscle_group} · {ex.equipment} · {ex.sets} sets × {ex.reps} reps
                        </Text>
                      </View>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                        borderColor: isSelected ? M3.colors.primary : M3.colors.onSurfaceMuted,
                        backgroundColor: isSelected ? M3.colors.primary : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && <Feather name="check" size={14} color={M3.colors.background} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={onAdd}
              disabled={selectedExercises.size === 0}
              style={{
                backgroundColor: selectedExercises.size > 0 ? M3.colors.primary : M3.colors.surfaceVariant,
                borderRadius: 8, padding: 16, flexDirection: "row",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Feather name="check" size={18} color={selectedExercises.size > 0 ? M3.colors.background : M3.colors.onSurfaceMuted} />
              <Text style={{ color: selectedExercises.size > 0 ? M3.colors.background : M3.colors.onSurfaceMuted, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                Add {selectedExercises.size} Exercise{selectedExercises.size !== 1 && "s"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Swap Exercise Modal ──────────────────────────────────────────────────────

interface SwapExerciseEntry {
  name: string;
  muscle_group: string;
  equipment: string;
  exercise_type: ExerciseType;
}

interface SwapExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  swapSearch: string;
  onSearchChange: (v: string) => void;
  exercises: SwapExerciseEntry[];
  onSwap: (name: string) => void;
}

export function SwapExerciseModal({
  visible, onClose, swapSearch, onSearchChange, exercises, onSwap,
}: SwapExerciseModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, gap: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                SWAP EXERCISE
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
              Choose a replacement — existing sets will be kept
            </Text>

            <TextInput
              value={swapSearch}
              onChangeText={onSearchChange}
              placeholder="Search exercises..."
              placeholderTextColor={M3.colors.onSurfaceMuted}
              style={{
                backgroundColor: M3.colors.surface, borderRadius: 8, padding: 12,
                color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_400Regular",
                borderWidth: 1, borderColor: M3.colors.surfaceContainer,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {exercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.name}
                    onPress={() => onSwap(ex.name)}
                    style={{
                      backgroundColor: M3.colors.surface, borderRadius: 10, borderWidth: 1,
                      borderColor: M3.colors.surfaceContainer, padding: 14,
                      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                        {ex.name}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 3, alignItems: "center" }}>
                        <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", textTransform: "capitalize" }}>
                          {ex.muscle_group} · {ex.equipment}
                        </Text>
                        <View style={{
                          backgroundColor:
                            ex.exercise_type === "weight_reps" ? M3.colors.primaryContainer :
                            ex.exercise_type === "reps_only" ? M3.colors.secondaryContainer :
                            ex.exercise_type === "duration" ? M3.colors.warningContainer : M3.colors.errorContainer,
                          borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1,
                        }}>
                          <Text style={{
                            fontSize: 9, fontFamily: "DMSans_700Bold",
                            color:
                              ex.exercise_type === "weight_reps" ? M3.colors.primary :
                              ex.exercise_type === "reps_only" ? M3.colors.secondary :
                              ex.exercise_type === "duration" ? M3.colors.warning : M3.colors.error,
                          }}>
                            {ex.exercise_type === "weight_reps" ? "WEIGHT" :
                              ex.exercise_type === "reps_only" ? "REPS" :
                              ex.exercise_type === "duration" ? "TIME" : "CARDIO"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Feather name="repeat" size={16} color={M3.colors.secondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Edit Logged Exercise Modal ───────────────────────────────────────────────

interface EditExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (v: string) => void;
  muscleGroup: string;
  onMuscleChange: (v: string) => void;
  equipment: string;
  onEquipChange: (v: string) => void;
  onSave: () => void;
}

export function EditExerciseModal({
  visible, onClose, name, onNameChange,
  muscleGroup, onMuscleChange, equipment, onEquipChange, onSave,
}: EditExerciseModalProps) {
  const inputStyle = {
    backgroundColor: M3.colors.surface, borderRadius: 8, padding: 12,
    color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_400Regular" as const,
    borderWidth: 1, borderColor: M3.colors.surfaceContainer,
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, gap: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                EDIT LOGGED EXERCISE
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                    Exercise Name
                  </Text>
                  <TextInput value={name} onChangeText={onNameChange} style={inputStyle} />
                </View>
                <View>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                    Muscle Group (Optional)
                  </Text>
                  <TextInput
                    value={muscleGroup} onChangeText={onMuscleChange}
                    placeholder="e.g. chest" placeholderTextColor={M3.colors.onSurfaceMuted}
                    style={inputStyle}
                  />
                </View>
                <View>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                    Equipment (Optional)
                  </Text>
                  <TextInput
                    value={equipment} onChangeText={onEquipChange}
                    placeholder="e.g. barbell" placeholderTextColor={M3.colors.onSurfaceMuted}
                    style={inputStyle}
                  />
                </View>
                <TouchableOpacity
                  onPress={onSave}
                  style={{ backgroundColor: M3.colors.primary, borderRadius: 8, padding: 16, alignItems: "center", marginTop: 20 }}
                >
                  <Text style={{ color: M3.colors.background, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
