/* ===== App state ===== */
const S={route:'',q:'',P:null,F:null,origin:null,sort:'relevance',page:1,compare:[],saved:new Set(),role:{r:'public'},results:[],mapMode:'markers',userLoc:null,sel:null};
function newF(){return {types:new Set(),state:null,city:null,validity:null,service:new Set(),fac:new Set(),regs:new Set(),integrated:false,disc:new Set(),grp:new Set(),scope:new Set(),includeNA:false,radius:null,price:null,tat:null,home:false,online:false,digital:false};}
S.F=newF();
try{const v=JSON.parse(localStorage.getItem('fal_user')||'{}');if(v.saved)S.saved=new Set(v.saved);if(v.compare)S.compare=v.compare.filter(id=>BYID[id]);if(v.role)S.role=v.role;if(v.demo)Demo.on=true;}catch(e){}
function persistUser(){try{localStorage.setItem('fal_user',JSON.stringify({saved:[...S.saved],compare:S.compare,role:S.role,demo:Demo.on}));}catch(e){}}
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const APP=()=>$('#app');
const typeTag=t=>`<span class="typetag" style="--c:${TYPES[t].c}">${TYPES[t].name}</span>`;
const statusBadge=st=>`<span class="badge b-${st.k}" title="${esc(st.src)}">${esc(st.label)}</span>`;
const NA='<span class="na">Information not available</span>';
function field(L,k){const o=OVERRIDES[L.id];return (o&&o.fields&&o.fields[k]!=null)?o.fields[k]:L[k];}
function go(h){location.hash=h;}

