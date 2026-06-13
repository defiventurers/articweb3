const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:10000";

export const SERVER_HEALTH_URL = import.meta.env.VITE_API_URL || toHttpUrl(WS_URL);

export async function fetchServerHealth() {
  const response = await fetch(`${SERVER_HEALTH_URL.replace(/\/$/, "")}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  return response.json();
}

function toHttpUrl(url) {
  if (url.startsWith("wss://")) return url.replace(/^wss:\/\//, "https://");
  if (url.startsWith("ws://")) return url.replace(/^ws:\/\//, "http://");
  return url;
}
