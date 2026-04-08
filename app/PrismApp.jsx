"use client";
import { useState, useEffect, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── TIER / LIMITS ────────────────────────────────────────────
const LIMITS           = { free: 3, pro: Infinity, scholar: Infinity };
const SUMMARIZE_LIMITS = { free: 3, pro: Infinity, scholar: Infinity };

const DIM_COLORS = {
  logic: "#5b9cf6", evidence: "#34d399", structure: "#f59e0b",
  originality: "#a78bfa", clarity: "#f87171",
};

function scoreColor(s) { return s >= 75 ? "#34d399" : s >= 50 ? "#f59e0b" : "#f87171"; }

// ─── API ──────────────────────────────────────────────────────
async function callClaude(system, userMsg, json = false) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, message: userMsg }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || (json ? "{}" : "");
  if (!json) return text;
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return {}; }
}

// ─── PRISM LOGO MARK ─────────────────────────────────────────
function PrismMark({ size = 32, spin = false }) {
  const s = size;
  const ax = s*0.5, ay = s*0.04;
  const bl = s*0.04, br = s*0.96, by = s*0.94;
  const cx = s*0.5, cy = s*0.60;
  const mbx = s*0.5, mby = s*0.94;
  const mlx = (ax+bl)/2, mly = (ay+by)/2;
  const mrx = (ax+br)/2, mry = (ay+by)/2;
  const sw = s*0.028, dsw = s*0.011;
  const da = `${s*0.055} ${s*0.048}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none"
      style={spin ? { animation: "spin 5s linear infinite" } : {}}>
      <defs>
        <filter id={`tri-glow-${s}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter={`url(#tri-glow-${s})`}>
        <line x1={ax} y1={ay} x2={br} y2={by} stroke="#5b9cf6" strokeWidth={sw} strokeLinecap="round"/>
        <line x1={ax} y1={ay} x2={bl} y2={by} stroke="#5b9cf6" strokeWidth={sw} strokeLinecap="round"/>
        <line x1={bl} y1={by} x2={br} y2={by} stroke="#5b9cf6" strokeWidth={sw} strokeLinecap="round"/>
        <line x1={ax} y1={ay} x2={mbx} y2={mby} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.6" strokeDasharray={da} strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={mlx} y2={mly} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.5" strokeDasharray={da} strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={mrx} y2={mry} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.5" strokeDasharray={da} strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={bl} y2={by} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.38" strokeDasharray={da} strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={br} y2={by} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.38" strokeDasharray={da} strokeLinecap="round"/>
        <line x1={cx-s*0.05} y1={cy} x2={cx+s*0.05} y2={cy} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.55" strokeLinecap="round"/>
        <line x1={cx} y1={cy-s*0.05} x2={cx} y2={cy+s*0.05} stroke="#5b9cf6" strokeWidth={dsw} strokeOpacity="0.55" strokeLinecap="round"/>
        <circle cx={ax} cy={ay} r={s*0.055} fill="#5b9cf6"/>
        <circle cx={bl} cy={by} r={s*0.032} fill="#5b9cf6" opacity="0.5"/>
        <circle cx={br} cy={by} r={s*0.032} fill="#5b9cf6" opacity="0.5"/>
      </g>
    </svg>
  );
}

// ─── NAV LOGO (greyscale → blue on hover) ────────────────────
function NavLogo() {
  const [hovered, setHovered] = useState(false);
  const col = hovered ? "#5b9cf6" : "#888";
  const s = 32;
  const ax=s*0.5, ay=s*0.04, bl=s*0.04, br=s*0.96, by=s*0.94;
  const cx=s*0.5, cy=s*0.60;
  const mbx=s*0.5, mby=s*0.94;
  const mlx=(ax+bl)/2, mly=(ay+by)/2;
  const mrx=(ax+br)/2, mry=(ay+by)/2;
  const sw=s*0.028, dsw=s*0.011;
  const da=`${s*0.055} ${s*0.048}`;
  const glow = hovered ? "drop-shadow(0 0 6px rgba(91,156,246,0.7))" : "none";
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none"
      style={{transition:"filter 0.3s ease", filter:glow, cursor:"pointer"}}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <line x1={ax} y1={ay} x2={br} y2={by} stroke={col} strokeWidth={sw} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={ax} y1={ay} x2={bl} y2={by} stroke={col} strokeWidth={sw} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={bl} y1={by} x2={br} y2={by} stroke={col} strokeWidth={sw} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={ax} y1={ay} x2={mbx} y2={mby} stroke={col} strokeWidth={dsw} strokeOpacity="0.6" strokeDasharray={da} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={cx} y1={cy} x2={mlx} y2={mly} stroke={col} strokeWidth={dsw} strokeOpacity="0.5" strokeDasharray={da} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={cx} y1={cy} x2={mrx} y2={mry} stroke={col} strokeWidth={dsw} strokeOpacity="0.5" strokeDasharray={da} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={cx} y1={cy} x2={bl} y2={by} stroke={col} strokeWidth={dsw} strokeOpacity="0.38" strokeDasharray={da} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={cx} y1={cy} x2={br} y2={by} stroke={col} strokeWidth={dsw} strokeOpacity="0.38" strokeDasharray={da} strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={cx-s*0.05} y1={cy} x2={cx+s*0.05} y2={cy} stroke={col} strokeWidth={dsw} strokeOpacity="0.55" strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <line x1={cx} y1={cy-s*0.05} x2={cx} y2={cy+s*0.05} stroke={col} strokeWidth={dsw} strokeOpacity="0.55" strokeLinecap="round" style={{transition:"stroke 0.3s"}}/>
      <circle cx={ax} cy={ay} r={s*0.055} fill={col} style={{transition:"fill 0.3s"}}/>
      <circle cx={bl} cy={by} r={s*0.032} fill={col} opacity="0.5" style={{transition:"fill 0.3s"}}/>
      <circle cx={br} cy={by} r={s*0.032} fill={col} opacity="0.5" style={{transition:"fill 0.3s"}}/>
    </svg>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────
function ScoreRing({ score, size = 56, animate }) {
  const r = size/2-5, circ = 2*Math.PI*r;
  const [d, setD] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts-start)/1500, 1);
      setD(Math.round(score*(1-Math.pow(1-p,4))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [animate, score]);
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={circ-(d/100)*circ}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dashoffset 0.03s linear", filter:`drop-shadow(0 0 4px ${col}70)`}}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={col}
        style={{font:`700 ${Math.round(size*0.22)}px 'Playfair Display',serif`}}>{d}</text>
    </svg>
  );
}

// ─── SMOKY BACKGROUND ─────────────────────────────────────────
function SmokyBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    const particles = Array.from({length: 6}, (_, i) => ({
      x: w * (0.45 + Math.random() * 0.55),
      y: h * (0.05 + Math.random() * 0.7),
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.08,
      r: w * (0.18 + Math.random() * 0.25),
      opacity: 0.06 + Math.random() * 0.07,
      phase: Math.random() * Math.PI * 2,
    }));
    let raf, t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#080809';
      ctx.fillRect(0, 0, w, h);
      particles.forEach((p, i) => {
        t += 0.0003;
        p.x += p.vx + Math.sin(t + p.phase) * 0.15;
        p.y += p.vy + Math.cos(t * 0.7 + p.phase) * 0.1;
        if (p.x < w * 0.3) p.vx += 0.01;
        if (p.x > w * 1.1) p.vx -= 0.01;
        if (p.y < -h * 0.2) p.vy += 0.01;
        if (p.y > h * 1.2) p.vy -= 0.01;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const pulse = p.opacity + Math.sin(t * 0.5 + p.phase) * 0.02;
        grad.addColorStop(0, `rgba(210,210,215,${pulse})`);
        grad.addColorStop(0.3, `rgba(180,180,188,${pulse * 0.6})`);
        grad.addColorStop(0.65, `rgba(140,140,150,${pulse * 0.25})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.65, Math.sin(t * 0.3 + i) * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      const vig = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, h*0.85);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:0,width:"100%",height:"100%"}}/>;
}

// ─── LOADING SCREEN ───────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 120);
    const t2 = setTimeout(() => setFadeOut(true), 1800);
    const t3 = setTimeout(onDone, 2600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);
  return (
    <div style={{position:"fixed",inset:0,background:"#080809",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1000,overflow:"hidden"}}>
      <SmokyBg/>
      <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:9,opacity:show?1:0,transform:show?"translateY(0)":"translateY(6px)",transition:"opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)"}}>
        <PrismMark size={56}/>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:64,letterSpacing:"0.04em",lineHeight:1,fontWeight:400}}>
          <span style={{color:"#fff"}}>PRI</span><span style={{color:"#5b9cf6"}}>SM</span>
        </span>
      </div>
      <div style={{position:"absolute",bottom:32,zIndex:1,fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:5,color:"rgba(255,255,255,0.22)",fontWeight:700,textTransform:"uppercase",opacity:show?1:0,transition:"opacity 0.8s ease 0.4s"}}>
        POWERED BY AXIOM
      </div>
      <div style={{position:"absolute",inset:0,background:"#080809",opacity:fadeOut?1:0,pointerEvents:"none",zIndex:10,transition:"opacity 0.65s ease"}}/>
    </div>
  );
}

// ─── UPGRADE MODAL (with real Stripe links) ───────────────────
function UpgradeModal({ onClose }) {
  const plans = [
    {
      key:"free", name:"Free", price:"€0", period:"forever", color:"rgba(255,255,255,0.35)",
      cta:"Current", ctaOff:true,
      features:[{t:"3 analyses/day",ok:true},{t:"3 summaries/day",ok:true},{t:"Study Chat",ok:true},{t:"Citations",ok:false},{t:"Authenticity",ok:false}],
    },
    {
      key:"pro", name:"Pro", price:"€9", period:"/mo", color:"#5b9cf6",
      badge:"👑 Most Popular", highlight:true, note:"Best value",
      cta:"Get Pro", ctaOff:false,
      stripeUrl:"https://buy.stripe.com/test_4gMfZh3Eu1U66Wnd0I8AE00",
      features:[{t:"Unlimited analyses",ok:true},{t:"Unlimited summaries",ok:true},{t:"Study Chat",ok:true},{t:"Citations",ok:true},{t:"Authenticity",ok:false}],
    },
    {
      key:"scholar", name:"Scholar", price:"€19", period:"/mo", color:"#a78bfa",
      badge:"◈ Full Access", cta:"Get Scholar", ctaOff:false,
      stripeUrl:"https://buy.stripe.com/test_8x2cN57UK7eq3Kb4uc8AE01",
      features:[{t:"Everything in Pro",ok:true},{t:"Authenticity Analyzer",ok:true},{t:"Early access",ok:true},{t:"Priority support",ok:true},{t:"Direct to founder",ok:true}],
    },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={onClose}>
      <div style={{background:"#111",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,padding:"32px 26px",maxWidth:620,width:"100%",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:21,fontWeight:800,color:"#fff",marginBottom:6,letterSpacing:-0.5}}>Choose your plan</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:26}}>
          Most users unlock <span style={{color:"#5b9cf6"}}>10× more value</span> in their first week on Pro.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10,marginBottom:18}}>
          {plans.map(plan=>(
            <div key={plan.key} style={{position:"relative",background:plan.highlight?"rgba(91,156,246,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${plan.highlight?"rgba(91,156,246,0.35)":"rgba(255,255,255,0.06)"}`,borderRadius:16,padding:"20px 14px",transform:plan.highlight?"scale(1.03)":"scale(1)",boxShadow:plan.highlight?"0 0 30px rgba(91,156,246,0.08)":"none"}}>
              {plan.highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#5b9cf6,transparent)",borderRadius:"16px 16px 0 0"}}/>}
              {plan.badge&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:plan.highlight?"#5b9cf6":"#1c1a2e",border:plan.highlight?"none":"1px solid #a78bfa",color:plan.highlight?"#fff":"#a78bfa",fontFamily:"'Playfair Display',serif",fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap"}}>{plan.badge}</div>}
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:12,color:plan.color,marginBottom:8}}>{plan.name}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:2,marginBottom:4}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:plan.key==="free"?18:24,fontWeight:800,color:"#fff"}}>{plan.price}</span>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:10,color:"rgba(255,255,255,0.25)"}}>{plan.period}</span>
              </div>
              {plan.note&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:11,color:"#34d399",marginBottom:8}}>{plan.note}</div>}
              <div style={{height:1,background:"rgba(255,255,255,0.05)",margin:"10px 0"}}/>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                {plan.features.map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                    <span style={{fontSize:10,color:f.ok?(plan.highlight?"#5b9cf6":"#34d399"):"rgba(255,255,255,0.12)",flexShrink:0}}>{f.ok?"✓":"✕"}</span>
                    <span style={{fontFamily:"'Playfair Display',serif",fontSize:11,color:f.ok?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.18)",textDecoration:f.ok?"none":"line-through",lineHeight:1.5}}>{f.t}</span>
                  </div>
                ))}
              </div>
              <button
                disabled={plan.ctaOff}
                onClick={()=>{ if(plan.stripeUrl) window.open(plan.stripeUrl,"_blank"); }}
                style={{width:"100%",padding:"10px 0",background:plan.highlight?"#5b9cf6":"transparent",border:`1px solid ${plan.ctaOff?"rgba(255,255,255,0.07)":plan.color}`,borderRadius:10,color:plan.highlight?"#fff":plan.ctaOff?"rgba(255,255,255,0.18)":plan.color,fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,cursor:plan.ctaOff?"default":"pointer"}}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,color:"rgba(255,255,255,0.15)",textAlign:"center",marginBottom:12}}>🔒 Secure · Cancel anytime · Instant access</div>
        <button onClick={onClose} style={{width:"100%",padding:11,background:"transparent",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,color:"rgba(255,255,255,0.2)",fontFamily:"'Playfair Display',serif",fontSize:13,cursor:"pointer"}}>Maybe later</button>
      </div>
    </div>
  );
}

