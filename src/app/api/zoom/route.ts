import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_HOST_EMAIL } = process.env;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_HOST_EMAIL) {
    return NextResponse.json({ error: "Zoom belum dikonfigurasi di server (env ZOOM_*)." }, { status: 501 });
  }
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi, login tidak bisa diverifikasi." }, { status: 501 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const who = await fetch(`${sbUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey: sbKey } });
  if (!who.ok) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

  let body: { topic?: unknown; start?: unknown; duration?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const topic = typeof body.topic === "string" ? body.topic.slice(0, 200) : "";
  const start = typeof body.start === "string" ? body.start : "";
  const duration = Number(body.duration);
  if (!topic || Number.isNaN(Date.parse(start)) || !(duration >= 5 && duration <= 480)) {
    return NextResponse.json({ error: "Data rapat tidak valid." }, { status: 400 });
  }

  const basic = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");
  const tk = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(ZOOM_ACCOUNT_ID)}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}` } }
  );
  const tj = await tk.json().catch(() => ({}));
  if (!tk.ok || !tj.access_token) {
    return NextResponse.json({ error: "Gagal autentikasi ke Zoom." }, { status: 502 });
  }

  const zr = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(ZOOM_HOST_EMAIL)}/meetings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ topic, type: 2, start_time: new Date(start).toISOString(), duration, timezone: "Asia/Jakarta" }),
  });
  const zj = await zr.json().catch(() => ({}));
  if (!zr.ok || !zj.join_url) {
    return NextResponse.json({ error: zj.message ?? "Zoom menolak pembuatan rapat." }, { status: 502 });
  }
  return NextResponse.json({ join_url: zj.join_url });
}
