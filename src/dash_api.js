/* =====================================================================
   NABL authenticated module — service layer ("API")
   Every dashboard, table, report and export reads data ONLY through the
   functions returned by API below. Each call re-checks the session and
   derives the regulator scope from the session, never from a parameter.
   PROTOTYPE NOTE: this runs in the browser, so it demonstrates the access
   rules and response shapes; real enforcement must live on the server
   (see access-control.md and schema_dashboard.sql for the production design).
   ===================================================================== */
const ROLES={admin:'NABL Admin',regulator:'Regulator',board:'NABL Board',public:'Public user'};
const DEMO_PW='Nabl#Demo2026';
const REG_SEED=[
 ['FSSAI','Statutory authority','Central'],['EIC','Statutory body','Central'],['APEDA','Statutory export promotion authority','Central'],
 ['TEA BOARD','Statutory commodity board','Central'],['SPICE BOARD','Statutory commodity board','Central'],
 ['IOPEPC','Export promotion council','Sectoral'],['CDB','Statutory commodity board','Central'],['Shefexil','Export promotion council','Sectoral']
].map(([code,type,level])=>({code,name:REGNAME[code]||code,type,level,status:'Active',contact:'',email:'',phone:''}));
/* Where a lab is recognised by several regulators and the source names none as lead, the rule-suggested primary is the most
   sector-specific regulator (commodity boards / export councils before the general FSSAI and EIC). It is stored as Pending. */
const PRIMARY_ORDER=['Shefexil','CDB','SPICE BOARD','TEA BOARD','IOPEPC','APEDA','EIC','FSSAI'];
const STATUS_CATS=['Active','Expiring','In process','Validity date passed','Expired / suspended','Unknown'];
const RECOG=['Active','In process','Expired / suspended','Withdrawn'];
const VERIF=['Verified','Source-listed','Pending'];
const VISIB=['Public','Shared','Internal'];
const rkey=(labId,reg)=>labId+'__'+String(reg).replace(/\s+/g,'_');
const recName=r=>r==='TEA BOARD'?'Tea Board':r==='SPICE BOARD'?'Spices Board':r;

(function initStoreExt(){const m=Store.mem;m.mapOv=m.mapOv||{};m.regOv=m.regOv||{};})();
function dashSync(){ // shared database subscriptions once the viewer grants it
  if(!Store.db||Store._dsync) return; Store._dsync=1;
  const sub=(coll,into)=>{try{Store.db.collection(coll).onSnapshot(q=>{q.docs.forEach(d=>{Store.mem[into][d.id]=d.data();});CACHE=null;Store.emit();},()=>{});}catch(e){}};
  sub('mapping','mapOv');sub('regs','regOv');
}
let CACHE=null,SEED=null;
Store.on(()=>{CACHE=null;});

function statusCat(L){
  const s=accStatus(L);
  if(s.k==='valid') return 'Active';
  if(s.k==='warn') return /process/i.test(s.label)?'In process':'Expiring';
  if(s.k==='lapse') return /suspend|withdraw|expired/i.test(s.label)?'Expired / suspended':'Validity date passed';
  return 'Unknown';
}
function seedMapping(){
  const rows=[];
  for(const L of LABS){
    if(!L.ig||!L.ig.regs.length) continue;
    const regs=L.ig.regs;
    const recog=L.ig.flag==='red'?'Expired / suspended':L.ig.flag==='blue'?'In process':'Active';
    const multi=regs.length>1;
    const primary=multi?(PRIMARY_ORDER.find(r=>regs.includes(r))||regs[0]):regs[0];
    for(const r of regs){
      const isP=r===primary, suggested=isP&&multi;
      rows.push({key:rkey(L.id,r),labId:L.id,reg:r,rel:isP?'Primary':'Recognised',recog,validity:L.ig.cycle||'',
        ver:suggested?'Pending':'Source-listed',vis:'Public',note:'',
        src:suggested?'Lead regulator suggested by rule (sector-specific first); confirm':'Centralized list (15.09.2026)'});
    }
  }
  return rows;
}
function eff(){
  if(CACHE) return CACHE;
  SEED=SEED||seedMapping();
  const rows=new Map(SEED.map(r=>[r.key,{...r}]));
  for(const [k,o] of Object.entries(Store.mem.mapOv||{})){
    if(rows.has(k)) Object.assign(rows.get(k),o); else if(o&&o._add) rows.set(k,{key:k,...o});
  }
  const list=[...rows.values()].filter(r=>!r.deleted&&BYID[r.labId]);
  const byLab=new Map(),byReg=new Map();
  for(const r of list){
    if(!byLab.has(r.labId)) byLab.set(r.labId,[]); byLab.get(r.labId).push(r);
    if(!byReg.has(r.reg)) byReg.set(r.reg,[]); byReg.get(r.reg).push(r);
  }
  const regMap={};REG_SEED.forEach(r=>regMap[r.code]={...r});
  for(const [c,o] of Object.entries(Store.mem.regOv||{})){ if(regMap[c]) Object.assign(regMap[c],o); else if(o&&o._add) regMap[c]={code:c,...o}; }
  const regs=Object.values(regMap).filter(r=>!r.deleted);
  return CACHE={list,byLab,byReg,regs,regMap};
}
const live=r=>r.recog!=='Withdrawn';
const isVer=r=>r.ver==='Verified'||r.ver==='Source-listed';
/* Public regulator tags (used by the public Find a Lab screens): verified + Public visibility only, primary first */
function visRegs(L){
  const rows=(eff().byLab.get(L.id)||[]).filter(r=>live(r)&&isVer(r)&&r.vis==='Public');
  return rows.sort((a,b)=>(b.rel==='Primary')-(a.rel==='Primary')).map(r=>r.reg);
}
function primaryPublic(L){const r=(eff().byLab.get(L.id)||[]).find(r=>r.rel==='Primary'&&live(r)&&isVer(r)&&r.vis==='Public');return r?r.reg:null;}