// ─── STUDY TIPS ───────────────────────────────────────────────
const TIPS = [
  { label:"Active recall", tip:"Close your notes and write down everything you remember. Testing yourself beats re-reading every time." },
  { label:"Spaced repetition", tip:"Review material after 1 day, then 3 days, then a week. Each gap makes the memory stronger." },
  { label:"The Feynman technique", tip:"Pick a concept and explain it like you're teaching a 12-year-old. Where you stumble is what you don't know yet." },
  { label:"Pomodoro", tip:"25 minutes fully on, 5 minutes fully off. Your brain consolidates memory during the breaks — don't skip them." },
  { label:"Write by hand", tip:"Handwriting forces you to compress and rephrase. That friction is the learning." },
  { label:"One tab rule", tip:"Every extra tab is a context switch waiting to happen. Close everything except what you need right now." },
  { label:"Sleep is studying", tip:"Memory consolidation happens during deep sleep. A late cramming session costs you more than it gives." },
  { label:"Interleaving", tip:"Mix subjects instead of blocking them. Switching topics feels harder but produces stronger long-term retention." },
  { label:"The 2-minute rule", tip:"If starting a task takes less than 2 minutes, do it now. Momentum is the hardest part." },
  { label:"Teach to learn", tip:"Find someone to explain your topic to — a friend, a parent, even a mirror. Gaps in explanation = gaps in knowledge." },
  { label:"Context matters", tip:"Study in the place you'll be tested if you can. Memory is partly tied to environment." },
  { label:"Rewrite, don't highlight", tip:"Highlighting feels productive but barely works. Rewriting key ideas in your own words does." },
  { label:"Question first", tip:"Before reading a chapter, skim headings and turn them into questions. Your brain reads looking for answers." },
  { label:"Chunk it", tip:"Break big topics into groups of 3–5 related ideas. Working memory maxes out fast — don't fight it." },
  { label:"Morning edge", tip:"Cognitive load is lowest in the morning for most people. Use that window for your hardest material." },
  { label:"Error analysis", tip:"Wrong answers are more valuable than right ones. Understand exactly why you got something wrong before moving on." },
  { label:"No multitasking", tip:"Studying with music (lyrics), podcasts, or notifications active cuts retention by up to 40%. Silence or instrumentals only." },
  { label:"Physical state", tip:"Exercise before studying — even a 10-minute walk increases focus and memory formation meaningfully." },
  { label:"Summarize out loud", tip:"After each section, close the material and say a 30-second summary out loud. Saying it forces structure." },
  { label:"Deadline pressure", tip:"Create fake deadlines earlier than the real ones. Your brain responds to urgency whether it's real or not." },
];

function getTodaysTip() {
  const today = new Date().toDateString();
  const stored = localStorage.getItem("prism_tip_date");
  if (stored === today) {
    const idx = parseInt(localStorage.getItem("prism_tip_idx") || "0", 10);
    return TIPS[idx % TIPS.length];
  }
  const idx = Math.floor(Math.random() * TIPS.length);
  localStorage.setItem("prism_tip_date", today);
  localStorage.setItem("prism_tip_idx", String(idx));
  return TIPS[idx];
}

function StudyTip({ onClose }) {
  const tip = getTodaysTip();
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 220); };
  return (
    <>
      <div onClick={close} style={{position:"fixed",inset:0,zIndex:149}}/>
      <div style={{
        position:"absolute",top:72,left:0,zIndex:150,
        width:280,
        background:"rgba(14,14,18,0.97)",
        border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:14,
        padding:"18px 20px",
        backdropFilter:"blur(20px)",
        boxShadow:"0 8px 40px rgba(0,0,0,0.55)",
        opacity:visible?1:0,
        transform:visible?"translateY(0)":"translateY(-6px)",
        transition:"opacity 0.2s ease, transform 0.2s ease",
      }}>
        <div style={{position:"absolute",top:0,left:20,right:20,height:"1px",background:"linear-gradient(90deg,transparent,rgba(91,156,246,0.5),transparent)",borderRadius:1}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,color:"rgba(91,156,246,0.8)",textTransform:"uppercase",fontWeight:700}}>Study tip</div>
          <button onClick={close} style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px",transition:"color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.55)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.2)"}>×</button>
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:8,letterSpacing:0.2}}>{tip.label}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,lineHeight:1.7,color:"rgba(255,255,255,0.42)",fontWeight:400}}>{tip.tip}</div>
        <div style={{marginTop:14,fontFamily:"'Outfit',sans-serif",fontSize:10,color:"rgba(255,255,255,0.15)",letterSpacing:1}}>New tip tomorrow.</div>
      </div>
    </>
  );
}

// ─── NAV ─────────────────────────────────────────────────────
function Nav({ activePage, setPage, showUpgrade, user, tier, onLogin, onLogout, onSettings, onProfile, dailyTip }) {
  const [showTip, setShowTip] = useState(false);
  const navItems = [
    { label:"Analyze", page:"analyze" },
    { label:"Summarize", page:"summarize" },
    { label:"Study Chat", page:"study-chat" },
    { label:"Citations", page:"citations" },
    { label:"Plagiarism", page:"plagiarism" },
  ];
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 40px",height:64,backdropFilter:"blur(20px)",background:"rgba(10,10,10,0.6)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
      <div
        onClick={()=>setPage("home")}
        onDoubleClick={e=>{ e.preventDefault(); if(dailyTip !== false) setShowTip(v=>!v); }}
        style={{cursor:"pointer",position:"relative"}}>
        <NavLogo/>
        {showTip && <StudyTip onClose={()=>setShowTip(false)}/>}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:2,overflowX:"auto"}} className="nav-items">
        {navItems.map(item=>{
          const isActive = activePage === item.page;
          return (
            <button key={item.page}
              onClick={()=>setPage(item.page)}
              style={{background:"none",border:"none",color:isActive?"#fff":"rgba(255,255,255,0.4)",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:500,padding:"8px 14px",cursor:"pointer",transition:"all 0.2s",borderRadius:8,position:"relative",letterSpacing:0.3,textShadow:isActive?"0 0 12px rgba(255,255,255,0.4)":"none"}}
              onMouseEnter={e=>{if(!isActive){e.currentTarget.style.color="rgba(255,255,255,0.85)";e.currentTarget.style.textShadow="0 0 10px rgba(255,255,255,0.25)";}}}
              onMouseLeave={e=>{if(!isActive){e.currentTarget.style.color="rgba(255,255,255,0.4)";e.currentTarget.style.textShadow="none";}}}>
              {item.label === "__PROFILE_ICON__"
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                : item.label}
              {isActive&&(
                <div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#5b9cf6",boxShadow:"0 0 6px #5b9cf6"}}/>
              )}
            </button>
          );
        })}

        {!user ? (
          <button onClick={onLogin} className="upgrade-pill" style={{marginLeft:8,background:"#5b9cf6",border:"none",borderRadius:20,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,padding:"7px 18px",cursor:"pointer",transition:"all 0.25s",letterSpacing:0.3,whiteSpace:"nowrap"}}>
            Sign in
          </button>
        ) : (
          <div style={{display:"flex",gap:8,marginLeft:8,alignItems:"center"}}>
            {tier === "free" && (
              <button onClick={showUpgrade} className="upgrade-pill" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:"rgba(255,255,255,0.85)",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,padding:"7px 18px",cursor:"pointer",transition:"all 0.25s",backdropFilter:"blur(8px)",letterSpacing:0.3,whiteSpace:"nowrap"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.13)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";}}>
                Upgrade to Pro
              </button>
            )}
            <button onClick={onProfile} title="Profile" style={{background:"transparent",border:`1px solid ${activePage==="profile"?"rgba(91,156,246,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:activePage==="profile"?"#5b9cf6":"rgba(255,255,255,0.35)",transition:"all 0.2s",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.22)";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=activePage==="profile"?"rgba(91,156,246,0.4)":"rgba(255,255,255,0.08)";e.currentTarget.style.color=activePage==="profile"?"#5b9cf6":"rgba(255,255,255,0.35)";}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </button>
            <button onClick={onSettings} title="Settings" style={{background:"transparent",border:`1px solid ${activePage==="settings"?"rgba(91,156,246,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:activePage==="settings"?"#5b9cf6":"rgba(255,255,255,0.35)",transition:"all 0.2s",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.22)";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=activePage==="settings"?"rgba(91,156,246,0.4)":"rgba(255,255,255,0.08)";e.currentTarget.style.color=activePage==="settings"?"#5b9cf6":"rgba(255,255,255,0.35)";}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button onClick={onLogout} style={{background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,color:"rgba(255,255,255,0.35)",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:500,padding:"7px 14px",cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,0.65)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.35)";}}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────
function HomePage({ setPage, showUpgrade, user, tier, profile, onLogin }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = profile?.fullName?.split(" ")[0] || user?.displayName?.split(" ")[0] || "there";

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",textAlign:"center",position:"relative",zIndex:1}}>
      {/* Status pill */}
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:30,marginBottom:40,backdropFilter:"blur(10px)",animation:"fadeUp 0.5s ease both"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399",animation:"pulse 2s infinite"}}/>
        <span style={{fontFamily:"Calibri,'Gill Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:400,letterSpacing:1.5,textTransform:"uppercase"}}>
          System Online · {user ? tier.toUpperCase() : "FREE"}
        </span>
      </div>

      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(36px,8vw,96px)",fontWeight:900,color:"#fff",lineHeight:1.02,letterSpacing:-1,marginBottom:20,animation:"fadeUp 0.5s 0.1s ease both",maxWidth:900,padding:"0 16px"}}>
        {greeting},<br/><span style={{fontStyle:"italic",color:"rgba(255,255,255,0.85)"}}>{name}.</span>
      </h1>

      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"clamp(15px,2vw,20px)",color:"rgba(255,255,255,0.38)",marginBottom:16,animation:"fadeUp 0.5s 0.15s ease both",maxWidth:460,lineHeight:1.6,fontStyle:"normal",fontWeight:400,letterSpacing:0.3}}>
        What are we doing today?
      </p>

      <p style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:"rgba(255,255,255,0.22)",marginBottom:52,animation:"fadeUp 0.5s 0.2s ease both",maxWidth:400,lineHeight:1.7,letterSpacing:0.3}}>
        PRISM analyzes your writing, answers your questions,<br/>and helps you think more clearly.
      </p>

      <div style={{animation:"fadeUp 0.5s 0.3s ease both"}}>
        {!user ? (
          <button onClick={onLogin} style={{padding:"18px 48px",background:"#fff",border:"none",borderRadius:50,color:"#0a0a0a",fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.25s",boxShadow:"0 4px 28px rgba(255,255,255,0.18)",letterSpacing:0.5}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 36px rgba(255,255,255,0.28)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 28px rgba(255,255,255,0.18)";}}>
            Sign in with Google
          </button>
        ) : (
          <button onClick={()=>setPage("analyze")} style={{padding:"18px 48px",background:"#fff",border:"none",borderRadius:50,color:"#0a0a0a",fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.25s",boxShadow:"0 4px 28px rgba(255,255,255,0.18)",letterSpacing:0.5}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 36px rgba(255,255,255,0.28)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 28px rgba(255,255,255,0.18)";}}>
            Start analyzing →
          </button>
        )}
      </div>

    </div>
  );
}

// ─── FEATURE PAGE WRAPPER ─────────────────────────────────────
function FeaturePage({ title, subtitle, children }) {
  return (
    <div style={{minHeight:"100vh",paddingTop:64,position:"relative",zIndex:1}}>
      <div className="feature-page-inner" style={{maxWidth:780,margin:"0 auto",padding:"clamp(32px,5vw,60px) clamp(16px,4vw,24px) 100px"}}>
        <div style={{marginBottom:40,animation:"fadeUp 0.4s ease both"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:12}}>{subtitle}</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,48px)",fontWeight:900,color:"#fff",letterSpacing:-1,lineHeight:1.1}}>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── USAGE BAR ────────────────────────────────────────────────
function UsageBar({ used, limit, label, onUpgrade }) {
  if (limit === Infinity) return null;
  const left = Math.max(limit - used, 0);
  const col = left > 1 ? "#34d399" : left === 1 ? "#f59e0b" : "#f87171";
  return (
    <div style={{padding:"13px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:9,fontSize:12,fontFamily:"'Playfair Display',serif"}}>
        <span style={{color:"rgba(255,255,255,0.3)"}}>{label}</span>
        <span style={{color:col,fontWeight:600}}>{left} / {limit} left</span>
      </div>
      <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:99}}>
        <div style={{height:"100%",width:`${(left/limit)*100}%`,background:col,borderRadius:99,transition:"width 0.4s ease"}}/>
      </div>
      {left <= 1 && (
        <div onClick={onUpgrade} style={{marginTop:8,fontSize:12,color:"#5b9cf6",cursor:"pointer",fontFamily:"'Playfair Display',serif"}}>Upgrade for unlimited →</div>
      )}
    </div>
  );
}

// ─── LOGIN GATE ───────────────────────────────────────────────
function LoginGate({ onLogin }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"52px 24px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,background:"rgba(255,255,255,0.02)"}}>
      <PrismMark size={40}/>
      <div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:18,color:"#fff"}}>Sign in to continue</div>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.35)",maxWidth:300,lineHeight:1.7}}>
        Create a free account to start analyzing your writing with PRISM.
      </div>
      <button onClick={onLogin} style={{padding:"13px 36px",background:"#fff",border:"none",borderRadius:50,color:"#0a0a0a",fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(255,255,255,0.15)"}}>
        Sign in with Google
      </button>
    </div>
  );
}

