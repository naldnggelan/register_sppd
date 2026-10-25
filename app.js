const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function apiOnce_(f,a,ms){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const res=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:f,args:a}),signal:ctrl.signal});const text=await res.text();try{return JSON.parse(text)}catch(e){return{success:false,net_:true,message:'Server membalas format tidak dikenal.'}}}catch(e){return{success:false,net_:true,abort_:e.name==='AbortError',message:e.name==='AbortError'?'Server terlalu lama merespons.':'Koneksi terputus.'}}finally{clearTimeout(timer)}}
// Pembuatan dokumen (pratinjau/PDF/Word/Excel) memang butuh waktu lebih lama: diberi batas tunggu 2 menit dan TIDAK diulang otomatis
// saat waktu tunggu habis - sebelumnya dipotong di 12-15 detik lalu diulang dari awal sampai 4x, sehingga totalnya jauh lebih lama.
const SLOW_FN=/^(login|boot|preview|previewST|previewSP|pdf|pdfST|pdfSP|kwiPreview|kwiPdf|kwiPdfBulan|lapPreview|lapPdf|bkuPreview|bkuPdf|exportDoc|exportRekapXlsx|exportDpaXlsx|exportBkuXlsx|exportRegisterXlsx|arsipkanTahun|rrpdPreview|rrpdPdf|rrpdGenerate)$/;
const RRPD_MENU=['rrpd','request_page','Rincian Rencana Penggunaan Dana (RRPD)'];
const api0_=async(f,...a)=>{const t0=Date.now(),slow=SLOW_FN.test(f);let r;for(let i=0;i<4;i++){if(i)await new Promise(ok=>setTimeout(ok,i*700));r=await apiOnce_(f,a,slow?120000:(i<2?12000:15000));if(r.success)break;if(!r.net_&&r.message!=='Gunakan POST untuk semua permintaan.')break;if(slow&&r.abort_)break}Perf.add(f,Date.now()-t0,r.ms,r.success);if(!r.success)throw new Error(r.message||'Terjadi kesalahan.');return r.data};
// ---------- TURBO (gas-scale-turbo): pengukur, gabung permintaan identik, batch otomatis, pemanasan ----------
// Perf.table() / Perf.summary() di Console browser: waktu total, waktu kerja server, jaringan.
const Perf={log:[],add(f,tot,srv,ok){this.log.push({aksi:f,total_ms:tot,server_ms:srv??'',jaringan_ms:srv!=null?tot-srv:'',ok});if(this.log.length>200)this.log.shift()},
 table(){console.table(this.log)},summary(){const g={};this.log.forEach(x=>{const o=g[x.aksi]=g[x.aksi]||{n:0,total:0,server:0};o.n++;o.total+=x.total_ms;o.server+=+x.server_ms||0});console.table(Object.keys(g).map(k=>({aksi:k,kali:g[k].n,rata_total_ms:Math.round(g[k].total/g[k].n),rata_server_ms:Math.round(g[k].server/g[k].n)})))}};
const READ_FN=/^(boot|dpaGet|getDpa|pencairanEligible|pengajuanList|pengajuanRincian|rrpdList|waInfo|arsipInfo|logList|pegawaiList|bkuList|getCfg|publicInfo)$/;
const _inflight={};let _writeEpoch=0;
const api=(f,...a)=>{ // permintaan BACA yang identik & bersamaan cukup dikirim 1x; setiap aksi TULIS menaikkan "epoch" supaya bacaan sesudahnya tidak menumpang data lama
 if(!READ_FN.test(f)){_writeEpoch++;return api0_(f,...a)}
 const k=_writeEpoch+'|'+f+'|'+JSON.stringify(a);if(_inflight[k])return _inflight[k];
 const p=api0_(f,...a);_inflight[k]=p;const del=()=>{delete _inflight[k]};p.then(del,del);return p};
let _bq=null,_batchOff=false;
const apiQ=(f,...a)=>new Promise((res,rej)=>{ // aksi BACA yang dipanggil pada saat yang sama digabung jadi 1 eksekusi server ('batch')
 if(_batchOff||!READ_FN.test(f)||f==='boot')return api(f,...a).then(res,rej);
 if(!_bq){_bq=[];setTimeout(flushQ_,0)}_bq.push({f,a,res,rej})});
async function flushQ_(){const q=_bq;_bq=null;if(!q||!q.length)return;
 if(q.length===1){const x=q[0];return api(x.f,...x.a).then(x.res,x.rej)}
 for(let i=0;i<q.length;i+=10){const part=q.slice(i,i+10);
  try{const out=await api0_('batch',part.map(x=>[x.f,x.a]));part.forEach((x,j)=>{const o=out[j];o&&o.success?x.res(o.data):x.rej(new Error((o&&o.message)||'Terjadi kesalahan.'))})}
  catch(e){if(/Aksi tidak dikenal/.test(e.message||''))_batchOff=true; // server lama belum punya 'batch' -> kirim satu per satu seperti biasa
   part.forEach(x=>api(x.f,...x.a).then(x.res,x.rej))}}}
function warmPing(){try{if(Date.now()-(+sessionStorage.getItem('sppd_warm')||0)<240000)return;sessionStorage.setItem('sppd_warm',String(Date.now()))}catch(e){}
 try{fetch(GAS_URL+'?w=1',{mode:'no-cors'}).catch(()=>{})}catch(e){}} // bangunkan server selagi pengguna mengetik sandi
