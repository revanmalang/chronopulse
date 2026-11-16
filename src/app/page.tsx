"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gauge, ListChecks, ShieldCheck } from "lucide-react";
import AuditHistory from "@/components/AuditHistory";
import GatekeeperForm from "@/components/GatekeeperForm";
import LiveTracker from "@/components/LiveTracker";
import ProjectorMode from "@/components/ProjectorMode";
import { beep, unlockAudio } from "@/lib/audio";
import type { Counts, GateRecord, MeetingRecord, Rates, Session } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  CRITICAL_SEC, DEFAULT_RATES, DEFAULT_SESSION, FATIGUE_SEC, burnPerHour, headcount, zoneFor,
} from "@/lib/utils";

type Tab = "tracker" | "gate" | "audit";

export default function Home() {
  const [tab, setTab] = useState<Tab>("tracker");
  const [projector, setProjector] = useState(false);
  const [session, setSession] = useLocalStorage<Session>("chronopulse:session", DEFAULT_SESSION);
  const [rates, setRates] = useLocalStorage<Rates>("chronopulse:rates", DEFAULT_RATES);
  const [history, setHistory] = useLocalStorage<MeetingRecord[]>("chronopulse:history", []);
  const [gateLog, setGateLog] = useLocalStorage<GateRecord[]>("chronopulse:gate", []);
  const [soundOn, setSoundOn] = useLocalStorage<boolean>("chronopulse:sound", true);
  const [now, setNow] = useState(0);
  const prevSec = useRef(-1);

  // Buka kunci AudioContext pada interaksi pertama (kebijakan autoplay browser).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Ticker stopwatch berbasis timestamp (tidak drift).
  useEffect(() => {
    setNow(Date.now());
    if (session.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session.status]);

  const elapsedMs =
    session.accMs + (session.status === "running" && session.startAt ? Math.max(0, now - session.startAt) : 0);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const burn = burnPerHour(session.counts, rates);
  const cost = (elapsedMs / 3600000) * burn;
  const zone = zoneFor(elapsedSec);
  const people = headcount(session.counts);

  // Alert suara saat melewati ambang 30 menit, 45 menit, lalu pengingat tiap 5 menit.
  useEffect(() => {
    const prev = prevSec.current;
    prevSec.current = elapsedSec;
    if (prev < 0 || elapsedSec < prev) return;
    if (session.status !== "running" || !soundOn) return;
    const crossed = (t: number) => prev < t && elapsedSec >= t;
    if (crossed(FATIGUE_SEC)) beep([523, 392, 330]);
    else if (crossed(CRITICAL_SEC)) beep([659, 659]);
    else if (prev >= FATIGUE_SEC && Math.floor((elapsedSec - FATIGUE_SEC) / 300) > Math.floor((prev - FATIGUE_SEC) / 300)) {
      beep([440]);
    }
  }, [elapsedSec, session.status, soundOn]);

  const start = () => {
    unlockAudio();
    setSession((s) => ({
      ...s,
      status: "running",
      startAt: Date.now(),
      startedISO: s.startedISO ?? new Date().toISOString(),
    }));
  };

  const pause = () =>
    setSession((s) => ({
      ...s,
      status: "paused",
      accMs: s.accMs + (s.startAt ? Date.now() - s.startAt : 0),
      startAt: null,
    }));

  const reset = () => {
    prevSec.current = -1;
    setSession((s) => ({ ...DEFAULT_SESSION, title: s.title, counts: s.counts }));
  };

  const finish = (outcome: string) => {
    const totalMs = session.accMs + (session.status === "running" && session.startAt ? Date.now() - session.startAt : 0);
    const sec = Math.floor(totalMs / 1000);
    if (sec < 1) return;
    const rec: MeetingRecord = {
      id: `M${Date.now().toString(36).toUpperCase()}`,
      title: session.title.trim() || "Rapat tanpa judul",
      startedAt: session.startedISO ?? new Date().toISOString(),
      durationSec: sec,
      cost: (totalMs / 3600000) * burn,
      headcount: people,
      counts: { ...session.counts },
      rates: { ...rates },
      zone: zoneFor(sec),
      outcome,
    };
    setHistory((h) => [rec, ...h]);
    reset();
    setTab("audit");
  };

  const toggleSound = () => {
    unlockAudio();
    if (!soundOn) beep([587]);
    setSoundOn((v) => !v);
  };

  const closeProjector = useCallback(() => setProjector(false), []);

  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "tracker", label: "Tracker langsung", icon: <Gauge size={16} /> },
    { k: "gate", label: "Gatekeeper", icon: <ShieldCheck size={16} /> },
    { k: "audit", label: `Log audit (${history.length})`, icon: <ListChecks size={16} /> },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-ink bg-panel p-4" style={{ boxShadow: "4px 4px 0 #18181B" }}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border border-ink bg-signal font-display text-xl font-bold text-white">CP</div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">ChronoPulse</h1>
            <p className="text-sm text-ink/70">Pelacak biaya rapat real-time dan gatekeeper keputusan asinkron</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-3" aria-label="Navigasi utama">
          {tabs.map((t) => (
            <button
              key={t.k} onClick={() => setTab(t.k)} aria-current={tab === t.k ? "page" : undefined}
              className={`btn ${tab === t.k ? "btn-ink" : ""}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "tracker" && (
        <LiveTracker
          session={session} rates={rates} elapsedSec={elapsedSec} cost={cost} zone={zone}
          soundOn={soundOn} onSound={toggleSound}
          onTitle={(title) => setSession((s) => ({ ...s, title }))}
          onCounts={(counts: Counts) => setSession((s) => ({ ...s, counts }))}
          onRates={setRates}
          onStart={start} onPause={pause} onFinish={finish} onReset={reset}
          onProjector={() => setProjector(true)}
        />
      )}
      {tab === "gate" && <GatekeeperForm rates={rates} onLog={(g) => setGateLog((l) => [g, ...l])} />}
      {tab === "audit" && (
        <AuditHistory
          history={history} gateLog={gateLog}
          onDelete={(id) => setHistory((h) => h.filter((m) => m.id !== id))}
          onClear={() => setHistory([])}
        />
      )}

      <ProjectorMode
        open={projector} onClose={closeProjector} title={session.title}
        elapsedSec={elapsedSec} cost={cost} burn={burn} people={people} zone={zone} status={session.status}
      />
    </main>
  );
}