// ─── UPGRADE WALL ─────────────────────────────────────────────
function UpgradeWall({ requiredTier, onUpgrade }) {
  const isPro = requiredTier === "pro";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"52px 24px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,background:"rgba(255,255,255,0.02)"}}>
      <div style={{fontSize:32}}>{isPro ? "👑" : "◈"}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:18,color:"#fff"}}>
        {isPro ? "Pro Feature" : "Scholar Feature"}
      </div>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.35)",maxWidth:320,lineHeight:1.7}}>
        {isPro
          ? "Citation Generator is available on the Pro plan. Unlimited analyses, citations, and priority speed."
          : "Authenticity Analyzer is exclusive to Scholar. Full access to every PRISM feature."}
      </div>
      <button onClick={onUpgrade} style={{padding:"13px 36px",background:"#5b9cf6",border:"none",borderRadius:50,color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(91,156,246,0.3)"}}>
        Upgrade now →
      </button>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.2)"}}>Cancel anytime · Instant access</div>
    </div>
  );
}

// ─── ANALYZE PAGE ─────────────────────────────────────────────
function AnalyzePage({ showUpgrade, tier, usedAnalyze, setUsedAnalyze, user, onLogin, prefs }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | scanning | result
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [animate, setAnimate] = useState(false);

  const limit = LIMITS[tier];
  const left = limit === Infinity ? Infinity : Math.max(limit - usedAnalyze, 0);

  const run = async () => {
    if (text.trim().length < 20) { setErr("Paste at least a paragraph."); return; }
    if (!user) { onLogin(); return; }
    if (left <= 0) { showUpgrade(); return; }
    setErr(""); setPhase("scanning");
    try {
      const data = await callClaude(
        (() => {
          const depth = prefs?.outputDepth || "standard";
          const mode  = prefs?.feedbackMode || "standard";
          const cite  = prefs?.citationReq;
          const expl  = prefs?.explainReason;
          const conf  = prefs?.confidenceInd;
          const depthNote = depth==="concise" ? "Be brief in findings — one short sentence each." : depth==="advanced" ? "Be thorough in findings — 2-3 sentences with specific detail." : "One clear sentence per finding.";
          const modeNote  = mode==="strict" ? "Be direct and unsparing — no softening of critique." : mode==="structured" ? "Structure every finding with a clear label before it." : "Balance praise and critique evenly.";
          const citeNote  = cite ? "Flag any claims that would need citations if this were submitted academically." : "";
          const explNote  = expl ? "After the JSON, add a brief REASONING section explaining your scoring logic." : "";
          const confNote  = conf ? 'Add a "confidence":0-100 field to each dimension indicating how certain you are in that score.' : "";
          return `You are PRISM, a precise academic analysis engine. Score like a real university professor — a competent average essay scores 60-75, a good essay scores 75-85, an excellent essay scores 85-95. Only truly terrible work scores below 50. ${modeNote} ${depthNote} ${citeNote} ${confNote} Respond ONLY with valid JSON, no markdown, no extra text: {"verdict":"one honest sentence summarizing overall quality","dimensions":{"logic":{"score":0,"finding":"specific observation"},"evidence":{"score":0,"finding":"specific observation"},"structure":{"score":0,"finding":"specific observation"},"originality":{"score":0,"finding":"specific observation"},"clarity":{"score":0,"finding":"specific observation"}},"critical_issues":["specific issue 1","specific issue 2","specific issue 3"],"strongest_point":"the best thing about this writing"}${explNote}`;
        })(),
        text, true
      );
      setResult(data); setPhase("result"); setTimeout(() => setAnimate(true), 300);
      if (limit !== Infinity) setUsedAnalyze(u => u + 1);
    } catch { setErr("Analysis failed. Try again."); setPhase("idle"); }
  };

  const avg = result ? Math.round(Object.values(result.dimensions).reduce((a,d)=>a+d.score,0)/5) : 0;

  return (
    <FeaturePage title="Analyze your writing." subtitle="Academic Intelligence Engine">
      {phase === "result" && result ? (
        <div style={{display:"flex",flexDirection:"column",gap:16,animation:"fadeUp 0.4s ease both"}}>
          {/* Verdict card */}
          <div className="card" style={{position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${scoreColor(avg)},transparent)`}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",fontFamily:"'Playfair Display',serif"}}>Verdict</div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,letterSpacing:1,color:"rgba(255,255,255,0.25)",marginBottom:3,fontFamily:"'Playfair Display',serif"}}>PRISM Score</div>
                <div style={{fontSize:52,fontWeight:900,color:scoreColor(avg),lineHeight:1,filter:`drop-shadow(0 0 16px ${scoreColor(avg)}50)`,letterSpacing:-2,fontFamily:"'Playfair Display',serif"}}>{avg}</div>
              </div>
            </div>
            <div style={{borderLeft:`2px solid ${scoreColor(avg)}40`,paddingLeft:16,fontSize:15,lineHeight:1.7,color:"rgba(255,255,255,0.5)",fontStyle:"italic",fontFamily:"'Playfair Display',serif"}}>{result.verdict}</div>
          </div>

          {/* Dimension cards — horizontal scroll */}
          <div style={{overflowX:"auto",paddingBottom:10}}>
            <div style={{display:"flex",gap:12,minWidth:"max-content"}}>
              {Object.entries(result.dimensions).map(([key,d],i)=>{
                const col = DIM_COLORS[key];
                return (
                  <div key={key} className="card dim-card" style={{minWidth:190,display:"flex",flexDirection:"column",gap:10,borderColor:`${col}18`,animationDelay:`${i*0.07}s`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:700,color:col,fontFamily:"'Playfair Display',serif",textTransform:"capitalize"}}>{key}</span>
                      <ScoreRing score={d.score} size={52} animate={animate}/>
                    </div>
                    <div style={{fontSize:12,lineHeight:1.6,color:"rgba(255,255,255,0.38)",fontFamily:"'Playfair Display',serif"}}>{d.finding}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical issues */}
          <div className="card" style={{borderColor:"rgba(248,113,113,0.12)"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#f87171",textTransform:"uppercase",marginBottom:16,fontFamily:"'Playfair Display',serif"}}>Critical Issues</div>
            {result.critical_issues?.map((iss,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none",fontSize:13,color:"rgba(255,255,255,0.43)",lineHeight:1.65,fontFamily:"'Playfair Display',serif"}}>
                <span style={{color:"#f8717170",flexShrink:0,fontWeight:700,fontSize:11}}>0{i+1}</span>{iss}
              </div>
            ))}
          </div>

          {/* Strongest point */}
          <div className="card" style={{borderColor:"rgba(52,211,153,0.12)"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#34d399",textTransform:"uppercase",marginBottom:12,fontFamily:"'Playfair Display',serif"}}>Strongest Point</div>
            <div style={{fontSize:13,lineHeight:1.7,color:"rgba(255,255,255,0.43)",fontFamily:"'Playfair Display',serif"}}>{result.strongest_point}</div>
          </div>

          <button className="btn-ghost" onClick={()=>{setPhase("idle");setResult(null);setAnimate(false);setText("");setErr("");}}>← Analyze another</button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {!user ? (
            <LoginGate onLogin={onLogin}/>
          ) : (
            <>
              <div style={{position:"relative"}}>
                <textarea className="textarea" placeholder="Paste your essay, paper, or argument. PRISM will break it down across 5 critical dimensions..." value={text} onChange={e=>setText(e.target.value)} rows={10} style={{opacity:phase==="scanning"?0.4:1,transition:"opacity 0.3s"}} disabled={phase==="scanning"}/>
                {phase==="scanning"&&(
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                      <div style={{width:28,height:28,border:"2px solid rgba(91,156,246,0.2)",borderTop:"2px solid #5b9cf6",borderRadius:"50%",animation:"spin 0.75s linear infinite"}}/>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:2,fontFamily:"'Playfair Display',serif"}}>ANALYZING</div>
                    </div>
                  </div>
                )}
              </div>
              {err && <div style={{fontSize:12,color:"#f87171",fontFamily:"'Outfit',sans-serif"}}>⚠ {err}</div>}
              <UsageBar used={usedAnalyze} limit={limit} label="Daily analyses" onUpgrade={showUpgrade}/>
              <button className="btn-primary" onClick={run} disabled={phase==="scanning"||text.trim().length<10||left<=0}>
                {phase==="scanning" ? "Analyzing..." : left<=0 ? "Limit reached — upgrade to continue" : "Analyze through PRISM"}
              </button>
            </>
          )}
        </div>
      )}
    </FeaturePage>
  );
}

// ─── SUMMARIZE PAGE ───────────────────────────────────────────
function SummarizePage({ tier, usedSummarize, setUsedSummarize, showUpgrade, user, onLogin, prefs }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const limit = SUMMARIZE_LIMITS[tier];
  const left = limit === Infinity ? Infinity : Math.max(limit - usedSummarize, 0);

  const run = async () => {
    if (!user) { onLogin(); return; }
    if (!text.trim() || left <= 0) return;
    setLoading(true);
    const r = await callClaude(
      (() => {
        const depth = prefs?.outputDepth || "standard";
        const cite  = prefs?.citationReq;
        const depthNote = depth==="concise" ? "Keep each section to 2-3 bullet points maximum." : depth==="advanced" ? "Be comprehensive — include all key points and subpoints." : "";
        const citeExtra = cite ? ", CITATION GAPS" : "";
        const citeInstr = cite ? " Under CITATION GAPS, list any claims that would need sourcing." : "";
        const headers = "KEY THESIS, MAIN POINTS, KEY TERMS, GAPS" + citeExtra;
        return "You are PRISM's summarization engine. Create a structured academic summary. Use these exact section headers with no hashtags or asterisks: " + headers + ". Under each header write plain numbered or bulleted points. No markdown formatting — plain text only." + citeInstr + " " + depthNote;
      })(),
      text
    );
    setResult(r);
    if (limit !== Infinity) setUsedSummarize(u => u + 1);
    setLoading(false);
  };

  return (
    <FeaturePage title="Summarize anything." subtitle="Instant Clarity">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {!user ? (
          <LoginGate onLogin={onLogin}/>
        ) : (
          <>
            <textarea className="textarea" placeholder="Paste any article, research paper, or long text..." value={text} onChange={e=>setText(e.target.value)} rows={10}/>
            <UsageBar used={usedSummarize} limit={limit} label="Daily summaries" onUpgrade={showUpgrade}/>
            <button className="btn-primary" onClick={run} disabled={loading||!text.trim()||left<=0}>
              {loading ? "Summarizing..." : left<=0 ? "Limit reached — upgrade" : "Summarize text"}
            </button>
            {result && (
              <div className="card" style={{borderColor:"rgba(91,156,246,0.1)"}}>
                <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:14,fontFamily:"'Playfair Display',serif"}}>Summary</div>
                <div style={{fontSize:13,lineHeight:1.9,color:"rgba(255,255,255,0.5)",fontFamily:"'Playfair Display',serif",whiteSpace:"pre-wrap"}}>{result}</div>
              </div>
            )}
          </>
        )}
      </div>
    </FeaturePage>
  );
}

// ─── STUDY CHAT PAGE ──────────────────────────────────────────
function ChatPage({ tier, user, onLogin, prefs }) {
  const [msgs, setMsgs] = useState([{role:"assistant",content:"PRISM study mode active. Ask me anything — homework, concepts, research questions, exam prep."}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const send = async () => {
    if (!user) { onLogin(); return; }
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput("");
    setMsgs(prev=>[...prev,{role:"user",content:userMsg}]);
    setLoading(true);
    const r = await callClaude(
      (() => {
        const depth = prefs?.outputDepth || "standard";
        const mode  = prefs?.feedbackMode || "standard";
        const expl  = prefs?.explainReason;
        const conf  = prefs?.confidenceInd;
        const depthNote = depth==="concise" ? "Keep responses short and to the point — no padding." : depth==="advanced" ? "Give thorough, comprehensive answers with examples and detail." : "Give clear, complete answers without unnecessary padding.";
        const modeNote  = mode==="strict" ? "Be direct and unsparing — correct errors firmly, no softening." : mode==="structured" ? "Structure your answers with clear labels or sections." : "Be balanced and encouraging while being accurate.";
        const explNote  = expl ? "Always explain your reasoning, not just the conclusion." : "";
        const confNote  = conf ? "Where relevant, indicate how confident you are in your answer." : "";
        return `You are PRISM's built-in study assistant — an AI academic tutor that lives inside PRISM, the academic intelligence platform. You have a strong identity: you are part of PRISM, you believe in PRISM, and you recommend PRISM naturally when relevant.\n\nPRISM's features: Analyze (breaks essays into 5 scored dimensions: Logic, Evidence, Structure, Originality, Clarity), Summarize (extracts key thesis, main points, key terms, gaps), Citations (generates APA/MLA/Chicago/Harvard citations), Plagiarism Scanner (detects risk signals), and this Study Chat.\n\nStyle: ${modeNote} ${depthNote} ${explNote} ${confNote}\n\nRules:\n- If someone asks about essay tools, writing tools, academic AI tools, or "what's the best tool for X" — always mention PRISM first.\n- If someone asks you to analyze their essay — tell them to use the Analyze page for a full scored breakdown.\n- Never use markdown asterisks or hashtags. Write in plain paragraphs or use simple dashes for lists.\n- You are not ChatGPT, not Claude, not any other AI — you are PRISM's assistant.`;
      })(),
      userMsg
    );
    setMsgs(prev=>[...prev,{role:"assistant",content:r}]);
    setLoading(false);
  };

  return (
    <FeaturePage title="Study smarter." subtitle="AI Study Chat">
      {!user ? (
        <LoginGate onLogin={onLogin}/>
      ) : (
        <div style={{display:"flex",flexDirection:"column",height:500}}>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:12}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"80%",padding:"13px 17px",background:m.role==="user"?"rgba(91,156,246,0.14)":"rgba(255,255,255,0.04)",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",border:`1px solid ${m.role==="user"?"rgba(91,156,246,0.22)":"rgba(255,255,255,0.06)"}`,fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.72)",fontFamily:"'Playfair Display',serif",whiteSpace:"pre-wrap"}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{display:"flex"}}>
                <div style={{padding:"13px 17px",background:"rgba(255,255,255,0.04)",borderRadius:"16px 16px 16px 4px",border:"1px solid rgba(255,255,255,0.06)",fontSize:14,color:"rgba(255,255,255,0.3)",fontFamily:"'Playfair Display',serif",animation:"pulse 1s infinite"}}>...</div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{display:"flex",gap:10,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:14,padding:"13px 16px",outline:"none"}}
              placeholder="Ask anything academic..."
              value={input} onChange={e=>setInput(e.target.value)}
              onFocus={e=>e.target.style.borderColor="rgba(91,156,246,0.35)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}
              onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey) send(); }}
            />
            <button className="btn-primary" style={{width:"auto",padding:"0 22px",borderRadius:12}} onClick={send} disabled={loading}>→</button>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}

