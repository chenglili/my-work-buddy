import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const authCallbackPresent = typeof window !== "undefined"
  && (window.location.hash.includes("access_token=") || new URLSearchParams(window.location.search).has("code"));

export const cloudBackendEnabled = import.meta.env.VITE_BACKEND_ENABLED === "true"
  && /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl)
  && supabaseAnonKey.length > 20;

export const supabase = cloudBackendEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;
