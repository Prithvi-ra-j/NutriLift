import { useEffect, useState, useCallback } from "react";
import { getTodayKey, getLocalDateKey, parseDateKey } from "../../../lib/dates";
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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTodayStore } from "../../../lib/stores/today.store";
import {
  getSessionsForDate,
  getExercisesForSession,
  getSetsForExercise,
  insertSession,
  insertExerciseLog,
  insertSetLog,
  updateSetLog,
  updateSession,
  deleteSetLog,
  deleteExerciseLog,
  updateExerciseLog,
  checkDoubleProgression,
  getLastWeightForExercise,
  getPreviousSessionForDayType,
  getSessionsInRange,
  calculateEpley1RM,
  getCustomExercises,
  insertCustomExercise,
} from "../../../lib/db/queries/workout";
import {
  DAY_TYPES,
  EXERCISE_LIBRARY,
  type DayType,
  type ExerciseType,
} from "../../../lib/constants/exercises";
import { WORKOUT_TEMPLATES, type ExerciseTemplate } from "../../../lib/constants/workout-templates";
import { Card } from "../../../components/ui/Card";
import { PRBadge } from "../../../components/ui/PRBadge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { DateNavigator } from "../../../components/ui/DateNavigator";
import { ScreenHeader } from "../../../components/ui/ScreenHeader";
import { CardSkeleton } from "../../../components/ui/SkeletonLoader";
import type { WorkoutSession, ExerciseLog, SetLog, CustomExercise } from "../../../lib/db/schema";
import uuid from "react-native-uuid";
import { M3 } from "../../../design-system/tokens";
import { useRestTimer } from "./hooks/useRestTimer";
import { RestTimer } from "./components/RestTimer";
import { WorkoutSummary } from "./components/WorkoutSummary";


// ─── Types ────────────────────────────────────────────────────────────────────

