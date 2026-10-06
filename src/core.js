/* ===== Data layer: decode the compact snapshot built from the two Excel files ===== */
const RAW = window.NABL_DATA, DICT = RAW.dict, TODAY = new Date('2026-09-28T00:00:00');
const TYPES = {M:{name:'Medical Laboratory',short:'Medical',plural:'Medical laboratories',c:'var(--tM)',hex:'#B8325A',desc:'Pathology, biochemistry, haematology, microbiology, molecular and imaging'},
  T:{name:'Testing Laboratory',short:'Testing',plural:'Testing laboratories',c:'var(--tT)',hex:'#2C7CC2',desc:'Food, water, environment, materials, pharma, electrical'},
  C:{name:'Calibration Laboratory',short:'Calibration',plural:'Calibration laboratories',c:'var(--tC)',hex:'#7B5FCC',desc:'Pressure, temperature, mass, electrical, dimensional, torque'},
  P:{name:'Proficiency Testing Provider',short:'PTP',plural:'Proficiency testing providers',c:'var(--tP)',hex:'#D08A1A',desc:'Inter-laboratory comparison and PT schemes'},
  R:{name:'Reference Material Producer',short:'RMP',plural:'Reference material producers',c:'var(--tR)',hex:'#22A08E',desc:'Certified reference materials'}};
const GEO = ['PIN code centroid','PIN area (first 3 digits) centroid','City centroid from other labs','State centroid','No coordinates'];
const SRC = ['NABL master extract (NABL_Labs_Data.xlsx)','Centralized list of integrated labs only (Centralized_list.xlsx)'];
const REGNAME = {'FSSAI':'Food Safety and Standards Authority of India','EIC':'Export Inspection Council of India','APEDA':'Agricultural & Processed Food Products Export Development Authority',
  'TEA BOARD':'Tea Board India','SPICE BOARD':'Spices Board India','IOPEPC':'Indian Oilseeds & Produce Export Promotion Council','CDB':'Coconut Development Board','Shefexil':'Shellac & Forest Products Export Promotion Council'};
const LABS = RAW.rows.map((r,i)=>{
  const [id,n,t,cp,em,mo,ad,c,s,z,sv,ll,p,cn,fr,to,am,d,g,sg,fl,ac,su,smp,src,la,lo,gp,ig]=r;
  const L={i,id,n,t,cp,em,mo,ad,city:DICT.city[c]||'',state:DICT.state[s]||'',z,sv,ll,p,cn,fr,to,am,d,g,sg,
    pf:!!(fl&1),sf:!!(fl&2),mf:!!(fl&4),nw:!!(fl&8),ac,su,smp,src,la,lo,gp};
  if(ig) L.ig={regs:ig[0],cycle:ig[1],ext:ig[2],cert:ig[3],flag:ig[4],note:ig[5]};
  L.slug=(n+' '+L.city).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
  L.nl=n.toLowerCase();
  return L;});
const BYID = Object.fromEntries(LABS.map(l=>[l.id,l]));
const OVERRIDES = {}; // admin-published status changes (from workflow store)

function accStatus(L){
  const o=OVERRIDES[L.id];
  if(o&&o.status) return {k:o.status==='Active'?'valid':'lapse',label:o.status,src:'NABL admin action (prototype workflow)'};
  if(L.ig&&/suspend/i.test(L.ig.ext)) return {k:'lapse',label:'Suspended',src:'Centralized list'};
  if(L.ig&&/expired/i.test(L.ig.ext)) return {k:'lapse',label:'Expired',src:'Centralized list'};
  if(L.ig&&/under process/i.test(L.ig.cert)) return {k:'warn',label:'Accreditation in process',src:'Centralized list'};
  if(!L.to) return {k:'plain',label:'Validity not in dataset',src:''};
  const end=new Date(L.to), days=(end-TODAY)/864e5;
  if(days<0) return {k:'lapse',label:'Validity end date passed',src:'NABL master (valid to '+fmtDate(L.to)+')'};
  if(days<=90) return {k:'warn',label:'Valid, ends within 90 days',src:'NABL master'};
  return {k:'valid',label:'NABL accredited, valid',src:'NABL master'};
}
function fmtDate(s){ if(!s) return ''; const d=new Date(s); return isNaN(d)?s:d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function km(a,b,c,d){const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,h=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0);}
function fmtKm(d){return d==null?'':d<10?d.toFixed(1)+' km':Math.round(d)+' km';}
const discNames=L=>L.d.map(i=>DICT.disc[i]); const grpNames=L=>L.g.map(i=>DICT.grp[i]); const subNames=L=>L.sg.map(i=>DICT.sub[i]);
const hasScope=L=>L.d.length||L.g.length||L.sg.length;

