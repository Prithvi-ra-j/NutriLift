/**
 * Groq API Integration
 * 
 * This module provides AI-powered features using Groq's API:
 * - Voice transcription (Whisper)
 * - Food parsing (LLaMA)
 * - Exercise parsing (LLaMA)
 * - InBody parsing (LLaMA)
 * - Weekly coaching (LLaMA)
 * - Monthly reports (LLaMA)
 * - Coach chat (LLaMA)
 */

// Client
export { groq, isGroqConfigured } from "./client";

// Voice transcription
export { transcribeAudio, transcribeAudioMultilingual } from "./transcribeAudio";

// Food parsing
export { parseFoodFromText, parseFoodFromVoice } from "./parseFood";
export type { ParsedFoodItem, FoodParseResult } from "./parseFood";

// Exercise parsing
export { parseExerciseFromText } from "./parseExercise";
export type { ParsedSet, ParsedExercise, ExerciseParseResult } from "./parseExercise";

// InBody parsing
export { parseInBodyText } from "./parseInBody";
export type { InBodyParseResult } from "./parseInBody";

// Coach chat
export { generateCoachResponse, generateDailyInsight as generateDailyInsightFromCoach } from "./generateCoachResponse";
export type { CoachContext, CoachMessage } from "./generateCoachResponse";

// Monthly reports
export { generateMonthlyReport } from "./generateMonthlyReport";
export type { MonthlyReportData, MonthlyReport } from "./generateMonthlyReport";

// Coaching agents
export { generateWeeklyReport, generateDailyInsight } from "./agents/weeklyCoach";
export { buildWeeklyContext, buildCustomContext } from "./agents/buildWeeklyContext";
export type { WeeklyContext, WeeklyReport } from "./agents/weeklyCoach";

// Error handling
export { safeGroqCall, retryGroqCall } from "./safeCall";
