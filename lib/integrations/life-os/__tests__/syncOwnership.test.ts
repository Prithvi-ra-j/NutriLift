jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("../../../db/client", () => ({ sqlite: { runAsync: jest.fn(), getAllAsync: jest.fn() } }));

import { sqlite } from "../../../db/client";
import { bindSyncOwner } from "../syncRepository";

const mockedSqlite = jest.mocked(sqlite as unknown as { getAllAsync: jest.Mock; runAsync: jest.Mock });

describe("bindSyncOwner", () => {
  beforeEach(() => jest.clearAllMocks());

  it("claims an unbound local dataset for the signed-in user", async () => {
    mockedSqlite.getAllAsync.mockResolvedValueOnce([]);
    mockedSqlite.runAsync.mockResolvedValueOnce({ changes: 1 });
    await expect(bindSyncOwner("user-a")).resolves.toEqual({ allowed: true, ownerUserId: "user-a" });
    expect(mockedSqlite.runAsync.mock.calls[0][0]).toContain("COALESCE(sync_state.owner_user_id, excluded.owner_user_id)");
  });

  it("blocks a different account from uploading the same local dataset", async () => {
    mockedSqlite.getAllAsync.mockResolvedValueOnce([{ owner_user_id: "user-a" }]);
    await expect(bindSyncOwner("user-b")).resolves.toEqual({ allowed: false, ownerUserId: "user-a" });
    expect(mockedSqlite.runAsync).not.toHaveBeenCalled();
  });

  it("rejects blank account IDs", async () => {
    await expect(bindSyncOwner(" ")).rejects.toThrow("signed-in user ID is required");
    expect(mockedSqlite.getAllAsync).not.toHaveBeenCalled();
  });
});
