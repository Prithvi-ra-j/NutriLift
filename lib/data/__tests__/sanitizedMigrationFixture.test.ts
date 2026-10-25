import { buildSanitizedV0Fixture } from "../sanitizedMigrationFixture";

describe("buildSanitizedV0Fixture", () => {
  it("writes only fixed, linked fixture rows for locally populated categories", () => {
    const fixture = buildSanitizedV0Fixture({
      foodLog: true,
      dailyNutrition: true,
      workoutSession: true,
      exerciseLog: true,
      setLog: true,
      recoveryLog: true,
      personalRecord: true,
    });

    expect(fixture).toContain("PRAGMA user_version = 0");
    expect(fixture).toContain("DROP TABLE IF EXISTS custom_exercises");
    expect(fixture).toContain("'Fixture Food'");
    expect(fixture).toContain("'Fixture Exercise'");
    expect(fixture).toContain("'fixture-session-1'");
    expect(fixture).toContain("'fixture-set-1'");
    expect(fixture).not.toMatch(/coach_notes|context_snapshot|raw_input/);
    expect(fixture.indexOf("INSERT INTO workout_sessions")).toBeLessThan(
      fixture.indexOf("INSERT INTO exercise_logs"),
    );
    expect(fixture.indexOf("INSERT INTO exercise_logs")).toBeLessThan(
      fixture.indexOf("INSERT INTO set_logs"),
    );
  });

  it("omits child rows when their parent category is absent", () => {
    const fixture = buildSanitizedV0Fixture({
      foodLog: true,
      dailyNutrition: false,
      workoutSession: false,
      exerciseLog: true,
      setLog: true,
      recoveryLog: false,
      personalRecord: false,
    });

    expect(fixture).toContain("INSERT INTO food_logs");
    expect(fixture).not.toContain("INSERT INTO exercise_logs");
    expect(fixture).not.toContain("INSERT INTO set_logs");
  });

  it("rejects an empty local database instead of fabricating a device fixture", () => {
    expect(() =>
      buildSanitizedV0Fixture({
        foodLog: false,
        dailyNutrition: false,
        workoutSession: false,
        exerciseLog: false,
        setLog: false,
        recoveryLog: false,
        personalRecord: false,
      }),
    ).toThrow("There is no local log data");
  });
});
