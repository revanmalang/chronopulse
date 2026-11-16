export type Level = "staf" | "senior" | "manager" | "direktur";
export type Counts = Record<Level, number>;
export type Rates = Record<Level, number>;
export type Zone = "efisien" | "kritis" | "kelelahan";
export type Status = "idle" | "running" | "paused";

export interface Session {
  title: string;
  counts: Counts;
  status: Status;
  accMs: number;
  startAt: number | null;
  startedISO: string | null;
}

export interface MeetingRecord {
  id: string;
  title: string;
  startedAt: string;
  durationSec: number;
  cost: number;
  headcount: number;
  counts: Counts;
  rates: Rates;
  zone: Zone;
  outcome: string;
}

export interface GateRecord {
  id: string;
  at: string;
  purpose: string;
  verdict: "async" | "singkat" | "wajib";
  participants: number;
  plannedMin: number;
  estCost: number;
}
