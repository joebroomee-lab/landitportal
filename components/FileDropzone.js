"use client";

import { useRef, useState } from "react";

const ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,text/plain,text/markdown";

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

// Multi-file drag-and-drop uploader used by both onboarding wizards. Each
// file is uploaded to /api/upload the moment it's dropped (not batched with
// the rest of the form) — see that route for why uploads go through their
// own endpoint rather than riding along in a Server Action payload. `value`
// is the list of already-uploaded file refs ({key, filename, contentType,
// size}); `onChange` receives the updated list.
export default function FileDropzone({ value = [], onChange, onBusyChange, label, hint }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState([]); // [{name, error}]

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading((u) => [...u, ...files.map((f) => ({ name: f.name, error: null }))]);
    // Lets a caller (e.g. RepOnboardingWizard) hold "Continue" disabled for
    // the whole upload, not just whatever happens after — otherwise someone
    // on a slow connection can tap through before the file has even
    // finished uploading, let alone been read for pre-fill.
    onBusyChange?.(true);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const body = await res.json();
        if (!res.ok) {
          setUploading((u) => u.map((x) => (x.name === file.name ? { ...x, error: body.error } : x)));
          continue;
        }
        onChange([...value, body]);
        setUploading((u) => u.filter((x) => x.name !== file.name));
      } catch {
        setUploading((u) =>
          u.map((x) => (x.name === file.name ? { ...x, error: "Upload failed, try again." } : x))
        );
      }
    }

    onBusyChange?.(false);
  };

  const removeFile = (key) => onChange(value.filter((f) => f.key !== key));

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-sm)] border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver ? "border-[var(--cyan)] bg-[var(--cyan-soft)]" : "border-[var(--line)] hover:border-[var(--cyan)]/50"
        }`}
      >
        <div className="text-[15px] font-semibold text-[var(--text)]">
          {label || "Drop files here, or click to browse"}
        </div>
        {hint && <div className="text-[13px] text-[var(--text-faint)]">{hint}</div>}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(value.length > 0 || uploading.length > 0) && (
        <div className="mt-3 space-y-2">
          {value.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-card)] px-4 py-2.5 text-sm"
            >
              <span className="truncate text-[var(--text)]">{f.filename}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-[var(--text-faint)]">{formatSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.key)}
                  className="text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {uploading.map((u) => (
            <div
              key={u.name}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line-soft)] px-4 py-2.5 text-sm"
            >
              <span className="truncate text-[var(--text-dim)]">{u.name}</span>
              <span className={`text-xs ${u.error ? "text-[var(--danger)]" : "text-[var(--text-faint)]"}`}>
                {u.error || "Uploading…"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
