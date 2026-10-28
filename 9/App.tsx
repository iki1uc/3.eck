import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

/* ================= WURZELMATIC ZOLL + ECONOMY GEWURZELT · V120 ================= */
const Q9 = 19683;
const WURZEL_NEW = [3, 9, 81, 243, 756, 19683];
const WURZEL_OLD = [3, 9, 27, 81, 243, 729];
const OVERFLOW = 756; // 729 + 27
const MYSTERY = (27 / 19683) * 1.618;
const wurzel = (n: number) => Math.log(n) / Math.log(3);
const hoch = (e: number) => Math.pow(3, e);

type Achse = { id: string; label: string; tag: string; dr: number; deg: number; on: boolean; wert: number };
const ACHSEN0: Achse[] = [
  { id: "X", label: "Breite", tag: "AXIS", dr: 81 },
  { id: "Y", label: "Höhe", tag: "TMP", dr: 81 },
  { id: "Z", label: "Tiefe", tag: "LAGE", dr: 81 },
  { id: "oi", label: "outside-in", tag: "rotX", dr: 27 },
  { id: "io", label: "inside-out", tag: "rotY", dr: 27 },
  { id: "ix", label: "innen-x", tag: "rotZ", dr: 27 },
  { id: "xi", label: "x-innen", tag: "scale", dr: 3 },
  { id: "ax", label: "a→x", tag: "time t", dr: 3 },
  { id: "xa", label: "x→a", tag: "gamma", dr: 72 },
  { id: "ay", label: "a→y", tag: "bio", dr: 27 },
  { id: "ya", label: "y→a", tag: "atom", dr: 27 },
  { id: "az/za", label: "Atem", tag: "co2", dr: 3 },
].map((a, i) => ({ ...a, deg: i * 30, on: true, wert: 1 / 12 }));

type Roh = { id: string; name: string; sym: string; tiefe: number; kat: string };
const ROHSTOFFE: Roh[] = [
  { id: "atlantis", name: "Atlantis V112", sym: "◈", tiefe: 0.9, kat: "MYTHOS" },
  { id: "borg", name: "BORG-Collective", sym: "⬢", tiefe: 0.85, kat: "SYSTEM" },
  { id: "massiert", name: "Massiert v82", sym: "⧉", tiefe: 0.75, kat: "MONOREPO" },
  { id: "mind", name: "Mind ROM", sym: "◉", tiefe: 0.8, kat: "GEIST" },
  { id: "omega", name: "Omega API", sym: "Ω", tiefe: 0.7, kat: "API" },
  { id: "vehicle", name: "Vehicle Atlantis", sym: "◆", tiefe: 0.65, kat: "FAHRZEUG" },
  { id: "neutral", name: "Neutral-Begleiter", sym: "N", tiefe: 0.6, kat: "WAHRNEHMUNG" },
  { id: "bios", name: "BIOS Atem", sym: "◐", tiefe: 0.95, kat: "ATEM" },
  { id: "indexer", name: "CTRL.LER Indexer", sym: "◫", tiefe: 0.8, kat: "INDEX" },
  { id: "icefeuer", name: "IceFeuer-729", sym: "❄", tiefe: 0.7, kat: "PHYSIK" },
  { id: "morph", name: "MORPH-EDIT", sym: "⬡", tiefe: 0.75, kat: "MORPH" },
  { id: "hbt", name: "HBT-Editor", sym: "◬", tiefe: 0.65, kat: "EDITOR" },
  { id: "wbp", name: "WBP BESSER V3", sym: "⬔", tiefe: 0.55, kat: "BUILD" },
];
const PRODUZENTEN = [
  { id: "ice", name: "IceFeuer", sym: "❄", konv: 1.0, roh: ["icefeuer"] },
  { id: "morph", name: "MORPH", sym: "⬡", konv: 0.95, roh: ["morph"] },
  { id: "hbt", name: "HBT", sym: "◬", konv: 0.85, roh: ["hbt", "vehicle"] },
  { id: "cyc", name: "CycOS", sym: "◎", konv: 0.9, roh: ["icefeuer", "massiert"] },
  { id: "nutz", name: "Nutzraum", sym: "⬣", konv: 0.88, roh: ["borg", "omega"] },
  { id: "will", name: "Willklick", sym: "◍", konv: 0.75, roh: ["neutral"] },
  { id: "bios", name: "BIOS", sym: "◐", konv: 0.92, roh: ["bios"] },
  { id: "indexer", name: "Indexer", sym: "◫", konv: 0.94, roh: ["indexer", "mind"] },
  { id: "wbp", name: "WBP", sym: "⬔", konv: 1.0, roh: ["wbp", "omega", "hbt"] },
  { id: "atlantis", name: "Atlantis", sym: "◈", konv: 0.96, roh: ["atlantis", "mind", "vehicle"] },
  { id: "neutral", name: "Neutral", sym: "N", konv: 0.7, roh: ["neutral"] },
];
const KATS = [...new Set(ROHSTOFFE.map((r) => r.kat))];
type KlausurQ = { frage: string; optionen: string[]; richtig: number };
function defaultKlausur(): Record<string, KlausurQ> {
  const out: Record<string, KlausurQ> = {};
  ROHSTOFFE.forEach((r, idx) => {
    const others = KATS.filter((k) => k !== r.kat);
    const opts = [r.kat, others[idx % others.length], others[(idx + 3) % others.length]].filter((v, i, a) => a.indexOf(v) === i);
    while (opts.length < 3) opts.push("UNBEKANNT");
    const shuffled = [...opts];
    out[r.id] = { frage: `Zu welcher Kategorie gehört "${r.name}"?`, optionen: shuffled, richtig: Math.max(0, shuffled.indexOf(r.kat)) };
  });
  return out;
}