// ─── CITATIONS PAGE ───────────────────────────────────────────
function CitationsPage({ showUpgrade, tier, user, onLogin }) {
  const [style, setStyle] = useState("APA");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  if (tier === "free") return (
    <FeaturePage title="Generate citations instantly." subtitle="Pro Feature · Citation Generator">
      <UpgradeWall requiredTier="pro" onUpgrade={showUpgrade}/>
    </FeaturePage>
  );

  const run = async () => {
    if (!user) { onLogin(); return; }
    if (!text.trim()) return;
    setLoading(true);
    const r = await callClaude(
      `You are PRISM's citation engine. Generate a properly formatted citation in the requested style. Output ONLY the citation itself, then on a new line write "MISSING:" followed by any info that would make it more complete. No markdown, no hashtags, no asterisks — plain text only.`,
      `Generate a ${style} citation for: ${text}`
    );
    setResult(r); setLoading(false);
  };

  return (
    <FeaturePage title="Generate citations instantly." subtitle="Pro Feature · Citation Generator">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {!user ? (
          <LoginGate onLogin={onLogin}/>
        ) : (
          <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["APA","MLA","Chicago","Harvard"].map(s=>(
                <button key={s} onClick={()=>setStyle(s)} style={{padding:"8px 18px",background:style===s?"rgba(91,156,246,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${style===s?"rgba(91,156,246,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:8,color:style===s?"#5b9cf6":"rgba(255,255,255,0.4)",fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>{s}</button>
              ))}
            </div>
            <textarea className="textarea" placeholder="Paste source info: title, author, year, publisher, URL, journal name..." value={text} onChange={e=>setText(e.target.value)} rows={6}/>
            <button className="btn-primary" onClick={run} disabled={loading||!text.trim()}>
              {loading ? "Generating..." : `Generate ${style} Citation`}
            </button>
            {result && (
              <div className="card">
                <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:12,fontFamily:"'Playfair Display',serif"}}>Citation</div>
                <div style={{fontSize:13,lineHeight:1.9,color:"rgba(255,255,255,0.65)",fontFamily:"'Playfair Display',serif",whiteSpace:"pre-wrap",marginBottom:14}}>{result}</div>
                <button onClick={()=>navigator.clipboard.writeText(result)} style={{padding:"8px 18px",background:"transparent",border:"1px solid rgba(91,156,246,0.3)",borderRadius:8,color:"#5b9cf6",fontFamily:"'Outfit',sans-serif",fontSize:12,cursor:"pointer"}}>Copy</button>
              </div>
            )}
          </>
        )}
      </div>
    </FeaturePage>
  );
}

