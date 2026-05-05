import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep this warning in dev so bootstrapping is less confusing.
  console.warn("Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
