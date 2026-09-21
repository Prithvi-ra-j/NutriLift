import { calculateEpley1RM } from "./workout";

describe("workout calculations", () => {
  it("uses the Epley formula for multi-rep sets", () => {
    expect(calculateEpley1RM(60, 10)).toBeCloseTo(80);
  });

  it("returns the input weight for a single rep", () => {
    expect(calculateEpley1RM(100, 1)).toBe(100);
  });
});
