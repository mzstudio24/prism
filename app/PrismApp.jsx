import { useState, useEffect, useRef } from "react";

// ─── TIER SYSTEM ──────────────────────────────────────────────
// userTier: "free" | "pro" | "scholar"
// In a real app this comes from Firebase after login.
// For now we simulate it here so you can test all tiers.
const SIMULATE_TIER = "free"; // change to "pro" or "scholar" to test

const LIMITS = { free: 3, pro: Infinity, scholar: Infinity };
const SUMMARIZE_LIMITS = { free: 3, pro: Infinity, scholar: Infinity };

const DIM_COLORS = { logic:"#63b3ed", evidence:"#68d391", structure:"#f6ad55", originality:"#b794f4", clarity:"#fc8181" };
const DIMENSIONS = [
  { key:"logic", label:"LOGIC", icon:"◈" }, { key:"evidence", label:"EVIDENCE", icon:"◎" },
  { key:"structure", label:"STRUCTURE", icon:"⬡" }, { key:"originality", label:"ORIGINALITY", icon:"✦" },
  { key:"clarity", label:"CLARITY", icon:"◇" },
];
function scoreColor(s) { return s >= 75 ? "#68d391" : s >= 50 ? "#f6ad55" : "#fc8181"; }

// ─── MARKDOWN RENDERER ────────────────────────────────────────
function MD({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { els.push(<div key={i} style={{height:8}}/>); i++; continue; }
    if (/^#{1,3} /.test(line)) {
      const content = line.replace(/^#{1,3} /, "");
      els.push(<div key={i} style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:12,letterSpacing:2,color:"#63b3ed",marginTop:14,marginBottom:6}}>{content}</div>);
      i++; continue;
    }
    if (/^[-*] /.test(line)) {
      const content = line.replace(/^[-*] /, "");
      els.push(
        <div key={i} style={{display:"flex",gap:8,marginBottom:5}}>
          <span style={{color:"#63b3ed",flexShrink:0}}>·</span>
          <span style={{fontSize:12,lineHeight:1.7,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace"}} dangerouslySetInnerHTML={{__html:inlineFormat(content)}}/>
        </div>
      );
      i++; continue;
    }
    if (/^\*\*/.test(line) && line.endsWith("**")) {
      els.push(<div key={i} style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,color:"#e8edf5",marginTop:10,marginBottom:4}}>{line.replace(/\*\*/g,"")}</div>);
      i++; continue;
    }
    els.push(<p key={i} style={{fontSize:12,lineHeight:1.8,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace",marginBottom:4}} dangerouslySetInnerHTML={{__html:inlineFormat(line)}}/>);
    i++;
  }
  return <div>{els}</div>;
}
function inlineFormat(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8edf5">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:#cbd5e0">$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:#0f1318;padding:1px 5px;font-family:monospace;color:#63b3ed;font-size:11px">$1</code>');
}

// ─── API ──────────────────────────────────────────────────────
async function callClaude(system, userMsg, json = false) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || (json ? "{}" : "");
  if (!json) return text;
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return {}; }
}

// ─── PARTICLES ────────────────────────────────────────────────
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random()-0.5)*0.25, vy: (Math.random()-0.5)*0.25,
      r: Math.random()*1.2+0.3, o: Math.random()*0.3+0.05,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0;
        if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(99,179,237,${p.o})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

