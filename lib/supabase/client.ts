import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import aesjs from "aes-js";

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SESSION_KEY = "nutrilift-supabase-auth";
const ENCRYPTION_KEY_NAME = "nutrilift-session-key";

function isValidSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function isValidSupabaseAnonKey(value: string | undefined): boolean {
  return Boolean(value && value !== "public-anon-key" && value !== "your_supabase_anon_key");
}

export const isSupabaseConfigured =
  isValidSupabaseUrl(configuredUrl) && isValidSupabaseAnonKey(configuredAnonKey);

async function getEncryptionKey(): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (stored) {
    const bytes = Uint8Array.from(atob(stored), (character) => character.charCodeAt(0));
    if (bytes.length !== 32) throw new Error("Stored Supabase encryption key is invalid.");
    return bytes;
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, btoa(String.fromCharCode(...bytes)));
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function encryptSession(value: string, key: Uint8Array): string {
  const counter = new aesjs.Counter(1);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);
  const encrypted = aesCtr.encrypt(aesjs.utils.utf8.toBytes(value));
  return `enc:v1:${encodeBase64(encrypted)}`;
}

function decryptSession(value: string, key: Uint8Array): string {
  const payload = value.slice("enc:v1:".length);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
  const decrypted = aesCtr.decrypt(decodeBase64(payload));
  return aesjs.utils.utf8.fromBytes(decrypted);
}

/**
 * Retain the established Supabase storage key for a one-time plaintext-session
 * migration. New values are encrypted before reaching AsyncStorage.
 */
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    const stored = await AsyncStorage.getItem(key);
    if (stored === null) return null;
    if (!stored.startsWith("enc:v1:")) {
      const encryptionKey = await getEncryptionKey();
      await AsyncStorage.setItem(key, encryptSession(stored, encryptionKey));
      return stored;
    }
    const encryptionKey = await getEncryptionKey();
    return decryptSession(stored, encryptionKey);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const encryptionKey = await getEncryptionKey();
    await AsyncStorage.setItem(key, encryptSession(value, encryptionKey));
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(configuredUrl as string, configuredAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage,
        storageKey: SESSION_KEY,
      },
    })
  : null;
