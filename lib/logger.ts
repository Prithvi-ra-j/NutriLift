import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  stack?: string;
  context?: any;
}

class Logger {
  private logDir: string | null = null;
  private currentLogFile: string | null = null;
  private isInitialized = false;
  private logQueue: LogEntry[] = [];

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
      // Create logs directory in document directory
      this.logDir = `${FileSystem.documentDirectory}logs`;
      
      const dirInfo = await FileSystem.getInfoAsync(this.logDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.logDir, { intermediates: true });
      }

      // Create log file with timestamp
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
      const fileName = `app-${dateStr}_${timeStr}.log`;
      
      this.currentLogFile = `${this.logDir}/${fileName}`;
      
      // Write initial log entry
      await this.writeToFile({
        timestamp: now.toISOString(),
        level: "info",
        message: "=== Log session started ===",
      });

      this.isInitialized = true;

      // Process queued logs
      for (const entry of this.logQueue) {
        await this.writeToFile(entry);
      }
      this.logQueue = [];

      // Clean up old logs (keep last 30 days)
      this.cleanupOldLogs();
    } catch (error) {
      console.error("Failed to initialize logger:", error);
      this.isInitialized = true; // Set to true anyway to prevent infinite queue
    }
  }

  private setupWebLogging() {
    // Intercept console methods on web
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console methods to also log to localStorage
    console.log = (...args: any[]) => {
      originalConsole.log(...args);
      this.logToWebStorage("info", args);
    };

    console.warn = (...args: any[]) => {
      originalConsole.warn(...args);
      this.logToWebStorage("warn", args);
    };

    console.error = (...args: any[]) => {
      originalConsole.error(...args);
      this.logToWebStorage("error", args);
    };

    console.debug = (...args: any[]) => {
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

  private logToWebStorage(level: LogLevel, args: any[]) {
    try {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
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
      // Silently fail if localStorage is full or unavailable
    }
  }

  private async writeToFile(entry: LogEntry) {
    if (!this.currentLogFile) return;

    try {
      const logLine = this.formatLogEntry(entry);
      await FileSystem.writeAsStringAsync(this.currentLogFile, logLine, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\n`;
    
    if (entry.stack) {
      line += `Stack: ${entry.stack}\n`;
    }
    
    if (entry.context) {
      line += `Context: ${JSON.stringify(entry.context, null, 2)}\n`;
    }
    
    return line;
  }

  private async cleanupOldLogs() {
    if (!this.logDir) return;

    try {
      const files = await FileSystem.readDirectoryAsync(this.logDir);
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = `${this.logDir}/${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          if (fileInfo.modificationTime < thirtyDaysAgo) {
            await FileSystem.deleteAsync(filePath);
          }
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  public info(message: string, context?: any) {
    this.log("info", message, context);
  }

  public warn(message: string, context?: any) {
    this.log("warn", message, context);
  }

  public error(message: string, context?: any) {
    this.log("error", message, context);
  }

  public debug(message: string, context?: any) {
    this.log("debug", message, context);
  }

  private log(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Also log to console
    const consoleMethod = level === "debug" ? console.log : console[level];
    if (context) {
      consoleMethod(`[${level.toUpperCase()}]`, message, context);
    } else {
      consoleMethod(`[${level.toUpperCase()}]`, message);
    }

    if (!this.isInitialized) {
      this.logQueue.push(entry);
      return;
    }

    if (Platform.OS !== "web") {
      this.writeToFile(entry);
    }
  }

  public async getLogFilePath(): Promise<string | null> {
    return this.currentLogFile;
  }

  public async getAllLogFiles(): Promise<string[]> {
    if (!this.logDir || Platform.OS === "web") return [];

    try {
      const files = await FileSystem.readDirectoryAsync(this.logDir);
      return files.map((file) => `${this.logDir}/${file}`);
    } catch (error) {
      console.error("Failed to get log files:", error);
      return [];
    }
  }

  public async getWebLogs(): Promise<LogEntry[]> {
    if (Platform.OS !== "web") return [];

    try {
      const logsKey = "nutrilift_logs";
      const existingLogs = localStorage.getItem(logsKey);
      return existingLogs ? JSON.parse(existingLogs) : [];
    } catch (error) {
      return [];
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
export function logError(error: Error, errorInfo?: any) {
  logger.error(error.message, {
    stack: error.stack,
    errorInfo,
  });
}
