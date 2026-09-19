import { groq } from "./client";
import { safeGroqCall } from "./safeCall";

export interface MonthlyReportData {
  month: string;
  nutrition_logs: any[];
  workout_sessions: any[];
  personal_records: any[];
  inbody_records: any[];
  weight_history: any[];
  recovery_logs: any[];
  supplement_adherence: any;
}

export interface MonthlyReport {
  executive_summary: {
    headline: string;
    overall_score: number;
    top_3_wins: string[];
    top_3_areas_to_improve: string[];
  };
  nutrition: {
    avg_calories: number;
    avg_protein_g: number;
    adherence_pct: number;
    key_insights: string[];
  };
  strength: {
    total_sessions: number;
    prs_hit: number;
    volume_trend: string;
    key_insights: string[];
  };
  body_composition: {
    weight_change_kg: number;
    estimated_fat_loss_kg: number | null;
    estimated_muscle_gain_kg: number | null;
    key_insights: string[];
  };
  recovery: {
    avg_sleep_hours: number | null;
    supplement_adherence_pct: number;
    key_insights: string[];
  };
  next_month_plan: {
    nutrition_adjustments: string[];
    training_adjustments: string[];
    recovery_focus: string[];
  };
  ai_narrative: string;
}

/**
 * Generate comprehensive monthly report using Groq LLaMA
 */
export async function generateMonthlyReport(
  userProfile: any,
  monthData: MonthlyReportData
): Promise<MonthlyReport> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are NutriLift Coach. Generate a brutally honest, scientifically rigorous monthly report.

ALWAYS respond with valid JSON only, no markdown, no explanation, no code blocks.

Rules:
- Every claim must reference actual numbers from the data
- Be specific: "Your protein averaged 138g — 17g short of your 155g target" not "protein was a bit low"
- Identify the #1 bottleneck to their goal clearly
- The next month plan must have specific, executable actions — not vague advice
- Flag any concerning patterns (e.g. consistently low sleep before leg days, protein always missed at dinner)
- Celebrate real wins specifically
- Estimate body recomposition progress using InBody deltas if available, otherwise use weight trend + training volume proxy
- Total length of ai_narrative: 400-600 words

Use this exact schema:
{
  "executive_summary": {
    "headline": "One sentence summary of the month",
    "overall_score": number 1-100,
    "top_3_wins": ["specific win 1", "specific win 2", "specific win 3"],
    "top_3_areas_to_improve": ["specific area 1", "specific area 2", "specific area 3"]
  },
  "nutrition": {
    "avg_calories": number,
    "avg_protein_g": number,
    "adherence_pct": number,
    "key_insights": ["insight 1", "insight 2", "insight 3"]
  },
  "strength": {
    "total_sessions": number,
    "prs_hit": number,
    "volume_trend": "increasing" | "stable" | "decreasing",
    "key_insights": ["insight 1", "insight 2", "insight 3"]
  },
  "body_composition": {
    "weight_change_kg": number,
    "estimated_fat_loss_kg": number or null,
    "estimated_muscle_gain_kg": number or null,
    "key_insights": ["insight 1", "insight 2"]
  },
  "recovery": {
    "avg_sleep_hours": number or null,
    "supplement_adherence_pct": number,
    "key_insights": ["insight 1", "insight 2"]
  },
  "next_month_plan": {
    "nutrition_adjustments": ["adjustment 1", "adjustment 2", "adjustment 3"],
    "training_adjustments": ["adjustment 1", "adjustment 2"],
    "recovery_focus": ["focus 1", "focus 2"]
  },
  "ai_narrative": "400-600 word brutally honest assessment with specific numbers and actionable insights"
}`,
        },
        {
          role: "user",
          content: `User Profile:\n${JSON.stringify(userProfile, null, 2)}\n\nMonth Data:\n${JSON.stringify(monthData, null, 2)}\n\nGenerate my monthly report.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as MonthlyReport;
  }) as Promise<MonthlyReport>;
}
