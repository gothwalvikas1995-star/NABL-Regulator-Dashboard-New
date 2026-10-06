/* ===== Authenticated module UI: login, shell, charts, role dashboards ===== */
const N=n=>Number(n||0).toLocaleString('en-IN');
const pctOf=(a,b)=>b?(Math.round(a/b*1000)/10)+'%':'—';
const STAT_COL={'Active':'#2B6681','Expiring':'#C58A1B','In process':'#7B93A0','Validity date passed':'#B5564A','Expired / suspended':'#7E2E27','Unknown':'#B9C7CE'};
const TYPE_COL={M:'#2D5467',T:'#437F9C',C:'#048FBD',P:'#6FA8C2',R:'#9CC4D6'};
const kpi2=(v,l,sub,tone)=>`<div class="kpi2 ${tone||''}"><b>${typeof v==='number'?N(v):v}</b><span>${l}</span>${sub?`<small>${sub}</small>`:''}</div>`;
const dcard=(t,body,cls,note)=>`<section class="dcard ${cls||''}"><h3>${t}</h3>${body}${note?`<p class="dnote">${note}</p>`:''}</section>`;
function hb(obj,o={}){ // horizontal bars; o.key => clickable filter
  const e=Object.entries(obj).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,o.n||10);const m=Math.max(1,...e.map(x=>x[1]));
  if(!e.length) return '<p class="muted small">No data for this selection.</p>';
  return `<div class="bars">${e.map(([k,v])=>`<${o.key?'button':'div'} class="r" ${o.key?`data-df-set="${o.key}" data-v="${esc(k)}" title="Filter by ${esc(k)}"`:''}><span title="${esc(k)}">${esc(o.label?o.label(k):k)}</span><span class="bar" style="width:${v/m*100}%;${o.color?`background:${o.color(k)}`:''}"></span><span>${N(v)}</span></${o.key?'button':'div'}>`).join('')}</div>`;
}
function donut(items,centerLabel){
  items=items.filter(i=>i.v>0);const tot=items.reduce((a,b)=>a+b.v,0);
  if(!tot) return '<p class="muted small">No data for this selection.</p>';
  const R=54,r=34,cx=70,cy=70;let a0=-Math.PI/2,paths='';
  for(const i of items){
    const a1=a0+i.v/tot*2*Math.PI,lg=(a1-a0)>Math.PI?1:0;
    paths+=items.length===1?`<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none" stroke="${i.c}" stroke-width="${R-r}"/>`
      :`<path d="M${cx+R*Math.cos(a0)} ${cy+R*Math.sin(a0)}A${R} ${R} 0 ${lg} 1 ${cx+R*Math.cos(a1)} ${cy+R*Math.sin(a1)}L${cx+r*Math.cos(a1)} ${cy+r*Math.sin(a1)}A${r} ${r} 0 ${lg} 0 ${cx+r*Math.cos(a0)} ${cy+r*Math.sin(a0)}Z" fill="${i.c}"/>`;
    a0=a1;
  }
  return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(items.map(i=>i.l+' '+i.v).join(', '))}">${paths}<text x="70" y="68" text-anchor="middle" class="dc1">${N(tot)}</text><text x="70" y="83" text-anchor="middle" class="dc2">${centerLabel||'laboratories'}</text></svg>
   <ul class="legend2">${items.map(i=>`<li><i style="background:${i.c}"></i><span>${esc(i.l)}</span><b>${N(i.v)}</b><small>${pctOf(i.v,tot)}</small></li>`).join('')}</ul></div>`;
}
function cols(items,o={}){ // items [{l,v,c}]
  const W=Math.max(320,items.length*44+30),H=170,pb=34,pt=20,m=Math.max(1,...items.map(i=>i.v)),bw=28;
  const bars=items.map((i,k)=>{const h=(H-pb-pt)*i.v/m,x=20+k*44,y=H-pb-h;return `<g><rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h,i.v?1:0)}" rx="2" fill="${i.c||o.color||'#2B6681'}"/><text x="${x+bw/2}" y="${y-4}" text-anchor="middle" class="cv">${N(i.v)}</text><text x="${x+bw/2}" y="${H-pb+13}" text-anchor="middle" class="cl">${esc(i.l)}</text>${i.l2?`<text x="${x+bw/2}" y="${H-pb+25}" text-anchor="middle" class="cl">${esc(i.l2)}</text>`:''}</g>`;}).join('');
  return `<div class="colwrap"><svg viewBox="0 0 ${W} ${H}" style="min-width:${W}px" role="img" aria-label="${esc(o.label||'Column chart')}: ${esc(items.map(i=>i.l+' '+(i.l2||'')+' '+i.v).join(', '))}"><line x1="14" x2="${W-6}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/>${bars}</svg></div>`;
}
function line(items,o={}){
  const W=Math.max(340,items.length*46+40),H=170,pl=14,pb=30,pt=18,m=Math.max(1,...items.map(i=>i.v));
  const pts=items.map((i,k)=>[pl+14+k*((W-pl*2-28)/Math.max(1,items.length-1)),H-pb-(H-pb-pt)*i.v/m]);
  const d=pts.map((p,k)=>(k?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  return `<div class="colwrap"><svg viewBox="0 0 ${W} ${H}" style="min-width:${W}px" role="img" aria-label="${esc(o.label||'Trend')}: ${esc(items.map(i=>i.l+' '+i.v).join(', '))}"><line x1="${pl}" x2="${W-6}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/>
   <path d="${d}L${pts[pts.length-1][0]} ${H-pb}L${pts[0][0]} ${H-pb}Z" fill="#2B6681" opacity=".10"/><path d="${d}" fill="none" stroke="#2B6681" stroke-width="2.5"/>
   ${pts.map((p,k)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="#2B6681" stroke-width="2"/><text x="${p[0]}" y="${p[1]-8}" text-anchor="middle" class="cv">${N(items[k].v)}</text><text x="${p[0]}" y="${H-pb+14}" text-anchor="middle" class="cl">${esc(items[k].l)}</text>`).join('')}</svg></div>`;
}
const statusItems=a=>STATUS_CATS.map(c=>({l:c,v:a.status[c]||0,c:STAT_COL[c]}));
const typeItems=a=>Object.keys(TYPES).map(k=>({l:TYPES[k].short,v:a.type[k]||0,c:TYPE_COL[k]}));
function expiryItems(a){
  const ks=Object.keys(a.exp).filter(k=>k!=='Passed').sort();
  const out=[];if(a.exp.Passed) out.push({l:'Passed',v:a.exp.Passed,c:'#B5564A'});
  ks.forEach(k=>{const [y,q]=k.split(' ');out.push({l:q,l2:y,v:a.exp[k],c:'#2B6681'});});return out;
}
function issueItems(a){return Object.keys(a.iss).sort().map(k=>{const [y,q]=k.split(' ');return {l:q+' \''+y.slice(2),v:a.iss[k]};});}
const scopeChart=a=>hb(a.scope,{n:10})+`<p class="dnote">${N(a.noScope)} of ${N(a.n)} laboratories list no discipline (all PTP and RMP records, and some others).</p>`;

/* ----- tags ----- */
function regTag(reg,rel,pending){
  return rel==='Primary'?`<span class="rec prim">Primary Regulator: ${esc(recName(reg))}${pending?' (pending)':''}</span>`:`<span class="rec">Recognised by: ${esc(recName(reg))}</span>`;
}
const tagsAdmin=rows=>rows.slice().sort((a,b)=>(b.rel==='Primary')-(a.rel==='Primary')).map(r=>regTag(r.reg,r.rel,r.ver==='Pending'&&r.rel==='Primary')).join('')||'<span class="muted small">None</span>';
const statusTag=(cat,L)=>accTag(accStatus(L),L);
function labTable(rows,mode,total,pageKey){
  return `<div class="tscroll dcard" style="padding:0"><table class="tbl dt"><thead><tr><th>Laboratory</th><th>Type</th><th>Location</th><th>Certificate</th><th>Valid to</th><th>Status</th><th>Regulators</th></tr></thead><tbody>
   ${rows.map(r=>{const L=BYID[r.id];
     const tags=mode==='admin'?tagsAdmin(r.rows):mode==='own'?regTag(r.mine.reg,'Primary',r.mine.ver==='Pending')+r.tags.map(t=>regTag(t.reg,t.rel)).join(''):`<span class="rec">Recognised by: ${esc(recName(r.mine.reg))}</span>`+r.tags.map(t=>regTag(t.reg,t.rel)).join('');
     return `<tr><td><a href="#/dash/lab/${encodeURIComponent(r.id)}">${esc(r.n)}</a><div class="small muted">${esc(r.id)}</div></td><td>${TYPES[r.t].short}</td><td>${esc([r.city,r.state].filter(Boolean).join(', '))}</td><td>${esc(r.cn)}</td><td>${r.to?fmtDate(r.to):'—'}</td><td>${statusTag(r.status,L)}</td><td><div class="tags">${tags}</div></td></tr>`;}).join('')||`<tr><td colspan="7" class="muted">No laboratories for this selection.</td></tr>`}
   </tbody></table></div>${total>rows.length?`<p style="margin-top:10px"><button class="btn" data-dact="more" data-k="${pageKey}">Show more (${N(total-rows.length)} remaining)</button></p>`:''}`;
}

/* ----- landing: NABL sign-in (first page) ----- */
function viewLogin(msg){
  S.landing=true;document.title='NABL — Sign in';
  const cur=API.session();const accts=window.NABL_ACCOUNTS||[];
  return `<main id="main" class="land">
   <section class="land-info" aria-labelledby="ltitle"><div class="land-in">
     <p class="eyebrow">Quality Council of India</p>
     <h1 id="ltitle">National Accreditation Board for Testing and Calibration Laboratories</h1>
     <p class="lead">The national platform for laboratory accreditation data, regulatory oversight and public laboratory search.</p>
     <ul class="facts2">
       <li><b>About NABL</b><span>A constituent board of the Quality Council of India (QCI). NABL accredits laboratories that demonstrate technical competence against international standards.</span></li>
       <li><b>What NABL accredits</b><span>Testing and calibration laboratories (ISO/IEC 17025), medical laboratories (ISO 15189), proficiency testing providers (ISO/IEC 17043) and reference material producers (ISO 17034).</span></li>
       <li><b>This platform</b><span>Secure dashboards for NABL, regulators and the NABL Board. Members of the public can search accredited laboratories without signing in.</span></li>
     </ul></div></section>
   <section class="land-form" aria-label="Sign in"><div class="land-card">
     <h2>Sign in</h2><p class="muted small" style="margin:0 0 14px">NABL Admin · Regulator · NABL Board</p>
     ${cur?`<p>You are signed in as <b>${esc(cur.name)}</b> (${ROLES[cur.role]}).</p><p class="row"><a class="btn primary" href="#/dash">Open my dashboard</a><button class="btn" data-dact="signout">Sign out</button></p>`:`
     <form class="loginf" data-act="dlogin" autocomplete="on" novalidate>
      <div class="field"><label for="lemail"><b>Email</b></label><input id="lemail" name="email" type="email" autocomplete="username" required placeholder="name@organisation"></div>
      <div class="field"><label for="lpw"><b>Password</b></label><input id="lpw" name="password" type="password" autocomplete="current-password" required></div>
      <p id="lerr" class="lerr" role="alert">${esc(msg||'')}</p>
      <button class="btn primary" style="width:100%;justify-content:center;padding:12px" id="lgo">Sign in</button>
      <p class="small muted" style="margin:12px 0 0">After five failed attempts sign-in pauses for a minute. Sessions end after 30 minutes without activity.</p>
     </form>`}
     <div class="land-alt"><span>Looking for an accredited laboratory?</span><a class="btn" href="#/find">Go to Find a Lab</a></div>
     <details class="demo"><summary>Demo accounts (prototype only)</summary>
      <p class="small muted">All demo accounts use the password <code>${DEMO_PW}</code>. Each regulator account is tied to one regulator.</p>
      <table class="tbl"><tbody>${accts.map(a=>`<tr><td>${a.role==='regulator'?'Regulator — '+esc(recName(a.reg)):ROLES[a.role]}</td><td><button class="linkbtn" data-dact="fill" data-e="${esc(a.email)}">${esc(a.email)}</button></td></tr>`).join('')}</tbody></table>
      <p class="small muted">Prototype notice: sign-in and access checks run inside this page so the rules can be reviewed. A live service must use NABL single sign-on with multi-factor authentication and enforce every rule on the server.</p></details>
   </div></section>
   <footer class="land-foot"><span>© National Accreditation Board for Testing and Calibration Laboratories, Quality Council of India</span><span><a href="#/about">About</a> · <a href="#/contact">Contact</a> · <a href="#/privacy">Privacy</a> · <a href="#/terms">Terms</a></span></footer>
  </main>`;
}

/* ----- shell ----- */
const NAV={admin:[['overview','Dashboard'],['regulators','Regulator master'],['mapping','Lab–regulator mapping'],['reports','Reports'],['quality','Data quality'],['accreditation','Accreditation status'],['corrections','Public reports'],['import','Bulk import'],['analytics','Search analytics'],['settings','Settings']],
 regulator:[['overview','Dashboard'],['database','Entire NABL laboratory database'],['labs','My laboratories'],['associated','Recognised / associated'],['reports','Reports']],
 board:[['overview','Dashboard'],['reports','Reports']]};
function viewDash(sub,arg){
  let me;try{ me=API.session(); if(!me) throw new ApiError(401);}catch(e){return viewLogin('Please sign in to continue.');}
  S.role={r:me.role};sub=sub||'overview';
  let body='';
  try{
    const fn=PAGES[me.role][sub==='lab'?'lab':sub];
    if(!fn||(sub!=='lab'&&!NAV[me.role].some(n=>n[0]===sub))) throw new ApiError(403,'This page is not available to your role.');
    body=fn(arg);
  }catch(e){
    if(e instanceof ApiError&&e.code===401) return viewLogin('Your session has ended. Please sign in again.');
    body=e instanceof ApiError?`<div class="sec"><h1 style="font-size:22px">${e.code===403?'Access denied':'Not found'}</h1><p>${esc(e.message)}</p><p><a class="btn primary" href="#/dash">Back to my dashboard</a></p></div>`:(console.error(e),'<div class="sec"><p>This view could not be displayed.</p></div>');
  }
  const prof=me.role==='regulator'?(()=>{try{return API.regProfile();}catch(e){return null;}})():null;
  return `<main id="main" class="portal"><nav class="side" aria-label="${ROLES[me.role]} menu"><div class="grp">${ROLES[me.role]}${prof?` · ${esc(recName(prof.code))}`:''}</div>
   ${NAV[me.role].map(([k,v])=>`<a href="#/dash/${k}" ${sub===k||(sub==='lab'&&k==='labs')?'aria-current="page"':''}>${v}</a>`).join('')}
   <div class="grp">Account</div><a href="#/find">Find a Lab (public)</a><button class="linkbtn sidebtn" data-dact="signout">Sign out</button></nav>
   <div class="pmain"><div class="dtop"><span class="small muted">Signed in as <b>${esc(me.name)}</b>${prof?` · ${esc(prof.name)}`:''}</span></div>${body}</div></main>`;
}

/* ----- filters ----- */
const cityOptsFor=(st,sel)=>Object.values(CITY_INDEX).filter(c=>!st||c.state===st).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option ${sel===c.name?'selected':''}>${esc(c.name)}</option>`).join('');
function filterBar(key,F,opts){
  const sel=(k,label,vals,cur)=>`<label class="fl"><span>${label}</span><select data-df="${key}.${k}"><option value="">All</option>${vals.map(v=>`<option value="${esc(v[0])}" ${cur===v[0]?'selected':''}>${esc(v[1])}</option>`).join('')}</select></label>`;
  return `<form class="dfilters" aria-label="Dashboard filters" onsubmit="return false">
   <label class="fl"><span>Lab ID or name</span><input type="search" data-df="${key}.q" value="${esc(F.q||'')}" placeholder="e.g. T-0119" autocomplete="off"></label>
   ${sel('state','State',STATES.map(s=>[s,s]),F.state)}
   <label class="fl"><span>City</span><select data-df="${key}.city"><option value="">All</option>${cityOptsFor(F.state,F.city)}</select></label>
   ${sel('type','Laboratory type',Object.entries(TYPES).map(([k,v])=>[k,v.short]),F.type)}
   ${opts.reg?sel('reg','Regulator',eff().regs.map(r=>[r.code,recName(r.code)]),F.reg):''}
   ${sel('status','Accreditation status',STATUS_CATS.map(s=>[s,s]),F.status)}
   ${opts.date?`<label class="fl"><span>Validity ends from</span><input type="date" data-df="${key}.from" value="${F.from||''}"></label><label class="fl"><span>to</span><input type="date" data-df="${key}.to" value="${F.to||''}"></label>`:''}
   <button type="button" class="btn small" data-dact="clearf" data-k="${key}">Clear filters</button></form>`;
}