/* ---------- persistence via trusted records API (no localStorage) ---------- */
const COL = "wurzelmatic_state";
async function api(action: string, args: any) {
  const res = await fetch("actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, args }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error || "API " + res.status);
  return j.data;
}

type Lernweise = { tempo: number; tiefe: number; rhythmus: number; feedback: string; ziel: string };

export default function App() {
  const [achsen, setAchsen] = useState<Achse[]>(ACHSEN0);
  const [drIdx, setDrIdx] = useState(0);
  const drChain = [81, 27, 3, 0];
  const dr = drChain[drIdx];
  const [q9, setQ9] = useState(Q9);
  const [good, setGood] = useState(79.84);
  const [tmp, setTmp] = useState(312);
  const [rar, setRar] = useState(72);
  const [sein, setSein] = useState(96);
  const [leben, setLeben] = useState(88);
  const [lw, setLw] = useState<Lernweise>({ tempo: 1, tiefe: 0.5, rhythmus: 0.5, feedback: "sofort", ziel: "verstehen" });
  const [klausur, setKlausur] = useState<Record<string, KlausurQ>>(defaultKlausur);
  const [totalWert, setTotalWert] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [run, setRun] = useState({ active: false, t: 0, dur: 48, answered: {} as Record<string, boolean>, wrong: {} as Record<string, boolean>, hits: 0, misses: 0 });
  const [activeQ, setActiveQ] = useState<{ rohId: string; deadline: number; openedAt: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [rot, setRot] = useState(0);
  const [spin, setSpin] = useState<{ t0: number; from: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showOpt, setShowOpt] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [saveMsg, setSaveMsg] = useState("lädt …");
  const [co2] = useState(420);
  const stateIdRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atemRef = useRef(0);
  const lastRef = useRef(0);
  const fpsRef = useRef({ n: 0, t: performance.now(), fps: 60 });
  const [fps, setFps] = useState(60);
  const cycleRef = useRef(-1);

  const busLog = (m: string) => setLog((p) => [...p.slice(-40), `[${new Date().toLocaleTimeString("de-DE")}] ${m}`]);

  /* load persisted state */
  useEffect(() => {
    (async () => {
      try {
        const data = await api("records.list", { collection: COL, limit: 1 });
        const rec = data?.records?.[0];
        if (rec) {
          stateIdRef.current = rec.id;
          const v = rec.value || {};
          if (v.lernweise) setLw(v.lernweise);
          if (v.klausur) setKlausur(v.klausur);
          if (typeof v.totalWert === "number") setTotalWert(v.totalWert);
          if (typeof v.totalRuns === "number") setTotalRuns(v.totalRuns);
          setSaveMsg("Spielstand geladen ✓");
        } else setSaveMsg("Neuer Spielstand — wird beim ersten Speichern angelegt");
      } catch { setSaveMsg("Backend noch nicht erreichbar — Werte bleiben in dieser Sitzung aktiv"); }
    })();
  }, []);

  const persist = async (patch: Partial<{ lernweise: Lernweise; klausur: Record<string, KlausurQ>; totalWert: number; totalRuns: number }>) => {
    const value = { lernweise: patch.lernweise ?? lw, klausur: patch.klausur ?? klausur, totalWert: patch.totalWert ?? totalWert, totalRuns: patch.totalRuns ?? totalRuns };
    try {
      if (stateIdRef.current) await api("records.replace", { collection: COL, id: stateIdRef.current, value });
      else {
        const rec = await api("records.create", { collection: COL, value, idempotency_key: "wurzelmatic-init-v120" });
        stateIdRef.current = rec.id;
      }
      setSaveMsg("Gespeichert ✓ " + new Date().toLocaleTimeString("de-DE"));
    } catch (e: any) { setSaveMsg("Speichern fehlgeschlagen: " + (e?.message || e)); }
  };

  /* ---------- math ---------- */
  const wahrheit = useMemo(() => (tmp * (rar / 100) * sein * leben) / 729, [tmp, rar, sein, leben]);
  const aktive = achsen.filter((a) => a.on).length;
  const summe = achsen.reduce((s, a) => s + (a.on ? a.wert : 0), 0);
  const omega = summe * (dr / 81);
  const zollWert = (omega * q9) / 12;
  const gateOpen = omega >= 0.7 && good >= 79.84;
  const overflowGate = omega >= OVERFLOW / 19683; // 0.0384
  const visibleCount = dr === 81 ? 13 : dr === 27 ? 7 : dr === 3 ? 3 : 1;
  const visibleRoh = ROHSTOFFE.slice(0, visibleCount);

  const getAtem = (t: number) => {
    const cycleDur = 16 / lw.tempo;
    const c = t % cycleDur, p = c / cycleDur;
    if (p < 0.25) return { phase: "EIN", progress: p / 0.25, cycleT: c, cycleDur, rem: (0.25 - p) * cycleDur };
    if (p < 0.5) return { phase: "HALT", progress: 1, cycleT: c, cycleDur, rem: (0.5 - p) * cycleDur };
    if (p < 0.75) return { phase: "AUS", progress: 1 - (p - 0.5) / 0.25, cycleT: c, cycleDur, rem: (0.75 - p) * cycleDur };
    return { phase: "LEER", progress: 0, cycleT: c, cycleDur, rem: (1 - p) * cycleDur };
  };
  const atem = getAtem(atemRef.current);

  /* ---------- klausur flow ---------- */
  const answer = (chosen: number) => {
    if (!activeQ) return;
    const roh = ROHSTOFFE.find((r) => r.id === activeQ.rohId)!;
    const k = klausur[roh.id];
    const correct = chosen === k.richtig;
    const timeLeft = Math.max(0, (activeQ.deadline - performance.now()) / (activeQ.deadline - activeQ.openedAt));
    if (correct) {
      const a = getAtem(atemRef.current);
      const wert = roh.tiefe * (Q9 / 3) * Math.max(0.3, timeLeft) * (0.5 + a.progress * 0.5);
      const nw = totalWert + wert;
      setTotalWert(nw);
      setRun((r) => ({ ...r, answered: { ...r.answered, [roh.id]: true }, hits: r.hits + 1 }));
      busLog(`✓ ${roh.name} · +${Math.round(wert)} Ω`);
      persist({ totalWert: nw });
    } else {
      const nw = Math.max(0, totalWert - 50);
      setTotalWert(nw);
      setRun((r) => ({ ...r, wrong: { ...r.wrong, [roh.id]: true }, misses: r.misses + 1 }));
      busLog(`✗ ${roh.name} · ${chosen === -1 ? "Timeout" : "Falsch"} · -50 Ω`);
      persist({ totalWert: nw });
    }
    setActiveQ(null);
  };

  const startRun = () => {
    setRun({ active: true, t: 0, dur: 48 / lw.tempo, answered: {}, wrong: {}, hits: 0, misses: 0 });
    atemRef.current = 0; cycleRef.current = -1;
    busLog(`▶ LAUF START · 3 Atem-Züge · Tempo ${lw.tempo}×`);
  };
  const stopRun = () => { setRun((r) => ({ ...r, active: false })); setActiveQ(null); busLog("■ STOP"); };
  const endRun = () => {
    setRun((r) => ({ ...r, active: false }));
    setActiveQ(null);
    const nr = totalRuns + 1;
    setTotalRuns(nr);
    persist({ totalRuns: nr });
    setShowOpt(true);
    busLog("LAUF BEENDET");
  };

  /* ---------- RAF loop: canvas + atem + klausur trigger ---------- */
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000 || 0.016);
      lastRef.current = now;
      atemRef.current += dt;
      fpsRef.current.n++;
      if (now - fpsRef.current.t >= 500) { fpsRef.current.fps = Math.round((fpsRef.current.n * 1000) / (now - fpsRef.current.t)); fpsRef.current.n = 0; fpsRef.current.t = now; setFps(fpsRef.current.fps); }
      if (spin) {
        const x = Math.min(1, (now - spin.t0) / 2400);
        setRot(spin.from + 360 * (1 - Math.pow(1 - x, 3)));
        if (x >= 1) setSpin(null);
      } else setRot((r) => (r + dt * 6.5) % 360);
      // run progression
      setRun((r) => {
        if (!r.active) return r;
        const nt = r.t + dt;
        if (nt >= r.dur) { setTimeout(endRun, 0); return { ...r, t: nt }; }
        return { ...r, t: nt };
      });
      const a = getAtem(atemRef.current);
      if (run.active && a.phase === "HALT" && !activeQ) {
        const cyc = Math.floor(atemRef.current / a.cycleDur);
        if (cyc !== cycleRef.current) {
          const pending = ROHSTOFFE.filter((x) => !run.answered[x.id] && !run.wrong[x.id]);
          if (pending.length) {
            cycleRef.current = cyc;
            const roh = pending[Math.floor(Math.random() * pending.length)];
            setActiveQ({ rohId: roh.id, openedAt: performance.now(), deadline: performance.now() + (2000 + lw.tiefe * 4000) });
          }
        }
      }
      if (activeQ && performance.now() > activeQ.deadline) answer(-1);
      draw(now);
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    const draw = (now: number) => {
      const cv = canvasRef.current; if (!cv) return;
      const parent = cv.parentElement!; const rect = parent.getBoundingClientRect();
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.floor(rect.width * DPR)) { cv.width = Math.floor(rect.width * DPR); cv.height = Math.floor(rect.height * DPR); }
      const ctx = cv.getContext("2d", { alpha: false, desynchronized: true } as any); if (!ctx) return;
      const W = cv.width, H = cv.height, CX = W / 2;
      const a = getAtem(atemRef.current); const breath = a.progress;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a1228"); bg.addColorStop(0.5, "#050918"); bg.addColorStop(1, "#02060a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,215,0,${(0.3 + 0.7 * Math.abs(Math.sin(now / 1000 + i))) * 0.12})`; ctx.fillRect((i * 137.5) % W, (i * 73.3) % H, 1.4, 1.4); }
      const sunY = H * 0.3, coreR = Math.min(W, H) * 0.07;
      const g = ctx.createRadialGradient(CX, sunY, 0, CX, sunY, coreR * 4);
      g.addColorStop(0, "rgba(255,215,0,0.55)"); g.addColorStop(0.4, "rgba(255,215,0,0.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, sunY, coreR * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.arc(CX, sunY, coreR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = `bold ${Math.max(9, coreR * 0.5)}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(q9), CX, sunY);
      // overflow ring 756
      ctx.strokeStyle = `rgba(255,122,69,${0.5 + breath * 0.4})`; ctx.lineWidth = 2 * DPR;
      ctx.beginPath(); ctx.arc(CX, sunY, coreR * (1 + OVERFLOW / 19683 * 8), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ff7a45"; ctx.font = `${8 * DPR}px monospace`; ctx.fillText("OVERFLOW 756", CX, sunY - coreR * 1.9);
      // 12 Achsen lines
      achsen.forEach((ax) => {
        if (!ax.on) return;
        const rad = ((ax.deg - 90) * Math.PI) / 180;
        const len = Math.min(W, H) * 0.3;
        const x = CX + Math.cos(rad) * len, y = sunY + Math.sin(rad) * len;
        ctx.strokeStyle = ax.dr === 81 ? "rgba(255,215,0,0.55)" : ax.dr === 27 ? "rgba(0,255,136,0.45)" : "rgba(0,204,255,0.4)";
        ctx.lineWidth = 1.6 * DPR; ctx.beginPath(); ctx.moveTo(CX, sunY); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle as string; ctx.beginPath(); ctx.arc(x, y, 3.4 * DPR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(217,224,240,0.65)"; ctx.font = `${8 * DPR}px monospace`; ctx.fillText(ax.id, x + Math.cos(rad) * 13 * DPR, y + Math.sin(rad) * 13 * DPR);
      });
      // tree: trunk, branches (Rohstoffe), roots (Produzenten), soil
      const soilY = H * 0.86, trunkTop = H * 0.52, trunkBot = soilY;
      const sg = ctx.createLinearGradient(0, soilY, 0, H); sg.addColorStop(0, "#3a2010"); sg.addColorStop(1, "#0a0502");
      ctx.fillStyle = sg; ctx.fillRect(0, soilY, W, H - soilY);
      ctx.strokeStyle = `rgba(255,150,80,${0.4 + breath * 0.3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, soilY); ctx.lineTo(W, soilY); ctx.stroke();
      PRODUZENTEN.forEach((p, i) => {
        const ang = ((i / (PRODUZENTEN.length - 1)) - 0.5) * Math.PI * 0.9;
        const rl = H * 0.1 * (0.6 + 0.4 * Math.cos(i * 1.3));
        const live = p.roh.some((id) => run.answered[id]);
        ctx.strokeStyle = live ? "#00ff88" : "rgba(200,150,80,0.55)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(CX, trunkBot); ctx.quadraticCurveTo(CX + Math.sin(ang) * rl * 0.5, trunkBot + rl * 0.5, CX + Math.sin(ang) * rl, trunkBot + Math.cos(ang) * rl * 0.8); ctx.stroke();
      });
      const tg = ctx.createLinearGradient(CX - 12, 0, CX + 12, 0); tg.addColorStop(0, "#3a2010"); tg.addColorStop(0.5, "#8a5020"); tg.addColorStop(1, "#3a2010");
      ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(CX - 9, trunkBot); ctx.lineTo(CX - 5, trunkTop); ctx.lineTo(CX + 5, trunkTop); ctx.lineTo(CX + 9, trunkBot); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,215,0,0.8)"; ctx.font = `bold ${8 * DPR}px monospace`; ctx.save(); ctx.translate(CX, (trunkTop + trunkBot) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`Q9 ${q9}`, 0, 0); ctx.restore();
      visibleRoh.forEach((r, i) => {
        const n = visibleRoh.length;
        const ang = n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.PI * 0.85;
        const bl = H * 0.24 * (0.7 + 0.3 * Math.sin(i * 1.7));
        const lx = CX + Math.sin(ang) * bl, ly = trunkTop - Math.cos(ang) * bl;
        const correct = run.answered[r.id], wrong = run.wrong[r.id], isA = activeQ?.rohId === r.id;
        const col = correct ? "#00ff88" : wrong ? "#ff4444" : isA ? "#ffd700" : "#9ca3af";
        ctx.strokeStyle = col; ctx.lineWidth = 1.6 + breath * 1.6; ctx.beginPath(); ctx.moveTo(CX, trunkTop + (i % 3) * 6); ctx.quadraticCurveTo((CX + lx) / 2, (trunkTop + ly) / 2 - 8, lx, ly); ctx.stroke();
        const px = CX + (lx - CX) * breath, py = trunkTop + (ly - trunkTop) * breath;
        ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.arc(px, py, 3 + breath * 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, ly, 10 + r.tiefe * 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.font = `bold ${10 * DPR}px monospace`; ctx.fillText(r.sym, lx, ly);
        ctx.fillStyle = "rgba(217,224,240,0.7)"; ctx.font = `${7 * DPR}px monospace`; ctx.fillText(r.name.slice(0, 12), lx, ly + 20 + r.tiefe * 7);
        if (isA) { ctx.strokeStyle = "#ffd700"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(lx, ly, 16 + r.tiefe * 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      });
      ctx.fillStyle = "#ffd700"; ctx.font = `bold ${10 * DPR}px monospace`;
      ctx.fillText(`WERT ${Math.round(totalWert)} · ★ ${Math.floor(totalWert / Q9)} · Dr=${dr} · ${visibleRoh.length} Rohstoffe`, CX, H - 14 * DPR);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achsen, q9, dr, run, activeQ, totalWert, lw, spin, klausur]);

  useEffect(() => { busLog("╔══ WURZELMATIC ZOLL·ECONOMY GEWURZELT ══╗"); busLog("║ 1 Achse = 30° = 1/12 Wurzel · 12 × 30° = 360° = Q9"); busLog("║ WURZEL 3→9→81→243→756→19683 · OVERFLOW 756 = 729+27"); busLog("║ 13 Rohstoffe → 11 Produzenten → 1 Wert → 1 Zoll"); }, []);

  const pol = (deg: number, r: number) => { const a = ((deg - 90) * Math.PI) / 180; return [200 + Math.cos(a) * r, 200 + Math.sin(a) * r] as const; };
  const grad = aktive * 30;
  const [wx, wy] = pol(0, 160); const [bx, by] = pol(Math.min(grad, 359.9), 160);
  const wedge = grad > 0 ? `M200 200 L${wx} ${wy} A160 160 0 ${grad > 180 ? 1 : 0} 1 ${bx} ${by} Z` : "";
  const stars = Math.floor(totalWert / Q9);
  const q = activeQ ? klausur[activeQ.rohId] : null;
  const qRoh = activeQ ? ROHSTOFFE.find((r) => r.id === activeQ.rohId) : null;
  const timerPct = activeQ ? Math.max(0, (activeQ.deadline - Date.now()) / (activeQ.deadline - activeQ.openedAt)) : 0;

  const exportManifest = () => {
    const manifest = {
      format: "WGEN-2-NUTZRAUM", v: "WURZELMATIC-ZOLL-ECONOMY-GEWURZELT", timestamp: new Date().toISOString(),
      zoll: { q9, achsen: achsen.map((a) => ({ id: a.id, deg: a.deg, dr: a.dr, on: a.on })), aktiv: aktive, omega, wert: zollWert, wahrheit },
      wurzel: { W: "W(a(s(d)))", d: "innen", tmp, rar, sein, leben, ketteNeu: WURZEL_NEW, ketteAlt: WURZEL_OLD, overflow: OVERFLOW, mystery: MYSTERY },
      matic: { raf: "single", fpsQuelle: "getFPS()", truthCache: "Map", bus: "CTRL/nutz-bus/ctrl:patch/postMessage" },
      physik: { good, skala: drChain, q9 },
      formula: "Ω = Σ(Achse×Wert) × Dr/81 × Q9 / 12 × Rohstoffe/13 × Produzenten/11",
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wurzelmatic-zoll-economy-${Date.now()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    busLog("⎙ MANIFEST exportiert · ZOLL=" + q9 + " Dr=" + dr + " OVERFLOW=756");
  };

  const slider = (label: string, val: string, min: number, max: number, step: number, v: number, set: (n: number) => void) => (
    <div>
      <label className="flex justify-between text-[10px]" style={{ color: "var(--dim)" }}><span>{label}</span><b style={{ color: "var(--gold)" }}>{val}</b></label>
      <input type="range" className="w-full" min={min} max={max} step={step} value={v} onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
    </div>
  );

  const shellStyle = { boxSizing: "border-box" as const, paddingTop: "var(--safe-area-inset-top)", background: "var(--bg)" };

  return (
    <div data-safe-area-inset-root className="min-h-screen w-full overflow-x-clip" style={shellStyle}>
      {/* HEADER */}
      <header data-safe-area-sticky-top style={{ top: "var(--safe-area-inset-top)", background: "var(--panel)", borderBottom: "1px solid var(--line)" }} className="sticky z-40 flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold tracking-widest" style={{ color: "var(--gold)" }}>cycOS · WURZELMATIC ZOLL·ECONOMY</span>
          <span className="rounded-full border px-2 py-0.5 text-[9px]" style={{ borderColor: "var(--line)", color: "var(--gold)" }}>W(a(s(d))) d innen</span>
          <span className="rounded-full border px-2 py-0.5 text-[9px]" style={{ borderColor: "var(--ready)", color: "var(--ready)" }}>ZOLL {q9}</span>
          <span className="rounded-full border px-2 py-0.5 text-[9px]" style={{ borderColor: "var(--line)" }}>Dr={dr}</span>
          <span className="rounded-full border px-2 py-0.5 text-[9px]" style={{ borderColor: "var(--fire)", color: "var(--fire)" }}>OVERFLOW 756</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          <span style={{ color: "var(--gold)" }}>ACHSE {aktive}/12 · {grad}°</span>
          <span style={{ color: "var(--ready)" }}>{fps} FPS</span>
          <span style={{ color: "var(--dim)" }}>CO₂ {co2}</span>
          <span style={{ color: "var(--gold)" }}>{atem.phase} · {atem.rem.toFixed(1)}s</span>
          <span className="rounded px-2 py-0.5 font-extrabold text-black" style={{ background: "linear-gradient(90deg,#ffd700,#ff7a45)" }}>WERT {Math.round(totalWert)}</span>
          <span style={{ color: "var(--gold)" }}>★ {stars}</span>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[300px_1fr_340px]">
        {/* LEFT: ZOLL PANEL + ATEM */}
        <aside className="p-3" style={{ background: "var(--side)", borderRight: "1px solid var(--line)" }}>
          <div className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>ZOLL-RING · 12 ACHSEN · 30°</div>
          <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-[280px]" role="img" aria-label="Zoll-Ring mit 12 Achsen">
            {[192, 122, 72, 36].map((r, i) => (<circle key={r} cx={200} cy={200} r={r} fill="none" stroke={["#14202c", "#14202c", "#1e3448", "#2a4a62"][i]} strokeDasharray={i < 2 ? "3 6" : "0"} />))}
            <g transform={`rotate(${rot} 200 200)`}>
              {wedge && <path d={wedge} fill="#39ff88" opacity={0.12} />}
              <polygon points={achsen.filter((a) => a.on).map((a) => pol(a.deg, 156).join(",")).join(" ")} fill="none" stroke="#39ff88" strokeDasharray="3 4" opacity={0.35} />
              {achsen.map((a, i) => {
                const [x, y] = pol(a.deg, 160); const [lx, ly] = pol(a.deg, 184); const [ix, iy] = pol(a.deg, 92);
                return (
                  <g key={a.id} style={{ cursor: "pointer" }}
                    onClick={() => busLog(`busPuls: ${a.id} · ${a.label}`)}
                    onDoubleClick={() => setAchsen((p) => p.map((x2, j) => (j === i ? { ...x2, on: !x2.on } : x2)))}>
                    <line x1={200} y1={200} x2={x} y2={y} stroke={a.on ? "#39ff88" : "#2a3a4a"} strokeWidth={a.on ? 1.2 : 0.6} />
                    <circle cx={x} cy={y} r={a.on ? 5 : 3.2} fill={a.on ? "#02060a" : "#0a1520"} stroke={a.on ? "#39ff88" : "#2a3a4a"} />
                    <circle cx={x} cy={y} r={16} fill="transparent" />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fill={a.on ? "#39ff88" : "#4a5a6a"}>{a.deg}°</text>
                    <text x={ix} y={iy} textAnchor="middle" fontSize={8} fontWeight={800} fill={a.on ? "#c8f5d8" : "#5a6a7a"} transform={`rotate(${a.deg} ${ix} ${iy})`}>{a.id}</text>
                  </g>
                );
              })}
            </g>
            <circle cx={200} cy={200} r={36} fill="#02060a" stroke="#39ff88" strokeWidth={1.2} />
            <text x={200} y={190} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#39ff88">ZOLL</text>
            <text x={200} y={206} textAnchor="middle" fontSize={11} fontWeight={800} fill="#ffd700">{q9}</text>
            <text x={200} y={218} textAnchor="middle" fontSize={7} fill="#c8f5d8">{aktive} ACHSEN</text>
          </svg>
          <p className="text-center text-[9px] leading-relaxed" style={{ color: "var(--dim)" }}>1 Achse = 30° = 1 Dr-Schritt = 1/12 Wurzel<br />12 × 30° = 360° = 1 Zoll · Klick = Puls · Doppelklick = an/aus</p>

          <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--line)" }}>
            <div className="text-[10px]" style={{ color: "var(--gold)" }}>AKTIVE ACHSEN <b>{aktive}/12</b></div>
            <div className="mt-1 space-y-0.5 text-[9px]">
              {achsen.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span style={{ color: a.on ? "#39ff88" : "#5a6a7a" }}>{a.on ? "●" : "○"} {a.id} {a.label} <span style={{ color: "var(--dim)" }}>· {a.tag} · Dr{a.dr}</span></span>
                  <span style={{ color: "var(--gold)" }}>{a.deg}°</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="rounded border px-2 py-1.5 text-[10px]" style={{ borderColor: "var(--line)", background: "#121c2e" }} onClick={() => setSpin({ t0: performance.now(), from: rot })}>↻ SPIN 360°</button>
            <button className="rounded border px-2 py-1.5 text-[10px]" style={{ borderColor: "var(--line)", background: "#121c2e" }} onClick={() => { const all = achsen.every((a) => a.on); setAchsen((p) => p.map((a) => ({ ...a, on: !all }))); }}>◫ ALLE 12</button>
          </div>

          {/* ATEM RING */}
          <div className="mt-4 rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <div className="flex justify-between text-[10px] font-bold" style={{ color: "var(--gold)" }}><span>ATEM-ZYKLUS</span><b style={{ color: "var(--ready)" }}>16s</b></div>
            <div className="relative mx-auto aspect-square w-full max-w-[170px]">
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <circle cx={50} cy={50} r={44} fill="none" stroke="#1a2c3a" strokeWidth={2} />
                <circle cx={50} cy={50} r={44} fill="none" stroke="#ffd700" strokeWidth={3} strokeDasharray={276} strokeDashoffset={276 - (atem.cycleT / atem.cycleDur) * 276} transform="rotate(-90 50 50)" strokeLinecap="round" />
                <circle cx={50} cy={50} r={20 + atem.progress * 16} fill="rgba(255,215,0,0.15)" stroke="#ffd700" strokeWidth={1.5} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-xl font-extrabold tracking-widest" style={{ color: atem.phase === "EIN" ? "#00ff88" : atem.phase === "HALT" ? "#ffd700" : atem.phase === "AUS" ? "#ff7a45" : "#8aa0c0" }}>{atem.phase}</div>
                <div className="text-[9px]" style={{ color: "var(--dim)" }}>{atem.rem.toFixed(1)}s / {atem.cycleDur.toFixed(0)}s</div>
                <div className="text-[11px] font-bold" style={{ color: "var(--ready)" }}>{atem.progress.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              {[81, 27, 3, 0].map((d) => (
                <button key={d} onClick={() => { setDrIdx(drChain.indexOf(d)); busLog(`Dr → ${d}`); }} className="flex-1 rounded border py-1 text-[10px] font-bold"
                  style={{ borderColor: "var(--line)", background: dr === d ? (d === 81 ? "#ffd700" : d === 27 ? "#00ccff" : d === 3 ? "#32d583" : "#ff7a45") : "#121c2e", color: dr === d ? "#000" : "#8aa0c0" }}>{d}{d === 81 ? "◆" : d === 27 ? "▣" : d === 3 ? "↺" : "·"}</button>
              ))}
            </div>
            <div className="mt-1 text-center text-[9px]" style={{ color: "var(--dim)" }}>Dr-Morph · {dr === 81 ? "13 Rohstoffe" : dr === 27 ? "7 Rohstoffe" : dr === 3 ? "3 Rohstoffe" : "1 Kern"}</div>
          </div>
        </aside>

        {/* CENTER STAGE */}
        <main className="relative min-h-[520px]" style={{ background: "radial-gradient(120% 120% at 50% 0%,#0a1220,#02060a)" }}>
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
          <div className="pointer-events-none absolute left-3 top-3 min-w-[230px] rounded-lg border p-2 text-[10px] leading-relaxed" style={{ background: "rgba(10,18,32,.85)", borderColor: "var(--line)" }}>
            <div><b style={{ color: "var(--gold)" }}>ZOLL LIVE</b> · 1 Einheit · 4 Busse</div>
            {[["ZoLL-Wert", String(q9)], ["Achsen aktiv", `${aktive}/12`], ["Wurzel-Zeit t", `${atemRef.current.toFixed(1)}s`], ["Dr-Kette", "81→27→3→0 + 756 OVERFLOW"], ["Wahrheit", wahrheit.toFixed(2)], ["Good", good.toFixed(2)], ["WURZEL", WURZEL_NEW.join("→")]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><span style={{ color: "var(--dim)" }}>{k}</span><span className="font-bold" style={{ color: "var(--ready)" }}>{v}</span></div>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 max-w-[340px] rounded-lg border p-2 text-[9px] leading-relaxed" style={{ background: "rgba(10,18,32,.88)", borderColor: "var(--line)" }}>
            <div><b style={{ color: "var(--gold)" }}>WURZELMATIC ZOLL·ECONOMY</b></div>
            <div>1 Achse = <b style={{ color: "var(--gold)" }}>30°</b> = <b style={{ color: "var(--gold)" }}>1/12</b> Wurzel = <b style={{ color: "var(--gold)" }}>1 Dr-Schritt</b></div>
            <div>12 Achsen = <b style={{ color: "var(--gold)" }}>360°</b> = <b style={{ color: "var(--gold)" }}>1 Zoll</b> = <b style={{ color: "var(--gold)" }}>Q9=19683</b></div>
            <div style={{ color: "var(--ready)" }}>Ω = Σ(Achse×Wert) × Dr/81 × 19683 / 12 × Rohstoffe/13 × Produzenten/11</div>
            <div style={{ color: "var(--dim)" }}>Wurzel = W(a(s(d))) · d innen · Wahrheit = TMP×RÄR/729×SEIN×LEBEN</div>
            <div style={{ color: "var(--fire)" }}>OVERFLOW = 756 = 729+27 · 7+5+6 = 18 = 2×9 · mystery = 27/19683×1.618 = {MYSTERY.toFixed(5)}</div>
          </div>

          {/* KLAUSUR MODAL */}
          {activeQ && q && qRoh && (
            <div className="absolute bottom-6 left-1/2 z-30 w-[min(480px,92%)] -translate-x-1/2 rounded-xl border-2 p-4" style={{ background: "rgba(10,18,32,.97)", borderColor: "#ffd700aa", boxShadow: "0 0 44px #ffd70044" }}>
              <div className="mb-1 flex justify-between text-[10px] tracking-widest" style={{ color: "var(--gold)" }}><span style={{ color: "var(--ready)" }}>{qRoh.sym} {qRoh.name}</span><span>{run.hits + run.misses + 1} / 3</span></div>
              <div className="mb-3 text-[14px]">{q.frage}</div>
              <div className="flex flex-col gap-2">
                {q.optionen.map((o, i) => (<button key={i} onClick={() => answer(i)} className="rounded-lg border px-3 py-2 text-left text-[12px]" style={{ background: "#121c2e", borderColor: "#ffd70044" }}>{o}</button>))}
              </div>
              <div className="mt-3 h-[3px] rounded" style={{ width: `${timerPct * 100}%`, background: timerPct > 0.5 ? "#00ff88" : timerPct > 0.2 ? "#ffd700" : "#ff4444", transition: "width .1s linear" }} />
            </div>
          )}

          {/* END OF RUN OVERLAY */}
          {showOpt && (
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(2,6,10,.94)" }}>
              <div className="max-h-[85%] w-[min(560px,95vw)] overflow-auto rounded-xl border p-5" style={{ background: "var(--panel)", borderColor: "#ffd70066" }}>
                <h2 className="mb-3 text-[15px] tracking-[.2em]" style={{ color: "var(--gold)" }}>LAUF BEENDET</h2>
                {[["WERT gesamt", Math.round(totalWert)], ["★ Sterne", stars], ["Treffer", `${run.hits}`], ["Verpasst", `${run.misses}`], ["Genauigkeit", `${run.hits + run.misses ? Math.round((run.hits / (run.hits + run.misses)) * 100) : 0}%`], ["Lernweise", `${lw.tempo.toFixed(1)}× · ${lw.tiefe.toFixed(2)} · ${lw.ziel.toUpperCase()}`]].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between border-b py-1 text-[12px]" style={{ borderColor: "#ffd70011" }}><span>{k}</span><b style={{ color: "var(--gold)" }}>{v}</b></div>
                ))}
                <div className="mt-3 text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>PRO ROHSTOFF</div>
                {ROHSTOFFE.map((r) => (<div key={r.id} className="flex justify-between py-0.5 text-[11px]"><span>{r.sym} {r.name}</span><b style={{ color: run.answered[r.id] ? "#00ff88" : run.wrong[r.id] ? "#ff4444" : "#666" }}>{run.answered[r.id] ? "✓" : run.wrong[r.id] ? "✗" : "—"}</b></div>))}
                <div className="mt-3 rounded-lg border p-3 text-[11px]" style={{ background: "#ffd70011", borderColor: "#ffd70044", color: "var(--gold)" }}>💡 {run.hits >= 3 ? "Perfekt — erhöhe TEMPO für mehr Flow." : run.misses >= 2 ? "Senke TEMPO, erhöhe TIEFE für längere Fenster." : "Gleichgewicht sieht gut aus — kleine Anpassungen testen."}</div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded border py-2 text-[12px] font-bold" style={{ background: "#121c2e", color: "var(--gold)", borderColor: "#ffd70066" }} onClick={() => setShowOpt(false)}>OPTIMIEREN</button>
                  <button className="flex-1 rounded py-2 text-[12px] font-bold text-black" style={{ background: "var(--gold)" }} onClick={() => { setShowOpt(false); startRun(); }}>NOCHMAL</button>
                </div>
              </div>
            </div>
          )}

          {/* EDITOR OVERLAY */}
          {showEditor && (
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(2,6,10,.94)" }}>
              <div className="max-h-[85%] w-[min(560px,95vw)] overflow-auto rounded-xl border p-5" style={{ background: "var(--panel)", borderColor: "#ffd70066" }}>
                <h2 className="mb-3 text-[15px] tracking-[.2em]" style={{ color: "var(--gold)" }}>KLAUSUR EDITOR · 13 Rohstoffe</h2>
                {ROHSTOFFE.map((r) => {
                  const k = klausur[r.id];
                  return (
                    <div key={r.id} className="mb-2 rounded-md border p-2" style={{ borderColor: "#ffd70022", background: "#060d18" }}>
                      <div className="mb-1 flex justify-between text-[10px]" style={{ color: "var(--gold)" }}><span>{r.sym} {r.name}</span><b style={{ color: "var(--ready)" }}>{r.kat}</b></div>
                      <input className="mb-1 w-full rounded border px-2 py-1 text-[11px]" style={{ background: "#0a1220", borderColor: "#ffd70033", color: "var(--ink)" }} value={k.frage}
                        onChange={(e) => { const nk = { ...klausur, [r.id]: { ...k, frage: e.target.value } }; setKlausur(nk); persist({ klausur: nk }); }} aria-label={`Frage ${r.name}`} />
                      {k.optionen.map((opt, i) => (
                        <div key={i} className="mb-1 flex items-center gap-2">
                          <input type="radio" name={`richtig-${r.id}`} checked={k.richtig === i} aria-label={`Richtig ${r.name} ${i + 1}`}
                            onChange={() => { const nk = { ...klausur, [r.id]: { ...k, richtig: i } }; setKlausur(nk); persist({ klausur: nk }); }} />
                          <input className="flex-1 rounded border px-2 py-1 text-[11px]" style={{ background: "#0a1220", borderColor: "#ffd70033", color: "var(--ink)" }} value={opt}
                            onChange={(e) => { const no = [...k.optionen]; no[i] = e.target.value; const nk = { ...klausur, [r.id]: { ...k, optionen: no } }; setKlausur(nk); persist({ klausur: nk }); }} aria-label={`Option ${r.name} ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  );
                })}
                <button className="mt-2 w-full rounded py-2 text-[12px] font-bold text-black" style={{ background: "var(--gold)" }} onClick={() => setShowEditor(false)}>SCHLIESSEN</button>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT TWEAK */}
        <aside className="space-y-3 p-3" style={{ background: "var(--side)", borderLeft: "1px solid var(--line)" }}>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}>ZOLL · SKALA</h5>
            <div className="space-y-2">
              {slider("Dr-Kette", String(dr), 0, 3, 1, drIdx, setDrIdx)}
              {slider("Q9 Basis", String(q9), 729, 19683, 729, q9, setQ9)}
              {slider("Good-Schwelle", good.toFixed(2), 0, 100, 0.1, good, setGood)}
            </div>
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}>WURZEL · PARAMETER</h5>
            <div className="space-y-2">
              {slider("TMP 0-728", String(tmp), 0, 728, 1, tmp, setTmp)}
              {slider("RÄR %", rar + "%", 0, 100, 1, rar, setRar)}
              {slider("SEIN", String(sein), 0, 100, 1, sein, setSein)}
              {slider("LEBEN", String(leben), 0, 100, 1, leben, setLeben)}
            </div>
            <div className="mt-2 text-[10px]" style={{ color: "var(--dim)" }}>Wahrheit = <b style={{ color: "var(--ready)" }}>{wahrheit.toFixed(2)}</b> · Gate {gateOpen ? <span style={{ color: "var(--ready)" }}>OPEN</span> : <span style={{ color: "var(--red)" }}>CLOSED</span>} · Overflow-Gate {overflowGate ? <span style={{ color: "var(--ready)" }}>Ω≥0.0384 ✓</span> : "Ω<0.0384"}</div>
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}>WURZEL · 3→9→81→243→756→19683</h5>
            <div className="space-y-1 text-[10px]">
              {WURZEL_NEW.map((n, i) => (
                <div key={n} className="flex justify-between"><span>3^{wurzel(n).toFixed(2)} {i < WURZEL_NEW.length - 1 ? "→" : ""}</span><b style={{ color: n === 756 ? "var(--fire)" : "var(--gold)" }}>{n}{n === 756 ? " = 729+27 OVERFLOW-TOR" : ""}</b></div>
              ))}
              <div className="pt-1" style={{ color: "var(--dim)" }}>alt: {WURZEL_OLD.join("→")} · Volumen jetzt <b style={{ color: "var(--fire)" }}>756</b> statt 729 · Diff 27 · mystery {MYSTERY.toFixed(5)}</div>
              <div className="flex flex-wrap gap-1 pt-1">{WURZEL_NEW.map((n) => (<span key={n} className="rounded border px-1.5 py-0.5 text-[9px]" style={{ borderColor: "var(--line)", color: "var(--gold)" }}>3^{wurzel(n).toFixed(1)}={n}</span>))}</div>
            </div>
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}>LERNWEISE · EDITIERBAR</h5>
            <div className="space-y-2">
              {slider("TEMPO", lw.tempo.toFixed(1), 0.3, 2.5, 0.1, lw.tempo, (v) => { const n = { ...lw, tempo: v }; setLw(n); persist({ lernweise: n }); })}
              {slider("TIEFE", lw.tiefe.toFixed(2), 0, 1, 0.05, lw.tiefe, (v) => { const n = { ...lw, tiefe: v }; setLw(n); persist({ lernweise: n }); })}
              {slider("RHYTHMUS", lw.rhythmus.toFixed(2), 0, 1, 0.05, lw.rhythmus, (v) => { const n = { ...lw, rhythmus: v }; setLw(n); persist({ lernweise: n }); })}
            </div>
            <div className="mt-2 flex gap-1">
              {["sofort", "verzoegert"].map((f) => (<button key={f} onClick={() => { const n = { ...lw, feedback: f }; setLw(n); persist({ lernweise: n }); }} className="flex-1 rounded border py-1 text-[9px] font-bold" style={{ background: lw.feedback === f ? "#ffd700" : "#121c2e", color: lw.feedback === f ? "#000" : "#8aa0c0", borderColor: "var(--line)" }}>{f.toUpperCase()}</button>))}
            </div>
            <div className="mt-1 flex gap-1">
              {["verstehen", "tun"].map((z) => (<button key={z} onClick={() => { const n = { ...lw, ziel: z }; setLw(n); persist({ lernweise: n }); }} className="flex-1 rounded border py-1 text-[9px] font-bold" style={{ background: lw.ziel === z ? "#ffd700" : "#121c2e", color: lw.ziel === z ? "#000" : "#8aa0c0", borderColor: "var(--line)" }}>{z.toUpperCase()}</button>))}
            </div>
            <div className="mt-1 text-[9px]" style={{ color: "var(--dim)" }}>{saveMsg}</div>
          </div>
          <div className="rounded-md border p-2 text-center" style={{ borderColor: "#ffd70044", background: "linear-gradient(180deg,#ffd70018,#0a1220)" }}>
            <div className="text-[24px] font-black" style={{ color: "var(--gold)", textShadow: "0 0 12px #ffd70066" }}>{Math.round(totalWert)}</div>
            <div className="text-[8px] tracking-[.15em]" style={{ color: "#ffd70088" }}>WURZEL-WERT · Ω</div>
            <div className="mt-1 text-[11px]" style={{ color: "var(--gold)" }}>★ {stars} · {totalRuns} Läufe</div>
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 flex justify-between text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}><span>ROHSTOFFE · 13</span><b style={{ color: "var(--ready)" }}>{Object.keys(run.answered).length}/13</b></h5>
            <div className="grid grid-cols-2 gap-1">
              {ROHSTOFFE.map((r) => {
                const cls = run.answered[r.id] ? { borderColor: "#00ff88", background: "#00ff8811" } : run.wrong[r.id] ? { borderColor: "#ff4444", background: "#ff444411" } : activeQ?.rohId === r.id ? { borderColor: "#ffd700", background: "#ffd70022" } : { borderColor: "#ffd70022", background: "#0a1220" };
                return (<button key={r.id} onClick={() => { if (!run.active) setShowEditor(true); }} className="rounded border p-1.5 text-center" style={cls}>
                  <div className="text-[15px]" style={{ color: "var(--gold)" }}>{r.sym}</div>
                  <div className="text-[8px] font-bold leading-tight">{r.name.slice(0, 11)}</div>
                  <div className="text-[7px]" style={{ color: "var(--dim)" }}>{r.kat} · {Math.round(r.tiefe * 100)}%</div>
                </button>);
              })}
            </div>
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 flex justify-between text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}><span>PRODUZENTEN · 11</span><b style={{ color: "var(--ready)" }}>{PRODUZENTEN.filter((p) => p.roh.some((id) => run.answered[id])).length}/11</b></h5>
            <div className="space-y-1">
              {PRODUZENTEN.map((p) => { const live = p.roh.some((id) => run.answered[id]); return (<div key={p.id} className="flex items-center justify-between rounded border px-2 py-1 text-[9px]" style={{ borderColor: live ? "#00ff88" : "#ffd70011", color: live ? "#00ff88" : "inherit", background: "#0a1220" }}><span><span className="mr-1 font-bold" style={{ color: "var(--gold)" }}>{p.sym}</span>{p.name}</span><span>{Math.round(p.konv * 100)}%</span></div>); })}
            </div>
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-2 flex justify-between text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}><span>LAUF</span><b style={{ color: run.active ? "#ffd700" : "#8aa0c0" }}>{run.active ? "RUN" : "IDLE"}</b></h5>
            {[["Progress", run.active ? Math.round((run.t / run.dur) * 100) + "%" : "0%"], ["Richtige", run.hits], ["Falsche", run.misses], ["Runs total", totalRuns]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-0.5 text-[10px]"><span style={{ color: "var(--dim)" }}>{k}</span><b style={{ color: "var(--gold)" }}>{v}</b></div>
            ))}
          </div>
          <div className="rounded-md border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <h5 className="mb-1 text-[10px] font-bold tracking-widest" style={{ color: "var(--gold)" }}>4 BUSSE · LIVE</h5>
            <div className="text-[9px]" style={{ color: "var(--dim)" }}>CTRL.emit ↔ nutz-bus ↔ ctrl:patch ↔ postMessage</div>
            <div className="mt-1 h-[90px] overflow-auto rounded border p-1 text-[8px] leading-relaxed" style={{ background: "#000", borderColor: "var(--line)", color: "#8aa0c0" }}>
              {log.map((l, i) => (<div key={i}>{l}</div>))}
            </div>
          </div>
          <button className="w-full rounded py-2 text-[11px] font-bold text-black" style={{ background: "var(--gold)" }} onClick={() => busLog(`ZOLL BERECHNET: Ω=${omega.toFixed(3)} Wert=${zollWert.toFixed(0)} Dr=${dr} OVERFLOW-Gate ${overflowGate ? "OFFEN" : "zu"}`)}>📐 ZOLL BERECHNEN</button>
          <button className="w-full rounded border py-2 text-[11px]" style={{ borderColor: "var(--line)", background: "#121c2e" }} onClick={exportManifest}>💾 MANIFEST EXPORT</button>
        </aside>
      </div>

      {/* DOCK */}
      <footer className="flex flex-wrap items-center gap-2 px-3 py-2" style={{ background: "var(--panel)", borderTop: "1px solid var(--line)" }}>
        <div className="flex flex-1 flex-wrap gap-2">
          {[["ZOLL", q9, "var(--ready)"], ["ACHSEN", `${aktive}/12`, "var(--gold)"], ["Ω", omega.toFixed(3), "var(--gold)"], ["Dr", dr, "var(--gold)"], ["WAHRHEIT", wahrheit.toFixed(2), "var(--gold)"], ["GATE", gateOpen ? "OPEN" : "CLOSED", gateOpen ? "var(--ready)" : "var(--red)"], ["FPS", fps, "var(--gold)"], ["OVERFLOW", "756", "var(--fire)"]].map(([k, v, c]) => (
            <div key={k as string} className="flex min-w-[92px] flex-col items-center rounded-md border px-2 py-1" style={{ background: "#121c2e", borderColor: "var(--line)" }}>
              <span className="text-[8px] tracking-widest" style={{ color: "var(--dim)" }}>{k}</span>
              <span className="text-[14px] font-bold" style={{ color: c as string }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded px-4 py-2 text-[11px] font-bold tracking-widest text-black" style={{ background: "var(--gold)" }} disabled={run.active} onClick={startRun}>▶ START LAUF</button>
          <button className="rounded border px-4 py-2 text-[11px] font-bold tracking-widest" style={{ borderColor: "#ffd70044", color: "var(--gold)", background: "#121c2e", opacity: run.active ? 1 : 0.4 }} disabled={!run.active} onClick={stopRun}>■ STOP</button>
          <button className="rounded border px-4 py-2 text-[11px] font-bold tracking-widest" style={{ borderColor: "#ffd70044", color: "var(--gold)", background: "#121c2e" }} onClick={() => setShowEditor(true)}>✎ KLAUSUR</button>
          <button className="rounded border px-4 py-2 text-[11px] font-bold tracking-widest" style={{ borderColor: "#ffd70044", color: "var(--gold)", background: "#121c2e" }} onClick={exportManifest}>⎙ EXPORT</button>
          <button className="rounded border px-4 py-2 text-[11px] font-bold tracking-widest" style={{ borderColor: "#ff453a", color: "#ff453a", background: "#121c2e" }}
            onClick={async () => { setTotalWert(0); setTotalRuns(0); setKlausur(defaultKlausur()); setLw({ tempo: 1, tiefe: 0.5, rhythmus: 0.5, feedback: "sofort", ziel: "verstehen" }); stopRun(); try { if (stateIdRef.current) await api("records.delete", { collection: COL, id: stateIdRef.current }); stateIdRef.current = null; setSaveMsg("Zurückgesetzt — neuer Spielstand beim nächsten Speichern"); } catch { setSaveMsg("Reset lokal ausgeführt"); } busLog("⟲ RESET"); }}>⟲ RESET</button>
        </div>
      </footer>
      <div className="px-3 pb-3 text-center text-[9px]" style={{ color: "var(--dim)" }}>hoch(exp)=3^exp · wurzel(n)=log₃(n) · 756 = 729+27 OVERFLOW-TOR · Ω-Gate ≥ 0.7 &amp; Good ≥ 79.84 · Overflow-Gate Ω ≥ 756/19683 = 0.0384 · Spielstand wird serverseitig gespeichert (kein localStorage)</div>
    </div>
  );
}
