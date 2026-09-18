// Shared by MatchCard (rep side) and the company swipe deck — turns
// whatever URL a rep submitted (a Loom/YouTube/Vimeo link, or a direct
// video file URL from the in-app upload) into something playable.
export function resolveVideo(rawUrl) {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes("loom.com")) {
      const id = u.pathname.split("/").pop();
      return { kind: "iframe", src: `https://www.loom.com/embed/${id}` };
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v");
      return id ? { kind: "iframe", src: `https://www.youtube.com/embed/${id}` } : { kind: "link", src: rawUrl };
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : { kind: "link", src: rawUrl };
    }
    // Direct video files — Cloudinary-hosted uploads (res.cloudinary.com)
    // land here, but this also covers anyone pasting a raw .mp4/.mov link.
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u.pathname) || u.hostname.includes("cloudinary.com")) {
      return { kind: "video", src: rawUrl };
    }
    return { kind: "link", src: rawUrl };
  } catch {
    return null;
  }
}