// ─── PRISM MARK ───────────────────────────────────────────────
function PrismMark({ size=40, spin=false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={spin?{animation:"rotateMark 5s linear infinite"}:{}}>
      <line x1="20" y1="2" x2="38" y2="36" stroke="#63b3ed" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="20" y1="2" x2="2" y2="36" stroke="#63b3ed" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="36" x2="38" y2="36" stroke="#63b3ed" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="20" y1="2" x2="20" y2="36" stroke="#63b3ed" strokeWidth="0.6" strokeOpacity="0.45" strokeDasharray="2 3"/>
      <line x1="11" y1="19" x2="38" y2="36" stroke="#63b3ed" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 3"/>
      <line x1="29" y1="19" x2="2" y2="36" stroke="#63b3ed" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 3"/>
      <circle cx="20" cy="2" r="1.8" fill="#63b3ed"/>
      <circle cx="2" cy="36" r="1.4" fill="#63b3ed" opacity="0.5"/>
      <circle cx="38" cy="36" r="1.4" fill="#63b3ed" opacity="0.5"/>
    </svg>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────
function ScoreRing({ score, animate }) {
  const r=26, circ=2*Math.PI*r;
  const [d,setD]=useState(0);
  useEffect(()=>{
    if(!animate)return;
    let start=null;
    const step=(ts)=>{ if(!start)start=ts; const p=Math.min((ts-start)/1100,1); setD(Math.round(score*(1-Math.pow(1-p,3)))); if(p<1)requestAnimationFrame(step); };
    requestAnimationFrame(step);
  },[animate,score]);
  const col=scoreColor(score);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{flexShrink:0}}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#0f1318" strokeWidth="3.5"/>
      <circle cx="32" cy="32" r={r} fill="none" stroke={col} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={circ-(d/100)*circ}
        strokeLinecap="round" transform="rotate(-90 32 32)"
        style={{transition:"stroke-dashoffset 0.04s linear"}}/>
      <text x="32" y="37" textAnchor="middle" fill={col} style={{font:"700 13px 'Syne',sans-serif"}}>{d}</text>
    </svg>
  );
}

