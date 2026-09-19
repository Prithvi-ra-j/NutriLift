import { groq } from "./client";
import { safeGroqCall } from "./safeCall";

export interface CoachContext {
  user_profile: any;
  today_nutrition: any;
  today_workout: any;
  recent_history?: any;
}

export interface CoachMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Get today's training type based on the PPL split schedule
 */
function getTodayTrainingType(): { dayName: string; trainingType: string; date: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[dayOfWeek];
  
  // PPL x2 Schedule:
  // Sunday = Marathon (Cardio/Recovery)
  // Monday = Push A
  // Tuesday = Pull A
  // Wednesday = Legs A
  // Thursday = Push B
  // Friday = Pull B
  // Saturday = Legs B
  const trainingTypeMap: Record<number, string> = {
    0: "Marathon (Cardio/Recovery)",
    1: "Push A",
    2: "Pull A",
    3: "Legs A",
    4: "Push B",
    5: "Pull B",
    6: "Legs B",
  };
  
  const trainingType = trainingTypeMap[dayOfWeek];
  
  // Format date as "May 10, 2026"
  const date = now.toLocaleDateString("en-US", { 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  });
  
  return { dayName, trainingType, date };
}

/**
 * Generate coach response using Groq LLaMA with streaming support
 */
export async function generateCoachResponse(
  context: CoachContext,
  messages: CoachMessage[],
  onChunk?: (chunk: string) => void
): Promise<string> {
  return safeGroqCall(async () => {
    const { dayName, trainingType, date } = getTodayTrainingType();
    
    const systemPrompt = `You are NutriLift Coach — a brutally honest, scientifically rigorous personal trainer and nutritionist.

TODAY'S DATE: ${date}
TODAY'S DAY: ${dayName}
TODAY'S TRAINING: ${trainingType}

You have access to the user's health data:
- Last 7 days: Detailed daily nutrition and workout logs
- Previous 3 weeks: Weekly summaries (averages, hit rates, adherence)
- Current PRs and body composition
- Recent recovery logs and supplement adherence

TRAINING SCHEDULE (PPL x2):
- Sunday: Marathon (Cardio/Recovery) — 20min treadmill, stretching, mobility
- Monday: Push A — Chest, Shoulders, Triceps
- Tuesday: Pull A — Back, Biceps, Rear Delts
- Wednesday: Legs A — Quads, Hamstrings, Glutes, Calves
- Thursday: Push B — Chest, Shoulders, Triceps (different exercises)
- Friday: Pull B — Back, Biceps, Rear Delts (different exercises)
- Saturday: Legs B — Quads, Hamstrings, Glutes, Calves (different exercises)

LIMITATIONS:
- You CANNOT modify workout plans or add exercises directly
- You CAN guide users on how to add exercises: "Workout tab → Start session → Add exercise"
- You CAN analyze training and suggest improvements with specific sets/reps/weight

PERSONA — BRUTALLY HONEST:
- No fluff. Reference actual logged data with specific numbers and dates.
- If they're slacking, say it. If they're crushing it, say it.
- When asked "what's today's game plan" — answer for TODAY'S TRAINING TYPE (${trainingType}).
- Call out gaps: protein deficits, missed supplements, poor recovery, stalled lifts.
- Explain mechanisms, not just recommendations.
- Be direct about what's holding them back.

RULES:
- Give specific, actionable answers with numbers.
- Reference actual data in EVERY response (check last_7_days_nutrition, previous_weeks_summary, today_workout, current_prs).
- Apply double progression: compound lifts progress when 3×12 hit twice.
- Consider structural notes (APT, TFL overactivation, ankle restriction) when recommending exercises.
- Keep responses concise (2-4 paragraphs max unless detail requested).
- If data missing, say "I don't see X logged yet" — don't assume.

Current Context:
${JSON.stringify(context, null, 2)}`;

    const allMessages: CoachMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    if (onChunk) {
      // Streaming mode
      const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: allMessages,
        temperature: 0.3,
        max_tokens: 1000,
        stream: true,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }

      return fullContent;
    } else {
      // Non-streaming mode
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: allMessages,
        temperature: 0.3,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || "";
    }
  }) as Promise<string>;
}

/**
 * Generate quick daily insight (for dashboard)
 */
