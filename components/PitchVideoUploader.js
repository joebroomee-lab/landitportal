"use client";

import { useRef, useState } from "react";

// Direct browser -> Cloudinary upload using an unsigned upload preset. This
// deliberately does NOT go through our own /api routes: Netlify Functions
// cap synchronous request bodies at 6MB, which a real video blows past
// immediately, so the file has to go straight from the browser to wherever
// it's actually hosted. Cloudinary's unsigned-preset pattern is built for
// exactly this — the cloud name and preset name are not secrets (that's the
// point of "unsigned"), so it's safe to inline them as NEXT_PUBLIC_ env vars.
//
// If those env vars aren't set yet, this component renders nothing and the
// caller should fall back to the link-paste flow — same fail-open pattern
// as the AI features and email.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const videoUploadConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

const DEFAULT_MAX_DURATION_SECONDS = 5 * 60;
const MAX_BYTES = 500 * 1024 * 1024; // 500MB — generous ceiling, Cloudinary's free tier is the real limit

function checkDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null); // couldn't read duration — don't block the upload over it
    };
    video.src = URL.createObjectURL(file);
  });
}

// maxDurationSeconds lets a caller tighten the limit for a specific moment
// (e.g. the swipe-deck's mandatory ~60s application video) without changing
// the default 5-minute ceiling everywhere else (onboarding intro video, the
// post-match pitch video).
export default function PitchVideoUploader({ onUploaded, maxDurationSeconds = DEFAULT_MAX_DURATION_SECONDS }) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [progress, setProgress] = useState(null); // null | 0-100
  const [error, setError] = useState("");

  if (!videoUploadConfigured) return null;

  const handleFile = async (file) => {
    if (!file) return;
    setError("");

    if (file.size > MAX_BYTES) {
      setError("That file's too large, try a smaller export, or paste a link to it instead.");
      return;
    }
    const duration = await checkDuration(file);
    if (duration && duration > maxDurationSeconds) {
      const limitLabel =
        maxDurationSeconds < 60
          ? `${maxDurationSeconds} seconds`
          : `${Math.round(maxDurationSeconds / 60)} minute${maxDurationSeconds > 60 ? "s" : ""}`;
      setError(`Keep it under ${limitLabel}, that one's ${Math.round(duration)} seconds.`);
      return;
    }

    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("resource_type", "video");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status < 200 || xhr.status >= 300) {
        setError("Upload failed, please try again.");
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        if (body.secure_url) {
          onUploaded(body.secure_url);
        } else {
          setError("Upload finished but didn't return a video link, please try again.");
        }
      } catch {
        setError("Upload finished but the response was unreadable, please try again.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Upload failed, check your connection and try again.");
    };
    xhr.send(formData);
  };

  return (
    <div>
      {/* Two separate inputs, not one: the `capture` attribute is what
          makes a phone's browser open straight into the camera app instead
          of a general file picker, but a single input can't offer both
          behaviors depending on which button was tapped, so this is a
          record-focused input and a browse-focused input pointed at the
          same handler. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="video/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        disabled={progress !== null}
        className="select-card flex w-full flex-col items-center justify-center gap-2 !p-6 text-center"
      >
        <div className="text-[15px] font-semibold text-[var(--text)]">
          {progress !== null ? `Uploading, ${progress}%` : "Record with your camera"}
        </div>
        <div className="text-[13px] text-[var(--text-faint)]">
          Opens your camera. Under{" "}
          {maxDurationSeconds < 60
            ? `${maxDurationSeconds} seconds`
            : `${Math.round(maxDurationSeconds / 60)} minute${maxDurationSeconds > 60 ? "s" : ""}`}
          .
        </div>
      </button>
      {progress === null && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 w-full text-center text-[13px] font-semibold text-[var(--text-faint)] hover:text-[var(--cyan)]"
        >
          Or choose a video you've already recorded
        </button>
      )}
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
