/* ===== Sign-in (prototype) & role portals ===== */
const FLOW=['Draft','Submitted','Under review','Technical review','Approved','Published'];
const kpi=(n,l,go)=>`<div class="kpi" ${go?`style="cursor:pointer" data-go="${go}"`:''}><b>${typeof n==='number'?n.toLocaleString('en-IN'):n}</b><span>${l}</span></div>`;
function bars(obj,max,opts={}){const e=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,opts.n||15);const m=max||Math.max(1,...e.map(x=>x[1]));
  return `<div class="bars">${e.map(([k,v])=>`<${opts.go?'button':'div'} class="r" ${opts.go?`data-go="${opts.go(k)}"`:''}><span title="${esc(k)}">${esc(k||'Not stated')}</span><span class="bar" style="width:${v/m*100}%"></span><span>${v.toLocaleString('en-IN')}</span></${opts.go?'button':'div'}>`).join('')}</div>`;}
function flowHTML(r){const i=FLOW.indexOf(r.status);const rej=r.status==='Rejected'||r.status==='Correction required';
  return `<div class="flow" aria-label="Workflow stage">${FLOW.map((s,j)=>`<span class="${s===r.status?'cur':(i>j||(rej&&j<=(r.lastStage||1)))?'done':''}">${s}</span>`).join('')}${rej?`<span class="rej">${r.status}</span>`:''}</div>`;}
function reqCard(r,actions){const L=BYID[r.labId];
  return `<div class="panel"><div class="row" style="justify-content:space-between"><div><b>${esc(r.title)}</b> <span class="badge b-plain">${esc(r.id)}</span> <span class="badge ${r.kind==='report'?'b-warn':'b-info'}">${r.kind==='report'?'Public report':'Lab change request'}</span></div><span class="small muted">${fmtDate(new Date(r.created).toISOString())}</span></div>
  <div class="small"><a href="#/lab/${r.labId}/${L?L.slug:''}">${esc(L?L.n:r.labId)}</a> (${esc(r.labId)}) · submitted by ${esc(r.by)}</div>${flowHTML(r)}
  ${r.detail?`<p style="margin:6px 0">${esc(r.detail)}</p>`:''}
  ${r.changes&&r.changes.length?`<table class="tbl"><thead><tr><th>Field</th><th>Current (published)</th><th>Proposed</th></tr></thead><tbody>${r.changes.map(c=>`<tr><td>${esc(c.label)}</td><td>${esc(c.from)||'<span class="na">empty</span>'}</td><td><b>${esc(c.to)}</b></td></tr>`).join('')}</tbody></table>`:''}
  ${r.docs&&r.docs.length?`<div class="small">Supporting documents: ${r.docs.map(d=>`<span class="badge b-plain">📎 ${esc(d.name)} (${Math.round(d.size/1024)} KB)</span>`).join(' ')}</div>`:''}
  ${actions||''}<details><summary class="small" style="cursor:pointer">Audit trail (${r.audit.length})</summary><div class="audit">${r.audit.map(a=>`${new Date(a.ts).toLocaleString('en-IN')} — <b>${esc(a.who)}</b>: ${esc(a.what)}${a.comment?' — “'+esc(a.comment)+'”':''}`).join('<br>')}</div></details></div>`;}
async function advance(id,to,who,comment){const r=Store.mem.requests.find(x=>x.id===id);if(!r)return;
  if((to==='Rejected'||to==='Correction required')&&!comment){toast('Add a comment explaining the decision');return;}
  const c=JSON.parse(JSON.stringify(r)); if(FLOW.includes(r.status)) c.lastStage=FLOW.indexOf(r.status);
  c.status=to;c.audit.push({ts:Date.now(),who,what:'Moved to '+to,comment:comment||''});
  if(to==='Published'&&c.changes&&c.changes.length){const f={};c.changes.forEach(ch=>f[ch.field]=ch.to);await Store.setOverride(c.labId,{fields:{...((OVERRIDES[c.labId]||{}).fields||{}),...f},ts:Date.now()});}
  await Store.putRequest(c);toast(c.id+' → '+to);rerender();}

