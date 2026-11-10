/* Four Penguin Hosts: friendly heritage guides only. They never render inside board cells or replace a source-native animal, token, card, or counter. */
export const HOST_META = Object.freeze({
  polly: { name: "Nova Clan", short: "Nova", color: "#f38eaa", beak: "#ffc75f", mood: "welcome" },
  retsba: { name: "Rocco Legion", short: "Rocco", color: "#e65054", beak: "#ef7c25", mood: "focus" },
  pengu: { name: "Piko Order", short: "Piko", color: "#58a8f4", beak: "#ffc75f", mood: "calm" },
  abster: { name: "Ziggy Tribe", short: "Ziggy", color: "#3ca96b", beak: "#ffc75f", mood: "bright" }
});

const HOST_BY_GAME = Object.freeze({
  "shanshui-xiangqi": ["pengu", "retsba"],
  "nine-ice-forts": ["retsba", "pengu"], "four-wing-ice-hunt": ["retsba", "polly"], fishflow: ["abster", "polly"],
  "break-the-ice": ["polly", "pengu"], "ice-hunters": ["retsba", "pengu"], "sixteen-ice-warriors": ["retsba", "pengu"],
  "glacier-trail": ["polly", "pengu"], "crown-run": ["polly", "retsba"], "forty-glacier-guards": ["retsba", "abster"],
  "sky-temple-run": ["pengu", "polly"], "ice-rings": ["retsba", "abster"], "cowrie-kingdoms": ["polly", "pengu"],
  "two-stones": ["retsba", "abster"], "aurora-vulture": ["pengu", "retsba"], "khasi-fishflow": ["abster", "polly"],
  "seven-ice-rings": ["abster", "pengu"], "ruma-ice-puzzle": ["abster", "pengu"], "polar-tablan": ["pengu", "polly"],
  sige: ["pengu", "retsba"], "aurora-ganjifa-academy": ["pengu", "polly"], "sannin-shogi": ["pengu", "retsba"], "co-tu-lenh": ["pengu", "retsba"]
});

export function getGameHosts(gameId) {
  const pair = HOST_BY_GAME[gameId];
  return pair ? { lead: pair[0], support: pair[1] } : null;
}

export function PenguinHost({ host = "polly", size = "regular", className = "" }) {
  const id=HOST_META[host]?host:'polly',meta=HOST_META[id];
  const mobile=globalThis.location?.pathname.includes('/arctic-play/app/')||globalThis.location?.pathname.startsWith('/play/');
  const source=mobile?`art/launch-v1/${id==='pengu'?'hosts':'host-cutouts'}/${id}.webp`:`/assets/launch-v1/${id==='pengu'?'hosts':'host-cutouts'}/${id}.webp`;
  return <span className={`penguin-host penguin-host--${size} penguin-host--${id} ${className}`} style={{"--host-color":meta.color}} aria-hidden="true"><img src={source} alt="" draggable="false" style={{display:'block',width:'100%',height:'auto',objectFit:'contain'}}/></span>;
}

export function PenguinHostPair({ gameId, compact = false, className = "" }) {
  const hosts = getGameHosts(gameId);
  if (!hosts) return null;
  return <span className={`penguin-host-pair ${compact ? "penguin-host-pair--compact" : ""} ${className}`} aria-hidden="true"><PenguinHost host={hosts.support} size="mini" /><PenguinHost host={hosts.lead} size={compact ? "mini" : "regular"} /></span>;
}
