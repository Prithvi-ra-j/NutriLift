import { Feather } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { calculateEpley1RM } from "../../lib/data";
import type { ExerciseLog, SetLog, WorkoutSession } from "../../lib/data/types";
import type { ExerciseType } from "../../lib/constants/exercises";
import { Card } from "../ui/Card";
import { PRBadge } from "../ui/PRBadge";
import { M3 } from "../../design-system/tokens";
import { SetFormFields } from "./SetFormFields";
import { setLabel, type SetForm } from "./workoutTypes";

interface ExerciseListProps {
  addSetForm: SetForm | null;
  editSetForm: SetForm | null;
  editingSetId: string | null;
  exercises: ExerciseLog[];
  isSunday: boolean;
  onChangeAddSet: (partial: Partial<SetForm>) => void;
  onChangeEditSet: (partial: Partial<SetForm>) => void;
  onDeleteExercise: (exercise: ExerciseLog) => void;
  onDeleteSet: (set: SetLog, exercise: ExerciseLog) => void;
  onEditExercise: (exercise: ExerciseLog) => void;
  onLogSet: () => Promise<void>;
  onOpenEditSet: (set: SetLog, exercise: ExerciseLog) => void;
  onSaveEditSet: () => Promise<void>;
  onStartAddSet: (exercise: ExerciseLog) => void;
  onSwapExercise: (exercise: ExerciseLog) => void;
  onCancelAddSet: () => void;
  onCancelEditSet: () => void;
  progressionAlerts: Record<string, string>;
  session: WorkoutSession | null;
  sets: Record<string, SetLog[]>;
}

export function ExerciseList({
  addSetForm,
  editSetForm,
  editingSetId,
  exercises,
  isSunday,
  onChangeAddSet,
  onChangeEditSet,
  onDeleteExercise,
  onDeleteSet,
  onEditExercise,
  onLogSet,
  onOpenEditSet,
  onSaveEditSet,
  onStartAddSet,
  onSwapExercise,
  onCancelAddSet,
  onCancelEditSet,
  progressionAlerts,
  session,
  sets,
}: ExerciseListProps) {
  return (
    <>
      {exercises.map((exercise) => {
        const exerciseSets = sets[exercise.id] ?? [];
        const exType = (exercise.exercise_type as ExerciseType) ?? "weight_reps";
        const workingSets = exerciseSets.filter((set) => !set.is_warmup);
        const isStrengthType =
          exType === "weight_reps" || exType === "bodyweight_reps";
        const totalVolume = isStrengthType
          ? workingSets.reduce((total, set) => total + set.weight_kg * set.reps, 0)
          : 0;
        const topSet = isStrengthType
          ? workingSets.reduce(
              (best, set) => (set.weight_kg > (best?.weight_kg ?? 0) ? set : best),
              workingSets[0],
            )
          : null;
        const estimated1RM = topSet
          ? calculateEpley1RM(topSet.weight_kg, topSet.reps)
          : null;

        return (
          <Card key={exercise.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                  {exercise.exercise_name}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 3 }}>
                  <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                      {exercise.muscle_group}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                      {exercise.equipment}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: "#0D2D24", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: M3.colors.primary, fontSize: 10, fontFamily: "DMSans_500Medium" }}>
                      {exType === "weight_reps" ? "Weight" : exType === "reps_only" ? "Reps" : exType === "duration" ? "Duration" : "Cardio"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {exType === "weight_reps" && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                      {totalVolume.toFixed(0)}kg vol
                    </Text>
                    {!!estimated1RM && (
                      <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                        ~{estimated1RM.toFixed(0)}kg 1RM
                      </Text>
                    )}
                  </View>
                )}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity onPress={() => onEditExercise(exercise)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="edit-2" size={15} color={M3.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onSwapExercise(exercise)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="repeat" size={15} color={M3.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteExercise(exercise)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={15} color={M3.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {!!progressionAlerts[exercise.id] && (
              <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 6, padding: 8, marginBottom: 8, flexDirection: "row", gap: 6 }}>
                <Feather name="trending-up" size={12} color={M3.colors.warning} />
                <Text style={{ color: M3.colors.warning, fontSize: 11, fontFamily: "DMSans_500Medium", flex: 1 }}>
                  {progressionAlerts[exercise.id]}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {exerciseSets.map((set) => {
                const isEditing = editingSetId === set.id;
                return (
                  <View key={set.id}>
                    {!isEditing && (
                      <TouchableOpacity
                        onPress={() => onOpenEditSet(set, exercise)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: set.is_warmup ? M3.colors.surfaceVariant : M3.colors.surfaceContainer,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: "transparent",
                        }}
                      >
                        <Text style={{ color: set.is_warmup ? M3.colors.onSurfaceMuted : M3.colors.onSurface, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                          {setLabel(set, exType)}
                        </Text>
                        {set.is_pr === 1 && <PRBadge />}
                        <Feather name="edit-2" size={9} color={M3.colors.onSurfaceMuted} style={{ marginLeft: 1 }} />
                      </TouchableOpacity>
                    )}
                    {isEditing && editSetForm && (
                      <View style={{
                        backgroundColor: M3.colors.surface,
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: M3.colors.secondary,
                        marginTop: 4,
                        gap: 6,
                        width: "100%",
                      }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <Text style={{ color: M3.colors.secondary, fontSize: 11, fontFamily: "DMSans_700Bold" }}>
                            EDIT SET {set.set_number}
                          </Text>
                          <TouchableOpacity onPress={() => onDeleteSet(set, exercise)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Feather name="trash-2" size={13} color={M3.colors.error} />
                          </TouchableOpacity>
                        </View>
                        <SetFormFields
                          form={editSetForm}
                          onChange={onChangeEditSet}
                          onSubmit={onSaveEditSet}
                          onCancel={onCancelEditSet}
                          submitLabel="Save"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {addSetForm?.exerciseLogId === exercise.id ? (
              <SetFormFields
                form={addSetForm}
                onChange={onChangeAddSet}
                onSubmit={onLogSet}
                onCancel={onCancelAddSet}
                submitLabel="Log Set"
              />
            ) : (
              !editingSetId && (
                <TouchableOpacity
                  onPress={() => onStartAddSet(exercise)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
                >
                  <Feather name="plus" size={14} color={M3.colors.primary} />
                  <Text style={{ color: M3.colors.primary, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    Add Set
                  </Text>
                </TouchableOpacity>
              )
            )}
          </Card>
        );
      })}

      {exercises.length === 0 && !session && (
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 20, gap: 12 }}>
            <Feather name={isSunday ? "activity" : "zap"} size={48} color={M3.colors.onSurfaceMuted} />
            <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
              No exercises yet
            </Text>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" }}>
              {isSunday
                ? "Select Cardio & Recovery above and add exercises"
                : "Select a day type above and use the template to get started"}
            </Text>
          </View>
        </Card>
      )}

      {session && exercises.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Card elevated style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Feather name="info" size={12} color={M3.colors.secondary} />
              <Text style={{ color: M3.colors.secondary, fontSize: 10, fontFamily: "DMSans_700Bold" }}>RPE</Text>
            </View>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
              Rate of Perceived Exertion (1-10). How hard the set felt.
            </Text>
          </Card>
          <Card elevated style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Feather name="info" size={12} color={M3.colors.primary} />
              <Text style={{ color: M3.colors.primary, fontSize: 10, fontFamily: "DMSans_700Bold" }}>VOLUME</Text>
            </View>
            <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 10, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
              Weight × reps (weight exercises only). 1t = 1,000kg
            </Text>
          </Card>
        </View>
      )}
    </>
  );
}
