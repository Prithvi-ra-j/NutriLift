import { isSupabaseConfigured, supabase } from "./client";

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error("Supabase is not configured.") };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { session: null }, error: new Error("Supabase is not configured.") };
  }
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: new Error("Supabase is not configured.") };
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}
