/* ===== Router ===== */
function parseHash(){const h=location.hash||'#/';const [p,qs]=h.split('?');return {path:p,params:new URLSearchParams(qs||'')};}
function render(){
  const {path,params}=parseHash(); S.route=location.hash||'#/';
  const seg=path.replace(/^#\/?/,'').split('/').map(decodeURIComponent);
  let html='';
  document.title='Find a Lab — NABL accredited laboratory discovery';
  S.landing=false;
  if(seg[0]===''&&API.session()){location.replace('#/dash');return;}
  switch(seg[0]){
    case '': html=viewLogin();break;
    case 'find': html=viewHome();break;
    case 'search': html=viewSearch(params);break;
    case 'lab': html=viewLab(seg[1],params.get('tab'));break;
    case 'labs': {const L=LABS.find(l=>l.slug===seg[1]);html=L?viewLab(L.id):viewLab('');break;}
    case 'compare': html=viewCompare();break;
    case 'states': html=viewStates(seg[1]);break;
    case 'services': html=viewServices();break;
    case 'scope': html=viewScope();break;
    case 'saved': html=viewSaved();break;
    case 'about': html=viewAbout();break;
    case 'for-labs': html=viewForLabs();break;
    case 'contact': case 'privacy': case 'terms': html=viewSimple(seg[0]);break;
    case 'login': html=viewLogin();break;
    case 'dash': html=viewDash(seg[1],seg[2]);break;
    case 'portal': location.replace('#/dash');return;
    default: html=`<main id="main" class="wrap" style="padding:40px 20px"><h1>Page not found</h1><a class="btn" href="#/">Home</a></main>`;
  }
  closeDrawer();APP().innerHTML=header()+html+compareTray();
  afterRender(seg,params);
}
function rerender(keepScroll=true){const y=window.scrollY,l=$('#list')?.scrollTop;render();if(keepScroll){window.scrollTo(0,y);if(l!=null&&$('#list'))$('#list').scrollTop=l;}}
function refreshResults(){ // re-run search, keep layout
  const R=doSearch();const list=$('#list');if(list)list.innerHTML=resultsHTML(R);
  const h=$('#rhead');if(h)h.innerHTML=rheadHTML(R);const fb=$('#fbar');if(fb)fb.innerHTML=fbarHTML();refreshDrawer();
  mountResultsMap();
  Store.logEvent({type:'search',q:S.q,n:R.length,zero:!R.length,types:[...(S.F.types.size?S.F.types:S.P.types)],state:S.F.state||S.P.state||'',city:S.P.city||S.F.city||'',filters:activeFilterNames()});
}
function afterRender(seg,params){
  if(seg[0]==='find'&&window.d3){const el=$('#homemap');if(el)requestAnimationFrame(()=>{makeMap(el,{label:'Map of India. Select a state to see its laboratories.',stateClick:n=>go('#/search?state='+encodeURIComponent(n))});});}
  if(seg[0]==='search'&&window.d3) requestAnimationFrame(mountResultsMap);
  if(seg[0]==='lab'&&['contact','location'].includes(params.get('tab'))){const L=BYID[seg[1]];const el=$('#labmap');if(L&&el&&window.d3){const m=makeMap(el,{});m.setPoints([L]).select(L.id);if(L.la!=null)m.focus(L.la,L.lo,8);}}
  if(seg[0]==='lab'&&params.get('tab')==='scope'&&params.get('full')){const f=$('#scopefilter');if(f)f.oninput=()=>{const t=f.value.toLowerCase();$$('#scopetree li').forEach(li=>{if(li.querySelector('ul'))return;const hit=!t||li.textContent.toLowerCase().includes(t);li.style.display=hit?'':'none';li.innerHTML=t&&hit&&!li.classList.contains('disc')?esc(li.textContent).replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>'):esc(li.textContent);});};}
  if(seg[0]==='states'&&window.d3){const el=$('#stmap');if(el){const c={};LABS.forEach(l=>c[l.state]=(c[l.state]||0)+1);const m=makeMap(el,{stateClick:n=>go('#/states/'+encodeURIComponent(n))});m.setCounts(c).setMode('density');if(seg[1]){m.setMode('markers').setPoints(LABS.filter(l=>l.state===seg[1])).setActiveState(seg[1]);m.focusState(seg[1]);}}}
  if(seg[0]==='dash'&&window.d3){const el=$('#dmap');if(el&&S.mapCounts){makeMap(el,{label:'Map of India showing laboratories per state'}).setCounts(S.mapCounts).setMode('density');}}
  if(seg[0]==='dash'&&seg[1]==='import'){const f=$('#impfile');if(f)f.onchange=()=>f.files[0]&&handleImport(f.files[0]);}
  if(seg[0]==='dash'&&seg[1]==='quality'){const f=$('#dqf');if(f)f.onchange=()=>{S.dqf=f.value;rerender();};}
  if(!seg[0]||seg[0]==='search'||seg[0]==='lab') {} else window.scrollTo(0,0);
}

/* ===== Event delegation ===== */
function submitQuery(q){S.q=q;S.F=newF();S.page=1;S.sel=null;go('#/search?q='+encodeURIComponent(q));if(parseQuery(q).near&&!S.userLoc)askLocation(()=>rerender());}
document.addEventListener('submit',e=>{const f=e.target;const a=f.dataset.act;if(!a)return;e.preventDefault();
  if(['dlogin','mapedit','mapnew','regsave','dnote'].includes(a)){dashSubmit(a,f,e);return;}
  if(a==='homefilters'||a==='homesearch'){const H=S.home;const q=$('#hq').value.trim(),st=$('#hstate').value,ci=$('#hcity').value,pin=$('#hpin').value.trim();
    if(pin&&!/^\d{6}$/.test(pin)){toast('PIN code should be 6 digits');$('#hpin').focus();return;}
    if(a==='homesearch'&&!q&&!st&&!ci&&!pin&&!H.types.size){$('#hq').focus();return;}
    const PQ=parseQuery(q);let ty=[...H.types];if(ty.length&&PQ.types.size&&!ty.some(t=>PQ.types.has(t)))ty=[];const loc=!PQ.near&&!PQ.city&&!PQ.pin;
    const u=new URLSearchParams();if(q)u.set('q',q);if(ty.length)u.set('t',ty.join(','));if(loc&&st)u.set('state',st);if(loc&&ci)u.set('city',ci);if(loc&&pin)u.set('pin',pin);
    H.q=q;H.state=st;H.city=ci;H.pin=pin;S.q=q;go('#/search?'+u.toString());if(parseQuery(q).near&&!S.userLoc)askLocation(()=>{S.F.nearme=true;refreshResults();});return;}
  if(a==='homesearch_old'){const v=$('#hq').value.trim();if(!v){$('#hq').focus();return;}const pl=resolvePlace(v);if(pl&&/^\d{6}$|^[a-z .]+$/i.test(v)&&!parseQuery(v).labels.length&&!parseQuery(v).types.size&&CITY_INDEX[(CITY_ALIAS[v.toLowerCase()]||v.toLowerCase())]||/^\d{6}$/.test(v)){S.userLoc=pl;submitQuery(v);}else submitQuery(v);}
  if(a==='resform'){const q=$('#rq').value.trim(),F=S.F,u=new URLSearchParams();if(q)u.set('q',q);if(F.types.size)u.set('t',[...F.types].join(','));if(F.state)u.set('state',F.state);if(F.city)u.set('city',F.city);if(F.pin)u.set('pin',F.pin);go('#/search?'+u.toString());if(parseQuery(q).near&&!S.userLoc)askLocation(()=>{S.F.nearme=true;refreshResults();});}
  if(a==='scopesearch') submitQuery($('#ssq').value.trim());
  if(a==='labscope'){S.lastScopeQ=$('#lsq').value;$('#scoperes').innerHTML=scopeVerdict(BYID[f.dataset.id],S.lastScopeQ);}
  if(a==='settings'){Store.mem.settings={...(Store.mem.settings||{}),scopeBase:$('#sbase').value.trim()};Demo.on=$('#sdemo').checked;persistUser();Store.save();toast('Settings saved');rerender();}
});
document.addEventListener('change',e=>{const t=e.target;
  if(dashChange(t)) return;
  if(t.id==='sort'){S.sort=t.value;refreshResults();return;}
  if(t.id==='hstate'){S.home.state=t.value;S.home.city='';const c=$('#hcity');c.innerHTML='<option value="">City</option>'+cityOpts(t.value,'');return;}
  if(t.dataset.f2==='pin'){const v=t.value.trim();if(v&&!/^\d{6}$/.test(v)){toast('PIN code should be 6 digits');return;}if(v&&!resolvePlace(v)){toast('PIN code not recognised');return;}S.F.pin=v||null;S.page=1;refreshResults();return;}
  if(t.dataset.f){const F=S.F,k=t.dataset.f,v=t.value;
    if(k==='otherAcc'||k==='open'){F[k]=t.checked;}
    else if(k==='types'){if(!F.types.size&&S.P.types.size)F.types=new Set(S.P.types);t.checked?F.types.add(v):F.types.delete(v);if(!F.types.size&&S.P.types.size)F.types=new Set(Object.keys(TYPES));}
    else if(['service','fac','regs','scope'].includes(k)){t.checked?F[k].add(v):F[k].delete(v);}
    else if(k==='disc'||k==='grp'){t.checked?F[k].add(+v):F[k].delete(+v);}
    else if(k==='validity'){F.validity=t.checked?v:null;}
    else if(['integrated','includeNA','home','online','digital'].includes(k)){F[k]=t.checked;}
    else if(k==='state'){F.state=v||null;F.city=null;}
    else if(k==='city'){F.city=v||null;}
    else if(k==='radius'){F.radius=v?+v:null;if(F.radius&&!S.origin&&S.userLoc)S.origin=S.userLoc;}
    else if(k==='price'){F.price=v?v.split('-').map(Number):null;}
    else if(k==='tat'){F.tat=v?+v:null;}
    S.page=1;refreshResults();return;}
  if(t.dataset.act==='demotoggle'){Demo.on=t.checked;persistUser();rerender();}
  if(t.dataset.act==='map'&&S.imp){S.imp.map[t.dataset.h]=t.value;}
  if(t.dataset.act==='rreg'){S.rregs=S.rregs||new Set();t.checked?S.rregs.add(t.value):S.rregs.delete(t.value);rerender();}
  if(t.dataset.act==='setstatus'&&t.value){const id=t.dataset.id,s=t.value;const hidden=s==='Withdrawn';Store.setOverride(id,{status:s==='Renewed'?'Active':s,hidden:false,ts:Date.now()});Store.mem.audit.unshift({ts:Date.now(),what:`NABL admin set ${id} to ${s}`});Store.save();toast(id+' set to '+s);rerender();}
});
document.addEventListener('click',e=>{
  const dd=e.target.closest('[data-dact],[data-df-set]');if(dd){dashClick(null,e.target.closest('[data-dact]'),e);return;}
  const g=e.target.closest('[data-go]');if(g&&!e.target.closest('a')){go(g.dataset.go);return;}
  const qb=e.target.closest('[data-q]');if(qb){submitQuery(qb.dataset.q);return;}
  const gr=e.target.closest('[data-grp]');if(gr){go('#/search?q=&grp='+encodeURIComponent(gr.dataset.grp));return;}
  const di=e.target.closest('[data-disc]');if(di){go('#/search?q=&disc='+encodeURIComponent(di.dataset.disc));return;}
  const b=e.target.closest('[data-act]');if(!b||b.tagName==='FORM'||b.tagName==='SELECT'||(b.tagName==='INPUT'&&b.type!=='button'))return;
  const a=b.dataset.act,id=b.dataset.id;
  if(a==='nearme'){S.pendingT=S.home&&S.home.types.size?[...S.home.types].join(','):'';askLocation(()=>{S.lastSearchHash=null;go('#/search?near=1'+(S.pendingT?'&t='+S.pendingT:''));if(location.hash.startsWith('#/search?near=1'))rerender();});}
  if(a==='menu'){const h=$('#hdr');const o=h.classList.toggle('open');b.setAttribute('aria-expanded',o);}
  if(a==='hsl'){const t=b.dataset.t;S.home.types.has(t)?S.home.types.delete(t):S.home.types.add(t);b.setAttribute('aria-pressed',S.home.types.has(t));}
  if(a==='stype'){const F=S.F,t=b.dataset.t;if(!F.types.size&&S.P.types.size)F.types=new Set(S.P.types);F.types.has(t)?F.types.delete(t):F.types.add(t);if(!F.types.size&&S.P.types.size)F.types=new Set(Object.keys(TYPES));S.page=1;refreshResults();}
  if(a==='drawer') openDrawer();
  if(a==='closedrawer') closeDrawer();
  if(a==='view'){S.view=b.dataset.v;const rl=$('#rl');rl.classList.toggle('mapmode',S.view==='map');$$('[data-act="view"]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===S.view));mountResultsMap();}
  if(a==='cmpfull'){S.cmpFull=!S.cmpFull;rerender();}
  if(a==='nearme2') askLocation(()=>{S.F.nearme=true;S.F.pin=null;refreshResults();});
  if(a==='focus'){const i=$('#hq');i.placeholder=b.dataset.ph;i.focus();}
  if(a==='cmp'){const i=S.compare.indexOf(id);if(i>=0)S.compare.splice(i,1);else{if(S.compare.length>=4){toast('You can compare up to 4 laboratories');return;}S.compare.push(id);}persistUser();
    if(S.route.startsWith('#/search')){const on=S.compare.includes(id);b.classList.toggle('on',on);b.textContent=on?'✓ Added':'Compare';b.setAttribute('aria-pressed',on);$('.cmptray')?.remove();document.body.querySelector('#app').insertAdjacentHTML('beforeend',compareTray());}else rerender();}
  if(a==='cmpclear'){S.compare=[];persistUser();rerender();}
  if(a==='save'){S.saved.has(id)?S.saved.delete(id):S.saved.add(id);persistUser();b.textContent=S.saved.has(id)?'★ Saved':'☆ Save';toast(S.saved.has(id)?'Saved on this device':'Removed from saved');}
  if(a==='share'){const L=BYID[id];const url=location.href.split('#')[0]+'#/lab/'+L.id+'/'+L.slug;(navigator.share?navigator.share({title:L.n,url}).catch(()=>{}):navigator.clipboard?.writeText(url).then(()=>toast('Link copied')).catch(()=>prompt('Copy this link',url)));}
  if(a==='report') reportModal(id);
  if(a==='closemodal') closeModal();
  if(a==='more'){S.page++;$('#list').innerHTML=resultsHTML(S.results);}
  if(a==='clearf'){S.F=newF();S.page=1;refreshResults();}
  if(a==='clearscope'){S.F.scope=new Set();refreshResults();}
  if(a==='includena'){S.F.includeNA=true;refreshResults();}
  if(a==='allindia'){S.F.state=null;S.F.city=null;S.F.pin=null;S.F.nearme=false;S.q=S.q.replace(new RegExp('\\b(in|near)?\\s*'+(S.P.state||'')+'\\b','i'),'').trim();const ph=location.hash;go('#/search?q='+encodeURIComponent(S.q));if(location.hash===ph){S.lastSearchHash=null;rerender();}}
  if(a==='radius'){S.F.radius=+b.dataset.v;if(!S.origin&&S.userLoc)S.origin=S.userLoc;refreshResults();}
  if(a==='setplace'){const o=resolvePlace($('#fplace').value);if(!o){toast('Place not recognised');return;}S.userLoc=o;S.F.radius=S.F.radius||25;S.q=S.q.replace(/\b(near me|nearby)\b/i,'');refreshResults();}
  if(a==='togglefilters'){$('#rl').classList.toggle('showfilters');}
  if(a==='togglemap'){const rl=$('#rl');rl.classList.toggle('showmap');b.textContent=rl.classList.contains('showmap')?'List':'Map';mountResultsMap();}
  if(a==='zin')S.map&&S.map.zoomBy(1.8); if(a==='zout')S.map&&S.map.zoomBy(1/1.8); if(a==='zreset')S.map&&S.map.reset();
  if(a==='mmode'){S.mapMode=b.dataset.m;$$('[data-act="mmode"]').forEach(x=>x.classList.toggle('on',x.dataset.m===S.mapMode));S.map&&S.map.setMode(S.mapMode);}
  if(a==='showonmap'){const L=BYID[id];S.sel=id;highlightCard(id);const rl=$('#rl');if(getComputedStyle($('.mapcol')).display==='none'){rl.classList.add('showmap');mountResultsMap();}
    if(S.map&&L.la!=null){S.map.select(id);S.map.focus(L.la,L.lo,14);}}
  if(a==='exportres') saveFile('find-a-lab-results.csv',labsCSV(S.results.map(r=>r.L)));
  if(a==='exportlabs') saveFile('nabl-labs.csv',labsCSV(LABS));
  if(a==='exportdq') saveFile('data-quality-issues.csv',toCSV([['Lab ID','Issue','Detail'],...RAW.dqrows]));
  if(a==='imperr'&&S.imp) saveFile('import-errors.csv',toCSV([['Sheet','Row','Lab ID','Severity','Issue'],...S.imp.issues.map(e=>[e.sheet,e.row,e.id,e.sev,e.msg])]));
  if(a==='impgo') applyImport();
  if(a==='adv'){const c=$('#c-'+id);advance(id,b.dataset.to,b.dataset.who||(ROLES[S.role.r]||'NABL Admin'),c?c.value.trim():'');}
  if(a==='qf'){S.qf=b.dataset.v;rerender();}
  if(a==='deact'){const h=!(OVERRIDES[id]&&OVERRIDES[id].hidden);Store.setOverride(id,{hidden:h,ts:Date.now()});Store.mem.audit.unshift({ts:Date.now(),what:`NABL admin ${h?'deactivated':'reactivated'} ${id}`});Store.save();rerender();}
});
window.addEventListener('hashchange',()=>{closeModal();render();if(!location.hash.startsWith('#/search'))window.scrollTo(0,0);});
Store.on(()=>{if(S.route.startsWith('#/dash')&&!document.activeElement.matches('input,textarea,select'))rerender();});
Store.init().then(()=>{dashSync();});
render();
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(S.route.startsWith('#/search'))mountResultsMap();},250);});
