"""ETL: NABL_Labs_Data.xlsx + Centralized_list.xlsx -> labs.json for the Find-a-Lab prototype.
Master data is kept as-is; everything derived is tagged so it can be told apart."""
import pandas as pd, json, re, html, math, csv
from datetime import datetime, date
from openpyxl import load_workbook
from collections import defaultdict, Counter

UP='/mnt/user-data/uploads/'; TODAY=date(2026,9,28)
x=pd.read_excel(UP+'NABL_Labs_Data.xlsx',sheet_name=None,dtype=str)
TYPE={'Testing':'T','Medical':'M','Calibration':'C','PTP':'P','RMP':'R'}
STATE_FIX={'Dadra and Nagar Haveli':'Dadra and Nagar Haveli and Daman and Diu','Daman and Diu':'Dadra and Nagar Haveli and Daman and Diu','Andaman and Nicobar':'Andaman and Nicobar Islands'}

def clean(v):
    if v is None or (isinstance(v,float) and math.isnan(v)) or str(v).strip().lower() in ('nan','none',''): return ''
    return re.sub(r'\s+',' ',html.unescape(str(v))).strip()
def split_top(s):
    """split on commas that are not inside parentheses (NABL group names contain commas)"""
    out,depth,cur=[],0,''
    for ch in s:
        if ch=='(':depth+=1
        if ch==')':depth=max(0,depth-1)
        if ch==',' and depth==0: out.append(cur);cur=''
        else: cur+=ch
    out.append(cur)
    return [t.strip() for t in out if t.strip() and t.strip() not in ('--Select Group--','--No Data--','null')]
def flag(v): return clean(v).lower() in ('yes','true','1')
def dt(v):
    v=clean(v)
    try: return datetime.strptime(v,'%d/%m/%Y').date().isoformat()
    except: return ''

# geocoding tables
pin={}
for r in csv.DictReader(open('/home/claude/flab/IN.csv')):
    try: pin[r['key'][3:]]=(float(r['latitude']),float(r['longitude']))
    except: pass
pre=defaultdict(list)
for k,v in pin.items(): pre[k[:3]].append(v)
pre={k:(sum(a for a,b in v)/len(v),sum(b for a,b in v)/len(v)) for k,v in pre.items()}
from shapely.geometry import shape
st_centroid={f['properties']['name']:shape(f['geometry']).representative_point() for f in json.load(open('/home/claude/flab/states.json'))['features']}

DQ=Counter(); dq_rows=[]
dicts={k:[] for k in ('disc','grp','sub','city','state')}; idx={k:{} for k in dicts}
def code(kind,v):
    if v not in idx[kind]: idx[kind][v]=len(dicts[kind]); dicts[kind].append(v)
    return idx[kind][v]

