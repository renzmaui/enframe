import { useEffect, useRef, useState } from "react";
import CutoutEditor from "./CutoutEditor";
import "./App.css";
import "./PhotoChoices.css";
const SIZE = 1080;
const designs = [
  ...[
    ["meowcedes-frame.PNG", "MEOWCEDES"],
    ["meowcedes-frame-logo.PNG", "MEOWCEDES + LOGO"],
    ["alpinoo-frame.PNG", "ALPINOO"],
    ["alpinoo-frame-logo.PNG", "ALPINOO + LOGO"],
    ["alpinoo-frame-blue.PNG", "ALPINOO(BLUE)"],
    ["alpinoo-frame-blue-logo.PNG", "ALPINOO(BLUE) + LOGO"],
    ["hoonrari-frame.PNG", "HOONRARI"],
    ["hoonrari-frame-logo.PNG", "HOONRARI + LOGO"],
    ["jaybullracing-frame.PNG", "JAYBULLRACING"],
    ["jaybullracing-frame-logo.PNG", "JAYBULLRACING + LOGO"],
    ["mcjakey-frame.PNG", "MCJAKEY"],
    ["mcjakey-frame-logo.PNG", "MCJAKEY + LOGO"],
    ["rikstondrift-frame.PNG", "RIKSTONDRIFT"],
    ["rikstondrift-frame-logo.PNG", "RIKSTONDRIFT + LOGO"],
    ["enwheel-racing.PNG", "ENWHEEL RACING"],
    ["enwheel-racing-logo.PNG", "ENWHEEL RACING + LOGO"],
    ["paddock-announcer.PNG", "PADDOCK ANNOUNCER"],
    ["team-admin.PNG", "TEAM ADMIN"],
  ].map(([file, name]) => ({ src: `/frames/${file}`, name, type: "frame", event: "ENHYPEN MAMA GRAND PRIX", creator: "_rrriooo", creatorUrl: "https://x.com/_rrriooo" })),
  { src: "/frames/bluemoon.png", name: "BLUE MOON FOR ENHYPEN", type: "background", autoRemoveBackground: true, event: "ENHYPEN 2026 MAMA (Mnet Asian Music Awards)", creator: "hypenzonehq", creatorUrl: "https://x.com/hypenzonehq" },
];
const directions = [
  { label: "Move photo up", symbol: "↑", x: 0, y: -10, column: 2, row: 1 },
  { label: "Move photo left", symbol: "←", x: -10, y: 0, column: 1, row: 2 },
  { label: "Move photo right", symbol: "→", x: 10, y: 0, column: 3, row: 2 },
  { label: "Move photo down", symbol: "↓", x: 0, y: 10, column: 2, row: 3 },
];
const zoomButtonStyle = { flex: "0 0 44px", width: "44px", minHeight: "44px", margin: 0, padding: 0, fontSize: "24px" };
function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Image could not load")); image.src = src; }); }
async function blobImage(blob) { const url = URL.createObjectURL(blob); try { return await loadImage(url); } finally { URL.revokeObjectURL(url); } }
function Brand() { return <a className="wordmark" href="#" aria-label="EN-FRAME home"><img className="brand-icon" src="/enframe.svg" alt="" />EN<span>—</span>FRAME</a>; }
function PhotoThumbnail({ image, label }) {
  const ref = useRef(null);
  useEffect(() => { const canvas = ref.current, ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height); if (!image) return; const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight); const w = image.naturalWidth * scale, h = image.naturalHeight * scale; ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h); }, [image]);
  return <canvas ref={ref} width={360} height={240} className="photo-choice-thumb" role="img" aria-label={label} />;
}
export default function App() {
  const canvasRef = useRef(null), fileRef = useRef(null), dragRef = useRef(null), uploadId = useRef(0), removalTask = useRef(null);
  const [selected, setSelected] = useState(0), [filter, setFilter] = useState("all"), [loadedDesign, setLoadedDesign] = useState(null);
  const [source, setSource] = useState({ file: null, image: null }), [cutout, setCutout] = useState(null), [removeEnabled, setRemoveEnabled] = useState(true);
  const [manual, setManual] = useState(null), [editorSession, setEditorSession] = useState(null), [chosen, setChosen] = useState(null);
  const [retry, setRetry] = useState(0), [removalStatus, setRemovalStatus] = useState(""), [removalError, setRemovalError] = useState("");
  const [zoom, setZoom] = useState(1), [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const design = designs[selected], isBackground = design.type === "background", minimumZoom = .1;
  const manualReady = manual?.file === source.file && Boolean(manual?.image), cutoutReady = cutout?.file === source.file && Boolean(cutout?.image);
  const chosenReady = chosen?.file === source.file && Boolean(chosen?.image);
  const autoMode = Boolean(design.autoRemoveBackground && removeEnabled);
  const designImage = loadedDesign?.src === design.src ? loadedDesign.image : null;
  const photo = isBackground ? (chosenReady ? chosen.image : null) : source.image;
  const waiting = Boolean(autoMode && source.file && !cutoutReady && !removalError);
  const manualCandidate = manualReady ? manual.image : source.image;
  const automaticSelected = chosenReady && chosen.kind === "automatic" && chosen.image === cutout?.image;
  const manualSelected = chosenReady && chosen.kind === "manual" && chosen.image === manualCandidate;
  useEffect(() => { let active = true; loadImage(design.src).then(image => { if (active) setLoadedDesign({ src: design.src, image }); }).catch(() => { if (active) setError("This design could not load. Check its filename."); }); return () => { active = false; }; }, [design.src]);
  useEffect(() => {
    let active = true;
    if (!autoMode || !source.file) { setRemovalStatus(""); setRemovalError(""); return; }
    const file = source.file; setRemovalError(""); setRemovalStatus("Preparing your cutout… First use may take longer.");
    if (!removalTask.current || removalTask.current.file !== file) {
      const promise = (async () => { const { removeBackground } = await import("@imgly/background-removal"); const blob = await removeBackground(file, { model: "small", output: { format: "image/png" } }); return blobImage(blob); })();
      removalTask.current = { file, promise };
    }
    removalTask.current.promise.then(image => { if (active) { setCutout({ file, image }); setRemovalStatus("Your automatic cutout is ready. Review it, then choose Use this photo."); } }).catch(() => { if (active) { setRemovalStatus(""); setRemovalError("Background removal failed. Retry or edit the original photo manually."); } });
    return () => { active = false; };
  }, [autoMode, source.file, retry]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; ctx.clearRect(0, 0, SIZE, SIZE); ctx.fillStyle = "#291c21"; ctx.fillRect(0, 0, SIZE, SIZE);
    if (isBackground && designImage) { const scale = Math.max(SIZE / designImage.naturalWidth, SIZE / designImage.naturalHeight); const w = designImage.naturalWidth * scale, h = designImage.naturalHeight * scale; ctx.drawImage(designImage, (SIZE - w) / 2, (SIZE - h) / 2, w, h); }
    if (photo) { const base = isBackground ? Math.min(SIZE * .75 / photo.naturalWidth, SIZE * .75 / photo.naturalHeight) : Math.max(SIZE / photo.naturalWidth, SIZE / photo.naturalHeight); const w = photo.naturalWidth * base * zoom, h = photo.naturalHeight * base * zoom; ctx.drawImage(photo, (SIZE - w) / 2 + position.x, (isBackground ? SIZE - h : (SIZE - h) / 2) + position.y, w, h); }
    else if (!isBackground) { ctx.textAlign = "center"; ctx.fillStyle = "#fff0e8"; ctx.font = "700 100px sans-serif"; ctx.fillText("EN-FRAME", SIZE / 2, SIZE / 2); ctx.fillStyle = "#cdb7ad"; ctx.font = "24px sans-serif"; ctx.fillText("YOUR PHOTO GOES HERE", SIZE / 2, SIZE / 2 + 65); }
    if (!isBackground && designImage) ctx.drawImage(designImage, 0, 0, SIZE, SIZE);
  }, [photo, designImage, isBackground, zoom, position]);
  function reset() { dragRef.current = null; setZoom(1); setPosition({ x: 0, y: 0 }); }
  function chooseDesign(index) { if (designs[index].type !== design.type) reset(); setSelected(index); setError(""); setNotice(""); }
  function changeFilter(value) { setFilter(value); if (value !== "all" && design.type !== value) { const i = designs.findIndex(item => item.type === value); if (i >= 0) chooseDesign(i); } }
  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP image."); return; }
    const id = ++uploadId.current; reset(); setError(""); setNotice(""); setRemovalError(""); setCutout(null); setManual(null); setChosen(null); setEditorSession(null); setSource({ file, image: null });
    try { const image = await blobImage(file); if (id === uploadId.current) setSource({ file, image }); } catch { if (id === uploadId.current) setError("This photo could not load. Choose another image."); }
  }
  function retryRemoval() { removalTask.current = null; setCutout(null); setRemovalError(""); setRemoveEnabled(true); setRetry(n => n + 1); }
  function openEditor() { if (!source.image) return; setEditorSession({ file: source.file, original: source.image, initial: manualReady ? manual.image : null }); }
  function saveEditor(image) { if (editorSession?.file === source.file) { setManual({ file: source.file, image }); setNotice("Your manual cutout is saved. Choose Use this photo to apply it."); } setEditorSession(null); }
  function choosePhoto(kind, image) { if (!source.image || !image) return; setChosen({ file: source.file, kind, image }); setError(""); setNotice(kind === "automatic" ? "Using your automatic cutout." : manualReady ? "Using your manual cutout." : "Using your original photo."); }
  function pointerDown(e) { if (!photo || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return; e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, position }; }
  function pointerMove(e) { const drag = dragRef.current; if (!drag || drag.pointerId !== e.pointerId) return; const scale = SIZE / e.currentTarget.getBoundingClientRect().width; setPosition({ x: drag.position.x + (e.clientX - drag.x) * scale, y: drag.position.y + (e.clientY - drag.y) * scale }); }
  function endDrag(e) { if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null; }
  function adjustZoom(amount) { setZoom(current => Math.min(3, Math.max(minimumZoom, Number((current + amount).toFixed(2))))); }
  function nudgePhoto(x, y) { setPosition(current => ({ x: current.x + x, y: current.y + y })); }
  function download() {
    if (!photo || !designImage || busy) return; setBusy(true); setError(""); setNotice("");
    try { canvasRef.current.toBlob(blob => { setBusy(false); if (!blob) { setError("Download failed. Please retry."); return; } const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `enframe-${design.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); setNotice("Your profile glow-up is ready!"); }, "image/png"); } catch { setBusy(false); setError("Download failed. Please retry."); }
  }
  return <main className="app">
    <nav className="topbar" aria-label="Main navigation"><Brand /><a className="nav-link" href="#studio">Frame studio ↗</a><span className="fan-tag">Made for ENGENEs, by ENGENEs</span></nav>
    <header className="hero"><p className="eyebrow"><span className="status-dot" /> ENGENE FRAME STUDIO</p><h1>Your photo.<br /><span>Your ENHYPEN era.</span></h1><p className="hero-copy">A little creativity. A lot of love for ENHYPEN.<br />Discover community-made frames and backgrounds, and make them yours.</p><div className="hero-tags"><span>01 / CHOOSE</span><span>02 / PERSONALIZE</span><span>03 / SHARE</span></div><span className="hero-orbit" aria-hidden="true">✦</span></header>
    <section className="editor" id="studio" aria-label="Profile design studio">
      <div className="preview-column">
        <div className="panel-heading"><span className="eyebrow">YOUR PREVIEW</span><span className="resolution">1080 × 1080 / PNG</span></div>
        <div className="canvas-shell"><canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ touchAction: photo ? "none" : "auto", cursor: photo ? "grab" : "default" }} aria-label={`Preview of ${design.name}. Drag your photo to reposition it, or use the fine-tune position buttons below.`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} /></div>
        <p className="hint">{photo ? "Drag your photo to reposition it." : isBackground && source.file ? "Choose Use this photo in either panel to add it to the moon." : "Add your photo to begin."}</p>
        <div className="preview-tools" aria-label="Photo adjustments" style={{ width: "100%", minWidth: 0, marginBottom: 20 }}>
          <div className="slider-heading"><label htmlFor="zoom">Photo size</label><output htmlFor="zoom">{Math.round(zoom * 100)}%</output></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><button className="reset" type="button" aria-label="Decrease photo size" disabled={!photo || zoom <= minimumZoom} onClick={() => adjustZoom(-.1)} style={zoomButtonStyle}><span aria-hidden="true">−</span></button><input id="zoom" type="range" min={minimumZoom} max="3" step=".01" value={zoom} disabled={!photo} onChange={e => setZoom(Number(e.target.value))} style={{ flex: 1, width: "100%", minWidth: 0, margin: 0 }} /><button className="reset" type="button" aria-label="Increase photo size" disabled={!photo || zoom >= 3} onClick={() => adjustZoom(.1)} style={zoomButtonStyle}><span aria-hidden="true">＋</span></button></div>
          <button className="reset" type="button" disabled={!photo} onClick={reset} style={{ minHeight: 44, marginTop: 12 }}>Reset adjustments</button>
          <details className="position-controls" style={{ marginTop: 12 }}><summary style={{ minHeight: 44, padding: "12px 0", boxSizing: "border-box", cursor: "pointer" }}>Fine-tune position</summary><p className="hint">Tap an arrow to move your photo a little.</p><div role="group" aria-label="Move photo" style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: 8, justifyContent: "center", marginTop: 12 }}>{directions.map(d => <button key={d.label} className="reset" type="button" aria-label={d.label} disabled={!photo} onClick={() => nudgePhoto(d.x, d.y)} style={{ gridColumn: d.column, gridRow: d.row, width: 48, minHeight: 48, margin: 0, padding: 0, fontSize: 24 }}><span aria-hidden="true">{d.symbol}</span></button>)}</div></details>
        </div>
        <div className="selected-details"><span className="selection-mark" aria-hidden="true">✦</span><div><p>{isBackground ? "BACKGROUND" : "FRAME"}</p><h2>{design.name}</h2><p>{design.event}</p><p className="credit">Created by: <a href={design.creatorUrl} target="_blank" rel="noopener noreferrer">@{design.creator}</a></p></div></div>
      </div>
      <div className="controls">
        <section className="control-section" aria-labelledby="designs-title"><div className="step-heading"><span className="step-number">01</span><div><h2 id="designs-title">Choose your design</h2><p>Frames, backgrounds, and community creativity.</p></div></div><div className="design-filters" role="group" aria-label="Filter designs">{[["all", "All designs"], ["frame", "Frames"], ["background", "Backgrounds"]].map(([value, label]) => <button key={value} className={`frame-option ${filter === value ? "selected" : ""}`} type="button" aria-pressed={filter === value} onClick={() => changeFilter(value)}>{label}</button>)}</div><div className="frame-grid">{designs.map((item, i) => filter !== "all" && item.type !== filter ? null : <button key={item.src} className={`frame-option ${selected === i ? "selected" : ""}`} type="button" aria-pressed={selected === i} aria-label={`Choose ${item.name}`} onClick={() => chooseDesign(i)}><div className="frame-thumb"><img src={item.src} alt="" loading="lazy" /><span className="frame-index">{String(i + 1).padStart(2, "0")}</span>{selected === i && <span className="selected-badge" aria-hidden="true">✓</span>}</div><span className="frame-name">{item.name}</span><span className="frame-credit">{item.type.toUpperCase()} · @{item.creator}</span></button>)}</div></section>
        <section className="control-section" aria-labelledby="photo-title"><div className="step-heading"><span className="step-number">02</span><div><h2 id="photo-title">Make it yours</h2><p>{isBackground ? "Upload a photo, compare your options, then choose one for the moon." : "Your favorite photo belongs here."}</p></div></div>
          <input ref={fileRef} className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label="Upload your photo" /><button className="upload" type="button" onClick={() => fileRef.current?.click()}><span aria-hidden="true">＋</span>{source.file ? "Change your photo" : "Choose your photo"}<span className="file-types">JPG / PNG / WEBP</span></button>
          {design.autoRemoveBackground && source.file && <div className="photo-choice-grid">
            <section className={`photo-choice-card ${automaticSelected ? "active" : ""}`} aria-labelledby="automatic-title"><h3 id="automatic-title">Remove photo background automatically</h3>
              {cutoutReady ? <PhotoThumbnail image={cutout.image} label="Generated automatic cutout preview" /> : <div className="photo-choice-thumb" style={{ display: "grid", placeItems: "center", padding: 12, boxSizing: "border-box", color: "#291c21" }} role="status">{waiting ? "Preparing your cutout…" : removalError ? "Automatic cutout unavailable" : "Automatic removal paused"}</div>}
              <p>Only for Blue Moon. First use may take longer while the background-removal tool loads.</p><p>For best results, use a clear, well-lit photo of one person against a simple background. Avoid blurry photos, overlapping people, or backgrounds that blend into the subject.</p><p>If your cutout looks faded or incomplete, try another photo, edit it manually, or upload a PNG with the background already removed.</p>
              <label className="removal-toggle"><input type="checkbox" checked={removeEnabled} onChange={e => setRemoveEnabled(e.target.checked)} />Enable automatic removal</label>
              <p className="removal-status" role="status">{removalStatus}</p>{removalError && <p className="error" role="alert">{removalError}</p>}
              <div className="photo-choice-actions"><button className="reset" type="button" disabled={!cutoutReady || automaticSelected} onClick={() => choosePhoto("automatic", cutout.image)}>{automaticSelected ? "Currently using this photo" : "Use this photo"}</button>{!waiting && <button className="reset" type="button" onClick={retryRemoval}>{cutoutReady ? "Generate again" : "Retry automatic removal"}</button>}</div>
            </section>
            <section className={`photo-choice-card ${manualSelected ? "active" : ""}`} aria-labelledby="manual-title"><h3 id="manual-title">Edit cutout manually</h3>
              <button className="photo-choice-edit" type="button" disabled={!source.image} aria-label="Open manual cutout editor" onClick={openEditor}><PhotoThumbnail image={manualCandidate} label={manualReady ? "Saved manual cutout preview" : "Original uploaded photo preview"} /></button>
              <p>Erase unwanted areas or restore a faded subject. You can start from your original photo even while automatic removal is running.</p><p>{manualReady ? "Your manual cutout is ready. Choose Use this photo to apply it." : "Tap the photo to edit it, or use your original photo as it is."}</p>
              <div className="photo-choice-actions"><button className="reset" type="button" disabled={!source.image} onClick={openEditor}>{manualReady ? "Edit again" : "Edit cutout"}</button><button className="reset" type="button" disabled={!manualCandidate || manualSelected} onClick={() => choosePhoto("manual", manualCandidate)}>{manualSelected ? "Currently using this photo" : "Use this photo"}</button></div>
              {manualReady && <button className="reset" type="button" onClick={() => setManual(null)}>Reset manual panel to original</button>}
            </section>
          </div>}
        </section>
        <section className="control-section" aria-labelledby="save-title"><div className="step-heading"><span className="step-number">03</span><div><h2 id="save-title">Ready for your next era?</h2><p>Download it. Set it. Show your support.</p></div></div><button className="download" type="button" disabled={!photo || !designImage || busy} onClick={download}>{busy ? "Preparing your PNG…" : "Download your PNG"}<span aria-hidden="true">↓</span></button>{!source.file && <p className="download-hint">Add your photo to unlock your download.</p>}{isBackground && source.file && !chosenReady && <p className="download-hint">Choose Use this photo from either panel to unlock your download.</p>}{error && <p className="error" role="alert">{error}</p>}<p className="notice" role="status">{notice}</p><p className="privacy">Your photo is processed on your device, not uploaded for editing. Blue Moon background removal loads additional processing files from an external service.</p></section>
      </div>
    </section>
    <footer className="footer"><div className="footer-about"><Brand /><p>ENHYPEN + frames. A fan-made space for ENGENEs to discover community-created profile frames and backgrounds for events, celebrations, and moments of support.</p></div><div><h2>FOR EVERY ENHYPEN ERA</h2><p>From ENHYPEN MAMA campaigns to ENHYPEN WORLD CUP and beyond.</p><p>Find your design, add your photo, and make your support part of your profile.</p></div><div><h2>CREATED BY THE COMMUNITY</h2><p>Featuring designs by ENGENE creators, with each design credited to its maker.</p><p>Designs belong to their respective creators. Love your design? Give its creator a shout-out when you share!</p></div><div className="footer-bottom"><span>Made for ENGENEs, by ENGENEs.</span><p>Unofficial fan project. Not affiliated with ENHYPEN or their management.</p></div></footer>
    {editorSession && <CutoutEditor original={editorSession.original} initial={editorSession.initial} onApply={saveEditor} onCancel={() => setEditorSession(null)} />}
  </main>;
}