/* ===== Demo enrichment (clearly labelled mock values; OFF by default) ===== */
const Demo={on:false};
function demoVals(L){
  if(!Demo.on) return null; const h=hash(L.id);
  const base={M:[250,2500],T:[800,6000],C:[500,4000],P:[3000,15000],R:[2000,20000]}[L.t];
  const price=Math.round((base[0]+(h%1000)/1000*(base[1]-base[0]))/50)*50;
  const tatH=L.t==='M'?[6,12,24,24,48][h%5]:[24,48,72,120,168][h%5];
  return {price,tatH,home:L.t==='M'&&(h>>3)%3!==0,pickup:(h>>5)%2===0,online:(h>>7)%3!==0,digital:(h>>9)%5!==0};
}
function tatLabel(h){return h<=12?'Same day':h<=24?'Within 24 hours':h<=48?'1–2 days':h<=120?'3–5 days':h<=168?'5–7 days':'7+ days';}

/* ===== Geography helpers ===== */
const CITY_INDEX = (()=>{const m={};for(const L of LABS){if(!L.city||L.la==null)continue;const k=L.city.toLowerCase();(m[k]=m[k]||{name:L.city,state:L.state,pts:[],n:0}).n++;if(L.gp<=1)m[k].pts.push([L.la,L.lo]);}
  for(const k in m){const p=m[k].pts.length?m[k].pts:LABS.filter(l=>l.city.toLowerCase()===k&&l.la!=null).map(l=>[l.la,l.lo]);m[k].la=p.reduce((a,b)=>a+b[0],0)/p.length;m[k].lo=p.reduce((a,b)=>a+b[1],0)/p.length;delete m[k].pts;}return m;})();
const CITY_ALIAS={'bangalore':'bengaluru','bombay':'mumbai','madras':'chennai','calcutta':'kolkata','gurgaon':'gurugram','new delhi':'delhi','vizag':'visakhapatnam','poona':'pune','trivandrum':'thiruvananthapuram','cochin':'kochi','baroda':'vadodara','mysore':'mysuru','noida':'gautam buddha nagar'};
const STATES = [...new Set(LABS.map(l=>l.state).filter(Boolean))].sort();
const PIN_INDEX = (()=>{const m={};for(const L of LABS){if(L.p&&L.gp===0)m[L.p]=[L.la,L.lo];}return m;})();

