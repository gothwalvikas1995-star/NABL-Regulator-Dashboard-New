/* ===== India map: state boundaries (inline GeoJSON) + screen-space marker clustering, no tile server ===== */
function makeMap(host,opts){
  opts=opts||{};
  host.innerHTML='';
  const W=Math.max(host.clientWidth,300),H=Math.max(host.clientHeight,320);
  const svg=d3.select(host).append('svg').attr('class','map').attr('viewBox',`0 0 ${W} ${H}`).attr('role','img').attr('aria-label',opts.label||'Map of India with laboratory locations');
  const proj=d3.geoMercator().fitExtent([[10,10],[W-10,H-10]],window.IN_STATES);
  const path=d3.geoPath(proj);
  const gStates=svg.append('g'), gRad=svg.append('g'), gPts=svg.append('g');
  let pts=[],mode='markers',sel=null,origin=null,radius=null,stateCounts={},T=d3.zoomIdentity,activeState=null;
  const st=gStates.selectAll('path').data(window.IN_STATES.features).join('path').attr('class','st').attr('d',path)
    .attr('tabindex',opts.stateClick?0:null).attr('aria-label',d=>d.properties.name)
    .on('click',(e,d)=>{opts.stateClick&&opts.stateClick(d.properties.name);})
    .on('keydown',(e,d)=>{if(e.key==='Enter'&&opts.stateClick)opts.stateClick(d.properties.name);});
  st.append('title').text(d=>d.properties.name);
  const zoom=d3.zoom().scaleExtent([1,40]).on('zoom',e=>{T=e.transform;gStates.attr('transform',T);draw();});
  svg.call(zoom).on('dblclick.zoom',null);
  const pop=document.createElement('div');pop.className='popup';pop.hidden=true;host.appendChild(pop);
  function hidePop(){pop.hidden=true;}
  function showPop(x,y,html){pop.innerHTML='<button class="x" aria-label="Close">×</button>'+html;pop.hidden=false;
    const px=Math.min(Math.max(8,x+12),W-300),py=Math.min(Math.max(8,y-20),H-200);pop.style.left=px+'px';pop.style.top=py+'px';
    pop.querySelector('.x').onclick=hidePop; opts.onPopup&&opts.onPopup(pop);}
  function draw(){
    gPts.selectAll('*').remove(); gRad.selectAll('*').remove();
    const k=T.k;
    if(mode==='density'){
      const max=Math.max(1,...Object.values(stateCounts));
      st.style('fill',d=>{const c=stateCounts[d.properties.name]||0;return c?d3.interpolateRgb('#DDEEF5','#2D5467')(Math.sqrt(c/max)):null;});
      st.select('title').text(d=>d.properties.name+': '+(stateCounts[d.properties.name]||0)+' labs');
      // labels
      for(const f of window.IN_STATES.features){const c=stateCounts[f.properties.name];if(!c)continue;const [x,y]=T.apply(path.centroid(f));
        if(isNaN(x))continue; gPts.append('text').attr('x',x).attr('y',y).attr('text-anchor','middle').attr('font-size',11).attr('font-weight',700)
          .attr('fill',c/max>.3?'#fff':'#2D5467').attr('pointer-events','none').text(c);}
      return;
    }
    st.style('fill',null).classed('on',d=>d.properties.name===activeState);
    if(origin){const [ox,oy]=T.apply(proj([origin.lo,origin.la]));
      if(radius){const [,oy2]=T.apply(proj([origin.lo,origin.la+radius/111]));gRad.append('circle').attr('cx',ox).attr('cy',oy).attr('r',Math.abs(oy-oy2)).attr('fill','rgba(43,102,129,.08)').attr('stroke','#2B6681').attr('stroke-dasharray','4 3');}
      gRad.append('circle').attr('cx',ox).attr('cy',oy).attr('r',6).attr('fill','#fff').attr('stroke','#2D5467').attr('stroke-width',3);}
    const cell=38, grid=new Map();
    for(const p of pts){ if(p.la==null)continue; const [x,y]=T.apply(proj([p.lo,p.la])); if(x<-20||y<-20||x>W+20||y>H+20)continue;
      const key=Math.floor(x/cell)+':'+Math.floor(y/cell); let c=grid.get(key); if(!c){c={x:0,y:0,n:0,items:[],types:{}};grid.set(key,c);} c.x+=x;c.y+=y;c.n++;c.items.push(p);c.types[p.t]=(c.types[p.t]||0)+1; }
    const clusters=[...grid.values()].map(c=>({...c,x:c.x/c.n,y:c.y/c.n}));
    for(const c of clusters){
      const g=gPts.append('g').attr('transform',`translate(${c.x},${c.y})`).style('cursor','pointer').attr('tabindex',0).attr('role','button');
      if(c.n===1){const p=c.items[0];const isSel=sel===p.id;
        g.append('circle').attr('r',isSel?9:6).attr('fill',isSel?'#048FBD':'#2B6681').attr('stroke','#fff').attr('stroke-width',isSel?3:1.5);
        g.attr('aria-label',p.n);
        g.on('click',e=>{e.stopPropagation();opts.pointClick&&opts.pointClick(p,c.x,c.y,showPop);});
      } else {
        const r=Math.min(26,9+Math.sqrt(c.n)*1.6);
        const dom=Object.entries(c.types).sort((a,b)=>b[1]-a[1])[0][0];
        const hasSel=sel&&c.items.some(p=>p.id===sel);
        g.append('circle').attr('r',r).attr('fill',hasSel?'#048FBD':'#2B6681').attr('fill-opacity',.9).attr('stroke','#fff').attr('stroke-width',hasSel?4:2);
        g.append('text').attr('text-anchor','middle').attr('dy','.35em').attr('fill','#fff').attr('font-size',11).attr('font-weight',700).attr('pointer-events','none').text(c.n>999?(c.n/1000).toFixed(1)+'k':c.n);
        g.attr('aria-label',c.n+' laboratories here — zoom in');
        g.on('click',e=>{e.stopPropagation(); if(T.k>=30){opts.clusterList&&opts.clusterList(c.items,c.x,c.y,showPop);return;}
          const nk=Math.min(40,T.k*3); const [gx,gy]=T.invert([c.x,c.y]);
          svg.transition().duration(450).call(zoom.transform,d3.zoomIdentity.translate(W/2-gx*nk,H/2-gy*nk).scale(nk));});
      }
      g.on('keydown',function(e){if(e.key==='Enter')this.dispatchEvent(new MouseEvent('click'));});
    }
    opts.onDraw&&opts.onDraw(clusters.length);
  }
  svg.on('click',()=>hidePop());
  const api={
    setPoints(p){pts=p;draw();return api;},
    setMode(m){mode=m;draw();return api;},
    setCounts(c){stateCounts=c;draw();return api;},
    setOrigin(o,r){origin=o;radius=r;draw();return api;},
    select(id){sel=id;draw();return api;},
    setActiveState(s){activeState=s;draw();return api;},
    reset(){svg.transition().duration(300).call(zoom.transform,d3.zoomIdentity);},
    zoomBy(f){svg.transition().duration(250).call(zoom.scaleBy,f);},
    focus(la,lo,k){const [x,y]=proj([lo,la]);svg.transition().duration(500).call(zoom.transform,d3.zoomIdentity.translate(W/2-x*k,H/2-y*k).scale(k));},
    focusState(name){const f=window.IN_STATES.features.find(f=>f.properties.name===name);if(!f)return;const [[x0,y0],[x1,y1]]=path.bounds(f);
      const k=Math.min(40,.85/Math.max((x1-x0)/W,(y1-y0)/H));svg.transition().duration(500).call(zoom.transform,d3.zoomIdentity.translate(W/2-k*(x0+x1)/2,H/2-k*(y0+y1)/2).scale(k));},
    proj,path
  };
  return api;
}
function drawHeroCanvas(cv){
  const dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth||500,h=cv.clientHeight||520;
  cv.width=w*dpr;cv.height=h*dpr;const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);
  const proj=d3.geoMercator().fitExtent([[6,6],[w-6,h-6]],window.IN_STATES);const path=d3.geoPath(proj,ctx);
  ctx.fillStyle='rgba(255,255,255,.05)';ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=.7;
  for(const f of window.IN_STATES.features){ctx.beginPath();path(f);ctx.fill();ctx.stroke();}
  const order=['T','C','M','P','R'];
  const col={M:'#FF8FB0',T:'#7FC3FF',C:'#C1AEFF',P:'#FFC766',R:'#6FE0CC'};
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pts=LABS.filter(l=>l.la!=null).map(l=>{const [x,y]=proj([l.lo,l.la]);return {x:x+(hash(l.id)%7-3)*.5,y:y+((hash(l.id)>>4)%7-3)*.5,t:l.t};});
  pts.sort((a,b)=>order.indexOf(a.t)-order.indexOf(b.t));
  let i=0;const step=()=>{const end=reduce?pts.length:Math.min(pts.length,i+700);
    for(;i<end;i++){const p=pts[i];ctx.fillStyle=col[p.t];ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(p.x,p.y,1.3,0,6.283);ctx.fill();}
    ctx.globalAlpha=1; if(i<pts.length) requestAnimationFrame(step);};
  step();
}
