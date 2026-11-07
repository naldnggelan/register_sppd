// Instal aplikasi (PWA): daftarkan service worker + tombol "Instal Aplikasi" kecil di pojok kiri bawah.
// Berdiri sendiri, tidak mengubah app.js. Tombol tidak muncul bila aplikasi sudah terinstal.
(function () {
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  const terinstal = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true;
  const simpan = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }, ambil = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let tunda = null, btn = null;
  const css = document.createElement('style');
  css.textContent = '#pwaBtn{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:6px;padding:.55rem .95rem .55rem .75rem;border-radius:999px;border:1px solid rgba(255,255,255,.3);color:#fff;font:700 13px/1 system-ui,Segoe UI,Arial,sans-serif;cursor:pointer;background:linear-gradient(180deg,#22d3ee,#0891b2);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 10px 24px -8px rgba(0,0,0,.55);animation:pwaIn .5s cubic-bezier(.2,.9,.3,1.3) both}'
    + '#pwaBtn .x{margin-left:4px;opacity:.75;font-size:16px;padding:0 2px}#pwaBtn .x:hover{opacity:1}@keyframes pwaIn{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}'
    + '#pwaIos{position:fixed;inset:0;z-index:70;background:rgba(2,10,18,.55);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:16px}'
    + '#pwaIos div{max-width:420px;width:100%;background:rgba(14,26,38,.96);color:#e8f1f5;border:1px solid rgba(255,255,255,.2);border-radius:1.2rem;padding:16px 18px;font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif}#pwaIos b{color:#67e8f9}#pwaIos button{margin-top:10px;width:100%;padding:.6rem;border-radius:999px;border:0;font-weight:700;background:#0891b2;color:#fff}'
    + '@media print{#pwaBtn,#pwaIos{display:none!important}}';
  document.head.appendChild(css);
  const tampil = () => {
    if (btn || terinstal() || ambil('pwa_tutup') === '1') return;
    btn = document.createElement('button'); btn.id = 'pwaBtn'; btn.type = 'button'; btn.title = 'Instal REGISTER SPPD di perangkat ini';
    btn.innerHTML = '<span class="ms" style="font-size:19px">install_desktop</span>Instal Aplikasi<span class="x" title="Sembunyikan">✕</span>';
    btn.onclick = async ev => {
      if (ev.target.classList.contains('x')) { simpan('pwa_tutup', '1'); hapus(); return; }
      if (tunda) { tunda.prompt(); const r = await tunda.userChoice.catch(() => ({})); tunda = null; if (r && r.outcome === 'accepted') hapus(); return; }
      if (ios) { const m = document.createElement('div'); m.id = 'pwaIos'; m.innerHTML = '<div><b>Instal di iPhone / iPad</b><br>1. Buka aplikasi ini di <b>Safari</b>.<br>2. Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).<br>3. Pilih <b>Tambahkan ke Layar Utama</b>, lalu <b>Tambah</b>.<button type="button">Mengerti</button></div>'; m.onclick = e => { if (e.target === m || e.target.tagName === 'BUTTON') m.remove(); }; document.body.appendChild(m); }
    };
    document.body.appendChild(btn);
  };
  const hapus = () => { if (btn) { btn.remove(); btn = null; } };
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); tunda = e; tampil(); });
  addEventListener('appinstalled', () => { tunda = null; hapus(); });
  if (ios && !terinstal()) addEventListener('load', () => setTimeout(tampil, 1500));
})();
