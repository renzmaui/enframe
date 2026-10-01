import { useEffect, useRef, useState } from "react";
import "./App.css";

const SIZE = 1080;
const frames = Array.from(
  { length: 6 },
  (_, index) => `/frames/${index + 1}.png`
);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

export default function App() {
  const canvasRef = useRef(null);
  const photoRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  const [selectedFrame, setSelectedFrame] = useState(0);
  const [photoUrl, setPhotoUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    frameRef.current = null;

    loadImage(frames[selectedFrame])
      .then((image) => {
        if (!cancelled) {
          frameRef.current = image;
          draw();
        }
      })
      .catch(() => {
        if (!cancelled) setError("Frame could not load. Check its filename.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFrame]);

  useEffect(() => {
    if (!photoUrl) return;

    let cancelled = false;
    photoRef.current = null;

    loadImage(photoUrl)
      .then((image) => {
        if (!cancelled) {
          photoRef.current = image;
          draw();
        }
      })
      .catch(() => {
        if (!cancelled) setError("Photo could not load. Try a JPG or PNG.");
      });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    draw();
  }, [zoom, position, selectedFrame]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);

    const photo = photoRef.current;
    if (photo) {
      const scale = Math.max(
        SIZE / photo.naturalWidth,
        SIZE / photo.naturalHeight
      ) * zoom;

      const width = photo.naturalWidth * scale;
      const height = photo.naturalHeight * scale;

      ctx.drawImage(
        photo,
        (SIZE - width) / 2 + position.x,
        (SIZE - height) / 2 + position.y,
        width,
        height
      );
    }

    if (frameRef.current) {
      ctx.drawImage(frameRef.current, 0, 0, SIZE, SIZE);
    }
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    setError("");
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    photoRef.current = null;
    setPhotoUrl(URL.createObjectURL(file));
    event.target.value = "";
  }

  function handlePointerDown(event) {
    if (!photoRef.current) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      position,
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scale = SIZE / rect.width;

    setPosition({
      x: dragRef.current.position.x +
        (event.clientX - dragRef.current.x) * scale,
      y: dragRef.current.position.y +
        (event.clientY - dragRef.current.y) * scale,
    });
  }

  function download() {
    const canvas = canvasRef.current;
    if (!photoRef.current || !frameRef.current || !canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Download failed. Please try again.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `program-profile-frame-${selectedFrame + 1}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, "image/png");
  }

  return (
    <main className="app">
      <header>
        <span className="eyebrow"><h1>EN-FRAME</h1></span>
        <h2>Make your profile picture</h2>
        <p>Choose a frame, add your photo, then download your new picture.</p>
      </header>

      <section className="editor">
        <div className="preview-column">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            aria-label="Profile picture preview"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          />
          <p className="hint">Drag your photo in the preview to reposition it.</p>
        </div>

        <div className="controls">
          <h2>1. Pick a frame</h2>
          <div className="frame-grid">
            {frames.map((src, index) => (
              <button
                className={`frame-option ${selectedFrame === index ? "selected" : ""}`}
                key={src}
                type="button"
                onClick={() => {
                  setError("");
                  setSelectedFrame(index);
                }}
                aria-label={`Choose frame ${index + 1}`}
                aria-pressed={selectedFrame === index}
              >
                <img src={src} alt="" />
                <span>Frame {index + 1}</span>
              </button>
            ))}
          </div>

          <h2>2. Add your photo</h2>
          <label className="upload">
            Choose photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
            />
          </label>

          <label className="zoom-label" htmlFor="zoom">
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <input
            id="zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={!photoUrl}
          />

          <h2>3. Save it</h2>
          <button
            className="download"
            type="button"
            onClick={download}
            disabled={!photoRef.current || !frameRef.current}
          >
            Download PNG
          </button>

          {error && <p className="error" role="alert">{error}</p>}
          <p className="privacy">
            Your photo is edited in your browser; this starter site does not
            upload it to a server.
          </p>
        </div>
      </section>
    </main>
  );
}