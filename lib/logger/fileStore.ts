import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { localDateString } from "../time/localDate";
import { nowIso, nowUnix } from "../time/clock";
import type { LogEntry } from "./types";

const MAX_LOG_FILE_BYTES = 256 * 1024;

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export class FileLogStore {
  private logDir: string | null = null;
  private currentLogFile: string | null = null;

  async initialize(): Promise<string> {
    if (Platform.OS === "web") {
      throw new Error("File log storage is unavailable on web.");
    }
    if (!FileSystem.documentDirectory) {
      throw new Error("The app document directory is unavailable.");
    }

    this.logDir = `${FileSystem.documentDirectory}logs`;
    const dirInfo = await FileSystem.getInfoAsync(this.logDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.logDir, { intermediates: true });
    }

    const timestamp = nowIso();
    const now = new Date(timestamp);
    const date = localDateString(now);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
    this.currentLogFile = `${this.logDir}/app-${date}_${time}.log`;
    return timestamp;
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.currentLogFile) return;

    const rawLine = `${JSON.stringify(entry)}\n`;
    const line = utf8ByteLength(rawLine) <= MAX_LOG_FILE_BYTES
      ? rawLine
      : `${JSON.stringify({
          ...entry,
          message: entry.message.slice(0, 8_000),
          stack: entry.stack?.slice(0, 8_000),
          context: undefined,
        })}\n`;
    const info = await FileSystem.getInfoAsync(this.currentLogFile);
    const previous = info.exists
      ? await FileSystem.readAsStringAsync(this.currentLogFile)
      : "";
    const lines = `${previous}${line}`.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    const keptLines: string[] = [];
    let outputBytes = 0;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const currentLine = `${lines[index]}\n`;
      const currentLineBytes = utf8ByteLength(currentLine);
      if (outputBytes + currentLineBytes > MAX_LOG_FILE_BYTES) break;
      keptLines.push(currentLine);
      outputBytes += currentLineBytes;
    }
    const output = keptLines.reverse().join("");
    await FileSystem.writeAsStringAsync(this.currentLogFile, output, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  async cleanupOldLogs(): Promise<void> {
    if (!this.logDir) return;

    const files = await FileSystem.readDirectoryAsync(this.logDir);
    const cutoff = nowUnix() * 1000 - 30 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      const filePath = `${this.logDir}/${file}`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists && info.modificationTime && info.modificationTime < cutoff) {
        await FileSystem.deleteAsync(filePath);
      }
    }
  }

  getPath(): string | null {
    return this.currentLogFile;
  }

  async getAllPaths(): Promise<string[]> {
    if (!this.logDir || Platform.OS === "web") return [];
    const files = await FileSystem.readDirectoryAsync(this.logDir);
    return files.map((file) => `${this.logDir}/${file}`);
  }
}