/* ---------- helpers ---------- */
const qKey=s=>{const d=new Date(s);return d.getFullYear()+' Q'+(Math.floor(d.getMonth()/3)+1);};
function agg(labs){
  const o={n:labs.length,type:{M:0,T:0,C:0,P:0,R:0},state:{},status:{},exp:{},iss:{},scope:{},noScope:0,withScope:0,cities:new Set(),discs:new Set()};
  for(const L of labs){
    o.type[L.t]++;
    const st=L.state||'Not stated';o.state[st]=(o.state[st]||0)+1;
    const sc=statusCat(L);o.status[sc]=(o.status[sc]||0)+1;
    if(L.to){const k=new Date(L.to)<TODAY?'Passed':qKey(L.to);o.exp[k]=(o.exp[k]||0)+1;}
    if(L.fr){const k=qKey(L.fr);o.iss[k]=(o.iss[k]||0)+1;}
    if(L.city) o.cities.add(L.city.toLowerCase());
    if(L.d.length){o.withScope++;for(const i of L.d){const k=DICT.disc[i];o.scope[k]=(o.scope[k]||0)+1;o.discs.add(k);}} else o.noScope++;
  }
  o.cities=o.cities.size;o.discs=o.discs.size;
  o.active=(o.status.Active||0)+(o.status.Expiring||0);
  o.expiring=o.status.Expiring||0;
  o.lapsed=(o.status['Validity date passed']||0)+(o.status['Expired / suspended']||0);
  return o;
}
function sanitize(f,allowReg,allowQ=true){
  f=f||{};const o={},E=eff();
  if(allowQ&&typeof f.q==='string'&&f.q.trim()) o.q=f.q.trim().slice(0,80);
  if(f.state&&STATES.includes(f.state)) o.state=f.state;
  if(f.city&&typeof f.city==='string') o.city=f.city.slice(0,80);
  if(f.type&&TYPES[f.type]) o.type=f.type;
  if(allowReg&&f.reg&&E.regMap[f.reg]) o.reg=f.reg;
  if(f.status&&STATUS_CATS.includes(f.status)) o.status=f.status;
  if(/^\d{4}-\d{2}-\d{2}$/.test(f.from||'')) o.from=f.from;
  if(/^\d{4}-\d{2}-\d{2}$/.test(f.to||'')) o.to=f.to;
  return o;
}
function applyF(labs,f){
  const E=eff();
  return labs.filter(L=>{
    if(f.state&&L.state!==f.state) return false;
    if(f.city&&(L.city||'').toLowerCase()!==f.city.toLowerCase()) return false;
    if(f.type&&L.t!==f.type) return false;
    if(f.q){const q=f.q.toLowerCase();if(!(L.id.toLowerCase().startsWith(q)||L.nl.includes(q)||(L.cn||'').toLowerCase().includes(q))) return false;}
    if(f.status&&statusCat(L)!==f.status) return false;
    if(f.from&&(!L.to||L.to<f.from)) return false;
    if(f.to&&(!L.to||L.to>f.to)) return false;
    if(f.reg&&!(E.byLab.get(L.id)||[]).some(r=>r.reg===f.reg&&live(r))) return false;
    return true;
  });
}
const TYPE_ORDER=['T','M','C','P','R'];
function typeBreak(labs){
  const o={};Object.keys(TYPES).forEach(k=>o[k]={n:0,active:0,expiring:0,lapsed:0});
  for(const L of labs){const c=statusCat(L),t=o[L.t];t.n++;if(c==='Active'||c==='Expiring')t.active++;if(c==='Expiring')t.expiring++;if(c==='Validity date passed'||c==='Expired / suspended')t.lapsed++;}
  return o;
}
const noType=F=>({...F,type:undefined});
const byName=(a,b)=>a.n.localeCompare(b.n);
const csvSafe=v=>{v=String(v??'');return /^[=+\-@]/.test(v)?"'"+v:v;}; // neutralise spreadsheet formulas in exports