function accView(){const soon=LABS.filter(l=>accStatus(l).k==='warn').sort((a,b)=>a.to.localeCompare(b.to));const lapsed=LABS.filter(l=>accStatus(l).k==='lapse');
  const row=l=>{const st=accStatus(l);return `<tr><td>${l.id}</td><td><a href="#/lab/${l.id}/${l.slug}?tab=accreditation">${esc(l.n)}</a></td><td>${TYPES[l.t].short}</td><td>${esc(l.cn)}</td><td>${fmtDate(l.to)}</td><td>${statusBadge(st)}</td><td><select data-act="setstatus" data-id="${l.id}" style="width:auto"><option value="">Set status…</option>${['Active','Renewed','Suspended','Withdrawn'].map(s=>`<option>${s}</option>`).join('')}</select></td></tr>`;};
  return `<h1 style="font-size:24px">Accreditation management</h1><p class="muted">Status changes made here are published immediately as an authoritative NABL action and written to the audit trail.</p>
  <div class="panel"><h3>Expiring within 90 days (${soon.length})</h3><div class="tscroll"><table class="tbl"><thead><tr><th>ID</th><th>Lab</th><th>Type</th><th>Certificate</th><th>Valid to</th><th>Status</th><th>Action</th></tr></thead><tbody>${soon.slice(0,80).map(row).join('')}</tbody></table></div></div>
  <div class="panel"><h3>Validity passed, expired or suspended (${lapsed.length})</h3><div class="tscroll"><table class="tbl"><thead><tr><th>ID</th><th>Lab</th><th>Type</th><th>Certificate</th><th>Valid to</th><th>Status</th><th>Action</th></tr></thead><tbody>${lapsed.slice(0,80).map(row).join('')}</tbody></table></div><p class="small muted">Showing first 80.</p></div>
  ${Store.mem.audit.length?`<div class="panel"><h3>Recent admin actions</h3><div class="audit">${Store.mem.audit.slice(0,20).map(a=>`${new Date(a.ts).toLocaleString('en-IN')} — ${esc(a.what)}`).join('<br>')}</div></div>`:''}`;}
