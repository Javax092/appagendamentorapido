import { createClient } from "@supabase/supabase-js";

let clientInstance = null;
// ALTERACAO: leitura centralizada das envs do cliente Supabase.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return clientInstance;
}

export async function getActiveAuthSession() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export function subscribeToAuthChanges(callback) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export function subscribeToRealtimeTables(tables, callback) {
  const supabase = getSupabaseClient();

  if (!supabase || !Array.isArray(tables) || !tables.length) {
    return () => {};
  }

  const channel = supabase.channel("app-live-updates");

  tables.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table
      },
      callback
    );
  });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
