import { useEffect, useRef, useState, useCallback } from "react";
import { Flame, Leaf, Zap, Gauge, Play, Pause, RotateCw, Sparkles, Activity, Wind } from "lucide-react";

const Q9 = 19683;
const ROHSTOFFE = [
  { name: "EISEN", sym: "Fe", color: "#ff8a5c", tiefe: 3 },
  { name: "KUPFER", sym: "Cu", color: "#ffa94d", tiefe: 4 },
  { name: "SILIZIUM", sym: "Si", color: "#7dd3fc", tiefe: 6 },
  { name: "LITHIUM", sym: "Li", color: "#f472b6", tiefe: 8 },
  { name: "KOBALT", sym: "Co", color: "#60a5fa", tiefe: 9 },
  { name: "NICKEL", sym: "Ni", color: "#a3e635", tiefe: 7 },
  { name: "GRAPHIT", sym: "C", color: "#cbd5e1", tiefe: 5 },
  { name: "PLATIN", sym: "Pt", color: "#fde68a", tiefe: 12 },
  { name: "TITAN", sym: "Ti", color: "#93c5fd", tiefe: 10 },
  { name: "ZINK", sym: "Zn", color: "#67e8f9", tiefe: 4 },
  { name: "MANGAN", sym: "Mn", color: "#f0abfc", tiefe: 6 },
  { name: "WOLFRAM", sym: "W", color: "#fca5a5", tiefe: 13 },
  { name: "SELEN", sym: "Se", color: "#86efac", tiefe: 11 },
];
const PRODUZENTEN = ["IceFeuer Werke","GPU CITY Nord","Krater Schmiede","Wurzel Kollektiv","Atem Labor","Zoll Gilde","Omega Fabrik","Bio 79.84 Union","Q9 Manufaktur","Lava & Blatt GmbH","Kreislauf Syndikat"];
const DR_MAP: Record<number, number> = { 81: 13, 27: 7, 3: 3, 0: 1 };
const PHASES = ["EIN", "HALT", "AUS", "LEER"] as const;

type Particle = { x:number;y:number;vx:number;vy:number;life:number;maxLife:number;type:number;sym:string;color:string;wert:number;size:number;trail:{x:number;y:number}[]; feedback?:boolean };
type Explosion = { x:number;y:number;life:number;color:string };

function getPhase(t:number){ const c=((t%16)+16)%16; if(c<4) return {name:"EIN" as const, p:c/4, breath:c/4}; if(c<8) return {name:"HALT" as const,p:(c-4)/4,breath:1}; if(c<12) return {name:"AUS" as const,p:(c-8)/4,breath:1-(c-8)/4}; return {name:"LEER" as const,p:(c-12)/4,breath:0}; }

