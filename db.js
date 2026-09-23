// ============================================
// TextilePOS IndexedDB — সব ডেটা ডিভাইসে
// ============================================
const DB_NAME='TextilePOS', DB_VERSION=1;
let db=null;

function openDB(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      ['products','categories','suppliers','purchases','customers','sales','payments','employees','expenses','settings'].forEach(n=>{
        if(!d.objectStoreNames.contains(n)) d.createObjectStore(n,{keyPath:'id',autoIncrement:true});
      });
    };
    r.onsuccess=()=>{db=r.result;res(db)};
    r.onerror=()=>rej(r.error);
  });
}
function tx(s,m='readonly'){return db.transaction(s,m).objectStore(s)}

const DB={
  add:(s,d)=>new Promise((res,rej)=>{const r=tx(s,'readwrite').add(d);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}),
  put:(s,d)=>new Promise((res,rej)=>{const r=tx(s,'readwrite').put(d);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}),
  get:(s,id)=>new Promise((res,rej)=>{const r=tx(s).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}),
  all:s=>new Promise((res,rej)=>{const r=tx(s).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)}),
  del:(s,id)=>new Promise((res,rej)=>{const r=tx(s,'readwrite').delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)}),
  clear:s=>new Promise((res,rej)=>{const r=tx(s,'readwrite').clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})
};

// ============ Business Logic ============
async function genInvoiceNo(){
  const sales=await DB.all('sales');
  const t=new Date();
  const ymd=`${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}`;
  const prefix=`INV-${ymd}-`;
  const n=sales.filter(s=>s.invoiceNo.startsWith(prefix)).length+1;
  return `${prefix}${String(n).padStart(4,'0')}`;
}

async function createSale(data){
  const invoiceNo=await genInvoiceNo();
  const subtotal=data.items.reduce((s,i)=>s+i.qty*i.rate,0);
  const total=subtotal-(data.discount||0);
  const due=total-(data.paid||0);
  let customerName=null;
  if(data.customerId){const c=await DB.get('customers',data.customerId);customerName=c?.name}
  const sale={invoiceNo,customerId:data.customerId||null,customerName,
    items:data.items,subtotal,discount:data.discount||0,total,
    paid:data.paid||0,due,paymentMethod:data.paymentMethod||'cash',
    type:data.type||'retail',saleDate:new Date().toISOString()};
  await DB.add('sales',sale);
  for(const it of data.items){
    const p=await DB.get('products',it.productId);
    if(p){p.stockQty=(p.stockQty||0)-it.qty;await DB.put('products',p)}
  }
  if(data.customerId&&due>0){
    const c=await DB.get('customers',data.customerId);
    if(c){c.due=(c.due||0)+due;await DB.put('customers',c)}
  }
  if(data.paid>0&&data.customerId){
    await DB.add('payments',{customerId:data.customerId,customerName,amount:data.paid,
      method:data.paymentMethod||'cash',note:`Sale ${invoiceNo}`,paymentDate:new Date().toISOString()});
  }
  return sale;
}

async function collectPayment(data){
  const c=await DB.get('customers',data.customerId);
  if(!c) throw new Error('Customer not found');
  await DB.add('payments',{customerId:data.customerId,customerName:c.name,amount:data.amount,
    method:data.method||'cash',note:data.note||'',paymentDate:new Date().toISOString()});
  c.due=(c.due||0)-data.amount;
  await DB.put('customers',c);
}

async function createPurchase(data){
  const total=data.items.reduce((s,i)=>s+i.qty*i.rate,0);
  const purchase={supplierId:data.supplierId,supplierName:data.supplierName,
    items:data.items,total,paid:data.paid||0,due:total-(data.paid||0),
    note:data.note||'',purchaseDate:new Date().toISOString()};
  await DB.add('purchases',purchase);
  for(const it of data.items){
    const p=await DB.get('products',it.productId);
    if(p){p.stockQty=(p.stockQty||0)+it.qty;await DB.put('products',p)}
  }
  if(data.supplierId){
    const s=await DB.get('suppliers',data.supplierId);
    if(s){s.due=(s.due||0)+(total-(data.paid||0));await DB.put('suppliers',s)}
  }
  return purchase;
}

async function getDashboardStats(){
  const [sales,customers,products,suppliers]=await Promise.all([
    DB.all('sales'),DB.all('customers'),DB.all('products'),DB.all('suppliers')
  ]);
  const today=new Date();today.setHours(0,0,0,0);
  const ts=sales.filter(s=>new Date(s.saleDate)>=today);
  const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
  const ms=sales.filter(s=>new Date(s.saleDate)>=monthStart);
  return {
    today:{count:ts.length,total:ts.reduce((s,x)=>s+x.total,0)},
    month:{count:ms.length,total:ms.reduce((s,x)=>s+x.total,0)},
    totalDue:customers.reduce((s,c)=>s+(c.due||0),0),
    productCount:products.length,
    customerCount:customers.length,
    supplierDue:suppliers.reduce((s,x)=>s+(x.due||0),0),
    lowStock:products.filter(p=>p.stockQty<=(p.lowStockAlert||5)).length
  };
}

async function exportBackup(){
  const data={exportedAt:new Date().toISOString()};
  for(const s of ['products','categories','suppliers','purchases','customers','sales','payments','employees','expenses','settings']){
    data[s]=await DB.all(s);
  }
  return JSON.stringify(data,null,2);
}

async function importBackup(json){
  const data=JSON.parse(json);
  for(const s of ['products','categories','suppliers','purchases','customers','sales','payments','employees','expenses','settings']){
    await DB.clear(s);
    if(data[s]) for(const it of data[s]) await DB.add(s,it);
  }
}
