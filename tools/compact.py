import json
D=json.load(open('/home/claude/flab/labs.json'))
T={'NABL master':0,'Centralized list only':1}; G={'pin':0,'pin3':1,'city':2,'state':3,'none':4}
rows=[]
for L in D['labs']:
    fl=(L['pf']<<0)|(L['sf']<<1)|(L['mf']<<2)|(L['nw']<<3)
    ig=L.get('ig'); ig=[ig['regs'],ig['cycle'],ig['ext'],ig['cert'],ig['flag'],ig['note']] if ig else 0
    rows.append([L['id'],L['n'],L['t'],L['cp'],L['em'],L['mo'],L['ad'],L['c'],L['s'],L['z'],L['sv'],L['ll'],L['p'],L['cn'],L['fr'],L['to'],L['am'],
      L['d'],L['g'],L['sg'],fl,L['ac'],L['su'],L['smp'],T[L['src']],L['la'],L['lo'],G[L['gp']],ig])
out=dict(meta=D['meta'],dict=D['dict'],rows=rows,dq=D['dq'],dqrows=D['dqrows'])
s=json.dumps(out,separators=(',',':'),ensure_ascii=False).replace('</','<\\/')
open('/home/claude/flab/data.js','w').write('window.NABL_DATA='+s+';')
open('/home/claude/flab/states.js','w').write('window.IN_STATES='+open('/home/claude/flab/states.json').read()+';')
print(len(s))
