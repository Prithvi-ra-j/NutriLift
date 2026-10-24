import { act, renderHook } from "@testing-library/react-native";
import { useToday } from "../useToday";

const lifecycle = jest.requireMock("../../lifecycle/foreground") as {
  onForeground: jest.Mock;
};

jest.mock("../../lifecycle/foreground", () => ({
  onForeground: jest.fn(),
}));

describe("useToday", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    lifecycle.onForeground.mockReset();
    lifecycle.onForeground.mockImplementation(() => jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates after local midnight", async () => {
    jest.setSystemTime(new Date(2026, 9, 17, 23, 59, 59));
    const { result, unmount } = await renderHook(() => useToday());
    expect(result.current).toBe("2026-10-17");

    await act(async () => {
      jest.advanceTimersByTime(1_001);
    });
    expect(result.current).toBe("2026-10-18");
    unmount();
  });

  it("refreshes and reschedules when the app foregrounds", async () => {
    let foreground: (() => void) | undefined;
    lifecycle.onForeground.mockImplementation((listener: () => void) => {
      foreground = listener;
      return jest.fn();
    });
    jest.setSystemTime(new Date(2026, 9, 17, 12));
    const { result, unmount } = await renderHook(() => useToday());
    expect(result.current).toBe("2026-10-17");

    await act(async () => {
      jest.setSystemTime(new Date(2026, 9, 18, 8));
      foreground?.();
    });
    expect(result.current).toBe("2026-10-18");
    unmount();
  });
});
