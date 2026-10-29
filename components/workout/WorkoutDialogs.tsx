import { memo } from "react";
import { Feather } from "@expo/vector-icons";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { type DayType, type ExerciseType } from "../../lib/constants/exercises";
import { EXERCISE_LIBRARY } from "../../lib/constants/exercises";
import { WORKOUT_TEMPLATES } from "../../lib/constants/workout-templates";
import { M3 } from "../../design-system/tokens";
import { fireAndLog } from "../../lib/async";
import { useWorkoutUiReducer } from "./workoutUiReducer";

interface ExerciseOption {
  name: string;
  muscle_group: string;
  equipment: string;
  exercise_type: ExerciseType;
  day_types: DayType[];
}

type WorkoutUi = ReturnType<typeof useWorkoutUiReducer>;

interface WorkoutDialogsProps {
  ui: WorkoutUi["state"];
  setUi: WorkoutUi["setField"];
  filteredExercises: ExerciseOption[];
  swapFilteredExercises: ExerciseOption[];
  addExercise: (name: string, muscle: string, equipment: string, type: ExerciseType) => Promise<void>;
  createCustomExercise: () => Promise<void>;
  addExercisesFromTemplate: () => Promise<void>;
  swapExercise: (name: string) => Promise<void>;
  saveEditExercise: () => Promise<void>;
}

export function WorkoutDialogs(props: WorkoutDialogsProps) {
  return (
    <>
      <ExercisePicker {...props} />
      <CustomExerciseForm {...props} />
      <TemplateSheet {...props} />
      <SwapExerciseSheet {...props} />
      <EditExerciseDialog {...props} />
    </>
  );
}

const ExerciseOptionRow = memo(function ExerciseOptionRow({
  exercise,
  icon,
  onPress,
}: {
  exercise: ExerciseOption;
  icon: "plus" | "repeat";
  onPress: () => void;
}) {
  const accent = exercise.exercise_type === "weight_reps"
    ? M3.colors.primary
    : exercise.exercise_type === "reps_only"
      ? M3.colors.secondary
      : exercise.exercise_type === "duration"
        ? M3.colors.warning
        : M3.colors.error;
  const badgeColor = exercise.exercise_type === "weight_reps"
    ? M3.colors.primaryContainer
    : exercise.exercise_type === "reps_only"
      ? M3.colors.secondaryContainer
      : exercise.exercise_type === "duration"
        ? M3.colors.warningContainer
        : M3.colors.errorContainer;

  return (
    <TouchableOpacity
      accessibilityLabel={`${icon === "plus" ? "Add" : "Replace with"} ${exercise.name}, ${exercise.muscle_group}, ${exercise.equipment}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 64,
        backgroundColor: M3.colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: M3.colors.surfaceContainer,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
      testID={`workout.exercise.${exercise.name}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: M3.colors.onSurface, fontSize: 14, fontFamily: "DMSans_500Medium" }}>
          {exercise.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 3, alignItems: "center" }}>
          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", textTransform: "capitalize" }}>
            {exercise.muscle_group} · {exercise.equipment}
          </Text>
          <View style={{ backgroundColor: badgeColor, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, fontFamily: "DMSans_700Bold", color: accent }}>
              {exercise.exercise_type === "weight_reps"
                ? "WEIGHT"
                : exercise.exercise_type === "reps_only"
                  ? "REPS"
                  : exercise.exercise_type === "duration"
                    ? "TIME"
                    : "CARDIO"}
            </Text>
          </View>
        </View>
      </View>
      <Feather name={icon} size={16} color={icon === "plus" ? M3.colors.primary : M3.colors.secondary} />
    </TouchableOpacity>
  );
});

