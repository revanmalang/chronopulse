# ChronoPulse

Real-Time Meeting Cost Tracker & Async Decision Gatekeeper.
Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Framer Motion.

## Jalankan lokal
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # verifikasi build produksi
```

## Push ke GitHub
```bash
git init
git add .
git commit -m "feat: ChronoPulse initial release"
git branch -M main
git remote add origin https://github.com/<USERNAME>/chronopulse.git
git push -u origin main
```

## Deploy ke Vercel
```bash
npm i -g vercel
vercel login
vercel --prod
```
Atau import repo dari dashboard Vercel (framework terdeteksi otomatis sebagai Next.js; tanpa env var).

Data tersimpan di LocalStorage browser (per perangkat).