/* ---------- projections (field-level visibility) ---------- */
function pubRow(r){return {reg:r.reg,rel:r.rel,recog:r.recog,validity:r.validity,ver:r.ver,vis:r.vis,note:r.note||'',src:r.src};}
function otherTags(rows,viewerReg){return rows.filter(r=>r.reg!==viewerReg&&live(r)&&isVer(r)&&(r.vis==='Public'||r.vis==='Shared')).map(r=>({reg:r.reg,rel:r.rel}));}
function base(L){return {id:L.id,n:L.n,t:L.t,city:L.city,state:L.state,cn:L.cn,fr:L.fr,to:L.to,status:statusCat(L),disc:discNames(L),grp:grpNames(L),sub:subNames(L),su:L.su||''};}
function projAdmin(L){
  const rows=eff().byLab.get(L.id)||[];
  return {...base(L),mode:'admin',pin:field(L,'p'),grp:grpNames(L),contact:{cp:field(L,'cp'),em:field(L,'em'),mo:field(L,'mo')},
    accr:{cycle:L.ig&&L.ig.cycle||'',ext:L.ig&&L.ig.ext||'',note:L.ig&&L.ig.note||''},rows:rows.map(pubRow)};
}
function projOwn(L,mine){
  const rows=eff().byLab.get(L.id)||[];
  return {...base(L),mode:'own',pin:field(L,'p'),grp:grpNames(L),contact:{cp:field(L,'cp'),em:field(L,'em'),mo:field(L,'mo')},
    accr:{cycle:L.ig&&L.ig.cycle||'',ext:L.ig&&L.ig.ext||'',note:L.ig&&L.ig.note||''},mine:pubRow(mine),tags:otherTags(rows,mine.reg)};
}
function projShared(L,mine){
  const rows=eff().byLab.get(L.id)||[];
  return {...base(L),mode:'shared',mine:pubRow(mine),tags:otherTags(rows,mine.reg)};
}