function ExercisePicker(props: WorkoutDialogsProps) {
  return (
    <>
      <Modal visible={props.ui.showAddExercise} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  ADD EXERCISE
                </Text>
                <TouchableOpacity onPress={() => props.setUi("showAddExercise", false)}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <TextInput
                value={props.ui.exerciseSearch}
                onChangeText={(value) => props.setUi("exerciseSearch", value)}
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

              <FlashList
                data={props.filteredExercises}
                keyExtractor={(exercise) => exercise.name}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={{ color: M3.colors.onSurfaceVariant, paddingVertical: 20 }}>
                    No exercises found for "{props.ui.exerciseSearch}"
                  </Text>
                }
                ListFooterComponent={
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => props.setUi("showCreateCustom", true)}
                    style={{
                      minHeight: 48,
                      backgroundColor: M3.colors.secondaryContainer,
                      borderRadius: 10,
                      padding: 16,
                      alignItems: "center",
                      marginTop: 10,
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    testID="workout.create-custom-exercise"
                  >
                    <Feather name="edit-3" size={16} color={M3.colors.secondary} />
                    <Text style={{ color: M3.colors.secondary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                      Create Custom Exercise
                    </Text>
                  </TouchableOpacity>
                }
                renderItem={({ item }) => (
                  <ExerciseOptionRow
                    exercise={item}
                    icon="plus"
                    onPress={() => fireAndLog(
                      props.addExercise(item.name, item.muscle_group, item.equipment, item.exercise_type),
                      "Exercise add failed",
                    )}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function CustomExerciseForm(props: WorkoutDialogsProps) {
  return (
    <>
      <Modal visible={props.ui.showCreateCustom} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  CREATE CUSTOM EXERCISE
                </Text>
                <TouchableOpacity onPress={() => props.setUi("showCreateCustom", false)}>
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
                      value={props.ui.customExName}
                      onChangeText={(value) => props.setUi("customExName", value)}
                      placeholder="e.g. Bouldering"
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
                  </View>

                  <View>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Exercise Type
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {(["weight_reps", "reps_only", "duration", "distance_duration"] as ExerciseType[]).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => props.setUi("customExType", type)}
                          style={{
                            backgroundColor: props.ui.customExType === type ? M3.colors.primaryContainer : M3.colors.surfaceVariant,
                            borderWidth: 1,
                            borderColor: props.ui.customExType === type ? M3.colors.primary : M3.colors.surfaceContainer,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                          }}
                        >
                          <Text style={{ color: props.ui.customExType === type ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
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
                      value={props.ui.customExMuscle}
                      onChangeText={(value) => props.setUi("customExMuscle", value)}
                      placeholder="e.g. full body"
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
                  </View>

                  <TouchableOpacity
                    onPress={() => fireAndLog(props.createCustomExercise(), "Custom exercise creation failed")}
                    style={{
                      backgroundColor: M3.colors.primary,
                      borderRadius: 8,
                      padding: 16,
                      alignItems: "center",
                      marginTop: 20,
                    }}
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
    </>
  );
}

function TemplateSheet(props: WorkoutDialogsProps) {
  return (
    <>
      <Modal visible={props.ui.showTemplateSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  {props.ui.selectedDayType} TEMPLATE
                </Text>
                <TouchableOpacity onPress={() => props.setUi("showTemplateSelector", false)}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                Select exercises to add to your workout
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {(WORKOUT_TEMPLATES[props.ui.selectedDayType] || []).map((ex) => {
                    const isSelected = props.ui.selectedTemplateExercises.has(ex.name);
                    const libEntry = EXERCISE_LIBRARY.find((e) => e.name === ex.name);
                    return (
                      <TouchableOpacity
                        key={ex.name}
                        onPress={() => {
                          props.setUi("selectedTemplateExercises", (prev) => {
                            const next = new Set(prev);
                            if (next.has(ex.name)) next.delete(ex.name);
                            else next.add(ex.name);
                            return next;
                          });
                        }}
                        style={{
                          backgroundColor: isSelected ? M3.colors.primaryContainer : M3.colors.surface,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? M3.colors.primary : M3.colors.surfaceContainer,
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
                          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2, textTransform: "capitalize" }}>
                            {ex.muscle_group} · {ex.equipment} · {ex.sets} sets × {ex.reps} reps
                          </Text>
                        </View>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: isSelected ? M3.colors.primary : M3.colors.onSurfaceMuted,
                          backgroundColor: isSelected ? M3.colors.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          {isSelected && <Feather name="check" size={14} color={M3.colors.background} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => fireAndLog(props.addExercisesFromTemplate(), "Template exercise addition failed")}
                disabled={props.ui.selectedTemplateExercises.size === 0}
                style={{
                  backgroundColor: props.ui.selectedTemplateExercises.size > 0 ? M3.colors.primary : M3.colors.surfaceVariant,
                  borderRadius: 8,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="check" size={18} color={props.ui.selectedTemplateExercises.size > 0 ? M3.colors.background : M3.colors.onSurfaceMuted} />
                <Text style={{ color: props.ui.selectedTemplateExercises.size > 0 ? M3.colors.background : M3.colors.onSurfaceMuted, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  Add {props.ui.selectedTemplateExercises.size} Exercise{props.ui.selectedTemplateExercises.size !== 1 && 's'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function SwapExerciseSheet(props: WorkoutDialogsProps) {
  return (
    <>
      <Modal visible={!!props.ui.swapExerciseId} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  SWAP EXERCISE
                </Text>
                <TouchableOpacity onPress={() => { props.setUi("swapExerciseId", null); props.setUi("swapSearch", ""); }}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                Choose a replacement — existing sets will be kept
              </Text>

              <TextInput
                value={props.ui.swapSearch}
                onChangeText={(value) => props.setUi("swapSearch", value)}
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

              <FlashList
                data={props.swapFilteredExercises}
                keyExtractor={(exercise) => exercise.name}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={{ color: M3.colors.onSurfaceVariant, paddingVertical: 20 }}>
                    No exercises match this search.
                  </Text>
                }
                renderItem={({ item }) => (
                  <ExerciseOptionRow
                    exercise={item}
                    icon="repeat"
                    onPress={() => fireAndLog(
                      props.swapExercise(item.name),
                      "Exercise replacement failed",
                    )}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function EditExerciseDialog(props: WorkoutDialogsProps) {
  return (
    <>
      <Modal visible={!!props.ui.editingExerciseId} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  EDIT LOGGED EXERCISE
                </Text>
                <TouchableOpacity onPress={() => props.setUi("editingExerciseId", null)}>
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
                      value={props.ui.editExerciseName}
                      onChangeText={(value) => props.setUi("editExerciseName", value)}
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
                  </View>
                  
                  <View>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Muscle Group (Optional)
                    </Text>
                    <TextInput
                      value={props.ui.editExerciseMuscle}
                      onChangeText={(value) => props.setUi("editExerciseMuscle", value)}
                      placeholder="e.g. chest"
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
                  </View>

                  <View>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Equipment (Optional)
                    </Text>
                    <TextInput
                      value={props.ui.editExerciseEquip}
                      onChangeText={(value) => props.setUi("editExerciseEquip", value)}
                      placeholder="e.g. barbell"
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
                  </View>

                  <TouchableOpacity
                    onPress={() => fireAndLog(props.saveEditExercise(), "Exercise update failed")}
                    style={{
                      backgroundColor: M3.colors.primary,
                      borderRadius: 8,
                      padding: 16,
                      alignItems: "center",
                      marginTop: 20,
                    }}
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
    </>
  );
}
