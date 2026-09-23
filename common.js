// ============================================
// Common — Layout, Auth, Utilities
// ============================================

const MENU=[
  {section:'প্রধান'},
  {key:'dashboard',href:'index.html',icon:'🏠',label:'ড্যাশবোর্ড'},
  {key:'pos',href:'pos.html',icon:'🛒',label:'বিক্রয় (POS)'},
  {section:'ইনভেন্টরি'},
  {key:'products',href:'products.html',icon:'📦',label:'প্রোডাক্ট'},
  {key:'categories',href:'categories.html',icon:'🏷️',label:'ক্যাটাগরি'},
  {key:'stock',href:'stock.html',icon:'📊',label:'স্টক'},
  {key:'suppliers',href:'suppliers.html',icon:'🏭',label:'সাপ্লায়ার'},
  {key:'purchases',href:'purchases.html',icon:'📥',label:'পারচেজ'},
  {section:'বিক্রয়'},
  {key:'invoices',href:'invoices.html',icon:'🧾',label:'ইনভয়েস'},
  {key:'customers',href:'customers.html',icon:'👤',label:'কাস্টমার'},
  {key:'payments',href:'payments.html',icon:'💰',label:'পেমেন্ট'},
  {key:'dues',href:'dues.html',icon:'⚠️',label:'বাকির তালিকা'},
  {section:'ম্যানেজমেন্ট'},
  {key:'employees',href:'employees.html',icon:'👨‍💼',label:'এমপ্লয়ি'},
  {key:'expenses',href:'expenses.html',icon:'💸',label:'খরচ'},
  {section:'রিপোর্ট'},
  {key:'reports',href:'reports.html',icon:'📊',label:'রিপোর্ট'},
  {key:'profit-loss',href:'profit-loss.html',icon:'📈',label:'লাভ-ক্ষতি'},
  {section:'সিস্টেম'},
  {key:'backup',href:'backup.html',icon:'💾',label:'ব্যাকআপ'},
  {key:'settings',href:'settings.html',icon:'⚙️',label:'সেটিংস'}
];

const BOTTOM=[
  {key:'dashboard',href:'index.html',icon:'🏠',label:'হোম'},
  {key:'pos',href:'pos.html',icon:'🛒',label:'বিক্রয়'},
  {key:'products',href:'products.html',icon:'📦',label:'প্রোডাক্ট'},
  {key:'customers',href:'customers.html',icon:'👤',label:'কাস্টমার'},
  {key:'more',href:'#',icon:'☰',label:'আরও'}
];

window.APP={
  currentPage:null,
  user:null,

  async init(pageKey,renderFn){
    await openDB();
    const saved=localStorage.getItem('textile-user');
    if(saved){try{this.user=JSON.parse(saved)}catch(e){}}
    if(!this.user){
      location.href='login.html';
      return;
    }
    this.currentPage=pageKey;
    this.renderLayout(pageKey);
    if(renderFn) await renderFn();
    else this.autoRender(pageKey);
  },

  renderLayout(pageKey){
    const drawerLinks=MENU.map(m=>{
      if(m.section) return `<div class="section">${m.section}</div>`;
      return `<a href="${m.href}" class="${m.key===pageKey?'active':''}">
        <span style="font-size:18px">${m.icon}</span><span>${m.label}</span></a>`;
    }).join('');

    const bottomLinks=BOTTOM.map(b=>{
      const active=b.key===pageKey?'active':'';
      const onclick=b.key==='more'?`onclick="APP.openDrawer();return false;"`:'';
      return `<a href="${b.href}" class="nav-item ${active}" ${onclick}>
        <span class="icon">${b.icon}</span><span>${b.label}</span></a>`;
    }).join('');

    document.body.innerHTML=`
      <div class="backdrop" id="backdrop" onclick="APP.closeDrawer()"></div>
      <div class="drawer" id="drawer">
        <div class="drawer-head">🧵 TextilePOS</div>
        ${drawerLinks}
      </div>
      <header class="app-header">
        <button onclick="APP.openDrawer()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:4px 8px;">☰</button>
        <h1>🧵 TextilePOS</h1>
        <button onclick="APP.logout()" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;">লগআউট</button>
      </header>
      <main id="pageContent"></main>
      <nav class="bottom-nav">${bottomLinks}</nav>`;
  },

  openDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('backdrop').classList.add('open')},
  closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('backdrop').classList.remove('open')},
  logout(){localStorage.removeItem('textile-user');location.href='login.html'},

  async autoRender(pageKey){
    const map={
      dashboard:['index.html','ড্যাশবোর্ড'],
      products:['products.html','প্রোডাক্ট'],
      customers:['customers.html','কাস্টমার']
    };
    // For pages without custom render, just show a message
    document.getElementById('pageContent').innerHTML=
      `<h1 class="page-title">পেজ লোড হচ্ছে...</h1>`;
  }
};

// ============ Utilities ============
function toast(msg,type='info'){
  const el=document.createElement('div');
  const c={info:'#0f172a',success:'#16a34a',error:'#dc2626'}[type];
  el.style.cssText=`position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${c};color:#fff;padding:10px 20px;border-radius:10px;font-size:14px;z-index:100;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:90%;text-align:center;`;
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2500);
}
function bdt(n){return '৳ '+(n||0).toLocaleString('en-IN')}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function confirmBox(msg){
  return new Promise(res=>{
    const ov=document.createElement('div');
    ov.className='overlay';
    ov.innerHTML=`<div class="modal"><p style="margin:0 0 16px">${esc(msg)}</p>
      <div class="grid-2"><button class="btn btn-outline" id="cno">না</button>
      <button class="btn btn-danger" id="cyes">হ্যাঁ</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#cno').onclick=()=>{ov.remove();res(false)};
    ov.querySelector('#cyes').onclick=()=>{ov.remove();res(true)};
  });
}
function openModal(id,html){
  const ov=document.createElement('div');
  ov.className='overlay';ov.id=id;
  ov.innerHTML=`<div class="modal">${html}</div>`;
  document.body.appendChild(ov);
}
function closeModal(id){const el=document.getElementById(id);if(el)el.remove()}
function fmtDate(d){return new Date(d).toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'})}
function fmtDateTime(d){return new Date(d).toLocaleString('bn-BD',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
