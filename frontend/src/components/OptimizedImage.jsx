export function OptimizedImage({ src, webpSrc, desktopSrc, desktopWebpSrc, alt, className, loading, decoding = "async", fetchPriority, draggable = "false", ...props }) {
  const optimizedSrc = webpSrc || toWebpPath(src);
  const desktopMedia = "(min-width: 900px) and (orientation: landscape)";

  return (
    <picture>
      {desktopWebpSrc && <source media={desktopMedia} srcSet={desktopWebpSrc} type="image/webp" />}
      {desktopSrc && <source media={desktopMedia} srcSet={desktopSrc} />}
      {optimizedSrc && <source srcSet={optimizedSrc} type="image/webp" />}
      <img
        {...props}
        className={className}
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        draggable={draggable}
      />
    </picture>
  );
}

export function toWebpPath(src) {
  if (!src || typeof src !== "string") return "";
  return src.replace(/\.(png|jpg|jpeg)$/i, ".webp");
}
