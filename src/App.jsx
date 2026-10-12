import { useEffect, useRef, useState } from "react";
import "./App.css";
const SIZE = 1080;
const designs = [
  ...[
    ["meowcedes-frame.webp", "MEOWCEDES FRAME"],
    ["alpinoo-frame.png", "ALPINOO FRAME"],
    ["alpinoo2-frame.webp", "ALPINOO FRAME 2"],
    ["hoonrari-frame.png", "HOONRARI FRAME"],
    ["jaybullracing-frame.png", "JAYBULLRACING FRAME"],
    ["mcjakey-frame.png", "MCJAKEY FRAME"],
    ["rikstondrift-frame.png", "RIKSTONDRIFT FRAME"],
  ].map(([file, name]) => ({ src: `/frames/${file}`, name, type: "frame", event: "ENHYPEN MAMA GRAND PRIX", creator: "_rrriooo", creatorUrl: "https://x.com/_rrriooo" })),
  { src: "/frames/bluemoon.png", name: "BLUE MOON FOR ENHYPEN", type: "background", autoRemoveBackground: true, event: "ENHYPEN 2026 MAMA (Mnet Asian Music Awards)", creator: "hypenzonehq", creatorUrl: "https://x.com/hypenzonehq" },
];
function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Image could not load")); image.src = src; });
}
async function blobImage(blob) {
  const url = URL.createObjectURL(blob);
  try { return await loadImage(url); } finally { URL.revokeObjectURL(url); }
}
function Brand() { return <a className="wordmark" href="#" aria-label="EN-FRAME home"><img className="brand-icon" src="/enframe.svg" alt="" />EN<span>—</span>FRAME</a>; }
export default function App() {
  const canvasRef = useRef(null), fileRef = useRef(null), dragRef = useRef(null);
  const uploadId = useRef(0), removalTask = useRef(null);
  const [selected, setSelected] = useState(0), [filter, setFilter] = useState("all");
  const [loadedDesign, setLoadedDesign] = useState(null);
  const [source, setSource] = useState({ file: null, image: null });
  const [cutout, setCutout] = useState(null), [removeEnabled, setRemoveEnabled] = useState(true);
  const [retry, setRetry] = useState(0), [removalStatus, setRemovalStatus] = useState(""), [removalError, setRemovalError] = useState("");
  const [zoom, setZoom] = useState(1), [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const design = designs[selected], isBackground = design.type === "background";
  const autoMode = Boolean(design.autoRemoveBackground && removeEnabled);
  const designImage = loadedDesign?.src === design.src ? loadedDesign.image : null;
  const cutoutReady = cutout?.file === source.file && Boolean(cutout?.image);
  const photo = autoMode ? (cutoutReady ? cutout.image : null) : source.image;
  const waiting = Boolean(autoMode && source.file && !cutoutReady && !removalError);
  useEffect(() => {
    let active = true;
    loadImage(design.src).then(image => { if (active) setLoadedDesign({ src: design.src, image }); }).catch(() => { if (active) setError("This design could not load. Check its filename."); });
    return () => { active = false; };
  }, [design.src]);
  useEffect(() => {
    let active = true;
    if (!autoMode || !source.file) { setRemovalStatus(""); setRemovalError(""); return; }
    const file = source.file;
    setRemovalError(""); setRemovalStatus("Preparing your cutout… First use may take longer.");
    if (!removalTask.current || removalTask.current.file !== file) {
      // Load the background-removal tool only when Blue Moon removal is requested.
      const promise = (async () => {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(file, { model: "small", output: { format: "image/png" } });
        return blobImage(blob);
      })();
      removalTask.current = { file, promise };
    }
    removalTask.current.promise.then(image => {
      if (active) { setCutout({ file, image }); setRemovalStatus("Your cutout is ready. Drag and resize it to fit."); }
    }).catch(() => {
      if (active) { setRemovalStatus(""); setRemovalError("Background removal failed. Retry, or turn it off and upload a prepared transparent PNG."); }
    });
    return () => { active = false; };
  }, [autoMode, source.file, retry]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE); ctx.fillStyle = "#291c21"; ctx.fillRect(0, 0, SIZE, SIZE);
    if (isBackground && designImage) {
      const scale = Math.max(SIZE / designImage.naturalWidth, SIZE / designImage.naturalHeight);
      const w = designImage.naturalWidth * scale, h = designImage.naturalHeight * scale;
      ctx.drawImage(designImage, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    }
    if (photo) {
      const base = isBackground ? Math.min(SIZE * .75 / photo.naturalWidth, SIZE * .75 / photo.naturalHeight) : Math.max(SIZE / photo.naturalWidth, SIZE / photo.naturalHeight);
      const w = photo.naturalWidth * base * zoom, h = photo.naturalHeight * base * zoom;
      ctx.drawImage(photo, (SIZE - w) / 2 + position.x, (isBackground ? SIZE - h : (SIZE - h) / 2) + position.y, w, h);
    } else if (!isBackground) {
      ctx.textAlign = "center"; ctx.fillStyle = "#fff0e8"; ctx.font = "700 100px sans-serif"; ctx.fillText("EN-FRAME", SIZE / 2, SIZE / 2);
      ctx.fillStyle = "#cdb7ad"; ctx.font = "24px sans-serif"; ctx.fillText("YOUR PHOTO GOES HERE", SIZE / 2, SIZE / 2 + 65);
    }
    if (!isBackground && designImage) ctx.drawImage(designImage, 0, 0, SIZE, SIZE);
  }, [photo, designImage, isBackground, zoom, position]);
  function reset() { dragRef.current = null; setZoom(1); setPosition({ x: 0, y: 0 }); }
  function chooseDesign(index) { if (designs[index].type !== design.type) reset(); setSelected(index); setError(""); setNotice(""); }
  function changeFilter(value) { setFilter(value); if (value !== "all" && design.type !== value) { const i = designs.findIndex(item => item.type === value); if (i >= 0) chooseDesign(i); } }
  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP image."); return; }
    const id = ++uploadId.current;
    reset(); setError(""); setNotice(""); setRemovalError(""); setCutout(null); setSource({ file, image: null });
    try { const image = await blobImage(file); if (id === uploadId.current) setSource({ file, image }); }
    catch { if (id === uploadId.current) setError("This photo could not load. Choose another image."); }
  }
  function toggleRemoval(e) { reset(); setRemoveEnabled(e.target.checked); setNotice(""); }
  function retryRemoval() { removalTask.current = null; setRemovalError(""); setRetry(n => n + 1); }
  function pointerDown(e) { if (!photo) return; e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { x: e.clientX, y: e.clientY, position }; }
  function pointerMove(e) { const drag = dragRef.current; if (!drag) return; const scale = SIZE / e.currentTarget.getBoundingClientRect().width; setPosition({ x: drag.position.x + (e.clientX - drag.x) * scale, y: drag.position.y + (e.clientY - drag.y) * scale }); }
  function download() {
    if (!photo || !designImage || busy || waiting) return;
    setBusy(true); setError(""); setNotice("");
    try { canvasRef.current.toBlob(blob => {
      setBusy(false); if (!blob) { setError("Download failed. Please retry."); return; }
      const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url;
      link.download = `enframe-${design.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice(`Your PNG is ready. Credit @${design.creator} when sharing!`);
    }, "image/png"); } catch { setBusy(false); setError("Download failed. Please retry."); }
  }
  return <main className="app">
    <nav className="topbar" aria-label="Main navigation"><Brand /><a className="nav-link" href="#studio">Frame studio ↗</a><span className="fan-tag">Made for ENGENEs, by ENGENEs</span></nav>
    <header className="hero"><p className="eyebrow"><span className="status-dot" /> ENGENE FRAME STUDIO</p><h1>Your photo.<br /><span>Your ENHYPEN era.</span></h1><p className="hero-copy">A little creativity. A lot of love for ENHYPEN.<br />Discover community-made frames and backgrounds, and make them yours.</p><div className="hero-tags"><span>01 / CHOOSE</span><span>02 / PERSONALIZE</span><span>03 / SHARE</span></div><span className="hero-orbit" aria-hidden="true">✦</span></header>
    <section className="editor" id="studio" aria-label="Profile design studio">
      <div className="preview-column"><div className="panel-heading"><span className="eyebrow">YOUR PREVIEW</span><span className="resolution">1080 × 1080 / PNG</span></div><div className="canvas-shell"><canvas ref={canvasRef} width={SIZE} height={SIZE} aria-label={`Preview of ${design.name}. Adjust using the position controls.`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }} /></div><p className="hint">{waiting ? "Preparing your cutout…" : photo ? "Drag to reposition · Adjust size to find your perfect fit" : "Add your photo to begin."}</p><div className="selected-details"><span className="selection-mark" aria-hidden="true">✦</span><div><p>{isBackground ? "BACKGROUND" : "FRAME"}</p><h2>{design.name}</h2><p>{design.event}</p><p className="credit">Created by: <a href={design.creatorUrl} target="_blank" rel="noopener noreferrer">@{design.creator}</a></p></div></div></div>
      <div className="controls">
        <section className="control-section" aria-labelledby="designs-title"><div className="step-heading"><span className="step-number">01</span><div><h2 id="designs-title">Choose your design</h2><p>Frames, backgrounds, and community creativity.</p></div></div><div className="design-filters" role="group" aria-label="Filter designs">{[["all", "All designs"], ["frame", "Frames"], ["background", "Backgrounds"]].map(([value, label]) => <button key={value} className={`frame-option ${filter === value ? "selected" : ""}`} type="button" aria-pressed={filter === value} onClick={() => changeFilter(value)}>{label}</button>)}</div><div className="frame-grid">{designs.map((item, i) => filter !== "all" && item.type !== filter ? null : <button key={item.src} className={`frame-option ${selected === i ? "selected" : ""}`} type="button" aria-pressed={selected === i} aria-label={`Choose ${item.name}`} onClick={() => chooseDesign(i)}><div className="frame-thumb"><img src={item.src} alt="" loading="lazy" /><span className="frame-index">{String(i + 1).padStart(2, "0")}</span>{selected === i && <span className="selected-badge" aria-hidden="true">✓</span>}</div><span className="frame-name">{item.name}</span><span className="frame-credit">{item.type.toUpperCase()} · @{item.creator}</span></button>)}</div></section>
        <section className="control-section" aria-labelledby="photo-title"><div className="step-heading"><span className="step-number">02</span><div><h2 id="photo-title">Make it yours</h2><p>{isBackground ? "Place yourself in front of the moon." : "Your favorite photo belongs here."}</p></div></div>
          {design.autoRemoveBackground && <div className="removal-panel"><label className="removal-toggle"><input type="checkbox" checked={removeEnabled} onChange={toggleRemoval} />Remove photo background automatically</label><p>{removeEnabled ? "Only for Blue Moon. First use may take longer while the background-removal tool loads." : "Using your original photo. Turn this on for automatic removal, or upload a prepared transparent cutout."}</p>{autoMode && <p className="removal-status" role="status">{removalStatus}</p>}{autoMode && removalError && <><p className="error" role="alert">{removalError}</p><button className="reset" type="button" onClick={retryRemoval}>Retry background removal</button></>}</div>}
          <input ref={fileRef} className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label="Upload your photo" /><button className="upload" type="button" onClick={() => fileRef.current?.click()}><span aria-hidden="true">＋</span>{source.file ? "Change your photo" : "Choose your photo"}<span className="file-types">JPG / PNG / WEBP</span></button><div className="slider-heading"><label htmlFor="zoom">{isBackground ? "Photo size" : "Zoom"}</label><output htmlFor="zoom">{Math.round(zoom * 100)}%</output></div><input id="zoom" type="range" min={isBackground ? ".1" : "1"} max="3" step=".01" value={zoom} disabled={!photo} onChange={e => setZoom(Number(e.target.value))} /><details className="position-controls"><summary>Position controls</summary><div className="position-grid"><label htmlFor="horizontal">Horizontal</label><input id="horizontal" type="range" min={-SIZE} max={SIZE} value={position.x} disabled={!photo} onChange={e => setPosition(p => ({ ...p, x: Number(e.target.value) }))} /><label htmlFor="vertical">Vertical</label><input id="vertical" type="range" min={-SIZE} max={SIZE} value={position.y} disabled={!photo} onChange={e => setPosition(p => ({ ...p, y: Number(e.target.value) }))} /></div></details><button className="reset" type="button" disabled={!photo} onClick={reset}>Reset adjustments</button></section>
        <section className="control-section" aria-labelledby="save-title"><div className="step-heading"><span className="step-number">03</span><div><h2 id="save-title">Ready for your next era?</h2><p>Download it. Set it. Show your support.</p></div></div><button className="download" type="button" disabled={!photo || !designImage || busy || waiting} onClick={download}>{waiting ? "Preparing your cutout…" : busy ? "Preparing your PNG…" : "Download your PNG"}<span aria-hidden="true">↓</span></button>{!source.file && <p className="download-hint">Add your photo to unlock your download.</p>}{error && <p className="error" role="alert">{error}</p>}<p className="notice" role="status">{notice}</p><p className="privacy">Your photo is processed on your device, not uploaded for editing. Blue Moon background removal loads additional processing files from an external service.</p></section>
      </div>
    </section>
    <footer className="footer"><div className="footer-about"><Brand /><p>ENHYPEN + frames. A fan-made space for ENGENEs to discover community-created profile frames and backgrounds for events, celebrations, and moments of support.</p></div><div><h2>FOR EVERY ENHYPEN ERA</h2><p>From ENHYPEN MAMA campaigns to ENHYPEN WORLD CUP and beyond.</p><p>Find your design, add your photo, and make your support part of your profile.</p></div><div><h2>CREATED BY THE COMMUNITY</h2><p>Featuring designs by ENGENE creators, with each design credited to its maker.</p><p>Designs belong to their respective creators. Please credit the maker of your chosen design when sharing.</p></div><div className="footer-bottom"><span>Made for ENGENEs, by ENGENEs.</span><p>Unofficial fan project. Not affiliated with ENHYPEN or their management.</p></div></footer>
  </main>;
}