/* ===== Semantic query parser (rule-based, embedding-ready interface) ===== */
const LEX = [
 // [pattern, {type, disc, grp, sub, label, param}]
 [/\b(cbc|complete blood count|haemogram|hemogram)\b/, {t:'M',disc:/haemat|hemat/i,label:'Haematology (CBC)',param:'CBC'}],
 [/\b(blood tests?|blood testing|blood)\b/, {t:'M',disc:/haemat|hemat|biochem|clinical pathology/i,label:'Blood testing'}],
 [/\b(thyroid|lipid|liver function|kidney function|sugar|glucose|hba1c|biochemistry)\b/, {t:'M',disc:/biochem/i,label:'Clinical biochemistry',paramFrom:1}],
 [/\b(pathology|pathology lab|diagnostic|diagnostics)\b/, {t:'M',disc:/patholog|biochem|haemat/i,label:'Pathology'}],
 [/\b(histopathology|biopsy)\b/, {t:'M',disc:/histopath/i,label:'Histopathology'}],
 [/\b(cytology|cytopathology|pap smear)\b/, {t:'M',disc:/cytopath/i,label:'Cytopathology'}],
 [/\b(pcr|rt-pcr|molecular|covid|dna test)\b/, {t:'M',disc:/molecular/i,label:'Molecular testing'}],
 [/\b(genetic|genetics|karyotyp|cytogenetic)\w*/, {t:'M',disc:/cytogen|histocompat|molecular/i,label:'Genetics'}],
 [/\b(hla|tissue typing)\b/, {t:'M',disc:/histocompat/i,label:'Histocompatibility'}],
 [/\b(flow cytometry)\b/, {t:'M',disc:/flow cyto/i,label:'Flow cytometry'}],
 [/\b(mri|ct scan|ultrasound|x-ray|xray|radiology|imaging|doppler)\b/, {t:'M',disc:/MI CAB/i,label:'Medical imaging'}],
 [/\b(serology|infectious|culture|urine culture)\b/, {t:'M',disc:/microbio/i,label:'Microbiology & serology'}],
 [/\b(drinking water|potable water|tap water)\b/, {t:'T',grp:/water/i,sub:/drinking|packaged drinking/i,label:'Drinking water'}],
 [/\b(packaged water|mineral water|bottled water)\b/, {t:'T',grp:/water/i,sub:/packaged/i,label:'Packaged drinking water'}],
 [/\b(ground ?water|borewell)\b/, {t:'T',grp:/water/i,sub:/ground water/i,label:'Ground water'}],
 [/\b(waste ?water|effluent|sewage)\b/, {t:'T',grp:/water|environment|pollution/i,sub:/waste water|effluent/i,label:'Waste water'}],
 [/\bwater\b/, {t:'T',grp:/water/i,label:'Water testing'}],
 [/\b(milk|dairy)\b/, {t:'T',grp:/food|dairy|milk/i,sub:/milk|dairy/i,label:'Milk & dairy'}],
 [/\b(spices?|condiments)\b/, {t:'T',grp:/food/i,sub:/spice/i,label:'Spices'}],
 [/\b(edible oil|oils? and fats)\b/, {t:'T',grp:/food/i,sub:/oil/i,label:'Edible oils'}],
 [/\b(food|foods|agri|agricultural|cereal|grain|honey)\b/, {t:'T',grp:/food|agricultur|nutraceut|marine|feed/i,label:'Food & agricultural'}],
 [/\b(pesticide residue|residues?)\b/, {t:'T',grp:/residue/i,label:'Residues & contaminants'}],
 [/\b(environment|environmental|pollution|ambient air|air quality|stack|emission|noise)\b/, {t:'T',grp:/pollution|environment|atmospher/i,label:'Environment & pollution'}],
 [/\b(soil|rock)s?\b/, {t:'T',grp:/soil/i,label:'Soil'}],
 [/\b(cement|concrete|construction|building|aggregate|bricks?|bitumen)\b/, {t:'T',grp:/build|concrete|construction|infrastructure/i,label:'Construction materials'}],
 [/\b(pharma|pharmaceutical|drugs?|medicine)\b/, {t:'T',grp:/drug|pharma/i,label:'Drugs & pharmaceuticals'}],
 [/\b(petroleum|diesel|petrol|fuel|lubricant|coal)\b/, {t:'T',grp:/petrol|lubric|fuel/i,label:'Petroleum & fuels'}],
 [/\b(textile|fabric|garment|yarn)\b/, {t:'T',grp:/textile/i,label:'Textiles'}],
 [/\b(steel|metal|metals|alloy|alloys)\b/, {t:'T',grp:/metal|alloy/i,label:'Metals & alloys'}],
 [/\b(plastic|polymer|rubber)\b/, {t:'T',grp:/plastic|rubber/i,label:'Plastics & rubber'}],
 [/\b(fertili[sz]er)\b/, {t:'T',grp:/fertili/i,label:'Fertilizers'}],
 [/\b(cable|wire|transformer|switchgear)\b/, {t:'T',grp:/cable|transformer|electrical|insulat/i,label:'Electrical products'}],
 [/\b(ndt|non-destructive|ultrasonic testing|radiography)\b/, {t:'T',disc:/non-destructive/i,label:'Non-destructive testing'}],
 [/\b(software|it system)\b/, {t:'T',disc:/software/i,label:'Software testing'}],
 [/\b(forensic)\b/, {t:'T',disc:/forensic/i,label:'Forensic'}],
 [/\b(pressure gauges?|manometer|pressure transmitter)\b/, {t:'C',grp:/pressure/i,label:'Pressure (gauge)',inst:'Pressure gauge'}],
 [/\b(dead weight tester|pressure balance)\b/, {t:'C',grp:/pressure balance|dead weight/i,label:'Pressure balance'}],
 [/\bpressure\b/, {t:'C',grp:/pressure/i,label:'Pressure'}],
 [/\b(thermometer|thermocouple|rtd|temperature)\w*/, {t:'C',grp:/temperature/i,label:'Temperature',inst:'Thermometer'}],
 [/\b(weighing balance|weighing scale|balance|weights?|mass)\b/, {t:'C',grp:/weigh|weights|mass/i,label:'Mass & weighing',inst:'Weighing balance'}],
 [/\b(multimeter|voltmeter|ammeter|clamp meter)\b/, {t:'C',grp:/direct current|alternating current|electrical/i,label:'Electrical (multimeter)',inst:'Multimeter'}],
 [/\b(vernier|micrometer|caliper|dial gauge|dimension\w*)\b/, {t:'C',grp:/dimension/i,label:'Dimensional',inst:'Vernier / micrometer'}],
 [/\b(torque wrench|torque)\b/, {t:'C',grp:/torque/i,label:'Torque',inst:'Torque wrench'}],
 [/\b(force|load cell|utm|proving ring)\b/, {t:'C',grp:/force|utm|tension/i,label:'Force'}],
 [/\b(flow ?meter|flow)\b/, {t:'C',grp:/flow/i,label:'Flow'}],
 [/\b(pipette|burette|volumetric|volume)\b/, {t:'C',grp:/volume/i,label:'Volume'}],
 [/\b(humidity|hygrometer)\b/, {t:'C',grp:/humidity/i,label:'Humidity'}],
 [/\b(stopwatch|timer|frequency)\b/, {t:'C',grp:/time/i,label:'Time & frequency'}],
 [/\b(hardness tester|hardness testing machine|durometer)\b/, {t:'C',grp:/hardness|durometer/i,label:'Hardness testers'}],
 [/\b(medical device|patient monitor|defibrillator|ecg)\b/, {t:'C',disc:/medical devices/i,label:'Medical devices'}],
 [/\b(microbiology|microbiological|microbial|pathogen)\b/, {t:null,disc:/microbio|biological/i,label:'Microbiology'}],
 [/\b(chemical|chemistry)\b/, {t:null,disc:/chemical/i,label:'Chemical'}],
 [/\b(electrical|electronic|electronics|emc|emi)\b/, {t:null,disc:/electr/i,label:'Electrical / electronics'}],
];
const PARAMS=['lead','arsenic','mercury','cadmium','chromium','fluoride','nitrate','iron','copper','zinc','e\\. ?coli','coliform','salmonella','listeria','aflatoxin','pesticide','melamine','ph','tds','hardness','turbidity','moisture','protein','fat','ash','heavy metals','sulphur','cholesterol','hba1c','tsh','vitamin d','creatinine','hemoglobin','haemoglobin','benzene','pm ?2\\.5','pm ?10'];
const PARAM_RE=new RegExp('\\b('+PARAMS.join('|')+')\\b','i');
const STOP=/\b(near|me|in|at|for|lab|labs|laboratory|laboratories|test|testing|tests|the|a|an|of|with|within|under|below|nabl|accredited|find|show|services?|centre|center|and|to|around|best|good|top|cheap|cheapest|fast|fastest|quick|scope|km|rs|inr|instruments?|equipments?|gauges?|producers?|providers?|lab)\b/gi;

