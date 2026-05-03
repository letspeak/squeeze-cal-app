import { useState, useEffect } from "react";

const C = {
  green: "#00ff9d", red: "#ff3c5a", amber: "#ffc107", blue: "#38bdf8",
  purple: "#a78bfa", bg: "#060a0e", card: "#0b1017", card2: "#0f1923",
  border: "#1a2535", muted: "#4a6070", dim: "#2a3d50", text: "#c9d8e8"
};

// ── Pre-filled PCT data as of March 30, 2026 (sourced from Fintel / Benzinga / Investing.com) ──
const PCT_DATA = {
  ticker:        "PCT",
  sharesShort:   "44.42",   // M — Benzinga (latest FINRA report, ~early Mar 2026)
  floatShares:   "108",     // M — derived: 44.42M / 41.13% SI%float (Benzinga)
  avgDailyVol:   "3.5",     // M — blended FINRA (2.94M) & Benzinga (5.25M) estimates
  currentVol:    "4.8",     // M — estimated pivot-bottom buy-signal day (StockInvest)
  currentPrice:  "5.14",    // $ — Investing.com confirmed close Mar 30, 2026
  avgShortEntry: "8.50",    // $ — estimated mid-range (52wk high $17.37, entered ~mid-range)
  borrowRate:    "6.01",    // % APR — Short Interest Tracker (Fintel-sourced)
  maxLoss:       "20",      // % pain threshold
  ivRank:        "65",      // % — elevated, put vol heavy (CNBC Mar 24 note)
  putCallRatio:  "1.4",     // bearish — "put volume heavy" (CNBC/TipRanks Mar 24, 2026)
  marketCap:     "0.93",    // B$ — ~180M shares × $5.14
};

const SOURCES = [
  { label: "Close Price (Mar 30)",    value: "$5.14",       source: "Investing.com" },
  { label: "Day Range",              value: "$5.06–$5.44",  source: "Investing.com" },
  { label: "Shares Short",           value: "44.42M",       source: "Benzinga / FINRA" },
  { label: "SI % Float",             value: "41.13%",       source: "Benzinga" },
  { label: "Float Shares",           value: "~108M",        source: "Derived" },
  { label: "Shares Outstanding",     value: "~180M",        source: "StockAnalysis" },
  { label: "DIR (Days to Cover)",    value: "8.46d",        source: "Benzinga (5.25M ADV)" },
  { label: "Borrow Rate (APR)",      value: "6.01%",        source: "Short Interest Tracker / Fintel" },
  { label: "Shares Available (Borrow)", value: "1.9M",     source: "Short Interest Tracker" },
  { label: "52-Wk Range",           value: "$5.06–$17.37", source: "Investing.com" },
  { label: "Put/Call (Mar 24)",      value: "Heavy Puts",   source: "TipRanks / CNBC" },
  { label: "Technical Signal",       value: "Pivot Bottom", source: "StockInvest.us" },
  { label: "Analyst Target (avg)",   value: "$11.83",       source: "Investing.com" },
  { label: "Market Cap",            value: "~$925M",        source: "Calculated" },
];

function norm(val, min, max) { return Math.min(1, Math.max(0, (val - min) / (max - min))); }
function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }

function Gauge({ score }) {
  const cx = 110, cy = 105, r = 88;
  const toXY = (a, rad) => ({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
  const arc = (a1, a2, rad) => {
    const s = toXY(a1, rad), e = toXY(a2, rad), lg = a2 - a1 > Math.PI ? 1 : 0;
    return `M${s.x} ${s.y} A${rad} ${rad} 0 ${lg} 1 ${e.x} ${e.y}`;
  };
  const angle = Math.PI + score * Math.PI;
  const needle = toXY(angle, 72);
  const color = score < 0.35 ? C.green : score < 0.65 ? C.amber : C.red;
  const zones = [
    { a1: Math.PI,        a2: Math.PI * 1.33, c: C.green },
    { a1: Math.PI * 1.33, a2: Math.PI * 1.67, c: C.amber },
    { a1: Math.PI * 1.67, a2: Math.PI * 2,    c: C.red   },
  ];
  return (
    <svg viewBox="0 0 220 115" width="100%" style={{ maxWidth: 300, display: "block", margin: "0 auto" }}>
      {zones.map((z, i) => (
        <path key={i} d={arc(z.a1, z.a2, r)} fill="none" stroke={z.c} strokeWidth="10" strokeLinecap="butt" opacity="0.15" />
      ))}
      <path d={arc(Math.PI, 2 * Math.PI, r)} fill="none" stroke="#1a2535" strokeWidth="6" />
      <path d={arc(Math.PI, angle, r)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: "all 0.5s ease" }} />
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#fff" strokeWidth="2"
        strokeLinecap="round" style={{ transition: "all 0.5s ease" }} />
      <circle cx={cx} cy={cy} r="5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <text x="24"  y="112" fill={C.muted} fontSize="8" fontFamily="monospace">LOW</text>
      <text x="92"  y="22"  fill={C.muted} fontSize="8" fontFamily="monospace">MED</text>
      <text x="178" y="112" fill={C.muted} fontSize="8" fontFamily="monospace">HIGH</text>
    </svg>
  );
}

function Field({ label, value, onChange, unit, min, max, step = 0.01, hint, warn, critical, formula }) {
  const [focused, setFocused] = useState(false);
  const num = parseFloat(value);
  const isCrit = critical != null && !isNaN(num) && num >= critical;
  const isWarn = warn != null && !isNaN(num) && num >= warn && !isCrit;
  const accentColor = isCrit ? C.red : isWarn ? C.amber : focused ? C.green : C.border;
  const dot = isCrit ? C.red : isWarn ? C.amber : C.green;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isNaN(num) && <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, boxShadow: `0 0 5px ${dot}` }} />}
          <span style={{ color: C.muted, fontSize: 10, letterSpacing: 1.5 }}>{label}</span>
        </div>
        {formula && <span style={{ color: C.dim, fontSize: 9 }}>{formula}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${accentColor}`,
        borderRadius: 6, background: "#070d14", transition: "border-color 0.2s", overflow: "hidden" }}>
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none",
            color: isCrit ? C.red : isWarn ? C.amber : C.text,
            fontSize: 15, fontFamily: "monospace", fontWeight: 700, padding: "10px 12px", width: 0 }} />
        {unit && (
          <span style={{ padding: "0 12px", color: C.muted, fontSize: 11, fontFamily: "monospace",
            borderLeft: `1px solid ${C.border}`, background: "#0b1017",
            alignSelf: "stretch", display: "flex", alignItems: "center" }}>{unit}</span>
        )}
      </div>
      {hint && (
        <div style={{ marginTop: 4, fontSize: 9, color: isCrit ? C.red : isWarn ? C.amber : C.dim, letterSpacing: 0.5 }}>
          {isCrit ? `⚠ CRITICAL: ${hint}` : isWarn ? `⚡ ${hint}` : hint}
        </div>
      )}
    </div>
  );
}

function SignalBar({ label, value, min, max, unit, warn, critical, onChange, readOnly }) {
  const pct = norm(value, min, max) * 100;
  const isCrit = value >= critical;
  const isWarn = value >= warn && !isCrit;
  const c = isCrit ? C.red : isWarn ? C.amber : C.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
      <span style={{ color: c, fontSize: 10, minWidth: 56, letterSpacing: 0.5 }}>{label}</span>
      <div style={{ flex: 1, position: "relative", height: 5, background: C.border, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${c}55, ${c})`, borderRadius: 3,
          boxShadow: isCrit ? `0 0 6px ${c}` : "none", transition: "width 0.35s, background 0.35s" }} />
        {!readOnly && (
          <input type="range" min={min} max={max} step={0.1} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
        )}
      </div>
      <span style={{ color: c, fontSize: 11, minWidth: 60, textAlign: "right" }}>
        {typeof value === "number" ? value.toFixed(value < 10 ? 2 : 1) : value}{unit}
      </span>
      <span style={{ fontSize: 12 }}>{isCrit ? "🔴" : isWarn ? "🟡" : "🟢"}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color, glow }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${glow ? color + "55" : C.border}`,
      borderRadius: 8, padding: "12px 14px", flex: 1,
      boxShadow: glow ? `0 0 12px ${color}22` : "none" }}>
      <div style={{ color: C.muted, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>{label}</div>
      <div style={{ color: color || C.green, fontSize: 16, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ color: C.dim, fontSize: 9, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ children, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, background: accent || C.green, borderRadius: 2 }} />
      <span style={{ color: C.muted, fontSize: 9, letterSpacing: 2.5 }}>{children}</span>
    </div>
  );
}

function ComputedRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted, fontSize: 10 }}>{label}</span>
      <span style={{ color: color || C.green, fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function SqueezeCalc() {
  const [ticker,        setTicker]        = useState(PCT_DATA.ticker);
  const [sharesShort,   setSharesShort]   = useState(PCT_DATA.sharesShort);
  const [floatShares,   setFloatShares]   = useState(PCT_DATA.floatShares);
  const [avgDailyVol,   setAvgDailyVol]   = useState(PCT_DATA.avgDailyVol);
  const [currentVol,    setCurrentVol]    = useState(PCT_DATA.currentVol);
  const [currentPrice,  setCurrentPrice]  = useState(PCT_DATA.currentPrice);
  const [avgShortEntry, setAvgShortEntry] = useState(PCT_DATA.avgShortEntry);
  const [borrowRate,    setBorrowRate]    = useState(PCT_DATA.borrowRate);
  const [maxLoss,       setMaxLoss]       = useState(PCT_DATA.maxLoss);
  const [ivRank,        setIvRank]        = useState(PCT_DATA.ivRank);
  const [putCallRatio,  setPutCallRatio]  = useState(PCT_DATA.putCallRatio);
  const [marketCap,     setMarketCap]     = useState(PCT_DATA.marketCap);
  const [showSources,   setShowSources]   = useState(false);
  const [animScore,     setAnimScore]     = useState(0);

  const ss  = parseFloat(sharesShort)  || 0;
  const fl  = Math.max(parseFloat(floatShares) || 1, 0.01);
  const adv = Math.max(parseFloat(avgDailyVol) || 1, 0.01);
  const cv  = parseFloat(currentVol)   || 0;
  const cp  = parseFloat(currentPrice) || 0;
  const ase = parseFloat(avgShortEntry)|| 0;
  const br  = parseFloat(borrowRate)   || 0;
  const ml  = parseFloat(maxLoss)      || 20;
  const iv  = parseFloat(ivRank)       || 0;
  const pcr = parseFloat(putCallRatio) || 0;

  const siPct        = (ss / fl) * 100;
  const dir          = ss / adv;
  const rvol         = cv / adv;
  const triggerPrice = (ase > 0 ? ase : cp) * (1 + ml / 100);
  const pnlPct       = ase > 0 && cp > 0 ? ((cp - ase) / ase) * 100 : 0;

  const siNorm     = norm(siPct, 0, 80);
  const dirNorm    = norm(dir, 0, 20);
  const borrowNorm = norm(br, 0, 100);
  const rvolNorm   = norm(rvol, 0.5, 6);
  const ivNorm     = norm(iv, 0, 100);
  const pcrNorm    = norm(pcr, 0, 2);

  const score = clamp(
    0.30*siNorm + 0.25*dirNorm + 0.20*borrowNorm + 0.15*rvolNorm + 0.05*ivNorm + 0.05*(1-pcrNorm),
    0, 1
  );

  const logit = -4.5 + 5.5*siNorm + 5*dirNorm + 4*borrowNorm + 3*rvolNorm + 1.5*ivNorm;
  const logisticProb = Math.round((1 / (1 + Math.exp(-logit))) * 100);

  const scoreColor = score < 0.35 ? C.green : score < 0.65 ? C.amber : C.red;
  const scoreLabel = score < 0.35 ? "LOW" : score < 0.60 ? "MODERATE" : score < 0.80 ? "HIGH" : "EXTREME";

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimScore(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 14 };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "monospace", color: C.text,
      backgroundImage: `
        radial-gradient(ellipse at 15% 10%, rgba(0,255,157,0.05) 0%, transparent 45%),
        radial-gradient(ellipse at 85% 85%, rgba(255,60,90,0.05) 0%, transparent 45%)
      ` }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "13px 24px",
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(11,16,23,0.97)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
        <span style={{ color: C.green, fontSize: 10, letterSpacing: 3 }}>SHORT SQUEEZE ENGINE</span>
        <div style={{ flex: 1 }} />
        <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}44`,
          borderRadius: 4, padding: "3px 12px", color: C.green, fontSize: 13, fontWeight: 900, letterSpacing: 3 }}>
          {ticker || "—"}
        </div>
        <div style={{ background: `${C.blue}15`, border: `1px solid ${C.blue}44`,
          borderRadius: 4, padding: "3px 10px", color: C.blue, fontSize: 9, letterSpacing: 1 }}>
          MAR 30, 2026
        </div>
        <span style={{ color: C.dim, fontSize: 9 }}>v3.1 · FINTEL</span>
      </div>

      {/* ── Data source banner ── */}
      <div style={{ background: "#0a1520", borderBottom: `1px solid ${C.border}`,
        padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: C.dim, fontSize: 9, letterSpacing: 1 }}>
          📡 DATA SOURCED FROM: Fintel.io · Benzinga · Investing.com · Short Interest Tracker · FINRA (as of Mar 30, 2026)
        </span>
        <button onClick={() => setShowSources(s => !s)}
          style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4,
            padding: "3px 10px", color: C.muted, fontSize: 9, cursor: "pointer", letterSpacing: 1 }}>
          {showSources ? "HIDE" : "VIEW"} SOURCES
        </button>
      </div>

      {/* ── Sources panel ── */}
      {showSources && (
        <div style={{ background: "#070d14", borderBottom: `1px solid ${C.border}`, padding: "14px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
            {SOURCES.map(({ label, value, source }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between",
                background: C.card, borderRadius: 6, padding: "7px 12px",
                border: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 9 }}>{label}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: C.green, fontSize: 10, fontWeight: 700 }}>{value}</span>
                  <div style={{ color: C.dim, fontSize: 8 }}>{source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

          {/* ════ LEFT ════ */}
          <div>
            {/* Ticker */}
            <div style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "12px 18px" }}>
              <span style={{ color: C.muted, fontSize: 9, letterSpacing: 2 }}>TICKER</span>
              <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none",
                  color: C.green, fontSize: 20, fontFamily: "monospace", fontWeight: 900, letterSpacing: 5 }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.amber, fontSize: 11, fontWeight: 700 }}>$5.14</div>
                <div style={{ color: C.dim, fontSize: 8 }}>MAR 30 CLOSE</div>
              </div>
            </div>

            {/* Short Position */}
            <div style={card}>
              <SectionHead accent={C.red}>SHORT POSITION DATA</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="SHARES SHORT" value={sharesShort} onChange={setSharesShort}
                  unit="M" min={0} step={0.1} hint="FINRA via Benzinga (early Mar 2026)" formula="→ SI% & DIR" />
                <Field label="FLOAT SHARES" value={floatShares} onChange={setFloatShares}
                  unit="M" min={0.01} step={1} hint="Derived from 41.13% SI% float" formula="→ SI%" />
              </div>
              <div style={{ background: "#070d14", border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginTop: 6 }}>
                <ComputedRow label="SHORT INTEREST % FLOAT" value={`${siPct.toFixed(2)}%`}
                  color={siPct > 40 ? C.red : siPct > 20 ? C.amber : C.green} />
                <ComputedRow label="SHORT INTEREST RATIO (DIR)" value={`${dir.toFixed(2)} days`}
                  color={dir > 10 ? C.red : dir > 5 ? C.amber : C.green} />
              </div>
            </div>

            {/* Volume */}
            <div style={card}>
              <SectionHead accent={C.blue}>VOLUME DATA</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="AVG DAILY VOL (20D)" value={avgDailyVol} onChange={setAvgDailyVol}
                  unit="M" min={0.01} step={0.1} hint="Blended FINRA (2.94M) & Benzinga (5.25M)" formula="→ DIR & RVOL" />
                <Field label="MAR 30 VOLUME" value={currentVol} onChange={setCurrentVol}
                  unit="M" min={0} step={0.1} hint="Estimated pivot-bottom session" formula="→ RVOL" />
              </div>
              <div style={{ background: "#070d14", border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginTop: 6 }}>
                <ComputedRow label="RELATIVE VOLUME (RVOL)" value={`${rvol.toFixed(2)}×`}
                  color={rvol > 3 ? C.red : rvol > 2 ? C.amber : C.green} />
              </div>
            </div>

            {/* Price & Borrow */}
            <div style={card}>
              <SectionHead accent={C.amber}>PRICE & BORROW</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="CLOSE PRICE (MAR 30)" value={currentPrice} onChange={setCurrentPrice}
                  unit="$" min={0} step={0.01} hint="Confirmed — Investing.com" />
                <Field label="AVG SHORT ENTRY EST." value={avgShortEntry} onChange={setAvgShortEntry}
                  unit="$" min={0} step={0.01} hint="Estimated mid-52wk-range entry" />
                <Field label="BORROW RATE (APR)" value={borrowRate} onChange={setBorrowRate}
                  unit="%" min={0} max={300} step={0.1}
                  hint="Fintel / Short Interest Tracker" warn={30} critical={50} />
                <Field label="MAX LOSS TOLERANCE" value={maxLoss} onChange={setMaxLoss}
                  unit="%" min={1} max={200} step={1} formula="trigger = entry × (1+%)" />
              </div>
              <div style={{ background: "#070d14", border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginTop: 6 }}>
                <ComputedRow label="SQUEEZE TRIGGER PRICE" value={`$${triggerPrice.toFixed(2)}`} color={C.amber} />
                <ComputedRow label="SHORT P&L (unrealised)"
                  value={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
                  color={pnlPct < -10 ? C.red : pnlPct < -5 ? C.amber : C.green} />
                <ComputedRow label="BORROW COST (APR)"
                  value={`${br.toFixed(2)}% — Shares Avail: 1.9M`}
                  color={br > 50 ? C.red : br > 30 ? C.amber : C.muted} />
              </div>
            </div>

            {/* Options & Market */}
            <div style={card}>
              <SectionHead accent={C.purple}>OPTIONS & MARKET CONTEXT</SectionHead>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="IV RANK (IVR)" value={ivRank} onChange={setIvRank}
                  unit="%" min={0} max={100} step={1}
                  hint="Elevated — put vol heavy Mar 24 (CNBC)" warn={60} critical={80} />
                <Field label="PUT / CALL RATIO" value={putCallRatio} onChange={setPutCallRatio}
                  unit="" min={0} step={0.01}
                  hint="Heavy puts Mar 24 per TipRanks/CNBC" warn={1.0} critical={1.5} />
                <Field label="MARKET CAP" value={marketCap} onChange={setMarketCap}
                  unit="B$" min={0} step={0.01} hint="~180M shares × $5.14 = ~$925M" />
              </div>

              {/* Context notes */}
              <div style={{ marginTop: 12, background: "#070d14", border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5, marginBottom: 8 }}>MARKET CONTEXT — MAR 30, 2026</div>
                {[
                  ["52-Wk Range",    "$5.06 (today low) – $17.37",  C.amber],
                  ["Analyst Target", "$11.83 avg · $17 high",        C.blue],
                  ["Rating",         "Buy (3 analysts)",              C.green],
                  ["Shares Avail",   "1.9M to borrow (very tight)",  C.red],
                  ["Technical",      "Pivot bottom buy signal",       C.green],
                  ["Dilution",       "67% (high)",                    C.amber],
                  ["News (Mar 25)",  "€40M EU Innovation Fund grant", C.green],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0",
                    borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted, fontSize: 9 }}>{k}</span>
                    <span style={{ color: c, fontSize: 9, fontWeight: 700, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ════ RIGHT ════ */}
          <div style={{ position: "sticky", top: 58 }}>

            {/* Gauge */}
            <div style={{ ...card, textAlign: "center" }}>
              <div style={{ color: C.muted, fontSize: 9, letterSpacing: 2.5, marginBottom: 4 }}>
                SQUEEZE PROBABILITY — PCT — MAR 30, 2026
              </div>
              <Gauge score={animScore} />
              <div style={{ fontSize: 54, fontWeight: 900, color: scoreColor, lineHeight: 1,
                textShadow: `0 0 26px ${scoreColor}55`, transition: "all 0.4s" }}>
                {Math.round(score * 100)}%
              </div>
              <div style={{ fontSize: 11, letterSpacing: 4, fontWeight: 700, color: scoreColor,
                marginTop: 6, transition: "color 0.4s" }}>{scoreLabel}</div>
              <div style={{ color: C.dim, fontSize: 9, marginTop: 4 }}>COMPOSITE WEIGHTED MODEL (6 FACTORS)</div>
            </div>

            {/* Key Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <StatCard label="LOGISTIC MODEL" value={`${logisticProb}%`}
                color={logisticProb > 65 ? C.red : logisticProb > 40 ? C.amber : C.green}
                glow={logisticProb > 65} sub="sigmoid regression" />
              <StatCard label="TRIGGER PRICE" value={`$${triggerPrice.toFixed(2)}`}
                color={C.amber} sub={`entry $${ase} + ${ml}% pain`} />
              <StatCard label="SHORT P&L" value={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`}
                color={pnlPct < -15 ? C.red : pnlPct < -5 ? C.amber : C.green}
                glow={pnlPct < -15} sub="unrealised on shorts" />
              <StatCard label="DAYS TO COVER" value={`${dir.toFixed(1)}d`}
                color={dir > 10 ? C.red : dir > 5 ? C.amber : C.green}
                glow={dir > 10} sub="short int ÷ ADV" />
            </div>

            {/* Signal bars */}
            <div style={card}>
              <SectionHead>LIVE SIGNAL BREAKDOWN</SectionHead>
              <SignalBar label="SI % Float" value={parseFloat(siPct.toFixed(1))} min={0} max={80} unit="%" warn={20} critical={40} readOnly />
              <SignalBar label="DIR" value={parseFloat(dir.toFixed(1))} min={0} max={20} unit="d" warn={5} critical={10} readOnly />
              <SignalBar label="Borrow" value={br} min={0} max={100} unit="%" warn={30} critical={50}
                onChange={v => setBorrowRate(String(v))} />
              <SignalBar label="RVOL" value={parseFloat(rvol.toFixed(2))} min={0.5} max={6} unit="×" warn={2} critical={3} readOnly />
              <SignalBar label="IV Rank" value={parseFloat(iv)} min={0} max={100} unit="%" warn={60} critical={80}
                onChange={v => setIvRank(String(v))} />
              <SignalBar label="Put/Call" value={parseFloat(pcr)} min={0} max={2} unit="" warn={1.0} critical={1.5}
                onChange={v => setPutCallRatio(String(v))} />

              {/* Weights */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <div style={{ color: C.dim, fontSize: 9, letterSpacing: 1.5, marginBottom: 10 }}>WEIGHT CONTRIBUTIONS</div>
                {[
                  { k: "SI% Float", v: siNorm, w: 0.30, c: C.red    },
                  { k: "DIR",       v: dirNorm,    w: 0.25, c: C.amber  },
                  { k: "Borrow",    v: borrowNorm, w: 0.20, c: C.purple },
                  { k: "RVOL",      v: rvolNorm,   w: 0.15, c: C.blue   },
                  { k: "IVR",       v: ivNorm,     w: 0.05, c: C.green  },
                  { k: "PCR⁻¹",    v: 1-pcrNorm,  w: 0.05, c: C.green  },
                ].map(({ k, v, w, c }) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: C.dim, fontSize: 9, minWidth: 50 }}>{k}</span>
                    <div style={{ flex: 1, height: 4, background: "#070d14", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${Math.min((v * w / 0.30) * 100, 100)}%`,
                        background: c, borderRadius: 2, transition: "width 0.4s", opacity: 0.8 }} />
                    </div>
                    <span style={{ color: c, fontSize: 9, minWidth: 36, textAlign: "right" }}>{(v * w * 100).toFixed(1)}</span>
                    <span style={{ color: C.dim, fontSize: 8, minWidth: 28 }}>/{(w*100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis */}
            <div style={{ background: `${scoreColor}08`, border: `1px solid ${scoreColor}33`,
              borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ color: scoreColor, fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>
                ANALYSIS — PCT — MAR 30, 2026
              </div>
              <div style={{ color: "#8899aa", fontSize: 11, lineHeight: 1.9 }}>
                {score < 0.35 && `Short conditions on PCT are benign. SI of ${siPct.toFixed(1)}% and DIR of ${dir.toFixed(1)}d show limited pressure. Borrow at ${br}% APR is manageable.`}
                {score >= 0.35 && score < 0.60 && `Moderate squeeze setup on PCT. SI% float of ${siPct.toFixed(1)}% is meaningful with ${dir.toFixed(1)}-day DIR. Shorts down ~${Math.abs(pnlPct).toFixed(0)}% from est. entry. Watch $${triggerPrice.toFixed(2)} trigger.`}
                {score >= 0.60 && score < 0.80 && `High squeeze probability on PCT. SI at ${siPct.toFixed(1)}% of float with DIR ${dir.toFixed(1)}d. Shorts est. down ${Math.abs(pnlPct).toFixed(0)}% from $${ase} entry. Borrow tight at 1.9M available. EU €40M grant (Mar 25) adds catalyst risk. Trigger: $${triggerPrice.toFixed(2)}.`}
                {score >= 0.80 && `⚠ EXTREME on PCT. SI ${siPct.toFixed(1)}% float, ${dir.toFixed(1)}-day DIR, only 1.9M shares to borrow. Shorts est. −${Math.abs(pnlPct).toFixed(0)}% from entry. €40M EU grant is fresh catalyst. StockInvest flagged pivot bottom on Mar 30. Trigger: $${triggerPrice.toFixed(2)}.`}
              </div>
            </div>

            {/* Formula ref */}
            <div style={card}>
              <SectionHead>FORMULA REFERENCE</SectionHead>
              {[
                ["SI%",        "Shares Short ÷ Float × 100"],
                ["DIR",        "Shares Short ÷ Avg Daily Volume"],
                ["RVOL",       "Session Volume ÷ 20d Avg Volume"],
                ["Trigger",    "Avg Entry × (1 + MaxLoss%)"],
                ["P(squeeze)", "0.30·SI + 0.25·DIR + 0.20·B + 0.15·RVOL + 0.05·IVR + 0.05·(1−PCR)"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 9, alignItems: "flex-start" }}>
                  <span style={{ color: C.green, minWidth: 54, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: C.dim, lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", color: C.dim, fontSize: 9, lineHeight: 1.7 }}>
              ⚠ NOT FINANCIAL ADVICE · FOR EDUCATIONAL USE ONLY<br />
              Data sourced from Fintel.io, Benzinga, Investing.com, FINRA, Short Interest Tracker
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