labs={}; certseen={}
for sheet,df in x.items():
    for _,r in df.iterrows():
        lid=clean(r.LabId).upper()
        if lid!=clean(r.LabId): DQ['LabId not upper-case (normalised)']+=1
        if lid in labs:
            DQ['Duplicate LabId (second row dropped)']+=1; dq_rows.append((lid,'Duplicate LabId','Row appears twice in '+sheet)); continue
        state=STATE_FIX.get(clean(r.State),clean(r.State)); city=clean(r.City)
        p=clean(r.Pin).split('.')[0]
        if not state: DQ['Missing state']+=1; dq_rows.append((lid,'Missing state',''))
        if not city: DQ['Missing city']+=1; dq_rows.append((lid,'Missing city',''))
        if not p: DQ['Missing PIN']+=1; dq_rows.append((lid,'Missing PIN',''))
        elif len(p)!=6: DQ['Malformed PIN']+=1; dq_rows.append((lid,'Malformed PIN',p))
        cert=clean(r.Cert_No)
        if cert in certseen: DQ['Certificate no. shared by two LabIds']+=1; dq_rows.append((lid,'Certificate no. shared',cert+' also on '+certseen[cert]))
        certseen[cert]=lid
        grp=split_top(clean(r.groupName)); sub=split_top(clean(r.subGrpName)); disc=split_top(clean(r.disciplineName))
        if not grp and not sub: DQ['No group/sub-group scope data']+=1
        if '--Select Group--' in str(r.groupName) or '--No Data--' in str(r.groupName): DQ['Placeholder "--Select Group--" in groupName']+=1
        if '&amp;' in str(r.groupName)+str(r.subGrpName)+str(r.disciplineName): DQ['HTML-escaped text (&amp;) decoded']+=1
        to=dt(r.ToDate)
        labs[lid]=dict(id=lid,n=clean(r.LaboratoryName),t=TYPE[sheet],cp=clean(r.ContactPerson),em=clean(r.ContactEmail),
            mo=clean(r.ContactMobile).split('.')[0],ad=clean(r.PrimeAddress),c=code('city',city),s=code('state',state),z=clean(r.Zone).split('.')[0],
            sv=clean(r.LITypeOfLABbyService),ll=clean(r.LandLine),p=p,cn=cert,fr=dt(r.Issue_Date),to=to,am=dt(r.AmendmentDate),
            d=[code('disc',v) for v in disc],g=[code('grp',v) for v in grp],sg=[code('sub',v) for v in sub],
            pf=flag(r.PermanentFacility),sf=flag(r.SiteFacility),mf=flag(r.MobileFacility),ac=int(clean(r.AdditionalCertificate) or 0),
            su=clean(r.ScopeURL),smp=clean(r.SampleURL),nw=clean(r.IsNew)=='1',src='NABL master')
        if not r.Issue_Date or not to: DQ['Missing validity dates']+=1

# geocode
citypts=defaultdict(list)
for L in labs.values():
    if L['p'] in pin: L['ll_']=pin[L['p']]; L['gp']='pin'; citypts[(L['c'],L['s'])].append(L['ll_'])
for L in labs.values():
    if 'll_' in L: continue
    if L['p'][:3] in pre: L['ll_']=pre[L['p'][:3]]; L['gp']='pin3'
    elif citypts.get((L['c'],L['s'])):
        v=citypts[(L['c'],L['s'])]; L['ll_']=(sum(a for a,b in v)/len(v),sum(b for a,b in v)/len(v)); L['gp']='city'
    elif dicts['state'][L['s']] in st_centroid:
        pt=st_centroid[dicts['state'][L['s']]]; L['ll_']=(pt.y,pt.x); L['gp']='state'
    else: L['ll_']=None; L['gp']='none'
    if L['p'] and L['gp']!='pin': DQ['PIN not found in PIN-coordinate table']+=1
    if L['gp'] in ('state','none'): dq_rows.append((L['id'],'Coordinates only at state level' if L['gp']=='state' else 'No coordinates',''))
for L in labs.values():
    ll=L.pop('ll_'); L['la'],L['lo']=(round(ll[0],4),round(ll[1],4)) if ll else (None,None)

# Centralized list (integrated labs / regulator recognitions)
REG=['FSSAI','EIC','APEDA','TEA BOARD','SPICE BOARD','IOPEPC','CDB','Shefexil']
c=pd.read_excel(UP+'Centralized_list.xlsx',dtype=str)
wb=load_workbook(UP+'Centralized_list.xlsx'); ws=wb.active
colour={}
for row in ws.iter_rows(min_row=2):
    rgb=row[2].font.color.rgb if row[2].font and row[2].font.color and isinstance(row[2].font.color.rgb,str) else ''
    colour[clean(row[1].value).upper()]={'FFFF0000':'red','FF0070C0':'blue'}.get(rgb,'')
