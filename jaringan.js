// Peringatan jaringan (Opsi B): layar diredupkan + kartu "Tidak Ada Koneksi Internet" saat jaringan hilang,
// pita kuning saat jaringan lambat, pita hijau "Koneksi kembali" saat tersambung lagi.
// Berdiri sendiri, tidak mengubah app.js. Deteksi: status perangkat (online/offline) + cek ke server aplikasi bila permintaan gagal.
(function () {
  const LAMBAT_MS = 8000, ULANG_MS = 5000;
  let offline = false, timer = null, jalan = 0, tLambat = null, tPita = null;
  const css = document.createElement('style');
  css.textContent = '#netTirai{position:fixed;inset:0;z-index:115;background:rgba(2,10,18,.55);backdrop-filter:blur(5px) grayscale(.6);-webkit-backdrop-filter:blur(5px) grayscale(.6);display:none;align-items:center;justify-content:center;padding:16px}'
    + '#netTirai.on{display:flex}'
    + '#netTirai .c{width:min(380px,100%);text-align:center;color:#e8f1f5;background:rgba(14,26,38,.94);border:1px solid rgba(255,255,255,.2);border-radius:1.4rem;padding:24px 20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 24px 50px -16px rgba(0,0,0,.7);font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;animation:netMn .4s cubic-bezier(.2,.9,.3,1.3)}'
    + '@keyframes netMn{from{transform:scale(.85);opacity:0}}'
    + '#netTirai .ik{width:72px;height:72px;margin:0 auto 10px;border-radius:50%;display:grid;place-items:center;background:rgba(239,68,68,.15);color:#f87171}'
    + '#netTirai .ik .ms{font-size:38px;animation:netGy 2s ease-in-out infinite}@keyframes netGy{0%,100%{transform:rotate(0)}10%,30%{transform:rotate(-10deg)}20%,40%{transform:rotate(10deg)}50%{transform:rotate(0)}}'
    + '#netTirai h3{margin:0 0 6px;font-size:17px;color:#fff}#netTirai p{color:#9fb3b6;margin:0 0 14px;font-size:13px}'
    + '#netTirai button{border-radius:999px;padding:.6rem 1.1rem;font-weight:700;cursor:pointer;color:#fff;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);display:inline-flex;gap:6px;align-items:center;font-size:14px}#netTirai button:disabled{opacity:.6;cursor:wait}'
    + '#netTirai .cnt{font-size:12px;color:#9fb3b6;margin-top:10px;min-height:18px}'
    + '#netPita{position:fixed;left:0;right:0;top:0;z-index:116;display:flex;justify-content:center;pointer-events:none;transform:translateY(-120%);transition:transform .45s cubic-bezier(.2,.9,.3,1.2)}'
    + '#netPita.on{transform:none}'
    + '#netPita div{margin-top:calc(10px + env(titlebar-area-height,0px));display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:999px;font:700 14px/1.3 system-ui,Segoe UI,Arial,sans-serif;color:#fff;box-shadow:0 14px 30px -10px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.35);max-width:calc(100% - 24px)}'
    + '#netPita.ok div{background:linear-gradient(180deg,#10b981,#047857)}#netPita.lam div{background:linear-gradient(180deg,#f59e0b,#b45309)}'
    + '#netPita small{font-weight:500;opacity:.9;display:block;font-size:12px}#netPita.lam .ms{animation:netSp 1.2s linear infinite}@keyframes netSp{to{transform:rotate(360deg)}}'
    + '@media print{#netTirai,#netPita{display:none!important}}';
  document.head.appendChild(css);
  const pasang = () => {
    if (document.getElementById('netTirai')) return;
    const t = document.createElement('div'); t.id = 'netTirai'; t.setAttribute('role', 'alertdialog'); t.setAttribute('aria-live', 'assertive');
    t.innerHTML = '<div class="c"><div class="ik"><span class="ms">wifi_off</span></div><h3>Tidak Ada Koneksi Internet</h3><p>REGISTER SPPD bekerja secara online. Periksa Wi-Fi atau data seluler Anda. Aplikasi akan tersambung kembali secara otomatis.</p><button type="button" id="netCoba"><span class="ms">refresh</span> Coba Sambungkan</button><div class="cnt" id="netCnt"></div></div>';
    document.body.appendChild(t);
    const p = document.createElement('div'); p.id = 'netPita'; p.setAttribute('aria-live', 'polite');
    p.innerHTML = '<div><span class="ms" id="netPIk">wifi</span><span><span id="netPJ"></span><small id="netPS"></small></span></div>';
    document.body.appendChild(p);
    document.getElementById('netCoba').onclick = async () => {
      const b = document.getElementById('netCoba'), c = document.getElementById('netCnt'); b.disabled = true; c.textContent = 'Mencoba menyambung…';
      const ok = await ping(); b.disabled = false; if (ok) online(); else c.textContent = 'Belum tersambung · dicoba lagi otomatis setiap 5 detik';
    };
    if (!navigator.onLine) putus();
  };
  const pita = (cls, ik, j, s, lama) => {
    const p = document.getElementById('netPita'); if (!p) return;
    document.getElementById('netPIk').textContent = ik; document.getElementById('netPJ').textContent = j; document.getElementById('netPS').textContent = s;
    p.className = 'on ' + cls; clearTimeout(tPita); if (lama) tPita = setTimeout(() => { p.className = cls; }, lama);
  };
  const tutupPita = () => { const p = document.getElementById('netPita'); if (p) p.className = ''; };
  // cek koneksi ke server aplikasi (tanpa cache & dilewati service worker)
  const ping = async () => {
    if (!navigator.onLine) return false;
    try { const c = new AbortController(), t = setTimeout(() => c.abort(), 6000); const r = await fetch('manifest.webmanifest?__ping=' + Date.now(), { cache: 'no-store', signal: c.signal }); clearTimeout(t); return r.ok; }
    catch (e) { return false; }
  };
  function putus() {
    if (offline) return; offline = true; tutupPita();
    const t = document.getElementById('netTirai'); if (t) { t.classList.add('on'); document.getElementById('netCnt').textContent = ''; }
    clearInterval(timer); timer = setInterval(async () => { if (await ping()) online(); }, ULANG_MS);
  }
  function online() {
    clearInterval(timer); timer = null; if (!offline) return; offline = false;
    const t = document.getElementById('netTirai'); if (t) t.classList.remove('on');
    pita('ok', 'wifi', 'Koneksi kembali ✓', 'Aplikasi tersambung lagi ke server', 3000);
  }
  addEventListener('offline', putus);
  addEventListener('online', async () => { if (await ping()) online(); });
  // pantau permintaan ke server Apps Script: lambat → pita kuning; gagal → cek apakah jaringan putus
  const f0 = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!/script\.google(usercontent)?\.com/.test(url) || (init && init.mode === 'no-cors')) return f0.apply(this, arguments);
    jalan++; if (!tLambat && !offline) tLambat = setTimeout(() => { if (jalan > 0 && !offline) pita('lam', 'progress_activity', 'Jaringan lambat', 'Permintaan butuh waktu lebih lama dari biasanya, mohon tunggu…'); }, LAMBAT_MS);
    const selesai = () => { jalan = Math.max(0, jalan - 1); if (!jalan) { clearTimeout(tLambat); tLambat = null; const p = document.getElementById('netPita'); if (p && /\blam\b/.test(p.className)) tutupPita(); } };
    return f0.apply(this, arguments).then(r => { selesai(); return r; }, async e => { selesai(); if (!(await ping())) putus(); throw e; });
  };
  if (document.body) pasang(); else addEventListener('DOMContentLoaded', pasang);
})();
