const LOCAL_ASSET_IMAGE_PATTERN = /^\/assets\/(screens|how-to-play)\/.*\.(png|jpg|jpeg)$/i;

function toWebp(src) {
  return src.replace(/\.(png|jpg|jpeg)$/i, ".webp");
}

function normalizePath(src) {
  try {
    const url = new URL(src, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    return url.pathname;
  } catch {
    return src || "";
  }
}

function preferWebpImage(img) {
  if (!img || img.dataset.webpPreferred === "true") return;

  const path = normalizePath(img.getAttribute("src") || img.currentSrc || "");
  if (!LOCAL_ASSET_IMAGE_PATTERN.test(path)) return;

  const fallbackSrc = path;
  const webpSrc = toWebp(path);
  img.dataset.webpPreferred = "true";
  img.dataset.pngFallback = fallbackSrc;
  img.decoding = img.decoding || "async";

  const previousError = img.onerror;
  img.onerror = (event) => {
    if (img.getAttribute("src") === webpSrc) {
      img.setAttribute("src", fallbackSrc);
    }
    if (typeof previousError === "function") previousError.call(img, event);
  };

  img.setAttribute("src", webpSrc);
}

function scan() {
  document.querySelectorAll("img").forEach(preferWebpImage);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) preferWebpImage(node);
        else if (node instanceof HTMLElement) node.querySelectorAll("img").forEach(preferWebpImage);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
