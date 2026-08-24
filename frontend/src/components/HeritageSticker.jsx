/* Arctic Dominion asset-resilience note: never leave a broken image placeholder; a physical token fallback always occupies the intended game-piece space. */
import { useState } from "react";

export function HeritageSticker({ src, alt = "", className = "", fallbackClassName = "", draggable = "false", ...props }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return <span {...props} className={`${className} heritage-sticker-fallback ${fallbackClassName}`.trim()} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} />;
  }

  return (
    <img
      {...props}
      className={className}
      src={src}
      alt={alt}
      draggable={draggable}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