function parseQuery(q){
  const out={raw:q,types:new Set(),disc:[],grp:[],sub:[],labels:[],param:null,inst:null,city:null,state:null,pin:null,near:false,radius:null,priceMax:null,fastest:false,home:false,unmatched:[],text:'',kw:[]};
  let s=' '+(q||'').toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ')+' ';
  const take=re=>{const m=s.match(re);if(m){s=s.replace(m[0],' ');}return m;};
  let m;
  if((m=take(/(?:under|below|less than|upto|up to|within|<)\s*(?:rs\.?|inr|₹)\s*([\d,]+)|(?:under|below|less than|upto|up to)\s*([\d,]{3,})\s*(?:rs|rupees|inr)?/))) out.priceMax=+(m[1]||m[2]).replace(/,/g,'');
  if((m=take(/(?:within|in|under)?\s*(\d{1,3})\s*km\b/))) out.radius=+m[1];
  if(take(/\b(near me|nearby|near by|around me|closest|nearest)\b/)) out.near=true;
  if(take(/\b(fastest|quickest|urgent|fast|quick|same day)\b/)) out.fastest=true;
  if(take(/\b(home collection|home sample|sample pickup|collect from home|home visit)\b/)) out.home=true;
  if((m=take(/\b(\d{6})\b/))) out.pin=m[1];
  if(take(/\b(ptp|proficiency testing( provider)?s?|pt provider|pt scheme|eqas|inter ?lab(oratory)? comparison)\b/)) out.types.add('P');
  if(take(/\b(rmp|reference materials?( producers?)?|crm|certified reference)\b/)) out.types.add('R');
  if(take(/\bcalibrat\w*/)) out.types.add('C');
  if(take(/\b(medical|clinical|hospital) lab\w*/)) out.types.add('M');
  if(take(/\btesting lab\w*/)) out.types.add('T');
  // parameter (analyte) — never used to claim exact scope; data is group-level
  if((m=s.match(PARAM_RE))){out.param=m[1].replace(/\s+/g,' ');}
  const explicit=out.types.size>0;
  for(const [re,v] of LEX){ const mm=s.match(re); if(!mm) continue;
    if(v.t && !explicit) out.types.add(v.t);
    if(v.disc) out.disc.push(v.disc); if(v.grp) out.grp.push(v.grp); if(v.sub) out.sub.push(v.sub);
    out.labels.push(v.label); out.kw.push(mm[0].trim()); if(v.inst) out.inst=v.inst; if(v.param && !out.param) out.param=v.param;
    s=s.replace(mm[0],' ');
  }
  // location: states then cities (longest first)
  for(const st of STATES){const re=new RegExp('\\b'+st.toLowerCase().replace(/[()]/g,'')+'\\b');if(re.test(s)){out.state=st;s=s.replace(re,' ');break;}}
  const toks=s.replace(/[^a-z\s-]/g,' ');
  let bestCity=null;
  for(const [a,b] of Object.entries(CITY_ALIAS)){ if(new RegExp('\\b'+a+'\\b').test(toks)&&CITY_INDEX[b]){bestCity=b;s=s.replace(new RegExp('\\b'+a+'\\b'),' ');break;} }
  if(!bestCity){ const words=toks.trim().split(/\s+/).filter(w=>w.length>2&&!/^(near|lab|labs|test|testing|for|with|the|and|under|within|laboratory|laboratories|accredited|nabl|me|in|at|of|services|service|scope)$/.test(w));
    for(let n=3;n>=1&&!bestCity;n--) for(let i=0;i+n<=words.length;i++){const k=words.slice(i,i+n).join(' ');if(CITY_INDEX[k]&&CITY_INDEX[k].n>=1){bestCity=k;s=s.replace(k,' ');break;}} }
  if(bestCity){out.city=CITY_INDEX[bestCity].name; if(!out.state) out.state=null;}
  if(out.state==='Delhi'&&!out.city){out.city=null;}
  out.text=s.replace(STOP,' ').replace(/[^a-z0-9\s&.-]/g,' ').replace(/\s+/g,' ').trim();
  if(out.param) out.text=out.text.replace(new RegExp(out.param,'i'),'').trim();
  return out;
}

