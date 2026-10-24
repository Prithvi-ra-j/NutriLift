import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { decryptLegacySession, decryptSession, encryptSession } from "./session-crypto";

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SESSION_KEY = "nutrilift-supabase-auth";
const ENCRYPTION_KEY_NAME = "nutrilift-session-key";
const AUTHENTICATION_KEY_NAME = "nutrilift-session-auth-key";
const VERSIONED_ENCRYPTION_KEY_NAME = "nutrilift-session-key-v2";
const secureKeyPromises = new Map<string, Promise<Uint8Array>>();

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
  return Boolean(value && value !== "your_supabase_anon_key");
}

export const isSupabaseConfigured =
  isValidSupabaseUrl(configuredUrl) && isValidSupabaseAnonKey(configuredAnonKey);

async function getLegacyEncryptionKey(): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (!stored) throw new Error("Legacy Supabase session encryption key is missing.");
  const bytes = Uint8Array.from(atob(stored), (character) => character.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("Stored legacy Supabase encryption key is invalid.");
  return bytes;
}

async function getRequiredSecureKey(keyName: string): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(keyName);
  if (!stored) throw new Error(`Stored Supabase key "${keyName}" is missing.`);
  const bytes = Uint8Array.from(atob(stored), (character) => character.charCodeAt(0));
  if (bytes.length !== 32) throw new Error(`Stored Supabase key "${keyName}" is invalid.`);
  return bytes;
}

async function getOrCreateSecureKey(keyName: string): Promise<Uint8Array> {
  let keyPromise = secureKeyPromises.get(keyName);
  if (!keyPromise) {
    keyPromise = (async () => {
      const stored = await SecureStore.getItemAsync(keyName);
      if (stored) {
        const bytes = Uint8Array.from(atob(stored), (character) => character.charCodeAt(0));
        if (bytes.length !== 32) throw new Error(`Stored Supabase key "${keyName}" is invalid.`);
        return bytes;
      }

      const bytes = new Uint8Array(32);
      if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
        throw new Error("Secure random values are unavailable; cannot create a session encryption key.");
      }
      crypto.getRandomValues(bytes);
      await SecureStore.setItemAsync(keyName, btoa(String.fromCharCode(...bytes)));
      return bytes;
    })();
    secureKeyPromises.set(keyName, keyPromise);
  }

  try {
    return await keyPromise;
  } catch (error) {
    if (secureKeyPromises.get(keyName) === keyPromise) secureKeyPromises.delete(keyName);
    throw error;
  }
}

async function getVersionedEncryptionKeys(): Promise<[Uint8Array, Uint8Array]> {
  return Promise.all([
    getOrCreateSecureKey(VERSIONED_ENCRYPTION_KEY_NAME),
    getOrCreateSecureKey(AUTHENTICATION_KEY_NAME),
  ]);
}

function createSessionIv(): Uint8Array {
  const iv = new Uint8Array(16);
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    throw new Error("Secure random values are unavailable; cannot encrypt a Supabase session.");
  }
  crypto.getRandomValues(iv);
  return iv;
}

async function encryptStoredSession(value: string): Promise<string> {
  const [encryptionKey, authenticationKey] = await getVersionedEncryptionKeys();
  return encryptSession(value, encryptionKey, authenticationKey, createSessionIv());
}

/**
 * Retain the established Supabase storage key for a one-time plaintext-session
 * migration. New values are encrypted before reaching AsyncStorage.
 */
export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const stored = await AsyncStorage.getItem(key);
    if (stored === null) return null;
    if (stored.startsWith("enc:v2:")) {
      const [encryptionKey, authenticationKey] = await Promise.all([
        getRequiredSecureKey(VERSIONED_ENCRYPTION_KEY_NAME),
        getRequiredSecureKey(AUTHENTICATION_KEY_NAME),
      ]);
      return decryptSession(stored, encryptionKey, authenticationKey);
    }
    const plaintext = stored.startsWith("enc:v1:")
      ? decryptLegacySession(stored, await getLegacyEncryptionKey())
      : stored;
    await AsyncStorage.setItem(key, await encryptStoredSession(plaintext));
    if (stored.startsWith("enc:v1:")) {
      await SecureStore.deleteItemAsync(ENCRYPTION_KEY_NAME);
    }
    return plaintext;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, await encryptStoredSession(value));
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
        storage: supabaseAuthStorage,
        storageKey: SESSION_KEY,
      },
    })
  : null;
