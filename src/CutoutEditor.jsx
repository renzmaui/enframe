import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const buttonStyle = { minHeight: 44, padding: "8px 14px", borderRadius: 10, border: "1px solid #877782", background: "#31252e", color: "#fff", cursor: "pointer" };

export default function CutoutEditor({ original, initial, onApply, onCancel }) {
  const canvasRef = useRef(null), stageRef = useRef(null), dialogRef = useRef(null);
  const maskRef = useRef(null), baseRef = useRef(null), gesture = useRef(null);
  const history = useRef({ items: [], index: -1 });
  const [tool, setTool] = useState("erase"), [brush, setBrush] = useState(50);
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ w: 1, h: 1 });
  const [bounds, setBounds] = useState({ w: 300, h: 300 });
  const [revision, setRevision] = useState(0), [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const alive = useRef(true);

  function redraw() {
    const canvas = canvasRef.current, base = baseRef.current, mask = maskRef.current;
    if (!canvas || !base || !mask) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  function snapshot() {
    const mask = maskRef.current;
    const rgba = mask.getContext("2d").getImageData(0, 0, mask.width, mask.height).data;
    const alpha = new Uint8ClampedArray(mask.width * mask.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    const h = history.current;
    h.items = h.items.slice(0, h.index + 1);
    h.items.push(alpha);
    if (h.items.length > 16) h.items.shift();
    h.index = h.items.length - 1;
    setRevision(n => n + 1);
  }

  function travel(offset) {
    const h = history.current, next = h.index + offset;
    if (gesture.current || next < 0 || next >= h.items.length) return;
    h.index = next;
    const mask = maskRef.current, ctx = mask.getContext("2d");
    const data = ctx.createImageData(mask.width, mask.height), alpha = h.items[next];
    for (let i = 0; i < alpha.length; i++) {
      data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = 255;
      data.data[i * 4 + 3] = alpha[i];
    }
    ctx.putImageData(data, 0, 0);
    redraw();
    setRevision(n => n + 1);
  }

  useEffect(() => {
    alive.current = true;
    const previousFocus = document.activeElement, previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      alive.current = false;
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const scale = Math.min(1, 1080 / Math.max(original.naturalWidth, original.naturalHeight));
    const w = Math.max(1, Math.round(original.naturalWidth * scale));
    const h = Math.max(1, Math.round(original.naturalHeight * scale));
    const base = document.createElement("canvas"), mask = document.createElement("canvas");
    base.width = mask.width = canvasRef.current.width = w;
    base.height = mask.height = canvasRef.current.height = h;
    base.getContext("2d").drawImage(original, 0, 0, w, h);
    const ctx = mask.getContext("2d");
    if (initial) ctx.drawImage(initial, 0, 0, w, h);
    else { ctx.fillStyle = "white"; ctx.fillRect(0, 0, w, h); }
    baseRef.current = base;
    maskRef.current = mask;
    history.current = { items: [], index: -1 };
    redraw();
    snapshot();
    setDimensions({ w, h });
    setReady(true);
  }, [original, initial]);

  useEffect(() => {
    const stage = stageRef.current;
    const observer = new ResizeObserver(() => setBounds({ w: stage.clientWidth, h: stage.clientHeight }));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const fit = Math.min(bounds.w / dimensions.w, bounds.h / dimensions.h) * 0.94;

  function point(e) {
    const canvas = canvasRef.current, rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * canvas.width / rect.width, y: (e.clientY - rect.top) * canvas.height / rect.height };
  }

  function paint(from, to, mode) {
    const ctx = maskRef.current.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = ctx.fillStyle = "white";
    ctx.lineWidth = brush;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(to.x, to.y, brush / 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    redraw();
  }

  function down(e) {
    if (!ready || saving || !e.isPrimary || gesture.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    gesture.current = { id: e.pointerId, mode: tool, p, x: e.clientX, y: e.clientY, pan };
    if (tool !== "move") paint(p, p, tool);
  }

  function move(e) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    if (g.mode === "move") setPan({ x: g.pan.x + e.clientX - g.x, y: g.pan.y + e.clientY - g.y });
    else { const p = point(e); paint(g.p, p, g.mode); g.p = p; }
  }

  function up(e) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.mode !== "move") snapshot();
  }

  function apply() {
    if (!ready || saving || gesture.current) return;
    setSaving(true); setError("");
    try {
      redraw();
      const image = new Image();
      image.onload = () => { if (alive.current) onApply(image); };
      image.onerror = () => { if (alive.current) { setSaving(false); setError("Could not apply the cutout. Please retry."); } };
      image.src = canvasRef.current.toDataURL("image/png");
    } catch { setSaving(false); setError("Could not apply the cutout. Please retry."); }
  }

  function keys(e) {
    if (e.key === "Escape" && !saving) { e.preventDefault(); onCancel(); }
    if (e.key !== "Tab") return;
    const items = [...dialogRef.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select")];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.8)", overflowY: "auto", padding: 12 }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cutout-title" tabIndex={-1} onKeyDown={keys} style={{ maxWidth: 760, margin: "12px auto", padding: 18, borderRadius: 18, background: "#20171e", color: "#fff0e8", boxSizing: "border-box" }}>
        <h2 id="cutout-title">Edit your cutout</h2>
        <p>Erase hides unwanted areas. Restore brings back the original photo where you brush. Use Move and zoom to reach details.</p>
        <div ref={stageRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} style={{ position: "relative", height: "min(48dvh, 420px)", minHeight: 180, overflow: "hidden", touchAction: "none", backgroundColor: "#ddd", backgroundImage: "conic-gradient(#aaa 25%, transparent 0 50%, #aaa 0 75%, transparent 0)", backgroundSize: "24px 24px", borderRadius: 10, cursor: tool === "move" ? "grab" : "crosshair" }}>
          <canvas ref={canvasRef} aria-label="Cutout editing canvas" style={{ position: "absolute", left: "50%", top: "50%", width: dimensions.w * fit * zoom, height: dimensions.h * fit * zoom, maxWidth: "none", transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`, pointerEvents: "none" }} />
        </div>
        <div role="group" aria-label="Cutout tools" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {[ ["move", "Move"], ["erase", "Erase"], ["restore", "Restore"] ].map(([value, label]) => <button key={value} type="button" aria-pressed={tool === value} disabled={saving} onClick={() => setTool(value)} style={{ ...buttonStyle, background: tool === value ? "#764b64" : buttonStyle.background }}>{label}</button>)}
          <button type="button" style={buttonStyle} disabled={!ready || saving || history.current.index <= 0} onClick={() => travel(-1)}>Undo</button>
          <button type="button" style={buttonStyle} disabled={!ready || saving || history.current.index >= history.current.items.length - 1} onClick={() => travel(1)}>Redo</button>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <label htmlFor="cutout-brush">Brush size: {brush} px</label>
          <input id="cutout-brush" type="range" min="4" max="180" value={brush} disabled={saving || tool === "move"} onChange={e => setBrush(Number(e.target.value))} style={{ width: "100%" }} />
          <label htmlFor="cutout-zoom">Editing zoom: {Math.round(zoom * 100)}%</label>
          <input id="cutout-zoom" type="range" min="1" max="4" step=".1" value={zoom} disabled={saving} onChange={e => setZoom(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        <button type="button" style={{ ...buttonStyle, marginTop: 10 }} disabled={saving} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset view</button>
        <p style={{ fontSize: 13 }}>Editing uses a photo copy up to 1080 pixels on its longest edge. Undo keeps the last 15 edits. The moon and frame are never erased.</p>
        {error && <p role="alert">{error}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16 }} data-revision={revision}>
          <button type="button" style={buttonStyle} disabled={saving} onClick={onCancel}>Cancel</button>
          <button type="button" style={{ ...buttonStyle, background: "#764b64" }} disabled={!ready || saving} onClick={apply}>{saving ? "Applying…" : "Apply cutout"}</button>
        </div>
      </section>
    </div>, document.body
  );
}
