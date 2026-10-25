/* =====================================================================
 * Lebah Lucu Mengikuti Kursor - REGISTER SPPD
 * File tambahan yang berdiri sendiri: tidak mengubah app.js / style.css.
 * Untuk menghapus fitur ini cukup hapus baris <script src="bee.js"> di index.html.
 * - Komputer: lebah terbang mengikuti arah kursor (dengan sedikit jeda, seperti terbang sungguhan).
 * - HP/tablet: lebah terbang ke titik yang disentuh.
 * - Diam sebentar: lebah melayang naik-turun di dekat kursor.
 * - Tidak menghalangi klik (pointer-events: none). Tombol kecil 🐝 di pojok kiri bawah untuk menyalakan/mematikan.
 * ===================================================================== */
(function () {
  'use strict';
  if (window.__beeLoaded) return; window.__beeLoaded = true;
  var KEY = 'sppd_bee', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = true; try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

  var css = document.createElement('style');
  css.textContent =
    '#bee{position:fixed;left:0;top:0;width:54px;height:46px;z-index:2147483000;pointer-events:none;will-change:transform;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));transition:opacity .3s}' +
    '#bee.hide{opacity:0}' +
    '#bee .flip{transform-origin:50% 50%;transition:transform .18s}' +
    '#bee .wing{transform-origin:28px 18px;animation:beeWing .09s ease-in-out infinite alternate}' +
    '#bee .wing.b{animation-delay:.045s}' +
    '#bee .bob{animation:beeBob 1.1s ease-in-out infinite}' +
    '@keyframes beeWing{from{transform:rotate(-14deg) scaleY(1)}to{transform:rotate(16deg) scaleY(.55)}}' +
    '@keyframes beeBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
    '#beeBtn{position:fixed;left:10px;bottom:10px;z-index:2147483001;width:34px;height:34px;border-radius:50%;border:1px solid rgba(127,127,127,.35);background:rgba(20,20,20,.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-size:17px;line-height:32px;text-align:center;cursor:pointer;padding:0;opacity:.75}' +
    '#beeBtn:hover{opacity:1}#beeBtn.off{filter:grayscale(1);opacity:.45}' +
    '@media print{#bee,#beeBtn{display:none!important}}';
  document.head.appendChild(css);

  // gambar lebah (SVG buatan sendiri): badan kuning bergaris, sayap transparan, mata, sengat, antena
  var bee = document.createElement('div'); bee.id = 'bee'; bee.setAttribute('aria-hidden', 'true');
  bee.innerHTML =
    '<svg viewBox="0 0 56 48" width="54" height="46"><g class="flip"><g class="bob">' +
    '<ellipse class="wing b" cx="24" cy="12" rx="9" ry="11" fill="#e8f4ff" fill-opacity=".85" stroke="#6b7c8f" stroke-width="1.2"/>' +
    '<ellipse class="wing" cx="31" cy="11" rx="8" ry="10.5" fill="#ffffff" fill-opacity=".9" stroke="#6b7c8f" stroke-width="1.2"/>' +
    '<path d="M6 30 L1 31.5 L6 33" fill="#3a2a14"/>' +
    '<ellipse cx="25" cy="31" rx="19" ry="13" fill="#ffc928" stroke="#3a2a14" stroke-width="2"/>' +
    '<path d="M15 19.6 Q12 31 15 42.4 L20.5 43.9 Q17.5 31 20.5 18.2 Z" fill="#3a2a14"/>' +
    '<path d="M26 18 Q23 31 26 44 L31.5 43.5 Q28.5 31 31.5 18.5 Z" fill="#3a2a14"/>' +
    '<circle cx="42" cy="27" r="9.5" fill="#ffc928" stroke="#3a2a14" stroke-width="2"/>' +
    '<circle cx="45" cy="25" r="3.1" fill="#fff"/><circle cx="45.8" cy="25.3" r="1.9" fill="#1d1d1d"/><circle cx="46.4" cy="24.6" r=".6" fill="#fff"/>' +
    '<path d="M41.5 31.5 Q44.5 33.5 47.5 31.2" fill="none" stroke="#3a2a14" stroke-width="1.4" stroke-linecap="round"/>' +
    '<circle cx="48.5" cy="29.5" r="1.6" fill="#ff8a8a" fill-opacity=".7"/>' +
    '<path d="M41 18.5 Q40 12 36.5 9.5" fill="none" stroke="#3a2a14" stroke-width="1.6" stroke-linecap="round"/><circle cx="36" cy="9" r="1.8" fill="#3a2a14"/>' +
    '<path d="M45 18.5 Q47 12.5 50.5 10.5" fill="none" stroke="#3a2a14" stroke-width="1.6" stroke-linecap="round"/><circle cx="51" cy="10" r="1.8" fill="#3a2a14"/>' +
    '</g></g></svg>';
  var flip = null;

  var btn = document.createElement('button'); btn.id = 'beeBtn'; btn.type = 'button';
  function setBtn() { btn.className = on ? '' : 'off'; btn.title = on ? 'Matikan lebah' : 'Nyalakan lebah'; btn.setAttribute('aria-label', btn.title); btn.textContent = '🐝'; }
  btn.onclick = function () { on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} setBtn(); bee.classList.toggle('hide', !on); if (on) loop(); };

  var W = innerWidth, H = innerHeight;
  var x = W - 90, y = H - 110, tx = x, ty = y, vx = 0, vy = 0, face = -1, last = performance.now(), idleAt = performance.now(), running = false;
  function target(px, py) { tx = px + 26; ty = py + 18; idleAt = performance.now(); if (!running && on) loop(); } // lebah terbang sedikit di samping kursor, tidak menutupinya
  addEventListener('mousemove', function (e) { target(e.clientX, e.clientY); }, { passive: true });
  addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) target(t.clientX - 26, t.clientY - 70); }, { passive: true });
  addEventListener('resize', function () { W = innerWidth; H = innerHeight; }, { passive: true });

  function loop() {
    if (running) return; running = true;
    requestAnimationFrame(function step(now) {
      var dt = Math.min(48, now - last) / 16.67; last = now;
      var idle = now - idleAt > 1400, ax = tx, ay = ty;
      if (idle) { ax = tx + Math.sin(now / 700) * 16; ay = ty + Math.cos(now / 520) * 9; } // melayang-layang saat kursor diam
      // gerak pegas: mengejar sasaran dengan perlambatan, terasa seperti terbang
      vx += (ax - x) * 0.012 * dt; vy += (ay - y) * 0.012 * dt;
      vx *= Math.pow(0.86, dt); vy *= Math.pow(0.86, dt);
      x += vx * dt; y += vy * dt;
      x = Math.max(4, Math.min(W - 58, x)); y = Math.max(4, Math.min(H - 50, y));
      if (Math.abs(vx) > 0.4) face = vx > 0 ? 1 : -1; // hadap ke arah terbang (gambar asli menghadap kanan)
      var tilt = Math.max(-22, Math.min(22, vy * 2.2)) * face;
      bee.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
      if (!flip) flip = bee.querySelector('.flip');
      if (flip) flip.style.transform = face < 0 ? 'scaleX(-1)' : 'none';
      var diam = idle && now - idleAt > 12000; // 12 detik tanpa gerak: hentikan animasi untuk hemat baterai (lanjut lagi saat kursor bergerak)
      if (on && !diam && !document.hidden) requestAnimationFrame(step); else running = false;
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && on) { last = performance.now(); loop(); } });

  function start() {
    document.body.appendChild(bee); document.body.appendChild(btn); setBtn();
    if (reduce) { bee.classList.add('hide'); btn.style.display = 'none'; return; } // pengguna yang mematikan animasi di sistem: lebah tidak ditampilkan
    bee.classList.toggle('hide', !on);
    bee.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (on) loop();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
