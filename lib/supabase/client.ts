import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://example-project.supabase.co";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "public-anon-key";

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

// AsyncStorage works on both native and web (falls back to localStorage there),
// unlike expo-secure-store which silently no-ops on web and has a size limit on native
// that can truncate a full Supabase session — both of which broke persisted sign-in.
const storage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore storage write errors in local/offline mode
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore removal errors
    }
  },
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage,
    storageKey: "nutrilift-supabase-auth",
  },
});

export const isSupabaseConfigured =
  isValidSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
  isValidSupabaseAnonKey(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
