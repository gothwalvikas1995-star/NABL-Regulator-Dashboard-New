/* ===== Simplified, search-first citizen UI (overrides views.js public screens) ===== */
S.view='list';
function newF(){return {types:new Set(),state:null,city:null,pin:null,validity:null,service:new Set(),fac:new Set(),regs:new Set(),integrated:false,disc:new Set(),grp:new Set(),scope:new Set(),includeNA:false,radius:null,price:null,tat:null,home:false,online:false,digital:false,otherAcc:false,open:false};}
S.F=newF();
const LINES=[['M','Medical','Find medical laboratories'],['T','Testing','Find testing laboratories'],['C','Calibration','Find calibration laboratories'],['P','PTP','Find proficiency testing providers'],['R','RMP','Find reference material producers']];
const EXAMPLES=['Blood test near me','Food testing lab in Delhi','Water testing in Jaipur','Calibration lab for pressure gauge','PTP for microbiology'];
const cityOpts=(st,sel)=>Object.values(CITY_INDEX).filter(c=>!st||c.state===st).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option ${sel===c.name?'selected':''}>${esc(c.name)}</option>`).join('');
const stateOpts=sel=>STATES.map(s=>`<option ${sel===s?'selected':''}>${esc(s)}</option>`).join('');
const short=(s,n=38)=>s.length>n?s.slice(0,n-1).trim()+'…':s;

/* ----- Header / footer ----- */
function header(){
  const r=S.route.split('?')[0];
  const cur=(...p)=>p.some(x=>x==='#/find'?(r.startsWith('#/find')||r.startsWith('#/search')||r.startsWith('#/lab')||r.startsWith('#/compare')||r.startsWith('#/states')):r.startsWith(x))?'aria-current="page"':'';
  const me=API.session(),signed=!!me;
  const roleName=me?ROLES[me.role]:'';
  const logoImg=`<img src="${window.NABL_LOGO}" alt="Quality Council of India | NABL — National Accreditation Board for Testing and Calibration Laboratories" width="${Math.round(42*window.NABL_LOGO_AR)}" height="42">`;
  const demo=Demo.on?'<div class="demo-banner" role="note">Demo mode: price, turnaround time and home collection marked “demo” are sample values, not NABL data.</div>':'';
  if(S.landing) return `<a class="skip" href="#main">Skip to content</a>${demo}
  <header class="hdr" id="hdr"><div class="in"><a class="logo" href="#/" aria-label="NABL sign-in">${logoImg}</a>
   <nav id="mainnav" class="lnav" aria-label="Main"><a href="#/find">Find a Lab</a><a href="#/about">About</a></nav></div></header>`;
  return `<a class="skip" href="#main">Skip to content</a>${demo}
  <header class="hdr" id="hdr"><div class="in">
    <a class="logo" href="${signed?'#/dash':'#/'}" aria-label="${signed?'My dashboard':'NABL sign-in'} — National Accreditation Board for Testing and Calibration Laboratories">${logoImg}<span class="pt">${S.route.startsWith('#/dash')?'Dashboard':'Find a Lab'}</span></a>
    <button class="menu" data-act="menu" aria-expanded="false" aria-controls="mainnav">Menu</button>
    <nav id="mainnav" aria-label="Main">
      <a href="#/find" ${cur('#/find')}>Find a Lab</a>
      <a href="#/about" ${cur('#/about')}>About</a>
      <a href="#/for-labs" ${cur('#/for-labs')}>For Laboratories</a>
      <a class="login" href="${signed?'#/dash':'#/'}" ${cur('#/dash')}>${signed?esc(roleName):'Sign in'}</a>
    </nav></div></header>`;
}
function bottomNav(){return '';}
function footer(){
  return `<footer class="ftr"><div class="in">
   <div><b>National Accreditation Board for Testing and Calibration Laboratories</b><p>NABL is a constituent board of the Quality Council of India. It accredits medical, testing and calibration laboratories, proficiency testing providers and reference material producers.</p>
    <p class="small">Prototype. Laboratory data from the NABL master extract and the integrated labs list (updated 15.09.2026). Map boundaries are indicative only.</p></div>
   <div><b>Find a Lab</b><a href="#/search">All laboratories</a><a href="#/states">Explore by state</a><a href="#/compare">Compare labs</a><a href="#/about">About this portal</a></div>
   <div><b>NABL / QCI</b><a href="https://nabl-india.org" target="_blank" rel="noopener">NABL website</a><a href="https://qcin.org" target="_blank" rel="noopener">Quality Council of India</a><a href="#/contact">Contact</a><a href="#/privacy">Privacy</a><a href="#/terms">Terms</a></div>
  </div></footer>`;
}

/* ----- Home ----- */
function viewHome(){
  S.home=S.home||{types:new Set(),state:''};
  const H=S.home;
  const byState={};for(const L of LABS)if(L.state)byState[L.state]=(byState[L.state]||0)+1;
  const topStates=Object.keys(byState).sort((a,b)=>a.localeCompare(b));
  return `<main id="main">
  <section class="h-hero"><div class="in">
    <h1>Find a Lab Near You</h1>
    <p>Search for a test, service or laboratory</p>
    <form class="bigsearch" role="search" data-act="homesearch"><label class="sr" for="hq">Search for a test, service, laboratory or location</label>
      <input id="hq" type="search" placeholder="Search for a test, service, laboratory or location" autocomplete="off" value="${esc(H.q||'')}">
      <button class="btn primary" type="submit">Search</button></form>
    <button type="button" class="nearme" data-act="nearme"><span aria-hidden="true">📍</span> Find labs near me</button>
    <div class="h-ex"><span>Try:</span>${EXAMPLES.map(e=>`<button type="button" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div>
  </div></section>
  <form class="h-card" data-act="homefilters" aria-label="Search by location and service line">
    <h2 id="lsearch">Search by location</h2>
    <div class="locrow">
      <label><span class="sr">State</span><select id="hstate"><option value="">State</option>${stateOpts(H.state)}</select></label>
      <label><span class="sr">City</span><select id="hcity"><option value="">City</option>${cityOpts(H.state,H.city)}</select></label>
      <label><span class="sr">PIN code</span><input id="hpin" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="PIN code" value="${esc(H.pin||'')}"></label>
    </div>
    <h2>Service line</h2>
    <div class="sl" role="group" aria-label="Service line">${LINES.map(([k,n])=>`<button type="button" data-act="hsl" data-t="${k}" aria-pressed="${H.types.has(k)}">${n}</button>`).join('')}</div>
    <div class="go"><button class="btn primary" type="submit">SEARCH LABS</button></div>
  </form>
  <section class="h-sec"><h2>Browse by service line</h2><p>Not sure what to search? Start with the type of laboratory you need.</p>
    <div class="lines">${LINES.map(([k,n,d])=>`<a href="#/search?t=${k}"><b>${n}</b><span>${d}</span></a>`).join('')}</div></section>
  <section class="h-sec"><h2>Explore by location</h2><p>Choose a state on the map or from the list.</p>
    <div class="h-map"><div class="mapbox"><div id="homemap" style="position:absolute;inset:0"></div></div>
    <div class="states">${topStates.map(s=>`<a href="#/search?state=${encodeURIComponent(s)}">${esc(s)}</a>`).join('')}</div></div></section>
  ${footer()}</main>`;
}

/* ----- Location ----- */
function locFallback(then){
  modal(`<h2>Where should we search?</h2><p class="muted">We couldn't get your location. Enter your state, city or PIN code instead.</p>
  <form data-act="locform"><div class="field"><span>State, city or PIN code</span><input type="text" id="locin" list="placelist" placeholder="e.g. Jaipur, Maharashtra or 110001" required></div>
  <datalist id="placelist">${STATES.map(s=>`<option value="${esc(s)}">`).join('')}${Object.values(CITY_INDEX).sort((a,b)=>b.n-a.n).slice(0,400).map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>
  <div class="row"><button class="btn primary">Search here</button><button type="button" class="btn" data-act="closemodal">Search all of India</button></div></form>`,m=>{
    m.querySelector('form').onsubmit=e=>{e.preventDefault();const v=m.querySelector('#locin').value.trim();
      const st=STATES.find(s=>s.toLowerCase()===v.toLowerCase());
      if(st){closeModal();go('#/search?state='+encodeURIComponent(st)+(S.pendingT?'&t='+S.pendingT:''));return;}
      const o=resolvePlace(v); if(!o){toast('Not recognised — try a city, state or 6-digit PIN code');return;}
      S.userLoc=o;closeModal();then&&then();};
  });
}

/* ----- Search ----- */
function doSearch(){
  const P=S.P=parseQuery(S.q), F=S.F;
  let origin=null;
  const pin=F.pin||P.pin;
  if(pin){const o=resolvePlace(pin); if(o) origin={...o,fromQuery:true,kind:'pin'};}
  if(!origin&&P.city&&!F.city){const c=CITY_INDEX[P.city.toLowerCase()]; if(c) origin={la:c.la,lo:c.lo,label:c.name,fromQuery:true,kind:'city'};}
  if(!origin&&(P.near||F.radius||F.nearme)&&S.userLoc) origin={...S.userLoc,kind:'user'};
  S.origin=origin;
  const F2=origin&&origin.kind==='user'&&!F.radius&&!P.radius?{...F,radius:25}:F; S.nearR=F2!==F?25:null;
  let R=runSearch(P,F2,origin);
  if(F.otherAcc) R=R.filter(r=>r.L.ac>0);
  if(F.open) R=R.filter(r=>/open/i.test(r.L.sv||''));
  let sort=S.sort; if(sort==='relevance'&&origin&&!P.disc.length&&!P.grp.length) sort='distance';
  S.results=sortResults(R,sort);
  return S.results;
}
function viewSearch(params){
  if(location.hash!==S.lastSearchHash){ // a new search navigation
    S.lastSearchHash=location.hash; S.q=params.get('q')||''; S.F=newF(); S.page=1; S.sel=null;
    if(params.get('t')) S.F.types=new Set(params.get('t').split(',').filter(t=>TYPES[t]));
    if(params.get('state')) S.F.state=params.get('state');
    if(params.get('city')){S.F.city=params.get('city');if(!S.F.state){const c=CITY_INDEX[S.F.city.toLowerCase()];if(c)S.F.state=c.state;}}
    if(params.get('pin')) S.F.pin=params.get('pin');
    if(params.get('near')) S.F.nearme=true;
    if(params.get('grp')){const i=DICT.grp.indexOf(params.get('grp'));if(i>=0)S.F.grp=new Set([i]);}
    if(params.get('disc')){const i=DICT.disc.indexOf(params.get('disc'));if(i>=0)S.F.disc=new Set([i]);}
    if(params.get('view')==='map') S.view='map';
  }
  const R=doSearch(),P=S.P;
  Store.logEvent({type:'search',q:S.q,n:R.length,zero:R.length===0,types:[...(S.F.types.size?S.F.types:P.types)],state:S.F.state||P.state||'',city:P.city||S.F.city||'',filters:activeFilterNames()});
  return `<main id="main"><div class="r-top"><div class="in">
    <div class="r-search"><form class="bigsearch" role="search" data-act="resform"><label class="sr" for="rq">Search for a test, service, laboratory or location</label><input id="rq" type="search" value="${esc(S.q)}" placeholder="Search for a test, service, laboratory or location"><button class="btn primary">Search</button></form>
      <button class="btn nm" data-act="nearme2">📍 ${S.origin&&S.origin.kind==='user'?'Near '+esc(S.userLoc.label):'Near me'}</button></div>
    <div class="fbar" id="fbar">${fbarHTML()}</div>
  </div></div>
  <div id="rhead">${rheadHTML(R)}</div>
  <div class="r-body ${S.view==='map'?'mapmode':''}" id="rl">
    <div class="r-list" id="list">${resultsHTML(R)}</div>
    <div class="r-map" aria-label="Map of results"><div id="map" style="position:absolute;inset:0"></div>
      <div class="mapctl"><button class="btn small" data-act="zin" aria-label="Zoom in">+</button><button class="btn small" data-act="zout" aria-label="Zoom out">−</button><button class="btn small" data-act="zreset">India</button></div>
      <div class="mapnote" id="mapnote"></div></div>
  </div></main>`;
}
function effTypes(){return S.F.types.size?S.F.types:(S.P?S.P.types:new Set());}
function fbarHTML(){
  const F=S.F,P=S.P||{}; const st=F.state||P.state||'';
  return `<label><span class="sr">State</span><select data-f="state"><option value="">All states</option>${stateOpts(st)}</select></label>
   <label><span class="sr">City</span><select data-f="city"><option value="">All cities</option>${cityOpts(st,F.city)}</select></label>
   <label><span class="sr">PIN code</span><input data-f2="pin" id="fpin" inputmode="numeric" maxlength="6" placeholder="PIN code" value="${esc(F.pin||'')}"></label>
   <span class="sep" aria-hidden="true"></span>
   <div class="sl" role="group" aria-label="Service line">${LINES.map(([k,n])=>`<button type="button" data-act="stype" data-t="${k}" aria-pressed="${effTypes().has(k)}">${n}</button>`).join('')}</div>`;
}
function ctxLine(){
  const F=S.F,P=S.P,o=S.origin,a=[];
  if(o&&o.kind==='user')a.push('Within '+(S.F.radius||S.P.radius||25)+' km of your location');else if(o&&o.kind==='pin')a.push('Around PIN '+(F.pin||P.pin));
  if(F.city)a.push(F.city);else if(o&&o.kind==='city')a.push(o.label);
  if(F.state||P.state)a.push(F.state||P.state);
  if(!a.length)a.push('All India');
  const t=[...effTypes()];if(t.length&&t.length<5)a.push(t.map(k=>TYPES[k].short).join(', '));
  [...new Set(P.labels)].slice(0,2).forEach(l=>a.push(l));
  return a.map(esc).join(' <span aria-hidden="true">|</span> ');
}
function rheadHTML(R){
  const n=activeFilterNames().filter(x=>!['type','state','city','pin'].includes(x)).length;
  return `<div class="r-head"><div><h1 aria-live="polite">${R.length.toLocaleString('en-IN')} ${R.length===1?'laboratory':'laboratories'} found</h1>
   <div class="ctx">${ctxLine()}</div></div>
   <div class="tools"><button class="btn grow" data-act="drawer">Filters${n?' ('+n+')':''}</button>
    <div class="seg" role="group" aria-label="View"><button data-act="view" data-v="list" aria-pressed="${S.view!=='map'}">List</button><button data-act="view" data-v="map" aria-pressed="${S.view==='map'}">Map</button></div>
    <label><span class="sr">Sort</span><select id="sort">${[['relevance','Best match'],['distance','Nearest'],['name','Name A–Z'],['validity','Validity (latest)']].concat(Demo.on?[['priceAsc','Price: low to high'],['tat','Fastest turnaround']]:[]).map(([k,v])=>`<option value="${k}" ${S.sort===k?'selected':''} ${k==='distance'&&!S.origin?'disabled':''}>${v}</option>`).join('')}</select></label></div></div>
   ${noteHTML()}`;
}
function noteHTML(){
  const P=S.P,w=[];
  if(P.priceMax&&!Demo.on)w.push('Prices are not published in NABL data yet, so the price limit was not applied.');
  if(P.fastest&&!Demo.on)w.push('Turnaround times are not published yet.');
  if(P.home&&!Demo.on)w.push('Home collection is not published yet.');
  if(P.param)w.push(`Labs below have accredited scope for the product area. Please confirm “${esc(P.param)}” with the lab or in its scope document.`);
  if(P.near&&!S.userLoc&&!P.city&&!S.F.pin)w.push('Location not set, so results cover all of India.');
  return w.length?`<p class="r-note">${w.join(' ')}</p>`:'';
}
function activeFilterNames(){const F=S.F,a=[];if(F.types.size)a.push('type');if(F.state)a.push('state');if(F.city)a.push('city');if(F.pin)a.push('pin');if(F.radius)a.push('distance');if(F.validity)a.push('accreditation');if(F.fac.size)a.push('facility');if(F.regs.size||F.integrated)a.push('regulator');if(F.disc.size||F.grp.size)a.push('service');if(F.scope.size||F.includeNA)a.push('scope');if(F.price)a.push('price');if(F.tat)a.push('tat');if(F.home)a.push('home collection');if(F.otherAcc)a.push('other accreditations');if(F.open)a.push('availability');return a;}

/* Drawer with all advanced filters */
function openDrawer(){
  closeDrawer();const d=document.createElement('div');d.className='drawer-bg';d.innerHTML=`<div class="drawer" role="dialog" aria-modal="true" aria-labelledby="dttl"><div class="dh"><h2 id="dttl">Filters</h2><button class="btn ghost" data-act="closedrawer" aria-label="Close filters">✕</button></div><div class="db" id="dbody">${drawerHTML()}</div><div class="df"><button class="btn" data-act="clearf">Clear all</button><button class="btn primary" data-act="closedrawer" id="dshow">Show ${S.results.length.toLocaleString('en-IN')} labs</button></div></div>`;
  d.addEventListener('click',e=>{if(e.target===d)closeDrawer();});document.body.appendChild(d);document.addEventListener('keydown',drawerEsc);
  d.querySelector('.dh button').focus();
}
function drawerEsc(e){if(e.key==='Escape')closeDrawer();}
function closeDrawer(){$$('.drawer-bg').forEach(x=>x.remove());document.removeEventListener('keydown',drawerEsc);}
function refreshDrawer(){const b=$('#dbody');if(!b)return;const open=$$('details',b).map(x=>x.open);const st=b.scrollTop;b.innerHTML=drawerHTML();$$('details',b).forEach((x,i)=>{if(open[i])x.open=true;});b.scrollTop=st;const s=$('#dshow');if(s)s.textContent='Show '+S.results.length.toLocaleString('en-IN')+' labs';}
function drawerHTML(){
  const F=S.F,P=S.P,R=S.results,demo=Demo.on;
  const cnt=fn=>{const c={};for(const r of R)for(const k of fn(r.L))c[k]=(c[k]||0)+1;return c;};
  const chk=(name,val,label,on,n,dis)=>`<label class="chk ${dis?'dis':''}"><input type="checkbox" data-f="${name}" value="${esc(val)}" ${on?'checked':''} ${dis?'disabled':''}><span>${label}</span>${n!=null?`<span class="n">${n.toLocaleString('en-IN')}</span>`:''}</label>`;
  const sec=(title,on,body,open)=>`<details ${open?'open':''}><summary>${title}${on?'<span class="on">On</span>':''}</summary>${body}</details>`;
  const gc=cnt(L=>L.g),dc=cnt(L=>L.d);
  const topG=Object.entries(gc).sort((a,b)=>b[1]-a[1]).slice(0,12),topD=Object.entries(dc).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const regc=cnt(L=>L.ig?L.ig.regs:[]); const regKeys=Object.keys(regc).sort((a,b)=>regc[b]-regc[a]);
  const hasScopeQ=P.disc.length||P.grp.length||P.sub.length;
  const na='<p class="note">Not published in NABL data yet. This filter will work once laboratories supply it.</p>';
  const st=F.state||P.state||'';
  return `<div class="basic mobonly">
    <div class="field"><span>State</span><select data-f="state"><option value="">All states</option>${stateOpts(st)}</select></div>
    <div class="g2"><div class="field"><span>City</span><select data-f="city"><option value="">All cities</option>${cityOpts(st,F.city)}</select></div>
    <div class="field"><span>PIN code</span><input data-f2="pin" inputmode="numeric" maxlength="6" placeholder="e.g. 110001" value="${esc(F.pin||'')}"></div></div>
    <div class="field"><span>Service line</span><div class="sl">${LINES.map(([k,n])=>`<button type="button" data-act="stype" data-t="${k}" aria-pressed="${effTypes().has(k)}">${n}</button>`).join('')}</div></div></div>
  ${sec('Service / test',F.grp.size||F.disc.size,`${topD.length?topD.map(([i,n])=>chk('disc',i,esc(DICT.disc[i]),F.disc.has(+i),n)).join(''):''}${topG.map(([i,n])=>chk('grp',i,esc(DICT.grp[i]),F.grp.has(+i),n)).join('')}${!topG.length&&!topD.length?'<p class="note">No service details listed for these results.</p>':''}`)}
  ${sec('Accreditation',F.validity,`${chk('validity','valid','Accreditation valid',F.validity==='valid')}${chk('validity','lapse','Validity date passed or suspended',F.validity==='lapse')}`)}
  ${hasScopeQ?sec('Scope',F.scope.size||F.includeNA,`${chk('scope','category','Relevant accredited scope',F.scope.has('category'),R.filter(r=>r.sm&&r.sm.lvl==='category').length)}${chk('scope','related','Related scope',F.scope.has('related'),R.filter(r=>r.sm&&r.sm.lvl==='related').length)}${chk('includeNA','1','Include labs without scope details',F.includeNA)}`):''}
  ${sec('Distance',F.radius,`${S.origin?`<p class="note">From ${esc(S.origin.label)}</p>`:'<p class="note">Use “Near me” or enter a PIN code to filter by distance.</p>'}<select data-f="radius" ${!S.origin&&!S.userLoc?'disabled':''}>${[['','Any distance'],[5,'Within 5 km'],[10,'Within 10 km'],[25,'Within 25 km'],[50,'Within 50 km'],[100,'Within 100 km']].map(([v,l])=>`<option value="${v}" ${String(F.radius||'')===String(v)?'selected':''}>${l}</option>`).join('')}</select>`)}
  ${sec('Price',F.price,demo?`<select data-f="price">${[['','Any price'],['0-500','Under ₹500'],['500-1000','₹500–₹1,000'],['1000-2500','₹1,000–₹2,500'],['2500-9999999','Over ₹2,500']].map(([v,l])=>`<option value="${v}" ${F.price&&F.price.join('-')===v?'selected':''}>${l}</option>`).join('')}</select><p class="note">Demo values.</p>`:na)}
  ${sec('Turnaround time',F.tat,demo?`<select data-f="tat">${[['','Any'],[12,'Same day'],[24,'Within 24 hours'],[48,'Within 2 days'],[120,'Within 5 days']].map(([v,l])=>`<option value="${v}" ${String(F.tat||'')===String(v)?'selected':''}>${l}</option>`).join('')}</select><p class="note">Demo values.</p>`:na)}
  ${sec('Home collection',F.home,demo?chk('home','1','Home collection available',F.home):na)}
  ${sec('Facilities',F.fac.size,`${chk('fac','pf','Permanent laboratory',F.fac.has('pf'),R.filter(r=>r.L.pf).length)}${chk('fac','sf','On-site testing / calibration',F.fac.has('sf'),R.filter(r=>r.L.sf).length)}${chk('fac','mf','Mobile laboratory',F.fac.has('mf'),R.filter(r=>r.L.mf).length)}`)}
  ${sec('Other accreditations',F.otherAcc,chk('otherAcc','1','Has additional certificates on record',F.otherAcc,R.filter(r=>r.L.ac>0).length))}
  ${sec('Regulator / recognition',F.regs.size||F.integrated,regKeys.length?`${regKeys.map(k=>chk('regs',k,`${k==='TEA BOARD'?'Tea Board':k==='SPICE BOARD'?'Spices Board':k} <small class="muted">${esc(REGNAME[k]||'')}</small>`,F.regs.has(k),regc[k])).join('')}<p class="note">Only recognitions recorded in the integrated labs list are shown.</p>`:'<p class="note">None of these results have a recorded regulator recognition.</p>')}
  ${sec('Availability',F.open,chk('open','1','Open to the public (accepts outside samples)',F.open,R.filter(r=>/open/i.test(r.L.sv||'')).length))}`;
}

/* ----- Result cards ----- */
function accTag(st,L){
  if(st.k==='valid')return '<span class="acc">✓ NABL Accredited</span>';
  if(st.k==='warn')return `<span class="acc warn">${/process/i.test(st.label)?'Accreditation in process':'✓ NABL Accredited · valid until '+esc(fmtDate(L.to))}</span>`;
  if(st.k==='lapse')return `<span class="acc lapse">${/suspend/i.test(st.label)?'Accreditation suspended':/expired/i.test(st.label)?'Accreditation expired':'Accreditation validity date passed'}</span>`;
  return '<span class="acc plain">Accreditation status not available</span>';
}
const recTags=(L,max=99)=>{const regs=visRegs(L);if(!regs.length)return '';const prim=primaryPublic(L);
  const chip=x=>x===prim?`<span class="rec prim">Primary Regulator: ${esc(recName(x))}</span>`:`<span class="rec">${esc(recName(x))} Recognised</span>`;
  return regs.slice(0,max).map(chip).join('')+(regs.length>max?`<span class="rec" title="${esc(regs.slice(max).map(recName).join(', '))}">+${regs.length-max} more</span>`:'');};
function svcList(L,sm,n=3){
  if(sm&&sm.hits&&sm.hits.length) return [...new Set(sm.hits.map(h=>h.replace(/^(Sub-group|Group|Discipline): /,'')))].slice(0,n);
  const a=L.t==='M'?discNames(L):(grpNames(L).length?grpNames(L):discNames(L)); return a.slice(0,n);
}
function scopeLine(sm){
  if(!sm) return '';
  if(sm.lvl==='exact'||sm.lvl==='category') return `<div class="sc">✓ Relevant accredited scope available</div>`;
  if(sm.lvl==='related') return `<div class="sc rel">Related scope <small>Offers related services; confirm your specific test with the lab</small></div>`;
  if(sm.lvl==='na') return `<div class="sc na">Scope details not listed. Check with the lab</div>`;
  return '';
}
function distText(dist,L){
  if(dist==null) return '';
  const o=S.origin; const rel=o&&o.kind==='city'?` from ${esc(o.label)} centre`:' away';
  return ` · <b>${L.gp>0?'about ':''}${fmtKm(dist)}${rel}</b>`;
}
function cardHTML(r){
  const {L,dist,sm,status}=r; const inCmp=S.compare.includes(L.id); const sv=svcList(L,sm);
  return `<article class="rc ${S.sel===L.id?'sel':''}" data-id="${L.id}">
   <div><h3><a href="#/lab/${L.id}/${L.slug}">${esc(L.n)}</a></h3>
    <div class="ty">${TYPES[L.t].name}</div>
    <div class="tags">${accTag(status||accStatus(L),L)}${recTags(L,2)}</div>
    <div class="loc">📍 ${esc([L.city,L.state].filter(Boolean).join(', '))||'Location not listed'}${distText(dist,L)}</div>
    ${sv.length?`<div class="svc"><span class="l">Services</span>${sv.map(s=>esc(short(s))).join(' · ')}</div>`:''}
    ${scopeLine(sm)}</div>
   <div class="acts"><a class="btn primary small" href="#/lab/${L.id}/${L.slug}">View details</a>
    <button class="btn small ${inCmp?'on':''}" data-act="cmp" data-id="${L.id}" aria-pressed="${inCmp}">${inCmp?'✓ Added':'Compare'}</button></div>
  </article>`;
}
function resultsHTML(R){
  const P=S.P,per=20,hasScopeQ=P.disc.length||P.grp.length||P.sub.length;
  if(!R.length) return zeroHTML(P);
  const slice=R.slice(0,S.page*per); let body='';
  if(hasScopeQ){
    const groups=[['exact','Exact scope match'],['category','Labs with relevant accredited scope'],['related','Related services'],['na','Other labs of this type (scope details not listed)']];
    for(const [k,t] of groups){const g=slice.filter(r=>r.sm&&r.sm.lvl===k);if(g.length)body+=`<h2 class="gttl">${t} (${R.filter(r=>r.sm&&r.sm.lvl===k).length.toLocaleString('en-IN')})</h2>`+g.map(cardHTML).join('');}
    const o=slice.filter(r=>!r.sm||r.sm.lvl==='none');if(o.length)body+=`<h2 class="gttl">Name matches</h2>`+o.map(cardHTML).join('');
  } else body=slice.map(cardHTML).join('');
  return body+(R.length>slice.length?`<div class="pager"><button class="btn" data-act="more">Show more laboratories</button></div>`:'');
}
function zeroHTML(P){
  const rad=S.F.radius||P.radius||(S.origin?40:null);
  return `<div class="sec" style="text-align:center"><h2>No laboratories found</h2><p class="muted">Try a wider area, fewer filters or a simpler search.</p><div class="row" style="justify-content:center">
   ${S.origin&&rad?`<button class="btn" data-act="radius" data-v="${rad*2}">Search within ${rad*2} km</button>`:''}
   ${S.F.state||P.state||S.F.city||S.F.pin?'<button class="btn" data-act="allindia">Search all of India</button>':''}
   ${activeFilterNames().length?'<button class="btn" data-act="clearf">Clear filters</button>':''}
   ${(P.disc.length||P.grp.length)&&!S.F.includeNA?'<button class="btn" data-act="includena">Include labs without scope details</button>':''}</div>
   <p style="margin-top:16px" class="muted">Popular searches</p><div class="row" style="justify-content:center">${['Blood test','Water testing','Food testing','Pressure gauge calibration','Cement testing'].map(l=>`<button class="chip" data-q="${l}">${l}</button>`).join('')}</div></div>`;
}
function popHTML(r){if(!r)return'';const L=r.L;return `<h4>${esc(L.n)}</h4><div class="small muted">${TYPES[L.t].name}</div><div style="margin:6px 0">${accTag(r.status,L)}</div>
  <div class="small">📍 ${esc(L.city)}, ${esc(L.state)}${r.dist!=null?' · '+fmtKm(r.dist):''}</div><a class="btn small primary" style="margin-top:8px" href="#/lab/${L.id}/${L.slug}">View details</a>`;}
function mountResultsMap(){
  const el=$('#map'); if(!el||!el.offsetParent){S.map=null;return;}
  const R=S.results;
  S.map=makeMap(el,{
    stateClick:name=>{S.F.state=S.F.state===name?null:name;S.F.city=null;S.page=1;refreshResults();},
    pointClick:(p,x,y,show)=>{const r=R.find(r=>r.L.id===p.id);show(x,y,popHTML(r));S.sel=p.id;highlightCard(p.id);},
    clusterList:(items,x,y,show)=>show(x,y,`<h4>${items.length} laboratories here</h4>`+items.slice(0,30).map(p=>`<div style="padding:4px 0;border-top:1px solid var(--line2)"><a href="#/lab/${p.id}/${p.slug}">${esc(p.n)}</a><div class="small muted">${TYPES[p.t].short}</div></div>`).join('')),
    onDraw:()=>{const n=$('#mapnote');if(n)n.textContent='Pins are placed by PIN code or city, not exact address.';}
  });
  S.map.setPoints(R.map(r=>r.L)).setOrigin(S.origin,S.origin?(S.F.radius||S.P.radius||(S.origin.fromQuery?40:null)):null).setActiveState(S.F.state);
  const c={};R.forEach(r=>{c[r.L.state]=(c[r.L.state]||0)+1;});S.map.setCounts(c).setMode('markers');
  const fst=S.F.state||(S.P&&S.P.state);
  if(S.origin) S.map.focus(S.origin.la,S.origin.lo,(S.F.radius||40)<=30?16:(S.F.radius||40)<=60?11:6);
  else if(fst) S.map.focusState(fst);
}
function highlightCard(id){$$('.rc.sel').forEach(c=>c.classList.remove('sel'));const c=$(`.rc[data-id="${id}"]`);if(c){c.classList.add('sel');c.scrollIntoView({block:'nearest',behavior:'smooth'});}}

/* ----- Lab profile ----- */
const PT2=[['overview','Overview'],['services','Services'],['accreditation','Accreditation'],['scope','Scope'],['recognitions','Recognitions'],['facilities','Facilities'],['contact','Contact']];
function viewLab(id,tab){
  const L=BYID[id]; if(!L) return `<main id="main" class="page"><h1>Laboratory not found</h1><p>We couldn't find a laboratory with ID ${esc(id)}.</p><a class="btn primary" href="#/find">Find a lab</a></main>`;
  tab={location:'contact',other:'recognitions',data:'overview'}[tab]||tab;
  tab=PT2.some(t=>t[0]===tab)?tab:'overview';
  Store.logEvent({type:'view',id:L.id,n:L.n});
  const st=accStatus(L),o=S.origin||S.userLoc,dist=o&&L.la!=null?km(o.la,o.lo,L.la,L.lo):null;
  document.title=L.n+' — '+TYPES[L.t].name+', '+L.city+' | NABL Find a Lab';
  const inCmp=S.compare.includes(L.id);
  return `<main id="main"><div class="p-head"><div class="in">
   <a class="back" href="${S.lastSearchHash||'#/search'}">← Back to results</a>
   <h1>${esc(L.n)}</h1><div class="ty">${TYPES[L.t].name}</div>
   <div class="tags">${accTag(st,L)}${recTags(L)}</div>
   <div class="loc">📍 ${esc([L.city,L.state].filter(Boolean).join(', '))||'Location not listed'}${dist!=null?` · ${L.gp>0?'about ':''}${fmtKm(dist)} away`:''}</div>
   <div class="acts"><a class="btn primary" href="${dirURL(L)}" target="_blank" rel="noopener">Get Directions</a>
    <button class="btn" data-go="#/lab/${L.id}/${L.slug}?tab=contact">Contact</button>
    <button class="btn ${inCmp?'on':''}" data-act="cmp" data-id="${L.id}">${inCmp?'✓ Added to compare':'Compare'}</button></div>
   <div class="p-tabs" role="tablist" aria-label="Laboratory information">${PT2.map(([k,v])=>`<button role="tab" aria-selected="${k===tab}" data-go="#/lab/${L.id}/${L.slug}?tab=${k}">${v}</button>`).join('')}</div>
  </div></div>
  <div class="p-body" role="tabpanel">${labTab2(L,tab,st,dist)}
   <p class="foot-note">Information from NABL records${L.ig?' and the integrated labs list (15.09.2026)':''}. Something wrong? <button data-act="report" data-id="${L.id}">Report incorrect information</button> · <button data-act="share" data-id="${L.id}">Share this page</button></p></div></main>`;
}
function trustList(L,st){
  const sm=S.P&&S.q?scopeMatch(L,S.P):null; const it=[];
  const valid=st.k==='valid'||st.k==='warn';
  it.push([valid?'':'lapse',valid?'✓':'!','NABL Accredited',valid?`Accreditation no. ${esc(L.cn)}`:esc(st.label)]);
  it.push([st.k==='valid'?'':st.k==='warn'?'warn':'lapse',st.k==='valid'?'✓':'!','Accreditation valid',L.to?(st.k==='lapse'?'Validity date '+fmtDate(L.to)+' has passed':'Until '+fmtDate(L.to)):'Validity date not available']);
  if(sm) it.push([sm.lvl==='category'||sm.lvl==='exact'?'':sm.lvl==='related'?'warn':'no',sm.lvl==='category'||sm.lvl==='exact'?'✓':sm.lvl==='related'?'~':'–','Scope match for “'+esc(S.q)+'”',{exact:'Exact scope match',category:'Relevant accredited scope',related:'Related scope only',none:'No matching scope',na:'Scope details not listed'}[sm.lvl]]);
  const ver=!!OVERRIDES[L.id];
  it.push([ver?'':'no',ver?'✓':'i','Verified information',ver?'Updated after NABL review':'As recorded by NABL; not yet re-verified']);
  if(visRegs(L).length) it.push(['','✓','Recognised by '+visRegs(L).map(recName).join(', '),'From the integrated labs list']);
  return `<ul class="trust">${it.map(([c,i,t,s])=>`<li><span class="ic ${c}" aria-hidden="true">${i}</span><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ul>`;
}
function labTab2(L,tab,st,dist){
  const S0='<section class="sec">',E='</section>';
  const phone=[field(L,'mo'),field(L,'ll')].filter(x=>x&&x!=='-');
  if(tab==='overview'){const sv=svcList(L,null,6);return `<div class="ov"><div>${S0}<h2>Overview</h2><dl class="facts">
    <dt>Type</dt><dd>${TYPES[L.t].name}</dd>
    <dt>Address</dt><dd>${esc([field(L,'ad'),L.city,L.state,field(L,'p')].filter(Boolean).join(', '))||NA}</dd>
    <dt>Phone</dt><dd>${phone.length?phone.map(p=>`<a href="tel:${esc(p)}">${esc(p)}</a>`).join(' / '):NA}</dd>
    <dt>Email</dt><dd>${field(L,'em')?`<a href="mailto:${esc(field(L,'em'))}">${esc(field(L,'em'))}</a>`:NA}</dd>
    <dt>Accepts outside samples</dt><dd>${/open/i.test(L.sv||'')?'Yes':L.sv?esc(L.sv):NA}</dd>
    <dt>Main services</dt><dd>${sv.length?sv.map(esc).join(' · '):NA}${sv.length?` <button class="more-link" data-go="#/lab/${L.id}/${L.slug}?tab=services">All services</button>`:''}</dd></dl>${E}</div>
    <div>${S0}<h2>At a glance</h2>${trustList(L,st)}${E}</div></div>`;}
  if(tab==='services'){const D=discNames(L),G=grpNames(L),Sg=subNames(L);
    return S0+`<h2>Services</h2>${!D.length&&!G.length?`<p class="muted">Service details are not listed for this ${TYPES[L.t].short==='PTP'||TYPES[L.t].short==='RMP'?'provider':'laboratory'}. Please contact them for the tests or programmes offered.</p>`:
    `${G.length?`<p class="muted">Areas this laboratory is accredited for:</p><ul class="svcl">${G.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:''}
     ${!G.length&&D.length?`<ul class="svcl">${D.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:''}
     ${Sg.length?`<details style="margin-top:14px"><summary class="more-link">Products and materials tested (${Sg.length})</summary><ul class="svcl" style="margin-top:10px">${Sg.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></details>`:''}
     <p class="small muted" style="margin-top:14px">Prices, turnaround times and sample requirements are not published yet. Please contact the lab.</p>`}
     <p style="margin-top:14px"><button class="btn" data-go="#/lab/${L.id}/${L.slug}?tab=scope">Check a specific test</button></p>`+E;}
  if(tab==='accreditation'){return S0+`<h2>NABL Accreditation</h2><dl class="facts">
    <dt>Status</dt><dd>${accTag(st,L)}</dd>
    <dt>Accreditation no.</dt><dd>${esc(L.cn)||NA}</dd>
    <dt>Valid until</dt><dd>${L.to?fmtDate(L.to):NA}</dd>
    <dt>Scope</dt><dd>${hasScope(L)?'Available':'Details not listed'}</dd></dl>
    ${hasScope(L)?`<p style="margin-top:16px"><button class="btn primary" data-act="showscope" data-go="#/lab/${L.id}/${L.slug}?tab=scope&full=1">View Accredited Scope</button></p>`:''}
    <details style="margin-top:16px"><summary class="more-link">More accreditation details</summary><dl class="facts" style="margin-top:12px">
     <dt>Issued</dt><dd>${L.fr?fmtDate(L.fr):NA}</dd><dt>Last amended</dt><dd>${L.am?fmtDate(L.am):NA}</dd>
     <dt>Extended validity</dt><dd>${L.ig&&L.ig.ext?esc(L.ig.ext):NA}</dd>
     ${L.ig&&L.ig.cert&&L.ig.cert.split(' ')[0]!==L.cn?`<dt>Number in integrated list</dt><dd>${esc(L.ig.cert)}</dd>`:''}
     <dt>Scope document</dt><dd>${L.su?esc(L.su)+scopeLink(L):NA}</dd><dt>Status source</dt><dd>${esc(st.src)||NA}</dd></dl>
     <p class="small muted">If the validity date has passed, the lab may have renewed since this data was published. Confirm on the NABL certificate.</p></details>`+E;}
  if(tab==='scope'){const full=new URLSearchParams(location.hash.split('?')[1]||'').get('full');const D=discNames(L),G=grpNames(L),Sg=subNames(L);
    return S0+`<h2>Does this lab cover my test?</h2><p class="muted">Type the test and what is being tested, e.g. “lead in drinking water” or “pressure gauge”.</p>
     <form class="bigsearch" style="box-shadow:none;border:1px solid var(--line)" data-act="labscope" data-id="${L.id}"><label class="sr" for="lsq">Test to check</label><input id="lsq" type="search" placeholder="Test or product" value="${esc(S.lastScopeQ||'')}"><button class="btn primary">Check</button></form>
     <div id="scoperes" style="margin-top:12px">${S.lastScopeQ?scopeVerdict(L,S.lastScopeQ):''}</div>`+E+
     S0+`<h2>Accredited scope</h2>${!hasScope(L)?'<p class="muted">Scope details are not listed for this record. Contact the lab or see its scope document.</p>':
     full?`<input type="search" id="scopefilter" placeholder="Search within scope" style="max-width:320px;margin-bottom:10px"><div class="tree" id="scopetree"><ul>
      ${D.length?`<li class="disc">Disciplines</li><li><ul>${D.map(d=>`<li>${esc(d)}</li>`).join('')}</ul></li>`:''}
      ${G.length?`<li class="disc">Groups</li><li><ul>${G.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></li>`:''}
      ${Sg.length?`<li class="disc">Products / materials</li><li><ul>${Sg.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></li>`:''}</ul></div>
      <p class="small muted">Test-by-test details (parameter, method, range) are in the lab's scope document${L.su?' ('+esc(L.su)+')':''}.</p>`
     :`<p class="muted">${D.length} discipline${D.length===1?'':'s'}${G.length?', '+G.length+' groups':''}${Sg.length?', '+Sg.length+' products / materials':''}.</p><button class="btn" data-go="#/lab/${L.id}/${L.slug}?tab=scope&full=1">View Accredited Scope</button>`}`+E;}
  if(tab==='recognitions') return S0+`<h2>Recognitions</h2>${visRegs(L).length?`<ul class="trust">${visRegs(L).map(r=>`<li><span class="ic" aria-hidden="true">✓</span><div><b>${esc(recName(r))} Recognised</b><small>${esc(REGNAME[r]||'')}${L.ig.cycle?' · '+esc(L.ig.cycle):''}</small></div></li>`).join('')}</ul><p class="small muted" style="margin-top:12px">Source: integrated labs list, updated 15.09.2026.</p>`:
    L.ig?'<p class="muted">Listed as an integrated lab, but no verified regulator recognition is shown.</p>':'<p class="muted">No regulator recognition is recorded for this laboratory. A lab working in a regulated sector is not assumed to be recognised.</p>'}
    <h2 style="margin-top:22px">Other accreditations</h2><p class="muted">${L.ac?`${L.ac} additional certificate${L.ac>1?'s are':' is'} on record with NABL. Details will be shown once verified.`:'None recorded.'}</p>`+E;
  if(tab==='facilities'){const row=(k,v)=>`<dt>${k}</dt><dd>${v}</dd>`;const yn=v=>v?'Yes':'No';const dv=demoVals(L);const dm=v=>dv?yn(v)+' <span class="badge b-demo">demo</span>':NA;
    return S0+`<h2>Facilities</h2><dl class="facts">${row('Permanent laboratory',yn(L.pf))}${row('On-site testing / calibration',yn(L.sf))}${row('Mobile laboratory',yn(L.mf))}${row('Accepts outside samples',/open/i.test(L.sv||'')?'Yes':L.sv?esc(L.sv):NA)}
     ${row('Home collection',dm(dv&&dv.home))}${row('Sample pickup',dm(dv&&dv.pickup))}${row('Online booking',dm(dv&&dv.online))}${row('Digital reports',dm(dv&&dv.digital))}</dl>`+E;}
  if(tab==='contact') return `<div class="ov"><div>${S0}<h2>Contact</h2><dl class="facts">
    <dt>Contact person</dt><dd>${esc(field(L,'cp'))||NA}</dd>
    <dt>Phone</dt><dd>${phone.length?phone.map(p=>`<a href="tel:${esc(p)}">${esc(p)}</a>`).join(' / '):NA}</dd>
    <dt>Email</dt><dd>${field(L,'em')?`<a href="mailto:${esc(field(L,'em'))}">${esc(field(L,'em'))}</a>`:NA}</dd>
    <dt>Address</dt><dd>${esc([field(L,'ad'),L.city,L.state,field(L,'p')].filter(Boolean).join(', '))||NA}</dd>
    <dt>Website</dt><dd>${NA}</dd><dt>Opening hours</dt><dd>${NA}</dd></dl>
    <p style="margin-top:16px"><a class="btn primary" href="${dirURL(L)}" target="_blank" rel="noopener">Get Directions</a></p>${E}</div>
    <div>${S0}<h2>Location</h2><div id="labmap" style="height:280px;position:relative;border:1px solid var(--line);border-radius:var(--radius-s);overflow:hidden"></div>
    <p class="small muted" style="margin-top:8px">${L.gp>0?'Approximate position (by '+(L.gp===1?'PIN area':L.gp===2?'city':'state')+'). Directions use the full address.':'Positioned by PIN code.'}</p>${E}</div></div>`;
  return '';
}

/* ----- Compare ----- */
function viewCompare(){
  const labs=S.compare.map(id=>BYID[id]).filter(Boolean);
  if(labs.length) Store.logEvent({type:'compare',ids:labs.map(l=>l.id)});
  if(!labs.length) return `<main id="main" class="page"><h1>Compare laboratories</h1><p class="muted">Add up to four laboratories using “Compare” on search results.</p><a class="btn primary" href="${S.lastSearchHash||'#/find'}">Find laboratories</a></main>`;
  const o=S.origin||S.userLoc,full=S.cmpFull;
  const dv=L=>demoVals(L),dm=s=>s+' <span class="badge b-demo">demo</span>';
  const sm=L=>S.P&&S.q?scopeMatch(L,S.P):null;
  const rows=[
   ['Distance',L=>o&&L.la!=null?fmtKm(km(o.la,o.lo,L.la,L.lo)):'—'],
   ['Service',L=>{const s=svcList(L,sm(L),2);return s.length?s.map(x=>esc(short(x,30))).join('<br>'):'—';}],
   ['Scope match',L=>{const m=sm(L);return !m?'<span class="muted">No test searched</span>':m.lvl==='category'||m.lvl==='exact'?'<span class="yes">✓</span>':m.lvl==='related'?'Related':'—';}],
   ['NABL',L=>{const s=accStatus(L);return s.k==='valid'||s.k==='warn'?`<span class="yes">✓</span> <span class="small muted">until ${fmtDate(L.to)}</span>`:`<span style="color:var(--lapse)">${esc(s.label)}</span>`;}],
   ['Price',L=>dv(L)?dm('₹'+dv(L).price.toLocaleString('en-IN')):'<span class="na">Not available</span>'],
   ['TAT',L=>dv(L)?dm(tatLabel(dv(L).tatH)):'<span class="na">Not available</span>'],
   ['Home Collection',L=>dv(L)?dm(dv(L).home?'Yes':'No'):'<span class="na">Not available</span>'],
   ['Regulator',L=>L.ig&&L.ig.regs.length?L.ig.regs.map(r=>`<span class="rec">${esc(recName(r))}</span>`).join(' '):'—']];
  const more=[
   ['Type',L=>TYPES[L.t].name],['Location',L=>esc([L.city,L.state].filter(Boolean).join(', '))],['Accreditation no.',L=>esc(L.cn)],
   ['All service areas',L=>{const g=L.t==='M'?discNames(L):grpNames(L);return g.length?g.slice(0,8).map(esc).join(', ')+(g.length>8?'…':''):'—';}],
   ['Facilities',L=>[L.pf?'Permanent':'',L.sf?'On-site':'',L.mf?'Mobile':''].filter(Boolean).join(', ')||'—'],
   ['Accepts outside samples',L=>/open/i.test(L.sv||'')?'Yes':esc(L.sv)||'—'],['Other accreditations',L=>L.ac?L.ac+' on record':'None'],
   ['Phone',L=>esc(field(L,'mo'))||'—'],['Email',L=>esc(field(L,'em'))||'—']];
  const tr=list=>list.map(([k,f])=>`<tr><th scope="row">${k}</th>${labs.map(L=>`<td>${f(L)}</td>`).join('')}</tr>`).join('');
  return `<main id="main" class="p-body"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h1 style="font-size:28px;margin:0">Compare laboratories</h1><div class="row"><button class="btn" data-act="cmpclear">Clear</button><a class="btn" href="${S.lastSearchHash||'#/find'}">Add more</a></div></div>
  <p class="muted">Facts side by side. We don't rank or score laboratories.</p>
  <div class="tscroll sec" style="padding:0"><table class="tbl cmp2"><thead><tr><th scope="col"><span class="sr">Feature</span></th>${labs.map(L=>`<th scope="col" style="min-width:190px"><a href="#/lab/${L.id}/${L.slug}" style="font-size:15px;color:var(--text)">${esc(L.n)}</a><div><button class="btn small ghost" data-act="cmp" data-id="${L.id}">Remove</button></div></th>`).join('')}</tr></thead>
  <tbody>${tr(rows)}${full?tr(more):''}</tbody></table></div>
  <p><button class="btn" data-act="cmpfull">${full?'Show fewer details':'View More Details'}</button></p></main>`;
}

/* ----- Simple pages ----- */
function viewAbout(){
  return `<main id="main" class="page"><h1>About Find a Lab</h1>
  <p>Find a Lab helps you find a laboratory accredited by NABL, the National Accreditation Board for Testing and Calibration Laboratories, for the test or service you need.</p>
  <h2 style="font-size:20px;margin-top:28px">What NABL accreditation means</h2>
  <p>An accredited laboratory has been independently assessed for competence in a defined list of tests or calibrations, called its <b>scope</b>. A lab may offer other tests too, so each result shows whether its accredited scope covers what you searched for.</p>
  <h2 style="font-size:20px;margin-top:28px">Where the information comes from</h2>
  <p>Laboratory details come from NABL records. Regulator recognitions (for example FSSAI, EIC or APEDA) come from the integrated labs list, updated 15 September 2026. Recognition is shown only where it is recorded.</p>
  <p>Prices, turnaround times and home collection are not yet published by laboratories, so they show as “not available”. Map pins are placed by PIN code or city, not the exact address.</p>
  <p style="margin-top:24px"><a class="btn primary" href="#/find">Find a lab</a> <a class="btn" href="#/for-labs">For laboratories</a></p></main>${footer()}`;
}
function viewForLabs(){
  return `<main id="main" class="page"><h1>For Laboratories</h1>
  <p>Laboratories do not need an account. Your public profile is built from NABL records, and you can check how it appears by searching for your laboratory on Find a Lab.</p>
  <p>If contact or location details are wrong, use <b>Report incorrect information</b> at the foot of your profile. NABL reviews every report. Accreditation details and scope come from NABL records and can only be changed by NABL.</p>
  <p style="margin-top:22px"><a class="btn primary" href="#/find">Find your laboratory</a></p>
  <p class="muted" style="margin-top:28px">NABL Admin, Regulator and NABL Board users: <a href="#/login">sign in here</a>.</p></main>${footer()}`;
}
function viewSimple(k){
  const P={contact:['Contact',`<p>For questions about accreditation, contact NABL through its official website: <a href="https://nabl-india.org" target="_blank" rel="noopener">nabl-india.org</a>.</p><p>For questions about tests, prices or appointments, contact the laboratory directly using the details on its profile.</p><p>To correct a laboratory's details, use “Report incorrect information” on its profile.</p>`],
   privacy:['Privacy',`<p>This prototype does not ask for your name or account to search. If you choose “Find labs near me”, your location is used in your browser to sort results and is not stored.</p><p>Saved and compared labs stay on your device. Reports of incorrect information are stored for NABL review.</p><p class="muted">Placeholder text for the prototype. The final policy will be issued by NABL / QCI.</p>`],
   terms:['Terms',`<p>Listing on this portal reflects NABL accreditation records only and is not an endorsement. Confirm accreditation status and scope on the laboratory's NABL certificate before relying on a result.</p><p class="muted">Placeholder text for the prototype. The final terms will be issued by NABL / QCI.</p>`]}[k];
  return `<main id="main" class="page"><h1>${P[0]}</h1>${P[1]}</main>${footer()}`;
}
