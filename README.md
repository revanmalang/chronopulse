# ChronoPulse

Pelacak biaya rapat real-time dan gatekeeper keputusan asinkron untuk operasional kantor.

Rapat dihitung seperti pengeluaran: setiap detik berjalan langsung berubah menjadi Rupiah, dan sebelum undangan dikirim, topiknya disaring dulu apakah memang perlu rapat.

## Fitur

**Tracker langsung**
- Stopwatch yang langsung dikonversi ke Rupiah berdasarkan jumlah peserta dan tarif per jam (Staf, Senior, Manager, Direktur). Tarif bisa diubah.
- Peringatan visual dan beep lembut (Web Audio) di menit ke-30 (Zona Kritis) dan menit ke-45 (Zona Kelelahan Kognitif), lalu pengingat tiap 5 menit.
- Mode proyektor layar penuh untuk TV atau layar ruang rapat.
- Sesi tetap berjalan setelah halaman di-refresh.

**Gatekeeper**
- Formulir wajib sebelum membuat rapat: tujuan, jenis topik, urgensi, jumlah peserta, durasi.
- Hasil: alihkan ke asinkron, rapat singkat bersyarat, atau wajib rapat, lengkap dengan alasan penilaian dan pesan pembatalan/pengalihan siap salin.
- Buat rapat langsung dari hasil evaluasi:
  - Google Meet (login Google, undangan terkirim lewat Google Calendar)
  - Zoom (login, link dibuat dari server)
  - Aplikasi lain seperti Teams atau Webex (tempel link)

**Log audit dan laporan**
- Riwayat rapat dengan action item (tugas, PIC, tenggat), skor produktif 0-100, dan biaya per action item.
- Ekspor CSV, kartu ringkasan rapat yang bisa dicetak ke PDF.
- Laporan mingguan otomatis: total biaya, rapat termahal, action item terlambat, rapat yang berhasil dialihkan ke asinkron.
- Backup JSON manual, backup otomatis harian (7 hari terakhir), dan pemulihan.

**Cloud tim (opsional)**
- Login Google lewat Supabase, data tersinkron per tim berdasarkan domain email kantor.
- Akun email umum (gmail, yahoo, outlook, dll) hanya melihat data sendiri.
- Tanpa konfigurasi cloud, aplikasi tetap jalan penuh dalam mode lokal (LocalStorage).

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide React, Supabase.

## Struktur

```
src/
  app/            page.tsx, layout.tsx, globals.css, api/zoom/route.ts
  components/     LiveTracker, GatekeeperForm, MeetingCreator,
                  AuditHistory, WeeklyReport, ProjectorMode
  lib/            utils, types, audio, supabase, cloud, useLocalStorage
supabase/schema.sql
.env.example
```

## Jalankan lokal

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # cek build produksi
```

Mode lokal tidak butuh konfigurasi apa pun.

## Konfigurasi cloud, Meet, dan Zoom (opsional)

Salin `.env.example` menjadi `.env.local`, lalu isi:

| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | Kredensial app Zoom Server-to-Server OAuth |
| `ZOOM_HOST_EMAIL` | Email host yang menjadi pemilik rapat Zoom |

Langkah setup:

1. **Supabase:** buat project, jalankan `supabase/schema.sql` di SQL Editor.
2. **Login Google:** di Supabase buka Authentication > Providers > Google, aktifkan, isi Client ID dan Secret dari Google Cloud.
3. **Google Calendar:** di Google Cloud aktifkan Google Calendar API dan tambahkan scope `https://www.googleapis.com/auth/calendar.events` di OAuth consent screen. Redirect URI: `https://<project>.supabase.co/auth/v1/callback`.
4. **URL:** di Supabase Authentication > URL Configuration, isi Site URL dengan domain Vercel Anda.
5. **Zoom:** buat app Server-to-Server OAuth dengan scope `meeting:write:admin`, lalu isi env `ZOOM_*`.

## Catatan

- Token Google dari login berlaku sekitar 1 jam dan tidak diperbarui otomatis. Jika kedaluwarsa, keluar lalu masuk lagi.
- Selama app Google berstatus testing, hanya test user yang terdaftar (maksimal 100) yang bisa login.
- Laporan mingguan tampil otomatis di aplikasi, belum dikirim ke email atau Slack.
- Estimasi biaya memakai tarif yang Anda isi sendiri, bukan data gaji sebenarnya.
