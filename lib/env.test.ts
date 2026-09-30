import { describe, expect, it } from "vitest";

import { readSupabaseEnv, requireSupabaseEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc123.supabase.co/",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("readSupabaseEnv", () => {
  it("returns trimmed settings and strips trailing slashes", () => {
    expect(readSupabaseEnv(valid)).toEqual({
      url: "https://abc123.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("returns null when a value is missing or blank", () => {
    expect(readSupabaseEnv({})).toBeNull();
    expect(
      readSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "  " }),
    ).toBeNull();
  });

  it("returns null when the URL is malformed", () => {
    expect(
      readSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" }),
    ).toBeNull();
  });
});

describe("requireSupabaseEnv", () => {
  it("throws a helpful error when not configured", () => {
    expect(() => requireSupabaseEnv({})).toThrow(/\.env\.local/);
  });
});
