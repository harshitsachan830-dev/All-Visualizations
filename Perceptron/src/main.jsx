import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{Upload,Play,Pause,RotateCcw,StepForward,StepBack,ChevronDown,FileSpreadsheet,Check,AlertTriangle,Sparkles,SlidersHorizontal,Database,BrainCircuit,ChartNoAxesCombined,BookOpen,Download,X,ChevronRight,Layers3,MousePointer2,GitCompareArrows,Share2,Sun,Moon,Gauge,Camera,GripVertical,ZoomIn,ZoomOut,RotateCw}from'lucide-react';
import'./styles.css';

/* ─── seed datasets ─────────────────────────────────────────────── */
const seed=[[-2.8,-1.6,0],[-2.2,-.8,0],[-1.4,-1.9,0],[-.8,-.9,0],[-1.7,.1,0],[-.5,-.2,0],[.3,.5,1],[.9,1.1,1],[1.6,.6,1],[1.8,1.7,1],[2.5,1.2,1],[2.1,2.6,1]].map(([x,y,label],id)=>({id,x,y,label}));
const noisy=[[-2.5,-1.4,0],[-1.9,.5,0],[-.8,-.4,0],[-.2,.3,0],[.1,-.4,0],[.4,.4,1],[.8,.1,1],[1.4,.8,1],[2.2,1.3,1],[1.5,-.3,1],[-.1,.8,1]].map(([x,y,label],id)=>({id,x,y,label}));

/* ─── helpers ───────────────────────────────────────────────────── */
const absent=v=>v==null||!String(v).trim()||['na','n/a','null','nan','unknown','not available'].includes(String(v).trim().toLowerCase());
const numericValue=v=>{
  if(absent(v))return null;
  const match=String(v).trim().replace(/,/g,'').match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*[a-z%]+)?$/i);
  if(!match)return null;
  const value=Number(match[1]);
  return Number.isFinite(value)?value:null;
};
const classKey=(header,value)=>{
  const key=String(value).trim().toLowerCase();
  if(/gender|sex/i.test(header)){
    if(['m','male','man','boy'].includes(key))return'male';
    if(['f','female','woman','girl'].includes(key))return'female';
  }
  if(['yes','y','true','t','1'].includes(key))return'yes';
  if(['no','n','false','0'].includes(key))return'no';
  return key;
};
function csv(t){let rows=[],row=[],v='',q=false;for(let i=0;i<t.length;i++){let c=t[i],n=t[i+1];if(c==='"'&&q&&n==='"'){v+='"';i++}else if(c==='"')q=!q;else if(c===','&&!q){row.push(v.trim());v=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(v.trim());if(row.some(Boolean))rows.push(row);row=[];v=''}else v+=c}row.push(v.trim());if(row.some(Boolean))rows.push(row);return rows}

/* ─── perceptron ────────────────────────────────────────────────── */
function fit(data,rate,epochs){
  let w=[0,0],b=0,states=[],step=0,converged=false;
  for(let e=0;e<epochs;e++){
    let errors=0;
    data.forEach((p,sampleIndex)=>{
      let score=w[0]*p.x+w[1]*p.y+b,prediction=score>=0?1:0,error=p.label-prediction,before=[...w,b];
      if(error){w[0]+=rate*error*p.x;w[1]+=rate*error*p.y;b+=rate*error;errors++}
      states.push({step:++step,epoch:e,sampleIndex,point:p,score,prediction,error,before,weights:[...w],bias:b,errors});
    });
    if(!errors){converged=true;break}
  }
  return{states,converged};
}

function metrics(data,s){
  let tp=0,tn=0,fp=0,fn=0;
  data.forEach(p=>{let y=s.weights[0]*p.x+s.weights[1]*p.y+s.bias>=0?1:0;if(p.label&&y)tp++;else if(!p.label&&!y)tn++;else if(!p.label&&y)fp++;else fn++});
  let precision=tp/(tp+fp)||0,recall=tp/(tp+fn)||0;
  return{tp,tn,fp,fn,accuracy:(tp+tn)/data.length,precision,recall,f1:2*precision*recall/(precision+recall)||0};
}

