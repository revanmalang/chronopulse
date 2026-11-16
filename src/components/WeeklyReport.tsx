"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCopy, Printer } from "lucide-react";
import type { GateRecord, MeetingRecord } from "@/lib/types";
import { meetingScore, minutesLabel, rupiah, todayKey, weekRange } from "@/lib/utils";

interface Props {
  history: MeetingRecord[];
  gateLog: GateRecord[];
}

const d2 = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

export default function WeeklyReport({ history, gateLog }: Props) {
  const [off, setOff] = useState(0);
  const [copied, setCopied] = useState(false);
  const { start, end } = weekRange(off);
  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t < end.getTime();
  };
  const ms = history.filter((m) => inWeek(m.startedAt));
  const gs = gateLog.filter((g) => inWeek(g.at));
  const total = ms.reduce((a, m) => a + m.cost, 0);
  const secs = ms.reduce((a, m) => a + m.durationSec, 0);
  const over = ms.filter((m) => m.zone !== "efisien").length;
  const acts = ms.flatMap((m) => m.actions ?? []);
  const done = acts.filter((a) => a.done).length;
  const today = todayKey();
  const late = acts.filter((a) => !a.done && a.due && a.due < today).length;
  const avgScore = ms.length ? Math.round(ms.reduce((a, m) => a + meetingScore(m), 0) / ms.length) : 0;
  const diverted = gs.filter((g) => g.verdict === "async");
  const saved = diverted.reduce((a, g) => a + g.estCost, 0);
  const top = [...ms].sort((a, b) => b.cost - a.cost).slice(0, 3);
  const perDecision = acts.length ? total / acts.length : 0;
  const lastDay = new Date(end.getTime() - 86400000);

  const text = [
    `LAPORAN RAPAT MINGGUAN (${d2(start)} - ${d2(lastDay)})`,
    `Total rapat   : ${ms.length}`,
    `Total biaya   : ${rupiah(total)}`,
    `Total waktu   : ${(secs / 3600).toFixed(1)} jam`,
    `Lewat 30 mnt  : ${over} rapat`,
    `Skor produktif: ${avgScore}/100`,
    `Action item   : ${done}/${acts.length} selesai, ${late} terlambat`,
    `Biaya/keputusan: ${acts.length ? rupiah(perDecision) : "-"}`,
    `Rapat dialihkan ke asinkron: ${diverted.length} (hemat ${rupiah(saved)})`,
    "Rapat termahal:",
    ...(top.length ? top.map((m, i) => `${i + 1}. ${m.title} - ${rupiah(m.cost)} (${minutesLabel(m.durationSec)})`) : ["-"]),
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const cells = [
    { k: "Total rapat", v: String(ms.length) },
    { k: "Total biaya", v: rupiah(total) },
    { k: "Total waktu", v: (secs / 3600).toFixed(1) + " jam" },
    { k: "Lewat 30 menit", v: `${over} rapat` },
    { k: "Skor produktif", v: `${avgScore}/100` },
    { k: "Action item", v: `${done}/${acts.length} selesai` },
    { k: "Terlambat", v: `${late} item` },
    { k: "Biaya/keputusan", v: acts.length ? rupiah(perDecision) : "-" },
    { k: "Dialihkan asinkron", v: `${diverted.length} (hemat ${rupiah(saved)})` },
  ];

  return (
    <section className="print-area panel p-5">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn !px-2" aria-label="Minggu sebelumnya" onClick={() => setOff((o) => o - 1)}><ChevronLeft size={16} /></button>
          <button className="btn !px-2" aria-label="Minggu berikutnya" onClick={() => setOff((o) => Math.min(0, o + 1))} disabled={off === 0}><ChevronRight size={16} /></button>
          <button className="btn" onClick={() => setOff(0)} disabled={off === 0}>Minggu ini</button>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-ink" onClick={copy}><ClipboardCopy size={16} /> {copied ? "Tersalin" : "Salin laporan"}</button>
          <button className="btn" onClick={() => window.print()}><Printer size={16} /> Cetak / PDF</button>
        </div>
      </div>
      <h2 className="font-display text-xl font-bold">Laporan mingguan {d2(start)} - {d2(lastDay)}</h2>
      <p className="mb-4 text-sm text-ink/70">Dihitung otomatis dari log rapat dan keputusan gatekeeper pada minggu ini.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cells.map((c) => (
          <div key={c.k} className="border border-ink bg-alabaster p-3">
            <div className="label !mb-1">{c.k}</div>
            <div className="tnum break-words font-mono text-base font-bold">{c.v}</div>
          </div>
        ))}
      </div>
      <h3 className="mt-5 font-display text-base font-bold">Rapat termahal</h3>
      {top.length === 0 ? (
        <p className="text-sm text-ink/70">Belum ada rapat pada minggu ini.</p>
      ) : (
        <ol className="mt-2 divide-y divide-ink border border-ink bg-alabaster text-sm">
          {top.map((m) => (
            <li key={m.id} className="flex flex-wrap justify-between gap-2 p-2">
              <span className="font-semibold">{m.title}</span>
              <span className="tnum font-mono">{rupiah(m.cost)} / {minutesLabel(m.durationSec)} / skor {meetingScore(m)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