const BL=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BID=['Trantibum','Sekretariat','Linmas','Damkar'];
const idn=s=>{if(!s)return'-';const[y,m,d]=s.split('-');return d+' '+BL[m-1].slice(0,3)+' '+y};
const addD=(s,n)=>{const[y,m,d]=s.split('-').map(Number),t=new Date(y,m-1,d+n);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')};
const clash=(nip,s,l,ex)=>{l=+l;if(!s||!l)return;const e=addD(s,l-1);return S.jadwal.find(r=>String(r.NIP)===String(nip)&&r.NoST!==ex&&r.Berangkat<=e&&r.Kembali>=s)};
function warn(a){const w=$('#warn');if(!w)return;w.innerHTML=a.length?`<div class="glass p-3 mb-3" role="alert" style="border:1px solid var(--red);color:var(--red);font-weight:600">${a.map(x=>'⚠ '+esc(x)).join('<br>')}</div>`:'';if(a.length)toast(a[0],1)}
const msgClash=(n,c)=>{const p=S.pg.find(x=>String(x.NIP)===String(n));return'Pegawai '+(p?p.Nama:n)+' sedang bertugas di Bidang '+c.Bidang+' ('+idn(c.Berangkat)+' – '+idn(c.Kembali)+', No. ST: '+c.NoST+')'};
const warnToast=m=>toast(m,1);
function refreshPs(){const s=$('#f2').value,l=$('#f3').value,w=[];
 S.pick.filter(n=>clash(n,s,l)).forEach(n=>{w.push(msgClash(n,clash(n,s,l))+' dan dikeluarkan dari daftar.');S.pick=S.pick.filter(x=>x!==n)});
 $('#ps').innerHTML='<option value="">— Pilih pegawai —</option>'+S.pg.map(p=>{const c=clash(p.NIP,s,l);return`<option value="${esc(p.NIP)}" ${c?'disabled':''}>${esc(p.Nama)}${c?' (sedang bertugas)':''}</option>`}).join('');chips();warn(w)}
const today=()=>new Date().toISOString().slice(0,10);
const badge=b=>`<span class="bd" style="background:color-mix(in srgb,var(--b-${(b||'').toLowerCase()}) 12%,transparent);color:var(--b-${(b||'').toLowerCase()})">● ${esc(b)}</span>`;
const S0=()=>({t:'',role:'',nama:'',d:[],pg:[],us:[],jadwal:[],bidang:'',lap:[],wil:[],foto:'',kwi:[],tarif:{luar:170000,dalam:70000,luarDaerah:450000},logo:'',footer:'',view:'dash',page:1,q:'',fb:'',fm:'',yr:String(new Date().getFullYear()),pick:[],cfgCache:null,dpaCache:{},bkuCache:null,pegCache:null,maintenance:false});
let S=S0(),charts=[];
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
async function logout(){const t=S.t;clearInterval(window._pv);store.del('sppd_t');store.del('sppd_v');store.del('sppd_boot');charts.forEach(c=>c.destroy());charts=[];document.querySelectorAll('.modal').forEach(m=>m.remove());S=S0();loginView();if(t)api('logout',t).catch(()=>{})}
const BIDX=()=>sup()?BID:[S.bidang],adm=()=>S.role==='Admin'||S.role==='Super Admin',sup=()=>S.role==='Super Admin',dpaRO=()=>S.role==='Kasubag Keuangan'; // Kasubag Keuangan: DPA hanya bisa dilihat, tidak bisa diubah
const dl=(u,n)=>{const A=document.createElement('a');A.href=u;A.download=n;document.body.appendChild(A);A.click();A.remove()};
const ava=(u,n,s)=>u?`<img src="${esc(u)}" alt="Foto ${esc(n)}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover">`:`<span style="width:${s}px;height:${s}px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;font-weight:700">${esc((n||'?')[0])}</span>`;
function setTheme(t,save){document.documentElement.dataset.theme=t;const i=$('#thi');if(i)i.textContent=t==='dark'?'light_mode':'dark_mode';if(save)try{localStorage.setItem('theme',t)}catch(e){}}
let _t0;try{_t0=localStorage.getItem('theme')}catch(e){}
setTheme(_t0||'dark');
function look(r){if(!r)return;const s=document.documentElement.style;s.removeProperty('--bg-img');document.documentElement.classList.remove('hasbg');if(/^#[0-9a-f]{3,8}$/i.test(r.warna||''))s.setProperty('--brand',r.warna);if(/^https:\/\//.test(r.bg||'')){s.setProperty('--bg-img','url("'+r.bg+'")');document.documentElement.classList.add('hasbg')}}
const flip=()=>{setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',1);if(S.t&&S.view==='dash')dash()};
let _clk;function tick(){const e=$('#ck');if(!e){clearInterval(_clk);return}const d=new Date(),H=d.getHours(),
 [g,i]=H>=5&&H<11?['Selamat Pagi','wb_twilight']:H>=11&&H<15?['Selamat Siang','wb_sunny']:H>=15&&H<18?['Selamat Sore','partly_cloudy_day']:['Selamat Malam','bedtime'];
 $('#gr').textContent=g;$('#ci').textContent=i;e.textContent=d.toLocaleTimeString('id-ID',{hour12:false}).replace(/\./g,':');
 $('#cd').textContent=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function toast(m,e){const t=$('#toast');t.innerHTML=`<div class="toast ${e?'err':''}" role="status">${esc(m)}</div>`;clearTimeout(window._tt);window._tt=setTimeout(()=>t.innerHTML='',e?8000:3500)}
function confirmDlg(msg,judul){return new Promise(res=>{const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-4" style="max-width:420px;width:100%"><b>${esc(judul||'Konfirmasi')}</b><p class="text-sm mt-2" style="white-space:pre-line">${esc(msg)}</p><div class="flex justify-end gap-2 mt-3"><button class="btn2" id="cdNo">Batal</button><button class="btn-d" id="cdYes">OK</button></div></div>`;
 document.body.appendChild(m);const done=v=>{m.remove();res(v)};m.querySelector('#cdNo').onclick=()=>done(false);m.querySelector('#cdYes').onclick=()=>done(true);m.onclick=e=>{if(e.target===m)done(false)}})}
let _pb=0;
function pbarShow(){_pb++;const b=$('#pbar');if(!b)return;b.classList.remove('done');requestAnimationFrame(()=>b.classList.add('show'))}
function pbarHide(){_pb=Math.max(0,_pb-1);if(_pb)return;const b=$('#pbar');if(!b)return;b.classList.add('done');setTimeout(()=>{b.classList.remove('show','done')},350)}
function maintScreen(msg){msg=String(msg).replace(/^\[MAINT\]/,'');$('#app').innerHTML=`<div class="min-h-screen flex items-center justify-center p-4"><div class="glass2 p-8" style="max-width:420px;width:100%;text-align:center"><span class="ms" style="font-size:52px;color:var(--accent-text)">build</span><h1 class="text-xl font-bold mt-3" style="color:var(--heading)">Sistem Sedang Dalam Perbaikan</h1><p class="mt-2" style="color:var(--text-2)">${esc(msg)}</p><button class="btn mt-5" id="mcb">Coba Lagi</button></div></div>`;$('#mcb').onclick=()=>S.t?restore():loginView()}
const run=async(fn,ok)=>{pbarShow();try{const r=await fn();if(ok)toast(ok);return r}catch(e){const m=e.message||String(e);if(/Sesi berakhir/.test(m)){await logout();toast(m,1)}else if(/^\[MAINT\]|dalam perbaikan/.test(m)){S._maint=true;maintScreen(m)}else toast(m,1)}finally{pbarHide()}};
function busy(el,label){if(!el)return()=>{};const old=el.innerHTML,dis=el.disabled;el.disabled=true;el.innerHTML=`<span class="spin"></span> ${esc(label||'Memproses…')}`;return()=>{el.disabled=dis;el.innerHTML=old}}

function applyLogin(L){if(!L)return;const q=s=>document.querySelector(s),t=(s,v)=>{const e=q(s);if(e)e.textContent=v};
 const b=q('#lb');if(b){b.textContent=L.badge||'';b.style.display=L.badge?'':'none'}
 t('#lt',L.judul);t('#ls',L.sub);t('#lu',L.lblUser);t('#lp',L.lblPass);t('#go',L.tombol);
 const w=q('#lw');if(w){w.style.justifyContent=L.posisi==='Kiri'?'flex-start':L.posisi==='Kanan'?'flex-end':'center';w.style.paddingInline='clamp(1rem,6vw,5rem)'}
 const g=q('#lg');if(g&&L.logoSize){g.style.width=g.style.height=L.logoSize+'px'}
 if(/^https:\/\//.test(L.bg||'')){const s=document.documentElement.style;s.setProperty('--bg-img','url("'+L.bg+'")');document.documentElement.classList.add('hasbg')}}
// Layar proses di tengah layar (dipakai saat Penerbitan Surat Tugas & SPPD): menutup seluruh layar supaya Admin tahu proses sedang
// berjalan dan tidak menekan tombol dua kali. Mengembalikan {step(teks), tutup()}.
function prosesLayar(judul,teks){
 if(!document.getElementById('prosesCss')){const st=document.createElement('style');st.id='prosesCss';st.textContent='@keyframes prosesBar{0%{left:-40%}100%{left:100%}}@keyframes prosesDenyut{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}}@media(prefers-reduced-motion:reduce){.proses-bar i,.proses-ikon{animation:none!important}}';document.head.appendChild(st)}
 const m=document.createElement('div');m.className='modal';m.style.cssText='z-index:97;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)';m.setAttribute('role','alertdialog');m.setAttribute('aria-live','assertive');
 m.innerHTML=`<div class="glass2 p-8" style="width:min(360px,100%);text-align:center"><div style="position:relative;width:76px;height:76px;margin:0 auto 18px"><div class="spin-lg" style="width:76px;height:76px;margin:0;position:absolute;inset:0"></div><span class="ms proses-ikon" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:34px;color:var(--accent-text);animation:prosesDenyut 1.4s ease-in-out infinite">edit_document</span></div>
 <div class="font-bold text-lg" style="color:var(--heading)">${esc(judul)}</div><div id="prosesTeks" class="text-sm mt-1" style="color:var(--text-2)">${esc(teks||'')}</div>
 <div class="proses-bar" style="position:relative;height:6px;border-radius:9px;background:var(--line);overflow:hidden;margin-top:18px"><i style="position:absolute;top:0;left:-40%;width:40%;height:100%;border-radius:9px;background:var(--accent-text);animation:prosesBar 1.1s ease-in-out infinite"></i></div>
 <div class="text-xs mt-3" style="color:var(--text-2)">Mohon tunggu, jangan tutup atau muat ulang halaman ini.</div></div>`;
 document.body.appendChild(m);
 return{step:t=>{const e=m.querySelector('#prosesTeks');if(e)e.textContent=t},tutup:()=>m.remove()}}
function loadingCard(msg,steps){ // animasi loading: logo berdenyut di dalam cincin berputar + bar berjalan + keterangan langkah yang berganti
 const lg=S.logo||store.get('sppd_logo')||'';
 $('#app').innerHTML=`<div class="min-h-screen flex items-center justify-center p-4"><div class="glass2 p-8 ldx" style="min-width:270px"><div class="ldx-ring"><div class="ldx-logo">${lg?`<img src="${esc(lg)}" alt="">`:'<span class="ms" style="font-size:38px;color:var(--accent-text)">assignment_turned_in</span>'}</div></div>
 <div class="font-semibold" style="color:var(--heading)">${esc(msg)}</div><div class="ldx-bar"></div><div class="ldx-step" id="ldxs">${esc((steps||['REGISTER SPPD'])[0])}</div></div></div>`;
 clearInterval(window._ldx);if(steps&&steps.length>1){let i=0;window._ldx=setInterval(()=>{const e=$('#ldxs');if(!e)return clearInterval(window._ldx);i=Math.min(i+1,steps.length-1);e.style.opacity=0;setTimeout(()=>{e.textContent=steps[i];e.style.opacity=1},200)},1400)}}
function loginView(){warmPing();$('#app').innerHTML=`<button class="btn2" id="th" aria-label="Ganti Tema" title="Ganti Tema" style="position:fixed;top:12px;right:12px;z-index:5"><span class="ms" id="thi"></span></button><div id="lw" class="min-h-screen flex items-center justify-center p-4"><div class="glass2 p-8 w-full max-w-md">
<div class="text-center"><div id="lg" style="width:84px;height:84px;margin:0 auto" class="flex items-center justify-center"><div style="background:var(--primary);color:#fff;width:64px;height:64px;border-radius:16px" class="flex items-center justify-center"><span class="ms" style="font-size:34px">assignment_turned_in</span></div></div>
<div id="lb" class="text-xs font-bold mt-3" style="letter-spacing:.1em;color:var(--accent-text);display:none"></div><h1 id="lt" class="text-2xl font-bold mt-1" style="color:var(--heading)">REGISTER SPPD</h1><p id="ls" style="color:var(--text-2)">Penomoran & Registrasi Surat Tugas / SPPD</p></div>
<label id="lu" for="u">Username / NIP</label><input id="u" class="inp" autocomplete="username"><label id="lp" for="p">Kata Sandi</label><div style="position:relative"><input id="p" type="password" class="inp" autocomplete="current-password" style="padding-right:2.6rem"><button type="button" id="pv" class="ms" aria-label="Tampilkan kata sandi" title="Tampilkan kata sandi" style="position:absolute;right:.4rem;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;color:var(--text-2);padding:.3rem;line-height:1">visibility</button></div>
<button class="btn w-full mt-5" id="go">Masuk ke Sistem</button><div id="lf" class="text-center text-xs mt-5" style="color:var(--text-2)"></div></div></div>`;
 const go=async()=>{const uname=$('#u').value,pass=$('#p').value;loadingCard('Masuk ke sistem…',['Memeriksa akun…','Mengambil data…','Menyiapkan dashboard…','Hampir selesai…']);
  const r=await run(()=>api('login',uname,pass));
  if(!r){if(S._maint){S._maint=false;return}loginView();const iu=$('#u');if(iu){iu.value=uname;iu.focus()}return}
  Object.assign(S,{t:r.t,role:r.role,nama:r.nama});store.set('sppd_t',r.t);fill(r);
  await loginSuccessAnim();shell()};
 $('#th').onclick=flip;setTheme(document.documentElement.dataset.theme);$('#go').onclick=go;$('#p').onkeydown=e=>{if(e.key==='Enter')go()};
 $('#pv').onclick=()=>{const ip=$('#p'),show=ip.type==='password';ip.type=show?'text':'password';const b=$('#pv');b.textContent=show?'visibility_off':'visibility';b.title=b.ariaLabel=show?'Sembunyikan kata sandi':'Tampilkan kata sandi'};
 try{applyLogin(JSON.parse(store.get('sppd_login')||'null'))}catch(e){} // pulihkan judul/subjudul tersimpan secara instan, sebelum menunggu jaringan
 try{look(JSON.parse(store.get('sppd_look')||'null'))}catch(e){} // pulihkan warna & latar tersimpan secara instan juga (sebelumnya hanya teks yang dipulihkan dari cache, warna & logo selalu menunggu publicInfo() - itu sebabnya terasa lama di HP/koneksi lambat)
 const cl=store.get('sppd_logo');if(cl&&$('#lg'))$('#lg').innerHTML=`<img src="${cl}" alt="Logo" style="max-width:100%;max-height:100%">`; // pulihkan logo tersimpan secara instan juga
 api('publicInfo').then(r=>{if(!r)return;look(r.look);store.set('sppd_look',JSON.stringify(r.look||{}));if(r.login){store.set('sppd_login',JSON.stringify(r.login));applyLogin(r.login)}if($('#lf'))$('#lf').textContent=r.footer||'';if(r.logo&&$('#lg')){$('#lg').innerHTML=`<img src="${r.logo}" alt="Logo" style="max-width:100%;max-height:100%">`;store.set('sppd_logo',r.logo)}}).catch(()=>{})}
function loginSuccessAnim(){return new Promise(res=>{const d=document.createElement('div');d.className='loksucc';
 d.innerHTML=`<div class="lokcheck"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6"/></svg></div><div class="lokt">LOGIN SUCCESS!!</div>`;
 document.body.appendChild(d);setTimeout(()=>{d.remove();res()},700)})}
function stamp(){const e=$('#sy');if(e&&S.at)e.textContent='Diperbarui '+S.at.toLocaleTimeString('id-ID',{hour12:false}).replace(/\./g,':')}
function fill(r){S._sig=bootSig(r);S.cfgCache=null;S.dpaCache={};S.bkuCache=null;S.pegCache=null;S.ajuanElig=null;S.ajuanList=null;S.maintenance=!!r.maintenance;S.maintPesan=r.maintPesan||'';S.ver=r.ver;S.sync=r.sync||60;S.at=new Date();if(r.role){S.role=r.role;S.nama=r.nama}S.bidang=r.bidang||'';S.jadwal=r.jadwal||[];S.d=r.data;S.pg=r.pegawai;S.us=r.users;S.kwi=r.kwi||[];S.lap=r.lap||[];S.wil=r.wilayah||[];S.foto=r.foto||'';S.tarif=r.tarif||S.tarif;S.logo=r.logo;S.footer=r.footer;look(r.look);
 if(S.t&&!r._t){try{localStorage.setItem('sppd_boot',JSON.stringify(Object.assign({},r,{_t:S.t,t:undefined})))}catch(e){store.del('sppd_boot')}}} // simpan data terakhir di perangkat ini untuk pembukaan berikutnya yang instan
async function load(){const r=await run(()=>api('boot',S.t));if(!r)return;fill(r);shell()}
/* Sinkron otomatis: periksa perubahan Spreadsheet secara berkala; muat ulang data bila berubah */
const bootSig=r=>{try{const o=Object.assign({},r);delete o.ver;delete o.t;delete o._t;return JSON.stringify(o)}catch(e){return''}}; // tanda isi data (tanpa token & penanda waktu) - untuk tahu apakah perlu digambar ulang
function ldxOverlay(msg,steps){ // animasi seperti saat login, tampil di atas halaman (dipakai tombol Update Data)
 const lg=S.logo||store.get('sppd_logo')||'',d=document.createElement('div');d.className='ldx-ov';
 d.innerHTML=`<div class="glass2 p-8 ldx" style="min-width:270px"><div class="ldx-ring"><div class="ldx-logo">${lg?`<img src="${esc(lg)}" alt="">`:'<span class="ms" style="font-size:38px;color:var(--accent-text)">sync</span>'}</div></div><div class="font-semibold" style="color:var(--heading)">${esc(msg)}</div><div class="ldx-bar"></div><div class="ldx-step">${esc(steps[0])}</div></div>`;
 document.body.appendChild(d);const st=d.querySelector('.ldx-step'),t0=Date.now();let i=0;
 const iv=setInterval(()=>{i=Math.min(i+1,steps.length-1);st.style.opacity=0;setTimeout(()=>{st.textContent=steps[i];st.style.opacity=1},200)},1200);
 return ok=>{clearInterval(iv);setTimeout(()=>{if(ok){st.style.opacity=1;st.textContent='Data terbaru siap ✓';st.style.color='#22c55e'}d.classList.add('out');setTimeout(()=>d.remove(),ok?650:250)},Math.max(0,700-(Date.now()-t0)))}}
function onlineDot(){const e=$('#ond');if(!e)return;const on=navigator.onLine!==false;e.classList.toggle('off',!on);const b=$('#rf');if(b)b.title=on?'Update Data - terhubung ke Spreadsheet':'Update Data - tidak ada koneksi internet'}
addEventListener('online',onlineDot);addEventListener('offline',onlineDot);
async function refresh(silent){if(silent)return refresh0_(true); // tombol Update Data: tampilkan animasi, data tetap diambil langsung dari Spreadsheet
 const done=ldxOverlay('Memperbarui data…',['Menghubungkan ke Spreadsheet…','Mengambil data terbaru…','Menyiapkan tampilan…']);const at=S.at;
 try{await refresh0_(false)}finally{done(S.at!==at)}} // S.at berubah = data berhasil diambil
async function refresh0_(silent){let r;try{r=await api('boot',S.t,!silent)}catch(e){const m=e.message||'';if(/Sesi berakhir/.test(m))return logout();if(/^\[MAINT\]|dalam perbaikan/.test(m))return maintScreen(m);if(!silent)toast(m||'Gagal memuat data',1);return}
 if(silent&&S._sig&&bootSig(r)===S._sig){S.at=new Date();stamp();return} // pembaruan di belakang layar: data sama persis -> tidak perlu menggambar ulang
 fill(r);stamp();if(!silent)toast('Data diperbarui dari Spreadsheet');setTimeout(onlineDot,0);
 if(S.view==='input'&&$('#ps')){refreshPs();return} // form Input Surat Tugas dilindungi terpisah - tidak di-render ulang penuh supaya draft yang sedang diisi tidak hilang
 if(document.querySelector('.modal'))return; // ada modal (mis. Ubah Surat Tugas) sedang terbuka - jangan ganggu
 // CATATAN: sebelumnya di sini juga ditahan kalau fokus sedang ada di input/select mana pun (mis. kolom cari di Rekap),
 // tapi itu bikin tombol "Update Data" terlihat tidak melakukan apa-apa saat fokus masih ada di kolom cari - padahal
 // data di baliknya sebenarnya sudah ter-update, cuma tabelnya tidak ikut digambar ulang. Kolom cari sendiri sudah
 // menyimpan isiannya di S.q dan menggambar ulang nilainya setiap render, jadi aman untuk digambar ulang di sini.
 const y=scrollY;shell();scrollTo(0,y)}
async function restore(){const t=store.get('sppd_t'); // pulihkan sesi setelah halaman di-refresh
 if(!t)return loginView();S.t=t;
 let snap=null;try{snap=JSON.parse(store.get('sppd_boot')||'null')}catch(e){}
 if(snap&&snap._t===t){try{fill(snap);const v=store.get('sppd_v');if(v&&menu().some(m=>m[0]===v))S.view=v;shell();refresh(true);return}catch(e){S=S0();S.t=t}} // buka seketika dari data terakhir di perangkat ini, lalu diperbarui dari server di belakang layar
 loadingCard('Memuat…',['Memeriksa sesi…','Mengambil data…','Menyiapkan dashboard…']);
 try{const r=await api('boot',t);fill(r);const v=store.get('sppd_v');if(v&&menu().some(m=>m[0]===v))S.view=v;shell()}catch(e){const m=e.message||'';if(/^\[MAINT\]|dalam perbaikan/.test(m))return maintScreen(m);store.del('sppd_t');store.del('sppd_v');S=S0();loginView()}}

const menu=()=>S.role==='Pegawai'?[['dash','dashboard','Dashboard & Statistik']]:S.role==='Kasubag Keuangan'?[['dash','dashboard','Dashboard & Statistik'],['dpa','account_balance_wallet','DPA Perjalanan Dinas'],['pencairan','request_quote','Pengajuan Pencairan'],RRPD_MENU,['kwi','receipt_long','Cetak Kwitansi'],['bku','menu_book','Buku Kas Umum (BKU)']]:['KABID','KASI','SEKRETARIS'].includes(S.role)?[['dash','dashboard','Dashboard & Statistik'],['dpa','account_balance_wallet','DPA Perjalanan Dinas'],RRPD_MENU,['bku','menu_book','Buku Kas Umum (BKU)']]:[['dash','dashboard','Dashboard & Statistik'],['rekap','table','Rekap & Data SPPD'],['input','edit_document','Input Surat Tugas & SPPD'],['kwi','receipt_long','Cetak Kwitansi'],['dpa','account_balance_wallet','DPA Perjalanan Dinas'],['pencairan','request_quote','Pengajuan Pencairan'],RRPD_MENU,['lap','summarize','Laporan Perjalanan Dinas'],...(sup()?[['bku','menu_book','Buku Kas Umum (BKU)'],['pegawai','badge','Data Master Pegawai'],['users','manage_accounts','Manajemen Pengguna'],['pjb','draw','Pejabat Penandatangan'],['cfg','print','Pengaturan Cetak'],['log','history','Log Aktivitas']]:[])];
const BNAV_LABEL={dash:'Dashboard',rekap:'Rekap',input:'Input',kwi:'Kwitansi',dpa:'DPA',pencairan:'Pencairan',rrpd:'RRPD',lap:'Laporan',bku:'BKU',pegawai:'Pegawai',users:'Pengguna',pjb:'TTD',cfg:'Cetak',log:'Log'};
fetch('app-data.json').then(r=>r.json()).then(j=>{if(j&&j.navLabels)Object.assign(BNAV_LABEL,j.navLabels)}).catch(()=>{}); // opsional - timpa label navigasi bawah bila app-data.json ada isinya; gagal/tidak ada file = tetap pakai label bawaan di atas, tidak memengaruhi apa pun
const bLbl=m=>BNAV_LABEL[m[0]]||m[2].split(' ')[0];
const bitemHtml=(m,cls)=>`<div class="${cls||'bitem'} ${S.view===m[0]?'on':''}" data-v="${m[0]}" role="button" tabindex="0"><span class="ms">${m[1]}</span><span>${bLbl(m)}</span></div>`;
function bmenuSheet(){const mi=menu();const ov=document.createElement('div');ov.className='bscrim';
 const sh=document.createElement('div');sh.className='bsheet';
 sh.innerHTML=`<div class="flex items-center justify-between mb-3"><b style="color:var(--heading)">Menu</b><button class="btn2" id="bsx" aria-label="Tutup">Tutup</button></div><div class="grid4">${mi.map(m=>bitemHtml(m,'bitem2')).join('')}</div>`;
 document.body.appendChild(ov);document.body.appendChild(sh);
 document.body.classList.add('bopen');const close=()=>{ov.remove();sh.remove();document.body.classList.remove('bopen')};
 ov.onclick=close;sh.querySelector('#bsx').onclick=close;
 sh.querySelectorAll('.bitem2').forEach(n=>n.onclick=()=>{close();if(n.classList.contains('on'))return;S.view=n.dataset.v;S.page=1;shell()})}
// ---------- Menu grup di sidebar (submenu buka-tutup) - hanya tampilan; halaman & izin tetap dari menu() ----------
const NAV_GRUP=[{id:'pengajuan',ikon:'assignment',nama:'Pengajuan',isi:['kwi','lap','pencairan']}];
function sideNav(mi){const item=(m,sub)=>`<div class="nav${sub?' sub':''} ${S.view===m[0]?'on':''}" data-v="${m[0]}" role="button" tabindex="0" title="${m[2]}"><span class="ms">${m[1]}</span><span class="nav-label">${m[2]}</span></div>`;
 const pakai={};NAV_GRUP.forEach(g=>{const a=g.isi.map(k=>mi.find(m=>m[0]===k)).filter(Boolean);if(a.length>=2)pakai[g.id]={g,a}}); // grup dipakai bila peran ini punya minimal 2 halamannya
 const sudah={};return mi.map(m=>{const gid=Object.keys(pakai).find(k=>pakai[k].g.isi.includes(m[0]));if(!gid)return item(m);if(sudah[gid])return'';sudah[gid]=1;
  const {g,a}=pakai[gid],aktif=a.some(x=>x[0]===S.view),buka=aktif||store.get('sppd_grp_'+g.id)!=='0';
  return`<div class="navgrp${buka?' open':''}${aktif?' act':''}"><div class="navg" data-g="${g.id}" role="button" tabindex="0" aria-expanded="${buka}" title="${g.nama}"><span class="ms">${g.ikon}</span><span class="nav-label">${g.nama}</span><span class="ms navchev nav-label">expand_more</span></div><div class="navsub">${a.map(x=>item(x,1)).join('')}</div></div>`}).join('')}
function shell(){store.set('sppd_v',S.view);const mi=menu(),sc=store.get('sppd_side')==='1';$('#app').innerHTML=`<div class="flex gap-3 p-3" style="min-height:100vh"><aside id="side" class="glass p-3 shrink-0 flex flex-col${sc?' collapsed':''}">
<div class="p-3 mb-2 flex items-center gap-3 sb-brand">${S.logo?`<img src="${S.logo}" alt="Logo" style="width:40px;height:40px;object-fit:contain;flex:none">`:''}<div class="sb-text"><b style="color:var(--heading);font-size:16px">REGISTER SPPD</b><div class="text-xs" style="color:var(--text-2)">Satpol PP & Damkar</div></div></div>
${sideNav(mi)}
<div class="glass p-3 mt-auto text-xs sb-foot"><div class="flex items-center gap-3">${ava(S.foto,S.nama,40)}<div class="sb-text"><b>${esc(S.nama)}</b><br>${esc(S.role)}${S.bidang?' · '+esc(S.bidang):''}</div></div></div></aside>
<main class="flex-1 min-w-0"><div class="glass flex items-center flex-wrap gap-2 px-3 py-2 mb-3" style="border-radius:1rem"><button class="btn2" id="tg" aria-label="Ciutkan atau perluas sidebar" title="Ciutkan atau perluas sidebar"><span class="ms" id="tgi">${sc?'menu':'menu_open'}</span></button>
<b class="text-lg sm:text-xl" style="min-width:0">${esc(menu().find(m=>m[0]===S.view)[2])}</b><div class="flex items-center gap-2" style="margin-left:auto"><button class="btn2" id="rf" aria-label="Update Data" title="Update Data - terhubung ke Spreadsheet"><span class="ondot" id="ond"></span> <span class="hidden sm:inline">Update Data</span></button><button class="btn2" id="th" aria-label="Ganti Tema" title="Ganti Tema"><span class="ms" id="thi"></span></button><button class="btn2" onclick="logout()" aria-label="Keluar" title="Keluar"><span class="ms">logout</span> Keluar</button></div></div><div id="main" class="fadein"></div><footer class="text-center text-xs mt-10 pb-2" style="color:var(--text-2)">${esc(S.footer)}</footer></main>
${mi.length>1?`<nav id="bnav">${mi.slice(0,2).map(m=>bitemHtml(m)).join('')}<div class="bfab" id="bmore" role="button" tabindex="0" aria-label="Menu lainnya" title="Menu lainnya"><span class="ms">apps</span></div>${mi.slice(-2).map(m=>bitemHtml(m)).join('')}</nav>`:''}</div>`;
 function sideToggle(){const s=$('#side');s.classList.toggle('collapsed');const on=s.classList.contains('collapsed');store.set('sppd_side',on?'1':'0');const ic=$('#tgi');if(ic)ic.textContent=on?'menu':'menu_open'}
 $('#tg').onclick=sideToggle;
 if($('#bmore'))$('#bmore').onclick=bmenuSheet;
 document.querySelectorAll('.nav,.bitem').forEach(n=>n.onclick=()=>{if(n.classList.contains('on'))return;S.view=n.dataset.v;S.page=1;shell()});
 document.querySelectorAll('.navg').forEach(g=>g.onclick=()=>{const w=g.parentElement,o=!w.classList.contains('open');w.classList.toggle('open',o);g.setAttribute('aria-expanded',o);store.set('sppd_grp_'+g.dataset.g,o?'1':'0')});
 $('#th').onclick=flip;setTheme(document.documentElement.dataset.theme);$('#rf').onclick=()=>refresh(false);stamp();onlineDot();
 ({dash,rekap,input:inputV,pegawai:pegV,users:usrV,cfg:cfgV,kwi:kwiV,dpa:dpaV,pencairan:pencairanV,rrpd:rrpdV,lap:lapV,pjb:pjbV,bku:bkuV,log:logV})[S.view]();if(!S._pf){S._pf=1;setTimeout(prefetchKeu,1500)}}
const dlXlsx=p=>dl('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'+p.b64,p.name);
async function logV(){const r=await run(()=>api('logList',S.t));if(!r)return;
 $('#main').innerHTML=`<div class="flex items-center justify-between flex-wrap gap-2 mb-3"><div><h1 class="text-2xl font-bold">Log Aktivitas</h1><p class="text-xs" style="color:var(--text-2)">Riwayat login, penerbitan/ubah/hapus Surat Tugas, Kwitansi, Laporan, dan manajemen pengguna. Menampilkan ${r.length} aktivitas terakhir.</p></div><button class="btn2" id="logClr" ${r.length?'':'disabled'}><span class="ms">delete_sweep</span> Hapus Log</button></div>
 <div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:860px"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Peran</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>
 ${r.map(x=>`<tr><td class="t"><b>${esc(x.waktu)}</b></td><td class="t">${esc(x.pengguna)}</td><td class="t">${esc(x.peran)}</td><td class="t">${esc(x.aksi)}</td><td class="t">${esc(x.detail)}</td></tr>`).join('')||'<tr><td class="t" colspan="5">Belum ada aktivitas tercatat.</td></tr>'}</tbody></table></div>`;
 $('#logClr').onclick=async()=>{if(!await confirmDlg('Peringatan!! Seluruh riwayat Log Aktivitas akan dikosongkan dan tidak bisa dipulihkan kembali.\n\nHapus semua data Log Aktivitas?'))return;await run(()=>api('logClear',S.t),'Log Aktivitas dikosongkan');logV()}}

function yrs(){const y=[...new Set(S.d.map(r=>String(r.TglST).slice(0,4)))];if(!y.includes(S.yr))y.push(S.yr);return y.sort()}
function dash(){const d=S.d.filter(r=>String(r.TglST).startsWith(S.yr)),st=new Set(d.map(r=>r.NoST)).size,pg=new Set(d.map(r=>r.NIP)).size,avg=d.length?(d.reduce((a,r)=>a+Number(r.Lama),0)/d.length).toFixed(1):0;
 const per=(S.bidang?[S.bidang]:BID).map(b=>{const rs=d.filter(r=>r.Bidang===b),m={};rs.forEach(r=>m[r.Nama]=(m[r.Nama]||0)+1);return{b,st:new Set(rs.map(r=>r.NoST)).size,pg:Object.entries(m).sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0]))}});
 const card=(i,l,v,u,k)=>`<div class="stat3d ${k}"><div class="itile3"><span class="ms" style="font-size:22px">${i}</span></div><div class="text-xs mt-3" style="opacity:.9;font-weight:600">${l}</div><div class="text-3xl font-bold mt-1">${v} <span class="text-sm font-normal" style="opacity:.85">${u}</span></div></div>`;
 $('#main').innerHTML=`<div class="hero mb-5 flex flex-wrap justify-between items-center gap-3"><span class="ms" aria-hidden="true" style="position:absolute;right:-22px;top:-30px;font-size:180px;opacity:.12;pointer-events:none;color:#fff">shield</span><div class="flex items-center gap-4" style="position:relative;z-index:1">${S.logo?`<img src="${S.logo}" alt="Logo" style="width:56px;height:56px;object-fit:contain">`:''}<div><div class="text-xs font-bold" style="letter-spacing:.12em;opacity:.85">REGISTER SPPD · SATPOL PP &amp; DAMKAR${S.bidang?' · '+esc(S.bidang).toUpperCase():''}</div><h1 class="text-3xl font-bold"><span id="gr"></span>, ${esc(S.nama)}</h1><p style="color:var(--text-2)">Ringkasan perjalanan dinas tahun ${S.yr}</p></div></div>
 <div class="flex items-center gap-2 flex-wrap" style="position:relative;z-index:1"><div class="glass2 px-4 py-2 flex items-center gap-3"><span class="ms" id="ci" style="font-size:34px;color:var(--accent-text)"></span><div><div id="ck" class="text-2xl font-bold" style="font-variant-numeric:tabular-nums"></div><div id="cd" class="text-xs" style="color:var(--text-2)"></div></div></div></div>
 <div class="flex gap-2" style="position:relative;z-index:1"><select id="yr" class="inp" style="width:auto" aria-label="Tahun">${yrs().map(y=>`<option ${y==S.yr?'selected':''}>${y}</option>`).join('')}</select>${adm()?'<button class="btn" id="nb">+ Buat Surat Tugas</button>':''}${sup()?`<button class="${S.maintenance?'btn-d':'btn2'}" id="mtBtn"><span class="ms">build</span> ${S.maintenance?'Nonaktifkan Mode Perbaikan':'Aktifkan Mode Perbaikan'}</button>`:''}</div></div>
 ${sup()&&S.maintenance?'<div class="glass p-4 mb-4" style="border:1px solid var(--red);color:var(--red);font-weight:600"><span class="ms" style="vertical-align:-4px">build</span> Mode Perbaikan sedang AKTIF — semua pengguna selain Super Admin tidak dapat menggunakan sistem sampai Anda menonaktifkannya kembali.</div>':''}
 ${sup()?`<div class="glass p-4 mb-4"><b>Pesan Mode Perbaikan</b><p class="text-xs" style="color:var(--text-2)">Teks ini tampil di layar pengguna lain saat Mode Perbaikan aktif. Kosongkan lalu Simpan untuk kembali ke pesan bawaan.</p><textarea id="mtMsg" class="inp mt-2" rows="2" maxlength="300" aria-label="Pesan Mode Perbaikan">${esc(S.maintPesan)}</textarea><div class="flex justify-end mt-2"><button class="btn2" id="mtSave"><span class="ms">save</span> Simpan Pesan</button></div></div>`:''}
 ${sup()?`<div class="glass p-4 mb-4"><div class="flex flex-wrap justify-between items-center gap-3"><div><b>Register Perjalanan Dinas</b><p class="text-xs" style="color:var(--text-2)">Download seluruh Surat Tugas &amp; SPPD satu tahun (semua bidang) dalam bentuk Excel, lengkap dengan kop, kertas Legal - Landscape.</p></div><div class="flex gap-2 items-center"><select id="regYr" class="inp" style="width:auto" aria-label="Tahun Register">${yrs().map(y=>`<option ${y==S.yr?'selected':''}>${y}</option>`).join('')}</select><button class="btn" id="regDl"><span class="ms">download</span> Download Excel</button></div></div></div>`:''}
 ${sup()?'<div id="arsipBox" class="mb-4"></div>':''}
 ${sup()?'<div id="waBox" class="mb-4"></div>':''}
 <div class="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">${card('description','Total SPPD',d.length,'','s-blue')}${card('mail','Surat Tugas Terbit',st,'','s-green')}${card('directions_walk','Pegawai Bertugas',pg,'orang','s-amber')}${card('schedule','Rata-rata Durasi',avg,'hari','s-rose')}</div>
 <div id="dpaBox" class="mb-5"></div>
 <div class="grid gap-4 lg:grid-cols-3 mb-5"><div class="glass p-5 min-w-0 ${['Admin','Kasubag Keuangan','KABID','KASI'].includes(S.role)?'lg:col-span-3':'lg:col-span-2'}"><b>Tren Penerbitan SPPD Bulanan</b><div style="position:relative;height:240px;max-width:100%;margin-top:.5rem"><canvas id="c1"></canvas></div></div>
 ${['Admin','Kasubag Keuangan','KABID','KASI'].includes(S.role)?'':'<div class="glass p-5 min-w-0"><b>Per Bidang</b><div style="position:relative;height:240px;max-width:100%;margin-top:.5rem"><canvas id="c2"></canvas></div></div>'}</div>
 ${S.role==='Kasubag Keuangan'?'':`<div class="glass p-5"><b>Jumlah Perjalanan per Bidang</b><p class="text-xs" style="color:var(--text-2)">Surat Tugas yang diterbitkan dan jumlah perjalanan setiap pegawai tahun ${S.yr}</p>
 <div class="grid gap-4 md:grid-cols-2 mt-3">${per.map(o=>`<div class="glass p-4"><div class="flex justify-between items-center">${badge(o.b)}<div class="text-right"><span class="text-2xl font-bold">${o.st}</span> <small>perjalanan</small></div></div><div class="text-xs mt-1" style="color:var(--text-2)">${o.pg.length} pegawai bertugas</div>
 <div class="mt-2" style="max-height:220px;overflow:auto">${o.pg.map(([n,c])=>`<div class="flex justify-between py-1" style="border-bottom:1px solid var(--line)"><span>${esc(n)}</span><b>${c}×</b></div>`).join('')||'<small style="color:var(--text-2)">Belum ada perjalanan.</small>'}</div></div>`).join('')}</div></div>`}`;
 if(adm()||['Kasubag Keuangan','KABID','KASI','SEKRETARIS'].includes(S.role))dpaBox();tick();clearInterval(_clk);_clk=setInterval(tick,1000);$('#yr').onchange=e=>{S.yr=e.target.value;dash()};if($('#nb'))$('#nb').onclick=()=>{S.view='input';shell()};
 if($('#mtBtn'))$('#mtBtn').onclick=async()=>{const turnOn=!S.maintenance;
  if(turnOn&&!await confirmDlg('Semua pengguna selain Super Admin (Admin, KABID, KASI, SEKRETARIS, Kasubag Keuangan, Pegawai) tidak akan bisa menggunakan sistem sampai Anda menonaktifkan Mode Perbaikan ini kembali.\n\nAktifkan Mode Perbaikan sekarang?','Aktifkan Mode Perbaikan'))return;
  const done=busy($('#mtBtn'),'Memproses…');
  try{const ok=await run(()=>api('setMaintenance',S.t,turnOn),turnOn?'Mode Perbaikan diaktifkan':'Mode Perbaikan dinonaktifkan');if(ok!==undefined){S.maintenance=turnOn;dash()}}finally{done()}};
 if($('#mtSave'))$('#mtSave').onclick=async()=>{const done=busy($('#mtSave'),'Menyimpan…');try{const p=await run(()=>api('setMaintPesan',S.t,$('#mtMsg').value),'Pesan Mode Perbaikan disimpan');if(p!==undefined){S.maintPesan=p;$('#mtMsg').value=p}}finally{done()}};
 if($('#waBox'))waBox();
 if($('#arsipBox'))arsipBox();
 if($('#regDl'))$('#regDl').onclick=async()=>{const done=busy($('#regDl'),'Membuat Excel…');try{const p=await run(()=>api('exportRegisterXlsx',S.t,$('#regYr').value),'Excel Register siap diunduh');if(p)dlXlsx(p)}finally{done()}};
 charts.forEach(c=>c.destroy());const m=Array(12).fill(0),b=BID.map(x=>d.filter(r=>r.Bidang===x).length);d.forEach(r=>m[+String(r.TglST).slice(5,7)-1]++);
 const css=getComputedStyle(document.documentElement),col=v=>css.getPropertyValue(v).trim();
 Chart.defaults.color=col('--text-2');Chart.defaults.borderColor=col('--line');
 charts=[new Chart($('#c1'),{type:'line',data:{labels:BL.map(x=>x.slice(0,3)),datasets:[{label:'SPPD',data:m,borderColor:col('--accent-text'),backgroundColor:'rgba(16,185,129,.15)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}),
 ...($('#c2')?[new Chart($('#c2'),{type:'doughnut',data:{labels:BID,datasets:[{data:b,backgroundColor:[col('--blue'),col('--teal'),col('--amber'),col('--red')]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}})]:[])]}

function filt(){const q=S.q.toLowerCase();return S.d.filter(r=>(!q||[r.Nama,r.NIP,r.NoST,r.NoSPPD,r.Tujuan].join(' ').toLowerCase().includes(q))&&(!S.fb||r.Bidang===S.fb)&&(!S.fm||String(r.TglST).slice(0,7)===S.fm)).sort((a,b)=>String(b.TglST).localeCompare(a.TglST))}
const waktuInput=r=>{const m=String(r.Dibuat||'').match(/(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s*$/);return m?m[1]:''}; // jam & tanggal penginputan (kolom Dibuat)
// Rekap: Surat Tugas yang PALING BARU DIINPUT tampil paling atas - diurutkan menurut jam & tanggal penginputan (bukan Tanggal Surat Tugas).
// Data lama tanpa catatan jam input ditaruh di bawahnya, urut dari baris sheet paling bawah (paling baru) ke atas.
function urutInput(keys){const w={},u={};S.d.forEach((r,i)=>{const t=waktuInput(r);if(t&&(!w[r.NoST]||t<w[r.NoST]))w[r.NoST]=t;if(u[r.NoST]==null||i<u[r.NoST])u[r.NoST]=i});
 return keys.sort((a,b)=>(w[b]||'').localeCompare(w[a]||'')||u[b]-u[a])} // daftar No. ST diurutkan: paling baru diinput di atas (dipakai Rekap & Cetak Kwitansi)
function groups(){const m=new Map();filt().forEach(r=>{if(!m.has(r.NoST))m.set(r.NoST,[]);m.get(r.NoST).push(r)});return urutInput([...m.keys()])}
function rekap(){const g=groups(),n=10,pgs=Math.max(1,Math.ceil(g.length/n));S.page=Math.min(S.page,pgs);const v=g.slice((S.page-1)*n,S.page*n);
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3 flex items-center gap-2 flex-wrap">Rekapitulasi Surat Tugas & SPPD<button class="btn2" id="xx" style="font-size:.8rem"><span class="ms">download</span> Export Excel</button></h1><div class="glass p-4 mb-4 grid gap-3 md:grid-cols-3">
 <div class="md:col-span-3"><input id="q" class="inp" placeholder="Cari nama pegawai, NIP, nomor surat/SPPD, atau tujuan…" value="${esc(S.q)}" aria-label="Cari"></div>
 <select id="fb" class="inp" aria-label="Bidang"><option value="">Semua Bidang</option>${BID.map(b=>`<option ${S.fb==b?'selected':''}>${b}</option>`).join('')}</select>
 <input id="fm" type="month" class="inp" value="${S.fm}" aria-label="Bulan"><button class="btn2" id="rs">Reset Filter</button></div>
 <div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:980px"><thead><tr><th>No</th><th>Tgl Surat Tugas</th><th>No. Surat Tugas</th><th>No. SPPD</th><th>Bidang</th><th>Tujuan</th><th>Maksud Perjalanan Dinas</th><th>Lama</th><th>Aksi</th></tr></thead><tbody>
 ${v.map((k,i)=>{const all=S.d.filter(r=>r.NoST===k),x=all[0],nm=all.map(r=>+String(r.NoSPPD).split(' / ')[2]).filter(Boolean),rg=nm.length>1?Math.min(...nm)+' – '+Math.max(...nm):(nm[0]||'-');
 return`<tr><td class="t">${(S.page-1)*n+i+1}</td><td class="t"><b>${idn(x.TglST)}</b></td><td class="t">${esc(k)}</td><td class="t">${rg}<br><small>${all.length} pegawai</small></td><td class="t">${badge(x.Bidang)}</td><td class="t">${esc(x.Tujuan)}</td><td class="t">${esc(x.Maksud)}</td><td class="t">${x.Lama} hr</td>
 <td class="t"><div class="flex gap-1 flex-wrap"><button class="btn2" data-a="pv" data-i="${esc(k)}" aria-label="Generate Surat Tugas dan SPPD" title="Generate Surat Tugas dan SPPD"><span class="ms">auto_awesome</span></button><button class="btn2" data-a="pvst" data-i="${esc(k)}" aria-label="Cetak Surat Tugas" title="Cetak Surat Tugas"><span class="ms">assignment</span></button><button class="btn2" data-a="pvsp" data-i="${esc(k)}" aria-label="Cetak SPPD" title="Cetak SPPD"><span class="ms">card_travel</span></button>${adm()?`<button class="btn2" data-a="ed" data-i="${esc(k)}" aria-label="Ubah" title="Ubah"><span class="ms">edit</span></button>${sup()?`<button class="btn-d" data-a="dl" data-i="${esc(k)}" aria-label="Hapus" title="Hapus"><span class="ms">delete</span></button>`:''}`:''}</div></td></tr>`}).join('')||`<tr><td class="t" colspan="9">Tidak ada data.</td></tr>`}</tbody></table></div>
 <div class="flex justify-between items-center mt-3"><small>${g.length} surat tugas</small><div class="flex gap-2 items-center"><button class="btn2" id="pv">‹</button><b>${S.page} / ${pgs}</b><button class="btn2" id="nx">›</button></div></div>`;
 const re=()=>{S.page=1;rekap()};$('#q').oninput=e=>{S.q=e.target.value;S.page=1;clearTimeout(window._d);window._d=setTimeout(()=>{rekap();const q=$('#q');q.focus();q.setSelectionRange(99,99)},300)};
 $('#fb').onchange=e=>{S.fb=e.target.value;re()};$('#fm').onchange=e=>{S.fm=e.target.value;re()};$('#rs').onclick=()=>{S.q=S.fb=S.fm='';re()};
 $('#pv').onclick=()=>{S.page=Math.max(1,S.page-1);rekap()};$('#nx').onclick=()=>{S.page=Math.min(pgs,S.page+1);rekap()};
 $('#xx').onclick=async()=>{const done=busy($('#xx'),'Membuat Excel…');try{const p=await run(()=>api('exportRekapXlsx',S.t),'Excel siap diunduh');if(p)dlXlsx(p)}finally{done()}};
 document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>act(b.dataset.a,b.dataset.i,b))}
async function act(a,k,btn){const rs=S.d.filter(x=>x.NoST===k);
 if(a==='pv'){const done=busy(btn,'Menyiapkan dokumen…');try{const v=await run(()=>api('preview',S.t,k));if(v)prev(v,k)}finally{done()}}
 if(a==='pvst'){const done=busy(btn,'Menyiapkan dokumen…');try{const v=await run(()=>api('previewST',S.t,k));if(v)prev(v,k,'pdfST')}finally{done()}}
 if(a==='pvsp'){const done=busy(btn,'Menyiapkan dokumen…');try{const v=await run(()=>api('previewSP',S.t,k));if(v)prev(v,k,'pdfSP')}finally{done()}}
 if(a==='dl'&&await confirmDlg('Peringatan!! Data yang dihapus tidak bisa dipulihkan kembali.\n\nHapus Surat Tugas '+k+' beserta '+rs.length+' SPPD pegawai?')){await run(()=>api('delST',S.t,k),'Surat Tugas dihapus');await load()}
 if(a==='ed')edit(rs)}
function prev(v,key,fn){const m=document.createElement('div');m.className='modal pvm';
 const tp=fn==='kwiPdf'?'KWI':fn==='lapPdf'?'LAP':fn==='bkuPdf'?'BKU':fn==='rrpdPdf'?'RRPD':'ST',
 judul=fn==='pdfST'?'Cetak Surat Tugas':fn==='pdfSP'?'Cetak SPPD':tp==='KWI'?'Generate Kwitansi':tp==='LAP'?'Generate Laporan Perjalanan Dinas':tp==='BKU'?'Generate Buku Kas Umum (BKU)':tp==='RRPD'?'Generate RRPD':'Generate Surat Tugas dan SPPD',
 partial=fn==='pdfST'||fn==='pdfSP'; // dokumen sebagian (ST saja / SPPD saja) tidak punya opsi Word/Edit di Docs
 m.innerHTML=`<div class="glass2 p-4 w-full" style="max-width:920px;height:92vh;display:flex;flex-direction:column"><div class="flex justify-between items-center mb-2 gap-2 flex-wrap"><b>${judul}</b><div class="flex gap-2 flex-wrap"><button class="btn" id="dl" aria-label="Unduh PDF" title="Unduh PDF"><span class="ms pv-ico">download</span><span class="pv-lbl">Unduh PDF</span></button>${tp==='ST'&&fn!=='pdfSP'?'<button class="btn2" id="wa" aria-label="Kirim ke WhatsApp" title="Kirim ke WhatsApp" style="color:#fff;background:#25D366;border-color:#25D366;padding-left:.7rem;padding-right:.7rem"><span class="ms">chat</span></button>':''}<button class="btn2" id="pr"><span class="ms">print</span> Cetak</button>${partial?'':'<button class="btn2" id="dw"><span class="ms">description</span> Word</button><button class="btn2" id="dg"><span class="ms">edit</span> Edit di Docs</button>'}<button class="btn2" id="cl" aria-label="Tutup" title="Tutup"><span class="ms pv-ico">close</span><span class="pv-lbl">Tutup</span></button></div></div><iframe id="fr" title="${judul}" style="flex:1;border:0;border-radius:.5rem;background:#cfd8d3"></iframe></div>`;
 document.body.appendChild(m);$('#fr').srcdoc=v;$('#cl').onclick=()=>m.remove();
 $('#pr').onclick=()=>{try{const w=$('#fr').contentWindow;w.focus();w.print()}catch(e){toast('Perangkat ini tidak mendukung cetak langsung. Gunakan Unduh PDF lalu cetak dari situ.',1)}};
 if($('#dw'))$('#dw').onclick=async()=>{const done=busy($('#dw'),'Membuat Word…');try{const p=await run(()=>api('exportDoc',S.t,tp,key,'docx'),'Dokumen Word siap diunduh');if(p)dl('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,'+p.b64,p.name)}finally{done()}};
 if($('#dg'))$('#dg').onclick=async()=>{const done=busy($('#dg'),'Menyiapkan Docs…');try{const p=await run(()=>api('exportDoc',S.t,tp,key,'gdoc'),'Dokumen dibuat di Google Docs');if(!p)return;$('#dg').outerHTML=`<a class="btn2" href="${p.url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px">Buka di Docs ↗</a>`;window.open(p.url,'_blank')}finally{done()}};
 if($('#wa'))$('#wa').onclick=async()=>{const done=busy($('#wa'),'Menyiapkan PDF…');try{const p=await run(()=>api(fn||'pdf',S.t,key));if(p)stWaDlg(p,key)}finally{done()}};
 $('#dl').onclick=async()=>{const done=busy($('#dl'),'Membuat PDF…');try{const p=await run(()=>api(fn||'pdf',S.t,key),'PDF siap diunduh');if(!p)return;const A=document.createElement('a');A.href='data:application/pdf;base64,'+p.b64;A.download=p.name;document.body.appendChild(A);A.click();A.remove()}finally{done()}}}
// ---------- Kirim Surat Tugas ke WhatsApp ----------
// HP: file PDF dibagikan langsung lewat menu Bagikan (pilih WhatsApp). Komputer/peramban lama: PDF diunduh + WhatsApp dibuka dengan pesan ringkas, lalu PDF dilampirkan manual.
function stWaTeks(noST){const rs=(S.d||[]).filter(r=>r.NoST===noST),x=rs[0];if(!x)return'Surat Tugas Nomor: '+noST;
 const tg=x.Berangkat===x.Kembali?idnF(x.Berangkat):idnF(x.Berangkat)+' s.d. '+idnF(x.Kembali);
 return`*SURAT TUGAS*\nNomor: ${noST}\nTanggal: ${idnF(x.TglST)}\n\nMaksud: ${x.Maksud}\nTujuan: ${x.Tujuan}\nWaktu: ${tg} (${x.Lama} hari)\n\nPetugas (${rs.length} orang):\n${rs.map((r,i)=>(i+1)+'. '+r.Nama).join('\n')}\n\nFile PDF Surat Tugas terlampir.\n_${S.nama}${S.bidang?' - Bidang '+S.bidang:''}_`}
function stWaDlg(p,noST){const bin=atob(p.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
 const file=new File([u8],p.name,{type:'application/pdf'}),teks=stWaTeks(noST);let bisaFile=false;try{bisaFile=!!(navigator.canShare&&navigator.canShare({files:[file]}))}catch(e){}
 const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-lg" style="max-height:92vh;overflow:auto"><h2 class="text-lg font-bold">Kirim Surat Tugas ke WhatsApp</h2>
 <p class="text-xs mt-1" style="color:var(--text-2)">${bisaFile?'Tekan <b>Bagikan PDF</b>, lalu pilih <b>WhatsApp</b> dan kontak/grup tujuan. File PDF dan pesan ikut terkirim.':'Perangkat ini tidak bisa membagikan file langsung. PDF akan diunduh dan WhatsApp dibuka dengan pesan di bawah - lampirkan file PDF yang terunduh ke chat.'}</p>
 <label for="waT">Pesan</label><textarea id="waT" class="inp" rows="9">${esc(teks)}</textarea>
 <div class="text-xs mt-2" style="color:var(--text-2)"><span class="ms" style="font-size:16px">picture_as_pdf</span> ${esc(p.name)}</div>
 <div class="flex gap-2 justify-end mt-4 flex-wrap"><button class="btn2" id="waX">Tutup</button>${bisaFile?'<button class="btn" id="waS" style="background:#25D366;border-color:#25D366"><span class="ms">share</span> Bagikan PDF</button>':''}<button class="btn2" id="waL"><span class="ms">chat</span> ${bisaFile?'Kirim Pesan Saja':'Unduh PDF &amp; Buka WhatsApp'}</button></div></div>`;
 document.body.appendChild(m);$('#waX').onclick=()=>m.remove();
 if($('#waS'))$('#waS').onclick=async()=>{try{await navigator.share({files:[file],title:p.name,text:$('#waT').value});m.remove()}catch(e){if(e&&e.name!=='AbortError')toast('Gagal membagikan: '+(e.message||e),1)}};
 $('#waL').onclick=()=>{if(!bisaFile)dl('data:application/pdf;base64,'+p.b64,p.name);window.open('https://wa.me/?text='+encodeURIComponent($('#waT').value),'_blank','noopener');m.remove()}}
function muatGbr(u){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('gambar tidak bisa dibaca'));i.src=u})}
async function gabungTtdCap(ttd,cap,uk){ // CAP di kiri, menimpa sebagian tanda tangan (seperti dicap manual); hasil PNG transparan
 const a=await muatGbr(ttd),b=await muatGbr(cap),k=Math.min(1,600/a.naturalWidth),sw=a.naturalWidth*k,sh=a.naturalHeight*k;
 const ch=Math.max(sh*uk,40),cw=b.naturalWidth*(ch/b.naturalHeight),sx=cw*0.45,W=Math.max(cw,sx+sw),H=Math.max(ch,sh);
 const cv=document.createElement('canvas');cv.width=Math.round(W);cv.height=Math.round(H);const g=cv.getContext('2d');
 g.globalAlpha=.88;g.drawImage(b,0,(H-ch)/2,cw,ch);g.globalAlpha=1;g.drawImage(a,sx,(H-sh)/2,sw,sh);
 return{data:cv.toDataURL('image/png'),skala:W/sw}}
const rpf=n=>'Rp '+Math.round(n).toLocaleString('en-US');
function dpaDet(b,y){return S.kwi.map(k=>{const rs=S.d.filter(r=>r.NoST===k.NoST);return rs.length&&rs[0].Bidang===b&&String(rs[0].TglST).slice(0,4)===String(y)?{k,rs,t:rs[0]}:null}).filter(Boolean).sort((a,b)=>String(b.t.TglST).localeCompare(String(a.t.TglST)))}
function dpaDetail(x,y){const L=dpaDet(x.Bidang,y),m=document.createElement('div');m.className='modal';
 const tot=L.reduce((a,o)=>a+o.rs.reduce((s,r)=>s+r.Lama*o.k.Tarif,0),0);
 m.innerHTML=`<div class="glass2 p-5 w-full" style="max-width:980px;max-height:92vh;overflow:auto"><div class="flex justify-between items-start gap-3 flex-wrap"><div><h2 class="text-lg font-bold">Detail Perjalanan Dinas — ${badge(x.Bidang)} ${y}</h2>
 <small style="color:var(--text-2)">Surat Tugas yang kwitansinya sudah terbit · Pagu ${rpf(x.Pagu)} · Jumlah ${rpf(x.Jumlah)} · Sisa <b style="color:${x.Sisa<0?'var(--red)':'inherit'}">${rpf(x.Sisa)}</b></small></div><button class="btn2" id="dx">Tutup</button></div>
 <div class="overflow-x-auto mt-3"><table class="w-full" style="min-width:760px"><thead><tr><th>No</th><th>Tanggal</th><th>Surat Tugas / Kwitansi</th><th>Tujuan</th><th>Pegawai (hari × tarif)</th><th>Total</th></tr></thead><tbody>
 ${L.map((o,i)=>{const t=o.rs.reduce((s,r)=>s+r.Lama*o.k.Tarif,0);return`<tr><td class="t">${i+1}</td><td class="t"><b>${idn(o.t.TglST)}</b><br><small>${o.t.Lama} hr</small></td><td class="t">${esc(o.t.NoST)}<br><small>Bukti: ${esc(o.k.Nomor||'-')} · ${esc(o.k.Jenis)}</small></td><td class="t">${esc(o.t.Tujuan)}</td>
 <td class="t">${o.rs.map(r=>`${esc(r.Nama)} <small style="color:var(--text-2)">${r.Lama} hr × ${rpf(o.k.Tarif)} = ${rpf(r.Lama*o.k.Tarif)}</small>`).join('<br>')}</td><td class="t"><b>${rpf(t)}</b></td></tr>`}).join('')||'<tr><td class="t" colspan="6">Belum ada kwitansi yang terbit untuk bidang ini.</td></tr>'}
 ${L.length?`<tr><td class="t" colspan="5"><b>TOTAL</b></td><td class="t"><b>${rpf(tot)}</b></td></tr>`:''}</tbody></table></div></div>`;
 document.body.appendChild(m);$('#dx').onclick=()=>m.remove()}
async function dpaBox(){const el=$('#dpaBox');if(!el)return;let r=S.dpaCache[S.yr];
 if(!r){el.innerHTML='<div class="glass p-5" style="color:var(--text-2)">Memuat DPA…</div>';try{r=await apiQ('dpaGet',S.t,S.yr);S.dpaCache[S.yr]=r}catch(e){el.innerHTML='';return}}if(!el.isConnected)return; // halaman sudah digambar ulang -> pemanggilan yang lebih baru yang mengisi
 const P=r.reduce((a,x)=>a+x.Pagu,0),J=r.reduce((a,x)=>a+x.Jumlah,0),tile=(l,v,c)=>`<div class="glass p-3"><div class="text-xs" style="color:var(--text-2)">${l}</div><div class="text-xl font-bold" style="color:${c||'inherit'}">${rpf(v)}</div></div>`;
 el.innerHTML=`<div class="glass p-5"><div class="flex flex-wrap justify-between items-center gap-3 mb-3"><b>DPA Perjalanan Dinas ${S.yr}</b><button class="btn2" id="dk">Kelola DPA →</button></div>
 <div class="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-4">${tile('Pagu Anggaran',P)}${tile('Jumlah (Realisasi)',J)}${tile('Sisa',P-J,P-J<0?'var(--red)':'')}</div>
 <div class="grid gap-3 md:grid-cols-2">${r.map(x=>{const pc=x.Pagu?Math.min(100,x.Jumlah/x.Pagu*100):0;return`<button class="glass p-3" data-d="${x.Bidang}" style="cursor:pointer;color:inherit;text-align:left" aria-label="Detail ${x.Bidang}"><div class="flex justify-between items-center">${badge(x.Bidang)}<small>${x.Pagu?(x.Jumlah/x.Pagu*100).toFixed(1)+'%':'-'}</small></div>
 <div class="text-xs mt-2" style="color:var(--text-2)">Pagu ${rpf(x.Pagu)} · Jumlah ${rpf(x.Jumlah)}</div><div class="mt-1" style="height:6px;border-radius:9px;background:var(--line)"><div style="height:6px;border-radius:9px;background:${x.Sisa<0?'var(--red)':'var(--accent-text)'};width:${pc}%"></div></div>
 <div class="text-sm mt-1">Sisa <b style="color:${x.Sisa<0?'var(--red)':'inherit'}">${rpf(x.Sisa)}</b></div></button>`}).join('')}</div></div>`;
 el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>dpaDetail(r.find(z=>z.Bidang===b.dataset.d),S.yr));$('#dk').onclick=()=>{S.dy=S.yr;S.view='dpa';shell()}}
// ---------- RRPD (Rincian Rencana Penggunaan Dana) - satu RRPD per Sub Kegiatan DPA, baris = Pengajuan Pencairan yang sudah disetujui ----------
// KECEPATAN: buka menu RRPD langsung menampilkan data terakhir yang tersimpan di browser (tanpa menunggu server),
// lalu diperbarui diam-diam di belakang layar; kunjungan pertama menampilkan tanda "Memuat…" seketika.
async function rrpdV(){const y=S.ry=S.ry||S.yr;S.rrpdCache=S.rrpdCache||{};const c=S.rrpdCache[y];
 if(c)rrpdRender(c,y);else $('#main').innerHTML='<h1 class="text-2xl font-bold mb-3">Rincian Rencana Penggunaan Dana (RRPD)</h1><div class="glass p-5" style="color:var(--text-2)"><span class="spin"></span> Memuat RRPD…</div>';
 const r=c?await api('rrpdList',S.t,y).catch(()=>null):await run(()=>api('rrpdList',S.t,y));if(!r)return;
 S.rrpdCache[y]=r;const ae=document.activeElement;
 if(S.view==='rrpd'&&S.ry===y&&!document.querySelector('.modal')&&!(ae&&/^rj\d/.test(ae.id||''))&&JSON.stringify(r)!==JSON.stringify(c))rrpdRender(r,y)}
function rrpdRender(r,y){
 const gen=S.role==='Admin'||sup(); // Admin & Super Admin: Generate (1x) + lihat; Kasubag Keuangan, KABID, KASI, SEKRETARIS: hanya lihat (ikon mata)
 const key=(b,s)=>b+'|'+y+'|'+s.nama,pick=v=>{const [bi,si]=v.split('|').map(Number);return{b:r[bi],s:r[bi].subs[si]}};
 const mata=(bi,si,s)=>`<button class="btn2" data-rv="${bi}|${si}" aria-label="Lihat RRPD" title="${s.gen?'Lihat RRPD':'Belum di-generate'}" ${s.gen?'':'disabled'}><span class="ms">visibility</span></button>`;
 const aksi=(bi,si,s)=>!s.rows.length&&!s.gen?'<small style="color:var(--text-2)">Belum Ada Perjalanan untuk Sub Kegiatan ini</small>' // belum ada perjalanan (pengajuan disetujui): tanpa tombol Generate & ikon mata, untuk semua peran
  :s.gen?`<div class="flex gap-2 items-center flex-wrap">${mata(bi,si,s)}${sup()?`<button class="btn2" data-ru="${bi}|${si}" title="Generate Ulang (khusus Super Admin)"><span class="ms">refresh</span> Generate Ulang</button>`:''}<span><span class="bd" style="background:rgba(16,185,129,.15);color:var(--accent-text)">Sudah di-generate</span><br><small style="color:var(--text-2)">${esc(s.gen.tgl)} · ${esc(s.gen.oleh)}</small></span></div>`
  :`<div class="flex gap-2 items-center flex-wrap">${gen?`<button class="btn" data-rg="${bi}|${si}"><span class="ms">auto_awesome</span> Generate</button>`:''}${mata(bi,si,s)}${gen?'':'<small style="color:var(--text-2)">Belum di-generate Admin</small>'}</div>`;
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-1">Rincian Rencana Penggunaan Dana (RRPD)</h1>
 <p class="text-xs mb-3" style="color:var(--text-2)">Satu RRPD per Sub Kegiatan DPA. Baris pengeluaran diambil dari Pengajuan Pencairan yang sudah <b>disetujui Kasubag Keuangan</b>. ${gen?'Generate hanya bisa 1 kali per Sub Kegiatan; setelah itu lihat lewat ikon mata.':'Klik ikon mata untuk melihat RRPD yang sudah di-generate Admin bidang.'}</p>
 <div class="glass p-4 mb-4 flex flex-wrap items-end gap-3"><div><label for="ry">Tahun Anggaran</label><select id="ry" class="inp" style="width:auto">${yrs().map(t=>`<option ${t==y?'selected':''}>${t}</option>`).join('')}</select></div></div>
 <div class="grid gap-4" style="grid-template-columns:minmax(0,1fr)">${r.map((b,bi)=>`<div class="glass p-4" style="min-width:0"><div class="flex flex-wrap justify-between items-end gap-3 mb-3">${badge(b.bidang)}${gen?`<div class="flex flex-wrap items-end gap-2" style="flex:1;min-width:240px;justify-content:flex-end"><div style="flex:1;min-width:min(200px,100%);max-width:460px"><label for="rj${bi}">Jabatan penandatangan kanan (Kepala Bidang)</label><input id="rj${bi}" class="inp" value="${esc(b.jabatan)}"></div><button class="btn2" data-rj="${bi}">Simpan Jabatan</button></div>`:''}</div>
 <div class="text-xs mb-1 lg:hidden" style="color:var(--text-2)"><span class="ms" style="font-size:16px">swipe</span> Geser tabel ke samping untuk melihat Pengeluaran, Sisa Kas &amp; Aksi</div>
 <div class="overflow-x-auto" style="-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x pan-y"><table class="w-full" style="min-width:820px"><thead><tr><th>Sub Kegiatan</th><th>Kode Rekening</th><th>Pagu DPA</th><th>Pengeluaran (disetujui)</th><th>Sisa Kas</th><th>${gen?'Aksi':'Lihat'}</th></tr></thead><tbody>
 ${b.subs.map((s,si)=>`<tr><td class="t"><b>${esc(s.nama)}</b><br><small>${esc(s.jenis)} · ${s.rows.length} pengajuan disetujui</small></td><td class="t">${esc(s.kode||'-')}</td><td class="t">${rpf(s.pagu)}</td><td class="t">${rpf(s.jumlah)}</td><td class="t" style="color:${s.sisa<0?'var(--red)':'inherit'}"><b>${rpf(s.sisa)}</b></td><td class="t">${aksi(bi,si,s)}</td></tr>`).join('')||`<tr><td class="t" colspan="6">Belum ada Sub Kegiatan di DPA bidang ini untuk tahun ${y}. Isi dulu di menu DPA Perjalanan Dinas.</td></tr>`}
 </tbody></table></div></div>`).join('')}</div>`;
 $('#ry').onchange=e=>{S.ry=e.target.value;rrpdV()};
 document.querySelectorAll('[data-rj]').forEach(bt=>bt.onclick=async()=>{const b=r[+bt.dataset.rj],ip=$('#rj'+bt.dataset.rj),done=busy(bt,'Menyimpan…');try{const j=await run(()=>api('rrpdSaveJabatan',S.t,b.bidang,ip.value),'Jabatan penandatangan disimpan');if(j!==undefined){b.jabatan=j;ip.value=j}}finally{done()}});
 document.querySelectorAll('[data-rv]').forEach(bt=>bt.onclick=async()=>{const {b,s}=pick(bt.dataset.rv),k=key(b.bidang,s),done=busy(bt,'');try{const v=await run(()=>api('rrpdPreview',S.t,k));if(v)prev(v,k,'rrpdPdf')}finally{done()}});
 document.querySelectorAll('[data-rg]').forEach(bt=>bt.onclick=async()=>{const {b,s}=pick(bt.dataset.rg),k=key(b.bidang,s);
  if(!await confirmDlg('Generate RRPD '+b.bidang+' tahun '+y+'\nSub Kegiatan: '+s.nama+'\n\nGenerate hanya bisa dilakukan 1 kali. Setelah itu RRPD dilihat lewat ikon mata.','Generate RRPD'))return;
  const done=busy(bt,'Menyusun RRPD…');try{const g=await run(()=>api('rrpdGenerate',S.t,k),'RRPD berhasil di-generate');if(!g)return;s.gen=g;rrpdRender(r,y);const v=await run(()=>api('rrpdPreview',S.t,k));if(v)prev(v,k,'rrpdPdf');rrpdV()}finally{done()}});
 document.querySelectorAll('[data-ru]').forEach(bt=>bt.onclick=async()=>{const {b,s}=pick(bt.dataset.ru),k=key(b.bidang,s); // Generate Ulang - khusus Super Admin
  if(!await confirmDlg('Generate ulang RRPD '+b.bidang+' tahun '+y+'\nSub Kegiatan: '+s.nama+'\n\nRRPD akan disusun ulang dengan fungsi terbaru dan catatan generate sebelumnya ('+s.gen.tgl+' oleh '+s.gen.oleh+') diganti.','Generate Ulang RRPD'))return;
  const done=busy(bt,'Menyusun ulang…');try{const g=await run(()=>api('rrpdGenerate',S.t,k,true),'RRPD berhasil di-generate ulang');if(!g)return;s.gen=g;rrpdRender(r,y);const v=await run(()=>api('rrpdPreview',S.t,k));if(v)prev(v,k,'rrpdPdf');rrpdV()}finally{done()}})}
async function bkuV(){let bl=S.bkuCache;if(!bl){bl=await run(()=>api('bkuList',S.t));if(!bl)return;S.bkuCache=bl}
 S.bb=S.bb&&bl.includes(S.bb)?S.bb:bl[0];S.by=S.by||S.yr;
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Buku Kas Umum (BKU) Perjalanan Dinas</h1>
 <p class="text-xs mb-3" style="color:var(--text-2)">Disusun otomatis dari Pagu DPA dan Kwitansi yang sudah terbit, jadi selalu tersinkron dengan Surat Tugas dan Kwitansi.</p>
 <div class="glass p-4 mb-4 flex flex-wrap items-end gap-3">${bl.length>1?`<div><label for="bb">Bidang</label><select id="bb" class="inp" style="width:auto">${bl.map(b=>`<option ${b==S.bb?'selected':''}>${b}</option>`).join('')}</select></div>`:''}
 <div><label for="by">Tahun</label><select id="by" class="inp" style="width:auto">${yrs().map(y=>`<option ${y==S.by?'selected':''}>${y}</option>`).join('')}</select></div>
 <button class="btn" id="bg"><span class="ms">auto_awesome</span> Generate BKU</button><button class="btn2" id="xx"><span class="ms">download</span> Export Excel</button></div>`;
 if($('#bb'))$('#bb').onchange=e=>{S.bb=e.target.value;bkuV()};$('#by').onchange=e=>{S.by=e.target.value;bkuV()};
 $('#bg').onclick=async()=>{const done=busy($('#bg'),'Menyusun BKU…');try{const key=S.bb+'|'+S.by;const v=await run(()=>api('bkuPreview',S.t,key));if(v)prev(v,key,'bkuPdf')}finally{done()}};
 $('#xx').onclick=async()=>{const done=busy($('#xx'),'Membuat Excel…');try{const p=await run(()=>api('exportBkuXlsx',S.t,S.bb+'|'+S.by),'Excel siap diunduh');if(p)dlXlsx(p)}finally{done()}}}
function dpaSubRow(s){const jn=s.jenis||'Luar Kota',ro=dpaRO(),dis=ro?'disabled':'';return `<tr data-sub="${esc(s.id||'')}"><td class="t" data-label="Sub Kegiatan"><input class="inp" data-f="nama" value="${esc(s.nama||'')}" placeholder="mis. Pembinaan Ketentraman Masyarakat" style="min-width:220px" aria-label="Nama Sub Kegiatan" ${dis}></td><td class="t" data-label="Jenis Perjalanan"><select class="inp" data-f="jenis" style="min-width:130px" aria-label="Jenis Perjalanan" ${dis}><option ${jn=='Dalam Kota'?'selected':''}>Dalam Kota</option><option ${jn=='Luar Kota'?'selected':''}>Luar Kota</option><option ${jn=='Luar Daerah'?'selected':''}>Luar Daerah</option></select></td><td class="t" data-label="Kode Rekening"><input class="inp" data-f="kode" value="${esc(s.kode||'')}" placeholder="mis. 1 05 02 2 01 04 5 1 02 04 01 0001" style="min-width:230px" aria-label="Kode Rekening" ${dis}></td><td class="t" data-label="Pagu"><input type="number" min="0" class="inp" data-f="pagu" value="${s.pagu||0}" style="min-width:140px" aria-label="Pagu" ${dis}></td><td class="t">${ro?'':'<button class="btn-d" data-del aria-label="Hapus baris"><span class="ms">delete</span></button>'}</td></tr>`}
function dpaCard(x){const pc=x.Pagu?Math.min(100,x.Jumlah/x.Pagu*100):0;
 return `<div class="glass p-4" data-card="${esc(x.Bidang)}">
 <div class="flex flex-wrap justify-between items-start gap-3 mb-2"><button class="btn2" data-d="${esc(x.Bidang)}" style="padding:2px 6px;border-radius:9999px" aria-label="Detail ${esc(x.Bidang)}">${badge(x.Bidang)}</button>
 <div class="text-right text-sm"><div>Pagu: <b id="tp-${esc(x.Bidang)}">${rpf(x.Pagu)}</b></div><div>Jumlah: <b>${rpf(x.Jumlah)}</b></div><div>Sisa: <b id="ts-${esc(x.Bidang)}" style="color:${x.Sisa<0?'var(--red)':'inherit'}">${rpf(x.Sisa)}</b></div></div></div>
 <small style="color:var(--text-2)">${x.ST} surat tugas · klik lencana bidang untuk detail</small>
 <div class="mt-2 mb-3" style="height:6px;border-radius:9px;background:var(--line)"><div id="bar-${esc(x.Bidang)}" style="height:6px;border-radius:9px;background:${x.Sisa<0?'var(--red)':'var(--accent-text)'};width:${pc}%"></div></div>
 <div class="overflow-x-auto"><table class="w-full dpaSubTbl" style="min-width:680px"><thead><tr><th>Sub Kegiatan</th><th>Jenis Perjalanan</th><th>Kode Rekening</th><th>Pagu</th><th></th></tr></thead><tbody id="subs-${esc(x.Bidang)}">${x.Subs.map(dpaSubRow).join('')||''}</tbody></table></div>
 ${dpaRO()?'':`<div class="flex gap-2 justify-between items-center mt-3"><button class="btn2" data-add="${esc(x.Bidang)}"><span class="ms">add</span> Tambah Sub Kegiatan</button><button class="btn" data-save="${esc(x.Bidang)}">Simpan</button></div>`}</div>`}
function dpaRecalc(bidang,jumlah){const rows=[...document.querySelectorAll(`#subs-${CSS.escape(bidang)} tr`)];const p=rows.reduce((a,tr)=>a+(+tr.querySelector('[data-f=pagu]').value||0),0),s=p-jumlah;
 $('#tp-'+bidang).textContent=rpf(p);$('#ts-'+bidang).textContent=rpf(s);$('#ts-'+bidang).style.color=s<0?'var(--red)':'';const bar=$('#bar-'+bidang);if(bar){bar.style.width=(p?Math.min(100,jumlah/p*100):0)+'%';bar.style.background=s<0?'var(--red)':'var(--accent-text)'}}
function wireDpaCard(x,y){const bidang=x.Bidang,card=document.querySelector(`[data-card="${CSS.escape(bidang)}"]`);if(!card)return;
 if(dpaRO()){card.querySelector(`[data-d="${bidang}"]`).onclick=()=>dpaDetail(x,y);return} // Kasubag Keuangan: hanya lihat - tidak ada baris/tombol untuk diubah
 const wireRow=tr=>{tr.querySelectorAll('input').forEach(i=>i.oninput=()=>dpaRecalc(bidang,x.Jumlah));tr.querySelector('[data-del]').onclick=()=>{tr.remove();dpaRecalc(bidang,x.Jumlah);toast('Baris Sub Kegiatan dihapus. Klik Simpan untuk menerapkan perubahan.')}};
 card.querySelectorAll(`#subs-${CSS.escape(bidang)} tr`).forEach(wireRow);
 card.querySelector(`[data-add="${bidang}"]`).onclick=()=>{const tb=$('#subs-'+bidang),d=document.createElement('tbody');d.innerHTML=dpaSubRow({});const tr=d.firstElementChild;tb.appendChild(tr);wireRow(tr);toast('Baris Sub Kegiatan baru ditambahkan. Klik Simpan untuk menerapkan perubahan.')};
 card.querySelector(`[data-d="${bidang}"]`).onclick=()=>dpaDetail(x,y);
 card.querySelector(`[data-save="${bidang}"]`).onclick=async(e)=>{const done=busy(e.currentTarget,'Menyimpan…');try{
  const subs=[...card.querySelectorAll(`#subs-${CSS.escape(bidang)} tr`)].map(tr=>({id:tr.dataset.sub||'',nama:tr.querySelector('[data-f=nama]').value,jenis:tr.querySelector('[data-f=jenis]').value,kode:tr.querySelector('[data-f=kode]').value,pagu:tr.querySelector('[data-f=pagu]').value}));
  const r2=await run(()=>api('saveDpaSub',S.t,y,bidang,subs),'Alokasi DPA bidang '+bidang+' tersimpan');if(r2){S.dpaCache[y]=null;dpaV()}}finally{done()}}}
async function dpaV(){const y=S.dy=S.dy||S.yr;let r=S.dpaCache[y];if(!r){r=await run(()=>api('getDpa',S.t,y));if(!r)return;S.dpaCache[y]=r}
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3 flex items-center gap-2 flex-wrap">DPA Perjalanan Dinas<button class="btn2" id="xx" style="font-size:.8rem"><span class="ms">download</span> Export Excel</button></h1><div class="glass p-4 mb-4 flex flex-wrap items-end gap-3"><div><label for="dy">Tahun Anggaran</label><select id="dy" class="inp" style="width:auto">${yrs().map(t=>`<option ${t==y?'selected':''}>${t}</option>`).join('')}</select></div>
 <p class="text-xs" style="color:var(--text-2);flex:1;min-width:220px">Satu Bidang dapat memiliki beberapa Sub Kegiatan, masing-masing dengan Pagu dan Kode Rekening sendiri. Jumlah (Realisasi) dan Sisa tetap dihitung total per Bidang dari Kwitansi yang sudah diatur (menu Cetak Kwitansi). Data tersimpan di sheet <b>DPA</b>.</p></div>
 <div class="grid gap-4">${r.map(dpaCard).join('')}</div>`;
 r.forEach(x=>wireDpaCard(x,y));
 $('#dy').onchange=e=>{S.dy=e.target.value;dpaV()};
 $('#xx').onclick=async()=>{const done=busy($('#xx'),'Membuat Excel…');try{const p=await run(()=>api('exportDpaXlsx',S.t,y),'Excel siap diunduh');if(p)dlXlsx(p)}finally{done()}}}
function ajuanBadge(s){const st={Diajukan:'background:rgba(245,158,11,.15);color:var(--amber)',Disetujui:'background:rgba(16,185,129,.15);color:var(--accent-text)',Ditolak:'background:rgba(220,38,38,.1);color:var(--red)'}[s]||'';return `<span class="bd" style="${st}">${esc(s)}</span>`}
function pengajuanRincianDlg(judul,rincian){const m=document.createElement('div');m.className='modal';
 const tot=rincian.reduce((a,o)=>a+o.total,0);
 m.innerHTML=`<div class="glass2 p-5 w-full" style="max-width:900px;max-height:92vh;overflow:auto"><div class="flex justify-between items-start gap-3"><h2 class="text-lg font-bold">${esc(judul)}</h2><button class="btn2" id="rdx">Tutup</button></div>
 <div class="overflow-x-auto mt-3"><table class="w-full" style="min-width:860px"><thead><tr><th>Tgl ST</th><th>No. Surat Tugas</th><th>Tujuan</th><th>Maksud Perjalanan Dinas</th><th>Jml Petugas</th><th>Pegawai (hari × tarif)</th><th>Total</th></tr></thead><tbody>
 ${rincian.map(o=>`<tr><td class="t"><b>${idn(o.tglST)}</b></td><td class="t">${esc(o.noST)}</td><td class="t">${esc(o.tujuan)}</td><td class="t">${esc(o.maksud||'-')}</td><td class="t">${o.jumlahPetugas??o.pegawai.length} orang</td><td class="t">${o.pegawai.map(p=>`${esc(p.nama)} <small style="color:var(--text-2)">${p.lama} hr × ${rpf(o.tarif)} = ${rpf(p.total)}</small>`).join('<br>')}</td><td class="t"><b>${rpf(o.total)}</b></td></tr>`).join('')||'<tr><td class="t" colspan="7">Tidak ada data.</td></tr>'}
 ${rincian.length?`<tr><td class="t" colspan="6"><b>TOTAL</b></td><td class="t"><b>${rpf(tot)}</b></td></tr>`:''}</tbody></table></div></div>`;
 document.body.appendChild(m);$('#rdx').onclick=()=>m.remove()}
function pengajuanTolakDlg(id){const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-lg"><h2 class="text-lg font-bold">Tolak Pengajuan Pencairan</h2><label for="tc1">Catatan / Alasan Penolakan</label><textarea id="tc1" class="inp" rows="3" placeholder="Wajib diisi…"></textarea><div class="flex gap-2 justify-end mt-4"><button class="btn2" id="tcx">Batal</button><button class="btn-d" id="tck">Tolak Pengajuan</button></div></div>`;
 document.body.appendChild(m);$('#tcx').onclick=()=>m.remove();
 $('#tck').onclick=async()=>{const c=$('#tc1').value.trim();if(!c)return warnToast('Catatan alasan penolakan wajib diisi.');const done=busy($('#tck'),'Memproses…');try{const ok=await run(()=>api('pengajuanProses',S.t,id,false,c),'Pengajuan ditolak');if(ok){m.remove();S.ajuanList=null;S.kasSnap=null;pencairanV()}}finally{done()}}}
async function pencairanV(){S.role==='Admin'?await pencairanAdminV():await pencairanKasubagV()}
// ---------- Ajukan Pencairan lewat WhatsApp ----------
// Super Admin mengatur (Dashboard): aktif/nonaktif, nomor WhatsApp Kasubag Keuangan, template pesan.
// Admin Bidang: tombol WhatsApp di Riwayat Pengajuan (status Diajukan) + tawaran kirim otomatis setelah Ajukan Pencairan.
async function waBox(){const el=$('#waBox');if(!el)return;let c;try{c=await apiQ('waInfo',S.t)}catch(e){return}if(!el.isConnected)return;S.waCfg=c;
 el.innerHTML=`<div class="glass p-4"><div class="flex flex-wrap justify-between items-center gap-2"><b>Ajukan Pencairan lewat WhatsApp</b><label for="waOn" style="display:flex;align-items:center;gap:8px;margin:0;font-size:13px;color:var(--text)"><input type="checkbox" id="waOn" ${c.aktif?'checked':''}> Aktifkan</label></div>
 <p class="text-xs" style="color:var(--text-2)">Bila aktif, Admin Bidang dapat mengirim rincian Pengajuan Pencairan langsung ke WhatsApp Kasubag Keuangan dari menu Pengajuan Pencairan.</p>
 <label for="waNo">Nomor WhatsApp Kasubag Keuangan</label><input id="waNo" class="inp" inputmode="tel" placeholder="mis. 081234567890" value="${esc(c.nomor)}">
 <label for="waTpl">Template Pesan</label><textarea id="waTpl" class="inp" rows="12">${esc(c.template)}</textarea>
 <p class="text-xs mt-1" style="color:var(--text-2)">Kode isian otomatis: <b>{bidang}</b> <b>{tanggal}</b> <b>{jumlah}</b> <b>{jumlah_st}</b> <b>{rincian}</b> <b>{admin}</b>. Kosongkan template lalu Simpan untuk kembali ke template bawaan.</p>
 <div class="flex justify-end mt-2"><button class="btn2" id="waSave"><span class="ms">save</span> Simpan Pengaturan WhatsApp</button></div></div>`;
 $('#waSave').onclick=async()=>{const done=busy($('#waSave'),'Menyimpan…');try{const r=await run(()=>api('saveWa',S.t,{aktif:$('#waOn').checked,nomor:$('#waNo').value,template:$('#waTpl').value}),'Pengaturan WhatsApp disimpan');if(r){S.waCfg=r;$('#waNo').value=r.nomor;$('#waTpl').value=r.template}}finally{done()}}}
// ---------- Arsip Data per Tahun (Super Admin) ----------
// Data tahun yang sudah lewat dipindahkan ke spreadsheet arsip, supaya spreadsheet utama ringan & aplikasi tetap cepat.
async function arsipBox(){const el=$('#arsipBox');if(!el)return;let r;try{r=await apiQ('arsipInfo',S.t)}catch(e){return}if(!el.isConnected)return;
 const ry=$('#regYr');if(ry)r.arsip.forEach(a=>{if(![...ry.options].some(o=>o.value===a.tahun)){const o=document.createElement('option');o.textContent=a.tahun+' (arsip)';o.value=a.tahun;ry.appendChild(o)}}); // Register bisa diunduh juga untuk tahun yang sudah diarsipkan
 const ar=r.arsip.map(a=>`<div class="glass2 p-3 flex flex-wrap justify-between items-center gap-2"><span><b>Tahun ${esc(a.tahun)}</b><br><small style="color:var(--text-2)">Diarsipkan ${a.tgl?idnF(a.tgl):''}</small></span><a class="btn2" href="${esc(a.url)}" target="_blank" rel="noopener" style="text-decoration:none"><span class="ms">open_in_new</span> Buka Arsip</a></div>`).join('');
 el.innerHTML=`<div class="glass p-4"><b>Arsip Data per Tahun</b>
 <p class="text-xs" style="color:var(--text-2)">Pindahkan data tahun yang sudah lewat (Surat Tugas &amp; SPPD, Kwitansi, Laporan, Pengajuan Pencairan, RRPD) ke spreadsheet arsip tersendiri, supaya aplikasi tetap cepat. Tahun berjalan (${esc(r.tahunIni)}) tidak dapat diarsipkan. Saat login, aplikasi hanya memuat data tahun ${esc(r.tahunMin)} s.d. ${esc(r.tahunIni)}.</p>
 <div class="overflow-x-auto mt-2"><table class="w-full"><thead><tr><th>Tahun</th><th>Surat Tugas</th><th>Baris SPPD</th><th>Aksi</th></tr></thead><tbody>
 ${r.data.map(d=>`<tr><td class="t"><b>${esc(d.tahun)}</b></td><td class="t">${d.st}</td><td class="t">${d.baris}</td><td class="t">${d.bisa?`<button class="btn2" data-ar="${esc(d.tahun)}"><span class="ms">inventory_2</span> Arsipkan ${esc(d.tahun)}</button>`:'<small style="color:var(--text-2)">Tahun berjalan</small>'}</td></tr>`).join('')||'<tr><td class="t" colspan="4">Belum ada data.</td></tr>'}
 </tbody></table></div>
 ${ar?`<div class="mt-3"><b class="text-sm">Spreadsheet Arsip</b><div class="grid gap-2 mt-2 sm:grid-cols-2">${ar}</div></div>`:''}</div>`;
 el.querySelectorAll('[data-ar]').forEach(b=>b.onclick=()=>arsipDlg(b.dataset.ar))}
function arsipDlg(y){const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-md"><h2 class="text-lg font-bold">Arsipkan Data Tahun ${esc(y)}</h2>
 <p class="text-sm mt-2">Seluruh Surat Tugas &amp; SPPD tahun <b>${esc(y)}</b> beserta Kwitansi, Laporan, Pengajuan Pencairan, dan status RRPD-nya akan <b>dipindahkan</b> ke spreadsheet <b>"Arsip REGISTER SPPD ${esc(y)}"</b>. Data tidak hilang dan tetap bisa dibuka dari Dashboard ini, tapi tidak tampil lagi di menu aplikasi. Register Excel tahun ${esc(y)} tetap bisa di-download.</p>
 <label for="ap1">Masukkan sandi Anda untuk melanjutkan</label><input id="ap1" type="password" class="inp" autocomplete="current-password"><small id="ap2" style="color:var(--red)"></small>
 <div class="flex gap-2 justify-end mt-4"><button class="btn2" id="apx">Batal</button><button class="btn" id="apk"><span class="ms">inventory_2</span> Arsipkan Sekarang</button></div></div>`;
 document.body.appendChild(m);$('#ap1').focus();$('#apx').onclick=()=>m.remove();
 $('#apk').onclick=async()=>{const pass=$('#ap1').value;if(!pass){$('#ap2').textContent='Sandi wajib diisi.';return}
  const done=busy($('#apk'),'Memindahkan data…');try{const r=await run(()=>api('arsipkanTahun',S.t,y,pass));
   if(r){m.remove();S.rrpdCache={};S.ajuSnap=null;S.kasSnap=null;toast('Data tahun '+y+' berhasil diarsipkan ('+r.hasil.DATA_SPPD+' baris SPPD).');await refresh(true)}else if(document.body.contains(m))$('#ap1').value=''}finally{done()}}}
const waSiap=()=>S.waCfg&&S.waCfg.aktif&&S.waCfg.nomor;
function waPesan(p,rin){const rincian=rin.map((o,i)=>`${i+1}. No. ST: ${o.noST}\n   Tanggal: ${idnF(o.tglST)} · Tujuan: ${o.tujuan}\n   Maksud: ${o.maksud||'-'}\n   Petugas: ${o.jumlahPetugas??o.pegawai.length} orang · ${rpf(o.total)}`).join('\n\n');
 const isi={bidang:p.bidang||S.bidang,tanggal:idnF(p.tglAjukan),jumlah:rpf(p.jumlah),jumlah_st:String(p.noSTList.length),rincian,admin:S.nama,status:p.status};
 return S.waCfg.template.replace(/\{(\w+)\}/g,(m,k)=>k in isi?isi[k]:m)}
async function waKirimDlg(id){if(!waSiap())return toast('Fitur WhatsApp belum diaktifkan oleh Super Admin.',1);
 const p=(S.ajuanList||[]).find(x=>x.id===id);if(!p)return;const rin=await run(()=>api('pengajuanRincian',S.t,id));if(!rin)return;
 const link=t=>'https://wa.me/'+S.waCfg.nomor+'?text='+encodeURIComponent(t),m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-2xl" style="max-height:92vh;overflow:auto"><h2 class="text-lg font-bold">Kirim Pengajuan lewat WhatsApp</h2><p class="text-xs mt-1" style="color:var(--text-2)">Ke Kasubag Keuangan (+${esc(S.waCfg.nomor)}). Periksa pesan di bawah, boleh diubah sebelum dikirim.</p>
 <textarea id="waMsg" class="inp mt-3" rows="14" aria-label="Isi pesan WhatsApp">${esc(waPesan(p,rin))}</textarea>
 <div class="flex gap-2 justify-end mt-4 flex-wrap"><button class="btn2" id="waX">Tutup</button><a class="btn" id="waGo" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;background:#25D366"><span class="ms">chat</span> Buka WhatsApp &amp; Kirim</a></div></div>`;
 document.body.appendChild(m);const go=$('#waGo'),ta=$('#waMsg');go.href=link(ta.value);ta.oninput=()=>go.href=link(ta.value);
 $('#waX').onclick=()=>m.remove();go.onclick=()=>setTimeout(()=>m.remove(),300)}
// ---------- Percepatan halaman Pengajuan Pencairan & RRPD ----------
// Tampil seketika dari data terakhir (snapshot per akun), lalu diperbarui diam-diam di belakang layar; semua permintaan dikirim bersamaan.
const ajuK=()=>S.role+'|'+S.bidang+'|'+S.nama;
const ajuLoad=()=>{$('#main').innerHTML='<h1 class="text-2xl font-bold mb-3">Pengajuan Pencairan Perjalanan Dinas</h1><div class="glass p-5" style="color:var(--text-2)"><span class="spin"></span> Memuat Pengajuan Pencairan…</div>'};
const ajuBebas=()=>S.view==='pencairan'&&!document.querySelector('.modal')&&!document.querySelector('.ajuanChk:checked'); // jangan render ulang saat admin sedang memilih/membuka dialog
const ajuAmbilA=()=>Promise.all([apiQ('pencairanEligible',S.t),apiQ('pengajuanList',S.t),apiQ('waInfo',S.t).catch(()=>null)]); // 3 bacaan -> 1 eksekusi server
const ajuAmbilK=y=>Promise.all([apiQ('pengajuanList',S.t),apiQ('dpaGet',S.t,y).catch(()=>[])]); // 2 bacaan -> 1 eksekusi server
async function pencairanAdminV(){
 const k=ajuK(),c=S.ajuSnap&&S.ajuSnap.k===k?S.ajuSnap:null,wa0=JSON.stringify(S.waCfg||null);
 if(c)pencairanAdminR(c.elig,c.riw);else ajuLoad();
 const p=ajuAmbilA(),r=c?await p.catch(()=>null):await run(()=>p);if(!r||ajuK()!==k)return;
 const [elig,riw,wa]=r;S.ajuanElig=elig;S.ajuanList=riw;if(wa)S.waCfg=wa;S.ajuSnap={k,elig,riw};
 if(!c){if(S.view==='pencairan')pencairanAdminR(elig,riw);return}
 if(ajuBebas()&&(JSON.stringify([elig,riw])!==JSON.stringify([c.elig,c.riw])||JSON.stringify(S.waCfg||null)!==wa0))pencairanAdminR(elig,riw)}
function pencairanAdminR(elig,riw){
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Pengajuan Pencairan Perjalanan Dinas</h1>
 <div class="glass p-4 mb-4"><b>Ajukan Pencairan Baru</b><p class="text-xs mb-3" style="color:var(--text-2)">Pilih Surat Tugas yang Kwitansinya sudah diatur, untuk diajukan pencairannya ke Kasubag Keuangan.</p>
 <div class="overflow-x-auto"><table class="w-full" style="min-width:920px"><thead><tr><th><input type="checkbox" id="selAll" aria-label="Pilih semua"></th><th>Tgl ST</th><th>No. Surat Tugas</th><th>Tujuan</th><th>Maksud Perjalanan Dinas</th><th>Jml Petugas</th><th>Jenis</th><th>Jumlah</th></tr></thead><tbody>
 ${elig.map(x=>`<tr><td class="t"><input type="checkbox" class="ajuanChk" value="${esc(x.noST)}" data-t="${x.total}"></td><td class="t"><b>${idn(x.tglST)}</b></td><td class="t">${esc(x.noST)}</td><td class="t">${esc(x.tujuan)}</td><td class="t">${esc(x.maksud||'-')}</td><td class="t">${x.jumlahPetugas??x.pegawai.length} orang</td><td class="t">${esc(x.jenis)}</td><td class="t">${rpf(x.total)}</td></tr>`).join('')||'<tr><td class="t" colspan="8">Tidak ada Surat Tugas yang siap diajukan (Kwitansi belum diatur, atau sudah termasuk pengajuan lain).</td></tr>'}
 </tbody></table></div>
 <div class="flex flex-wrap justify-between items-center gap-3 mt-3"><span>Total dipilih: <b id="ajuanTot">Rp 0</b></span><button class="btn" id="ajuanBtn" disabled><span class="ms">send</span> Ajukan Pencairan</button></div></div>
 <div class="glass p-2 overflow-x-auto"><div class="p-3"><b>Riwayat Pengajuan Bidang Saya</b></div><table class="w-full" style="min-width:760px"><thead><tr><th>Tgl Ajukan</th><th>Surat Tugas</th><th>Jumlah</th><th>Status</th><th>Tanggal &amp; Jam Approve</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>
 ${riw.map(x=>`<tr><td class="t"><b>${idn(x.tglAjukan)}</b></td><td class="t">${x.noSTList.length} ST</td><td class="t">${rpf(x.jumlah)}</td><td class="t">${ajuanBadge(x.status)}${x.status!=='Diajukan'&&x.diprosesOleh?`<br><small style="color:var(--text-2)">${x.status==='Ditolak'?'Ditolak':'Disetujui'} oleh ${esc(x.diprosesOleh)}</small>`:''}</td><td class="t">${x.tglProses?`<b>${idn(x.tglProses)}</b>${x.jamProses?`<br><small>Jam ${esc(x.jamProses)} Wita</small>`:''}`:'<small style="color:var(--text-2)">-</small>'}</td><td class="t">${esc(x.catatan||'-')}</td><td class="t"><div class="flex gap-1 flex-wrap"><button class="btn2" data-r="${esc(x.id)}">Lihat Rincian</button>${waSiap()&&x.status==='Diajukan'?`<button class="btn2" data-wa="${esc(x.id)}" title="Kirim ke WhatsApp Kasubag Keuangan" style="color:#128C7E"><span class="ms">chat</span> WhatsApp</button>`:''}</div></td></tr>`).join('')||'<tr><td class="t" colspan="7">Belum ada pengajuan.</td></tr>'}
 </tbody></table></div>`;
 const recalc=()=>{const ch=[...document.querySelectorAll('.ajuanChk:checked')],tot=ch.reduce((a,c)=>a+(+c.dataset.t||0),0);$('#ajuanTot').textContent=rpf(tot);$('#ajuanBtn').disabled=!ch.length};
 document.querySelectorAll('.ajuanChk').forEach(c=>c.onchange=recalc);
 if($('#selAll'))$('#selAll').onchange=e=>{document.querySelectorAll('.ajuanChk').forEach(c=>c.checked=e.target.checked);recalc()};
 $('#ajuanBtn').onclick=async()=>{const keys=[...document.querySelectorAll('.ajuanChk:checked')].map(c=>c.value);if(!keys.length)return;
  if(!await confirmDlg('Ajukan pencairan untuk '+keys.length+' Surat Tugas senilai '+$('#ajuanTot').textContent+' ke Kasubag Keuangan?','Konfirmasi Pengajuan'))return;
  const done=busy($('#ajuanBtn'),'Mengajukan…');try{const r=await run(()=>api('pengajuanAjukan',S.t,keys),'Pengajuan Pencairan terkirim');if(r){S.ajuanElig=null;S.ajuanList=null;S.ajuSnap=null;await pencairanV();if(waSiap())waKirimDlg(r.id)}}finally{done()}};
 document.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{const r=await run(()=>api('pengajuanRincian',S.t,b.dataset.r));if(r)pengajuanRincianDlg('Rincian Pengajuan Pencairan',r)});
 document.querySelectorAll('[data-wa]').forEach(b=>b.onclick=async()=>{const done=busy(b,'');try{await waKirimDlg(b.dataset.wa)}finally{done()}})}
async function pencairanKasubagV(){
 const y=S.yr,k=ajuK()+'|'+y,c=S.kasSnap&&S.kasSnap.k===k?S.kasSnap:null;
 if(c)pencairanKasubagR(c.riw,c.dpa);else ajuLoad();
 const p=ajuAmbilK(y),r=c?await p.catch(()=>null):await run(()=>p);if(!r||ajuK()+'|'+y!==k)return;
 const [riw,dpa]=r;S.ajuanList=riw;if(dpa&&dpa.length)S.dpaCache[y]=dpa;S.kasSnap={k,riw,dpa:dpa||[]};
 if(!c){if(S.view==='pencairan')pencairanKasubagR(riw,dpa||[]);return}
 if(ajuBebas()&&JSON.stringify([riw,dpa])!==JSON.stringify([c.riw,c.dpa]))pencairanKasubagR(riw,dpa||[])}
async function prefetchKeu(){ // muat data Pengajuan Pencairan & RRPD di belakang layar sesaat setelah masuk, supaya saat menu dibuka langsung tampil
 const ms=menu().map(m=>m[0]),k=ajuK(),y=S.yr;
 try{
  if(ms.includes('pencairan')&&S.view!=='pencairan'){
   if(S.role==='Admin'){if(!(S.ajuSnap&&S.ajuSnap.k===k)){const [elig,riw,wa]=await ajuAmbilA();if(ajuK()!==k)return;S.ajuanElig=elig;S.ajuanList=riw;if(wa)S.waCfg=wa;S.ajuSnap={k,elig,riw}}}
   else if(!(S.kasSnap&&S.kasSnap.k===k+'|'+y)){const [riw,dpa]=await ajuAmbilK(y);if(ajuK()!==k)return;S.ajuanList=riw;S.kasSnap={k:k+'|'+y,riw,dpa:dpa||[]}}
  }
  if(ms.includes('rrpd')&&S.view!=='rrpd'){S.rrpdCache=S.rrpdCache||{};if(!S.rrpdCache[y]){const r=await api('rrpdList',S.t,y);if(ajuK()===k)S.rrpdCache[y]=r}}
 }catch(e){}}
function pencairanKasubagR(riw,dpa){
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Pengajuan Pencairan Perjalanan Dinas</h1>
 <div class="glass p-4 mb-4"><b>Sisa Anggaran Tiap Bidang (${S.yr})</b><div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-3">
 ${dpa.map(x=>`<div class="glass2 p-3">${badge(x.Bidang)}<div class="text-xl font-bold mt-2" style="color:${x.Sisa<0?'var(--red)':'var(--accent-text)'}">${rpf(x.Sisa)}</div><div class="text-xs" style="color:var(--text-2)">dari Pagu ${rpf(x.Pagu)}</div></div>`).join('')||'<small style="color:var(--text-2)">Data DPA belum tersedia.</small>'}
 </div></div>
 <p class="text-xs mb-3" style="color:var(--text-2)">Daftar pengajuan pencairan dari semua Bidang. Setujui atau tolak (wajib disertai catatan) sebelum dana dicairkan.</p>
 <div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:900px"><thead><tr><th>Tgl Ajukan</th><th>Bidang</th><th>Surat Tugas</th><th>Jumlah</th><th>Diajukan Oleh</th><th>Status</th><th>Diproses</th><th>Aksi</th></tr></thead><tbody>
 ${riw.map(x=>`<tr><td class="t"><b>${idn(x.tglAjukan)}</b></td><td class="t">${badge(x.bidang)}</td><td class="t">${x.noSTList.length} ST</td><td class="t">${rpf(x.jumlah)}</td><td class="t">${esc(x.diajukanOleh)}</td><td class="t">${ajuanBadge(x.status)}${x.status==='Ditolak'&&x.catatan?`<br><small style="color:var(--text-2)">${esc(x.catatan)}</small>`:''}</td><td class="t">${x.tglProses?`<small>${idn(x.tglProses)}<br>${esc(x.diprosesOleh)}</small>`:'<small style="color:var(--text-2)">-</small>'}</td>
 <td class="t"><div class="flex gap-1 flex-wrap"><button class="btn2" data-r="${esc(x.id)}">Lihat Rincian</button>${x.status==='Diajukan'?`<button class="btn" data-ok="${esc(x.id)}">Setujui</button><button class="btn-d" data-no="${esc(x.id)}">Tolak</button>`:''}</div></td></tr>`).join('')||'<tr><td class="t" colspan="8">Belum ada pengajuan.</td></tr>'}
 </tbody></table></div>`;
 document.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{const r=await run(()=>api('pengajuanRincian',S.t,b.dataset.r));if(r)pengajuanRincianDlg('Rincian Pengajuan Pencairan',r)});
 document.querySelectorAll('[data-ok]').forEach(b=>b.onclick=async()=>{if(!await confirmDlg('Setujui pengajuan pencairan ini?'))return;const done=busy(b,'Memproses…');try{const ok=await run(()=>api('pengajuanProses',S.t,b.dataset.ok,true,''),'Pengajuan disetujui');if(ok){S.ajuanList=null;S.kasSnap=null;S.dpaCache={};pencairanV()}}finally{done()}});
 document.querySelectorAll('[data-no]').forEach(b=>b.onclick=()=>pengajuanTolakDlg(b.dataset.no))}
const idnF=s=>{if(!s)return'-';const[y,m,d]=s.split('-');return d+' '+BL[m-1]+' '+y};
function lapGen(rs){const x=rs[0],tg=x.Berangkat===x.Kembali?idnF(x.Berangkat):idnF(x.Berangkat)+' s.d. '+idnF(x.Kembali);
 return{kegiatan:`Melaksanakan ${x.Maksud} di ${x.Tujuan} pada tanggal ${tg} (${x.Lama} hari) dengan melibatkan ${rs.length} personel sesuai Surat Tugas.`,
 hasil:`Kegiatan perjalanan dinas ke ${x.Tujuan} terlaksana dengan baik dan lancar sesuai dengan maksud dan tujuan yang ditetapkan.`,
 kesimpulan:`Kegiatan berjalan aman dan terkendali. Disarankan kegiatan serupa dapat terus dilaksanakan secara berkelanjutan dengan koordinasi yang baik.`}}
function lapV(){const g=urutInput([...new Set(S.d.map(r=>r.NoST))]).map(k=>S.d.filter(r=>r.NoST===k)); // paling baru diinput di atas (sama seperti Rekap & Cetak Kwitansi)
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Laporan Perjalanan Dinas</h1><div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:760px"><thead><tr><th>Tgl Surat Tugas</th><th>No. Surat Tugas</th><th>Pegawai</th><th>Maksud / Tujuan</th><th>Laporan</th><th>Aksi</th></tr></thead><tbody>${g.map(a=>{const x=a[0],l=S.lap.find(q=>q.NoST===x.NoST);return`<tr><td class="t"><b>${idn(x.TglST)}</b></td><td class="t">${esc(x.NoST)}</td><td class="t">${a.length} pegawai</td><td class="t">${esc(x.Maksud)}<br><small>${esc(x.Tujuan)}</small></td><td class="t">${l?'<span class="bd" style="background:rgba(16,185,129,.15);color:var(--accent-text)">Sudah disusun</span>':'<small style="color:var(--text-2)">Belum disusun</small>'}</td><td class="t"><button class="btn2" data-l="${esc(x.NoST)}"><span class="ms">auto_awesome</span> Generate Laporan Perjalanan Dinas</button></td></tr>`}).join('')||'<tr><td class="t" colspan="6">Belum ada Surat Tugas.</td></tr>'}</tbody></table></div>`;
 document.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>lapDlg(b.dataset.l))}
function lapDlg(k){const rs=S.d.filter(r=>r.NoST===k),q=S.lap.find(x=>x.NoST===k),v=q?{kegiatan:q.Kegiatan,hasil:q.Hasil,kesimpulan:q.Kesimpulan}:lapGen(rs),m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-2xl" style="max-height:92vh;overflow:auto"><h2 class="text-lg font-bold">Isi Laporan Perjalanan Dinas</h2><small style="color:var(--text-2)">${esc(k)} · ${rs.length} pegawai · Maksud: ${esc(rs[0].Maksud)}</small>
 <label for="l1">Kegiatan yang dilaksanakan</label><textarea id="l1" class="inp" rows="3">${esc(v.kegiatan)}</textarea>
 <label for="l2">Hasil yang dicapai</label><textarea id="l2" class="inp" rows="2">${esc(v.hasil)}</textarea>
 <label for="l3">Kesimpulan dan saran</label><textarea id="l3" class="inp" rows="3">${esc(v.kesimpulan)}</textarea>
 <label for="l4">Tanggal laporan (boleh dikosongkan)</label><input id="l4" type="date" class="inp" value="${esc(q?q.Tanggal:'')}">
 <div class="flex gap-2 justify-between flex-wrap mt-4"><button class="btn2" id="lg"><span class="ms">auto_fix_high</span> Buat otomatis ulang</button><div class="flex gap-2"><button class="btn2" id="lx">Batal</button><button class="btn" id="ls">Generate Laporan</button></div></div></div>`;document.body.appendChild(m);
 $('#lg').onclick=()=>{const g=lapGen(rs);$('#l1').value=g.kegiatan;$('#l2').value=g.hasil;$('#l3').value=g.kesimpulan};$('#lx').onclick=()=>m.remove();
 $('#ls').onclick=async()=>{const done=busy($('#ls'),'Membuat laporan…');try{const ok=await run(()=>api('saveLap',S.t,{noST:k,kegiatan:$('#l1').value,hasil:$('#l2').value,kesimpulan:$('#l3').value,tgl:$('#l4').value}));if(!ok)return;await load();const p=await run(()=>api('lapPreview',S.t,k));if(p){m.remove();prev(p,k,'lapPdf')}}finally{done()}}}
function kwiV(){let g=urutInput([...new Set(S.d.map(r=>r.NoST))]).map(k=>S.d.filter(r=>r.NoST===k)); // paling baru diinput di atas (sama seperti Rekap)
 S.kwm=S.kwm||new Date().toISOString().slice(0,7);S.fbk=S.fbk||'';
 if(S.fbk)g=g.filter(a=>a[0].Bidang===S.fbk);
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Cetak Kwitansi</h1>
 <div class="glass p-4 mb-4 flex flex-wrap items-end gap-3"><div><label for="km">Cetak Massal — Bulan Surat Tugas</label><input id="km" type="month" class="inp" style="width:auto" value="${S.kwm}"></div><button class="btn2" id="kmg"><span class="ms">picture_as_pdf</span> Cetak Semua Kwitansi Bulan Ini</button><p class="text-xs" style="color:var(--text-2);flex:1;min-width:200px">Menggabungkan semua Kwitansi yang sudah diatur (jenis &amp; tarif terisi) dari Surat Tugas pada bulan terpilih${S.fbk?' dan Bidang '+esc(S.fbk):''} menjadi satu file PDF.</p></div>
 <div class="glass p-3 mb-4 flex flex-wrap items-end gap-3"><div><label for="fbk">Filter Bidang</label><select id="fbk" class="inp" aria-label="Bidang"><option value="">Semua Bidang</option>${BID.map(b=>`<option ${S.fbk==b?'selected':''}>${b}</option>`).join('')}</select></div></div>
 <div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:820px"><thead><tr><th>Tgl Surat Tugas</th><th>No. Surat Tugas</th><th>Bidang</th><th>Pegawai</th><th>Tujuan</th><th>Kwitansi</th><th>Aksi</th></tr></thead><tbody>${g.map(a=>{const x=a[0],k=S.kwi.find(q=>q.NoST===x.NoST);return`<tr><td class="t"><b>${idn(x.TglST)}</b></td><td class="t">${esc(x.NoST)}</td><td class="t">${badge(x.Bidang)}</td><td class="t">${a.length} pegawai</td><td class="t">${esc(x.Tujuan)}</td><td class="t">${k?`<span class="bd" style="background:rgba(16,185,129,.15);color:var(--accent-text)">${esc(k.Jenis)}</span><br><small>${esc(k.Nomor||'-')}</small>`:'<small style="color:var(--text-2)">Belum diatur</small>'}</td><td class="t"><button class="btn2" data-k="${esc(x.NoST)}"><span class="ms">auto_awesome</span> Generate</button></td></tr>`}).join('')||'<tr><td class="t" colspan="7">Belum ada Surat Tugas.</td></tr>'}</tbody></table></div>`;
 document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>kwiDlg(b.dataset.k));
 $('#km').onchange=e=>S.kwm=e.target.value;
 $('#fbk').onchange=e=>{S.fbk=e.target.value;kwiV()};
 $('#kmg').onclick=async()=>{const done=busy($('#kmg'),'Menggabungkan PDF…');try{const p=await run(()=>api('kwiPdfBulan',S.t,S.kwm,S.fbk),'PDF gabungan siap diunduh');if(p)dl('data:application/pdf;base64,'+p.b64,p.name)}finally{done()}}}
const tarifFor=jn=>jn==='Dalam Kota'?S.tarif.dalam:jn==='Luar Daerah'?S.tarif.luarDaerah:S.tarif.luar;
function kwiDlg(k){const a=S.d.filter(r=>r.NoST===k),q=S.kwi.find(x=>x.NoST===k)||{},m=document.createElement('div'),jn=q.Jenis||a[0].JenisPerjalanan||'Luar Kota',tf=q.Tarif||tarifFor(jn);m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-lg"><h2 class="text-lg font-bold">Data Kwitansi</h2><small style="color:var(--text-2)">${esc(k)} · ${a.length} pegawai${a[0].SubKegiatan?' · Sub Kegiatan: '+esc(a[0].SubKegiatan):''}</small>
 <label for="k1">Nomor Bukti</label><input id="k1" class="inp" value="${esc(q.Nomor||'')}">
 <div class="grid grid-cols-2 gap-2"><div><label for="k2">Jenis Perjalanan</label><select id="k2" class="inp"><option ${jn=='Dalam Kota'?'selected':''}>Dalam Kota</option><option ${jn=='Luar Kota'?'selected':''}>Luar Kota</option><option ${jn=='Luar Daerah'?'selected':''}>Luar Daerah</option></select></div>
 <div><label for="k3">Tarif per hari (Rp)</label><input id="k3" type="number" min="0" class="inp" value="${tf}"></div></div>
 <label for="k4">Tanggal dikeluarkan uang (boleh kosong)</label><input id="k4" type="date" class="inp" value="${esc(q.Tanggal||'')}">
 <p id="k5" class="mt-3" style="color:var(--text-2)"></p><div class="flex gap-2 justify-end mt-4"><button class="btn2" id="kx">Batal</button><button class="btn" id="ks">Generate</button></div></div>`;document.body.appendChild(m);
 const hit=()=>{const t=+$('#k3').value||0;$('#k5').innerHTML='Total seluruh biaya: <b>Rp '+a.reduce((s,r)=>s+r.Lama*t,0).toLocaleString('en-US')+'</b> ('+a.length+' pegawai)'};
 $('#k2').onchange=e=>{$('#k3').value=tarifFor(e.target.value);hit()};$('#k3').oninput=hit;hit();$('#kx').onclick=()=>m.remove();
 $('#ks').onclick=async()=>{const done=busy($('#ks'),'Membuat kwitansi…');try{const ok=await run(()=>api('saveKwi',S.t,{noST:k,nomor:$('#k1').value,jenis:$('#k2').value,tarif:$('#k3').value,tgl:$('#k4').value}));if(!ok)return;await load();const v=await run(()=>api('kwiPreview',S.t,k));if(v){m.remove();prev(v,k,'kwiPdf')}}finally{done()}}}
function edit(rs){const r=rs[0];if(r.TglST<today())return warnToast('SPT dan SPPD kemarin yang sudah Terbit tidak bisa diedit atau dirubah!!');const m=document.createElement('div');m.className='modal';let pick=rs.map(q=>String(q.NIP));
 const renderEPet=()=>{$('#echips').innerHTML=pick.map((n,i)=>{const p=S.pg.find(x=>String(x.NIP)===n)||rs.find(q=>String(q.NIP)===n)||{};return`<div class="glass p-3 mb-2 flex justify-between items-center"><div><b>${i+1}. ${esc(p.Nama||n)}</b><br><small>${esc(p.Pangkat||'')} · NIP ${esc(n)} · ${esc(p.Jabatan||'')}</small></div><button class="btn-d" aria-label="Hapus Petugas" type="button" data-rm="${esc(n)}"><span class="ms">close</span></button></div>`}).join('')||'<small style="color:var(--text-2)">Minimal harus ada satu pegawai.</small>';
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{if(pick.length<=1)return warnToast('Surat Tugas harus memiliki minimal satu pegawai.');pick=pick.filter(n=>n!==b.dataset.rm);renderEPet()})};
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-lg" style="max-height:90vh;overflow:auto"><h2 class="text-lg font-bold">Ubah Surat Tugas</h2><small style="color:var(--text-2)">${esc(r.NoST)} · berlaku untuk ${rs.length} pegawai</small>
 <label>Maksud Perjalanan</label><textarea id="e1" class="inp" rows="3">${esc(r.Maksud)}</textarea><label for="e2">Tempat Tujuan</label><select id="e2" class="inp">${(S.wil.includes(r.Tujuan)?S.wil:[r.Tujuan].concat(S.wil)).map(w=>`<option ${w==r.Tujuan?'selected':''}>${esc(w)}</option>`).join('')}</select>
 <div class="grid grid-cols-3 gap-2"><div><label>Berangkat <small style="font-weight:400;color:var(--text-2)">(terkunci)</small></label><input id="e3" type="date" class="inp" value="${r.Berangkat}" disabled style="opacity:.65;cursor:not-allowed"></div><div><label>Lama (hari)</label><input id="e4" type="number" min="1" class="inp" value="${r.Lama}"></div><div><label>Bidang</label><select id="e5" class="inp">${BIDX().map(b=>`<option ${b==r.Bidang?'selected':''}>${b}</option>`).join('')}</select></div></div>
 <label>Petugas</label><div class="flex gap-2"><select id="eps" class="inp"><option value="">— Pilih pegawai —</option>${S.pg.map(p=>`<option value="${esc(p.NIP)}">${esc(p.Nama)}</option>`).join('')}</select><button class="btn2" id="epa" type="button">Tambah</button></div><div id="echips" class="mt-2"></div>
 <div class="flex gap-2 justify-end mt-5"><button class="btn2" id="x">Batal</button><button class="btn" id="sv">Simpan</button></div></div>`;document.body.appendChild(m);renderEPet();
 $('#epa').onclick=()=>{const v=$('#eps').value;if(!v||pick.includes(v))return;const c=clash(v,r.Berangkat,$('#e4').value,r.NoST);if(c)return warnToast(msgClash(v,c)+' dan tidak dapat ditambahkan.');pick.push(v);renderEPet()};
 $('#x').onclick=()=>m.remove();$('#sv').onclick=async()=>{if($('#e3').value!==r.Berangkat&&$('#e3').value<today())return warnToast('Tanggal Berangkat tidak boleh diubah ke tanggal yang sudah berlalu.');
  if(!pick.length)return warnToast('Surat Tugas harus memiliki minimal satu pegawai.');
  const bad=pick.map(n=>({n,c:clash(n,$('#e3').value,$('#e4').value,r.NoST)})).filter(o=>o.c);if(bad.length)return warnToast(bad.map(o=>msgClash(o.n,o.c)).join('. ')+'. Perubahan dibatalkan.');const ok=await run(()=>api('updST',S.t,r.NoST,{maksud:$('#e1').value,tujuan:$('#e2').value,berangkat:$('#e3').value,lama:$('#e4').value,bidang:$('#e5').value,nips:pick}),'Perubahan disimpan');if(ok!==undefined){m.remove();await load()}}}
async function loadSubKeg(){const y=$('#f1').value.slice(0,4),bd=$('#f4').value,sel=$('#f7');if(!sel)return;
 let r=S.dpaCache[y];if(!r){try{r=await api('dpaGet',S.t,y);S.dpaCache[y]=r}catch(e){r=[]}}const rec=(r||[]).find(x=>x.Bidang===bd),subs=rec?rec.Subs:[];
 sel.innerHTML='<option value="">— Tidak ada (opsional) —</option>'+subs.map(s=>`<option value="${esc(s.id)}" data-nama="${esc(s.nama)}" data-jenis="${esc(s.jenis)}">${esc(s.nama)} (${esc(s.jenis)})</option>`).join('');
 subKegHint()}
function subKegHint(){const op=$('#f7')&&$('#f7').selectedOptions[0];$('#f7h').textContent=op&&op.value?'Jenis Perjalanan: '+op.dataset.jenis:'Jika dipilih, Jenis Perjalanan & Tarif Kwitansi nanti terisi otomatis.'}
function inputV(){const lastST=S.lastST;S.lastST=null;$('#main').innerHTML=`${lastST?`<div class="glass p-4 mb-4" style="border:1px solid var(--accent-text);background:color-mix(in srgb,var(--accent-text) 12%,transparent)"><b style="color:var(--accent-text)">✓ Berhasil diterbitkan</b><br>Surat Tugas <b>${esc(lastST)}</b> sudah tersimpan. Cek di Rekap &amp; Data SPPD kalau mau lihat/cetak lagi - formulir di bawah ini KOSONG untuk Surat Tugas yang BARU, bukan lanjutan dari yang barusan.</div>`:''}<h1 class="text-2xl font-bold mb-3">Formulir Surat Tugas & SPPD</h1><div class="glass p-5 mb-4"><b>1. Detail Surat Tugas</b>
 <p class="text-xs" style="color:var(--text-2)">Nomor Surat Tugas & SPPD dibuat otomatis (dikunci agar tidak ganda).</p>
 <div class="grid gap-3 md:grid-cols-3"><div><label>Tanggal Surat Tugas</label><input id="f1" type="date" class="inp" value="${today()}" min="${today()}"></div><div><label>Tanggal Berangkat</label><input id="f2" type="date" class="inp" value="${today()}" min="${today()}"></div><div><label>Lama Bertugas (hari)</label><input id="f3" type="number" min="1" value="1" class="inp"></div>
 <div><label>Bidang</label><select id="f4" class="inp">${BIDX().map(b=>`<option>${b}</option>`).join('')}</select></div><div class="md:col-span-2"><label for="f5">Tempat Tujuan (Master Wilayah)</label><select id="f5" class="inp"><option value="">— Pilih kecamatan —</option>${S.wil.map(w=>`<option>${esc(w)}</option>`).join('')}</select></div>
 <div class="md:col-span-3"><label for="f7">Sub Kegiatan (sesuai DPA Bidang terkait)</label><select id="f7" class="inp"><option value="">— Tidak ada (opsional) —</option></select><small id="f7h" style="color:var(--text-2)"></small></div></div>
 <label>Maksud Perjalanan Dinas</label><textarea id="f6" rows="3" class="inp"></textarea></div>
 <div class="glass p-5 mb-4"><b>2. Pegawai yang Ditugaskan</b><div class="flex gap-2 mt-2"><select id="ps" class="inp"><option value="">— Pilih pegawai —</option>${S.pg.map(p=>`<option value="${esc(p.NIP)}">${esc(p.Nama)}</option>`).join('')}</select><button class="btn" id="pa">Tambah</button></div><div id="warn" class="mt-3"></div><div id="chips" class="mt-3"></div></div>
 <button class="btn" id="sb">Simpan & Terbitkan Penugasan</button>`;chips();
 $('#pa').onclick=()=>{const v=$('#ps').value;if(!v||S.pick.includes(v))return;const c=clash(v,$('#f2').value,$('#f3').value);if(c)return warn([msgClash(v,c)+' dan tidak dapat ditambahkan.']);S.pick.push(v);warn([]);chips()};
 $('#f2').onchange=$('#f3').oninput=refreshPs;refreshPs();
 $('#f1').onchange=loadSubKeg;$('#f4').onchange=loadSubKeg;$('#f7').onchange=subKegHint;loadSubKeg();
 $('#sb').onclick=async()=>{if($('#f1').value<today()||$('#f2').value<today())return toast('Tanggal tidak boleh tanggal yang sudah berlalu.',1);
  const sk=$('#f7').selectedOptions[0];
  const f={tgl:$('#f1').value,berangkat:$('#f2').value,lama:$('#f3').value,bidang:$('#f4').value,tujuan:$('#f5').value,maksud:$('#f6').value,nips:S.pick,subKegiatan:sk&&sk.value?sk.dataset.nama:'',jenisPerjalanan:sk&&sk.value?sk.dataset.jenis:''};
  const pl=prosesLayar('Menerbitkan Surat Tugas & SPPD','Menyimpan data dan mengambil nomor Surat Tugas…'); // animasi proses di tengah layar sampai pratinjau Surat Tugas siap
  try{const r=await run(()=>api('saveST',S.t,f));if(!r)return;toast('Terbit: '+r.noST);S.pick=[];S.lastST=r.noST;S.view='input';pl.step('Nomor '+r.noST+' terbit. Memperbarui data…');await load();pl.step('Menyiapkan tampilan Surat Tugas…');const v=await run(()=>api('previewST',S.t,r.noST));pl.tutup();if(v)prev(v,r.noST,'pdfST')}finally{pl.tutup()}}}
function chips(){$('#chips').innerHTML=S.pick.map((n,i)=>{const p=S.pg.find(x=>String(x.NIP)===n);return`<div class="glass p-3 mb-2 flex justify-between items-center"><div><b>${i+1}. ${esc(p.Nama)}</b><br><small>${esc(p.Pangkat)} · NIP ${esc(p.NIP)} · ${esc(p.Jabatan)}</small></div><button class="btn-d" aria-label="Hapus" onclick="S.pick.splice(${i},1);chips()"><span class="ms">close</span></button></div>`}).join('')||'<small style="color:var(--text-2)">Belum ada pegawai dipilih.</small>'}

async function pegV(){let c=S.pegCache;if(!c){c=await run(()=>api('pegawaiList',S.t));if(!c)return;S.pegCache=c}
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Data Master Pegawai</h1><div class="glass p-5 mb-4 grid gap-2 md:grid-cols-6"><input id="n1" class="inp" placeholder="Nama"><input id="n2" class="inp" placeholder="Pangkat/Gol"><input id="n3" class="inp" placeholder="NIP"><input id="n4" class="inp" placeholder="Jabatan"><input id="n5" class="inp" placeholder="Tingkat Biaya (mis. F)"><button class="btn" id="ad">Tambah</button></div>
 <div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:820px"><thead><tr><th>Nama</th><th>Pangkat/Gol</th><th>NIP</th><th>Jabatan</th><th>Tingkat Biaya</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${c.map(p=>`<tr><td class="t"><b>${esc(p.Nama)}</b></td><td class="t">${esc(p.Pangkat)}</td><td class="t">${esc(p.NIP)}</td><td class="t">${esc(p.Jabatan)}</td><td class="t">${esc(p.TingkatBiaya)}</td><td class="t">${p.Aktif==='Ya'?'<span style="color:var(--accent-text);font-weight:600">● Aktif</span>':'<span style="color:var(--red);font-weight:600">● Nonaktif</span>'}</td><td class="t"><div class="flex gap-2"><button class="btn2" data-ed="${esc(p.NIP)}">Ubah</button>${p.Aktif==='Ya'?`<button class="btn-d" data-hp="${esc(p.NIP)}">Hapus</button>`:`<button class="btn2" data-pl="${esc(p.NIP)}">Pulihkan</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
 $('#ad').onclick=async()=>{const p={Nama:$('#n1').value,Pangkat:$('#n2').value,NIP:$('#n3').value,Jabatan:$('#n4').value,Tingkat:$('#n5').value};if(!p.Nama||!p.NIP)return toast('Nama & NIP wajib',1);await run(()=>api('savePegawai',S.t,p),'Pegawai ditambahkan');S.pegCache=null;await load()};
 document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>editPegawaiDlg(b.dataset.ed));
 document.querySelectorAll('[data-hp]').forEach(b=>b.onclick=async()=>{const nip=b.dataset.hp,p=c.find(x=>String(x.NIP)===nip);if(!p)return;if(!await confirmDlg('Nonaktifkan '+p.Nama+' (NIP '+p.NIP+')?\n\nPegawai ini tidak akan bisa lagi dipilih pada Surat Tugas baru. Seluruh riwayat Surat Tugas, Kwitansi, dan Laporan yang sudah ada tetap tersimpan.','Nonaktifkan Pegawai'))return;await run(()=>api('setPegawaiAktif',S.t,nip,false),'Pegawai dinonaktifkan');S.pegCache=null;await load()});
 document.querySelectorAll('[data-pl]').forEach(b=>b.onclick=async()=>{const nip=b.dataset.pl,p=c.find(x=>String(x.NIP)===nip);if(!p)return;if(!await confirmDlg('Pulihkan '+p.Nama+' (NIP '+p.NIP+') agar aktif kembali dan dapat dipilih pada Surat Tugas baru?','Pulihkan Pegawai'))return;await run(()=>api('setPegawaiAktif',S.t,nip,true),'Pegawai dipulihkan');S.pegCache=null;await load()})}
function editPegawaiDlg(nip){const p=S.pegCache&&S.pegCache.find(x=>String(x.NIP)===String(nip));if(!p)return;
 const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-md"><h2 class="text-lg font-bold">Ubah Data Pegawai</h2>
 <p class="text-xs mt-1" style="color:var(--text-2)">NIP ${esc(p.NIP)} (tidak dapat diubah)</p>
 <label for="ep1" class="block mt-3">Nama</label><input id="ep1" class="inp" value="${esc(p.Nama)}">
 <label for="ep2" class="block mt-3">Pangkat/Gol</label><input id="ep2" class="inp" value="${esc(p.Pangkat)}">
 <label for="ep3" class="block mt-3">Jabatan</label><input id="ep3" class="inp" value="${esc(p.Jabatan)}">
 <label for="ep4" class="block mt-3">Tingkat Biaya (mis. F)</label><input id="ep4" class="inp" value="${esc(p.TingkatBiaya)}">
 <p id="ep5" class="text-xs mt-2" style="color:var(--red)"></p>
 <div class="flex gap-2 justify-end mt-4"><button class="btn2" id="epx">Batal</button><button class="btn" id="epk">Simpan</button></div></div>`;
 document.body.appendChild(m);$('#ep1').focus();
 $('#epx').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};
 $('#ep1').onkeydown=e=>{if(e.key==='Enter')$('#epk').click()};
 $('#epk').onclick=async()=>{const nama=$('#ep1').value.trim();if(!nama){$('#ep5').textContent='Nama wajib diisi.';return}
  const data={NIP:p.NIP,Nama:nama,Pangkat:$('#ep2').value,Jabatan:$('#ep3').value,Tingkat:$('#ep4').value};
  const done=busy($('#epk'),'Menyimpan…');
  try{await run(()=>api('editPegawai',S.t,data),'Data pegawai diperbarui');if(document.body.contains(m))m.remove();S.pegCache=null;await load()}finally{done()}}}
function usrV(){$('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Manajemen Pengguna</h1><div class="glass p-5 mb-2 grid gap-2 md:grid-cols-3"><input id="u1" class="inp" placeholder="Username / NIP" aria-label="Username"><div style="position:relative"><input id="u2" class="inp" type="password" placeholder="Kata sandi (min. 6)" aria-label="Kata sandi" autocomplete="new-password" style="padding-right:2.6rem"><button type="button" id="uv" class="ms" aria-label="Tampilkan kata sandi" title="Tampilkan kata sandi" style="position:absolute;right:.4rem;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;color:var(--text-2);padding:.3rem;line-height:1">visibility</button></div><input id="u3" class="inp" placeholder="Nama" aria-label="Nama">
 <select id="u4" class="inp" aria-label="Peran"><option>Pegawai</option><option>Admin</option><option>Kasubag Keuangan</option><option>KABID</option><option>KASI</option><option>SEKRETARIS</option><option>Super Admin</option></select><select id="u6" class="inp" aria-label="Bidang"><option value="">— Bidang —</option>${BID.map(b=>`<option>${b}</option>`).join('')}</select><input id="u5" class="inp" placeholder="Foto profil: link/ID Drive atau URL (opsional)" aria-label="Foto profil">
 <button class="btn" id="au">Buat Akun</button></div>
 <p class="text-xs mb-3" style="color:var(--text-2)"><b>Super Admin:</b> semua fitur dan semua bidang. <b>Admin:</b> hanya data, DPA, kwitansi, dan laporan bidangnya sendiri (tanpa Data Pegawai). <b>Kasubag Keuangan:</b> Dashboard, DPA, Cetak Kwitansi, dan Buku Kas Umum (BKU) untuk semua bidang. <b>KABID / KASI / SEKRETARIS:</b> Dashboard, DPA, dan Buku Kas Umum (BKU) — khusus bidangnya sendiri saja (wajib pilih Bidang). <b>Pegawai:</b> hanya Dashboard. Foto profil dan Bidang juga bisa diatur di sheet USERS.</p>
 <div class="glass p-2 overflow-x-auto"><table class="w-full" style="min-width:640px"><thead><tr><th>Foto</th><th>Username</th><th>Nama</th><th>Peran</th><th>Bidang</th><th>Aksi</th></tr></thead><tbody>${S.us.map(u=>`<tr><td class="t">${ava(u.Foto,u.Nama,36)}</td><td class="t">${esc(u.Username)}</td><td class="t">${esc(u.Nama)}</td><td class="t">${esc(u.Role)}</td><td class="t">${u.Bidang?badge(u.Bidang):'-'}</td><td class="t"><button class="btn2" data-rs="${esc(u.Username)}">Reset sandi</button></td></tr>`).join('')}</tbody></table></div>`;
 $('#uv').onclick=()=>{const ip=$('#u2'),show=ip.type==='password';ip.type=show?'text':'password';const b=$('#uv');b.textContent=show?'visibility_off':'visibility';b.title=b.ariaLabel=show?'Sembunyikan kata sandi':'Tampilkan kata sandi'};
 $('#au').onclick=async()=>{const u={Username:$('#u1').value,Password:$('#u2').value,Nama:$('#u3').value,Role:$('#u4').value,Foto:$('#u5').value,Bidang:$('#u6').value};if(!u.Username||u.Password.length<6)return toast('Username wajib, sandi min. 6 karakter',1);if(['Admin','KABID','KASI','SEKRETARIS'].includes(u.Role)&&!u.Bidang)return toast('Pilih Bidang untuk akun '+u.Role,1);await run(()=>api('addUser',S.t,u),'Akun dibuat');await load()};
 document.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>resetPassDlg(b.dataset.rs))}
function resetPassDlg(username){const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-md"><h2 class="text-lg font-bold">Reset Kata Sandi</h2>
 <p class="text-sm mt-2">Atur kata sandi baru untuk akun <b>${esc(username)}</b></p>
 <label for="rz1" class="block mt-3">Kata Sandi Baru (min. 6 karakter)</label><div style="position:relative"><input id="rz1" type="password" class="inp" autocomplete="new-password" style="padding-right:2.6rem"><button type="button" id="rzv" class="ms" aria-label="Tampilkan kata sandi" title="Tampilkan kata sandi" style="position:absolute;right:.4rem;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;color:var(--text-2);padding:.3rem;line-height:1">visibility</button></div>
 <p id="rz2" class="text-xs mt-2" style="color:var(--red)"></p>
 <div class="flex gap-2 justify-end mt-4"><button class="btn2" id="rzx">Batal</button><button class="btn" id="rzk">Reset Kata Sandi</button></div></div>`;
 document.body.appendChild(m);$('#rz1').focus();
 $('#rzv').onclick=()=>{const ip=$('#rz1'),show=ip.type==='password';ip.type=show?'text':'password';const b=$('#rzv');b.textContent=show?'visibility_off':'visibility';b.title=b.ariaLabel=show?'Sembunyikan kata sandi':'Tampilkan kata sandi'};
 $('#rzx').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};
 $('#rz1').onkeydown=e=>{if(e.key==='Enter')$('#rzk').click()};
 $('#rzk').onclick=async()=>{const p=$('#rz1').value;if(p.length<6){$('#rz2').textContent='Kata sandi minimal 6 karakter.';return}
  const done=busy($('#rzk'),'Memproses…');
  try{await run(()=>api('resetPass',S.t,username,p),'Kata sandi diatur ulang');if(document.body.contains(m))m.remove()}finally{done()}}}
async function pjbV(){let c=S.cfgCache;if(!c){c=await run(()=>api('getCfg',S.t));if(!c)return;S.cfgCache=c}
 const f=(k,l)=>`<div><label for="${k}">${l}</label><input id="${k}" class="inp" value="${esc(c[k])}"></div>`,
 bl=(t,d,body)=>`<div class="glass p-5 mb-4"><b>${t}</b><p class="text-xs" style="color:var(--text-2)">${d}</p><div class="grid gap-3 md:grid-cols-2 mt-1">${body}</div></div>`,
 K=['TTD_JABATAN','TTD_NAMA','TTD_PANGKAT','TTD_NIP','KWI_KPA_NAMA','KWI_KPA_NIP','KWI_BENDAHARA_NAMA','KWI_BENDAHARA_NIP'];
 BID.forEach(b=>K.push('KWI_PPTK_'+b.toUpperCase()+'_NAMA','KWI_PPTK_'+b.toUpperCase()+'_NIP'));
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Pengaturan Pejabat Penandatangan</h1>
 ${bl('Penandatangan Surat Tugas & SPPD','Pimpinan yang menandatangani Surat Tugas dan SPPD. File tanda tangan (PNG) diatur di Pengaturan Cetak.',f('TTD_JABATAN','Jabatan')+f('TTD_NAMA','Nama')+f('TTD_PANGKAT','Pangkat / Golongan')+f('TTD_NIP','NIP'))}
 ${bl('Kuasa Pengguna Anggaran (Kwitansi)','Tampil pada bagian "Mengetahui".',f('KWI_KPA_NAMA','Nama')+f('KWI_KPA_NIP','NIP'))}
 ${bl('Bendahara Pengeluaran (Kwitansi)','',f('KWI_BENDAHARA_NAMA','Nama')+f('KWI_BENDAHARA_NIP','NIP'))}
 ${bl('Pejabat Pelaksana Teknis Kegiatan - Kepala Bidang (Kwitansi)','Otomatis mengikuti bidang pada Surat Tugas. Kosongkan jika belum ada.',BID.map(b=>f('KWI_PPTK_'+b.toUpperCase()+'_NAMA','Kepala Bidang '+b+' — Nama')+f('KWI_PPTK_'+b.toUpperCase()+'_NIP','Kepala Bidang '+b+' — NIP')).join(''))}
 <button class="btn" id="sj">Simpan Pejabat Penandatangan</button>`;
 $('#sj').onclick=async()=>{const o={};K.forEach(k=>o[k]=$('#'+k).value);const ok=await run(()=>api('saveCfg',S.t,o),'Pejabat penandatangan disimpan');if(ok)S.cfgCache=null}}
async function cfgV(){let c=S.cfgCache;if(!c){c=await run(()=>api('getCfg',S.t));if(!c)return;S.cfgCache=c}
 const num=(k,l)=>`<div><label for="${k}">${l}</label><input id="${k}" type="number" min="0" max="60" class="inp" value="${c[k]}"></div>`;
 const blok=(p,t)=>`<div class="glass p-5 mb-4"><b>${t}</b><div class="grid gap-3 grid-cols-2 md:grid-cols-5">${num('UKURAN_'+p,'Ukuran huruf (pt)')}${num(p+'_ATAS','Margin atas (mm)')}${num(p+'_BAWAH','Margin bawah (mm)')}${num(p+'_KIRI','Margin kiri (mm)')}${num(p+'_KANAN','Margin kanan (mm)')}</div></div>`;
 const KW=['KWI_KODE_REKENING','KWI_PREFIX','TARIF_LUAR','TARIF_DALAM','TARIF_LUARDAERAH'],txt=(k,l,w)=>`<div class="${w?'md:col-span-2':''}"><label for="${k}">${l}</label><input id="${k}" class="inp" value="${esc(c[k])}"></div>`,
 NUM=['UKURAN_ST','ST_ATAS','ST_BAWAH','ST_KIRI','ST_KANAN','UKURAN_SP','SP_ATAS','SP_BAWAH','SP_KIRI','SP_KANAN','TTD_LEBAR'];
 $('#main').innerHTML=`<h1 class="text-2xl font-bold mb-3">Pengaturan Cetak PDF</h1><div class="glass p-5 mb-4 grid gap-3 md:grid-cols-2">
 <div><label for="KERTAS">Ukuran kertas (Surat Tugas & SPPD)</label><select id="KERTAS" class="inp">${[['Legal','Legal 8.5 × 14 in (216 × 356 mm)'],['Letter','Letter 8.5 × 11 in (216 × 279 mm)']].map(([v,t])=>`<option value="${v}" ${v==c.KERTAS?'selected':''}>${t}</option>`).join('')}</select></div>
 <div><label for="FONT">Jenis huruf</label><select id="FONT" class="inp">${['Arial Narrow','Archivo Narrow','Arial'].map(f=>`<option ${f==c.FONT?'selected':''}>${f}</option>`).join('')}</select></div></div>
 ${blok('ST','Surat Tugas')}${blok('SP','SPPD')}
 <div class="glass p-5 mb-4"><b>Tanda Tangan Pimpinan &amp; CAP (PNG) — khusus Cetak Surat Tugas</b><p class="text-xs" style="color:var(--text-2)">Gunakan PNG berlatar transparan, maksimal ± 700 KB. Tanda tangan &amp; CAP <b>hanya tampil di Cetak Surat Tugas</b>. SPPD, Kwitansi, Laporan, BKU dan RRPD tetap kosong (ditandatangani &amp; dicap manual).</p>
 <div class="flex flex-wrap gap-4 items-center mt-2"><div id="tp" style="width:180px;height:90px;background:#fff;border-radius:.5rem;display:flex;align-items:center;justify-content:center;color:#777;font-size:12px">${c.TTD?`<img src="${c.TTD}" alt="Tanda tangan" style="max-width:100%;max-height:100%">`:'Belum ada TTD'}</div>
 <div class="flex-1" style="min-width:220px"><input id="tf" type="file" accept="image/png" class="inp" aria-label="File tanda tangan PNG"><div class="flex gap-2 mt-2"><button class="btn" id="tu">Unggah TTD</button><button class="btn-d" id="td">Hapus TTD</button></div></div>
 <div style="width:160px">${num('TTD_LEBAR','Lebar TTD (mm)')}</div></div>
 <div class="flex flex-wrap gap-4 items-center mt-4"><div id="cp" style="width:180px;height:90px;background:#fff;border-radius:.5rem;display:flex;align-items:center;justify-content:center;color:#777;font-size:12px">${c.CAP?`<img src="${c.CAP}" alt="CAP" style="max-width:100%;max-height:100%">`:'Belum ada CAP'}</div>
 <div class="flex-1" style="min-width:220px"><input id="cf" type="file" accept="image/png" class="inp" aria-label="File CAP PNG"><div class="flex gap-2 mt-2"><button class="btn" id="cu">Unggah CAP</button><button class="btn-d" id="cd">Hapus CAP</button></div></div>
 <div style="width:160px"><label for="cz">Ukuran CAP</label><select id="cz" class="inp">${[['1.2','Kecil'],['1.6','Sedang'],['2','Besar']].map(([v,t])=>`<option value="${v}" ${String(c.CAP_UKURAN||'1.6')===v?'selected':''}>${t}</option>`).join('')}</select></div></div>
 <div class="mt-4"><div class="text-xs mb-1" style="color:var(--text-2)">Pratinjau di Cetak Surat Tugas (CAP menimpa sebagian tanda tangan di sebelah kiri):</div><div id="gp" style="width:260px;height:120px;background:#fff;border-radius:.5rem;display:flex;align-items:center;justify-content:center;color:#777;font-size:12px">${c.TTDCAP?`<img src="${c.TTDCAP}" alt="TTD dan CAP" style="max-width:100%;max-height:100%">`:(c.TTD?`<img src="${c.TTD}" alt="TTD" style="max-width:100%;max-height:100%">`:'Belum ada TTD')}</div></div></div>
 <div class="glass p-5 mb-4"><b>Kwitansi</b><div class="grid gap-3 md:grid-cols-2 mt-1">${txt('KWI_KODE_REKENING','Kode Rekening bawaan — dipakai jika bidang belum mengisi (pisahkan dengan spasi)',1)}${txt('KWI_PREFIX','Awalan "Sebagai pembayaran" (diikuti Maksud Perjalanan Dinas)',1)}${txt('TARIF_DALAM','Tarif per hari - Dalam Kota (Rp)')}${txt('TARIF_LUAR','Tarif per hari - Luar Kota (Rp)')}${txt('TARIF_LUARDAERAH','Tarif per hari - Luar Daerah (Rp)')}</div></div>
 <button class="btn" id="sc">Simpan Pengaturan</button>
 <div class="glass p-5 mt-6" style="border:1px solid var(--red)"><b style="color:var(--red)">Zona Berbahaya</b>
 <p class="text-xs mt-1" style="color:var(--text-2)">Mengosongkan seluruh Data SPPD, Kwitansi, Laporan Perjalanan Dinas, Log Aktivitas, Pengajuan Pencairan, dan RRPD (status Generate &amp; Keterangan), lalu mengembalikan nomor Surat Tugas &amp; SPPD mulai dari awal. Data DPA, Data Master Pegawai, dan Manajemen Pengguna tidak terpengaruh. Tindakan ini tidak bisa dibatalkan.</p>
 <button class="btn-d mt-3" id="rd">RESET DATA</button></div>`;
 let ttdU=c.TTD||'',capU=c.CAP||'';
 const gpSet=u=>{$('#gp').innerHTML=u?`<img src="${u}" alt="TTD dan CAP" style="max-width:100%;max-height:100%">`:'Belum ada TTD'};
 const gabung=async()=>{ // susun gambar gabungan TTD + CAP di browser, lalu simpan - dipakai Cetak Surat Tugas
  if(!ttdU||!capU){gpSet(ttdU);return}
  try{const g=await gabungTtdCap(ttdU,capU,+$('#cz').value||1.6);const u=await run(()=>api('saveTtdCap',S.t,g.data,g.skala,$('#cz').value),'Tanda tangan & CAP untuk Surat Tugas tersimpan');if(u){S.cfgCache=null;gpSet(u)}}catch(e){toast('Gagal menyusun TTD + CAP: '+(e.message||e),1)}};
 const pngOk=f=>{if(!f){toast('Pilih file PNG terlebih dahulu',1);return false}if(f.type!=='image/png'){toast('File harus berformat PNG',1);return false}if(f.size>700*1024){toast('Ukuran file maksimal 700 KB',1);return false}return true};
 $('#cu').onclick=()=>{const f=$('#cf').files[0];if(!pngOk(f))return;const done=busy($('#cu'),'Mengunggah…');const fr=new FileReader();fr.onload=async()=>{try{const u=await run(()=>api('saveCap',S.t,fr.result),'CAP tersimpan');if(u){S.cfgCache=null;capU=u;$('#cp').innerHTML=`<img src="${u}" alt="CAP" style="max-width:100%;max-height:100%">`;await gabung()}}finally{done()}};fr.readAsDataURL(f)};
 $('#cd').onclick=async()=>{if(!await confirmDlg('Peringatan!! Data yang dihapus tidak bisa dipulihkan kembali.\n\nHapus CAP?'))return;await run(()=>api('delCap',S.t),'CAP dihapus');S.cfgCache=null;cfgV()};
 $('#cz').onchange=gabung;
 $('#tu').onclick=()=>{const f=$('#tf').files[0];if(!f)return toast('Pilih file PNG terlebih dahulu',1);if(f.type!=='image/png')return toast('File harus berformat PNG',1);if(f.size>700*1024)return toast('Ukuran file maksimal 700 KB',1);
  const fr=new FileReader();fr.onload=async()=>{const u=await run(()=>api('saveTtd',S.t,fr.result),'Tanda tangan tersimpan');if(u){S.cfgCache=null;ttdU=u;$('#tp').innerHTML=`<img src="${u}" alt="Tanda tangan" style="max-width:100%;max-height:100%">`;await gabung()}};fr.readAsDataURL(f)};
 $('#td').onclick=async()=>{if(!await confirmDlg('Peringatan!! Data yang dihapus tidak bisa dipulihkan kembali.\n\nHapus tanda tangan pimpinan?'))return;await run(()=>api('delTtd',S.t),'Tanda tangan dihapus');S.cfgCache=null;cfgV()};
 $('#sc').onclick=async()=>{const f={FONT:$('#FONT').value,KERTAS:$('#KERTAS').value};NUM.concat(KW).forEach(k=>f[k]=$('#'+k).value);const ok=await run(()=>api('saveCfg',S.t,f),'Pengaturan disimpan');if(ok)S.cfgCache=null};
 $('#rd').onclick=resetDataDlg}
function resetDataDlg(){const m=document.createElement('div');m.className='modal';
 m.innerHTML=`<div class="glass2 p-6 w-full max-w-md"><h2 class="text-lg font-bold" style="color:var(--red)">RESET DATA</h2>
 <p class="text-sm mt-2">Peringatan!! Tindakan ini akan <b>menghapus seluruh Data SPPD, Kwitansi, Laporan Perjalanan Dinas, Log Aktivitas, Pengajuan Pencairan, dan RRPD</b>, serta mengembalikan nomor Surat Tugas &amp; SPPD mulai dari awal. Tindakan ini <b>tidak bisa dibatalkan</b>.</p>
 <label for="rp1" class="block mt-3">Masukkan sandi akun Anda untuk melanjutkan</label><input id="rp1" type="password" class="inp" autocomplete="current-password">
 <p id="rp2" class="text-xs mt-2" style="color:var(--red)"></p>
 <div class="flex gap-2 justify-end mt-4"><button class="btn2" id="rx">Batal</button><button class="btn-d" id="rk">Reset Data Sekarang</button></div></div>`;
 document.body.appendChild(m);$('#rp1').focus();
 $('#rx').onclick=()=>m.remove();
 $('#rk').onclick=async()=>{const pass=$('#rp1').value;if(!pass){$('#rp2').textContent='Sandi wajib diisi.';return}
  const done=busy($('#rk'),'Memproses…');
  try{const ok=await run(()=>api('resetData',S.t,pass));if(ok){m.remove();S.rrpdCache={};S.ajuSnap=null;S.kasSnap=null;toast('Data SPPD, Kwitansi, Laporan, Pengajuan Pencairan, dan RRPD berhasil direset. Nomor Surat Tugas/SPPD dimulai dari awal.');S.view='dash';load()}else if(document.body.contains(m)){$('#rp1').value=''}}finally{done()}}}
restore();