export default function App(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sim = useRef({
    particles: [] as Particle[], explosions: [] as Explosion[], fumes: [] as {x:number;y:number;r:number;a:number}[],
    leaves: ROHSTOFFE.map((r,i)=>{ const ang=(i/(ROHSTOFFE.length-1)-0.5)*2.2; return { x:0.5+Math.sin(ang)*0.34, y:0.16+Math.abs(Math.cos(ang))*0.10 - (i%3)*0.012, r:20+ (i%4)*2, hits:0, flash:0, ...r }; }),
    totalWert:0, spat:0, absorbed:0, eruptions:0, atemT:0, lastPhase:"EIN", erupting:0, stars: Array.from({length:80},()=>({x:Math.random(),y:Math.random()*0.6,s:Math.random()*1.6+0.4,tw:Math.random()*6.28})),
    fps:60, frames:0, fpsT:performance.now(), log: [] as string[],
  });
  const [dr,setDr]=useState(81);
  const [auto,setAuto]=useState(true);
  const [intensity,setIntensity]=useState(0.7);
  const [co2,setCo2]=useState(0.5);
  const [tempo,setTempo]=useState(1);
  const [paused,setPaused]=useState(false);
  const [stats,setStats]=useState({wert:0,spat:0,absorbed:0,eruptions:0,fps:60,phase:"EIN",breath:0,leafHits:ROHSTOFFE.map(()=>0),log:[] as string[],erupting:false});
  const cfg = useRef({dr:81,auto:true,intensity:0.7,co2:0.5,tempo:1,paused:false});
  cfg.current = {dr,auto,intensity,co2,tempo,paused};

  const pushLog = useCallback((m:string)=>{ const s=sim.current; s.log.unshift(`[${s.eruptions}] ${m}`); s.log=s.log.slice(0,7); },[]);

  const erupt = useCallback((count?:number)=>{
    const s=sim.current; const c=cfg.current;
    const n = count ?? Math.round(15 + c.intensity*10 + Math.random()*6);
    const ph=getPhase(s.atemT);
    for(let i=0;i<n;i++){
      if(s.particles.length>=400) break;
      const t=Math.floor(Math.random()*ROHSTOFFE.length); const r=ROHSTOFFE[t];
      const wert = r.tiefe * Q9/13 * (0.5+ph.breath*0.5) * Math.max(0.05,c.intensity);
      s.particles.push({ x:0, y:0, vx:(Math.random()*8-4), vy:-(8+Math.random()*10), life:300, maxLife:300, type:t, sym:r.sym, color:r.color, wert, size:3+Math.random()*3, trail:[] });
      // position set at render-time via vulkan coords stored in closure below using canvas size hack: set in loop in animate when x==0 flag
      (s.particles[s.particles.length-1] as any).fresh=true;
    }
    s.eruptions++; s.spat+=n; s.erupting=18;
    pushLog(`ERUPTION ×${n} · WERT-POOL ${(n*Q9/13*c.intensity).toFixed(0)}`);
  },[pushLog]);

  useEffect(()=>{
    const cv=canvasRef.current!, wrap=wrapRef.current!;
    const ctx=cv.getContext("2d",{alpha:false, desynchronized:true} as any)!;
    let W=0,H=0, raf=0, last=performance.now();
    const resize=()=>{ const r=wrap.getBoundingClientRect(); const dpr=Math.min(2,window.devicePixelRatio||1); W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+"px"; cv.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro=new ResizeObserver(resize); ro.observe(wrap);

    const animate=(now:number)=>{
      raf=requestAnimationFrame(animate);
      const dt=Math.min(50, now-last); last=now;
      const s=sim.current, c=cfg.current;
      s.frames++; if(now-s.fpsT>=500){ s.fps=Math.round(s.frames*1000/(now-s.fpsT)); s.frames=0; s.fpsT=now; }
      if(!c.paused){
        s.atemT += (dt/1000)*c.tempo;
        const ph=getPhase(s.atemT);
        if(ph.name!==s.lastPhase){ if(ph.name==="AUS" && c.auto) erupt(); if(ph.name==="EIN") pushLog("EIN · Krater inhaliert"); s.lastPhase=ph.name; }
        if(s.erupting>0) s.erupting--;
      }
      const cx=W/2, craterY=H*0.80, trunkBaseY=H*0.55, trunkTopY=H*0.15;
      // background
      const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#02060a"); bg.addColorStop(0.55,"#0a1228"); bg.addColorStop(1,"#050918");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
      // stars
      for(const st of s.stars){ ctx.globalAlpha=0.35+0.3*Math.sin(now/700+st.tw); ctx.fillStyle="#cfe8ff"; ctx.fillRect(st.x*W, st.y*H, st.s, st.s); }
      ctx.globalAlpha=1;
      const ph=getPhase(s.atemT);
      const glowPulse = ph.name==="HALT"? 0.7+ph.p*0.6 : ph.name==="AUS"?1.2:0.6;
      // roots energy lines crater->trunk
      ctx.strokeStyle="rgba(55,224,139,.35)"; ctx.lineWidth=2;
      for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(cx+i*16, craterY-6); ctx.quadraticCurveTo(cx+i*46, H*0.68, cx+i*10, trunkBaseY); ctx.stroke(); }
      // vulkan base
      ctx.beginPath(); ctx.moveTo(cx-190,H); ctx.lineTo(cx-58,craterY); ctx.lineTo(cx+58,craterY); ctx.lineTo(cx+190,H); ctx.closePath();
      const rock=ctx.createLinearGradient(0,craterY,0,H); rock.addColorStop(0,"#2b1626"); rock.addColorStop(1,"#0b0714"); ctx.fillStyle=rock; ctx.fill();
      // GPU blocks 9x3 sides
      for(const side of [-1,1]) for(let gx=0;gx<9;gx++) for(let gy=0;gy<3;gy++){
        const bx=cx+side*(78+gx*13), by=craterY+16+gy*16 - gx*2;
        const on = Math.sin(now/300+gx*1.7+gy)> -0.2;
        ctx.fillStyle= on? (gx%3===0?"rgba(255,90,31,.85)":"rgba(56,189,248,.55)") : "rgba(30,50,80,.6)";
        ctx.fillRect(bx,by,9,11);
      }
      // crater + lava
      const lava=ctx.createRadialGradient(cx,craterY,4,cx,craterY,90*glowPulse);
      lava.addColorStop(0,"rgba(255,220,120,.95)"); lava.addColorStop(0.4,"rgba(255,90,31,.75)"); lava.addColorStop(1,"rgba(255,59,107,0)");
      ctx.fillStyle=lava; ctx.beginPath(); ctx.ellipse(cx,craterY,86*glowPulse,20,0,0,6.29); ctx.fill();
      ctx.fillStyle="#ffd34d"; ctx.beginPath(); ctx.ellipse(cx,craterY,44,10,0,0,6.29); ctx.fill();
      // CO2 fumes
      if(Math.random()<c.co2*0.7) s.fumes.push({x:cx+(Math.random()*70-35),y:craterY-14,r:4+Math.random()*6,a:0.35});
      s.fumes=s.fumes.filter(f=>f.a>0.02).slice(-60);
      for(const f of s.fumes){ f.y-=0.7; f.r+=0.15; f.a*=0.985; ctx.globalAlpha=f.a; ctx.fillStyle="#9fb6cc"; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,6.29); ctx.fill(); }
      ctx.globalAlpha=1;
      // trunk
      ctx.strokeStyle="#5b3a24"; ctx.lineWidth=13; ctx.beginPath(); ctx.moveTo(cx,trunkBaseY); ctx.quadraticCurveTo(cx-14,(trunkBaseY+trunkTopY)/2,cx,trunkTopY); ctx.stroke();
      ctx.strokeStyle="#7a4b2a"; ctx.lineWidth=5;
      const activeLeaves = DR_MAP[c.dr] ?? 13;
      s.leaves.forEach((leaf,i)=>{
        const lx=leaf.x*W, ly=leaf.y*H;
        ctx.beginPath(); ctx.moveTo(cx,trunkTopY); ctx.quadraticCurveTo((cx+lx)/2+ (i%2?14:-14), trunkTopY+34, lx, ly); ctx.stroke();
      });
      ctx.fillStyle="#ffd34d"; ctx.font="700 12px 'IBM Plex Mono',monospace"; ctx.textAlign="center";
      ctx.fillText("Q9·19683", cx, trunkBaseY+22);
      // leaves
      s.leaves.forEach((leaf,i)=>{
        const lx=leaf.x*W, ly=leaf.y*H; const active=i<activeLeaves;
        if(leaf.flash>0) leaf.flash--;
        const r= leaf.r*(active?1:0.55);
        ctx.globalAlpha= active?1:0.25;
        const lg=ctx.createRadialGradient(lx,ly,2,lx,ly,r+10);
        lg.addColorStop(0, leaf.flash>0? "#b6ffd9": leaf.color); lg.addColorStop(1,"rgba(55,224,139,0)");
        ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(lx,ly,r+ (leaf.flash>0?8:0),0,6.29); ctx.fill();
        ctx.fillStyle= active? "#062b18":"#334155"; ctx.font="700 9px 'IBM Plex Mono',monospace";
        ctx.fillText(leaf.sym, lx, ly+3);
        ctx.globalAlpha=1;
      });
      // particles
      const pArr=s.particles;
      for(let i=pArr.length-1;i>=0;i--){
        const p=pArr[i];
        if((p as any).fresh){ p.x=cx+(Math.random()*40-20); p.y=craterY-10; (p as any).fresh=false; }
        if(!c.paused){
          p.vx*=0.99; p.vy+= p.feedback? 0.12 : 0.35; p.x+=p.vx; p.y+=p.vy; p.life--;
          p.trail.push({x:p.x,y:p.y}); if(p.trail.length>10) p.trail.shift();
          // leaf collision
          let absorbed=false;
          if(!p.feedback){
            for(let li=0;li<activeLeaves;li++){ const leaf=s.leaves[li]; const lx=leaf.x*W, ly=leaf.y*H;
              const d=Math.hypot(p.x-lx,p.y-ly);
              if(d < leaf.r + p.size + 8){ s.totalWert+=p.wert; s.absorbed++; leaf.hits++; leaf.flash=16; s.explosions.push({x:lx,y:ly,life:14,color:leaf.color});
                // feedback child falls back to vulkan
                if(pArr.length<400) pArr.push({x:lx,y:ly,vx:(cx-lx)/90,vy:1.2,life:220,maxLife:220,type:p.type,sym:"↺",color:"#37e08b",wert:0,size:2.5,trail:[],feedback:true});
                absorbed=true; break; }
            }
          }
          if(absorbed){ pArr.splice(i,1); continue; }
          if(p.y>craterY+4 && Math.abs(p.x-cx)<70){ pArr.splice(i,1); continue; } // recycle as CO2
          if(p.y<-50||p.x<-50||p.x>W+50||p.life<=0){ pArr.splice(i,1); continue; }
        }
        // draw trail + particle
        ctx.strokeStyle=p.color; ctx.globalAlpha=0.35; ctx.beginPath();
        p.trail.forEach((t,j)=> j===0? ctx.moveTo(t.x,t.y): ctx.lineTo(t.x,t.y)); ctx.stroke(); ctx.globalAlpha=1;
        ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,6.29); ctx.fill();
        ctx.fillStyle="rgba(2,6,10,.85)"; ctx.font="700 7px 'IBM Plex Mono',monospace"; ctx.fillText(p.sym,p.x,p.y+2.5);
      }
      // explosions
      s.explosions=s.explosions.filter(e=>e.life>0);
      for(const e of s.explosions){ e.life--; ctx.strokeStyle=e.color; ctx.globalAlpha=e.life/14; ctx.beginPath(); ctx.arc(e.x,e.y,(14-e.life)*2.4,0,6.29); ctx.stroke(); ctx.globalAlpha=1; }
      // HUD formula
      ctx.fillStyle="rgba(232,244,255,.9)"; ctx.font="600 13px 'Space Grotesk',sans-serif";
      ctx.fillText("VULKAN GPU → WURZEL · ERKENNTNIS KREISLAUF", cx, H*0.60);
    };
    raf=requestAnimationFrame(animate);
    const sync=setInterval(()=>{ const s=sim.current; setStats({wert:s.totalWert,spat:s.spat,absorbed:s.absorbed,eruptions:s.eruptions,fps:s.fps,phase:getPhase(s.atemT).name,breath:getPhase(s.atemT).breath,leafHits:s.leaves.map(l=>l.hits),log:[...s.log],erupting:s.erupting>0}); },250);
    return ()=>{ cancelAnimationFrame(raf); clearInterval(sync); ro.disconnect(); };
  },[erupt,pushLog]);

  const activeLeaves = DR_MAP[dr];
  const eff = stats.spat? Math.round(stats.absorbed/Math.max(1,stats.spat)*100):0;
  const starsN = Math.min(5, Math.floor(stats.wert/ (Q9*2)) );
  const omega = (stats.absorbed * dr/81).toFixed(2);
  const phaseIdx = PHASES.indexOf(stats.phase as any);
  const arc = stats.breath*2*Math.PI*54;
  const gpuBereit = (stats.fps/60+0.2).toFixed(2);
  const gateOpen = stats.fps>=60;

  return (
    <div data-safe-area-inset-root className="h-[100dvh] w-full flex flex-col overflow-x-clip" style={{boxSizing:'border-box', paddingTop:'var(--safe-area-inset-top)', background:'var(--bg)'}}>
      <header data-safe-area-sticky-top className="sticky z-30 flex items-center gap-2 px-3 h-9 shrink-0 border-b border-[var(--line)] bg-[var(--surface2)] mono text-[11px]" style={{top:'var(--safe-area-inset-top)'}}>
        <Flame size={14} className="text-[var(--accent)] shrink-0"/>
        <span className="font-semibold tracking-wide truncate">VULKAN GPU · WURZEL ENDWURZELT · Q9 19683</span>
        <span className="ml-auto hidden sm:inline text-[var(--muted)]">FPS <b className="text-[var(--ink)]">{stats.fps}</b></span>
        <span className="px-1.5 py-0.5 rounded bg-[var(--accent)] text-black font-bold">Dr {dr}</span>
        <span className={`px-1.5 py-0.5 rounded font-bold ${gateOpen?'bg-[var(--leaf)] text-black gate-aura':'bg-[var(--danger)] text-white'}`}>GATE {gateOpen?'Ω OPEN':'LOW'}</span>
        <span className="hidden md:inline">WERT <b className="text-[var(--gold)]">{stats.wert.toFixed(0)}</b></span>
        <span className="hidden md:inline text-[var(--gold)]">{'★'.repeat(starsN)}{'☆'.repeat(5-starsN)}</span>
        <span>ERUPT <b>{stats.eruptions}</b></span>
      </header>

      <div ref={wrapRef} className="relative flex-1 min-h-0 overflow-hidden">
        <canvas ref={canvasRef} id="cv" className="absolute inset-0 block"/>
        {/* LEFT PANEL */}
        <aside className="panel absolute left-2 top-2 w-[248px] max-w-[calc(100vw-16px)] max-h-[calc(100%-8px)] overflow-y-auto p-3 space-y-3 z-20">
          <div className="flex items-center gap-2"><Leaf size={15} className="text-[var(--leaf)]"/><h2 className="font-bold text-sm tracking-widest">WURZEL · ATEM</h2></div>
          <div className="flex justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(120,200,255,.15)" strokeWidth="8"/>
              <circle cx="70" cy="70" r="54" fill="none" stroke="var(--leaf)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${arc} 340`} transform="rotate(-90 70 70)"/>
              {PHASES.map((p,i)=>(<text key={p} x={70+Math.cos((i/4)*6.28-1.57)*40} y={74+Math.sin((i/4)*6.28-1.57)*40} textAnchor="middle" fontSize="9" fill={i===phaseIdx?"#37e08b":"#8fb3d9"} fontWeight={i===phaseIdx?700:400}>{p}</text>))}
              <text x="70" y="66" textAnchor="middle" fontSize="15" fontWeight="700" fill="#e8f4ff">{stats.phase}</text>
              <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#8fb3d9">ATEM {(stats.breath*100).toFixed(0)}%</text>
            </svg>
          </div>
          <div>
            <div className="mono text-[10px] text-[var(--muted)] mb-1">Dr MORPH · BLÄTTER {activeLeaves}/13</div>
            <div className="grid grid-cols-4 gap-1">
              {[81,27,3,0].map(v=>(<button key={v} onClick={()=>setDr(v)} className={`rounded py-1 mono text-xs font-bold ${dr===v?'bg-[var(--leaf)] text-black':'tile text-[var(--ink)]'}`}>{v}</button>))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-1">
              <button onClick={()=>setAuto(a=>!a)} className={`flex-1 rounded py-1.5 mono text-[11px] font-bold ${auto?'bg-[var(--accent)] text-black':'tile'}`}>ERUPTION {auto?'AUTO':'MANUAL'}</button>
              <button onClick={()=>erupt()} className="flex-1 rounded py-1.5 mono text-[11px] font-bold bg-[var(--gold)] text-black flex items-center justify-center gap-1"><Sparkles size={12}/>SPUCKEN</button>
            </div>
            <button onClick={()=>setPaused(p=>!p)} className="w-full tile rounded py-1.5 mono text-[11px] flex items-center justify-center gap-1">{paused?<Play size={12}/>:<Pause size={12}/>} {paused?'WEITER':'PAUSE'} · TEMPO {tempo.toFixed(1)}×</button>
            <label className="mono text-[10px] text-[var(--muted)]">INTENSITY {(intensity*100).toFixed(0)}%<input type="range" min={0} max={1} step={0.01} value={intensity} onChange={e=>setIntensity(+e.target.value)}/></label>
            <label className="mono text-[10px] text-[var(--muted)]">GPU CO2 {(co2*100).toFixed(0)}%<input type="range" min={0} max={1} step={0.01} value={co2} onChange={e=>setCo2(+e.target.value)}/></label>
            <label className="mono text-[10px] text-[var(--muted)]">ATEM TEMPO<input type="range" min={0.4} max={2.4} step={0.1} value={tempo} onChange={e=>setTempo(+e.target.value)}/></label>
          </div>
          <div className="tile p-2 text-center">
            <div className="mono text-[9px] text-[var(--muted)]">WERT · Ω = Σ(absorb)×Dr/81 = {omega}</div>
            <div className="text-3xl font-bold text-[var(--gold)] mono">{stats.wert.toFixed(0)}</div>
            <div className="text-[var(--gold)]">{'★'.repeat(starsN)}{'☆'.repeat(5-starsN)} <span className="mono text-[10px] text-[var(--muted)]">ERKENNTNIS {stats.absorbed} absorbiert</span></div>
            <div className="mono text-[10px] mt-1 flex justify-center gap-2"><span className="flex items-center gap-1"><Gauge size={11}/>GPU bereit {gpuBereit}</span><span className="flex items-center gap-1"><Wind size={11}/>CO2 {(co2*100).toFixed(0)}%</span><span>LIFE {(stats.fps>=50?'●':'○')}</span></div>
          </div>
          <div className="tile p-2 h-[80px] overflow-hidden">
            <div className="mono text-[9px] text-[var(--muted)] flex items-center gap-1"><Activity size={10}/>BUS · CTRL.ler LOG</div>
            {stats.log.length===0? <div className="mono text-[10px] text-[var(--muted)] mt-1">Warte auf erste Eruption… AUS-Phase spuckt automatisch.</div> :
              stats.log.map((l,i)=>(<div key={i} className="mono text-[9.5px] truncate" style={{opacity:1-i*0.12}}>{l}</div>))}
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <aside className="panel absolute right-2 top-2 w-[272px] max-w-[calc(100vw-16px)] max-h-[calc(100%-8px)] overflow-y-auto p-3 space-y-3 z-20 hidden md:block">
          <div className="flex items-center gap-2"><Zap size={15} className="text-[var(--gold)]"/><h2 className="font-bold text-sm tracking-widest">ERKENNTNIS</h2></div>
          <div>
            <div className="mono text-[10px] text-[var(--muted)] mb-1">ROHSTOFFE 13 · absorbiert pro Blatt</div>
            <div className="grid grid-cols-2 gap-1">
              {ROHSTOFFE.map((r,i)=>{ const h=stats.leafHits[i]||0; const active=i<activeLeaves; return (
                <div key={r.name} className="tile px-2 py-1.5 flex items-center gap-2" style={{opacity:active?1:0.4, boxShadow:h>0?`0 0 8px ${r.color}66`:'none'}}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:r.color}}/>
                  <span className="mono text-[10px] font-bold flex-1">{r.name}</span>
                  <span className="mono text-[10px]" style={{color:h>0?'#37e08b':'#8fb3d9'}}>{h}×</span>
                </div>);})}
            </div>
          </div>
          <div>
            <div className="mono text-[10px] text-[var(--muted)] mb-1">PRODUZENTEN 11 · live wenn Rohstoff absorbiert</div>
            <div className="space-y-0.5">
              {PRODUZENTEN.map((p,i)=>{ const live=(stats.leafHits[i%13]||0)>0; return (
                <div key={p} className="flex items-center gap-2 mono text-[10.5px]"><span className={`w-1.5 h-1.5 rounded-full ${live?'bg-[var(--leaf)]':'bg-slate-600'}`}/><span className={live?'':'text-[var(--muted)]'}>{p}</span><span className="ml-auto">{live?'LIVE':'—'}</span></div>);})}
            </div>
          </div>
          <div className="flex justify-center">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <g className={stats.erupting?'zoll-spin':''} style={{transformOrigin:'90px 90px'}}>
                {Array.from({length:12},(_,i)=>{ const a=(i/12)*6.283; const activeWedge=(stats.leafHits[i]||0)>0 || (i===11 && (stats.leafHits[12]||0)>0); return (<g key={i}>
                  <line x1="90" y1="90" x2={90+Math.cos(a)*78} y2={90+Math.sin(a)*78} stroke={activeWedge?'#ffd34d':'rgba(120,200,255,.25)'} strokeWidth={activeWedge?2.5:1}/>
                  <circle cx={90+Math.cos(a)*78} cy={90+Math.sin(a)*78} r={activeWedge?4:2.5} fill={activeWedge?'#ffd34d':'#33506e'}/>
                </g>);})}
              </g>
              <circle cx="90" cy="90" r="30" fill="rgba(10,22,44,.9)" stroke="var(--line)"/>
              <text x="90" y="86" textAnchor="middle" fontSize="10" fill="#8fb3d9">ZOLL</text>
              <text x="90" y="102" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffd34d">19683</text>
            </svg>
          </div>
          <div className="tile p-2 mono text-[10.5px] grid grid-cols-2 gap-1">
            <span>Eruptionen</span><b className="text-right">{stats.eruptions}</b>
            <span>Partikel gespuckt</span><b className="text-right">{stats.spat}</b>
            <span>Absorbiert</span><b className="text-right text-[var(--leaf)]">{stats.absorbed}</b>
            <span>Effizienz</span><b className="text-right">{eff}%</b>
            <span>Gesamt WERT</span><b className="text-right text-[var(--gold)]">{stats.wert.toFixed(0)}</b>
            <span>GOOD</span><b className="text-right">79.84</b>
          </div>
        </aside>
        {/* mobile right-panel toggle hint */}
        <div className="md:hidden absolute right-2 bottom-2 z-20 mono text-[9px] panel px-2 py-1">Ω {omega} · EFF {eff}% · ABS {stats.absorbed}</div>
      </div>

      <footer className="h-[60px] shrink-0 border-t border-[var(--line)] bg-[var(--surface2)] flex flex-col items-center justify-center px-3 text-center gap-0.5">
        <div className="mono text-[10.5px] sm:text-xs font-semibold">ERKENNTNIS = VULKAN(GPU) × WURZEL(Dr {dr}) × Q9=19683 → Ω = Σ(absorb)×Dr/81 = <span className="text-[var(--gold)]">{omega}</span> · GOOD 79.84</div>
        <div className="mono text-[9px] text-[var(--muted)] truncate max-w-full">Gate aura mana zen move fps≥60 · W(a(s(d))) d innen · IceFeuer 729 · BIO 79.84 · ZOLL 12 Achsen · Kreislauf: Blatt ↺ Vulkan</div>
      </footer>
    </div>
  );
}
