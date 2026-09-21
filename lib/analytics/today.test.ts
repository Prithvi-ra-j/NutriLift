import { getMealCount, getProteinRemaining } from "./today";

describe("today derived metrics", () => {
  it("counts distinct meal groups rather than assuming a fixed count", () => {
    const logs: any[] = [
      { meal: "breakfast" }, { meal: "breakfast" }, { meal: "dinner" },
    ];
    expect(getMealCount(logs)).toBe(2);
  });

  it("never returns negative protein remaining", () => {
    expect(getProteinRemaining(180, 155)).toBe(0);
    expect(getProteinRemaining(120, 155)).toBe(35);
  });
});