/* ---------- the API ---------- */
class ApiError extends Error{constructor(code,msg){super(msg);this.code=code;}}
const API=(()=>{
  const IDLE=30*60*1000;let sess=null;
  const store=()=>{try{sessionStorage.setItem('nabl_sess',JSON.stringify(sess));}catch(e){}};
  const drop=()=>{sess=null;try{sessionStorage.removeItem('nabl_sess');}catch(e){}};
  try{const s=JSON.parse(sessionStorage.getItem('nabl_sess')||'null');if(s&&s.exp>Date.now()&&['admin','regulator','board'].includes(s.role)) sess=s;}catch(e){}
  function need(...roles){
    if(!sess||sess.exp<Date.now()){drop();throw new ApiError(401,'Please sign in.');}
    if(roles.length&&!roles.includes(sess.role)) throw new ApiError(403,'Your role does not have access to this.');
    if(sess.role==='regulator'){const g=eff().regMap[sess.reg];if(!g||g.status!=='Active'){drop();throw new ApiError(403,'This regulator account is inactive.');}}
    sess.exp=Date.now()+IDLE;store();return sess;
  }
  const audit=what=>{Store.mem.audit.unshift({ts:Date.now(),what:(sess?sess.email+': ':'')+what});Store.mem.audit=Store.mem.audit.slice(0,300);Store.save();};
  const lock=()=>{try{return JSON.parse(sessionStorage.getItem('nabl_lock')||'{"n":0,"until":0}');}catch(e){return {n:0,until:0};}};
  async function sha(s){if(!(window.crypto&&crypto.subtle)) throw new ApiError(500,'Secure sign-in is not available in this browser.');
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  const pubSess=()=>sess?{email:sess.email,name:sess.name,role:sess.role,reg:sess.reg}:null;

  /* stats shared by roles (aggregates only) */
  function regCounts(ids){
    const o={};for(const r of eff().list){if(!live(r)||!ids.has(r.labId))continue;const c=o[r.reg]||(o[r.reg]={p:0,r:0});r.rel==='Primary'?c.p++:c.r++;}return o;}
  const pendingRows=()=>eff().list.filter(r=>live(r)&&r.ver==='Pending');
  const openReports=()=>Store.mem.requests.filter(r=>['Submitted','Under review','Technical review'].includes(r.status)).length;

  const A={
    session:()=>{if(sess&&sess.exp<Date.now())drop();return pubSess();},
    async login(email,pw){
      const lk=lock();if(lk.until>Date.now()) throw new ApiError(429,'Too many attempts. Try again in '+Math.ceil((lk.until-Date.now())/1000)+' seconds.');
      email=String(email||'').trim().toLowerCase();
      const acc=(window.NABL_ACCOUNTS||[]).find(a=>a.email===email);
      const h=await sha((acc?acc.salt:'x')+String(pw||''));
      if(!acc||h!==acc.hash){
        const n=lk.n+1;try{sessionStorage.setItem('nabl_lock',JSON.stringify({n:n>=5?0:n,until:n>=5?Date.now()+60000:0}));}catch(e){}
        Store.mem.audit.unshift({ts:Date.now(),what:'Failed sign-in for '+email.slice(0,60)});Store.save();
        throw new ApiError(401,'Email or password is incorrect.');
      }
      if(acc.role==='regulator'){const g=eff().regMap[acc.reg];if(!g||g.status!=='Active') throw new ApiError(403,'This regulator account is inactive. Contact NABL.');}
      try{sessionStorage.removeItem('nabl_lock');}catch(e){}
      sess={email:acc.email,name:acc.name,role:acc.role,reg:acc.reg||null,exp:Date.now()+IDLE};store();audit('Signed in');
      return pubSess();
    },
    logout(){if(sess)audit('Signed out');drop();},

    /* ---------- NABL Admin ---------- */
    adminDash(f){
      need('admin');const F=sanitize(f,true);const labs=applyF(LABS,F);const a=agg(labs);const ids=new Set(labs.map(l=>l.id));
      const rc=regCounts(ids);const mapped=new Set(eff().list.filter(live).map(r=>r.labId));
      const types=typeBreak(applyF(LABS,noType(F)));
      const dqLabs=new Set(RAW.dqrows.map(r=>r[0]));
      return {filters:F,agg:a,types,regCounts:rc,unmapped:labs.filter(l=>!mapped.has(l.id)).length,
        activeRegs:eff().regs.filter(r=>r.status==='Active').length,pending:pendingRows().length,openReports:openReports(),
        dqIssues:RAW.dqrows.length,dqLabs:dqLabs.size};
    },
    adminLabs(f,offset=0,limit=25){
      need('admin');const F=sanitize(f,true);const labs=applyF(LABS,F).sort(byName);const E=eff();
      return {total:labs.length,rows:labs.slice(offset,offset+limit).map(L=>({...base(L),rows:(E.byLab.get(L.id)||[]).filter(live).map(pubRow)}))};
    },
    regulators(){
      need('admin');const E=eff();
      return E.regs.map(g=>{const rows=E.byReg.get(g.code)||[];return {...g,primary:rows.filter(r=>live(r)&&r.rel==='Primary').length,recognised:rows.filter(r=>live(r)&&r.rel!=='Primary').length};});
    },
    saveRegulator(code,patch,isNew){
      const s=need('admin');const g={};
      ['name','type','level','status','contact','email','phone'].forEach(k=>{if(patch[k]!=null)g[k]=String(patch[k]).slice(0,200);});
      if(g.level&&!['Central','State','Sectoral'].includes(g.level)) throw new ApiError(400,'Level must be Central, State or Sectoral.');
      if(g.status&&!['Active','Inactive'].includes(g.status)) throw new ApiError(400,'Invalid status.');
      code=String(code).trim().slice(0,40);
      if(!code) throw new ApiError(400,'Regulator short name is required.');
      const E=eff();if(isNew&&E.regMap[code]) throw new ApiError(400,'A regulator with this short name already exists.');
      Store.mem.regOv[code]={...(Store.mem.regOv[code]||{}),...g,...(isNew?{_add:true}:{})};
      CACHE=null;Store.emit();if(Store.db)Store.db.collection('regs').doc(code.replace(/[^\w.~:@+-]/g,'_')).set(JSON.parse(JSON.stringify(Store.mem.regOv[code]))).catch(()=>{});
      audit((isNew?'Added':'Updated')+' regulator '+code);
    },
    mapping(f,offset=0,limit=40){
      need('admin');const E=eff();let rows=E.list.slice();
      if(f&&f.reg) rows=rows.filter(r=>r.reg===f.reg);
      if(f&&f.rel) rows=rows.filter(r=>r.rel===f.rel);
      if(f&&f.ver) rows=rows.filter(r=>r.ver===f.ver);
      if(f&&f.q){const q=String(f.q).toLowerCase();rows=rows.filter(r=>{const L=BYID[r.labId];return r.labId.toLowerCase().includes(q)||L.nl.includes(q);});}
      rows.sort((a,b)=>BYID[a.labId].n.localeCompare(BYID[b.labId].n)||(b.rel==='Primary')-(a.rel==='Primary'));
      return {total:rows.length,rows:rows.slice(offset,offset+limit).map(r=>({...pubRow(r),key:r.key,labId:r.labId,labName:BYID[r.labId].n,state:BYID[r.labId].state}))};
    },
    saveMapping(key,patch){
      const s=need('admin');const E=eff();const cur=E.list.find(r=>r.key===key);if(!cur) throw new ApiError(404,'Mapping not found.');
      const p={};
      if(patch.rel!=null){if(!['Primary','Recognised'].includes(patch.rel)) throw new ApiError(400,'Invalid relationship.');p.rel=patch.rel;}
      if(patch.recog!=null){if(!RECOG.includes(patch.recog)) throw new ApiError(400,'Invalid recognition status.');p.recog=patch.recog;}
      if(patch.ver!=null){if(!VERIF.includes(patch.ver)) throw new ApiError(400,'Invalid verification status.');p.ver=patch.ver;}
      if(patch.vis!=null){if(!VISIB.includes(patch.vis)) throw new ApiError(400,'Invalid visibility.');p.vis=patch.vis;}
      if(patch.validity!=null) p.validity=String(patch.validity).slice(0,60);
      if(patch.note!=null) p.note=String(patch.note).slice(0,500);
      if(p.rel==='Primary'){ // one primary per laboratory
        for(const o of (E.byLab.get(cur.labId)||[])) if(o.key!==key&&o.rel==='Primary') commitMap(o.key,{rel:'Recognised'});
      }
      commitMap(key,p);audit('Updated mapping '+key+' '+Object.keys(p).join(','));
    },
    addMapping(labId,reg,rel){
      need('admin');const L=BYID[String(labId||'').trim().toUpperCase()];const E=eff();
      if(!L) throw new ApiError(400,'Laboratory ID not found.');if(!E.regMap[reg]) throw new ApiError(400,'Choose a regulator from the master.');
      const key=rkey(L.id,reg);const ex=E.list.find(r=>r.key===key);if(ex&&live(ex)) throw new ApiError(400,'This laboratory is already mapped to that regulator.');
      const row={_add:true,labId:L.id,reg,rel:'Recognised',recog:'Active',validity:'',ver:'Pending',vis:'Public',note:'',src:'Added by NABL Admin',deleted:false};
      commitMap(key,row);
      if(rel==='Primary') A.saveMapping(key,{rel:'Primary'});
      audit('Added mapping '+key);
    },
    removeMapping(key){need('admin');commitMap(key,{deleted:true});audit('Removed mapping '+key);},
    verifyAllPending(){need('admin');let n=0;for(const r of pendingRows()){commitMap(r.key,{ver:'Verified'});n++;}audit('Verified '+n+' pending mappings');return n;},

    /* ---------- Regulator (scope = the regulator on the session) ---------- */
    regProfile(){const s=need('regulator');const g=eff().regMap[s.reg];return {code:s.reg,name:g.name,type:g.type,level:g.level};},
    regDash(f){
      const s=need('regulator');const F=sanitize(f,false);const E=eff();
      const rows=(E.byReg.get(s.reg)||[]).filter(r=>live(r));
      const mine=rows.filter(r=>r.rel==='Primary'), assoc=rows.filter(r=>r.rel!=='Primary');
      const labs=applyF(mine.map(r=>BYID[r.labId]),F);const a=agg(labs);const ids=new Set(labs.map(l=>l.id));
      const all=agg(LABS);const pool=mine.map(r=>BYID[r.labId]);const types=typeBreak(applyF(pool,noType(F)));
      return {filters:F,reg:s.reg,agg:a,types,pending:mine.filter(r=>ids.has(r.labId)&&r.ver==='Pending').length,associated:assoc.length,
        scopePct:a.n?Math.round(a.withScope/a.n*100):0,
        mineTotal:mine.length,mineActive:agg(pool).active,mineTypes:typeBreak(pool),
        all:{n:all.n,active:all.active,states:Object.keys(all.state).filter(k=>k!=='Not stated').length,types:typeBreak(LABS)}};
    },
    myLabs(f,offset=0,limit=25){
      const s=need('regulator');const F=sanitize(f,false);const E=eff();
      const mine=(E.byReg.get(s.reg)||[]).filter(r=>live(r)&&r.rel==='Primary');
      const rowBy=new Map(mine.map(r=>[r.labId,r]));const pool=mine.map(r=>BYID[r.labId]);const labs=applyF(pool,F).sort(byName);
      return {total:labs.length,types:typeBreak(applyF(pool,noType(F))),rows:labs.slice(offset,offset+limit).map(L=>projOwn(L,rowBy.get(L.id)))};
    },
    /* Entire NABL laboratory database: PUBLIC-LEVEL fields for every laboratory (the same facts the public site shows),
       verified Public regulator tags, and the caller's own relationship to each lab. No contacts, notes, cycles or non-public tags. */
    allLabs(f,offset=0,limit=25){
      const s=need('regulator');const F=sanitize(f,false);const E=eff();
      const labs=applyF(LABS,F).sort(byName);const types=typeBreak(applyF(LABS,noType(F)));
      const relOf=id=>{const r=(E.byLab.get(id)||[]).find(x=>x.reg===s.reg&&live(x));return r?(r.rel==='Primary'?'primary':'recognised'):null;};
      const tagsOf=id=>(E.byLab.get(id)||[]).filter(r=>live(r)&&isVer(r)&&r.vis==='Public').sort((a,b)=>(b.rel==='Primary')-(a.rel==='Primary')).map(r=>({reg:r.reg,rel:r.rel}));
      return {total:labs.length,types,rows:labs.slice(offset,offset+limit).map(L=>({id:L.id,n:L.n,t:L.t,city:L.city,state:L.state,cn:L.cn,to:L.to,status:statusCat(L),tags:tagsOf(L.id),mine:relOf(L.id)}))};
    },
    associatedLabs(f,offset=0,limit=25){
      const s=need('regulator');const F=sanitize(f,false);const E=eff();
      const as=(E.byReg.get(s.reg)||[]).filter(r=>live(r)&&r.rel!=='Primary');
      const rowBy=new Map(as.map(r=>[r.labId,r]));const pool=as.map(r=>BYID[r.labId]);const labs=applyF(pool,F).sort(byName);
      return {total:labs.length,types:typeBreak(applyF(pool,noType(F))),rows:labs.slice(offset,offset+limit).map(L=>projShared(L,rowBy.get(L.id)))};
    },
    labDetail(id){
      const s=need('admin','regulator');const L=BYID[String(id)];
      if(s.role==='admin'){if(!L) throw new ApiError(404,'Laboratory not found.');return projAdmin(L);}
      const mine=L&&(eff().byLab.get(L.id)||[]).find(r=>r.reg===s.reg&&live(r));
      if(!mine) throw new ApiError(403,'You do not have access to this laboratory.'); // same answer for "does not exist"
      return mine.rel==='Primary'?projOwn(L,mine):projShared(L,mine);
    },
    saveNote(labId,text){ // a regulator may keep an internal note only on its own mapping
      const s=need('regulator');const row=(eff().byLab.get(String(labId))||[]).find(r=>r.reg===s.reg&&live(r));
      if(!row) throw new ApiError(403,'You do not have access to this laboratory.');
      commitMap(row.key,{note:String(text||'').slice(0,500)});audit('Note on '+row.key);
    },

    /* ---------- NABL Board (aggregates only; no laboratory-level access) ---------- */
    boardDash(f){
      need('board');const F0=sanitize(f,false,false),F={};if(F0.state)F.state=F0.state;if(F0.type)F.type=F0.type; // aggregate filters only: no lab-level narrowing
      const labs=applyF(LABS,F);const a=agg(labs);const ids=new Set(labs.map(l=>l.id));const rc=regCounts(ids);
      const mapped=new Set(eff().list.filter(live).map(r=>r.labId));
      const now=TODAY.getTime(),y1=now-365*864e5,y2=now-730*864e5;
      let last12=0,prev12=0;for(const L of labs){if(!L.fr)continue;const t=new Date(L.fr).getTime();if(t>=y1&&t<=now)last12++;else if(t>=y2&&t<y1)prev12++;}
      const stateKeys=Object.keys(a.state).filter(k=>k!=='Not stated');
      const top5=Object.values(a.state).sort((x,y)=>y-x).slice(0,5).reduce((p,c)=>p+c,0);
      return {filters:F,types:typeBreak(applyF(LABS,noType(F))),agg:a,regCounts:rc,mappedLabs:labs.filter(l=>mapped.has(l.id)).length,last12,prev12,states:stateKeys.length,totalStates:STATES.length,top5Share:a.n?Math.round(top5/a.n*100):0,
        activeRegs:eff().regs.filter(r=>r.status==='Active').length};
    },

    /* ---------- Reports (same scoping as the dashboards) ---------- */
    reportList(){
      const s=need('admin','regulator','board');
      return ({admin:[['master','Laboratory Master','Every laboratory with status, primary and recognised regulators.'],['regwise','Regulator-wise Labs','One row per laboratory–regulator relationship.'],['status','Accreditation Status','Laboratory type by accreditation status.'],['expiry','Expiry','Accreditations ending in the next 12 months, and those already past.'],['scope','Scope','Disciplines with laboratory counts by type.'],['dq','Data Quality','Record-level data issues found at import.']],
        regulator:[['mylabs','My Laboratories','Laboratories mapped to you.'],['accr','Accreditation','Status of your laboratories.'],['expiry','Expiry','Your laboratories with validity ending in the next 12 months, and those already past.'],['scope','Scope','Disciplines covered by your laboratories.'],['state','State-wise Distribution','Your laboratories by state and type.'],['assoc','Recognised / Associated Labs','Shared view of other regulators’ laboratories that you recognise.']],
        board:[['summary','Management Summary','Headline figures for the Board.'],['state','State-wise Distribution','Laboratories by state and type.'],['regwise','Regulator-wise Distribution','Laboratories per regulator (counts only).'],['trends','Accreditation Trends','Certificates issued and expiring by quarter.'],['growth','Growth Trends','Certificates issued in the last 12 months and the 12 before (activity, not net growth).'],['coverage','Geographic Coverage','States, cities and disciplines covered.']]}[s.role]);
    },
    report(key){
      const s=need('admin','regulator','board');
      if(!A.reportList().some(r=>r[0]===key)) throw new ApiError(403,'This report is not available to your role.');
      const tn=L=>TYPES[L.t].name;
      const rowsOf=L=>eff().byLab.get(L.id)||[];
      if(s.role==='admin'){
        const E=eff();
        if(key==='master') return {title:'Laboratory Master',cols:['Lab ID','Name','Type','City','State','PIN','Certificate','Valid from','Valid to','Status','Primary regulator','Recognised by','Disciplines'],
          rows:LABS.slice().sort(byName).map(L=>{const r=rowsOf(L).filter(live);const p=r.find(x=>x.rel==='Primary');return [L.id,L.n,tn(L),L.city,L.state,field(L,'p'),L.cn,L.fr,L.to,statusCat(L),p?p.reg+(isVer(p)?'':' (pending)'):'',r.filter(x=>x.rel!=='Primary').map(x=>x.reg).join('; '),discNames(L).join('; ')];})};
        if(key==='regwise') return {title:'Regulator-wise Labs',cols:['Regulator','Lab ID','Laboratory','State','Relationship','Recognition status','Validity','Verification','Visibility'],
          rows:E.list.filter(live).slice().sort((a,b)=>a.reg.localeCompare(b.reg)||BYID[a.labId].n.localeCompare(BYID[b.labId].n)).map(r=>[r.reg,r.labId,BYID[r.labId].n,BYID[r.labId].state,r.rel,r.recog,r.validity,r.ver,r.vis])};
        if(key==='status'){const m={};LABS.forEach(L=>{const k=tn(L);(m[k]=m[k]||{})[statusCat(L)]=((m[k]||{})[statusCat(L)]||0)+1;});return {title:'Accreditation Status',cols:['Laboratory type',...STATUS_CATS,'Total'],rows:Object.entries(m).map(([k,v])=>[k,...STATUS_CATS.map(c=>v[c]||0),Object.values(v).reduce((a,b)=>a+b,0)])};}
        if(key==='expiry') return expiryReport(LABS);
        if(key==='scope') return scopeReport(LABS);
        if(key==='dq') return {title:'Data Quality',cols:['Lab ID','Issue','Detail'],rows:RAW.dqrows.map(r=>[r[0],r[1],r[2]])};
      }
      if(s.role==='regulator'){
        const E=eff();const rows=(E.byReg.get(s.reg)||[]).filter(live);
        const mine=rows.filter(r=>r.rel==='Primary').map(r=>BYID[r.labId]);
        if(key==='mylabs') return {title:'My Laboratories — '+s.reg,cols:['Lab ID','Name','Type','City','State','Certificate','Valid to','Status','Verification of mapping'],
          rows:mine.slice().sort(byName).map(L=>{const r=rows.find(x=>x.labId===L.id);return [L.id,L.n,tn(L),L.city,L.state,L.cn,L.to,statusCat(L),r.ver];})};
        if(key==='accr'){const a=agg(mine);return {title:'Accreditation — '+s.reg,cols:['Status','Laboratories'],rows:STATUS_CATS.map(c=>[c,a.status[c]||0])};}
        if(key==='expiry') return expiryReport(mine,s.reg);
        if(key==='scope') return scopeReport(mine,s.reg);
        if(key==='state'){const m={};mine.forEach(L=>{const st=L.state||'Not stated';(m[st]=m[st]||{M:0,T:0,C:0,P:0,R:0})[L.t]++;});return {title:'State-wise Distribution — '+s.reg,cols:['State','Medical','Testing','Calibration','PTP','RMP','Total'],rows:Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k,v.M,v.T,v.C,v.P,v.R,v.M+v.T+v.C+v.P+v.R])};}
        if(key==='assoc'){const as=rows.filter(r=>r.rel!=='Primary');return {title:'Recognised / Associated Labs — '+s.reg,cols:['Lab ID','Name','Type','City','State','Certificate','Valid to','Status','Your recognition status','Other regulators (verified, shared)'],
          rows:as.map(r=>BYID[r.labId]).sort(byName).map(L=>{const me=as.find(x=>x.labId===L.id);return [L.id,L.n,tn(L),L.city,L.state,L.cn,L.to,statusCat(L),me.recog,otherTags(eff().byLab.get(L.id)||[],s.reg).map(t=>recName(t.reg)+(t.rel==='Primary'?' (primary)':'')).join('; ')];})};}
      }
      if(s.role==='board'){
        const d=A.boardDash(),a=d.agg;
        if(key==='summary') return {title:'Management Summary',cols:['Measure','Value'],rows:[['Total laboratories',a.n],['Active NABL accredited (valid or ending within 90 days)',a.active],['Ending within 90 days',a.expiring],['Validity passed / expired / suspended',a.lapsed],['States and UTs with a laboratory',d.states+' of '+d.totalStates],['Cities with a laboratory',a.cities],['Disciplines covered',a.discs],['Laboratories with a regulator relationship',d.mappedLabs],['Active regulators',d.activeRegs],['Certificates issued in last 12 months',d.last12],['Certificates issued in the 12 months before',d.prev12]]};
        if(key==='state'){const m={};LABS.forEach(L=>{const st=L.state||'Not stated';(m[st]=m[st]||{M:0,T:0,C:0,P:0,R:0})[L.t]++;});return {title:'State-wise Distribution',cols:['State','Medical','Testing','Calibration','PTP','RMP','Total'],rows:Object.entries(m).sort((x,y)=>Object.values(y[1]).reduce((p,c)=>p+c,0)-Object.values(x[1]).reduce((p,c)=>p+c,0)).map(([k,v])=>[k,v.M,v.T,v.C,v.P,v.R,v.M+v.T+v.C+v.P+v.R])};}
        if(key==='regwise') return {title:'Regulator-wise Distribution',cols:['Regulator','Laboratories (primary)','Laboratories (recognised / associated)','Total'],rows:Object.entries(d.regCounts).sort((x,y)=>(y[1].p+y[1].r)-(x[1].p+x[1].r)).map(([k,v])=>[k,v.p,v.r,v.p+v.r])};
        if(key==='trends'){const ks=[...new Set([...Object.keys(a.iss),...Object.keys(a.exp).filter(k=>k!=='Passed')])].sort();return {title:'Accreditation Trends',cols:['Quarter','Certificates issued (current certificates)','Validity ending'],rows:ks.map(k=>[k,a.iss[k]||0,a.exp[k]||0]).concat([['Validity already passed','',a.exp.Passed||0]])};}
        if(key==='growth') return {title:'Growth Trends',cols:['Period','Certificates issued'],rows:[['Current certificates issued in the last 12 months',d.last12],['Current certificates issued in the 12 months before that',d.prev12],['Note','Not a measure of net growth: superseded certificates are not in the extract. Net growth needs periodic snapshots.']]};
        if(key==='coverage') return {title:'Geographic Coverage',cols:['State','Laboratories','Cities'],rows:(()=>{const m={};LABS.forEach(L=>{const st=L.state||'Not stated';const o=m[st]||(m[st]={n:0,c:new Set()});o.n++;if(L.city)o.c.add(L.city.toLowerCase());});return Object.entries(m).sort((x,y)=>y[1].n-x[1].n).map(([k,v])=>[k,v.n,v.c.size]);})()};
      }
      throw new ApiError(404,'Report not found.');
    }
  };
  function expiryReport(labs,reg){
    const lim=new Date(TODAY.getTime()+365*864e5).toISOString().slice(0,10);
    const sel=labs.filter(L=>L.to&&L.to<=lim).sort((a,b)=>a.to.localeCompare(b.to));
    return {title:'Expiry'+(reg?' — '+reg:''),cols:['Lab ID','Name','Type','City','State','Certificate','Valid to','Status'],rows:sel.map(L=>[L.id,L.n,TYPES[L.t].name,L.city,L.state,L.cn,L.to,statusCat(L)])};
  }
  function scopeReport(labs,reg){
    const m={};labs.forEach(L=>L.d.forEach(i=>{const k=DICT.disc[i];const o=m[k]||(m[k]={M:0,T:0,C:0,P:0,R:0});o[L.t]++;}));
    return {title:'Scope'+(reg?' — '+reg:''),cols:['Discipline','Medical','Testing','Calibration','PTP','RMP','Total'],rows:Object.entries(m).sort((a,b)=>Object.values(b[1]).reduce((p,c)=>p+c,0)-Object.values(a[1]).reduce((p,c)=>p+c,0)).map(([k,v])=>[k,v.M,v.T,v.C,v.P,v.R,v.M+v.T+v.C+v.P+v.R])};
  }
  function commitMap(key,patch){
    const cur=Store.mem.mapOv[key]||{};Store.mem.mapOv[key]={...cur,...patch};CACHE=null;Store.emit();
    if(Store.db)try{Store.db.collection('mapping').doc(key).set(JSON.parse(JSON.stringify(Store.mem.mapOv[key]))).catch(()=>{});}catch(e){}
  }
  A.csv=r=>toCSV([r.cols,...r.rows.map(row=>row.map(csvSafe))]);
  return Object.freeze(A);
})();
S.role=API.session()?{r:API.session().role}:{r:'public'};
function persistUser(){try{localStorage.setItem('fal_user',JSON.stringify({saved:[...S.saved],compare:S.compare,demo:Demo.on}));}catch(e){}}
