import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const PUBLIC_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "live.com", "proton.me", "protonmail.com"];

export function workspaceOf(email: string, uid: string): string {
  const d = (email.split("@")[1] ?? "").toLowerCase();
  return !d || PUBLIC_DOMAINS.includes(d) ? uid : d;
}
