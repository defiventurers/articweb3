/* Four Penguin Hosts: friendly heritage guides only. They never render inside board cells or replace a source-native animal, token, card, or counter. */
export const HOST_META = Object.freeze({
  polly: { name: "Polly Clan", short: "Polly", color: "#f38eaa", beak: "#ffc75f", mood: "welcome" },
  retsba: { name: "Retsba Legion", short: "Retsba", color: "#e65054", beak: "#68bdf0", mood: "focus" },
  pengu: { name: "Pengu Order", short: "Pengu", color: "#58a8f4", beak: "#ffc75f", mood: "calm" },
  abster: { name: "Abster Tribe", short: "Abster", color: "#3ca96b", beak: "#ffc75f", mood: "bright" }
});

const HOST_BY_GAME = Object.freeze({
  "nine-ice-forts": ["retsba", "pengu"], "four-wing-ice-hunt": ["retsba", "polly"], fishflow: ["abster", "polly"],
  "break-the-ice": ["polly", "pengu"], "ice-hunters": ["retsba", "pengu"], "sixteen-ice-warriors": ["retsba", "pengu"],
  "glacier-trail": ["polly", "pengu"], "crown-run": ["polly", "retsba"], "forty-glacier-guards": ["retsba", "abster"],
  "sky-temple-run": ["pengu", "polly"], "ice-rings": ["retsba", "abster"], "cowrie-kingdoms": ["polly", "pengu"],
  "two-stones": ["retsba", "abster"], "aurora-vulture": ["pengu", "retsba"], "khasi-fishflow": ["abster", "polly"],
  "seven-ice-rings": ["abster", "pengu"], "ruma-ice-puzzle": ["abster", "pengu"], "polar-tablan": ["pengu", "polly"],
  sige: ["pengu", "retsba"], "aurora-ganjifa-academy": ["pengu", "polly"]
});

export function getGameHosts(gameId) {
  const pair = HOST_BY_GAME[gameId];
  return pair ? { lead: pair[0], support: pair[1] } : null;
}

function Die({ x, y, rotate = 0 }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`} className="penguin-host__die"><rect width="17" height="17" rx="3.5" /><circle cx="5" cy="5" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="5" cy="12" r="1.3" /></g>;
}

export function PenguinHost({ host = "polly", size = "regular", className = "" }) {
  const meta = HOST_META[host] || HOST_META.polly;
  const brows = meta.mood === "focus" ? <><path d="M36 42l10-3" /><path d="M64 39l10 3" /></> : null;
  return <span className={`penguin-host penguin-host--${size} penguin-host--${host} ${className}`} style={{ "--host-color": meta.color, "--host-beak": meta.beak }} aria-hidden="true">
    <svg viewBox="0 0 110 126" role="presentation" focusable="false">
      <ellipse className="penguin-host__shadow" cx="55" cy="117" rx="32" ry="5" />
      <path className="penguin-host__flipper" d="M29 67C12 68 11 89 23 94c7 3 13-5 16-15Z" />
      <path className="penguin-host__flipper" d="M81 67c17 1 18 22 6 27-7 3-13-5-16-15Z" />
      <path className="penguin-host__body" d="M55 10C29 10 19 31 20 69c1 33 15 46 35 46s34-13 35-46C91 31 81 10 55 10Z" />
      <ellipse className="penguin-host__belly" cx="55" cy="76" rx="23" ry="34" />
      <path className="penguin-host__tuft" d="M44 15c0-9 7-13 11-5 4-8 11-4 11 5" />
      <circle className="penguin-host__eye" cx="43" cy="48" r="7" /><circle className="penguin-host__eye" cx="67" cy="48" r="7" />
      <circle className="penguin-host__shine" cx="41" cy="46" r="2.2" /><circle className="penguin-host__shine" cx="65" cy="46" r="2.2" />
      <g className="penguin-host__brows">{brows}</g>
      <path className="penguin-host__beak" d="M49 57c4-4 8-4 12 0l-6 6Z" />
      <ellipse className="penguin-host__cheek" cx="34" cy="59" rx="6" ry="3" /><ellipse className="penguin-host__cheek" cx="76" cy="59" rx="6" ry="3" />
      <Die x="31" y="76" rotate="-10" /><Die x="61" y="77" rotate="9" />
      <path className="penguin-host__foot" d="M29 110c0 8 19 8 20 0Z" /><path className="penguin-host__foot" d="M61 110c0 8 19 8 20 0Z" />
    </svg>
  </span>;
}

export function PenguinHostPair({ gameId, compact = false, className = "" }) {
  const hosts = getGameHosts(gameId);
  if (!hosts) return null;
  return <span className={`penguin-host-pair ${compact ? "penguin-host-pair--compact" : ""} ${className}`} aria-hidden="true"><PenguinHost host={hosts.support} size="mini" /><PenguinHost host={hosts.lead} size={compact ? "mini" : "regular"} /></span>;
}
