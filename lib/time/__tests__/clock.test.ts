import { nowIso, nowUnix } from "../clock";

describe("clock helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-17T12:34:56.789Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the current instant as ISO and Unix seconds", () => {
    expect(nowIso()).toBe("2026-04-17T12:34:56.789Z");
    expect(nowUnix()).toBe(1776429296);
  });
});
