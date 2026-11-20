import React from "react";

// Only the Vite browser host serves both the catalogue and the optional world.
export function BrowserHarborLinks() {
  if (window.Android || !/^\/play\/?$/.test(location.pathname)) return null;
  return <nav aria-label="Kingdoms games" className="browser-harbor-links">
    <a href="/?collection=strategy">Quick Play</a><a href="/harbor.html">Explore the Kingdoms</a>
  </nav>;
}
