"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Status, Zone } from "@/lib/types";
import { CRITICAL_SEC, FATIGUE_SEC, ZONE_META, clock, rupiah } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  elapsedSec: number;
  cost: number;
  burn: number;
  people: number;
  zone: Zone;
  status: Status;
}

export default function ProjectorMode({ open, onClose, title, elapsedSec, cost, burn, people, zone, status }: Props) {
  useEffect(() => {
    if (!open) return;
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => undefined);
    }
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const hot = zone !== "efisien";
  let remainLabel: string;
  let remainValue: string;
  if (elapsedSec < CRITICAL_SEC) {
    remainLabel = "Sisa waktu fokus efektif";
    remainValue = clock(CRITICAL_SEC - elapsedSec);
  } else if (elapsedSec < FATIGUE_SEC) {
    remainLabel = "Sisa menuju batas kelelahan";
    remainValue = clock(FATIGUE_SEC - elapsedSec);
  } else {
    remainLabel = "Melewati batas kelelahan";
    remainValue = "+" + clock(elapsedSec - FATIGUE_SEC);
  }
  const bg = hot ? "bg-signal text-white" : "bg-alabaster text-ink";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 ${bg}`} role="dialog" aria-label="Mode proyektor">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="font-display text-2xl font-bold sm:text-4xl">{title || "Rapat berjalan"}</div>
          <div className="mt-1 font-mono text-sm sm:text-xl">
            {people} peserta · {rupiah(burn)}/jam · {status === "running" ? "LIVE" : "JEDA"}
          </div>
        </div>
        <button
          onClick={onClose} aria-label="Keluar mode proyektor"
          className="border border-current p-2 hover:opacity-70"
        >
          <X size={24} />
        </button>
      </div>

      <div>
        <div className="font-mono text-sm sm:text-xl">Biaya rapat saat ini</div>
        <div className="tnum whitespace-nowrap font-mono font-bold leading-none" style={{ fontSize: "clamp(2.5rem, 11vw, 11rem)" }}>
          {rupiah(cost)}
        </div>
      </div>

      <div className="grid gap-6 border-t-2 border-current pt-6 sm:grid-cols-2">
        <div>
          <div className="font-mono text-sm sm:text-xl">Waktu berjalan</div>
          <div className="tnum font-mono font-bold leading-none" style={{ fontSize: "clamp(2rem, 7vw, 6rem)" }}>
            {clock(elapsedSec)}
          </div>
        </div>
        <div>
          <div className="font-mono text-sm sm:text-xl">{remainLabel}</div>
          <div className="tnum font-mono font-bold leading-none" style={{ fontSize: "clamp(2rem, 7vw, 6rem)" }}>
            {remainValue}
          </div>
        </div>
      </div>

      <div className="font-display text-xl font-bold sm:text-3xl">
        {ZONE_META[zone].label}: {ZONE_META[zone].message}
      </div>
    </div>
  );
}
