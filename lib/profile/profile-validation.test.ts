import { mergeUserProfileFields, validateUserProfile } from "./profile-validation";

describe("user profile validation", () => {
  it("allows an empty or partial profile so users can complete it gradually", () => {
    expect(validateUserProfile({}).valid).toBe(true);
    expect(validateUserProfile({ height_cm: 172.7 }).valid).toBe(true);
  });
  it.each([
    [{ age: 12 }, /Age/],
    [{ age: 23.5 }, /Age/],
    [{ height_cm: 251 }, /Height/],
    [{ body_fat_goal_pct: 75 }, /Body-fat goal/],
    [{ body_fat_goal_date: "2026-02-30" }, /goal date/],
    [{ sex: "unknown" }, /Sex/],
    [{ training_start_date: "2026-02-30" }, /date/],
    [{ physique_goal: "x".repeat(161) }, /160 characters/],
  ])("rejects invalid profile input %#", (input, expected) => {
    const result = validateUserProfile(input as any);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(expected);
  });
  it("accepts a valid user-owned profile", () => {
    expect(validateUserProfile({
      age: 23, sex: "male", height_cm: 172.7, training_start_date: "2026-02-27",
      current_split: "PPL", training_phase: "Foundation", physique_goal: "Athletic",
      body_fat_goal_pct: 22, body_fat_goal_date: "2026-12-31",
    }).valid).toBe(true);
  });
});


describe("partial profile updates", () => {
  it("preserves omitted fields and clears only fields explicitly set to null", () => {
    const existing = { age: 23, height_cm: 172, physique_goal: "Athletic", sex: "male" as const };
    expect(mergeUserProfileFields(existing, { height_cm: 173 })).toEqual({
      age: 23, height_cm: 173, physique_goal: "Athletic", sex: "male",
    });
    expect(mergeUserProfileFields(existing, { physique_goal: null })).toEqual({
      age: 23, height_cm: 172, physique_goal: null, sex: "male",
    });
  });

  it("starts a new partial profile without inventing personal defaults", () => {
    expect(mergeUserProfileFields(null, { height_cm: 172 })).toEqual({ height_cm: 172 });
  });
});
