import { calculateCalorieAdherenceScore } from "../nutrition-scores";

describe("calorie adherence score", () => {
  it("scores exact target as 100 and scales linearly with deviation", () => {
    expect(calculateCalorieAdherenceScore(2000, 2000)).toBe(100);
    expect(calculateCalorieAdherenceScore(1800, 2000)).toBe(90);
    expect(calculateCalorieAdherenceScore(2200, 2000)).toBe(90);
  });

  it("never returns a negative or non-finite score", () => {
    expect(calculateCalorieAdherenceScore(5000, 2000)).toBe(0);
    expect(calculateCalorieAdherenceScore(Number.NaN, 2000)).toBe(0);
    expect(calculateCalorieAdherenceScore(1000, 0)).toBe(0);
  });
});
