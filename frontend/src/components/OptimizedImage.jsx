export function OptimizedImage({ src, webpSrc, alt, className, loading, decoding = "async", fetchPriority, draggable = "false", ...props }) {
  const optimizedSrc = webpSrc || toWebpPath(src);

  return (
    <picture>
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
