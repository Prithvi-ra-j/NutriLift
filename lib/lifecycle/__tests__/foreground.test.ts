import { createForegroundBus } from "../foreground";

describe("foreground lifecycle bus", () => {
  it("uses one AppState subscription and notifies the appropriate listeners", () => {
    let onStateChange: ((state: "active" | "background") => void) | undefined;
    const remove = jest.fn();
    const subscribe = jest.fn((listener: (state: "active" | "background") => void) => {
      onStateChange = listener;
      return { remove };
    });
    const bus = createForegroundBus(subscribe);
    const foreground = jest.fn();
    const background = jest.fn();

    bus.onForeground(foreground);
    bus.onBackground(background);

    expect(subscribe).toHaveBeenCalledTimes(1);
    onStateChange?.("active");
    expect(foreground).toHaveBeenCalledTimes(1);
    expect(background).not.toHaveBeenCalled();

    onStateChange?.("background");
    expect(background).toHaveBeenCalledTimes(1);

    bus.dispose();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("continues notifying listeners after one listener throws", () => {
    let onStateChange: ((state: "active" | "background") => void) | undefined;
    const subscribe = (listener: (state: "active" | "background") => void) => {
      onStateChange = listener;
      return { remove: jest.fn() };
    };
    const bus = createForegroundBus(subscribe);
    const nextListener = jest.fn();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    bus.onForeground(() => {
      throw new Error("listener failed");
    });
    bus.onForeground(nextListener);

    onStateChange?.("active");

    expect(nextListener).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[ERROR]",
      "Lifecycle listener failed",
      expect.objectContaining({ state: "active", error: "listener failed" }),
    );

    errorSpy.mockRestore();
    bus.dispose();
  });
});
