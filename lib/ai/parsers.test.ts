import { parseFoodInput } from "./parsers";

describe("food parsing", () => {
  it("uses the local database for known foods", async () => {
    const result = await parseFoodInput("chapati");
    expect(result.source).toBe("local");
    expect(result.items[0]?.calories).toBeGreaterThan(0);
  });

  it("keeps the original user input on a local parse", async () => {
    const input = "phulka";
    const result = await parseFoodInput(input);
    expect(result.original_input).toBe(input);
  });
});
