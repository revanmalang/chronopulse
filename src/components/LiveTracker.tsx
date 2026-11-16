"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Minus, Monitor, Pause, Play, Plus, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import type { Counts, Level, Rates, Session, Zone } from "@/lib/types";
import {
  CRITICAL_SEC, FATIGUE_SEC, LEVELS, ZONE_META, burnPerHour, clock, headcount, rupiah,
} from "@/lib/utils";

interface Props {
  session: Session;
  rates: Rates;
  elapsedSec: number;
  cost: number;
  zone: Zone;
  soundOn: boolean;
  onSound: () => void;
  onTitle: (t: string) => void;
  onCounts: (c: Counts) => void;
  onRates: (r: Rates) => void;
  onStart: () => void;
  onPause: () => void;
  onFinish: (outcome: string) => void;
  onReset: () => void;
  onProjector: () => void;
}

export default function LiveTracker(p: Props) {
  const [finishing, setFinishing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const { session, rates, zone } = p;
  const running = session.status === "running";
  const idle = session.status === "idle";
  const burn = burnPerHour(session.counts, rates);
  const people = headcount(session.counts);
  const pct = Math.min(100, (p.elapsedSec / FATIGUE_SEC) * 100);
  const hot = zone !== "efisien";
  const tone = hot ? "bg-signal text-white" : "bg-ok text-white";

  const setCount = (k: Level, v: number) =>
    p.onCounts({ ...session.counts, [k]: Math.max(0, Math.min(999, Math.floor(v) || 0)) });
  const setRate = (k: Level, v: number) => p.onRates({ ...rates, [k]: Math.max(0, Math.floor(v) || 0) });

  const startFinish = () => {
    if (running) p.onPause();
    setFinishing(true);
  };
  const confirmFinish = () => {
    p.onFinish(outcome.trim());
    setOutcome("");
    setFinishing(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="panel p-5" aria-label="Instrumen rapat">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor="title">Judul rapat</label>
            <input
              id="title" className="field" placeholder="Contoh: Sinkronisasi anggaran Q4"
              value={session.title} onChange={(e) => p.onTitle(e.target.value)} maxLength={80}
            />
          </div>
          <button className="btn" onClick={p.onSound} aria-pressed={p.soundOn}>
            {p.soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            Suara {p.soundOn ? "aktif" : "mati"}
          </button>
          <button className="btn btn-ink" onClick={p.onProjector}>
            <Monitor size={16} /> Mode proyektor
          </button>
        </div>

        <div className="border border-ink bg-alabaster p-5">
          <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-ink/70">
            <span>Biaya berjalan</span>
            <span className="flex items-center gap-2">
              <span className={`led ${running ? "animate-pulse bg-signal" : "bg-panel"}`} />
              {running ? "LIVE" : idle ? "SIAGA" : "JEDA"}
            </span>
          </div>
          <div className="tnum overflow-x-auto whitespace-nowrap font-mono text-4xl font-bold sm:text-6xl" aria-live="off">
            {rupiah(p.cost)}
          </div>
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-ink pt-3">
            <div>
              <div className="font-mono text-[11px] text-ink/70">Waktu berjalan</div>
              <div className="tnum font-mono text-4xl font-bold sm:text-5xl">{clock(p.elapsedSec)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] text-ink/70">Laju biaya</div>
              <div className="tnum font-mono text-sm font-bold sm:text-base">{rupiah(burn)}/jam</div>
              <div className="tnum font-mono text-[11px] text-ink/70">{rupiah(burn / 60)}/menit</div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="relative h-5 border border-ink bg-alabaster">
            <div
              className={`h-full ${hot ? "bg-signal" : "bg-ok"}`}
              style={{ width: `${pct}%`, transition: "width 250ms linear" }}
            />
            <div className="absolute inset-y-0 border-l border-ink" style={{ left: `${(CRITICAL_SEC / FATIGUE_SEC) * 100}%` }} />
          </div>
          <div className="relative mt-1 h-4 font-mono text-[11px] text-ink/70">
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${(CRITICAL_SEC / FATIGUE_SEC) * 100}%` }}>30 mnt</span>
            <span className="absolute right-0">45 mnt</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`px-3 py-1 font-display text-sm font-bold ${tone} border border-ink`}>
            {ZONE_META[zone].label}
          </span>
          <span className="text-sm text-ink/80">{ZONE_META[zone].message}</span>
        </div>

        <AnimatePresence>
          {!idle && hot && (
            <motion.div
              key={zone}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
              role="alert"
            >
              <div className="flex items-start gap-3 border border-ink bg-signal p-3 text-white">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-display text-base font-bold">
                    {zone === "kritis" ? "Putuskan sekarang atau tutup sesi" : "Tutup rapat sekarang"}
                  </div>
                  <div className="text-sm">
                    Rapat sudah menghabiskan {rupiah(p.cost)}. Rumuskan keputusan, tunjuk penanggung jawab, lalu akhiri.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex flex-wrap gap-3">
          {!running ? (
            <button className="btn btn-ok" onClick={p.onStart} disabled={people === 0 || finishing}>
              <Play size={16} /> {idle ? "Mulai rapat" : "Lanjutkan"}
            </button>
          ) : (
            <button className="btn" onClick={p.onPause}>
              <Pause size={16} /> Jeda
            </button>
          )}
          <button className="btn btn-signal" onClick={startFinish} disabled={idle || finishing}>
            <Square size={16} /> Akhiri dan simpan
          </button>
          <button className="btn" onClick={p.onReset} disabled={idle && p.elapsedSec === 0}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
        {people === 0 && <p className="mt-2 text-sm text-signal">Isi minimal satu peserta untuk memulai.</p>}

        <AnimatePresence>
          {finishing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 border border-ink bg-alabaster p-4"
            >
              <label className="label" htmlFor="outcome">Keputusan / hasil rapat (opsional)</label>
              <textarea
                id="outcome" className="field" rows={3} value={outcome}
                onChange={(e) => setOutcome(e.target.value)} maxLength={400}
                placeholder="Tulis keputusan dan penanggung jawab"
              />
              <div className="mt-3 flex gap-3">
                <button className="btn btn-ok" onClick={confirmFinish}>Simpan ke log</button>
                <button className="btn" onClick={() => setFinishing(false)}>Batal</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="panel p-5" aria-label="Peserta dan tarif">
        <h2 className="font-display text-lg font-bold">Peserta dan tarif per jam</h2>
        <p className="mb-4 text-sm text-ink/70">Perubahan langsung memengaruhi laju biaya. Tarif tersimpan otomatis.</p>
        <div className="space-y-3">
          {LEVELS.map((l) => (
            <div key={l.key} className="border border-ink bg-alabaster p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display font-bold">{l.label}</span>
                <span className="tnum font-mono text-xs text-ink/70">
                  {rupiah(session.counts[l.key] * rates[l.key])}/jam
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-end gap-3">
                <div>
                  <span className="label">Orang</span>
                  <div className="flex">
                    <button className="btn !px-2 !py-1" aria-label={`Kurangi ${l.label}`} onClick={() => setCount(l.key, session.counts[l.key] - 1)}>
                      <Minus size={14} />
                    </button>
                    <input
                      aria-label={`Jumlah ${l.label}`} type="number" min={0} inputMode="numeric"
                      className="field tnum w-14 text-center font-mono"
                      value={session.counts[l.key]} onChange={(e) => setCount(l.key, Number(e.target.value))}
                    />
                    <button className="btn !px-2 !py-1" aria-label={`Tambah ${l.label}`} onClick={() => setCount(l.key, session.counts[l.key] + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor={`rate-${l.key}`}>Tarif (Rp/jam)</label>
                  <input
                    id={`rate-${l.key}`} type="number" min={0} step={5000} inputMode="numeric"
                    className="field tnum font-mono" value={rates[l.key]}
                    onChange={(e) => setRate(l.key, Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border border-ink bg-ink p-3 text-alabaster">
          <span className="font-mono text-xs">{people} peserta</span>
          <span className="tnum font-mono text-sm font-bold">{rupiah(burn)}/jam</span>
        </div>
      </section>
    </div>
  );
}
