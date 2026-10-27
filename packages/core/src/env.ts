import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .refine((v) => !/secret|service_role/i.test(v), "không được dùng secret/service_role key ở biến public"),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

export type PublicEnv = { supabaseUrl: string; supabaseKey: string; siteUrl: string };

/** Validate public env at boot; throws a message listing every missing/invalid variable. */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const r = schema.safeParse(source);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Thiếu hoặc sai biến môi trường (xem .env.example):\n${lines.join("\n")}`);
  }
  return {
    supabaseUrl: r.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: r.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    siteUrl: r.data.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ""),
  };
}
