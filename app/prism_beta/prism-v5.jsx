import React, { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────
const MOCK_USER = { name: "Maciej", tier: "free" };

const MOCK_RESULT = {
  verdict: "A competent essay with a clear thesis, but the evidence is thin and originality is limited by relying on familiar arguments.",
  dimensions: {
    logic: { score: 74, finding: "Arguments follow a coherent structure with clear cause-and-effect reasoning." },
    evidence: { score: 58, finding: "Several key claims are asserted without supporting sources or citations." },
    structure: { score: 78, finding: "Well-organized with a clear introduction, body, and conclusion." },
    originality: { score: 52, finding: "The central argument is familiar and doesn't offer a fresh perspective." },
    clarity: { score: 81, finding: "Prose is clean and precise — ideas are communicated without unnecessary complexity." },
  },
  critical_issues: [
    "Paragraph 3 makes a strong claim about economic impact with no data or source.",
    "The counterargument section is dismissed too quickly without engaging fully.",
    "The conclusion introduces a new idea not developed in the body.",
  ],
  strongest_point: "The opening paragraph immediately establishes a clear, arguable thesis.",
};

const DIM_COLORS = {
  logic: "#5b9cf6", evidence: "#34d399", structure: "#f59e0b",
  originality: "#a78bfa", clarity: "#f87171",
};

function scoreColor(s) { return s >= 75 ? "#34d399" : s >= 50 ? "#f59e0b" : "#f87171"; }

// ─── PRISM LOGO MARK (triangle only, scalable) ───────────────
function PrismMark({ size = 32 }) {
  const s = size;
  const ax = s*0.5, ay = s*0.04;
  const bl = s*0.04, br = s*0.96, by = s*0.94;
  const cx = s*0.5, cy = s*0.60;
  const mbx = s*0.5, mby = s*0.94;
  const mlx = (ax+bl)/2, mly = (ay+by)/2;
  const mrx = (ax+br)/2, mry = (ay+by)/2;
  const sw = s*0.028;
  const dsw = s*0.011;
  const da = `${s*0.055} ${s*0.048}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
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

// ─── NAV LOGO (greyscale default, blue on hover, no text) ────
function NavLogo() {
  const [hovered, setHovered] = React.useState(false);
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

// ─── FULL PRISM LOGO (mark + wordmark) ───────────────────────// ─── FULL PRISM LOGO (mark + wordmark) ───────────────────────
function PrismLogo({ height = 36 }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:height*0.25}}>
      <PrismMark size={height}/>
      <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:height*1.1,letterSpacing:"0.04em",lineHeight:1,fontWeight:400}}>
        <span style={{color:"#ffffff",fontWeight:400}}>PRI</span><span style={{color:"#5b9cf6",fontWeight:400}}>SM</span>
      </span>
    </div>
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
        style={{transition:"stroke-dashoffset 0.03s linear",filter:`drop-shadow(0 0 4px ${col}70)`}}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={col}
        style={{font:`700 ${Math.round(size*0.22)}px 'Playfair Display',serif`}}>{d}</text>
    </svg>
  );
}

// ─── SMOKY BACKGROUND ─────────────────────────────────────────
function SmokyBg() {
  const canvasRef = React.useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    // Smoke particles
    const particles = Array.from({length: 6}, (_, i) => ({
      x: w * (0.45 + Math.random() * 0.55),
      y: h * (0.05 + Math.random() * 0.7),
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.08,
      r: w * (0.18 + Math.random() * 0.25),
      opacity: 0.06 + Math.random() * 0.07,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf;
    let t = 0;
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
        // Smoke is warm grey/white like the reference
        grad.addColorStop(0, `rgba(210,210,215,${pulse})`);
        grad.addColorStop(0.3, `rgba(180,180,188,${pulse * 0.6})`);
        grad.addColorStop(0.65, `rgba(140,140,150,${pulse * 0.25})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.65, Math.sin(t * 0.3 + i) * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Subtle vignette
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

// ─── UPGRADE MODAL ────────────────────────────────────────────
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
      features:[{t:"Unlimited analyses",ok:true},{t:"Unlimited summaries",ok:true},{t:"Study Chat",ok:true},{t:"Citations",ok:true},{t:"Authenticity",ok:false}],
    },
    {
      key:"scholar", name:"Scholar", price:"€19", period:"/mo", color:"#a78bfa",
      badge:"◈ Full Access", cta:"Get Scholar", ctaOff:false,
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
              <button disabled={plan.ctaOff} style={{width:"100%",padding:"10px 0",background:plan.highlight?"#5b9cf6":"transparent",border:`1px solid ${plan.ctaOff?"rgba(255,255,255,0.07)":plan.color}`,borderRadius:10,color:plan.highlight?"#fff":plan.ctaOff?"rgba(255,255,255,0.18)":plan.color,fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,cursor:plan.ctaOff?"default":"pointer"}}>{plan.cta}</button>
            </div>
          ))}
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,color:"rgba(255,255,255,0.15)",textAlign:"center",marginBottom:12}}>🔒 Secure · Cancel anytime · Instant access</div>
        <button onClick={onClose} style={{width:"100%",padding:11,background:"transparent",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,color:"rgba(255,255,255,0.2)",fontFamily:"'Playfair Display',serif",fontSize:13,cursor:"pointer"}}>Maybe later</button>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────