/* ===== Scope matching (source-backed only) =====
   exact   : parameter-level scope row matches (needs scope table import; none in this snapshot)
   category: lab's accredited group/sub-group (or medical discipline) matches the request
   related : only discipline matches (broad) for non-medical
   none    : lab has scope data but nothing matches
   na      : lab has no scope data in the dataset */
function scopeMatch(L,P){
  if(!P.disc.length&&!P.grp.length&&!P.sub.length) return null;
  if(!hasScope(L)) return {lvl:'na',hits:[]};
  const hits=[]; const G=grpNames(L),S=subNames(L),D=discNames(L);
  let sub=false,grp=false,disc=false;
  for(const re of P.sub) for(const x of S) if(re.test(x)){sub=true;hits.push('Sub-group: '+x);}
  for(const re of P.grp) for(const x of G) if(re.test(x)){grp=true;hits.push('Group: '+x);}
  for(const re of P.disc) for(const x of D) if(re.test(x)){disc=true;hits.push('Discipline: '+x);}
  const uniq=[...new Set(hits)].slice(0,4);
  if(L.t==='M'&&disc) return {lvl:'category',hits:uniq,sub:false};
  if(sub||(grp&&!P.sub.length)) return {lvl:'category',hits:uniq,sub};
  if(grp) return {lvl:'related',hits:uniq,note:'Group matches but the requested sub-group is not listed'};
  if(disc) return {lvl:'related',hits:uniq,note:'Only the broad discipline matches'};
  return {lvl:'none',hits:[]};
}
const SCOPE_LBL={exact:['Exact scope match','b-valid'],category:['Scope category match','b-valid'],related:['Related scope','b-warn'],none:['No scope match','b-lapse'],na:['Scope data not available','b-plain']};