def norm_state(s):
    s=clean(s).lower().replace('\t','')
    M={'maharastha':'Maharashtra','maharahtra':'Maharashtra','karantaka':'Karnataka','karela':'Kerala','andra pradesh':'Andhra Pradesh','uttrakhand':'Uttarakhand',
       'rajsthan':'Rajasthan','rajesthan':'Rajasthan','uttra pardesh':'Uttar Pradesh','uttra pradesh':'Uttar Pradesh','mp':'Madhya Pradesh','bangalore':'Karnataka','bengaluru':'Karnataka',
       'howrah':'West Bengal','hyderabad':'Telangana','agartala':'Tripura','pune':'Maharashtra','thane':'Maharashtra','visakhapatnam':'Andhra Pradesh'}
    if s in M: return M[s]
    for k in st_centroid:
        if k.lower()==s: return k
    return ''
integrated=0; orphan=0; cq=Counter()
for _,r in c.iterrows():
    lid=clean(r['LAB ID']).upper()
    regs=[k for k in REG if clean(r[k]).lower()=='yes']
    cyc=clean(r['Accreditation Cycle ']); ext=clean(r['Extended Validity']); cert=clean(r['Certificate No. ']); note=clean(r['Last update on 15.09.2026'])
    raw_state=clean(r['State']); ns=norm_state(raw_state)
    if raw_state and ns and ns.lower()!=raw_state.lower(): cq['State spelling/format normalised']+=1
    if raw_state and not ns: cq['State value not a state (person name / country)']+=1
    info=dict(regs=regs,cycle=cyc,ext=ext,cert=cert,flag=colour.get(lid,''),note=note if 'Blue:' not in note else '',src='Centralized list (15.09.2026)')
    if lid in labs:
        labs[lid]['ig']=info; integrated+=1
        if cert and labs[lid]['cn'] and cert.split(' ')[0]!=labs[lid]['cn']: cq['Certificate no. differs from NABL master']+=1
    else:
        orphan+=1; cq['Integrated lab not found in NABL master (added as partial record)']+=1
        name=clean(r['Laboratory Name']); city=name.split(',')[-1].strip() if ',' in name else ''
        st=ns or ''
        pt=st_centroid.get(st)
        labs[lid]=dict(id=lid,n=name,t='T',cp='',em=clean(r['Email ']),mo=clean(r['Mobile']).split('.')[0],ad='',c=code('city',city),s=code('state',st),z='',sv='',ll='',p='',
            cn=cert,fr='',to='',am='',d=[],g=[],sg=[],pf=False,sf=False,mf=False,ac=0,su='',smp='',nw=False,src='Centralized list only',
            la=round(pt.y,4) if pt else None,lo=round(pt.x,4) if pt else None,gp='state' if pt else 'none',ig=info)
        dq_rows.append((lid,'Integrated lab not in NABL master',cert))
        if cyc:
            m=re.findall(r'(\d{2})\.(\d{2})\.(\d{4})',cyc)
            if len(m)==2: labs[lid]['fr']=f'{m[0][2]}-{m[0][1]}-{m[0][0]}'; labs[lid]['to']=f'{m[1][2]}-{m[1][1]}-{m[1][0]}'
    cq[f'Yes/YES/yes variants normalised']+=sum(1 for k in REG if clean(r[k]) in ('YES','yes'))
for k,v in cq.items(): DQ['[Centralized] '+k]+=v
DQ['Validity end date before 28-09-2026']=sum(1 for L in labs.values() if L['to'] and L['to']<TODAY.isoformat())

out=dict(meta=dict(generated=TODAY.isoformat(),master_rows=sum(len(v) for v in x.values()),labs=len(labs),integrated=integrated+orphan,orphans=orphan),
         dict=dicts,labs=list(labs.values()),dq=dict(DQ),dqrows=dq_rows[:4000])
json.dump(out,open('/home/claude/flab/labs.json','w'),separators=(',',':'),ensure_ascii=False)
print(json.dumps(out['meta'],indent=1)); print(json.dumps(dict(DQ),indent=1))
print(Counter(L['gp'] for L in labs.values())); print(len(dicts['grp']),len(dicts['sub']),len(dicts['city']))