export async function generateDailyInsight(todayData: {
  calories: number;
  protein: number;
  targetCalories: number;
  targetProtein: number;
  workoutCompleted: boolean;
  dayType: string;
}): Promise<string> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are NutriLift Coach. Give a single, specific, actionable insight for today based on the user's current progress. Be direct and reference actual numbers. Keep it to 1-2 sentences max.`,
        },
        {
          role: "user",
          content: `Today's data: ${JSON.stringify(todayData)}. Give me one specific insight or action for the rest of the day.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 100,
    });

    return completion.choices[0]?.message?.content || "Keep pushing!";
  }) as Promise<string>;
}

/**
 * Generate AI-powered weekly summary
 */
export async function generateWeeklySummary(weekData: {
  week_start: string;
  week_end: string;
  nutrition: {
    avg_calories: number;
    avg_protein: number;
    protein_hit_rate: number;
    adherence_score: number;
    days_logged: number;
  };
  workouts: {
    sessions_completed: number;
    total_volume_kg: number;
    prs_achieved: number;
    avg_rpe: number;
  };
  recovery: {
    avg_sleep_hr: number;
    avg_energy: number;
    avg_soreness: number;
  };
  body: {
    weight_change_kg?: number;
    starting_weight?: number;
    ending_weight?: number;
  };
}): Promise<string> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are NutriLift Coach. Generate a concise weekly summary (3-4 sentences max) that highlights:
1. Key nutrition adherence and patterns
2. Training performance and volume
3. Recovery quality
4. One specific insight or adjustment for next week

Be direct, reference actual numbers, and focus on actionable insights. This summary will be used as context for future coaching conversations.`,
        },
        {
          role: "user",
          content: `Week of ${weekData.week_start} to ${weekData.week_end}:\n${JSON.stringify(weekData, null, 2)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || "Week completed.";
  }) as Promise<string>;
}

/**
 * Generate AI-powered monthly summary from weekly summaries
 */
export async function generateMonthlySummary(monthData: {
  month: string; // YYYY-MM
  weekly_summaries: Array<{ week_start: string; week_end: string; summary: string }>;
  stats: {
    avg_calories: number;
    avg_protein: number;
    protein_hit_rate: number;
    total_workouts: number;
    total_volume_kg: number;
    prs_achieved: number;
    avg_sleep_hr: number;
    weight_change_kg?: number;
    body_fat_change?: number;
  };
}): Promise<string> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are NutriLift Coach. Generate a monthly summary (3-4 paragraphs) that:
1. Synthesizes weekly summaries into monthly trends
2. Highlights body composition and strength changes
3. Identifies patterns in nutrition, training, and recovery
4. Provides key wins and adjustments needed

Be analytical, reference specific numbers, and tell the story of the month. This will be used for quarterly summaries and coach context.`,
        },
        {
          role: "user",
          content: `Month: ${monthData.month}\n\nWeekly Summaries:\n${monthData.weekly_summaries.map(w => `${w.week_start}: ${w.summary}`).join('\n\n')}\n\nMonthly Stats:\n${JSON.stringify(monthData.stats, null, 2)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "Month completed.";
  }) as Promise<string>;
}

/**
 * Generate AI-powered quarterly summary from monthly summaries
 */
export async function generateQuarterlySummary(quarterData: {
  quarter: string; // YYYY-Q1, YYYY-Q2, etc.
  start_date: string;
  end_date: string;
  monthly_summaries: Array<{ month: string; summary: string }>;
  stats: {
    total_workouts: number;
    total_volume_kg: number;
    prs_achieved: number;
    weight_change_kg?: number;
    body_fat_change?: number;
    muscle_gain_kg?: number;
    avg_protein_adherence: number;
  };
}): Promise<string> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are NutriLift Coach. Generate a quarterly summary (4-5 paragraphs) that:
1. Synthesizes 3 months into a transformation arc
2. Analyzes body composition changes and strength progression
3. Identifies major milestones and pattern shifts
4. Discusses phase transitions (bulk/cut/maintenance)
5. Provides strategic insights for next quarter

Be comprehensive, tell the 3-month story, and provide strategic analysis. This will be used for yearly summaries and coach context.`,
        },
        {
          role: "user",
          content: `Quarter: ${quarterData.quarter} (${quarterData.start_date} to ${quarterData.end_date})\n\nMonthly Summaries:\n${quarterData.monthly_summaries.map(m => `${m.month}:\n${m.summary}`).join('\n\n')}\n\nQuarterly Stats:\n${JSON.stringify(quarterData.stats, null, 2)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    return completion.choices[0]?.message?.content || "Quarter completed.";
  }) as Promise<string>;
}

/**
 * Generate AI-powered yearly summary from quarterly summaries
 */
export async function generateYearlySummary(yearData: {
  year: string; // YYYY
  quarterly_summaries: Array<{ quarter: string; summary: string }>;
  stats: {
    starting_weight_kg: number;
    ending_weight_kg: number;
    starting_body_fat?: number;
    ending_body_fat?: number;
    muscle_gained_kg?: number;
    fat_lost_kg?: number;
    total_workouts: number;
    total_volume_kg: number;
    prs_achieved: number;
    major_lifts: {
      bench_start: number;
      bench_end: number;
      squat_start: number;
      squat_end: number;
      deadlift_start: number;
      deadlift_end: number;
    };
  };
}): Promise<string> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are NutriLift Coach. Generate a yearly transformation summary (5-6 paragraphs) that:
1. Tells the complete year-long transformation story
2. Analyzes body composition journey (weight, fat, muscle)
3. Chronicles strength progression across major lifts
4. Discusses nutrition mastery and habit formation
5. Highlights training evolution and methodology
6. Reflects on key lessons learned and sets vision for next year

Be inspirational yet analytical. This is the user's annual transformation story. Reference specific numbers and milestones. This will be used for long-term coach context.`,
        },
        {
          role: "user",
          content: `Year: ${yearData.year}\n\nQuarterly Summaries:\n${yearData.quarterly_summaries.map(q => `${q.quarter}:\n${q.summary}`).join('\n\n')}\n\nYearly Stats:\n${JSON.stringify(yearData.stats, null, 2)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || "Year completed.";
  }) as Promise<string>;
}
