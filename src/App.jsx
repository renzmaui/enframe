import { useEffect, useRef, useState } from "react";
import "./App.css";
const SIZE = 1080;
const frames = [
  ["meowcedes-frame.webp", "MEOWCEDES FRAME"],
  ["alpinoo-frame.png", "ALPINOO FRAME"],
    ["alpinoo2-frame.webp", "ALPINOO FRAME 2"],
  ["hoonrari-frame.png", "HOONRARI FRAME"],
  ["jaybullracing-frame.png", "JAYBULLRACING FRAME"],
  ["mcjakey-frame.png", "MCJAKEY FRAME"],
  ["rikstondrift-frame.png", "RIKSTONDRIFT FRAME"],
].map(([file, name]) => ({ src: `/frames/${file}`, name, event: "ENHYPEN MAMA GRAND PRIX", creator: "_rrriooo", creatorUrl: "https://x.com/_rrriooo" }));
// Future frames can be added with their own event, creator, and creatorUrl:
// frames.push({ src: "/frames/your-file.png", name: "YOUR FRAME", event: "YOUR EVENT", creator: "handle", creatorUrl: "https://x.com/handle" });
const DEFAULT_LOGO = "";
function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}
function Brand() { return <a className="wordmark" href="#" aria-label="EN-FRAME home"><img className="brand-icon" src="/enframe.svg" alt="" />EN<span>—</span>FRAME</a>; }
export default function App() {
  const canvasRef = useRef(null), fileRef = useRef(null), dragRef = useRef(null);
  const [selected, setSelected] = useState(0), [frameImage, setFrameImage] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(""), [photo, setPhoto] = useState(null), [logo, setLogo] = useState(null);
  const [zoom, setZoom] = useState(1), [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const frame = frames[selected];
  useEffect(() => {
    let active = true;
    loadImage(frame.src).then(img => { if (active) setFrameImage(img); }).catch(() => { if (active) setError("This frame could not load. Please try another."); });
    return () => { active = false; };
  }, [frame.src]);
  useEffect(() => {
    if (!photoUrl) return;
    let active = true;
    loadImage(photoUrl).then(img => { if (active) setPhoto(img); }).catch(() => { if (active) setError("Your photo could not load. Try a JPG, PNG, or WebP."); });
    return () => { active = false; };
  }, [photoUrl]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  useEffect(() => {
    if (!DEFAULT_LOGO) return;
    let active = true;
    loadImage(DEFAULT_LOGO).then(img => { if (active) setLogo(img); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE); ctx.fillStyle = "#291c21"; ctx.fillRect(0, 0, SIZE, SIZE);
    if (photo) {
      const scale = Math.max(SIZE / photo.naturalWidth, SIZE / photo.naturalHeight) * zoom;
      const w = photo.naturalWidth * scale, h = photo.naturalHeight * scale;
      ctx.drawImage(photo, (SIZE - w) / 2 + position.x, (SIZE - h) / 2 + position.y, w, h);
    } else if (logo) {
      const scale = Math.min(SIZE * .6 / logo.naturalWidth, SIZE * .6 / logo.naturalHeight);
      const w = logo.naturalWidth * scale, h = logo.naturalHeight * scale;
      ctx.drawImage(logo, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    } else {
      ctx.textAlign = "center"; ctx.fillStyle = "#fff0e8"; ctx.font = "700 100px sans-serif"; ctx.fillText("EN-FRAME", SIZE / 2, SIZE / 2);
      ctx.fillStyle = "#cdb7ad"; ctx.font = "24px sans-serif"; ctx.fillText("YOUR PHOTO GOES HERE", SIZE / 2, SIZE / 2 + 65);
    }
    if (frameImage) ctx.drawImage(frameImage, 0, 0, SIZE, SIZE);
  }, [photo, logo, frameImage, zoom, position]);
  function upload(e) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Please choose a JPG, PNG, or WebP photo."); return; }
    dragRef.current = null; setError(""); setNotice(""); setPhoto(null); setZoom(1); setPosition({ x: 0, y: 0 }); setPhotoUrl(URL.createObjectURL(file));
  }
  function reset() { dragRef.current = null; setZoom(1); setPosition({ x: 0, y: 0 }); }
  function pointerDown(e) { if (!photo) return; e.currentTarget.setPointerCapture(e.pointerId); dragRef.current = { x: e.clientX, y: e.clientY, position }; }
  function pointerMove(e) {
    const drag = dragRef.current; if (!drag) return;
    const scale = SIZE / e.currentTarget.getBoundingClientRect().width;
    setPosition({ x: drag.position.x + (e.clientX - drag.x) * scale, y: drag.position.y + (e.clientY - drag.y) * scale });
  }
  function download() {
    if (!photo || !frameImage || busy) return; setBusy(true); setError(""); setNotice("");
    try { canvasRef.current.toBlob(blob => {
      setBusy(false); if (!blob) { setError("Download failed. Please try again."); return; }
      const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url;
      link.download = `enframe-${frame.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice(frame.creator ? `Your PNG is ready. Credit @${frame.creator} when sharing!` : "Your PNG is ready. Please credit the frame creator when sharing.");
    }, "image/png"); } catch { setBusy(false); setError("Download failed. Please try again."); }
  }
  return <main className="app">
    <nav className="topbar" aria-label="Main navigation">
  <Brand />

  <a className="nav-link" href="#studio">
    Frame studio ↗
  </a>

  <span className="fan-tag">
    Made for ENGENEs, by ENGENEs
  </span>
</nav>
    <header className="hero"><p className="eyebrow"><span className="status-dot" /> ENGENE FRAME STUDIO</p><h1>Your photo.<br /><span>Your ENHYPEN era.</span></h1><p className="hero-copy">A little creativity. A lot of love for ENHYPEN.<br />Discover a community-made frame and make it yours.</p><div className="hero-tags"><span>01 / CHOOSE</span><span>02 / PERSONALIZE</span><span>03 / SHARE</span></div><span className="hero-orbit" aria-hidden="true">✦</span></header>
    <section className="editor" id="studio" aria-label="Profile frame studio">
      <div className="preview-column"><div className="panel-heading"><span className="eyebrow">YOUR PREVIEW</span><span className="resolution">1080 × 1080 / PNG</span></div>
        <div className="canvas-shell"><canvas ref={canvasRef} width={SIZE} height={SIZE} aria-label={`Preview of ${frame.name}. Adjust with the position controls.`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }} /></div>
        <p className="hint">{photo ? "Drag to reposition · Zoom to find your perfect fit" : "Your next profile picture starts here. Add a photo to begin."}</p>
        <div className="selected-details"><span className="selection-mark" aria-hidden="true">✦</span><div><h2>{frame.name}</h2><p>{frame.event}</p><p className="credit">{frame.creator ? <>Created by: {frame.creatorUrl ? <a href={frame.creatorUrl} target="_blank" rel="noopener noreferrer">@{frame.creator}</a> : `@${frame.creator}`}</> : "Creator credit pending"}</p></div></div>
      </div>
      <div className="controls">
        <section className="control-section" aria-labelledby="frames-title"><div className="step-heading"><span className="step-number">01</span><div><h2 id="frames-title">Find your frame</h2><p>Different events. Community creators. Your perfect frame.</p></div></div>
          <div className="frame-grid">{frames.map((item, i) => <button key={item.src} type="button" className={`frame-option ${selected === i ? "selected" : ""}`} aria-pressed={selected === i} aria-label={`Choose ${item.name}`} onClick={() => { if (i !== selected) { setFrameImage(null); setSelected(i); } setError(""); setNotice(""); }}><div className="frame-thumb"><img src={item.src} alt="" loading="lazy" /><span className="frame-index">{String(i + 1).padStart(2, "0")}</span>{selected === i && <span className="selected-badge" aria-hidden="true">✓</span>}</div><span className="frame-name">{item.name}</span><span className="frame-credit">{item.creator ? `@${item.creator}` : "Credit pending"}</span></button>)}</div>
        </section>
        <section className="control-section" aria-labelledby="photo-title"><div className="step-heading"><span className="step-number">02</span><div><h2 id="photo-title">Make it yours</h2><p>Your favorite photo belongs here.</p></div></div>
          <input ref={fileRef} className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label="Upload your photo" /><button className="upload" type="button" onClick={() => fileRef.current?.click()}><span aria-hidden="true">＋</span>{photoUrl ? "Change your photo" : "Choose your photo"}<span className="file-types">JPG / PNG / WEBP</span></button>
          <div className="slider-heading"><label htmlFor="zoom">Zoom</label><output htmlFor="zoom">{Math.round(zoom * 100)}%</output></div><input id="zoom" type="range" min="1" max="3" step="0.01" value={zoom} disabled={!photo} onChange={e => setZoom(Number(e.target.value))} />
          <details className="position-controls"><summary>Position controls</summary><div className="position-grid"><label htmlFor="horizontal">Horizontal</label><input id="horizontal" type="range" min={-SIZE} max={SIZE} value={position.x} disabled={!photo} onChange={e => setPosition(p => ({ ...p, x: Number(e.target.value) }))} /><label htmlFor="vertical">Vertical</label><input id="vertical" type="range" min={-SIZE} max={SIZE} value={position.y} disabled={!photo} onChange={e => setPosition(p => ({ ...p, y: Number(e.target.value) }))} /></div></details><button className="reset" type="button" disabled={!photo} onClick={reset}>Reset adjustments</button>
        </section>
        <section className="control-section" aria-labelledby="save-title"><div className="step-heading"><span className="step-number">03</span><div><h2 id="save-title">Ready for your next era?</h2><p>Download it. Set it. Show your support.</p></div></div><button className="download" type="button" disabled={!photo || !frameImage || busy} onClick={download}>{busy ? "Preparing your PNG…" : "Download your PNG"}<span aria-hidden="true">↓</span></button>{!photo && <p className="download-hint">Add your photo to unlock your download.</p>}{error && <p className="error" role="alert">{error}</p>}<p className="notice" role="status">{notice}</p><p className="privacy">Your photo stays on your device. Editing happens in your browser—no photo uploads to a server.</p></section>
      </div>
    </section>
    <footer className="footer"><div className="footer-about"><Brand /><p>ENHYPEN + frames. A fan-made space for ENGENEs to discover community-created profile frames for events, celebrations, and moments of support.</p></div><div><h2>FOR EVERY ENHYPEN ERA</h2><p>From ENHYPEN MAMA GRAND PRIX to ENHYPEN WORLD CUP and beyond.</p><p>Find your frame, add your photo, and make your support part of your profile.</p></div><div><h2>CREATED BY THE COMMUNITY</h2><p>Featuring designs by ENGENE creators, with each frame credited to its maker.</p><p>Frame designs belong to their respective creators. Please credit the maker of your chosen frame when sharing.</p></div><div className="footer-bottom"><span>MADE FOR ENGENEs. MADE WITH LOVE.</span><p>Unofficial fan project. Not affiliated with ENHYPEN or their management.</p></div></footer>
  </main>;
}
