import type { Backup, Counts, Level, MeetingRecord, Rates, Session, Zone } from "./types";

export const LEVELS: { key: Level; label: string }[] = [
  { key: "staf", label: "Staf" },
  { key: "senior", label: "Senior" },
  { key: "manager", label: "Manager" },
  { key: "direktur", label: "Direktur" },
];

export const DEFAULT_RATES: Rates = { staf: 50000, senior: 90000, manager: 150000, direktur: 350000 };
export const DEFAULT_COUNTS: Counts = { staf: 3, senior: 2, manager: 1, direktur: 0 };
export const DEFAULT_SESSION: Session = {
  title: "",
  counts: DEFAULT_COUNTS,
  status: "idle",
  accMs: 0,
  startAt: null,
  startedISO: null,
};

export const CRITICAL_SEC = 30 * 60;
export const FATIGUE_SEC = 45 * 60;

export function rupiah(n: number): string {
  const v = Math.round(Math.max(0, Number.isFinite(n) ? n : 0));
  return "Rp " + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [h, m, ss].map((x) => String(x).padStart(2, "0")).join(":");
}

export function minutesLabel(sec: number): string {
  return Math.round(sec / 60) + " mnt";
}

export function zoneFor(sec: number): Zone {
  if (sec >= FATIGUE_SEC) return "kelelahan";
  if (sec >= CRITICAL_SEC) return "kritis";
  return "efisien";
}

export const ZONE_META: Record<Zone, { label: string; message: string }> = {
  efisien: { label: "Zona Efisien", message: "Fokus masih tajam. Capai keputusan sebelum menit ke-30." },
  kritis: {
    label: "Zona Kritis",
    message: "30 menit terlewati. Ambil keputusan sekarang atau tutup sesi.",
  },
  kelelahan: {
    label: "Zona Kelelahan Kognitif",
    message: "45 menit terlewati. Hentikan rapat, catat keputusan, jadwalkan lanjutan.",
  },
};

export function headcount(counts: Counts): number {
  return LEVELS.reduce((a, l) => a + (counts[l.key] || 0), 0);
}

export function burnPerHour(counts: Counts, rates: Rates): number {
  return LEVELS.reduce((a, l) => a + (counts[l.key] || 0) * (rates[l.key] || 0), 0);
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: MeetingRecord[]): string {
  const head = [
    "ID", "Judul", "Mulai", "Durasi (detik)", "Durasi (menit)", "Total Peserta",
    "Staf", "Senior", "Manager", "Direktur", "Biaya (IDR)", "Zona", "Keputusan/Hasil",
  ];
  const lines = rows.map((r) =>
    [
      r.id, r.title, dateLabel(r.startedAt), r.durationSec, (r.durationSec / 60).toFixed(1),
      r.headcount, r.counts.staf, r.counts.senior, r.counts.manager, r.counts.direktur,
      Math.round(r.cost), r.zone, r.outcome,
    ].map(esc).join(",")
  );
  return "\uFEFF" + [head.map(esc).join(","), ...lines].join("\r\n");
}

export function downloadFile(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function todayKey(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function longDate(d: Date): string {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const p = (x: number) => String(x).padStart(2, "0");
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function parseBackup(text: string): Backup | null {
  try {
    const b = JSON.parse(text);
    if (!b || b.app !== "chronopulse" || !Array.isArray(b.history) || !Array.isArray(b.gateLog) || !b.rates) return null;
    return b as Backup;
  } catch {
    return null;
  }
}
