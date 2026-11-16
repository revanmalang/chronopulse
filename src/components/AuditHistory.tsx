"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Printer, Trash2, X } from "lucide-react";
import type { GateRecord, MeetingRecord } from "@/lib/types";
import { LEVELS, ZONE_META, dateLabel, downloadFile, minutesLabel, rupiah, toCSV } from "@/lib/utils";

interface Props {
  history: MeetingRecord[];
  gateLog: GateRecord[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

function summaryText(m: MeetingRecord): string {
  const crew = LEVELS.filter((l) => m.counts[l.key] > 0).map((l) => `${m.counts[l.key]} ${l.label}`).join(", ");
  return [
    "RINGKASAN RAPAT - ChronoPulse",
    `Judul     : ${m.title}`,
    `Mulai     : ${dateLabel(m.startedAt)}`,
    `Durasi    : ${minutesLabel(m.durationSec)} (${m.durationSec} detik)`,
    `Peserta   : ${m.headcount} (${crew})`,
    `Biaya     : ${rupiah(m.cost)}`,
    `Status    : ${ZONE_META[m.zone].label}`,
    `Keputusan : ${m.outcome || "-"}`,
  ].join("\n");
}

export default function AuditHistory({ history, gateLog, onDelete, onClear }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const total = history.reduce((a, m) => a + m.cost, 0);
    const secs = history.reduce((a, m) => a + m.durationSec, 0);
    const over = history.filter((m) => m.zone !== "efisien").length;
    const diverted = gateLog.filter((g) => g.verdict === "async");
    const saved = diverted.reduce((a, g) => a + g.estCost, 0);
    return { total, secs, over, avg: history.length ? total / history.length : 0, diverted: diverted.length, saved };
  }, [history, gateLog]);

  const selected = history.find((m) => m.id === openId) ?? null;

  const exportCSV = () => {
    const d = new Date();
    const p = (x: number) => String(x).padStart(2, "0");
    downloadFile(`chronopulse-audit-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`, toCSV(history), "text/csv;charset=utf-8");
  };

  const copySummary = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(summaryText(selected));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard diblokir */
    }
  };

  const clearAll = () => {
    if (window.confirm("Hapus seluruh riwayat rapat? Tindakan ini tidak bisa dibatalkan.")) {
      setOpenId(null);
      onClear();
    }
  };

  const cells: { k: string; v: string }[] = [
    { k: "Total rapat", v: String(history.length) },
    { k: "Total biaya", v: rupiah(stats.total) },
    { k: "Rata-rata/rapat", v: rupiah(stats.avg) },
    { k: "Total jam rapat", v: (stats.secs / 3600).toFixed(1) + " jam" },
    { k: "Lewat 30 menit", v: `${stats.over} rapat` },
    { k: "Rapat dialihkan", v: `${stats.diverted} (hemat ${rupiah(stats.saved)})` },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cells.map((c) => (
          <div key={c.k} className="panel p-3">
            <div className="label !mb-1">{c.k}</div>
            <div className="tnum break-words font-mono text-sm font-bold sm:text-base">{c.v}</div>
          </div>
        ))}
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Log audit rapat</h2>
          <div className="flex gap-3">
            <button className="btn btn-ink" onClick={exportCSV} disabled={history.length === 0}>
              <Download size={16} /> Ekspor CSV
            </button>
            <button className="btn" onClick={clearAll} disabled={history.length === 0}>
              <Trash2 size={16} /> Hapus semua
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-ink/70">Belum ada rapat tercatat. Selesaikan rapat dari tab Tracker untuk mengisi log ini.</p>
        ) : (
          <div className="overflow-x-auto border border-ink bg-alabaster">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-ink text-alabaster">
                <tr className="font-mono text-xs">
                  <th className="p-2">Mulai</th><th className="p-2">Judul</th>
                  <th className="p-2 text-right">Durasi</th><th className="p-2 text-right">Peserta</th>
                  <th className="p-2 text-right">Biaya</th><th className="p-2">Zona</th><th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id} className="border-t border-ink">
                    <td className="tnum p-2 font-mono text-xs">{dateLabel(m.startedAt)}</td>
                    <td className="p-2 font-semibold">{m.title}</td>
                    <td className="tnum p-2 text-right font-mono">{minutesLabel(m.durationSec)}</td>
                    <td className="tnum p-2 text-right font-mono">{m.headcount}</td>
                    <td className="tnum p-2 text-right font-mono font-bold">{rupiah(m.cost)}</td>
                    <td className="p-2">
                      <span className={`border border-ink px-2 py-0.5 text-xs font-bold ${m.zone === "efisien" ? "bg-ok text-white" : "bg-signal text-white"}`}>
                        {ZONE_META[m.zone].label}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn !px-2 !py-1" aria-label="Lihat kartu ringkasan" onClick={() => setOpenId(m.id)}>
                          <FileText size={14} />
                        </button>
                        <button className="btn !px-2 !py-1" aria-label="Hapus rapat ini" onClick={() => onDelete(m.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="print-area border-2 border-ink bg-alabaster p-6" style={{ boxShadow: "6px 6px 0 #18181B" }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs text-ink/70">Kartu ringkasan rapat untuk HR / Manajemen</div>
              <h3 className="font-display text-2xl font-bold">{selected.title}</h3>
            </div>
            <button className="no-print btn !px-2 !py-1" aria-label="Tutup kartu" onClick={() => setOpenId(null)}>
              <X size={14} />
            </button>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="label !mb-0">Mulai</dt><dd className="tnum font-mono">{dateLabel(selected.startedAt)}</dd></div>
            <div><dt className="label !mb-0">Durasi</dt><dd className="tnum font-mono">{minutesLabel(selected.durationSec)} ({selected.durationSec} detik)</dd></div>
            <div><dt className="label !mb-0">Peserta</dt><dd className="font-mono">{selected.headcount} orang: {LEVELS.filter((l) => selected.counts[l.key] > 0).map((l) => `${selected.counts[l.key]} ${l.label}`).join(", ")}</dd></div>
            <div><dt className="label !mb-0">Status fokus</dt><dd className="font-mono">{ZONE_META[selected.zone].label}</dd></div>
            <div className="sm:col-span-2"><dt className="label !mb-0">Biaya aktual</dt><dd className="tnum font-mono text-3xl font-bold">{rupiah(selected.cost)}</dd></div>
            <div className="sm:col-span-2"><dt className="label !mb-0">Keputusan / hasil</dt><dd>{selected.outcome || "-"}</dd></div>
          </dl>
          <div className="no-print mt-5 flex flex-wrap gap-3">
            <button className="btn btn-ink" onClick={() => window.print()}><Printer size={16} /> Cetak / simpan PDF</button>
            <button className="btn" onClick={copySummary}>{copied ? "Tersalin" : "Salin ringkasan teks"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
