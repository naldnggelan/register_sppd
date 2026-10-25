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
      '<path d="M46 25 Q47 19 51 17" fill="none" stroke="#1d1d1d" stroke-width="1.5" stroke-linecap="round"/><circle cx="51.5" cy="16.6" r="1.6" fill="#1d1d1d"/>' }
  };
  var URUT = ['lebah', 'kupu', 'burung', 'ikan', 'kepik'];
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
    '@media print{#bee,#beeBtn,#beeMenu{display:none!important}}';
  document.head.appendChild(css);

  var bee = document.createElement('div'); bee.id = 'bee'; bee.setAttribute('aria-hidden', 'true');
  var flip = null, tanpaBalik = false;
  function gambar() {
    var h = A[pilih] || A.lebah; tanpaBalik = !!h.tanpaBalik;
    bee.innerHTML = '<svg viewBox="0 0 56 48" width="54" height="46"><g class="flip"><g class="bob">' + h.svg + '</g></g></svg>';
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
      x = Math.max(4, Math.min(W - 58, x)); y = Math.max(4, Math.min(H - 50, y));
      if (Math.abs(vx) > 0.4) face = vx > 0 ? 1 : -1; // hadap ke arah gerak
      var tilt = tanpaBalik ? Math.max(-25, Math.min(25, vx * 2)) : Math.max(-22, Math.min(22, vy * 2.2)) * face;
      bee.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
      if (flip) flip.style.transform = !tanpaBalik && face < 0 ? 'scaleX(-1)' : 'none';
      var diam = idle && now - idleAt > 12000; // 12 detik tanpa gerak: hentikan animasi untuk hemat baterai
      if (aktif() && !diam && !document.hidden) requestAnimationFrame(step); else running = false;
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = performance.now(); loop(); } });

  function start() {
    gambar(); document.body.appendChild(bee); document.body.appendChild(btn); setBtn();
    if (reduce) { bee.classList.add('hide'); btn.style.display = 'none'; return; } // animasi dimatikan di pengaturan sistem: hewan tidak ditampilkan
    bee.classList.toggle('hide', pilih === 'off');
    bee.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    loop();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
