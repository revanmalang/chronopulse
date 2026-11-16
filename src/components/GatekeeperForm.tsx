"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ClipboardCopy, ShieldCheck } from "lucide-react";
import type { GateRecord, Rates } from "@/lib/types";
import { LEVELS, rupiah } from "@/lib/utils";
import MeetingCreator from "./MeetingCreator";

type Verdict = GateRecord["verdict"];

const PURPOSES = [
  { v: "info", label: "Berbagi informasi / status update", w: -3, channel: "Email atau Slack (ringkasan tertulis)" },
  { v: "review", label: "Review dokumen / umpan balik", w: -2, channel: "Dokumen bersama dengan komentar inline" },
  { v: "keputusan", label: "Pengambilan keputusan", w: 2, channel: "Dokumen keputusan singkat + voting di Slack" },
  { v: "brainstorm", label: "Brainstorming / kreasi bersama", w: 1, channel: "Thread Slack + dokumen ide bersama" },
  { v: "konflik", label: "Isu sensitif / konflik / evaluasi personal", w: 3, channel: "Percakapan langsung" },
  { v: "pelatihan", label: "Pelatihan / onboarding", w: 0, channel: "Rekaman video + dokumen panduan" },
];
const URGENCY = [
  { v: "rendah", label: "Rendah (bisa menunggu beberapa hari)", w: -2 },
  { v: "sedang", label: "Sedang (dalam minggu ini)", w: 0 },
  { v: "tinggi", label: "Tinggi (hari ini atau besok)", w: 2 },
  { v: "kritis", label: "Kritis (blokir pekerjaan sekarang)", w: 3 },
];

interface Result {
  verdict: Verdict;
  score: number;
  reasons: string[];
  cost: number;
  minutes: number;
  people: number;
  channel: string;
  message: string;
}

interface Props {
  rates: Rates;
  onLog: (g: GateRecord) => void;
  cloudReady: boolean;
  loggedIn: boolean;
  gToken: string | null;
  accToken: string | null;
  onLogin: () => void;
  onUseTitle: (t: string) => void;
}

