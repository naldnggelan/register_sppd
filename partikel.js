/* =====================================================================================
   ANIMASI PARTIKEL latar belakang (REGISTER SPPD) - diatur dari Control Panel > Warna Tampilan
   Berdiri sendiri: kanvas di belakang semua isi (tidak bisa diklik), otomatis berhenti saat tab tidak dilihat,
   otomatis hemat di HP, dan mati bila perangkat diatur "kurangi gerakan".
   API: Partikel.set(cfg)  Partikel.halaman(nama)  Partikel.JENIS (daftar 8 jenis)
   cfg = {jenis:'jaringan'|...|'' (mati), jumlah:1, kecepatan:1, ukuran:1, opasitas:1, warna:'' (ikut tema) | '#rrggbb', interaksi:true, tempat:'semua'|'login_dash'|'login'}
   ===================================================================================== */
(function () {
  'use strict';
  var JENIS = [
    ['jaringan', 'Jaringan Terhubung', 'Titik melayang yang tersambung garis tipis'],
    ['kunang', 'Kunang-kunang', 'Cahaya kecil berkedip melayang naik'],
    ['bara', 'Percikan Bara Api', 'Bara oranye naik seperti percikan api'],
    ['gelembung', 'Gelembung', 'Gelembung kaca bening naik perlahan'],
    ['salju', 'Salju', 'Butiran salju turun berayun'],
    ['bintang', 'Bintang Berkelip', 'Langit berbintang + bintang jatuh'],
    ['hujan', 'Hujan Cahaya', 'Garis cahaya jatuh seperti hujan meteor'],
    ['bokeh', 'Bokeh Lembut', 'Lingkaran cahaya buram melayang']
  ];
  var DEF = { jenis: '', jumlah: 1, kecepatan: 1, ukuran: 1, opasitas: 1, warna: '', interaksi: true, tempat: 'semua' };
  var cfg = Object.assign({}, DEF), hal = 'login', cv = null, cx = null, W = 0, H = 0, P = [], raf = 0, mouse = { x: -999, y: -999 }, aktif = false, akhir = 0;
  var HP = matchMedia('(max-width: 1023px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  var GERAK_KURANG = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function R(a, b) { return a + Math.random() * (b - a); }
  function hexRgb(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); var n = parseInt(h, 16); return isNaN(n) ? [6, 182, 212] : [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function warnaTema(k) { var v = getComputedStyle(document.documentElement).getPropertyValue(k).trim(); return /^#/.test(v) ? v : (k === '--lq-b' ? '#2563eb' : k === '--lq-c' ? '#14b8a6' : '#06b6d4'); }
  function palet() { // 3 warna: pilihan sendiri (1 warna -> variasi terang/gelap) atau ikut warna tema
    if (/^#[0-9a-f]{6}$/i.test(cfg.warna || '')) { var c = hexRgb(cfg.warna); return [c, c.map(function (x) { return Math.min(255, x + 70); }), c.map(function (x) { return Math.max(0, x - 40); })]; }
    return [hexRgb(warnaTema('--lq-a')), hexRgb(warnaTema('--lq-b')), hexRgb(warnaTema('--lq-c'))];
  }
  var PAL = palet();
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a * cfg.opasitas)).toFixed(3) + ')'; }
  function pakai() { // apakah tampil di halaman ini
    if (!cfg.jenis || GERAK_KURANG) return false;
    if (cfg.tempat === 'login') return hal === 'login';
    if (cfg.tempat === 'login_dash') return hal === 'login' || hal === 'dash';
    return true;
  }
  function kanvas() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.id = 'ptkl'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    document.body.insertBefore(cv, document.body.firstChild); cx = cv.getContext('2d'); ukur();
  }
  function ukur() { if (!cv) return; var d = Math.min(HP ? 1.5 : 2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  function jumlah() { var dasar = { jaringan: 70, kunang: 55, bara: 70, gelembung: 35, salju: 110, bintang: 140, hujan: 70, bokeh: 22 }[cfg.jenis] || 50; var n = dasar * (W * H) / (1366 * 768) * cfg.jumlah; if (HP) n *= .55; return Math.max(6, Math.min(260, Math.round(n))); }
  function baru(awal) {
    var s = cfg.ukuran, v = cfg.kecepatan, j = cfg.jenis, c = PAL[Math.floor(Math.random() * 3)];
    if (j === 'jaringan') return { x: R(0, W), y: R(0, H), vx: R(-.3, .3) * v, vy: R(-.3, .3) * v, r: R(1.2, 2.4) * s, c: c };
    if (j === 'kunang') return { x: R(0, W), y: awal ? R(0, H) : H + 10, vx: R(-.15, .15) * v, vy: R(-.15, -.45) * v, r: R(1, 2.6) * s, f: R(0, 6.28), fs: R(.01, .035), c: c };
    if (j === 'bara') return { x: R(0, W), y: awal ? R(0, H) : H + R(0, 40), vx: R(-.3, .3) * v, vy: R(-.6, -1.6) * v, r: R(.8, 2.4) * s, t: awal ? R(0, .8) : 0, hidup: R(.6, 1), w: R(0, 6.28) };
    if (j === 'gelembung') return { x: R(0, W), y: awal ? R(0, H) : H + 30, vx: 0, vy: R(-.25, -.8) * v, r: R(4, 16) * s, w: R(0, 6.28), c: c };
    if (j === 'salju') return { x: R(0, W), y: awal ? R(0, H) : -10, vx: R(-.2, .2) * v, vy: R(.3, 1.1) * v, r: R(1, 3.2) * s, w: R(0, 6.28) };
    if (j === 'bintang') return { x: R(0, W), y: R(0, H), r: R(.4, 1.6) * s, f: R(0, 6.28), fs: R(.01, .05) * v, c: Math.random() < .25 ? c : [255, 255, 255] };
    if (j === 'hujan') return { x: R(-W * .2, W), y: awal ? R(-H, H) : R(-H * .5, -20), vx: 1.2 * v, vy: R(5, 10) * v, l: R(20, 70) * s, c: c };
    return { x: R(0, W), y: R(0, H), vx: R(-.2, .2) * v, vy: R(-.2, .2) * v, r: R(25, 80) * s, f: R(0, 6.28), fs: R(.004, .012), c: c }; // bokeh
  }
  var meteor = null;
  function isi() { P = []; var n = jumlah(); for (var i = 0; i < n; i++) P.push(baru(true)); meteor = null; }
  function jauhkan(p, jarak, kuat) { if (!cfg.interaksi) return; var dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy); if (d < jarak && d > 0) { p.x += dx / d * kuat; p.y += dy / d * kuat; } }
  function gambar() {
    var j = cfg.jenis, i, p, g;
    cx.clearRect(0, 0, W, H);
    if (j === 'jaringan') {
      var D = HP ? 100 : 130, D2 = D * D;
      for (i = 0; i < P.length; i++) { p = P[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
      cx.lineWidth = 1;
      for (i = 0; i < P.length; i++) {
        var a = P[i];
        for (var k = i + 1; k < P.length; k++) { var b = P[k], dx = a.x - b.x, dy = a.y - b.y, dd = dx * dx + dy * dy; if (dd < D2) { cx.strokeStyle = rgba(a.c, (1 - Math.sqrt(dd) / D) * .45); cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); } }
        if (cfg.interaksi) { var dm = Math.hypot(a.x - mouse.x, a.y - mouse.y); if (dm < 170) { cx.strokeStyle = 'rgba(255,255,255,' + ((1 - dm / 170) * .5 * cfg.opasitas).toFixed(3) + ')'; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(mouse.x, mouse.y); cx.stroke(); jauhkan(a, 170, .3); } }
        cx.fillStyle = rgba(a.c.map(function (x) { return Math.min(255, x + 90); }), .95); cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 7); cx.fill();
      }
    } else if (j === 'kunang' || j === 'bokeh') {
      cx.globalCompositeOperation = 'lighter';
      for (i = 0; i < P.length; i++) {
        p = P[i]; p.f += p.fs * cfg.kecepatan; p.x += p.vx + (j === 'kunang' ? Math.sin(p.f) * .25 : 0); p.y += p.vy; jauhkan(p, 120, .8);
        if (j === 'kunang' && p.y < -10) Object.assign(p, baru(false));
        if (j === 'bokeh') { if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r; if (p.y < -p.r) p.y = H + p.r; if (p.y > H + p.r) p.y = -p.r; }
        var kd = j === 'kunang' ? .35 + .65 * Math.abs(Math.sin(p.f * 1.7)) : .5 + .5 * Math.sin(p.f), rr = j === 'kunang' ? p.r * 7 : p.r;
        g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        if (j === 'kunang') { g.addColorStop(0, rgba([235, 255, 252], .9 * kd)); g.addColorStop(.25, rgba(p.c, .5 * kd)); g.addColorStop(1, rgba(p.c, 0)); }
        else { g.addColorStop(0, rgba(p.c, .16 * kd)); g.addColorStop(.7, rgba(p.c, .07 * kd)); g.addColorStop(1, rgba(p.c, 0)); }
        cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, rr, 0, 7); cx.fill();
      }
      cx.globalCompositeOperation = 'source-over';
    } else if (j === 'bara') {
      cx.globalCompositeOperation = 'lighter';
      for (i = P.length - 1; i >= 0; i--) {
        p = P[i]; p.t += .008 * cfg.kecepatan; p.w += .05; p.x += p.vx + Math.sin(p.w) * .3; p.y += p.vy;
        if (p.ledak) { p.vy += .03; p.vx *= .98; p.t += .012; }
        var sisa = 1 - p.t / p.hidup; if (sisa <= 0 || p.y < -20) { if (p.ledak) P.splice(i, 1); else Object.assign(p, baru(false)); continue; }
        g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        var api = /^#/.test(cfg.warna || '') ? PAL[0] : [255, 140, 40];
        g.addColorStop(0, rgba([255, 240, 200], sisa)); g.addColorStop(.3, rgba(api, .7 * sisa)); g.addColorStop(1, rgba([220, 38, 38], 0));
        cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 5, 0, 7); cx.fill();
      }
      cx.globalCompositeOperation = 'source-over';
    } else if (j === 'gelembung') {
      for (i = 0; i < P.length; i++) {
        p = P[i]; p.w += .02 * cfg.kecepatan; p.x += Math.sin(p.w) * .4; p.y += p.vy; jauhkan(p, 110, 1.2); if (p.y < -p.r * 2) Object.assign(p, baru(false));
        cx.strokeStyle = rgba(p.c.map(function (x) { return Math.min(255, x + 80); }), .55); cx.lineWidth = 1.2; cx.fillStyle = rgba(p.c, .08);
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); cx.stroke();
        cx.fillStyle = rgba([255, 255, 255], .5); cx.beginPath(); cx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 7); cx.fill();
      }
    } else if (j === 'salju') {
      var wSalju = /^#/.test(cfg.warna || '') ? PAL[1] : [255, 255, 255];
      for (i = 0; i < P.length; i++) {
        p = P[i]; p.w += .02; p.x += p.vx + Math.sin(p.w) * .5; p.y += p.vy; jauhkan(p, 90, 1);
        if (p.y > H + 10) Object.assign(p, baru(false)); if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        cx.fillStyle = rgba(wSalju, .75); cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
      }
    } else if (j === 'bintang') {
      for (i = 0; i < P.length; i++) { p = P[i]; p.f += p.fs; var kk = .25 + .75 * Math.abs(Math.sin(p.f)); cx.fillStyle = rgba(p.c, kk); cx.beginPath(); cx.arc(p.x, p.y, p.r * (cfg.interaksi && Math.hypot(p.x - mouse.x, p.y - mouse.y) < 90 ? 2 : 1), 0, 7); cx.fill(); }
      if (!meteor && Math.random() < .006 * cfg.kecepatan) meteor = { x: R(W * .2, W), y: R(0, H * .4), vx: -R(6, 10) * cfg.kecepatan, vy: R(2.5, 4.5) * cfg.kecepatan, t: 1 };
      if (meteor) { var m = meteor; m.x += m.vx; m.y += m.vy; m.t -= .02; g = cx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12); g.addColorStop(0, rgba([255, 255, 255], m.t)); g.addColorStop(1, rgba(PAL[0], 0)); cx.strokeStyle = g; cx.lineWidth = 2 * cfg.ukuran; cx.beginPath(); cx.moveTo(m.x, m.y); cx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12); cx.stroke(); if (m.t <= 0 || m.x < -50 || m.y > H + 50) meteor = null; }
    } else if (j === 'hujan') {
      cx.lineCap = 'round';
      for (i = 0; i < P.length; i++) {
        p = P[i]; p.x += p.vx; p.y += p.vy; if (p.y - p.l > H) Object.assign(p, baru(false));
        g = cx.createLinearGradient(p.x, p.y, p.x - p.vx * p.l / p.vy, p.y - p.l); g.addColorStop(0, rgba(p.c.map(function (x) { return Math.min(255, x + 60); }), .8)); g.addColorStop(1, rgba(p.c, 0));
        cx.strokeStyle = g; cx.lineWidth = 1.4 * cfg.ukuran; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * p.l / p.vy, p.y - p.l); cx.stroke();
      }
    }
  }
  function loop(t) {
    if (!aktif) return;
    raf = requestAnimationFrame(loop);
    if (HP && t - akhir < 32) return; // HP: sekitar 30 gambar per detik supaya hemat baterai
    akhir = t; gambar();
  }
  function mulai() { if (aktif) return; kanvas(); cv.style.display = ''; ukur(); isi(); aktif = true; raf = requestAnimationFrame(loop); }
  function henti() { aktif = false; cancelAnimationFrame(raf); if (cv) { cx.clearRect(0, 0, W, H); cv.style.display = 'none'; } }
  function segarkan() { PAL = palet(); if (pakai() && !document.hidden) { if (aktif) { isi(); } else mulai(); } else henti(); }
  addEventListener('resize', function () { if (aktif) { ukur(); isi(); } });
  addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
  addEventListener('pointerdown', function (e) { // Bara Api: klik / sentuh memunculkan semburan percikan
    if (!aktif || cfg.jenis !== 'bara' || !cfg.interaksi) return;
    for (var i = 0; i < 24; i++) { var a = R(0, 6.28), s = R(1, 4); P.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, r: R(1, 2.6) * cfg.ukuran, hidup: 1, t: 0, w: 0, ledak: 1 }); }
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) henti(); else segarkan(); });
  function rapikan(c) {
    c = Object.assign({}, DEF, c || {});
    var n = function (v, a, b, d) { v = Number(v); return isNaN(v) ? d : Math.max(a, Math.min(b, v)); };
    return { jenis: JENIS.some(function (x) { return x[0] === c.jenis; }) ? c.jenis : '', jumlah: n(c.jumlah, .2, 2.5, 1), kecepatan: n(c.kecepatan, .2, 3, 1), ukuran: n(c.ukuran, .4, 2.5, 1),
      opasitas: n(c.opasitas, .15, 1, 1), warna: /^#[0-9a-f]{6}$/i.test(c.warna || '') ? c.warna : '', interaksi: c.interaksi !== false, tempat: ['semua', 'login_dash', 'login'].indexOf(c.tempat) >= 0 ? c.tempat : 'semua' };
  }
  window.Partikel = {
    JENIS: JENIS, DEF: DEF, rapikan: rapikan,
    set: function (c) { cfg = rapikan(typeof c === 'string' ? (function () { try { return JSON.parse(c); } catch (e) { return {}; } })() : c); segarkan(); },
    get: function () { return Object.assign({}, cfg); },
    halaman: function (h) { hal = h || 'login'; segarkan(); },
    warna: function () { PAL = palet(); if (aktif) isi(); } // panggil setelah warna tema berubah
  };
  try { var s = JSON.parse(localStorage.getItem('sppd_look') || 'null'); if (s && s.partikel) window.Partikel.set(s.partikel); } catch (e) {}
})();
