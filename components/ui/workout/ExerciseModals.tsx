import { Modal, View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { M3 } from "../../../design-system/tokens";
import type { ExerciseType } from "../../../lib/constants/exercises";

interface ExerciseEntry {
  name: string;
  muscle_group: string;
  equipment: string;
  exercise_type: ExerciseType;
}

// ─── Add Exercise Modal ───────────────────────────────────────────────────────

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseSearch: string;
  onSearchChange: (v: string) => void;
  filteredExercises: ExerciseEntry[];
  onAddExercise: (name: string, muscle: string, equip: string, type: ExerciseType) => void;
  onOpenCreateCustom: () => void;
}

export function AddExerciseModal({
  visible,
  onClose,
  exerciseSearch,
  onSearchChange,
  filteredExercises,
  onAddExercise,
  onOpenCreateCustom,
}: AddExerciseModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, gap: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                ADD EXERCISE
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={exerciseSearch}
              onChangeText={onSearchChange}
              placeholder="Search exercises..."
              placeholderTextColor={M3.colors.onSurfaceMuted}
              style={{
                backgroundColor: M3.colors.surface,
                borderRadius: 8,
                padding: 12,
                color: M3.colors.onSurface,
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                borderWidth: 1,
                borderColor: M3.colors.surfaceContainer,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {filteredExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.name}
                    onPress={() => onAddExercise(ex.name, ex.muscle_group, ex.equipment, ex.exercise_type)}
                    style={{
                      backgroundColor: M3.colors.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: M3.colors.surfaceContainer,
                      padding: 14,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
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
                    <Feather name="plus" size={16} color={M3.colors.primary} />
                  </TouchableOpacity>
                ))}

                {filteredExercises.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: 20 }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                      No exercises found for "{exerciseSearch}"
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={onOpenCreateCustom}
                  style={{
                    backgroundColor: M3.colors.secondaryContainer,
                    borderRadius: 10, padding: 16, alignItems: "center",
                    marginTop: 10, flexDirection: "row", justifyContent: "center", gap: 8,
                  }}
                >
                  <Feather name="edit-3" size={16} color={M3.colors.secondary} />
                  <Text style={{ color: M3.colors.secondary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                    Create Custom Exercise
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

// ─── Create Custom Exercise Modal ────────────────────────────────────────────

interface CreateCustomExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (v: string) => void;
  exerciseType: ExerciseType;
  onTypeChange: (t: ExerciseType) => void;
  muscleGroup: string;
  onMuscleChange: (v: string) => void;
  onSave: () => void;
}

export function CreateCustomExerciseModal({
  visible, onClose, name, onNameChange,
  exerciseType, onTypeChange, muscleGroup, onMuscleChange, onSave,
}: CreateCustomExerciseModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 20, gap: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                CREATE CUSTOM EXERCISE
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
                  <TextInput
                    value={name} onChangeText={onNameChange}
                    placeholder="e.g. Bouldering" placeholderTextColor={M3.colors.onSurfaceMuted}
                    style={{ backgroundColor: M3.colors.surface, borderRadius: 8, padding: 12, color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_400Regular", borderWidth: 1, borderColor: M3.colors.surfaceContainer }}
                  />
                </View>
                <View>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                    Exercise Type
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {(["weight_reps", "reps_only", "duration", "distance_duration"] as ExerciseType[]).map((type) => (
                      <TouchableOpacity
                        key={type} onPress={() => onTypeChange(type)}
                        style={{ backgroundColor: exerciseType === type ? M3.colors.primaryContainer : M3.colors.surfaceVariant, borderWidth: 1, borderColor: exerciseType === type ? M3.colors.primary : M3.colors.surfaceContainer, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
                      >
                        <Text style={{ color: exerciseType === type ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                          {type === "weight_reps" ? "Weight + Reps" : type === "reps_only" ? "Reps Only" : type === "duration" ? "Time Based" : "Cardio"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                    Muscle Group (Optional)
                  </Text>
                  <TextInput
                    value={muscleGroup} onChangeText={onMuscleChange}
                    placeholder="e.g. full body" placeholderTextColor={M3.colors.onSurfaceMuted}
                    style={{ backgroundColor: M3.colors.surface, borderRadius: 8, padding: 12, color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_400Regular", borderWidth: 1, borderColor: M3.colors.surfaceContainer }}
                  />
                </View>
                <TouchableOpacity
                  onPress={onSave}
                  style={{ backgroundColor: M3.colors.primary, borderRadius: 8, padding: 16, alignItems: "center", marginTop: 20 }}
                >
                  <Text style={{ color: M3.colors.background, fontSize: 14, fontFamily: "DMSans_700Bold" }}>
                    Save & Add to Workout
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
