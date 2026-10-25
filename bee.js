/* =====================================================================
 * Hewan Lucu Mengikuti Kursor - REGISTER SPPD
 * File tambahan yang berdiri sendiri: tidak mengubah app.js / style.css.
 * Untuk menghapus fitur ini cukup hapus baris <script src="bee.js"> di index.html.
 * - Pilih hewan lewat tombol kecil di pojok kiri bawah: Lebah, Kupu-kupu, Burung, Ikan, Kepik, atau Matikan.
 * - Komputer: hewan terbang/berenang mengikuti arah kursor (dengan sedikit jeda, seperti sungguhan).
 * - HP/tablet: hewan menuju titik yang disentuh.
 * - Diam sebentar: hewan melayang-layang di dekat kursor.
 * - Tidak menghalangi klik (pointer-events: none). Pilihan diingat di perangkat ini.
 * ===================================================================== */
(function () {
  'use strict';
  if (window.__beeLoaded) return; window.__beeLoaded = true;
  var KEY = 'sppd_bee', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- gambar hewan (SVG buatan sendiri, semua menghadap ke KANAN) ----------
  var INK = '#3a2a14';
  var A = {
    lebah: { ikon: '🐝', nama: 'Lebah', svg:
      '<ellipse class="wing b" cx="24" cy="12" rx="9" ry="11" fill="#e8f4ff" fill-opacity=".85" stroke="#6b7c8f" stroke-width="1.2"/>' +
      '<ellipse class="wing" cx="31" cy="11" rx="8" ry="10.5" fill="#fff" fill-opacity=".9" stroke="#6b7c8f" stroke-width="1.2"/>' +
      '<path d="M6 30 L1 31.5 L6 33" fill="' + INK + '"/>' +
      '<ellipse cx="25" cy="31" rx="19" ry="13" fill="#ffc928" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M15 19.6 Q12 31 15 42.4 L20.5 43.9 Q17.5 31 20.5 18.2 Z" fill="' + INK + '"/>' +
      '<path d="M26 18 Q23 31 26 44 L31.5 43.5 Q28.5 31 31.5 18.5 Z" fill="' + INK + '"/>' +
      '<circle cx="42" cy="27" r="9.5" fill="#ffc928" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="45" cy="25" r="3.1" fill="#fff"/><circle cx="45.8" cy="25.3" r="1.9" fill="#1d1d1d"/><circle cx="46.4" cy="24.6" r=".6" fill="#fff"/>' +
      '<path d="M41.5 31.5 Q44.5 33.5 47.5 31.2" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/><circle cx="48.5" cy="29.5" r="1.6" fill="#ff8a8a" fill-opacity=".7"/>' +
      '<path d="M41 18.5 Q40 12 36.5 9.5" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/><circle cx="36" cy="9" r="1.8" fill="' + INK + '"/>' +
      '<path d="M45 18.5 Q47 12.5 50.5 10.5" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/><circle cx="51" cy="10" r="1.8" fill="' + INK + '"/>' },
    kupu: { ikon: '🦋', nama: 'Kupu-kupu', svg: // tampak atas: sayap mengepak ke kiri-kanan
      '<g class="wingL"><path d="M27 24 C14 4 2 8 5 20 C7 27 16 27 27 25 Z" fill="#7c5cff" stroke="#2b1b5e" stroke-width="1.6"/><path d="M27 26 C16 28 7 34 11 41 C15 46 23 38 27 28 Z" fill="#ff7ab6" stroke="#2b1b5e" stroke-width="1.6"/><circle cx="12" cy="17" r="3" fill="#fff" fill-opacity=".8"/><circle cx="15" cy="36" r="2" fill="#fff" fill-opacity=".8"/></g>' +
      '<g class="wingR"><path d="M29 24 C42 4 54 8 51 20 C49 27 40 27 29 25 Z" fill="#7c5cff" stroke="#2b1b5e" stroke-width="1.6"/><path d="M29 26 C40 28 49 34 45 41 C41 46 33 38 29 28 Z" fill="#ff7ab6" stroke="#2b1b5e" stroke-width="1.6"/><circle cx="44" cy="17" r="3" fill="#fff" fill-opacity=".8"/><circle cx="41" cy="36" r="2" fill="#fff" fill-opacity=".8"/></g>' +
      '<ellipse cx="28" cy="27" rx="2.6" ry="12" fill="#2b1b5e"/><circle cx="28" cy="14" r="3.4" fill="#2b1b5e"/>' +
      '<path d="M27 12 Q24 5 20 4" fill="none" stroke="#2b1b5e" stroke-width="1.4" stroke-linecap="round"/><path d="M29 12 Q32 5 36 4" fill="none" stroke="#2b1b5e" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="20" cy="4" r="1.5" fill="#2b1b5e"/><circle cx="36" cy="4" r="1.5" fill="#2b1b5e"/>', tanpaBalik: true },
    burung: { ikon: '🐦', nama: 'Burung', svg:
      '<path d="M9 27 L1 22 L3 30 L1 37 L10 32 Z" fill="#2f7fd8" stroke="#163f6e" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<ellipse cx="26" cy="29" rx="17" ry="13" fill="#4aa3ff" stroke="#163f6e" stroke-width="2"/>' +
      '<ellipse cx="27" cy="34" rx="10" ry="6.5" fill="#dff0ff"/>' +
      '<path d="M41 24 L51 27 L41 30 Z" fill="#ffb02e" stroke="#9a5b00" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<circle cx="36" cy="23" r="3.2" fill="#fff"/><circle cx="37" cy="23.3" r="2" fill="#1d1d1d"/><circle cx="37.6" cy="22.6" r=".6" fill="#fff"/>' +
      '<circle cx="38.5" cy="29.5" r="1.7" fill="#ff8a8a" fill-opacity=".7"/>' +
      '<path class="wingB" d="M24 26 C18 10 8 12 10 20 C12 27 19 29 26 29 Z" fill="#2f7fd8" stroke="#163f6e" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M22 16 Q25 10 28 13" fill="none" stroke="#163f6e" stroke-width="1.6" stroke-linecap="round"/>' },
    ikan: { ikon: '🐟', nama: 'Ikan', svg:
      '<g class="tail"><path d="M13 29 L1 18 Q4 29 1 40 Z" fill="#ff8c3a" stroke="#8a3a00" stroke-width="1.6" stroke-linejoin="round"/></g>' +
      '<path d="M22 17 Q28 8 34 17 Z" fill="#ff8c3a" stroke="#8a3a00" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<ellipse cx="29" cy="29" rx="18" ry="12.5" fill="#ffa64d" stroke="#8a3a00" stroke-width="2"/>' +
      '<path d="M22 18.5 Q18 29 22 39.5" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".6"/><path d="M29 17 Q25 29 29 41.5" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".6"/>' +
      '<path class="fin" d="M28 33 Q24 41 31 40 Z" fill="#ff8c3a" stroke="#8a3a00" stroke-width="1.3"/>' +
      '<circle cx="39" cy="25.5" r="3.6" fill="#fff"/><circle cx="40" cy="25.8" r="2.2" fill="#1d1d1d"/><circle cx="40.7" cy="25" r=".7" fill="#fff"/>' +
      '<path d="M43 32 Q45 33.5 46.5 31.5" fill="none" stroke="#8a3a00" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle class="bub" cx="51" cy="20" r="2" fill="none" stroke="#9fd8ff" stroke-width="1.2"/><circle class="bub b2" cx="53" cy="12" r="1.4" fill="none" stroke="#9fd8ff" stroke-width="1.1"/>' },
    kepik: { ikon: '🐞', nama: 'Kepik', svg:
      '<ellipse class="wing b" cx="20" cy="12" rx="6.5" ry="8.5" fill="#e8f4ff" fill-opacity=".75" stroke="#6b7c8f" stroke-width="1.1"/>' +
      '<ellipse class="wing" cx="27" cy="11" rx="6" ry="8" fill="#fff" fill-opacity=".8" stroke="#6b7c8f" stroke-width="1.1"/>' +
      '<path d="M13 40 L11 45 M22 41 L21 46 M31 41 L32 46" stroke="#1d1d1d" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="44" cy="32" r="7.5" fill="#1d1d1d"/>' +
      '<path d="M4 39 C4 22 15 15 25 15 C35 15 44 22 44 39 Z" fill="#e8343a" stroke="#4a0d10" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M24.5 15.5 L24.5 39" stroke="#4a0d10" stroke-width="1.6"/>' +
      '<path d="M10 24 Q16 18 22 18" fill="none" stroke="#fff" stroke-width="2.2" stroke-opacity=".45" stroke-linecap="round"/>' +
      '<circle cx="14" cy="30" r="3.2" fill="#1d1d1d"/><circle cx="19" cy="22.5" r="2.4" fill="#1d1d1d"/><circle cx="31" cy="22.5" r="2.4" fill="#1d1d1d"/><circle cx="35" cy="31" r="3.2" fill="#1d1d1d"/><circle cx="24.5" cy="34" r="2.2" fill="#1d1d1d"/>' +
      '<circle cx="47.5" cy="30" r="2.4" fill="#fff"/><circle cx="48.1" cy="30.3" r="1.3" fill="#1d1d1d"/>' +
      '<path d="M46 25 Q47 19 51 17" fill="none" stroke="#1d1d1d" stroke-width="1.5" stroke-linecap="round"/><circle cx="51.5" cy="16.6" r="1.6" fill="#1d1d1d"/>' },
    peri: { ikon: '🧚', nama: 'Peri Kecil', jejak: true, w: 88, h: 88, ekorX: 0.12, ekorY: 0.6, // gambar peri dari lampiran (sayap dipisah supaya bisa mengepak); meninggalkan percikan kristal
      html: '<img class="periW" alt="" src="data:image/webp;base64,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">' +
        '<img class="periB" alt="" src="data:image/webp;base64,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">' +
        '<span class="periS"></span>' }
  };
  var URUT = ['peri', 'lebah', 'kupu', 'burung', 'ikan', 'kepik'];
  var pilih = 'lebah'; try { pilih = localStorage.getItem(KEY) || 'lebah'; } catch (e) {}
  if (pilih === 'on') pilih = 'lebah'; // pengaturan versi sebelumnya
  if (pilih !== 'off' && !A[pilih]) pilih = 'lebah';

  var css = document.createElement('style');
  css.textContent =
    '#bee{position:fixed;left:0;top:0;width:54px;height:46px;z-index:2147483000;pointer-events:none;will-change:transform;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));transition:opacity .3s}' +
    '#bee.hide{opacity:0}#bee .flip{transform-origin:50% 50%;transition:transform .18s}' +
    '#bee .bob{animation:hwBob 1.1s ease-in-out infinite}' +
    '#bee .wing{transform-origin:28px 18px;animation:hwWing .09s ease-in-out infinite alternate}#bee .wing.b{animation-delay:.045s}' +
    '#bee .wingL{transform-origin:28px 26px;animation:hwKupuL .32s ease-in-out infinite alternate}' +
    '#bee .wingR{transform-origin:28px 26px;animation:hwKupuR .32s ease-in-out infinite alternate}' +
    '#bee .wingB{transform-origin:25px 28px;animation:hwBurung .22s ease-in-out infinite alternate}' +
    '#bee .tail{transform-origin:13px 29px;animation:hwEkor .35s ease-in-out infinite alternate}#bee .fin{transform-origin:29px 34px;animation:hwEkor .5s ease-in-out infinite alternate}' +
    '#bee .wingP{transform-origin:23px 24px;animation:hwPeri .16s ease-in-out infinite alternate}#bee .twk{transform-origin:46.5px 9.5px;animation:hwTwk 1s ease-in-out infinite}' +
    '@keyframes hwPeri{from{transform:scaleX(1) rotate(0)}to{transform:scaleX(.45) rotate(-8deg)}}@keyframes hwTwk{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.25) rotate(20deg)}}' +
    '#bee .periW,#bee .periB{position:absolute;inset:0;width:100%;height:100%;-webkit-user-drag:none}' +
    '#bee .periW{transform-origin:51% 34%;animation:hwPeriW .2s ease-in-out infinite alternate}' +
    '#bee .periS{position:absolute;left:90%;top:26.5%;width:22%;height:22%;margin:-11% 0 0 -11%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,230,.95) 0,rgba(255,226,120,.55) 35%,rgba(255,200,80,0) 70%);animation:hwTwk 1.1s ease-in-out infinite}' +
    '@keyframes hwPeriW{from{transform:scaleX(1) skewY(0)}to{transform:scaleX(.8) skewY(-5deg)}}' +
    '#beeTrail{position:fixed;inset:0;z-index:2147482999;pointer-events:none;overflow:hidden}' +
    '#beeTrail i{position:absolute;left:0;top:0;width:8px;height:8px;opacity:0;will-change:transform,opacity}' +
    '#beeTrail i svg{display:block;width:100%;height:100%}' +
    '#bee .bub{animation:hwBub 1.6s ease-in infinite}#bee .bub.b2{animation-delay:.8s}' +
    '@keyframes hwWing{from{transform:rotate(-14deg) scaleY(1)}to{transform:rotate(16deg) scaleY(.55)}}' +
    '@keyframes hwKupuL{from{transform:scaleX(1)}to{transform:scaleX(.25)}}@keyframes hwKupuR{from{transform:scaleX(1)}to{transform:scaleX(.25)}}' +
    '@keyframes hwBurung{from{transform:rotate(18deg)}to{transform:rotate(-38deg)}}' +
    '@keyframes hwEkor{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}' +
    '@keyframes hwBub{0%{opacity:0;transform:translateY(6px)}30%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}' +
    '@keyframes hwBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
    '#beeBtn{position:fixed;left:10px;bottom:10px;z-index:2147483001;width:34px;height:34px;border-radius:50%;border:1px solid rgba(127,127,127,.35);background:rgba(20,20,20,.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-size:17px;line-height:32px;text-align:center;cursor:pointer;padding:0;opacity:.75}' +
    '#beeBtn:hover{opacity:1}#beeBtn.off{filter:grayscale(1);opacity:.45}' +
    '#beeMenu{position:fixed;left:10px;bottom:50px;z-index:2147483002;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:12px;background:rgba(20,24,30,.92);border:1px solid rgba(127,127,127,.35);box-shadow:0 8px 24px rgba(0,0,0,.35);font:13px/1.2 system-ui,sans-serif}' +
    '#beeMenu button{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0;border-radius:8px;background:none;color:#eee;cursor:pointer;text-align:left;font:inherit}' +
    '#beeMenu button:hover,#beeMenu button.on{background:rgba(255,255,255,.12)}#beeMenu button span{font-size:17px;width:22px;text-align:center}' +
    '@media print{#bee,#beeTrail,#beeBtn,#beeMenu{display:none!important}}';
  document.head.appendChild(css);

  var bee = document.createElement('div'); bee.id = 'bee'; bee.setAttribute('aria-hidden', 'true');
  var flip = null, tanpaBalik = false, jejak = false, BW = 54, BH = 46, EX = 0.22, EY = 0.55;
  function gambar() {
    var h = A[pilih] || A.lebah; tanpaBalik = !!h.tanpaBalik; jejak = !!h.jejak;
    BW = h.w || 54; BH = h.h || 46; EX = h.ekorX == null ? 0.22 : h.ekorX; EY = h.ekorY == null ? 0.55 : h.ekorY;
    bee.style.width = BW + 'px'; bee.style.height = BH + 'px';
    bee.innerHTML = h.html ? '<div class="flip" style="position:absolute;inset:0"><div class="bob" style="position:absolute;inset:0">' + h.html + '</div></div>'
      : '<svg viewBox="0 0 56 48" width="54" height="46"><g class="flip"><g class="bob">' + h.svg + '</g></g></svg>';
    flip = bee.querySelector('.flip');
  }

  var btn = document.createElement('button'); btn.id = 'beeBtn'; btn.type = 'button';
  function setBtn() { var off = pilih === 'off'; btn.className = off ? 'off' : ''; btn.textContent = off ? '🐝' : A[pilih].ikon; btn.title = 'Pilih hewan'; btn.setAttribute('aria-label', 'Pilih hewan yang mengikuti kursor'); }
  var menu = null;
  function tutupMenu() { if (menu) { menu.remove(); menu = null; } }
  btn.onclick = function (e) {
    e.stopPropagation(); if (menu) return tutupMenu();
    menu = document.createElement('div'); menu.id = 'beeMenu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = URUT.map(function (k) { return '<button type="button" role="menuitem" data-k="' + k + '" class="' + (k === pilih ? 'on' : '') + '"><span>' + A[k].ikon + '</span>' + A[k].nama + '</button>'; }).join('') +
      '<button type="button" role="menuitem" data-k="off" class="' + (pilih === 'off' ? 'on' : '') + '"><span>✕</span>Matikan</button>';
    menu.onclick = function (ev) { var b = ev.target.closest('button'); if (!b) return; ev.stopPropagation(); setPilih(b.getAttribute('data-k')); tutupMenu(); };
    document.body.appendChild(menu);
  };
  document.addEventListener('click', tutupMenu);
  function setPilih(k) {
    pilih = k; try { localStorage.setItem(KEY, k); } catch (e) {}
    setBtn(); bee.classList.toggle('hide', k === 'off');
    if (k !== 'off') { gambar(); idleAt = performance.now(); loop(); }
    if (!jejak || k === 'off') butir.forEach(function (b) { b.hidup = 0; b.el.style.opacity = 0; }); // ganti hewan: bersihkan percikan
  }

  // ---------- percikan kristal di belakang peri (maks. 36 butir, dipakai ulang supaya ringan) ----------
  var trail = document.createElement('div'); trail.id = 'beeTrail'; trail.setAttribute('aria-hidden', 'true');
  var WARNA = ['#9ff0ff', '#ffffff', '#ffb8f2', '#ffe680', '#b9a8ff', '#7fe3ff'], butir = [], bi = 0, sisaJejak = 0;
  var KRISTAL = ['<svg viewBox="0 0 10 10"><path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="C"/></svg>', // bintang 4 sudut
    '<svg viewBox="0 0 10 10"><path d="M5 0 L9 5 L5 10 L1 5 Z" fill="C" fill-opacity=".9"/><path d="M5 0 L5 10" stroke="#fff" stroke-width=".8" stroke-opacity=".8"/></svg>', // berlian
    '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="C"/></svg>'];
  for (var n = 0; n < 36; n++) { var el = document.createElement('i'); trail.appendChild(el); butir.push({ el: el, hidup: 0 }); }
  function percik(px, py) {
    var b = butir[bi = (bi + 1) % butir.length], w = WARNA[(Math.random() * WARNA.length) | 0], sz = 5 + Math.random() * 8;
    b.el.innerHTML = KRISTAL[(Math.random() * 3) | 0].replace('C', w);
    b.el.style.width = b.el.style.height = sz.toFixed(1) + 'px'; b.el.style.filter = 'drop-shadow(0 0 3px ' + w + ')';
    b.x = px + (Math.random() - .5) * 10; b.y = py + (Math.random() - .5) * 10; b.vx = (Math.random() - .5) * 0.8 - vx * 0.12; b.vy = Math.random() * 0.4 + 0.3;
    b.r = Math.random() * 180; b.vr = (Math.random() - .5) * 8; b.hidup = b.umur = 45 + Math.random() * 30;
  }
  function gerakJejak(dt) {
    var ada = false;
    for (var k = 0; k < butir.length; k++) {
      var b = butir[k]; if (b.hidup <= 0) continue; ada = true;
      b.hidup -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 0.015 * dt; b.r += b.vr * dt;
      var t = Math.max(0, b.hidup / b.umur), kedip = 0.75 + 0.25 * Math.sin(b.hidup * 0.6);
      b.el.style.opacity = (t > 0.85 ? (1 - t) / 0.15 : t * kedip).toFixed(2);
      b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px) rotate(' + b.r.toFixed(0) + 'deg) scale(' + (0.4 + t * 0.8).toFixed(2) + ')';
      if (b.hidup <= 0) b.el.style.opacity = 0;
    }
    return ada;
  }

  var W = innerWidth, H = innerHeight;
  var x = W - 90, y = H - 110, tx = x, ty = y, vx = 0, vy = 0, face = -1, last = performance.now(), idleAt = performance.now(), running = false;
  function aktif() { return pilih !== 'off' && !reduce; }
  function target(px, py) { tx = px + 26; ty = py + 18; idleAt = performance.now(); if (!running && aktif()) loop(); } // hewan berada sedikit di samping kursor, tidak menutupinya
  addEventListener('mousemove', function (e) { target(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) target(t.clientX - 26, t.clientY - 70); }, { passive: true });
  addEventListener('resize', function () { W = innerWidth; H = innerHeight; }, { passive: true });

  function loop() {
    if (running || !aktif()) return; running = true;
    requestAnimationFrame(function step(now) {
      var dt = Math.min(48, now - last) / 16.67; last = now;
      var idle = now - idleAt > 1400, ax = tx, ay = ty;
      if (idle) { ax = tx + Math.sin(now / 700) * 16; ay = ty + Math.cos(now / 520) * 9; } // melayang-layang saat kursor diam
      vx += (ax - x) * 0.012 * dt; vy += (ay - y) * 0.012 * dt; // gerak pegas: mengejar sasaran dengan perlambatan
      vx *= Math.pow(0.86, dt); vy *= Math.pow(0.86, dt);
      x += vx * dt; y += vy * dt;
      x = Math.max(4, Math.min(W - BW - 4, x)); y = Math.max(4, Math.min(H - BH - 4, y));
      if (Math.abs(vx) > 0.4) face = vx > 0 ? 1 : -1; // hadap ke arah gerak
      var tilt = tanpaBalik ? Math.max(-25, Math.min(25, vx * 2)) : Math.max(-22, Math.min(22, vy * 2.2)) * face;
      bee.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
      if (flip) flip.style.transform = !tanpaBalik && face < 0 ? 'scaleX(-1)' : 'none';
      var diam = idle && now - idleAt > 12000, masihPercik = false; // 12 detik tanpa gerak: hentikan animasi untuk hemat baterai
      if (jejak) { // percikan muncul dari belakang peri: makin cepat terbang, makin banyak
        if (!diam) { var laju = Math.sqrt(vx * vx + vy * vy); sisaJejak += (idle ? 0.06 : 0.12 + laju * 0.09) * dt; }
        while (sisaJejak >= 1) { sisaJejak -= 1; percik(x + BW * (face > 0 ? EX : 1 - EX), y + BH * EY); } // dari belakang (ujung gaun/badan)
        masihPercik = gerakJejak(dt);
      }
      if (aktif() && (!diam || masihPercik) && !document.hidden) requestAnimationFrame(step); else running = false;
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = performance.now(); loop(); } });

  function start() {
    gambar(); document.body.appendChild(trail); document.body.appendChild(bee); document.body.appendChild(btn); setBtn();
    if (reduce) { bee.classList.add('hide'); btn.style.display = 'none'; return; } // animasi dimatikan di pengaturan sistem: hewan tidak ditampilkan
    bee.classList.toggle('hide', pilih === 'off');
    bee.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    loop();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
