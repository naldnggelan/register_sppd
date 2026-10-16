/**
 * KONFIGURASI — REGISTER SPPD (versi Vercel)
 * ------------------------------------------------------------------
 * File ini khusus untuk frontend hasil migrasi (Fase 2 di panduan),
 * BUKAN untuk versi yang sekarang berjalan di Google Sites/iframe.
 *
 * Satu-satunya nilai yang WAJIB diganti: GAS_URL.
 * Cara mendapatkannya (Fase 1 panduan migrasi):
 *   Apps Script Editor → Deploy → New deployment
 *   → Execute as: Me, Who has access: Anyone → Deploy
 *   → salin URL yang diakhiri "/exec"
 *
 * File ini dimuat lewat <script src="config.js"></script> SEBELUM
 * script utama di index.html, jadi GAS_URL tersedia sebagai variabel
 * global untuk fungsi api(). Kalau backend di-redeploy ulang nanti
 * (URL /exec berubah), cukup ganti nilai di sini saja — tidak perlu
 * menyentuh index.html sama sekali.
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzLytEf0k7HLd2nVDb_r9pXCj-sbqy269qGc0kPT2WRzqkGLGdezI7yze5LxIEbBw8ynQ/exec';

/** Judul aplikasi — ditampilkan di tab browser (dipakai index.html, opsional) */
const APP_TITLE = 'REGISTER SPPD';