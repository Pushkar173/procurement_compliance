/**
 * Supabase client singleton.
 *
 * Environment variables are injected at build time by Vite.
 * In development, add the following to a `.env` file in the repo root:
 *
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your-anon-key>
 *
 * These must be public (anon) credentials only — never the service-role key.
 * RLS policies in the migration file enforce access control server-side.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn only — the app continues to run against mock data via the store
  // until env vars are configured.
  console.warn(
    "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. " +
      "Live data fetching will not work. Add them to your .env file.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder",
);