function Nav({ activePage, setPage, showUpgrade, user }) {
  const navItems = ["Analyze","Summarize","Study Chat","Citations","Plagiarism"];
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 40px",height:64,backdropFilter:"blur(20px)",background:"rgba(10,10,10,0.6)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
      {/* Logo - greyscale normally, blue on hover */}
      <div onClick={()=>setPage("home")} style={{cursor:"pointer"}}
        onMouseEnter={e=>e.currentTarget.querySelector('svg g, svg line, svg circle') && e.currentTarget.setAttribute('data-hover','1')}
        onMouseLeave={e=>e.currentTarget.removeAttribute('data-hover')}>
        <NavLogo/>
      </div>

      {/* Nav items */}
      <div style={{display:"flex",alignItems:"center",gap:2,overflowX:"auto"}} className="nav-items">
        {navItems.map(item=>{
          const isActive = activePage===item.toLowerCase().replace(" ","-");
          return (
            <button key={item}
              onClick={()=>setPage(item.toLowerCase().replace(" ","-"))}
              style={{background:"none",border:"none",color:isActive?"#fff":"rgba(255,255,255,0.4)",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:500,padding:"8px 14px",cursor:"pointer",transition:"all 0.2s",borderRadius:8,position:"relative",letterSpacing:0.3,textShadow:isActive?"0 0 12px rgba(255,255,255,0.4)":"none"}}
              onMouseEnter={e=>{if(!isActive){e.currentTarget.style.color="rgba(255,255,255,0.85)";e.currentTarget.style.textShadow="0 0 10px rgba(255,255,255,0.25)";}}}
              onMouseLeave={e=>{if(!isActive){e.currentTarget.style.color="rgba(255,255,255,0.4)";e.currentTarget.style.textShadow="none";}}}>
              {item}
              {isActive&&(
                <div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#5b9cf6",boxShadow:"0 0 6px #5b9cf6"}}/>
              )}
            </button>
          );
        })}
        <button onClick={showUpgrade} className="upgrade-pill" style={{marginLeft:8,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:"rgba(255,255,255,0.85)",fontFamily:"'Outfit',sans-serif",fontSize:12,fontWeight:600,padding:"7px 18px",cursor:"pointer",transition:"all 0.25s",backdropFilter:"blur(8px)",letterSpacing:0.3,whiteSpace:"nowrap"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.13)";e.currentTarget.style.boxShadow="0 0 16px rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
          Upgrade to Pro
        </button>
      </div>
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────
function HomePage({ setPage, showUpgrade, user }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = user?.name || "there";

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",textAlign:"center",position:"relative",zIndex:1}}>

      {/* Status pill */}
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:30,marginBottom:40,backdropFilter:"blur(10px)",animation:"fadeUp 0.5s ease both"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399",animation:"pulse 2s infinite"}}/>
        <span style={{fontFamily:"Calibri,'Gill Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:400,letterSpacing:1.5,textTransform:"uppercase"}}>System Online · Free</span>
      </div>

      {/* Main heading */}
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(36px,8vw,96px)",fontWeight:900,color:"#fff",lineHeight:1.02,letterSpacing:-1,marginBottom:20,animation:"fadeUp 0.5s 0.1s ease both",maxWidth:900,padding:"0 16px"}}>
        {greeting},<br/><span style={{fontStyle:"italic",color:"rgba(255,255,255,0.85)"}}>{name}.</span>
      </h1>

      {/* Subtext */}
      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:"clamp(15px,2vw,20px)",color:"rgba(255,255,255,0.38)",marginBottom:16,animation:"fadeUp 0.5s 0.15s ease both",maxWidth:460,lineHeight:1.6,fontStyle:"normal",fontWeight:400,letterSpacing:0.3}}>
        What are we doing today?
      </p>

      {/* Detail line */}
      <p style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:"rgba(255,255,255,0.22)",marginBottom:52,animation:"fadeUp 0.5s 0.2s ease both",maxWidth:400,lineHeight:1.7,letterSpacing:0.3}}>
        PRISM analyzes your writing, answers your questions,<br/>and helps you think more clearly.
      </p>

      {/* Single centered CTA */}
      <div style={{animation:"fadeUp 0.5s 0.3s ease both"}}>
        <button onClick={()=>setPage("analyze")} style={{padding:"18px 48px",background:"#fff",border:"none",borderRadius:50,color:"#0a0a0a",fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.25s",boxShadow:"0 4px 28px rgba(255,255,255,0.18)",letterSpacing:0.5}}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 36px rgba(255,255,255,0.28)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 28px rgba(255,255,255,0.18)";}}>
          Sign in with Google
        </button>
      </div>



      {/* Powered by AXIOM */}
      <div style={{position:"absolute",bottom:36,left:0,right:0,display:"flex",justifyContent:"center",animation:"fadeUp 0.5s 0.5s ease both"}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:5,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",fontWeight:700}}>
          POWERED BY AXIOM
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE PAGE WRAPPER ─────────────────────────────────────
function FeaturePage({ title, subtitle, children }) {
  return (
    <div style={{minHeight:"100vh",paddingTop:64,position:"relative",zIndex:1}}>
      <div style={{maxWidth:780,margin:"0 auto",padding:"clamp(32px,5vw,60px) clamp(16px,4vw,24px) 100px"}}>
        <div style={{marginBottom:40,animation:"fadeUp 0.4s ease both"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:12}}>{subtitle}</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,5vw,48px)",fontWeight:900,color:"#fff",letterSpacing:-1,lineHeight:1.1}}>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── ANALYZE PAGE ─────────────────────────────────────────────
function AnalyzePage({ showUpgrade }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("idle");
  const [animate, setAnimate] = useState(false);
  const used = 1;

  const fakeAnalyze = () => {
    if (text.trim().length < 5) return;
    setPhase("scanning");
    setTimeout(() => { setPhase("result"); setTimeout(() => setAnimate(true), 150); }, 2200);
  };

  const avg = Math.round(Object.values(MOCK_RESULT.dimensions).reduce((a,d)=>a+d.score,0)/5);

  return (
    <FeaturePage title="Analyze your writing." subtitle="Academic Intelligence Engine">
      {phase === "result" ? (
        <div style={{display:"flex",flexDirection:"column",gap:16,animation:"fadeUp 0.4s ease both"}}>
          {/* Verdict */}
          <div className="card" style={{position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${scoreColor(avg)},transparent)`}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",fontFamily:"'Playfair Display',serif"}}>Verdict</div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,letterSpacing:1,color:"rgba(255,255,255,0.25)",marginBottom:3,fontFamily:"'Playfair Display',serif"}}>PRISM Score</div>
                <div style={{fontSize:52,fontWeight:900,color:scoreColor(avg),lineHeight:1,filter:`drop-shadow(0 0 16px ${scoreColor(avg)}50)`,letterSpacing:-2,fontFamily:"'Playfair Display',serif"}}>{avg}</div>
              </div>
            </div>
            <div style={{borderLeft:`2px solid ${scoreColor(avg)}40`,paddingLeft:16,fontSize:15,lineHeight:1.7,color:"rgba(255,255,255,0.5)",fontStyle:"italic",fontFamily:"'Playfair Display',serif"}}>{MOCK_RESULT.verdict}</div>
          </div>

          {/* Dims horizontal scroll */}
          <div style={{overflowX:"auto",paddingBottom:10}}>
            <div style={{display:"flex",gap:12,minWidth:"max-content"}}>
              {Object.entries(MOCK_RESULT.dimensions).map(([key,d],i)=>{
                const col = DIM_COLORS[key];
                return (
                  <div key={key} className="card" style={{minWidth:190,display:"flex",flexDirection:"column",gap:10,borderColor:`${col}18`,animationDelay:`${i*0.07}s`}}>
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

          {/* Issues */}
          <div className="card" style={{borderColor:"rgba(248,113,113,0.12)"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#f87171",textTransform:"uppercase",marginBottom:16,fontFamily:"'Playfair Display',serif"}}>Critical Issues</div>
            {MOCK_RESULT.critical_issues.map((iss,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none",fontSize:13,color:"rgba(255,255,255,0.43)",lineHeight:1.65,fontFamily:"'Playfair Display',serif"}}>
                <span style={{color:"#f8717170",flexShrink:0,fontWeight:700,fontSize:11}}>0{i+1}</span>{iss}
              </div>
            ))}
          </div>

          {/* Strongest */}
          <div className="card" style={{borderColor:"rgba(52,211,153,0.12)"}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#34d399",textTransform:"uppercase",marginBottom:12,fontFamily:"'Playfair Display',serif"}}>Strongest Point</div>
            <div style={{fontSize:13,lineHeight:1.7,color:"rgba(255,255,255,0.43)",fontFamily:"'Playfair Display',serif"}}>{MOCK_RESULT.strongest_point}</div>
          </div>

          <button className="btn-ghost" onClick={()=>{setPhase("idle");setAnimate(false);setText("");}}>← Analyze another</button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{position:"relative"}}>
            <textarea className="textarea" placeholder="Paste your essay, paper, or argument. PRISM will break it down across 5 critical dimensions..." value={text} onChange={e=>setText(e.target.value)} rows={10} style={{opacity:phase==="scanning"?0.4:1,transition:"opacity 0.3s"}} disabled={phase==="scanning"}/>
            {phase==="scanning"&&(
              <div style={{position:"absolute",inset:0,top:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                  <div style={{width:28,height:28,border:"2px solid rgba(91,156,246,0.2)",borderTop:"2px solid #5b9cf6",borderRadius:"50%",animation:"spin 0.75s linear infinite"}}/>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:2,fontFamily:"'Playfair Display',serif"}}>ANALYZING</div>
                </div>
              </div>
            )}
          </div>
          {/* Usage */}
          <div style={{padding:"13px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:9,fontSize:12,fontFamily:"'Playfair Display',serif"}}>
              <span style={{color:"rgba(255,255,255,0.3)"}}>Daily analyses</span>
              <span style={{color:"#f59e0b",fontWeight:600}}>{3-used} / 3 left</span>
            </div>
            <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:99}}>
              <div style={{height:"100%",width:`${((3-used)/3)*100}%`,background:"#f59e0b",borderRadius:99}}/>
            </div>
            <div onClick={showUpgrade} style={{marginTop:8,fontSize:12,color:"#5b9cf6",cursor:"pointer",fontFamily:"'Playfair Display',serif"}}>Upgrade for unlimited →</div>
          </div>
          <button className="btn-primary" onClick={fakeAnalyze} disabled={phase==="scanning"||text.trim().length<5}>
            {phase==="scanning"?"Analyzing...":"Analyze through PRISM"}
          </button>
        </div>
      )}
    </FeaturePage>
  );
}

// ─── SUMMARIZE PAGE ───────────────────────────────────────────
function SummarizePage() {
  const [text, setText] = useState("");
  return (
    <FeaturePage title="Summarize anything." subtitle="Instant Clarity">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <textarea className="textarea" placeholder="Paste any article, research paper, or long text..." value={text} onChange={e=>setText(e.target.value)} rows={10}/>
        <button className="btn-primary" disabled={!text.trim()}>Summarize</button>
      </div>
    </FeaturePage>
  );
}

// ─── CHAT PAGE ────────────────────────────────────────────────
function ChatPage() {
  const [msgs, setMsgs] = useState([{role:"assistant",content:"PRISM study mode active. Ask me anything — homework, concepts, research questions, exam prep."}]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  return (
    <FeaturePage title="Study smarter." subtitle="AI Study Chat">
      <div style={{display:"flex",flexDirection:"column",height:500}}>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"13px 17px",background:m.role==="user"?"rgba(91,156,246,0.14)":"rgba(255,255,255,0.04)",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",border:`1px solid ${m.role==="user"?"rgba(91,156,246,0.22)":"rgba(255,255,255,0.06)"}`,fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.72)",fontFamily:"'Playfair Display',serif"}}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div style={{display:"flex",gap:10,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <input style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:14,padding:"13px 16px",outline:"none"}}
            placeholder="Ask anything academic..."
            value={input} onChange={e=>setInput(e.target.value)}
            onFocus={e=>e.target.style.borderColor="rgba(91,156,246,0.35)"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}
            onKeyDown={e=>{
              if(e.key==="Enter"&&input.trim()){
                setMsgs(p=>[...p,{role:"user",content:input},{role:"assistant",content:"This is a preview. Visit prism-ai-os.vercel.app and sign in to use the real study chat."}]);
                setInput("");
              }
            }}
          />
          <button className="btn-primary" style={{width:"auto",padding:"0 22px",borderRadius:12}}>→</button>
        </div>
      </div>
    </FeaturePage>
  );
}

// ─── CITATIONS PAGE ───────────────────────────────────────────
function CitationsPage({ showUpgrade }) {
  const [style, setStyle] = useState("APA");
  const [text, setText] = useState("");
  return (
    <FeaturePage title="Generate citations instantly." subtitle="Pro Feature · Citation Generator">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["APA","MLA","Chicago","Harvard"].map(s=>(
            <button key={s} onClick={()=>setStyle(s)} style={{padding:"8px 18px",background:style===s?"rgba(91,156,246,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${style===s?"rgba(91,156,246,0.5)":"rgba(255,255,255,0.08)"}`,borderRadius:8,color:style===s?"#5b9cf6":"rgba(255,255,255,0.4)",fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>{s}</button>
          ))}
        </div>
        <textarea className="textarea" placeholder="Paste source info: title, author, year, publisher, URL..." value={text} onChange={e=>setText(e.target.value)} rows={6}/>
        <button className="btn-primary" disabled={!text.trim()}>Generate {style} Citation</button>
        <p style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.25)",textAlign:"center",marginTop:4}}>Pro feature — <span style={{color:"#5b9cf6",cursor:"pointer"}} onClick={showUpgrade}>upgrade to unlock</span></p>
      </div>
    </FeaturePage>
  );
}

// ─── PLAGIARISM PAGE ──────────────────────────────────────────
function PlagiarismPage({ showUpgrade }) {
  const [text, setText] = useState("");
  return (
    <FeaturePage title="Check writing authenticity." subtitle="Scholar Feature · Authenticity Analyzer">
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <textarea className="textarea" placeholder="Paste your work to analyze writing authenticity..." value={text} onChange={e=>setText(e.target.value)} rows={10}/>
        <button className="btn-primary" disabled={!text.trim()}>Analyze Authenticity</button>
        <p style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(255,255,255,0.25)",textAlign:"center",marginTop:4}}>Scholar feature — <span style={{color:"#a78bfa",cursor:"pointer"}} onClick={showUpgrade}>upgrade to unlock</span></p>
      </div>
    </FeaturePage>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
// ─── LOADING SCREEN ───────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 1000);
    const t3 = setTimeout(() => setStep(3), 1600);
    const t4 = setTimeout(() => setStep(4), 2100);
    const t5 = setTimeout(() => setFadeOut(true), 2800);
    const t6 = setTimeout(onDone, 3300);
    return () => [t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
  }, []);
  return (
    <div style={{position:"fixed",inset:0,background:"#080809",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1000,opacity:fadeOut?0:1,transition:"opacity 0.5s ease"}}>
      <SmokyBg/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
        <div style={{opacity:step>=1?1:0,transform:step>=1?"scale(1)":"scale(0.7)",transition:"opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)",marginBottom:28,filter:step>=1?"drop-shadow(0 0 18px rgba(91,156,246,0.4))":"none",animation:step>=2?"float 4s ease-in-out infinite":"none"}}>
          <PrismMark size={80}/>
        </div>
        <div style={{opacity:step>=2?1:0,transform:step>=2?"translateY(0)":"translateY(8px)",transition:"opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)",marginBottom:14,display:"flex",justifyContent:"center"}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:"0.04em",lineHeight:1,display:"block",textAlign:"center"}}>
            <span style={{color:"#ffffff",fontWeight:400}}>PRI</span><span style={{color:"#5b9cf6",fontWeight:400}}>SM</span>
          </span>
        </div>
        <div style={{opacity:step>=3?1:0,transform:step>=3?"translateY(0)":"translateY(8px)",transition:"opacity 0.6s ease, transform 0.6s ease",fontFamily:"Calibri,'Gill Sans',sans-serif",fontSize:12,letterSpacing:3,color:"rgba(255,255,255,0.35)",textAlign:"center",marginBottom:0,fontWeight:400}}>
          Refract. Reflect. Improve.
        </div>
        <div style={{marginTop:48,opacity:step>=4?1:0,transition:"opacity 0.6s ease",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:4,height:4,borderRadius:"50%",background:"rgba(255,255,255,0.2)"}}/>
          <div style={{width:4,height:4,borderRadius:"50%",background:"rgba(255,255,255,0.2)"}}/>
          <div style={{width:4,height:4,borderRadius:"50%",background:"rgba(255,255,255,0.2)"}}/>
        </div>
      </div>
      <div style={{position:"absolute",bottom:32,opacity:step>=3?1:0,transition:"opacity 0.8s ease",fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:5,color:"rgba(255,255,255,0.2)",fontWeight:700,textTransform:"uppercase"}}>
        POWERED BY AXIOM
      </div>
    </div>
  );
}

export default function PRISMv5() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("home");
  const [showModal, setShowModal] = useState(false);
  const user = MOCK_USER;

  if (!loaded) return <LoadingScreen onDone={() => setLoaded(true)}/>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0a0a;overflow-x:hidden;}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 8px #34d399}50%{opacity:0.6;box-shadow:0 0 14px #34d399}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes smokeFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-20px) scale(1.04)}}
        @keyframes smokeFloat2{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-15px) rotate(3deg)}}
        @keyframes smokeFloat3{0%,100%{transform:translateY(0) scale(1)}33%{transform:translateY(-10px) scale(1.02)}66%{transform:translateY(8px) scale(0.98)}}

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

        /* Scrollbar */
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}

        /* MOBILE RESPONSIVE */
        @media(max-width:768px){
          nav{padding:0 16px !important;height:56px !important;}
          .tabs-row{gap:0 !important;}
          .tab{padding:8px 10px 12px !important;font-size:12px !important;}
          .card{padding:16px !important;border-radius:12px !important;}
          .textarea{font-size:14px !important;padding:14px !important;}
          .btn-primary{padding:13px !important;font-size:14px !important;}
          .dim-card{min-width:160px !important;padding:14px !important;}
          .feature-title{font-size:clamp(24px,6vw,42px) !important;}
        }
        @media(max-width:480px){
          .tab{padding:7px 8px 11px !important;font-size:11px !important;letter-spacing:0 !important;}
          .upgrade-pill{display:none;}
        }

        @keyframes glowPulse{0%,100%{text-shadow:0 0 20px rgba(91,156,246,0.4)}50%{text-shadow:0 0 40px rgba(91,156,246,0.8),0 0 60px rgba(91,156,246,0.3)}}
        @keyframes borderGlow{0%,100%{box-shadow:0 0 0 rgba(91,156,246,0)}50%{box-shadow:0 0 20px rgba(91,156,246,0.15)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      `}</style>

      <SmokyBg/>
      {showModal && <UpgradeModal onClose={()=>setShowModal(false)}/>}

      <Nav activePage={page} setPage={setPage} showUpgrade={()=>setShowModal(true)} user={user}/>

      {page==="home" && <HomePage setPage={setPage} showUpgrade={()=>setShowModal(true)} user={user}/>}
      {page==="analyze" && <AnalyzePage showUpgrade={()=>setShowModal(true)}/>}
      {page==="summarize" && <SummarizePage/>}
      {page==="study-chat" && <ChatPage/>}
      {page==="citations" && <CitationsPage showUpgrade={()=>setShowModal(true)}/>}
      {page==="plagiarism" && <PlagiarismPage showUpgrade={()=>setShowModal(true)}/>}
    </>
  );
}
