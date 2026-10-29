import { Platform } from "react-native";
import { nowIso } from "./time/clock";
import { FileLogStore } from "./logger/fileStore";
import type { LogEntry, LogLevel } from "./logger/types";

type ConsoleArguments = Parameters<Console["log"]>;
const runtimeConsole: Console = globalThis["console"];

function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.timestamp === "string" &&
    (entry.level === "info" ||
      entry.level === "warn" ||
      entry.level === "error" ||
      entry.level === "debug") &&
    typeof entry.message === "string" &&
    (entry.stack === undefined || typeof entry.stack === "string")
  );
}

class Logger {
  private readonly fileStore = new FileLogStore();
  private isInitialized = false;
  private logQueue: LogEntry[] = [];
  private fileWriteQueue: Promise<void> = Promise.resolve();
  private originalConsoleMethods:
    | Pick<Console, "log" | "warn" | "error" | "debug">
    | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (Platform.OS === "web") {
      // On web, we'll just use console and localStorage
      this.isInitialized = true;
      this.setupWebLogging();
      return;
    }

    try {
      const timestamp = await this.fileStore.initialize();
      if (__DEV__) {
        await this.writeToFile({
          timestamp,
          level: "info",
          message: "=== Log session started ===",
        });
      }

      this.isInitialized = true;

      // Process queued logs
      for (const entry of this.logQueue) {
        if (__DEV__ || entry.level === "error") {
          await this.writeToFile(entry);
        }
      }
      this.logQueue = [];

      void this.fileStore.cleanupOldLogs().catch((error: unknown) => {
        runtimeConsole.error("Failed to cleanup old logs:", error);
      });
    } catch (error) {
      runtimeConsole.error("Failed to initialize logger:", error);
      this.isInitialized = true; // Set to true anyway to prevent infinite queue
    }
  }

  private setupWebLogging() {
    // Intercept console methods on web
    const originalConsole = {
      log: runtimeConsole.log,
      warn: runtimeConsole.warn,
      error: runtimeConsole.error,
      debug: runtimeConsole.debug,
    };
    this.originalConsoleMethods = originalConsole;

    // Override console methods to also log to localStorage
    runtimeConsole.log = (...args: ConsoleArguments) => {
      originalConsole.log(...args);
      this.logToWebStorage("info", args);
    };

    runtimeConsole.warn = (...args: ConsoleArguments) => {
      originalConsole.warn(...args);
      this.logToWebStorage("warn", args);
    };

    runtimeConsole.error = (...args: ConsoleArguments) => {
      originalConsole.error(...args);
      this.logToWebStorage("error", args);
    };

    runtimeConsole.debug = (...args: ConsoleArguments) => {
      originalConsole.debug(...args);
      this.logToWebStorage("debug", args);
    };

    // Capture unhandled errors
    window.addEventListener("error", (event) => {
      this.error("Unhandled error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.error("Unhandled promise rejection", {
        reason: event.reason,
        promise: event.promise,
      });
    });
  }

  private logToWebStorage(level: LogLevel, args: ConsoleArguments) {
    try {
      const entry: LogEntry = {
        timestamp: nowIso(),
        level,
        message: args.map((arg) => 
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" "),
      };

      // Get existing logs from localStorage
      const logsKey = "nutrilift_logs";
      const existingLogs = localStorage.getItem(logsKey) ?? localStorage.getItem("apex_logs");
      const logs: LogEntry[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(entry);

      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      localStorage.setItem(logsKey, JSON.stringify(logs));
      localStorage.removeItem("apex_logs");
    } catch (error) {
      this.originalConsoleMethods?.warn("Failed to persist web logs:", error);
    }
  }

  private async writeToFile(entry: LogEntry) {
    try {
      const persistedEntry: LogEntry = __DEV__
        ? entry
        : {
            timestamp: entry.timestamp,
            level: entry.level,
            message: entry.message.slice(0, 2_000),
            stack: entry.stack?.slice(0, 8_000),
          };
      await this.fileStore.write(persistedEntry);
    } catch (error) {
      runtimeConsole.error("Failed to write to log file:", error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    return `${JSON.stringify(entry)}\n`;
  }

  private enqueueFileWrite(entry: LogEntry) {
    this.fileWriteQueue = this.fileWriteQueue.then(() => this.writeToFile(entry));
  }

  public info(message: string, context?: unknown) {
    this.log("info", message, context);
  }

  public warn(message: string, context?: unknown) {
    this.log("warn", message, context);
  }

  public error(message: string, context?: unknown) {
    this.log("error", message, context);
  }

  public debug(message: string, context?: unknown) {
    this.log("debug", message, context);
  }

  private log(level: LogLevel, message: string, context?: unknown) {
    const entry: LogEntry = {
      timestamp: nowIso(),
      level,
      message,
      context,
    };

    // Also log to console
    const consoleMethod = level === "debug" ? runtimeConsole.log : runtimeConsole[level];
    if (__DEV__ && context) {
      consoleMethod(`[${level.toUpperCase()}]`, message, context);
    } else {
      consoleMethod(`[${level.toUpperCase()}]`, message);
    }

    if (!this.isInitialized) {
      this.logQueue.push(entry);
      return;
    }

    if (Platform.OS !== "web" && (__DEV__ || level === "error")) {
      this.enqueueFileWrite(entry);
    }
  }

  public async getLogFilePath(): Promise<string | null> {
    return this.fileStore.getPath();
  }

  public async getAllLogFiles(): Promise<string[]> {
    if (Platform.OS === "web") return [];

    try {
      return await this.fileStore.getAllPaths();
    } catch (error) {
      this.error("Failed to get log files", error);
      throw error;
    }
  }

  public async getWebLogs(): Promise<LogEntry[]> {
    if (Platform.OS !== "web") return [];

    try {
      const logsKey = "nutrilift_logs";
      const existingLogs = localStorage.getItem(logsKey);
      const logs: unknown = existingLogs ? JSON.parse(existingLogs) : [];
      if (!Array.isArray(logs) || !logs.every(isLogEntry)) {
        throw new Error("Stored web logs have an invalid format.");
      }
      return logs;
    } catch (error) {
      this.error("Failed to read web logs", error);
      throw error;
    }
  }

  public async exportWebLogs(): Promise<string> {
    const logs = await this.getWebLogs();
    return logs.map((entry) => this.formatLogEntry(entry)).join("");
  }

  public clearWebLogs() {
    if (Platform.OS === "web") {
      localStorage.removeItem("nutrilift_logs");
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Export error boundary helper
export function logError(error: Error, errorInfo?: unknown) {
  logger.error(error.message, {
    stack: error.stack,
    errorInfo,
  });
}