export default function GatekeeperForm({ rates, onLog, cloudReady, loggedIn, gToken, accToken, onLogin, onUseTitle }: Props) {
  const [goal, setGoal] = useState("");
  const [purpose, setPurpose] = useState("info");
  const [urgency, setUrgency] = useState("sedang");
  const [people, setPeople] = useState(5);
  const [minutes, setMinutes] = useState(30);
  const [twoWay, setTwoWay] = useState(false);
  const [agenda, setAgenda] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  const evaluate = () => {
    const g = goal.trim();
    if (g.length < 10) {
      setError("Tujuan rapat minimal 10 karakter agar bisa dievaluasi.");
      return;
    }
    setError("");
    const P = PURPOSES.find((x) => x.v === purpose) ?? PURPOSES[0];
    const U = URGENCY.find((x) => x.v === urgency) ?? URGENCY[1];
    const n = Math.max(1, Math.floor(people) || 1);
    const m = Math.max(5, Math.floor(minutes) || 30);
    const reasons: string[] = [];
    let score = P.w + U.w;
    reasons.push(`Jenis topik: ${P.label} (${P.w >= 0 ? "+" : ""}${P.w})`);
    reasons.push(`Urgensi: ${U.v} (${U.w >= 0 ? "+" : ""}${U.w})`);
    const pw = n > 8 ? -2 : n >= 6 ? -1 : n >= 4 ? 0 : 1;
    score += pw;
    reasons.push(`Jumlah peserta ${n} (${pw >= 0 ? "+" : ""}${pw})`);
    if (twoWay) { score += 2; reasons.push("Butuh diskusi dua arah real-time (+2)"); }
    else { score -= 1; reasons.push("Tidak butuh diskusi dua arah (-1)"); }
    if (!agenda) { score -= 1; reasons.push("Belum ada agenda/dokumen tertulis (-1)"); }
    if (m > 60) { score -= 1; reasons.push("Durasi di atas 60 menit (-1)"); }

    const verdict: Verdict = score >= 3 ? "wajib" : score >= 0 ? "singkat" : "async";
    const avg = LEVELS.reduce((a, l) => a + rates[l.key], 0) / LEVELS.length;
    const cost = (n * avg * m) / 60;
    const sugMin = verdict === "wajib" ? Math.min(m, 45) : verdict === "singkat" ? Math.min(m, 25) : 0;
    const sugPeople = verdict === "singkat" ? Math.min(n, 6) : n;
    const short = g.length > 70 ? g.slice(0, 67) + "..." : g;

    let message: string;
    if (verdict === "async") {
      message =
`Subjek: Pengalihan ke komunikasi asinkron - ${short}

Halo,

Terima kasih sudah mengajukan pembahasan: ${g}

Setelah ditinjau (urgensi ${U.v}, ${n} peserta, estimasi biaya rapat ${rupiah(cost)} untuk ${m} menit), topik ini lebih efisien diselesaikan secara asinkron lewat ${P.channel}.

Usulan alur:
1. Tuliskan konteks, pertanyaan atau keputusan yang dibutuhkan, dan batas waktu respons (maksimal 24 jam kerja).
2. Peserta memberi tanggapan tertulis sebelum batas waktu.
3. Jika masih ada ketidaksepakatan, kita jadwalkan rapat maksimal 15 menit dengan agenda yang jelas.

Terima kasih atas pengertiannya.`;
    } else if (verdict === "singkat") {
      message =
`Subjek: Konfirmasi rapat singkat - ${short}

Halo,

Rapat untuk topik: ${g} dapat dilanjutkan dengan syarat berikut:
1. Durasi maksimal ${sugMin} menit.
2. Peserta inti saja (maksimal ${sugPeople} orang); lainnya cukup menerima notulen.
3. Agenda dan bahan dikirim tertulis sebelum rapat.
4. Rapat ditutup dengan keputusan dan penanggung jawab yang dicatat.

Estimasi biaya rapat: ${rupiah((sugPeople * avg * sugMin) / 60)}.

Terima kasih.`;
    } else {
      message =
`Subjek: Undangan rapat - ${short}

Halo,

Topik ini memerlukan rapat tatap muka: ${g}

Ketentuan rapat:
1. Durasi maksimal ${sugMin} menit.
2. Agenda dan bahan bacaan dikirim sebelum rapat.
3. Target keluaran: keputusan tertulis dengan penanggung jawab dan tenggat.
4. Estimasi biaya rapat: ${rupiah((n * avg * sugMin) / 60)} (${n} peserta).

Mohon konfirmasi kehadiran. Terima kasih.`;
    }
    setResult({ verdict, score, reasons, cost, minutes: sugMin, people: sugPeople, channel: P.channel, message });
    setCopied(false);
    setLogged(false);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin otomatis. Blok teks pesan lalu salin manual.");
    }
  };

  const log = () => {
    if (!result) return;
    onLog({
      id: `G${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      purpose: goal.trim(),
      verdict: result.verdict,
      participants: Math.max(1, Math.floor(people) || 1),
      plannedMin: Math.max(5, Math.floor(minutes) || 30),
      estCost: result.cost,
    });
    setLogged(true);
  };

  const vText: Record<Verdict, { t: string; d: string; cls: string }> = {
    async: { t: "Alihkan ke asinkron", d: "Tidak perlu rapat. Gunakan " , cls: "bg-ok text-white" },
    singkat: { t: "Rapat singkat bersyarat", d: "Boleh rapat, dengan batas ketat.", cls: "bg-ink text-alabaster" },
    wajib: { t: "Wajib rapat tatap muka", d: "Topik ini butuh interaksi langsung.", cls: "bg-signal text-white" },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="panel p-5">
        <h2 className="font-display text-lg font-bold">Gatekeeper sebelum undangan dikirim</h2>
        <p className="mb-4 text-sm text-ink/70">Isi formulir ini dulu. Hasilnya menentukan perlu tidaknya rapat.</p>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="goal">Tujuan rapat</label>
            <textarea id="goal" className="field" rows={3} value={goal} maxLength={300}
              onChange={(e) => setGoal(e.target.value)} placeholder="Apa yang harus dicapai setelah rapat selesai?" />
          </div>
          <div>
            <label className="label" htmlFor="purpose">Jenis topik</label>
            <select id="purpose" className="field" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {PURPOSES.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="urgency">Tingkat urgensi</label>
            <select id="urgency" className="field" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              {URGENCY.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="people">Jumlah peserta</label>
              <input id="people" type="number" min={1} className="field tnum font-mono" value={people}
                onChange={(e) => setPeople(Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="minutes">Durasi rencana (menit)</label>
              <input id="minutes" type="number" min={5} step={5} className="field tnum font-mono" value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#FF4D00]" checked={twoWay} onChange={(e) => setTwoWay(e.target.checked)} />
            Butuh diskusi dua arah secara real-time
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#FF4D00]" checked={agenda} onChange={(e) => setAgenda(e.target.checked)} />
            Agenda atau dokumen tertulis sudah siap
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-signal">{error}</p>}
          <button className="btn btn-signal" onClick={evaluate}>
            <ShieldCheck size={16} /> Evaluasi kebutuhan rapat
          </button>
        </div>
      </section>

      <section className="panel p-5" aria-live="polite">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-ink/70">
              Hasil evaluasi, alasan penilaian, dan pesan siap salin akan muncul di sini.
            </motion.p>
          ) : (
            <motion.div key={result.score + result.verdict + result.message.length} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className={`border border-ink p-4 ${vText[result.verdict].cls}`}>
                <div className="font-display text-2xl font-bold">{vText[result.verdict].t}</div>
                <div className="text-sm">
                  {result.verdict === "async" ? `Tidak perlu rapat. Gunakan ${result.channel}.` : vText[result.verdict].d}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="border border-ink bg-alabaster p-2">
                  <div className="label !mb-0">Skor</div>
                  <div className="tnum font-mono text-lg font-bold">{result.score}</div>
                </div>
                <div className="border border-ink bg-alabaster p-2">
                  <div className="label !mb-0">Biaya rencana</div>
                  <div className="tnum font-mono text-sm font-bold">{rupiah(result.cost)}</div>
                </div>
                <div className="border border-ink bg-alabaster p-2">
                  <div className="label !mb-0">Saran</div>
                  <div className="tnum font-mono text-sm font-bold">
                    {result.verdict === "async" ? "Tanpa rapat" : `${result.minutes} mnt / ${result.people} org`}
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {result.reasons.map((r) => <li key={r} className="border-l-2 border-ink pl-2">{r}</li>)}
              </ul>
              <label className="label mt-4" htmlFor="msg">Pesan siap salin</label>
              <textarea id="msg" readOnly className="field font-mono !text-xs" rows={12} value={result.message} />
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="btn btn-ink" onClick={copy}>
                  {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
                  {copied ? "Tersalin" : result.verdict === "async" ? "Salin pesan pengalihan" : "Salin pesan rapat"}
                </button>
                <button className="btn" onClick={log} disabled={logged}>
                  {logged ? "Tercatat di log" : "Catat keputusan ke log"}
                </button>
              </div>
              {result.verdict !== "async" && (
                <MeetingCreator
                  key={result.message}
                  cloudReady={cloudReady} loggedIn={loggedIn} gToken={gToken} accToken={accToken}
                  onLogin={onLogin} goal={goal.trim()} minutes={result.minutes} onUseTitle={onUseTitle}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