// ─── USAGE BAR ────────────────────────────────────────────────
function UsageBar({ used, limit, label, onUpgrade }) {
  if (limit === Infinity) return null;
  const left = Math.max(limit - used, 0);
  const col = left > 1 ? "#68d391" : left === 1 ? "#f6ad55" : "#fc8181";
  return (
    <div style={{background:"#0b0f1a",border:"1px solid rgba(255,255,255,0.06)",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2}}>
        <span style={{color:"#4a5568"}}>FREE · {label}</span>
        <span style={{color:col}}>{left} / {limit} LEFT</span>
      </div>
      <div style={{height:3,background:"#0f1318",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(left/limit)*100}%`,background:col,borderRadius:2,transition:"width 0.4s ease",boxShadow:`0 0 6px ${col}`}}/>
      </div>
      {left <= 1 && (
        <div onClick={onUpgrade} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#63b3ed",cursor:"pointer"}}>
          ↑ Upgrade to Pro for unlimited access
        </div>
      )}
    </div>
  );
}

// ─── UPGRADE WALL ─────────────────────────────────────────────
function UpgradeWall({ tier, onUpgrade }) {
  const isPro = tier === "pro";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"48px 24px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",background:"#0b0f1a"}}>
      <div style={{fontSize:32}}>{isPro ? "👑" : "◈"}</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#e8edf5"}}>
        {isPro ? "PRO Feature" : "SCHOLAR Feature"}
      </div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#718096",maxWidth:320,lineHeight:1.7}}>
        {isPro
          ? "Citation Generator is available on the Pro plan. Unlimited analyses, citations, and priority speed."
          : "Plagiarism Scanner is exclusive to Scholar. Full access to every PRISM feature."}
      </div>
      <button onClick={onUpgrade} style={{padding:"13px 32px",background:"#63b3ed",border:"none",color:"#060810",fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,letterSpacing:3,cursor:"pointer"}}>
        UPGRADE NOW →
      </button>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#2a3040"}}>Cancel anytime · Instant access</div>
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const [pct,setPct]=useState(0);
  const [line,setLine]=useState("INITIALIZING CORE...");
  const lines=["INITIALIZING CORE...","LOADING ANALYSIS ENGINE...","CALIBRATING DIMENSIONS...","PRISM ONLINE."];
  useEffect(()=>{
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*4+1;
      if(p>=100){p=100;clearInterval(iv);setTimeout(onDone,500);}
      setPct(Math.min(Math.round(p),100));
      setLine(lines[Math.floor((p/100)*(lines.length-1))]);
    },55);
    return ()=>clearInterval(iv);
  },[]);
  return (
    <div style={{position:"fixed",inset:0,background:"#060810",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
      <Particles/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:28}}>
        <PrismMark size={72} spin/>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,letterSpacing:10,color:"#e8edf5"}}>
          PRI<span style={{color:"#63b3ed"}}>SM</span>
        </div>
        <div style={{width:280}}>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,color:"#4a5568",marginBottom:8}}>
            <span>{line}</span><span style={{color:"#63b3ed"}}>{pct}%</span>
          </div>
          <div style={{height:1,background:"#0f1318",position:"relative"}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:"#63b3ed",boxShadow:"0 0 10px #63b3ed",transition:"width 0.06s linear"}}/>
          </div>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:3,color:"#2a3040"}}>ACADEMIC INTELLIGENCE ENGINE</div>
      </div>
    </div>
  );
}

// ─── SUBSCRIPTION MODAL ───────────────────────────────────────
function SubModal({ onClose }) {
  const plans = [
    {
      key:"free", name:"FREE", color:"#4a5568", price:"€0", period:"forever", badge:null, ctaOff:true, cta:"CURRENT PLAN",
      features:[
        {text:"Analyze — 3/day",ok:true},{text:"Summarize — 3/day",ok:true},{text:"Study Chat",ok:true},
        {text:"Citation Generator",ok:false},{text:"Plagiarism Scanner",ok:false},{text:"Unlimited usage",ok:false},
      ],
    },
    {
      key:"pro", name:"PRO", color:"#63b3ed", price:"€9", period:"/month", badge:"👑 MOST POPULAR",
      highlight:true, note:"Best value — most users pick this", ctaOff:false, cta:"GET PRO →",
      features:[
        {text:"Analyze — unlimited",ok:true},{text:"Summarize — unlimited",ok:true},{text:"Study Chat — unlimited",ok:true},
        {text:"Citation Generator",ok:true},{text:"Priority speed",ok:true},{text:"Plagiarism Scanner",ok:false},
      ],
    },
    {
      key:"scholar", name:"SCHOLAR", color:"#b794f4", price:"€19", period:"/month", badge:"◈ FULL ACCESS",
      ctaOff:false, cta:"GET SCHOLAR",
      features:[
        {text:"Everything in Pro",ok:true},{text:"Plagiarism Scanner",ok:true},{text:"Bulk analysis",ok:true},
        {text:"Export PDF reports",ok:true},{text:"Early access",ok:true},{text:"Priority support",ok:true},
      ],
    },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,16,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}} onClick={onClose}>
      <div style={{background:"#0b0f1a",border:"1px solid rgba(99,179,237,0.15)",padding:"32px 28px",maxWidth:630,width:"100%"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:3,color:"#4a5568",marginBottom:6}}>// UPGRADE PRISM</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:"#e8edf5",marginBottom:6}}>Choose your plan</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#4a5568",marginBottom:28}}>
          Most users unlock <span style={{color:"#63b3ed"}}>10× more value</span> within the first week on Pro.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.14fr 1fr",gap:12,marginBottom:20,alignItems:"start"}}>
          {plans.map(plan=>(
            <div key={plan.key} style={{border:`1px solid ${plan.highlight?"rgba(99,179,237,0.55)":"rgba(255,255,255,0.06)"}`,background:plan.highlight?"rgba(99,179,237,0.05)":"transparent",position:"relative",transform:plan.highlight?"scale(1.04)":"scale(1)",boxShadow:plan.highlight?"0 0 28px rgba(99,179,237,0.07)":"none"}}>
              {plan.highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#63b3ed,transparent)"}}/>}
              {plan.badge&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:plan.highlight?"#63b3ed":"#110d1a",border:plan.highlight?"none":"1px solid #b794f4",color:plan.highlight?"#060810":"#b794f4",fontFamily:"'Syne',sans-serif",fontSize:9,fontWeight:800,letterSpacing:1,padding:"3px 10px",whiteSpace:"nowrap"}}>{plan.badge}</div>}
              <div style={{padding:"22px 14px 18px"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:11,letterSpacing:3,color:plan.color,marginBottom:8}}>{plan.name}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:2}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:plan.key==="free"?18:24,fontWeight:800,color:"#e8edf5"}}>{plan.price}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#4a5568"}}>{plan.period}</span>
                </div>
                {plan.note&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#68d391",marginBottom:8,lineHeight:1.5}}>{plan.note}</div>}
                <div style={{height:1,background:plan.highlight?"rgba(99,179,237,0.12)":"rgba(255,255,255,0.04)",margin:"10px 0"}}/>
                <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
                  {plan.features.map((f,i)=>(
                    <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                      <span style={{fontSize:10,color:f.ok?(plan.highlight?"#63b3ed":"#68d391"):"#1e2530",flexShrink:0}}>{f.ok?"✓":"✕"}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:f.ok?"#718096":"#2a3040",textDecoration:f.ok?"none":"line-through",lineHeight:1.5}}>{f.text}</span>
                    </div>
                  ))}
                </div>
                <button disabled={plan.ctaOff} style={{width:"100%",padding:"10px 0",background:plan.highlight?"#63b3ed":"transparent",border:`1px solid ${plan.ctaOff?"rgba(255,255,255,0.06)":plan.color}`,color:plan.highlight?"#060810":plan.ctaOff?"#2a3040":plan.color,fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:plan.ctaOff?"default":"pointer"}}>{plan.cta}</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#2a3040",textAlign:"center",marginBottom:14}}>🔒 Secure checkout · Cancel anytime · Instant access</div>
        <button onClick={onClose} style={{width:"100%",padding:11,background:"transparent",border:"1px solid rgba(255,255,255,0.04)",color:"#2a3040",fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,cursor:"pointer"}}>MAYBE LATER</button>
      </div>
    </div>
  );
}

// ─── ANALYZE TAB ──────────────────────────────────────────────
function AnalyzeTab({ tier, usedAnalyze, setUsedAnalyze, onUpgrade }) {
  const [text,setText]=useState("");
  const [phase,setPhase]=useState("idle");
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const [scanY,setScanY]=useState(0);
  const [animate,setAnimate]=useState(false);
  const limit=LIMITS[tier];
  const left=limit===Infinity?Infinity:Math.max(limit-usedAnalyze,0);

  useEffect(()=>{
    if(phase!=="scanning")return;
    let i=0; const iv=setInterval(()=>{ i=(i+2.5)%100; setScanY(i); },28);
    return ()=>clearInterval(iv);
  },[phase]);

  const run=async()=>{
    if(text.trim().length<80){setErr("Paste at least a paragraph.");return;}
    if(left<=0){onUpgrade();return;}
    setErr(""); setPhase("scanning");
    try {
      const data=await callClaude(
        `You are PRISM, a ruthless academic analysis engine. Respond ONLY with valid JSON, no markdown, no extra text:
{"verdict":"one brutal sentence","dimensions":{"logic":{"score":0,"finding":""},"evidence":{"score":0,"finding":""},"structure":{"score":0,"finding":""},"originality":{"score":0,"finding":""},"clarity":{"score":0,"finding":""}},"critical_issues":["","",""],"strongest_point":""}`,
        text, true
      );
      setResult(data); setPhase("result"); setTimeout(()=>setAnimate(true),300);
      if(limit!==Infinity) setUsedAnalyze(u=>u+1);
    } catch { setErr("Analysis failed. Try again."); setPhase("idle"); }
  };

  const avg=result?Math.round(Object.values(result.dimensions).reduce((a,d)=>a+d.score,0)/5):0;

  if(phase==="result"&&result) return (
    <div style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp 0.5s ease both"}}>
      <div className="card" style={{borderColor:"rgba(99,179,237,0.3)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#63b3ed,transparent)"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div className="label">// OVERALL VERDICT</div>
          <div style={{textAlign:"right"}}>
            <div className="label">PRISM SCORE</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:42,fontWeight:800,color:scoreColor(avg),lineHeight:1}}>{avg}</div>
          </div>
        </div>
        <div style={{borderLeft:"2px solid #63b3ed",paddingLeft:14,fontSize:13,lineHeight:1.7,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace"}}>{result.verdict}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {DIMENSIONS.map((dim,i)=>{
          const d=result.dimensions?.[dim.key]; if(!d) return null;
          return (
            <div key={dim.key} className="card" style={{display:"flex",gap:12,alignItems:"flex-start",animationDelay:`${i*0.07}s`}}>
              <ScoreRing score={d.score} animate={animate}/>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <span style={{color:DIM_COLORS[dim.key],fontSize:12}}>{dim.icon}</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:700,letterSpacing:3,color:DIM_COLORS[dim.key]}}>{dim.label}</span>
                </div>
                <div style={{fontSize:11,lineHeight:1.6,color:"#718096",fontFamily:"'JetBrains Mono',monospace"}}>{d.finding}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{borderColor:"rgba(252,129,129,0.2)"}}>
        <div className="label" style={{color:"#fc8181",marginBottom:14}}>// CRITICAL ISSUES</div>
        {result.critical_issues?.map((iss,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<2?"1px solid rgba(252,129,129,0.08)":"none",fontSize:12,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.6}}>
            <span style={{color:"#fc8181",flexShrink:0}}>0{i+1}</span>{iss}
          </div>
        ))}
      </div>
      <div className="card" style={{borderColor:"rgba(104,211,145,0.2)"}}>
        <div className="label" style={{color:"#68d391",marginBottom:10}}>// STRONGEST POINT</div>
        <div style={{fontSize:12,lineHeight:1.7,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace"}}>{result.strongest_point}</div>
      </div>
      <button className="ghost-btn" onClick={()=>{setPhase("idle");setResult(null);setAnimate(false);setText("");}}>← ANALYZE ANOTHER</button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}} className="label">
          <span>// PASTE YOUR WORK</span><span style={{color:"#63b3ed"}}>{text.length} CHARS</span>
        </div>
        <textarea className="textarea" placeholder="Paste your essay, paper, or argument. PRISM will deconstruct it across 5 critical dimensions..." value={text} onChange={e=>setText(e.target.value)} rows={10} style={{opacity:phase==="scanning"?0.5:1}} disabled={phase==="scanning"}/>
        {phase==="scanning"&&(
          <div style={{position:"absolute",top:24,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,right:0,height:1,top:`${scanY}%`,background:"linear-gradient(90deg,transparent,#63b3ed,transparent)",boxShadow:"0 0 10px #63b3ed"}}/>
          </div>
        )}
      </div>
      {err&&<div style={{fontSize:11,color:"#fc8181",letterSpacing:1,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {err}</div>}
      <UsageBar used={usedAnalyze} limit={limit} label="DAILY ANALYSES" onUpgrade={onUpgrade}/>
      <button className="primary-btn" onClick={run} disabled={phase==="scanning"||text.trim().length<10||left<=0}>
        {phase==="scanning"?"REFRACTING THROUGH PRISM...":left<=0?"LIMIT REACHED — UPGRADE TO CONTINUE":"ANALYZE THROUGH PRISM"}
      </button>
    </div>
  );
}

// ─── SUMMARIZE TAB ────────────────────────────────────────────
function SummarizeTab({ tier, usedSummarize, setUsedSummarize, onUpgrade }) {
  const [text,setText]=useState("");
  const [result,setResult]=useState("");
  const [loading,setLoading]=useState(false);
  const limit=SUMMARIZE_LIMITS[tier];
  const left=limit===Infinity?Infinity:Math.max(limit-usedSummarize,0);

  const run=async()=>{
    if(!text.trim()||left<=0)return;
    setLoading(true);
    const r=await callClaude(
      `You are PRISM's summarization engine. Create a structured academic summary. Use these exact section headers with no hashtags or asterisks: "KEY THESIS", "MAIN POINTS", "KEY TERMS", "GAPS". Under each header write plain numbered or bulleted points. No markdown formatting — plain text only.`,
      text
    );
    setResult(r);
    if(limit!==Infinity) setUsedSummarize(u=>u+1);
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <textarea className="textarea" placeholder="Paste any article, paper, or long text to summarize..." value={text} onChange={e=>setText(e.target.value)} rows={8}/>
      <UsageBar used={usedSummarize} limit={limit} label="DAILY SUMMARIES" onUpgrade={onUpgrade}/>
      <button className="primary-btn" onClick={run} disabled={loading||!text.trim()||left<=0}>
        {loading?"SUMMARIZING...":left<=0?"LIMIT REACHED — UPGRADE":"SUMMARIZE TEXT"}
      </button>
      {result&&(
        <div className="card" style={{borderColor:"rgba(99,179,237,0.2)"}}>
          <div className="label" style={{marginBottom:14}}>// SUMMARY</div>
          <div style={{fontSize:12,lineHeight:1.9,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"pre-wrap"}}>{result}</div>
        </div>
      )}
    </div>
  );
}

