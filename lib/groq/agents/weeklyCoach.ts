import { groq } from "../client";
import { safeGroqCall } from "../safeCall";

export interface WeeklyContext {
  weekRange: string;
  goal: string;
  targetCalories: number;
  targetProtein: number;
  days: {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    logged: boolean;
  }[];
  workouts: {
    date: string;
    type: string; // push/pull/legs/rest
    completed: boolean;
    exercises?: { name: string; sets: number; reps: number; weight: number }[];
  }[];
  bodyWeight: { date: string; weight: number }[];
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
}

export interface WeeklyReport {
  summary: string;
  nutritionFeedback: string;
  workoutFeedback: string;
  whatWorked: string[];
  whatDidnt: string[];
  nextWeekFocus: string[];
  overallScore: number; // 1-10
}

/**
 * Generate weekly coaching report using Groq LLaMA
 */
export async function generateWeeklyReport(
  context: WeeklyContext
): Promise<WeeklyReport> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a brutally honest fitness coach. No fluff, no sugarcoating. You analyze real data and tell the user exactly what's working and what isn't.

You are direct, data-driven, and you don't validate excuses. You reference specific numbers from their data in every point.

Respond with valid JSON only using this exact schema:
{
  "summary": "2-3 sentence brutal honest week summary with specific numbers",
  "nutritionFeedback": "specific feedback on their nutrition adherence with actual numbers",
  "workoutFeedback": "specific feedback on their training consistency with actual data",
  "whatWorked": ["list of 2-3 things that actually went well with numbers"],
  "whatDidnt": ["list of 2-3 things that failed with specific examples"],
  "nextWeekFocus": ["max 3 specific actionable things to fix"],
  "overallScore": number between 1 and 10
}

Rules:
- Every claim must reference actual numbers from the data
- Be specific: "Your protein averaged 138g — 17g short of your 155g target" not "protein was a bit low"
- Identify the #1 bottleneck clearly
- No generic advice — everything must be personalized to their data
- Celebrate real wins specifically
- Be harsh on excuses but constructive on solutions`,
        },
        {
          role: "user",
          content: `Analyze my week and give me honest feedback:\n\n${JSON.stringify(
            context,
            null,
            2
          )}`,
        },
      ],
      temperature: 0.3, // Slightly creative but still consistent
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw) as WeeklyReport;

    // Validate and sanitize
    return {
      summary: result.summary || "No summary available",
      nutritionFeedback: result.nutritionFeedback || "No nutrition feedback",
      workoutFeedback: result.workoutFeedback || "No workout feedback",
      whatWorked: Array.isArray(result.whatWorked) ? result.whatWorked : [],
      whatDidnt: Array.isArray(result.whatDidnt) ? result.whatDidnt : [],
      nextWeekFocus: Array.isArray(result.nextWeekFocus)
        ? result.nextWeekFocus
        : [],
      overallScore: Math.max(1, Math.min(10, result.overallScore || 5)),
    };
  }) as Promise<WeeklyReport>;
}

/**
 * Generate daily coaching insight (lighter version for dashboard)
 */
export async function generateDailyInsight(
  todayData: {
    calories: number;
    protein: number;
    targetCalories: number;
    targetProtein: number;
    workoutCompleted: boolean;
    dayType: string;
  }
): Promise<string> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are Apex Coach. Give a single, specific, actionable insight for today based on the user's current progress. Be direct and reference actual numbers. Keep it to 1-2 sentences max.`,
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