/* ===== Search engine: structured + semantic + geo + scope + transparent relevance ===== */
function runSearch(P,F,origin){
  const types=F.types.size?F.types:(P.types.size?P.types:null);
  const txt=P.text.split(' ').filter(w=>w.length>2);
  const noScopeTypes=types&&[...types].every(t=>t==='P'||t==='R'); // PTP/RMP rows carry no scope columns
  const out=[];
  for(const L of LABS){
    if(OVERRIDES[L.id]&&OVERRIDES[L.id].hidden) continue;
    if(types&&!types.has(L.t)) continue;
    const st=F.state||P.state||null;
    if(st&&L.state!==st) continue;
    if(F.city&&L.city.toLowerCase()!==F.city.toLowerCase()) continue;
    const status=accStatus(L);
    if(F.validity==='valid'&&!(status.k==='valid'||status.k==='warn')) continue;
    if(F.validity==='lapse'&&status.k!=='lapse') continue;
    if(F.service.size&&!F.service.has(L.sv)) continue;
    if(F.fac.has('pf')&&!L.pf) continue; if(F.fac.has('sf')&&!L.sf) continue; if(F.fac.has('mf')&&!L.mf) continue;
    if(F.regs.size&&!(L.ig&&[...F.regs].every(r=>L.ig.regs.includes(r)))) continue;
    if(F.integrated&&!L.ig) continue;
    if(F.disc.size&&!L.d.some(i=>F.disc.has(i))) continue;
    if(F.grp.size&&!L.g.some(i=>F.grp.has(i))) continue;
    let dist=null;
    if(origin&&L.la!=null) dist=km(origin.la,origin.lo,L.la,L.lo);
    const rad=F.radius||P.radius||(origin&&origin.fromQuery?40:null);
    if(origin&&rad&&(dist==null||dist>rad)) continue;
    const sm=scopeMatch(L,P);
    const nameHit=(txt.length&&txt.every(w=>L.nl.includes(w)))||(P.kw.length&&P.kw.some(k=>k.length>3&&L.nl.includes(k.replace(/s$/,'').slice(0,8))));
    const idHit=P.raw&&(L.id.toLowerCase()===P.raw.trim().toLowerCase()||L.cn.toLowerCase()===P.raw.trim().toLowerCase());
    if(sm){ if(sm.lvl==='none'&&!nameHit) continue; if(sm.lvl==='na'&&!F.includeNA&&!noScopeTypes&&!nameHit) continue; }
    else if(txt.length&&!nameHit&&!idHit){ // free text: match name, city, groups
      const hay=(L.nl+' '+L.city+' '+grpNames(L).join(' ')+' '+subNames(L).join(' ')+' '+discNames(L).join(' ')).toLowerCase();
      if(!txt.every(w=>hay.includes(w))) continue;
    }
    if(F.scope.size&&!(sm&&F.scope.has(sm.lvl))) continue;
    const dv=demoVals(L);
    if(Demo.on&&F.price){const [a,b]=F.price;if(!dv||dv.price<a||dv.price>b)continue;}
    else if(Demo.on&&P.priceMax&&(!dv||dv.price>P.priceMax)) continue;
    if(Demo.on&&F.tat&&(!dv||dv.tatH>F.tat)) continue;
    if(Demo.on&&(F.home||P.home)&&!(dv&&dv.home)) continue;
    if(Demo.on&&F.online&&!(dv&&dv.online)) continue;
    if(Demo.on&&F.digital&&!(dv&&dv.digital)) continue;
    // transparent relevance
    let score=0; const why=[];
    if(sm){score+={exact:100,category:80,related:40,na:5,none:0}[sm.lvl]; if(sm.sub) score+=10;}
    if(nameHit){score+=50;why.push('Name mentions “'+(P.text||P.kw.join(', '))+'”');}
    if(idHit){score+=200;why.push('Lab ID / certificate matches');}
    if(types){why.push(TYPES[L.t].name);}
    if(sm&&sm.hits.length) why.push('Accredited scope lists '+sm.hits.slice(0,2).join('; '));
    if(sm&&sm.lvl==='related') why.push({w:1,t:sm.note});
    if(sm&&sm.lvl==='na') why.push({w:1,t:'Scope details not in dataset — see scope document'});
    if(P.param&&sm&&sm.lvl!=='na') why.push({w:1,t:'Parameter “'+P.param+'” is not itemised in the dataset; confirm in the scope document'});
    if(dist!=null){score+=Math.max(0,30-dist/5);why.push(fmtKm(dist)+' from '+(origin.label||'your location')+(L.gp>1?' (approximate position)':''));}
    else if(st) why.push('Located in '+st);
    if(F.city) why.push('Located in '+L.city);
    if(status.k==='valid'){score+=15;why.push('Accreditation valid to '+fmtDate(L.to));}
    else if(status.k==='warn'){score+=8;why.push({w:1,t:status.label});}
    else if(status.k==='lapse'){why.push({w:1,t:status.label});}
    if(L.ig&&L.ig.regs.length){why.push('Recognised by '+L.ig.regs.join(', ')+' (integrated lab list)');}
    if(dv&&(P.home||F.home)&&dv.home) why.push('Home collection available (demo data)');
    score+=(L.em?1:0)+(L.mo?1:0)+(L.p?1:0)+(L.gp===0?2:0);
    out.push({L,dist,sm,score,why,dv,status});
  }
  return out;
}
function sortResults(R,key){
  const f={relevance:(a,b)=>b.score-a.score,distance:(a,b)=>(a.dist??1e9)-(b.dist??1e9),
    validity:(a,b)=>(b.L.to||'').localeCompare(a.L.to||''),recent:(a,b)=>((b.L.am||b.L.fr)||'').localeCompare((a.L.am||a.L.fr)||''),
    scope:(a,b)=>scopeRank(b)-scopeRank(a)||b.score-a.score,name:(a,b)=>a.L.n.localeCompare(b.L.n),
    priceAsc:(a,b)=>(a.dv?.price??1e9)-(b.dv?.price??1e9),priceDesc:(a,b)=>(b.dv?.price??-1)-(a.dv?.price??-1),tat:(a,b)=>(a.dv?.tatH??1e9)-(b.dv?.tatH??1e9)}[key]||((a,b)=>b.score-a.score);
  return R.sort(f);
}
const scopeRank=r=>({exact:5,category:4,related:3,na:1,none:0}[r.sm?.lvl]??2);

