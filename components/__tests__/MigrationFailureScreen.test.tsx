import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { sqlite } from "../../lib/db/client";
import {
  exportDatabaseBackup,
  isDatabaseBackupExportable,
} from "../../lib/data/exportAll";
import { MigrationFailureScreen } from "../MigrationFailureScreen";

jest.mock("../../lib/db/client", () => ({
  sqlite: { getFirstAsync: jest.fn() },
}));

jest.mock("../../lib/data/exportAll", () => ({
  exportDatabaseBackup: jest.fn(),
  isDatabaseBackupExportable: jest.fn(),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.2.3" } },
}));

jest.mock("../../lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

const mockedDatabase = jest.mocked(sqlite);
const mockedExportability = jest.mocked(isDatabaseBackupExportable);
const mockedExport = jest.mocked(exportDatabaseBackup);
const mockedClipboard = jest.mocked(Clipboard.setStringAsync);

describe("MigrationFailureScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDatabase.getFirstAsync
      .mockResolvedValueOnce({ user_version: 4 } as never)
      .mockResolvedValueOnce({ quick_check: "ok" } as never);
    mockedExportability.mockResolvedValue(true);
    mockedExport.mockResolvedValue("file:///backup.json");
    mockedClipboard.mockResolvedValue(true);
  });

  it("shows database diagnostics and copies them to the clipboard", async () => {
    const ui = await render(
      <MigrationFailureScreen message="migration failed" onRetry={jest.fn()} />,
    );

    expect(await ui.findByText(/SQLite user_version: 4/)).toBeTruthy();
    await fireEvent.press(ui.getByRole("button", { name: "Copy diagnostics" }));

    await waitFor(() => {
      expect(mockedClipboard).toHaveBeenCalledWith(
        expect.stringContaining("App version: 1.2.3"),
      );
    });
    expect(mockedClipboard).toHaveBeenCalledWith(
      expect.stringContaining("Error: migration failed"),
    );
  });

  it("offers a backup only when the database passes integrity and schema checks", async () => {
    const ui = await render(
      <MigrationFailureScreen message="migration failed" onRetry={jest.fn()} />,
    );

    const exportButton = await ui.findByRole("button", {
      name: "Export database backup",
    });
    await fireEvent.press(exportButton);

    await waitFor(() => {
      expect(mockedExport).toHaveBeenCalledTimes(1);
    });
  });

  it("does not offer a backup when SQLite integrity check fails", async () => {
    mockedDatabase.getFirstAsync.mockReset();
    mockedDatabase.getFirstAsync
      .mockResolvedValueOnce({ user_version: 4 } as never)
      .mockResolvedValueOnce({ quick_check: "corrupt" } as never);

    const ui = await render(
      <MigrationFailureScreen message="migration failed" onRetry={jest.fn()} />,
    );

    await waitFor(() => {
      expect(mockedDatabase.getFirstAsync).toHaveBeenCalledTimes(2);
    });
    expect(
      ui.queryByRole("button", { name: "Export database backup" }),
    ).toBeNull();
    expect(mockedExportability).not.toHaveBeenCalled();
  });
});
