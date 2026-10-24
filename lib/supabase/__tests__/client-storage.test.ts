jest.mock("@react-native-async-storage/async-storage", () => {
  const values = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    },
  };
});

jest.mock("expo-secure-store", () => {
  const values = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import aesjs from "aes-js";
import { supabaseAuthStorage } from "../client";

const SESSION_STORAGE_KEY = "nutrilift-supabase-auth";
const LEGACY_ENCRYPTION_KEY = "nutrilift-session-key";

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

describe("Supabase auth storage", () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    await SecureStore.deleteItemAsync(LEGACY_ENCRYPTION_KEY);
  });

  it("stores only authenticated ciphertext and reads the session back", async () => {
    const session = JSON.stringify({ access_token: "supabase-session-secret" });

    await supabaseAuthStorage.setItem(SESSION_STORAGE_KEY, session);

    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    expect(stored).toMatch(/^enc:v2:/);
    expect(stored).not.toContain("supabase-session-secret");
    await expect(supabaseAuthStorage.getItem(SESSION_STORAGE_KEY)).resolves.toBe(session);
  });

  it("encrypts a previously plaintext session during its first read", async () => {
    const session = JSON.stringify({ access_token: "legacy-plaintext-session" });
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, session);

    await expect(supabaseAuthStorage.getItem(SESSION_STORAGE_KEY)).resolves.toBe(session);

    const migrated = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    expect(migrated).toMatch(/^enc:v2:/);
    expect(migrated).not.toContain("legacy-plaintext-session");
  });

  it("upgrades a legacy encrypted session before removing its old key", async () => {
    const legacyKey = new Uint8Array(32).fill(23);
    const session = JSON.stringify({ access_token: "legacy-encrypted-session" });
    const cipher = new aesjs.ModeOfOperation.ctr(legacyKey, new aesjs.Counter(1));
    const ciphertext = cipher.encrypt(aesjs.utils.utf8.toBytes(session));
    await SecureStore.setItemAsync(LEGACY_ENCRYPTION_KEY, toBase64(legacyKey));
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, `enc:v1:${toBase64(ciphertext)}`);

    await expect(supabaseAuthStorage.getItem(SESSION_STORAGE_KEY)).resolves.toBe(session);

    const migrated = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    expect(migrated).toMatch(/^enc:v2:/);
    expect(migrated).not.toContain("legacy-encrypted-session");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(LEGACY_ENCRYPTION_KEY);
  });

  it("fails closed when an encrypted session's key has been lost", async () => {
    await supabaseAuthStorage.setItem(SESSION_STORAGE_KEY, "session-secret");
    await SecureStore.deleteItemAsync("nutrilift-session-key-v2");

    await expect(supabaseAuthStorage.getItem(SESSION_STORAGE_KEY)).rejects.toThrow(
      /key "nutrilift-session-key-v2" is missing/,
    );
  });
});