/* ===== Header / nav ===== */
function header(){
  const r=S.route.split('?')[0];
  const cur=p=>r===p||r.startsWith(p+'/')?'aria-current="page"':'';
  const roleName={public:'Citizen / public',lab:'Laboratory',officer:'NABL technical officer',admin:'NABL admin',regulator:'Regulator'}[S.role.r];
  return `<a class="skip" href="#main">Skip to content</a>
  ${Demo.on?'<div class="demo-banner" role="note">Demo enrichment is on: price, turnaround time and collection/booking facilities shown with a dashed amber tag are generated mock values, not NABL data. Switch off in Settings.</div>':''}
  <header class="top"><div class="wrap">
    <a class="brand" href="#/"><span class="seal" aria-hidden="true">NABL</span><span><b>Find a Lab</b><span>Accredited laboratory discovery, India</span></span></a>
    <nav class="nav" aria-label="Main">
      <a href="#/search" ${cur('#/search')}>Search</a>
      <a href="#/scope" class="hidet" ${cur('#/scope')}>Scope check</a>
      <a href="#/states" class="hidem" ${cur('#/states')}>By state</a>
      <a href="#/services" class="hidem" ${cur('#/services')}>By service</a>
      <a href="#/compare" class="hidet" ${cur('#/compare')}>Compare${S.compare.length?`<span class="cnt">${S.compare.length}</span>`:''}</a>
      <a href="#/login" ${cur('#/login')}${cur('#/portal')}><span class="rolepill">${esc(roleName)}</span></a>
    </nav></div></header>`;
}
function bottomNav(){
  const r=S.route.split('?')[0];const c=p=>r.startsWith(p)?'aria-current="page"':'';
  const ic=d=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${d}</svg>`;
  return `<nav class="bnav" aria-label="Quick">
   <a href="#/" ${r==='#/'||r===''?'aria-current="page"':''}>${ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}Search</a>
   <a href="#/search?view=map" ${c('#/search')}>${ic('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>')}Map</a>
   <a href="#/compare" ${c('#/compare')}>${ic('<path d="M4 6h7v12H4zM13 6h7v12h-7z"/>')}Compare${S.compare.length?' ('+S.compare.length+')':''}</a>
   <a href="#/saved" ${c('#/saved')}>${ic('<path d="M6 3h12v18l-6-4-6 4z"/>')}Saved</a>
   <a href="#/login" ${c('#/login')||c('#/portal')}>${ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>')}Profile</a></nav>`;
}
function compareTray(){
  if(!S.compare.length||S.route.startsWith('#/compare')||S.route.startsWith('#/dash')) return '';
  return `<div class="cmptray" role="region" aria-label="Compare tray"><span>${S.compare.length} of 4 selected</span><button class="btn small ghost" data-act="cmpclear">Clear</button><a class="btn small" href="#/compare">Compare labs</a></div>`;
}

/* ===== Home ===== */
function viewHome(){
  const cnt=t=>LABS.filter(l=>l.t===t).length.toLocaleString('en-IN');
  const valid=LABS.filter(l=>accStatus(l).k==='valid'||accStatus(l).k==='warn').length;
  const top=(()=>{const c={};for(const L of LABS){for(const i of L.g){const k=DICT.grp[i];c[k]=(c[k]||0)+1;}}return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12);})();
  const topMed=(()=>{const c={};for(const L of LABS)if(L.t==='M')for(const i of L.d){const k=DICT.disc[i];c[k]=(c[k]||0)+1;}return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6);})();
  const cities=Object.values(CITY_INDEX).sort((a,b)=>b.n-a.n).slice(0,12);
  const ex=['Blood test near me','Food testing lab in Delhi','Water testing under ₹1000','Calibration lab for pressure gauge','Microbiology testing near Mumbai','NABL accredited pathology lab near Jaipur','Proficiency testing provider for microbiology','Reference material producer for metals','Lead in drinking water'];
  return `<main id="main">
  <section class="hero"><div class="wrap">
    <div>
      <h1>Find a lab near you</h1>
      <p class="lead">Search ${LABS.length.toLocaleString('en-IN')} NABL-listed medical, testing and calibration laboratories, proficiency testing providers and reference material producers across India, and check what each one is accredited to do.</p>
      <form class="searchbox" role="search" data-act="homesearch"><label class="sr" for="hq">What are you looking for?</label>
        <input id="hq" type="search" placeholder="What are you looking for? e.g. water testing in Pune" autocomplete="off" value="">
        <button class="btn primary" type="submit">Search</button></form>
      <div class="quick">
        <button type="button" data-act="nearme">📍 Use my location</button>
        <button type="button" data-act="focus" data-ph="City or 6-digit PIN code, e.g. 302004">Search by city / PIN</button>
        <button type="button" data-go="#/services">Search by service</button>
        <button type="button" data-act="focus" data-ph="Laboratory name, Lab ID (T-0119) or certificate no.">Search by lab name</button>
        <button type="button" data-go="#/scope">Search by accreditation scope</button>
      </div>
      <div class="examples">Try: ${ex.map(e=>`<button type="button" data-q="${esc(e)}">${esc(e)}</button>`).join(' · ')}</div>
    </div>
    <div><canvas id="herocv" aria-label="Dot map of laboratory locations in India, coloured by laboratory type" role="img"></canvas>
      <div class="legend">${Object.entries(TYPES).map(([k,v])=>`<span><span class="dot" style="background:${{M:'#FF8FB0',T:'#7FC3FF',C:'#C1AEFF',P:'#FFC766',R:'#6FE0CC'}[k]}"></span>${v.short}</span>`).join('')}</div></div>
  </div></section>
  <section class="band"><div class="wrap">
    <h2>Explore by laboratory type</h2><p class="muted">Counts are taken from the NABL master extract and the centralized list of integrated labs. ${valid.toLocaleString('en-IN')} records have an accreditation validity date on or after today.</p>
    <div class="grid5">${Object.entries(TYPES).map(([k,v])=>`<button class="typecard" style="--c:${v.c}" data-go="#/search?t=${k}"><span class="count">${cnt(k)}</span><b>${v.plural}</b><span>${v.desc}</span></button>`).join('')}</div>
  </div></section>
  <section class="band"><div class="wrap cols2">
    <div><h2>Explore by location</h2><p class="muted">Cities with the most listed laboratories.</p>
      <div class="chips">${cities.map(c=>`<button class="chip" data-go="#/search?city=${encodeURIComponent(c.name)}">${esc(c.name)}<small>${c.n}</small></button>`).join('')}</div>
      <p style="margin-top:14px"><a class="btn" href="#/states">Open the state explorer</a></p></div>
    <div><h2>Popular service areas</h2><p class="muted">Most frequent accredited scope groups in the dataset.</p>
      <div class="chips">${top.map(([k,n])=>`<button class="chip" data-grp="${esc(k)}">${esc(k)}<small>${n}</small></button>`).join('')}
      ${topMed.map(([k,n])=>`<button class="chip" data-disc="${esc(k)}">${esc(k)}<small>${n}</small></button>`).join('')}</div></div>
  </div></section>
  <section class="band"><div class="wrap">
    <h2>Accredited lab is not the same as accredited test</h2>
    <p class="muted" style="max-width:75ch">NABL accredits a laboratory for a defined scope. A lab can offer tests that fall outside that scope. Every result on this portal says which of these applies.</p>
    <div class="explain">
      <div><span class="badge b-valid">Exact scope match</span><p>The requested parameter appears in the lab's itemised scope. Needs parameter-level scope data, which this snapshot does not yet contain.</p></div>
      <div><span class="badge b-valid">Scope category match</span><p>The lab's accredited group or sub-group (for example Water › Drinking Water) covers your request.</p></div>
      <div><span class="badge b-warn">Related scope</span><p>Only a broader discipline or group matches. Confirm the specific test in the scope document.</p></div>
      <div><span class="badge b-plain">Scope data not available</span><p>The dataset holds no scope columns for this record, so nothing is inferred.</p></div>
    </div>
  </div></section>
  <section class="band"><div class="wrap cols2">
    <div class="panel"><h3>For laboratories</h3><p class="muted">See your public profile as citizens see it, request corrections to contact or location details, and track each request through NABL review. Accreditation and scope stay locked to NABL.</p><a class="btn" href="#/login">Sign in as a laboratory</a></div>
    <div class="panel"><h3>For regulators</h3><p class="muted">Filter labs by sector, validity and recognition (FSSAI, EIC, APEDA and others from the integrated labs list), see geographic spread and export results.</p><a class="btn" href="#/login">Open the regulator view</a></div>
  </div></section>
  <section class="band"><div class="wrap"><h2>Questions</h2>
    ${[['Where does this data come from?','Two spreadsheets: the NABL master extract (Testing, Medical, Calibration, PTP and RMP sheets) and the centralized list of integrated labs updated on 15 September 2026, which adds regulator recognitions. Each profile shows its source and dataset date.'],
      ['Why is price or turnaround time missing?','Neither spreadsheet contains price, turnaround time, home collection or booking data, so the portal shows “Information not available” rather than guessing. A clearly labelled demo mode can simulate these fields for walkthroughs.'],
      ['How exact are the map positions?','The dataset has no coordinates. Positions are placed at the PIN code centroid where known, otherwise the PIN area, city or state centroid. Each profile states which was used.'],
      ['What does “validity end date passed” mean?','The record’s “valid to” date in the extract is before today. The lab may have renewed since the extract was taken, so confirm on the NABL certificate before relying on it.'],
      ['How do I correct a record?','Use “Report incorrect information” on any profile. Reports go to the NABL review queue with an audit trail; nothing is published until approved.']].map(([q,a])=>`<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join('')}
  </div></section>
  <footer><div class="wrap">Prototype for NABL / QCI demonstration. Data snapshot: NABL master extract and Centralized list (last updated 15.09.2026). State boundaries are simplified for display and must be replaced with Survey of India–approved boundaries before public release. Listing here is not an endorsement beyond the stated accreditation. <a href="#/about">Data &amp; methodology</a></div></footer>
  </main>`;
}

/* ===== Location helpers ===== */
function askLocation(then){
  if(!navigator.geolocation){locFallback(then);return;}
  toast('Requesting your location…');
  navigator.geolocation.getCurrentPosition(p=>{S.userLoc={la:p.coords.latitude,lo:p.coords.longitude,label:'your location'};then&&then();},()=>locFallback(then),{timeout:8000});
}
function locFallback(then){
  modal(`<h2>Where should we search?</h2><p class="muted">Location access isn't available. Enter your city, PIN code or locality to find laboratories near you.</p>
  <form data-act="locform"><div class="field"><span>City or PIN code</span><input type="text" id="locin" list="citylist" placeholder="e.g. Jaipur or 110016" required></div>
  <datalist id="citylist">${Object.values(CITY_INDEX).sort((a,b)=>b.n-a.n).slice(0,400).map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
  <div class="row"><button class="btn primary">Use this location</button><button type="button" class="btn" data-act="closemodal">Search all India</button></div></form>`,m=>{
    m.querySelector('form').onsubmit=e=>{e.preventDefault();const v=m.querySelector('#locin').value.trim();const o=resolvePlace(v);
      if(!o){toast('Location not recognised — try a city name or PIN code');return;} S.userLoc=o;closeModal();then&&then();};
  });
}
function resolvePlace(v){
  v=(v||'').trim(); if(!v) return null;
  if(/^\d{6}$/.test(v)){ if(PIN_INDEX[v]) return {la:PIN_INDEX[v][0],lo:PIN_INDEX[v][1],label:'PIN '+v};
    const near=LABS.filter(l=>l.p&&l.p.slice(0,3)===v.slice(0,3)&&l.la!=null); if(near.length) return {la:near.reduce((a,b)=>a+b.la,0)/near.length,lo:near.reduce((a,b)=>a+b.lo,0)/near.length,label:'PIN area '+v.slice(0,3)+'xxx'}; return null;}
  const k=CITY_ALIAS[v.toLowerCase()]||v.toLowerCase(); const c=CITY_INDEX[k]; if(c) return {la:c.la,lo:c.lo,label:c.name};
  return null;
}

/* ===== Search ===== */
function doSearch(){
  const P=S.P=parseQuery(S.q);
  let origin=null;
  if(P.pin){const o=resolvePlace(P.pin); if(o) origin={...o,fromQuery:true};}
  if(!origin&&P.city){const c=CITY_INDEX[P.city.toLowerCase()]; origin={la:c.la,lo:c.lo,label:c.name,fromQuery:true};}
  if(!origin&&(P.near||S.F.radius)&&S.userLoc) origin={...S.userLoc};
  if(!origin&&S.userLoc&&S.F.radius) origin={...S.userLoc};
  S.origin=origin;
  const R=runSearch(P,S.F,origin);
  let sort=S.sort; if(sort==='relevance'&&origin&&!P.disc.length&&!P.grp.length) sort='distance';
  if(P.fastest&&Demo.on&&S.sort==='relevance') sort='tat';
  S.results=sortResults(R,sort);
  return S.results;
}
function viewSearch(params){
  if(params.get('q')!==null&&params.get('q')!==S.q){S.q=params.get('q')||'';S.F=newF();S.page=1;}
  if(params.get('t')){S.F.types=new Set(params.get('t').split(','));}
  if(params.get('state')) S.F.state=params.get('state');
  if(params.get('city')) S.F.city=params.get('city');
  if(params.get('grp')){const i=DICT.grp.indexOf(params.get('grp'));if(i>=0)S.F.grp=new Set([i]);}
  if(params.get('disc')){const i=DICT.disc.indexOf(params.get('disc'));if(i>=0)S.F.disc=new Set([i]);}
  const R=doSearch(), P=S.P;
  Store.logEvent({type:'search',q:S.q,n:R.length,zero:R.length===0,types:[...(S.F.types.size?S.F.types:P.types)],state:S.F.state||P.state||'',city:P.city||S.F.city||'',filters:activeFilterNames()});
  const view=params.get('view');
  return `<div class="resbar"><form role="search" data-act="resform"><label class="sr" for="rq">Search</label><input id="rq" type="search" value="${esc(S.q)}" placeholder="What are you looking for?"><button class="btn primary">Search</button></form>
    <button class="btn small" data-act="nearme2">📍 ${S.userLoc?'Near '+esc(S.userLoc.label):'Use my location'}</button>
    <button class="btn small viewtoggle" data-act="togglefilters">Filters${activeFilterNames().length?' ('+activeFilterNames().length+')':''}</button>
    <button class="btn small viewtoggle" data-act="togglemap">${view==='map'?'List':'Map'}</button>
    <label class="small row" style="gap:6px;margin-left:auto">Sort <select id="sort" style="width:auto">${[['relevance','Relevance'],['distance','Distance'],['scope','Scope match'],['validity','Accreditation validity (latest)'],['recent','Recently amended'],['name','Name'],['priceAsc','Price: low to high'],['priceDesc','Price: high to low'],['tat','Turnaround: fastest']].map(([k,v])=>`<option value="${k}" ${S.sort===k?'selected':''} ${(!Demo.on&&/price|tat/i.test(k))||(k==='distance'&&!S.origin)?'disabled':''}>${v}${!Demo.on&&/price|tat/i.test(k)?' (no data)':''}</option>`).join('')}</select></label></div>
  <div class="results-layout ${view==='map'?'showmap':''}" id="rl">
    <aside class="filters" aria-label="Filters">${filtersHTML(R)}</aside>
    <div class="list" id="list">${resultsHTML(R)}</div>
    <div class="mapcol"><div id="map" style="position:absolute;inset:0"></div>
      <div class="mapctl"><button class="btn small" data-act="zin" aria-label="Zoom in">+</button><button class="btn small" data-act="zout" aria-label="Zoom out">−</button><button class="btn small" data-act="zreset">India</button>
      <button class="btn small ${S.mapMode==='markers'?'on':''}" data-act="mmode" data-m="markers">Markers</button><button class="btn small ${S.mapMode==='density'?'on':''}" data-act="mmode" data-m="density">Density by state</button></div>
      <div class="mapnote" id="mapnote"></div></div>
  </div>`;
}
function activeFilterNames(){const F=S.F,a=[];if(F.types.size)a.push('type');if(F.state)a.push('state');if(F.city)a.push('city');if(F.radius)a.push('radius');if(F.validity)a.push('validity');if(F.service.size)a.push('service mode');if(F.fac.size)a.push('facility');if(F.regs.size)a.push('recognition');if(F.integrated)a.push('integrated');if(F.disc.size)a.push('discipline');if(F.grp.size)a.push('group');if(F.scope.size)a.push('scope level');if(F.includeNA)a.push('include no-scope');if(F.price)a.push('price');if(F.tat)a.push('tat');if(F.home)a.push('home collection');if(F.online)a.push('online booking');if(F.digital)a.push('digital report');return a;}
function filtersHTML(R){
  const F=S.F,P=S.P;
  const cnt=(fn)=>{const c={};for(const r of R){for(const k of fn(r.L)){c[k]=(c[k]||0)+1;}}return c;};
  // type counts ignoring type filter
  const allT=runSearch(P,{...F,types:new Set()},S.origin);const tc={};for(const r of allT)tc[r.L.t]=(tc[r.L.t]||0)+1;
  const effTypes=F.types.size?F.types:P.types;
  const sc=cnt(L=>[L.state]); const dc=cnt(L=>L.d.map(i=>i)); const gc=cnt(L=>L.g.map(i=>i));
  const regc=cnt(L=>L.ig?L.ig.regs:[]);
  const svc=cnt(L=>[L.sv||'Not stated']);
  const chk=(name,val,label,on,n,dis)=>`<label class="chk ${dis?'dis':''}"><input type="checkbox" data-f="${name}" value="${esc(val)}" ${on?'checked':''} ${dis?'disabled':''}><span>${label}</span>${n!=null?`<span class="n">${n}</span>`:''}</label>`;
  const topD=Object.entries(dc).sort((a,b)=>b[1]-a[1]).slice(0,12), topG=Object.entries(gc).sort((a,b)=>b[1]-a[1]).slice(0,14);
  const demo=Demo.on;
  return `<div class="row" style="justify-content:space-between"><h3 style="margin:0">Filters</h3><button class="btn small ghost" data-act="clearf">Clear all</button></div>
  <h4>Laboratory type</h4>${Object.entries(TYPES).map(([k,v])=>chk('types',k,v.short==='PTP'?'Proficiency testing (PTP)':v.short==='RMP'?'Reference materials (RMP)':v.short,effTypes.has(k),tc[k]||0)).join('')}
  ${P.types.size&&!F.types.size?'<p class="note">Type inferred from your search.</p>':''}
  <h4>Location</h4>
  <div class="field"><span>State</span><select data-f="state"><option value="">All states</option>${STATES.map(s=>`<option ${F.state===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
  <div class="field"><span>City</span><select data-f="city"><option value="">All cities</option>${Object.values(CITY_INDEX).filter(c=>!F.state||c.state===F.state).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option ${F.city===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
  <div class="field"><span>PIN code or place</span><div class="row" style="flex-wrap:nowrap"><input type="text" id="fplace" placeholder="e.g. 400076"><button class="btn small" data-act="setplace">Set</button></div></div>
  <div class="field"><span>Radius ${S.origin?'from '+esc(S.origin.label):'(needs a location)'}</span><select data-f="radius" ${!S.origin&&!S.userLoc?'disabled':''}>${[['','Default'],[5,'5 km'],[10,'10 km'],[25,'25 km'],[50,'50 km'],[100,'100 km'],[250,'250 km'],[99999,'Anywhere in India']].map(([v,l])=>`<option value="${v}" ${String(F.radius||'')===String(v)?'selected':''}>${l}</option>`).join('')}</select></div>
  <h4>Accreditation</h4>
  ${chk('validity','valid','Validity current (per dataset)',F.validity==='valid')}
  ${chk('validity','lapse','Validity end date passed / suspended',F.validity==='lapse')}
  <p class="note">Status is read from the dataset's “valid to” date and the integrated labs list. Confirm on the NABL certificate.</p>
  ${(P.disc.length||P.grp.length||P.sub.length)?`<h4>Scope match</h4>${[['category','Scope category match'],['related','Related scope']].map(([k,l])=>chk('scope',k,l,F.scope.has(k),R.filter(r=>r.sm&&r.sm.lvl===k).length)).join('')}${chk('includeNA','1','Include labs with no scope data',F.includeNA)}`:''}
  ${topD.length?`<h4>Discipline</h4>${topD.map(([i,n])=>chk('disc',i,esc(DICT.disc[i]),F.disc.has(+i),n)).join('')}`:''}
  ${topG.length?`<h4>Scope group</h4>${topG.map(([i,n])=>chk('grp',i,esc(DICT.grp[i]),F.grp.has(+i),n)).join('')}`:''}
  <h4>Regulator recognition</h4><p class="note">From the centralized list of integrated labs.</p>
  ${chk('integrated','1','Integrated with a regulator',F.integrated,R.filter(r=>r.L.ig).length)}
  ${Object.keys(REGNAME).map(k=>chk('regs',k,k,F.regs.has(k),regc[k]||0)).join('')}
  <h4>Service mode</h4>${Object.entries(svc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,n])=>chk('service',k==='Not stated'?'':k,esc(k),F.service.has(k==='Not stated'?'':k),n)).join('')}
  <h4>Facility type</h4>${chk('fac','pf','Permanent facility',F.fac.has('pf'),R.filter(r=>r.L.pf).length)}${chk('fac','sf','Site (on-site) testing',F.fac.has('sf'),R.filter(r=>r.L.sf).length)}${chk('fac','mf','Mobile facility',F.fac.has('mf'),R.filter(r=>r.L.mf).length)}
  <h4>Price, turnaround and services ${demo?'<span class="badge b-demo">demo data</span>':''}</h4>
  ${demo?'':'<p class="note">Not in the current dataset. These filters activate when price and TAT data is imported (or in demo mode).</p>'}
  <div class="field"><span>Price</span><select data-f="price" ${demo?'':'disabled'}>${[['','Any'],['0-500','Under ₹500'],['500-1000','₹500–₹1,000'],['1000-2500','₹1,000–₹2,500'],['2500-5000','₹2,500–₹5,000'],['5000-9999999','₹5,000+']].map(([v,l])=>`<option value="${v}" ${F.price&&F.price.join('-')===v?'selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field"><span>Turnaround time</span><select data-f="tat" ${demo?'':'disabled'}>${[['','Any'],[12,'Same day'],[24,'Within 24 hours'],[48,'1–2 days'],[120,'3–5 days'],[168,'5–7 days']].map(([v,l])=>`<option value="${v}" ${String(F.tat||'')===String(v)?'selected':''}>${l}</option>`).join('')}</select></div>
  ${chk('home','1','Home collection available',F.home,null,!demo)}${chk('online','1','Online booking',F.online,null,!demo)}${chk('digital','1','Digital report',F.digital,null,!demo)}
  <div style="height:30px"></div><button class="btn primary viewtoggle" data-act="togglefilters" style="width:100%">Show ${R.length} results</button>`;
}
function interpHTML(P){
  const t=[];
  if(P.types.size)t.push(...[...P.types].map(k=>'Type: '+TYPES[k].short));
  P.labels.forEach(l=>t.push('Service: '+l));
  if(P.inst)t.push('Instrument: '+P.inst);
  if(P.param)t.push('Parameter: '+P.param);
  if(P.city)t.push('Near: '+P.city+' ('+(S.F.radius||P.radius||40)+' km)');
  if(P.state)t.push('State: '+P.state);
  if(P.pin)t.push('PIN: '+P.pin);
  if(P.near)t.push(S.userLoc?'Near: your location':'Near me');
  if(P.radius)t.push('Radius: '+P.radius+' km');
  if(P.fastest)t.push('Sort: fastest TAT');
  if(P.home)t.push('Home collection');
  if(P.priceMax)t.push('Max price: ₹'+P.priceMax.toLocaleString('en-IN'));
  if(P.text)t.push('Text: “'+P.text+'”');
  if(!t.length) return '';
  const warn=[];
  if(P.priceMax&&!Demo.on) warn.push('Price is not in the dataset, so the ₹ limit could not be applied.');
  if((P.fastest)&&!Demo.on) warn.push('Turnaround time is not in the dataset, so “fastest” could not be applied.');
  if(P.home&&!Demo.on) warn.push('Home collection is not in the dataset, so it could not be applied.');
  if(P.param) warn.push(`Scope in this dataset is recorded at group / sub-group level. “${esc(P.param)}” itself cannot be confirmed as an exact scope match; open the lab's scope document to check.`);
  if(P.near&&!S.userLoc&&!P.city) warn.push('Location not set — results are across India. <button class="btn small" data-act="nearme2">Use my location</button>');
  return `<div class="interp" aria-live="polite"><b>We understood:</b> ${t.map(x=>`<span class="tok">${esc(x)}</span>`).join('')}
    ${warn.map(w=>`<div class="small" style="margin-top:6px;color:var(--amber)">${w}</div>`).join('')}</div>`;
}
function cardHTML(r){
  const {L,dist,sm,why,dv,status}=r;const inCmp=S.compare.includes(L.id);
  const disc=discNames(L).slice(0,4), grp=grpNames(L).slice(0,4);
  return `<article class="card ${S.sel===L.id?'sel':''}" style="--c:${TYPES[L.t].c}" data-id="${L.id}">
   <div class="meta">${typeTag(L.t)}${statusBadge(status)}${sm?`<span class="badge ${SCOPE_LBL[sm.lvl][1]}">${SCOPE_LBL[sm.lvl][0]}</span>`:''}${L.ig?`<span class="badge b-info">Regulator-integrated</span>`:''}</div>
   <h3><a href="#/lab/${L.id}/${L.slug}">${esc(L.n)}</a></h3>
   <div class="meta">📍 ${esc([L.city,L.state].filter(Boolean).join(', '))||'Location not in dataset'} ${dist!=null?`<b style="color:var(--text)">${fmtKm(dist)} away</b>${L.gp>1?' <span title="Position approximated">(approx.)</span>':''}`:''} <span>${esc(L.id)} · Cert ${esc(L.cn)}</span></div>
   <div class="kv">
     <div><b>${sm&&sm.hits&&sm.hits.length?'Matched scope':'Key scope areas'}</b>${sm&&sm.hits&&sm.hits.length?sm.hits.slice(0,2).map(h=>'✓ '+esc(h.replace(/^(Sub-group|Group|Discipline): /,''))).join('<br>'):(L.t==='M'?disc:grp.length?grp:disc).slice(0,3).map(esc).join(', ')||NA}</div>
     <div><b>Valid until</b>${L.to?fmtDate(L.to):NA}</div>
     <div><b>Price / TAT</b>${dv?`From ₹${dv.price.toLocaleString('en-IN')} · ${tatLabel(dv.tatH)} <span class="badge b-demo">demo</span>`:NA}</div>
     <div><b>${L.t==='M'?'Home collection':'Sample pickup'}</b>${dv?((L.t==='M'?dv.home:dv.pickup)?'✓ Available':'Not available')+' <span class="badge b-demo">demo</span>':NA}</div>
   </div>
   <details><summary class="small" style="cursor:pointer;font-weight:650">Why this result matches</summary><ul class="why">${why.map(w=>typeof w==='string'?`<li>${esc(w)}</li>`:`<li class="w">${esc(w.t)}</li>`).join('')}</ul></details>
   <div class="acts" style="margin-top:8px"><a class="btn small primary" href="#/lab/${L.id}/${L.slug}">View details</a>
    <button class="btn small ${inCmp?'on':''}" data-act="cmp" data-id="${L.id}" aria-pressed="${inCmp}">${inCmp?'✓ In compare':'Compare'}</button>
    <button class="btn small ghost" data-act="showonmap" data-id="${L.id}">Show on map</button>
    <button class="btn small ghost" data-act="save" data-id="${L.id}" aria-pressed="${S.saved.has(L.id)}">${S.saved.has(L.id)?'★ Saved':'☆ Save'}</button></div>
  </article>`;
}
function resultsHTML(R){
  const P=S.P; const per=20; const hasScopeQ=P.disc.length||P.grp.length||P.sub.length;
  let head=`${interpHTML(P)}<div class="row" style="justify-content:space-between"><h2 style="font-size:18px;margin:0">${R.length.toLocaleString('en-IN')} ${R.length===1?'laboratory':'laboratories'}${S.origin?' near '+esc(S.origin.label):''}</h2>
    ${R.length?'<button class="btn small ghost" data-act="exportres">Export CSV</button>':''}</div>`;
  if(!R.length) return head+zeroHTML(P);
  const slice=R.slice(0,S.page*per);
  let body='';
  if(hasScopeQ){
    const groups=[['exact','Exact scope matches'],['category','Scope category matches'],['related','Related scope — confirm the specific test'],['na','Labs of this type with no scope data in the dataset']];
    for(const [k,t] of groups){const g=slice.filter(r=>r.sm&&r.sm.lvl===k);if(g.length)body+=`<div class="groupttl">${t} <span class="muted small">(${R.filter(r=>r.sm&&r.sm.lvl===k).length})</span></div>`+g.map(cardHTML).join('');}
    const o=slice.filter(r=>!r.sm||r.sm.lvl==='none'); if(o.length) body+=`<div class="groupttl">Name matches</div>`+o.map(cardHTML).join('');
    if(!R.some(r=>r.sm&&r.sm.lvl==='exact')) body=`<p class="small muted" style="margin:6px 0 0">No exact parameter-level matches: this dataset records scope at group and sub-group level only.</p>`+body;
  } else body=slice.map(cardHTML).join('');
  return head+body+(R.length>slice.length?`<div class="pager"><button class="btn" data-act="more">Show more (${(R.length-slice.length).toLocaleString('en-IN')} remaining)</button></div>`:'');
}
function zeroHTML(P){
  const rad=S.F.radius||P.radius||(S.origin?40:null);
  const exact=(P.disc.length||P.grp.length)?`No laboratory with a matching NABL scope was found${rad&&S.origin?' within '+rad+' km of '+esc(S.origin.label):''}.`:'No laboratory matched every condition.';
  return `<div class="empty"><h3>We couldn't find an exact match</h3><p>${exact}</p><div class="row">
   ${S.origin&&rad?`<button class="btn" data-act="radius" data-v="${rad*2}">Expand to ${rad*2} km</button><button class="btn" data-act="radius" data-v="99999">Search across India</button>`:''}
   ${activeFilterNames().length?'<button class="btn" data-act="clearf">Remove all filters</button>':''}
   ${S.F.scope.size?'<button class="btn" data-act="clearscope">Remove scope-level filter</button>':''}
   ${(P.disc.length||P.grp.length)&&!S.F.includeNA?'<button class="btn" data-act="includena">Include labs without scope data</button>':''}
   ${P.state||S.F.state?'<button class="btn" data-act="allindia">Search all states</button>':''}</div>
   ${!P.labels.length?`<p style="margin-top:12px">The words “${esc(P.text||S.q)}” didn't match a laboratory name, city or scope category. Try a service or place, or browse:</p><div class="row">${['Water testing','Food testing','Blood test','Pressure calibration','Microbiology','Cement testing'].map(l=>`<button class="chip" data-q="${l}">${l}</button>`).join(' ')}</div><div class="row" style="margin-top:10px"><a class="btn small" href="#/services">Browse by service</a><a class="btn small" href="#/states">Browse by state</a><a class="btn small" href="#/scope">Scope check</a></div>`:''}
   ${P.labels.length?`<p class="small muted" style="margin-top:12px">Related searches: ${[...new Set(P.labels)].map(l=>`<button class="chip" data-q="${esc(l)}">${esc(l)}</button>`).join(' ')}</p>`:''}</div>`;
}
function mountResultsMap(){
  const el=$('#map'); if(!el||!el.offsetParent&&!$('#rl.showmap')) {S.map=null;return;}
  const R=S.results;
  S.map=makeMap(el,{
    stateClick:name=>{S.F.state=S.F.state===name?null:name;S.F.city=null;S.page=1;rerender();},
    pointClick:(p,x,y,show)=>{const r=R.find(r=>r.L.id===p.id);show(x,y,popHTML(r));S.sel=p.id;highlightCard(p.id);},
    clusterList:(items,x,y,show)=>show(x,y,`<h4>${items.length} laboratories at this point</h4><p class="small muted">These share one approximate position.</p>`+items.slice(0,30).map(p=>`<div style="padding:4px 0;border-top:1px solid var(--line2)"><a href="#/lab/${p.id}/${p.slug}">${esc(p.n)}</a><div class="small muted">${TYPES[p.t].short}</div></div>`).join('')),
    onDraw:n=>{const note=$('#mapnote');if(note)note.textContent=S.mapMode==='density'?'Laboratory count per state for the current results.':`${R.filter(r=>r.L.la!=null).length.toLocaleString('en-IN')} mapped. Positions are PIN / city centroids, not exact addresses. Click a state to filter.`;}
  });
  S.map.setPoints(R.map(r=>r.L)).setOrigin(S.origin,S.origin?(S.F.radius||S.P.radius||(S.origin.fromQuery?40:null)):null).setActiveState(S.F.state);
  const c={};R.forEach(r=>{c[r.L.state==='Dadra and Nagar Haveli and Daman and Diu'?r.L.state:r.L.state]=(c[r.L.state]||0)+1;});S.map.setCounts(c).setMode(S.mapMode);
  const fst=S.F.state||(S.P&&S.P.state);if(fst&&!S.origin) S.map.focusState(fst); else if(S.origin) S.map.focus(S.origin.la,S.origin.lo,(S.F.radius||40)<=30?16:(S.F.radius||40)<=60?11:(S.F.radius<=150?6:3.5));
}
function popHTML(r){if(!r)return'';const L=r.L;return `<div>${typeTag(L.t)}</div><h4>${esc(L.n)}</h4><div class="badges">${statusBadge(r.status)}${r.sm?`<span class="badge ${SCOPE_LBL[r.sm.lvl][1]}">${SCOPE_LBL[r.sm.lvl][0]}</span>`:''}</div>
  <div class="small">📍 ${esc(L.city)}, ${esc(L.state)} ${r.dist!=null?'· '+fmtKm(r.dist):''}</div><div class="small muted" style="margin:4px 0">${esc((L.t==='M'?discNames(L):grpNames(L)).slice(0,3).join(', '))}</div>
  <a class="btn small primary" href="#/lab/${L.id}/${L.slug}">View details</a>`;}
function highlightCard(id){$$('.card.sel').forEach(c=>c.classList.remove('sel'));const c=$(`.card[data-id="${id}"]`);if(c){c.classList.add('sel');c.scrollIntoView({block:'nearest',behavior:'smooth'});}}

/* ===== Lab profile ===== */
const PTABS=[['overview','Overview'],['scope','Scope & services'],['accreditation','NABL accreditation'],['other','Other accreditations'],['recognitions','Recognised / regulated by'],['facilities','Facilities'],['location','Location'],['contact','Contact'],['data','Data & verification']];
function viewLab(id,tab){
  const L=BYID[id]; if(!L) return `<main id="main" class="wrap" style="padding:40px 20px"><h1>Laboratory not found</h1><p>No record with ID ${esc(id)} exists in this dataset.</p><a class="btn" href="#/search">Back to search</a></main>`;
  tab=tab&&PTABS.some(t=>t[0]===tab)?tab:'overview';
  Store.logEvent({type:'view',id:L.id,n:L.n});
  const st=accStatus(L), dist=S.origin&&L.la!=null?km(S.origin.la,S.origin.lo,L.la,L.lo):(S.userLoc&&L.la!=null?km(S.userLoc.la,S.userLoc.lo,L.la,L.lo):null);
  const sm=S.P?scopeMatch(L,S.P):null; const dv=demoVals(L);
  document.title=L.n+' — '+TYPES[L.t].name+', '+L.city+' | NABL Find a Lab';
  const inCmp=S.compare.includes(L.id);
  return `<main id="main"><div class="phead"><div class="wrap"><div class="top2"><div>
   <div class="small"><a href="#/search">← Search results</a></div>
   <div class="meta" style="margin-top:8px">${typeTag(L.t)}<span>${esc(L.id)}</span></div>
   <h1>${esc(L.n)}</h1>
   <div class="badges">${st.k==='valid'||st.k==='warn'?'<span class="badge b-valid">NABL accredited</span>':''}${statusBadge(st)}<span class="badge b-plain">Certificate ${esc(L.cn)}</span>${sm?`<span class="badge ${SCOPE_LBL[sm.lvl][1]}">${SCOPE_LBL[sm.lvl][0]} for “${esc(S.q)}”</span>`:''}${L.ig?'<span class="badge b-info">Regulator-integrated lab</span>':''}${L.src?'<span class="badge b-warn">Partial record: not in NABL master extract</span>':''}</div>
   <div class="meta">📍 ${esc([field(L,'ad'),L.city,L.state,field(L,'p')].filter(Boolean).join(', '))}${dist!=null?` · <b style="color:var(--text)">${fmtKm(dist)} away</b>`:''}</div>
  </div><div class="acts">
   <a class="btn primary" href="${dirURL(L)}" target="_blank" rel="noopener">Get directions</a>
   <button class="btn ${inCmp?'on':''}" data-act="cmp" data-id="${L.id}">${inCmp?'✓ In compare':'Compare'}</button>
   <button class="btn" data-act="save" data-id="${L.id}">${S.saved.has(L.id)?'★ Saved':'☆ Save'}</button>
   <button class="btn" data-act="share" data-id="${L.id}">Share</button>
   <button class="btn ghost" data-act="report" data-id="${L.id}">Report incorrect information</button></div></div>
   <div class="tabs" role="tablist">${PTABS.map(([k,v])=>`<button role="tab" aria-selected="${k===tab}" data-go="#/lab/${L.id}/${L.slug}?tab=${k}">${v}</button>`).join('')}</div></div></div>
  <div class="wrap pbody"><div role="tabpanel">${labTab(L,tab,st,dv,dist)}</div>
   <aside>${trustPanel(L,st)}</aside></div></main>`;
}
function dirURL(L){ return L.gp===0&&L.la!=null?`https://www.google.com/maps/dir/?api=1&destination=${L.la},${L.lo}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([L.n,field(L,'ad'),L.city,L.state,field(L,'p')].filter(Boolean).join(', '))}`; }
function trustPanel(L,st){
  return `<div class="panel"><h3>Verification &amp; trust</h3>
  <dl class="dl" style="grid-template-columns:1fr">
   <dt>NABL accreditation</dt><dd>${statusBadge(st)}<div class="small muted">${esc(st.src)}</div></dd>
   <dt>Certificate number</dt><dd>${esc(L.cn)||NA}</dd>
   <dt>Valid from – until</dt><dd>${L.fr?fmtDate(L.fr)+' – '+fmtDate(L.to):NA}</dd>
   <dt>Last amendment</dt><dd>${L.am?fmtDate(L.am):NA}</dd>
   <dt>Scope verification</dt><dd>${hasScope(L)?'Scope categories listed in NABL master; parameter-level scope in the scope document':'No scope columns in dataset'}</dd>
   <dt>Regulator recognition</dt><dd>${L.ig&&L.ig.regs.length?L.ig.regs.map(r=>`<span class="badge b-info">${r}</span>`).join(' '):'None listed'}</dd>
   <dt>Data source</dt><dd>${SRC[L.src]}${L.ig?'; Centralized list (15.09.2026)':''}</dd>
  </dl><p class="small muted" style="margin-bottom:0">This portal shows accreditation facts only. It does not rank or rate laboratories.</p></div>`;
}
function labTab(L,tab,st,dv,dist){
  const P='<div class="panel">',E='</div>';
  if(tab==='overview') return P+`<h2>Overview</h2><dl class="dl">
    <dt>Laboratory name</dt><dd>${esc(L.n)}</dd><dt>Legal entity name</dt><dd>${NA}</dd>
    <dt>Laboratory type</dt><dd>${TYPES[L.t].name}</dd><dt>Service mode</dt><dd>${esc(L.sv)||NA}</dd>
    <dt>Address</dt><dd>${esc(field(L,'ad'))||NA}</dd><dt>City</dt><dd>${esc(L.city)||NA}</dd><dt>District</dt><dd>${NA}</dd><dt>State</dt><dd>${esc(L.state)||NA}</dd><dt>PIN</dt><dd>${esc(field(L,'p'))||NA}</dd><dt>NABL zone</dt><dd>${esc(L.z)||NA}</dd>
    <dt>Contact person</dt><dd>${esc(field(L,'cp'))||NA}</dd><dt>Phone</dt><dd>${[field(L,'mo'),field(L,'ll')].filter(Boolean).map(esc).join(' / ')||NA}</dd><dt>Email</dt><dd>${field(L,'em')?`<a href="mailto:${esc(field(L,'em'))}">${esc(field(L,'em'))}</a>`:NA}</dd>
    <dt>Website</dt><dd>${NA}</dd><dt>Operating hours</dt><dd>${NA}</dd>
    <dt>NABL status</dt><dd>${statusBadge(st)}</dd><dt>Accreditation (certificate) no.</dt><dd>${esc(L.cn)}</dd><dt>Validity</dt><dd>${L.fr?fmtDate(L.fr)+' – '+fmtDate(L.to):NA}</dd><dt>Last verification date</dt><dd>${L.am?'Amended '+fmtDate(L.am):NA}</dd>
    <dt>Price / turnaround</dt><dd>${dv?`From ₹${dv.price.toLocaleString('en-IN')} · ${tatLabel(dv.tatH)} <span class="badge b-demo">demo data</span>`:NA}</dd></dl>`+E;
  if(tab==='scope') return scopeTab(L);
  if(tab==='accreditation') return P+`<h2>NABL accreditation</h2><dl class="dl">
    <dt>Status</dt><dd>${statusBadge(st)}<div class="small muted">${esc(st.src)}</div></dd>
    <dt>Certificate number</dt><dd>${esc(L.cn)}</dd><dt>Issue date</dt><dd>${fmtDate(L.fr)||NA}</dd><dt>Valid until</dt><dd>${fmtDate(L.to)||NA}</dd>
    <dt>Extended validity</dt><dd>${L.ig&&L.ig.ext?esc(L.ig.ext)+' <span class="small muted">(Centralized list)</span>':NA}</dd>
    <dt>Accreditation cycle (integrated list)</dt><dd>${L.ig&&L.ig.cycle?esc(L.ig.cycle):NA}</dd>
    ${L.ig&&L.ig.cert&&L.ig.cert.split(' ')[0]!==L.cn?`<dt>Certificate in integrated list</dt><dd>${esc(L.ig.cert)} <span class="badge b-warn">differs from master</span></dd>`:''}
    <dt>Last amendment</dt><dd>${fmtDate(L.am)||NA}</dd><dt>Disciplines</dt><dd>${discNames(L).map(esc).join(', ')||NA}</dd>
    <dt>Certificate document</dt><dd>${NA}<div class="small muted">CertUrl is empty for every row in the extract.</div></dd>
    <dt>Scope document</dt><dd>${L.su?`<code>${esc(L.su)}</code>${scopeLink(L)}`:NA}</dd></dl>
    <p class="small muted">Expired, suspended or withdrawn accreditation is shown in red. “Validity end date passed” means the extract's date is past; the lab may have renewed since.</p>`+E;
  if(tab==='other') return P+`<h2>Other accreditations &amp; recognitions</h2>
    ${L.ac?`<p><span class="badge b-info">${L.ac} additional certificate${L.ac>1?'s':''} on record</span></p><p class="muted">The NABL extract records ${L.ac} additional certificate(s) for this lab but not what they are. Details will appear here once verified records are added.</p>`:`<p class="muted">No other accreditations or certifications are recorded for this laboratory in the source data.</p>`}
    <p class="small muted">Only source-backed certifications (ISO, other accreditation bodies, sector approvals) are shown. Operating in a regulated sector is not treated as approval.</p>`+E;
  if(tab==='recognitions') return P+`<h2>Recognised / regulated by</h2>
    ${L.ig?`<p class="muted">This lab appears in the centralized list of integrated labs (last updated 15.09.2026).</p><div class="tscroll"><table class="tbl"><thead><tr><th>Authority</th><th>Recognition type</th><th>Reference no.</th><th>Validity</th><th>Source</th><th>Verification</th></tr></thead><tbody>
    ${L.ig.regs.length?L.ig.regs.map(r=>`<tr><td><b>${r}</b><div class="small muted">${REGNAME[r]}</div></td><td>Integrated / recognised lab</td><td>${NA}</td><td>${L.ig.cycle?esc(L.ig.cycle):NA}</td><td>Centralized list</td><td><span class="badge b-valid">Listed</span></td></tr>`).join(''):`<tr><td colspan="6" class="muted">Integrated, but no specific regulator is marked.</td></tr>`}
    </tbody></table></div>${L.ig.note?`<p class="small" style="color:var(--amber)">Note in source: ${esc(L.ig.note)}</p>`:''}${L.ig.flag==='red'?'<p class="small" style="color:var(--lapse)">Marked red in the source list (expired or suspended).</p>':''}${L.ig.flag==='blue'?'<p class="small" style="color:var(--ink2)">Marked blue in the source list (in process).</p>':''}`
    :`<p class="muted">No regulator recognition is recorded for this lab. The integrated labs list currently covers FSSAI, EIC, APEDA, Tea Board, Spices Board, IOPEPC, CDB and Shefexil.</p>`}`+E;
  if(tab==='facilities') return P+`<h2>Facilities</h2><table class="tbl"><tbody>
    <tr><th scope="row">Permanent facility</th><td>${L.pf?'✓ Yes':'No'}</td><td class="small muted">NABL master</td></tr>
    <tr><th scope="row">Site (on-site) testing / calibration</th><td>${L.sf?'✓ Yes':'No'}</td><td class="small muted">NABL master</td></tr>
    <tr><th scope="row">Mobile facility</th><td>${L.mf?'✓ Yes':'No'}</td><td class="small muted">NABL master</td></tr>
    <tr><th scope="row">Open to others</th><td>${esc(L.sv)||NA}</td><td class="small muted">NABL master</td></tr>
    ${['Home collection','Sample pickup','Online booking','Digital report','Cold chain','24×7 / emergency','Parking','Accessibility'].map((f,i)=>{const v=dv?[dv.home,dv.pickup,dv.online,dv.digital][i]:undefined;return `<tr><th scope="row">${f}</th><td>${v===undefined?NA:(v?'✓ Yes':'No')+' <span class="badge b-demo">demo</span>'}</td><td class="small muted">${v===undefined?'Not in dataset':'Mock value'}</td></tr>`;}).join('')}
    </tbody></table>`+E;
  if(tab==='location') return P+`<h2>Location</h2><dl class="dl"><dt>Address</dt><dd>${esc([field(L,'ad'),L.city,L.state,field(L,'p')].filter(Boolean).join(', '))||NA}</dd>
    <dt>Coordinates</dt><dd>${L.la!=null?L.la.toFixed(4)+', '+L.lo.toFixed(4):NA}</dd><dt>Position accuracy</dt><dd>${GEO[L.gp]}${L.gp>0?' <span class="badge b-warn">approximate</span>':''}</dd>
    <dt>Distance</dt><dd>${dist!=null?fmtKm(dist)+' straight line from '+esc((S.origin||S.userLoc).label):'Set your location to see distance'}</dd><dt>Travel time</dt><dd>${NA}</dd></dl>
    <div style="height:340px;position:relative;margin-top:14px;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden" id="labmap"></div>
    <div class="row" style="margin-top:12px"><a class="btn primary" target="_blank" rel="noopener" href="${dirURL(L)}">Open in Google Maps</a>${L.la!=null?`<a class="btn" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${L.la}&mlon=${L.lo}#map=13/${L.la}/${L.lo}">Open in OpenStreetMap</a>`:''}</div>
    ${L.gp>0?'<p class="small muted">Directions use the full address because the pin is only approximate.</p>':''}`+E;
  if(tab==='contact') return P+`<h2>Contact</h2><dl class="dl"><dt>Contact person</dt><dd>${esc(field(L,'cp'))||NA}</dd><dt>Mobile</dt><dd>${field(L,'mo')?`<a href="tel:${esc(field(L,'mo'))}">${esc(field(L,'mo'))}</a>`:NA}</dd><dt>Landline</dt><dd>${esc(field(L,'ll'))||NA}</dd>
    <dt>Email</dt><dd>${field(L,'em')?`<a href="mailto:${esc(field(L,'em'))}">${esc(field(L,'em'))}</a>`:NA}</dd><dt>Website</dt><dd>${NA}</dd><dt>Operating hours</dt><dd>${NA}</dd></dl>
    <p class="small muted">Contact the laboratory directly for prices, sample requirements and appointments.</p>`+E;
  if(tab==='data'){const reqs=Store.mem.requests.filter(r=>r.labId===L.id);return P+`<h2>Data &amp; verification</h2><dl class="dl">
    <dt>Data source</dt><dd>${SRC[L.src]}</dd><dt>Source row</dt><dd>Sheet “${TYPES[L.t].short==='PTP'?'PTP':TYPES[L.t].short==='RMP'?'RMP':TYPES[L.t].short}”, LabId ${esc(L.id)}</dd>
    <dt>Integrated list</dt><dd>${L.ig?'Yes — Centralized_list.xlsx, last update 15.09.2026':'Not listed'}</dd><dt>Source date</dt><dd>Extract date not stated in file; integrated list 15.09.2026</dd>
    <dt>Last updated</dt><dd>${OVERRIDES[L.id]?'Published correction on '+fmtDate(new Date(OVERRIDES[L.id].ts||Date.now()).toISOString()):'As imported'}</dd><dt>Last verified</dt><dd>${L.am?fmtDate(L.am)+' (amendment date)':NA}</dd>
    <dt>Record owner</dt><dd>NABL Secretariat (prototype)</dd><dt>Verification status</dt><dd>${OVERRIDES[L.id]?'<span class="badge b-valid">Correction published</span>':'<span class="badge b-plain">Imported, not re-verified</span>'}</dd>
    <dt>Newly accredited flag</dt><dd>${L.nw?'Yes (IsNew = 1)':'No'}</dd><dt>Position method</dt><dd>${GEO[L.gp]}</dd></dl>
    ${reqs.length?`<h3 style="margin-top:16px">Correction history</h3>${reqs.map(r=>`<div class="audit"><b>${esc(r.title)}</b> — ${esc(r.status)}<br>${r.audit.map(a=>esc(fmtDate(new Date(a.ts).toISOString())+' '+a.who+': '+a.what)).join('<br>')}</div>`).join('')}`:''}`+E;}
}
function scopeLink(L){const base=(Store.mem.settings&&Store.mem.settings.scopeBase)||'';return base?` <a target="_blank" rel="noopener" href="${esc(base+L.su)}">Open scope document</a>`:' <div class="small muted">The dataset gives the file name only. An admin can set the document base URL in Settings.</div>';}
function scopeTab(L){
  const D=discNames(L),G=grpNames(L),Sg=subNames(L);
  return `<div class="panel"><h2>Check this lab's scope</h2><p class="muted">Ask whether a test, parameter or product falls within this laboratory's accredited scope, e.g. “lead in drinking water”, “pressure gauge”, “CBC”.</p>
   <form class="row" data-act="labscope" data-id="${L.id}" style="flex-wrap:nowrap"><label class="sr" for="lsq">Scope question</label><input id="lsq" type="search" placeholder="Does this lab have scope for…" value="${esc(S.lastScopeQ||'')}"><button class="btn primary">Check</button></form>
   <div id="scoperes">${S.lastScopeQ?scopeVerdict(L,S.lastScopeQ):''}</div></div>
  <div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Accredited scope (as listed)</h2><input type="search" id="scopefilter" placeholder="Search within scope" style="max-width:240px"></div>
   ${!hasScope(L)?`<div class="verdict v-na" style="margin-top:12px"><span class="ic">⚠</span><div>No scope columns are populated for this record. ${L.t==='P'||L.t==='R'?'PTP and RMP sheets carry no discipline or programme columns.':''} See the scope document.</div></div>`:
   `<div class="tree" id="scopetree" style="margin-top:10px"><ul>${D.map(d=>`<li class="disc">${esc(d)}</li>`).join('')}
    ${G.length?`<li class="disc">Groups</li><li><ul>${G.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></li>`:''}
    ${Sg.length?`<li class="disc">Sub-groups (products / matrices)</li><li><ul>${Sg.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></li>`:''}</ul></div>
    <p class="small muted">The master extract lists disciplines, groups and sub-groups as separate lists, so which sub-group belongs to which group is not recorded. Parameter, method, range, unit and standard are in the scope document${L.su?' (<code>'+esc(L.su)+'</code>)':''}.</p>`}</div>`;
}
function scopeVerdict(L,q){
  const P=parseQuery(q); const sm=scopeMatch(L,P);
  if(!sm){ // free text check against names
    const t=q.toLowerCase().trim(); if(!t) return '';
    const hits=[...discNames(L),...grpNames(L),...subNames(L)].filter(x=>x.toLowerCase().includes(t));
    if(!hasScope(L)) return `<div class="verdict v-na"><span class="ic">⚠</span><div><b>Information unavailable.</b> This record has no scope data.</div></div>`;
    return hits.length?`<div class="verdict v-yes"><span class="ic">✓</span><div><b>Scope category match.</b> Listed: ${hits.slice(0,5).map(esc).join('; ')}.</div></div>`:`<div class="verdict v-no"><span class="ic">✕</span><div><b>No matching scope found</b> for “${esc(q)}” in the listed disciplines, groups and sub-groups.</div></div>`;
  }
  const paramNote=P.param?`<p class="small" style="margin:6px 0 0">“${esc(P.param)}” is a parameter. The dataset does not itemise parameters, so an exact match can't be confirmed here — check the scope document.</p>`:'';
  if(sm.lvl==='category') return `<div class="verdict v-yes"><span class="ic">✓</span><div><b>Scope category match.</b> ${sm.hits.map(esc).join('; ')}.${paramNote}</div></div>`;
  if(sm.lvl==='related') return `<div class="verdict v-rel"><span class="ic">!</span><div><b>Related scope only.</b> ${esc(sm.note)}: ${sm.hits.map(esc).join('; ')}.${paramNote}</div></div>`;
  if(sm.lvl==='none') return `<div class="verdict v-no"><span class="ic">✕</span><div><b>No matching scope found</b> for “${esc(q)}”.</div></div>`;
  return `<div class="verdict v-na"><span class="ic">⚠</span><div><b>Information unavailable.</b> This record has no scope data in the dataset.</div></div>`;
}

/* ===== Compare ===== */
function viewCompare(){
  const labs=S.compare.map(id=>BYID[id]).filter(Boolean);
  if(labs.length) Store.logEvent({type:'compare',ids:labs.map(l=>l.id)});
  if(!labs.length) return `<main id="main" class="wrap" style="padding:30px 20px 90px"><h1>Compare laboratories</h1><div class="empty"><p>Select up to four laboratories with “Compare” on search results or profiles.</p><a class="btn primary" href="#/search">Find laboratories</a></div></main>`;
  const origin=S.origin||S.userLoc;
  const rows=[
   ['Laboratory type',L=>TYPES[L.t].name],['Location',L=>esc([L.city,L.state].filter(Boolean).join(', '))],
   ['Distance',L=>origin&&L.la!=null?fmtKm(km(origin.la,origin.lo,L.la,L.lo))+(L.gp>1?' (approx.)':''):NA],
   ['NABL accreditation',L=>statusBadge(accStatus(L))],['Valid until',L=>L.to?fmtDate(L.to):NA],['Certificate no.',L=>esc(L.cn)],
   ['Scope match'+(S.P&&S.q?' for “'+esc(S.q)+'”':''),L=>{const sm=S.P?scopeMatch(L,S.P):null;return sm?`<span class="badge ${SCOPE_LBL[sm.lvl][1]}">${SCOPE_LBL[sm.lvl][0]}</span>`:'<span class="na">No scope query</span>';}],
   ['Disciplines',L=>discNames(L).map(esc).join(', ')||NA],['Scope groups',L=>{const g=grpNames(L);return g.length?g.length+': '+g.slice(0,5).map(esc).join(', ')+(g.length>5?'…':''):NA;}],
   ['Regulator recognition',L=>L.ig&&L.ig.regs.length?L.ig.regs.join(', '):'None listed'],
   ['Other accreditations',L=>L.ac?L.ac+' additional certificate(s)':'None recorded'],
   ['Price',L=>{const d=demoVals(L);return d?'₹'+d.price.toLocaleString('en-IN')+' <span class="badge b-demo">demo</span>':NA;}],
   ['Turnaround time',L=>{const d=demoVals(L);return d?tatLabel(d.tatH)+' <span class="badge b-demo">demo</span>':NA;}],
   ['Home collection',L=>{const d=demoVals(L);return d?(d.home?'Yes':'No')+' <span class="badge b-demo">demo</span>':NA;}],
   ['Online booking',L=>{const d=demoVals(L);return d?(d.online?'Yes':'No')+' <span class="badge b-demo">demo</span>':NA;}],
   ['Digital report',L=>{const d=demoVals(L);return d?(d.digital?'Yes':'No')+' <span class="badge b-demo">demo</span>':NA;}],
   ['Permanent / site / mobile',L=>[L.pf?'Permanent':'',L.sf?'Site':'',L.mf?'Mobile':''].filter(Boolean).join(', ')||NA],
   ['Service mode',L=>esc(L.sv)||NA],['Contact',L=>[field(L,'mo'),field(L,'em')].filter(Boolean).map(esc).join('<br>')||NA],['Operating hours',()=>NA],['Data source',L=>SRC[L.src].split(' (')[0]]];
  return `<main id="main" class="wrap" style="padding:26px 20px 100px"><div class="row" style="justify-content:space-between"><h1 style="font-size:28px">Compare laboratories</h1><div class="row"><button class="btn" data-act="cmpclear">Clear</button><a class="btn" href="#/search">Add more</a></div></div>
  <p class="muted" style="max-width:75ch">A factual side-by-side view. Rows where the labs differ are shaded. There is no overall score or winner.</p>
  <div class="tscroll panel" style="padding:0"><table class="tbl cmp"><thead><tr><th scope="col">Feature</th>${labs.map(L=>`<th scope="col" style="min-width:200px"><div>${typeTag(L.t)}</div><a href="#/lab/${L.id}/${L.slug}" style="font-size:14px;color:var(--text)">${esc(L.n)}</a><div><button class="btn small ghost" data-act="cmp" data-id="${L.id}">Remove</button></div></th>`).join('')}</tr></thead>
  <tbody>${rows.map(([k,f])=>{const v=labs.map(f);const diff=new Set(v.map(x=>x.replace(/<[^>]+>/g,''))).size>1;return `<tr><th scope="row">${k}</th>${v.map(x=>`<td class="${diff?'diff':''}">${x}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div>
  ${!Demo.on?'<p class="small muted">Price, turnaround time, home collection, booking and reports are not in the NABL dataset.</p>':''}</main>`;
}

/* ===== State explorer, service explorer, scope page, saved, about ===== */
function viewStates(name){
  const byState={};for(const L of LABS)byState[L.state]=(byState[L.state]||0)+1;
  const list=Object.entries(byState).filter(([k])=>k).sort((a,b)=>b[1]-a[1]);const max=list[0][1];
  let right='';
  if(name){const cities={};const tc={};for(const L of LABS)if(L.state===name){cities[L.city]=(cities[L.city]||0)+1;tc[L.t]=(tc[L.t]||0)+1;}
    const cl=Object.entries(cities).sort((a,b)=>b[1]-a[1]);const cm=cl[0]?cl[0][1]:1;
    right=`<div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(name)}</h2><a class="btn small" href="#/states">All states</a></div>
     <p class="muted">${(byState[name]||0).toLocaleString('en-IN')} laboratories: ${Object.entries(tc).map(([t,n])=>`${n} ${TYPES[t].short.toLowerCase()}`).join(', ')}.</p>
     <div class="row" style="margin-bottom:10px"><a class="btn primary small" href="#/search?state=${encodeURIComponent(name)}">Show all labs in ${esc(name)}</a></div>
     <div class="bars">${cl.slice(0,40).map(([c,n])=>`<button class="r" data-go="#/search?state=${encodeURIComponent(name)}&city=${encodeURIComponent(c)}"><span>${esc(c||'City not stated')}</span><span class="bar" style="width:${n/cm*100}%"></span><span>${n}</span></button>`).join('')}</div></div>`;}
  else right=`<div class="panel"><h2>Laboratories by state</h2><div class="bars">${list.map(([s,n])=>`<button class="r" data-go="#/states/${encodeURIComponent(s)}"><span>${esc(s)}</span><span class="bar" style="width:${n/max*100}%"></span><span>${n}</span></button>`).join('')}</div></div>`;
  return `<main id="main" class="wrap" style="padding:26px 20px 100px"><h1 style="font-size:28px">Explore laboratories by state</h1><p class="muted">Click a state on the map or in the list, then a city to open its laboratories.</p>
  <div class="cols2"><div class="panel" style="height:560px;position:relative;padding:0;overflow:hidden"><div id="stmap" style="position:absolute;inset:0"></div></div><div>${right}</div></div></main>`;
}
function viewServices(){
  const blocks=Object.keys(TYPES).map(t=>{const d={},g={};for(const L of LABS)if(L.t===t){L.d.forEach(i=>d[i]=(d[i]||0)+1);L.g.forEach(i=>g[i]=(g[i]||0)+1);}
    const dl=Object.entries(d).sort((a,b)=>b[1]-a[1]),gl=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,40);
    return `<div class="panel" style="border-top:4px solid ${TYPES[t].c}"><h2>${TYPES[t].plural}</h2>
     ${dl.length?`<h4 class="small">Disciplines</h4><div class="chips">${dl.map(([i,n])=>`<button class="chip" data-go="#/search?t=${t}&disc=${encodeURIComponent(DICT.disc[i])}">${esc(DICT.disc[i])}<small>${n}</small></button>`).join('')}</div>`:''}
     ${gl.length?`<h4 class="small" style="margin-top:14px">Scope groups</h4><div class="chips">${gl.map(([i,n])=>`<button class="chip" data-go="#/search?t=${t}&grp=${encodeURIComponent(DICT.grp[i])}">${esc(DICT.grp[i])}<small>${n}</small></button>`).join('')}</div>`:''}
     ${!dl.length&&!gl.length?`<p class="muted">The source sheet has no programme, material or discipline columns for these ${LABS.filter(l=>l.t===t).length} records. Search by name, or browse all.</p><a class="btn small" href="#/search?t=${t}">Browse all</a>`:''}</div>`;}).join('');
  return `<main id="main" class="wrap" style="padding:26px 20px 100px"><h1 style="font-size:28px">Explore by service</h1><p class="muted" style="max-width:75ch">Service areas come from the accredited disciplines and scope groups in the NABL master. Group names are shown as NABL records them, so near-duplicates (for example “Soil and Rocks” and “Soil and Rock”) appear separately.</p>${blocks}</main>`;
}
function viewScope(){
  const ex=['Lead in drinking water','Pressure gauge calibration near Pune','Pesticide residues in spices','CBC test in Chennai','Cement testing in Hyderabad','Microbiology in packaged drinking water','Torque wrench calibration','Stack emission monitoring in Gujarat'];
  return `<main id="main" class="wrap" style="padding:26px 20px 100px;max-width:900px"><h1 style="font-size:28px">Who can perform this exact test?</h1>
  <p class="muted">Describe the test or parameter and the product or matrix. Results are grouped by how strongly the lab's accredited scope supports your request.</p>
  <form class="searchbox" style="box-shadow:none;border:1px solid var(--line)" data-act="scopesearch"><label class="sr" for="ssq">Test and matrix</label><input id="ssq" type="search" placeholder="e.g. lead in drinking water near Delhi"><button class="btn primary">Check scope</button></form>
  <div class="chips" style="margin:14px 0 24px">${ex.map(e=>`<button class="chip" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>
  <div class="panel"><h3>How matching works</h3><p>Your words are split into a laboratory type, a scope category (group, sub-group or medical discipline), an optional parameter and a location. The category is then compared with each lab's accredited scope in the NABL master.</p>
  <table class="tbl"><tbody><tr><td><span class="badge b-valid">Exact scope match</span></td><td>Parameter appears in the lab's itemised scope. Requires parameter-level scope rows (the import supports a Scope sheet); none are in this snapshot.</td></tr>
  <tr><td><span class="badge b-valid">Scope category match</span></td><td>Group / sub-group or medical discipline matches, e.g. Water › Drinking Water.</td></tr>
  <tr><td><span class="badge b-warn">Related scope</span></td><td>Only a broader group or discipline matches.</td></tr>
  <tr><td><span class="badge b-lapse">No scope match</span></td><td>The lab has scope data and none of it matches.</td></tr>
  <tr><td><span class="badge b-plain">Not available</span></td><td>No scope data for the record. Nothing is inferred from the lab's name or general services.</td></tr></tbody></table></div></main>`;
}
function viewSaved(){const labs=[...S.saved].map(id=>BYID[id]).filter(Boolean);
  return `<main id="main" class="wrap" style="padding:26px 20px 100px"><h1 style="font-size:28px">Saved laboratories</h1><p class="muted">Saved on this device.</p>
  ${labs.length?labs.map(L=>cardHTML({L,dist:null,sm:null,why:[TYPES[L.t].name],dv:demoVals(L),status:accStatus(L)})).join(''):'<div class="empty">Nothing saved yet. Use “Save” on any laboratory.</div>'}</main>`;}
function viewAbout(){const dq=RAW.dq;
  return `<main id="main" class="wrap" style="padding:26px 20px 100px;max-width:960px"><h1 style="font-size:28px">Data &amp; methodology</h1>
  <div class="panel"><h3>Sources</h3><p><b>NABL_Labs_Data.xlsx</b> — 5 sheets (Testing ${LABS.filter(l=>l.t==='T'&&!l.src).length}, Medical ${LABS.filter(l=>l.t==='M').length}, Calibration ${LABS.filter(l=>l.t==='C').length}, PTP ${LABS.filter(l=>l.t==='P').length}, RMP ${LABS.filter(l=>l.t==='R').length}), 30 identical columns, ${RAW.meta.master_rows.toLocaleString('en-IN')} rows. LabId is the unique key.</p>
  <p><b>Centralized_list.xlsx</b> — ${RAW.meta.integrated} integrated labs with regulator flags (FSSAI, EIC, APEDA, Tea Board, Spices Board, IOPEPC, CDB, Shefexil), last updated 15.09.2026. Joined on LAB ID: ${RAW.meta.integrated-RAW.meta.orphans} matched; ${RAW.meta.orphans} are not in the master extract and are shown as partial records.</p></div>
  <div class="panel"><h3>What is derived</h3><p>Accreditation status (from “valid to” date, Extended Validity and red/blue text marking in the integrated list), map positions (PIN centroid → PIN area → city → state), scope-match levels, distance and relevance. Relevance adds scope-match strength, name match, proximity, current validity and data completeness; the “Why this result matches” list shows which applied.</p></div>
  <div class="panel"><h3>Data quality at import</h3><table class="tbl"><tbody>${Object.entries(dq).map(([k,v])=>`<tr><td>${esc(k)}</td><td style="text-align:right">${v.toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table></div></main>`;}

/* ===== Modal ===== */
function modal(html,after){closeModal();const bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML=`<div class="modal" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-act="closemodal"]'))closeModal();});
  const first=bg.querySelector('input,select,textarea,button');first&&first.focus(); after&&after(bg);
  document.addEventListener('keydown',escClose);}
function escClose(e){if(e.key==='Escape')closeModal();}
function closeModal(){$$('.modal-bg').forEach(m=>m.remove());document.removeEventListener('keydown',escClose);}
function reportModal(id){const L=BYID[id];
  modal(`<h2>Report incorrect information</h2><p class="muted small">${esc(L.n)} (${esc(L.id)})</p><form data-act="reportform">
  <div class="field"><span>What is wrong?</span><select id="rtype">${['Wrong address','Wrong phone','Wrong website','Wrong email','Wrong accreditation information','Wrong scope','Laboratory no longer operating','Other'].map(o=>`<option>${o}</option>`).join('')}</select></div>
  <div class="field"><span>Correct information or comments</span><textarea id="rtext" required></textarea></div>
  <div class="field"><span>Your email (optional, for follow-up)</span><input type="email" id="rmail"></div>
  <div class="row"><button class="btn primary">Send report</button><button type="button" class="btn" data-act="closemodal">Cancel</button></div></form>
  <p class="small muted">Reports go to the NABL review queue. Nothing changes on the public profile until a reviewer approves it.</p>`,m=>{
    m.querySelector('form').onsubmit=async e=>{e.preventDefault();const r=newRequest({labId:id,kind:'report',title:m.querySelector('#rtype').value,by:'Public user'+(m.querySelector('#rmail').value?' ('+m.querySelector('#rmail').value+')':''),
      detail:m.querySelector('#rtext').value,status:'Submitted'});await Store.putRequest(r);closeModal();toast('Report sent to NABL. Reference '+r.id);};});
}
function newRequest(o){const id='CR-'+Date.now().toString(36).toUpperCase().slice(-6);return {id,created:Date.now(),changes:[],docs:[],audit:[{ts:Date.now(),who:o.by,what:(o.status||'Draft')+(o.kind==='report'?' (public report)':'')}],...o};}