interface SetForm {
  exerciseLogId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  // weight_reps
  weight: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
  // duration
  durationSec: string;
  // distance_duration
  distanceKm: string;
  durationMin: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format seconds → "1m 30s" or "45s" */
function formatDuration(sec: number): string {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${sec}s`;
}

/** Human-readable set pill label based on exercise type */
function setLabel(set: SetLog, type: ExerciseType): string {
  switch (type) {
    case "reps_only":
      return `× ${set.reps} reps`;
    case "duration":
      return formatDuration(set.duration_sec ?? set.reps ?? 0);
    case "distance_duration": {
      const dist = set.distance_km ?? 0;
      const dur = set.duration_sec != null ? Math.round(set.duration_sec / 60) : set.reps;
      return `${dist.toFixed(1)}km · ${dur}min`;
    }
    default:
      return `${set.weight_kg}kg × ${set.reps}`;
  }
}

/** Build a blank SetForm for a new set */
function blankForm(exerciseLogId: string, exerciseName: string, exerciseType: ExerciseType, lastWeight?: number | null): SetForm {
  return {
    exerciseLogId,
    exerciseName,
    exerciseType,
    weight: lastWeight?.toString() ?? "",
    reps: "",
    rpe: "",
    isWarmup: false,
    durationSec: "",
    distanceKm: "",
    durationMin: "",
  };
}

/** Build a SetForm pre-filled from an existing set (for editing) */
function formFromSet(set: SetLog, exerciseLogId: string, exerciseName: string, exerciseType: ExerciseType): SetForm {
  return {
    exerciseLogId,
    exerciseName,
    exerciseType,
    weight: set.weight_kg.toString(),
    reps: set.reps.toString(),
    rpe: set.rpe?.toString() ?? "",
    isWarmup: !!set.is_warmup,
    durationSec: set.duration_sec?.toString() ?? "",
    distanceKm: set.distance_km?.toString() ?? "",
    durationMin: set.duration_sec != null ? Math.round(set.duration_sec / 60).toString() : "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const todayStr = getTodayKey();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const getDefaultDayType = (dateStr: string): DayType => {
    const date = parseDateKey(dateStr);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return "Cardio";
    const dayTypeMap: Record<number, DayType> = {
      1: "Push A",
      2: "Pull A",
      3: "Legs A",
      4: "Push B",
      5: "Pull B",
      6: "Legs B",
    };
    return dayTypeMap[dayOfWeek] || "Push A";
  };

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [sets, setSets] = useState<Record<string, SetLog[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDayType, setSelectedDayType] = useState<DayType>(getDefaultDayType(todayStr));
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateExercises, setSelectedTemplateExercises] = useState<Set<string>>(new Set());
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [progressionAlerts, setProgressionAlerts] = useState<Record<string, string>>({});
  const [completedDayTypes, setCompletedDayTypes] = useState<Set<string>>(new Set());
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, string>>({});
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const restTimer = useRestTimer(restTimerDuration);
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, string>>({});
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const restTimer = useRestTimer(restTimerDuration);

  // ── Set form state ──
  const [addSetForm, setAddSetForm] = useState<SetForm | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editSetForm, setEditSetForm] = useState<SetForm | null>(null);

  // ── Swap exercise state ──
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapSearch, setSwapSearch] = useState("");

  // ── Custom Exercise state ──
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [customExName, setCustomExName] = useState("");
  const [customExType, setCustomExType] = useState<ExerciseType>("weight_reps");
  const [customExMuscle, setCustomExMuscle] = useState("chest");
  const [customExEquip, setCustomExEquip] = useState("dumbbell");

  // ── Edit Logged Exercise state ──
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editExerciseMuscle, setEditExerciseMuscle] = useState("");
  const [editExerciseEquip, setEditExerciseEquip] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadWorkout = useCallback(async () => {
    setSession(null);
    setExercises([]);
    setSets({});
    setAddSetForm(null);
    setEditingSetId(null);
    setEditSetForm(null);

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
      setSelectedDayType(getDefaultDayType(selectedDate));
    }

    const custom = await getCustomExercises();
    setCustomExercises(custom);

    await loadCompletedDayTypes();
    setIsLoading(false);
  }, [selectedDate]);

  const loadCompletedDayTypes = async () => {
    const curr = new Date(selectedDate);
    const first = curr.getDate() - curr.getDay() + 1;
    const monday = new Date(curr.setDate(first));
    const mondayStr = getLocalDateKey(monday);
    const sessions = await getSessionsInRange(mondayStr, selectedDate);
    setCompletedDayTypes(new Set(sessions.map((s) => s.day_type)));
  };

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // ─── Session ───────────────────────────────────────────────────────────────

  const ensureSession = async (): Promise<string> => {
    if (session) return session.id;
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
      updated_at: new Date().toISOString(),
    };
    await insertSession(newSession);
    setSession(newSession);
    return sessionId;
  };

  // ─── Add Exercise ──────────────────────────────────────────────────────────

  const addExercise = async (exerciseName: string, muscleGroup: string, equipment: string, exerciseType: ExerciseType) => {
    const sessionId = await ensureSession();
    const exerciseId = uuid.v4() as string;
    const newExercise: ExerciseLog = {
      id: exerciseId,
      session_id: sessionId,
      date: selectedDate,
      exercise_name: exerciseName,
      muscle_group: muscleGroup,
      equipment,
      exercise_type: exerciseType,
      order_in_session: exercises.length + 1,
    };
    await insertExerciseLog(newExercise);
    setExercises([...exercises, newExercise]);
    setSets((prev) => ({ ...prev, [exerciseId]: [] }));
    setShowAddExercise(false);
    setExerciseSearch("");

    const dp = await checkDoubleProgression(exerciseName);
    if (dp.shouldProgress) {
      setProgressionAlerts((prev) => ({ ...prev, [exerciseId]: dp.message }));
    }

    const lastWeight = exerciseType === "weight_reps" ? await getLastWeightForExercise(exerciseName) : null;
    const previous = await getPreviousSessionForDayType(selectedDayType, selectedDate);
    const previousExercise = previous?.exercises.find((entry) => entry.exercise.exercise_name === exerciseName);
    if (previousExercise) {
      const working = previousExercise.sets.filter((set) => !set.is_warmup);
      const preview = working.slice(0, 3).map((set) => `${set.weight_kg}kg × ${set.reps}`).join(" · ");
      if (preview) setPreviousPerformance((prev) => ({ ...prev, [exerciseId]: preview }));
    }
    setAddSetForm(blankForm(exerciseId, exerciseName, exerciseType, lastWeight));
  };

  const createCustomExercise = async () => {
    if (!customExName.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }
    const newEx: CustomExercise = {
      id: uuid.v4() as string,
      exercise_name: customExName.trim(),
      exercise_type: customExType,
      muscle_group: customExMuscle,
      equipment: customExEquip,
      created_at: Math.floor(Date.now() / 1000),
    };
    await insertCustomExercise(newEx);
    setShowCreateCustom(false);
    setCustomExName("");
    loadWorkout();
    addExercise(newEx.exercise_name, newEx.muscle_group || "other", newEx.equipment || "other", newEx.exercise_type as ExerciseType);
  };

  // ─── Add Exercises from Template ───────────────────────────────────────────

  const addExercisesFromTemplate = async () => {
    if (selectedTemplateExercises.size === 0) {
      Alert.alert("No Exercises Selected", "Please select at least one exercise.");
      return;
    }
    const sessionId = await ensureSession();
    const template = WORKOUT_TEMPLATES[selectedDayType] || [];
    const selectedExercises = template.filter((ex) => selectedTemplateExercises.has(ex.name));

    for (const ex of selectedExercises) {
      const exerciseId = uuid.v4() as string;
      const libEntry = EXERCISE_LIBRARY.find((e) => e.name === ex.name);
      const exerciseType: ExerciseType = libEntry?.exercise_type ?? "weight_reps";
      const newExercise: ExerciseLog = {
        id: exerciseId,
        session_id: sessionId,
        date: selectedDate,
        exercise_name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        exercise_type: exerciseType,
        order_in_session: exercises.length + 1,
      };
      await insertExerciseLog(newExercise);
      setExercises((prev) => [...prev, newExercise]);
      setSets((prev) => ({ ...prev, [exerciseId]: [] }));
      const previous = await getPreviousSessionForDayType(selectedDayType, selectedDate);
      const previousExercise = previous?.exercises.find((entry) => entry.exercise.exercise_name === ex.name);
      if (previousExercise) {
        const working = previousExercise.sets.filter((set) => !set.is_warmup);
        const preview = working.slice(0, 3).map((set) => `${set.weight_kg}kg × ${set.reps}`).join(" · ");
        if (preview) setPreviousPerformance((prev) => ({ ...prev, [exerciseId]: preview }));
      }
    }

    setShowTemplateSelector(false);
    setSelectedTemplateExercises(new Set());
    loadWorkout();
  };

  // ─── Delete Exercise ───────────────────────────────────────────────────────

  const confirmDeleteExercise = (exerciseId: string, exerciseName: string) => {
    Alert.alert(
      "Delete Exercise",
      `Remove "${exerciseName}" and all its sets from today's workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExerciseLog(exerciseId);
            setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
            setSets((prev) => {
              const next = { ...prev };
              delete next[exerciseId];
              return next;
            });
            if (addSetForm?.exerciseLogId === exerciseId) setAddSetForm(null);
            if (editSetForm?.exerciseLogId === exerciseId) {
              setEditSetForm(null);
              setEditingSetId(null);
            }
          },
        },
      ]
    );
  };

  // ─── Swap Exercise ─────────────────────────────────────────────────────────

  const swapExercise = async (newExerciseName: string) => {
    if (!swapExerciseId) return;
    const libEntry = EXERCISE_LIBRARY.find((e) => e.name === newExerciseName);
    if (!libEntry) return;

    await updateExerciseLog(swapExerciseId, {
      exercise_name: libEntry.name,
      muscle_group: libEntry.muscle_group,
      equipment: libEntry.equipment,
      exercise_type: libEntry.exercise_type,
    });

    setSwapExerciseId(null);
    setSwapSearch("");
    loadWorkout();
  };

  // ─── Edit Exercise Log ─────────────────────────────────────────────────────

  const saveEditExercise = async () => {
    if (!editingExerciseId) return;
    if (!editExerciseName.trim()) {
      Alert.alert("Error", "Exercise name cannot be empty");
      return;
    }
    await updateExerciseLog(editingExerciseId, {
      exercise_name: editExerciseName.trim(),
      muscle_group: editExerciseMuscle,
      equipment: editExerciseEquip,
    });
    setEditingExerciseId(null);
    loadWorkout();
  };

  // ─── Log Set ───────────────────────────────────────────────────────────────

  const validateSetMetrics = (type: ExerciseType, weightStr: string, repsStr: string, durSecStr: string, distKmStr: string, durMinStr: string) => {
    let weight = 0; let reps = 0; let durationSec: number | null = null; let distanceKm: number | null = null;
    const err = (msg: string) => ({ weight: 0, reps: 0, durationSec: null, distanceKm: null, error: msg });
    
    if (type === "weight_reps") {
      weight = parseFloat(weightStr);
      reps = parseInt(repsStr);
      if (isNaN(weight) || weight < 0.1 || weight > 9999.9) return err("Weight must be between 0.1 and 9999.9 kg");
      if (isNaN(reps) || reps < 1 || reps > 9999) return err("Reps must be between 1 and 9999");
    } else if (type === "reps_only") {
      reps = parseInt(repsStr);
      if (isNaN(reps) || reps < 1 || reps > 9999) return err("Reps must be between 1 and 9999");
    } else if (type === "duration") {
      const sec = parseInt(durSecStr);
      if (isNaN(sec) || sec < 1 || sec > 86400) return err("Duration must be between 1 and 86400 seconds");
      durationSec = sec; reps = sec;
    } else if (type === "distance_duration") {
      distanceKm = parseFloat(distKmStr);
      const min = parseFloat(durMinStr);
      if (isNaN(distanceKm) || distanceKm < 0.01 || distanceKm > 999.99) return err("Distance must be between 0.01 and 999.99 km");
      if (isNaN(min) || min * 60 < 1 || min * 60 > 86400) return err("Duration must be between 1 and 86400 seconds");
      durationSec = Math.round(min * 60); reps = Math.round(min);
    }
    return { weight, reps, durationSec, distanceKm, error: null };
  };

  const logSet = async () => {
    if (!addSetForm) return;
    const { exerciseType, weight: wStr, reps: rStr, durationSec: dSecStr, distanceKm: dKmStr, durationMin: dMinStr } = addSetForm;

    const validated = validateSetMetrics(exerciseType, wStr, rStr, dSecStr, dKmStr, dMinStr);
    if (validated.error) {
      Alert.alert("Invalid Input", validated.error);
      return;
    }
    const { weight, reps, durationSec, distanceKm } = validated;

    const setId = uuid.v4() as string;
    const existingSets = sets[addSetForm.exerciseLogId] ?? [];
    const newSet: SetLog = {
      id: setId,
      exercise_log_id: addSetForm.exerciseLogId,
      set_number: existingSets.length + 1,
      weight_kg: weight,
      reps,
      duration_sec: durationSec,
      distance_km: distanceKm,
      rpe: addSetForm.rpe ? parseInt(addSetForm.rpe) : null,
      is_pr: 0,
      is_warmup: addSetForm.isWarmup ? 1 : 0,
      notes: null,
      logged_at: Math.floor(Date.now() / 1000),
    };

    const { isPR } = await insertSetLog(newSet);

    setSets((prev) => ({
      ...prev,
      [addSetForm.exerciseLogId]: [
        ...(prev[addSetForm.exerciseLogId] || []),
        { ...newSet, is_pr: isPR ? 1 : 0 },
      ],
    }));

    // Keep weight, clear variable fields
    setAddSetForm((prev) =>
      prev ? { ...prev, reps: "", rpe: "", durationSec: "", distanceKm: "", durationMin: "" } : null
    );

    loadWorkout();
  };

  // ─── Edit Set ──────────────────────────────────────────────────────────────

  const openEditSet = (set: SetLog, exercise: ExerciseLog) => {
    const exType = (exercise.exercise_type as ExerciseType) ?? "weight_reps";
    setEditingSetId(set.id);
    setEditSetForm(formFromSet(set, exercise.id, exercise.exercise_name, exType));
    // Close add form
    if (addSetForm?.exerciseLogId === exercise.id) setAddSetForm(null);
  };

  const saveEditSet = async () => {
    if (!editSetForm || !editingSetId) return;
    const { exerciseType, weight: wStr, reps: rStr, durationSec: dSecStr, distanceKm: dKmStr, durationMin: dMinStr } = editSetForm;

    const validated = validateSetMetrics(exerciseType, wStr, rStr, dSecStr, dKmStr, dMinStr);
    if (validated.error) {
      Alert.alert("Invalid Input", validated.error);
      return;
    }
    const { weight, reps, durationSec, distanceKm } = validated;

    await updateSetLog(
      editingSetId,
      {
        weight_kg: weight,
        reps,
        duration_sec: durationSec,
        distance_km: distanceKm,
        rpe: editSetForm.rpe ? parseInt(editSetForm.rpe) : null,
        is_warmup: editSetForm.isWarmup ? 1 : 0,
      },
      editSetForm.exerciseLogId
    );

    setEditingSetId(null);
    setEditSetForm(null);
    loadWorkout();
  };

  const confirmDeleteSet = (setId: string, exerciseLogId: string, setNumber: number) => {
    Alert.alert(
      "Delete Set",
      `Remove Set ${setNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSetLog(setId, exerciseLogId);
            setEditingSetId(null);
            setEditSetForm(null);
            loadWorkout();
          },
        },
      ]
    );
  };

  const finishWorkout = async () => {
    if (!session || session.ended_at || isFinishing) return;
    setIsFinishing(true);
    try {
      const endedAt = Math.floor(Date.now() / 1000);
      const startedAt = session.started_at ?? endedAt;
      const durationMin = Math.max(0, Math.round((endedAt - startedAt) / 60));
      await updateSession(session.id, { ended_at: endedAt, duration_min: durationMin });
      setSession({ ...session, ended_at: endedAt, duration_min: durationMin });
      restTimer.reset();
    } catch {
      Alert.alert("Couldn’t finish workout", "Your current sets are still saved. Try again.");
    } finally {
      setIsFinishing(false);
    }
  };

  // ─── Filter Helpers ────────────────────────────────────────────────────────

  const allExercises = [
    ...EXERCISE_LIBRARY,
    ...customExercises.map((c) => ({
      name: c.exercise_name,
      muscle_group: c.muscle_group || "other",
      equipment: c.equipment || "other",
      exercise_type: c.exercise_type as ExerciseType,
      day_types: ["Cardio", "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"] as DayType[],
    })),
  ];

  const filteredExercises = allExercises.filter((e) => {
    const isSunday = new Date(selectedDate).getDay() === 0;
    if (isSunday) {
      if (!e.day_types.includes("Cardio")) return false;
    } else {
      if (e.day_types.includes("Cardio") && e.day_types.length === 1) return false;
    }
    return (
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      e.muscle_group.toLowerCase().includes(exerciseSearch.toLowerCase())
    );
  });

  const swapFilteredExercises = allExercises.filter((e) => {
    if (!swapSearch) return true;
    return (
      e.name.toLowerCase().includes(swapSearch.toLowerCase()) ||
      e.muscle_group.toLowerCase().includes(swapSearch.toLowerCase())
    );
  });

  // ─── Sub-renders ───────────────────────────────────────────────────────────

  /** Shared input field style */
  const inputStyle = {
    backgroundColor: M3.colors.surfaceVariant,
    borderRadius: M3.shape.medium,
    padding: 10,
    color: M3.colors.onSurface as any,
    fontSize: 16,
    fontFamily: "BebasNeue_400Regular",
    borderWidth: 1,
    borderColor: M3.colors.outline,
    textAlign: "center" as const,
  };

  /** Renders the correct input fields for a set form based on exercise type */
  const renderSetFormFields = (
    form: SetForm,
    onChange: (partial: Partial<SetForm>) => void,
    onSubmit: () => void,
    onCancel: () => void,
    submitLabel: string,
    extraActions?: React.ReactNode
  ) => {
    const { exerciseType } = form;

    return (
      <View style={{ gap: 8 }}>
        {/* Fields row */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {exerciseType === "weight_reps" && (
            <>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  Weight (kg)
                </Text>
                <TextInput
                  value={form.weight}
                  onChangeText={(v) => onChange({ weight: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={M3.colors.onSurfaceMuted}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  Reps
                </Text>
                <TextInput
                  value={form.reps}
                  onChangeText={(v) => onChange({ reps: v })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={M3.colors.onSurfaceMuted}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  RPE
                </Text>
                <TextInput
                  value={form.rpe}
                  onChangeText={(v) => onChange({ rpe: v })}
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
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  Reps / Count
                </Text>
                <TextInput
                  value={form.reps}
                  onChangeText={(v) => onChange({ reps: v })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={M3.colors.onSurfaceMuted}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  RPE
                </Text>
                <TextInput
                  value={form.rpe}
                  onChangeText={(v) => onChange({ rpe: v })}
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
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                Duration (seconds)
              </Text>
              <TextInput
                value={form.durationSec}
                onChangeText={(v) => onChange({ durationSec: v })}
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
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  Distance (km)
                </Text>
                <TextInput
                  value={form.distanceKm}
                  onChangeText={(v) => onChange({ distanceKm: v })}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={M3.colors.onSurfaceMuted}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 4 }}>
                  Duration (min)
                </Text>
                <TextInput
                  value={form.durationMin}
                  onChangeText={(v) => onChange({ durationMin: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={M3.colors.onSurfaceMuted}
                  style={inputStyle}
                />
              </View>
            </>
          )}
        </View>

        {/* Actions row */}
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
            onPress={onSubmit}
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
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
        <View style={{ padding: 20, gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M3.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 180, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <ScreenHeader
          title="WORKOUT"
          subtitle={selectedDayType}
          actionIcon="plus"
          actionLabel={!session?.ended_at ? "Add Exercise" : undefined}
          onAction={!session?.ended_at ? () => setShowAddExercise(true) : undefined}
        />

        {/* ── Date Navigator ── */}
        <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} showFullDate={false} />

        {/* ── Marathon Day Notice ── */}
        {new Date(selectedDate).getDay() === 0 && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
              <Feather name="activity" size={20} color={M3.colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: M3.colors.error, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                  MARATHON DAY
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
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
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                RECOVERY & CARDIO
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedDayType("Cardio")}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: selectedDayType === "Cardio" ? M3.colors.errorContainer : M3.colors.surfaceVariant,
                borderWidth: 1,
                borderColor: selectedDayType === "Cardio" ? M3.colors.error : M3.colors.surfaceContainer,
                alignItems: "center",
              }}
            >
              <Text style={{ color: selectedDayType === "Cardio" ? M3.colors.error : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                Cardio & Recovery
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Day Type Selector ── */}
        {!session && new Date(selectedDate).getDay() !== 0 && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", letterSpacing: 0.5 }}>
                SELECT DAY TYPE
              </Text>
              <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                Completed this week are hidden
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DAY_TYPES.filter((dt) => !completedDayTypes.has(dt)).map((dt) => (
                <TouchableOpacity
                  key={dt}
                  onPress={() => setSelectedDayType(dt)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: selectedDayType === dt ? M3.colors.primaryContainer : M3.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: selectedDayType === dt ? M3.colors.primary : M3.colors.surfaceContainer,
                  }}
                >
                  <Text style={{ color: selectedDayType === dt ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    {dt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {WORKOUT_TEMPLATES[selectedDayType]?.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setShowTemplateSelector(true);
                  const template = WORKOUT_TEMPLATES[selectedDayType] || [];
                  setSelectedTemplateExercises(new Set(template.map((ex) => ex.name)));
                }}
                style={{
                  marginTop: 12,
                  backgroundColor: M3.colors.secondaryContainer,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: M3.colors.secondary,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="list" size={16} color={M3.colors.secondary} />
                <Text style={{ color: M3.colors.secondary, fontSize: 13, fontFamily: "DMSans_700Bold" }}>
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
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {session.day_type}
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  Day Type
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {exercises.length}
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  Exercises
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {Object.values(sets).reduce((a, b) => a + b.length, 0)}
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  Sets
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: M3.colors.primary, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>
                  {((session.total_volume_kg ?? 0) / 1000).toFixed(1)}t
                </Text>
                <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  Volume
                </Text>
                <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                  ({(session.total_volume_kg ?? 0).toFixed(0)}kg)
                </Text>
              </View>
            </View>
          </Card>
        )}

        {session?.ended_at && (
          <WorkoutSummary
            exerciseCount={exercises.length}
            setCount={Object.values(sets).reduce((a, b) => a + b.filter((set) => !set.is_warmup).length, 0)}
            volumeKg={session.total_volume_kg ?? 0}
            prCount={Object.values(sets).flat().filter((set) => set.is_pr === 1).length}
            durationMin={session.duration_min}
            onDone={() => router.back()}
          />
        )}

        {!session?.ended_at && session && exercises.length > 0 && (
          <View style={{ gap: 8 }}>
            <RestTimer
              seconds={restTimer.seconds}
              running={restTimer.running}
              onStart={() => restTimer.start(restTimerDuration)}
              onPause={restTimer.pause}
              onReset={restTimer.reset}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>
              {[60, 90, 120].map((seconds) => (
                <PressableScale key={seconds} onPress={() => setRestTimerDuration(seconds)} accessibilityRole="button" style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: M3.shape.full, backgroundColor: restTimerDuration === seconds ? M3.colors.primaryContainer : M3.colors.surfaceVariant }}>
                  <Text style={{ color: restTimerDuration === seconds ? M3.colors.primary : M3.colors.onSurfaceVariant, ...M3.typescale.labelSmall }}>{seconds}s</Text>
                </PressableScale>
              ))}
            </View>
          </View>
        )}

        {!session?.ended_at && session && exercises.length > 0 && (
          <Button label={isFinishing ? "Finishing..." : "Finish workout"} icon="check-circle" loading={isFinishing} onPress={finishWorkout} />
        )}

        {/* ── Exercise List ── */}
        {exercises.map((exercise) => {
          const exerciseSets = sets[exercise.id] ?? [];
          const exType = (exercise.exercise_type as ExerciseType) ?? "weight_reps";
          const workingSets = exerciseSets.filter((s) => !s.is_warmup);
          const totalVolume =
            exType === "weight_reps"
              ? workingSets.reduce((a, s) => a + s.weight_kg * s.reps, 0)
              : 0;
          const topSet =
            exType === "weight_reps"
              ? workingSets.reduce(
                  (best, s) => (s.weight_kg > (best?.weight_kg ?? 0) ? s : best),
                  workingSets[0]
                )
              : null;
          const estimated1RM = topSet ? calculateEpley1RM(topSet.weight_kg, topSet.reps) : null;

          return (
            <Card key={exercise.id}>
              {/* Exercise header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                    {exercise.exercise_name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 3 }}>
                    <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                        {exercise.muscle_group}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: M3.colors.surfaceVariant, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium", textTransform: "capitalize" }}>
                        {exercise.equipment}
                      </Text>
                    </View>
                    {/* Exercise type badge */}
                    <View style={{ backgroundColor: M3.colors.primaryContainer, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: M3.colors.primary, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                        {exType === "weight_reps" ? "Weight" : exType === "reps_only" ? "Reps" : exType === "duration" ? "Duration" : "Cardio"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right side: volume + action icons */}
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {exType === "weight_reps" && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                        {totalVolume.toFixed(0)}kg vol
                      </Text>
                      {!!estimated1RM && (
                        <Text style={{ color: M3.colors.onSurfaceMuted, fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                          ~{estimated1RM.toFixed(0)}kg 1RM
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {/* Edit exercise */}
                    <TouchableOpacity
                      onPress={() => {
                        setEditingExerciseId(exercise.id);
                        setEditExerciseName(exercise.exercise_name);
                        setEditExerciseMuscle(exercise.muscle_group || "");
                        setEditExerciseEquip(exercise.equipment || "");
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="edit-2" size={15} color={M3.colors.primary} />
                    </TouchableOpacity>
                    {/* Swap exercise */}
                    <TouchableOpacity
                      onPress={() => {
                        setSwapExerciseId(exercise.id);
                        setSwapSearch("");
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="repeat" size={15} color={M3.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    {/* Delete exercise */}
                    <TouchableOpacity
                      onPress={() => confirmDeleteExercise(exercise.id, exercise.exercise_name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={15} color={M3.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Double progression alert */}
              {!!progressionAlerts[exercise.id] && (
                <View style={{ backgroundColor: M3.colors.warningContainer, borderRadius: 6, padding: 8, marginBottom: 8, flexDirection: "row", gap: 6 }}>
                  <Feather name="trending-up" size={12} color={M3.colors.warning} />
                  <Text style={{ color: M3.colors.warning, fontSize: 12, fontFamily: "DMSans_500Medium", flex: 1 }}>
                    {progressionAlerts[exercise.id]}
                  </Text>
                </View>
              )}

              {/* Set pills */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {exerciseSets.map((set) => {
                  const isEditing = editingSetId === set.id;
                  return (
                    <View key={set.id}>
                      {/* Set pill — tap to edit */}
                      {!isEditing && (
                        <TouchableOpacity
                          onPress={() => openEditSet(set, exercise)}
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

                      {/* Inline edit form for this set */}
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
                            <Text style={{ color: M3.colors.secondary, fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                              EDIT SET {set.set_number}
                            </Text>
                            <TouchableOpacity
                              onPress={() => confirmDeleteSet(set.id, exercise.id, set.set_number)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Feather name="trash-2" size={13} color={M3.colors.error} />
                            </TouchableOpacity>
                          </View>
                          {renderSetFormFields(
                            editSetForm,
                            (partial) => setEditSetForm((f) => f ? { ...f, ...partial } : null),
                            saveEditSet,
                            () => { setEditingSetId(null); setEditSetForm(null); },
                            "Save"
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Add set inline form */}
              {addSetForm?.exerciseLogId === exercise.id ? (
                renderSetFormFields(
                  addSetForm,
                  (partial) => setAddSetForm((f) => f ? { ...f, ...partial } : null),
                  logSet,
                  () => setAddSetForm(null),
                  "Log Set"
                )
              ) : (
                !editingSetId && (
                  <TouchableOpacity
                    onPress={async () => {
                      const lastWeight = exType === "weight_reps"
                        ? await getLastWeightForExercise(exercise.exercise_name)
                        : null;
                      setAddSetForm(blankForm(exercise.id, exercise.exercise_name, exType, lastWeight));
                      setEditingSetId(null);
                      setEditSetForm(null);
                    }}
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
              <Feather name={new Date(selectedDate).getDay() === 0 ? "activity" : "zap"} size={48} color={M3.colors.onSurfaceMuted} />
              <Text style={{ color: M3.colors.onSurface, fontSize: 16, fontFamily: "DMSans_700Bold" }}>
                No exercises yet
              </Text>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" }}>
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
                <Feather name="info" size={12} color={M3.colors.secondary} />
                <Text style={{ color: M3.colors.secondary, fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                  RPE
                </Text>
              </View>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
                Rate of Perceived Exertion (1-10). How hard the set felt.
              </Text>
            </Card>
            <Card elevated style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="info" size={12} color={M3.colors.primary} />
                <Text style={{ color: M3.colors.primary, fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                  VOLUME
                </Text>
              </View>
              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 14 }}>
                Weight × reps (weight exercises only). 1t = 1,000kg
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* ── Add Exercise Modal ── */}
      <Modal visible={showAddExercise} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  ADD EXERCISE
                </Text>
                <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <TextInput
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
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
                      onPress={() => addExercise(ex.name, ex.muscle_group, ex.equipment, ex.exercise_type)}
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
                          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", textTransform: "capitalize" }}>
                            {ex.muscle_group} · {ex.equipment}
                          </Text>
                          <View style={{
                            backgroundColor: ex.exercise_type === "weight_reps" ? M3.colors.primaryContainer :
                              ex.exercise_type === "reps_only" ? M3.colors.secondaryContainer :
                              ex.exercise_type === "duration" ? M3.colors.warningContainer : M3.colors.errorContainer,
                            borderRadius: 3,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                          }}>
                            <Text style={{
                              fontSize: 12,
                              fontFamily: "DMSans_700Bold",
                              color: ex.exercise_type === "weight_reps" ? M3.colors.primary :
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
                    onPress={() => setShowCreateCustom(true)}
                    style={{
                      backgroundColor: M3.colors.secondaryContainer,
                      borderRadius: 10,
                      padding: 16,
                      alignItems: "center",
                      marginTop: 10,
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
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

      {/* ── Create Custom Exercise Modal ── */}
      <Modal visible={showCreateCustom} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  CREATE CUSTOM EXERCISE
                </Text>
                <TouchableOpacity onPress={() => setShowCreateCustom(false)}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 16 }}>
                  <View>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Exercise Name
                    </Text>
                    <TextInput
                      value={customExName}
                      onChangeText={setCustomExName}
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
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Exercise Type
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {(["weight_reps", "reps_only", "duration", "distance_duration"] as ExerciseType[]).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setCustomExType(type)}
                          style={{
                            backgroundColor: customExType === type ? M3.colors.primaryContainer : M3.colors.surfaceVariant,
                            borderWidth: 1,
                            borderColor: customExType === type ? M3.colors.primary : M3.colors.surfaceContainer,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                          }}
                        >
                          <Text style={{ color: customExType === type ? M3.colors.primary : M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                            {type === "weight_reps" ? "Weight + Reps" : type === "reps_only" ? "Reps Only" : type === "duration" ? "Time Based" : "Cardio"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Muscle Group (Optional)
                    </Text>
                    <TextInput
                      value={customExMuscle}
                      onChangeText={setCustomExMuscle}
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
                    onPress={createCustomExercise}
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

      {/* ── Template Selector Modal ── */}
      <Modal visible={showTemplateSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  {selectedDayType} TEMPLATE
                </Text>
                <TouchableOpacity onPress={() => setShowTemplateSelector(false)}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                Select exercises to add to your workout
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {(WORKOUT_TEMPLATES[selectedDayType] || []).map((ex) => {
                    const isSelected = selectedTemplateExercises.has(ex.name);
                    const libEntry = EXERCISE_LIBRARY.find((e) => e.name === ex.name);
                    return (
                      <TouchableOpacity
                        key={ex.name}
                        onPress={() => {
                          setSelectedTemplateExercises((prev) => {
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
                          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2, textTransform: "capitalize" }}>
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
                onPress={addExercisesFromTemplate}
                disabled={selectedTemplateExercises.size === 0}
                style={{
                  backgroundColor: selectedTemplateExercises.size > 0 ? M3.colors.primary : M3.colors.surfaceVariant,
                  borderRadius: 8,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Feather name="check" size={18} color={selectedTemplateExercises.size > 0 ? M3.colors.background : M3.colors.onSurfaceMuted} />
                <Text style={{ color: selectedTemplateExercises.size > 0 ? M3.colors.background : M3.colors.onSurfaceMuted, fontSize: 15, fontFamily: "DMSans_700Bold" }}>
                  Add {selectedTemplateExercises.size} Exercise{selectedTemplateExercises.size !== 1 && 's'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Swap Exercise Modal ── */}
      <Modal visible={!!swapExerciseId} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  SWAP EXERCISE
                </Text>
                <TouchableOpacity onPress={() => { setSwapExerciseId(null); setSwapSearch(""); }}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 13, fontFamily: "DMSans_400Regular" }}>
                Choose a replacement — existing sets will be kept
              </Text>

              <TextInput
                value={swapSearch}
                onChangeText={setSwapSearch}
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
                  {swapFilteredExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.name}
                      onPress={() => swapExercise(ex.name)}
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
                          <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", textTransform: "capitalize" }}>
                            {ex.muscle_group} · {ex.equipment}
                          </Text>
                          <View style={{
                            backgroundColor: ex.exercise_type === "weight_reps" ? M3.colors.primaryContainer :
                              ex.exercise_type === "reps_only" ? M3.colors.secondaryContainer :
                              ex.exercise_type === "duration" ? M3.colors.warningContainer : M3.colors.errorContainer,
                            borderRadius: 3,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                          }}>
                            <Text style={{
                              fontSize: 12,
                              fontFamily: "DMSans_700Bold",
                              color: ex.exercise_type === "weight_reps" ? M3.colors.primary :
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

      {/* ── Edit Logged Exercise Modal ── */}
      <Modal visible={!!editingExerciseId} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: M3.colors.background }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, gap: 16, flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: M3.colors.onSurface, fontSize: 22, fontFamily: "BebasNeue_400Regular", letterSpacing: 1 }}>
                  EDIT LOGGED EXERCISE
                </Text>
                <TouchableOpacity onPress={() => setEditingExerciseId(null)}>
                  <Feather name="x" size={22} color={M3.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 16 }}>
                  <View>
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Exercise Name
                    </Text>
                    <TextInput
                      value={editExerciseName}
                      onChangeText={setEditExerciseName}
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
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Muscle Group (Optional)
                    </Text>
                    <TextInput
                      value={editExerciseMuscle}
                      onChangeText={setEditExerciseMuscle}
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
                    <Text style={{ color: M3.colors.onSurfaceVariant, fontSize: 12, fontFamily: "DMSans_400Regular", marginBottom: 6 }}>
                      Equipment (Optional)
                    </Text>
                    <TextInput
                      value={editExerciseEquip}
                      onChangeText={setEditExerciseEquip}
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
                    onPress={saveEditExercise}
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

    </SafeAreaView>
  );
}
