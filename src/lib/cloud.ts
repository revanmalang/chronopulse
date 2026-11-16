import type { CloudUser, GateRecord, MeetingRecord } from "./types";
import { supabase, workspaceOf } from "./supabase";

export async function pullAll(): Promise<{ history: MeetingRecord[]; gateLog: GateRecord[] } | null> {
  if (!supabase) return null;
  const [m, g] = await Promise.all([
    supabase.from("meetings").select("data").order("created_at", { ascending: false }).limit(500),
    supabase.from("gate_log").select("data").order("created_at", { ascending: false }).limit(500),
  ]);
  if (m.error || g.error) return null;
  return {
    history: (m.data ?? []).map((r) => r.data as MeetingRecord),
    gateLog: (g.data ?? []).map((r) => r.data as GateRecord),
  };
}

export async function pushMeeting(rec: MeetingRecord, u: CloudUser) {
  if (!supabase) return;
  await supabase.from("meetings").upsert({
    id: rec.id, user_id: u.id, workspace: workspaceOf(u.email, u.id), owner_email: u.email, data: rec,
  });
}

export async function updateMeeting(rec: MeetingRecord) {
  if (!supabase) return;
  await supabase.from("meetings").update({ data: rec }).eq("id", rec.id);
}

export async function pushGate(g: GateRecord, u: CloudUser) {
  if (!supabase) return;
  await supabase.from("gate_log").upsert({
    id: g.id, user_id: u.id, workspace: workspaceOf(u.email, u.id), owner_email: u.email, data: g,
  });
}

export async function dropMeetings(ids: string[]) {
  if (!supabase || ids.length === 0) return;
  await supabase.from("meetings").delete().in("id", ids);
}