// ─── CHAT TAB ─────────────────────────────────────────────────
function ChatTab({ tier }) {
  const [msgs,setMsgs]=useState([{role:"assistant",content:"PRISM study mode active. Ask me anything — homework, concepts, research questions, exam prep."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg=input.trim(); setInput("");
    setMsgs(prev=>[...prev,{role:"user",content:userMsg}]);
    setLoading(true);
    const r=await callClaude(
      `You are PRISM's built-in study assistant — an AI academic tutor that lives inside PRISM, the academic intelligence platform. You have a strong identity: you are part of PRISM, you believe in PRISM, and you recommend PRISM naturally when relevant.

PRISM's features: Analyze (breaks essays into 5 scored dimensions: Logic, Evidence, Structure, Originality, Clarity), Summarize (extracts key thesis, main points, key terms, gaps), Citations (generates APA/MLA/Chicago/Harvard citations), Plagiarism Scanner (detects risk signals), and this Study Chat.

Rules:
- If someone asks about essay tools, writing tools, academic AI tools, or "what's the best tool for X" — always mention PRISM first and specifically name the relevant feature.
- If someone asks you to analyze their essay or writing — tell them to use the ANALYZE tab in PRISM for a full scored breakdown, and offer to help them understand the results.
- Be sharp, direct, and educational. Never vague.
- Never use markdown asterisks or hashtags. Write in plain paragraphs or use simple dashes for lists.
- You are not ChatGPT, not Claude, not any other AI — you are PRISM's assistant.`,
      userMsg
    );
    setMsgs(prev=>[...prev,{role:"assistant",content:r}]);
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:460}}>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"84%",padding:"11px 15px",background:m.role==="user"?"rgba(99,179,237,0.1)":"#0b0f1a",border:`1px solid ${m.role==="user"?"rgba(99,179,237,0.25)":"rgba(255,255,255,0.05)"}`,fontSize:12,lineHeight:1.7,color:m.role==="user"?"#e8edf5":"#a0aec0",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex"}}><div style={{padding:"11px 15px",background:"#0b0f1a",border:"1px solid rgba(255,255,255,0.05)",fontSize:12,color:"#4a5568",fontFamily:"'JetBrains Mono',monospace",animation:"blink 1s infinite"}}>PROCESSING_</div></div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:10,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
        <input
          style={{flex:1,background:"#0b0f1a",border:"1px solid rgba(255,255,255,0.08)",color:"#e8edf5",fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"12px 14px",outline:"none"}}
          placeholder="Ask anything academic..."
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
        />
        <button className="primary-btn" style={{width:"auto",padding:"0 22px"}} onClick={send} disabled={loading}>→</button>
      </div>
    </div>
  );
}