/* ----- lab-type bifurcation (KPI cards that also act as filters) ----- */
function typeStrip(types,F,key,title){
  const sum=TYPE_ORDER.reduce((a,k)=>a+types[k].n,0),act=(F&&F.type)||'';
  return `<section class="tstrip" aria-label="${esc(title)}"><div class="tshead"><h3>${esc(title)}</h3><span class="muted small">${N(sum)} ${act?'across all types (before the type filter) · ':'in total · '}select a type to filter this page</span>${act?`<button class="linkbtn" data-df-set="${key}.type" data-v="${act}">Show all types</button>`:''}</div>
   <div class="tbar" role="img" aria-label="Share of laboratories by type">${TYPE_ORDER.map(k=>types[k].n?`<i style="flex:${types[k].n};background:${TYPE_COL[k]}" title="${TYPES[k].short}: ${N(types[k].n)}"></i>`:'').join('')}</div>
   <div class="tcards">${TYPE_ORDER.map(k=>{const t=types[k];return `<button type="button" class="tcard ${act===k?'on':''}" data-df-set="${key}.type" data-v="${k}" aria-pressed="${act===k}" ${t.n||act===k?'':'disabled'}>
    <span class="tn"><i class="tdot" style="background:${TYPE_COL[k]}"></i>${esc(TYPES[k].plural||TYPES[k].name)}</span><b>${N(t.n)}</b><small>${pctOf(t.n,sum)} of total</small><small>${N(t.active)} accredited · ${N(t.expiring)} expiring · ${N(t.lapsed)} lapsed</small></button>`;}).join('')}</div></section>`;
}
function boardBar(F){
  return `<form class="dfilters" aria-label="Board filters" onsubmit="return false"><label class="fl"><span>State</span><select data-df="bf.state"><option value="">All states</option>${STATES.map(x=>`<option ${F.state===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
   <button type="button" class="btn small" data-dact="clearf" data-k="bf">Clear filters</button><span class="muted small">Board filters narrow the aggregates only; laboratory-level records are never listed.</span></form>`;
}

/* ----- pages ----- */
const PAGES={admin:{},regulator:{},board:{}};
PAGES.admin.overview=()=>{
  const F=S.df||{};const d=API.adminDash(F),a=d.agg;S.mapCounts=a.state;S.mapClick='admin';
  const L=API.adminLabs(F,0,S.dp_admin||25);
  const rc={};Object.entries(d.regCounts).forEach(([k,v])=>rc[recName(k)]=v.p+v.r);
  return `<h1 class="dh1">NABL Admin dashboard</h1><p class="muted dsub">Organisation-wide view. Accreditation status is read from valid-to dates in the NABL extract and the integrated labs list.</p>
  ${filterBar('df',d.filters,{reg:true,date:true})}
  <div class="kpis2">
   ${kpi2(a.n,'Total laboratories',Object.keys(d.filters).length?'matching filters':'')}${kpi2(a.active,'Active NABL accredited','valid or ending within 90 days')}
   ${kpi2(d.activeRegs,'Active regulators')}${kpi2(a.expiring,'Expiring accreditations','within 90 days','warn')}
   ${kpi2(a.lapsed,'Expired / suspended',`${N(a.status['Validity date passed']||0)} validity date passed · ${N(a.status['Expired / suspended']||0)} expired or suspended`,'bad')}
   <a class="kpi2 link" href="#/dash/mapping?ver=Pending">${'<b>'+N(d.pending+d.openReports)+'</b><span>Pending verification</span><small>'+N(d.pending)+' mappings · '+N(d.openReports)+' public reports</small>'}</a>
   <a class="kpi2 link" href="#/dash/quality"><b>${N(d.dqIssues)}</b><span>Data quality issues</span><small>across ${N(d.dqLabs)} laboratories</small></a></div>
  ${typeStrip(d.types,d.filters,'df','Laboratories by type: Testing · Medical · Calibration · PTP · RMP')}
  <div class="dgrid">
   ${dcard('Laboratories by state',hb(a.state,{n:12,key:'df.state'}),'','Select a bar to filter.')}
   ${dcard('Laboratories by laboratory type',donut(typeItems(a)))}
   ${dcard('Laboratories by regulator',hb(rc,{n:10})+`<p class="dnote">${N(d.unmapped)} laboratories in this view have no regulator relationship recorded. A laboratory can appear under several regulators.</p>`)}
   ${dcard('Accreditation status',donut(statusItems(a)))}
   ${dcard('Accreditation expiry trend',cols(expiryItems(a),{label:'Validity end by quarter'}),'wide','Quarter in which the current certificate’s valid-to date falls. “Passed” = the date is already behind us in the extract.')}
   ${dcard('Scope distribution',scopeChart(a))}
  </div>
  <h2 class="dh2">Laboratories in this view <span class="muted small">(${N(L.total)})</span></h2>${labTable(L.rows,'admin',L.total,'admin')}`;
};
PAGES.admin.lab=id=>labDetailHTML(API.labDetail(decodeURIComponent(id||'')));
PAGES.admin.regulators=()=>{
  const regs=API.regulators();
  return `<h1 class="dh1">Regulator master</h1><p class="muted dsub">Regulators known to the platform. Type and level are reference values entered by NABL; the source workbooks carry regulator flags only.</p>
  <p><button class="btn primary" data-dact="regnew">Add regulator</button></p>
  <div class="tscroll dcard" style="padding:0"><table class="tbl dt"><thead><tr><th>Short name</th><th>Regulator</th><th>Type</th><th>Level</th><th>Status</th><th>Contact</th><th>Laboratories<br><span class="small">primary · recognised</span></th><th></th></tr></thead><tbody>
  ${regs.map(g=>`<tr><td><b>${esc(recName(g.code))}</b></td><td>${esc(g.name)}</td><td>${esc(g.type)}</td><td>${esc(g.level)}</td><td><span class="acc ${g.status==='Active'?'':'plain'}">${g.status}</span></td><td>${esc([g.contact,g.email,g.phone].filter(Boolean).join(' · '))||'<span class="na">Not recorded</span>'}</td>
   <td><a href="#/dash/mapping?reg=${encodeURIComponent(g.code)}">${N(g.primary)} · ${N(g.recognised)}</a></td><td><button class="btn small" data-dact="regedit" data-c="${esc(g.code)}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
};
PAGES.admin.mapping=()=>{
  const p=new URLSearchParams((location.hash.split('?')[1])||'');
  const f=S.mf||(S.mf={});if(S.mapHash!==location.hash){S.mapHash=location.hash;['reg','ver','rel'].forEach(k=>{if(p.get(k)!==null)f[k]=p.get(k)||undefined;});}
  const r=API.mapping(f,0,S.dp_map||40);const regs=API.regulators();
  return `<h1 class="dh1">Lab–regulator mapping</h1><p class="muted dsub">A laboratory has one primary regulator and any number of recognised or associated regulators. Only verified relationships with <b>Public</b> visibility appear as tags on the public site. <b>Shared</b> relationships are also visible, as tags only, to other regulators that recognise the same laboratory. <b>Internal</b> ones stay with NABL and the regulator concerned.</p>
  <form class="dfilters" onsubmit="return false"><label class="fl"><span>Regulator</span><select data-mf="reg"><option value="">All</option>${regs.map(g=>`<option value="${esc(g.code)}" ${f.reg===g.code?'selected':''}>${esc(recName(g.code))}</option>`).join('')}</select></label>
   <label class="fl"><span>Relationship</span><select data-mf="rel"><option value="">All</option><option ${f.rel==='Primary'?'selected':''}>Primary</option><option ${f.rel==='Recognised'?'selected':''}>Recognised</option></select></label>
   <label class="fl"><span>Verification</span><select data-mf="ver"><option value="">All</option>${VERIF.map(v=>`<option ${f.ver===v?'selected':''}>${v}</option>`).join('')}</select></label>
   <label class="fl"><span>Laboratory name or ID</span><input type="search" data-mf="q" value="${esc(f.q||'')}" placeholder="Search"></label>
   <button class="btn small" data-dact="clearf" data-k="mf">Clear</button></form>
  <div class="row" style="margin:10px 0"><button class="btn primary" data-dact="mapnew">Add mapping</button><button class="btn" data-dact="verifyall">Verify all pending (${N(API.adminDash({}).pending)})</button><span class="muted small">${N(r.total)} relationships</span></div>
  <div class="tscroll dcard" style="padding:0"><table class="tbl dt"><thead><tr><th>Laboratory</th><th>Regulator</th><th>Relationship</th><th>Recognition status</th><th>Validity</th><th>Verification</th><th>Visibility</th><th></th></tr></thead><tbody>
  ${r.rows.map(m=>`<tr><td><a href="#/dash/lab/${encodeURIComponent(m.labId)}">${esc(m.labName)}</a><div class="small muted">${esc(m.labId)} · ${esc(m.state)}</div></td><td>${esc(recName(m.reg))}</td><td>${m.rel==='Primary'?'<b>Primary</b>':'Recognised / associated'}</td><td>${esc(m.recog)}</td><td>${esc(m.validity)||'<span class="na">—</span>'}</td>
   <td><span class="acc ${m.ver==='Pending'?'warn':''}">${m.ver}</span></td><td>${m.vis}</td><td><button class="btn small" data-dact="mapedit" data-k="${esc(m.key)}">Edit</button></td></tr>`).join('')||'<tr><td colspan="8" class="muted">No relationships match.</td></tr>'}</tbody></table></div>
  ${r.total>r.rows.length?`<p style="margin-top:10px"><button class="btn" data-dact="more" data-k="map">Show more</button></p>`:''}`;
};
PAGES.admin.reports=()=>reportsPage();
PAGES.admin.quality=()=>dqView();
PAGES.admin.accreditation=()=>accView();
PAGES.admin.import=()=>importView();
PAGES.admin.analytics=()=>analyticsView();
PAGES.admin.corrections=()=>{
  const R=Store.mem.requests;
  return `<h1 class="dh1">Public reports</h1><p class="muted dsub">Reports of incorrect information sent from laboratory profiles on the public site. Each decision is recorded in the audit trail.</p>
  ${R.length?R.map(r=>reqCard(r,`<div class="row" style="margin:8px 0"><input type="text" id="c-${r.id}" placeholder="Comment (required to reject or ask for details)" style="max-width:340px">
    <button class="btn small" data-act="adv" data-id="${r.id}" data-to="Under review" data-who="NABL Admin">Start review</button><button class="btn small primary" data-act="adv" data-id="${r.id}" data-to="Published" data-who="NABL Admin">Mark resolved</button>
    <button class="btn small" data-act="adv" data-id="${r.id}" data-to="Correction required" data-who="NABL Admin">Ask for details</button><button class="btn small danger" data-act="adv" data-id="${r.id}" data-to="Rejected" data-who="NABL Admin">Reject</button></div>`)).join(''):'<div class="sec muted">No reports yet. Use “Report incorrect information” on any public laboratory profile to create one.</div>'}`;
};
PAGES.admin.settings=()=>{const st=Store.mem.settings||{};return `<h1 class="dh1">Settings</h1><form class="sec" data-act="settings">
  <div class="field"><span>Scope document base URL</span><input type="text" id="sbase" value="${esc(st.scopeBase||'')}" placeholder="https://… (prefix added to the ScopeURL file name)"></div>
  <label class="chk"><input type="checkbox" id="sdemo" ${Demo.on?'checked':''}><span>Demo enrichment on the public site (sample price / turnaround / facilities, labelled “demo”)</span></label><button class="btn primary" style="margin-top:12px">Save settings</button></form>
  <div class="sec"><h3>Recent account and data activity</h3><div class="audit">${Store.mem.audit.slice(0,25).map(a=>`${new Date(a.ts).toLocaleString('en-IN')} — ${esc(a.what)}`).join('<br>')||'None yet.'}</div></div>`;};

/* Regulator */
PAGES.regulator.overview=()=>{
  const F=S.rf||{};const d=API.regDash(F),a=d.agg,pr=API.regProfile();
  return `<h1 class="dh1">${esc(recName(pr.code))} dashboard</h1><p class="muted dsub">${esc(pr.name)} · ${esc(pr.level)} · ${esc(pr.type)}. Every figure below is calculated from laboratories mapped to you as primary regulator.</p>
  <div class="startgrid">
   <div class="startcard"><span class="step">1</span><h2><a href="#/dash/database">Entire NABL Laboratory Database</a></h2><p class="big">${N(d.all.n)} <small>laboratories</small></p><p class="small muted">${N(d.all.active)} accredited · ${d.all.states} states and UTs. Public-level listing of every NABL laboratory with verified regulator tags.</p>
    <div class="pills">${TYPE_ORDER.map(k=>`<button type="button" class="pill" data-dact="gotype" data-k="database" data-t="${k}" title="Open the database filtered to ${TYPES[k].short}">${TYPES[k].short} <b>${N(d.all.types[k].n)}</b></button>`).join('')}</div><a class="go" href="#/dash/database">Open the database →</a></div>
   <div class="startcard mine"><span class="step">2</span><h2><a href="#/dash/labs">My Laboratories</a></h2><p class="big">${N(d.mineTotal)} <small>laboratories</small></p><p class="small muted">${N(d.mineActive)} accredited. Laboratories mapped to ${esc(recName(pr.code))} as primary regulator, with full records.</p>
    <div class="pills">${TYPE_ORDER.map(k=>`<button type="button" class="pill" data-dact="gotype" data-k="labs" data-t="${k}" title="Open my laboratories filtered to ${TYPES[k].short}">${TYPES[k].short} <b>${N(d.mineTypes[k].n)}</b></button>`).join('')}</div><a class="go" href="#/dash/labs">Open my laboratories →</a></div></div>
  <h2 class="dh2" style="margin-top:6px">${esc(recName(pr.code))} figures <span class="muted small">(my laboratories only)</span></h2>
  ${filterBar('rf',d.filters,{})}
  <div class="kpis2">${kpi2(a.n,'My laboratories')}${kpi2(a.active,'NABL accredited','valid or ending within 90 days')}${kpi2(a.expiring,'Expiring accreditation','within 90 days','warn')}
   ${kpi2(a.lapsed,'Expired accreditation',`${N(a.status['Validity date passed']||0)} validity date passed · ${N(a.status['Expired / suspended']||0)} expired or suspended`,'bad')}
   ${kpi2(d.pending,'Pending verification','regulator mapping awaiting NABL confirmation')}${kpi2(d.scopePct+'%','Scope / service coverage',`${N(a.discs)} disciplines across ${N(a.withScope)} labs with scope data`)}</div>
  ${typeStrip(d.types,d.filters,'rf','My laboratories by type')}
  <div class="dgrid">${dcard('My labs by state',hb(a.state,{n:12,key:'rf.state'}))}${dcard('My labs by laboratory type',donut(typeItems(a)))}
   ${dcard('Accreditation status',donut(statusItems(a)))}${dcard('Scope distribution',scopeChart(a))}${dcard('Accreditation expiry',cols(expiryItems(a),{label:'Validity end by quarter'}),'wide')}</div>
  <div class="sec assoc"><b>Other recognised / associated laboratories: ${N(d.associated)}</b><p class="small muted" style="margin:4px 0 8px">Laboratories whose primary regulator is someone else, shown to you because you hold a recognised relationship. They are not included in the figures above.</p><a class="btn" href="#/dash/associated">View recognised / associated laboratories</a></div>`;
};

function regTabs(active){
  const t=[['database','Entire NABL Laboratory Database'],['labs','My Laboratories'],['associated','Recognised / associated']];
  return `<div class="segtabs" role="tablist" aria-label="Laboratory lists">${t.map(([k,v])=>`<a role="tab" href="#/dash/${k}" aria-selected="${k===active}">${v}</a>`).join('')}</div>`;
}
function allTable(rows,total){
  return `<div class="tscroll dcard" style="padding:0"><table class="tbl dt"><thead><tr><th>Laboratory</th><th>Type</th><th>Location</th><th>Certificate</th><th>Valid to</th><th>Status</th><th>Regulators</th><th>Your relationship</th></tr></thead><tbody>
   ${rows.map(r=>{const L=BYID[r.id];const link=r.mine?`#/dash/lab/${encodeURIComponent(r.id)}`:`#/lab/${r.id}/${L.slug}`;
    return `<tr><td><a href="${link}">${esc(r.n)}</a><div class="small muted">${esc(r.id)}</div></td><td>${TYPES[r.t].short}</td><td>${esc([r.city,r.state].filter(Boolean).join(', '))}</td><td>${esc(r.cn)}</td><td>${r.to?fmtDate(r.to):'—'}</td><td>${statusTag(r.status,L)}</td>
     <td><div class="tags">${r.tags.map(t=>regTag(t.reg,t.rel)).join('')||'<span class="muted small">None</span>'}</div></td>
     <td>${r.mine==='primary'?'<span class="acc">My laboratory</span>':r.mine==='recognised'?'<span class="rec">Recognised / associated</span>':'<span class="muted small">—</span>'}</td></tr>`;}).join('')||'<tr><td colspan="8" class="muted">No laboratories for this selection.</td></tr>'}
   </tbody></table></div>${total>rows.length?`<p style="margin-top:10px"><button class="btn" data-dact="more" data-k="all">Show more (${N(total-rows.length)} remaining)</button></p>`:''}`;
}
PAGES.regulator.database=()=>{
  const F=S.rf||{};const r=API.allLabs(F,0,S.dp_all||25);const d=API.regDash({});
  return `<h1 class="dh1">Entire NABL laboratory database</h1>${regTabs('database')}
  <p class="muted dsub">Every laboratory in the NABL database, at public level: the facts shown on the public site plus verified public regulator tags. Full records appear only for your own and recognised laboratories; other regulators’ internal information is never shown.</p>
  ${filterBar('rf',API.regDash(F).filters,{})}
  ${typeStrip(r.types,API.regDash(F).filters,'rf','Entire database by type')}
  <div class="row" style="margin:8px 0"><span class="muted small">${N(r.total)} of ${N(d.all.n)} laboratories</span></div>${allTable(r.rows,r.total)}`;
};
PAGES.regulator.labs=()=>{
  const F=S.rf||{};const r=API.myLabs(F,0,S.dp_labs||25);
  return `<h1 class="dh1">My laboratories</h1>${regTabs('labs')}<p class="muted dsub">Laboratories directly mapped to you as primary regulator.</p>${filterBar('rf',API.regDash(F).filters,{})}
  ${typeStrip(r.types,API.regDash(F).filters,'rf','My laboratories by type')}<div class="row" style="margin:8px 0"><span class="muted small">${N(r.total)} laboratories</span><a class="btn small" href="#/dash/reports">Reports and exports</a></div>${labTable(r.rows,'own',r.total,'labs')}`;
};
PAGES.regulator.associated=()=>{
  const F=S.rf||{};const r=API.associatedLabs(F,0,S.dp_assoc||25);
  return `<h1 class="dh1">Other recognised / associated laboratories</h1>${regTabs('associated')}<p class="muted dsub">Laboratories with another primary regulator where you hold a recognised relationship. You see the shared, public-level information and verified regulator tags only. Other regulators’ internal records are not shown.</p>${filterBar('rf',API.regDash(F).filters,{})}
  ${typeStrip(r.types,API.regDash(F).filters,'rf','Recognised / associated by type')}<div class="row" style="margin:8px 0"><span class="muted small">${N(r.total)} laboratories</span></div>${labTable(r.rows,'shared',r.total,'assoc')}`;
};
PAGES.regulator.lab=id=>labDetailHTML(API.labDetail(decodeURIComponent(id||'')));
PAGES.regulator.reports=()=>reportsPage();

/* Board */
PAGES.board.overview=()=>{
  const F=S.bf||{};const d=API.boardDash(F),a=d.agg;S.mapCounts=a.state;S.mapClick=null;
  const rc={};Object.entries(d.regCounts).forEach(([k,v])=>rc[recName(k)]=v.p+v.r);
  const top=Object.entries(a.state).sort((x,y)=>y[1]-x[1]);
  return `<h1 class="dh1">NABL Board dashboard</h1><p class="muted dsub">Management overview of accredited laboratories. Figures are a snapshot of the NABL extract and the integrated labs list (15.09.2026).</p>
  ${boardBar(d.filters)}
  <div class="kpis2 big">${kpi2(a.active,'Accredited laboratories','valid or ending within 90 days')}
   ${kpi2(d.last12,'Certificates issued or renewed, last 12 months','current certificates only; not net growth')}
   ${kpi2(d.states+' / '+d.totalStates,'States and UTs covered',N(a.cities)+' cities')}${kpi2(a.expiring,'Expiring within 90 days','upcoming renewals','warn')}
   ${kpi2(pctOf(d.mappedLabs,a.n),'With a regulator relationship',N(d.mappedLabs)+' laboratories')}${kpi2(a.discs,'Disciplines covered')}</div>
  ${typeStrip(d.types,d.filters,'bf','Laboratories by type')}
  <div class="dgrid">
   ${dcard('Geographic coverage',`<div class="dmapbox"><div id="dmap" style="position:absolute;inset:0"></div></div>`,'wide',`Top five states hold ${d.top5Share}% of laboratories. Numbers on the map are laboratories per state.`)}
   ${dcard('State-wise distribution',hb(a.state,{n:10}))}${dcard('Laboratory type distribution',donut(typeItems(a)))}
   ${dcard('Regulator-wise distribution',hb(rc,{n:10}),'','Laboratories recognised by each regulator; a laboratory may appear under several.')}${dcard('Accreditation status',donut(statusItems(a)))}
   ${dcard('Upcoming accreditation expiries',cols(expiryItems(a),{label:'Validity end by quarter'}),'wide')}
   ${dcard('Scope and discipline coverage',scopeChart(a))}
   ${dcard('Key trend: certificates issued by quarter',line(issueItems(a),{label:'Certificates issued by quarter'}),'wide','Counts current certificates by issue quarter. It shows issue and renewal activity, not net growth in laboratories: superseded certificates are not in the extract, so early quarters look small, and the latest quarter may be incomplete. Net growth needs periodic snapshots.')}
  </div>`;
};
PAGES.board.reports=()=>reportsPage();

/* Reports (shared UI; data and access come from API.report) */
function reportsPage(){
  const list=API.reportList();const sel=S.rpt;let prev='';
  if(sel&&list.some(r=>r[0]===sel)){const r=API.report(sel);prev=`<section class="dcard" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(r.title)} <span class="muted small">(${N(r.rows.length)} rows, first 15 shown)</span></h3><button class="btn primary small" data-dact="download" data-k="${sel}">Download CSV</button></div>
    <div class="tscroll"><table class="tbl dt"><thead><tr>${r.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.slice(0,15).map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;}
  return `<h1 class="dh1">Reports</h1><p class="muted dsub">Exports contain exactly what your role may see on screen.</p>
  <div class="rgrid">${list.map(([k,t,d])=>`<div class="dcard rcard ${sel===k?'sel':''}"><h3>${t}</h3><p class="small muted">${d}</p><div class="row"><button class="btn small" data-dact="preview" data-k="${k}">Preview</button><button class="btn small primary" data-dact="download" data-k="${k}">Download CSV</button></div></div>`).join('')}</div>${prev}`;
}

/* Laboratory detail (admin, or regulator with a relationship) */
function labDetailHTML(d){
  const L=BYID[d.id];const row=(k,v)=>`<dt>${k}</dt><dd>${v||'<span class="na">Not recorded</span>'}</dd>`;
  const rel=d.mode==='admin'?`<div class="tscroll"><table class="tbl"><thead><tr><th>Regulator</th><th>Relationship</th><th>Recognition</th><th>Validity</th><th>Verification</th><th>Visibility</th><th>Internal note</th></tr></thead><tbody>${d.rows.map(r=>`<tr><td>${esc(recName(r.reg))}</td><td>${r.rel==='Primary'?'<b>Primary</b>':'Recognised / associated'}</td><td>${esc(r.recog)}</td><td>${esc(r.validity)||'—'}</td><td>${r.ver}</td><td>${r.vis}</td><td>${esc(r.note)||'—'}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No regulator relationships.</td></tr>'}</tbody></table></div>`
   :`<dl class="facts">${row('Your relationship',d.mine.rel==='Primary'?'<b>Primary regulator</b> (directly mapped to you)':'Recognised / associated')}${row('Recognition status',esc(d.mine.recog))}${row('Validity',esc(d.mine.validity))}${row('Verification',esc(d.mine.ver))}${row('Source',esc(d.mine.src))}</dl>
     <p style="margin-top:10px"><b>Other regulators</b> <span class="small muted">(verified, shared tags only)</span></p><div class="tags">${d.tags.map(t=>regTag(t.reg,t.rel)).join('')||'<span class="muted small">None shown</span>'}</div>`;
  return `<p class="small"><a href="#/dash/${d.mode==='admin'?'mapping':d.mode==='own'?'labs':'associated'}">← Back</a></p>
  <h1 class="dh1">${esc(d.n)}</h1><div class="tags" style="margin-bottom:10px">${accTag(accStatus(L),L)}${d.mode==='admin'?tagsAdmin(d.rows.filter(r=>r.recog!=='Withdrawn')):regTag(d.mine.reg,d.mine.rel,d.mine.ver==='Pending')+d.tags.map(t=>regTag(t.reg,t.rel)).join('')}</div>
  <div class="dgrid"><section class="dcard wide"><h3>Laboratory</h3><dl class="facts">${row('Lab ID',esc(d.id))}${row('Type',TYPES[d.t].name)}${row('Location',esc([d.city,d.state].filter(Boolean).join(', ')))}${d.mode!=='shared'?row('PIN',esc(d.pin)):''}${row('Certificate',esc(d.cn))}${row('Valid from – to',d.fr?fmtDate(d.fr)+' – '+fmtDate(d.to):'')}${row('Status',esc(d.status))}
    ${d.mode!=='shared'?row('Contact',esc([d.contact.cp,d.contact.mo,d.contact.em].filter(Boolean).join(' · '))):''}</dl><p><a class="btn small" href="#/lab/${d.id}/${L.slug}">Open public profile</a></p></section>
   ${scopeSection(d)}
   <section class="dcard wide"><h3>${d.mode==='admin'?'Regulator relationships':'Regulator relationships visible to you'}</h3>${rel}</section>
   ${d.mode==='own'?`<section class="dcard wide"><h3>Accreditation cycle (integrated labs list)</h3><dl class="facts">${row('Cycle',esc(d.accr.cycle))}${row('Extended validity',esc(d.accr.ext))}${row('Source note',esc(d.accr.note))}</dl></section>
    <section class="dcard wide"><h3>Your internal note</h3><p class="small muted">Visible only to you and NABL Admin. Other regulators cannot see it.</p><form data-act="dnote" data-id="${d.id}"><textarea id="dnote" rows="3" maxlength="500" style="width:100%">${esc(d.mine.note)}</textarea><button class="btn primary small" style="margin-top:8px">Save note</button></form></section>`:''}</div>`;
}

function scopeSection(d){
  const L=BYID[d.id],nD=d.disc.length,nG=d.grp.length,nS=d.sub.length,list=(a,c)=>`<ul class="scopelist ${c||''}">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  const body=!(nD||nG||nS)?`<p class="muted">No scope details are listed for this ${L.t==='P'||L.t==='R'?'record: PTP and RMP entries carry no scope data in the NABL extract':'laboratory'}. Refer to the laboratory’s scope document.</p>`
   :`<div class="scopecounts"><span class="acc">${nD} discipline${nD===1?'':'s'}</span>${nG?`<span class="acc">${nG} scope group${nG===1?'':'s'}</span>`:''}${nS?`<span class="acc">${nS} product${nS===1?'':'s'} / material${nS===1?'':'s'}</span>`:''}</div>
    <input type="search" class="scopeq" data-scopef placeholder="Search within scope" aria-label="Search within scope">
    <div id="scopebox"><h4>Disciplines</h4>${list(d.disc)}${nG?`<h4>Scope groups</h4>${list(d.grp)}`:''}${nS?`<h4>Products / materials</h4>${list(d.sub,'tall')}`:''}<p class="small muted" id="scopeempty" hidden>No scope entries match.</p></div>`;
  return `<section class="dcard wide"><h3>Accredited scope</h3>${body}<p class="small muted" style="margin:12px 0 0">Scope is listed at discipline, group and product level in NABL records. Test-by-test detail (parameter, method, range) is in the laboratory’s scope document${d.su?': '+esc(d.su)+scopeLink(L):'.'}</p></section>`;
}
document.addEventListener('input',e=>{const t=e.target;if(!t||!t.matches||!t.matches('[data-scopef]'))return;
  const q=t.value.toLowerCase().trim(),box=$('#scopebox');if(!box)return;let n=0;
  box.querySelectorAll('li').forEach(li=>{const m=!q||li.textContent.toLowerCase().includes(q);li.hidden=!m;if(m)n++;});
  box.querySelectorAll('h4').forEach(h=>{const ul=h.nextElementSibling;h.hidden=!!q&&![...ul.children].some(li=>!li.hidden);});
  const em=$('#scopeempty');if(em)em.hidden=n>0||!q;});
/* ----- modals ----- */
function mapEditModal(key){
  const m=API.mapping({q:key.split('__')[0]},0,500).rows.find(r=>r.key===key);if(!m) return;
  const opt=(arr,cur)=>arr.map(v=>`<option ${v===cur?'selected':''}>${v}</option>`).join('');
  modal(`<h2>Edit relationship</h2><p class="muted small">${esc(m.labName)} (${esc(m.labId)}) · ${esc(recName(m.reg))}</p>
   <form data-act="mapedit" data-k="${esc(key)}"><div class="field"><span>Relationship</span><select name="rel">${opt(['Primary','Recognised'],m.rel)}</select></div>
   <p class="small muted" style="margin-top:-6px">Choosing Primary makes the current primary regulator of this laboratory a recognised regulator.</p>
   <div class="field"><span>Recognition status</span><select name="recog">${opt(RECOG,m.recog)}</select></div>
   <div class="field"><span>Validity</span><input name="validity" value="${esc(m.validity)}" placeholder="e.g. 20.11.2025 - 19.11.2027"></div>
   <div class="field"><span>Verification</span><select name="ver">${opt(VERIF,m.ver)}</select></div>
   <div class="field"><span>Visibility</span><select name="vis">${opt(VISIB,m.vis)}</select></div>
   <div class="field"><span>Internal note</span><textarea name="note" rows="2" maxlength="500">${esc(m.note)}</textarea></div>
   <div class="row"><button class="btn primary">Save</button><button type="button" class="btn" data-act="closemodal">Cancel</button><button type="button" class="btn danger" data-dact="mapremove" data-k="${esc(key)}" style="margin-left:auto">Remove</button></div></form>`);
}
function mapNewModal(){
  modal(`<h2>Add mapping</h2><form data-act="mapnew"><div class="field"><span>Laboratory ID</span><input name="lab" required placeholder="e.g. T-4522"></div>
   <div class="field"><span>Regulator</span><select name="reg">${API.regulators().filter(g=>g.status==='Active').map(g=>`<option value="${esc(g.code)}">${esc(recName(g.code))}</option>`).join('')}</select></div>
   <div class="field"><span>Relationship</span><select name="rel"><option>Recognised</option><option>Primary</option></select></div>
   <p class="small muted">New relationships start as Pending until verified.</p><div class="row"><button class="btn primary">Add</button><button type="button" class="btn" data-act="closemodal">Cancel</button></div></form>`);
}
function regModal(code){
  const g=code?API.regulators().find(x=>x.code===code):{code:'',name:'',type:'',level:'State',status:'Active',contact:'',email:'',phone:''};
  const opt=(arr,cur)=>arr.map(v=>`<option ${v===cur?'selected':''}>${v}</option>`).join('');
  modal(`<h2>${code?'Edit':'Add'} regulator</h2><form data-act="regsave" data-new="${code?'':'1'}">
   <div class="field"><span>Short name</span><input name="code" value="${esc(g.code)}" ${code?'readonly':'required'} placeholder="e.g. Kerala FSD"></div>
   <div class="field"><span>Regulator name</span><input name="name" value="${esc(g.name)}" required></div>
   <div class="field"><span>Regulator type</span><input name="type" value="${esc(g.type)}" placeholder="e.g. Statutory authority"></div>
   <div class="field"><span>Central / State / Sectoral</span><select name="level">${opt(['Central','State','Sectoral'],g.level)}</select></div>
   <div class="field"><span>Status</span><select name="status">${opt(['Active','Inactive'],g.status)}</select></div>
   <div class="field"><span>Contact person</span><input name="contact" value="${esc(g.contact)}"></div>
   <div class="field"><span>Email</span><input name="email" type="email" value="${esc(g.email)}"></div><div class="field"><span>Phone</span><input name="phone" value="${esc(g.phone)}"></div>
   <div class="row"><button class="btn primary">Save</button><button type="button" class="btn" data-act="closemodal">Cancel</button></div></form>`);
}

/* ----- events for this module (called from app.js) ----- */
function dashChange(t){
  const df=t.dataset.df;
  if(df){const [k,f]=df.split('.');const o=S[k]=S[k]||{};o[f]=t.value||undefined;if(f==='state')o.city=undefined;S.dp_admin=S.dp_labs=S.dp_assoc=S.dp_all=25;rerender();return true;}
  const mf=t.dataset.mf;
  if(mf){S.mf=S.mf||{};S.mf[mf]=t.value||undefined;S.dp_map=40;rerender();return true;}
  return false;
}
async function dashClick(a,b,e){
  const ds=e.target.closest('[data-df-set]');
  if(ds){const [k,f]=ds.dataset.dfSet.split('.');const o=S[k]=S[k]||{};o[f]=o[f]===ds.dataset.v?undefined:ds.dataset.v;if(f==='state')o.city=undefined;S.dp_admin=S.dp_labs=S.dp_assoc=S.dp_all=25;rerender();return true;}
  const d=b&&b.dataset.dact;if(!d) return false;const k=b.dataset.k;
  try{
    if(d==='signout'){API.logout();S.role={r:'public'};S.rpt=null;S.rf={};S.df={};S.mf={};if(location.hash==='#/'||location.hash==='#/login')rerender();else go('#/');}
    else if(d==='fill'){$('#lemail').value=b.dataset.e;$('#lpw').value=DEMO_PW;$('#lpw').focus();}
    else if(d==='gotype'){S.rf={type:b.dataset.t};S.dp_all=S.dp_labs=25;go('#/dash/'+k);}
    else if(d==='clearf'){S[k]={};S.dp_all=25;rerender();}
    else if(d==='more'){const key={admin:'dp_admin',labs:'dp_labs',assoc:'dp_assoc',all:'dp_all',map:'dp_map'}[k];S[key]=(S[key]||(k==='map'?40:25))+(k==='map'?40:25);rerender();}
    else if(d==='preview'){S.rpt=k;rerender();}
    else if(d==='download'){const r=API.report(k);S.rpt=k;await saveFile(r.title.replace(/[^\w]+/g,'-').toLowerCase()+'.csv',API.csv(r));}
    else if(d==='mapedit') mapEditModal(k);
    else if(d==='mapnew') mapNewModal();
    else if(d==='mapremove'){API.removeMapping(k);closeModal();toast('Relationship removed');rerender();}
    else if(d==='verifyall'){const n=API.verifyAllPending();toast(n+' relationships marked Verified');rerender();}
    else if(d==='regnew') regModal(null);
    else if(d==='regedit') regModal(b.dataset.c);
    else return false;
  }catch(err){toast(err.message||'Something went wrong');if(err.code===401)rerender();}
  return true;
}
async function dashSubmit(a,f,e){
  const fd=()=>Object.fromEntries(new FormData(f).entries());
  try{
    if(a==='dlogin'){const v=fd();const btn=$('#lgo');btn.disabled=true;
      try{await API.login(v.email,v.password);S.role={r:API.session().role};go('#/dash');rerender();}
      catch(err){$('#lerr').textContent=err.message;btn.disabled=false;}return true;}
    if(a==='mapedit'){API.saveMapping(f.dataset.k,fd());closeModal();toast('Relationship saved');rerender();return true;}
    if(a==='mapnew'){const v=fd();API.addMapping(v.lab,v.reg,v.rel);closeModal();toast('Relationship added (pending verification)');rerender();return true;}
    if(a==='regsave'){const v=fd();API.saveRegulator(v.code,v,!!f.dataset.new);closeModal();toast('Regulator saved');rerender();return true;}
    if(a==='dnote'){API.saveNote(f.dataset.id,$('#dnote').value);toast('Note saved');return true;}
  }catch(err){toast(err.message||'Could not save');return true;}
  return false;
}
setInterval(()=>{if(S.route.startsWith('#/dash')&&!API.session()) rerender();},30000);
