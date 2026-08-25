import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Renders one piece of submitted proof — an image OR a video.
 *
 * Every proof surface used to render `mediaUrls` through a plain `<img>`, so a VIDEO proof (players
 * can record one: `ProofCamera` in `mode="video"` uploads an `.mp4` as `video/mp4`) always failed to
 * decode and fell through to the "Media unavailable" placeholder. Reviewers therefore could not watch
 * the evidence they were being asked to judge. Picking the element by file extension fixes every
 * surface at once.
 */

const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v", "avi", "mkv"];

/** True when the URL points at a video file. Query strings and casing are ignored. */
export function isVideoUrl(url: string): boolean {
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
}

interface ProofMediaProps {
  url: string;
  alt: string;
  /** Applied to the <img>/<video> element so each caller keeps its own sizing/fit. */
  className?: string;
  /** Rendered instead of the media when it fails to load. */
  fallback?: React.ReactNode;
}

export default function ProofMedia({ url, alt, className = "w-full h-full object-cover", fallback }: ProofMediaProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <>
        {fallback ?? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[10px] font-medium text-sky-ink-3">{t("admin.courtManagement.mediaUnavailable")}</p>
          </div>
        )}
      </>
    );
  }

  if (isVideoUrl(url)) {
    return (
      // `controls` is the point — a reviewer has to be able to scrub the clip, not just see frame one.
      <video src={url} className={className} controls preload="metadata" onError={() => setFailed(true)} />
    );
  }

  return <img src={url} alt={alt} className={className} onError={() => setFailed(true)} />;
}