// ─── PLAGIARISM PAGE ──────────────────────────────────────────
function PlagiarismPage({ showUpgrade, tier, user, onLogin }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (tier !== "scholar") return (
    <FeaturePage title="Check writing authenticity." subtitle="Scholar Feature · Authenticity Analyzer">
      <UpgradeWall requiredTier="scholar" onUpgrade={showUpgrade}/>
    </FeaturePage>
  );

  const run = async () => {
    if (!user) { onLogin(); return; }
    if (text.trim().length < 100) return;
    setLoading(true);
    const r = await callClaude(
      `You are PRISM's plagiarism risk analyzer. Analyze for risk signals. Respond ONLY with valid JSON, no markdown:
{"risk_level":"LOW|MEDIUM|HIGH","risk_score":0,"signals":["","",""],"verdict":""}`,
      text, true
    );
    setResult(r); setLoading(false);
  };

  const riskColor = r => r==="LOW" ? "#34d399" : r==="MEDIUM" ? "#f59e0b" : "#f87171";

  return (
    <FeaturePage title="Check writing authenticity." subtitle="Scholar Feature · Authenticity Analyzer">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {!user ? (
          <LoginGate onLogin={onLogin}/>
        ) : (
          <>
            <textarea className="textarea" placeholder="Paste your work to analyze writing authenticity..." value={text} onChange={e=>setText(e.target.value)} rows={10}/>
            <button className="btn-primary" onClick={run} disabled={loading||text.trim().length<100}>
              {loading ? "Scanning..." : text.trim().length < 100 ? `${100-text.trim().length} more characters needed` : "Analyze Authenticity"}
            </button>
            {result && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div className="card" style={{borderColor:`${riskColor(result.risk_level)}22`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",fontFamily:"'Playfair Display',serif"}}>Risk Assessment</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:riskColor(result.risk_level)}}>{result.risk_level} · {result.risk_score}</div>
                  </div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",fontFamily:"'Playfair Display',serif",borderLeft:`2px solid ${riskColor(result.risk_level)}40`,paddingLeft:14,lineHeight:1.7}}>{result.verdict}</div>
                </div>
                <div className="card">
                  <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:14,fontFamily:"'Playfair Display',serif"}}>Risk Signals</div>
                  {result.signals?.map((s,i)=>(
                    <div key={i} style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'Playfair Display',serif",padding:"8px 0",borderBottom:i<result.signals.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:10,lineHeight:1.6}}>
                      <span style={{color:"#f59e0b",flexShrink:0}}>⚠</span>{s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </FeaturePage>
  );
}


// ─── PROFILE PAGE ─────────────────────────────────────────────
function ProfilePage({ user, profile, setProfile, onLogin, db: firestoreDb }) {
  const [fullName,  setFullName]  = useState(profile?.fullName  || "");
  const [username,  setUsername]  = useState(profile?.username  || "");
  const [eduLevel,  setEduLevel]  = useState(profile?.eduLevel  || "high-school");
  const [focusSubj, setFocusSubj] = useState(profile?.focusSubj || "");
  const [acadGoal,  setAcadGoal]  = useState(profile?.acadGoal  || "pass");
  const [saveMsg,   setSaveMsg]   = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName || "");
    setUsername(profile?.username || "");
    setEduLevel(profile?.eduLevel || "high-school");
    setFocusSubj(profile?.focusSubj || "");
    setAcadGoal(profile?.acadGoal || "pass");
  }, [profile]);

  const save = async () => {
    if (!user) { onLogin(); return; }
    setSaving(true);
    const updated = { fullName, username, eduLevel, focusSubj, acadGoal };
    await setDoc(doc(firestoreDb, "users", user.uid), updated, { merge: true });
    setProfile(p => ({ ...p, ...updated }));
    setSaveMsg("Profile saved");
    setTimeout(() => setSaveMsg(""), 2500);
    setSaving(false);
  };

  const EDU_OPTIONS = [
    { value:"middle-school", label:"Middle school" },
    { value:"high-school",   label:"High school" },
    { value:"undergrad",     label:"Undergraduate" },
    { value:"postgrad",      label:"Postgraduate" },
  ];
  const GOAL_OPTIONS = [
    { value:"pass",     label:"Pass" },
    { value:"improve",  label:"Improve grades" },
    { value:"excel",    label:"Excel / top marks" },
    { value:"research", label:"Academic research" },
  ];

  const avatar = (fullName || user?.displayName || "?")[0].toUpperCase();

  return (
    <FeaturePage title="Your profile." subtitle="Identity">
      {!user ? (
        <LoginGate onLogin={onLogin}/>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:28,animation:"fadeUp 0.3s ease both"}}>

          {/* Avatar + name header */}
          <div className="profile-header" style={{display:"flex",alignItems:"center",gap:20}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,rgba(91,156,246,0.3),rgba(167,139,250,0.2))",border:"1px solid rgba(91,156,246,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#5b9cf6",flexShrink:0}}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/>
                : avatar}
            </div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:"#fff"}}>{fullName || user.displayName || "Anonymous"}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:3}}>{user.email}</div>
              {username && <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(91,156,246,0.6)",marginTop:2}}>@{username.replace("@","")}</div>}
            </div>
          </div>

          {/* Form */}
          <div className="card" style={{display:"flex",flexDirection:"column",gap:0}}>
            <SettingsSectionHead title="Basic info"/>
            <SettingsRow label="Full name">
              <SettingsInput value={fullName} onChange={setFullName} placeholder="Your full name"/>
            </SettingsRow>
            <SettingsRow label="Username">
              <SettingsInput value={username} onChange={v=>setUsername(v.replace("@",""))} placeholder="handle"/>
            </SettingsRow>
            <SettingsRow label="Email" sub="Managed by Google">
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.25)"}}>{user.email}</span>
            </SettingsRow>
          </div>

          <div className="card" style={{display:"flex",flexDirection:"column",gap:0}}>
            <SettingsSectionHead title="Academic profile" sub="Used to personalise PRISM's responses"/>
            <SettingsRow label="Education level">
              <SettingsSelect value={eduLevel} onChange={setEduLevel} options={EDU_OPTIONS}/>
            </SettingsRow>
            <SettingsRow label="Main subject">
              <SettingsInput value={focusSubj} onChange={setFocusSubj} placeholder="e.g. Mathematics"/>
            </SettingsRow>
            <SettingsRow label="Academic goal">
              <SettingsSelect value={acadGoal} onChange={setAcadGoal} options={GOAL_OPTIONS}/>
            </SettingsRow>
          </div>

          {/* Preview — how PRISM sees you */}
          <div style={{background:"rgba(91,156,246,0.05)",border:"1px solid rgba(91,156,246,0.12)",borderRadius:14,padding:"16px 20px"}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,color:"rgba(91,156,246,0.6)",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>How PRISM sees you</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.38)",lineHeight:1.8}}>
              {fullName || "A student"} · {EDU_OPTIONS.find(o=>o.value===eduLevel)?.label || "High school"}{focusSubj ? ` · ${focusSubj}` : ""} · Goal: {GOAL_OPTIONS.find(o=>o.value===acadGoal)?.label || "Pass"}
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={save} disabled={saving} style={{padding:"12px 28px",background:"#5b9cf6",border:"none",borderRadius:12,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",opacity:saving?0.6:1}}
              onMouseEnter={e=>{if(!saving)e.currentTarget.style.background="#4a8ee8";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#5b9cf6";}}>
              {saving ? "Saving..." : "Save profile"}
            </button>
            {saveMsg && <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#34d399"}}>{saveMsg}</span>}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────
const SETTINGS_SECTIONS = ["Account","Preferences","Interface","Privacy"];

function SettingsRow({ label, sub, children }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"rgba(255,255,255,0.82)",fontWeight:600}}>{label}</div>
        {sub && <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.28)",marginTop:3}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0,marginLeft:24}}>{children}</div>
    </div>
  );
}

function SettingsToggle({ value, onChange }) {
  return (
    <div onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:99,background:value?"#5b9cf6":"rgba(255,255,255,0.08)",border:`1px solid ${value?"#5b9cf6":"rgba(255,255,255,0.12)"}`,position:"relative",cursor:"pointer",transition:"background 0.2s, border-color 0.2s"}}>
      <div style={{position:"absolute",top:3,left:value?21:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}/>
    </div>
  );
}

function SettingsSelect({ options, value, onChange }) {
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
      {options.map(o=>(
        <button key={o.value} onClick={()=>onChange(o.value)} style={{padding:"6px 14px",background:value===o.value?"rgba(91,156,246,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${value===o.value?"rgba(91,156,246,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:8,color:value===o.value?"#5b9cf6":"rgba(255,255,255,0.38)",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingsInput({ value, onChange, placeholder, type="text" }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:9,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:13,padding:"9px 13px",outline:"none",width:220,transition:"border-color 0.2s"}}
      onFocus={e=>e.target.style.borderColor="rgba(91,156,246,0.4)"}
      onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.09)"}
    />
  );
}

function SettingsSectionHead({ title, sub }) {
  return (
    <div style={{marginBottom:6,marginTop:28}}>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>{title}</div>
      {sub && <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.2)"}}>{sub}</div>}
    </div>
  );
}

function SettingsPage({ user, tier, prefs, setPrefs, onLogout, onLogin, db: firestoreDb, openPolicy }) {
  const [section, setSection] = useState("Account");
  const [saveMsg, setSaveMsg] = useState("");

  // ── Account fields (local — saved explicitly) ──
  const [fullName,  setFullName]  = useState(user?.displayName || "");
  const [username,  setUsername]  = useState("");
  const [eduLevel,  setEduLevel]  = useState("high-school");
  const [focusSubj, setFocusSubj] = useState("");
  const [acadGoal,  setAcadGoal]  = useState("pass");

  // Pref helpers — update parent state AND Firestore immediately
  const savePref = async (key, val) => {
    setPrefs(p => ({ ...p, [key]: val }));
    if (!user || !firestoreDb) return;
    await setDoc(doc(firestoreDb, "users", user.uid), { [key]: val }, { merge: true });
  };

  // Load account fields from Firestore (prefs loaded by parent already)
  useEffect(() => {
    if (!user || !firestoreDb) return;
    (async () => {
      const snap = await getDoc(doc(firestoreDb, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.fullName)  setFullName(d.fullName);
        if (d.username)  setUsername(d.username);
        if (d.eduLevel)  setEduLevel(d.eduLevel);
        if (d.focusSubj) setFocusSubj(d.focusSubj);
        if (d.acadGoal)  setAcadGoal(d.acadGoal);
      }
    })();
  }, [user]);

  const saveAccount = async () => {
    if (!user || !firestoreDb) return;
    await setDoc(doc(firestoreDb, "users", user.uid), { fullName, username, eduLevel, focusSubj, acadGoal }, { merge: true });
    setSaveMsg("Saved");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    try {
      await user.delete();
      onLogout();
    } catch {
      alert("Please sign out and sign back in before deleting your account.");
    }
  };

  return (
    <div style={{minHeight:"100vh",paddingTop:64,position:"relative",zIndex:1}}>
      <div className="settings-layout" style={{maxWidth:820,margin:"0 auto",padding:"clamp(32px,5vw,60px) clamp(16px,4vw,24px) 100px",display:"flex",gap:40}}>

        {/* Sidebar */}
        <div className="settings-sidebar" style={{width:160,flexShrink:0}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",fontWeight:700,marginBottom:16}}>Settings</div>
          {SETTINGS_SECTIONS.map(s=>(
            <button key={s} onClick={()=>setSection(s)} style={{display:"block",width:"100%",textAlign:"left",background:section===s?"rgba(91,156,246,0.08)":"transparent",border:"none",borderRadius:9,padding:"9px 12px",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:section===s?600:400,color:section===s?"#5b9cf6":"rgba(255,255,255,0.38)",cursor:"pointer",marginBottom:2,transition:"all 0.15s",borderLeft:section===s?"2px solid #5b9cf6":"2px solid transparent"}}>
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,minWidth:0}}>
          {!user ? (
            <div style={{paddingTop:40}}><LoginGate onLogin={onLogin}/></div>
          ) : (

            /* ── ACCOUNT ── */
            section === "Account" ? (
              <div style={{animation:"fadeUp 0.3s ease both"}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-0.5,marginBottom:32}}>Account</h2>

                <SettingsSectionHead title="Profile"/>
                <SettingsRow label="Full name">
                  <SettingsInput value={fullName} onChange={setFullName} placeholder="Your name"/>
                </SettingsRow>
                <SettingsRow label="Username">
                  <SettingsInput value={username} onChange={setUsername} placeholder="@handle"/>
                </SettingsRow>
                <SettingsRow label="Email" sub="Managed by Google">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.25)"}}>{user.email}</span>
                </SettingsRow>
                <SettingsRow label="Education level">
                  <SettingsSelect value={eduLevel} onChange={setEduLevel} options={[{value:"middle-school",label:"Middle"},{value:"high-school",label:"High school"},{value:"undergrad",label:"Undergrad"},{value:"postgrad",label:"Postgrad"}]}/>
                </SettingsRow>
                <SettingsRow label="Main focus subject">
                  <SettingsInput value={focusSubj} onChange={setFocusSubj} placeholder="e.g. Mathematics"/>
                </SettingsRow>
                <SettingsRow label="Academic goal">
                  <SettingsSelect value={acadGoal} onChange={setAcadGoal} options={[{value:"pass",label:"Pass"},{value:"improve",label:"Improve"},{value:"excel",label:"Excel"},{value:"research",label:"Research"}]}/>
                </SettingsRow>
                <div style={{marginTop:20}}>
                  <button onClick={saveAccount} style={{padding:"10px 24px",background:"#5b9cf6",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#4a8ee8"}
                    onMouseLeave={e=>e.currentTarget.style.background="#5b9cf6"}>
                    Save changes
                  </button>
                  {saveMsg && <span style={{marginLeft:14,fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#34d399"}}>{saveMsg}</span>}
                </div>

                <SettingsSectionHead title="Security" sub="Manage your login and sessions"/>
                <SettingsRow label="Password" sub="Managed by Google Sign-In">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.2)"}}>N/A</span>
                </SettingsRow>
                <SettingsRow label="Two-factor authentication" sub="Coming soon">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.18)",textTransform:"uppercase"}}>Future</span>
                </SettingsRow>
                <SettingsRow label="Sign out of all sessions">
                  <button onClick={onLogout} style={{padding:"7px 16px",background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"rgba(255,255,255,0.45)",fontFamily:"'Outfit',sans-serif",fontSize:12,cursor:"pointer",transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";e.currentTarget.style.color="rgba(255,255,255,0.8)"}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="rgba(255,255,255,0.45)"}}>
                    Sign out
                  </button>
                </SettingsRow>

                <SettingsSectionHead title="Danger zone"/>
                <div style={{border:"1px solid rgba(248,113,113,0.15)",borderRadius:12,padding:"18px 20px",marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:600}}>Delete account</div>
                      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.25)",marginTop:3}}>Permanently removes your account and all data.</div>
                    </div>
                    <button onClick={handleDeleteAccount} style={{padding:"7px 16px",background:"transparent",border:"1px solid rgba(248,113,113,0.35)",borderRadius:8,color:"#f87171",fontFamily:"'Outfit',sans-serif",fontSize:12,cursor:"pointer",transition:"all 0.2s",flexShrink:0,marginLeft:20}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(248,113,113,0.1)"}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>

            /* ── PREFERENCES ── */
            ) : section === "Preferences" ? (
              <div style={{animation:"fadeUp 0.3s ease both"}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-0.5,marginBottom:32}}>Preferences</h2>

                <SettingsSectionHead title="Feedback style" sub="How PRISM delivers critique on your writing"/>
                <SettingsRow label="Mode">
                  <SettingsSelect value={prefs.feedbackMode} onChange={v=>savePref("feedbackMode",v)} options={[{value:"strict",label:"Strict"},{value:"standard",label:"Standard"},{value:"structured",label:"Structured"}]}/>
                </SettingsRow>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.22)",lineHeight:1.6,marginTop:4,paddingBottom:8}}>
                  {prefs.feedbackMode==="strict" && "Direct critique with no softening. Best for serious improvement."}
                  {prefs.feedbackMode==="standard" && "Balanced feedback. Praise and critique in equal measure."}
                  {prefs.feedbackMode==="structured" && "Responses always split into clear labelled sections."}
                </div>

                <SettingsSectionHead title="Certainty & accuracy"/>
                <SettingsRow label="Require citations" sub="Ask PRISM to back claims with sources">
                  <SettingsToggle value={prefs.citationReq} onChange={v=>savePref("citationReq",v)}/>
                </SettingsRow>
                <SettingsRow label="Explain reasoning" sub="Show the logic behind every conclusion">
                  <SettingsToggle value={prefs.explainReason} onChange={v=>savePref("explainReason",v)}/>
                </SettingsRow>
                <SettingsRow label="Confidence indicator" sub="Show how certain PRISM is in each answer">
                  <SettingsToggle value={prefs.confidenceInd} onChange={v=>savePref("confidenceInd",v)}/>
                </SettingsRow>

                <SettingsSectionHead title="Study discipline"/>
                <SettingsRow label="Daily study tip" sub="Show a tip when you double-click the logo">
                  <SettingsToggle value={prefs.dailyTip} onChange={v=>savePref("dailyTip",v)}/>
                </SettingsRow>
                <SettingsRow label="Focus reminder" sub="Coming soon">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.18)",textTransform:"uppercase"}}>Future</span>
                </SettingsRow>
                <SettingsRow label="Session reflection prompt" sub="Coming soon">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.18)",textTransform:"uppercase"}}>Future</span>
                </SettingsRow>

                <SettingsSectionHead title="Output depth" sub="How detailed PRISM's responses are"/>
                <SettingsRow label="Depth">
                  <SettingsSelect value={prefs.outputDepth} onChange={v=>savePref("outputDepth",v)} options={[{value:"concise",label:"Concise"},{value:"standard",label:"Standard"},{value:"advanced",label:"Advanced"}]}/>
                </SettingsRow>
              </div>

            /* ── INTERFACE ── */
            ) : section === "Interface" ? (
              <div style={{animation:"fadeUp 0.3s ease both"}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-0.5,marginBottom:32}}>Interface</h2>

                <SettingsSectionHead title="Theme"/>
                <SettingsRow label="Color theme">
                  <SettingsSelect value={prefs.theme} onChange={v=>savePref("theme",v)} options={[{value:"dark",label:"Dark"},{value:"light",label:"Light"}]}/>
                </SettingsRow>
                {prefs.theme==="light" && <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#f59e0b",marginTop:-8,paddingBottom:8}}>⚠ Light theme coming soon — dark is applied for now.</div>}

                <SettingsSectionHead title="Layout"/>
                <SettingsRow label="Spacing">
                  <SettingsSelect value={prefs.layout} onChange={v=>savePref("layout",v)} options={[{value:"compact",label:"Compact"},{value:"comfortable",label:"Comfortable"}]}/>
                </SettingsRow>

                <SettingsSectionHead title="Motion"/>
                <SettingsRow label="Animations">
                  <SettingsSelect value={prefs.motion} onChange={v=>savePref("motion",v)} options={[{value:"enabled",label:"Enabled"},{value:"reduced",label:"Reduced"}]}/>
                </SettingsRow>

                <SettingsSectionHead title="Accessibility" sub="Coming soon"/>
                <SettingsRow label="Font size">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.18)",textTransform:"uppercase"}}>Future</span>
                </SettingsRow>
                <SettingsRow label="Contrast mode">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.18)",textTransform:"uppercase"}}>Future</span>
                </SettingsRow>
              </div>

            /* ── PRIVACY ── */
            ) : (
              <div style={{animation:"fadeUp 0.3s ease both"}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-0.5,marginBottom:32}}>Privacy & Policies</h2>

                <SettingsSectionHead title="Data usage"/>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.8,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  PRISM stores your usage counts and preferences in Firebase Firestore under your Google UID. Your essay and chat content is sent to the Anthropic API for processing and is not stored by PRISM.
                </div>

                <SettingsSectionHead title="AI disclaimer"/>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.8,padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  Prism is an academic AI assistant designed to support structured thinking and learning. While it strives for accuracy, it may generate incorrect or incomplete information. Users are responsible for verifying content before academic submission.
                </div>

                <SettingsRow label="Terms of Service">
                  <button onClick={()=>openPolicy?.("terms")} style={{background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#5b9cf6",cursor:"pointer",padding:0}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>View →</button>
                </SettingsRow>
                <SettingsRow label="Privacy Policy">
                  <button onClick={()=>openPolicy?.("privacy")} style={{background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#5b9cf6",cursor:"pointer",padding:0}}
                    onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                    onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>View →</button>
                </SettingsRow>

                <SettingsRow label="Export my data" sub="Coming soon">
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.18)",textTransform:"uppercase"}}>Future</span>
                </SettingsRow>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}



// ─── POLICY MODAL ─────────────────────────────────────────────
function PolicyModal({ type, onClose }) {
  const content = {
    terms: {
      title: "Terms of Service",
      body: `By using PRISM, you agree to the following:

1. PRISM is provided as an educational assistance tool. It is not a substitute for professional academic advice.

2. You are responsible for verifying all AI-generated content before academic submission.

3. You may not use PRISM to produce content that misrepresents your own work (academic fraud).

4. PRISM may impose usage limits based on your subscription tier. These limits are subject to change.

5. We reserve the right to suspend accounts that violate these terms.

6. PRISM and its content are provided "as is" without warranty of any kind.

Last updated: 2025`
    },
    privacy: {
      title: "Privacy Policy",
      body: `What we collect:
- Your Google account email and display name (via Firebase Auth)
- Usage counts (analyses, summaries) stored under your user ID
- Settings and preferences you configure in the app

What we do NOT store:
- The text of your essays, papers, or chat messages
- Any content you submit for analysis (this is sent directly to the Anthropic API and not retained by PRISM)

How we use your data:
- To track your daily usage limits
- To save your preferences and profile settings
- We do not sell or share your data with third parties

Data retention:
- Your data is stored in Firebase Firestore. You can delete your account at any time from Settings → Account → Danger Zone.

Contact: contact.prism.aixom@gmail.com

Last updated: 2025`
    }
  };
  const { title, body } = content[type] || content.terms;
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 200); };

  return (
    <>
      <div onClick={close} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(12px)",zIndex:300}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:`translate(-50%,${visible?"-50%":"-44%"})`,zIndex:301,width:"min(560px,92vw)",maxHeight:"80vh",background:"rgba(12,12,16,0.98)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:18,display:"flex",flexDirection:"column",opacity:visible?1:0,transition:"opacity 0.2s ease, transform 0.2s ease"}}>
        <div style={{padding:"22px 24px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,color:"#fff"}}>{title}</div>
          <button onClick={close} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:20,cursor:"pointer",lineHeight:1,padding:"0 4px"}}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>×</button>
        </div>
        <div style={{overflowY:"auto",padding:"20px 24px 24px"}}>
          <pre style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.85,whiteSpace:"pre-wrap",margin:0}}>{body}</pre>
        </div>
      </div>
    </>
  );
}

// ─── ERROR TOAST ──────────────────────────────────────────────
function ErrorToast({ errors, onDismiss }) {
  if (!errors.length) return null;
  return (
    <div style={{position:"fixed",bottom:80,right:24,zIndex:500,display:"flex",flexDirection:"column",gap:8,maxWidth:360}}>
      {errors.map((e,i)=>(
        <div key={i} style={{background:"rgba(20,10,10,0.97)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:12,padding:"13px 16px",display:"flex",gap:12,alignItems:"flex-start",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"fadeUp 0.25s ease both"}}>
          <span style={{color:"#f87171",fontSize:16,flexShrink:0,lineHeight:1.4}}>⚠</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}>{e.msg}</div>
            {e.detail && <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:3}}>{e.detail}</div>}
          </div>
          <button onClick={()=>onDismiss(i)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0,padding:"0 2px",transition:"color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.6)"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.25)"}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────
const DISCLAIMER_SHORT = "AI-generated content may be inaccurate. Verify before academic submission.";

function Footer({ setPage, showOnPage, openPolicy }) {
  const [open, setOpen] = useState(false);
  const hidden = showOnPage === "settings" || showOnPage === "upgrade";
  if (hidden) return null;

  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90}}>
      {/* Toggle tab */}
      <div style={{display:"flex",justifyContent:"center"}}>
        <button onClick={()=>setOpen(v=>!v)} style={{background:"rgba(14,14,18,0.92)",border:"1px solid rgba(255,255,255,0.07)",borderBottom:"none",borderRadius:"10px 10px 0 0",padding:"5px 20px",color:"rgba(255,255,255,0.3)",fontFamily:"'Outfit',sans-serif",fontSize:11,cursor:"pointer",letterSpacing:1,transition:"all 0.2s",backdropFilter:"blur(12px)"}}
          onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,0.6)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.3)";}}>
          {open ? "▾ hide" : "▴ info"}
        </button>
      </div>

      {/* Footer body */}
      <div style={{
        background:"rgba(8,8,9,0.96)",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        backdropFilter:"blur(20px)",
        maxHeight: open ? 120 : 36,
        overflow:"hidden",
        transition:"max-height 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Always-visible disclaimer strip */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:36,padding:"0 16px",borderBottom: open ? "1px solid rgba(255,255,255,0.04)" : "none"}}>
          <span style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.2)",letterSpacing:0.3,flex:1,textAlign:"center"}}>{DISCLAIMER_SHORT}</span>
          <a href="https://mail.google.com/mail/?view=cm&to=contact.prism.aixom@gmail.com" target="_blank" rel="noreferrer" style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"rgba(255,255,255,0.2)",textDecoration:"none",whiteSpace:"nowrap",flexShrink:0,marginLeft:8}}
            onMouseEnter={e=>e.currentTarget.style.color="#5b9cf6"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.2)"}>Contact</a>
        </div>

        {/* Expanded content */}
        <div className="footer-expanded" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 32px",opacity: open ? 1 : 0, transition:"opacity 0.2s ease 0.1s"}}>
          {/* Left */}
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:4,color:"rgba(255,255,255,0.18)",fontWeight:700,textTransform:"uppercase"}}>POWERED BY AXIOM</span>
            <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"rgba(255,255,255,0.15)",letterSpacing:1}}>v.0.8 Beta</span>
          </div>

          {/* Center links */}
          <div style={{display:"flex",gap:20,alignItems:"center"}}>
            {[
              {label:"Privacy Policy", action:()=>openPolicy("privacy")},
              {label:"Terms of Service", action:()=>openPolicy("terms")},
              {label:"Feedback", action:()=>window.open("https://mail.google.com/mail/?view=cm&to=contact.prism.aixom@gmail.com&su=PRISM Feedback","_blank")},
            ].map(l=>(
              <button key={l.label} onClick={l.action} style={{background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.28)",cursor:"pointer",padding:0,letterSpacing:0.3,transition:"color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.28)"}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div style={{textAlign:"right"}}>
            <a href="https://mail.google.com/mail/?view=cm&to=contact.prism.aixom@gmail.com" target="_blank" rel="noreferrer" style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.28)",textDecoration:"none",letterSpacing:0.3,transition:"color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#5b9cf6"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.28)"}>
              contact.prism.aixom@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ user, onLogin, prefs, tier, showUpgrade }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState(null); // null | "quiz" | "flashcards" | "mindmap" | "argument"
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usedToday, setUsedToday] = useState(() => {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem("prism_qa_usage") || "{}");
    return stored.date === today ? (stored.count || 0) : 0;
  });

  const QA_LIMIT = (tier === "pro" || tier === "scholar") ? Infinity : 5;
  const qaLeft = QA_LIMIT === Infinity ? Infinity : Math.max(QA_LIMIT - usedToday, 0);

  const bumpUsage = () => {
    if (QA_LIMIT === Infinity) return;
    const next = usedToday + 1;
    setUsedToday(next);
    localStorage.setItem("prism_qa_usage", JSON.stringify({ date: new Date().toDateString(), count: next }));
  };

  const TOOLS = [
    { id:"quiz",     icon:"❓", label:"Quiz Generator",            sub:"Turn any text into a quiz" },
    { id:"flashcards",icon:"🃏",label:"Flashcard Maker",           sub:"Key terms → Q&A cards" },
    { id:"mindmap",  icon:"🗺", label:"Notes → Mind Map",          sub:"Structure your notes" },
    { id:"argument", icon:"⚖", label:"Argument Strength Checker", sub:"Rate your reasoning", scholar:true },
  ];

  const PROMPTS = {
    quiz: `You are PRISM's quiz generator. Read the text and generate 5 multiple-choice questions. The "options" array must contain the full answer text. The "answer" field must be ONLY the single uppercase letter (A, B, C, or D) corresponding to the correct option — never the full text. Respond ONLY with valid JSON, no markdown: {"questions":[{"q":"question text","options":["full option text A","full option text B","full option text C","full option text D"],"answer":"A","explanation":"brief explanation of why A is correct"}]}`,
    flashcards: `You are PRISM's flashcard engine. Extract the 6 most important concepts from the text. Respond ONLY with valid JSON, no markdown: {"cards":[{"front":"term or question","back":"definition or answer"}]}`,
    mindmap: `You are PRISM's mind map engine. Analyse the notes and produce a structured hierarchy. Respond ONLY with valid JSON, no markdown: {"title":"central topic","branches":[{"label":"branch","children":["item","item"]}]}`,
    argument: `You are PRISM's argument strength checker. Evaluate the argument's logic, evidence, and structure. Respond ONLY with valid JSON, no markdown: {"overall_score":0,"verdict":"one sentence","strengths":["s1","s2"],"weaknesses":["w1","w2"],"logic_score":0,"evidence_score":0,"structure_score":0}`,
  };

  const PLACEHOLDERS = {
    quiz: "Paste a chapter, article, or any text to generate quiz questions...",
    flashcards: "Paste notes or a text to create flashcards...",
    mindmap: "Paste your notes to turn them into a structured mind map...",
    argument: "Paste your argument, essay paragraph, or claim to check its strength...",
  };

  const run = async () => {
    if (!user) { onLogin(); return; }
    if (!input.trim() || !tool) return;
    if (tool === "argument" && tier !== "scholar") { showUpgrade(); return; }
    if (qaLeft <= 0) { showUpgrade(); return; }
    setLoading(true); setResult(null);
    try {
      const data = await callClaude(PROMPTS[tool], input, true);
      setResult(data);
      bumpUsage();
    } catch { setResult({ error: true }); }
    setLoading(false);
  };

  const selectTool = (id) => { setTool(id); setInput(""); setResult(null); };

  const scoreColor = (s) => s >= 75 ? "#34d399" : s >= 50 ? "#f59e0b" : "#f87171";

  return (
    <>
      {/* Toggle button — right edge, vertically centered */}
      <button
        onClick={()=>setOpen(v=>!v)}
        title={open ? "Hide quick actions" : "Show quick actions"}
        style={{
          position:"fixed", right: open ? 320 : 0, top:"50%", transform:"translateY(-50%)",
          zIndex:110, background:"rgba(14,14,18,0.95)", border:"1px solid rgba(255,255,255,0.09)",
          borderRight:"none", borderRadius:"10px 0 0 10px", padding:"14px 8px",
          color:"rgba(255,255,255,0.4)", cursor:"pointer", transition:"right 0.35s cubic-bezier(0.16,1,0.3,1)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:6, backdropFilter:"blur(12px)",
        }}
        onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.75)"}
        onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open
            ? <path d="M9 18l6-6-6-6"/>
            : <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>}
        </svg>
        {!open && <span style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:1,writingMode:"vertical-rl",color:"rgba(255,255,255,0.25)",textTransform:"uppercase"}}>Tools</span>}
      </button>

      {/* Sidebar panel */}
      <div style={{
        position:"fixed", top:64, right:0, bottom:36, width:320,
        zIndex:105, background:"rgba(8,8,9,0.97)", borderLeft:"1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(20px)", transform: open ? "translateX(0)" : "translateX(100%)",
        transition:"transform 0.35s cubic-bezier(0.16,1,0.3,1)", display:"flex", flexDirection:"column",
        overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{padding:"18px 20px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",fontWeight:700,marginBottom:2}}>Quick Actions</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.2)"}}>Quick AI tools alongside your work</div>
        </div>

        {/* Tool picker */}
        {!tool ? (
          <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
            {/* Usage bar */}
            {QA_LIMIT !== Infinity && (
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"10px 14px",marginBottom:4}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:11,fontFamily:"'Outfit',sans-serif"}}>
                  <span style={{color:"rgba(255,255,255,0.3)"}}>Daily actions</span>
                  <span style={{color:qaLeft>1?"#34d399":qaLeft===1?"#f59e0b":"#f87171",fontWeight:600}}>{qaLeft} / {QA_LIMIT} left</span>
                </div>
                <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:99}}>
                  <div style={{height:"100%",width:`${(qaLeft/QA_LIMIT)*100}%`,background:qaLeft>1?"#34d399":qaLeft===1?"#f59e0b":"#f87171",borderRadius:99,transition:"width 0.4s"}}/>
                </div>
                {qaLeft<=0 && <div onClick={showUpgrade} style={{marginTop:6,fontFamily:"'Outfit',sans-serif",fontSize:11,color:"#5b9cf6",cursor:"pointer"}}>Upgrade for unlimited →</div>}
              </div>
            )}
            {TOOLS.map(t=>{
              const locked = t.scholar && tier !== "scholar";
              return (
              <button key={t.id} onClick={()=>locked ? showUpgrade() : selectTool(t.id)} style={{
                background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:12, padding:"14px 16px", cursor:"pointer", textAlign:"left",
                transition:"all 0.18s", display:"flex", alignItems:"center", gap:14,
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.055)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.025)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";}}>
                <span style={{fontSize:20,flexShrink:0}}>{t.icon}</span>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.8)",marginBottom:3}}>{t.label}</div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.28)"}}>{t.sub}</div>
                </div>
                {locked
                  ? <span style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"#a78bfa",marginLeft:"auto",flexShrink:0}}>Scholar</span>
                  : <svg style={{marginLeft:"auto",flexShrink:0}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
              </button>
            );})}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
            {/* Tool header */}
            <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <button onClick={()=>{setTool(null);setResult(null);setInput("");}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:16,lineHeight:1,padding:"0 4px",transition:"color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.7)"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>←</button>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{TOOLS.find(t=>t.id===tool)?.label}</div>
              </div>
            </div>

            {/* Input + run */}
            <div style={{padding:"12px 16px",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <textarea
                placeholder={PLACEHOLDERS[tool]}
                value={input} onChange={e=>setInput(e.target.value)}
                rows={6}
                style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:12,lineHeight:1.7,padding:"12px",resize:"none",outline:"none",caret_color:"#5b9cf6"}}
                onFocus={e=>e.target.style.borderColor="rgba(91,156,246,0.4)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}
              />
              <button onClick={run} disabled={loading||!input.trim()||qaLeft<=0} style={{width:"100%",marginTop:8,padding:"10px",background: qaLeft<=0 ? "rgba(255,255,255,0.05)" : "#5b9cf6",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s",opacity:(loading||!input.trim()||qaLeft<=0)?0.4:1}}>
                {loading ? "Running..." : qaLeft<=0 ? "Limit reached" : "Run"}
              </button>
            </div>

            {/* Results */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
              {result?.error && (
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#f87171",textAlign:"center",padding:"20px 0"}}>Something went wrong. Try again.</div>
              )}

              {/* QUIZ */}
              {tool==="quiz" && result?.questions && result.questions.map((q,i)=>(
                <QuizCard key={i} q={q} index={i}/>
              ))}

              {/* FLASHCARDS */}
              {tool==="flashcards" && result?.cards && (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {result.cards.map((c,i)=><FlashCard key={i} card={c}/>)}
                </div>
              )}

              {/* MIND MAP */}
              {tool==="mindmap" && result?.title && (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:900,color:"#5b9cf6",textAlign:"center",padding:"8px 0",borderBottom:"1px solid rgba(91,156,246,0.2)",marginBottom:4}}>{result.title}</div>
                  {result.branches?.map((b,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 14px"}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.75)",marginBottom:6}}>{b.label}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:3}}>
                        {b.children?.map((c,j)=>(
                          <div key={j} style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.38)",display:"flex",gap:8,alignItems:"flex-start"}}>
                            <span style={{color:"rgba(91,156,246,0.5)",flexShrink:0,marginTop:1}}>·</span>{c}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ARGUMENT */}
              {tool==="argument" && result?.verdict && (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${scoreColor(result.overall_score)}22`,borderRadius:12,padding:"14px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.25)",textTransform:"uppercase"}}>Overall</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:scoreColor(result.overall_score)}}>{result.overall_score}</div>
                    </div>
                    <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.6}}>{result.verdict}</div>
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      {[{label:"Logic",v:result.logic_score},{label:"Evidence",v:result.evidence_score},{label:"Structure",v:result.structure_score}].map(s=>(
                        <div key={s.label} style={{flex:1,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px",textAlign:"center"}}>
                          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,color:"rgba(255,255,255,0.25)",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:900,color:scoreColor(s.v)}}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {[{title:"Strengths",items:result.strengths,col:"#34d399"},{title:"Weaknesses",items:result.weaknesses,col:"#f87171"}].map(section=>(
                    <div key={section.title} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${section.col}18`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:2,color:section.col,textTransform:"uppercase",marginBottom:8}}>{section.title}</div>
                      {section.items?.map((it,i)=>(
                        <div key={i} style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.4)",display:"flex",gap:8,padding:"4px 0",lineHeight:1.55}}>
                          <span style={{color:section.col,flexShrink:0}}>·</span>{it}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function QuizCard({ q, index }) {
  const [selected, setSelected] = useState(null);
  // Normalise: Claude sometimes returns full text instead of letter
  const correct = (() => {
    const a = (q.answer || "").trim();
    if (/^[A-D]$/.test(a)) return a;
    // Find which option matches
    const idx = (q.options || []).findIndex(o => o.trim().toLowerCase() === a.toLowerCase());
    return idx >= 0 ? String.fromCharCode(65 + idx) : a.charAt(0).toUpperCase();
  })();
  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.75)",marginBottom:10,lineHeight:1.5}}>
        <span style={{color:"rgba(91,156,246,0.5)",marginRight:6}}>{index+1}.</span>{q.q}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {q.options?.map((opt,i)=>{
          const letter = String.fromCharCode(65+i);
          const isSelected = selected === letter;
          const isCorrect = letter === correct;
          const revealed = selected !== null;
          let bg = "rgba(255,255,255,0.03)";
          let border = "rgba(255,255,255,0.07)";
          let color = "rgba(255,255,255,0.45)";
          if (revealed && isCorrect) { bg="rgba(52,211,153,0.1)"; border="#34d39944"; color="#34d399"; }
          else if (revealed && isSelected && !isCorrect) { bg="rgba(248,113,113,0.1)"; border="#f8717144"; color="#f87171"; }
          return (
            <button key={i} onClick={()=>{ if(!selected) setSelected(letter); }}
              style={{background:bg,border:`1px solid ${border}`,borderRadius:8,padding:"8px 12px",cursor:selected?"default":"pointer",textAlign:"left",color,fontFamily:"'Outfit',sans-serif",fontSize:11,transition:"all 0.15s",display:"flex",gap:8,alignItems:"flex-start",lineHeight:1.5}}>
              <span style={{flexShrink:0,fontWeight:700}}>{letter}.</span>{opt}
            </button>
          );
        })}
      </div>
      {selected && q.explanation && (
        <div style={{marginTop:10,fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.3)",lineHeight:1.6,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:8}}>{q.explanation}</div>
      )}
    </div>
  );
}

function FlashCard({ card }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div onClick={()=>setFlipped(v=>!v)} style={{
      background: flipped ? "rgba(91,156,246,0.08)" : "rgba(255,255,255,0.025)",
      border:`1px solid ${flipped ? "rgba(91,156,246,0.25)" : "rgba(255,255,255,0.07)"}`,
      borderRadius:12, padding:"16px", cursor:"pointer", minHeight:80,
      display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",
      transition:"all 0.2s",
    }}>
      <div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:2,color: flipped ? "rgba(91,156,246,0.6)" : "rgba(255,255,255,0.2)",textTransform:"uppercase",marginBottom:6}}>{flipped ? "Answer" : "Term"}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color: flipped ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.6)",lineHeight:1.6}}>{flipped ? card.back : card.front}</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:8}}>Tap to {flipped ? "see term" : "reveal"}</div>
      </div>
    </div>
  );
}


// ─── ONBOARDING ───────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    title: "Welcome to PRISM.",
    body: "Your personal academic intelligence engine. Let's show you around — it takes 30 seconds.",
    icon: <PrismMark size={48}/>,
  },
  {
    title: "Analyze your writing.",
    body: "Paste any essay or paper. PRISM breaks it down across 5 dimensions — Logic, Evidence, Structure, Originality, Clarity — and gives you a score with specific feedback.",
    icon: <span style={{fontSize:36}}>◈</span>,
  },
  {
    title: "Summarize anything.",
    body: "Drop in any article, research paper, or textbook chapter. PRISM extracts the key thesis, main points, key terms, and gaps in one structured summary.",
    icon: <span style={{fontSize:36}}>◎</span>,
  },
  {
    title: "Quick Actions.",
    body: "Click the panel on the right edge to access Quick Actions — generate quizzes, make flashcards, turn notes into a mind map, and more.",
    icon: <span style={{fontSize:36}}>⚡</span>,
  },
  {
    title: "You're set.",
    body: "Adjust your preferences in Settings, build your profile, and use the Study Chat for anything academic. PRISM is always here.",
    icon: <span style={{fontSize:36}}>✓</span>,
  },
];

