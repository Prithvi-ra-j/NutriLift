// @ts-nocheck
/**
 * Generate comprehensive progress report PDF
 * Includes nutrition logs, workout logs, body stats, and recovery data
 */

import * as Print from "expo-print";
import { getTodayKey, getDateDaysAgo } from "../dates";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { db } from "../db/client";
import { 
  foodLogs, 
  dailyNutrition, 
  workoutSessions, 
  exerciseLogs, 
  setLogs,
  bodyStats,
  recoveryLogs,
  personalRecords
} from "../db/schema";
import { desc, gte, sql } from "drizzle-orm";
import { USER_PROFILE } from "../constants/user-profile";

interface ExportOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  includeNutrition?: boolean;
  includeWorkouts?: boolean;
  includeBody?: boolean;
  includeRecovery?: boolean;
  includePRs?: boolean;
}

/**
 * Generate HTML content for the PDF
 */
async function generateHTML(options: ExportOptions): Promise<string> {
  const {
    startDate,
    endDate,
    includeNutrition = true,
    includeWorkouts = true,
    includeBody = true,
    includeRecovery = true,
    includePRs = true,
  } = options;

  const today = getTodayKey();
  const start = startDate || getDateDaysAgo(30); // Default 30 days
  const end = endDate || today;

  // Fetch all data
  const [nutritionData, workoutData, bodyData, recoveryData, prData] = await Promise.all([
    includeNutrition ? fetchNutritionData(start, end) : null,
    includeWorkouts ? fetchWorkoutData(start, end) : null,
    includeBody ? fetchBodyData(start, end) : null,
    includeRecovery ? fetchRecoveryData(start, end) : null,
    includePRs ? fetchPRData() : null,
  ]);

  // Build HTML
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      color: #1a1a1a;
      background: #ffffff;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #0A0A0F;
      letter-spacing: 1px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      margin-top: 32px;
      margin-bottom: 16px;
      color: #00D4AA;
      border-bottom: 2px solid #00D4AA;
      padding-bottom: 8px;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 12px;
      color: #252535;
    }
    .header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 3px solid #00D4AA;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      font-size: 12px;
      color: #888;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    .summary-card {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #00D4AA;
    }
    .summary-card .label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #0A0A0F;
    }
    .summary-card .subvalue {
      font-size: 12px;
      color: #888;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
    }
    th {
      background: #f8f9fa;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      color: #252535;
      border-bottom: 2px solid #00D4AA;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e9ecef;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-green { background: #d4edda; color: #155724; }
    .badge-amber { background: #fff3cd; color: #856404; }
    .badge-red { background: #f8d7da; color: #721c24; }
    .badge-blue { background: #d1ecf1; color: #0c5460; }
    .pr-badge {
      background: #ffd700;
      color: #000;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      margin-left: 4px;
    }
    .page-break {
      page-break-after: always;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>NUTRILIFT PROGRESS REPORT</h1>
    <div class="subtitle">${USER_PROFILE.name} · ${start} to ${end}</div>
    <div class="meta">
      <span>Generated: ${new Date().toLocaleString()}</span>
      <span>NutriLift v1.0</span>
    </div>
  </div>
`;

  // Summary Section
  if (nutritionData || workoutData) {
    html += `<h2>📊 Summary</h2>`;
    html += `<div class="summary-grid">`;
    
    if (nutritionData) {
      const avgProtein = nutritionData.dailySummaries.reduce((sum, d) => sum + d.total_protein_g, 0) / nutritionData.dailySummaries.length;
      const avgCalories = nutritionData.dailySummaries.reduce((sum, d) => sum + d.total_calories, 0) / nutritionData.dailySummaries.length;
      const proteinDaysHit = nutritionData.dailySummaries.filter(d => d.protein_target_met === 1).length;
      
      html += `
        <div class="summary-card">
          <div class="label">Avg Daily Protein</div>
          <div class="value">${avgProtein.toFixed(0)}g</div>
          <div class="subvalue">Target: ${USER_PROFILE.targets.protein_g}g</div>
        </div>
        <div class="summary-card">
          <div class="label">Avg Daily Calories</div>
          <div class="value">${avgCalories.toFixed(0)}</div>
          <div class="subvalue">Target: ${USER_PROFILE.targets.calories}</div>
        </div>
        <div class="summary-card">
          <div class="label">Protein Target Hit</div>
          <div class="value">${proteinDaysHit}</div>
          <div class="subvalue">of ${nutritionData.dailySummaries.length} days</div>
        </div>
      `;
    }
    
    if (workoutData) {
      const totalVolume = workoutData.sessions.reduce((sum, s) => sum + (s.total_volume_kg || 0), 0);
      html += `
        <div class="summary-card">
          <div class="label">Total Volume</div>
          <div class="value">${(totalVolume / 1000).toFixed(1)}t</div>
          <div class="subvalue">${workoutData.sessions.length} sessions</div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Nutrition Section
  if (includeNutrition && nutritionData) {
    html += `<h2>🍽️ Nutrition Logs</h2>`;
    html += `<h3>Daily Summary</h3>`;
    html += `<table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Calories</th>
          <th>Protein</th>
          <th>Carbs</th>
          <th>Fat</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>`;
    
    for (const day of nutritionData.dailySummaries) {
      const proteinStatus = day.protein_target_met === 1 ? 'badge-green' : 'badge-red';
      html += `
        <tr>
          <td>${day.date}</td>
          <td>${day.total_calories.toFixed(0)} kcal</td>
          <td>${day.total_protein_g.toFixed(0)}g</td>
          <td>${day.total_carbs_g.toFixed(0)}g</td>
          <td>${day.total_fat_g.toFixed(0)}g</td>
          <td><span class="badge ${proteinStatus}">${day.protein_target_met === 1 ? 'Hit' : 'Miss'}</span></td>
        </tr>`;
    }
    
    html += `</tbody></table>`;
    
    // Detailed food logs
    html += `<h3>Detailed Food Logs</h3>`;
    const groupedByDate = groupBy(nutritionData.foodLogs, 'date');
    
    for (const [date, foods] of Object.entries(groupedByDate)) {
      html += `<h4 style="margin-top: 16px; font-size: 14px; color: #666;">${date}</h4>`;
      html += `<table>
        <thead>
          <tr>
            <th>Meal</th>
            <th>Food</th>
            <th>Quantity</th>
            <th>Calories</th>
            <th>Protein</th>
            <th>Carbs</th>
            <th>Fat</th>
          </tr>
        </thead>
        <tbody>`;
      
      for (const food of foods as any[]) {
        html += `
          <tr>
            <td style="text-transform: capitalize;">${food.meal}</td>
            <td>${food.name}</td>
            <td>${food.quantity_g ? food.quantity_g + 'g' : '—'}</td>
            <td>${food.calories.toFixed(0)}</td>
            <td>${food.protein_g.toFixed(0)}g</td>
            <td>${food.carbs_g.toFixed(0)}g</td>
            <td>${food.fat_g.toFixed(0)}g</td>
          </tr>`;
      }
      
      html += `</tbody></table>`;
    }
  }

  // Workout Section
  if (includeWorkouts && workoutData) {
    html += `<div class="page-break"></div>`;
    html += `<h2>💪 Workout Logs</h2>`;
    
    for (const session of workoutData.sessions) {
      html += `<h3>${session.date} - ${session.day_type}</h3>`;
      html += `<p style="font-size: 12px; color: #666; margin-bottom: 12px;">
        Duration: ${session.duration_min || '—'}min | 
        Volume: ${((session.total_volume_kg || 0) / 1000).toFixed(1)}t | 
        RPE: ${session.rpe || '—'}/10
      </p>`;
      
      const exercises = workoutData.exercises.filter(e => e.session_id === session.id);
      
      for (const exercise of exercises) {
        const sets = workoutData.sets.filter(s => s.exercise_log_id === exercise.id);
        
        html += `<h4 style="font-size: 13px; margin-top: 12px; color: #252535;">${exercise.exercise_name}</h4>`;
        html += `<table style="margin-top: 4px;">
          <thead>
            <tr>
              <th>Set</th>
              <th>Weight</th>
              <th>Reps</th>
              <th>RPE</th>
              <th>Volume</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>`;
        
        for (const set of sets) {
          const volume = set.weight_kg * set.reps;
          const type = set.is_warmup ? 'Warmup' : 'Working';
          html += `
            <tr>
              <td>${set.set_number}</td>
              <td>${set.weight_kg}kg</td>
              <td>${set.reps}</td>
              <td>${set.rpe || '—'}</td>
              <td>${volume.toFixed(0)}kg</td>
              <td>${type}${set.is_pr ? '<span class="pr-badge">PR</span>' : ''}</td>
            </tr>`;
        }
        
        html += `</tbody></table>`;
      }
    }
  }

  // Body Stats Section
  if (includeBody && bodyData && bodyData.length > 0) {
    html += `<div class="page-break"></div>`;
    html += `<h2>📏 Body Stats</h2>`;
    html += `<table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Weight</th>
          <th>Body Fat %</th>
          <th>Muscle Mass</th>
          <th>BMI</th>
          <th>InBody Score</th>
        </tr>
      </thead>
      <tbody>`;
    
    for (const stat of bodyData) {
      html += `
        <tr>
          <td>${stat.date}</td>
          <td>${stat.weight_kg ? stat.weight_kg.toFixed(1) + 'kg' : '—'}</td>
          <td>${stat.body_fat_pct ? stat.body_fat_pct.toFixed(1) + '%' : '—'}</td>
          <td>${stat.skeletal_muscle_mass_kg ? stat.skeletal_muscle_mass_kg.toFixed(1) + 'kg' : '—'}</td>
          <td>${stat.bmi ? stat.bmi.toFixed(1) : '—'}</td>
          <td>${stat.inbody_score || '—'}</td>
        </tr>`;
    }
    
    html += `</tbody></table>`;
  }

  // Recovery Section
  if (includeRecovery && recoveryData && recoveryData.length > 0) {
    html += `<h2>😴 Recovery Logs</h2>`;
    html += `<table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Sleep (hrs)</th>
          <th>Sleep Quality</th>
          <th>Energy</th>
          <th>Soreness</th>
          <th>Stress</th>
          <th>HRV</th>
          <th>Resting HR</th>
        </tr>
      </thead>
      <tbody>`;
    
    for (const log of recoveryData) {
      html += `
        <tr>
          <td>${log.date}</td>
          <td>${log.sleep_duration_hr ? log.sleep_duration_hr.toFixed(1) : '—'}</td>
          <td>${log.sleep_quality || '—'}/5</td>
          <td>${log.energy_level || '—'}/5</td>
          <td>${log.muscle_soreness || '—'}/5</td>
          <td>${log.stress_level || '—'}/5</td>
          <td>${log.hrv || '—'}</td>
          <td>${log.resting_hr || '—'}</td>
        </tr>`;
    }
    
    html += `</tbody></table>`;
  }

  // Personal Records Section
  if (includePRs && prData && prData.length > 0) {
    html += `<div class="page-break"></div>`;
    html += `<h2>🏆 Personal Records</h2>`;
    html += `<table>
      <thead>
        <tr>
          <th>Exercise</th>
          <th>Best Weight</th>
          <th>Reps</th>
          <th>Est. 1RM</th>
          <th>Best Volume</th>
          <th>Achieved</th>
        </tr>
      </thead>
      <tbody>`;
    
    for (const pr of prData) {
      html += `
        <tr>
          <td>${pr.exercise_name}</td>
          <td>${pr.best_weight_kg.toFixed(1)}kg</td>
          <td>${pr.best_reps_at_best_weight || '—'}</td>
          <td>${pr.best_1rm_estimated ? pr.best_1rm_estimated.toFixed(1) + 'kg' : '—'}</td>
          <td>${pr.best_volume_single_set ? pr.best_volume_single_set.toFixed(0) + 'kg' : '—'}</td>
          <td>${pr.achieved_date}</td>
        </tr>`;
    }
    
    html += `</tbody></table>`;
  }

  // Footer
  html += `
  <div class="footer">
    <p>Generated by NutriLift · ${new Date().toLocaleDateString()}</p>
    <p style="margin-top: 4px;">Built for ${USER_PROFILE.name} · Training since ${USER_PROFILE.training_start_date}</p>
  </div>
</body>
</html>`;

  return html;
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Data fetching functions
async function fetchNutritionData(startDate: string, endDate: string) {
  const [dailySummaries, foodLogsData] = await Promise.all([
    db.select().from(dailyNutrition)
      .where(sql`${dailyNutrition.date} >= ${startDate} AND ${dailyNutrition.date} <= ${endDate}`)
      .orderBy(desc(dailyNutrition.date)),
    db.select().from(foodLogs)
      .where(sql`${foodLogs.date} >= ${startDate} AND ${foodLogs.date} <= ${endDate}`)
      .orderBy(desc(foodLogs.date)),
  ]);
  
  return { dailySummaries, foodLogs: foodLogsData };
}

async function fetchWorkoutData(startDate: string, endDate: string) {
  const sessions = await db.select().from(workoutSessions)
    .where(sql`${workoutSessions.date} >= ${startDate} AND ${workoutSessions.date} <= ${endDate}`)
    .orderBy(desc(workoutSessions.date));
  
  const sessionIds = sessions.map(s => s.id);
  
  if (sessionIds.length === 0) {
    return { sessions: [], exercises: [], sets: [] };
  }
  
  const [exercises, sets] = await Promise.all([
    db.select().from(exerciseLogs)
      .where(sql`${exerciseLogs.session_id} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`),
    db.select().from(setLogs)
      .where(sql`${setLogs.exercise_log_id} IN (
        SELECT id FROM ${exerciseLogs} 
        WHERE ${exerciseLogs.session_id} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})
      )`),
  ]);
  
  return { sessions, exercises, sets };
}

async function fetchBodyData(startDate: string, endDate: string) {
  return await db.select().from(bodyStats)
    .where(sql`${bodyStats.date} >= ${startDate} AND ${bodyStats.date} <= ${endDate}`)
    .orderBy(desc(bodyStats.date));
}

async function fetchRecoveryData(startDate: string, endDate: string) {
  return await db.select().from(recoveryLogs)
    .where(sql`${recoveryLogs.date} >= ${startDate} AND ${recoveryLogs.date} <= ${endDate}`)
    .orderBy(desc(recoveryLogs.date));
}

async function fetchPRData() {
  return await db.select().from(personalRecords)
    .orderBy(desc(personalRecords.achieved_date));
}

/**
 * Generate and share progress PDF
 */
export async function generateProgressPDF(options: ExportOptions = {}): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    console.log("📄 Generating progress PDF...");
    
    // Generate HTML content
    const htmlContent = await generateHTML(options);
    
    // Generate PDF using expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });
    
    console.log("✅ PDF generated:", uri);
    
    // Share the PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'NutriLift Progress Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.warn("Sharing is not available on this device");
    }
    
    return { success: true, filePath: uri };
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Quick export for last 30 days
 */
export async function exportLast30Days() {
  return generateProgressPDF({
    startDate: getDateDaysAgo(30),
    endDate: getTodayKey(),
  });
}

/**
 * Quick export for current month
 */
export async function exportCurrentMonth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return generateProgressPDF({
    startDate: getLocalDateKey(startOfMonth),
    endDate: getTodayKey(),
  });
}

/**
 * Export all data
 */
export async function exportAllData() {
  return generateProgressPDF({
    startDate: '2020-01-01', // Far back enough to get all data
    endDate: new Date().toISOString().split("T")[0],
  });
}