/* ─── Line mini-chart ───────────────────────────────────────────── */
function Line({states,type,color,label}){
  const a=states.map(s=>type==='err'?s.errors:type==='acc'?(()=>{let d=states[0]?[...Array(states[0].weights.length)].fill(0):[];return s.errors})():type==='w1'?s.weights[0]:type==='w2'?s.weights[1]:s.bias);
  const m=Math.max(1,...a.map(Math.abs));
  const p=a.map((v,i)=>`${i/Math.max(1,a.length-1)*260},${48-v/m*35}`).join(' ');
  return(
    <svg viewBox="0 0 260 95" className="mini-svg">
      <line x1="0" y1="48" x2="260" y2="48" className="grid"/>
      <polyline points={p} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Accuracy mini-chart (0–1 range) ──────────────────────────── */
function AccLine({states,data}){
  const vals=states.map(s=>{
    let tp=0,tn=0;
    data.forEach(p=>{let y=s.weights[0]*p.x+s.weights[1]*p.y+s.bias>=0?1:0;if(p.label===y)y===1?tp++:tn++;});
    return(tp+tn)/data.length;
  });
  const p=vals.map((v,i)=>`${i/Math.max(1,vals.length-1)*260},${85-v*75}`).join(' ');
  return(
    <svg viewBox="0 0 260 95" className="mini-svg">
      <line x1="0" y1="10" x2="260" y2="10" className="grid"/>
      <line x1="0" y1="47" x2="260" y2="47" className="grid"/>
      <line x1="0" y1="85" x2="260" y2="85" className="grid"/>
      <polyline points={p} fill="none" stroke="#27a77b" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Class balance bar ─────────────────────────────────────────── */
function ClassBalance({data,names}){
  const c0=data.filter(p=>!p.label).length,c1=data.filter(p=>p.label).length,t=data.length;
  const p0=t?Math.round(c0/t*100):0,p1=100-p0;
  return(
    <div className="class-balance">
      <div className="balance-label"><span><i className="dot coral"/>Class 0 · {c0} ({p0}%)</span><span><i className="dot indigo"/>Class 1 · {c1} ({p1}%)</span></div>
      <div className="balance-bar">
        <div className="bal-seg coral-seg" style={{width:`${p0}%`}}/>
        <div className="bal-seg indigo-seg" style={{width:`${p1}%`}}/>
      </div>
    </div>
  );
}

/* ─── Boundary snapshots ────────────────────────────────────────── */
function Snapshots({model,data,names,onJump}){
  const total=model.states.length-1;
  const picks=[0,Math.floor(total*0.1),Math.floor(total*0.25),Math.floor(total*0.5),total].filter((v,i,a)=>a.indexOf(v)===i);
  const W=180,H=110,P=18,min=-3.5,max=3.5;
  const pos=v=>P+(v-min)/(max-min)*(W-P*2);
  const yy=v=>H-pos(v)+P*2;
  return(
    <div className="snapshots-row">
      {picks.map(idx=>{
        const s=model.states[idx]||model.states[model.states.length-1];
        const w=s.weights,b=s.bias;
        const y1=-(w[0]*min+b)/(w[1]||.0001);
        const y2=-(w[0]*max+b)/(w[1]||.0001);
        const m=metrics(data,s);
        return(
          <button key={idx} className="snapshot-card" onClick={()=>onJump(idx)} title={`Jump to step ${s.step}`}>
            <svg viewBox={`0 0 ${W} ${H}`} className="snap-svg">
              <rect x={P} y={P} width={W-P*2} height={H-P*2} rx="6" fill="var(--snap-bg)"/>
              {data.map(p=><circle key={p.id} cx={pos(p.x)} cy={yy(p.y)} r="3" fill={p.label?'#5b5bd6':'#f07167'} opacity=".7"/>)}
              <line x1={pos(min)} y1={yy(y1)} x2={pos(max)} y2={yy(y2)} stroke="#3d3aa8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="snap-label">Step {s.step}</span>
            <span className="snap-acc">{Math.round(m.accuracy*100)}%</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── 3D Decision Plane (Interactive perspective projection) ─────── */
function DecisionPlane3D({state,data,names=['Feature 1','Feature 2'],pred,onSelectPoint,height=340}){
  const canvasRef=useRef(null);
  const dragRef=useRef(null);
  const [dragging,setDragging]=useState(false);
  const [rot,setRot]=useState({pitch:0.42,yaw:0.58});
  const [zoom,setZoom]=useState(1.0);
  const [autoRotate,setAutoRotate]=useState(false);
  const [hovered,setHovered]=useState(null);
  const [canvasSize,setCanvasSize]=useState({width:0,height});
  const projectedPointsRef=useRef([]);

  // Auto-rotation animation loop
  useEffect(()=>{
    if(!autoRotate)return;
    let reqId;
    const stepAnim=()=>{
      setRot(r=>({...r,yaw:(r.yaw+0.007)%(Math.PI*2)}));
      reqId=requestAnimationFrame(stepAnim);
    };
    reqId=requestAnimationFrame(stepAnim);
    return()=>cancelAnimationFrame(reqId);
  },[autoRotate]);

  // Non-passive wheel listener for smooth zooming without scrolling the page
  useEffect(()=>{
    const cv=canvasRef.current;
    if(!cv)return;
    const handleWheel=e=>{
      e.preventDefault();
      const factor=e.deltaY>0?0.92:1.08;
      setZoom(z=>Math.max(0.55,Math.min(2.4,z*factor)));
    };
    cv.addEventListener('wheel',handleWheel,{passive:false});
    return()=>cv.removeEventListener('wheel',handleWheel);
  },[]);

  useEffect(()=>{
    const cv=canvasRef.current;
    if(!cv)return;
    const observer=new ResizeObserver(([entry])=>{
      setCanvasSize({width:entry.contentRect.width,height:entry.contentRect.height});
    });
    observer.observe(cv);
    return()=>observer.disconnect();
  },[]);

  const draw=useCallback((rx,ry,zFactor)=>{
    const cv=canvasRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');
    const dpr=window.devicePixelRatio||1;
    const rect=cv.getBoundingClientRect();
    const W=canvasSize.width||rect.width||560;
    const H=canvasSize.height||height;

    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){
      cv.width=Math.round(W*dpr);
      cv.height=Math.round(H*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);

    const cx=W/2,cy=H*0.53;
    const baseScale=Math.min(W/7,H/5.4)*zFactor;
    // World coordinates: X = feat1, Y = score (vertical), Z = feat2 (depth)
    const project=([X,Y,Z])=>{
      const cosY=Math.cos(ry),sinY=Math.sin(ry);
      const x1=X*cosY-Z*sinY,z1=X*sinY+Z*cosY;
      const cosX=Math.cos(rx),sinX=Math.sin(rx);
      const y1=Y*cosX-z1*sinX,z2=Y*sinX+z1*cosX;
      const perspective=8/Math.max(4,12+z2);
      const pixelScale=baseScale*perspective;
      return[cx+x1*pixelScale,cy-y1*pixelScale,perspective,z2];
    };

    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    const w=state.weights,b=state.bias;

    const backdrop=ctx.createLinearGradient(0,0,0,H);
    backdrop.addColorStop(0,isDark?'#202039':'#fafaff');
    backdrop.addColorStop(1,isDark?'#19182b':'#f1f0fb');
    ctx.fillStyle=backdrop;
    ctx.fillRect(0,0,W,H);

    // 1. Grid plane on the floor Y = 0 (decision threshold plane)
    ctx.save();
    ctx.lineWidth=0.75;
    ctx.strokeStyle=isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)';
    for(let g=-3;g<=3;g+=0.75){
      const [ax,ay]=project([g,0,-3]),[bx,by]=project([g,0,3]);
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
      const [cx2,cy2]=project([-3,0,g]),[dx,dy]=project([3,0,g]);
      ctx.beginPath();ctx.moveTo(cx2,cy2);ctx.lineTo(dx,dy);ctx.stroke();
    }
    ctx.restore();

    // 2. Decision Surface mesh: Y = w0*X + w1*Z + b
    const steps=16,span=6;
    let scoreRange=2.4;
    const includeScore=(x,z)=>{scoreRange=Math.max(scoreRange,Math.abs(w[0]*x+w[1]*z+b))};
    [[-3,-3],[-3,3],[3,-3],[3,3]].forEach(([x,z])=>includeScore(x,z));
    data.forEach(p=>includeScore(p.x,p.y));
    if(pred)includeScore(pred.x,pred.y);
    const scoreScale=2.4/scoreRange;
    const faces=[];
    for(let i=0;i<steps;i++){
      for(let j=0;j<steps;j++){
        const x0=-3+i*span/steps,x1=-3+(i+1)*span/steps;
        const z0=-3+j*span/steps,z1=-3+(j+1)*span/steps;
        const y00=(w[0]*x0+w[1]*z0+b)*scoreScale;
        const y10=(w[0]*x1+w[1]*z0+b)*scoreScale;
        const y11=(w[0]*x1+w[1]*z1+b)*scoreScale;
        const y01=(w[0]*x0+w[1]*z1+b)*scoreScale;
        const p0=project([x0,y00,z0]),p1=project([x1,y10,z0]),p2=project([x1,y11,z1]),p3=project([x0,y01,z1]);
        const avgY=(y00+y10+y11+y01)/4;
        const depth=(p0[3]+p1[3]+p2[3]+p3[3])/4;
        faces.push({p0,p1,p2,p3,avgY,depth});
      }
    }
    faces.sort((a,b)=>b.depth-a.depth);
    faces.forEach(({p0,p1,p2,p3,avgY})=>{
        ctx.beginPath();
        ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.lineTo(p3[0],p3[1]);
        ctx.closePath();

        if(avgY>=0){
          const intensity=Math.min(0.25,0.1+avgY*0.06);
          ctx.fillStyle=`rgba(91,91,214,${intensity})`;
        }else{
          const intensity=Math.min(0.25,0.1+Math.abs(avgY)*0.06);
          ctx.fillStyle=`rgba(240,113,103,${intensity})`;
        }
        ctx.fill();
        ctx.strokeStyle=isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)';
        ctx.lineWidth=0.5;
        ctx.stroke();
    });

    // 3. Highlight decision boundary intersection line where plane cuts Y = 0 floor
    const boundary=[];
    const addBoundaryPoint=(x,z)=>{
      if(x>=-3&&x<=3&&z>=-3&&z<=3&&!boundary.some(p=>Math.hypot(p[0]-x,p[1]-z)<1e-6))boundary.push([x,z]);
    };
    if(Math.abs(w[1])>1e-8){
      [-3,3].forEach(x=>addBoundaryPoint(x,-(w[0]*x+b)/w[1]));
    }
    if(Math.abs(w[0])>1e-8){
      [-3,3].forEach(z=>addBoundaryPoint(-(w[1]*z+b)/w[0],z));
    }
    if(boundary.length>=2){
      const [ax,ay]=project([boundary[0][0],0,boundary[0][1]]);
      const [bx,by]=project([boundary[1][0],0,boundary[1][1]]);
      ctx.save();
      ctx.strokeStyle='#4f46e5';ctx.lineWidth=2.8;
      ctx.shadowColor='#6366f1';ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
      ctx.restore();
    }

    // 4. 3D Coordinate Axes
    const axes=[
      {from:[0,0,0],to:[3.3,0,0],label:`${names[0]||'X₁'}`,color:'#f07167'},
      {from:[0,0,0],to:[0,0,3.3],label:`${names[1]||'X₂'}`,color:'#5b5bd6'},
      {from:[0,-2.4,0],to:[0,2.5,0],label:'Score (scaled)',color:'#24a57a'}
    ];
    axes.forEach(({from,to,label,color})=>{
      const [fx,fy]=project(from),[tx,ty]=project(to);
      ctx.strokeStyle=color;ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.fillStyle=color;ctx.font='700 11px Manrope,sans-serif';
      ctx.fillText(label,tx+6,ty+3);
    });

    const [ox,oy]=project([0,0,0]);
    ctx.fillStyle=isDark?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.45)';
    ctx.font='600 10px DM Mono,monospace';
    ctx.fillText('z=0 (Threshold)',ox+6,oy-6);

    // 5. Data Points with Drop-line stems and shadows
    const projected=[];
    data.forEach(p=>{
      const rawScore=w[0]*p.x+w[1]*p.y+b;
      const scoreY=rawScore*scoreScale;
      const [fx,fy]=project([p.x,0,p.y]);
      const [px,py,sc,depth]=project([p.x,scoreY,p.y]);
      const predClass=rawScore>=0?1:0;
      const isError=predClass!==p.label;
      const r=Math.max(3.5,6*sc);

      // Vertical stem
      ctx.save();
      ctx.setLineDash([2,3]);
      ctx.lineWidth=1.2;
      ctx.strokeStyle=p.label?'rgba(91,91,214,0.5)':'rgba(240,113,103,0.5)';
      ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(px,py);ctx.stroke();

      // Floor shadow
      ctx.beginPath();ctx.arc(fx,fy,Math.max(2,3*sc),0,Math.PI*2);
      ctx.fillStyle=isDark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.12)';
      ctx.fill();
      ctx.restore();

      // Point sphere
      ctx.save();
      ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);
      ctx.fillStyle=p.label?'#5b5bd6':'#f07167';
      ctx.shadowColor=p.label?'rgba(91,91,214,0.5)':'rgba(240,113,103,0.5)';
      ctx.shadowBlur=6;
      ctx.fill();

      if(isError){
        ctx.lineWidth=2;ctx.strokeStyle='#e67e22';
        ctx.beginPath();ctx.arc(px,py,r+3,0,Math.PI*2);ctx.stroke();
      }

      if(pred&&Math.abs(pred.x-p.x)<0.08&&Math.abs(pred.y-p.y)<0.08){
        ctx.lineWidth=2.5;ctx.strokeStyle='#06b6d4';
        ctx.beginPath();ctx.arc(px,py,r+4,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();

      projected.push({id:p.id,point:p,screenX:px,screenY:py,radius:r,score:rawScore,predClass,isError,depth});
    });
    projectedPointsRef.current=projected;

    // 6. Draw Prediction Probe Point if defined
    if(pred){
      const probeScore=w[0]*pred.x+w[1]*pred.y+b;
      const scoreY=probeScore*scoreScale;
      const [pfx,pfy]=project([pred.x,0,pred.y]);
      const [ppx,ppy,psc]=project([pred.x,scoreY,pred.y]);

      ctx.save();
      ctx.setLineDash([3,3]);ctx.lineWidth=1.5;ctx.strokeStyle='#06b6d4';
      ctx.beginPath();ctx.moveTo(pfx,pfy);ctx.lineTo(ppx,ppy);ctx.stroke();

      ctx.fillStyle='#06b6d4';ctx.shadowColor='#06b6d4';ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(ppx,ppy,Math.max(5,7*psc),0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();

      ctx.font='700 10px DM Mono,monospace';
      ctx.fillStyle=isDark?'#67e8f9':'#0891b2';
      ctx.fillText(`Probe: ${probeScore.toFixed(2)}`,ppx+8,ppy+16);
      ctx.restore();
    }

    // 7. Formula display in the upper-left corner
    ctx.fillStyle=isDark?'#94a3b8':'#64748b';
    ctx.font='600 11px DM Mono,monospace';
    ctx.fillText(`z = ${w[0]>=0?'+':''}${w[0].toFixed(2)}x₁ ${w[1]>=0?'+':''}${w[1].toFixed(2)}x₂ ${b>=0?'+':''}${b.toFixed(2)}`,14,22);

  },[state,data,names,pred,height,canvasSize]);

  useEffect(()=>{draw(rot.pitch,rot.yaw,zoom)},[draw,rot,zoom]);

  const onPointerDown=e=>{
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current={
      pointerId:e.pointerId,
      startX:e.clientX,
      startY:e.clientY,
      startPitch:rot.pitch,
      startYaw:rot.yaw,
      moved:false
    };
    setDragging(true);
  };

  const onPointerMove=e=>{
    const cv=canvasRef.current;if(!cv)return;
    const rect=cv.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const drag=dragRef.current;

    if(drag){
      const dx=(e.clientX-drag.startX)/95,dy=(e.clientY-drag.startY)/95;
      if(Math.abs(dx)>0.03||Math.abs(dy)>0.03)drag.moved=true;
      const newPitch=Math.max(-0.9,Math.min(1.2,drag.startPitch+dy));
      const newYaw=drag.startYaw+dx;
      setRot({pitch:newPitch,yaw:newYaw});
    }
    const hit=[...projectedPointsRef.current].reverse().find(pt=>Math.hypot(pt.screenX-mx,pt.screenY-my)<=Math.max(12,pt.radius+6));
    setHovered(hit||null);
  };

  const onPointerUp=e=>{
    const drag=dragRef.current;
    if(drag&&drag.pointerId===e.pointerId){
      const rect=e.currentTarget.getBoundingClientRect();
      const mx=e.clientX-rect.left,my=e.clientY-rect.top;
      const hit=[...projectedPointsRef.current].reverse().find(pt=>Math.hypot(pt.screenX-mx,pt.screenY-my)<=Math.max(12,pt.radius+6));
      if(!drag.moved&&hit&&onSelectPoint){
        onSelectPoint({x:hit.point.x,y:hit.point.y});
      }
      dragRef.current=null;
      setDragging(false);
      if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
      setHovered(hit||null);
    }
  };

  const resetView=()=>{
    setRot({pitch:0.42,yaw:0.58});
    setZoom(1.0);
    setAutoRotate(false);
  };

  return(
    <div className="canvas3d-wrap">
      <canvas
        ref={canvasRef}
        height={height}
        className="canvas3d"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={()=>{if(!dragRef.current)setHovered(null)}}
        style={{cursor:dragging?'grabbing':hovered?'pointer':'grab',height:`${height}px`}}
      />
      <div className="canvas3d-toolbar">
        <button
          className={`canvas3d-btn${autoRotate?' active':''}`}
          onClick={()=>setAutoRotate(r=>!r)}
          title="Auto-rotate 3D space"
        >
          <RotateCw size={13} className={autoRotate?'spin-slow':''}/>
          {autoRotate?'Pause':'Auto-rotate'}
        </button>
        <button className="canvas3d-btn" onClick={()=>setZoom(z=>Math.min(2.4,z*1.15))} title="Zoom in">
          <ZoomIn size={13}/>
        </button>
        <button className="canvas3d-btn" onClick={()=>setZoom(z=>Math.max(0.55,z*0.85))} title="Zoom out">
          <ZoomOut size={13}/>
        </button>
        <button className="canvas3d-btn" onClick={resetView} title="Reset camera angle &amp; zoom">
          <RotateCcw size={13}/>Reset
        </button>
      </div>

      {hovered&&(
        <div
          className="canvas3d-tooltip"
          style={{
            left:`${Math.max(10,Math.min((canvasSize.width||560)-150,hovered.screenX))}px`,
            top:`${Math.max(10,Math.min((canvasSize.height||height)-95,hovered.screenY-10))}px`
          }}
        >
          <h4>
            <span>Sample #{hovered.point.id+1}</span>
            <span className={`status-tag ${hovered.isError?'error':'correct'}`}>
              {hovered.isError?'Misclassified':'Correct'}
            </span>
          </h4>
          <p>{names[0]||'X₁'}: {hovered.point.x.toFixed(2)}</p>
          <p>{names[1]||'X₂'}: {hovered.point.y.toFixed(2)}</p>
          <p>Score: <b>{hovered.score.toFixed(3)}</b></p>
          <p>Class: <b>{hovered.point.label}</b> (pred: {hovered.predClass})</p>
          <div className="canvas3d-tooltip-hint">Click point to probe ↗</div>
        </div>
      )}

      <div className="canvas3d-legend">
        <div className="canvas3d-legend-item">
          <span className="canvas3d-legend-dot" style={{background:'#5b5bd6'}}/>
          <span>Class 1</span>
        </div>
        <div className="canvas3d-legend-item">
          <span className="canvas3d-legend-dot" style={{background:'#f07167'}}/>
          <span>Class 0</span>
        </div>
        <div className="canvas3d-legend-item">
          <span className="canvas3d-legend-dot" style={{background:'#06b6d4'}}/>
          <span>Probe</span>
        </div>
        <div className="canvas3d-legend-item">
          <span className="canvas3d-legend-dot" style={{background:'#e67e22'}}/>
          <span>Error</span>
        </div>
      </div>
      <div className="canvas3d-hint">
        <GripVertical size={12}/>Drag to rotate · Scroll to zoom · Click point to probe
      </div>
    </div>
  );
}

/* ─── 2D boundary chart ─────────────────────────────────────────── */
function Chart({data,state,prevState,names,onPoint,pred}){
  const W=680,H=390,P=35,min=-3.5,max=3.5;
  const pos=v=>P+(v-min)/(max-min)*(W-P*2);
  const yy=v=>H-pos(v)+P*2;
  const w=state.weights,b=state.bias;
  const y1=-(w[0]*min+b)/(w[1]||.0001);
  const y2=-(w[0]*max+b)/(w[1]||.0001);
  const [tip,setTip]=useState(null);

  // previous boundary
  let py1=null,py2=null;
  if(prevState){
    const pw=prevState.weights,pb=prevState.bias;
    py1=-(pw[0]*min+pb)/(pw[1]||.0001);
    py2=-(pw[0]*max+pb)/(pw[1]||.0001);
  }

  const click=e=>{
    const r=e.currentTarget.getBoundingClientRect();
    onPoint(min+(e.clientX-r.left)/r.width*(max-min),max-(e.clientY-r.top)/r.height*(max-min));
  };

  return(
    <div className="boundary-wrap">
      <div className="chart-legend">
        <span><i className="dot coral"/>Class 0</span>
        <span><i className="dot indigo"/>Class 1</span>
        <span><i className="line-key"/>Current boundary</span>
        {prevState&&<span><i className="line-key dashed"/>Previous</span>}
      </div>
      <svg className={`boundary-svg${onPoint?' playground-canvas':''}`} viewBox={`0 0 ${W} ${H}`} onClick={onPoint?click:undefined}>
        <defs>
          <linearGradient id="shade" x1="0" x2="1">
            <stop stopColor="#fee2e2" stopOpacity=".65"/>
            <stop offset=".5" stopColor="#fbfafc" stopOpacity=".15"/>
            <stop offset="1" stopColor="#e0e7ff" stopOpacity=".65"/>
          </linearGradient>
        </defs>
        <rect x={P} y={P} width={W-P*2} height={H-P*2} rx="12" fill="url(#shade)"/>
        {[0,1,2,3,4,5,6].map(i=>(
          <g key={i}>
            <line x1={pos(-3+i)} y1={P} x2={pos(-3+i)} y2={H-P} className="grid"/>
            <line x1={P} y1={pos(-3+i)} x2={W-P} y2={pos(-3+i)} className="grid"/>
          </g>
        ))}
        {/* previous boundary dashed */}
        {prevState&&(
          <>
            <line x1={pos(min)} y1={yy(py1)} x2={pos(max)} y2={yy(py2)} stroke="#c4c0f0" strokeWidth="2" strokeDasharray="8 5" strokeLinecap="round" opacity=".7"/>
          </>
        )}
        <line x1={pos(min)} y1={yy(y1)} x2={pos(max)} y2={yy(y2)} className="boundary-shadow"/>
        <line x1={pos(min)} y1={yy(y1)} x2={pos(max)} y2={yy(y2)} className="boundary"/>
        {data.map(p=>{
          const bad=(w[0]*p.x+w[1]*p.y+b>=0?1:0)!==p.label;
          const isCur=p.id===state.point.id;
          return(
            <g key={p.id} onMouseEnter={()=>setTip(p)} onMouseLeave={()=>setTip(null)}>
              <circle cx={pos(p.x)} cy={yy(p.y)} r={isCur?13:8} className={isCur?'pulse':''} fill={p.label?'#5b5bd6':'#f07167'} opacity=".2"/>
              <circle cx={pos(p.x)} cy={yy(p.y)} r="5.8" fill={p.label?'#5b5bd6':'#f07167'} stroke={bad?'#f59e0b':'#fff'} strokeWidth={bad?'3':'1.5'}/>
            </g>
          );
        })}
        {pred&&<circle cx={pos(pred.x)} cy={yy(pred.y)} r="8" fill="#fff" stroke="#23213b" strokeWidth="2"/>}
        <text x={W-65} y={H-10} className="axis-label">{names[0]}</text>
        <text x="10" y="18" className="axis-label">{names[1]}</text>
      </svg>
      {tip&&(
        <div className="tooltip">
          <b>Sample {tip.id+1}</b>
          <span>{names[0]}: {tip.x.toFixed(2)}</span>
          <span>{names[1]}: {tip.y.toFixed(2)}</span>
          <span>Class: {tip.label}</span>
        </div>
      )}
    </div>
  );
}

/* ─── CSV Import modal ──────────────────────────────────────────── */
function Import({close,load}){
  const [file,setFile]=useState(null),[rows,setRows]=useState([]),[method,setMethod]=useState('mean');
  const [x,setX]=useState(''),[y,setY]=useState(''),[target,setTarget]=useState(''),[error,setError]=useState('');
  const h=rows[0]||[],raw=rows.slice(1);
  const numeric=h.map((_,i)=>{
    const values=raw.map(r=>r[i]);
    return values.filter(v=>numericValue(v)!==null).length>=2&&values.every(v=>absent(v)||numericValue(v)!==null);
  });
  const classValues=target?new Set(raw.filter(r=>!absent(r[h.indexOf(target)])).map(r=>classKey(target,r[h.indexOf(target)]))):new Set();
  const binaryTargets=h.map((column,index)=>{
    const values=new Set(raw.filter(r=>!absent(r[index])).map(r=>classKey(column,r[index])));
    return values.size===2;
  });
  const numericColumns=h.filter((_,i)=>numeric[i]);
  const numericCount=column=>numericColumns.indexOf(column);
  const validMapping=numeric[x? h.indexOf(x):-1]&&numeric[y? h.indexOf(y):-1]&&x!==y&&classValues.size===2;
  const miss=raw.flat().filter(absent).length;

  async function read(f){
    setFile(f);setError('');
    try{
      const parsed=csv(await f.text());
      if(parsed.length<3){setRows([]);setError('Use a CSV with a header and at least two data rows.');return}
      const headers=parsed[0],dataRows=parsed.slice(1);
      if(headers.length<3||headers.some(name=>!name)){setRows([]);setError('The CSV needs named columns for two numeric features and a target.');return}
      setRows(parsed);
      const numericIndexes=headers.map((_,i)=>{
        const values=dataRows.map(r=>r[i]);
        return values.filter(v=>numericValue(v)!==null).length>=2&&values.every(v=>absent(v)||numericValue(v)!==null);
      });
      const featureIndexes=numericIndexes.map((isNumeric,i)=>isNumeric?i:-1).filter(i=>i>=0);
      const featureCandidates=featureIndexes.filter(i=>!/(^id$|_id$|\bid\b|index|serial|number)/i.test(headers[i]));
      const chosenFeatures=featureCandidates.length>=2?featureCandidates:featureIndexes;
      setX(headers[chosenFeatures[0]]||'');
      setY(headers[chosenFeatures[1]]||'');
      const candidates=headers.map((column,index)=>{
        const values=new Set(dataRows.filter(r=>!absent(r[index])).map(r=>classKey(column,r[index])));
        return values.size===2?index:-1;
      }).filter(i=>i>=0);
      const preferred=candidates.find(i=>/label|target|class|outcome/i.test(headers[i]))??
        candidates.find(i=>/gender|sex/i.test(headers[i]))??candidates[0];
      setTarget(headers[preferred]||'');
    }catch(cause){
      setRows([]);
      setError(`Could not read this CSV: ${cause instanceof Error?cause.message:'unknown file error'}`);
    }
  }

  function apply(){
    const xi=h.indexOf(x),yi=h.indexOf(y),ti=h.indexOf(target);
    if(xi<0||yi<0||!numeric[xi]||!numeric[yi]||xi===yi){setError('Choose two distinct numeric feature columns.');return}
    if(ti<0||classValues.size!==2){setError(`Target "${target||'column'}" must contain exactly two classes. Choose a binary target such as gender, or prepare a two-class label column.`);return}

    const targetKeys=[...classValues];
    const usableRows=raw.filter(r=>!absent(r[ti]));
    if(usableRows.length<2){setError('The selected target needs at least two rows with class values.');return}
    const imputed=numeric.map((isNumeric,i)=>{
      const values=raw.map(r=>numericValue(r[i])).filter(v=>v!==null);
      if(!values.length)return null;
      if(!isNumeric)return null;
      if(method==='median'){
        values.sort((a,b)=>a-b);
        const mid=Math.floor(values.length/2);
        return values.length%2?values[mid]:(values[mid-1]+values[mid])/2;
      }
      if(method==='mode'){
        const counts=new Map();
        values.forEach(value=>counts.set(value,(counts.get(value)||0)+1));
        return [...counts].sort((a,b)=>b[1]-a[1])[0][0];
      }
      return values.reduce((sum,value)=>sum+value,0)/values.length;
    });
    const categoryModes=h.map((_,i)=>{
      if(numeric[i])return null;
      const counts=new Map();
      raw.map(r=>r[i]).filter(v=>!absent(v)).forEach(value=>{
        const key=String(value).trim();
        counts.set(key,(counts.get(key)||0)+1);
      });
      return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||'Unknown';
    });
    const cleaned=usableRows.map(r=>r.map((value,i)=>{
      if(!absent(value))return numeric[i]?numericValue(value):String(value).trim();
      return numeric[i]?imputed[i]:categoryModes[i];
    }));
    load(cleaned.map((r,id)=>{
      const key=classKey(target,r[ti]);
      return{id,x:r[xi],y:r[yi],label:key===targetKeys[0]?0:1};
    }),[x,y],file.name);
    close();
  }

  return(
    <div className="modal-backdrop">
      <div className="modal">
        <button className="modal-close" onClick={close}><X size={18}/></button>
        <div className="modal-title">
          <span className="icon-orb"><FileSpreadsheet size={21}/></span>
          <div><h2>Bring your own data</h2><p>Choose a binary target and two numeric features.</p></div>
        </div>
        <label className="dropzone">
          <input type="file" accept=".csv,text/csv" onChange={e=>e.target.files[0]&&read(e.target.files[0])}/>
          <Upload size={25}/><b>{file?file.name:'Choose a CSV file'}</b><span>CSV only · quoted fields supported</span>
        </label>
        {rows.length>0&&<>
          <div className="upload-summary">
            <span><Check size={16}/>{raw.length} rows</span>
            <span><Check size={16}/>{h.length} columns</span>
          </div>
          {miss>0&&<div className="impute">
            <div><h3>{miss} missing or non-numeric values found</h3><p>Numeric values are filled with your selected strategy.</p></div>
            <div className="strategy">{['mean','median','mode'].map(m=><button key={m} className={method===m?'selected':''} onClick={()=>setMethod(m)}>{m}</button>)}</div>
          </div>}
          <div className="mapping">
            <label>X feature<select value={x} onChange={e=>{setX(e.target.value);setError('')}}>{numericColumns.map(z=><option key={z}>{z}</option>)}</select></label>
            <label>Y feature<select value={y} onChange={e=>{setY(e.target.value);setError('')}}>{numericColumns.map(z=><option key={z}>{z}</option>)}</select></label>
            <label>Target<select value={target} onChange={e=>{setTarget(e.target.value);setError('')}}><option value="">Select target</option>{h.map((z,i)=><option key={z} value={z}>{z}{binaryTargets[i]?' · 2 classes':''}</option>)}</select></label>
          </div>
          <p className={`mapping-hint${classValues.size===2?' valid':''}`}>
            {classValues.size===2?`Target "${target}" has 2 classes. ${numericCount(x)>=0&&numericCount(y)>=0&&x!==y?'':'Choose two different numeric features.'}`:
              target?`Target "${target}" has ${classValues.size} classes. Choose a target marked “2 classes”.`:'Choose a target marked “2 classes”.'}
          </p>
          <div className="table-preview">
            <table><thead><tr>{h.slice(0,5).map(z=><th key={z}>{z}</th>)}</tr></thead>
            <tbody>{raw.slice(0,4).map((r,i)=><tr key={i}>{r.slice(0,5).map((z,j)=><td key={j}>{absent(z)?<em>missing</em>:z}</td>)}</tr>)}</tbody></table>
          </div>
        </>}
        {error&&<p className="form-error"><AlertTriangle size={15}/>{error}</p>}
        <div className="modal-actions">
          <button className="text-btn" onClick={close}>Cancel</button>
          <button className="primary-button" disabled={!rows.length||!validMapping} onClick={apply}>Use this dataset <ChevronRight size={17}/></button>
        </div>
      </div>
    </div>
  );
}

/* ─── Theory ─────────────────────────────────────────────────────── */
function Theory(){
  return(
    <div className="page-grid theory">
      <section className="card theory-hero">
        <p className="eyebrow">THEORY &amp; NOTES</p>
        <h2>How a Perceptron learns</h2>
        <p>
          The boundary in the visualization is not a guess — it is the set of points where the model score is zero.
          For each sample, the Perceptron computes a signed score, decides which side of the line it belongs to,
          and only moves when that decision is wrong.
        </p>
        <div className="rule">w ← w + η(y − ŷ)x &nbsp; · &nbsp; b ← b + η(y − ŷ)</div>
      </section>

      <section className="card">
        <h3>1. Score</h3>
        <p><code>z = w₁x₁ + w₂x₂ + b</code> gives the model score. Positive values lean toward class 1, negative values toward class 0, and the decision boundary is the line where <code>z = 0</code>.</p>
        <h3>2. Decide</h3>
        <p>The sign of the score decides the prediction. In the app, the current sample pulses, the line is redrawn, and the previous boundary remains as a dashed guide so you can watch the shift.</p>
        <h3>3. Correct</h3>
        <p>If the prediction is wrong, the update rule nudges the weights and bias toward the mislabeled point. This is why the boundary moves only on mistakes, not on every sample.</p>
      </section>

      <section className="card">
        <h3>Convergence theorem</h3>
        <p>
          If the dataset is linearly separable, the Perceptron is guaranteed to find a separating hyperplane in a finite number of updates
          (Rosenblatt, 1962). In this visualizer, that appears as the boundary settling into a stable line and the misclassification count dropping to zero.
        </p>
        <div className="note-warning"><AlertTriangle size={16}/>A single Perceptron cannot learn curved or nonlinear boundaries — that requires multiple layers or a different model class.</div>
      </section>

      <section className="card">
        <h3>Learning rate η</h3>
        <p>
          The learning rate controls how large the correction is on each mistake. A larger η makes the boundary jump more aggressively,
          which can speed learning but also cause oscillation; a smaller η moves the line more gently and often stabilizes more smoothly.
          The comparison table in the app makes this tradeoff visible across multiple values.
        </p>
        <div className="rule small-rule">Typical range: 0.01 – 0.5</div>
      </section>

      <section className="card">
        <h3>Linear separability</h3>
        <p>
          The Perceptron converges only when one straight line can cleanly split the two classes. If the classes overlap, or if the data is not separable,
          the model keeps updating until the epoch limit is reached. Drag points in the Interactive Playground to break that assumption and watch the boundary fail to settle.
        </p>
      </section>
    </div>
  );
}

/* ─── Metric card ────────────────────────────────────────────────── */
function Metric({label,value,sub,tone='purple'}){
  return(
    <div className="metric">
      <span className={`metric-dot ${tone}`}/>
      <div><p>{label}</p><strong>{value}</strong><small>{sub}</small></div>
    </div>
  );
}

/* ─── Share modal ────────────────────────────────────────────────── */
function ShareModal({close,step,rate,epochs}){
  const url=`${location.origin}${location.pathname}#s=${step}&r=${rate}&e=${epochs}`;
  const [copied,setCopied]=useState(false);
  function copy(){navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}
  return(
    <div className="modal-backdrop">
      <div className="modal" style={{width:480}}>
        <button className="modal-close" onClick={close}><X size={18}/></button>
        <div className="modal-title">
          <span className="icon-orb"><Share2 size={21}/></span>
          <div><h2>Share this replay</h2><p>Anyone with this link can open the visualizer at exactly this step.</p></div>
        </div>
        <div className="share-url">{url}</div>
        <div className="modal-actions">
          <button className="text-btn" onClick={close}>Close</button>
          <button className="primary-button" onClick={copy}>{copied?<><Check size={15}/>Copied!</>:<><Share2 size={15}/>Copy link</>}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Export report ──────────────────────────────────────────────── */
function exportReport(data,model,names,rate,epochs){
  const last=model.states[model.states.length-1];
  const m=metrics(data,last);
  const lines=[
    `Perceptron Training Report`,`Generated: ${new Date().toLocaleString()}`,``,
    `Dataset: ${data.length} samples, 2 features (${names.join(', ')})`,
    `Class 0: ${data.filter(p=>!p.label).length} · Class 1: ${data.filter(p=>p.label).length}`,``,
    `Hyperparameters`,`Learning rate: ${rate}`,`Max epochs: ${epochs}`,``,
    `Results`,`Converged: ${model.converged?'Yes':'No (epoch limit reached)'}`,
    `Total steps: ${model.states.length}`,
    `Final weights: w₁=${last.weights[0].toFixed(4)} · w₂=${last.weights[1].toFixed(4)} · b=${last.bias.toFixed(4)}`,``,
    `Metrics`,`Accuracy: ${(m.accuracy*100).toFixed(1)}%`,
    `Precision: ${m.precision.toFixed(3)}`,`Recall: ${m.recall.toFixed(3)}`,`F1: ${m.f1.toFixed(3)}`,
    `TP: ${m.tp} · TN: ${m.tn} · FP: ${m.fp} · FN: ${m.fn}`,``,
    `Per-step accuracy`,
    model.states.map((s,i)=>{const mm=metrics(data,s);return `Step ${s.step} Epoch ${s.epoch+1}: acc=${(mm.accuracy*100).toFixed(0)}% err=${s.errors}`}).join('\n'),
  ];
  const blob=new Blob([lines.join('\n')],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='perceptron-report.txt';a.click();
}

/* ─── App ────────────────────────────────────────────────────────── */
function App(){
  // parse hash for share link
  const hash=Object.fromEntries(location.hash.slice(1).split('&').map(p=>p.split('=')));

  const [data,setData]=useState(seed);
  const [names,setNames]=useState(['Feature 1','Feature 2']);
  const [name,setName]=useState('Linearly separable demo');
  const [rate,setRate]=useState(hash.r?+hash.r:.15);
  const [epochs,setEpochs]=useState(hash.e?+hash.e:12);
  const [step,setStep]=useState(hash.s?+hash.s:0);
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1); // multiplier: 0.25 0.5 1 2
  const [upload,setUpload]=useState(false);
  const [view,setView]=useState('overview');
  const [pred,setPred]=useState({x:1.2,y:.8});
  const [three,setThree]=useState(false);
  const [addClass,setAddClass]=useState(1);
  const [dark,setDark]=useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const [dragPt,setDragPt]=useState(null); // {id, origX, origY, mouseX, mouseY}

  // dark mode
  useEffect(()=>{document.documentElement.setAttribute('data-theme',dark?'dark':'light')},[dark]);

  const model=useMemo(()=>fit(data,rate,epochs),[data,rate,epochs]);
  const state=model.states[Math.min(step,model.states.length-1)];
  const prevState=step>0?model.states[step-1]:null;
  const hist=model.states.slice(0,step+1);
  const m=metrics(data,state);
  const score=state.weights[0]*pred.x+state.weights[1]*pred.y+state.bias;
  const deltas=[
    state.weights[0]-state.before[0],
    state.weights[1]-state.before[1],
    state.bias-state.before[2],
  ];
  const formatDelta=value=>`${value>=0?'+':''}${value.toFixed(3)}`;

  useEffect(()=>{setStep(0);setPlaying(false)},[model]);

  useEffect(()=>{
    if(!playing)return;
    const ms=Math.round(500/speed);
    const t=setInterval(()=>setStep(i=>{if(i>=model.states.length-1){setPlaying(false);return i}return i+1}),ms);
    return()=>clearInterval(t);
  },[playing,model.states.length,speed]);

  const nav=(id,label,Icon)=>(
    <button className={`nav-item${view===id?' active':''}`} onClick={()=>setView(id)}>
      <Icon size={18}/>{label}{id==='dataset'&&<span className="nav-count">{data.length}</span>}
    </button>
  );

  const addPoint=(x,y)=>setData(a=>[...a,{id:Math.max(...a.map(p=>p.id))+1,x:+x.toFixed(2),y:+y.toFixed(2),label:addClass}]);

  const download=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([`${names[0]},${names[1]},label\n`+data.map(p=>`${p.x},${p.y},${p.label}`).join('\n')],{type:'text/csv'}));
    a.download='perceptron-cleaned-data.csv';a.click();
  };

  // drag point in playground
  const startDrag=(e,pt)=>{
    e.stopPropagation();
    setDragPt({id:pt.id,ox:pt.x,oy:pt.y,mx:e.clientX,my:e.clientY});
  };
  const moveDrag=e=>{
    if(!dragPt)return;
    // approximate: 6 units per 60px (scale factor)
    const dx=(e.clientX-dragPt.mx)/60,dy=-(e.clientY-dragPt.my)/60;
    setData(a=>a.map(p=>p.id===dragPt.id?{...p,x:+(dragPt.ox+dx).toFixed(2),y:+(dragPt.oy+dy).toFixed(2)}:p));
  };
  const endDrag=()=>setDragPt(null);

  /* ── Overview ─────────────────────────────────────────────────── */
  const overview=(
    <>
      <section className="metrics-row">
        <Metric label="CURRENT STEP" value={`${state.step}/${model.states.length}`} sub={`Epoch ${state.epoch+1}`}/>
        <Metric label="ACCURACY" value={`${(m.accuracy*100).toFixed(0)}%`} sub="Current model" tone="green"/>
        <Metric label="MISCLASSIFIED" value={state.errors} sub="In current epoch" tone={state.errors?'orange':'green'}/>
        <Metric label="F1 SCORE" value={m.f1.toFixed(2)} sub="Positive class" tone="blue"/>
      </section>

      <section className="dashboard-grid">
        {/* Hero: decision boundary */}
        <article className="card hero-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">LIVE GEOMETRY</p>
              <h2>Decision boundary</h2>
              <span>The line moves when the model corrects a mistake.</span>
            </div>
            <button className="outline-button" onClick={()=>setThree(!three)}>
              <Layers3 size={15}/>{three?'Hide 3D':'Show 3D'}
            </button>
          </div>
          <Chart data={data} state={state} prevState={prevState} names={names} pred={pred}/>
          <div className="timeline">
            <span className="timeline-label">STEP {state.step}</span>
            <input type="range" min="0" max={model.states.length-1} value={step} onChange={e=>setStep(+e.target.value)}/>
            <span>{model.states.length}</span>
          </div>
        </article>

        {/* What just happened */}
        <article className="card update-card">
          <div className="card-heading small">
            <div><p className="eyebrow">SAMPLE-BY-SAMPLE LEARNING</p><h2>How this sample was processed</h2></div>
            <span className={`event-chip${state.error?' error':''}`}>{state.error?'Correcting error':'Correct prediction'}</span>
          </div>
          <div className="sample-focus">
            <span className={`sample-marker${state.point.label?' blue':''}`}>{state.sampleIndex+1}</span>
            <div>
              <b>Sample #{state.sampleIndex+1}</b>
              <p>{names[0]} {state.point.x.toFixed(2)} · {names[1]} {state.point.y.toFixed(2)}</p>
            </div>
            <span className="true-class">Class {state.point.label}</span>
          </div>
          <div className="math-steps">
            <div>
              <span>1</span>
              <p>Score before update <code>{state.before[0].toFixed(3)}×{state.point.x.toFixed(3)} + {state.before[1].toFixed(3)}×{state.point.y.toFixed(3)} + {state.before[2].toFixed(3)}</code></p>
              <b>{state.score.toFixed(3)}</b>
            </div>
            <div>
              <span>2</span>
              <p>Prediction before update <code>score ≥ 0</code></p>
              <b>Class {state.prediction}</b>
            </div>
            <div className={state.error?'changed':''}>
              <span>3</span>
              <p>{state.error?'Update applied':'No update needed'} <code>{state.error?`η=${rate} · y=${state.point.label} · ŷ=${state.prediction}`:'prediction matched label'}</code></p>
              <b>{state.error?'Boundary shifted':'Stable'}</b>
            </div>
          </div>
          <div className="weight-update">
            <div className="weight-update-heading">
              <b>What changed</b>
              <code>Δw = η(y − ŷ)x · Δb = η(y − ŷ)</code>
            </div>
            <table className="update-table">
              <thead><tr><th>Parameter</th><th>Before</th><th>Change</th><th>After</th></tr></thead>
              <tbody>
                {[
                  ['w₁',state.before[0],deltas[0],state.weights[0]],
                  ['w₂',state.before[1],deltas[1],state.weights[1]],
                  ['b',state.before[2],deltas[2],state.bias],
                ].map(([label,before,delta,after])=>(
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{before.toFixed(3)}</td>
                    <td className={delta>0?'delta-positive':delta<0?'delta-negative':''}>{formatDelta(delta)}</td>
                    <td>{after.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="equation">
            <span>Decision function after sample · boundary where f(x) = 0</span>
            <b>f(x) = {state.weights[0].toFixed(3)}x₁ {state.weights[1]>=0?'+':''}{state.weights[1].toFixed(3)}x₂ {state.bias>=0?'+':''}{state.bias.toFixed(3)}</b>
          </div>
        </article>

        {/* Misclassified */}
        <article className="card chart-card">
          <div className="chart-title">
            <div><p className="eyebrow">TRAINING SIGNAL</p><h3>Misclassified samples</h3></div>
            <span className="value-pill">{state.errors} errors</span>
          </div>
          <Line states={hist} type="err" color="#f07167"/>
        </article>

        {/* Accuracy chart — NEW Phase 2 */}
        <article className="card chart-card">
          <div className="chart-title">
            <div><p className="eyebrow">PERFORMANCE</p><h3>Accuracy over steps</h3></div>
            <span className="value-pill green-pill">{(m.accuracy*100).toFixed(0)}%</span>
          </div>
          <AccLine states={hist} data={data}/>
        </article>

        {/* Weights & Bias */}
        <article className="card chart-card">
          <div className="chart-title">
            <div><p className="eyebrow">MODEL STATE</p><h3>Weights &amp; bias</h3></div>
            <div className="legend-mini"><i className="dot indigo"/>w₁ <i className="dot green"/>w₂ <i className="dot coral"/>b</div>
          </div>
          <div className="stacked-lines">
            <Line states={hist} type="w1" color="#5b5bd6"/>
            <Line states={hist} type="w2" color="#24a57a"/>
            <Line states={hist} type="b" color="#f07167"/>
          </div>
        </article>

        {/* Confusion matrix */}
        <article className="card params-card">
          <div className="card-heading small">
            <div><p className="eyebrow">EVALUATION</p><h3>Confusion matrix</h3></div>
            <span className="event-chip">{model.converged?'Converged':'Limit reached'}</span>
          </div>
          <div className="matrix">
            <span>Actual \ Pred.</span><b>0</b><b>1</b>
            <b>0</b><strong>{m.tn}</strong><strong>{m.fp}</strong>
            <b>1</b><strong>{m.fn}</strong><strong>{m.tp}</strong>
          </div>
          <div className="metric-strip">
            <span>Precision <b>{m.precision.toFixed(2)}</b></span>
            <span>Recall <b>{m.recall.toFixed(2)}</b></span>
          </div>
        </article>

        {/* Prediction explorer */}
        <article className="card prediction-card">
          <div>
            <p className="eyebrow">PREDICTION EXPLORER</p>
            <h3>Try a point</h3>
            <p className="muted">The outlined point appears in the decision chart.</p>
          </div>
          <div className="prediction-inputs">
            <label>{names[0]}<input type="number" value={pred.x} onChange={e=>setPred(p=>({...p,x:+e.target.value}))} step=".1"/></label>
            <label>{names[1]}<input type="number" value={pred.y} onChange={e=>setPred(p=>({...p,y:+e.target.value}))} step=".1"/></label>
            <div className={`prediction-result${score>=0?' positive':''}`}>
              <b>Class {score>=0?1:0}</b><small>score {score.toFixed(3)}</small>
            </div>
          </div>
        </article>

        {/* 3D plane — full render Phase 3 */}
        {three&&(
          <section className="card surface-card">
            <p className="eyebrow">3D DECISION PLANE & SCORE SURFACE</p>
            <h3>Interactive score surface</h3>
            <p className="muted" style={{marginBottom:8}}>Drag to rotate · Scroll to zoom · Click any point to test in Prediction Explorer.</p>
            <DecisionPlane3D state={state} data={data} names={names} pred={pred} onSelectPoint={setPred} height={360}/>
          </section>
        )}

        {/* Boundary snapshots — Phase 2 */}
        <section className="card snapshot-section">
          <div className="card-heading small">
            <div><p className="eyebrow">TRAINING MILESTONES</p><h3>Boundary snapshots</h3></div>
            <span className="muted" style={{fontSize:9}}>Click to jump</span>
          </div>
          <Snapshots model={model} data={data} names={names} onJump={idx=>setStep(idx)}/>
        </section>
      </section>
    </>
  );

  /* ── Dataset ──────────────────────────────────────────────────── */
  const dataset=(
    <div className="page-grid">
      <section className="card dataset-wide">
        <div className="card-heading">
          <div>
            <p className="eyebrow">DATASET EXPLORER</p>
            <h2>{name}</h2>
            <span>{data.length} rows · binary classes · two visualized numeric features</span>
          </div>
          <div className="header-actions">
            <button className="outline-button" onClick={download}><Download size={15}/>Clean CSV</button>
            <button className="upload-button" onClick={()=>setUpload(true)}><Upload size={15}/>Replace data</button>
          </div>
        </div>
        <div className="dataset-summary">
          <div><span>Feature X</span><b>{names[0]}</b><small>{Math.min(...data.map(p=>p.x)).toFixed(2)} to {Math.max(...data.map(p=>p.x)).toFixed(2)}</small></div>
          <div><span>Feature Y</span><b>{names[1]}</b><small>{Math.min(...data.map(p=>p.y)).toFixed(2)} to {Math.max(...data.map(p=>p.y)).toFixed(2)}</small></div>
          <div><span>Class 0</span><b>{data.filter(p=>!p.label).length}</b><small>coral samples</small></div>
          <div><span>Class 1</span><b>{data.filter(p=>p.label).length}</b><small>indigo samples</small></div>
        </div>
        {/* Class balance bar — Phase 2 */}
        <ClassBalance data={data} names={names}/>
        <table className="data-table">
          <thead><tr><th>Sample</th><th>{names[0]}</th><th>{names[1]}</th><th>Class</th><th>Prediction</th></tr></thead>
          <tbody>
            {data.map(p=>{
              const q=state.weights[0]*p.x+state.weights[1]*p.y+state.bias>=0?1:0;
              return(
                <tr key={p.id}>
                  <td>#{p.id+1}</td>
                  <td>{p.x.toFixed(2)}</td>
                  <td>{p.y.toFixed(2)}</td>
                  <td><i className={`dot ${p.label?'indigo':'coral'}`}/> {p.label}</td>
                  <td className={q===p.label?'ok':'bad'}>{q===p.label?'Correct':'Error'} · {q}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );

  /* ── Playground (with drag) ───────────────────────────────────── */
  const playground=(
    <div className="page-grid playground-view" onMouseMove={moveDrag} onMouseUp={endDrag} onMouseLeave={endDrag}>
      <section className="card playground-main">
        <div className="card-heading">
          <div>
            <p className="eyebrow">INTERACTIVE PLAYGROUND</p>
            <h2>Add &amp; drag points, then retrain</h2>
            <span>Click to add · drag existing points to reposition · watch the boundary move.</span>
          </div>
          <div className="class-picker">
            <button className={addClass===0?'selected coral-btn':''} onClick={()=>setAddClass(0)}>Add class 0</button>
            <button className={addClass===1?'selected indigo-btn':''} onClick={()=>setAddClass(1)}>Add class 1</button>
          </div>
        </div>
        {/* draggable version of chart */}
        <div className="boundary-wrap">
          <div className="chart-legend">
            <span><i className="dot coral"/>Class 0</span>
            <span><i className="dot indigo"/>Class 1</span>
            <span><i className="line-key"/>Boundary</span>
          </div>
          <svg className="boundary-svg playground-canvas" viewBox="0 0 680 390" onClick={e=>{
            if(dragPt)return;
            const r=e.currentTarget.getBoundingClientRect();
            const min=-3.5,max=3.5,W=680,H=390,P=35;
            const x=min+(e.clientX-r.left)/r.width*(max-min);
            const y=max-(e.clientY-r.top)/r.height*(max-min);
            addPoint(x,y);
          }}>
            <defs><linearGradient id="shade2" x1="0" x2="1"><stop stopColor="#fee2e2" stopOpacity=".65"/><stop offset=".5" stopColor="#fbfafc" stopOpacity=".15"/><stop offset="1" stopColor="#e0e7ff" stopOpacity=".65"/></linearGradient></defs>
            <rect x={35} y={35} width={610} height={320} rx="12" fill="url(#shade2)"/>
            {(()=>{
              const min=-3.5,max=3.5,W=680,H=390,P=35;
              const pos=v=>P+(v-min)/(max-min)*(W-P*2);
              const yy=v=>H-pos(v)+P*2;
              const w=state.weights,b=state.bias;
              const y1=-(w[0]*min+b)/(w[1]||.0001);
              const y2=-(w[0]*max+b)/(w[1]||.0001);
              return(<>
                {[0,1,2,3,4,5,6].map(i=><g key={i}><line x1={pos(-3+i)} y1={P} x2={pos(-3+i)} y2={H-P} className="grid"/><line x1={P} y1={pos(-3+i)} x2={W-P} y2={pos(-3+i)} className="grid"/></g>)}
                <line x1={pos(min)} y1={yy(y1)} x2={pos(max)} y2={yy(y2)} className="boundary-shadow"/>
                <line x1={pos(min)} y1={yy(y1)} x2={pos(max)} y2={yy(y2)} className="boundary"/>
                {data.map(p=>{
                  const bad=(w[0]*p.x+w[1]*p.y+b>=0?1:0)!==p.label;
                  return(
                    <g key={p.id} onMouseDown={e=>startDrag(e,p)} style={{cursor:'grab'}}>
                      <circle cx={pos(p.x)} cy={yy(p.y)} r="13" fill={p.label?'#5b5bd6':'#f07167'} opacity=".12"/>
                      <circle cx={pos(p.x)} cy={yy(p.y)} r="5.8" fill={p.label?'#5b5bd6':'#f07167'} stroke={bad?'#f59e0b':'#fff'} strokeWidth={bad?'3':'1.5'}/>
                    </g>
                  );
                })}
              </>);
            })()}
          </svg>
        </div>
        <div className="playground-actions">
          <button className="outline-button" onClick={()=>setData(seed)}><RotateCcw size={15}/>Separable example</button>
          <button className="outline-button" onClick={()=>setData(noisy)}><AlertTriangle size={15}/>Overlapping example</button>
          <button className="outline-button" onClick={()=>setData(a=>a.slice(0,-1))} disabled={data.length<2}><X size={15}/>Undo last</button>
          <span><MousePointer2 size={15}/>Click=add · Drag=move</span>
        </div>
      </section>
      <section className="card">
        <p className="eyebrow">CONVERGENCE STATUS</p>
        <h3>{model.converged?'The current data converged.':'The current data has not converged.'}</h3>
        <p className="muted">{model.converged?'A linear separator was found before the epoch limit.':'This can occur for overlapping data; the Perceptron keeps correcting without finding a perfect line.'}</p>
        <div className="rule small-rule">Current: {state.errors} errors · max {epochs} epochs</div>
        <div style={{marginTop:16}}>
          <p className="eyebrow" style={{marginBottom:8}}>CURRENT METRICS</p>
          <div className="metric-strip" style={{flexDirection:'column',gap:6}}>
            <span>Accuracy <b>{(m.accuracy*100).toFixed(0)}%</b></span>
            <span>F1 <b>{m.f1.toFixed(3)}</b></span>
            <span>Precision <b>{m.precision.toFixed(3)}</b></span>
            <span>Recall <b>{m.recall.toFixed(3)}</b></span>
          </div>
        </div>
      </section>
    </div>
  );

  /* ── Model comparison ─────────────────────────────────────────── */
  const compare=(
    <div className="page-grid">
      <section className="card comparison-card">
        <p className="eyebrow">MODEL COMPARISON</p>
        <h2>Learning-rate experiment</h2>
        <p className="muted">Same data, different learning rates. Compares training behaviour, steps to convergence, and final accuracy.</p>
        <div className="comparison-table">
          <div className="comp-head"><b>Configuration</b><b>Converged</b><b>Steps</b><b>Accuracy</b><b>F1</b></div>
          {[.05,.1,.15,.25,.5].map(r=>{
            const f=fit(data,r,epochs),e=metrics(data,f.states[f.states.length-1]);
            return(
              <div key={r} className={r===rate?'comp-active':''}>
                <span>η = {r.toFixed(2)} {r===rate&&<em>current</em>}</span>
                <span className={f.converged?'ok':'bad'}>{f.converged?'Yes':'No'}</span>
                <span>{f.states.length}</span>
                <span>{(e.accuracy*100).toFixed(0)}%</span>
                <span>{e.f1.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  /* ── 3D Hyperplane Studio ──────────────────────────────────────── */
  const threeDView=(
    <div className="view-panel">
      <div className="card theory-hero" style={{marginBottom:15}}>
        <p className="eyebrow">3D DECISION HYPERPLANE STUDIO</p>
        <h2>The Perceptron in 3D Space</h2>
        <p className="muted">
          While the decision boundary is rendered as a line in 2D, the Perceptron actually calculates a continuous signed score plane: <code>z = w₁x₁ + w₂x₂ + b</code>. The decision threshold is the zero plane <code>z = 0</code>. Points above the floor receive positive predictions (Class 1), while points below receive negative predictions (Class 0).
        </p>
      </div>

      <div className="page-grid">
        <section className="card dataset-wide" style={{position:'relative'}}>
          <div className="card-heading">
            <div>
              <p className="eyebrow">PERSPECTIVE DECISION SURFACE</p>
              <h3>Live Score Surface &amp; Data Margins</h3>
              <p className="muted">Stems show each sample's signed score, scaled vertically to fit the current view. Click any point to probe it.</p>
            </div>
            <div className="stats-inline" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <span className="badge">w₁: {state.weights[0].toFixed(2)}</span>
              <span className="badge">w₂: {state.weights[1].toFixed(2)}</span>
              <span className="badge">bias: {state.bias.toFixed(2)}</span>
              <span className="badge" style={{color:'var(--green)'}}>Accuracy: {(m.accuracy*100).toFixed(0)}%</span>
            </div>
          </div>

          <DecisionPlane3D
            state={state}
            data={data}
            names={names}
            pred={pred}
            onSelectPoint={setPred}
            height={460}
          />
        </section>

        {/* Prediction Explorer Probe */}
        <article className="card prediction-card">
          <div className="card-heading small">
            <div>
              <p className="eyebrow">PROBE POINT IN 3D</p>
              <h3>Prediction Explorer</h3>
              <p className="muted">Highlighted with a cyan beacon on the 3D surface.</p>
            </div>
          </div>
          <div className="prediction-inputs">
            <label>{names[0]}<input type="number" value={pred.x} onChange={e=>setPred(p=>({...p,x:+e.target.value}))} step=".1"/></label>
            <label>{names[1]}<input type="number" value={pred.y} onChange={e=>setPred(p=>({...p,y:+e.target.value}))} step=".1"/></label>
            <div className={`prediction-result${score>=0?' positive':''}`}>
              <b>Class {score>=0?1:0}</b>
              <small>score {score.toFixed(3)}</small>
            </div>
          </div>
          <div style={{marginTop:12,padding:'10px 12px',background:'var(--surface2)',borderRadius:8,fontSize:11,fontFamily:'DM Mono'}}>
            <div>z = ({state.weights[0].toFixed(2)} × {pred.x}) + ({state.weights[1].toFixed(2)} × {pred.y}) + ({state.bias.toFixed(2)})</div>
            <div style={{marginTop:4,color:score>=0?'var(--accent)':'var(--coral)',fontWeight:700}}>
              = {score.toFixed(3)} &rarr; {score>=0?'Above z=0 floor (Class 1)':'Below z=0 floor (Class 0)'}
            </div>
          </div>
        </article>

        {/* Geometric Properties */}
        <article className="card">
          <div className="card-heading small">
            <div>
              <p className="eyebrow">GEOMETRIC PROPERTIES</p>
              <h3>Hyperplane Fundamentals</h3>
            </div>
          </div>
          <ul style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.6,paddingLeft:16,margin:'8px 0 0'}}>
            <li><b>Normal Vector:</b> The weight vector <code>w = [w₁, w₂]</code> points perpendicular to the decision line, in the direction of the positive class.</li>
            <li><b>Margin / Distance:</b> The perpendicular distance from any point <code>x</code> to the decision boundary is <code>|w·x + b| / ‖w‖</code>.</li>
            <li><b>Step scrub:</b> Use the top timeline scrubber to watch the plane tilt and rotate in real time as the weights update.</li>
          </ul>
        </article>
      </div>
    </div>
  );

  const content=view==='overview'?overview:view==='dataset'?dataset:view==='3d'?threeDView:view==='playground'?playground:view==='compare'?compare:<Theory/>;

  return(
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><BrainCircuit size={22}/></span>
          <span>Perceptron<span className="brand-dot">.</span></span>
        </div>
        <div className="workspace-pill">
          <span className="avatar">DS</span>
          <div><b>Learning lab</b><small>Interactive workspace</small></div>
          <ChevronDown size={15}/>
        </div>
        <nav>
          <p className="nav-label">WORKSPACE</p>
          {nav('overview','Overview',ChartNoAxesCombined)}
          {nav('dataset','Dataset',Database)}
          {nav('overview','Model training',SlidersHorizontal)}
          {nav('overview','Learning replay',StepForward)}
          <p className="nav-label second">EXPLORE</p>
          {nav('3d','3D Decision Plane',Layers3)}
          {nav('playground','Interactive playground',MousePointer2)}
          {nav('compare','Model comparison',GitCompareArrows)}
          {nav('theory','Theory &amp; notes',BookOpen)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={()=>setUpload(true)}><Upload size={18}/>Import CSV</button>
          {/* theme toggle */}
          <button className="nav-item theme-toggle" onClick={()=>setDark(!dark)}>
            {dark?<Sun size={18}/>:<Moon size={18}/>}{dark?'Light mode':'Dark mode'}
          </button>
          <div className="separable">
            <span><Sparkles size={16}/></span>
            <div><b>Good to know</b><small>Perceptrons learn linear boundaries.</small></div>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <div className="crumb">WORKSPACE <ChevronRight size={13}/> {view.toUpperCase()}</div>
            <h1>Perceptron <span>learning studio</span></h1>
          </div>
          <div className="header-actions">
            <button className="dataset-button" onClick={()=>setView('dataset')}>
              <FileSpreadsheet size={17}/><span>{name}</span><ChevronDown size={15}/>
            </button>
            <button className="outline-button" onClick={()=>exportReport(data,model,names,rate,epochs)}>
              <Download size={15}/>Export report
            </button>
            <button className="outline-button" onClick={()=>setShareOpen(true)}>
              <Share2 size={15}/>Share
            </button>
            <button className="upload-button" onClick={()=>setUpload(true)}><Upload size={16}/>Upload CSV</button>
          </div>
        </header>

        {/* Control bar */}
        <section className="control-bar">
          <div className="control-intro">
            <span className={`status-dot${model.converged?' success':''}`}/>
            <div>
              <b>{model.converged?'Converged':'Training replay'}</b>
              <span>{model.converged?'A clean linear boundary was found.':'Watch how each update moves the boundary.'}</span>
            </div>
          </div>
          <div className="control-fields">
            <label>Learning rate
              <select value={rate} onChange={e=>setRate(+e.target.value)}>
                {[.05,.1,.15,.25,.5].map(x=><option key={x} value={x}>{x.toFixed(2)}</option>)}
              </select>
            </label>
            <label>Max. epochs
              <select value={epochs} onChange={e=>setEpochs(+e.target.value)}>
                {[8,12,20,40].map(x=><option key={x}>{x}</option>)}
              </select>
            </label>
            {/* Speed selector — Phase 2 */}
            <label><Gauge size={12}/>Speed
              <select value={speed} onChange={e=>setSpeed(+e.target.value)}>
                <option value={0.25}>0.25×</option>
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
              </select>
            </label>
          </div>
          <div className="controls">
            <button className="icon-button" onClick={()=>{setPlaying(false);setStep(0)}}><RotateCcw size={17}/></button>
            <button className="icon-button" onClick={()=>setStep(x=>Math.max(0,x-1))}><StepBack size={17}/></button>
            <button className="run-button" onClick={()=>setPlaying(x=>!x)}>
              {playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}
              {playing?'Pause':'Play replay'}
            </button>
            <button className="icon-button" onClick={()=>setStep(x=>Math.min(model.states.length-1,x+1))}><StepForward size={17}/></button>
          </div>
        </section>

        {content}
      </main>

      {upload&&<Import close={()=>setUpload(false)} load={(d,n,f)=>{setData(d);setNames(n);setName(f)}}/>}
      {shareOpen&&<ShareModal close={()=>setShareOpen(false)} step={step} rate={rate} epochs={epochs}/>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
