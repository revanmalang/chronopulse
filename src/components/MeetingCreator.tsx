"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, LogIn, Video } from "lucide-react";
import { longDate, nextHourLocal } from "@/lib/utils";

type Platform = "meet" | "zoom" | "lain";

interface Props {
  cloudReady: boolean;
  loggedIn: boolean;
  gToken: string | null;
  accToken: string | null;
  onLogin: () => void;
  goal: string;
  minutes: number;
  onUseTitle: (t: string) => void;
}

export default function MeetingCreator({ cloudReady, loggedIn, gToken, accToken, onLogin, goal, minutes, onUseTitle }: Props) {
  const [platform, setPlatform] = useState<Platform>("meet");
  const [title, setTitle] = useState(goal.slice(0, 60));
  const [when, setWhen] = useState("");
  const [dur, setDur] = useState(minutes);
  const [emails, setEmails] = useState("");
  const [manual, setManual] = useState("");
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWhen(nextHourLocal());
  }, []);

  const needLogin = (platform === "meet" && !gToken) || (platform === "zoom" && !accToken);

  const create = async () => {
    setErr("");
    setLink("");
    const t = title.trim();
    const start = new Date(when);
    if (!t) return setErr("Judul rapat wajib diisi.");
    if (Number.isNaN(start.getTime())) return setErr("Tanggal dan jam tidak valid.");
    const end = new Date(start.getTime() + dur * 60000);
    setBusy(true);
    try {
      if (platform === "lain") {
        if (!/^https:\/\/\S+$/.test(manual.trim())) throw new Error("Tempel link rapat yang diawali https://");
        setLink(manual.trim());
      } else if (platform === "meet") {
        const attendees = emails.split(",").map((e) => e.trim()).filter((e) => /^\S+@\S+\.\S+$/.test(e)).map((email) => ({ email }));
        const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
          method: "POST",
          headers: { Authorization: `Bearer ${gToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: t,
            description: goal,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            attendees,
            conferenceData: { createRequest: { requestId: `cp-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(r.status === 401 ? "Token Google kedaluwarsa. Keluar lalu masuk Google lagi." : j?.error?.message ?? "Google Calendar menolak permintaan.");
        if (!j.hangoutLink) throw new Error("Event dibuat tapi link Meet tidak dikembalikan Google.");
        setLink(j.hangoutLink);
      } else {
        const r = await fetch("/api/zoom", {
          method: "POST",
          headers: { Authorization: `Bearer ${accToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ topic: t, start: start.toISOString(), duration: dur }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.join_url) throw new Error(j.error ?? "Gagal membuat rapat Zoom.");
        setLink(j.join_url);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat rapat.");
    }
    setBusy(false);
  };

  const invite = `Undangan rapat: ${title.trim()}\nWaktu: ${longDate(new Date(when || Date.now()))} (${dur} menit)\nLink: ${link}\nTujuan: ${goal}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-5 border-t border-ink pt-4">
      <h3 className="font-display text-base font-bold">Buat rapat sekarang</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="mc-title">Judul rapat</label>
          <input id="mc-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </div>
        <div>
          <label className="label" htmlFor="mc-platform">Platform</label>
          <select id="mc-platform" className="field" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            <option value="meet">Google Meet (wajib login Google)</option>
            <option value="zoom">Zoom (wajib login)</option>
            <option value="lain">Aplikasi lain (tempel link)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mc-when">Tanggal dan jam</label>
          <input id="mc-when" type="datetime-local" className="field tnum font-mono" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="mc-dur">Durasi (menit)</label>
          <input id="mc-dur" type="number" min={5} step={5} className="field tnum font-mono" value={dur} onChange={(e) => setDur(Math.max(5, Number(e.target.value) || 5))} />
        </div>
        {platform === "meet" && (
          <div>
            <label className="label" htmlFor="mc-emails">Email peserta (pisahkan koma)</label>
            <input id="mc-emails" className="field" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="a@kantor.com, b@kantor.com" />
          </div>
        )}
        {platform === "lain" && (
          <div>
            <label className="label" htmlFor="mc-manual">Link rapat (Teams, Webex, dll)</label>
            <input id="mc-manual" className="field" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://" />
          </div>
        )}
      </div>

      {needLogin && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border border-ink bg-alabaster p-3 text-sm">
          {cloudReady ? (
            <>
              <span>{platform === "meet" && loggedIn ? "Sesi Google tidak punya izin kalender. Masuk ulang." : "Masuk dengan Google untuk lanjut."}</span>
              <button className="btn btn-ink !py-1" onClick={onLogin}><LogIn size={14} /> Masuk dengan Google</button>
            </>
          ) : (
            <span>Login belum dikonfigurasi. Isi env Supabase dulu, atau pakai opsi aplikasi lain.</span>
          )}
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-signal">{err}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        <button className="btn btn-signal" onClick={create} disabled={busy || needLogin}>
          <Video size={16} /> {busy ? "Membuat..." : platform === "lain" ? "Pakai link ini" : "Buat link rapat"}
        </button>
      </div>

      {link && (
        <div className="mt-3 border border-ink bg-alabaster p-3">
          <a href={link} target="_blank" rel="noreferrer" className="break-all font-mono text-sm font-bold underline">{link}</a>
          <textarea readOnly className="field mt-2 font-mono !text-xs" rows={4} value={invite} />
          <div className="mt-2 flex flex-wrap gap-3">
            <button className="btn btn-ink" onClick={copy}>{copied ? <Check size={16} /> : <ClipboardCopy size={16} />} {copied ? "Tersalin" : "Salin undangan"}</button>
            <button className="btn" onClick={() => onUseTitle(title.trim())}>Pakai judul ini di tracker</button>
          </div>
        </div>
      )}
    </div>
  );
}
