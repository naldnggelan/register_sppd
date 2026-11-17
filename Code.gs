/** REGISTER SPPD - Backend (Code.gs). Jalankan setupDatabase() sekali. Login awal: admin / admin123 (SEGERA GANTI) */
const COLS = {
  DATA_SPPD: ['ID','TglST','NoST','NoSPPD','Nama','Pangkat','NIP','Jabatan','Maksud','Tujuan','Lama','Bidang','Berangkat','Kembali','Dibuat','Diubah','SubKegiatan','JenisPerjalanan'],
  PEGAWAI: ['Nama','Pangkat','NIP','Jabatan','Aktif','TingkatBiaya'],
  USERS: ['Username','Hash','Role','Nama','Aktif','Foto','Bidang'],
  PENGATURAN: ['Kunci','Nilai']
};
const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TZ = 'Asia/Makassar';
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); } // tanggal hari ini (zona waktu server), format yyyy-MM-dd

function doGet(e) {
  if (e && e.parameter && e.parameter.w) { try { return json_({ success: true, data: warm_('web') }); } catch (er) { return json_({ success: true, data: 'skip' }); } } // pemanasan dari browser (halaman login) - tidak mengembalikan data
  return json_({success:false, message:'Gunakan POST untuk semua permintaan.'});
}

function doPost(e) {
  const t0_ = Date.now(); // waktu kerja server, dikirim balik sebagai "ms" (untuk memantau kecepatan, tidak dipakai tampilan)
  try {
    const body = JSON.parse(e.postData.contents);
    const fn = body.fn;
    const args = body.args || [];

    const ALLOWED = {
      // Login & sesi
      login, logout, publicInfo,
      // Dashboard & Surat Tugas/SPPD
      boot, saveST, updST, delST, rapikanNomor, preview, pdf, previewST, pdfST, previewSP, pdfSP, previewSPB, pdfSPB, xlsSPB, lapXlsx, ttdbInfo, ttdbSave, exportDoc,
      // Rekap & Laporan Perjalanan Dinas
      logList, lapPreview, lapPdf, saveLap, exportRekapXlsx, exportRiwayatXlsx,
      // Kwitansi
      kwiPreview, kwiPdf, kwiPdfBulan, saveKwi, kwiXlsx,
      // DPA Perjalanan Dinas
      dpaGet, getDpa, saveDpaSub, exportDpaXlsx,
      // Pengajuan Pencairan Perjalanan Dinas
      pencairanEligible, pengajuanAjukan, pengajuanList, pengajuanRincian, pengajuanProses,
      // Buku Kas Umum (BKU)
      bkuList, bkuPreview, bkuPdf, exportBkuXlsx, exportRegisterXlsx, arsipInfo, arsipkanTahun,
      // RRPD (Rincian Rencana Penggunaan Dana)
      rrpdList, rrpdGenerate, rrpdSaveJabatan, rrpdPreview, rrpdPdf,
      // Data Master Pegawai
      pegawaiList, savePegawai, editPegawai, setPegawaiAktif,
      // Manajemen Pengguna
      addUser, resetPass,
      // Surat Tugas sebagai Excel (pegawai dibagi per halaman)
      stXlsx,
      // Pengaturan Pejabat Penandatangan & Cetak
      getCfg, saveCfg, saveTtd, delTtd, dasarGet, saveCap, delCap, saveTtdCap, delTtdCap,
      // Admin
      resetData, logClear, setMaintenance, setMaintPesan,
      // Ajukan Pencairan lewat WhatsApp
      waInfo, saveWa,
      // Pemberitahuan Surat Tugas baru dari Admin Bidang (dashboard Super Admin)
      notifST, notifBaca,
      // Control Panel > Warna Tampilan (Super Admin)
      saveTampilan, savePartikel, saveHewan, saveAnimHp, aksesSave,
      // Backup otomatis harian (Super Admin)
      backupInfo, backupSekarang, backupAtur,
      // Surat Tugas & SPPD Khusus Pimpinan (Kepala Satuan, kop Sekretariat Daerah, penanda tangan Asisten)
      pimList, pimSave, pimDel, pimPreviewST, pimPreviewSP, pimPreviewSPB, pimXlsx, pimPdfST, pimPdfSP, pimCfgGet, pimCfgSave
    };

    if (fn === 'batch') { // gabungan beberapa aksi BACA dalam 1 eksekusi (maks. 10) - izin tetap dicek per aksi
      const calls = Array.isArray(args[0]) ? args[0].slice(0, 10) : [];
      const out = calls.map(c => {
        const f = c && c[0], a = (c && c[1]) || [];
        if (!BATCH_OK_.includes(f) || !ALLOWED[f]) return { success: false, message: 'Aksi tidak dikenal: ' + f };
        try { return { success: true, data: ALLOWED[f].apply(null, a) }; } catch (er) { return { success: false, message: er.message }; }
      });
      return json_({ success: true, data: out, ms: Date.now() - t0_, v: APP_VER_ });
    }
    if (!ALLOWED[fn]) return json_({success:false, message:'Aksi tidak dikenal: '+fn});
    const result = ALLOWED[fn].apply(null, args);
    return json_({success:true, data:result, ms: Date.now() - t0_, v: APP_VER_});
  } catch (err) {
    return json_({success:false, message:err.message, ms: Date.now() - t0_});
  }
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(COLS).forEach(n => {
    const s = ss.getSheetByName(n) || ss.insertSheet(n);
    if (s.getLastRow() === 0) { s.appendRow(COLS[n]); s.setFrozenRows(1); }
    const hd = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; // tambah kolom baru bila belum ada
    COLS[n].forEach(k => { if (!hd.includes(k)) s.getRange(1, s.getLastColumn() + 1).setValue(k); });
  });
  [2,3,4,7,13,14].forEach(c => sh_('DATA_SPPD').getRange(1, c, 2000, 1).setNumberFormat('@'));
  sh_('PEGAWAI').getRange(1, 3, 500, 1).setNumberFormat('@');
  sh_('USERS').getRange(1, 1, 500, 1).setNumberFormat('@');
  const P = PropertiesService.getScriptProperties();
  if (!P.getProperty('SALT')) P.setProperty('SALT', Utilities.getUuid());
  const cfg = [['KODE','094'],['KANTOR','Kantor SATPOL PP & Kebakaran'],['KOTA','Bajawa'],['TTD_JABATAN','SEKRETARIS'],
    ['TTD_NAMA','JOSEPH WEGO LEDE, SE.MSA'],['TTD_PANGKAT','PEMBINA TK. I-IV /b'],['TTD_NIP','197108272000031010'],
    ['BIAYA','F'],['ANGKUT','Kendaraan Roda Empat'],['LOGO_LOGIN',''],['LOGO_DOKUMEN',''],['LOGO_DASHBOARD',''],['BG_DASHBOARD',''],['WARNA_UTAMA','#06B6D4'],['FOOTER','© 2027 Created App. By. Nald Ngg'],
    ['SYNC_DETIK','60'],['LOGIN_BADGE',''],['LOGIN_JUDUL','REGISTER SPPD'],['LOGIN_SUBJUDUL','Penomoran & Registrasi Surat Tugas / SPPD'],['LOGIN_LABEL_USER','Username / NIP'],['LOGIN_LABEL_PASS','Kata Sandi'],
    ['LOGIN_TOMBOL','Masuk ke Sistem'],['LOGIN_POSISI','Tengah'],['LOGIN_UKURAN_LOGO','84'],['LOGIN_BG','']];
  const c = sh_('PENGATURAN');
  c.getRange(1, 2, 300, 1).setNumberFormat('@');
  const ada = rows_('PENGATURAN').map(r => r.Kunci);
  cfg.filter(x => !ada.includes(x[0])).forEach(x => c.appendRow(x)); // aman dijalankan ulang
  const u = sh_('USERS');
  if (u.getLastRow() < 2) u.appendRow(['admin', hash_('admin123'), 'Super Admin', 'Administrator', 'Ya', '']);
  const us = rows_('USERS'); // akun Admin lama dinaikkan menjadi Super Admin bila belum ada Super Admin
  if (!us.some(x => x.Role === 'Super Admin')) { const a = us.find(x => x.Role === 'Admin'); if (a) u.getRange(a._r, 3).setValue('Super Admin'); }
  ['Trantibum', 'Sekretariat', 'Linmas', 'Damkar'].forEach(b => { // 4 Admin bidang (kata sandi awal: ganti123 - segera ubah via Reset Sandi)
    const un = 'admin.' + b.toLowerCase();
    if (!rows_('USERS').some(x => String(x.Username) === un)) u.appendRow([un, hash_('ganti123'), 'Admin', 'Admin ' + b, 'Ya', '', b]);
  });
  wilRows_();
  const trig = ScriptApp.getProjectTriggers(); // pasang pemantau otomatis: saat DATA_SPPD dikosongkan, nomor register direset
  if (!trig.some(x => x.getHandlerFunction() === 'onDataSppdChange_')) ScriptApp.newTrigger('onDataSppdChange_').forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
}

// ---------- util ----------
function sh_(n) { return SpreadsheetApp.getActive().getSheetByName(n); }
function hash_(p) {
  const salt = PropertiesService.getScriptProperties().getProperty('SALT') || '';
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + p));
}
function rows_(n) {
  const v = sh_(n).getDataRange().getValues(), h = v.shift();
  return v.map((r, i) => {
    const o = { _r: i + 2 };
    h.forEach((k, j) => o[k] = r[j] instanceof Date ? Utilities.formatDate(r[j], TZ, 'yyyy-MM-dd') : r[j]);
    return o;
  }).filter(o => o[h[0]] !== '');
}
// ---------- Cache performa (optimasi kecepatan loading - lihat boot_()) ----------
// Menyimpan hasil baca Sheets sebentar di CacheService supaya buka app/login berikutnya tidak perlu
// membaca ulang semua sheet dari awal. Dipecah (chunk) karena CacheService membatasi 100 KB per nilai.
const CACHE_CHUNK_ = 90000;
function cacheGet_(key) {
  const c = CacheService.getScriptCache(), head = c.get(key);
  if (head == null) return null;
  if (head.indexOf('__chunks:') !== 0) return JSON.parse(head);
  const n = +head.slice(9), keys = [];
  for (let i = 0; i < n; i++) keys.push(key + '#' + i);
  const parts = c.getAll(keys); let s = '';
  for (let i = 0; i < n; i++) { if (parts[keys[i]] == null) return null; s += parts[keys[i]]; }
  return JSON.parse(s);
}
function cachePut_(key, val, ttl) {
  const s = JSON.stringify(val), c = CacheService.getScriptCache();
  try {
    if (s.length <= CACHE_CHUNK_) { c.put(key, s, ttl); return; }
    const n = Math.ceil(s.length / CACHE_CHUNK_);
    if (n > 20) return; // terlalu besar untuk di-cache dengan aman, lewati saja (tetap benar, cuma tidak dipercepat)
    const m = {};
    for (let i = 0; i < n; i++) m[key + '#' + i] = s.substr(i * CACHE_CHUNK_, CACHE_CHUNK_);
    c.putAll(m, ttl); c.put(key, '__chunks:' + n, ttl);
  } catch (e) { /* cache bersifat opsional - kalau gagal, biarkan app tetap jalan tanpa cache */ }
}
function cacheVer_(scope) { // versi berjalan per "kelompok data" - dipakai sebagai bagian dari kunci cache
  const c = CacheService.getScriptCache(), k = 'ver_' + scope;
  let v = c.get(k); if (!v) { v = String(Date.now()); c.put(k, v, 21600); }
  return v;
}
function cacheBump_(scope) { CacheService.getScriptCache().put('ver_' + scope, String(Date.now()), 21600); } // panggil setelah data terkait ditulis/diubah
function hashStr_(s) { s = String(s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }
const DEF = { KWI_KODE_REKENING: '1 05 02 2 01 04 5 1 02 04 01 0001', KWI_PPTK_TRANTIBUM_NAMA: 'ABDUL KARIM DATO, ST, MT', KWI_PPTK_TRANTIBUM_NIP: '197511272000121005',
  KWI_PPTK_SEKRETARIAT_NAMA: '', KWI_PPTK_SEKRETARIAT_NIP: '', KWI_PPTK_LINMAS_NAMA: '', KWI_PPTK_LINMAS_NIP: '', KWI_PPTK_DAMKAR_NAMA: '', KWI_PPTK_DAMKAR_NIP: '', KWI_PPTK_PIMPINAN_NAMA: '', KWI_PPTK_PIMPINAN_NIP: '', AKSES_FITUR: '',
  KWI_KPA_NAMA: 'JOSEPH WEGO LEDE, SE.MSA', KWI_KPA_NIP: '197108272000031010',
  TTD_JABATAN: 'SEKRETARIS', TTD_NAMA: 'JOSEPH WEGO LEDE, SE.MSA', TTD_PANGKAT: 'PEMBINA TK. I-IV /b', TTD_NIP: '197108272000031010',
  KWI_BENDAHARA_NAMA: 'LILIOSA BIDARI DIAN PUTRI, S.A.P', KWI_BENDAHARA_NIP: '199607232022032005', KWI_PREFIX: 'Pembayaran biaya perjalanan dinas,',
  TARIF_LUAR: 170000, TARIF_DALAM: 70000, TARIF_LUARDAERAH: 450000, KERTAS: 'Legal', TTD_LEBAR: 40, FONT: 'Arial Narrow', UKURAN_ST: 12, UKURAN_SP: 11,
  ST_ATAS: 15, ST_BAWAH: 15, ST_KIRI: 20, ST_KANAN: 15, SP_ATAS: 15, SP_BAWAH: 15, SP_KIRI: 20, SP_KANAN: 15 };
let _CFG = null; // cache PENGATURAN untuk satu kali permintaan - dikosongkan di awal auth_()/login()/publicInfo() dan saat ditulis ulang
function cfg_() {
  if (_CFG) return _CFG;
  const o = Object.assign({}, DEF);
  rows_('PENGATURAN').forEach(r => o[r.Kunci] = String(r.Nilai));
  if (/^\d+$/.test(o.KODE) && o.KODE.length < 3) o.KODE = ('000' + o.KODE).slice(-3); // 94 -> 094
  return _CFG = o;
}
function getCfg(t) { auth_(t, 2); const c = cfg_(), o = {}; Object.keys(DEF).forEach(k => o[k] = c[k]); o.TTD = ttdUri_(); o.CAP = capUri_(); o.TTDCAP = ttdCapUri_(); o.CAP_UKURAN = c.CAP_UKURAN || '1.6'; return o; }
function saveCfg(t, f) {
  auth_(t, 2); _CFG = null;
  const s = sh_('PENGATURAN');
  Object.keys(DEF).forEach(k => {
    if (!(k in f)) return;
    const v = k === 'FONT' ? (['Arial Narrow', 'Archivo Narrow', 'Arial'].includes(f[k]) ? f[k] : DEF.FONT) : k === 'KERTAS' ? (PAPER[f[k]] ? f[k] : 'Legal') : /^(KWI_|TTD_(JABATAN|NAMA|PANGKAT|NIP))/.test(k) ? String(f[k]).trim().slice(0, 300) : /^TARIF_/.test(k) ? Math.max(0, Math.min(100000000, Number(f[k]) || 0)) : Math.max(0, Math.min(60, Number(f[k]) || 0));
    const rw = rows_('PENGATURAN').find(r => r.Kunci === k);
    if (rw) s.getRange(rw._r, 2).setValue(v); else s.appendRow([k, v]);
  });
  cacheBump_('data');
}
const RESET_MAKS_GAGAL = 3; // proteksi RESET DATA: kunci/logout paksa setelah 3x sandi salah berturut-turut
function resetData(t, pass) { // khusus Super Admin - kosongkan DATA_SPPD, KWITANSI, LAPORAN, LOG (Log Aktivitas), PENGAJUAN (Pengajuan Pencairan), RRPD_GEN & RRPD_KET (RRPD); nomor Surat Tugas/SPPD kembali dari awal
  const u = auth_(t, 2);
  const ck = CacheService.getScriptCache(), fk = 'RSTF_' + t;
  const gagal = Number(ck.get(fk) || 0);
  const cocok = rows_('USERS').find(x => String(x.Username) === String(u.u) && x.Hash === hash_(pass) && x.Aktif === 'Ya');
  if (!cocok) {
    const g2 = gagal + 1;
    if (g2 >= RESET_MAKS_GAGAL) {
      ck.remove(fk);
      CacheService.getScriptCache().remove(t); // paksa logout - sesi diakhiri demi keamanan
      logAksi_(u, 'Reset Data - gagal 3x', 'Sesi diakhiri paksa demi keamanan.');
      throw new Error('Sandi salah 3 kali. Sesi berakhir, silakan login ulang.');
    }
    ck.put(fk, String(g2), 600);
    logAksi_(u, 'Reset Data - sandi salah', 'Percobaan ke-' + g2 + ' dari ' + RESET_MAKS_GAGAL);
    throw new Error('Sandi salah. Percobaan ke-' + g2 + ' dari ' + RESET_MAKS_GAGAL + '.');
  }
  ck.remove(fk);
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    ['DATA_SPPD', 'KWITANSI', 'LAPORAN', 'LOG', 'PENGAJUAN', 'RRPD_GEN', 'RRPD_KET', 'DASAR_ST', 'ST_KHUSUS'].forEach(n => { // sheet yang belum ada dilewati
      const s = sh_(n);
      if (s && s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, Math.max(1, s.getLastColumn())).clearContent();
    });
    resetNomor_();
    cacheBump_('data');
    logAksi_(u, 'RESET DATA', 'Data SPPD, Kwitansi, Laporan, Log Aktivitas, Pengajuan Pencairan, dan RRPD (RRPD_GEN, RRPD_KET) dikosongkan; nomor Surat Tugas/SPPD direset dari awal.');
    return true;
  } finally { L.releaseLock(); }
}
function addDays_(iso, n) {
  const [y, m, d] = iso.split('-').map(Number), t = new Date(y, m - 1, d + Number(n));
  return Utilities.formatDate(t, TZ, 'yyyy-MM-dd');
}
function idn_(iso) { const [y, m, d] = String(iso).split('-'); return d + ' ' + BLN[+m - 1] + ' ' + y; }
function next_(k) {
  const s = sh_('PENGATURAN'), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === k) { const n = Number(v[i][1]) + 1; s.getRange(i + 1, 2).setValue(n); return n; }
  s.appendRow([k, 1]); return 1;
}
function nextBatch_(k, n) { // ambil n nomor urut berurutan SEKALIGUS - satu kali baca+tulis sheet PENGATURAN, bukan
  // n kali seperti next_() dipanggil berulang. Penting untuk Surat Tugas dengan banyak pegawai: memanggil next_()
  // satu per satu (1x untuk No. ST + 1x per pegawai) bisa memakan waktu lama dan membuat browser timeout lalu
  // mencoba ulang otomatis - yang kalau percobaan pertama ternyata sudah berhasil di server, berakhir sebagai
  // Surat Tugas kembar/dobel nomor. Mengembalikan nomor PERTAMA dari rentang; nomor berikutnya tinggal +1, +2, dst.
  const s = sh_('PENGATURAN'), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === k) { const start = Number(v[i][1]) + 1; s.getRange(i + 1, 2).setValue(start + n - 1); return start; }
  s.appendRow([k, n]); return 1;
}
const LVL = { 'Pegawai': 0, 'Admin': 1, 'Kasubag Keuangan': 1, 'KABID': 1, 'KASI': 1, 'SEKRETARIS': 1, 'Super Admin': 2 };
const BID_SCOPED = ['Admin', 'KABID', 'KASI', 'SEKRETARIS']; // peran yang dibatasi hanya pada satu Bidang miliknya sendiri
function dataKosong_() { return sh_('DATA_SPPD').getLastRow() <= 1; } // hanya baris judul yang tersisa
function resetNomor_() { // kembalikan semua penghitung nomor register (REG_<tahun>) ke 0 - nomor berikutnya mulai dari 1
  const s = sh_('PENGATURAN'), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (/^REG_/.test(v[i][0]) && Number(v[i][1]) !== 0) s.getRange(i + 1, 2).setValue(0);
}
function onDataSppdChange_() { // trigger onChange - dipasang otomatis oleh setupDatabase(), aktif walau aplikasi tidak sedang dibuka
  try { if (dataKosong_()) resetNomor_(); } catch (e) {}
  try { cacheBump_('data'); } catch (e) {} // edit langsung di Spreadsheet -> semua cache data otomatis diperbarui
}
function bid_(u) { // bidang yang boleh diakses: '' = semua (Super Admin / Pegawai / Kasubag Keuangan melihat dashboard)
  if (BID_SCOPED.includes(u.role)) { if (!BIDANG.includes(u.bidang)) throw new Error('Akun ' + u.role + ' belum memiliki Bidang (sheet USERS, kolom Bidang).'); return u.bidang; }
  return '';
}
function own_(u, key) { // Admin bidang hanya boleh mengakses Surat Tugas bidangnya sendiri (cek ringan, tanpa membaca seluruh sheet)
  const b = bid_(u); if (!b) return;
  if (String(key).indexOf('PIM:') === 0) return; // Surat Tugas Pimpinan: semua Admin dapat mengatur Kwitansi & Laporan
  const s = sh_('DATA_SPPD'), hit = s.createTextFinder(key).matchEntireCell(true).findNext();
  if (!hit) return; // data belum/sudah tidak ada: biarkan pemanggil yang melapor "tidak ditemukan"
  const col = COLS.DATA_SPPD.indexOf('Bidang') + 1, bidang = s.getRange(hit.getRow(), col).getValue();
  if (bidang !== b) throw new Error('Data ini bukan milik bidang ' + b + '.');
}
function auth_(t, lvl) {
  _CFG = null; // permintaan baru: pastikan cache tidak bocor dari eksekusi sebelumnya
  const s = CacheService.getScriptCache().get(t);
  if (!s) throw new Error('Sesi berakhir, silakan login ulang.');
  const u = JSON.parse(s);
  CacheService.getScriptCache().put(t, s, 21600); // sesi diperpanjang selama masih dipakai
  if (u.role !== 'Super Admin' && cfg_().MAINTENANCE === '1') throw maintErr_(); // Mode Perbaikan - satu titik ini memblokir SEMUA aksi untuk semua peran selain Super Admin
  if (lvl && (LVL[u.role] || 0) < (lvl === true ? 1 : lvl)) throw new Error(lvl === 2 ? 'Hanya Super Admin yang diizinkan.' : 'Hanya Admin yang diizinkan.');
  return u;
}
const BKU_ROLES = ['Super Admin', 'Kasubag Keuangan']; // peran yang diizinkan mengakses Buku Kas Umum (BKU) - KABID, KASI, SEKRETARIS hanya melihat DPA
const PIMPINAN_ = ['KABID', 'KASI', 'SEKRETARIS']; // hanya Dashboard & DPA
function bidDpa_(u) { return u.role === 'SEKRETARIS' ? '' : bid_(u); } // DPA: SEKRETARIS melihat semua bidang; KABID & KASI hanya bidangnya
function authFin_(t) { // khusus Buku Kas Umum (BKU) - bidang tetap dibatasi lewat bkuIzin_()/bid_()
  const u = auth_(t);
  if (!BKU_ROLES.includes(u.role)) throw new Error('Anda tidak memiliki izin untuk mengakses Buku Kas Umum (BKU).');
  return u;
}

// ---------- Logo ----------
// Isi LOGO_LOGIN / LOGO_DOKUMEN di sheet PENGATURAN dengan ID/link file Drive atau URL gambar. Kosong = logo bawaan.
function logoUri_(key) {
  try {
    const v = String(cfg_()[key] || '').trim();
    if (!v) return LOGO_DEFAULT;
    // kunci cache memuat isi nilai logo itu sendiri - kalau logo diganti di sheet PENGATURAN, otomatis jadi kunci baru (tidak perlu "invalidasi" manual)
    const ck = 'logo_' + key + '_' + hashStr_(v);
    const hit = cacheGet_(ck);
    if (hit) return hit;
    const m = v.match(/\/d\/([\w-]{20,})/) || v.match(/[?&]id=([\w-]{20,})/) || v.match(/^([\w-]{20,})$/);
    const b = m ? DriveApp.getFileById(m[1]).getBlob() : UrlFetchApp.fetch(v).getBlob();
    const uri = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    cachePut_(ck, uri, 21600); // 6 jam (maksimum CacheService) - logo jarang berubah
    return uri;
  } catch (e) { return LOGO_DEFAULT; }
}
function footer_() { return cfg_().FOOTER || '© 2027 Created App. By. Nald Ngg'; }
function look_() { // latar belakang (link Drive/URL) & warna utama
  const c = cfg_(), v = String(c.BG_DASHBOARD || '').trim();
  const m = v.match(/\/d\/([\w-]{20,})/) || v.match(/[?&]id=([\w-]{20,})/) || v.match(/^([\w-]{20,})$/);
  return { bg: m ? 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1920' : (/^https:\/\//.test(v) ? v : ''), warna: c.WARNA_UTAMA || '', tema: [c.TEMA_WARNA_1 || '', c.TEMA_WARNA_2 || '', c.TEMA_WARNA_3 || ''], partikel: String(c.PARTIKEL || ''), hewan: String(c.HEWAN || ''), animHp: String(c.ANIM_HP || '') }; // tema: 3 warna Liquid Glass dari Control Panel > Warna Tampilan (kosong = bawaan)
}
// Tampilan form login: ubah nilai di sheet PENGATURAN (kosong = bawaan, tulis - untuk menyembunyikan teks)
const LOGIN_DEF = { LOGIN_BADGE: '', LOGIN_JUDUL: 'REGISTER SPPD', LOGIN_SUBJUDUL: 'Penomoran & Registrasi Surat Tugas / SPPD', LOGIN_LABEL_USER: 'Username / NIP',
  LOGIN_LABEL_PASS: 'Kata Sandi', LOGIN_TOMBOL: 'Masuk ke Sistem', LOGIN_POSISI: 'Tengah', LOGIN_UKURAN_LOGO: '84' };
function imgUrl_(v, sz) {
  v = String(v || '').trim();
  if (!v) return '';
  const m = v.match(/\/d\/([\w-]{20,})/) || v.match(/[?&]id=([\w-]{20,})/) || v.match(/^([\w-]{20,})$/);
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] + '=' + sz : (/^https:\/\//.test(v) ? v : '');
}
function loginInfo_() {
  const c = cfg_(), g = k => { const v = String(c[k] === undefined ? '' : c[k]).trim(); return v === '-' ? '' : (v || LOGIN_DEF[k]); };
  const pos = g('LOGIN_POSISI');
  return { badge: g('LOGIN_BADGE'), judul: g('LOGIN_JUDUL'), sub: g('LOGIN_SUBJUDUL'), lblUser: g('LOGIN_LABEL_USER'), lblPass: g('LOGIN_LABEL_PASS'),
    tombol: g('LOGIN_TOMBOL') || 'Masuk', posisi: ['Kiri', 'Kanan'].includes(pos) ? pos : 'Tengah',
    logoSize: Math.max(40, Math.min(200, Number(g('LOGIN_UKURAN_LOGO')) || 84)), bg: imgUrl_(c.LOGIN_BG, 'w1920') };
}
function publicInfo() { _CFG = null; return { logo: logoUri_('LOGO_LOGIN'), footer: footer_(), look: look_(), login: loginInfo_() }; }
function logout(t) { CacheService.getScriptCache().remove(t); }
function bentrok_(nips, s, e, ex) { // pegawai yang jadwalnya bertabrakan
  const all = rows_('DATA_SPPD'), out = [];
  nips.forEach(n => {
    const r = all.find(x => String(x.NIP) === String(n) && x.NoST !== ex && x.Berangkat <= e && x.Kembali >= s);
    // sebut Bidang & No. ST yang bentrok - pengecekan ini lintas Bidang (disengaja), sedangkan Rekap Admin dibatasi per Bidangnya sendiri,
    // jadi tanpa keterangan ini pengguna bisa bingung kenapa pegawai dianggap bentrok padahal tidak terlihat di Rekap mereka
    if (r) out.push('Pegawai ' + r.Nama + ' sedang bertugas di Bidang ' + r.Bidang + ' (' + idn_(r.Berangkat) + ' – ' + idn_(r.Kembali) + ', No. ST: ' + r.NoST + ').');
  });
  return out;
}

// ---------- API ----------
const MAINT_MSG = 'Sistem sedang dalam perbaikan oleh Super Admin. Silakan coba lagi nanti.'; // Mode Perbaikan - pesan bawaan bila MAINT_PESAN di PENGATURAN kosong
function maintErr_() { return new Error('[MAINT]' + (String(cfg_().MAINT_PESAN || '').trim() || MAINT_MSG)); } // penanda [MAINT] dipakai frontend untuk mengenali Mode Perbaikan, karena isi pesannya sekarang bisa diubah Super Admin
const LOGIN_MAKS_GAGAL = 5, LOGIN_KUNCI_DETIK = 15 * 60; // proteksi brute-force: kunci sementara setelah 5x gagal berturut-turut, 15 menit
function login(user, pass) {
  _CFG = null;
  const ck = CacheService.getScriptCache(), fk = 'LGN_' + String(user).trim().toLowerCase();
  const gagal = Number(ck.get(fk) || 0);
  if (gagal >= LOGIN_MAKS_GAGAL) throw new Error('Terlalu banyak percobaan gagal. Akun dikunci sementara, coba lagi dalam beberapa menit.');
  const allUsers_ = rows_('USERS'), r = allUsers_.find(x => String(x.Username).toLowerCase() === String(user).trim().toLowerCase() && x.Hash === hash_(pass) && x.Aktif === 'Ya');
  if (!r) {
    ck.put(fk, String(gagal + 1), LOGIN_KUNCI_DETIK);
    logAksi_({ u: user, role: '', nama: user }, 'Login gagal', 'Username dicoba: ' + user + (gagal + 1 >= LOGIN_MAKS_GAGAL ? ' (akun dikunci sementara)' : ''));
    throw new Error('Username atau kata sandi salah.');
  }
  if (r.Role !== 'Super Admin' && cfg_().MAINTENANCE === '1') throw maintErr_(); // Mode Perbaikan - hanya Super Admin yang dapat login
  ck.remove(fk);
  const t = Utilities.getUuid(), u = { u: r.Username, role: r.Role, nama: r.Nama, bidang: r.Bidang || '' };
  CacheService.getScriptCache().put(t, JSON.stringify(u), 21600);
  logAksi_(u, 'Login', '');
  const payload = boot_(u, allUsers_); // langsung sertakan data dashboard dalam respons login - hemat satu kali bolak-balik ke server, dan teruskan data USERS yang sudah dibaca supaya boot_() tidak membacanya ulang
  payload.t = t;
  return payload;
}
// ---------- Log Aktivitas (audit log) ----------
function logSheet_() {
  let s = sh_('LOG');
  if (!s) { s = SpreadsheetApp.getActive().insertSheet('LOG'); s.appendRow(['Waktu', 'Pengguna', 'Peran', 'Aksi', 'Detail']); s.setFrozenRows(1); s.getRange('A:A').setNumberFormat('@'); }
  return s;
}
// ---------- Keamanan: cegah injeksi rumus Spreadsheet ----------
// Isian yang diawali = + - @ akan dibaca Google Sheets sebagai RUMUS (bisa dipakai mengirim isi sheet ke luar).
// Diberi tanda petik ' di depan supaya tersimpan sebagai teks biasa; isinya tetap tampil & terbaca sama. Angka biasa (mis. -5) tidak diubah.
function rumusAman_(v) { return typeof v === 'string' && /^[=+\-@\t\r]/.test(v) && !/^[-+]?\d[\d.,]*$/.test(v) ? "'" + v : v; }
function barisAman_(row) { return row.map(rumusAman_); }
function logAksi_(u, aksi, detail) { // tidak pernah melempar error - pencatatan log tidak boleh menggagalkan aksi utama
  try {
    const nm = (u && (u.nama || u.u)) || '', un = u && u.u ? ' (' + u.u + ')' : '';
    logSheet_().appendRow(barisAman_([Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), nm + un, (u && u.role) || '', aksi, detail || '']));
  } catch (e) {}
}
function logList(t, limit) { // Super Admin saja - daftar aktivitas terbaru lebih dulu
  auth_(t, 2);
  const s = logSheet_(), last = s.getLastRow();
  if (last < 2) return [];
  const n = Math.min(Number(limit) || 300, last - 1), v = s.getRange(last - n + 1, 1, n, 5).getValues();
  return v.map(r => ({ waktu: String(r[0]), pengguna: String(r[1]), peran: String(r[2]), aksi: String(r[3]), detail: String(r[4]) })).reverse();
}
function logClear(t) { // Super Admin saja - kosongkan Log Aktivitas (tidak bisa dibatalkan)
  const u = auth_(t, 2), s = logSheet_(), last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, 5).clearContent();
  logAksi_(u, 'Hapus Log Aktivitas', 'Seluruh riwayat aktivitas sebelumnya dikosongkan.');
}
function setMaintenance(t, on) { // Super Admin saja - saat aktif, semua peran lain diblokir total dari seluruh aksi (lihat auth_() & login()) sampai dinonaktifkan kembali
  const u = auth_(t, 2);
  setCfg_('MAINTENANCE', on ? '1' : '');
  cacheBump_('data');
  logAksi_(u, on ? 'Aktifkan Mode Perbaikan' : 'Nonaktifkan Mode Perbaikan', '');
  return true;
}
function setMaintPesan(t, pesan) { // Super Admin saja - ubah pesan di layar Mode Perbaikan (kosong = kembali ke pesan bawaan)
  const u = auth_(t, 2), p = String(pesan || '').trim().slice(0, 300);
  if (/^[=+\-@]/.test(p)) throw new Error('Pesan tidak boleh diawali karakter = + - @.');
  setCfg_('MAINT_PESAN', p);
  cacheBump_('data');
  logAksi_(u, 'Ubah Pesan Mode Perbaikan', p || '(kembali ke pesan bawaan)');
  return p || MAINT_MSG;
}
// ---------- Ajukan Pencairan lewat WhatsApp (diatur Super Admin, dipakai Admin Bidang di menu Pengajuan Pencairan) ----------
const WA_TPL_DEF = 'Yth. Kasubag Keuangan,\n\nDengan hormat, kami dari Bidang {bidang} mengajukan Pencairan Perjalanan Dinas dengan rincian sebagai berikut:\n\n{rincian}\n\n'
  + 'Jumlah Surat Tugas : {jumlah_st}\nTotal Pengajuan : {jumlah}\nTanggal Pengajuan : {tanggal}\n\nMohon kiranya dapat diperiksa dan disetujui melalui aplikasi REGISTER SPPD.\nTerima kasih.\n\nHormat kami,\n{admin}';
function waCfg_(c) { return { aktif: c.WA_AKTIF === '1', nomor: String(c.WA_NOMOR || '').trim(), template: String(c.WA_TEMPLATE || '').trim() || WA_TPL_DEF }; }
function waInfo(t) { auth_(t, true); return waCfg_(cfg_()); } // dibaca Admin Bidang & Super Admin
function saveWa(t, f) { // Super Admin saja
  const u = auth_(t, 2);
  let no = String(f.nomor || '').replace(/\D/g, '');
  if (/^0/.test(no)) no = '62' + no.slice(1); else if (/^8/.test(no)) no = '62' + no; // 0812... / 812... -> 62812... (format internasional untuk WhatsApp)
  if (f.aktif && !/^\d{10,15}$/.test(no)) throw new Error('Isi Nomor WhatsApp Kasubag Keuangan dengan benar (mis. 081234567890).');
  const tpl = String(f.template || '').trim().slice(0, 2000);
  if (/^[=+\-@]/.test(tpl)) throw new Error('Template tidak boleh diawali karakter = + - @.');
  setCfg_('WA_AKTIF', f.aktif ? '1' : ''); setCfg_('WA_NOMOR', no); setCfg_('WA_TEMPLATE', tpl === WA_TPL_DEF ? '' : tpl);
  logAksi_(u, 'Ubah Pengaturan WhatsApp Pencairan', (f.aktif ? 'Aktif' : 'Nonaktif') + (no ? ', nomor ' + no : ''));
  return waCfg_(cfg_());
}
function avatar_(v) { // foto profil: link/ID Drive (dibagikan "siapa saja dengan link") atau URL gambar
  v = String(v || '').trim();
  if (!v) return '';
  const m = v.match(/\/d\/([\w-]{20,})/) || v.match(/[?&]id=([\w-]{20,})/) || v.match(/^([\w-]{20,})$/);
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] + '=s160' : (/^https:\/\//.test(v) ? v : '');
}
function wilRows_() { // sheet MASTER_WILAYAH (kolom Wilayah) = daftar pilihan Tempat Tujuan
  let s = sh_('MASTER_WILAYAH');
  if (!s) {
    s = SpreadsheetApp.getActive().insertSheet('MASTER_WILAYAH'); s.appendRow(['Wilayah']); s.setFrozenRows(1);
    const w = ['Aimere', 'Bajawa', 'Bajawa Utara', 'Jerebuu', 'Riung', 'Riung Barat', 'Wolomeze', 'Soa', 'Golewa', 'Golewa Barat', 'Golewa Selatan', 'Inerie'].map(x => ['Kecamatan ' + x]);
    s.getRange(2, 1, w.length, 1).setValues(w);
  }
  return rows_('MASTER_WILAYAH').map(x => String(x.Wilayah)).filter(Boolean);
}
function ver_() { // penanda perubahan Spreadsheet (waktu terakhir diubah, termasuk edit manual di sheet)
  const c = CacheService.getScriptCache(), hit = c.get('ver_ss'); if (hit) return hit; // disimpan 10 detik - membaca info file Drive cukup lambat, jadi login/muat data tidak perlu menunggu ini setiap kali
  try { const v = String(DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getLastUpdated().getTime()); c.put('ver_ss', v, 10); return v; } catch (e) { return ''; }
}
function ver(t) { auth_(t); return { v: ver_() }; } // ringan, dipanggil berkala oleh browser
function boot(t, fresh) { return boot_(auth_(t), null, !!fresh); } // fresh = tombol Update Data: baca ulang langsung dari Spreadsheet
function boot_(u, usersRows, fresh) { // usersRows: opsional - lewatkan data sheet USERS yang sudah dibaca (dipakai oleh login()) supaya tidak dibaca ulang dari sheet
  // Cache per pengguna selama 90 detik: login/buka app berikutnya dalam rentang waktu itu tidak perlu
  // membaca ulang 6 sheet dari awal. Otomatis jadi "baru" lagi (kunci berubah) begitu ada data terkait
  // yang ditulis (lihat cacheBump_('data') di fungsi-fungsi simpan/hapus), jadi tidak pernah basi lama.
  const ck_ = 'boot_' + cacheVer_('data') + '_' + u.u;
  const hit_ = fresh ? null : cacheGet_(ck_);
  if (hit_) { hit_.role = u.role; hit_.nama = u.nama; return hit_; }
  const v0 = ver_(); // dibaca sebelum data, supaya perubahan yang terjadi saat memuat tetap terdeteksi
  const lv = LVL[u.role] || 0, bd = bid_(u), B_ = bootBase_(fresh), all = B_.all, bdD = bidDpa_(u), data = bdD ? all.filter(x => x.Bidang === bdD) : all, // SEKRETARIS: data semua bidang (untuk rincian DPA semua bidang) // hanya tahun berjalan & tahun lalu yang dikirim ke HP/browser (data lama tetap aman di sheet)
    keys = new Set(data.map(x => x.NoST)), us = usersRows || B_.users, me = us.find(x => String(x.Username) === String(u.u)) || {};
  const out_ = {
    logo: logoUri_('LOGO_DASHBOARD'), footer: footer_(), look: look_(), akses: aksesMap_(),
    kwi: lv >= 1 ? B_.kw.filter(k => keys.has(k.NoST)) : [], lap: lv >= 1 ? B_.lap.filter(k => keys.has(k.NoST)) : [], bidang: bd, tarif: { luar: Number(cfg_().TARIF_LUAR), dalam: Number(cfg_().TARIF_DALAM), luarDaerah: Number(cfg_().TARIF_LUARDAERAH) },
    ver: v0, sync: Math.max(20, Number(cfg_().SYNC_DETIK) || 60),
    wilayah: B_.wil, foto: avatar_(me.Foto), role: u.role, nama: u.nama,
    jadwal: lv >= 1 ? all.map(x => ({ NIP: String(x.NIP), Nama: x.Nama, NoST: x.NoST, Berangkat: x.Berangkat, Kembali: x.Kembali, Bidang: x.Bidang })) : [], // semua bidang, untuk cek bentrok
    data: data,
    pegawai: B_.peg,
    users: lv >= 2 ? us.map(x => ({ Username: x.Username, Role: x.Role, Nama: x.Nama, Foto: avatar_(x.Foto), Bidang: x.Bidang || '' })) : [],
    maintenance: cfg_().MAINTENANCE === '1',
    maintPesan: lv >= 2 ? (String(cfg_().MAINT_PESAN || '').trim() || MAINT_MSG) : ''
  };
  cachePut_(ck_, out_, 90);
  return out_;
}
function saveST(t, f) {
  const u = auth_(t, true), L = LockService.getScriptLock();
  L.waitLock(20000);
  try {
    f.bidang = bid_(u) || f.bidang; // Admin bidang hanya boleh menerbitkan untuk bidangnya
    const khusus = !!f.khusus; if (khusus && u.role !== 'Super Admin') throw new Error('Terbitkan Khusus hanya untuk Super Admin.');
    if (dataKosong_()) resetNomor_(); // jaga-jaga: data SPPD baru saja dikosongkan tapi trigger belum/tidak sempat berjalan
    if (!f.nips || !f.nips.length) throw new Error('Pilih minimal satu pegawai.');
    if (!wilRows_().includes(f.tujuan)) throw new Error('Pilih Tempat Tujuan dari daftar (sheet MASTER_WILAYAH).');
    if (!f.tgl || !f.berangkat || !f.tujuan || !f.maksud || !f.lama || !f.bidang) throw new Error('Lengkapi semua kolom wajib.');
    const hariIni = today_(); // tanggal yang sudah lalu dikunci: Surat Tugas baru tidak boleh tanggal kemarin atau sebelumnya
    if (f.tgl < hariIni) throw new Error('Tanggal Surat Tugas tidak boleh tanggal yang sudah berlalu.');
    if (f.berangkat < hariIni) throw new Error('Tanggal Berangkat tidak boleh tanggal yang sudah berlalu.');
    const bt = bentrok_(f.nips, f.berangkat, addDays_(f.berangkat, f.lama - 1), null);
    if (bt.length) throw new Error(bt.join(' ') + ' Tidak dapat ditambahkan.');
    const y = f.tgl.slice(0, 4), m = f.tgl.slice(5, 7), k = cfg_().KODE, pg = rows_('PEGAWAI');
    const kemb = addDays_(f.berangkat, f.lama - 1);
    const JENIS_OK = ['Dalam Kota', 'Luar Kota', 'Luar Daerah'];
    const subKeg = String(f.subKegiatan || '').trim().slice(0, 200), jenisPj = JENIS_OK.includes(f.jenisPerjalanan) ? f.jenisPerjalanan : '';
    // Urutkan pegawai sesuai urutan barisnya di Data Master Pegawai (atas ke bawah) - menentukan urutan tercetak & nomor SPPD,
    // TIDAK tergantung urutan klik di form. Pegawai yang entah kenapa tidak ditemukan di PEGAWAI ditaruh paling akhir (jaga-jaga, seharusnya tidak terjadi).
    const nipsUrut = f.nips.map((n, i) => ({ n, i, r: (pg.find(x => String(x.NIP) === String(n)) || {})._r }))
      .sort((a, b) => (a.r ?? 1e9) - (b.r ?? 1e9) || a.i - b.i)
      .map(x => x.n);
    // nomor No. ST + nomor SPPD semua pegawai diambil SEKALIGUS (lihat nextBatch_) - No. ST dapat nomor pertama,
    // lalu tiap pegawai dapat nomor berikutnya berurutan sesuai urutan nipsUrut di atas
    const nomorAwal = nextBatch_('REG_' + y, khusus ? 2 : nipsUrut.length + 1); // Khusus: hanya 2 nomor (Surat Tugas + satu SPPD)
    const noST = k + ' / Pol. PP & Kar / ' + nomorAwal + ' / ' + m + ' / ' + y;
    const out = nipsUrut.map((n, i) => {
      const p = pg.find(x => String(x.NIP) === String(n));
      const no = k + ' / Pol. PP & Kar / ' + (nomorAwal + 1 + (khusus ? 0 : i)) + ' / ' + m + ' / ' + y; // Khusus: semua petugas memakai SPPD yang sama
      return [Utilities.getUuid(), f.tgl, noST, no, p.Nama, p.Pangkat, String(p.NIP), p.Jabatan, f.maksud, f.tujuan, Number(f.lama), f.bidang, f.berangkat, kemb, u.nama + ' ' + new Date().toISOString(), '', subKeg, jenisPj];
    });
    const s = sh_('DATA_SPPD');
    s.getRange(s.getLastRow() + 1, 1, out.length, out[0].length).setValues(out.map(barisAman_));
    cacheBump_('data');
    if (f.dasar) dasarSet_(noST, f.dasar); // Dasar Surat Tugas (opsional)
    if (khusus) khususSet_(noST, true);
    logAksi_(u, khusus ? 'Terbitkan Surat Tugas (Khusus)' : 'Terbitkan Surat Tugas', 'No. ST: ' + noST + ' (' + out.length + ' pegawai' + (khusus ? ', 1 SPPD + Pengikut' : '') + ')');
    return { noST: noST };
  } finally { L.releaseLock(); }
}
function diubah_(u) { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') + ' oleh ' + ((u && (u.nama || u.u)) || ''); }
function updST(t, noST, f) {
  const u = auth_(t, true); own_(u, noST); f.bidang = bid_(u) || f.bidang;
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    let rs = rows_('DATA_SPPD').filter(x => x.NoST === noST);
    if (!rs.length) throw new Error('Data tidak ditemukan.');
    if (rs[0].TglST < today_()) throw new Error('SPT dan SPPD kemarin yang sudah Terbit tidak bisa diedit atau dirubah!!'); // SPT bertanggal lalu terkunci - tidak dapat diedit sama sekali
    f.berangkat = rs[0].Berangkat; // Tanggal Berangkat terkunci - tidak dapat diubah saat mengedit Surat Tugas
    const k = addDays_(f.berangkat, f.lama - 1), s = sh_('DATA_SPPD'), du = diubah_(u);

    // ---- Ubah Petugas (opsional, hanya jika f.nips dikirim) - Nomor Surat Tugas tetap sama, nomor SPPD menyesuaikan ----
    if (Array.isArray(f.nips)) {
      if (!f.nips.length) throw new Error('Surat Tugas harus memiliki minimal satu pegawai.');
      if (pengajuanTerpakai_().has(noST)) throw new Error('Petugas tidak dapat diubah karena Surat Tugas ini sudah termasuk dalam Pengajuan Pencairan.');
      const spK = khususST_(noST) ? rs[0].NoSPPD : ''; // ST Khusus: semua petugas tetap memakai SATU Nomor SPPD yang sama (tidak mengambil nomor baru)
      const curNips = rs.map(r => String(r.NIP)), newNips = f.nips.map(String);
      const toRemove = rs.filter(r => !newNips.includes(String(r.NIP)));
      const toAddNips = newNips.filter(n => !curNips.includes(n));
      const pg = rows_('PEGAWAI'), y = rs[0].TglST.slice(0, 4), m = rs[0].TglST.slice(5, 7), kode = cfg_().KODE;
      if (toRemove.length) {
        // hapus dari baris terbawah dulu supaya nomor baris pegawai lain tidak bergeser saat proses hapus berjalan
        toRemove.slice().sort((a, b) => b._r - a._r).forEach(r => s.deleteRow(r._r));
        logAksi_(u, 'Hapus Petugas dari Surat Tugas', 'No. ST: ' + noST + ' - ' + toRemove.map(r => r.Nama).join(', '));
      }
      if (toAddNips.length) {
        const bt0 = bentrok_(toAddNips, f.berangkat, k, noST);
        if (bt0.length) throw new Error(bt0.join(' ') + ' Tidak dapat ditambahkan.');
        const out = toAddNips.map(n => {
          const p = pg.find(x => String(x.NIP) === n);
          if (!p) throw new Error('Pegawai NIP ' + n + ' tidak ditemukan di Data Master Pegawai.');
          // Nomor SPPD (kolom 4) sementara dikosongkan - diisi berurutan bersama petugas lain di langkah penomoran ulang di bawah
          return [Utilities.getUuid(), rs[0].TglST, noST, '', p.Nama, p.Pangkat, String(p.NIP), p.Jabatan, f.maksud, f.tujuan, Number(f.lama), f.bidang, f.berangkat, k, u.nama + ' ' + new Date().toISOString(), '', rs[0].SubKegiatan, rs[0].JenisPerjalanan];
        });
        s.getRange(s.getLastRow() + 1, 1, out.length, out[0].length).setValues(out.map(barisAman_));
        logAksi_(u, 'Tambah Petugas ke Surat Tugas', 'No. ST: ' + noST + ' - ' + out.map(o => o[4]).join(', '));
      }
      if (toRemove.length || toAddNips.length) {
        // Nomori ulang Nomor SPPD SEMUA petugas yang tersisa di Surat Tugas ini, berurutan sesuai urutan baris di Data
        // Master Pegawai (sama seperti saat Surat Tugas diterbitkan) - supaya Nomor SPPD selalu rapi mengikuti Nomor
        // Urut Petugas, baik untuk petugas lama maupun yang baru ditambahkan. Nomor SPPD lama yang tergantikan tidak
        // pernah dipakai ulang oleh siapapun (next_() sekali ambil, selalu maju).
        rs = rows_('DATA_SPPD').filter(x => x.NoST === noST)
          .sort((a, b) => ((pg.find(x => String(x.NIP) === String(a.NIP)) || {})._r ?? 1e9) - ((pg.find(x => String(x.NIP) === String(b.NIP)) || {})._r ?? 1e9));
        const nomorAwal = spK ? 0 : nextBatch_('REG_' + y, rs.length); // satu kali ambil nomor berurutan untuk semua pegawai sekaligus (lihat nextBatch_); ST Khusus tidak mengambil nomor
        // Susun ulang juga URUTAN BARIS fisik di sheet DATA_SPPD supaya sejalan dengan Nomor SPPD, bukan cuma nilai nomornya -
        // tanpa ini, petugas yang baru ditambahkan selalu nyangkut di baris paling bawah sheet walau nomornya di tengah
        // urutan, jadi membingungkan kalau dilihat langsung di Spreadsheet. Baris lama dihapus semua lalu ditulis ulang
        // sekaligus dalam urutan yang benar (satu kali hapus per baris, satu kali tulis - bukan baca-tulis berulang).
        const newRows = rs.map((row, i) => COLS.DATA_SPPD.map(col => col === 'NoSPPD' ? (spK || (kode + ' / Pol. PP & Kar / ' + (nomorAwal + i) + ' / ' + m + ' / ' + y)) : row[col]));
        rs.slice().sort((a, b) => b._r - a._r).forEach(row => s.deleteRow(row._r));
        s.getRange(s.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows.map(barisAman_));
        logAksi_(u, 'Nomori Ulang Nomor SPPD', 'No. ST: ' + noST + ' (' + rs.length + ' pegawai)');
        rs = rows_('DATA_SPPD').filter(x => x.NoST === noST); // baca ulang supaya baris & Nomor SPPD baru ikut terbawa ke langkah berikutnya
      }
    }

    const bt = bentrok_(rs.map(r => r.NIP), f.berangkat, k, noST);
    if (bt.length) throw new Error(bt.join(' ') + ' Perubahan dibatalkan.');
    rs.forEach(r => { s.getRange(r._r, 9, 1, 6).setValues([barisAman_([f.maksud, f.tujuan, Number(f.lama), f.bidang, f.berangkat, k])]); s.getRange(r._r, 16).setValue(du); });
    if (typeof f.dasar === 'string') dasarSet_(noST, f.dasar); // Dasar ikut diubah hanya bila dikirim dari form Ubah Surat Tugas
    cacheBump_('data');
    logAksi_(u, 'Edit Surat Tugas', 'No. ST: ' + noST);
    return true; // eksplisit - frontend (modal Ubah Surat Tugas) memeriksa hasil ini untuk menutup modal otomatis setelah tersimpan
  } finally { L.releaseLock(); }
}
function delST(t, noST) { // hapus hanya Super Admin - sekaligus hapus Kwitansi & Laporan terkait (cascade)
  const u = auth_(t, 2);
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    const thn = noNum_(noST).y; // tahun penghitung nomor (REG_<tahun>) milik Surat Tugas ini
    rows_('DATA_SPPD').filter(x => x.NoST === noST).sort((a, b) => b._r - a._r).forEach(r => sh_('DATA_SPPD').deleteRow(r._r));
    const skw = sh_('KWITANSI'); if (skw) kwRows_().filter(x => x.NoST === noST).sort((a, b) => b._r - a._r).forEach(r => skw.deleteRow(r._r));
    const slp = sh_('LAPORAN'); if (slp) lapRows_().filter(x => x.NoST === noST).sort((a, b) => b._r - a._r).forEach(r => slp.deleteRow(r._r));
    dasarSet_(noST, ''); khususSet_(noST, false);
    const nk = thn ? nomorKembali_(thn) : null; // nomor berikutnya kembali melanjutkan dari nomor terakhir yang masih dipakai
    cacheBump_('data');
    logAksi_(u, 'Hapus Surat Tugas', 'No. ST: ' + noST + ' (beserta Kwitansi & Laporan terkait)' + (nk && nk.ke < nk.dari ? '; penomoran kembali ke ' + nk.ke + ' (berikutnya ' + (nk.ke + 1) + ')' : ''));
    return nk ? { berikutnya: nk.ke + 1, kembali: nk.ke < nk.dari } : true;
  }
  finally { L.releaseLock(); }
}
function savePegawai(t, p) {
  const u = auth_(t, 2);
  const nama = String(p.Nama || '').trim(), nip = String(p.NIP || '').trim();
  if (!nama) throw new Error('Nama wajib diisi.');
  if (/^[=+\-@\t\r]/.test(nama)) throw new Error('Nama tidak valid (tidak boleh diawali karakter formula).');
  if (!/^[A-Za-z .,'\-]+$/.test(nama)) throw new Error('Nama hanya boleh berisi huruf, spasi, titik, koma, apostrof, dan tanda hubung.');
  if (!nip) throw new Error('NIP wajib diisi.');
  if (!/^\d+$/.test(nip)) throw new Error('NIP hanya boleh berisi angka.');
  if (rows_('PEGAWAI').some(x => String(x.NIP).trim() === nip)) throw new Error('NIP sudah terdaftar.');
  sh_('PEGAWAI').appendRow(barisAman_([nama, p.Pangkat, nip, p.Jabatan, 'Ya', p.Tingkat || '']));
  cacheBump_('data');
  logAksi_(u, 'Tambah Pegawai', nama + ' (NIP ' + nip + ')');
}
function pegawaiList(t) { // Super Admin: daftar lengkap pegawai (aktif & nonaktif) untuk layar Data Master Pegawai
  auth_(t, 2);
  return rows_('PEGAWAI');
}
function editPegawai(t, p) { // Super Admin: ubah data pegawai; NIP tidak dapat diubah (jadi acuan riwayat ST/Kwitansi)
  const u = auth_(t, 2);
  const nip = String(p.NIP || '').trim();
  const r = rows_('PEGAWAI').find(x => String(x.NIP).trim() === nip);
  if (!r) throw new Error('Data pegawai tidak ditemukan.');
  const nama = String(p.Nama || '').trim();
  if (!nama) throw new Error('Nama wajib diisi.');
  if (/^[=+\-@\t\r]/.test(nama)) throw new Error('Nama tidak valid (tidak boleh diawali karakter formula).');
  if (!/^[A-Za-z .,'\-]+$/.test(nama)) throw new Error('Nama hanya boleh berisi huruf, spasi, titik, koma, apostrof, dan tanda hubung.');
  const sh = sh_('PEGAWAI');
  sh.getRange(r._r, 1).setValue(nama);
  sh.getRange(r._r, 2).setValue(rumusAman_(p.Pangkat || ''));
  sh.getRange(r._r, 4).setValue(rumusAman_(p.Jabatan || ''));
  sh.getRange(r._r, 6).setValue(p.Tingkat || '');
  cacheBump_('data');
  logAksi_(u, 'Ubah Data Pegawai', nama + ' (NIP ' + nip + ')');
}
function setPegawaiAktif(t, nip, aktif) { // Super Admin: nonaktifkan (hapus) atau pulihkan data pegawai - soft delete via kolom Aktif
  const u = auth_(t, 2);
  const r = rows_('PEGAWAI').find(x => String(x.NIP).trim() === String(nip).trim());
  if (!r) throw new Error('Data pegawai tidak ditemukan.');
  sh_('PEGAWAI').getRange(r._r, 5).setValue(aktif ? 'Ya' : 'Tidak');
  cacheBump_('data');
  logAksi_(u, aktif ? 'Pulihkan Data Pegawai' : 'Nonaktifkan Data Pegawai', r.Nama + ' (NIP ' + nip + ')');
}
function addUser(t, u0) {
  const u = auth_(t, 2);
  if (rows_('USERS').some(x => String(x.Username) === String(u0.Username))) throw new Error('Username sudah ada.');
  if (!LVL.hasOwnProperty(u0.Role)) throw new Error('Peran tidak valid.');
  if (BID_SCOPED.includes(u0.Role) && !BIDANG.includes(u0.Bidang)) throw new Error('Pilih Bidang untuk akun ' + u0.Role + '.');
  if (String(u0.Password).length < 6) throw new Error('Kata sandi minimal 6 karakter.');
  sh_('USERS').appendRow(barisAman_([String(u0.Username), hash_(u0.Password), u0.Role, u0.Nama, 'Ya', String(u0.Foto || ''), BID_SCOPED.includes(u0.Role) ? u0.Bidang : '']));
  cacheBump_('data');
  logAksi_(u, 'Tambah Pengguna', u0.Username + ' (' + u0.Role + ')');
}

// ---------- PDF ----------
function wrap_(html, c, p) { // p = 'ST' atau 'SP'
  const f = "'" + c.FONT + "','Archivo Narrow','Arial Narrow',Arial,sans-serif", z = c['UKURAN_' + p] + 'pt';
  return '<style>body,td,div{font-family:' + f + ';font-size:' + z + '}body{margin:0}td{vertical-align:top;padding:1px 3px}.c{text-align:center}.b{border-collapse:collapse;width:100%}.b td{border:1px solid #000;padding:4px}</style>'
    + '<div style="padding:' + c[p + '_ATAS'] + 'mm ' + c[p + '_KANAN'] + 'mm ' + c[p + '_BAWAH'] + 'mm ' + c[p + '_KIRI'] + 'mm">' + html + '</div>';
}
function kop_(c) {
  if (c.PIM) return kopPim_(c);
  const img = c.LOGO ? '<img src="' + c.LOGO + '" width="72" height="73">' : '';
  return '<table style="width:100%;border-bottom:3px solid #000"><tr><td style="width:80px;vertical-align:middle">' + img + '</td><td class="c" style="vertical-align:middle"><div style="font-size:1.3em">PEMERINTAH KABUPATEN NGADA</div><b style="font-size:1.2em">SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN</b><br><i style="font-size:.8em">Jln. Soekarno – Hatta No.1 Tlp. (0384) 2200019, Email.satpolppngada3@gmail.com</i><br><b>B A J A W A</b></td><td style="width:80px"></td></tr></table>';
}
function ttd_(c) {
  if (c.PIM) return ttdPim_(c);
  if (c.TTD && c.TTD_ATAS) { // Cetak Surat Tugas: TTD + CAP melayang DI ATAS teks (menimpa jabatan & nama, seperti ditandatangani & dicap manual)
    return '<div class="c" style="margin-left:50%;margin-top:14px">an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>KABUPATEN NGADA<br>' + c.TTD_JABATAN
      + '<div style="position:relative"><br><br><br><b><u>' + c.TTD_NAMA + '</u></b><br>' + c.TTD_PANGKAT + '<br>NIP. ' + c.TTD_NIP
      + '<img src="' + c.TTD + '" alt="" style="position:absolute;left:calc(50% - ' + (Number(c.TTD_GESER) || 0).toFixed(1) + 'mm);top:1.8em;top:1.5lh;transform:translate(-50%,-50%);width:' + (c.TTD_LEBAR || 40) + 'mm;max-width:none;pointer-events:none"></div></div>';
  }
  return '<div class="c" style="margin-left:50%;margin-top:14px">an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>KABUPATEN NGADA<br>' + c.TTD_JABATAN + (c.TTD ? '<br><img src="' + c.TTD + '" style="width:' + (c.TTD_LEBAR || 40) + 'mm"><br>' : '<br><br><br><br>') + '<b><u>' + c.TTD_NAMA + '</u></b><br>' + c.TTD_PANGKAT + '<br>NIP. ' + c.TTD_NIP + '</div>';
}
function setCfg_(k, v) { _CFG = null; const s = sh_('PENGATURAN'), r = rows_('PENGATURAN').find(x => x.Kunci === k); if (r) s.getRange(r._r, 2).setValue(v); else s.appendRow([k, v]); }
function ttdUri_() { // tanda tangan pimpinan - di-cache sama seperti logoUri_() (6 jam) supaya tidak mengunduh ulang dari Drive di setiap pembuatan dokumen
  try {
    const id = String(cfg_().TTD_ID || ''); if (!id) return '';
    const ck = 'ttd_' + hashStr_(id), hit = cacheGet_(ck);
    if (hit) return hit;
    const uri = 'data:image/png;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes());
    cachePut_(ck, uri, 21600);
    return uri;
  } catch (e) { return ''; }
}
function saveTtd(t, data) { // unggah tanda tangan pimpinan (PNG)
  auth_(t, 2);
  const m = String(data).match(/^data:image\/png;base64,([A-Za-z0-9+\/=]+)$/);
  if (!m) throw new Error('File harus berformat PNG.');
  if (m[1].length > 1000000) throw new Error('Ukuran file terlalu besar (maksimal ± 700 KB).');
  delTtd(t);
  const f = DriveApp.createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', 'TTD_PIMPINAN_REGISTER_SPPD.png'));
  setCfg_('TTD_ID', f.getId());
  return ttdUri_();
}
// ---------- CAP (stempel) - khusus Cetak Surat Tugas ----------
// CAP_ID = file stempel PNG; TTDCAP_ID = gambar gabungan TTD + CAP (disusun di browser saat unggah) yang dipakai di Cetak Surat Tugas.
function fileUri_(kunci, awalan) { try { const id = String(cfg_()[kunci] || ''); if (!id) return ''; const ck = awalan + hashStr_(id), hit = cacheGet_(ck); if (hit) return hit;
  const uri = 'data:image/png;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes()); cachePut_(ck, uri, 21600); return uri; } catch (e) { return ''; } }
function capUri_() { return fileUri_('CAP_ID', 'cap_'); }
function ttdCapUri_() { return fileUri_('TTDCAP_ID', 'ttdcap_'); }
function simpanPng_(data, nama, kunci) {
  const m = String(data).match(/^data:image\/png;base64,([A-Za-z0-9+\/=]+)$/);
  if (!m) throw new Error('File harus berformat PNG.');
  if (m[1].length > 1400000) throw new Error('Ukuran file terlalu besar (maksimal ± 1 MB).');
  hapusFile_(kunci);
  const f = DriveApp.createFile(Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', nama));
  setCfg_(kunci, f.getId());
}
function hapusFile_(kunci) { const old = cfg_()[kunci]; if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} } setCfg_(kunci, ''); }
function saveCap(t, data) { auth_(t, 2); simpanPng_(data, 'CAP_REGISTER_SPPD.png', 'CAP_ID'); return capUri_(); }
function delCap(t) { auth_(t, 2); hapusFile_('CAP_ID'); hapusFile_('TTDCAP_ID'); return true; }
function saveTtdCap(t, data, skala, ukuran) { auth_(t, 2); simpanPng_(data, 'TTD_CAP_REGISTER_SPPD.png', 'TTDCAP_ID'); setCfg_('TTDCAP_SKALA', Math.max(1, Math.min(4, Number(skala) || 1))); if (ukuran) setCfg_('CAP_UKURAN', String(ukuran).slice(0, 5)); return ttdCapUri_(); }
function delTtdCap(t) { auth_(t, 2); hapusFile_('TTDCAP_ID'); return true; }
function ttdST_(c) { // pasang TTD (+ CAP bila ada) - dipanggil HANYA oleh previewST & pdfST (Cetak Surat Tugas)
  const tc = ttdCapUri_();
  if (tc) { const sk = Number(c.TTDCAP_SKALA) || 1; c.TTD = tc; c.TTD_LEBAR = Number(c.TTD_LEBAR || 40) * sk;
    c.TTD_GESER = c.TTD_LEBAR * (0.5 - 0.5 / sk); } // geser ke kiri (mm) supaya TANDA TANGAN tepat di tengah nama, CAP di sebelah kirinya // lebar gambar gabungan disesuaikan supaya ukuran TTD tetap sesuai pengaturan
  else c.TTD = ttdUri_();
  c.TTD_ATAS = !!c.TTD; // gambar melayang di atas teks (lihat ttd_ & sigDoc_)
}
function delTtd(t) {
  auth_(t, 2);
  hapusFile_('TTDCAP_ID'); // gambar gabungan TTD + CAP ikut dihapus (disusun ulang oleh browser bila TTD baru diunggah)
  const old = cfg_().TTD_ID;
  if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
  setCfg_('TTD_ID', '');
}
function prep_(key, c) {
  const r = rows_('DATA_SPPD').filter(x => x.NoST === key);
  if (!r.length) throw new Error('Data tidak ditemukan.');
  c.LOGO = logoUri_('LOGO_DOKUMEN'); c.TTD = ''; // tanda tangan & CAP HANYA di Cetak Surat Tugas (lihat ttdST_) - dokumen lain kosong
  const pg = rows_('PEGAWAI');
  r.forEach(x => { const p = pg.find(q => String(q.NIP) === String(x.NIP)); x.TB = (p && p.TingkatBiaya) || ''; });
  // Urutkan sesuai urutan baris di Data Master Pegawai (sama seperti saat Surat Tugas pertama kali diterbitkan - lihat saveST())
  // supaya Nomor Urut di cetakan Surat Tugas & SPPD selalu benar, termasuk setelah Petugas ditambah lewat Ubah Surat Tugas
  // (petugas baru ditulis di baris paling akhir sheet DATA_SPPD, bukan di posisi urutannya).
  r.sort((a, b) => ((pg.find(q => String(q.NIP) === String(a.NIP)) || {})._r ?? 1e9) - ((pg.find(q => String(q.NIP) === String(b.NIP)) || {})._r ?? 1e9));
  const ds = dasarGet_(key); r.forEach(x => x.DasarST = ds); // Dasar Surat Tugas (opsional) - dari sheet DASAR_ST
  r.KHUSUS = khususST_(key); // ST Khusus: SPPD dicetak 1 lembar dengan daftar Pengikut
  return r;
}
// ---------- Keamanan: escape teks untuk HTML pratinjau dokumen (mencegah kode/skrip ikut berjalan di pratinjau) ----------
// Hanya dipakai di jalur pratinjau HTML. Jalur PDF/Word lewat Google Docs (DocumentApp) memakai data asli, tidak di-escape.
function escDeep_(v) { // salinan data dengan semua teks di-escape (pakai escH_ yang sudah ada); angka, tanggal & gambar (data:) tetap
  if (typeof v === 'string') return /^data:image\//.test(v) ? v : escH_(v);
  if (Array.isArray(v)) { const a = v.map(escDeep_); Object.keys(v).forEach(k => { if (!/^\d+$/.test(k)) a[k] = escDeep_(v[k]); }); return a; }
  if (v && typeof v === 'object' && Object.prototype.toString.call(v) === '[object Object]') { const o = {}; Object.keys(v).forEach(k => { o[k] = escDeep_(v[k]); }); return o; }
  return v;
}
function sections_(key, c) { // HTML untuk pratinjau; Surat Tugas bisa lebih dari satu halaman bila pegawai banyak
  const r = escDeep_(prep_(key, c)); // keamanan: isian pengguna di-escape (pratinjau HTML saja)
  return stPages_(r, r[0], c).map(h => wrap_(h, c, 'ST')).concat(r.KHUSUS ? [wrap_(spKhususHtml_(r, c), c, 'SP')] : r.map(x => wrap_(spHtml_(x, c), c, 'SP'))); // Generate ST + SPPD: tanpa TTD & CAP (TTD + CAP hanya di Cetak Surat Tugas)
}
function stCap_(c) { // perkiraan jumlah pegawai yang muat dalam satu halaman pratinjau (makin besar huruf, makin sedikit yang muat)
  return Math.max(6, Math.round(15 * 12 / Number(c.UKURAN_ST)));
}
function stRow_(p, no) {
  return '<tr><td rowspan="4">' + no + '</td><td>Nama</td><td>: <b>' + p.Nama + '</b></td></tr><tr><td>Pangkat/Gol</td><td>: ' + p.Pangkat + '</td></tr><tr><td>NIP</td><td>: ' + p.NIP + '</td></tr><tr><td>Jabatan</td><td>: ' + p.Jabatan + '</td></tr>';
}
function untukST_(x) { // isi "Untuk" di Surat Tugas: Maksud Perjalanan Dinas, ditambah keterangan lama & tanggal bila bertugas 2 hari atau lebih
  // contoh: "..., Selama 2 (dua) hari, dari tanggal 22 Oktober s/d 23 Oktober 2026". Hanya tampilan cetak - data Maksud di sheet tidak diubah.
  const m = String(x.Maksud || '').trim(), n = Number(x.Lama) || 0;
  if (n < 2 || /selama\s+\d+\s*\(/i.test(m)) return m; // 1 hari, atau keterangan sudah diketik manual di Maksud - biarkan apa adanya
  const [y1, m1, d1] = String(x.Berangkat).split('-'), [y2, m2, d2] = String(x.Kembali).split('-');
  return m.replace(/[\s.,;]+$/, '') + ', Selama ' + n + ' (' + terbilang_(n) + ') hari, dari tanggal ' + d1 + ' ' + BLN[+m1 - 1] + (y1 !== y2 ? ' ' + y1 : '') + ' s/d ' + d2 + ' ' + BLN[+m2 - 1] + ' ' + y2;
}
function stPages_(r, x, c) { // potong daftar pegawai menjadi beberapa halaman pratinjau (perkiraan - PDF sebenarnya mengikuti tata letak asli Google Docs)
  const cap = stCap_(c), chunks = [], dl = dasarList_(x.DasarST).reduce((a, t) => a + Math.ceil(t.length / 90), 0);
  const cap1 = Math.max(1, cap - Math.ceil(dl / 4)); // halaman pertama memuat lebih sedikit pegawai bila Dasar diisi
  for (let i = 0; i < r.length; i += (i ? cap : cap1)) chunks.push(r.slice(i, i + (i ? cap : cap1)));
  if (!chunks.length) chunks.push([]);
  return chunks.map((chunk, pi) => {
    const last = pi === chunks.length - 1;
    const rows = chunk.map((p, j) => stRow_(p, r.length > 1 ? (pi * cap + j + 1) : '')).join('');
    let html = pi === 0
      ? kop_(c) + '<div class="c" style="margin-top:8px"><b><u>SURAT TUGAS</u></b><br>Nomor : ' + x.NoST + '</div><br>' + dasarHtml_(x) + '<br><div class="c"><b>MEMERINTAHKAN :</b></div><table><tr><td width="60" valign="top">Kepada</td><td valign="top">:</td><td><table>' + rows + '</table></td></tr></table>'
      : '<table><tr><td width="60" valign="top"></td><td valign="top">&nbsp;</td><td><table style="margin-top:4px">' + rows + '</table></td></tr></table>';
    if (last) html += '<table style="margin-top:8px"><tr><td width="60">Untuk</td><td>:</td><td>' + untukST_(x) + '</td></tr></table><br><table style="margin-left:50%"><tr><td>Dikeluarkan di</td><td>: ' + c.KOTA + '</td></tr><tr><td>Pada Tanggal</td><td>: ' + idn_(x.TglST) + '</td></tr></table>' + anSatuBaris_(ttd_(c)); // "an.KEPALA ..." satu baris
    return html;
  });
}
// ---------- PDF via Google Docs (ukuran kertas & margin presisi) ----------
const MM = 72 / 25.4, PAPER = { Legal: [612, 1008], Letter: [612, 792] };
const _BLOB = {}; // gambar (logo/TTD) cukup di-decode sekali per dokumen, bukan sekali per halaman
function blob_(uri, name) {
  const u = String(uri), k = name + '|' + u.length + '|' + u.slice(-48);
  if (_BLOB[k]) return _BLOB[k];
  const m = u.match(/^data:([^;]+);base64,(.+)$/);
  return _BLOB[k] = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
}
// KECEPATAN: pa_() & tb_() memasang semua gaya dalam SATU panggilan setAttributes (sebelumnya 8-15 panggilan terpisah per paragraf/sel).
// Hasil tampilan sama persis - hanya jumlah perintah ke Google Docs yang jauh berkurang.
function pa_(cell, text, c, p, o) {
  o = o || {};
  const A = DocumentApp.Attribute, a = {};
  a[A.FONT_FAMILY] = c.FONT; a[A.FONT_SIZE] = Number(c['UKURAN_' + p]) * (o.k || 1);
  a[A.LINE_SPACING] = o.ls || 1; a[A.SPACING_BEFORE] = 0; a[A.SPACING_AFTER] = 0; a[A.INDENT_FIRST_LINE] = 0;
  a[A.BOLD] = !!o.b; a[A.ITALIC] = !!o.i; a[A.UNDERLINE] = !!o.u; // eksplisit nyala/mati - jangan ikut gaya 'Normal text' bawaan akun Google
  if (o.al) a[A.HORIZONTAL_ALIGNMENT] = o.al;
  if (o.hang) a[A.INDENT_START] = o.hang;
  return cell.appendParagraph(String(text)).setAttributes(a);
}
function tb_(cell, data, w, c, p, border, ls, pad) { // sel boleh ['teks', true] untuk huruf tebal, ['teks', tebal, perataan] untuk rata khusus
  const txt = v => { v = Array.isArray(v) ? v[0] : v; v = (v == null ? '' : String(v)); return v === '' ? ' ' : v; };
  const t = cell.appendTable(data.map(r => r.map(txt)));
  t.setBorderWidth(border ? 1 : 0).setBorderColor('#000000');
  w.forEach((x, j) => t.setColumnWidth(j, x));
  const A = DocumentApp.Attribute, PG = DocumentApp.ElementType.PARAGRAPH;
  t.editAsText().setFontFamily(c.FONT).setFontSize(Number(c['UKURAN_' + p])).setUnderline(false); // sekali untuk seluruh tabel (sebelumnya per sel)
  const pd = {}; pd[A.PADDING_TOP] = pad || 1; pd[A.PADDING_BOTTOM] = pad || 1; pd[A.PADDING_LEFT] = 3; pd[A.PADDING_RIGHT] = 3;
  const pr0 = {}; pr0[A.LINE_SPACING] = ls || 1; pr0[A.SPACING_BEFORE] = 0; pr0[A.SPACING_AFTER] = 0;
  data.forEach((r, i) => r.forEach((v, j) => {
    const tc = t.getCell(i, j).setAttributes(pd), ar = Array.isArray(v);
    if (ar && v[2]) tc.setVerticalAlignment(DocumentApp.VerticalAlignment.BOTTOM);
    if (ar && v[1]) tc.editAsText().setBold(true);
    let pa = pr0; if (ar && v[2]) { pa = Object.assign({}, pr0); pa[A.HORIZONTAL_ALIGNMENT] = v[2]; }
    for (let k = 0; k < tc.getNumChildren(); k++) { const ch = tc.getChild(k); if (ch.getType() === PG) ch.asParagraph().setAttributes(pa); }
  }));
  return t;
}
function noPad_(tc) { return tc.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0); }
function bar_(cell, cw, size) { // garis hitam horizontal
  const b = cell.appendTable([['']]).setBorderWidth(0).setColumnWidth(0, cw), bc = noPad_(b.getCell(0, 0)).setBackgroundColor('#000000');
  bc.editAsText().setFontSize(size);
  bc.getChild(0).asParagraph().setLineSpacing(1).setSpacingBefore(0).setSpacingAfter(0);
}
function kopDoc_(cell, cw, c, p, o) { // o (opsional, hanya SPPD Khusus): { logo: lebar logo (pt), garis: tebal garis bawah kop }
  o = o || {};
  const CE = DocumentApp.HorizontalAlignment.CENTER, kl = Math.max(66, (o.logo || 58) + 8);
  const t = cell.appendTable([['', '', '']]).setBorderWidth(0);
  t.setColumnWidth(0, kl).setColumnWidth(1, cw - 2 * kl).setColumnWidth(2, kl);
  [0, 1, 2].forEach(j => noPad_(t.getCell(0, j)).setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER));
  const L = t.getCell(0, 0), M = t.getCell(0, 1);
  if (c.LOGO) {
    const im = L.appendImage(blob_(c.LOGO, 'logo.png'));
    im.setWidth(o.logo || 58).setHeight(Math.round((o.logo || 58) * 59 / 58));
    im.getParent().asParagraph().setAlignment(CE).setSpacingBefore(0).setSpacingAfter(0);
    L.removeChild(L.getChild(0));
  }
  const KP = c.PIM ? c.PIM.kop : ['PEMERINTAH KABUPATEN NGADA', 'SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', 'Jln. Soekarno – Hatta No.1 Tlp. (0384) 2200019, Email.satpolppngada3@gmail.com', 'B A J A W A'];
  pa_(M, KP[0], c, p, { al: CE, k: 1.3 });
  pa_(M, KP[1], c, p, { al: CE, k: 1.2, b: 1 });
  pa_(M, KP[2], c, p, { al: CE, k: 0.8, i: 1 });
  pa_(M, KP[3], c, p, { al: CE, b: 1 });
  M.removeChild(M.getChild(0));
  const bar = cell.appendTable([['']]).setBorderWidth(0).setColumnWidth(0, cw);
  const bc = noPad_(bar.getCell(0, 0)).setBackgroundColor('#000000');
  bc.editAsText().setFontSize(o.garis || 3); // o.garis (SPPD Khusus): garis lebih tipis
  if (o.garis) { try { bar.getRow(0).setMinimumHeight(0); } catch (e) {} }
  bc.getChild(0).asParagraph().setLineSpacing(1).setSpacingBefore(0).setSpacingAfter(0);
}
function sigDoc_(cell, cw, c, p, lbl, tgl, o) { // o.satuBaris (opsional: Surat Tugas, SPPD Normal & Khusus): baris "an.KEPALA ..." dipaskan 1 baris
  const CE = DocumentApp.HorizontalAlignment.CENTER;
  const t = cell.appendTable([['', '']]).setBorderWidth(0).setColumnWidth(0, cw * 0.5).setColumnWidth(1, cw * 0.5);
  noPad_(t.getCell(0, 0)); const R = noPad_(t.getCell(0, 1));
  pa_(R, 'Dikeluarkan di : ' + c.KOTA, c, p);
  pa_(R, lbl + ' : ' + idn_(tgl), c, p);
  pa_(R, '', c, p);
  const anK = c.PIM ? c.PIM.an1 : 'an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', fsA = Number(c['UKURAN_' + p]) || 11;
  pa_(R, anK, c, p, { al: CE, k: o && o.satuBaris ? pasHuruf_(anK, cw * 0.5 - 4, fsA, c.FONT, 0.7) / fsA : 1 });
  pa_(R, c.PIM ? c.PIM.an2 : 'KABUPATEN NGADA', c, p, { al: CE });
  pa_(R, c.PIM ? c.PIM.jab : c.TTD_JABATAN, c, p, { al: CE });
  let melayang = false;
  if (c.TTD && c.TTD_ATAS) { // Cetak Surat Tugas: TTD + CAP melayang di atas teks; ruang kosong tetap 3 baris seperti tanpa TTD
    const g1 = pa_(R, '', c, p), g2 = pa_(R, '', c, p), g3 = pa_(R, '', c, p);
    try {
      const pi = g1.addPositionedImage(blob_(c.TTD, 'ttd.png')), ow = pi.getWidth(), oh = pi.getHeight();
      const w = Number(c.TTD_LEBAR || 40) * MM, h = w * oh / ow, fs = Number(c['UKURAN_' + p]) || 12, ruang = 3 * fs * 1.15;
      pi.setWidth(Math.round(w)).setHeight(Math.round(h)).setLeftOffset(Math.round((cw * 0.5 - w) / 2 - (Number(c.TTD_GESER) || 0) * MM)).setTopOffset(Math.round((ruang - h) / 2))
        .setLayout(DocumentApp.PositionedLayout.ABOVE_TEXT);
      melayang = true;
    } catch (e) { // tidak didukung di posisi ini -> kembali ke cara biasa (gambar di antara jabatan & nama)
      [g1, g2, g3].forEach(g => { try { R.removeChild(g); } catch (e2) {} });
    }
  }
  if (melayang) { /* sudah dipasang */ }
  else if (c.TTD) {
    const im = R.appendImage(blob_(c.TTD, 'ttd.png')), w = Number(c.TTD_LEBAR || 40) * MM, ow = im.getWidth(), oh = im.getHeight();
    im.setWidth(Math.round(w)).setHeight(Math.round(w * oh / ow));
    im.getParent().asParagraph().setAlignment(CE).setSpacingBefore(0).setSpacingAfter(0);
  } else { pa_(R, '', c, p); pa_(R, '', c, p); pa_(R, '', c, p); }
  pa_(R, c.PIM ? c.PIM.nama : c.TTD_NAMA, c, p, { al: CE, b: 1, u: 1 });
  pa_(R, c.PIM ? c.PIM.pangkat : c.TTD_PANGKAT, c, p, { al: CE });
  pa_(R, 'NIP. ' + (c.PIM ? c.PIM.nip : c.TTD_NIP), c, p, { al: CE });
  R.removeChild(R.getChild(0));
  pa_(cell, '', c, p);
}
function stRows_(r, a, b) { // baris daftar pegawai (4 baris per pegawai) untuk pegawai ke-a sampai sebelum ke-b; nomor tetap urut dari seluruh daftar
  const rows = [];
  r.slice(a, b).forEach((q, j) => { const i = a + j; [['Nama', q.Nama], ['Pangkat/Gol', q.Pangkat], ['NIP', q.NIP], ['Jabatan', q.Jabatan]].forEach((f, k) =>
    rows.push([i + k === 0 ? 'Kepada' : '', i + k === 0 ? ':' : '', k === 0 ? (r.length > 1 ? String(i + 1) : '') : '', f[0], [': ' + f[1], k === 0]])); });
  return rows;
}
// Pembagian pegawai per halaman Surat Tugas supaya satu pegawai (4 baris) TIDAK terpotong di pergantian halaman.
// Hanya dipakai bila daftar tidak muat 1 halaman (perkiraan tinggi, sengaja dibuat sedikit lebih longgar); kalau muat -> [[0, n]] = cara lama.
function stPlan_(r, c) {
  const n = r.length;
  try {
    const F = Number(c.UKURAN_ST) || 12, pz = PAPER[c.KERTAS] || PAPER.Legal, L = Math.max(1, Number(c.ST_KIRI) * MM), R = Math.max(1, Number(c.ST_KANAN) * MM), cw = pz[0] - L - R;
    const mn = Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)), top = mn * MM, bot = Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM, extra = Math.max(0, Number(c.ST_ATAS) - mn) * MM;
    const usable = (pz[1] - top - bot - extra - 4) * 0.97, ln = 1.15 * F + 2.2, ch = F * 0.5, vw = cw - 178;
    const bar = (t, b) => Math.max(1, Math.ceil(String(t == null ? '' : t).length * ch * (b ? 1.1 : 1) / vw));
    const ph = q => ln * (bar(q.Nama, 1) + bar(q.Pangkat) + bar(q.NIP) + bar(q.Jabatan));
    const dsr = dasarList_(r[0].DasarST), dasarH = ln * (dsr.length ? dsr.reduce((a, t) => a + Math.max(1, Math.ceil(t.length * ch / (cw - 100))), 0) : 1);
    const head = 2 + Math.max(59, 4.95 * F) + 6 + 7 * 1.15 * F + dasarH;
    const tail = 15 * 1.15 * F + ln * Math.max(1, Math.ceil(String(untukST_(r[0])).length * ch / (cw - 78))) + 6;
    const ck = []; let a = 0, h = 0, cap = usable - head;
    for (let i = 0; i < n; i++) { const t = ph(r[i]); if (i > a && h + t > cap) { ck.push([a, i]); a = i; h = 0; cap = usable; } h += t; }
    ck.push([a, n]);
    if (ck.length < 2) return [[0, n]]; // muat 1 halaman: tidak diubah
    const ls = ck[ck.length - 1]; // chunk terakhir memuat "Untuk" + tanda tangan: bila tidak muat, pegawai terakhir dipindah bersama bagian itu
    if (h + tail > usable && ls[1] - ls[0] > 1) { ls[1] = n - 1; ck.push([n - 1, n]); }
    return ck;
  } catch (e) { return [[0, n]]; }
}
function stSect_(body, c, r, cs) { // pasang Surat Tugas; bila pegawai banyak, dibagi per halaman (lihat stPlan_)
  const pl = stPlan_(r, cs);
  if (pl.length < 2) return sect_(body, c, 'ST', true, (cell, cw) => stDoc_(cell, cw, r, cs));
  pl.forEach((q, i) => { if (i) body.appendPageBreak(); sect_(body, c, 'ST', i === 0, (cell, cw) => stDoc_(cell, cw, r, cs, { a: q[0], b: q[1], first: i === 0, last: i === pl.length - 1 })); });
}
function stDoc_(cell, cw, r, c, pt) { // pt (opsional): { a, b, first, last } = bagian halaman; tanpa pt = seluruh Surat Tugas seperti biasa
  const p = 'ST', x = r[0], CE = DocumentApp.HorizontalAlignment.CENTER, awal = !pt || pt.first, akhir = !pt || pt.last;
  if (awal) {
  kopDoc_(cell, cw, c, p);
  pa_(cell, '', c, p);
  pa_(cell, 'SURAT TUGAS', c, p, { b: 1, u: 1, al: CE });
  pa_(cell, 'Nomor : ' + x.NoST, c, p, { al: CE });
  pa_(cell, '', c, p);
  const dsr = dasarList_(x.DasarST);
  if (dsr.length) tb_(cell, dsr.map((t, i) => [i ? '' : 'Dasar', i ? '' : ':', dsr.length > 1 ? String(i + 1) : '', t]), [62, 10, 22, cw - 94], c, p, false); // Dasar bernomor (opsional)
  else tb_(cell, [['Dasar', ':', '']], [62, 10, cw - 72], c, p, false);
  pa_(cell, '', c, p);
  pa_(cell, 'MEMERINTAHKAN :', c, p, { b: 1, al: CE });
  pa_(cell, '', c, p);
  }
  tb_(cell, stRows_(r, pt ? pt.a : 0, pt ? pt.b : r.length), [62, 10, 22, 78, cw - 172], c, p, false);
  if (akhir) {
  pa_(cell, '', c, p);
  tb_(cell, [['Untuk', ':', untukST_(x)]], [62, 10, cw - 72], c, p, false);
  pa_(cell, '', c, p);
  sigDoc_(cell, cw, c, p, 'Pada Tanggal', x.TglST, { satuBaris: true }); // "an.KEPALA ..." satu baris (sama seperti SPPD)
  }
}
function spDoc_(cell, cw, x, c) {
  const p = 'SP', CE = DocumentApp.HorizontalAlignment.CENTER, w1 = 24, w2 = Math.round(cw * 0.36);
  kopDoc_(cell, cw, c, p);
  pa_(cell, '', c, p);
  tb_(cell, [['', 'Lembar Ke : \nKode Nomor : ' + c.KODE + '\nNomor : ' + x.NoSPPD]], [cw * 0.5, cw * 0.5], c, p, false);
  pa_(cell, '', c, p);
  pa_(cell, 'SURAT PERJALANAN DINAS (SPD)', c, p, { b: 1, u: 1, al: CE });
  pa_(cell, '', c, p);
  const n0 = cell.getNumChildren();
  try { spKhususTabel_(cell, cw, [x], c, { kosong: 3, normal: true }); } // kolom 8 Pengikut seperti contoh (Nama | Tanggal Lahir | Keterangan)
  catch (e) { // bila impor tabel tidak tersedia: susunan lama
    while (cell.getNumChildren() > n0) cell.removeChild(cell.getChild(cell.getNumChildren() - 1));
    const R = (n, a, b) => [String(n), a, b];
    tb_(cell, [
      R(1, 'Pejabat Pembuat Komitmen', 'KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN'),
      R(2, 'Nama / NIP Pegawai yang melaksanakan perjalanan dinas', [x.Nama + ' / ' + x.NIP, true]),
      R(3, 'a. Pangkat dan Golongan\nb. Jabatan / Instansi\nc. Tingkat Biaya Perjalanan Dinas', 'a. ' + x.Pangkat + '\nb. ' + x.Jabatan + ' / SATPOL PP & KEBAKARAN\nc. ' + (x.TB || c.BIAYA)),
      R(4, 'Maksud Perjalanan Dinas', x.Maksud + '\n '),
      R(5, 'Alat angkut yang dipergunakan', c.ANGKUT),
      R(6, 'a. Tempat berangkat\nb. Tempat tujuan', 'a. ' + c.KANTOR + '\nb. ' + x.Tujuan),
      R(7, 'a. Lamanya perjalanan dinas\nb. Tanggal berangkat\nc. Tanggal harus kembali / tiba di tempat baru *)', 'a. ' + x.Lama + ' Hari\nb. ' + idn_(x.Berangkat) + '\nc. ' + idn_(x.Kembali)),
      R(8, 'Pengikut : Nama\n1.\n2.\n3.', ' '),
      R(9, 'Pembebanan Anggaran\na. Instansi\nb. Akun', ' \na. SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN\nb.'),
      R(10, 'Keterangan lain-lain', ' ')
    ].map(r => [r[0], r[1], r[2]]), [w1, w2, cw - w1 - w2], c, p, true);
  }
  pa_(cell, '*Coret yang tidak perlu', c, p, { k: 0.85 });
  pa_(cell, '', c, p);
  sigDoc_(cell, cw, c, p, 'Tanggal', x.TglST, { satuBaris: true }); // "an.KEPALA ..." satu baris (sama seperti SPPD Khusus)
}
function sect_(body, c, p, first, fill, land) {
  const pz0 = PAPER[c.KERTAS] || PAPER.Legal, W = land ? pz0[1] : pz0[0], L = Math.max(1, Number(c[p + '_KIRI']) * MM), R = Math.max(1, Number(c[p + '_KANAN']) * MM), cw = Math.round(W - L - R);
  const extra = Math.max(0, Number(c[p + '_ATAS']) - Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS))) * MM;
  const sp = first ? body.getChild(0).asParagraph() : body.appendParagraph('');
  sp.setSpacingBefore(extra).setSpacingAfter(0).setLineSpacing(1).setFontSize(1);
  const o = body.appendTable([['', '', '']]).setBorderWidth(0);
  o.setColumnWidth(0, L).setColumnWidth(1, cw).setColumnWidth(2, R);
  [0, 1, 2].forEach(j => noPad_(o.getCell(0, j)));
  const cell = o.getCell(0, 1);
  fill(cell, cw);
  if (cell.getNumChildren() > 1) cell.removeChild(cell.getChild(0));
  return o;
}
function isi_(el, ph, val) { // ganti teks penanda dengan nilai apa adanya (bukan regex), huruf tebal penanda ikut terbawa
  const f = el.findText(ph); if (!f) return;
  const t = f.getElement().asText(), s = f.getStartOffset(), e = f.getEndOffsetInclusive(), b = t.isBold(s);
  val = String(val == null ? '' : val);
  if (val) { t.insertText(e + 1, val); if (b !== null) t.setBold(e + 1, e + val.length, b); }
  t.deleteText(s, e);
}
// KECEPATAN: halaman SPPD pegawai pertama disusun lengkap, pegawai berikutnya cukup MENYALIN halaman itu lalu mengganti
// isian yang berbeda (Nama, NIP, Pangkat, Jabatan, Tingkat Biaya, No. SPPD) - jauh lebih cepat daripada menyusun ulang tiap halaman.
// Kalau data perjalanan antar pegawai ternyata tidak seragam (mis. diubah manual di sheet), otomatis kembali ke cara lama per halaman.
function spSemua_(body, c, r, first) {
  const x0 = r[0], SAMA = ['Maksud', 'Tujuan', 'Lama', 'Berangkat', 'Kembali', 'TglST'];
  const lama = () => r.forEach((x, i) => { if (i > 0 || !first) body.appendPageBreak(); sect_(body, c, 'SP', first && i === 0, (cell, cw) => spDoc_(cell, cw, x, c)); });
  if (r.length < 2 || !r.every(x => SAMA.every(f => String(x[f]) === String(x0[f])))) return lama();
  const PH = { Nama: 'QQSPNAMAQQ', NIP: 'QQSPNIPQQ', Pangkat: 'QQSPPKTQQ', Jabatan: 'QQSPJBTQQ', TB: 'QQSPTBQQ', NoSPPD: 'QQSPNOQQ' };
  if (!first) body.appendPageBreak();
  const o = sect_(body, c, 'SP', first, (cell, cw) => spDoc_(cell, cw, Object.assign({}, x0, PH), c)), tpl = o.copy();
  const extra = Math.max(0, Number(c.SP_ATAS) - Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS))) * MM; // sama seperti jarak atas di sect_()
  r.forEach((x, i) => {
    let t = o;
    if (i > 0) { body.appendPageBreak(); body.appendParagraph('').setSpacingBefore(extra).setSpacingAfter(0).setLineSpacing(1).setFontSize(1); t = body.appendTable(tpl.copy()); }
    Object.keys(PH).forEach(f => isi_(t, PH[f], f === 'TB' ? (x.TB || c.BIAYA) : x[f]));
  });
}
function halaman_(body, c) { // kosongkan dokumen & pasang ukuran kertas/margin
  const pz = PAPER[c.KERTAS] || PAPER.Legal;
  body.clear();
  body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
    .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
}
function cST_(c) { const cs = Object.assign({}, c); ttdST_(cs); return cs; } // salinan pengaturan khusus halaman Surat Tugas (dengan TTD + CAP); SPPD tetap memakai c (tanpa TTD)
function buildDoc_(doc, r, c) {
  const body = doc.getBody(), cs = c; // Generate ST + SPPD: tanpa TTD & CAP (TTD + CAP hanya di Cetak Surat Tugas: previewST/pdfST)
  halaman_(body, c);
  stSect_(body, c, r, cs);
  if (r.KHUSUS) { body.appendPageBreak(); sect_(body, c, 'SP', false, (cell, cw) => spKhususDoc_(cell, cw, r, c)); return; } // ST Khusus: satu SPPD + Pengikut
  try { spSemua_(body, c, r, false); }
  catch (e) { // jaring pengaman: kalau cara cepat gagal karena sebab apa pun, susun ulang dengan cara lama
    halaman_(body, c);
    stSect_(body, c, r, cs);
    r.forEach(x => { body.appendPageBreak(); sect_(body, c, 'SP', false, (cell, cw) => spDoc_(cell, cw, x, c)); });
  }
}

function spHtmlLama_(r, c) { // SPPD Normal (susunan lama) - tabelnya diganti oleh spHtml_ di bawah
  const rw = (n, a, b) => '<tr><td width="22">' + n + '</td><td width="190">' + a + '</td><td>' + b + '</td></tr>';
  return kop_(c) + '<table style="margin-left:50%;margin-top:8px"><tr><td>Lembar Ke</td><td>:</td></tr><tr><td>Kode Nomor</td><td>: ' + c.KODE + '</td></tr><tr><td>Nomor</td><td>: ' + r.NoSPPD + '</td></tr></table><div class="c"><b><u>SURAT PERJALANAN DINAS (SPD)</u></b></div><br><table class="b">'
    + rw(1, 'Pejabat Pembuat Komitmen', 'KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN')
    + rw(2, 'Nama / NIP Pegawai yang melaksanakan perjalanan dinas', '<b>' + r.Nama + ' / ' + r.NIP + '</b>')
    + rw(3, 'a. Pangkat dan Golongan<br>b. Jabatan / Instansi<br>c. Tingkat Biaya Perjalanan Dinas', 'a. ' + r.Pangkat + '<br>b. ' + r.Jabatan + ' / SATPOL PP &amp; KEBAKARAN<br>c. ' + (r.TB || c.BIAYA))
    + rw(4, 'Maksud Perjalanan Dinas', r.Maksud)
    + rw(5, 'Alat angkut yang dipergunakan', c.ANGKUT)
    + rw(6, 'a. Tempat berangkat<br>b. Tempat tujuan', 'a. ' + c.KANTOR + '<br>b. ' + r.Tujuan)
    + rw(7, 'a. Lamanya perjalanan dinas<br>b. Tanggal berangkat<br>c. Tanggal harus kembali / tiba di tempat baru *)', 'a. ' + r.Lama + ' Hari<br>b. ' + idn_(r.Berangkat) + '<br>c. ' + idn_(r.Kembali))
    + rw(8, 'Pengikut : Nama<br>1.<br>2.<br>3.', '')
    + rw(9, 'Pembebanan Anggaran<br>a. Instansi<br>b. Akun', '<br>a. SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>b.')
    + rw(10, 'Keterangan lain-lain', '')
    + '</table><small>*Coret yang tidak perlu</small><br><table style="margin-left:50%"><tr><td>Dikeluarkan di</td><td>: ' + c.KOTA + '</td></tr><tr><td>Tanggal</td><td>: ' + idn_(r.TglST) + '</td></tr></table>' + ttd_(c);
}

// ---------- KWITANSI ----------
const rp_ = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function terbilang_(n) {
  const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  n = Math.floor(n);
  if (n < 12) return s[n];
  if (n < 20) return terbilang_(n - 10) + ' belas';
  if (n < 100) return terbilang_(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang_(n % 10) : '');
  if (n < 200) return 'seratus' + (n > 100 ? ' ' + terbilang_(n - 100) : '');
  if (n < 1000) return terbilang_(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang_(n % 100) : '');
  if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + terbilang_(n - 1000) : '');
  if (n < 1e6) return terbilang_(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang_(n % 1000) : '');
  if (n < 1e9) return terbilang_(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + terbilang_(n % 1e6) : '');
  return terbilang_(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + terbilang_(n % 1e9) : '');
}
function kwRows_() {
  let s = sh_('KWITANSI');
  if (!s) { s = SpreadsheetApp.getActive().insertSheet('KWITANSI'); s.appendRow(['NoST', 'Nomor', 'Jenis', 'Tarif', 'Tanggal']); s.setFrozenRows(1); s.getRange('A:B').setNumberFormat('@'); s.getRange('E:E').setNumberFormat('@'); }
  return rows_('KWITANSI');
}
function saveKwi(t, f) {
  const u = auth_(t, true); own_(u, f.noST);
  if (!['Luar Kota', 'Dalam Kota', 'Luar Daerah'].includes(f.jenis)) throw new Error('Pilih jenis perjalanan.');
  const tarif = Number(f.tarif);
  if (!(tarif >= 0)) throw new Error('Tarif tidak valid.');
  const ex = kwRows_().find(x => x.NoST === f.noST), row = [f.noST, f.nomor || '', f.jenis, tarif, f.tgl || ''];
  if (ex) sh_('KWITANSI').getRange(ex._r, 1, 1, 5).setValues([barisAman_(row)]); else sh_('KWITANSI').appendRow(barisAman_(row));
  cacheBump_('data');
  logAksi_(u, 'Simpan Kwitansi', 'No. ST: ' + f.noST);
  return true;
}
function kwData_(key, c) { // nama & maksud diambil langsung dari data Surat Tugas
  const r = pimRowsKey_(key, c) || rows_('DATA_SPPD').filter(x => x.NoST === key);
  if (!r.length) throw new Error('Data tidak ditemukan.');
  const k = kwRows_().find(x => x.NoST === key);
  if (!k) throw new Error('Atur data kwitansi terlebih dahulu.');
  const tarif = Number(k.Tarif), items = r.map((x, i) => ({ no: i + 1, nama: x.Nama, hari: Number(x.Lama), jumlah: Number(x.Lama) * tarif }));
  const total = items.reduce((a, b) => a + b.jumlah, 0), x = r[0], th = String(x.TglST).slice(0, 4), pk = 'KWI_PPTK_' + String(x.Bidang).toUpperCase();
  dpaSheet_();
  const dpaRows = rows_('DPA').filter(q => String(q.Tahun) === th && q.Bidang === x.Bidang);
  const dpaRow = (x.SubKegiatan && dpaRows.find(q => q.SubKegiatan === x.SubKegiatan)) || dpaRows[0] || {};
  return { pptkNama: c[pk + '_NAMA'] || '', pptkNip: c[pk + '_NIP'] || '', kpaImg: c.KWI_KPA_NAMA === c.TTD_NAMA ? c.TTD : '', items: items, total: total, tarif: tarif, nomor: k.Nomor || '', tgl: k.Tanggal || '', x: x,
    kepada: x.Nama + (r.length > 1 ? ' .dkk' : ''), bayar: String(c.KWI_PREFIX).trim() + ' ' + x.Maksud,
    huruf: terbilang_(total) + ' rupiah', kode: String(dpaRow.KodeRekening || c.KWI_KODE_REKENING).trim(),
    tglTxt: k.Tanggal ? idn_(k.Tanggal) : '.......................... ' + th };
}
// Rincian Kwitansi: kotak Kode Rekening | Jumlah, lalu setiap pegawai dalam kotak bergaris sendiri [No | Nama | Lama | Jumlah | Tanda Tangan]
// (kotak pertama ikut memuat judul kolom), dan kotak Jumlah total di bawahnya. Proporsi lebar kolom dipakai bersama oleh pratinjau & PDF/Word.
const KWI_W_ = [0.058, 0.316, 0.284, 0.158, 0.184];
const rpTitik_ = n => 'Rp.' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // format "Rp.510.000" (titik ribuan) untuk kotak Kode Rekening & Jumlah total
function kwHtml_(d, c) {
  const blk = (ls, nm, nip, img) => '<div class="c">' + ls.join('<br>') + (img ? '<br><img src="' + img + '" style="width:' + (c.TTD_LEBAR || 40) + 'mm"><br>' : '<br><br><br><br>') + '<b><u>' + nm + '</u></b><br>NIP. ' + nip + '</div>';
  const r = (a, b, v) => '<tr><td width="24">' + a + '</td><td width="150">' + b + '</td><td width="12">:</td><td>' + v + '</td></tr>';
  const kw = KWI_W_.map(x => (x * 100).toFixed(1) + '%'), kiri = ((KWI_W_[0] + KWI_W_[1] + KWI_W_[2]) * 100).toFixed(1) + '%';
  return '<div class="c"><b>PEMERINTAH KABUPATEN NGADA<br>TANDA BUKTI PEMBAYARAN<br>NOMOR BUKTI : ' + d.nomor + '</b></div><div style="border-top:2px solid #000;margin:3px 0 10px"></div>'
    + '<div style="line-height:1.5"><div style="padding-left:24px;text-indent:-24px">a)&nbsp;&nbsp;&nbsp;Bendahara Pengeluaran pada Kantor Satuan Polisi Pamong Praja dan Kebakaran Kab, Ngada</div><table width="100%" style="line-height:1.5">'
    + r('', 'telah mengeluarkan uang sebesar', '<b>Rp ' + rp_(d.total) + '</b>') + r('b)', 'Huruf', d.huruf) + r('c)', 'Kepada Nama', d.kepada) + r('', 'Alamat', c.KOTA) + r('d)', 'Sebagai pembayaran', d.bayar)
    + '</table>Dengan rincian sebagai berikut :</div><br>'
    + '<table class="b"><tr><td style="width:' + kiri + '">Kode Rekening</td><td>Jumlah</td></tr><tr><td>' + d.kode + '</td><td><b>' + rpTitik_(d.total) + '</b></td></tr></table><br>'
    + d.items.map((i, k) => '<table class="b" style="margin-top:' + (k ? '12px' : '0') + '">'
      + (k ? '' : '<tr>' + ['No', 'Nama', 'Lama Perjalanan Dinas', 'Jumlah', 'Tanda Tangan'].map((h, j) => '<td class="c" style="width:' + kw[j] + '"><b>' + h + '</b></td>').join('') + '</tr>')
      + '<tr style="height:40px"><td class="c" style="width:' + kw[0] + ';vertical-align:middle">' + i.no + '</td><td style="width:' + kw[1] + ';vertical-align:middle">' + i.nama + '</td><td style="width:' + kw[2] + ';vertical-align:middle">' + i.hari + ' hari @Rp. ' + rp_(d.tarif) + '</td><td style="width:' + kw[3] + ';vertical-align:middle">Rp ' + rp_(i.jumlah) + '</td><td style="width:' + kw[4] + '"></td></tr></table>').join('')
    + '<table class="b" style="margin-top:12px"><tr><td style="width:' + kiri + ';text-align:right">Jumlah :</td><td><b>' + rpTitik_(d.total) + '</b></td></tr></table>'
    + '<div style="line-height:1.5;padding-left:24px;text-indent:-24px">e)&nbsp;&nbsp;&nbsp;Tanggal dikeluarkan uang : ' + (d.tgl ? idn_(d.tgl) : '') + '</div><br>'
    + '<table width="100%"><tr><td width="50%"><div class="c"><b>Setuju dibayar :</b></div>' + blk(['Pejabat Pelaksana Teknis Kegiatan'], d.pptkNama, d.pptkNip) + '</td>'
    + '<td width="50%"><div class="c">Bajawa, ' + d.tglTxt + '</div>' + blk(['Bendahara Pengeluaran,'], c.KWI_BENDAHARA_NAMA, c.KWI_BENDAHARA_NIP) + '</td></tr></table><br>'
    + '<div style="width:50%;margin:0 auto">' + blk(['<b>Mengetahui :</b>', 'Kuasa Pengguna Anggaran,'], c.KWI_KPA_NAMA, c.KWI_KPA_NIP, d.kpaImg) + '</div>';
}
function kwBlk_(tc, ls, nm, nip, c, img) {
  const CE = DocumentApp.HorizontalAlignment.CENTER;
  noPad_(tc);
  ls.forEach(l => pa_(tc, l, c, 'SP', { al: CE, b: /Setuju|Mengetahui/.test(l) }));
  if (img) {
    const im = tc.appendImage(blob_(img, 'ttd.png')), w = Number(c.TTD_LEBAR || 40) * MM, ow = im.getWidth(), oh = im.getHeight();
    im.setWidth(Math.round(w)).setHeight(Math.round(w * oh / ow));
    im.getParent().asParagraph().setAlignment(CE).setSpacingBefore(0).setSpacingAfter(0);
  } else { pa_(tc, '', c, 'SP'); pa_(tc, '', c, 'SP'); pa_(tc, '', c, 'SP'); }
  pa_(tc, nm, c, 'SP', { al: CE, b: 1, u: 1 });
  pa_(tc, 'NIP. ' + nip, c, 'SP', { al: CE });
  tc.removeChild(tc.getChild(0));
}
function kwDoc_(cell, cw, d, c) {
  const p = 'SP', H = DocumentApp.HorizontalAlignment, CE = H.CENTER, W = n => Math.round(cw * n);
  pa_(cell, 'PEMERINTAH KABUPATEN NGADA', c, p, { b: 1, al: CE });
  pa_(cell, 'TANDA BUKTI PEMBAYARAN', c, p, { b: 1, al: CE });
  pa_(cell, 'NOMOR BUKTI : ' + d.nomor, c, p, { b: 1, al: CE });
  bar_(cell, cw, 1.5);
  pa_(cell, '', c, p, { ls: 1.5 });
  pa_(cell, 'a)\tBendahara Pengeluaran pada Kantor Satuan Polisi Pamong Praja dan Kebakaran Kab, Ngada', c, p, { ls: 1.5, hang: 24 });
  tb_(cell, [
    ['', 'telah mengeluarkan uang sebesar', ':', ['Rp ' + rp_(d.total), true]],
    ['b)', 'Huruf', ':', d.huruf],
    ['c)', 'Kepada Nama', ':', d.kepada],
    ['', 'Alamat', ':', c.KOTA],
    ['d)', 'Sebagai pembayaran', ':', d.bayar]
  ], [24, 150, 12, cw - 186], c, p, false, 1.5);
  pa_(cell, 'Dengan rincian sebagai berikut :', c, p, { ls: 1.5 });
  const kw = KWI_W_.map(x => Math.round(cw * x)); kw[4] = cw - kw[0] - kw[1] - kw[2] - kw[3];
  const kiri = kw[0] + kw[1] + kw[2], VC = DocumentApp.VerticalAlignment.CENTER;
  tb_(cell, [['Kode Rekening', 'Jumlah'], [d.kode, [rpTitik_(d.total), true]]], [kiri, cw - kiri], c, p, true);
  pa_(cell, '', c, p);
  const item = i => [String(i.no), i.nama, i.hari + ' hari @Rp. ' + rp_(d.tarif), 'Rp ' + rp_(i.jumlah), ''];
  d.items.forEach((it, k) => { // satu kotak bergaris per pegawai; kotak pertama sekaligus memuat judul kolom
    const rows = (k ? [] : [[['No', true, CE], ['Nama', true, CE], ['Lama Perjalanan Dinas', true, CE], ['Jumlah', true, CE], ['Tanda Tangan', true, CE]]]).concat([item(it)]);
    const t = tb_(cell, rows, kw, c, p, true, 1, 10);
    if (!k) for (let j = 0; j < 5; j++) t.getCell(0, j).setPaddingTop(3).setPaddingBottom(3);
    for (let j = 0; j < 5; j++) { const tc = t.getCell(k ? 0 : 1, j).setVerticalAlignment(VC); if (!j) tc.getChild(0).asParagraph().setAlignment(CE); }
    pa_(cell, '', c, p);
  });
  tb_(cell, [[['Jumlah :', false, H.RIGHT], [rpTitik_(d.total), true]]], [kiri, cw - kiri], c, p, true);
  pa_(cell, 'e)\tTanggal dikeluarkan uang : ' + (d.tgl ? idn_(d.tgl) : ''), c, p, { ls: 1.5, hang: 24 });
  pa_(cell, '', c, p);
  const t = cell.appendTable([['', '']]).setBorderWidth(0).setColumnWidth(0, cw * 0.5).setColumnWidth(1, cw * 0.5);
  kwBlk_(t.getCell(0, 0), ['Setuju dibayar :', 'Pejabat Pelaksana Teknis Kegiatan'], d.pptkNama, d.pptkNip, c);
  kwBlk_(t.getCell(0, 1), ['Bajawa, ' + d.tglTxt, 'Bendahara Pengeluaran,'], c.KWI_BENDAHARA_NAMA, c.KWI_BENDAHARA_NIP, c);
  pa_(cell, '', c, p);
  const t2 = cell.appendTable([['', '', '']]).setBorderWidth(0).setColumnWidth(0, W(0.25)).setColumnWidth(1, W(0.5)).setColumnWidth(2, cw - W(0.75));
  noPad_(t2.getCell(0, 0)); noPad_(t2.getCell(0, 2));
  kwBlk_(t2.getCell(0, 1), ['Mengetahui :', 'Kuasa Pengguna Anggaran,'], c.KWI_KPA_NAMA, c.KWI_KPA_NIP, c, d.kpaImg);
  pa_(cell, '', c, p);
}
// ---------- Dokumen yang dapat diedit ----------
// ---------- DPA (Pagu, Jumlah/Realisasi, Sisa per Bidang) ----------
const BIDANG = ['Trantibum', 'Sekretariat', 'Linmas', 'Damkar'];
const DPA_BID_ = BIDANG.concat(['Pimpinan']); // halaman DPA: 4 bidang + kartu "Pimpinan" (Perjalanan Pimpinan)
function dpaSheet_() {
  const CANON = ['ID', 'Tahun', 'Bidang', 'SubKegiatan', 'KodeRekening', 'Jenis', 'Pagu'];
  let s = sh_('DPA');
  if (!s) {
    s = SpreadsheetApp.getActive().insertSheet('DPA'); s.appendRow(CANON); s.setFrozenRows(1);
    s.getRange('B:C').setNumberFormat('@'); s.getRange('E:F').setNumberFormat('@'); s.getRange('G:G').setNumberFormat('#,##0');
    return s;
  }
  const hd = s.getRange(1, 1, 1, Math.max(1, s.getLastColumn())).getValues()[0];
  if (!hd.includes('SubKegiatan') || !hd.includes('Jenis')) { // migrasi: dari struktur lama (satu Pagu per Bidang), atau dari Sub Kegiatan versi awal (belum ada Jenis Perjalanan)
    const old = rows_('DPA');
    s.clearContents();
    s.appendRow(CANON);
    old.forEach(x => {
      const pg = Number(x.Pagu) || 0;
      if (pg > 0 || x.KodeRekening || x.SubKegiatan) {
        const jenis = ['Dalam Kota', 'Luar Kota', 'Luar Daerah'].includes(x.Jenis) ? x.Jenis : 'Luar Kota';
        s.appendRow([x.ID || Utilities.getUuid(), String(x.Tahun), x.Bidang, String(x.SubKegiatan || 'Perjalanan Dinas Dalam Daerah'), String(x.KodeRekening || ''), jenis, pg]);
      }
    });
    s.setFrozenRows(1);
    s.getRange('B:C').setNumberFormat('@'); s.getRange('E:F').setNumberFormat('@'); s.getRange('G:G').setNumberFormat('#,##0');
  }
  return s;
}
function dpaCalc_(tahun, only) { // Jumlah = total biaya dari kwitansi yang sudah diatur, per bidang & tahun Surat Tugas; Pagu = total semua Sub Kegiatan bidang itu
  dpaSheet_();
  const pagu = rows_('DPA'), data = rows_('DATA_SPPD'), kw = kwRows_(), byST = grupST_(data); // dikelompokkan sekali per No. ST (lebih cepat untuk data banyak)
  const pimMap = new Map(pimRows_().map(q => [String(q.ID), q]));
  return DPA_BID_.filter(b => !only || b === only).map(b => {
    const subs = pagu.filter(x => String(x.Tahun) === String(tahun) && x.Bidang === b)
      .map(x => ({ id: String(x.ID || ''), nama: String(x.SubKegiatan || ''), kode: String(x.KodeRekening || ''), jenis: String(x.Jenis || 'Luar Kota'), pagu: Number(x.Pagu) || 0 }));
    const p = subs.reduce((a, s) => a + s.pagu, 0);
    let jml = 0, n = 0;
    kw.forEach(k => {
      if (String(k.NoST).indexOf('PIM:') === 0) { // Kwitansi Surat Tugas Pimpinan: tarif x lama (1 petugas), masuk kartu Pimpinan
        const pr = pimMap.get(String(k.NoST).slice(4));
        if (b === 'Pimpinan' && pr && String(pr.TglST).slice(0, 4) === String(tahun)) { jml += Number(k.Tarif) * (Number(pr.Lama) || 0); n++; }
        return;
      }
      const rs = byST.get(k.NoST) || [];
      if (!rs.length || rs[0].Bidang !== b || String(rs[0].TglST).slice(0, 4) !== String(tahun)) return;
      jml += Number(k.Tarif) * rs.reduce((a, x) => a + Number(x.Lama), 0); n++;
    });
    return { Bidang: b, Pagu: p, Jumlah: jml, Sisa: p - jml, ST: n, Kode: subs[0] ? subs[0].kode : '', Subs: subs };
  });
}
function dpaGet(t, tahun) { // baca saja, untuk dashboard & halaman Pengajuan Pencairan - hasil disimpan sementara (cache berversi, otomatis baru saat data berubah)
  const bd = bidDpa_(auth_(t, true));
  return cacheFn_('dpaG_' + cacheVer_('data') + '_' + tahun + '_' + (bd || 'SEMUA'), 300, () => dpaCalc_(tahun, bd));
}
function cacheFn_(key, ttl, fn) { const c = cacheGet_(key); if (c != null) return c; const v = fn(); cachePut_(key, v, ttl); return v; } // ambil dari cache, kalau belum ada hitung lalu simpan
function getDpa(t, tahun) { return dpaCalc_(tahun, bidDpa_(auth_(t, true))); } // baca saja, untuk halaman Kelola DPA

// ---------- Pengajuan Pencairan Perjalanan Dinas (Admin mengajukan, Kasubag Keuangan/Super Admin menyetujui/menolak) ----------
function pengajuanSheet_() {
  let s = sh_('PENGAJUAN');
  if (!s) {
    s = SpreadsheetApp.getActive().insertSheet('PENGAJUAN');
    s.appendRow(['ID', 'TglAjukan', 'Bidang', 'NoSTList', 'Jumlah', 'Status', 'Catatan', 'DiajukanOleh', 'TglProses', 'DiprosesOleh']);
    s.setFrozenRows(1);
    s.getRange('B:D').setNumberFormat('@');
  }
  return s;
}
function pengajuanRows_() { pengajuanSheet_(); return rows_('PENGAJUAN'); }
function pengajuanTerpakai_() { // NoST yang sudah termasuk pengajuan aktif (Diajukan/Disetujui) - tidak boleh diajukan ulang; yang Ditolak boleh diajukan lagi
  const set = new Set();
  pengajuanRows_().forEach(p => { if (p.Status !== 'Ditolak') String(p.NoSTList || '').split('|').filter(Boolean).forEach(k => set.add(k)); });
  return set;
}
function pengajuanHitung_(noSTList) { // {jumlah, rincian:[{noST,tglST,bidang,tujuan,maksud,jumlahPetugas,jenis,tarif,pegawai:[{nama,lama,total}],total}]}
  const data = rows_('DATA_SPPD'), kw = kwRows_(), byST = grupST_(data), kwST = pertamaST_(kw);
  let jumlah = 0;
  const rincian = noSTList.map(noST => {
    const rs = byST.get(noST) || [], k = kwST.get(noST);
    if (!rs.length) throw new Error('Surat Tugas ' + noST + ' tidak ditemukan.');
    if (!k) throw new Error('Kwitansi untuk Surat Tugas ' + noST + ' belum diatur.');
    const tarif = Number(k.Tarif);
    const pegawai = rs.map(r => ({ nama: r.Nama, lama: Number(r.Lama), total: Number(r.Lama) * tarif }));
    const total = pegawai.reduce((a, p) => a + p.total, 0);
    jumlah += total;
    return { noST, tglST: rs[0].TglST, bidang: rs[0].Bidang, tujuan: rs[0].Tujuan, maksud: rs[0].Maksud, jumlahPetugas: rs.length, jenis: k.Jenis, tarif, pegawai, total };
  });
  return { jumlah, rincian };
}
function pencairanEligible(t) { // Admin: Surat Tugas bidangnya yang Kwitansinya sudah diatur & belum dipakai di pengajuan aktif
  const u = auth_(t, true);
  if (u.role !== 'Admin') throw new Error('Hanya Admin yang dapat mengajukan Pencairan Perjalanan Dinas.');
  const bd = bid_(u);
  return cacheFn_('ajuE_' + cacheVer_('data') + '_' + bd, 300, () => pencairanEligible_(bd));
}
function pencairanEligible_(bd) {
  const terpakai = pengajuanTerpakai_(), kwSet = new Set(kwRows_().map(q => q.NoST));
  const keys = [...new Set(rows_('DATA_SPPD').filter(x => x.Bidang === bd).map(x => x.NoST))].filter(k => !terpakai.has(k) && kwSet.has(k));
  return pengajuanHitung_(keys).rincian.sort((a, b) => String(b.tglST).localeCompare(String(a.tglST)));
}
function pengajuanAjukan(t, noSTList) { // Admin mengajukan satu atau beberapa Surat Tugas sekaligus untuk dicairkan
  const u = auth_(t, true);
  if (u.role !== 'Admin') throw new Error('Hanya Admin yang dapat mengajukan Pencairan Perjalanan Dinas.');
  if (!Array.isArray(noSTList) || !noSTList.length) throw new Error('Pilih minimal satu Surat Tugas.');
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    const bd = bid_(u), data = rows_('DATA_SPPD'), terpakai = pengajuanTerpakai_();
    const dup = noSTList.filter(k => terpakai.has(k));
    if (dup.length) throw new Error('Surat Tugas ' + dup.join(', ') + ' sudah termasuk pengajuan lain.');
    const info = noSTList.map(k => { const r = data.find(x => x.NoST === k); if (!r) throw new Error('Surat Tugas ' + k + ' tidak ditemukan.'); if (r.Bidang !== bd) throw new Error('Surat Tugas ' + k + ' bukan milik bidang Anda.'); return r; });
    const tahunSet = new Set(info.map(r => String(r.TglST).slice(0, 4)));
    if (tahunSet.size > 1) throw new Error('Pilih Surat Tugas dari tahun anggaran yang sama dalam satu pengajuan.');
    const tahun = [...tahunSet][0];
    const { jumlah } = pengajuanHitung_(noSTList);
    const sisa = dpaCalc_(tahun, bd)[0].Sisa;
    if (sisa < 0) throw new Error('Pengajuan ditolak: realisasi Perjalanan Dinas Bidang ' + bd + ' tahun ' + tahun + ' sudah melebihi Pagu DPA sebesar Rp ' + Math.abs(Math.round(sisa)).toLocaleString('id-ID') + '. Tambahkan Pagu DPA terlebih dahulu.');
    const id = Utilities.getUuid();
    pengajuanSheet_().appendRow([id, today_(), bd, noSTList.join('|'), jumlah, 'Diajukan', '', u.nama, '', '']);
    cacheBump_('data');
    logAksi_(u, 'Ajukan Pencairan Perjalanan Dinas', bd + ' - ' + noSTList.length + ' Surat Tugas, Rp ' + Math.round(jumlah).toLocaleString('id-ID'));
    return { id };
  } finally { L.releaseLock(); }
}
function pengajuanList(t) { // Admin: hanya bidangnya sendiri; Kasubag Keuangan/Super Admin: semua bidang
  const u = auth_(t, true), bd = bid_(u);
  if (!['Admin', 'Kasubag Keuangan', 'Super Admin'].includes(u.role)) throw new Error('Anda tidak memiliki izin untuk melihat Pengajuan Pencairan.');
  return cacheFn_('ajuL_' + cacheVer_('data') + '_' + (bd || 'SEMUA'), 300, () => pengajuanList_(bd));
}
function pengajuanList_(bd) {
  let rows = pengajuanRows_();
  if (bd) rows = rows.filter(x => x.Bidang === bd);
  const jam = jamProses_(rows);
  // paling baru di atas: urut tanggal pengajuan, lalu jam pengajuan (baris sheet yang lebih bawah = diajukan lebih akhir)
  return rows.slice().sort((a, b) => String(b.TglAjukan).localeCompare(String(a.TglAjukan)) || b._r - a._r).map(x => ({
    id: x.ID, tglAjukan: x.TglAjukan, bidang: x.Bidang, noSTList: String(x.NoSTList || '').split('|').filter(Boolean),
    jumlah: Number(x.Jumlah), status: x.Status, catatan: x.Catatan, diajukanOleh: x.DiajukanOleh, tglProses: x.TglProses, diprosesOleh: x.DiprosesOleh, jamProses: jam[x.ID] || ''
  }));
}
function jamProses_(rows) { // jam pengajuan disetujui/ditolak - dicocokkan dari catatan Log Aktivitas (tanggal, aksi, bidang, nominal, catatan sama)
  const s = sh_('LOG'), out = {};
  if (!s) return out;
  const v = s.getDataRange().getValues(); v.shift();
  const logs = v.filter(r => r[3] === 'Setujui Pencairan Perjalanan Dinas' || r[3] === 'Tolak Pencairan Perjalanan Dinas')
    .map(r => ({ w: r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd HH:mm') : String(r[0]), a: r[3], d: String(r[4]) }));
  rows.filter(p => p.Status === 'Disetujui' || p.Status === 'Ditolak').slice().sort((a, b) => a._r - b._r).forEach(p => {
    const a = p.Status === 'Disetujui' ? 'Setujui Pencairan Perjalanan Dinas' : 'Tolak Pencairan Perjalanan Dinas', ct = String(p.Catatan || '').trim();
    const det = p.Bidang + ' - Rp ' + Math.round(Number(p.Jumlah)).toLocaleString('id-ID') + (ct ? ' (' + ct + ')' : '');
    const i = logs.findIndex(l => l.a === a && l.d === det && l.w.slice(0, 10) === String(p.TglProses));
    if (i >= 0) { out[p.ID] = logs[i].w.slice(11, 16).replace(':', '.'); logs.splice(i, 1); }
  });
  return out;
}
function pengajuanRincian(t, id) { // detail per Surat Tugas untuk satu pengajuan (dipakai tombol "Lihat Rincian")
  const u = auth_(t, true), p = pengajuanRows_().find(x => x.ID === id);
  if (!p) throw new Error('Pengajuan tidak ditemukan.');
  if (bid_(u) && bid_(u) !== p.Bidang) throw new Error('Anda tidak memiliki izin melihat pengajuan ini.');
  return pengajuanHitung_(String(p.NoSTList || '').split('|').filter(Boolean)).rincian;
}
function pengajuanProses(t, id, setuju, catatan) { // Kasubag Keuangan/Super Admin: setujui atau tolak (tolak wajib disertai catatan alasan)
  const u = auth_(t, true);
  if (!['Kasubag Keuangan', 'Super Admin'].includes(u.role)) throw new Error('Anda tidak memiliki izin memproses Pengajuan Pencairan.');
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    const p = pengajuanRows_().find(x => x.ID === id);
    if (!p) throw new Error('Pengajuan tidak ditemukan.');
    if (p.Status !== 'Diajukan') throw new Error('Pengajuan ini sudah diproses sebelumnya (' + p.Status + ').');
    if (!setuju && !String(catatan || '').trim()) throw new Error('Catatan alasan penolakan wajib diisi.');
    const s = sh_('PENGAJUAN');
    s.getRange(p._r, 6, 1, 2).setValues([barisAman_([setuju ? 'Disetujui' : 'Ditolak', String(catatan || '').trim()])]);
    s.getRange(p._r, 9, 1, 2).setValues([[today_(), u.nama]]);
    cacheBump_('data');
    logAksi_(u, setuju ? 'Setujui Pencairan Perjalanan Dinas' : 'Tolak Pencairan Perjalanan Dinas', p.Bidang + ' - Rp ' + Math.round(Number(p.Jumlah)).toLocaleString('id-ID') + (catatan ? ' (' + catatan + ')' : ''));
    return true;
  } finally { L.releaseLock(); }
}
function saveDpaSub(t, tahun, bidang, subs) { // subs: [{id,nama,kode,jenis,pagu}] - ganti seluruh baris Sub Kegiatan milik bidang & tahun ini (bebas tambah/hapus)
  const u = auth_(t, true);
  if (u.role === 'Kasubag Keuangan') throw new Error('Kasubag Keuangan hanya dapat melihat DPA, tidak dapat mengubahnya.');
  if (PIMPINAN_.includes(u.role)) throw new Error(u.role + ' hanya dapat melihat DPA, tidak dapat mengubahnya.');
  if (bid_(u) && bid_(u) !== bidang) throw new Error('Anda hanya dapat mengubah DPA bidang ' + bid_(u) + '.');
  if (!DPA_BID_.includes(bidang)) throw new Error('Bidang tidak valid.');
  const JENIS_OK = ['Dalam Kota', 'Luar Kota', 'Luar Daerah'];
  const list = (Array.isArray(subs) ? subs : []).map(s => {
    const nama = String(s.nama || '').trim(), kode = String(s.kode || '').trim().slice(0, 100), pg = Number(s.pagu), jenis = JENIS_OK.includes(s.jenis) ? s.jenis : 'Luar Kota';
    if (!nama) throw new Error('Nama Sub Kegiatan wajib diisi.');
    if (/^[=+\-@\t\r]/.test(nama)) throw new Error('Nama Sub Kegiatan "' + nama + '" tidak valid.');
    if (!(pg >= 0)) throw new Error('Pagu Sub Kegiatan "' + nama + '" tidak valid.');
    if (kode && !/^[0-9 .\-]*$/.test(kode)) throw new Error('Kode rekening "' + nama + '" hanya boleh berisi angka, spasi, titik, dan strip.');
    return { id: String(s.id || '') || Utilities.getUuid(), nama: nama, kode: kode, jenis: jenis, pagu: pg };
  });
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    const s = dpaSheet_();
    rows_('DPA').filter(x => String(x.Tahun) === String(tahun) && x.Bidang === bidang).sort((a, b) => b._r - a._r).forEach(r => s.deleteRow(r._r));
    list.forEach(x => s.appendRow([x.id, String(tahun), bidang, x.nama, x.kode, x.jenis, x.pagu]));
    cacheBump_('data');
    logAksi_(u, 'Simpan DPA', 'Bidang: ' + bidang + ', Tahun: ' + tahun + ' (' + list.length + ' sub kegiatan)');
    return dpaCalc_(tahun, bid_(u));
  } finally { L.releaseLock(); }
}

// ---------- LAPORAN PERJALANAN DINAS ----------
function lapRows_() {
  let s = sh_('LAPORAN');
  if (!s) { s = SpreadsheetApp.getActive().insertSheet('LAPORAN'); s.appendRow(['NoST', 'Kegiatan', 'Hasil', 'Kesimpulan', 'Tanggal']); s.setFrozenRows(1); s.getRange('A:A').setNumberFormat('@'); s.getRange('E:E').setNumberFormat('@'); }
  return rows_('LAPORAN');
}
function saveLap(t, f) {
  const u = auth_(t, true); own_(u, f.noST);
  const ex = lapRows_().find(x => x.NoST === f.noST), row = [f.noST, f.kegiatan || '', f.hasil || '', f.kesimpulan || '', f.tgl || ''];
  if (ex) sh_('LAPORAN').getRange(ex._r, 1, 1, 5).setValues([barisAman_(row)]); else sh_('LAPORAN').appendRow(barisAman_(row));
  cacheBump_('data');
  logAksi_(u, 'Simpan Laporan Perjalanan Dinas', 'No. ST: ' + f.noST);
  return true;
}
function lapData_(key, c) { // nama pegawai, nomor SPPD, maksud & tujuan langsung dari Surat Tugas
  const r = pimRowsKey_(key, c) || rows_('DATA_SPPD').filter(x => x.NoST === key);
  if (!r.length) throw new Error('Data tidak ditemukan.');
  const l = lapRows_().find(x => x.NoST === key);
  if (!l) throw new Error('Atur isi laporan terlebih dahulu.');
  c.LOGO = logoUri_('LOGO_DOKUMEN');
  const x = r[0], dasar = (String(key).indexOf('PIM:') === 0 ? 'Nomor Surat Tugas (ST) Sekretariat Daerah Kabupaten Ngada Nomor : ' : 'Nomor Surat Tugas (ST) Kepala Satuan Polisi Pamong Praja dan Kebakaran Kabupaten Ngada Nomor : ') + x.NoST
    + ' dan Surat Perjalanan Dinas (SPD) masing-masing dengan Nomor :\n' + r.map((q, i) => (i + 1) + '.  ' + q.NoSPPD + '  An. ' + q.Nama).join('\n');
  return { r: r, x: x, l: l, dasar: dasar, names: r.map(q => q.Nama),
    sppd: r.map((q, i) => ({ no: (i + 1) + '.', nomor: String(q.NoSPPD), nama: String(q.Nama) })), // DASAR rata kolom: No | Nomor SPPD | An. | Nama
    tglTxt: l.Tanggal ? idn_(l.Tanggal) : '....... / ....... / ' + String(x.TglST).slice(0, 4) };
}
function lapRowsSpec_(d) {
  return [['I', 'DASAR', d.dasar], ['II', 'MAKSUD & TUJUAN', d.x.Maksud], ['III', 'KEGIATAN YANG DILAKSANAKAN', '- ' + d.l.Kegiatan],
    ['IV', 'HASIL YANG DICAPAI', '- ' + d.l.Hasil], ['V', 'KESIMPULAN DAN SARAN', '- ' + d.l.Kesimpulan],
    ['VI', 'PENUTUP', 'Demikian laporan ini dibuat untuk diketahui dan menjadi urusan selanjutnya']];
}
// Daftar "Yang Melaksanakan Perjalanan Dinas": kotak bergaris per pegawai [No | Nama | kolom tanda tangan], 2 pegawai per baris,
// tiap baris jadi tabel tersendiri dengan jarak di antaranya; baris terakhir yang ganjil hanya berisi satu kotak (setengah lebar).
const LAP_W_ = [0.07, 0.55, 0.38]; // proporsi lebar kolom No / Nama / Tanda Tangan dalam satu kotak pegawai
function lapHtml_(d, c) {
  const nl = s => String(s).replace(/\n/g, '<br>'), w = LAP_W_.map(x => (x * 50).toFixed(1) + '%');
  const kotak = (n, i, w2) => '<td class="c" style="width:' + w2[0] + ';vertical-align:middle">' + (i + 1) + '</td><td style="width:' + w2[1] + ';vertical-align:middle">' + n + '</td><td style="width:' + w2[2] + '"></td>';
  let grid = '';
  for (let i = 0; i < d.names.length; i += 2) {
    const dua = i + 1 < d.names.length, w2 = dua ? w : LAP_W_.map(x => (x * 100).toFixed(1) + '%');
    grid += '<table class="b" style="width:' + (dua ? '100%' : '50%') + ';margin-top:14px"><tr style="height:38px">' + kotak(d.names[i], i, w2) + (dua ? kotak(d.names[i + 1], i + 1, w2) : '') + '</tr></table>';
  }
  // baris nomor SPPD + nama di DASAR: satu baris saja - bila nama panjang, huruf baris itu saja yang dikecilkan otomatis (tidak turun ke baris baru)
  // DASAR rata kolom: nomor urut rata kanan, Nomor SPPD, "An." & nama masing-masing lurus satu kolom; semua huruf sama besar (nama panjang boleh turun baris di kolomnya sendiri)
  const fz = 'font-size:' + (Math.round((Number(c.UKURAN_ST) || 12) * 0.92 * 2) / 2) + 'pt;', td0 = 'vertical-align:top;padding:0 0 1px 0;' + fz; // satu ukuran huruf (92%) untuk seluruh daftar
  const dsr = t => String(t).split('\n')[0].replace(/\n/g, '<br>') + '<table style="border-collapse:collapse;margin-top:1px;width:100%">' + (d.sppd || []).map(q => '<tr><td style="' + td0 + 'text-align:right;padding-right:6px;white-space:nowrap;width:1%">' + q.no + '</td><td style="' + td0 + 'white-space:nowrap;width:1%">' + q.nomor + '</td><td style="' + td0 + 'padding-left:10px;padding-right:6px;white-space:nowrap;width:1%">An.</td><td style="' + td0 + '">' + q.nama + '</td></tr>').join('') + '</table>'; // nama panjang turun baris di kolomnya sendiri
  const fit = '<script>(function(){function f(){document.querySelectorAll(".fit").forEach(function(e){e.style.fontSize="";var s=parseFloat(getComputedStyle(e).fontSize),m=s*0.6;while(e.scrollWidth>e.clientWidth+1&&s>m){s-=0.25;e.style.fontSize=s+"px"}})}f();addEventListener("load",f);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(f)})()</script>';
  return kop_(c) + '<div class="c" style="margin:8px 0"><b>LAPORAN<br><u>PERJALANAN DINAS</u></b></div><table width="100%" style="line-height:1.3;table-layout:fixed">'
    + lapRowsSpec_(d).map((r, i) => '<tr><td width="30"><b>' + r[0] + '</b></td><td width="160"><b>' + r[1] + '</b></td><td width="12">:</td><td>' + (i === 0 ? dsr(r[2]) : nl(r[2])) + '</td></tr>').join('')
    + '</table><div style="text-align:right;margin-top:10px">Bajawa, ' + d.tglTxt + '</div><div class="c" style="margin-top:10px"><u>Yang Melaksanakan Perjalanan Dinas :</u></div>' + grid + fit;
}
function lapXlsx(t, key) { // Laporan Perjalanan Dinas: Export Excel (susunan sama dengan PDF: kop + logo, bagian I-VI, DASAR rata kolom, tanggal, kotak tanda tangan pegawai 2 per baris)
  const u = auth_(t, true); own_(u, key);
  const c = cfg_(), d = lapData_(key, c), ss = SpreadsheetApp.create('tmp_laporan_' + Date.now()), id = ss.getId();
  try {
    // kolom halus (px) supaya semua lurus: bagian laporan [No | Judul | : | Isi], DASAR [No | Nomor SPPD | An. | Nama], kotak pegawai [No | Nama | Tanda tangan] x 2
    // bagian: c1=No, c2=Judul, c3=:, c4-c11=Isi | DASAR: c4-c5=No, c6-c8=Nomor SPPD, c9=An., c10-c11=Nama | pegawai: c1 | c2-c4 | c5-c6 , c7 | c8-c10 | c11
    const sh = ss.getSheets()[0].setName('Laporan'), W = [28, 152, 12, 8, 22, 106, 28, 96, 24, 52, 128], N = W.length, S = SpreadsheetApp.BorderStyle, K = '#000000', fs = 11;
    // DASAR: satu ukuran huruf utk seluruh daftar (9-11) supaya Nomor SPPD + Nama muat; batas kolom Nomor|An.|Nama digeser sesuai panjang nomor SPPD
    const pN = Math.max(...d.sppd.map(q => q.nomor.length)), pA = Math.max(...d.sppd.map(q => q.nama.length));
    const fd = Math.min(fs, Math.max(9, Math.floor(400 / ((pN + pA) * 1.333 * 0.47) * 2) / 2)), wNomor = Math.min(270, Math.max(160, Math.ceil(pN * fd * 1.333 * 0.46) + 10));
    W[7] = wNomor - 134; W[9] = 528 - (222 + wNomor + 24); // kotak pegawai kanan (c8-c10) tetap 172 px
    W.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    const tinggi = 30 + d.sppd.length + Math.ceil(d.names.length / 2) * 2 + 20;
    if (sh.getMaxRows() < tinggi) sh.insertRowsAfter(sh.getMaxRows(), tinggi - sh.getMaxRows());
    sh.getRange(1, 1, tinggi, N).setFontFamily(c.FONT || 'Arial').setFontSize(fs).setVerticalAlignment('middle').setFontColor(K);
    sh.setHiddenGridlines(true);
    const sel = (row, c1, c2, v, o) => { o = o || {}; const g = sh.getRange(row, c1, 1, c2 - c1 + 1); if (c2 > c1) g.merge(); g.setValue(rumusAman_(String(v == null ? '' : v))); if (o.b) g.setFontWeight('bold'); if (o.u) g.setFontLine('underline'); if (o.i) g.setFontStyle('italic'); if (o.fs) g.setFontSize(o.fs); g.setHorizontalAlignment(o.al || 'left'); if (o.wrap) g.setWrap(true); if (o.top) g.setVerticalAlignment('top'); return g; };
    const px = (c1, c2) => W.slice(c1 - 1, c2).reduce((a, b) => a + b, 0), muat = (teks, lebar, f, k) => Math.max(1, String(teks).split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / Math.floor((lebar - 6) / (f * 1.333 * (k || 0.5))))), 0)); // perkiraan jumlah baris teks dibungkus
    // KOP: logo di kiri, teks di tengah, garis tebal di bawah
    sel(1, 1, N, 'PEMERINTAH KABUPATEN NGADA', { al: 'center', fs: 13 });
    sel(2, 1, N, 'SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', { al: 'center', fs: 14, b: 1 });
    sel(3, 1, N, 'Jln. Soekarno – Hatta No.1 Tlp. (0384) 2200019, Email.satpolppngada3@gmail.com', { al: 'center', fs: 8, i: 1 });
    sel(4, 1, N, 'B A J A W A', { al: 'center', fs: 13, b: 1 });
    [20, 24, 15, 22].forEach((h, i) => sh.setRowHeight(i + 1, h));
    sh.getRange(4, 1, 1, N).setBorder(null, null, true, null, null, null, K, S.SOLID_THICK);
    if (c.LOGO) { try { sh.insertImage(blob_(c.LOGO, 'logo.png'), 1, 1, 4, 3).setWidth(70).setHeight(72); } catch (e) {} }
    let r = 6;
    sel(r++, 1, N, 'LAPORAN', { al: 'center', b: 1, fs: 12 });
    sel(r++, 1, N, 'PERJALANAN DINAS', { al: 'center', b: 1, u: 1, fs: 12 });
    r++;
    const judul = (row, q) => { sel(row, 1, 1, q[0], { b: 1, top: 1 }); sel(row, 2, 2, q[1], { b: 1, top: 1, wrap: 1 }); sel(row, 3, 3, ':', { top: 1, al: 'center' }); return muat(q[1], px(2, 2), fs, 0.6); }; // judul tebal: huruf lebih lebar
    lapRowsSpec_(d).forEach((q, qi) => {
      if (qi === 0) { // DASAR rata kolom: paragraf pembuka, lalu tiap SPPD 1 baris [No | Nomor SPPD | An. | Nama]; huruf sama besar, nama panjang turun baris di kolomnya
        const awal = String(q[2]).split('\n')[0];
        const bj = judul(r, q); sel(r, 4, N, awal, { wrap: 1, top: 1 }); sh.setRowHeight(r, Math.max(bj, muat(awal, px(4, N), fs)) * 18 + 4); r++;
        d.sppd.forEach((x, k) => {
          sel(r, 4, 5, x.no, { al: 'right', fs: fd, top: 1 }); sel(r, 6, 8, x.nomor, { fs: fd, top: 1 }); sel(r, 9, 9, 'An.', { al: 'center', fs: fd, top: 1 }); sel(r, 10, N, x.nama, { fs: fd, wrap: 1, top: 1 });
          sh.setRowHeight(r, muat(x.nama, px(10, N), fd, 0.64) * 15 + 3 + (k === d.sppd.length - 1 ? 4 : 0)); r++; // nama huruf kapital: lebih lebar // baris terakhir diberi jarak sedikit ke bagian II
        });
        return;
      }
      const isi = String(q[2] == null ? '' : q[2]), bj = judul(r, q);
      sel(r, 4, N, isi, { wrap: 1, top: 1 });
      sh.setRowHeight(r, Math.max(bj, muat(isi, px(4, N), fs)) * 18 + 8); r++;
    });
    r++;
    sel(r++, 4, N, 'Bajawa, ' + d.tglTxt, { al: 'right' });
    r++;
    sel(r++, 1, N, 'Yang Melaksanakan Perjalanan Dinas :', { al: 'center', u: 1 });
    // KOTAK PEGAWAI: [No | Nama | Tanda tangan], 2 per baris; pegawai terakhir yang ganjil = satu kotak di kiri
    const kotak = (row, c1, c2) => sh.getRange(row, c1, 1, c2 - c1 + 1).setBorder(true, true, true, true, null, null, K, S.SOLID);
    for (let i = 0; i < d.names.length; i += 2) {
      r++; sh.setRowHeight(r - 1, 10);
      sel(r, 1, 1, i + 1, { al: 'center' }); sel(r, 2, 4, d.names[i], { wrap: 1 }); sel(r, 5, 6, ''); kotak(r, 1, 1); kotak(r, 2, 4); kotak(r, 5, 6);
      if (i + 1 < d.names.length) { sel(r, 7, 7, i + 2, { al: 'center' }); sel(r, 8, 10, d.names[i + 1], { wrap: 1 }); sel(r, 11, 11, ''); kotak(r, 7, 7); kotak(r, 8, 10); kotak(r, 11, 11); }
      const bn = Math.max(muat(d.names[i], px(2, 4), fs, 0.64), muat(d.names[i + 1] || '', px(8, 10), fs, 0.64)); // nama panjang: kotak ikut lebih tinggi
      sh.setRowHeight(r, Math.max(38, bn * 17 + 6)); r++;
    }
    const akhir = r;
    if (sh.getMaxColumns() > N) sh.deleteColumns(N + 1, sh.getMaxColumns() - N);
    if (sh.getMaxRows() > akhir) sh.deleteRows(akhir + 1, sh.getMaxRows() - akhir);
    SpreadsheetApp.flush();
    let x = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel Laporan belum berhasil dibuat, silakan klik Excel sekali lagi.');
    try { x = xlsxCetak_(x, c, 'portrait'); } catch (e) {}
    logAksi_(u, 'Export Excel', 'Laporan Perjalanan Dinas No. ST: ' + key);
    return { name: 'Laporan_Perjalanan_Dinas_' + d.x.TglST + '.xlsx', b64: Utilities.base64Encode(x) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function lapDoc_(cell, cw, d, c) {
  const p = 'ST', H = DocumentApp.HorizontalAlignment, CE = H.CENTER, B = x => [x, true];
  kopDoc_(cell, cw, c, p);
  pa_(cell, '', c, p);
  pa_(cell, 'LAPORAN', c, p, { b: 1, al: CE, k: 1.1 });
  pa_(cell, 'PERJALANAN DINAS', c, p, { b: 1, u: 1, al: CE, k: 1.1 });
  pa_(cell, '', c, p);
  const tl = tb_(cell, lapRowsSpec_(d).map(r => [B(r[0]), B(r[1]), ':', r[2]]), [28, 150, 12, cw - 190], c, p, false, 1.25, 3);
  try { // DASAR rata kolom: paragraf pembuka, lalu tabel tanpa garis [No | Nomor SPPD | An. | Nama]; huruf sama besar, nama panjang turun baris di kolomnya
    const tc = tl.getCell(0, 3), fs = Number(c['UKURAN_' + p]) || 12, lebar = cw - 190 - 6, rata = /narrow/i.test(c.FONT || '') ? 0.47 : 0.55;
    const pN = Math.max(...d.sppd.map(q => q.nomor.length)), pA = Math.max(...d.sppd.map(q => q.nama.length));
    const ruang = lebar - (String(d.sppd.length).length * 0.6 + 0.5 + 1.6) * fs - 26; // lebar tersisa untuk Nomor SPPD + Nama
    const fl = Math.min(fs, Math.max(Math.round(fs * 0.82 * 2) / 2, Math.floor(fs * ruang / ((pN + pA) * fs * rata) * 2) / 2)); // satu ukuran huruf utk seluruh daftar
    const wNo = Math.ceil(String(d.sppd.length).length * fl * 0.6 + fl * 0.5) + 6, wAn = Math.ceil(fl * 1.6) + 8;
    const wNomor = Math.min(Math.ceil(pN * fl * rata) + 8, Math.round(lebar * 0.55)), wNama = lebar - wNo - wNomor - wAn;
    const nt = tb_(tc, d.sppd.map(q => [q.no, q.nomor, 'An.', q.nama]), [wNo, wNomor, wAn, wNama], c, p, false, 1.15, 0.5);
    nt.editAsText().setFontSize(fl);
    for (let k = 0; k < d.sppd.length; k++) { nt.getCell(k, 0).getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT); [0, 1, 2, 3].forEach(j => nt.getCell(k, j).setPaddingLeft(j === 0 ? 0 : 2).setPaddingRight(j === 0 ? 4 : 2)); }
    const ti = tc.getChildIndex(nt); for (let k = ti - 1; k >= 1; k--) tc.removeChild(tc.getChild(k)); // buang baris SPPD versi lama (teks), sisakan paragraf pembuka
    tc.getChild(0).asParagraph().setText(String(d.dasar).split('\n')[0]);
    const ak = tc.getChild(tc.getNumChildren() - 1); if (ak.getType() === DocumentApp.ElementType.PARAGRAPH && ak.asParagraph().getText() === '') ak.asParagraph().editAsText().setFontSize(1); // paragraf wajib setelah tabel: dikecilkan
  } catch (e) {}
  pa_(cell, '', c, p);
  pa_(cell, 'Bajawa, ' + d.tglTxt, c, p, { al: H.RIGHT });
  pa_(cell, '', c, p);
  pa_(cell, 'Yang Melaksanakan Perjalanan Dinas :', c, p, { u: 1, al: CE });
  pa_(cell, '', c, p);
  const n = d.names, half = Math.floor(cw / 2), w1 = Math.round(half * LAP_W_[0]), w2 = Math.round(half * LAP_W_[1]), w3 = half - w1 - w2;
  for (let i = 0; i < n.length; i += 2) { // satu tabel bergaris per baris (2 pegawai), dipisah paragraf kosong
    const dua = i + 1 < n.length;
    const row = [String(i + 1), n[i], ''].concat(dua ? [String(i + 2), n[i + 1], ''] : []);
    const t = tb_(cell, [row], dua ? [w1, w2, w3, w1, w2, w3] : [w1, w2, w3], c, p, true, 1, 10);
    for (let j = 0; j < row.length; j++) { const tc = t.getCell(0, j).setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER); if (j % 3 === 0) tc.getChild(0).asParagraph().setAlignment(CE); }
    pa_(cell, '', c, p);
  }
}
function lapDoc2_(c, d) { // dokumen laporan (Google Docs)
  const doc = DocumentApp.create('Laporan Perjalanan Dinas ' + d.x.TglST), body = doc.getBody(), pz = PAPER[c.KERTAS] || PAPER.Legal;
  body.clear();
  body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
    .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
  sect_(body, c, 'ST', true, (cell, cw) => lapDoc_(cell, cw, d, c));
  return doc;
}
function resetPass(t, user, pass) { // Super Admin: atur ulang kata sandi pengguna
  auth_(t, 2);
  if (String(pass).length < 6) throw new Error('Kata sandi minimal 6 karakter.');
  const r = rows_('USERS').find(x => String(x.Username) === String(user));
  if (!r) throw new Error('Pengguna tidak ditemukan.');
  sh_('USERS').getRange(r._r, 2).setValue(hash_(pass));
  cacheBump_('data');
  return true;
}

// ---------- Endpoint dokumen (Surat Tugas, SPPD, Kwitansi, Laporan) ----------
function pack_(html) { // KECEPATAN pratinjau: logo & TTD yang sama dikirim SEKALI saja lalu dipasang ulang oleh browser ke setiap halaman
  // (sebelumnya setiap halaman SPPD membawa salinan gambarnya sendiri - untuk banyak pegawai ukurannya bisa berlipat-lipat MB)
  const list = [];
  html = html.replace(/src="(data:[^"]{300,})"/g, (_, u) => { let i = list.indexOf(u); if (i < 0) { i = list.length; list.push(u); } return 'data-pk="' + i + '"'; });
  if (!list.length) return html;
  const js = '<script>(function(){var u=' + JSON.stringify(list) + ';document.querySelectorAll("img[data-pk]").forEach(function(m){m.src=u[+m.getAttribute("data-pk")]})})()</script>';
  return /<\/body>\s*$/.test(html) ? html.replace(/<\/body>\s*$/, js + '</body>') : html + js;
}
function preview(t, key) { // pratinjau: Surat Tugas + semua SPPD, tampil sebagai lembar A4
  own_(auth_(t, true), key);
  const c = cfg_(), s = sections_(key, c), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return pack_('<body style="background:#cfd8d3;margin:0;padding:10px">' + s.map(h =>
    '<div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div>').join('') + '</body>');
}
function pdf(t, key) { // satu file PDF: Surat Tugas lalu SPPD setiap pegawai
  own_(auth_(t, true), key);
  const c = cfg_(), r = prep_(key, c), doc = DocumentApp.create('tmp_register_sppd_' + Date.now()), id = doc.getId();
  try {
    buildDoc_(doc, r, c);
    doc.saveAndClose();
    const b = DriveApp.getFileById(id).getAs('application/pdf');
    return { name: 'Surat_Tugas_dan_SPPD_' + r[0].TglST + '.pdf', b64: Utilities.base64Encode(b.getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function previewST(t, key) { // pratinjau: Surat Tugas saja (tanpa SPPD) - supaya unduhan/cetak lebih ringan
  own_(auth_(t, true), key);
  const c = cfg_(), r = escDeep_(prep_(key, c)); ttdST_(c); const s = stPages_(r, r[0], c).map(h => wrap_(h, c, 'ST')), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return pack_('<body style="background:#cfd8d3;margin:0;padding:10px">' + s.map(h =>
    '<div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div>').join('') + '</body>');
}
function previewSP(t, key) { // pratinjau: SPPD semua pegawai saja (tanpa Surat Tugas) - supaya unduhan/cetak lebih ringan
  own_(auth_(t, true), key);
  const c = cfg_(), r = escDeep_(prep_(key, c)), s = r.KHUSUS ? [wrap_(spKhususHtml_(r, c), c, 'SP')] : r.map(x => wrap_(spHtml_(x, c), c, 'SP')), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return pack_('<body style="background:#cfd8d3;margin:0;padding:10px">' + s.map(h =>
    '<div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div>').join('') + '</body>');
}
function pdfST(t, key) { // satu file PDF: Surat Tugas saja (tanpa SPPD) - supaya unduhan lebih ringan
  own_(auth_(t, true), key);
  const c = cfg_(), r = prep_(key, c); ttdST_(c); const doc = DocumentApp.create('tmp_st_' + Date.now()), id = doc.getId();
  try {
    const body = doc.getBody(), pz = PAPER[c.KERTAS] || PAPER.Legal;
    body.clear();
    body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
      .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
    stSect_(body, c, r, c);
    doc.saveAndClose();
    return { name: 'Surat_Tugas_' + r[0].TglST + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(id).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function pdfSP(t, key) { // satu file PDF: SPPD semua pegawai saja (tanpa Surat Tugas) - supaya unduhan lebih ringan
  own_(auth_(t, true), key);
  const c = cfg_(), r = prep_(key, c), doc = DocumentApp.create('tmp_sp_' + Date.now()), id = doc.getId();
  try {
    const body = doc.getBody();
    halaman_(body, c);
    if (r.KHUSUS) sect_(body, c, 'SP', true, (cell, cw) => spKhususDoc_(cell, cw, r, c)); // ST Khusus: satu SPPD + Pengikut
    else try { spSemua_(body, c, r, true); }
    catch (e) { // jaring pengaman: kembali ke cara lama per halaman
      halaman_(body, c);
      r.forEach((x, i) => { if (i > 0) body.appendPageBreak(); sect_(body, c, 'SP', i === 0, (cell, cw) => spDoc_(cell, cw, x, c)); });
    }
    doc.saveAndClose();
    return { name: 'SPPD_' + r[0].TglST + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(id).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function kwiPreview(t, key) {
  own_(auth_(t, true), key);
  const c = cfg_(); c.TTD = ''; // tanpa tanda tangan & CAP (hanya Cetak Surat Tugas yang memakai TTD + CAP)
  const h = wrap_(kwHtml_(escDeep_(kwData_(key, c)), c), c, 'SP'), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return '<body style="background:#cfd8d3;margin:0;padding:10px"><div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div></body>';
}
function kwiPdf(t, key) {
  own_(auth_(t, true), key);
  const c = cfg_(); c.TTD = ''; // tanpa tanda tangan & CAP (hanya Cetak Surat Tugas yang memakai TTD + CAP)
  const d = kwData_(key, c), doc = DocumentApp.create('tmp_kwitansi_' + Date.now()), id = doc.getId();
  try {
    const body = doc.getBody(), pz = PAPER[c.KERTAS] || PAPER.Legal;
    body.clear();
    body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
      .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
    sect_(body, c, 'SP', true, (cell, cw) => kwDoc_(cell, cw, d, c));
    doc.saveAndClose();
    return { name: 'Kwitansi_' + d.x.TglST + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(id).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function kwiPdfBulan(t, bulan, bidang) { // cetak massal - gabungkan semua Kwitansi yang sudah diatur untuk Surat Tugas bulan terpilih (YYYY-MM) jadi satu PDF
  const u = auth_(t, true), bd = bid_(u) || bidang; // Admin dkk tetap terkunci ke bidangnya sendiri; Super Admin/Kasubag Keuangan boleh pilih filter Bidang (opsional)
  const data = rows_('DATA_SPPD'), kwSet = new Set(kwRows_().map(k => k.NoST)); // hanya Surat Tugas yang kwitansinya sudah diatur (jenis & tarif terisi)
  const noSTBulan = new Set(data.filter(x => String(x.TglST).slice(0, 7) === String(bulan) && (!bd || x.Bidang === bd)).map(x => x.NoST));
  const keys = [...noSTBulan].filter(noST => kwSet.has(noST)).sort((a, b) => a.localeCompare(b));
  if (!keys.length) throw new Error('Tidak ada Kwitansi yang terbit pada bulan tersebut.');
  const c = cfg_(); c.TTD = ''; // tanpa tanda tangan & CAP (hanya Cetak Surat Tugas yang memakai TTD + CAP)
  const doc = DocumentApp.create('tmp_kwitansi_bulan_' + Date.now()), id = doc.getId();
  try {
    const body = doc.getBody(), pz = PAPER[c.KERTAS] || PAPER.Legal;
    body.clear();
    body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
      .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
    keys.forEach((key, i) => { if (i > 0) body.appendPageBreak(); sect_(body, c, 'SP', i === 0, (cell, cw) => kwDoc_(cell, cw, kwData_(key, c), c)); });
    doc.saveAndClose();
    logAksi_(u, 'Cetak Massal Kwitansi', 'Bulan ' + bulan + ' (' + keys.length + ' dokumen)');
    return { name: 'Kwitansi_' + bulan + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(id).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function lapPreview(t, key) {
  own_(auth_(t, true), key);
  const c = cfg_(), h = wrap_(lapHtml_(escDeep_(lapData_(key, c)), c), c, 'ST'), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return '<body style="background:#cfd8d3;margin:0;padding:10px"><div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div></body>';
}
function lapPdf(t, key) {
  own_(auth_(t, true), key);
  const c = cfg_(), d = lapData_(key, c), doc = lapDoc2_(c, d), id = doc.getId();
  try {
    doc.saveAndClose();
    return { name: 'Laporan_Perjalanan_Dinas_' + d.x.TglST + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(id).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function exportDoc(t, tipe, key, fmt) { // fmt: 'docx' (unduh Word) | 'gdoc' (buka & edit di Google Docs)
  const u0 = tipe === 'BKU' ? authFin_(t) : auth_(t, true); // BKU: sama seperti bkuPreview/exportBkuXlsx (Super Admin, Kasubag Keuangan, KABID, KASI, SEKRETARIS)
  if (tipe === 'BKU') bkuIzin_(u0, String(key).split('|')[0]); else if (tipe !== 'RRPD') own_(u0, key); // RRPD: izin bidang diperiksa di rrpdData_()
  const c = cfg_(); c.TTD = ''; // tanpa tanda tangan & CAP (hanya Cetak Surat Tugas yang memakai TTD + CAP)
  const pz = PAPER[c.KERTAS] || PAPER.Legal;
  let doc, name;
  if (tipe === 'KWI') {
    const d = kwData_(key, c); doc = DocumentApp.create('Kwitansi ' + d.x.TglST); name = 'Kwitansi_' + d.x.TglST;
    const body = doc.getBody(); body.clear();
    body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
      .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
    sect_(body, c, 'SP', true, (cell, cw) => kwDoc_(cell, cw, d, c));
  } else if (tipe === 'LAP') {
    const d = lapData_(key, c); doc = lapDoc2_(c, d); name = 'Laporan_Perjalanan_Dinas_' + d.x.TglST;
  } else if (tipe === 'BKU') {
    const [bidang, tahun] = String(key).split('|'), cc = cfg_(); cc.LOGO = logoUri_('LOGO_DOKUMEN');
    const d = bkuData_(bidang, tahun, cc); doc = DocumentApp.create('BKU ' + bidang + ' ' + tahun); name = 'BKU_' + bidang + '_' + tahun;
    const body = doc.getBody(); body.clear();
    body.setPageWidth(pz[1]).setPageHeight(pz[0]).setMarginLeft(0).setMarginRight(0).setMarginTop(Number(cc.SP_ATAS) * MM).setMarginBottom(Number(cc.SP_BAWAH) * MM);
    sect_(body, cc, 'SP', true, (cell, cw) => bkuDoc_(cell, cw, d, cc), true);
  } else if (tipe === 'RRPD') {
    const d = rrpdData_(u0, key, c, true); doc = DocumentApp.create('RRPD ' + d.bidang + ' ' + d.tahun); name = rrpdNama_(d);
    halaman_(doc.getBody(), c);
    sect_(doc.getBody(), c, 'SP', true, (cell, cw) => rrpdDoc_(cell, cw, d, c));
  } else {
    const r = prep_(key, c); doc = DocumentApp.create('Surat Tugas dan SPPD ' + r[0].TglST); name = 'Surat_Tugas_dan_SPPD_' + r[0].TglST;
    buildDoc_(doc, r, c);
  }
  doc.saveAndClose();
  const id = doc.getId(), f = DriveApp.getFileById(id);
  if (fmt === 'gdoc') {
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    return { url: 'https://docs.google.com/document/d/' + id + '/edit' };
  }
  try {
    return { name: name + '.docx', b64: Utilities.base64Encode(docxBytes_(id)) };
  } finally { f.setTrashed(true); }
}
function docxBytes_(id) { // unduh Google Docs sebagai .docx - dokumen yang baru selesai dibuat kadang belum siap diekspor ("Alamat tidak tersedia"),
  // jadi dicoba ulang beberapa kali dengan jeda, bergantian lewat Drive API dan alamat ekspor Docs
  const opt = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  const urls = ['https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    'https://docs.google.com/document/d/' + id + '/export?format=docx'];
  let err = '';
  for (let i = 0; i < 4; i++) {
    try { const r = UrlFetchApp.fetch(urls[i % 2], opt); if (r.getResponseCode() === 200) return r.getContent(); err = 'kode ' + r.getResponseCode(); }
    catch (e) { err = e.message; }
    Utilities.sleep(1000 * (i + 1));
  }
  throw new Error('File Word belum berhasil dibuat, silakan klik Word sekali lagi. (' + err + ')');
}

// ---------- Export Excel (.xlsx) ----------
function xlsxBuat_(nama, lembar) { // lembar: [{nama, data:[[...]], bold:[no.baris mulai 1]}]
  const ss = SpreadsheetApp.create(nama);
  try {
    lembar.forEach((sd, i) => {
      const sh = i === 0 ? ss.getSheets()[0].setName(sd.nama) : ss.insertSheet(sd.nama);
      if (sd.data.length) {
        sh.getRange(1, 1, sd.data.length, sd.data[0].length).setValues(sd.data);
        (sd.bold || []).forEach(r => sh.getRange(r, 1, 1, sd.data[0].length).setFontWeight('bold'));
        sh.autoResizeColumns(1, sd.data[0].length);
      }
    });
    SpreadsheetApp.flush();
    const id = ss.getId();
    const r = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
    return { name: nama + '.xlsx', b64: Utilities.base64Encode(r.getContent()) };
  } finally { DriveApp.getFileById(ss.getId()).setTrashed(true); }
}
function noNum_(s) { // urai nomor urut & tahun dari "KODE / Pol. PP & Kar / <no> / <bln> / <thn>"
  const p = String(s || '').split('/').map(x => x.trim());
  return { y: +p[p.length - 1] || 0, n: +p[p.length - 3] || 0 };
}
function exportRekapXlsx(t) {
  const u = auth_(t, true), bd = bid_(u);
  const all = rows_('DATA_SPPD'), data = (bd ? all.filter(x => x.Bidang === bd) : all)
    .sort((a, b) => { const na = noNum_(a.NoSPPD), nb = noNum_(b.NoSPPD); return na.y - nb.y || na.n - nb.n; }); // urut sesuai nomor urut Surat Tugas/SPPD (1, 2, 3, ...)
  const hd = ['No', 'Tanggal Surat Tugas', 'No. Surat Tugas', 'No. SPPD', 'Nama', 'Pangkat', 'NIP', 'Jabatan', 'Bidang', 'Tujuan', 'Maksud Perjalanan Dinas', 'Lama (hari)', 'Tgl Berangkat', 'Tgl Kembali'];
  const rows = data.map((x, i) => [i + 1, x.TglST, x.NoST, x.NoSPPD, x.Nama, x.Pangkat, String(x.NIP), x.Jabatan, x.Bidang, x.Tujuan, x.Maksud, Number(x.Lama), x.Berangkat, x.Kembali]);
  logAksi_(u, 'Export Excel', 'Rekap Surat Tugas & SPPD');
  return xlsxBuat_('Rekap_SuratTugas_SPPD', [{ nama: 'Rekap', data: [hd].concat(rows), bold: [1] }]);
}
function exportDpaXlsx(t, tahun) {
  const u = auth_(t, true), bd = bidDpa_(u), r = dpaCalc_(tahun, bd);
  const hd1 = ['Bidang', 'Total Pagu', 'Jumlah Terpakai', 'Sisa', 'Jumlah Surat Tugas'];
  const rows1 = r.map(x => [x.Bidang, Number(x.Pagu), Number(x.Jumlah), Number(x.Sisa), x.ST]);
  const hd2 = ['Bidang', 'Sub Kegiatan', 'Jenis Perjalanan', 'Kode Rekening', 'Pagu'];
  const rows2 = []; r.forEach(x => x.Subs.forEach(s => rows2.push([x.Bidang, s.nama, s.jenis, s.kode, Number(s.pagu)])));
  logAksi_(u, 'Export Excel', 'DPA Perjalanan Dinas Tahun ' + tahun);
  return xlsxBuat_('DPA_PerjalananDinas_' + tahun, [
    { nama: 'Ringkasan', data: [hd1].concat(rows1), bold: [1] },
    { nama: 'Alokasi Sub Kegiatan', data: [hd2].concat(rows2), bold: [1] }
  ]);
}
function exportBkuXlsx(t, key) { // Excel BKU dengan kop & format sama seperti PDF, sudah diatur kertas Legal - Landscape
  const u = authFin_(t), [bidang, tahun] = String(key).split('|'); bkuIzin_(u, bidang);
  const c = cfg_(); c.LOGO = logoUri_('LOGO_DOKUMEN');
  const d = bkuData_(bidang, tahun, c), ss = bkuSs_(d, c), id = ss.getId();
  try {
    let x = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel BKU belum berhasil dibuat, silakan klik Export Excel sekali lagi.');
    try { x = xlsxCetak_(x, c); } catch (e) {} // pengaturan halaman gagal dipasang -> file tetap dikirim apa adanya
    logAksi_(u, 'Export Excel', 'BKU ' + bidang + ' ' + tahun);
    return { name: 'BKU_' + bidang + '_' + tahun + '.xlsx', b64: Utilities.base64Encode(x) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}

// ---------- Register Perjalanan Dinas (Excel, khusus Super Admin - dari Dashboard) ----------
// Semua Surat Tugas & SPPD satu tahun (semua bidang), urut nomor SPPD; kop + logo, kertas Legal - Landscape; paling bawah footer aplikasi & tanggal download.
const REG_W_ = [0.025, 0.075, 0.13, 0.13, 0.17, 0.16, 0.115, 0.03, 0.06, 0.05, 0.05]; // NO / Tgl ST / No. ST / No. SPPD / Nama / Maksud / Tujuan / Lama / Bidang / Berangkat / Kembali
function exportRegisterXlsx(t, tahun) {
  const u = auth_(t, 2), c = cfg_(); c.LOGO = logoUri_('LOGO_DOKUMEN');
  tahun = String(tahun || new Date().getFullYear());
  const data = rows_('DATA_SPPD').filter(x => String(x.TglST).slice(0, 4) === tahun).concat(arsipRows_(tahun, 'DATA_SPPD')) // tahun yang sudah diarsipkan ikut terbaca dari spreadsheet arsip
    .sort((a, b) => { const na = noNum_(a.NoSPPD), nb = noNum_(b.NoSPPD); return na.y - nb.y || na.n - nb.n; });
  const ss = registerSs_(data, tahun, c), id = ss.getId();
  try {
    let x = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel Register belum berhasil dibuat, silakan klik Download sekali lagi.');
    try { x = xlsxCetak_(x, c); } catch (e) {} // pengaturan halaman gagal dipasang -> file tetap dikirim apa adanya
    logAksi_(u, 'Export Excel', 'Register Perjalanan Dinas Tahun ' + tahun);
    return { name: 'REGISTER_PERJALANAN_DINAS_' + tahun + '.xlsx', b64: Utilities.base64Encode(x) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function registerSs_(data, tahun, c) {
  const N = 11, ss = SpreadsheetApp.create('tmp_register_' + Date.now()), sh = ss.getSheets()[0].setName('Register ' + tahun);
  const S = SpreadsheetApp.BorderStyle, K = '#000000', H = 9, n = Math.max(1, data.length), akhir = H + n;
  if (sh.getMaxRows() < akhir + 4) sh.insertRowsAfter(sh.getMaxRows(), akhir + 4 - sh.getMaxRows());
  REG_W_.forEach((x, i) => sh.setColumnWidth(i + 1, Math.round(1370 * x)));
  sh.getRange(1, 1, akhir + 4, N).setFontFamily(c.FONT || 'Arial').setFontSize(8).setVerticalAlignment('middle');
  const judul = (r, v, f) => f(sh.getRange(r, 1, 1, N).merge().setValue(v).setHorizontalAlignment('center'));
  judul(1, 'PEMERINTAH KABUPATEN NGADA', g => g.setFontSize(12));
  judul(2, 'SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', g => g.setFontSize(16).setFontWeight('bold'));
  judul(3, 'Jln. Soekarno – Hatta No.1 Tlp. (0384) 2200019, Email.satpolppngada3@gmail.com', g => g.setFontSize(8).setFontStyle('italic'));
  judul(4, 'B A J A W A', g => g.setFontSize(14).setFontWeight('bold'));
  [20, 26, 15, 24].forEach((h, i) => sh.setRowHeight(i + 1, h));
  sh.getRange(4, 1, 1, N).setBorder(null, null, true, null, null, null, K, S.SOLID_THICK); // garis tebal di bawah kop
  if (c.LOGO) { try { sh.insertImage(blob_(c.LOGO, 'logo.png'), 3, 1, 40, 4).setWidth(78).setHeight(80); } catch (e) {} }
  judul(6, 'REGISTER PERJALANAN DINAS', g => g.setFontSize(12).setFontWeight('bold'));
  judul(7, 'TAHUN ' + tahun, g => g.setFontSize(12).setFontWeight('bold').setFontLine('underline'));
  sh.getRange(H, 1, 1, N).setValues([['NO.', 'Tanggal SURAT TUGAS', 'No. SURAT TUGAS', 'No. SPPD', 'Nama PETUGAS', 'Maksud PERJALANAN DINAS', 'Tujuan', 'Lama', 'Bidang', 'Berangkat', 'Kembali']])
    .setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  sh.setRowHeight(H, 30);
  if (data.length) {
    sh.getRange(H + 1, 1, n, N).setNumberFormat('@').setValues(data.map((x, i) => [String(i + 1), idn_(x.TglST), x.NoST, x.NoSPPD, x.Nama, x.Maksud, x.Tujuan, String(x.Lama), x.Bidang, x.Berangkat, x.Kembali]));
    sh.getRange(H + 1, 1, n, 1).setHorizontalAlignment('center'); sh.getRange(H + 1, 8, n, 1).setHorizontalAlignment('center');
    sh.getRange(H + 1, 5, n, 3).setWrap(true); // Nama, Maksud, Tujuan panjang turun ke baris berikutnya
    sh.setRowHeights(H + 1, n, 16);
    data.forEach((x, i) => { const p = Math.max(Math.ceil(String(x.Maksud).length / 42), Math.ceil(String(x.Tujuan).length / 30), Math.ceil(String(x.Nama).length / 44)); if (p > 1) sh.setRowHeight(H + 1 + i, 11 * p + 5); });
  } else sh.getRange(H + 1, 1, 1, N).merge().setValue('Belum ada Surat Tugas & SPPD pada tahun ' + tahun + '.').setHorizontalAlignment('center');
  sh.getRange(H, 1, n + 1, N).setBorder(true, true, true, true, true, true, K, S.SOLID);
  const r = akhir + 2, wkt = new Date(), tgl = idn_(Utilities.formatDate(wkt, TZ, 'yyyy-MM-dd')) + ', pukul ' + Utilities.formatDate(wkt, TZ, 'HH:mm') + ' Wita';
  sh.getRange(r, 1, 1, N).setBorder(true, null, null, null, null, null, K, S.SOLID);
  sh.getRange(r, 1, 1, 6).merge().setValue(footer_()).setFontStyle('italic').setFontSize(8).setHorizontalAlignment('left');
  sh.getRange(r, 7, 1, 5).merge().setValue('Tanggal Download: ' + tgl).setFontStyle('italic').setFontSize(8).setHorizontalAlignment('right');
  if (sh.getMaxColumns() > N) sh.deleteColumns(N + 1, sh.getMaxColumns() - N);
  if (sh.getMaxRows() > r) sh.deleteRows(r + 1, sh.getMaxRows() - r);
  sh.setFrozenRows(0);
  SpreadsheetApp.flush();
  return ss;
}


// ---------- BKU (Buku Kas Umum Perjalanan Dinas Dalam Daerah) ----------
// Laporan turunan: dibentuk dari Pagu DPA + Kwitansi yang sudah terbit, jadi otomatis tersinkron dengan Surat Tugas & Kwitansi.
function bkuList(t) { const u = authFin_(t), bd = bid_(u); return bd ? [bd] : BIDANG; } // BKU khusus Super Admin & Kasubag Keuangan
function bkuIzin_(u, bidang) { if (bid_(u) && bid_(u) !== bidang) throw new Error('Anda hanya dapat melihat BKU bidang ' + bid_(u) + '.'); }
function bkuData_(bidang, tahun, c) {
  const dpa = dpaCalc_(tahun, bidang)[0] || { Pagu: 0, Jumlah: 0, Sisa: 0, Kode: '' };
  const data = rows_('DATA_SPPD'), kw = kwRows_(), grp = {}, kwST = pertamaST_(kw);
  data.forEach(x => { if (x.Bidang === bidang && String(x.TglST).slice(0, 4) === String(tahun)) (grp[x.NoST] = grp[x.NoST] || []).push(x); });
  let rows = Object.keys(grp).map(noST => {
    const r = grp[noST], k = kwST.get(noST);
    if (!k) return null; // hanya penugasan yang kwitansinya sudah terbit
    const x = r[0], total = Number(k.Tarif) * r.reduce((a, q) => a + Number(q.Lama), 0);
    const uraian = String(c.KWI_PREFIX).trim() + ' ' + x.Maksud + ', tanggal ' + idn_(x.TglST) + ', lama Perjalanan ' + x.Lama + ' (' + terbilang_(x.Lama) + ') hari An. ' + x.Nama
      + (r.length > 1 ? ', dkk (' + r.length + ' Orang)' : '') + ', sesuai bukti terlampir';
    return { tgl: x.TglST, nobukti: k.Nomor || '', uraian: uraian, total: total };
  }).filter(Boolean).sort((a, b) => a.tgl.localeCompare(b.tgl));
  let sisa = dpa.Pagu;
  rows = rows.map((r, i) => { sisa -= r.total; return Object.assign({ no: i + 1 }, r, { sisa: sisa }); });
  const pk = 'KWI_PPTK_' + bidang.toUpperCase();
  return { bidang: bidang, tahun: String(tahun), pagu: dpa.Pagu, kode: dpa.Kode || c.KWI_KODE_REKENING, rows: rows, total: dpa.Jumlah, sisaAkhir: dpa.Pagu - dpa.Jumlah,
    pptkNama: c[pk + '_NAMA'] || '', pptkNip: c[pk + '_NIP'] || '', kpaNama: c.KWI_KPA_NAMA || '', kpaNip: c.KWI_KPA_NIP || '' };
}
function bkuHtml_(d, c) { // pratinjau BKU - tata letak sama dengan PDF/Excel
  const acc = (v, b) => '<span style="display:flex;justify-content:space-between;gap:6px;white-space:nowrap' + (b ? ';font-weight:bold' : '') + '"><span>Rp</span><span>' + rp_(v) + '</span></span>';
  const blk = (ls, nm, nip) => '<div class="c">' + ls.map(escH_).join('<br>') + '<br><br><br><br><b><u>' + escH_(nm) + '</u></b><br>NIP. ' + escH_(nip) + '</div>';
  const W = BKU_W_.map(x => (x * 100).toFixed(2) + '%'), col = '<colgroup>' + W.map(w => '<col style="width:' + w + '">').join('') + '</colgroup>';
  const tabel = (isi, mt) => '<table class="b" style="table-layout:fixed;margin-top:' + mt + 'px">' + col + isi + '</table>';
  const kepala = '<tr>' + ['No', 'Tanggal', 'No. Bukti', 'Kode Rekening', 'Uraian', 'Pengeluaran', 'Sisa Kas'].map(h => '<td class="c"><b>' + h + '</b></td>').join('') + '</tr>';
  const baris = r => '<tr><td class="c" style="vertical-align:middle">' + r.no + '</td><td style="vertical-align:middle;white-space:nowrap">' + escH_(r.tgl) + '</td><td style="vertical-align:middle">' + escH_(r.nobukti) + '</td><td style="vertical-align:middle;font-size:.85em">' + escH_(d.kode)
    + '</td><td style="vertical-align:middle;font-size:.85em">' + escH_(r.uraian) + '</td><td style="vertical-align:middle">' + acc(r.total) + '</td><td style="vertical-align:middle">' + acc(r.sisa) + '</td></tr>';
  const isi = d.rows.length ? tabel(kepala + baris(d.rows[0]), 12) + d.rows.slice(1).map(r => tabel(baris(r), 10)).join('')
    : tabel(kepala + '<tr><td colspan="7">Belum ada kwitansi yang terbit untuk bidang dan tahun ini.</td></tr>', 12);
  const B = 'border:1px solid #000;padding:3px 4px';
  const jml = '<table style="table-layout:fixed;width:100%;border-collapse:collapse;margin-top:12px">' + col
    + '<tr><td></td><td></td><td></td><td></td><td style="' + B + ';text-align:right">JUMLAH SAMPAI DENGAN SAAT INI</td><td style="' + B + '">' + acc(d.total, 1) + '</td><td></td></tr>'
    + '<tr><td></td><td></td><td></td><td></td><td style="' + B + ';text-align:right">SISA ANGGARAN</td><td style="' + B + '">' + acc(d.sisaAkhir, 1) + '</td><td></td></tr></table>';
  return kop_(c)
    + '<div class="c" style="margin-top:12px;line-height:1.5">BUKU KAS UMUM PERJALANAN DINAS DALAM DAERAH<br>TAHUN ANGGARAN ' + d.tahun + '<br><u>BIDANG ' + d.bidang.toUpperCase() + '</u></div>'
    + '<table class="b" style="width:auto;margin-top:10px"><tr><td><b>Kas sesuai DPA ' + d.tahun + ' :</b></td><td><b>Rp ' + rp_(d.pagu) + '</b></td></tr></table>'
    + isi + jml + '<br>'
    + '<table width="100%"><tr><td width="50%">' + blk(['Pejabat Pelaksana Teknis Kegiatan', 'BIDANG ' + d.bidang.toUpperCase()], d.pptkNama, d.pptkNip) + '</td>'
    + '<td width="50%">' + blk(['Kuasa Pengguna Anggaran', ''], d.kpaNama, d.kpaNip) + '</td></tr></table>';
}
const BKU_W_ = [0.025, 0.07, 0.065, 0.16, 0.48, 0.095, 0.105]; // lebar kolom No / Tanggal / No. Bukti / Kode Rekening / Uraian / Pengeluaran / Sisa Kas
function bkuSs_(d, c) { // BKU disusun lewat Google Sheets sementara (kop + logo, sel gabung, format akuntansi "Rp") - dipakai untuk PDF & Excel
  const ss = SpreadsheetApp.create('tmp_bku_' + Date.now()), sh = ss.getSheets()[0].setName('BKU ' + d.tahun);
  const ACC = '_("Rp"* #,##0_);_("Rp"* -#,##0_);_("Rp"* "-"_);_(@_)', S = SpreadsheetApp.BorderStyle, K = '#000000';
  BKU_W_.forEach((x, i) => sh.setColumnWidth(i + 1, Math.round(1370 * x)));
  sh.getRange(1, 1, 300, 7).setFontFamily(c.FONT || 'Arial').setFontSize(9).setVerticalAlignment('middle');
  const judul = (r, v, f) => f(sh.getRange(r, 1, 1, 7).merge().setValue(v).setHorizontalAlignment('center'));
  judul(1, 'PEMERINTAH KABUPATEN NGADA', g => g.setFontSize(12));
  judul(2, 'SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', g => g.setFontSize(16).setFontWeight('bold'));
  judul(3, 'Jln. Soekarno – Hatta No.1 Tlp. (0384) 2200019, Email.satpolppngada3@gmail.com', g => g.setFontSize(8).setFontStyle('italic'));
  judul(4, 'B A J A W A', g => g.setFontSize(14).setFontWeight('bold'));
  [20, 26, 15, 24].forEach((h, i) => sh.setRowHeight(i + 1, h));
  sh.getRange(4, 1, 1, 7).setBorder(null, null, true, null, null, null, K, S.SOLID_THICK); // garis tebal di bawah kop
  if (c.LOGO) { try { sh.insertImage(blob_(c.LOGO, 'logo.png'), 4, 1, 70, 4).setWidth(78).setHeight(80); } catch (e) {} }
  judul(6, 'BUKU KAS UMUM PERJALANAN DINAS DALAM DAERAH', g => g.setFontSize(11));
  judul(7, 'TAHUN ANGGARAN ' + d.tahun, g => g.setFontSize(11));
  judul(8, 'BIDANG ' + d.bidang.toUpperCase(), g => g.setFontSize(11).setFontLine('underline'));
  sh.getRange(10, 1, 1, 2).merge().setValue('Kas sesuai DPA ' + d.tahun + ' :');
  sh.getRange(10, 3).setValue('Rp ' + rp_(d.pagu));
  sh.getRange(10, 1, 1, 3).setFontWeight('bold').setBorder(true, true, true, true, true, null, K, S.SOLID);
  const H = 12, kotak = (r1, r2) => sh.getRange(r1, 1, r2 - r1 + 1, 7).setBorder(true, true, true, true, true, true, K, S.SOLID).setBorder(true, true, true, true, null, null, K, S.SOLID_MEDIUM);
  sh.getRange(H, 1, 1, 7).setValues([['No', 'Tanggal', 'No. Bukti', 'Kode Rekening', 'Uraian', 'Pengeluaran', 'Sisa Kas']]).setFontWeight('bold').setHorizontalAlignment('center');
  let r = H + 1;
  if (!d.rows.length) { sh.getRange(r, 1, 1, 7).merge().setValue('Belum ada kwitansi yang terbit untuk bidang dan tahun ini.'); kotak(H, r); r++; }
  d.rows.forEach((x, i) => { // baris pertama menyatu dengan judul kolom; baris berikutnya kotak sendiri dengan jarak
    if (i) { sh.setRowHeight(r, 12); r++; }
    sh.getRange(r, 2, 1, 3).setNumberFormat('@');
    sh.getRange(r, 1, 1, 7).setValues([[x.no, x.tgl, x.nobukti, d.kode, x.uraian, x.total, x.sisa]]);
    sh.getRange(r, 1).setHorizontalAlignment('center'); sh.getRange(r, 4).setFontSize(8); sh.getRange(r, 5).setWrap(true).setFontSize(8);
    sh.getRange(r, 6, 1, 2).setNumberFormat(ACC);
    sh.setRowHeight(r, Math.max(30, 12 * Math.ceil(String(x.uraian).length / 165) + 8));
    kotak(i ? r : H, r); r++;
  });
  r++;
  sh.getRange(r, 5, 2, 1).setValues([['JUMLAH SAMPAI DENGAN SAAT INI'], ['SISA ANGGARAN']]).setHorizontalAlignment('right');
  sh.getRange(r, 6, 2, 1).setValues([[d.total], [d.sisaAkhir]]).setNumberFormat(ACC).setFontWeight('bold');
  sh.getRange(r, 5, 2, 2).setBorder(true, true, true, true, true, true, K, S.SOLID);
  r += 3;
  const ttd = (c1, n, ls, nm, nip) => {
    ls.forEach((l, i) => sh.getRange(r + i, c1, 1, n).merge().setValue(l).setHorizontalAlignment('center').setFontSize(10));
    sh.getRange(r + 5, c1, 1, n).merge().setValue(nm).setFontWeight('bold').setFontLine('underline').setHorizontalAlignment('center').setFontSize(10);
    sh.getRange(r + 6, c1, 1, n).merge().setValue('NIP. ' + nip).setHorizontalAlignment('center').setFontSize(10);
  };
  ttd(1, 4, ['Pejabat Pelaksana Teknis Kegiatan', 'BIDANG ' + d.bidang.toUpperCase()], d.pptkNama, d.pptkNip);
  ttd(5, 3, ['Kuasa Pengguna Anggaran'], d.kpaNama, d.kpaNip);
  if (sh.getMaxColumns() > 7) sh.deleteColumns(8, sh.getMaxColumns() - 7);
  if (sh.getMaxRows() > r + 7) sh.deleteRows(r + 8, sh.getMaxRows() - r - 7);
  SpreadsheetApp.flush();
  return ss;
}
function ssPdfQ_(c, landscape) { // parameter ekspor PDF Google Sheets: kertas Legal, muat selebar halaman, tanpa garis bantu
  const inci = mm => (Math.max(0, Number(mm) || 0) / 25.4).toFixed(2);
  return 'format=pdf&size=legal&portrait=' + (landscape ? 'false' : 'true') + '&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false&horizontal_alignment=CENTER'
    + '&top_margin=' + inci(c.SP_ATAS) + '&bottom_margin=' + inci(c.SP_BAWAH) + '&left_margin=' + inci(c.SP_KIRI) + '&right_margin=' + inci(c.SP_KANAN);
}
function xlsxCetak_(bytes, c, ori, satu, brk) { // satu opsional: true = muat 1 halaman (Belakang SPPD) // ori opsional: 'portrait' (Kwitansi); bawaan landscape // atur halaman di file Excel: kertas Legal, Landscape, muat 1 halaman lebar, rata tengah
  const inci = mm => (Math.max(0, Number(mm) || 0) / 25.4).toFixed(2);
  const files = Utilities.unzip(Utilities.newBlob(bytes, 'application/zip', 'bku.zip'));
  const out = files.map(f => /^xl\/worksheets\/sheet\d+\.xml$/.test(f.getName())
    ? Utilities.newBlob(xlsxSetupXml_(f.getDataAsString('UTF-8'), inci(c.SP_KIRI), inci(c.SP_KANAN), inci(c.SP_ATAS), inci(c.SP_BAWAH), ori, satu, brk), 'application/xml', f.getName()) : f);
  return Utilities.zip(out, 'bku.xlsx').getBytes();
}
function xlsxSetupXml_(x, L, R, T, B, ori, satu, brk) { // brk opsional: daftar nomor baris tempat halaman dipotong (Surat Tugas Excel) // sisipkan pengaturan cetak ke XML lembar kerja Excel, sesuai urutan elemen standar Office Open XML
  x = x.replace(/<printOptions\b[^>]*\/>/g, '').replace(/<pageMargins\b[^>]*\/>/g, '').replace(/<pageSetup\b[^>]*\/>/g, '');
  const sisip = '<printOptions horizontalCentered="1"/><pageMargins left="' + L + '" right="' + R + '" top="' + T + '" bottom="' + B + '" header="0.2" footer="0.2"/>'
    + '<pageSetup paperSize="5" orientation="' + (ori === 'portrait' ? 'portrait' : 'landscape') + '" fitToWidth="1" fitToHeight="' + (satu ? 1 : 0) + '"/>';
  const m = x.match(/<(headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/);
  x = m ? x.slice(0, m.index) + sisip + x.slice(m.index) : x.replace('</worksheet>', sisip + '</worksheet>');
  if (/<sheetPr\b[^>]*\/>/.test(x)) x = x.replace(/<sheetPr\b([^>]*?)\s*\/>/, '<sheetPr$1><pageSetUpPr fitToPage="1"/></sheetPr>');
  else if (/<sheetPr\b/.test(x)) x = /<pageSetUpPr\b/.test(x) ? x.replace(/<pageSetUpPr\b([^>]*?)\s*\/>/, (s, a) => '<pageSetUpPr' + a.replace(/\sfitToPage="[^"]*"/, '') + ' fitToPage="1"/>') : x.replace('</sheetPr>', '<pageSetUpPr fitToPage="1"/></sheetPr>');
  else x = x.replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  if (brk && brk.length) { // pemisah halaman manual: urutan standar = sesudah pageSetup/headerFooter, sebelum drawing dst.
    x = x.replace(/<rowBreaks\b[\s\S]*?<\/rowBreaks>/, '');
    const rb = '<rowBreaks count="' + brk.length + '" manualBreakCount="' + brk.length + '">' + brk.map(b => '<brk id="' + b + '" max="16383" man="1"/>').join('') + '</rowBreaks>';
    const m2 = x.match(/<(colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/);
    x = m2 ? x.slice(0, m2.index) + rb + x.slice(m2.index) : x.replace('</worksheet>', rb + '</worksheet>');
  }
  return x;
}
function bkuDoc_(cell, cw, d, c) {
  const p = 'SP', H = DocumentApp.HorizontalAlignment, CE = H.CENTER;
  kopDoc_(cell, cw, c, p);
  pa_(cell, '', c, p);
  pa_(cell, 'BUKU KAS UMUM PERJALANAN DINAS DALAM DAERAH', c, p, { b: 1, al: CE });
  pa_(cell, 'TAHUN ANGGARAN ' + d.tahun, c, p, { b: 1, al: CE });
  pa_(cell, 'BIDANG ' + d.bidang.toUpperCase(), c, p, { b: 1, u: 1, al: CE }); // garis bawah cukup di tulisan Bidang (garis panjang selebar halaman dihapus)
  pa_(cell, '', c, p);
  pa_(cell, 'Kas sesuai DPA ' + d.tahun + ' : Rp ' + rp_(d.pagu), c, p, { b: 1 });
  pa_(cell, '', c, p);
  const w0 = 22, w1 = 58, w2 = 70, w3 = 150, w5 = 75, w6 = 75, w4 = Math.max(60, cw - w0 - w1 - w2 - w3 - w5 - w6);
  const hd = [['No', true, CE], ['Tanggal', true, CE], ['No. Bukti', true, CE], ['Kode Rekening', true, CE], ['Uraian', true, CE], ['Pengeluaran', true, CE], ['Sisa Kas', true, CE]];
  const rows = [hd].concat(d.rows.length ? d.rows.map(r => [String(r.no), idn_(r.tgl), r.nobukti, d.kode, r.uraian, 'Rp ' + rp_(r.total), 'Rp ' + rp_(r.sisa)])
    : [['', 'Belum ada kwitansi yang terbit untuk bidang dan tahun ini.', '', '', '', '', '']]);
  tb_(cell, rows, [w0, w1, w2, w3, w4, w5, w6], c, p, true, 1, 3);
  pa_(cell, '', c, p);
  tb_(cell, [['', ['JUMLAH SAMPAI DENGAN SAAT INI', true], ['Rp ' + rp_(d.total), true]]], [cw - 260, 180, 80], c, p, false, 1, 2);
  tb_(cell, [['', ['SISA ANGGARAN', true], ['Rp ' + rp_(d.sisaAkhir), true]]], [cw - 260, 180, 80], c, p, false, 1, 2);
  pa_(cell, '', c, p);
  const t = cell.appendTable([['', '']]).setBorderWidth(0).setColumnWidth(0, cw * 0.5).setColumnWidth(1, cw * 0.5), L = noPad_(t.getCell(0, 0)), R = noPad_(t.getCell(0, 1));
  pa_(L, 'Pejabat Pelaksana Teknis Kegiatan', c, p, { al: CE });
  pa_(L, 'BIDANG ' + d.bidang.toUpperCase(), c, p, { al: CE });
  pa_(L, '', c, p); pa_(L, '', c, p); pa_(L, '', c, p);
  pa_(L, d.pptkNama, c, p, { al: CE, b: 1, u: 1 });
  pa_(L, 'NIP. ' + d.pptkNip, c, p, { al: CE });
  L.removeChild(L.getChild(0));
  pa_(R, 'Kuasa Pengguna Anggaran', c, p, { al: CE });
  pa_(R, '', c, p); pa_(R, '', c, p); pa_(R, '', c, p); pa_(R, '', c, p);
  pa_(R, d.kpaNama, c, p, { al: CE, b: 1, u: 1 });
  pa_(R, 'NIP. ' + d.kpaNip, c, p, { al: CE });
  R.removeChild(R.getChild(0));
  pa_(cell, '', c, p);
}
function bkuPreview(t, key) {
  const u = authFin_(t), [bidang, tahun] = String(key).split('|'); bkuIzin_(u, bidang);
  const c = cfg_(); c.LOGO = logoUri_('LOGO_DOKUMEN');
  const h = wrap_(bkuHtml_(escDeep_(bkuData_(bidang, tahun, c)), c), c, 'SP'), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return '<body style="background:#cfd8d3;margin:0;padding:10px"><div style="width:' + hm + 'mm;min-height:216mm;background:#fff;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div></body>';
}
function bkuPdf(t, key) { // PDF BKU: kertas Legal - Landscape, disusun lewat Google Sheets (lihat bkuSs_)
  const u = authFin_(t), [bidang, tahun] = String(key).split('|'); bkuIzin_(u, bidang);
  const c = cfg_(); c.LOGO = logoUri_('LOGO_DOKUMEN');
  const d = bkuData_(bidang, tahun, c), ss = bkuSs_(d, c), id = ss.getId();
  try {
    const pdf = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?' + ssPdfQ_(c, true)], 'PDF BKU belum berhasil dibuat, silakan klik Unduh PDF sekali lagi.');
    return { name: 'BKU_' + bidang + '_' + tahun + '.pdf', b64: Utilities.base64Encode(pdf) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}

// ---------- RRPD (Rincian Rencana Penggunaan Dana) sesuai Anggaran Kas DPA ----------
// Satu RRPD per Sub Kegiatan DPA (bidang & tahun). Baris pengeluaran = Pengajuan Pencairan yang sudah DISETUJUI Kasubag Keuangan,
// dihitung dari Kwitansi Surat Tugas di dalamnya. Surat Tugas tanpa Sub Kegiatan masuk ke Sub Kegiatan pertama bidang itu (sama seperti Kwitansi).
// Uraian tiap baris otomatis: "PENGAJUAN Tanggal <tgl>, Jam <jam> Wita, <Maksud>" (jam diambil dari catatan Log Aktivitas saat pengajuan dikirim).
const RRPD_W_ = [0.055, 0.31, 0.16, 0.175, 0.15, 0.15]; // lebar kolom NO / PENGAJUAN / AKUN / PAGU / JUMLAH PENGELUARAN / SISA
const escH_ = s => String(s == null ? '' : s).replace(/&(?!(?:amp|lt|gt|quot|#\d+);)|[<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); // tidak meng-escape dua kali (aman dipakai pada teks yang sudah di-escape)
const RRPD_GEN_ROLES = ['Super Admin', 'Admin']; // yang boleh Generate RRPD (1x) & ubah jabatan; peran lain (Kasubag Keuangan, KABID, KASI, SEKRETARIS) hanya melihat
function rrpdGenSheet_() { // catatan RRPD yang sudah di-generate - satu baris per Bidang|Tahun|Sub Kegiatan, supaya Generate hanya bisa 1x
  let s = sh_('RRPD_GEN');
  if (!s) { s = SpreadsheetApp.getActive().insertSheet('RRPD_GEN'); s.appendRow(['Kunci', 'Bidang', 'Tahun', 'SubKegiatan', 'TglGenerate', 'Oleh']); s.setFrozenRows(1); s.getRange('A:F').setNumberFormat('@'); }
  return s;
}
function rrpdBaca_() { // semua data yang dibutuhkan dibaca SEKALI
  dpaSheet_();
  const aju = pengajuanRows_(), gen = {}, jam = {};
  if (sh_('RRPD_GEN')) rows_('RRPD_GEN').forEach(x => gen[x.Kunci] = { tgl: String(x.TglGenerate || ''), oleh: String(x.Oleh || '') });
  if (sh_('LOG')) { // jam pengajuan: dicocokkan dengan catatan "Ajukan Pencairan Perjalanan Dinas" (tanggal, bidang, jumlah ST & nominal sama)
    const v = sh_('LOG').getDataRange().getValues(); v.shift();
    const logs = v.filter(r => r[3] === 'Ajukan Pencairan Perjalanan Dinas').map(r => ({ w: r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd HH:mm') : String(r[0]), d: String(r[4]) }));
    aju.slice().sort((a, b) => a._r - b._r).forEach(p => {
      const n = String(p.NoSTList || '').split('|').filter(Boolean).length, det = p.Bidang + ' - ' + n + ' Surat Tugas, Rp ' + Math.round(Number(p.Jumlah)).toLocaleString('id-ID');
      const i = logs.findIndex(l => l.w.slice(0, 10) === String(p.TglAjukan) && l.d === det);
      if (i >= 0) { jam[p.ID] = logs[i].w.slice(11, 16).replace(':', '.'); logs.splice(i, 1); }
    });
  }
  return { dpa: rows_('DPA'), aju: aju, data: rows_('DATA_SPPD'), kw: kwRows_(), gen: gen, jam: jam };
}
function rrpdKetAwal_(tgl, jam, maksud) {
  const a = 'PENGAJUAN Tanggal ' + idn_(tgl).toUpperCase() + (jam ? ', Jam ' + jam + ' Wita' : ''), m = maksud.map(x => x.toUpperCase());
  if (m.length > 1) return a + ',\n' + m.map((x, i) => (i + 1) + '. ' + x + (i < m.length - 1 ? ',' : '')).join('\n'); // lebih dari satu kegiatan: diberi nomor 1, 2, 3, ... per baris
  return (a + (m.length ? ', ' + m[0] : '')).slice(0, 300);
}
function rrpdKetHtml_(k) { // uraian untuk pratinjau: baris bernomor diberi indentasi gantung seperti format Excel
  return String(k).split('\n').map(l => '<span style="display:block' + (/^\d+\. /.test(l) ? ';padding-left:1.05em;text-indent:-1.05em' : '') + '">' + escH_(l) + '</span>').join('');
}
function rrpdHitung_(bidang, tahun, D) {
  const subs = D.dpa.filter(x => String(x.Tahun) === String(tahun) && x.Bidang === bidang)
    .map(x => ({ nama: String(x.SubKegiatan || ''), kode: String(x.KodeRekening || ''), jenis: String(x.Jenis || 'Luar Kota'), pagu: Number(x.Pagu) || 0, rows: [],
      gen: (D.gen || {})[bidang + '|' + tahun + '|' + String(x.SubKegiatan || '')] || null }));
  if (!subs.length) return subs;
  const byNama = {}; subs.forEach(s => { if (!byNama[s.nama]) byNama[s.nama] = s; });
  D.aju.filter(p => p.Bidang === bidang && p.Status === 'Disetujui')
    .sort((a, b) => String(a.TglAjukan).localeCompare(String(b.TglAjukan)) || a._r - b._r)
    .forEach(p => {
      const per = {};
      String(p.NoSTList || '').split('|').filter(Boolean).forEach(noST => {
        const rs = (D._st = D._st || grupST_(D.data)).get(noST) || [], k = (D._kw = D._kw || pertamaST_(D.kw)).get(noST); // indeks dibuat sekali per pembacaan
        if (!rs.length || !k || String(rs[0].TglST).slice(0, 4) !== String(tahun)) return;
        const s = byNama[rs[0].SubKegiatan] || subs[0], o = per[s.nama] = per[s.nama] || { s: s, jumlah: 0, maksud: [] };
        o.jumlah += Number(k.Tarif) * rs.reduce((a, x) => a + Number(x.Lama), 0);
        const mk = String(rs[0].Maksud || '').trim(); if (mk && o.maksud.indexOf(mk) < 0) o.maksud.push(mk);
      });
      Object.keys(per).forEach(n => {
        const o = per[n], jm = (D.jam || {})[p.ID] || '';
        o.s.rows.push({ id: p.ID, tgl: p.TglAjukan, jam: jm, jumlah: o.jumlah, ket: rrpdKetAwal_(p.TglAjukan, jm, o.maksud) });
      });
    });
  subs.forEach(s => { let sisa = s.pagu; s.rows.forEach(r => { sisa -= r.jumlah; r.sisa = sisa; }); s.jumlah = s.pagu - sisa; s.sisa = sisa; });
  return subs;
}
function rrpdIzin_(u, bidang) {
  if (!BIDANG.includes(bidang)) throw new Error('Bidang tidak valid.');
  if (bid_(u) && bid_(u) !== bidang) throw new Error('Anda hanya dapat mengakses RRPD bidang ' + bid_(u) + '.');
}
function rrpdJabatan_(c, b) { return String(c['RRPD_JABATAN_' + b.toUpperCase()] || '').trim() || ('KEPALA BIDANG ' + b.toUpperCase()); }
function rrpdData_(u, key, c, perluGen) { // key = "Bidang|Tahun|Nama Sub Kegiatan"; perluGen: hanya boleh dilihat bila sudah di-generate
  const p = String(key).split('|'), b = p[0], y = p[1], n = p.slice(2).join('|');
  if (PIMPINAN_.includes(u.role)) throw new Error('Menu RRPD tidak tersedia untuk ' + u.role + '.');
  rrpdIzin_(u, b);
  const s = rrpdHitung_(b, y, rrpdBaca_()).find(x => x.nama === n);
  if (!s) throw new Error('Sub Kegiatan "' + n + '" tidak ditemukan di DPA ' + b + ' ' + y + '.');
  if (perluGen && !s.gen) throw new Error('RRPD ini belum di-generate oleh Admin bidang.');
  if (!s.kode) s.kode = String(c.KWI_KODE_REKENING || '').trim(); // Kode Rekening Sub Kegiatan kosong di DPA -> pakai kode bawaan (sama seperti Kwitansi)
  const pk = 'KWI_PPTK_' + b.toUpperCase();
  return { bidang: b, tahun: y, s: s, uraian: s.jenis === 'Luar Daerah' ? 'Belanja Perjalanan Dinas Luar Daerah' : 'Belanja Perjalanan Dinas dalam Daerah',
    jabatan: rrpdJabatan_(c, b), kabidNama: c[pk + '_NAMA'] || '', kabidNip: c[pk + '_NIP'] || '' };
}
function rrpdNama_(d) { return 'RRPD_' + d.bidang + '_' + d.tahun + '_' + d.s.nama.replace(/[^\w]+/g, '_').slice(0, 40); }
function rrpdList(t, tahun) { // ringkasan semua Sub Kegiatan per bidang (Admin dkk: bidangnya sendiri)
  // KECEPATAN: hasil disimpan di cache 5 menit; otomatis dihitung ulang begitu ada data yang berubah (pengajuan, kwitansi, DPA, generate, dll.)
  const u = auth_(t, true); if (PIMPINAN_.includes(u.role)) throw new Error('Menu RRPD tidak tersedia untuk ' + u.role + '.');
  const bd = bid_(u), ck = 'rrpd_' + cacheVer_('data') + '_' + tahun + '_' + (bd || 'SEMUA'), hit = cacheGet_(ck);
  if (hit) return hit;
  const D = rrpdBaca_(), c = cfg_();
  const out = (bd ? [bd] : BIDANG).map(b => ({ bidang: b, jabatan: rrpdJabatan_(c, b), subs: rrpdHitung_(b, tahun, D) }));
  cachePut_(ck, out, 300);
  return out;
}
function rrpdGenerate(t, key, ulang) { // Generate RRPD hanya 1x per Bidang|Tahun|Sub Kegiatan - selanjutnya cukup dilihat (ikon mata)
  // ulang = true: Generate Ulang, KHUSUS Super Admin - catatan generate lama diganti yang baru (isi RRPD selalu disusun dengan fungsi terbaru)
  const u = auth_(t, true);
  if (!RRPD_GEN_ROLES.includes(u.role)) throw new Error('Anda hanya dapat melihat RRPD.');
  if (ulang && u.role !== 'Super Admin') throw new Error('Generate Ulang hanya dapat dilakukan Super Admin.');
  const L = LockService.getScriptLock(); L.waitLock(20000); // dikunci: klik ganda / dua admin bersamaan tetap hanya tercatat 1x
  try {
    const d = rrpdData_(u, key, cfg_()), k = d.bidang + '|' + d.tahun + '|' + d.s.nama;
    if (d.s.gen && !ulang) throw new Error('RRPD ini sudah di-generate pada ' + d.s.gen.tgl + ' oleh ' + d.s.gen.oleh + '. Gunakan ikon mata untuk melihatnya.');
    const gs = rrpdGenSheet_();
    if (ulang) rows_('RRPD_GEN').filter(x => x.Kunci === k).sort((a, b) => b._r - a._r).forEach(x => gs.deleteRow(x._r));
    const w = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    gs.appendRow([k, d.bidang, String(d.tahun), d.s.nama, w, u.nama]);
    cacheBump_('data'); // supaya daftar RRPD langsung menampilkan status "Sudah di-generate"
    logAksi_(u, ulang ? 'Generate Ulang RRPD' : 'Generate RRPD', d.bidang + ' ' + d.tahun + ' - ' + d.s.nama);
    return { tgl: w, oleh: u.nama };
  } finally { L.releaseLock(); }
}
function rrpdSaveJabatan(t, bidang, jabatan) {
  const u = auth_(t, true); rrpdIzin_(u, bidang);
  if (!RRPD_GEN_ROLES.includes(u.role)) throw new Error('Anda hanya dapat melihat RRPD.');
  const v = String(jabatan || '').trim().slice(0, 200);
  if (/^[=+\-@]/.test(v)) throw new Error('Jabatan tidak boleh diawali karakter = + - @.');
  setCfg_('RRPD_JABATAN_' + bidang.toUpperCase(), v);
  cacheBump_('data');
  logAksi_(u, 'Ubah Jabatan Penandatangan RRPD', bidang + ': ' + (v || '(bawaan)'));
  return rrpdJabatan_(cfg_(), bidang);
}
function rrpdHtml_(d, c) { // pratinjau - tata letak tabel sama dengan PDF (sel gabung, "Rp" rata kiri & angka rata kanan)
  const s = d.s, n = s.rows.length, M = 'vertical-align:middle';
  const acc = (v, st) => '<span style="display:flex;justify-content:space-between;gap:6px;white-space:nowrap' + (st || '') + '"><span>Rp</span><span>' + rp_(v) + '</span></span>'; // span (bukan div) supaya ikut ukuran huruf sel
  const blk = (ls, nm, nip) => '<div class="c">' + ls.map(escH_).join('<br>') + '<br><br><br><br><b><u>' + escH_(nm) + '</u></b><br>NIP. ' + escH_(nip) + '</div>';
  const noCell = '<td rowspan="' + ((n ? n * 2 : 1) + 2) + '"></td>';
  let isi = n ? s.rows.map((r, i) => '<tr style="height:16px">' + (i ? '' : noCell) + '<td colspan="5"></td></tr><tr><td style="' + M + ';font-size:.85em">' + rrpdKetHtml_(r.ket) + '</td><td></td><td></td><td style="' + M + ';font-size:.85em">' + acc(r.jumlah) + '</td><td style="' + M + ';font-size:.85em">' + acc(r.sisa) + '</td></tr>').join('')
    : '<tr>' + noCell + '<td colspan="5">Belum ada Pengajuan Pencairan yang disetujui untuk Sub Kegiatan ini.</td></tr>';
  isi += '<tr style="height:16px"><td colspan="5"></td></tr><tr><td colspan="3" style="text-align:right"><b>JUMLAH PENGELUARAN</b></td><td colspan="2"><b>' + acc(s.jumlah, ';color:#FF0000') + '</b></td></tr>'
    + '<tr style="height:16px"><td colspan="6"></td></tr><tr style="background:#FFFF00"><td colspan="4" style="text-align:right;font-size:1.15em"><b>SISA KAS</b></td><td colspan="2" style="font-size:1.15em"><b>' + acc(s.sisa) + '</b></td></tr>';
  return '<div>RINCIAN RENCANA PENGGUNAAN DANA( RRPD) SESUAI ANGGARAN KAS DPA ' + escH_(d.tahun) + '<br><b>BIDANG : ' + escH_(d.bidang.toUpperCase()) + '</b></div>'
    + '<table style="margin:12px 0 4px;font-weight:bold;width:100%"><tr><td style="width:36.5%;padding:0;font-size:1.3em">SUB KEGIATAN</td><td style="padding:0;font-size:1.3em">: ' + escH_(s.nama) + '</td></tr></table>'
    + '<table class="b" style="table-layout:fixed"><colgroup>' + RRPD_W_.map(x => '<col style="width:' + (x * 100).toFixed(1) + '%">').join('') + '</colgroup>'
    + '<tr>' + ['NO', 'PENGAJUAN', 'AKUN/REKENING', 'PAGU SESUAI DPA', 'JUMLAH PENGELUARAN', 'SISA ANGGARAN'].map(h => '<td class="c" style="' + M + ';font-size:.72em"><b>' + h + '</b></td>').join('') + '</tr>'
    + '<tr><td class="c" style="' + M + '">1</td><td style="' + M + '">' + d.uraian + '</td><td class="c" style="' + M + ';font-size:.85em">' + escH_(s.kode) + '</td><td style="' + M + ';font-size:1em"><b>' + acc(s.pagu) + '</b></td><td></td><td></td></tr>'
    + isi + '</table><br><br>'
    + '<table width="100%"><tr><td width="50%">' + blk(['Mengetahui', 'an KASAT POL PP & KEBAKARAN', c.TTD_JABATAN + ','], c.TTD_NAMA, c.TTD_NIP) + '</td>'
    + '<td width="50%">' + blk(['Bajawa,_______ /________________ ' + d.tahun, d.jabatan], d.kabidNama, d.kabidNip) + '</td></tr></table>';
}
function rrpdDoc_(cell, cw, d, c) { // versi Google Docs - dipakai untuk Word & Edit di Docs (Docs tidak bisa menggabung sel lewat script, jadi sel tetap terpisah)
  const p = 'SP', H = DocumentApp.HorizontalAlignment, CE = H.CENTER, RT = H.RIGHT, VC = DocumentApp.VerticalAlignment.CENTER, s = d.s;
  pa_(cell, 'RINCIAN RENCANA PENGGUNAAN DANA( RRPD) SESUAI ANGGARAN KAS DPA ' + d.tahun, c, p);
  pa_(cell, 'BIDANG : ' + d.bidang.toUpperCase(), c, p, { b: 1 });
  pa_(cell, '', c, p);
  pa_(cell, 'SUB KEGIATAN : ' + s.nama, c, p, { b: 1, k: 1.25 });
  const w = RRPD_W_.map(x => Math.round(cw * x)); w[5] = cw - w[0] - w[1] - w[2] - w[3] - w[4];
  const kosong = ['', '', '', '', '', ''], rows = [['NO', 'PENGAJUAN', 'AKUN/\nREKENING', 'PAGU SESUAI\nDPA', 'JUMLAH\nPENGELUARAN', 'SISA\nANGGARAN'].map(h => [h, true, CE]),
    [['1', false, CE], d.uraian, [s.kode, false, CE], ['Rp ' + rp_(s.pagu), true, RT], '', '']];
  s.rows.forEach(r => { rows.push(kosong); rows.push(['', r.ket, '', '', ['Rp ' + rp_(r.jumlah), false, RT], ['Rp ' + rp_(r.sisa), false, RT]]); });
  if (!s.rows.length) rows.push(['', 'Belum ada Pengajuan Pencairan yang disetujui untuk Sub Kegiatan ini.', '', '', '', '']);
  rows.push(kosong, ['', '', '', ['JUMLAH\nPENGELUARAN', true, RT], ['Rp ' + rp_(s.jumlah), true, RT], ''], kosong, ['', '', '', ['SISA KAS', true, RT], '', ['Rp ' + rp_(s.sisa), true, RT]]);
  const t = tb_(cell, rows, w, c, p, true, 1, 6), z = Number(c.UKURAN_SP), nR = rows.length;
  for (let i = 0; i < nR; i++) for (let j = 0; j < 6; j++) t.getCell(i, j).setVerticalAlignment(VC);
  for (let i = 0; i < nR; i++) if (rows[i] === kosong) for (let j = 0; j < 6; j++) t.getCell(i, j).setPaddingTop(1).setPaddingBottom(1).editAsText().setFontSize(z * 0.5); // baris jeda tipis
  for (let j = 0; j < 6; j++) { t.getCell(0, j).editAsText().setFontSize(z * 0.85); t.getCell(nR - 1, j).setBackgroundColor('#FFFF00'); }
  t.getCell(nR - 3, 4).editAsText().setForegroundColor('#FF0000'); // nilai Jumlah Pengeluaran berwarna merah
  pa_(cell, '', c, p); pa_(cell, '', c, p);
  const g = cell.appendTable([['', '']]).setBorderWidth(0).setColumnWidth(0, cw * 0.5).setColumnWidth(1, cw * 0.5);
  const blk = (tc, ls, nm, nip) => { noPad_(tc); ls.forEach(l => pa_(tc, l, c, p, { al: CE })); pa_(tc, '', c, p); pa_(tc, '', c, p); pa_(tc, '', c, p);
    pa_(tc, nm, c, p, { al: CE, b: 1, u: 1 }); pa_(tc, 'NIP. ' + nip, c, p, { al: CE }); tc.removeChild(tc.getChild(0)); };
  blk(g.getCell(0, 0), ['Mengetahui', 'an KASAT POL PP & KEBAKARAN', c.TTD_JABATAN + ','], c.TTD_NAMA, c.TTD_NIP);
  blk(g.getCell(0, 1), ['Bajawa,_______ /________________ ' + d.tahun, d.jabatan], d.kabidNama, d.kabidNip);
  pa_(cell, '', c, p);
}
function rrpdPreview(t, key) {
  const u = auth_(t, true), c = cfg_(), h = wrap_(rrpdHtml_(escDeep_(rrpdData_(u, key, c, true)), c), c, 'SP'), hm = c.KERTAS === 'Letter' ? 279 : 356;
  return '<body style="background:#cfd8d3;margin:0;padding:10px"><div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div></body>';
}
function rrpdSs_(d, c) { // PDF RRPD disusun lewat Google Sheets sementara: bisa GABUNG SEL, format akuntansi "Rp   112,370,000", warna & garis persis seperti format Excel
  const s = d.s, ss = SpreadsheetApp.create('tmp_rrpd_' + Date.now()), sh = ss.getSheets()[0];
  const ACC = '_("Rp"* #,##0_);_("Rp"* -#,##0_);_("Rp"* "-"_);_(@_)', SOLID = SpreadsheetApp.BorderStyle.SOLID;
  [38, 270, 110, 150, 120, 125].forEach((x, i) => sh.setColumnWidth(i + 1, x));
  sh.getRange(1, 1, 120, 6).setFontFamily(c.FONT || 'Arial').setFontSize(10).setVerticalAlignment('middle');
  sh.getRange(1, 1, 1, 6).merge().setValue('RINCIAN RENCANA PENGGUNAAN DANA( RRPD) SESUAI ANGGARAN KAS DPA ' + d.tahun);
  sh.getRange(2, 1, 1, 6).merge().setValue('BIDANG : ' + d.bidang.toUpperCase()).setFontWeight('bold');
  sh.getRange(4, 1, 1, 2).merge().setValue('SUB KEGIATAN').setFontWeight('bold').setFontSize(14);
  sh.getRange(4, 3, 1, 4).merge().setValue(': ' + s.nama).setFontWeight('bold').setFontSize(14);
  sh.getRange(5, 1, 1, 6).setValues([['NO', 'PENGAJUAN', 'AKUN/REKENING', 'PAGU SESUAI DPA', 'JUMLAH PENGELUARAN', 'SISA ANGGARAN']]).setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center').setWrap(true);
  sh.setRowHeight(5, 34);
  sh.getRange(6, 3).setNumberFormat('@'); // kode rekening sebagai teks (jangan diubah Sheets jadi angka/tanggal)
  sh.getRange(6, 1, 1, 4).setValues([[1, d.uraian, s.kode, s.pagu]]);
  sh.getRange(6, 1).setHorizontalAlignment('center'); sh.getRange(6, 2).setWrap(true); sh.getRange(6, 3).setHorizontalAlignment('center').setFontSize(9).setWrap(true);
  sh.getRange(6, 4).setNumberFormat(ACC).setFontWeight('bold').setFontSize(13);
  const jeda = r => { sh.getRange(r, 2, 1, 5).merge(); sh.setRowHeight(r, 16); };
  let r = 7; const top = r;
  s.rows.forEach(x => {
    jeda(r); r++;
    sh.getRange(r, 2).setValue(x.ket).setWrap(true).setFontSize(9);
    sh.getRange(r, 5, 1, 2).setValues([[x.jumlah, x.sisa]]).setNumberFormat(ACC);
    sh.setRowHeight(r, Math.max(30, 13 * String(x.ket).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 44)), 0) + 8)); r++; // tinggi baris menyesuaikan panjang & jumlah baris uraian
  });
  if (!s.rows.length) { sh.getRange(r, 2, 1, 5).merge().setValue('Belum ada Pengajuan Pencairan yang disetujui untuk Sub Kegiatan ini.'); r++; }
  jeda(r); r++;
  sh.getRange(r, 2, 1, 3).merge().setValue('JUMLAH PENGELUARAN').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange(r, 5, 1, 2).merge().setValue(s.jumlah).setNumberFormat(ACC).setFontWeight('bold').setFontColor('#FF0000');
  sh.getRange(top, 1, r - top + 1, 1).merge(); // kolom NO menyatu dari bawah baris pertama sampai baris Jumlah Pengeluaran
  r++;
  sh.getRange(r, 1, 1, 6).merge(); sh.setRowHeight(r, 16); r++;
  sh.getRange(r, 1, 1, 4).merge().setValue('SISA KAS').setHorizontalAlignment('right');
  sh.getRange(r, 5, 1, 2).merge().setValue(s.sisa).setNumberFormat(ACC);
  sh.getRange(r, 1, 1, 6).setBackground('#FFFF00').setFontWeight('bold').setFontSize(13);
  sh.setRowHeight(r, 24);
  const tabel = sh.getRange(5, 1, r - 4, 6);
  tabel.setBorder(true, true, true, true, true, true, '#000000', SOLID);
  tabel.setBorder(true, true, true, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  r += 3;
  const blk = (col, ls, nm, nip) => {
    ls.forEach((l, i) => { sh.getRange(r + i, col, 1, 3).merge().setValue(l).setHorizontalAlignment('center').setWrap(true); if (String(l).length > 42) sh.setRowHeight(r + i, 30); });
    sh.getRange(r + 6, col, 1, 3).merge().setValue(nm).setFontWeight('bold').setFontLine('underline').setHorizontalAlignment('center');
    sh.getRange(r + 7, col, 1, 3).merge().setValue('NIP. ' + nip).setHorizontalAlignment('center');
  };
  blk(1, ['Mengetahui', 'an KASAT POL PP & KEBAKARAN', c.TTD_JABATAN + ','], c.TTD_NAMA, c.TTD_NIP);
  blk(4, ['Bajawa,_______ /________________ ' + d.tahun, d.jabatan], d.kabidNama, d.kabidNip);
  if (sh.getMaxColumns() > 6) sh.deleteColumns(7, sh.getMaxColumns() - 6);
  if (sh.getMaxRows() > r + 8) sh.deleteRows(r + 9, sh.getMaxRows() - r - 8);
  SpreadsheetApp.flush();
  return ss;
}
function ambilUlang_(urls, pesan) { // ambil hasil ekspor Google (PDF/Word) - dicoba ulang beberapa kali, dokumen yang baru dibuat kadang belum siap
  const opt = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  let err = '';
  for (let i = 0; i < 4; i++) {
    try { const r = UrlFetchApp.fetch(urls[i % urls.length], opt); if (r.getResponseCode() === 200) return r.getContent(); err = 'kode ' + r.getResponseCode(); }
    catch (e) { err = e.message; }
    Utilities.sleep(1000 * (i + 1));
  }
  throw new Error(pesan + ' (' + err + ')');
}
function rrpdPdf(t, key) {
  const u = auth_(t, true), c = cfg_(), d = rrpdData_(u, key, c, true), ss = rrpdSs_(d, c), id = ss.getId();
  try {
    const inci = mm => (Math.max(0, Number(mm) || 0) / 25.4).toFixed(2);
    const q = 'format=pdf&size=' + (c.KERTAS === 'Letter' ? 'letter' : 'legal') + '&portrait=true&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false&horizontal_alignment=CENTER'
      + '&top_margin=' + inci(c.SP_ATAS) + '&bottom_margin=' + inci(c.SP_BAWAH) + '&left_margin=' + inci(c.SP_KIRI) + '&right_margin=' + inci(c.SP_KANAN);
    const pdf = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?' + q], 'PDF RRPD belum berhasil dibuat, silakan klik Unduh PDF sekali lagi.');
    logAksi_(u, 'Cetak RRPD', d.bidang + ' ' + d.tahun + ' - ' + d.s.nama);
    return { name: rrpdNama_(d) + '.pdf', b64: Utilities.base64Encode(pdf) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}


// ---------- Arsip Data per Tahun (khusus Super Admin) & pembatasan data yang dimuat ----------
// Data tahun yang sudah lewat dipindahkan ke spreadsheet arsip tersendiri ("Arsip REGISTER SPPD <tahun>") di folder yang sama,
// supaya spreadsheet utama tetap ringan dan aplikasi tetap cepat. Tahun berjalan tidak bisa diarsipkan.
// Yang dipindahkan: DATA_SPPD (tahun Surat Tugas), KWITANSI & LAPORAN (Surat Tugas tahun itu), PENGAJUAN (berisi Surat Tugas tahun itu), RRPD_GEN (tahun itu).
// DPA tahun itu hanya disalin (tetap ada di spreadsheet utama). Log Aktivitas & nomor register tidak diubah.
function TAHUN_MIN_() { return String(Number(today_().slice(0, 4)) - 1); } // data yang dimuat saat login: tahun lalu s.d. tahun berjalan
function arsipId_(tahun) { return String(cfg_()['ARSIP_' + tahun] || '').split('|')[0]; }
function arsipRows_(tahun, nama) { // baca baris sheet dari spreadsheet arsip tahun itu (kosong bila belum diarsipkan / gagal dibuka)
  const id = arsipId_(tahun); if (!id) return [];
  try {
    const s = SpreadsheetApp.openById(id).getSheetByName(nama); if (!s || s.getLastRow() < 2) return [];
    const v = s.getDataRange().getValues(), h = v.shift();
    return v.map(r => { const o = {}; h.forEach((k, j) => o[k] = r[j] instanceof Date ? Utilities.formatDate(r[j], TZ, 'yyyy-MM-dd') : r[j]); return o; }).filter(o => o[h[0]] !== '');
  } catch (e) { return []; }
}
function arsipInfo(t) {
  auth_(t, 2);
  const now = today_().slice(0, 4), c = cfg_(), hit = {};
  rows_('DATA_SPPD').forEach(x => { const y = String(x.TglST).slice(0, 4); if (!/^\d{4}$/.test(y)) return; (hit[y] = hit[y] || { baris: 0, st: new Set() }).baris++; hit[y].st.add(x.NoST); });
  const arsip = Object.keys(c).filter(k => /^ARSIP_\d{4}$/.test(k) && c[k]).map(k => { const [id, tgl] = String(c[k]).split('|'); return { tahun: k.slice(6), url: 'https://docs.google.com/spreadsheets/d/' + id, tgl: tgl || '' }; }).sort((a, b) => b.tahun.localeCompare(a.tahun));
  return {
    tahunIni: now, tahunMin: TAHUN_MIN_(), arsip: arsip,
    data: Object.keys(hit).sort().map(y => ({ tahun: y, baris: hit[y].baris, st: hit[y].st.size, bisa: y < now }))
  };
}
function arsipkanTahun(t, tahun, pass) {
  const u = auth_(t, 2); tahun = String(tahun || '');
  if (!/^\d{4}$/.test(tahun)) throw new Error('Tahun tidak valid.');
  if (tahun >= today_().slice(0, 4)) throw new Error('Tahun berjalan (' + today_().slice(0, 4) + ') tidak dapat diarsipkan. Hanya tahun yang sudah lewat.');
  if (!rows_('USERS').some(x => String(x.Username) === String(u.u) && x.Hash === hash_(pass) && x.Aktif === 'Ya')) throw new Error('Sandi salah.');
  const L = LockService.getScriptLock(); L.waitLock(30000);
  try {
    const keys = new Set(rows_('DATA_SPPD').filter(x => String(x.TglST).slice(0, 4) === tahun).map(x => x.NoST));
    if (!keys.size) throw new Error('Tidak ada data Surat Tugas tahun ' + tahun + ' di spreadsheet utama.');
    const kenaST = list => String(list || '').split('|').some(k => keys.has(k));
    if (sh_('PENGAJUAN') && rows_('PENGAJUAN').some(p => p.Status === 'Diajukan' && kenaST(p.NoSTList)))
      throw new Error('Masih ada Pengajuan Pencairan tahun ' + tahun + ' berstatus Diajukan. Selesaikan (Setujui/Tolak) terlebih dahulu, lalu arsipkan.');
    // spreadsheet arsip: pakai yang sudah ada (arsip susulan), atau buat baru di folder yang sama dengan spreadsheet utama
    let id = arsipId_(tahun), ar = null;
    if (id) { try { ar = SpreadsheetApp.openById(id); } catch (e) { ar = null; } }
    if (!ar) {
      ar = SpreadsheetApp.create('Arsip REGISTER SPPD ' + tahun); id = ar.getId();
      try { const f = DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getParents(); if (f.hasNext()) DriveApp.getFileById(id).moveTo(f.next()); } catch (e) {}
    }
    const hasil = {};
    const pindah = (nama, cocok, salinSaja) => { // salin baris yang cocok ke arsip; bila bukan salinSaja, hapus dari spreadsheet utama (sekali tulis)
      const s = sh_(nama); if (!s || s.getLastRow() < 2) { hasil[nama] = 0; return; }
      const v = s.getDataRange().getValues(), h = v.shift(), o = r => { const x = {}; h.forEach((k, j) => x[k] = r[j] instanceof Date ? Utilities.formatDate(r[j], TZ, 'yyyy-MM-dd') : r[j]); return x; };
      const isi = v.filter(r => String(r[0]) !== ''), ke = isi.filter(r => cocok(o(r))), tetap = isi.filter(r => !cocok(o(r)));
      hasil[nama] = ke.length; if (!ke.length) return;
      let a = ar.getSheetByName(nama);
      if (!a) { a = ar.insertSheet(nama); a.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold'); a.setFrozenRows(1); }
      const teks = ke.map(r => r.map(x => x instanceof Date ? Utilities.formatDate(x, TZ, 'yyyy-MM-dd') : x));
      const r0 = a.getLastRow() + 1;
      a.getRange(r0, 1, teks.length, h.length).setNumberFormat('@').setValues(teks);
      if (salinSaja) return;
      s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).clearContent();
      if (tetap.length) s.getRange(2, 1, tetap.length, h.length).setValues(tetap);
    };
    pindah('DATA_SPPD', x => String(x.TglST).slice(0, 4) === tahun);
    pindah('KWITANSI', x => keys.has(x.NoST));
    pindah('LAPORAN', x => keys.has(x.NoST));
    pindah('DASAR_ST', x => keys.has(x.NoST));
    pindah('ST_KHUSUS', x => keys.has(x.NoST));
    pindah('PENGAJUAN', x => kenaST(x.NoSTList));
    pindah('RRPD_GEN', x => String(x.Tahun) === tahun);
    if (!arsipRows_(tahun, 'DPA').length) pindah('DPA', x => String(x.Tahun) === tahun, true);
    const def = ar.getSheetByName('Sheet1') || ar.getSheetByName('Lembar1'); if (def && ar.getSheets().length > 1) ar.deleteSheet(def);
    setCfg_('ARSIP_' + tahun, id + '|' + today_());
    SpreadsheetApp.flush();
    cacheBump_('data');
    logAksi_(u, 'Arsip Data', 'Tahun ' + tahun + ': ' + hasil.DATA_SPPD + ' baris SPPD, ' + hasil.KWITANSI + ' Kwitansi, ' + hasil.LAPORAN + ' Laporan, ' + hasil.PENGAJUAN + ' Pengajuan dipindahkan ke spreadsheet arsip.');
    return { tahun: tahun, url: 'https://docs.google.com/spreadsheets/d/' + id, hasil: hasil };
  } finally { L.releaseLock(); }
}


// =====================================================================
// ---------- TURBO: cache bersama, batch, pemanasan (gas-scale-turbo) ----------
// Tidak menambah/mengubah sheet, kolom, atau baris. Hanya cara membaca & menyimpan sementara (cache).
// =====================================================================
const APP_VER_ = 'turbo-1';
// aksi BACA yang boleh digabung dalam satu permintaan 'batch'
const BATCH_OK_ = ['dpaGet', 'getDpa', 'pencairanEligible', 'pengajuanList', 'pengajuanRincian', 'rrpdList', 'waInfo', 'arsipInfo', 'logList', 'pegawaiList', 'bkuList', 'getCfg', 'publicInfo', 'notifST', 'backupInfo'];
function bootBase_(fresh) { // bacaan sheet yang SAMA untuk semua pengguna saat login/buka app - disimpan bersama 10 menit (cache berversi, otomatis baru saat data berubah)
  const key = 'base_' + cacheVer_('data') + '_' + TAHUN_MIN_();
  if (!fresh) { const hit = cacheGet_(key); if (hit) return hit; }
  const b = {
    all: rows_('DATA_SPPD').filter(x => String(x.TglST).slice(0, 4) >= TAHUN_MIN_()), // hanya tahun berjalan & tahun lalu yang dikirim ke HP/browser (data lama tetap aman di sheet)
    kw: kwRows_(), lap: lapRows_(), wil: wilRows_(), peg: rows_('PEGAWAI').filter(p => p.Aktif === 'Ya'),
    users: rows_('USERS').map(x => ({ Username: x.Username, Role: x.Role, Nama: x.Nama, Foto: x.Foto, Bidang: x.Bidang || '' })) // tanpa kolom Hash
  };
  cachePut_(key, b, 600);
  return b;
}
function warm_(alasan) { // panaskan cache bersama (pengaturan, logo, data dasar login) - dibatasi supaya tidak boros kuota
  const c = CacheService.getScriptCache();
  if (alasan !== 'setup' && c.get('warm_flag')) return 'skip';
  c.put('warm_flag', '1', alasan === 'tick' ? 240 : 60);
  _CFG = null; cfg_();
  bootBase_(false);
  ['LOGO_DASHBOARD', 'LOGO_LOGIN', 'LOGO_DOKUMEN'].forEach(k => { try { logoUri_(k); } catch (e) {} });
  ver_();
  c.put('warm_last', JSON.stringify({ at: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'), oleh: alasan }), 21600);
  return 'ok';
}
function keepWarm() { // dijalankan trigger tiap 5 menit
  if (PropertiesService.getScriptProperties().getProperty('KEEP_WARM') === 'off') return;
  try { warm_('tick'); } catch (e) {}
}
// ---- Jalankan dari editor Apps Script (pilih nama fungsi lalu klik Run) ----
function setupTurbo() { // SEKALI JALAN, aman diulang: pasang trigger keepWarm (5 menit) + panaskan cache. Tidak menulis ke spreadsheet.
  PropertiesService.getScriptProperties().setProperty('KEEP_WARM', 'on');
  if (!ScriptApp.getProjectTriggers().some(x => x.getHandlerFunction() === 'keepWarm')) ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  cacheBump_('data');
  Logger.log('Pemanasan: ' + warm_('setup'));
  cekPerforma();
}
function matikanKeepWarm() {
  PropertiesService.getScriptProperties().setProperty('KEEP_WARM', 'off');
  ScriptApp.getProjectTriggers().filter(x => x.getHandlerFunction() === 'keepWarm').forEach(x => ScriptApp.deleteTrigger(x));
  Logger.log('keepWarm dimatikan.');
}
function nyalakanKeepWarm() { setupTurbo(); }
function cekPerforma() {
  const c = CacheService.getScriptCache(), base = 'base_' + cacheVer_('data') + '_' + TAHUN_MIN_();
  Logger.log('Versi server       : ' + APP_VER_);
  Logger.log('Cache data login   : ' + (c.get(base) ? 'HANGAT' : 'dingin (akan terisi saat login/pemanasan berikutnya)'));
  Logger.log('Pemanasan terakhir : ' + (c.get('warm_last') || '-'));
  Logger.log('keepWarm           : ' + (PropertiesService.getScriptProperties().getProperty('KEEP_WARM') === 'off' ? 'MATI' : 'AKTIF'));
  Logger.log('Trigger            : ' + ScriptApp.getProjectTriggers().map(x => x.getHandlerFunction()).join(', '));
}


// ---------- Dasar Surat Tugas (opsional) ----------
// Disimpan di sheet tersendiri DASAR_ST (NoST, Dasar) - sheet DATA_SPPD tidak diubah. Satu dasar per baris; nomor 1, 2, 3 dibuat otomatis saat dicetak.
function dasarSheet_() { let s = sh_('DASAR_ST'); if (!s) { s = SpreadsheetApp.getActive().insertSheet('DASAR_ST'); s.appendRow(['NoST', 'Dasar']); s.setFrozenRows(1); s.getRange('A:B').setNumberFormat('@'); } return s; }
function dasarList_(v) { return String(v || '').split(/\r?\n/).map(t => t.replace(/^\s*(\d{1,2}[.)]?\s+|[-•]\s*)/, '').trim()).filter(Boolean).slice(0, 20).map(t => t.slice(0, 500)); }
function dasarGet_(noST) { if (!sh_('DASAR_ST')) return ''; const r = rows_('DASAR_ST').find(x => x.NoST === noST); return r ? String(r.Dasar || '') : ''; }
function dasarSet_(noST, v) {
  const isi = dasarList_(v).join('\n'), s = sh_('DASAR_ST'), ada = s ? rows_('DASAR_ST').filter(x => x.NoST === noST) : [];
  if (!isi) { if (s) ada.sort((a, b) => b._r - a._r).forEach(x => s.deleteRow(x._r)); return; }
  const ss = dasarSheet_();
  if (ada.length) ss.getRange(ada[0]._r, 2).setValue(rumusAman_(isi)); else ss.appendRow([noST, rumusAman_(isi)]);
}
function dasarGet(t, noST) { own_(auth_(t, true), noST); return dasarGet_(noST); }
function dasarHtml_(x) {
  const d = dasarList_(x.DasarST);
  if (!d.length) return '<table><tr><td width="60" valign="top">Dasar</td><td valign="top">:</td><td></td></tr></table>'; // kosong = seperti sebelumnya
  return '<table><tr><td width="60" valign="top">Dasar</td><td valign="top">:</td><td><table>' + d.map((t, i) => '<tr><td width="18" valign="top">' + (d.length > 1 ? (i + 1) : '') + '</td><td>' + escH_(t) + '</td></tr>').join('') + '</table></td></tr></table>';
}


// ---------- Indeks bantu (optimasi): mengelompokkan baris per No. Surat Tugas SEKALI, bukan mencari ulang untuk setiap ST ----------
function grupST_(rows) { const m = new Map(); rows.forEach(x => { const a = m.get(x.NoST); if (a) a.push(x); else m.set(x.NoST, [x]); }); return m; } // urutan baris tetap sama seperti filter()
function pertamaST_(rows) { const m = new Map(); rows.forEach(x => { if (!m.has(x.NoST)) m.set(x.NoST, x); }); return m; } // sama seperti find(): baris pertama yang cocok


// ---------- SURAT TUGAS KHUSUS (Terbitkan Khusus - Super Admin): Surat Tugas + SATU SPPD (petugas no. 1 di kolom 2, petugas lain di kolom 8 Pengikut) ----------
// Penomoran: hanya 2 nomor - Surat Tugas n, SPPD n+1 (dipakai bersama semua petugas). ST khusus ditandai di sheet ST_KHUSUS. Penerbitan biasa tidak berubah.
// Tanggal Lahir pengikut diambil dari 8 digit awal NIP (tttt bb hh), Keterangan dari Jabatan. Tanpa TTD/CAP di SPPD (sama seperti SPPD biasa).
function tglLahirNip_(nip) {
  const m = String(nip || '').replace(/\D/g, '').match(/^(\d{4})(\d{2})(\d{2})/); if (!m) return '-';
  const y = +m[1], b = +m[2], d = +m[3], skr = new Date().getFullYear();
  if (y < 1940 || y > skr - 15 || b < 1 || b > 12 || d < 1 || d > new Date(y, b, 0).getDate()) return '-';
  return d + ' ' + BLN[b - 1] + ' ' + y;
}
function spKhususBaris_(r, c, opt) { // isi tabel SPPD (Khusus & Normal) - dipakai bersama oleh pratinjau (HTML) & PDF (impor HTML ke Google Docs)
  const x = r[0], nor = opt && opt.normal;
  return [
    ['1.', 'Pejabat Pembuat Komitmen', c.PIM ? c.PIM.ppk : 'KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN'],
    ['2.', 'Nama / NIP Pegawai yang melaksanakan perjalanan dinas', '<b>' + escH_(x.Nama) + ' / ' + escH_(x.NIP) + '</b>'],
    ['3.', 'a.&nbsp; Pangkat dan Golongan<br>b.&nbsp; Jabatan / Instansi<br>c.&nbsp; Tingkat Biaya Perjalanan Dinas', 'a.&nbsp; ' + escH_(x.Pangkat) + '<br>b.&nbsp; ' + escH_(x.Jabatan) + ' / SATPOL PP &amp; KEBAKARAN<br>c.&nbsp; ' + escH_(x.TB || c.BIAYA)],
    ['4.', 'Maksud Perjalanan Dinas', escH_(x.Maksud) + '<br><br>'],
    ['5.', 'Alat angkut yang dipergunakan', escH_(c.ANGKUT)],
    ['6.', 'a.&nbsp; Tempat berangkat<br>b.&nbsp; Tempat tujuan', 'a.&nbsp; ' + escH_(c.KANTOR) + '<br>b.&nbsp; ' + escH_(x.Tujuan)],
    ['7.', 'a.&nbsp; Lamanya perjalanan dinas<br>b.&nbsp; Tanggal berangkat<br>c.&nbsp; Tanggal harus kembali / ' + (nor ? 'tiba di tempat baru' : 'Tiba di Tempat Baru') + ' *)', 'a.&nbsp; ' + x.Lama + (nor ? '' : ' (' + terbilang_(x.Lama) + ')') + ' Hari<br>b.&nbsp; ' + idn_(x.Berangkat) + '<br>c.&nbsp; ' + idn_(x.Kembali)] // SPPD Normal: teks tetap seperti sebelumnya
  ];
}
function spKhususTabelHtml_(r, c, w, impor, opt) { // opt.kosong = jumlah baris Pengikut kosong (SPPD Normal); opt.normal = teks baris 1-7 seperti SPPD Normal // w = lebar kolom [No, Nomor Pengikut, Nama, Tanggal Lahir, Keterangan]; impor = untuk dibuat di Google Docs (lebar pasti dalam pt)
  const ik = r.slice(1), B = 'border:1px solid #000;border-right:1px solid #000;border-left:1px solid #000;padding:2px 3px;vertical-align:top', col = '<colgroup>' + w.map(v => '<col style="width:' + v + '">').join('') + '</colgroup>';
  const baris = (no, a, b) => '<tr><td style="' + B + ';text-align:center">' + no + '</td><td colspan="2" style="' + B + '">' + a + '</td><td colspan="2" style="' + B + '">' + b + '</td></tr>';
  let h = (impor ? '<table border="1" cellspacing="0" style="border-collapse:collapse;border:1px solid #000;width:' + impor + 'pt">' : '<table style="border-collapse:collapse;width:100%;table-layout:fixed">') + col + spKhususBaris_(r, c, opt).map(x => baris(x[0], x[1], x[2])).join('');
  h += '<tr><td style="' + B + ';text-align:center">8.</td><td colspan="2" style="' + B + '">Pengikut :&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Nama</td><td style="' + B + ';text-align:center">Tanggal Lahir</td><td style="' + B + ';text-align:center">' + (opt && opt.normal ? 'Keterangan' : 'Jabatan') + '</td></tr>'; // SPPD Khusus: Jabatan; SPPD Normal: Keterangan
  const kosong = opt && opt.kosong ? Array.from({ length: opt.kosong }, (_, n) => ({ kosong: true })) : null; // SPPD Normal: baris Pengikut kosong 1, 2, 3
  (kosong || ik).forEach((q, i, arr) => {
    if (q.kosong) { h += '<tr>' + (i ? '' : '<td rowspan="' + arr.length + '" style="' + B + '"></td>') + '<td style="' + B + ';text-align:center;font-size:.8em;padding:1px 2px">' + (i + 1) + '.</td><td style="' + B + ';padding:1px 3px">&nbsp;</td><td style="' + B + ';padding:1px 3px">&nbsp;</td><td style="' + B + ';padding:1px 3px">&nbsp;</td></tr>'; return; }
    h += '<tr>' + (i ? '' : '<td rowspan="' + arr.length + '" style="' + B + '"></td>')
      + '<td style="' + B + ';text-align:center;font-size:.8em;padding:1px 2px">' + (i + 1) + '.</td>'
      + '<td class="fit" style="' + B + ';white-space:nowrap;overflow:hidden;padding:1px 3px">' + escH_(q.Nama) + '</td>'
      + '<td class="fit" style="' + B + ';white-space:nowrap;overflow:hidden;padding:1px 3px;text-align:left">' + tglLahirNip_(q.NIP) + '</td>'
      + '<td class="fit" style="' + B + ';white-space:nowrap;overflow:hidden;padding:1px 3px;text-align:left">' + escH_(q.Jabatan) + '</td></tr>';
  });
  h += baris('9.', 'Pembebanan&nbsp; Anggaran<br>a.&nbsp; Instansi<br>b.&nbsp; Akun', '<br>a.&nbsp; SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>b.') + baris('10.', 'Keterangan lain-lain', '') + '</table>';
  return h;
}
function spKhususHtml_(r, c) { // pratinjau SPPD Khusus - garis kolom seperti contoh: Pengikut bernomor, kolom No digabung, nama panjang otomatis dikecilkan
  const x = r[0];
  const fit = '<script>(function(){function f(){document.querySelectorAll(".fit").forEach(function(e){e.style.fontSize="";var s=parseFloat(getComputedStyle(e).fontSize),m=s*0.6;e.style.whiteSpace="nowrap";while(e.scrollWidth>e.clientWidth+1&&s>m){s-=0.25;e.style.fontSize=s+"px"}if(e.scrollWidth>e.clientWidth+1)e.style.whiteSpace="normal"})}f();addEventListener("load",f);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(f)})()</script>'; // sangat panjang: setelah dikecilkan maksimal, baru boleh turun baris
  const kop = kop_(c).replace('width="72" height="73"', 'width="86" height="87"').replace('border-bottom:3px solid #000', 'border-bottom:1.5px solid #000'); // logo sedikit lebih besar, garis kop lebih tipis
  return kop + '<table style="margin-left:50%;margin-top:8px"><tr><td>Lembar Ke</td><td>:</td></tr><tr><td>Kode Nomor</td><td>: ' + c.KODE + '</td></tr><tr><td>Nomor</td><td>: ' + x.NoSPPD + '</td></tr></table><div class="c" style="margin:8px 0"><b><u>SURAT PERJALANAN DINAS (SPD)</u></b></div>'
    + spKhususTabelHtml_(r, c, ['4%', '4%', '33%', '22%', '37%'])
    + '<small>*Coret yang tidak perlu</small><br><table style="margin-left:50%"><tr><td>Dikeluarkan di</td><td>: ' + c.KOTA + '</td></tr><tr><td>Tanggal</td><td>: ' + idn_(x.TglST) + '</td></tr></table>'
    + ttd_(c).replace('an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>', '<div class="fit" style="white-space:nowrap;overflow:hidden">an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN</div>') + fit; // an.KEPALA ... satu baris
}
function spKhususTabelCadangan_(cell, cw, r, c) { // susunan cadangan (3 tabel bersambung) - dipakai bila impor tabel bergabung tidak tersedia
  const p = 'SP', x = r[0], ik = r.slice(1), CE = DocumentApp.HorizontalAlignment.CENTER, w1 = 24, w2 = Math.round(cw * 0.36), w3 = cw - w1 - w2, w3a = Math.round(w3 * 0.34);
  const R = (n, a, b) => [String(n), a, b];
  tb_(cell, [
    R(1, 'Pejabat Pembuat Komitmen', 'KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN'),
    R(2, 'Nama / NIP Pegawai yang melaksanakan perjalanan dinas', [x.Nama + ' / ' + x.NIP, true]),
    R(3, 'a. Pangkat dan Golongan\nb. Jabatan / Instansi\nc. Tingkat Biaya Perjalanan Dinas', 'a. ' + x.Pangkat + '\nb. ' + x.Jabatan + ' / SATPOL PP & KEBAKARAN\nc. ' + (x.TB || c.BIAYA)),
    R(4, 'Maksud Perjalanan Dinas', x.Maksud + '\n '),
    R(5, 'Alat angkut yang dipergunakan', c.ANGKUT),
    R(6, 'a. Tempat berangkat\nb. Tempat tujuan', 'a. ' + c.KANTOR + '\nb. ' + x.Tujuan),
    R(7, 'a. Lamanya perjalanan dinas\nb. Tanggal berangkat\nc. Tanggal harus kembali / tiba di tempat baru *)', 'a. ' + x.Lama + ' (' + terbilang_(x.Lama) + ') Hari\nb. ' + idn_(x.Berangkat) + '\nc. ' + idn_(x.Kembali))
  ], [w1, w2, w3], c, p, true);
  const t8 = tb_(cell, [['8', 'Pengikut :   Nama', ['Tanggal Lahir', false, CE], ['Jabatan', false, CE]]]
    .concat(ik.map((q, i) => ['', (i + 1) + '. ' + q.Nama, tglLahirNip_(q.NIP), q.Jabatan])), [w1, w2, w3a, w3 - w3a], c, p, true);
  rapat_(t8);
  const t9 = tb_(cell, [R(9, 'Pembebanan Anggaran\na. Instansi\nb. Akun', ' \na. SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN\nb.'), R(10, 'Keterangan lain-lain', ' ')], [w1, w2, w3], c, p, true);
  rapat_(t9);
}
function spKhususTabel_(cell, cw, r, c, opt) { // tabel SPPD Khusus dengan sel bergabung (kolom No & nomor Pengikut) - dibuat dari HTML lewat Google Drive, lalu disalin ke dokumen
  const p = 'SP', ik = r.slice(1), fs = Number(c['UKURAN_' + p]) || 11, w1 = 24, w2 = Math.round(cw * 0.37), wn = 18, w3 = cw - 4 - w1 - w2, w3a = Math.round(w3 * 0.37), W = [w1, wn, w2 - wn, w3a, w3 - w3a];
  const html = '<html><body>' + spKhususTabelHtml_(r, c, W.map(v => v + 'pt'), W.reduce((a, v) => a + v, 0), opt) + '</body></html>';
  const batas = 'BTS' + Date.now(), meta = { name: 'tmp_sppd_khusus_' + Date.now(), mimeType: 'application/vnd.google-apps.document' };
  const isi = '--' + batas + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + batas + '\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n' + html + '\r\n--' + batas + '--';
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'post', contentType: 'multipart/related; boundary=' + batas,
    payload: Utilities.newBlob(isi).getBytes(), headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('impor tabel ' + res.getResponseCode());
  const tid = JSON.parse(res.getContentText()).id;
  let salin;
  try { const tt = DocumentApp.openById(tid).getBody().getTables(); if (!tt.length) throw new Error('tabel tidak ditemukan'); salin = tt[0].copy(); }
  finally { try { DriveApp.getFileById(tid).setTrashed(true); } catch (e) {} }
  const t = cell.appendTable(salin);
  t.setBorderWidth(1).setBorderColor('#000000');
  W.forEach((v, j) => { try { t.setColumnWidth(j, v); } catch (e) {} });
  t.editAsText().setFontFamily(c.FONT).setFontSize(fs);
  const A = DocumentApp.Attribute, PG = DocumentApp.ElementType.PARAGRAPH, pa = {}; pa[A.LINE_SPACING] = 1; pa[A.SPACING_BEFORE] = 0; pa[A.SPACING_AFTER] = 0; pa[A.INDENT_FIRST_LINE] = 0; pa[A.INDENT_START] = 0;
  const pas = (txt, lebar, dasar) => pasHuruf_(txt, lebar, dasar, c.FONT, 0.6);
  const nama = {}, ket = {}, tgl = {}; ik.forEach(q => { nama[String(q.Nama).trim()] = 1; ket[String(q.Jabatan).trim()] = 1; tgl[tglLahirNip_(q.NIP)] = 1; });
  const fsP = fs * 0.95; // baris Pengikut sedikit lebih rapat
  for (let i = 0; i < t.getNumRows(); i++) {
    const row = t.getRow(i);
    for (let j = 0; j < row.getNumCells(); j++) {
      const tc = row.getCell(j); tc.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(3).setPaddingRight(3);
      for (let k = 0; k < tc.getNumChildren(); k++) { const ch = tc.getChild(k); if (ch.getType() === PG) ch.asParagraph().setAttributes(pa); }
      const tx = String(tc.getText()).trim(); if (!tx) continue;
      if (nama[tx] && i > 7) tc.editAsText().setFontSize(pas(tx, W[2] - 6, fsP)); // nama panjang -> huruf dikecilkan seperlunya, tetap satu baris
      else if (ket[tx] && i > 7) tc.editAsText().setFontSize(pas(tx, W[4] - 6, fsP));
      else if (tgl[tx] && i > 7) tc.editAsText().setFontSize(pas(tx, W[3] - 6, fsP));
      else if (/^\d+\.$/.test(tx) && i > 7) tc.editAsText().setFontSize(Math.round(fs * 0.8 * 2) / 2);
    }
  }
  // perataan: Tanggal Lahir & Keterangan pengikut rata kiri; judul kolom di tengah
  for (let i = 0; i < t.getNumRows(); i++) { const row = t.getRow(i); for (let j = 0; j < row.getNumCells(); j++) { const tc = row.getCell(j), tx = String(tc.getText()).trim(), al = (tx === 'Tanggal Lahir' || tx === 'Keterangan' || tx === 'Jabatan' || /^\d+\.$/.test(tx)) ? DocumentApp.HorizontalAlignment.CENTER : DocumentApp.HorizontalAlignment.LEFT;
    for (let k = 0; k < tc.getNumChildren(); k++) { const ch = tc.getChild(k); if (ch.getType() === PG) ch.asParagraph().setAlignment(al); } } }
  return t;
}
function rapat_(tb) { // rapatkan paragraf kosong yang otomatis disisipkan Google Docs di antara dua tabel, supaya tabel tampak menyambung
  try { const pv = tb.getPreviousSibling(); if (pv && pv.getType() === DocumentApp.ElementType.PARAGRAPH) { const a = {}, A = DocumentApp.Attribute; a[A.FONT_SIZE] = 1; a[A.SPACING_BEFORE] = 0; a[A.SPACING_AFTER] = 0; a[A.LINE_SPACING] = 1; pv.asParagraph().setAttributes(a); } } catch (e) {}
}
function spKhususDoc_(cell, cw, r, c) {
  const p = 'SP', x = r[0], CE = DocumentApp.HorizontalAlignment.CENTER;
  kopDoc_(cell, cw, c, p, { logo: 68, garis: 1 }); // logo sedikit lebih besar, garis bawah kop lebih tipis (khusus SPPD Khusus)
  pa_(cell, '', c, p);
  const wL = 66, wT = 10; // titik dua sejajar: kolom label | : | isi
  tb_(cell, [['', 'Lembar Ke', ':', ''], ['', 'Kode Nomor', ':', c.KODE], ['', 'Nomor', ':', x.NoSPPD]], [Math.round(cw * 0.5), wL, wT, cw - Math.round(cw * 0.5) - wL - wT], c, p, false);
  pa_(cell, '', c, p);
  pa_(cell, 'SURAT PERJALANAN DINAS (SPD)', c, p, { b: 1, u: 1, al: CE });
  pa_(cell, '', c, p);
  const n0 = cell.getNumChildren();
  try { spKhususTabel_(cell, cw, r, c); } // tabel bergabung (sama seperti contoh)
  catch (e) { // bila gagal (mis. impor Google Drive tidak tersedia): hapus sisa yang terlanjur ditambahkan, lalu pakai susunan cadangan
    while (cell.getNumChildren() > n0) cell.removeChild(cell.getChild(cell.getNumChildren() - 1));
    spKhususTabelCadangan_(cell, cw, r, c);
  }
  pa_(cell, '*Coret yang tidak perlu', c, p, { k: 0.85 });
  pa_(cell, '', c, p);
  sigDoc_(cell, cw, c, p, 'Tanggal', x.TglST, { satuBaris: true });
}


function khususST_(noST) { if (!sh_('ST_KHUSUS')) return false; return rows_('ST_KHUSUS').some(x => x.NoST === noST); }
// ---------- Surat Tugas & SPPD Khusus Pimpinan (Kepala Satuan) ----------
// Berdiri sendiri: data di sheet ST_PIMPINAN, TIDAK memakai/menggeser nomor Surat Tugas & SPPD petugas biasa. Nomor dicetak dengan bagian urut
// DIKOSONGKAN (diisi tulisan tangan setelah dicetak). Kop = Sekretariat Daerah, penanda tangan = Asisten (diatur Super Admin di Control Panel).
// Tata letak memakai pembuat dokumen yang sama dengan Surat Tugas & SPPD biasa; bedanya hanya lewat c.PIM (lihat kop_, ttd_, kopDoc_, sigDoc_, spKhususBaris_).
const PIM_COLS_ = ['ID', 'TglST', 'Berangkat', 'Lama', 'Tujuan', 'Maksud', 'Dasar', 'Bidang', 'Dibuat'];
const PIM_DEF_ = { PIM_KOP1: 'PEMERINTAH KABUPATEN NGADA', PIM_KOP2: 'SEKRETARIAT DAERAH', PIM_ALAMAT: 'Jln. Soekarno – Hatta No.Tlp. (0384) 21012', PIM_KOTA: 'B A J A W A',
  PIM_NOMOR: '094 / PROKOPIM', PIM_AN1: 'an. BUPATI NGADA', PIM_AN2: 'Pj. SEKRETARIS DAERAH', PIM_JAB: 'ub. Asisten Perekonomian dan Pembangunan',
  PIM_NAMA: 'Dr. Nicolaus Noywuli, S.Pt, M.Si', PIM_PANGKAT: 'PEMBINA UTAMA MUDA', PIM_NIP: '197209212000121004', PIM_PPK: 'ASISTEN PEREKONOMIAN DAN PEMBANGUNAN', PIM_PETUGAS_NIP: '' };
function pimSheet_() {
  let s = sh_('ST_PIMPINAN');
  if (!s) { s = SpreadsheetApp.getActive().insertSheet('ST_PIMPINAN'); s.appendRow(PIM_COLS_); s.setFrozenRows(1); s.getRange('A:I').setNumberFormat('@'); }
  return s;
}
function pimRows_() { return sh_('ST_PIMPINAN') ? rows_('ST_PIMPINAN') : []; }
function pimCfg_(c) { const o = {}; Object.keys(PIM_DEF_).forEach(k => { const v = c[k]; o[k] = (v === undefined || v === null || String(v) === '') && k !== 'PIM_PETUGAS_NIP' ? PIM_DEF_[k] : String(v == null ? '' : v); }); return o; }
function pimNo_(k, tgl) { return k.PIM_NOMOR + ' /' + ' '.repeat(12) + '/ ' + String(tgl).slice(5, 7) + ' / ' + String(tgl).slice(0, 4); } // bagian urut dikosongkan
function pimIzin_(u, r) { const b = bid_(u); if (b && r.Bidang !== b) throw new Error('Surat Tugas Pimpinan ini dibuat oleh ' + (r.Bidang ? 'bidang ' + r.Bidang : 'Super Admin') + ', hanya pembuatnya yang dapat mengubah atau menghapus.'); } // dipakai untuk UBAH & HAPUS; melihat & mencetak terbuka untuk semua Admin
function pimList(t) {
  auth_(t, true); // semua Admin dapat melihat & mencetak semua Surat Tugas Pimpinan
  return cacheFn_('pimL_' + cacheVer_('pim'), 120, () => pimRows_().map(x => ({ ID: x.ID, TglST: x.TglST, Berangkat: x.Berangkat, Lama: Number(x.Lama), Tujuan: x.Tujuan, Maksud: x.Maksud, Dasar: x.Dasar, Bidang: x.Bidang, Dibuat: x.Dibuat }))
    .sort((a, c) => String(c.Dibuat).localeCompare(String(a.Dibuat)))); // disimpan sementara (cache berversi), otomatis baru setelah ada yang menyimpan/menghapus
}
function pimSave(t, f) {
  const u = auth_(t, true), tglOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  if (!tglOk(f.tgl) || !tglOk(f.berangkat)) throw new Error('Tanggal Surat Tugas dan Tanggal Berangkat wajib diisi.');
  const lama = Math.floor(Number(f.lama)); if (!(lama >= 1 && lama <= 60)) throw new Error('Lama bertugas harus 1 sampai 60 hari.');
  const tujuan = String(f.tujuan || '').trim().slice(0, 200), maksud = String(f.maksud || '').trim().slice(0, 600), dasar = String(f.dasar || '').trim().slice(0, 1200);
  if (!tujuan || !maksud) throw new Error('Maksud dan Tempat Tujuan wajib diisi.');
  pimPetugas_(cfg_()); // pastikan data Kepala Satuan ada sebelum disimpan
  const L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    const s = pimSheet_(), bidang = bid_(u) || String(f.bidang || '').slice(0, 40), cek = barisAman_([f.id || Utilities.getUuid(), f.tgl, f.berangkat, lama, tujuan, maksud, dasar, bidang, '']);
    if (f.id) {
      const r = pimRows_().find(x => x.ID === f.id); if (!r) throw new Error('Data tidak ditemukan.'); pimIzin_(u, r);
      s.getRange(r._r, 2, 1, 7).setValues([cek.slice(1, 8).map((v, i) => i === 6 ? r.Bidang : v)]);
      cacheBump_('pim');
      logAksi_(u, 'Ubah Surat Tugas Pimpinan', tujuan + ' (' + f.tgl + ')');
      return { id: f.id };
    }
    cek[8] = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') + ' ' + (u.nama || u.u || '');
    s.getRange(s.getLastRow() + 1, 1, 1, PIM_COLS_.length).setValues([cek]);
    cacheBump_('pim');
    logAksi_(u, 'Terbitkan Surat Tugas Pimpinan', tujuan + ' (' + f.tgl + ')');
    return { id: cek[0], dibuat: cek[8], bidang: bidang };
  } finally { L.releaseLock(); }
}
function pimDel(t, id) {
  const u = auth_(t, true), r = pimRows_().find(x => x.ID === id); if (!r) throw new Error('Data tidak ditemukan.'); pimIzin_(u, r);
  sh_('ST_PIMPINAN').deleteRow(r._r);
  const kk = 'PIM:' + id; // Kwitansi & Laporan terkait ikut terhapus
  [['KWITANSI', kwRows_], ['LAPORAN', lapRows_]].forEach(([n, fn]) => { const sx = sh_(n); if (sx) fn().filter(x => x.NoST === kk).sort((a, b) => b._r - a._r).forEach(q => sx.deleteRow(q._r)); });
  cacheBump_('data'); cacheBump_('pim');
  logAksi_(u, 'Hapus Surat Tugas Pimpinan', r.Tujuan + ' (' + r.TglST + ')');
}
function pimPetugas_(c) { // petugas = Kepala Satuan, dari Data Master Pegawai (NIP diatur di Control Panel; kosong = pegawai yang Jabatannya diawali "KEPALA SATUAN")
  const pg = rows_('PEGAWAI'), nip = String(c.PIM_PETUGAS_NIP || '').trim();
  const p = nip ? pg.find(x => String(x.NIP) === nip) : pg.find(x => /^\s*KEPALA\s+SATUAN/i.test(String(x.Jabatan)));
  if (!p) throw new Error('Data Kepala Satuan tidak ditemukan di Data Master Pegawai. Tambahkan pegawainya (Jabatan diawali KEPALA SATUAN) atau isi NIP petugas di Control Panel > Pejabat Penandatangan.');
  return p;
}
function pimRowsKey_(key, c) { // kunci 'PIM:<id>' = Surat Tugas Pimpinan -> satu baris petugas (Kepala Satuan) dengan bentuk yang sama seperti baris DATA_SPPD; selain itu null
  if (String(key).indexOf('PIM:') !== 0) return null;
  const row = pimRows_().find(q => String(q.ID) === String(key).slice(4)); if (!row) throw new Error('Data tidak ditemukan.');
  const k = pimCfg_(c), p = pimPetugas_(k), no = pimNo_(k, row.TglST), lama = Number(row.Lama) || 1;
  return [{ NoST: no, NoSPPD: no, TglST: row.TglST, Nama: p.Nama, Pangkat: p.Pangkat, NIP: String(p.NIP), Jabatan: p.Jabatan, Maksud: row.Maksud, Tujuan: row.Tujuan, Lama: lama,
    Bidang: 'Pimpinan', SubKegiatan: '', Berangkat: row.Berangkat, Kembali: addDays_(row.Berangkat, lama - 1) }];
}
function pimBuat_(t, id, esc) { // susun data + pengaturan untuk pembuat dokumen yang sudah ada
  auth_(t, true); const row = pimRows_().find(x => x.ID === id); if (!row) throw new Error('Data tidak ditemukan.');
  const c = cfg_(), k = pimCfg_(c), p = pimPetugas_(k), e = v => esc ? escH_(v) : v;
  c.LOGO = logoUri_('LOGO_DOKUMEN'); c.TTD = ''; // tanda tangan basah setelah dicetak
  c.PIM = { kop: [k.PIM_KOP1, k.PIM_KOP2, k.PIM_ALAMAT, k.PIM_KOTA].map(e), an1: e(k.PIM_AN1), an2: e(k.PIM_AN2), jab: e(k.PIM_JAB), nama: e(k.PIM_NAMA), pangkat: e(k.PIM_PANGKAT), nip: e(k.PIM_NIP), ppk: e(k.PIM_PPK) };
  const no = pimNo_(k, row.TglST), lama = Number(row.Lama) || 1;
  const x = { NoST: no, NoSPPD: no, TglST: row.TglST, Nama: p.Nama, Pangkat: p.Pangkat, NIP: String(p.NIP), Jabatan: p.Jabatan, Maksud: row.Maksud, Tujuan: row.Tujuan, Lama: lama,
    Bidang: row.Bidang, Berangkat: row.Berangkat, Kembali: addDays_(row.Berangkat, lama - 1), TB: p.TingkatBiaya || '', DasarST: String(row.Dasar || '') };
  const r = [x]; r.KHUSUS = false;
  return { r: esc ? escDeep_(r) : r, c };
}
function pimLembar_(h, c) { const hm = c.KERTAS === 'Letter' ? 279 : 356; return '<div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div>'; }
function pimPreviewST(t, id) {
  const d = pimBuat_(t, id, true), r = d.r, c = d.c;
  return pack_('<body style="background:#cfd8d3;margin:0;padding:10px">' + stPages_(r, r[0], c).map(h => pimLembar_(wrap_(h, c, 'ST'), c)).join('') + '</body>');
}
function pimPreviewSP(t, id) {
  const d = pimBuat_(t, id, true), r = d.r, c = d.c;
  return pack_('<body style="background:#cfd8d3;margin:0;padding:10px">' + pimLembar_(wrap_(spHtml_(r[0], c), c, 'SP'), c) + '</body>');
}
function pimPreviewSPB(t, id) { // Belakang SPPD Pimpinan: isi sama dengan Belakang SPPD biasa, hanya penanda tangan = Asisten
  const d = pimBuat_(t, id, true), c = d.c, x = d.r[0];
  const h = wrap_(blkHtml_(x, c), Object.assign({}, c, { SP_ATAS: Math.min(Number(c.SP_ATAS) || 0, 12), SP_BAWAH: Math.min(Number(c.SP_BAWAH) || 0, 10) }), 'SP');
  return '<style>@page{size:216mm 356mm}td,div{font-size:9pt!important;line-height:1.15}</style><body style="background:#cfd8d3;margin:0;padding:10px"><div style="width:216mm;min-height:356mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div></body>';
}
function stXlsx(t, key) { // Surat Tugas (semua pegawai) sebagai Excel: Legal portrait; pegawai dibagi per halaman sehingga 1 pegawai tidak terpotong - disusun lewat Google Sheets sementara
  const u = auth_(t, true); own_(u, key);
  const c = cfg_(), r = prep_(key, c); ttdST_(c);
  const x = r[0], n = r.length, F = Number(c.UKURAN_ST) || 12, W = [62, 10, 22, 78, 14, 162, 348], NC = 7, lh = Math.round((1.15 * F + 2.2) * 96 / 72);
  const ss = SpreadsheetApp.create('tmp_stxls_' + Date.now()), sid = ss.getId();
  try {
    const sh = ss.getSheets()[0].setName('Surat Tugas'), S = SpreadsheetApp.BorderStyle, BK = '#000000';
    W.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    const lebar = (a, b) => W.slice(a - 1, b).reduce((q, v) => q + v, 0);
    const baris = (txt, px) => String(txt).split('\n').reduce((q, l) => q + Math.max(1, Math.ceil(l.length * (F * 0.55) / Math.max(40, px - 8))), 0);
    const V = [], H = {}, put = (rw, cl, v) => { while (V.length < rw) V.push(['', '', '', '', '', '', '']); V[rw - 1][cl - 1] = v; };
    const tengah = [], tebal = [], garis = [], kanan = [], bungkus = [], gabung = []; // daftar perintah format (dijalankan sekali di akhir)
    const KP = ['PEMERINTAH KABUPATEN NGADA', 'SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', 'Jln. Soekarno – Hatta No.1 Tlp. (0384) 2200019, Email.satpolppngada3@gmail.com', 'B A J A W A'];
    let rw = 1;
    for (let i = 0; i < 4; i++) { put(rw, 1, KP[i]); gabung.push([rw, 1, NC]); tengah.push(rw); H[rw] = [22, 22, 16, 20][i]; rw++; }
    const kopAkhir = rw - 1; rw++; // baris kosong
    put(rw, 1, 'SURAT TUGAS'); gabung.push([rw, 1, NC]); tengah.push(rw); tebal.push('A' + rw); garis.push('A' + rw); rw++;
    put(rw, 1, 'Nomor : ' + x.NoST); gabung.push([rw, 1, NC]); tengah.push(rw); rw += 2;
    const dsr = dasarList_(x.DasarST);
    if (dsr.length) dsr.forEach((q, i) => { if (!i) { put(rw, 1, 'Dasar'); put(rw, 2, ':'); } if (dsr.length > 1) { put(rw, 3, String(i + 1) + '.'); kanan.push('C' + rw); } put(rw, 4, q); gabung.push([rw, 4, NC]); bungkus.push([rw, 4, NC]); H[rw] = Math.max(lh, baris(q, lebar(4, NC)) * lh); rw++; });
    else { put(rw, 1, 'Dasar'); put(rw, 2, ':'); rw++; }
    rw++; put(rw, 1, 'MEMERINTAHKAN :'); gabung.push([rw, 1, NC]); tengah.push(rw); tebal.push('A' + rw); rw += 2;
    const kepala = rw - 1, pg = []; // pg: [baris awal, baris akhir] tiap pegawai
    r.forEach((q, i) => {
      const a = rw;
      [['Nama', q.Nama], ['Pangkat/Gol', q.Pangkat], ['NIP', q.NIP], ['Jabatan', q.Jabatan]].forEach((f, k) => {
        if (k === 0) { if (n > 1) { put(rw, 3, String(i + 1)); kanan.push('C' + rw); } if (!i) { put(rw, 1, 'Kepada'); put(rw, 2, ':'); } tebal.push('F' + rw); }
        put(rw, 4, f[0]); put(rw, 5, ':'); put(rw, 6, f[1]); rw++;
      });
      pg.push([a, rw - 1]);
    });
    rw++; const tailMulai = rw - 1;
    const un = untukST_(x); put(rw, 1, 'Untuk'); put(rw, 2, ':'); put(rw, 3, un); gabung.push([rw, 3, NC]); bungkus.push([rw, 3, NC]); H[rw] = Math.max(lh, baris(un, lebar(3, NC)) * lh); rw += 2;
    put(rw, 7, 'Dikeluarkan di   :  ' + c.KOTA); rw++; put(rw, 7, 'Pada Tanggal    :  ' + idn_(x.TglST)); rw += 2;
    ['an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', 'KABUPATEN NGADA', c.TTD_JABATAN].forEach(q => { put(rw, 7, q); tengah.push(rw); rw++; });
    const g1 = rw; rw += 3; // ruang tanda tangan (3 baris)
    put(rw, 7, c.TTD_NAMA); tengah.push(rw); tebal.push('G' + rw); garis.push('G' + rw); rw++;
    put(rw, 7, c.TTD_PANGKAT); tengah.push(rw); rw++;
    put(rw, 7, 'NIP. ' + c.TTD_NIP); tengah.push(rw); const akhir = rw;
    // tulis semua sekaligus
    if (sh.getMaxRows() < akhir) sh.insertRowsAfter(sh.getMaxRows(), akhir - sh.getMaxRows());
    const all = sh.getRange(1, 1, akhir, NC);
    all.setFontFamily(c.FONT || 'Arial Narrow').setFontSize(F).setVerticalAlignment('top').setHorizontalAlignment('left');
    sh.setHiddenGridlines(true);
    while (V.length < akhir) V.push(['', '', '', '', '', '', '']);
    all.setNumberFormat('@').setValues(V.slice(0, akhir));
    sh.setRowHeights(1, akhir, lh); Object.keys(H).forEach(k => sh.setRowHeight(+k, Math.round(H[k])));
    [[15, 0, 0], [14, 1, 0], [9, 0, 1], [12, 1, 0]].forEach((q, i) => { const g = sh.getRange(i + 1, 1, 1, NC); g.setFontSize(q[0]); if (q[1]) g.setFontWeight('bold'); if (q[2]) g.setFontStyle('italic'); });
    gabung.forEach(q => sh.getRange(q[0], q[1], 1, q[2] - q[1] + 1).merge());
    bungkus.forEach(q => sh.getRange(q[0], q[1], 1, q[2] - q[1] + 1).setWrap(true));
    tengah.forEach(q => sh.getRange(q, 1, 1, NC).setHorizontalAlignment('center'));
    if (tebal.length) sh.getRangeList(tebal).setFontWeight('bold');
    if (garis.length) sh.getRangeList(garis).setFontLine('underline');
    if (kanan.length) sh.getRangeList(kanan).setHorizontalAlignment('right');
    sh.getRange(kopAkhir, 1, 1, NC).setBorder(null, null, true, null, null, null, BK, S.SOLID_THICK);
    if (c.LOGO) { try { sh.insertImage(blob_(c.LOGO, 'logo.png'), 1, 1, 4, 2).setWidth(66).setHeight(68); } catch (e) {} }
    const tinggiBaris = q => H[q] || lh, top = q => { let s = 0; for (let i = 1; i < q; i++) s += tinggiBaris(i); return s; };
    if (c.TTD) { // TTD (+ CAP) melayang di atas ruang tanda tangan, di tengah kolom kanan (seperti di PDF)
      try {
        const px = mm => mm * 96 / 25.4, im = sh.insertImage(blob_(c.TTD, 'ttd.png'), 7, g1, 0, 0), ow = im.getWidth(), oh = im.getHeight(), w = px(Number(c.TTD_LEBAR || 40)), h = w * oh / ow;
        im.setWidth(Math.round(w)).setHeight(Math.round(h));
        const y = top(g1) + (3 * lh - h) / 2, ox = Math.max(0, Math.round((W[6] - w) / 2 - px(Number(c.TTD_GESER) || 0)));
        let br = 1; while (br < g1 && top(br + 1) <= y) br++; if (br > g1) br = g1; // baris jangkar: baris yang memuat titik atas gambar
        im.setAnchorCell(sh.getRange(Math.max(1, br), 7)); im.setAnchorCellXOffset(ox); im.setAnchorCellYOffset(Math.max(0, Math.round(y - top(Math.max(1, br)))));
      } catch (e) {}
    }
    if (sh.getMaxColumns() > NC) sh.deleteColumns(NC + 1, sh.getMaxColumns() - NC);
    if (sh.getMaxRows() > akhir) sh.deleteRows(akhir + 1, sh.getMaxRows() - akhir);
    // pemisah halaman: pegawai TIDAK terpotong; perkiraan tinggi memakai tinggi baris (px) yang pasti
    const hs = (a, b) => { let q = 0; for (let i = a; i <= b; i++) q += tinggiBaris(i); return q; };
    const fit = Math.min(1, (612 - (Number(c.ST_KIRI) + Number(c.ST_KANAN)) * MM) / (lebar(1, NC) * 0.75)), usable = (1008 - (Number(c.ST_ATAS) + Number(c.ST_BAWAH)) * MM) / fit / 0.75 * 0.97;
    const hal = []; let cur = [], used = hs(1, kepala);
    pg.forEach((p, i) => { const ph = hs(p[0], p[1]); if (cur.length && used + ph > usable) { hal.push(cur); cur = []; used = 0; } cur.push(i); used += ph; });
    if (hal.length && used + hs(tailMulai, akhir) > usable && cur.length > 1) { hal.push(cur.slice(0, -1)); cur = [cur[cur.length - 1]]; }
    hal.push(cur);
    const brk = hal.slice(0, -1).map(p => pg[p[p.length - 1]][1]);
    SpreadsheetApp.flush();
    let b = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + sid + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + sid + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel belum berhasil dibuat, silakan klik Excel sekali lagi.');
    const cm = Object.assign({}, c, { SP_KIRI: Number(c.ST_KIRI) || 0, SP_KANAN: Number(c.ST_KANAN) || 0, SP_ATAS: Number(c.ST_ATAS) || 0, SP_BAWAH: Number(c.ST_BAWAH) || 0 });
    try { b = xlsxCetak_(b, cm, 'portrait', false, brk); } catch (e) {}
    logAksi_(u, 'Export Excel', 'Surat Tugas No. ST: ' + key);
    return { name: 'Surat_Tugas_' + x.TglST + '.xlsx', b64: Utilities.base64Encode(b) };
  } finally { try { DriveApp.getFileById(sid).setTrashed(true); } catch (e) {} }
}
function pimXlsx(t, id, jenis) { // Surat Tugas / SPPD Pimpinan sebagai Excel (kertas Legal portrait, 1 halaman) - disusun lewat Google Sheets sementara
  const d = pimBuat_(t, id, false), c = d.c, x = d.r[0], sp = jenis === 'sp', k = pimCfg_(c), K = c.PIM;
  const ss = SpreadsheetApp.create('tmp_pim_' + Date.now()), sid = ss.getId();
  try {
    const sh = ss.getSheets()[0].setName(sp ? 'SPPD' : 'Surat Tugas'), S = SpreadsheetApp.BorderStyle, BK = '#000000';
    const W = sp ? [28, 230, 438] : [24, 90, 14, 100, 14, 454], N = W.length, fs = sp ? 10 : 11, TOT = 120;
    W.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    if (sh.getMaxRows() < TOT) sh.insertRowsAfter(sh.getMaxRows(), TOT - sh.getMaxRows());
    sh.getRange(1, 1, TOT, N).setFontFamily(c.FONT || 'Arial Narrow').setFontSize(fs).setVerticalAlignment('top');
    sh.setHiddenGridlines(true);
    const sel = (r, c1, c2, v, o) => { o = o || {}; const g = sh.getRange(r, c1, 1, c2 - c1 + 1); if (c2 > c1) g.merge(); g.setValue(v); if (o.b) g.setFontWeight('bold'); if (o.u) g.setFontLine('underline'); if (o.i) g.setFontStyle('italic'); if (o.fs) g.setFontSize(o.fs);
      g.setHorizontalAlignment(o.al || 'left'); if (o.wrap) g.setWrap(true); return g; };
    const lebar = (c1, c2) => W.slice(c1 - 1, c2).reduce((a, v) => a + v, 0);
    const baris = (txt, px) => String(txt).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length * (fs * 0.55) / Math.max(40, px - 8))), 0); // perkiraan jumlah baris tulisan
    const tinggi = (r, n) => sh.setRowHeight(r, Math.max(18, Math.round(n * fs * 1.45 + 4)));
    // kop
    [[K.kop[0], 15, 0, 0], [K.kop[1], 14, 1, 0], [K.kop[2], 9, 0, 1], [K.kop[3], 12, 1, 0]].forEach((q, i) => { sel(i + 1, 1, N, q[0], { al: 'center', fs: q[1], b: q[2], i: q[3] }); sh.setRowHeight(i + 1, [22, 22, 16, 20][i]); });
    sh.getRange(4, 1, 1, N).setBorder(null, null, true, null, null, null, BK, S.SOLID_THICK);
    if (c.LOGO) { try { sh.insertImage(blob_(c.LOGO, 'logo.png'), 1, 1, 4, 2).setWidth(66).setHeight(68); } catch (e) {} }
    let r = 6, akhir;
    const ttd = (c1, c2, r0) => { [K.an1, K.an2, K.jab].forEach((q, i) => sel(r0 + i, c1, c2, q, { al: 'center' })); sel(r0 + 6, c1, c2, K.nama, { al: 'center', b: 1, u: 1 }); sel(r0 + 7, c1, c2, K.pangkat, { al: 'center' }); sel(r0 + 8, c1, c2, 'NIP. ' + K.nip, { al: 'center' }); return r0 + 9; };
    if (!sp) {
      sel(r, 1, N, 'SURAT TUGAS', { al: 'center', b: 1, u: 1 }); r++; sel(r, 1, N, 'Nomor : ' + x.NoST, { al: 'center' }); r += 2;
      const dsr = dasarList_(x.DasarST);
      if (dsr.length) dsr.forEach((q, i) => { if (!i) { sel(r, 1, 2, 'Dasar'); sel(r, 3, 3, ':'); } if (dsr.length > 1) sel(r, 4, 4, String(i + 1) + '.', { al: 'right' }); sel(r, dsr.length > 1 ? 5 : 4, N, q, { wrap: 1 }); tinggi(r, baris(q, lebar(5, N))); r++; });
      else { sel(r, 1, 2, 'Dasar'); sel(r, 3, 3, ':'); r++; }
      r++; sel(r, 1, N, 'MEMERINTAHKAN :', { al: 'center', b: 1 }); r += 2;
      [['Nama', x.Nama, 1], ['Pangkat/Gol', x.Pangkat, 0], ['NIP', x.NIP, 0], ['Jabatan', x.Jabatan, 0]].forEach((q, i) => {
        if (!i) { sel(r, 1, 2, 'Kepada'); sel(r, 3, 3, ':'); } sel(r, 4, 4, q[0]); sel(r, 5, 5, ':'); sel(r, 6, 6, q[1], { b: q[2], wrap: 1 }); tinggi(r, baris(q[1], W[5])); r++; });
      r++; const u = untukST_(x); sel(r, 1, 2, 'Untuk'); sel(r, 3, 3, ':'); sel(r, 4, N, u, { wrap: 1 }); tinggi(r, baris(u, lebar(4, N))); r += 2;
      sel(r, 4, N, 'Dikeluarkan di   :  ' + c.KOTA); r++; sel(r, 4, N, 'Pada Tanggal    :  ' + idn_(x.TglST)); sh.getRange(r, 4, 1, N - 3).setBorder(null, null, true, null, null, null, BK, S.SOLID); r += 2;
      akhir = ttd(4, N, r);
    } else {
      sel(r, 2, 2, 'Lembar Ke', { al: 'right' }); sel(r, 3, 3, ':'); r++; sel(r, 2, 2, 'Kode Nomor', { al: 'right' }); sel(r, 3, 3, ': ' + c.KODE); r++; sel(r, 2, 2, 'Nomor', { al: 'right' }); sel(r, 3, 3, ': ' + x.NoSPPD); r += 2;
      sel(r, 1, N, 'SURAT PERJALANAN DINAS (SPD)', { al: 'center', b: 1, u: 1 }); r += 2;
      const B = [['1.', 'Pejabat Pembuat Komitmen', K.ppk, 0], ['2.', 'Nama / NIP Pegawai yang melaksanakan perjalanan dinas', x.Nama + ' / ' + x.NIP, 1],
        ['3.', 'a. Pangkat dan Golongan\nb. Jabatan / Instansi\nc. Tingkat Biaya Perjalanan Dinas', 'a. ' + x.Pangkat + '\nb. ' + x.Jabatan + ' / SATPOL PP & KEBAKARAN\nc. ' + (x.TB || c.BIAYA), 0],
        ['4.', 'Maksud Perjalanan Dinas', x.Maksud, 0], ['5.', 'Alat angkut yang dipergunakan', c.ANGKUT, 0], ['6.', 'a. Tempat berangkat\nb. Tempat tujuan', 'a. ' + c.KANTOR + '\nb. ' + x.Tujuan, 0],
        ['7.', 'a. Lamanya perjalanan dinas\nb. Tanggal berangkat\nc. Tanggal harus kembali / tiba di tempat baru *)', 'a. ' + x.Lama + ' Hari\nb. ' + idn_(x.Berangkat) + '\nc. ' + idn_(x.Kembali), 0],
        ['8.', 'Pengikut :        Nama\n1.\n2.\n3.', '', 0], ['9.', 'Pembebanan Anggaran\na. Instansi\nb. Akun', '\na. SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN\nb.', 0], ['10.', 'Keterangan lain-lain', '', 0]];
      const r0 = r;
      B.forEach(q => { sel(r, 1, 1, q[0], { al: 'center' }); sel(r, 2, 2, q[1], { wrap: 1 }); sel(r, 3, 3, q[2], { wrap: 1, b: q[3] }); tinggi(r, Math.max(baris(q[1], W[1]), baris(q[2], W[2]))); sh.getRange(r, 1, 1, N).setBorder(true, true, true, true, true, null, BK, S.SOLID); r++; });
      sel(r, 1, N, '*Coret yang tidak perlu', { fs: 8 }); r += 2;
      sel(r, 3, 3, 'Dikeluarkan di : ' + c.KOTA, { al: 'center' }); r++; sel(r, 3, 3, 'Tanggal : ' + idn_(x.TglST), { al: 'center' }); r += 2;
      akhir = ttd(3, 3, r);
    }
    if (sh.getMaxColumns() > N) sh.deleteColumns(N + 1, sh.getMaxColumns() - N);
    if (sh.getMaxRows() > akhir) sh.deleteRows(akhir + 1, sh.getMaxRows() - akhir);
    SpreadsheetApp.flush();
    let b = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + sid + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + sid + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel belum berhasil dibuat, silakan klik Excel sekali lagi.');
    const cm = Object.assign({}, c, { SP_KIRI: Math.min(Number(c.SP_KIRI) || 0, 15), SP_KANAN: Math.min(Number(c.SP_KANAN) || 0, 10), SP_ATAS: Math.min(Number(c.SP_ATAS) || 0, 12), SP_BAWAH: Math.min(Number(c.SP_BAWAH) || 0, 10) });
    try { b = xlsxCetak_(b, cm, 'portrait', true); } catch (e) {}
    logAksi_(auth_(t, true), 'Export Excel', (sp ? 'SPPD' : 'Surat Tugas') + ' Pimpinan ' + x.TglST);
    return { name: (sp ? 'SPPD_Pimpinan_' : 'Surat_Tugas_Pimpinan_') + x.TglST + '.xlsx', b64: Utilities.base64Encode(b) };
  } finally { try { DriveApp.getFileById(sid).setTrashed(true); } catch (e) {} }
}
function pimPdfST(t, id) {
  const d = pimBuat_(t, id, false), r = d.r, c = d.c, doc = DocumentApp.create('tmp_stpim_' + Date.now()), did = doc.getId();
  try {
    const body = doc.getBody(), pz = PAPER[c.KERTAS] || PAPER.Legal;
    body.clear();
    body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(0).setMarginRight(0)
      .setMarginTop(Math.min(Number(c.ST_ATAS), Number(c.SP_ATAS)) * MM).setMarginBottom(Math.min(Number(c.ST_BAWAH), Number(c.SP_BAWAH)) * MM);
    sect_(body, c, 'ST', true, (cell, cw) => stDoc_(cell, cw, r, c));
    doc.saveAndClose();
    return { name: 'Surat_Tugas_Pimpinan_' + r[0].TglST + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(did).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(did).setTrashed(true); } catch (e) {} }
}
function pimPdfSP(t, id) {
  const d = pimBuat_(t, id, false), r = d.r, c = d.c, doc = DocumentApp.create('tmp_sppim_' + Date.now()), did = doc.getId();
  try {
    const body = doc.getBody();
    halaman_(body, c);
    sect_(body, c, 'SP', true, (cell, cw) => spDoc_(cell, cw, r[0], c));
    doc.saveAndClose();
    return { name: 'SPPD_Pimpinan_' + r[0].TglST + '.pdf', b64: Utilities.base64Encode(DriveApp.getFileById(did).getAs('application/pdf').getBytes()) };
  } finally { try { DriveApp.getFileById(did).setTrashed(true); } catch (e) {} }
}
function kopPim_(c) {
  const img = c.LOGO ? '<img src="' + c.LOGO + '" width="72" height="73">' : '', K = c.PIM.kop;
  return '<table style="width:100%;border-bottom:3px solid #000"><tr><td style="width:80px;vertical-align:middle">' + img + '</td><td class="c" style="vertical-align:middle"><div style="font-size:1.3em">' + K[0] + '</div><b style="font-size:1.2em">' + K[1] + '</b><br><i style="font-size:.8em">' + K[2] + '</i><br><b>' + K[3] + '</b></td><td style="width:80px"></td></tr></table>';
}
function ttdPim_(c) { const P = c.PIM; return '<div class="c" style="margin-left:50%;margin-top:14px">' + P.an1 + '<br>' + P.an2 + '<br>' + P.jab + '<br><br><br><br><b><u>' + P.nama + '</u></b><br>' + P.pangkat + '<br>NIP. ' + P.nip + '</div>'; }
function pimCfgGet(t) { auth_(t, 2); return pimCfg_(cfg_()); }
function pimCfgSave(t, f) {
  auth_(t, 2); _CFG = null;
  Object.keys(PIM_DEF_).forEach(k => { if (!(k in f)) return; setCfg_(k, String(f[k] == null ? '' : f[k]).trim().slice(0, 300)); });
  cacheBump_('data');
  return pimCfg_(cfg_());
}
function khususSet_(noST, on) {
  let s = sh_('ST_KHUSUS');
  if (on) { if (!s) { s = SpreadsheetApp.getActive().insertSheet('ST_KHUSUS'); s.appendRow(['NoST', 'Dibuat']); s.setFrozenRows(1); s.getRange('A:B').setNumberFormat('@'); }
    if (!khususST_(noST)) s.appendRow([noST, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]); return; }
  if (s) rows_('ST_KHUSUS').filter(x => x.NoST === noST).sort((a, b) => b._r - a._r).forEach(x => s.deleteRow(x._r));
}

// ---------- Penomoran kembali setelah Super Admin menghapus Surat Tugas ----------
// Penghitung REG_<tahun> diturunkan ke nomor TERBESAR yang masih dipakai (No. ST maupun No. SPPD) di tahun itu,
// termasuk data yang sudah diarsipkan. Bila yang dihapus bukan Surat Tugas terakhir, nomor tidak berubah
// (nomor di tengah tidak dipakai ulang supaya tidak ada nomor kembar).
function nomorKembali_(y) {
  y = String(y); let maks = 0;
  const cek = x => [x.NoST, x.NoSPPD].forEach(v => { const o = noNum_(v); if (String(o.y) === y && o.n > maks) maks = o.n; });
  rows_('DATA_SPPD').forEach(cek); arsipRows_(y, 'DATA_SPPD').forEach(cek);
  const s = sh_('PENGATURAN'), v = s.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === 'REG_' + y) {
    const cur = Number(v[i][1]) || 0;
    if (maks < cur) { s.getRange(i + 1, 2).setValue(maks); _CFG = null; }
    return { dari: cur, ke: Math.min(cur, maks) };
  }
  return null;
}

// ---------- Ukur lebar teks (perkiraan per huruf, font Arial / Arial Narrow) - untuk memaskan ukuran huruf ke lebar kolom ----------
const LBR_ = (() => { const m = {}, set = (ch, w) => ch.split('').forEach(k => m[k] = w);
  set('ABEKPSVXY', .667); set('CDHNRUw', .722); set('GOQ', .778); set('FTZ', .611); set('L', .556); set('J', .5); set('M', .833); set('W', .944); set('I', .278);
  set('abdeghnopqu0123456789', .556); set('cksvxyz', .5); set('fijlt', .25); set('r-', .333); set('m', .833); set(' ,.:;/()\'', .278); set('&', .667);
  return m; })();
function lebarTeks_(s, fs, font) { let w = 0; String(s).split('').forEach(ch => { w += LBR_[ch] || .556; }); return w * fs * (/narrow/i.test(font || '') ? 0.82 : 1); }
function pasHuruf_(txt, lebar, dasar, font, minK) { // ukuran huruf terbesar (kelipatan 0,5) yang membuat teks muat 1 baris; paling kecil dasar x minK
  const butuh = lebarTeks_(txt, dasar, font); if (butuh <= lebar) return dasar;
  return Math.max(Math.round(dasar * (minK || 0.6) * 2) / 2, Math.floor(dasar * lebar / butuh * 2) / 2);
}

// ---------- SPPD Normal: kolom 8 Pengikut seperti contoh (Nama | Tanggal Lahir | Keterangan, baris 1. 2. 3. kosong) ----------
function spHtml_(r, c) {
  const h = spHtmlLama_(r, c), a = h.indexOf('<table class="b">'), b = h.indexOf('</table><small>*Coret', a);
  if (a < 0 || b < 0) return h;
  const fit = '<script>(function(){function f(){document.querySelectorAll(".fit").forEach(function(e){e.style.fontSize="";var s=parseFloat(getComputedStyle(e).fontSize),m=s*0.6;while(e.scrollWidth>e.clientWidth+1&&s>m){s-=0.25;e.style.fontSize=s+"px"}})}f();addEventListener("load",f);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(f)})()</script>';
  return (h.slice(0, a) + spKhususTabelHtml_([r], c, ['4%', '4%', '33%', '22%', '37%'], null, { kosong: 3, normal: true }) + h.slice(b + 8))
    .replace('an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>', '<div class="fit" style="white-space:nowrap;overflow:hidden">an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN</div>') + fit; // "an.KEPALA ..." satu baris
}

// ---------- Rapikan Nomor (Super Admin): tutup loncatan nomor pada Surat Tugas TERAKHIR ----------
// Contoh: SPPD terakhir 142 lalu Surat Tugas berikutnya 161 (nomor 143-160 pernah terpakai oleh Surat Tugas yang sudah dihapus).
// Surat Tugas terakhir digeser supaya melanjutkan nomor sebelumnya (ST 143, SPPD 144, ...). Hanya untuk Surat Tugas paling akhir
// di tahun itu, supaya tidak ada nomor kembar. Kwitansi, Laporan, Dasar, tanda Khusus & Pengajuan ikut disesuaikan.
function gantiNo_(s, n) { const p = String(s).split('/').map(x => x.trim()); p[p.length - 3] = String(n); return p.join(' / '); }
function rapikanNomor(t, noST) {
  const u = auth_(t, 2), L = LockService.getScriptLock(); L.waitLock(20000);
  try {
    const y = String(noNum_(noST).y), all = rows_('DATA_SPPD'), rs = all.filter(x => x.NoST === noST);
    if (!rs.length) throw new Error('Surat Tugas tidak ditemukan.');
    const milik = [noNum_(noST).n].concat(rs.map(x => noNum_(x.NoSPPD).n)), minSendiri = Math.min.apply(null, milik), maksSendiri = Math.max.apply(null, milik);
    let maksLain = 0; const cek = x => { if (x.NoST === noST) return; [x.NoST, x.NoSPPD].forEach(v => { const o = noNum_(v); if (String(o.y) === y && o.n > maksLain) maksLain = o.n; }); };
    all.forEach(cek); arsipRows_(y, 'DATA_SPPD').forEach(cek);
    if (minSendiri <= maksLain) throw new Error('Hanya Surat Tugas TERAKHIR yang dapat dirapikan nomornya.');
    const geser = minSendiri - (maksLain + 1);
    if (geser <= 0) throw new Error('Nomor Surat Tugas ini sudah berurutan.');
    const baru = gantiNo_(noST, noNum_(noST).n - geser), s = sh_('DATA_SPPD'), h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0], cST = h.indexOf('NoST') + 1, cSP = h.indexOf('NoSPPD') + 1;
    rs.forEach(x => { s.getRange(x._r, cST).setValue(baru); s.getRange(x._r, cSP).setValue(gantiNo_(x.NoSPPD, noNum_(x.NoSPPD).n - geser)); });
    ['KWITANSI', 'LAPORAN', 'DASAR_ST', 'ST_KHUSUS'].forEach(n => { const sh = sh_(n); if (!sh || sh.getLastRow() < 2) return; rows_(n).filter(x => x.NoST === noST).forEach(x => sh.getRange(x._r, 1).setValue(baru)); }); // kolom A = NoST
    const sp = sh_('PENGAJUAN');
    if (sp && sp.getLastRow() > 1) { const hp = sp.getRange(1, 1, 1, sp.getLastColumn()).getValues()[0], cL = hp.indexOf('NoSTList') + 1;
      if (cL) rows_('PENGAJUAN').forEach(x => { const l = String(x.NoSTList || '').split('|'); if (l.includes(noST)) sp.getRange(x._r, cL).setValue(l.map(k => k === noST ? baru : k).join('|')); }); }
    const ps = sh_('PENGATURAN'), v = ps.getDataRange().getValues(), akhir = maksSendiri - geser;
    for (let i = 1; i < v.length; i++) if (v[i][0] === 'REG_' + y) { if (Number(v[i][1]) <= maksSendiri) ps.getRange(i + 1, 2).setValue(akhir); break; }
    _CFG = null; cacheBump_('data');
    logAksi_(u, 'Rapikan Nomor Surat Tugas', noST + ' -> ' + baru + ' (digeser ' + geser + ' nomor)');
    return { lama: noST, baru: baru, berikutnya: akhir + 1 };
  } finally { L.releaseLock(); }
}

// Surat Tugas (pratinjau HTML): baris "an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN" dibuat 1 baris (huruf otomatis dikecilkan bila perlu)
function anSatuBaris_(h) {
  const fit = '<script>(function(){function f(){document.querySelectorAll(".fit").forEach(function(e){e.style.fontSize="";var s=parseFloat(getComputedStyle(e).fontSize),m=s*0.6;e.style.whiteSpace="nowrap";while(e.scrollWidth>e.clientWidth+1&&s>m){s-=0.25;e.style.fontSize=s+"px"}if(e.scrollWidth>e.clientWidth+1)e.style.whiteSpace="normal"})}f();addEventListener("load",f);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(f)})()</script>';
  return h.replace('an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN<br>', '<div class="fit" style="white-space:nowrap;overflow:hidden">an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN</div>') + fit;
}

// ===================== PEMBERITAHUAN SURAT TUGAS (dashboard Super Admin) =====================
// Surat Tugas yang diterbitkan Admin Bidang (bukan Super Admin) dalam 7 hari terakhir, diambil dari Log Aktivitas.
// Status "sudah dibaca" disimpan per akun Super Admin di Script Properties (NOTIF_BACA_<username>) - tidak menambah/mengubah sheet.
function notifRaw_() { // daftar mentah Surat Tugas baru 7 hari terakhir (sama untuk semua Super Admin); disimpan sementara supaya tidak membaca log & seluruh data setiap kali dashboard dibuka
  return cacheFn_('notifL_' + cacheVer_('data'), 60, () => {
    const s = logSheet_(), last = s.getLastRow(); if (last < 2) return [];
    const n = Math.min(600, last - 1), v = s.getRange(last - n + 1, 1, n, 5).getValues();
    const batas = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), TZ, 'yyyy-MM-dd HH:mm:ss');
    const st = new Map(); rows_('DATA_SPPD').forEach(x => { const a = st.get(x.NoST); if (a) a.jml++; else st.set(x.NoST, { bidang: x.Bidang, maksud: x.Maksud, tujuan: x.Tujuan, jml: 1 }); });
    const out = [], sudah = new Set();
    for (let i = v.length - 1; i >= 0 && out.length < 30; i--) {
      const r = v[i], w = r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd HH:mm:ss') : String(r[0]);
      if (w < batas) break;
      if (!/^Terbitkan Surat Tugas/.test(String(r[3])) || String(r[2]) === 'Super Admin') continue;
      const m = String(r[4]).match(/No\. ST: (.+?) \(/); if (!m || sudah.has(m[1])) continue;
      const d = st.get(m[1]); if (!d) continue; // Surat Tugas sudah dihapus -> tidak ditampilkan
      sudah.add(m[1]);
      out.push({ noST: m[1], waktu: w, oleh: String(r[1]).replace(/\s*\(.*\)$/, ''), bidang: d.bidang, maksud: d.maksud, tujuan: d.tujuan, jml: d.jml, khusus: /Khusus/.test(String(r[3])) });
    }
    return out;
  });
}
function notifST(t) { // hanya yang BELUM dibaca oleh akun ini yang dikembalikan (yang sudah dibaca tidak ditampilkan lagi)
  const u = auth_(t, 2), P = PropertiesService.getScriptProperties();
  const baca = P.getProperty('NOTIF_BACA_' + u.u) || '';
  let sdh = []; try { sdh = JSON.parse(P.getProperty('NOTIF_DIBACA_' + u.u) || '[]'); } catch (e) { sdh = []; }
  const set = new Set(sdh);
  return { baca: baca, list: notifRaw_().filter(x => x.waktu > baca && !set.has(x.noST)).map(x => Object.assign({}, x, { baru: true })) };
}
function notifBaca(t, noST) { // tanpa noST: tandai SEMUA sudah dibaca; dengan noST: tandai satu Surat Tugas saja (per akun Super Admin)
  const u = auth_(t, 2), P = PropertiesService.getScriptProperties();
  if (noST) {
    let a = []; try { a = JSON.parse(P.getProperty('NOTIF_DIBACA_' + u.u) || '[]'); } catch (e) { a = []; }
    if (a.indexOf(String(noST)) < 0) a.push(String(noST));
    if (a.length > 200) a = a.slice(-200);
    P.setProperty('NOTIF_DIBACA_' + u.u, JSON.stringify(a));
    return true;
  }
  const w = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  P.setProperty('NOTIF_BACA_' + u.u, w);
  return w;
}

// ===================== BACKUP OTOMATIS HARIAN =====================
// Setiap malam (± pukul 23.00) seluruh spreadsheet REGISTER SPPD disimpan sebagai file Excel (.xlsx) ke folder Drive
// "Backup REGISTER SPPD" milik pemilik script. Hanya 30 backup terbaru yang disimpan (yang lebih lama dibuang ke Sampah Drive).
// Tidak mengubah data/sheet apa pun. Pengaturan disimpan di Script Properties: BACKUP_FOLDER, BACKUP_TERAKHIR.
const BACKUP_SIMPAN_ = 30, BACKUP_JAM_ = 23;
function backupFolder_() {
  const P = PropertiesService.getScriptProperties(), id = P.getProperty('BACKUP_FOLDER');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const f = DriveApp.createFolder('Backup REGISTER SPPD');
  P.setProperty('BACKUP_FOLDER', f.getId());
  return f;
}
function backupBuat_(oleh) {
  const ss = SpreadsheetApp.getActive(), fd = backupFolder_(), w = new Date();
  SpreadsheetApp.flush();
  const r = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Backup gagal (kode ' + r.getResponseCode() + '). Coba lagi beberapa saat.');
  const nama = 'Backup REGISTER SPPD ' + Utilities.formatDate(w, TZ, 'yyyy-MM-dd HH.mm') + '.xlsx';
  fd.createFile(r.getBlob().setName(nama));
  // simpan hanya 30 backup terbaru
  const fs = [], it = fd.getFiles(); while (it.hasNext()) { const f = it.next(); if (/^Backup REGISTER SPPD .*\.xlsx$/.test(f.getName())) fs.push(f); }
  fs.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(BACKUP_SIMPAN_).forEach(f => { try { f.setTrashed(true); } catch (e) {} });
  const wt = Utilities.formatDate(w, TZ, 'yyyy-MM-dd HH:mm:ss');
  PropertiesService.getScriptProperties().setProperty('BACKUP_TERAKHIR', wt + '|' + oleh);
  return { nama: nama, waktu: wt, jumlah: Math.min(fs.length, BACKUP_SIMPAN_) };
}
function backupHarian() { // dijalankan otomatis oleh pemicu (trigger) harian
  try { const b = backupBuat_('Otomatis'); logAksi_({ nama: 'Sistem', role: 'Sistem' }, 'Backup Otomatis', b.nama); }
  catch (e) { logAksi_({ nama: 'Sistem', role: 'Sistem' }, 'Backup Otomatis GAGAL', e.message); }
}
function backupAktif_() { return ScriptApp.getProjectTriggers().some(x => x.getHandlerFunction() === 'backupHarian'); }
function backupInfo(t) { // Super Admin saja
  auth_(t, 2);
  const P = PropertiesService.getScriptProperties(), [w, oleh] = String(P.getProperty('BACKUP_TERAKHIR') || '').split('|');
  let jumlah = 0, url = '';
  const id = P.getProperty('BACKUP_FOLDER');
  if (id) { try { const fd = DriveApp.getFolderById(id); url = fd.getUrl(); const it = fd.getFiles(); while (it.hasNext()) { if (/^Backup REGISTER SPPD .*\.xlsx$/.test(it.next().getName())) jumlah++; } } catch (e) {} }
  return { aktif: backupAktif_(), terakhir: w || '', oleh: oleh || '', jumlah: jumlah, url: url, simpan: BACKUP_SIMPAN_, jam: BACKUP_JAM_ };
}
function backupSekarang(t) { // Super Admin saja - backup manual saat itu juga
  const u = auth_(t, 2), b = backupBuat_(u.nama || u.u);
  logAksi_(u, 'Backup Manual', b.nama);
  return backupInfo(t);
}
function backupAtur(t, aktif) { // Super Admin saja - nyalakan / matikan backup otomatis harian
  const u = auth_(t, 2);
  ScriptApp.getProjectTriggers().filter(x => x.getHandlerFunction() === 'backupHarian').forEach(x => ScriptApp.deleteTrigger(x));
  if (aktif) { ScriptApp.newTrigger('backupHarian').timeBased().everyDays(1).atHour(BACKUP_JAM_).create(); backupFolder_(); }
  logAksi_(u, aktif ? 'Aktifkan Backup Otomatis' : 'Matikan Backup Otomatis', aktif ? 'Setiap hari ± pukul ' + BACKUP_JAM_ + '.00, simpan ' + BACKUP_SIMPAN_ + ' backup terbaru' : '');
  return backupInfo(t);
}
// Bisa juga dijalankan langsung dari editor Apps Script: pilih fungsi ini lalu klik Jalankan
function aktifkanBackupOtomatis() {
  ScriptApp.getProjectTriggers().filter(x => x.getHandlerFunction() === 'backupHarian').forEach(x => ScriptApp.deleteTrigger(x));
  ScriptApp.newTrigger('backupHarian').timeBased().everyDays(1).atHour(BACKUP_JAM_).create();
  const b = backupBuat_('Editor');
  Logger.log('Backup otomatis AKTIF (setiap hari ± pukul ' + BACKUP_JAM_ + '.00). Backup pertama: ' + b.nama + ' di folder: ' + backupFolder_().getUrl());
}

// ===================== EXCEL RIWAYAT PERJALANAN PETUGAS (Super Admin & Admin Bidang) =====================
// Format satu lembar sesuai contoh: per pegawai (No, Nama, NIP, Pangkat, Jabatan digabung ke bawah) lalu rincian setiap
// perjalanan (uraian/maksud, tanggal, tujuan, lama, biaya), Total hari & Total Biaya per pegawai, baris JUMLAH di akhir.
// Biaya = tarif Kwitansi x lama hari (sama seperti perhitungan DPA). Admin Bidang otomatis hanya bidangnya sendiri. Kertas Legal - Landscape.
function exportRiwayatXlsx(t, tahun, bidang) {
  const u = auth_(t, true);
  if (['Admin', 'Super Admin'].indexOf(u.role) < 0) throw new Error('Hanya Admin yang diizinkan.');
  const y = String(tahun || new Date().getFullYear()), bd = bid_(u) || (BIDANG.indexOf(bidang) >= 0 ? bidang : ''), c = cfg_();
  const kw = new Map(); kwRows_().forEach(k => { if (!kw.has(k.NoST)) kw.set(k.NoST, k); });
  const rs = rows_('DATA_SPPD').filter(x => String(x.Berangkat || x.TglST).slice(0, 4) === y && (!bd || x.Bidang === bd)), M = new Map();
  rs.forEach(x => {
    const k = kw.get(x.NoST), tf = k && Number(k.Tarif) > 0 ? Number(k.Tarif) : 0, b = tf ? tf * Number(x.Lama) : null;
    let o = M.get(String(x.NIP)); if (!o) { o = { nip: String(x.NIP), nama: x.Nama, jab: x.Jabatan, pangkat: x.Pangkat, trip: [], hari: 0, biaya: 0 }; M.set(o.nip, o); }
    o.trip.push({ x: x, b: b }); o.hari += Number(x.Lama) || 0; if (b != null) o.biaya += b;
  });
  // urutan & daftar nama MENGIKUTI Data Master Pegawai: semua pegawai ditampilkan, yang belum pernah bertugas diberi tanda "-"
  // (pegawai nonaktif hanya ikut bila punya perjalanan; pegawai yang sudah tidak ada di Data Master tetapi punya perjalanan ditaruh paling akhir)
  const L = [];
  rows_('PEGAWAI').forEach(p => { const n = String(p.NIP), o = M.get(n);
    if (o) { o.nama = p.Nama || o.nama; o.pangkat = p.Pangkat || o.pangkat; o.jab = p.Jabatan || o.jab; L.push(o); M.delete(n); }
    else if (String(p.Aktif || 'Ya') !== 'Tidak' && String(p.Nama || '').trim()) L.push({ nip: n, nama: p.Nama, jab: p.Jabatan, pangkat: p.Pangkat, trip: [], hari: 0, biaya: 0 }); });
  M.forEach(o => L.push(o));
  L.forEach(o => o.trip.sort((a, b) => String(a.x.Berangkat).localeCompare(String(b.x.Berangkat))));
  const judul = 'RIWAYAT PERJALANAN PETUGAS TAHUN ' + y + (bd ? ' - BIDANG ' + bd.toUpperCase() : ' - SEMUA BIDANG');
  const ss = riwayatSs_(L, judul, c), id = ss.getId();
  try {
    let x = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel Riwayat belum berhasil dibuat, silakan klik Download Excel sekali lagi.');
    try { x = xlsxCetak_(x, c); } catch (e) {} // pengaturan halaman gagal dipasang -> file tetap dikirim apa adanya
    logAksi_(u, 'Export Excel', 'Riwayat Perjalanan Petugas ' + y + (bd ? ' - ' + bd : ''));
    return { name: 'Riwayat_Perjalanan_Petugas_' + y + (bd ? '_' + bd : '') + '.xlsx', b64: Utilities.base64Encode(x) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
function riwayatSs_(L, judul, c) {
  const N = 13, H = 4, W = [28, 220, 130, 135, 190, 22, 250, 80, 140, 42, 42, 110, 120]; // kolom Uraian/Jabatan/Tujuan dilebarkan supaya teks tidak banyak turun baris
  const nBaris = Math.max(1, L.reduce((a, o) => a + Math.max(1, o.trip.length), 0)), akhir = H + nBaris;
  const ss = SpreadsheetApp.create('tmp_riwayat_' + Date.now()), sh = ss.getSheets()[0].setName('Riwayat Perjalanan');
  const S = SpreadsheetApp.BorderStyle, K = '#000000', RP = '_-"Rp"* #,##0_-;-"Rp"* #,##0_-;_-"Rp"* "-"_-;_-@_-', RP2 = RP; // Total Biaya tanpa ,00 (sama seperti kolom Biaya)
  if (sh.getMaxRows() < akhir + 3) sh.insertRowsAfter(sh.getMaxRows(), akhir + 3 - sh.getMaxRows());
  W.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange(1, 1, akhir + 2, N).setFontFamily(c.FONT || 'Arial').setFontSize(8).setVerticalAlignment('middle');
  sh.getRange(1, 1).setValue(judul).setFontWeight('bold').setFontSize(9);
  sh.getRange(2, 1).setValue('Dicetak: ' + Utilities.formatDate(new Date(), TZ, 'dd-MM-yyyy HH:mm') + ' · REGISTER SPPD');
  sh.getRange(H, 1, 1, N).setValues([['No', 'Nama Pegawai', 'NIP', 'Pangkat', 'Jabatan', 'Uraian Perjalanan Dinas selama 1 Tahun', '', 'Tanggal Melaksanakan Tugas', 'Tujuan', 'Lama hari', 'Total hari', 'Biaya (Rp)', 'Total Biaya Perjalanan (Rp)']])
    .setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  sh.getRange(H, 6, 1, 2).merge();
  sh.setRowHeight(H, 40);
  const tg = d => { const p = String(d || '').split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0].slice(2) : String(d || ''); };
  // perkiraan tinggi baris (Excel tidak menyesuaikan tinggi otomatis): jumlah baris teks = panjang teks / muatan huruf per baris kolom
  const brs = (t, k) => Math.max(1, Math.ceil(String(t == null ? '' : t).length / Math.max(1, Math.floor(W[k - 1] / 6.3)))), TB = n => Math.round(Math.min(n, 6) * 11.5 + 6); // maksimal setara 6 baris teks - tidak ada baris yang sangat tinggi
  if (L.length) {
    const v = [], tinggi = [], kosong = [];
    L.forEach((o, i) => {
      const idt = Math.max(brs(o.nama, 2), brs(o.pangkat, 4), brs(o.jab, 5)); // kolom identitas pegawai (digabung ke bawah)
      if (!o.trip.length) { // belum pernah bertugas: nama tetap tercantum, kolom perjalanan diisi "-"
        kosong.push(v.length); v.push([i + 1, o.nama, o.nip, o.pangkat || '-', o.jab || '-', '-', '-', '-', '-', '-', '-', '-', '-']);
        tinggi.push(Math.max(17, TB(idt))); return; }
      const hs = o.trip.map((q, j) => {
        const x = q.x;
        v.push([j ? '' : i + 1, j ? '' : o.nama, j ? '' : o.nip, j ? '' : (o.pangkat || '-'), j ? '' : (o.jab || '-'), j + 1, x.Maksud, tg(x.Berangkat), x.Tujuan, Number(x.Lama) || 0, j ? '' : o.hari, q.b == null ? 'Belum ada Kwitansi' : q.b, j ? '' : o.biaya]);
        return Math.max(17, TB(Math.max(brs(x.Maksud, 7), brs(x.Tujuan, 9), q.b == null ? 2 : 1)));
      });
      const kurang = TB(idt) - hs.reduce((a, h) => a + h, 0); if (kurang > 0) hs[hs.length - 1] += kurang; // nama/jabatan panjang tetap muat di sel gabungan
      hs.forEach(h => tinggi.push(h));
    });
    sh.getRange(H + 1, 3, v.length, 1).setNumberFormat('@'); sh.getRange(H + 1, 8, v.length, 1).setNumberFormat('@');
    sh.getRange(H + 1, 1, v.length, N).setValues(v);
    sh.getRange(H + 1, 12, v.length, 1).setNumberFormat(RP); sh.getRange(H + 1, 13, v.length, 1).setNumberFormat(RP2);
    [1, 6, 8, 10, 11].forEach(k => sh.getRange(H + 1, k, v.length, 1).setHorizontalAlignment('center'));
    [2, 4, 5, 7, 9, 12].forEach(k => sh.getRange(H + 1, k, v.length, 1).setWrap(true));
    // tinggi DIPAKSA (setRowHeightsForced) supaya Google Sheets tidak memperbesar baris sendiri karena teks turun baris / sel gabungan
    const paksa = (r, n, h) => { try { sh.setRowHeightsForced(r, n, h); } catch (e) { sh.setRowHeights(r, n, h); } };
    paksa(H + 1, v.length, 17); tinggi.forEach((h, i) => { if (h > 17) paksa(H + 1 + i, 1, h); });
    if (kosong.length) sh.getRangeList(kosong.map(i => 'F' + (H + 1 + i) + ':M' + (H + 1 + i))).setHorizontalAlignment('center'); // tanda "-" di tengah (satu kali panggil)
    let r = H + 1; // gabungkan sel per pegawai (No, Nama, NIP, Pangkat, Jabatan, Total hari, Total Biaya)
    L.forEach(o => { const n = Math.max(1, o.trip.length); if (n > 1) [1, 2, 3, 4, 5, 11, 13].forEach(k => sh.getRange(r, k, n, 1).merge().setVerticalAlignment('middle')); r += n; });
  } else sh.getRange(H + 1, 1, 1, N).merge().setValue('Belum ada perjalanan dinas pada tahun ini.').setHorizontalAlignment('center');
  sh.getRange(H, 1, nBaris + 1, N).setBorder(true, true, true, true, true, true, K, S.SOLID);
  const j = akhir + 1, totB = L.reduce((a, o) => a + o.biaya, 0);
  sh.getRange(j, 10, 1, 2).merge().setValue('JUMLAH').setHorizontalAlignment('center');
  sh.getRange(j, 12).setValue(totB).setNumberFormat(RP); sh.getRange(j, 13).setValue(totB).setNumberFormat(RP2);
  sh.getRange(j, 10, 1, 4).setFontWeight('bold');
  if (sh.getMaxColumns() > N) sh.deleteColumns(N + 1, sh.getMaxColumns() - N);
  if (sh.getMaxRows() > j) sh.deleteRows(j + 1, sh.getMaxRows() - j);
  SpreadsheetApp.flush();
  return ss;
}

// ===================== CONTROL PANEL > WARNA TAMPILAN (Super Admin) =====================
// 3 warna tema Liquid Glass untuk SEMUA pengguna, disimpan di PENGATURAN: TEMA_WARNA_1 (utama), TEMA_WARNA_2, TEMA_WARNA_3. Kosong = warna bawaan.
function saveTampilan(t, f) {
  const u = auth_(t, 2), hx = v => { v = String(v || '').trim(); if (v && !/^#[0-9a-f]{6}$/i.test(v)) throw new Error('Format warna tidak valid: ' + v); return v.toLowerCase(); };
  const w = [hx(f && f.w1), hx(f && f.w2), hx(f && f.w3)];
  setCfg_('TEMA_WARNA_1', w[0]); setCfg_('TEMA_WARNA_2', w[1]); setCfg_('TEMA_WARNA_3', w[2]);
  cacheBump_('data');
  logAksi_(u, 'Ubah Warna Tampilan', w.some(Boolean) ? w.join(', ') : 'Kembali ke warna bawaan');
  return look_();
}

// Control Panel > Warna Tampilan > Animasi Partikel: berlaku untuk SEMUA pengguna, disimpan di PENGATURAN kunci PARTIKEL (teks JSON). Kosong/jenis '' = tanpa animasi.
function savePartikel(t, f) {
  const u = auth_(t, 2), J = ['', 'jaringan', 'kunang', 'bara', 'gelembung', 'salju', 'bintang', 'hujan', 'bokeh'], n = (v, a, b, d) => { v = Number(v); return isNaN(v) ? d : Math.max(a, Math.min(b, v)); };
  f = f || {};
  if (J.indexOf(String(f.jenis || '')) < 0) throw new Error('Jenis animasi tidak dikenal.');
  const o = { jenis: String(f.jenis || ''), jumlah: n(f.jumlah, .2, 2.5, 1), kecepatan: n(f.kecepatan, .2, 3, 1), ukuran: n(f.ukuran, .4, 2.5, 1), opasitas: n(f.opasitas, .15, 1, 1),
    warna: /^#[0-9a-f]{6}$/i.test(String(f.warna || '')) ? String(f.warna).toLowerCase() : '', interaksi: f.interaksi !== false, tempat: ['semua', 'login_dash', 'login'].indexOf(f.tempat) >= 0 ? f.tempat : 'semua' };
  setCfg_('PARTIKEL', o.jenis ? JSON.stringify(o) : '');
  cacheBump_('data');
  logAksi_(u, 'Ubah Animasi Partikel', o.jenis ? o.jenis + ' (' + o.tempat + ')' : 'Dimatikan');
  return look_();
}

// Control Panel > Warna Tampilan > Hewan Pengikut Kursor (bee.js): berlaku untuk SEMUA pengguna, disimpan di PENGATURAN kunci HEWAN ('off' = nonaktif; kosong = bawaan Lebah)
// ===== Control Panel > Hak Akses Fitur: Super Admin memilih fitur (menu & isi dashboard) yang boleh tampil untuk tiap peran. Yang disimpan hanya daftar fitur yang DISEMBUNYIKAN;
// kosong = semua tampil seperti semula. Hanya mengatur tampilan (menu & dashboard); fungsi server lain tidak diubah.
const AKSES_ROLE_ = (() => {
  const mn = { rekap: ['Admin'], riwayat: ['Admin'], input: ['Admin'], pim: ['Admin'], kwi: ['Admin', 'Kasubag Keuangan'], lap: ['Admin'], dpa: ['Admin', 'Kasubag Keuangan', 'KASI', 'KABID', 'SEKRETARIS'], pencairan: ['Admin', 'Kasubag Keuangan'], rrpd: ['Admin', 'Kasubag Keuangan'], bku: ['Kasubag Keuangan'],
    btn: ['Admin'], ping: ['Admin'], stat: ['Admin', 'Kasubag Keuangan', 'KASI', 'KABID', 'SEKRETARIS'], dpab: ['Admin', 'Kasubag Keuangan', 'KASI', 'KABID', 'SEKRETARIS'], tren: ['Admin', 'Kasubag Keuangan', 'KASI', 'KABID', 'SEKRETARIS'], perb: ['SEKRETARIS'], rkp: ['Admin', 'KASI', 'KABID'] };
  const o = {}; Object.keys(mn).forEach(k => mn[k].forEach(r => { (o[r] = o[r] || []).push(k); })); return o;
})();
function aksesMap_() { try { const o = JSON.parse(String(cfg_().AKSES_FITUR || '{}')) || {}; return typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
function aksesSave(t, m) {
  const u = auth_(t, 2), out = {};
  Object.keys(AKSES_ROLE_).forEach(r => { const h = m && Array.isArray(m[r]) ? m[r] : []; const ok = h.map(String).filter((k, i, a) => AKSES_ROLE_[r].indexOf(k) >= 0 && a.indexOf(k) === i); if (ok.length) out[r] = ok; });
  setCfg_('AKSES_FITUR', Object.keys(out).length ? JSON.stringify(out) : '');
  cacheBump_('data');
  logAksi_(u, 'Ubah Hak Akses Fitur', Object.keys(out).map(r => r + ': ' + out[r].length + ' disembunyikan').join('; ') || 'Semua fitur ditampilkan');
  return { akses: out };
}
function saveAnimHp(t, on) { // Control Panel > Warna Tampilan: matikan partikel & hewan kursor di HP/tablet (PC tetap)
  const u = auth_(t, 2); on = on === true || on === 'true' || on === 1 || on === '1';
  setCfg_('ANIM_HP', on ? '1' : '');
  cacheBump_('data');
  logAksi_(u, 'Ubah Animasi HP', on ? 'Dimatikan di HP/Tablet' : 'Aktif di HP/Tablet');
  return look_();
}
function saveHewan(t, k) {
  const u = auth_(t, 2); k = String(k || '');
  if (['off', 'lebah', 'peri', 'kupu'].indexOf(k) < 0) throw new Error('Pilihan hewan tidak dikenal.');
  setCfg_('HEWAN', k);
  cacheBump_('data');
  logAksi_(u, 'Ubah Hewan Pengikut Kursor', k === 'off' ? 'Dinonaktifkan' : k);
  return look_();
}

// ===================== KWITANSI - EXPORT EXCEL =====================
// Isi & susunan sama dengan Kwitansi PDF (kop, butir a-e, Kode Rekening, rincian per pegawai dalam kotak sendiri, Jumlah, tanda tangan).
// Kertas Legal tegak, lebar dimuat 1 halaman. Kolom Jumlah berisi angka asli. Tanpa TTD/CAP (sama seperti PDF Kwitansi).
function kwiXlsx(t, key) {
  const u = auth_(t, true); own_(u, key);
  const c = cfg_(), d = kwData_(key, c), ss = SpreadsheetApp.create('tmp_kwitansi_' + Date.now()), id = ss.getId();
  try {
    const sh = ss.getSheets()[0].setName('Kwitansi'), N = 5, W = [36, 240, 210, 125, 140], S = SpreadsheetApp.BorderStyle;
    W.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    const tinggi = 40 + d.items.length * 2 + 30;
    if (sh.getMaxRows() < tinggi) sh.insertRowsAfter(sh.getMaxRows(), tinggi - sh.getMaxRows());
    sh.getRange(1, 1, tinggi, N).setFontFamily(c.FONT || 'Arial').setFontSize(10).setVerticalAlignment('middle');
    sh.setHiddenGridlines(true);
    let r = 1;
    const sel = (row, c1, c2, v, o) => { o = o || {}; const g = sh.getRange(row, c1, 1, c2 - c1 + 1); if (c2 > c1) g.merge(); g.setValue(v); if (o.b) g.setFontWeight('bold'); if (o.u) g.setFontLine('underline'); g.setHorizontalAlignment(o.al || 'left'); if (o.wrap) g.setWrap(true); if (o.nf) g.setNumberFormat(o.nf); if (o.top) g.setVerticalAlignment('top'); return g; };
    const kotak = (row, c1, c2) => sh.getRange(row, c1, 1, c2 - c1 + 1).setBorder(true, true, true, true, true, true, '#000000', S.SOLID);
    ['PEMERINTAH KABUPATEN NGADA', 'TANDA BUKTI PEMBAYARAN', 'NOMOR BUKTI : ' + (d.nomor || '')].forEach(x => { sel(r, 1, N, x, { b: 1, al: 'center' }); r++; });
    sh.getRange(r - 1, 1, 1, N).setBorder(null, null, true, null, null, null, '#000000', S.SOLID_MEDIUM);
    r++;
    sel(r, 1, N, 'a)   Bendahara Pengeluaran pada Kantor Satuan Polisi Pamong Praja dan Kebakaran Kab, Ngada'); r++;
    [['', 'telah mengeluarkan uang sebesar', ': Rp ' + rp_(d.total), 1], ['b)', 'Huruf', ': ' + d.huruf], ['c)', 'Kepada Nama', ': ' + d.kepada], ['', 'Alamat', ': ' + (c.KOTA || '')], ['d)', 'Sebagai pembayaran', ': ' + d.bayar]].forEach(x => {
      sel(r, 1, 1, x[0], { al: 'center', top: 1 }); sel(r, 2, 2, x[1], { top: 1, wrap: 1 }); sel(r, 3, N, x[2], { b: x[3], wrap: 1, top: 1 });
      const bar = Math.max(1, Math.ceil(String(x[2]).length / 80)); if (bar > 1) sh.setRowHeight(r, 16 * bar + 4); r++; });
    sel(r, 1, N, 'Dengan rincian sebagai berikut :'); r += 2;
    sel(r, 1, 3, 'Kode Rekening'); sel(r, 4, N, 'Jumlah'); kotak(r, 1, N); r++;
    sel(r, 1, 3, d.kode); sel(r, 4, N, rpTitik_(d.total), { b: 1 }); kotak(r, 1, N); r += 2;
    ['No', 'Nama', 'Lama Perjalanan Dinas', 'Jumlah', 'Tanda Tangan'].forEach((h, j) => sel(r, j + 1, j + 1, h, { b: 1, al: 'center' })); kotak(r, 1, N); r++;
    d.items.forEach(i => { // setiap pegawai dalam kotak sendiri, dipisah jarak kecil (sama seperti PDF)
      sel(r, 1, 1, i.no, { al: 'center' }); sel(r, 2, 2, i.nama, { wrap: 1 }); sel(r, 3, 3, i.hari + ' hari @Rp. ' + rp_(d.tarif)); sel(r, 4, 4, i.jumlah, { nf: '"Rp "#,##0' }); sel(r, 5, 5, '');
      kotak(r, 1, N); sh.setRowHeight(r, 34); r++; sh.setRowHeight(r, 7); r++; });
    sel(r, 1, 3, 'Jumlah :', { al: 'right' }); sel(r, 4, N, rpTitik_(d.total), { b: 1 }); kotak(r, 1, N); r += 2;
    sel(r, 1, N, 'e)   Tanggal dikeluarkan uang : ' + (d.tgl ? idn_(d.tgl) : '')); r += 2;
    const blok = (row, c1, c2, baris, nama, nip) => { baris.forEach(x => { sel(row, c1, c2, x, { al: 'center', b: /:$/.test(x) }); row++; }); row += 3; sel(row, c1, c2, nama || '', { al: 'center', b: 1, u: 1 }); row++; sel(row, c1, c2, 'NIP. ' + (nip || ''), { al: 'center' }); return row + 1; };
    const r1 = blok(r, 1, 3, ['Setuju dibayar :', 'Pejabat Pelaksana Teknis Kegiatan'], d.pptkNama, d.pptkNip);
    const r2 = blok(r, 4, N, ['Bajawa, ' + d.tglTxt, 'Bendahara Pengeluaran,'], c.KWI_BENDAHARA_NAMA, c.KWI_BENDAHARA_NIP);
    const akhir = blok(Math.max(r1, r2) + 1, 2, 4, ['Mengetahui :', 'Kuasa Pengguna Anggaran,'], c.KWI_KPA_NAMA, c.KWI_KPA_NIP);
    if (sh.getMaxColumns() > N) sh.deleteColumns(N + 1, sh.getMaxColumns() - N);
    if (sh.getMaxRows() > akhir) sh.deleteRows(akhir + 1, sh.getMaxRows() - akhir);
    SpreadsheetApp.flush();
    let x = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel Kwitansi belum berhasil dibuat, silakan klik Excel sekali lagi.');
    try { x = xlsxCetak_(x, c, 'portrait'); } catch (e) {}
    logAksi_(u, 'Export Excel', 'Kwitansi No. ST: ' + key);
    return { name: 'Kwitansi_' + d.x.TglST + '.xlsx', b64: Utilities.base64Encode(x) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}

// ===================== CETAK BELAKANG SPPD =====================
// Format sesuai contoh kantor (BELAKANG_SPPD.pdf): I. Berangkat dari tempat kedudukan, II-V Tiba di / Berangkat dari (kolom tanda tangan
// & cap pejabat di tempat tujuan dibiarkan kosong), VI. Tiba kembali + "Telah diperiksa", VII. Catatan lain-lain, VIII. PERHATIAN.
// Terisi otomatis dari data Surat Tugas: tujuan, tanggal berangkat & kembali, pejabat penandatangan (Pengaturan Cetak). Tanpa TTD/CAP.
// Cukup 1 lembar per Surat Tugas.
function blkHtml_(x, c, slot) { // slot (opsional, khusus TTD Belakang): kotak tanda tangan II-V diberi tempat isian pejabat; tanpa slot hasilnya sama persis seperti biasa
  const B = 'border:1px solid #000;vertical-align:top;padding:2px 5px', N = 'border:none;padding:0 0 1px 0;vertical-align:top';
  const tgl = d => d ? idn_(d) : '', asal = c.BLK_ASAL || 'Kantor SATPOL PP & Kebakaran', kota = c.KOTA || 'Bajawa';
  const brs = (no, isi) => '<table style="border-collapse:collapse;width:100%">' + isi.map((q, i) => '<tr><td style="' + N + ';width:22pt">' + (i ? '' : no) + '</td><td style="' + N + ';width:100pt">' + (q[0] || '&nbsp;') + '</td><td style="' + N + ';width:8pt">' + (q[0] && q[1] !== null ? ':' : '') + '</td><td style="' + N + '">' + (q[1] || '') + '</td></tr>').join('') + '</table>';
  const ttd = () => c.PIM ? '<div style="text-align:center;line-height:1.35">' + c.PIM.an1 + '<br>' + c.PIM.an2 + '<br>' + c.PIM.jab + '<br><br><br><br><br><br><b><u>' + c.PIM.nama + '</u></b><br>' + c.PIM.pangkat + '<br>NIP. ' + c.PIM.nip + '</div>'
    : '<div style="text-align:center;line-height:1.35"><span style="font-size:7.5pt;white-space:nowrap">an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN</span><br>KABUPATEN NGADA<br>' + c.TTD_JABATAN + '<br><br><br><br><br><br><b><u>' + c.TTD_NAMA + '</u></b><br>' + c.TTD_PANGKAT + '<br>NIP. ' + c.TTD_NIP + '</div>';
  const kosong = '<br><br><br><br><br><br><br><br>'; // 8 baris (tanda tangan & cap di tempat tujuan tidak mepet) // tinggi kotak tanda tangan di tempat tujuan (muat 1 lembar Legal)
  const kot = no => slot ? '<div data-tb="' + no.replace('.', '') + '" style="height:82pt;display:flex;flex-direction:column;justify-content:space-between;text-align:center;padding:1pt 0;box-sizing:border-box"></div>' : kosong;
  const seksi = (no, a) => '<tr><td style="' + B + '">' + brs(no, [['Tiba di', a ? a[0] : ''], ['', ''], ['Pada tanggal', a ? a[1] : '']]) + '</td><td style="' + B + '">' + brs('', [['Berangkat dari', a ? a[2] : ''], ['Ke', a ? a[3] : ''], ['Pada tanggal', a ? a[4] : '']]) + '</td></tr>'
    + '<tr><td style="' + B + '">' + kot(no) + '</td><td style="' + B + '">' + kot(no) + '</td></tr>';
  return '<div style="font-size:9pt;line-height:1.3"><table style="border-collapse:collapse;width:100%">'
    + '<tr><td style="' + B + ';width:50%"></td><td style="' + B + ';width:50%">' + brs('I.', [['Berangkat dari<br>(Tempat Kedudukan)', asal], ['Ke', x.Tujuan], ['Pada tanggal', tgl(x.Berangkat)]]) + ttd() + '</td></tr>'
    + seksi('II.', [x.Tujuan, tgl(x.Berangkat), x.Tujuan, kota, tgl(x.Kembali || x.Berangkat)]) + seksi('III.') + seksi('IV.') + seksi('V.')
    + '<tr><td style="' + B + '">' + brs('VI.', [['Tiba di', kota], ['Pada tanggal', tgl(x.Kembali || x.Berangkat)]]) + ttd() + '</td><td style="' + B + '">Telah diperiksa, dengan keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu sesingkat-singkatnya.</td></tr>' // VII-VIII menyatu di tabel yang sama (sel selebar 2 kolom) supaya garis tidak putus
    + '<tr><td colspan="2" style="' + B + '">' + brs('VII.', [['Catatan lain-lain', null]]) + '</td></tr>'
    + '<tr><td colspan="2" style="' + B + '"><table style="border-collapse:collapse;width:100%"><tr><td style="' + N + ';width:22pt">VIII.</td><td style="' + N + '"><b>PERHATIAN :</b><br>PPK yang menerbitkan (SPD), Pegawai yang melakukan perjalanan dinas, para Pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara Pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.</td></tr></table></td></tr>'
    + '<tr><td colspan="2" style="' + B + '"><br><br></td></tr></table></div>';
}
function blkData_(key, c) { const r = prep_(key, c); c.TTD = ''; return { x: r[0], n: 1 }; } // Belakang SPPD cukup 1 lembar (isinya sama untuk semua SPPD dalam satu Surat Tugas)
function previewSPB(t, key) {
  own_(auth_(t, true), key);
  const c = cfg_(), d = blkData_(key, c), h = wrap_(blkHtml_(d.x, c), Object.assign({}, c, { SP_ATAS: Math.min(Number(c.SP_ATAS) || 0, 12), SP_BAWAH: Math.min(Number(c.SP_BAWAH) || 0, 10) }), 'SP'), hm = 356; // margin atas/bawah maks. 12/10 mm, sama dengan PDF // Belakang SPPD selalu kertas Legal (216 x 356 mm)
  return '<style>@page{size:216mm 356mm}td,div{font-size:9pt!important;line-height:1.15}</style><body style="background:#cfd8d3;margin:0;padding:10px">' + Array(d.n).fill('<div style="width:216mm;min-height:' + hm + 'mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div>').join('') + '</body>';
}
function blkLebar_(body, W) { // Belakang SPPD (PDF): samakan lebar semua tabel, lebarkan kolom isi, buang paragraf kosong di sekitar tabel dalam sel
  const T = DocumentApp.ElementType, P = 6; // P = padding kiri+kanan sel (3 + 3 pt)
  const kosong = el => el.asParagraph().getText().replace(/[\s\u00a0\u200b]/g, '') === ''; // termasuk spasi / karakter tak terlihat hasil impor
  const atur = (tbl, A) => { // A = lebar tersedia untuk tabel ini
    const n = tbl.getNumRows() ? tbl.getRow(0).getNumCells() : 0;
    const w = n === 2 && A >= W - 1 ? [W / 2, W / 2] : n === 1 ? [A] : n === 4 ? [20, 88, 8, A - 116] : n === 2 ? [22, A - 22] : null;
    if (w) w.forEach((x, i) => { try { tbl.setColumnWidth(i, x); } catch (e) {} });
    for (let r = 0; r < tbl.getNumRows(); r++) { const row = tbl.getRow(r);
      for (let k = 0; k < row.getNumCells(); k++) { const cell = row.getCell(k), cs = cell.getColSpan ? cell.getColSpan() : 1; if (cs === 0) continue; // sel bayangan dari sel gabungan
        const cw = (cs > 1 ? A : w && row.getNumCells() === w.length ? w[k] : A) - P, isi = [];
        for (let i = 0; i < cell.getNumChildren(); i++) isi.push(cell.getChild(i));
        isi.forEach((el, i) => {
          if (el.getType() === T.TABLE) { atur(el.asTable(), cw); return; }
          const dekat = (isi[i - 1] && isi[i - 1].getType() === T.TABLE) || (isi[i + 1] && isi[i + 1].getType() === T.TABLE);
          if (dekat && el.getType() === T.PARAGRAPH && kosong(el)) { // paragraf kosong bawaan impor di sebelah tabel: dikecilkan / dibuang
            if (cell.getNumChildren() > 1 && i < isi.length - 1) { try { el.removeFromParent(); return; } catch (e) {} }
            try { el.asParagraph().editAsText().setFontSize(1); } catch (e) {}
          }
        });
        const n2 = cell.getNumChildren(), akhir = n2 ? cell.getChild(n2 - 1) : null; // paragraf kosong di ujung sel bertulisan (mis. di bawah NIP) dikecilkan; kotak tanda tangan kosong tidak tersentuh
        if (n2 > 1 && akhir.getType() === T.PARAGRAPH && kosong(akhir) && cell.getText().trim() !== '') { try { akhir.asParagraph().editAsText().setFontSize(1); } catch (e) {} }
      }
    }
  };
  for (let i = 0; i < body.getNumChildren(); i++) { const el = body.getChild(i); if (el.getType() === T.TABLE) atur(el.asTable(), W); }
}
function pdfSPB(t, key) {
  const u = auth_(t, true); own_(u, key);
  const c = cfg_(), d = blkData_(key, c), html = '<html><body>' + blkHtml_(d.x, c) + '</body></html>';
  const batas = 'BTS' + Date.now(), meta = { name: 'tmp_sppd_belakang_' + Date.now(), mimeType: 'application/vnd.google-apps.document' };
  const isi = '--' + batas + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + batas + '\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n' + html + '\r\n--' + batas + '--';
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'post', contentType: 'multipart/related; boundary=' + batas,
    payload: Utilities.newBlob(isi).getBytes(), headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Gagal menyusun Belakang SPPD (' + res.getResponseCode() + '), silakan coba lagi.');
  const id = JSON.parse(res.getContentText()).id;
  try {
    const doc = DocumentApp.openById(id), body = doc.getBody(), pz = PAPER.Legal, A = DocumentApp.Attribute; // Belakang SPPD selalu kertas Legal
    body.setPageWidth(pz[0]).setPageHeight(pz[1]).setMarginLeft(Number(c.SP_KIRI) * MM).setMarginRight(Number(c.SP_KANAN) * MM).setMarginTop(Math.min(Number(c.SP_ATAS), 12) * MM).setMarginBottom(Math.min(Number(c.SP_BAWAH), 10) * MM); // margin atas/bawah maks. 12/10 mm supaya muat 1 lembar
    const pa = {}; pa[A.SPACING_BEFORE] = 0; pa[A.SPACING_AFTER] = 0; pa[A.LINE_SPACING] = 1;
    const rapi = el => { // jarak paragraf hasil impor dirapatkan, huruf disamakan
      const tp = el.getType();
      if (tp === DocumentApp.ElementType.PARAGRAPH) { el.setAttributes(pa); return; }
      if (tp === DocumentApp.ElementType.TABLE_CELL) { try { el.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(3).setPaddingRight(3); } catch (e) {} } // jarak dalam sel dirapatkan (bawaan impor 5pt membuat halaman meluber)
      if (el.getNumChildren) for (let i = 0; i < el.getNumChildren(); i++) rapi(el.getChild(i));
    };
    rapi(body); body.editAsText().setFontFamily(c.FONT || 'Arial').setFontSize(9).setForegroundColor('#000000'); // semua huruf hitam
    let f = body.findText('an\\.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN'); while (f) { f.getElement().asText().setFontSize(f.getStartOffset(), f.getEndOffsetInclusive(), 7.5); f = body.findText('an\\.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', f); } // 1 baris seperti contoh
    try { blkLebar_(body, pz[0] - (Number(c.SP_KIRI) + Number(c.SP_KANAN)) * MM); } catch (e) {} // semua tabel selebar halaman & kolom isi lebih lebar
    if (d.n > 1) { // salin halaman pertama untuk setiap SPPD berikutnya
      const asli = []; for (let i = 0; i < body.getNumChildren(); i++) asli.push(body.getChild(i).copy());
      for (let k = 1; k < d.n; k++) {
        body.appendPageBreak();
        asli.forEach(e => { const tp = e.getType(); if (tp === DocumentApp.ElementType.TABLE) body.appendTable(e.copy()); else if (tp === DocumentApp.ElementType.PARAGRAPH) body.appendParagraph(e.copy()); });
      }
    }
    doc.saveAndClose();
    const pdf = ambilUlang_(['https://docs.google.com/document/d/' + id + '/export?format=pdf'], 'PDF Belakang SPPD belum berhasil dibuat, silakan klik Unduh PDF sekali lagi.');
    logAksi_(u, 'Cetak Belakang SPPD', 'No. ST: ' + key);
    return { name: 'SPPD_Belakang_' + d.x.TglST + '.pdf', b64: Utilities.base64Encode(pdf) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
// ===================== TTD BELAKANG SPPD =====================
// Isian pejabat di tempat tujuan yang menandatangani belakang SPPD (kotak II-V): jabatan pimpinan, atas nama (an.) + jabatan penanda tangan, nama, NIP.
// Hanya isi kotak tanda tangan yang bisa diubah; isi lainnya sama dengan Cetak Belakang SPPD. Disimpan di sheet TTD_BELAKANG.
const TTDB_SEK_ = ['II', 'III', 'IV', 'V'], TTDB_F_ = ['jab', 'an', 'jab2', 'nama', 'nip'];
function ttdbGet_(noST) {
  if (!sh_('TTD_BELAKANG')) return {};
  const r = rows_('TTD_BELAKANG').find(x => x.NoST === noST);
  try { return r ? JSON.parse(r.Data || '{}') : {}; } catch (e) { return {}; }
}
function ttdbInfo(t, key) {
  own_(auth_(t, true), key);
  const c = cfg_(), d = blkData_(key, c), cm = Object.assign({}, c, { SP_ATAS: Math.min(Number(c.SP_ATAS) || 0, 12), SP_BAWAH: Math.min(Number(c.SP_BAWAH) || 0, 10) });
  const h = wrap_(blkHtml_(d.x, c, true), cm, 'SP');
  const html = '<style>@page{size:216mm 356mm}td,div{font-size:9pt!important;line-height:1.15}</style><body style="background:#cfd8d3;margin:0;padding:10px"><div style="width:216mm;min-height:356mm;background:#fff;margin:0 auto 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);box-sizing:border-box">' + h + '</div></body>';
  return { html: html, data: ttdbGet_(key), tujuan: d.x.Tujuan || '' };
}
function ttdbBersih_(data) { // ambil hanya kolom yang dikenal, maks. 150 huruf
  const bersih = {}; data = data || {};
  TTDB_SEK_.forEach(k => { const q = data[k] || {}, o = {}; TTDB_F_.forEach(f => { const v = String(q[f] == null ? '' : q[f]).trim().slice(0, 150); if (v) o[f] = f === 'an' ? '1' : v; }); if (o.nama || o.jab) bersih[k] = o; });
  return bersih;
}
function ttdbSave(t, key, data) {
  const u = auth_(t, true); own_(u, key);
  const bersih = ttdbBersih_(data);
  let s = sh_('TTD_BELAKANG');
  if (!s) { s = SpreadsheetApp.getActive().insertSheet('TTD_BELAKANG'); s.appendRow(['NoST', 'Data', 'Diubah', 'Oleh']); s.setFrozenRows(1); s.getRange('A:D').setNumberFormat('@'); }
  const ada = rows_('TTD_BELAKANG').filter(x => x.NoST === key), isi = JSON.stringify(bersih), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
  if (!Object.keys(bersih).length) { ada.sort((a, b) => b._r - a._r).forEach(x => s.deleteRow(x._r)); }
  else if (ada.length) s.getRange(ada[0]._r, 2, 1, 3).setValues([[isi, now, u.nama || u.u || '']]);
  else s.appendRow([key, isi, now, u.nama || u.u || '']);
  logAksi_(u, 'TTD Belakang SPPD', 'No. ST: ' + key);
  return bersih;
}

function xlsSPB(t, key, pj, isian) { // Belakang SPPD: Export Excel (1 lembar, kertas Legal portrait, isi sama dengan PDF); pj opsional = isian TTD Belakang (jabatan/nama/NIP di kotak II-V)
  const u = auth_(t, true), pim = String(key).indexOf('PIM:') === 0; if (!pim) own_(u, key); // key 'PIM:<id>' = Belakang SPPD Pimpinan
  const pm = pim ? pimBuat_(t, String(key).slice(4), false) : null, c = pm ? pm.c : cfg_(), d = pm ? { x: pm.r[0], n: 1 } : blkData_(key, c), x = d.x, ss = SpreadsheetApp.create('tmp_sppd_belakang_' + Date.now()), id = ss.getId();
  pj = pj ? ttdbBersih_(pj) : null; const tulisTtd = []; // isian=true: Excel hanya berisi jabatan/nama/NIP pejabat, di sel yang sama persis dengan versi lengkap
  try {
    const sh = ss.getSheets()[0].setName('Belakang SPPD'), N = 8, W = [30, 122, 10, 186, 30, 122, 10, 186], S = SpreadsheetApp.BorderStyle; // total 696 px = pas lebar kertas Legal (tidak diperkecil Excel)
    W.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    const tinggi = 80;
    if (sh.getMaxRows() < tinggi) sh.insertRowsAfter(sh.getMaxRows(), tinggi - sh.getMaxRows());
    sh.getRange(1, 1, tinggi, N).setFontFamily(c.FONT || 'Arial').setFontSize(9).setVerticalAlignment('middle').setFontColor('#000000');
    sh.setRowHeights(1, tinggi, 20); // 20 px: huruf 9pt tidak terpotong di Excel, isi mengisi penuh 1 lembar Legal sh.setHiddenGridlines(true);
    const tgl = v => v ? idn_(v) : '', asal = c.BLK_ASAL || 'Kantor SATPOL PP & Kebakaran', kota = c.KOTA || 'Bajawa';
    const sel = (row, c1, c2, v, o) => { o = o || {}; const g = sh.getRange(row, c1, 1, c2 - c1 + 1); if (c2 > c1) g.merge(); g.setValue(v); if (o.b) g.setFontWeight('bold'); if (o.u) g.setFontLine('underline'); g.setHorizontalAlignment(o.al || 'left'); if (o.wrap) g.setWrap(true); if (o.fs) g.setFontSize(o.fs); return g; };
    const kotak = (r1, r2, c1, c2) => sh.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1).setBorder(true, true, true, true, null, null, '#000000', S.SOLID);
    const brs = (row, c1, no, isi) => { isi.forEach((q, i) => { if (!i) sel(row, c1, c1, no); sel(row, c1 + 1, c1 + 1, q[0] || '', { wrap: 1 }); sel(row, c1 + 2, c1 + 2, q[0] && q[1] !== null ? ':' : ''); sel(row, c1 + 3, c1 + 3, q[1] || '', { wrap: 1 }); row++; }); return row; };
    const ttd = (row, c1, c2) => {
      sel(row++, c1, c2, c.PIM ? c.PIM.an1 : 'an.KEPALA SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN', c.PIM ? { al: 'center' } : { al: 'center', fs: 7.5 });
      sel(row++, c1, c2, c.PIM ? c.PIM.an2 : 'KABUPATEN NGADA', { al: 'center' }); sel(row++, c1, c2, (c.PIM ? c.PIM.jab : c.TTD_JABATAN) || '', { al: 'center' }); row += 3;
      sel(row++, c1, c2, (c.PIM ? c.PIM.nama : c.TTD_NAMA) || '', { al: 'center', b: 1, u: 1 }); sel(row++, c1, c2, (c.PIM ? c.PIM.pangkat : c.TTD_PANGKAT) || '', { al: 'center' }); sel(row++, c1, c2, 'NIP. ' + ((c.PIM ? c.PIM.nip : c.TTD_NIP) || ''), { al: 'center' });
      return row; };
    let r = 1;
    // I. Berangkat dari tempat kedudukan (kolom kanan) + tanda tangan
    let a = brs(r, 5, 'I.', [['Berangkat dari', asal], ['(Tempat Kedudukan)', null], ['Ke', x.Tujuan], ['Pada tanggal', tgl(x.Berangkat)]]);
    sh.getRange(r, 6, 2, 1).merge(); sh.getRange(r, 6).setValue('Berangkat dari\n(Tempat Kedudukan)').setWrap(true); sh.getRange(r, 8, 2, 1).merge(); sh.getRange(r, 7, 2, 1).merge();
    a = ttd(a, 5, 8); kotak(r, a - 1, 1, 4); kotak(r, a - 1, 5, 8); r = a;
    // II - V. Tiba di / Berangkat dari, kotak kosong untuk tanda tangan & cap di tempat tujuan
    const seksi = (no, q) => {
      const r0 = r, e1 = brs(r, 1, no, [['Tiba di', q ? q[0] : ''], ['', ''], ['Pada tanggal', q ? q[1] : '']]), e2 = brs(r, 5, '', [['Berangkat dari', q ? q[2] : ''], ['Ke', q ? q[3] : ''], ['Pada tanggal', q ? q[4] : '']]);
      r = Math.max(e1, e2); kotak(r0, r - 1, 1, 4); kotak(r0, r - 1, 5, 8);
      const tq = pj && pj[no.replace('.', '')]; // isian TTD Belakang: jabatan di atas, nama & NIP di bawah kotak
      const ts = (...a) => { tulisTtd.push(a); sel(...a); };
      if (tq && (tq.nama || tq.jab)) [[1, 4], [5, 8]].forEach(cc => { let rr = r;
        if (tq.an) { ts(rr++, cc[0], cc[1], 'an. ' + String(tq.jab || '').toUpperCase(), { al: 'center' }); if (tq.jab2) ts(rr++, cc[0], cc[1], tq.jab2, { al: 'center' }); } else if (tq.jab) ts(rr, cc[0], cc[1], tq.jab, { al: 'center' });
        if (tq.nama) ts(r + 4, cc[0], cc[1], tq.nama, { al: 'center', b: 1, u: 1 }); if (tq.nip) ts(r + 5, cc[0], cc[1], 'NIP. ' + tq.nip, { al: 'center' }); });
      kotak(r, r + 5, 1, 4); kotak(r, r + 5, 5, 8); r += 6; }; // kotak tanda tangan & cap di tempat tujuan: 6 baris (tidak terlalu mepet)
    seksi('II.', [x.Tujuan, tgl(x.Berangkat), x.Tujuan, kota, tgl(x.Kembali || x.Berangkat)]); seksi('III.'); seksi('IV.'); seksi('V.');
    // VI. Tiba kembali + Telah diperiksa
    const r6 = r; a = brs(r, 1, 'VI.', [['Tiba di', kota], ['Pada tanggal', tgl(x.Kembali || x.Berangkat)]]); a = ttd(a, 1, 4);
    sh.getRange(r6, 5, 4, 4).merge().setVerticalAlignment('top').setValue('Telah diperiksa, dengan keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu sesingkat-singkatnya.').setWrap(true).setHorizontalAlignment('left');
    kotak(r6, a - 1, 1, 4); kotak(r6, a - 1, 5, 8); r = a;
    // VII. Catatan lain-lain
    sel(r, 1, 1, 'VII.'); sel(r, 2, N, 'Catatan lain-lain'); kotak(r, r, 1, N); r++;
    // VIII. PERHATIAN
    sel(r, 1, 1, 'VIII.'); sel(r, 2, N, 'PERHATIAN :', { b: 1 }); r++;
    sh.getRange(r, 2, 1, N - 1).merge().setValue('PPK yang menerbitkan (SPD), Pegawai yang melakukan perjalanan dinas, para Pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara Pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.').setWrap(true);
    sh.getRange(r, 2).setVerticalAlignment('top'); sh.setRowHeight(r, 60); kotak(r - 1, r, 1, N); r++;
    kotak(r, r + 1, 1, N); r += 2;
    const akhir = r - 1;
    if (isian) { // Isian saja: semua tulisan & garis dihapus, ukuran kolom/baris tetap sama, lalu hanya isian tanda tangan yang ditulis ulang
      const g = sh.getRange(1, 1, akhir, N); g.clearContent(); g.setBorder(false, false, false, false, false, false);
      tulisTtd.forEach(a => sel(...a));
    }
    if (sh.getMaxColumns() > N) sh.deleteColumns(N + 1, sh.getMaxColumns() - N);
    if (sh.getMaxRows() > akhir) sh.deleteRows(akhir + 1, sh.getMaxRows() - akhir);
    SpreadsheetApp.flush();
    let b = ambilUlang_(['https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
      'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')], 'File Excel Belakang SPPD belum berhasil dibuat, silakan klik Excel sekali lagi.');
    const cm = Object.assign({}, c, { SP_KIRI: Math.min(Number(c.SP_KIRI) || 0, 15), SP_KANAN: Math.min(Number(c.SP_KANAN) || 0, 10), SP_ATAS: Math.min(Number(c.SP_ATAS) || 0, 12), SP_BAWAH: Math.min(Number(c.SP_BAWAH) || 0, 10) }); // margin khusus Excel Belakang SPPD (maks. kiri 15, kanan 10, atas 12, bawah 10 mm)
    try { b = xlsxCetak_(b, cm, 'portrait', true); } catch (e) {}
    logAksi_(u, 'Export Excel', 'Belakang SPPD No. ST: ' + key);
    return { name: 'SPPD_Belakang_' + (isian ? 'Isian_' : '') + x.TglST + '.xlsx', b64: Utilities.base64Encode(b) };
  } finally { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
}