/* ===== Persistence: shared db when the viewer grants it, else this browser ===== */
const Store={db:null,mem:{requests:[],events:[],audit:[],overrides:{}},listeners:[],
  async init(){
    try{const s=localStorage.getItem('fal_store');if(s)Object.assign(this.mem,JSON.parse(s));}catch(e){}
    Object.assign(OVERRIDES,this.mem.overrides||{});
    try{ if(window.claude&&window.claude.use){ const db=await window.claude.use('db'); if(db){ this.db=db;
      db.collection('requests').onSnapshot(q=>{this.mem.requests=q.docs.map(d=>({...d.data(),id:d.id}));this.emit();},()=>{});
      db.collection('overrides').onSnapshot(q=>{for(const d of q.docs){OVERRIDES[d.id]=d.data();}this.mem.overrides={...OVERRIDES};this.emit();},()=>{});
      db.collection('events').orderBy('ts','desc').limit(500).onSnapshot(q=>{this.mem.events=q.docs.map(d=>d.data());this.emit();},()=>{});
    }}}catch(e){}
  },
  save(){try{localStorage.setItem('fal_store',JSON.stringify({...this.mem,events:this.mem.events.slice(0,500)}));}catch(e){}},
  emit(){this.save();this.listeners.forEach(f=>f());},
  on(f){this.listeners.push(f);},
  async putRequest(r){ const i=this.mem.requests.findIndex(x=>x.id===r.id); if(i>=0)this.mem.requests[i]=r; else this.mem.requests.unshift(r); this.emit();
    if(this.db){try{await this.db.collection('requests').doc(r.id).set(JSON.parse(JSON.stringify(r)));}catch(e){}} },
  async setOverride(id,o){ OVERRIDES[id]={...(OVERRIDES[id]||{}),...o}; this.mem.overrides={...OVERRIDES}; this.emit();
    if(this.db){try{await this.db.collection('overrides').doc(id).set(OVERRIDES[id]);}catch(e){}} },
  async logEvent(e){ e.ts=Date.now(); this.mem.events.unshift(e); this.mem.events=this.mem.events.slice(0,800); this.save();
    if(this.db){try{await this.db.collection('events').add(e);}catch(err){}} }
};
async function saveFile(filename,data){
  try{ const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;
    if(!dl){ // outside claude.ai (GitHub Pages / Vercel): ordinary browser download
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+data],{type:'text/csv;charset=utf-8'}));a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('Saved '+filename);return;}
    await dl.save({filename,data}); toast('Saved '+filename);
  }catch(e){ if(e&&e.code==='declined') return; toast('Could not save the file'+(e&&e.code?' ('+e.code+')':'')); }
}
function toCSV(rows){return rows.map(r=>r.map(v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\n');}
function toast(msg){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}
