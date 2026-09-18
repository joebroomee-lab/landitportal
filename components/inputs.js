"use client";

import { useState } from "react";

export function TextField({ value, onChange, placeholder, type = "text", autoFocus }) {
  return (
    <input
      type={type}
      className="field-input"
      value={value || ""}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextAreaField({ value, onChange, placeholder, maxLength = 300 }) {
  const len = (value || "").length;
  return (
    <div>
      <textarea
        className="field-input"
        rows={5}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-2 text-right text-xs text-[var(--text-faint)]">
        {len}/{maxLength}
      </div>
    </div>
  );
}

export function SelectCards({ options, value, onChange, columns = 1, descriptions }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          className={`select-card ${value === opt ? "active" : ""}`}
        >
          <div className="text-[15px] font-semibold text-[var(--text)]">{opt}</div>
          {descriptions?.[opt] && (
            <div className="mt-1 text-[13px] text-[var(--text-dim)]">
              {descriptions[opt]}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export function ChipGroup({ options, value = [], onChange }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => toggle(opt)}
          className={`chip ${value.includes(opt) ? "active" : ""}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// Phone camera photos routinely land at 3-8MB+. Sending that straight through
// as a base64 string in a server action payload risks tripping Netlify's
// function payload limit (the earlier "Something went wrong submitting your
// profile" error) and would bloat the reps table with huge text blobs. So we
// resize/re-encode client-side before it ever leaves the browser — a phone
// photo becomes ~100-300KB, comfortably safe, with no visible quality loss
// at the sizes this photo is actually displayed.
function compressImage(file, { maxDimension = 720, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      setError("Couldn't process that photo, try a different file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="h-36 w-36 overflow-hidden rounded-full border-2 border-[var(--line)] bg-[var(--bg-card)]">
        {value ? (
          <img src={value} alt="Profile preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[13px] text-[var(--text-faint)]">
            No photo yet
          </div>
        )}
      </div>
      <label className="btn btn-ghost cursor-pointer">
        {busy ? "Processing…" : value ? "Choose a different photo" : "Upload a photo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={handleFile}
        />
      </label>
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}