function dqView(){const dq=RAW.dq, rows=RAW.dqrows; const byIssue={};rows.forEach(r=>byIssue[r[1]]=(byIssue[r[1]]||0)+1);const f=S.dqf||'';
  return `<h1 style="font-size:24px">Data quality</h1><p class="muted">Issues found while importing the two spreadsheets. Counts are from the ETL run; fixes flow back through the correction workflow.</p>
  <div class="kpis">${kpi(dq['Duplicate LabId (second row dropped)']||0,'Duplicate LabIds')}${kpi(dq['Certificate no. shared by two LabIds']||0,'Shared certificate numbers')}${kpi(dq['Missing PIN']||0,'Missing PIN')}${kpi(dq['PIN not found in PIN-coordinate table']||0,'PIN not geocoded exactly')}${kpi(LABS.filter(l=>l.gp>=3).length,'State-level / no coordinates')}${kpi(dq['No group/sub-group scope data']||0,'No scope groups')}${kpi(dq['Validity end date before 28-09-2026']||0,'Validity date passed')}${kpi(RAW.meta.orphans,'Integrated labs missing from master')}</div>
  <div class="cols2"><div class="panel"><h3>All checks</h3><table class="tbl"><tbody>${Object.entries(dq).map(([k,v])=>`<tr><td>${esc(k)}</td><td style="text-align:right">${v.toLocaleString('en-IN')}</td></tr>`).join('')}
   <tr><td>Columns empty in every row: ExtendDate, CertUrl</td><td style="text-align:right">2</td></tr><tr><td>Columns mostly empty: SampleURL, IsNew (99%), AmendmentDate (66%)</td><td style="text-align:right">3</td></tr>
   <tr><td>Facility flags in mixed encodings (Yes/No, True/False, 1/0) — normalised</td><td style="text-align:right">—</td></tr></tbody></table></div>
  <div class="panel"><h3>Record-level issues</h3><select id="dqf" style="margin-bottom:8px"><option value="">All issue types (${rows.length})</option>${Object.entries(byIssue).map(([k,v])=>`<option ${f===k?'selected':''} value="${esc(k)}">${esc(k)} (${v})</option>`).join('')}</select>
   <div class="tscroll" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Lab ID</th><th>Issue</th><th>Detail</th></tr></thead><tbody>${rows.filter(r=>!f||r[1]===f).slice(0,300).map(r=>`<tr><td><a href="#/lab/${r[0]}/${BYID[r[0]]?BYID[r[0]].slug:''}">${esc(r[0])}</a></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>
   <button class="btn small" data-act="exportdq" style="margin-top:8px">Export issues CSV</button></div></div>`;}
function analyticsView(){const ev=Store.mem.events;const s=ev.filter(e=>e.type==='search'&&e.q);const cnt=(arr,f)=>{const c={};arr.forEach(e=>{[].concat(f(e)).forEach(k=>{if(k)c[k]=(c[k]||0)+1;});});return c;};
  return `<h1 style="font-size:24px">Search analytics</h1><p class="muted">${Store.db?'Aggregated across viewers of this artifact.':'Collected in this browser for the demo.'} Run a few searches to populate.</p>
  <div class="kpis">${kpi(s.length,'Searches')}${kpi(s.filter(e=>e.zero).length,'Zero-result searches')}${kpi(ev.filter(e=>e.type==='view').length,'Profile views')}${kpi(ev.filter(e=>e.type==='compare').length,'Comparisons')}</div>
  <div class="cols2"><div class="panel"><h3>Most searched</h3>${bars(cnt(s,e=>e.q.toLowerCase()),0,{n:12})}</div><div class="panel"><h3>Zero-result searches (insight for NABL)</h3>${bars(cnt(s.filter(e=>e.zero),e=>e.q.toLowerCase()),0,{n:12})||''}</div>
  <div class="panel"><h3>Laboratory types searched</h3>${bars(cnt(s,e=>(e.types||[]).map(t=>TYPES[t]?.short)))}</div><div class="panel"><h3>Searches by state / city</h3>${bars(cnt(s,e=>[e.state,e.city]))}</div>
  <div class="panel"><h3>Most used filters</h3>${bars(cnt(s,e=>e.filters||[]))}</div><div class="panel"><h3>Most viewed laboratories</h3>${bars(cnt(ev.filter(e=>e.type==='view'),e=>e.n))}</div>
  <div class="panel"><h3>Most compared laboratories</h3>${bars(cnt(ev.filter(e=>e.type==='compare'),e=>(e.ids||[]).map(id=>BYID[id]?.n)))}</div></div>`;}
/* --- Bulk import --- */
const MASTER_COLS=['LabId','LaboratoryName','Labtype','ContactPerson','ContactEmail','ContactMobile','PrimeAddress','City','State','Zone','LITypeOfLABbyService','LandLine','Pin','Fax','Cert_No','Issue_Date','ExtendDate','ToDate','AmendmentDate','CertUrl','SampleURL','disciplineName','groupName','subGrpName','PermanentFacility','SiteFacility','MobileFacility','AdditionalCertificate','ScopeURL','IsNew'];
const DBF={LabId:'lab_id',LaboratoryName:'laboratory_name',Labtype:'laboratory_type',ContactPerson:'contact_person',ContactEmail:'email',ContactMobile:'mobile',PrimeAddress:'address',City:'city',State:'state',Zone:'nabl_zone',LITypeOfLABbyService:'service_mode',LandLine:'landline',Pin:'pincode',Fax:'fax',Cert_No:'accreditation_number',Issue_Date:'valid_from',ExtendDate:'extended_to',ToDate:'valid_to',AmendmentDate:'amendment_date',CertUrl:'certificate_url',SampleURL:'sample_url',disciplineName:'scope.discipline[]',groupName:'scope.group[]',subGrpName:'scope.sub_group[]',PermanentFacility:'facility.permanent',SiteFacility:'facility.site',MobileFacility:'facility.mobile',AdditionalCertificate:'additional_certificate_count',ScopeURL:'scope_document_ref',IsNew:'is_new'};
const MANDATORY=['LabId','LaboratoryName','Labtype','City','State','Cert_No','Issue_Date','ToDate'];
function importView(){const I=S.imp;
  let out=`<h1 style="font-size:24px">Bulk import</h1><p class="muted">Upload the NABL master workbook (Testing / Medical / Calibration / PTP / RMP sheets) or the centralized integrated-labs list. The file is read in your browser; nothing is uploaded.</p>
  <div class="drop"><p><b>Choose an Excel file</b> (.xlsx)</p><input type="file" id="impfile" accept=".xlsx,.xls"><p class="small muted">${window.XLSX?'':'Excel reader is loading…'}</p></div>`;
  if(!I) return out;
  if(I.loading) return out+`<div class="panel" style="margin-top:14px" role="status">Reading ${esc(I.file)} and validating rows…</div>`;
  if(I.error) return out+`<div class="panel" style="margin-top:14px;color:var(--lapse)">${esc(I.error)}</div>`;
  out+=`<div class="panel" style="margin-top:16px"><h3>${esc(I.file)} — ${I.template}</h3><p class="small muted">Sheets: ${I.sheets.map(s=>esc(s.name)+' ('+s.rows+')').join(', ')}</p>
   <h4>Column mapping</h4><p class="small muted">Review how each Excel column maps to a database field. Unmapped columns are kept in the raw import record.</p>
   <div class="tscroll" style="max-height:300px;overflow:auto"><table class="tbl"><thead><tr><th>Excel column</th><th>Database field</th><th>Required</th></tr></thead><tbody>${I.headers.map(h=>`<tr><td>${esc(h)}</td><td><select data-act="map" data-h="${esc(h)}" style="width:auto">${['(ignore)',...new Set(Object.values(I.template==='NABL master'?DBF:IGF))].map(f=>`<option ${I.map[h]===f?'selected':''}>${f}</option>`).join('')}</select></td><td>${(I.template==='NABL master'?MANDATORY:['LAB ID','Laboratory Name']).includes(h)?'Yes':''}</td></tr>`).join('')}</tbody></table></div>
   ${I.missingHeaders.length?`<p style="color:var(--lapse)">Missing expected columns: ${I.missingHeaders.map(esc).join(', ')}</p>`:'<p class="small" style="color:var(--seal)">✓ All expected headers present</p>'}</div>`;
  if(I.summary){const s=I.summary;out+=`<div class="panel"><h3>Import summary</h3><div class="kpis">${kpi(s.total,'Records uploaded')}${kpi(s.valid,'Valid')}${kpi(s.errors,'Rows with errors')}${kpi(s.dups,'Duplicates in file')}${kpi(s.updates,'Match existing (update)')}${kpi(s.news,'New laboratories')}${kpi(s.nocoord,'Missing exact coordinates')}${kpi(s.warnings,'Warnings')}</div>
   <div class="row"><button class="btn" data-act="imperr">Download error file</button><button class="btn primary" data-act="impgo" ${I.done?'disabled':''}>${I.done?'Imported':'Proceed with valid records ('+s.valid+')'}</button></div>
   ${I.done?`<p style="color:var(--seal)">✓ ${esc(I.done)}</p>`:''}
   <h4 style="margin-top:14px">Errors and warnings (first 200)</h4><div class="tscroll" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>Sheet</th><th>Row</th><th>Lab ID</th><th>Severity</th><th>Issue</th></tr></thead><tbody>${I.issues.slice(0,200).map(e=>`<tr><td>${esc(e.sheet)}</td><td>${e.row}</td><td>${esc(e.id)}</td><td><span class="badge ${e.sev==='error'?'b-lapse':'b-warn'}">${e.sev}</span></td><td>${esc(e.msg)}</td></tr>`).join('')}</tbody></table></div>
   <h4 style="margin-top:14px">Preview (first 10 valid rows)</h4><div class="tscroll"><table class="tbl"><thead><tr>${['LabId','LaboratoryName','Labtype','City','State','Cert_No','ToDate'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${I.preview.map(r=>`<tr>${['LabId','LaboratoryName','Labtype','City','State','Cert_No','ToDate'].map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;}
  return out;
}
const IGF={'LAB ID':'lab_id','Laboratory Name':'laboratory_name','Accreditation Cycle ':'accreditation_cycle','Extended Validity':'extended_validity','Certificate No. ':'accreditation_number','State':'state','Email ':'email','Mobile':'mobile','FSSAI':'recognition.FSSAI','EIC':'recognition.EIC','APEDA':'recognition.APEDA','TEA BOARD':'recognition.TEA BOARD','SPICE BOARD':'recognition.SPICE BOARD','IOPEPC':'recognition.IOPEPC','CDB':'recognition.CDB','Shefexil':'recognition.Shefexil'};
function xdate(v){if(v==null||v==='')return null;if(typeof v==='number'){const d=new Date(Math.round((v-25569)*864e5));return isNaN(d)?null:d.toISOString().slice(0,10);}const m=String(v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m){const d=new Date(+m[3],+m[2]-1,+m[1]);return isNaN(d)||d.getDate()!==+m[1]?null:`${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;}return null;}
function splitTop(s){const out=[];let d=0,c='';for(const ch of String(s||'')){if(ch==='(')d++;if(ch===')')d=Math.max(0,d-1);if(ch===','&&!d){out.push(c);c='';}else c+=ch;}out.push(c);return out.map(t=>t.replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()).filter(t=>t&&!['--Select Group--','--No Data--','null'].includes(t));}
async function handleImport(file){
  if(!window.XLSX){toast('Excel reader not loaded yet — try again in a moment');return;}
  S.imp={file:file.name,loading:true};rerender();
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    const sheets=wb.SheetNames.map(n=>({name:n,data:XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:'',raw:true})}));
    const headers=[...new Set(sheets.flatMap(s=>s.data.length?Object.keys(s.data[0]):[]))];
    const isMaster=headers.includes('LabId')&&headers.includes('Cert_No'); const isIG=headers.includes('LAB ID')&&headers.includes('FSSAI');
    if(!isMaster&&!isIG){S.imp={file:file.name,error:'Unrecognised template. Expected the NABL master columns (LabId, LaboratoryName, Labtype, …) or the integrated labs list (LAB ID, FSSAI, EIC, …).'};rerender();return;}
    const tpl=isMaster?'NABL master':'Integrated labs list'; const map={};headers.forEach(h=>map[h]=(isMaster?DBF:IGF)[h]||'(ignore)');
    const I={file:file.name,template:tpl,sheets:sheets.map(s=>({name:s.name,rows:s.data.length})),headers,map,missingHeaders:(isMaster?MASTER_COLS:Object.keys(IGF)).filter(h=>!headers.includes(h)),issues:[],preview:[],valid:[]};
    const seen={},seenCert={};let total=0,dups=0,updates=0,news=0,nocoord=0,warnings=0;const errRows=new Set();
    const TYPEMAP={Testing:'T',Medical:'M',Calibration:'C',PTP:'P',RMP:'R'};
    for(const sh of sheets) sh.data.forEach((r,ix)=>{ total++; const row=ix+2;
      const id=String(isMaster?r.LabId:r['LAB ID']).trim().toUpperCase(); const add=(sev,msg)=>{I.issues.push({sheet:sh.name,row,id,sev,msg});if(sev==='error')errRows.add(sh.name+row);else warnings++;};
      if(!id){add('error','Lab ID missing');return;}
      if(!/^[TMCPRI]-\d+$/.test(id)) add('warn','Lab ID format unusual (expected e.g. T-0119)');
      if(seen[id]){dups++;add('error','Duplicate Lab ID in file (also row '+seen[id]+')');return;} seen[id]=sh.name+' row '+row;
      if(isMaster){
        MANDATORY.forEach(k=>{if(String(r[k]??'').trim()==='')add('error','Mandatory field empty: '+k);});
        if(r.Labtype&&!TYPEMAP[r.Labtype]) add('error','Unknown Labtype “'+r.Labtype+'”');
        const f=xdate(r.Issue_Date),t=xdate(r.ToDate); if(r.Issue_Date&&!f)add('error','Invalid Issue_Date');if(r.ToDate&&!t)add('error','Invalid ToDate');if(f&&t&&t<=f)add('error','ToDate is not after Issue_Date');
        if(t&&t<TODAY.toISOString().slice(0,10)) add('warn','Validity end date has passed');
        const pin=String(r.Pin||'').replace(/\.0$/,''); if(pin&&!/^[1-9]\d{5}$/.test(pin))add('error','Invalid PIN “'+pin+'”'); if(!pin) add('warn','PIN missing — map position from city/state');
        if(pin&&!PIN_INDEX[pin]){nocoord++;} else if(!pin) nocoord++;
        if(r.ContactEmail&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(r.ContactEmail).trim()))add('warn','Email looks invalid');
        const cn=String(r.Cert_No||'').trim(); if(cn&&seenCert[cn])add('warn','Certificate number also used by '+seenCert[cn]); if(cn)seenCert[cn]=id;
        if(!String(r.groupName||'').trim()&&!String(r.disciplineName||'').trim()) add('warn','No scope columns (discipline / group)');
        if(/--Select Group--|--No Data--/.test(String(r.groupName))) add('warn','Placeholder text in groupName');
        if(!STATES.includes(String(r.State).trim())&&r.State) add('warn','State “'+r.State+'” not in reference list');
      } else {
        if(!r['Laboratory Name']) add('error','Laboratory Name missing');
        const st=String(r.State||'').trim(); if(st&&!STATES.some(s=>s.toLowerCase()===st.toLowerCase().replace(/\t/g,''))) add('warn','State “'+st+'” needs normalising');
        if(!BYID[id]) add('warn','Lab ID not found in NABL master — would create a partial record');
        if(/under process/i.test(String(r['Certificate No. ']))) add('warn','Certificate “under process”');
      }
      if(BYID[id])updates++;else news++;
      if(!errRows.has(sh.name+row)){I.valid.push({sheet:sh.name,r});if(I.preview.length<10)I.preview.push(isMaster?r:{LabId:id,LaboratoryName:r['Laboratory Name'],State:r.State,Cert_No:r['Certificate No. ']});}
    });
    I.summary={total,valid:I.valid.length,errors:errRows.size,dups,updates,news,nocoord,warnings};S.imp=I;rerender();
  }catch(e){console.error(e);S.imp={file:file.name,error:'Could not read this file: '+e.message};rerender();}
}
function applyImport(){const I=S.imp;if(!I||!I.valid)return;let n=0,u=0;const TYPEMAP={Testing:'T',Medical:'M',Calibration:'C',PTP:'P',RMP:'R'};
  const code=(k,v)=>{let i=DICT[k].indexOf(v);if(i<0){DICT[k].push(v);i=DICT[k].length-1;}return i;};
  for(const {r} of I.valid){
    if(I.template==='NABL master'){const id=String(r.LabId).trim().toUpperCase();const pin=String(r.Pin||'').replace(/\.0$/,'');
      const ex=BYID[id];const city=String(r.City||'').trim(),state=String(r.State||'').trim();
      let la=null,lo=null,gp=4; if(PIN_INDEX[pin]){[la,lo]=PIN_INDEX[pin];gp=0;} else if(CITY_INDEX[city.toLowerCase()]){la=CITY_INDEX[city.toLowerCase()].la;lo=CITY_INDEX[city.toLowerCase()].lo;gp=2;} else if(ex){la=ex.la;lo=ex.lo;gp=ex.gp;}
      const L={...(ex||{i:LABS.length,src:0,ac:0,nw:false}),id,n:String(r.LaboratoryName).trim(),t:TYPEMAP[r.Labtype]||'T',cp:String(r.ContactPerson||''),em:String(r.ContactEmail||''),mo:String(r.ContactMobile||'').replace(/\.0$/,''),ad:String(r.PrimeAddress||''),city,state,z:String(r.Zone||''),sv:String(r.LITypeOfLABbyService||''),ll:String(r.LandLine||''),p:pin,cn:String(r.Cert_No).trim(),
        fr:xdate(r.Issue_Date)||'',to:xdate(r.ToDate)||'',am:xdate(r.AmendmentDate)||'',d:splitTop(r.disciplineName).map(v=>code('disc',v)),g:splitTop(r.groupName).map(v=>code('grp',v)),sg:splitTop(r.subGrpName).map(v=>code('sub',v)),
        pf:/^(yes|true|1)$/i.test(String(r.PermanentFacility)),sf:/^(yes|true|1)$/i.test(String(r.SiteFacility)),mf:/^(yes|true|1)$/i.test(String(r.MobileFacility)),ac:+r.AdditionalCertificate||0,su:String(r.ScopeURL||''),la,lo,gp:ex&&gp===4?ex.gp:gp};
      L.slug=(L.n+' '+L.city).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);L.nl=L.n.toLowerCase();
      if(ex){Object.assign(ex,L);u++;}else{LABS.push(L);BYID[id]=L;n++;}
    } else {const id=String(r['LAB ID']).trim().toUpperCase();const L=BYID[id];if(!L)continue;
      L.ig={regs:Object.keys(REGNAME).filter(k=>/^yes$/i.test(String(r[k]).trim())),cycle:String(r['Accreditation Cycle ']||''),ext:String(r['Extended Validity']||''),cert:String(r['Certificate No. ']||''),flag:L.ig?L.ig.flag:'',note:''};u++;}
  }
  Store.mem.audit.unshift({ts:Date.now(),what:`Bulk import of ${I.file}: ${n} added, ${u} updated`});Store.save();
  I.done=`${n} new and ${u} updated records are live in this session's search. (Production writes to PostgreSQL after admin approval.)`;rerender();}
function labsCSV(list){return toCSV([['Lab ID','Name','Type','Contact person','Email','Mobile','Address','City','State','PIN','Certificate','Valid from','Valid to','Status','Disciplines','Groups','Recognitions','Position accuracy'],...list.map(l=>[l.id,l.n,TYPES[l.t].short,field(l,'cp'),field(l,'em'),field(l,'mo'),field(l,'ad'),l.city,l.state,field(l,'p'),l.cn,l.fr,l.to,accStatus(l).label,discNames(l).join('; '),grpNames(l).join('; '),l.ig?l.ig.regs.join('; '):'',GEO[l.gp]])]);}
