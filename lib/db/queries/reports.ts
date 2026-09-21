import { eq, desc, and, gte, lte } from "drizzle-orm";
import { getLocalDateKey } from "../../dates";
import { db } from "../client";
import { monthlyReports, aiConversations, weeklySummaries, quarterlySummaries, yearlySummaries, type MonthlyReport, type NewMonthlyReport, type AiConversation, type NewAiConversation, type WeeklySummary, type NewWeeklySummary, type QuarterlySummary, type NewQuarterlySummary, type YearlySummary, type NewYearlySummary } from "../schema";

// ─── Monthly Report Queries ───────────────────────────────────────────────────

export async function getAllReports(): Promise<MonthlyReport[]> {
  return db
    .select()
    .from(monthlyReports)
    .orderBy(desc(monthlyReports.month));
}

export async function getReportForMonth(month: string): Promise<MonthlyReport | null> {
  const result = await db
    .select()
    .from(monthlyReports)
    .where(eq(monthlyReports.month, month));
  return result[0] ?? null;
}

export async function insertReport(report: NewMonthlyReport): Promise<void> {
  await db.insert(monthlyReports).values(report);
}

export async function updateReport(
  id: string,
  updates: Partial<NewMonthlyReport>
): Promise<void> {
  await db.update(monthlyReports).set(updates).where(eq(monthlyReports.id, id));
}

// ─── AI Conversation Queries ──────────────────────────────────────────────────

export async function getConversationHistory(limit: number = 50): Promise<AiConversation[]> {
  return db
    .select()
    .from(aiConversations)
    .orderBy(aiConversations.created_at)
    .limit(limit);
}

export async function insertConversationMessage(msg: NewAiConversation): Promise<void> {
  await db.insert(aiConversations).values(msg);
}

export async function clearConversationHistory(): Promise<void> {
  await db.delete(aiConversations);
}

// ─── Weekly Summary Queries ───────────────────────────────────────────────────

export async function getWeeklySummary(weekStart: string): Promise<WeeklySummary | null> {
  const result = await db
    .select()
    .from(weeklySummaries)
    .where(eq(weeklySummaries.week_start, weekStart));
  return result[0] ?? null;
}

export async function getPreviousWeeklySummaries(limit: number = 3): Promise<WeeklySummary[]> {
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  
  // Calculate start of current week (Sunday)
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - currentDayOfWeek);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const summaries: WeeklySummary[] = [];
  
  // Get previous N weeks
  for (let weekOffset = 1; weekOffset <= limit; weekOffset++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - weekOffset * 7);
    
    const summary = await getWeeklySummary(getLocalDateKey(weekStart));
    if (summary) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

export async function getWeeklySummariesForMonth(month: string): Promise<WeeklySummary[]> {
  // month format: YYYY-MM
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // Last day of month
  
  const startStr = getLocalDateKey(startDate);
  const endStr = getLocalDateKey(endDate);
  
  return db
    .select()
    .from(weeklySummaries)
    .where(
      and(
        gte(weeklySummaries.week_start, startStr),
        lte(weeklySummaries.week_end, endStr)
      )
    )
    .orderBy(weeklySummaries.week_start);
}

export async function insertWeeklySummary(summary: NewWeeklySummary): Promise<void> {
  await db.insert(weeklySummaries).values(summary);
}

export async function updateWeeklySummary(
  id: string,
  updates: Partial<NewWeeklySummary>
): Promise<void> {
  await db.update(weeklySummaries).set(updates).where(eq(weeklySummaries.id, id));
}

// ─── Monthly Summary Queries ──────────────────────────────────────────────────

export async function getMonthlySummary(month: string): Promise<MonthlyReport | null> {
  return getReportForMonth(month);
}

export async function getPreviousMonthlySummaries(limit: number = 2): Promise<MonthlyReport[]> {
  const today = new Date();
  const summaries: MonthlyReport[] = [];
  
  // Get previous N months (skip current month)
  for (let monthOffset = 1; monthOffset <= limit; monthOffset++) {
    const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const summary = await getMonthlySummary(month);
    if (summary) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

export async function getMonthlySummariesForQuarter(quarter: string): Promise<MonthlyReport[]> {
  // quarter format: YYYY-Q1, YYYY-Q2, etc.
  const [year, q] = quarter.split('-');
  const quarterNum = parseInt(q.replace('Q', ''));
  
  const startMonth = (quarterNum - 1) * 3 + 1;
  const months: string[] = [];
  
  for (let i = 0; i < 3; i++) {
    const month = startMonth + i;
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  
  const summaries: MonthlyReport[] = [];
  for (const month of months) {
    const summary = await getMonthlySummary(month);
    if (summary) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

// ─── Quarterly Summary Queries ────────────────────────────────────────────────

export async function getQuarterlySummary(quarter: string): Promise<QuarterlySummary | null> {
  const result = await db
    .select()
    .from(quarterlySummaries)
    .where(eq(quarterlySummaries.quarter, quarter));
  return result[0] ?? null;
}

export async function getPreviousQuarterlySummaries(limit: number = 1): Promise<QuarterlySummary[]> {
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
  const currentYear = today.getFullYear();
  
  const summaries: QuarterlySummary[] = [];
  
  // Get previous N quarters (skip current quarter)
  for (let quarterOffset = 1; quarterOffset <= limit; quarterOffset++) {
    let q = currentQuarter - quarterOffset;
    let y = currentYear;
    
    while (q <= 0) {
      q += 4;
      y -= 1;
    }
    
    const quarter = `${y}-Q${q}`;
    const summary = await getQuarterlySummary(quarter);
    if (summary) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

export async function getQuarterlySummariesForYear(year: string): Promise<QuarterlySummary[]> {
  const summaries: QuarterlySummary[] = [];
  
  for (let q = 1; q <= 4; q++) {
    const quarter = `${year}-Q${q}`;
    const summary = await getQuarterlySummary(quarter);
    if (summary) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

export async function insertQuarterlySummary(summary: NewQuarterlySummary): Promise<void> {
  await db.insert(quarterlySummaries).values(summary);
}

export async function updateQuarterlySummary(
  id: string,
  updates: Partial<NewQuarterlySummary>
): Promise<void> {
  await db.update(quarterlySummaries).set(updates).where(eq(quarterlySummaries.id, id));
}

// ─── Yearly Summary Queries ───────────────────────────────────────────────────

export async function getYearlySummary(year: string): Promise<YearlySummary | null> {
  const result = await db
    .select()
    .from(yearlySummaries)
    .where(eq(yearlySummaries.year, year));
  return result[0] ?? null;
}

export async function getPreviousYearlySummaries(limit: number = 5): Promise<YearlySummary[]> {
  const currentYear = new Date().getFullYear();
  const summaries: YearlySummary[] = [];
  
  // Get previous N years (skip current year)
  for (let yearOffset = 1; yearOffset <= limit; yearOffset++) {
    const year = String(currentYear - yearOffset);
    const summary = await getYearlySummary(year);
    if (summary) {
      summaries.push(summary);
    }
  }
  
  return summaries;
}

export async function insertYearlySummary(summary: NewYearlySummary): Promise<void> {
  await db.insert(yearlySummaries).values(summary);
}

export async function updateYearlySummary(
  id: string,
  updates: Partial<NewYearlySummary>
): Promise<void> {
  await db.update(yearlySummaries).set(updates).where(eq(yearlySummaries.id, id));
}