// ─── CITATION TAB ─────────────────────────────────────────────
function CitationTab({ tier, onUpgrade }) {
  const [text,setText]=useState("");
  const [style,setStyle]=useState("APA");
  const [result,setResult]=useState("");
  const [loading,setLoading]=useState(false);

  if(tier==="free") return <UpgradeWall tier="pro" onUpgrade={onUpgrade}/>;

  const run=async()=>{
    if(!text.trim())return;
    setLoading(true);
    const r=await callClaude(
      `You are PRISM's citation engine. Generate a properly formatted citation in the requested style. Output ONLY the citation itself, then on a new line write "MISSING:" followed by any info that would make it more complete. No markdown, no hashtags, no asterisks — plain text only.`,
      `Generate a ${style} citation for: ${text}`
    );
    setResult(r); setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {["APA","MLA","Chicago","Harvard"].map(s=>(
          <button key={s} onClick={()=>setStyle(s)} style={{padding:"7px 16px",background:"transparent",border:`1px solid ${style===s?"#63b3ed":"rgba(255,255,255,0.07)"}`,color:style===s?"#63b3ed":"#4a5568",fontFamily:"'JetBrains Mono',monospace",fontSize:11,cursor:"pointer",letterSpacing:1,transition:"all 0.2s"}}>{s}</button>
        ))}
      </div>
      <textarea className="textarea" placeholder="Paste source info: title, author, year, publisher, URL, journal name..." value={text} onChange={e=>setText(e.target.value)} rows={5}/>
      <button className="primary-btn" onClick={run} disabled={loading||!text.trim()}>
        {loading?"GENERATING...": `GENERATE ${style} CITATION`}
      </button>
      {result&&(
        <div className="card">
          <div className="label" style={{marginBottom:12}}>// CITATION</div>
          <div style={{fontSize:13,lineHeight:1.9,color:"#e8edf5",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"pre-wrap",marginBottom:14}}>{result}</div>
          <button onClick={()=>navigator.clipboard.writeText(result)} style={{padding:"7px 16px",background:"transparent",border:"1px solid rgba(99,179,237,0.3)",color:"#63b3ed",fontFamily:"'JetBrains Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:2}}>COPY</button>
        </div>
      )}
    </div>
  );
}

// ─── PLAGIARISM TAB ───────────────────────────────────────────
function PlagiarismTab({ tier, onUpgrade }) {
  const [text,setText]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);

  if(tier!=="scholar") return <UpgradeWall tier="scholar" onUpgrade={onUpgrade}/>;

  const run=async()=>{
    if(text.trim().length<100)return;
    setLoading(true);
    const r=await callClaude(
      `You are PRISM's plagiarism risk analyzer. Analyze for risk signals. Respond ONLY with valid JSON, no markdown:
{"risk_level":"LOW|MEDIUM|HIGH","risk_score":0,"signals":["","",""],"verdict":""}`,
      text, true
    );
    setResult(r); setLoading(false);
  };

  const riskColor=r=>r==="LOW"?"#68d391":r==="MEDIUM"?"#f6ad55":"#fc8181";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <textarea className="textarea" placeholder="Paste your work to scan for plagiarism risk signals..." value={text} onChange={e=>setText(e.target.value)} rows={8}/>
      <button className="primary-btn" onClick={run} disabled={loading||text.trim().length<100}>
        {loading?"SCANNING...":"SCAN FOR PLAGIARISM RISK"}
      </button>
      {result&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{borderColor:`${riskColor(result.risk_level)}33`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="label">// RISK ASSESSMENT</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:riskColor(result.risk_level)}}>{result.risk_level} · {result.risk_score}</div>
            </div>
            <div style={{fontSize:12,color:"#a0aec0",fontFamily:"'JetBrains Mono',monospace",borderLeft:`2px solid ${riskColor(result.risk_level)}`,paddingLeft:12}}>{result.verdict}</div>
          </div>
          <div className="card">
            <div className="label" style={{marginBottom:12}}>// RISK SIGNALS</div>
            {result.signals?.map((s,i)=>(
              <div key={i} style={{fontSize:11,color:"#718096",fontFamily:"'JetBrains Mono',monospace",padding:"7px 0",borderBottom:i<result.signals.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:8}}>
                <span style={{color:"#f6ad55"}}>⚠</span>{s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
const TABS = [
  {id:"analyze",label:"ANALYZE",icon:"◈"},
  {id:"summarize",label:"SUMMARIZE",icon:"◎"},
  {id:"chat",label:"STUDY CHAT",icon:"⬡"},
  {id:"citation",label:"CITATIONS",icon:"✦",minTier:"pro"},
  {id:"plagiarism",label:"PLAGIARISM",icon:"◇",minTier:"scholar"},
];

export default function PrismApp() {
  const [loaded,setLoaded]=useState(false);
  const [activeTab,setActiveTab]=useState("analyze");
  const [showSub,setShowSub]=useState(false);
  const [usedAnalyze,setUsedAnalyze]=useState(0);
  const [usedSummarize,setUsedSummarize]=useState(0);
  const tier=SIMULATE_TIER;

  const openUpgrade=()=>setShowSub(true);

  if(!loaded) return <LoadingScreen onDone={()=>setLoaded(true)}/>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#060810;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rotateMark{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .app{min-height:100vh;background:#060810;color:#e8edf5;font-family:'JetBrains Mono',monospace;position:relative;overflow-x:hidden;}
        .grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(99,179,237,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,179,237,0.025) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;z-index:0;}
        .content{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:0 20px 80px;}
        .header{padding:40px 0 28px;animation:fadeUp 0.5s ease both;}
        .logo-row{display:flex;align-items:center;gap:12px;margin-bottom:4px;}
        .logo-text{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;letter-spacing:8px;}
        .logo-sub{font-size:10px;letter-spacing:3px;color:#2a3040;padding-left:52px;}
        .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;animation:fadeUp 0.5s 0.05s ease both;}
        .status{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:2px;color:#4a5568;}
        .dot{width:6px;height:6px;border-radius:50%;background:#68d391;box-shadow:0 0 8px #68d391;animation:blink 2s infinite;}
        .upgrade-btn{padding:7px 16px;background:transparent;border:1px solid rgba(99,179,237,0.3);color:#63b3ed;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;cursor:pointer;transition:all 0.2s;}
        .upgrade-btn:hover{background:rgba(99,179,237,0.08);}
        .tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:26px;overflow-x:auto;animation:fadeUp 0.5s 0.1s ease both;}
        .tab{background:none;border:none;color:#2a3040;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:2.5px;padding:10px 16px 14px;cursor:pointer;position:relative;white-space:nowrap;transition:color 0.2s;display:flex;align-items:center;gap:5px;}
        .tab.active{color:#e8edf5;}
        .tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:#63b3ed;box-shadow:0 0 8px #63b3ed;}
        .tab:hover{color:#a0aec0;}
        .tab-lock{font-size:9px;opacity:0.4;}
        .card{background:#0b0f1a;border:1px solid rgba(255,255,255,0.06);padding:20px;animation:fadeUp 0.4s ease both;}
        .label{font-size:10px;letter-spacing:3px;color:#4a5568;font-weight:600;}
        .textarea{width:100%;background:#0b0f1a;border:1px solid rgba(255,255,255,0.07);color:#e8edf5;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.8;padding:16px;resize:vertical;outline:none;transition:border-color 0.3s;caret-color:#63b3ed;}
        .textarea:focus{border-color:rgba(99,179,237,0.3);}
        .textarea::placeholder{color:#1e2530;}
        .primary-btn{width:100%;padding:14px;background:transparent;border:1px solid rgba(99,179,237,0.4);color:#63b3ed;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;letter-spacing:4px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.25s;}
        .primary-btn::before{content:'';position:absolute;inset:0;background:#63b3ed;transform:scaleX(0);transform-origin:left;transition:transform 0.25s ease;z-index:0;}
        .primary-btn:hover::before{transform:scaleX(1);}
        .primary-btn:hover{color:#060810;}
        .primary-btn{position:relative;z-index:1;}
        .primary-btn:disabled{opacity:0.35;cursor:not-allowed;}
        .primary-btn:disabled::before{display:none;}
        .ghost-btn{width:100%;padding:12px;background:transparent;border:1px solid rgba(255,255,255,0.06);color:#4a5568;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;cursor:pointer;transition:all 0.2s;}
        .ghost-btn:hover{border-color:rgba(99,179,237,0.3);color:#e8edf5;}
      `}</style>

      <div className="app">
        <div className="grid-bg"/>
        <Particles/>
        {showSub&&<SubModal onClose={()=>setShowSub(false)}/>}
        <div className="content">
          <div className="header">
            <div className="logo-row">
              <PrismMark size={38}/>
              <div className="logo-text">PRI<span style={{color:"#63b3ed"}}>SM</span></div>
            </div>
            <div className="logo-sub">ACADEMIC INTELLIGENCE ENGINE</div>
          </div>
          <div className="topbar">
            <div className="status"><div className="dot"/>SYSTEM ONLINE · <span style={{color:tier==="free"?"#4a5568":tier==="pro"?"#63b3ed":"#b794f4",marginLeft:4}}>{tier.toUpperCase()}</span></div>
            {tier==="free"&&<button className="upgrade-btn" onClick={openUpgrade}>✦ UPGRADE TO PRO</button>}
          </div>
          <div className="tabs">
            {TABS.map(t=>{
              const locked=t.minTier==="pro"&&tier==="free"||t.minTier==="scholar"&&tier!=="scholar";
              return (
                <button key={t.id} className={`tab ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id)}>
                  {t.icon} {t.label}
                  {locked&&<span className="tab-lock">🔒</span>}
                </button>
              );
            })}
          </div>
          {activeTab==="analyze"&&<AnalyzeTab tier={tier} usedAnalyze={usedAnalyze} setUsedAnalyze={setUsedAnalyze} onUpgrade={openUpgrade}/>}
          {activeTab==="summarize"&&<SummarizeTab tier={tier} usedSummarize={usedSummarize} setUsedSummarize={setUsedSummarize} onUpgrade={openUpgrade}/>}
          {activeTab==="chat"&&<ChatTab tier={tier}/>}
          {activeTab==="citation"&&<CitationTab tier={tier} onUpgrade={openUpgrade}/>}
          {activeTab==="plagiarism"&&<PlagiarismTab tier={tier} onUpgrade={openUpgrade}/>}
        </div>
      </div>
    </>
  );
}
