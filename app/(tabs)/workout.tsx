import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTodayStore } from "../../lib/stores/today.store";
import {
  getSessionsForDate,
  getExercisesForSession,
  getSetsForExercise,
  insertSession,
  insertExerciseLog,
  insertSetLog,
  checkDoubleProgression,
  getLastWeightForExercise,
  calculateEpley1RM,
} from "../../lib/db/queries/workout";
import { DAY_TYPES, EXERCISE_LIBRARY, type DayType } from "../../lib/constants/exercises";
import { WORKOUT_TEMPLATES, type ExerciseTemplate } from "../../lib/constants/workout-templates";
import { Card } from "../../components/ui/Card";
import { PRBadge } from "../../components/ui/PRBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { DateNavigator } from "../../components/ui/DateNavigator";
import type { WorkoutSession, ExerciseLog, SetLog } from "../../lib/db/schema";
import uuid from "react-native-uuid";

interface AddSetForm {
  exerciseLogId: string;
  exerciseName: string;
  weight: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
}

export default function WorkoutScreen() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  // Determine default day type based on day of week
  const getDefaultDayType = (dateStr: string): DayType => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    // Sunday = Cardio (Marathon day)
    if (dayOfWeek === 0) return "Cardio";
    
    // Monday = Push A, Tuesday = Pull A, Wednesday = Legs A
    // Thursday = Push B, Friday = Pull B, Saturday = Legs B
    const dayTypeMap: Record<number, DayType> = {
      1: "Push A", // Monday
      2: "Pull A", // Tuesday
      3: "Legs A", // Wednesday
      4: "Push B", // Thursday
      5: "Pull B", // Friday
      6: "Legs B", // Saturday
    };
    
    return dayTypeMap[dayOfWeek] || "Push A";
  };
  
  // Local state for current date's workout (not using global store)
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [sets, setSets] = useState<Record<string, SetLog[]>>({});

  const [selectedDayType, setSelectedDayType] = useState<DayType>(getDefaultDayType(todayStr));
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateExercises, setSelectedTemplateExercises] = useState<Set<string>>(new Set());
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [addSetForm, setAddSetForm] = useState<AddSetForm | null>(null);
  const [progressionAlerts, setProgressionAlerts] = useState<Record<string, string>>({});
  const [completedDayTypes, setCompletedDayTypes] = useState<Set<string>>(new Set());

  const loadWorkout = useCallback(async () => {
    // Clear state first
    setSession(null);
    setExercises([]);
    setSets({});
    setAddSetForm(null);
    
    const sessions = await getSessionsForDate(selectedDate);
    if (sessions[0]) {
      setSession(sessions[0]);
      setSelectedDayType(sessions[0].day_type as DayType);
      const exs = await getExercisesForSession(sessions[0].id);
      setExercises(exs);
      
      const setsData: Record<string, SetLog[]> = {};
      for (const ex of exs) {
        const s = await getSetsForExercise(ex.id);
        setsData[ex.id] = s;
      }
      setSets(setsData);
    } else {
      // No session - reset to default day type for this date
      setSelectedDayType(getDefaultDayType(selectedDate));
    }
    
    // Load completed day types for current week
    await loadCompletedDayTypes();
  }, [selectedDate]);

  const loadCompletedDayTypes = async () => {
    // Get current week's Monday
    const curr = new Date(selectedDate);
    const first = curr.getDate() - curr.getDay() + 1; // Monday
    const monday = new Date(curr.setDate(first));
    const mondayStr = monday.toISOString().split("T")[0];
    
    // Get all sessions from Monday to today
    const { getSessionsInRange } = await import("../../lib/db/queries/workout");
    const sessions = await getSessionsInRange(mondayStr, selectedDate);
    
    const completed = new Set(sessions.map(s => s.day_type));
    setCompletedDayTypes(completed);
  };

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const ensureSession = async (): Promise<string> => {
    if (session) return session.id;

    // Auto-create session for selected date
    const sessionId = uuid.v4() as string;
    const newSession: WorkoutSession = {
      id: sessionId,
      date: selectedDate,
      day_type: selectedDayType,
      started_at: Math.floor(Date.now() / 1000),
      ended_at: null,
      duration_min: null,
      total_volume_kg: 0,
      notes: null,
      rpe: null,
    };
    await insertSession(newSession);
    setSession(newSession);
    return sessionId;
  };

  const addExercise = async (exerciseName: string, muscleGroup: string, equipment: string) => {
    const sessionId = await ensureSession();
    const exerciseId = uuid.v4() as string;
    const newExercise: ExerciseLog = {
      id: exerciseId,
      session_id: sessionId,
      date: selectedDate,
      exercise_name: exerciseName,
      muscle_group: muscleGroup,
      equipment,
      order_in_session: exercises.length + 1,
    };
    await insertExerciseLog(newExercise);
    setExercises([...exercises, newExercise]);
    setSets(prev => ({ ...prev, [exerciseId]: [] }));
    setShowAddExercise(false);
    setExerciseSearch("");

    // Check double progression
    const dp = await checkDoubleProgression(exerciseName);
    if (dp.shouldProgress) {
      setProgressionAlerts((prev) => ({ ...prev, [exerciseId]: dp.message }));
    }

    // Pre-fill last weight
    const lastWeight = await getLastWeightForExercise(exerciseName);
    setAddSetForm({
      exerciseLogId: exerciseId,
      exerciseName,
      weight: lastWeight?.toString() ?? "",
      reps: "",
      rpe: "",
      isWarmup: false,
    });
  };

  const addExercisesFromTemplate = async () => {
    if (selectedTemplateExercises.size === 0) {
      Alert.alert("No Exercises Selected", "Please select at least one exercise.");
      return;
    }

    const sessionId = await ensureSession();
    const template = WORKOUT_TEMPLATES[selectedDayType] || [];
    const selectedExercises = template.filter(ex => selectedTemplateExercises.has(ex.name));

    for (const ex of selectedExercises) {
      const exerciseId = uuid.v4() as string;
      const newExercise: ExerciseLog = {
        id: exerciseId,
        session_id: sessionId,
        date: selectedDate,
        exercise_name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        order_in_session: exercises.length + 1,
      };
      await insertExerciseLog(newExercise);
      setExercises(prev => [...prev, newExercise]);
      setSets(prev => ({ ...prev, [exerciseId]: [] }));
    }

    setShowTemplateSelector(false);
    setSelectedTemplateExercises(new Set());
    loadWorkout();
  };

  const logSet = async () => {
    if (!addSetForm) return;
    const weight = parseFloat(addSetForm.weight);
    const reps = parseInt(addSetForm.reps);
    if (isNaN(weight) || isNaN(reps) || reps <= 0) {
      Alert.alert("Invalid Input", "Enter valid weight and reps.");
      return;
    }

    const setId = uuid.v4() as string;
    const existingSets = sets[addSetForm.exerciseLogId] ?? [];
    const newSet: SetLog = {
      id: setId,
      exercise_log_id: addSetForm.exerciseLogId,
      set_number: existingSets.length + 1,
      weight_kg: weight,
      reps,
      rpe: addSetForm.rpe ? parseInt(addSetForm.rpe) : null,
      is_pr: 0,
      is_warmup: addSetForm.isWarmup ? 1 : 0,
      notes: null,
      logged_at: Math.floor(Date.now() / 1000),
    };

    const { isPR } = await insertSetLog(newSet);
    
    // Update local state
    setSets(prev => ({
      ...prev,
      [addSetForm.exerciseLogId]: [...(prev[addSetForm.exerciseLogId] || []), { ...newSet, is_pr: isPR ? 1 : 0 }]
    }));

    // Reset reps, keep weight
    setAddSetForm((prev) => prev ? { ...prev, reps: "", rpe: "" } : null);

    // Refresh workout
    loadWorkout();
  };

  const filteredExercises = EXERCISE_LIBRARY.filter((e) => {
    // Filter by day type first
    const isSunday = new Date(selectedDate).getDay() === 0;
    if (isSunday) {
      // On Sunday, only show Cardio exercises
      if (!e.day_types.includes("Cardio")) return false;
    } else {
      // On other days, exclude Cardio exercises
      if (e.day_types.includes("Cardio") && e.day_types.length === 1) return false;
    }
    
    // Then filter by search term
    return (
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.muscle_group.toLowerCase().includes(exerciseSearch.toLowerCase())
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#F0F0F5", fontSize: 28, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
            WORKOUT
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddExercise(true)}
            style={{
              backgroundColor: "#00D4AA",
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Feather name="plus" size={16} color="#0A0A0F" />
            <Text style={{ color: "#0A0A0F", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
              Add Exercise
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Date Navigator ── */}
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} showFullDate={false} />

        {/* ── Marathon Day Notice ── */}
        {new Date(selectedDate).getDay() === 0 && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
              <Feather name="activity" size={20} color="#FF4757" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FF4757", fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                  MARATHON DAY
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                  Focus on cardio, stretching, stability, and mobility exercises
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Sunday Cardio Selector ── */}
        {!session && new Date(selectedDate).getDay() === 0 && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                RECOVERY & CARDIO
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedDayType("Cardio")}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: selectedDayType === "Cardio" ? "#FF475722" : "#1A1A26",
                borderWidth: 1,
                borderColor: selectedDayType === "Cardio" ? "#FF4757" : "#252535",
                alignItems: "center",
              }}
            >
              <Text style={{ color: selectedDayType === "Cardio" ? "#FF4757" : "#8080A0", fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                Cardio & Recovery
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Day Type Selector ── */}
        {!session && new Date(selectedDate).getDay() !== 0 && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                SELECT DAY TYPE
              </Text>
              <Text style={{ color: "#4A4A6A", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                Completed this week are hidden
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DAY_TYPES.filter(dt => !completedDayTypes.has(dt)).map((dt) => (
                <TouchableOpacity
                  key={dt}
                  onPress={() => setSelectedDayType(dt)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: selectedDayType === dt ? "#00D4AA22" : "#1A1A26",
                    borderWidth: 1,
                    borderColor: selectedDayType === dt ? "#00D4AA" : "#252535",
                  }}
                >
                  <Text style={{ color: selectedDayType === dt ? "#00D4AA" : "#8080A0", fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    {dt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {WORKOUT_TEMPLATES[selectedDayType]?.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setShowTemplateSelector(true);
                  // Pre-select all exercises
                  const template = WORKOUT_TEMPLATES[selectedDayType] || [];
                  setSelectedTemplateExercises(new Set(template.map(ex => ex.name)));
                }}
                style={{
                  marginTop: 12,
                  backgroundColor: "#3B82F622",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#3B82F6",
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="list" size={16} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                  Use {selectedDayType} Template ({WORKOUT_TEMPLATES[selectedDayType].length} exercises)
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ── Workout Stats ── */}
        {session && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {session.day_type}
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Day Type
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {exercises.length}
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Exercises
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {Object.values(sets).reduce((a, b) => a + b.length, 0)}
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Sets
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#00D4AA", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {((session.total_volume_kg ?? 0) / 1000).toFixed(1)}t
                </Text>
                <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                  Volume
                </Text>
                <Text style={{ color: "#4A4A6A", fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                  ({(session.total_volume_kg ?? 0).toFixed(0)}kg)
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Exercise List ── */}
        {exercises.map((exercise) => {
          const exerciseSets = sets[exercise.id] ?? [];
          const workingSets = exerciseSets.filter((s) => !s.is_warmup);
          const totalVolume = workingSets.reduce((a, s) => a + s.weight_kg * s.reps, 0);
          const topSet = workingSets.reduce(
            (best, s) => (s.weight_kg > (best?.weight_kg ?? 0) ? s : best),
            workingSets[0]
          );
          const estimated1RM = topSet
            ? calculateEpley1RM(topSet.weight_kg, topSet.reps)
            : null;

          return (
            <Card key={exercise.id}>
              {/* Exercise header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#F0F0F5", fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                    {exercise.exercise_name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 3 }}>
                    <View style={{ backgroundColor: "#1A1A26", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#8080A0", fontSize: 10, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                        {exercise.muscle_group}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: "#1A1A26", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#8080A0", fontSize: 10, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                        {exercise.equipment}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
                    {totalVolume.toFixed(0)}kg vol
                  </Text>
                  {!!estimated1RM && (
                    <Text style={{ color: "#4A4A6A", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                      ~{estimated1RM.toFixed(0)}kg 1RM
                    </Text>
                  )}
                </View>
              </View>

              {/* Double progression alert */}
              {!!progressionAlerts[exercise.id] && (
                <View style={{ backgroundColor: "#FFB80022", borderRadius: 6, padding: 8, marginBottom: 8, flexDirection: "row", gap: 6 }}>
                  <Feather name="trending-up" size={12} color="#FFB800" />
                  <Text style={{ color: "#FFB800", fontSize: 11, fontFamily: "DMSans_500Medium", flex: 1 }}>
                    {progressionAlerts[exercise.id]}
                  </Text>
                </View>
              )}

              {/* Set pills */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {exerciseSets.map((set) => (
                  <View
                    key={set.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: set.is_warmup ? "#1A1A26" : "#252535",
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: set.is_warmup ? "#4A4A6A" : "#F0F0F5", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                      {set.weight_kg}kg × {set.reps}
                    </Text>
                    {set.is_pr === 1 && <PRBadge />}
                  </View>
                ))}
              </View>

              {/* Add set inline form */}
              {addSetForm?.exerciseLogId === exercise.id ? (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                        Weight (kg)
                      </Text>
                      <TextInput
                        value={addSetForm.weight}
                        onChangeText={(v) => setAddSetForm((f) => f ? { ...f, weight: v } : null)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#4A4A6A"
                        style={{
                          backgroundColor: "#1A1A26",
                          borderRadius: 8,
                          padding: 10,
                          color: "#F0F0F5",
                          fontSize: 16,
                          fontFamily: "BebasNeue_400Regular",
                          borderWidth: 1,
                          borderColor: "#252535",
                          textAlign: "center",
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                        Reps
                      </Text>
                      <TextInput
                        value={addSetForm.reps}
                        onChangeText={(v) => setAddSetForm((f) => f ? { ...f, reps: v } : null)}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#4A4A6A"
                        style={{
                          backgroundColor: "#1A1A26",
                          borderRadius: 8,
                          padding: 10,
                          color: "#F0F0F5",
                          fontSize: 16,
                          fontFamily: "BebasNeue_400Regular",
                          borderWidth: 1,
                          borderColor: "#252535",
                          textAlign: "center",
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                        RPE
                      </Text>
                      <TextInput
                        value={addSetForm.rpe}
                        onChangeText={(v) => setAddSetForm((f) => f ? { ...f, rpe: v } : null)}
                        keyboardType="number-pad"
                        placeholder="—"
                        placeholderTextColor="#4A4A6A"
                        style={{
                          backgroundColor: "#1A1A26",
                          borderRadius: 8,
                          padding: 10,
                          color: "#F0F0F5",
                          fontSize: 16,
                          fontFamily: "BebasNeue_400Regular",
                          borderWidth: 1,
                          borderColor: "#252535",
                          textAlign: "center",
                        }}
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setAddSetForm((f) => f ? { ...f, isWarmup: !f.isWarmup } : null)}
                      style={{
                        flex: 1,
                        backgroundColor: addSetForm.isWarmup ? "#FFB80022" : "#1A1A26",
                        borderRadius: 8,
                        padding: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: addSetForm.isWarmup ? "#FFB800" : "#252535",
                      }}
                    >
                      <Text style={{ color: addSetForm.isWarmup ? "#FFB800" : "#8080A0", fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                        Warmup
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={logSet}
                      style={{
                        flex: 2,
                        backgroundColor: "#00D4AA",
                        borderRadius: 8,
                        padding: 10,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#0A0A0F", fontSize: 13, fontFamily: "DMSans_700Bold" }}>
                        Log Set
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAddSetForm(null)}
                      style={{
                        backgroundColor: "#1A1A26",
                        borderRadius: 8,
                        padding: 10,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="x" size={16} color="#8080A0" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    const lastWeight = await getLastWeightForExercise(exercise.exercise_name);
                    setAddSetForm({
                      exerciseLogId: exercise.id,
                      exerciseName: exercise.exercise_name,
                      weight: lastWeight?.toString() ?? "",
                      reps: "",
                      rpe: "",
                      isWarmup: false,
                    });
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 6,
                  }}
                >
                  <Feather name="plus" size={14} color="#00D4AA" />
                  <Text style={{ color: "#00D4AA", fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    Add Set
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        {exercises.length === 0 && !session && (
          <Card>
            <View style={{ alignItems: "center", paddingVertical: 20, gap: 12 }}>
              <Feather name={new Date(selectedDate).getDay() === 0 ? "activity" : "zap"} size={48} color="#4A4A6A" />
              <Text style={{ color: "#F0F0F5", fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                No exercises yet
              </Text>
              <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" }}>
                {new Date(selectedDate).getDay() === 0 
                  ? "Select Cardio & Recovery above and add exercises"
                  : "Select a day type above and use the template to get started"}
              </Text>
            </View>
          </Card>
        )}

        {/* ── Info Cards ── */}
        {session && exercises.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Card elevated style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="info" size={12} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontSize: 10, fontFamily: "DMSans_700Bold" }}>
                  RPE
                </Text>
              </View>
              <Text style={{ color: "#8080A0", fontSize: 10, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
                Rate of Perceived Exertion (1-10). How hard the set felt.
              </Text>
            </Card>
            <Card elevated style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="info" size={12} color="#00D4AA" />
                <Text style={{ color: "#00D4AA", fontSize: 10, fontFamily: "DMSans_700Bold" }}>
                  VOLUME
                </Text>
              </View>
              <Text style={{ color: "#8080A0", fontSize: 10, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
                Total weight × reps. 1t = 1,000kg
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* ── Add Exercise Modal ── */}
      <Modal visible={showAddExercise} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  ADD EXERCISE
                </Text>
                <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                  <Feather name="x" size={22} color="#8080A0" />
                </TouchableOpacity>
              </View>

              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Search exercises..."
                placeholderTextColor="#4A4A6A"
                style={{
                  backgroundColor: "#12121A",
                  borderRadius: 8,
                  padding: 12,
                  color: "#F0F0F5",
                  fontSize: 14,
                  fontFamily: "DMSans_400Regular",
                  borderWidth: 1,
                  borderColor: "#252535",
                }}
              />

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {filteredExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.name}
                      onPress={() => addExercise(ex.name, ex.muscle_group, ex.equipment)}
                      style={{
                        backgroundColor: "#12121A",
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#252535",
                        padding: 14,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <Text style={{ color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                          {ex.name}
                        </Text>
                        <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2, textTransform: "capitalize" }}>
                          {ex.muscle_group} · {ex.equipment}
                        </Text>
                      </View>
                      <Feather name="plus" size={16} color="#00D4AA" />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Template Selector Modal ── */}
      <Modal visible={showTemplateSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#F0F0F5", fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  {selectedDayType} TEMPLATE
                </Text>
                <TouchableOpacity onPress={() => setShowTemplateSelector(false)}>
                  <Feather name="x" size={22} color="#8080A0" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: "#8080A0", fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                Select exercises to add to your workout
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {(WORKOUT_TEMPLATES[selectedDayType] || []).map((ex) => {
                    const isSelected = selectedTemplateExercises.has(ex.name);
                    return (
                      <TouchableOpacity
                        key={ex.name}
                        onPress={() => {
                          setSelectedTemplateExercises(prev => {
                            const next = new Set(prev);
                            if (next.has(ex.name)) {
                              next.delete(ex.name);
                            } else {
                              next.add(ex.name);
                            }
                            return next;
                          });
                        }}
                        style={{
                          backgroundColor: isSelected ? "#00D4AA22" : "#12121A",
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isSelected ? "#00D4AA" : "#252535",
                          padding: 14,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#F0F0F5", fontSize: 14, fontFamily: "DMSans_500Medium" }}>
                            {ex.name}
                          </Text>
                          <Text style={{ color: "#8080A0", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2, textTransform: "capitalize" }}>
                            {ex.muscle_group} · {ex.equipment} · {ex.sets} sets × {ex.reps} reps
                          </Text>
                        </View>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: isSelected ? "#00D4AA" : "#4A4A6A",
                          backgroundColor: isSelected ? "#00D4AA" : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          {isSelected && <Feather name="check" size={14} color="#0A0A0F" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={addExercisesFromTemplate}
                disabled={selectedTemplateExercises.size === 0}
                style={{
                  backgroundColor: selectedTemplateExercises.size > 0 ? "#00D4AA" : "#1A1A26",
                  borderRadius: 8,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="check" size={18} color={selectedTemplateExercises.size > 0 ? "#0A0A0F" : "#4A4A6A"} />
                <Text style={{ color: selectedTemplateExercises.size > 0 ? "#0A0A0F" : "#4A4A6A", fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  Add {selectedTemplateExercises.size} Exercise{selectedTemplateExercises.size !== 1 && 's'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
