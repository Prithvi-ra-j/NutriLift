jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("../../../db/client", () => ({
  sqlite: { runAsync: jest.fn() },
}));

import { sqlite } from "../../../db/client";
import { recoverInterruptedSyncOperations } from "../syncRepository";

const mockedSqlite = jest.mocked(sqlite as unknown as {
  runAsync: jest.Mock;
});

describe("recoverInterruptedSyncOperations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSqlite.runAsync.mockResolvedValue({ changes: 2 });
  });

  it("returns interrupted uploads to pending after the stale threshold", async () => {
    const before = Date.now();
    await expect(recoverInterruptedSyncOperations(60_000)).resolves.toBe(2);

    expect(mockedSqlite.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = mockedSqlite.runAsync.mock.calls[0];
    expect(sql).toContain("state = 'uploading'");
    expect(sql).toContain("state = 'pending'");
    expect(sql).toContain("next_retry_at = NULL");
    expect(typeof params[0]).toBe("string");
    expect(typeof params[1]).toBe("string");
    expect(Date.parse(params[1])).toBeLessThanOrEqual(before - 60_000);
  });

  it("rejects invalid stale thresholds", async () => {
    await expect(recoverInterruptedSyncOperations(0)).rejects.toThrow(
      "staleAfterMs must be a positive finite number.",
    );
    expect(mockedSqlite.runAsync).not.toHaveBeenCalled();
  });
});
