import sys, hashlib, json
local = '--local' in sys.argv
import os
SRC='src/' if os.path.isdir('src') else ''
r=lambda f:open(SRC+f,encoding='utf-8').read()
if local:
    libs='<script src="vend/d3-7.9.0/dist/d3.min.js"></script><script src="vend/xlsx-0.18.5/dist/xlsx.full.min.js"></script>'
else:
    libs=('<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>'
          '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>')
PW='Nabl#Demo2026'
def acct(email,name,role,reg=None):
    salt=hashlib.sha256(('nabl-salt-'+email).encode()).hexdigest()[:16]
    return {'email':email,'name':name,'role':role,'reg':reg,'salt':salt,'hash':hashlib.sha256((salt+PW).encode()).hexdigest()}
regs=[('FSSAI','fssai'),('EIC','eic'),('APEDA','apeda'),('TEA BOARD','teaboard'),('SPICE BOARD','spiceboard'),('IOPEPC','iopepc'),('CDB','cdb'),('Shefexil','shefexil')]
accts=[acct('admin@nabl.demo','NABL Admin (demo)','admin'),acct('board@nabl.demo','NABL Board member (demo)','board')]+[acct(f'{slug}@regulator.demo',f'{reg} officer (demo)','regulator',reg) for reg,slug in regs]
open(SRC+'accounts.js','w').write('window.NABL_ACCOUNTS='+json.dumps(accts)+';')
js=''.join(f'<script>\n{r(f)}\n</script>\n' for f in ['states.js','data.js','logo.js','accounts.js','core.js','map.js','views.js','portal.js','dash_api.js','dash_ui.js','ui2.js','app.js'])
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Find a Lab Near You — NABL</title>
<meta name="description" content="Search NABL accredited medical, testing and calibration laboratories, proficiency testing providers and reference material producers across India with scope-aware matching.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{r('app.css')}
{r('ui2.css')}
.mobonly{{display:none}}@media (max-width:760px){{.mobonly{{display:block}}}}
</style>
{libs}
</head><body><div id="app"><p style="padding:40px;font-family:system-ui">Loading laboratory directory…</p></div>
{js}</body></html>'''
out = 'test.html' if local else 'index.html'
open(out,'w',encoding='utf-8').write(html); print(out, len(html)//1024,'KB')
