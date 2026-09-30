export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

type EnvSource = Record<string, string | undefined>;

/**
 * Reads the public Supabase settings. Returns null (rather than throwing) when
 * they are missing so pages can show a clear "not configured" state.
 *
 * Next.js only inlines NEXT_PUBLIC_* vars into browser code when they are
 * referenced literally, so the default source spells each one out.
 */
export function readSupabaseEnv(
  source: EnvSource = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): SupabaseEnv | null {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url: url.replace(/\/+$/, ""), publishableKey };
}

export function requireSupabaseEnv(source?: EnvSource): SupabaseEnv {
  const env = readSupabaseEnv(source);
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example).",
    );
  }
  return env;
}