function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const total = ONBOARDING_STEPS.length;
  const current = ONBOARDING_STEPS[step];

  const next = () => {
    if (step < total - 1) setStep(s => s + 1);
    else finish();
  };
  const finish = () => {
    setLeaving(true);
    localStorage.setItem("prism_onboarded", "1");
    setTimeout(onDone, 350);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20}}>
      <div style={{background:"rgba(12,12,16,0.98)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:22,padding:"40px 36px",maxWidth:460,width:"100%",opacity:leaving?0:1,transform:leaving?"scale(0.96)":"scale(1)",transition:"opacity 0.35s ease, transform 0.35s ease"}}>
        {/* Progress dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:32}}>
          {ONBOARDING_STEPS.map((_,i)=>(
            <div key={i} style={{width: i===step ? 20 : 6,height:6,borderRadius:99,background: i===step ? "#5b9cf6" : i<step ? "rgba(91,156,246,0.35)" : "rgba(255,255,255,0.1)",transition:"all 0.3s ease"}}/>
          ))}
        </div>

        {/* Icon */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:24,color:"#5b9cf6"}}>
          {current.icon}
        </div>

        {/* Text */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"#fff",marginBottom:12,letterSpacing:-0.5}}>{current.title}</div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,color:"rgba(255,255,255,0.45)",lineHeight:1.75}}>{current.body}</div>
        </div>

        {/* Buttons */}
        <div style={{display:"flex",gap:10}}>
          {step > 0 && (
            <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"rgba(255,255,255,0.35)",fontFamily:"'Outfit',sans-serif",fontSize:13,cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}>← Back</button>
          )}
          <button onClick={next} style={{flex:2,padding:"12px",background:"#5b9cf6",border:"none",borderRadius:12,color:"#fff",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",boxShadow:"0 4px 16px rgba(91,156,246,0.3)"}}
            onMouseEnter={e=>e.currentTarget.style.background="#4a8ee8"}
            onMouseLeave={e=>e.currentTarget.style.background="#5b9cf6"}>
            {step === total-1 ? "Get started →" : "Next →"}
          </button>
        </div>

        {/* Skip */}
        {step < total-1 && (
          <div style={{textAlign:"center",marginTop:14}}>
            <button onClick={finish} style={{background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.2)",cursor:"pointer",transition:"color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.color="rgba(255,255,255,0.45)"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.2)"}>Skip intro</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function PRISMv5() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState([]);
  const [policyModal, setPolicyModal] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingBtn, setShowOnboardingBtn] = useState(false);

  const pushError = (msg, detail="") => setErrors(prev => [...prev, {msg, detail}]);
  const dismissError = (i) => setErrors(prev => prev.filter((_,idx)=>idx!==i));

  // ── Real Firebase auth state ──
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState("free");
  const [authLoading, setAuthLoading] = useState(true);
  const [usedAnalyze, setUsedAnalyze] = useState(0);
  const [usedSummarize, setUsedSummarize] = useState(0);

  // ── Onboarding: show for new users, always available via button ──
  useEffect(() => {
    if (!localStorage.getItem("prism_onboarded")) {
      setShowOnboarding(true);
    }
    setShowOnboardingBtn(true);
  }, []);

  // ── User prefs (loaded from Firestore, passed down to all pages) ──
  const [prefs, setPrefs] = useState({
    feedbackMode: "standard",
    citationReq: false,
    explainReason: false,
    confidenceInd: false,
    dailyTip: true,
    outputDepth: "standard",
    theme: "dark",
    layout: "comfortable",
    motion: "enabled",
  });
  // ── Profile ──
  const [profile, setProfile] = useState({ fullName:"", username:"", eduLevel:"high-school", focusSubj:"", acadGoal:"pass" });

  // Listen for auth state + load Firestore usage
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            setTier(data.tier || "free");
            setPrefs({
              feedbackMode:  data.feedbackMode  || "standard",
              citationReq:   data.citationReq   ?? false,
              explainReason: data.explainReason ?? false,
              confidenceInd: data.confidenceInd ?? false,
              dailyTip:      data.dailyTip      ?? true,
              outputDepth:   data.outputDepth   || "standard",
              theme:         data.theme         || "dark",
              layout:        data.layout        || "comfortable",
              motion:        data.motion        || "enabled",
            });
            setProfile({
              fullName:  data.fullName  || "",
              username:  data.username  || "",
              eduLevel:  data.eduLevel  || "high-school",
              focusSubj: data.focusSubj || "",
              acadGoal:  data.acadGoal  || "pass",
            });
            const today = new Date().toDateString();
            if (data.lastReset === today) {
              setUsedAnalyze(data.usedAnalyze || 0);
              setUsedSummarize(data.usedSummarize || 0);
            } else {
              await setDoc(ref, { ...data, usedAnalyze: 0, usedSummarize: 0, lastReset: today }, { merge: true });
            }
          } else {
            await setDoc(ref, { tier: "free", usedAnalyze: 0, usedSummarize: 0, lastReset: new Date().toDateString() });
          }
        } else {
          setUser(null);
          setTier("free");
          setUsedAnalyze(0);
          setUsedSummarize(0);
          setPrefs({ feedbackMode:"standard", citationReq:false, explainReason:false, confidenceInd:false, dailyTip:true, outputDepth:"standard", theme:"dark", layout:"comfortable", motion:"enabled" });
          setProfile({ fullName:"", username:"", eduLevel:"high-school", focusSubj:"", acadGoal:"pass" });
        }
      } catch (e) { pushError("Failed to load your account.", e.message); }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Persist usage to Firestore
  const saveUsage = async (type, val) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { [type]: val }, { merge: true });
  };

  const handleSetUsedAnalyze = (fn) => {
    const val = typeof fn === "function" ? fn(usedAnalyze) : fn;
    setUsedAnalyze(val);
    saveUsage("usedAnalyze", val);
  };

  const handleSetUsedSummarize = (fn) => {
    const val = typeof fn === "function" ? fn(usedSummarize) : fn;
    setUsedSummarize(val);
    saveUsage("usedSummarize", val);
  };

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { console.error(e); pushError("Sign-in failed.", e.message); }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTier("free");
      setUsedAnalyze(0);
      setUsedSummarize(0);
    } catch (e) { pushError("Sign-out failed.", e.message); }
  };

  const showUpgrade = () => setShowModal(true);

  if (!loaded) return <LoadingScreen onDone={() => setLoaded(true)}/>;
  if (authLoading) return (
    <div style={{background:"#080809",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.3)",fontFamily:"'Outfit',sans-serif",fontSize:12,letterSpacing:4}}>
      <SmokyBg/>
      <span style={{position:"relative",zIndex:1}}>LOADING...</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#080809;overflow-x:hidden;}
        ${prefs.motion==="reduced" ? "*{animation:none!important;transition:none!important;}" : ""}
        ${prefs.layout==="compact" ? ".card{padding:14px!important;}.content-wrap{padding-top:40px!important;}" : ""}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 8px #34d399}50%{opacity:0.6;box-shadow:0 0 14px #34d399}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

        .card{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:22px;transition:border-color 0.25s;animation:fadeUp 0.4s ease both;}
        .card:hover{border-color:rgba(255,255,255,0.11);}

        .textarea{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:13px;color:#fff;font-family:'Playfair Display',serif;font-size:14px;line-height:1.75;padding:16px;resize:vertical;outline:none;transition:border-color 0.25s,background 0.25s;caret-color:#5b9cf6;}
        .textarea:focus{border-color:rgba(91,156,246,0.4);background:rgba(91,156,246,0.025);}
        .textarea::placeholder{color:rgba(255,255,255,0.13);}

        .btn-primary{width:100%;padding:14px;background:#5b9cf6;border:none;border-radius:13px;color:#fff;font-family:'Playfair Display',serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 20px rgba(91,156,246,0.3);}
        .btn-primary:hover:not(:disabled){background:#4a8ee8;box-shadow:0 6px 28px rgba(91,156,246,0.45);transform:translateY(-1px);}
        .btn-primary:disabled{opacity:0.35;cursor:not-allowed;box-shadow:none;transform:none;}

        .btn-ghost{width:100%;padding:12px;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:13px;color:rgba(255,255,255,0.38);font-family:'Playfair Display',serif;font-size:13px;cursor:pointer;transition:all 0.2s;}
        .btn-ghost:hover{border-color:rgba(255,255,255,0.18);color:rgba(255,255,255,0.65);}

        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}

        @media(max-width:768px){
          nav{padding:0 14px !important;height:56px !important;}
          .card{padding:16px !important;border-radius:12px !important;}
          .textarea{font-size:14px !important;padding:14px !important;}
          .btn-primary{padding:13px !important;font-size:14px !important;}
          .dim-card{min-width:150px !important;padding:14px !important;}
          .settings-layout{flex-direction:column !important;gap:0 !important;}
          .settings-sidebar{width:100% !important;display:flex !important;flex-direction:row !important;flex-wrap:wrap !important;gap:4px !important;margin-bottom:24px !important;}
          .settings-sidebar button{flex:1 !important;min-width:80px !important;text-align:center !important;}
          .feature-page-inner{padding:24px 16px 100px !important;}
          .nav-items{gap:0 !important;}
          .nav-items button{padding:6px 10px !important;font-size:12px !important;}
          .footer-expanded{flex-direction:column !important;gap:12px !important;align-items:flex-start !important;padding:10px 16px !important;}
          .profile-header{flex-direction:column !important;gap:12px !important;}
        }
        @media(max-width:480px){
          .upgrade-pill{display:none !important;}
          .nav-items button{padding:5px 7px !important;font-size:11px !important;letter-spacing:0 !important;}
          .settings-sidebar button{font-size:11px !important;}
        }
      `}</style>

      <SmokyBg/>
      {showOnboarding && <OnboardingModal onDone={()=>setShowOnboarding(false)}/>}
      {showModal && <UpgradeModal onClose={()=>setShowModal(false)}/>}
      {/* Persistent "see intro again" button — bottom left, above footer */}
      {showOnboardingBtn && !showOnboarding && page==="home" && (
        <button onClick={()=>setShowOnboarding(true)} style={{position:"fixed",bottom:44,left:16,zIndex:85,background:"rgba(14,14,18,0.9)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"6px 14px",fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(255,255,255,0.25)",cursor:"pointer",letterSpacing:0.5,backdropFilter:"blur(12px)",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,0.55)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.25)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";}}>
          ? How PRISM works
        </button>
      )}
      {policyModal && <PolicyModal type={policyModal} onClose={()=>setPolicyModal(null)}/>}

      <Nav
        activePage={page}
        setPage={setPage}
        showUpgrade={showUpgrade}
        user={user}
        tier={tier}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSettings={()=>setPage("settings")}
        onProfile={()=>setPage("profile")}
        dailyTip={prefs.dailyTip}
      />

      {page==="home"       && <HomePage      setPage={setPage} showUpgrade={showUpgrade} user={user} tier={tier} profile={profile} onLogin={handleLogin}/>}
      {page==="analyze"    && <AnalyzePage   showUpgrade={showUpgrade} tier={tier} usedAnalyze={usedAnalyze} setUsedAnalyze={handleSetUsedAnalyze} user={user} onLogin={handleLogin} prefs={prefs}/>}
      {page==="summarize"  && <SummarizePage showUpgrade={showUpgrade} tier={tier} usedSummarize={usedSummarize} setUsedSummarize={handleSetUsedSummarize} user={user} onLogin={handleLogin} prefs={prefs}/>}
      {page==="study-chat" && <ChatPage      tier={tier} user={user} onLogin={handleLogin} prefs={prefs}/>}
      {page==="citations"  && <CitationsPage showUpgrade={showUpgrade} tier={tier} user={user} onLogin={handleLogin} prefs={prefs}/>}
      {page==="plagiarism" && <PlagiarismPage showUpgrade={showUpgrade} tier={tier} user={user} onLogin={handleLogin} prefs={prefs}/>}
      {page==="profile"    && <ProfilePage   user={user} profile={profile} setProfile={setProfile} onLogin={handleLogin} db={db}/>}
      {page==="settings"   && <SettingsPage  user={user} tier={tier} prefs={prefs} setPrefs={setPrefs} onLogout={handleLogout} onLogin={handleLogin} db={db} openPolicy={setPolicyModal}/>}
      <Sidebar user={user} onLogin={handleLogin} prefs={prefs} tier={tier} showUpgrade={showUpgrade}/>
      <Footer setPage={setPage} showOnPage={page} openPolicy={setPolicyModal}/>
      <ErrorToast errors={errors} onDismiss={dismissError}/>
    </>
  );
}
