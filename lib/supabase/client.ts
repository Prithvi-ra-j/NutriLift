import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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

/**
 * Auth storage is used only after explicit configuration. The session remains
 * locally persisted, but cloud features are disabled when env configuration is absent.
 * Encryption-at-rest is added in the following step; do not silently swallow writes.
 */
const storage = {
  getItem: async (key: string) => AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: async (key: string) => AsyncStorage.removeItem(key),
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(configuredUrl as string, configuredAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage,
        storageKey: "nutrilift-supabase-auth",
      },
    })
  : null;
