import "server-only";

import { readSupabaseEnv } from "@/lib/env";

export type SupabaseHealth =
  | { status: "not_configured" }
  | { status: "ok" }
  | { status: "error"; message: string };

/** Pings the Supabase Auth health endpoint to confirm the project is reachable. */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const env = readSupabaseEnv();
  if (!env) return { status: "not_configured" };

  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { status: "ok" };
    return { status: "error", message: `Supabase responded ${res.status}` };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
