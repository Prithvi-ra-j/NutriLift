export type ProgressionSet = {
  weightKg: number;
  reps: number;
  isWarmup: boolean;
};

export type ProgressionSession = {
  sessionId: string;
  date: string;
  sets: ProgressionSet[];
};

export function shouldIncreaseLoad(
  lastTwoSessions: ProgressionSession[],
  repRange: [number, number],
  targetSets: number,
): boolean {
  if (
    targetSets < 1 ||
    repRange[0] < 1 ||
    repRange[1] < repRange[0]
  ) {
    throw new RangeError("Progression targets must be positive and ordered.");
  }

  const distinctSessions: ProgressionSession[] = [];
  const seenDates = new Set<string>();
  for (const session of lastTwoSessions) {
    if (seenDates.has(session.date)) continue;
    seenDates.add(session.date);
    distinctSessions.push(session);
    if (distinctSessions.length === 2) break;
  }
  if (distinctSessions.length < 2) return false;

  return distinctSessions.every((session) => {
    const workingSets = session.sets.filter((set) => !set.isWarmup);
    if (workingSets.length < targetSets) return false;
    const weight = workingSets[0]?.weightKg;
    return (
      Number.isFinite(weight) &&
      workingSets.every(
        (set) =>
          set.weightKg === weight &&
          Number.isFinite(set.reps) &&
          set.reps >= repRange[1],
      )
    );
  });
}
