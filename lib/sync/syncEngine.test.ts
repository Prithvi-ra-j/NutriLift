import { createSingleFlight } from "./singleFlight";

describe("sync single-flight engine", () => {
  it("returns the active upload promise to concurrent triggers", async () => {
    let finish!: (value: string) => void;
    const operation = jest.fn(() => new Promise<string>((resolve) => {
      finish = resolve;
    }));
    const request = createSingleFlight(operation);

    const foreground = request("foreground");
    const network = request("network-restored");
    expect(network).toBe(foreground);
    expect(operation).toHaveBeenCalledTimes(1);
    finish("uploaded");
    await expect(foreground).resolves.toBe("uploaded");
    expect(request.isRunning).toBe(false);
  });

  it("allows a new attempt after an interrupted upload rejects", async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error("process stopped"))
      .mockResolvedValueOnce("reclaimed");
    const request = createSingleFlight(operation);

    await expect(request("foreground")).rejects.toThrow("process stopped");
    await expect(request("relaunch")).resolves.toBe("reclaimed");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
