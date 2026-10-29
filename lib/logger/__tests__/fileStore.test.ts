import { FileLogStore } from "../fileStore";
import type { LogEntry } from "../types";

jest.mock("expo-file-system/legacy", () => {
  const files = new Map<string, string>();
  return {
    documentDirectory: "file:///documents/",
    EncodingType: { UTF8: "utf8" },
    _files: files,
    getInfoAsync: jest.fn(async (path: string) => ({
      exists: files.has(path),
      modificationTime: Date.now(),
    })),
    makeDirectoryAsync: jest.fn(async () => undefined),
    readAsStringAsync: jest.fn(async (path: string) => files.get(path) ?? ""),
    writeAsStringAsync: jest.fn(async (path: string, value: string) => {
      files.set(path, value);
    }),
    readDirectoryAsync: jest.fn(async () => []),
    deleteAsync: jest.fn(async () => undefined),
  };
});

const mockFiles = (
  jest.requireMock("expo-file-system/legacy") as { _files: Map<string, string> }
)._files;

describe("FileLogStore", () => {
  beforeEach(() => {
    mockFiles.clear();
  });

  it("keeps the newest entries within the 256 KiB file cap", async () => {
    const store = new FileLogStore();
    await store.initialize();
    const entry: LogEntry = {
      timestamp: "2026-07-14T09:00:00.000Z",
      level: "error",
      message: "",
    };

    for (let index = 0; index < 28; index += 1) {
      await store.write({ ...entry, message: `${index}: ${"x".repeat(10_000)}` });
    }

    const path = store.getPath();
    expect(path).not.toBeNull();
    const output = mockFiles.get(path ?? "");
    expect(output).toBeDefined();
    expect(Buffer.byteLength(output ?? "", "utf8")).toBeLessThanOrEqual(256 * 1024);
    expect(output).toContain('"message":"27: ');
    expect(output).not.toContain('"message":"0: ');
  });

  it("bounds a single oversized entry without discarding it", async () => {
    const store = new FileLogStore();
    await store.initialize();
    await store.write({
      timestamp: "2026-07-14T09:00:00.000Z",
      level: "error",
      message: "x".repeat(300_000),
      context: { sensitive: "not retained on truncation" },
    });

    const output = mockFiles.get(store.getPath() ?? "");
    expect(output).toContain('"message":"');
    expect(output).not.toContain("not retained on truncation");
    expect(Buffer.byteLength(output ?? "", "utf8")).toBeLessThanOrEqual(256 * 1024);
  });
});
