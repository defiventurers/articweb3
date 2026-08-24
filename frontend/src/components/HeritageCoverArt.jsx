/* Tactile Expedition Theatre: inline, reliable cover art keeps each heritage game distinct without competing with play surfaces. */
import { PenguinHostPair } from "./PenguinHosts.jsx";
const COVER_META = {
  "nine-ice-forts": { accent: "#bdeeff", glow: "#3d8bd0", label: "Mill alignment" },
  "four-wing-ice-hunt": { accent: "#efba7f", glow: "#b75c35", label: "Four-wing hunt" },
  fishflow: { accent: "#78d7eb", glow: "#19798c", label: "Relay sowing" },
  "break-the-ice": { accent: "#e5da8c", glow: "#c27446", label: "Cowrie race" },
  "ice-hunters": { accent: "#efba7f", glow: "#a0503a", label: "Graph hunt" },
  "sixteen-ice-warriors": { accent: "#c99a78", glow: "#8a4e45", label: "Jump capture" },
  "glacier-trail": { accent: "#e5da8c", glow: "#5c9aa5", label: "Stored throw" },
  "crown-run": { accent: "#d6ba7a", glow: "#8b5b37", label: "Royal route" },
  "forty-glacier-guards": { accent: "#c99a78", glow: "#754d45", label: "Guard formation" },
  "sky-temple-run": { accent: "#c2a2ef", glow: "#69509c", label: "Temple climb" },
  "ice-rings": { accent: "#9dcdac", glow: "#2d7067", label: "Ring capture" },
  "cowrie-kingdoms": { accent: "#d6ba7a", glow: "#7f5b2d", label: "Regional race" },
  "two-stones": { accent: "#e2b2ac", glow: "#8f5369", label: "Micro blockade" },
  "aurora-vulture": { accent: "#e1a7dd", glow: "#7a4e86", label: "Star hunt" },
  "khasi-fishflow": { accent: "#78d7eb", glow: "#49765b", label: "Khasi relay" },
  "seven-ice-rings": { accent: "#9dcdac", glow: "#3e775c", label: "Circular sowing" },
  "ruma-ice-puzzle": { accent: "#d7e36e", glow: "#64783f", label: "Solo route" },
  "polar-tablan": { accent: "#e5da8c", glow: "#896c3a", label: "Long race" },
  sige: { accent: "#e5da8c", glow: "#38758b", label: "Centre race" },
  "aurora-ganjifa-academy": { accent: "#efa890", glow: "#a84d45", label: "Card academy" }
};

const points = (items) => items.map(([x, y], index) => <circle key={`${x}-${y}-${index}`} cx={x} cy={y} r="4.2" />);
const gridPoints = (columns, rows, x = 46, y = 74, gap = 38) => Array.from({ length: columns * rows }, (_, index) => [x + (index % columns) * gap, y + Math.floor(index / columns) * gap]);

function CoverGlyph({ gameId }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" };
  const nodeStyle = { fill: "currentColor", stroke: "#071725", strokeWidth: "2" };
  const dotRows = (count, y, x = 46, gap = 29) => Array.from({ length: count }, (_, index) => <circle key={`${y}-${index}`} cx={x + index * gap} cy={y} r="8" />);

  if (gameId === "nine-ice-forts") return <><path {...common} d="M45 77H195V226H45ZM76 108H164V195H76ZM106 138H134V166H106Z" />{points([[45,77],[120,77],[195,77],[45,151],[195,151],[45,226],[120,226],[195,226],[120,151]]).map((node, index) => <g key={index} style={nodeStyle}>{node}</g>)}</>;
  if (gameId === "four-wing-ice-hunt") return <><path {...common} d="M42 152H198M120 54V250M42 152L120 54 198 152 120 250 42 152M65 95L175 209M175 95L65 209" />{points([[42,152],[65,95],[120,54],[175,95],[198,152],[175,209],[120,250],[65,209],[120,152]]).map((node, index) => <g key={index} style={nodeStyle}>{node}</g>)}</>;
  if (gameId === "fishflow" || gameId === "khasi-fishflow") return <><path {...common} d="M37 109C65 73 175 73 203 109M37 190C65 226 175 226 203 190" />{dotRows(6, 118).concat(dotRows(6, 182)).map((dot, index) => <g key={index} style={nodeStyle}>{dot}</g>)}<path {...common} opacity=".5" d="M54 152C82 130 104 175 132 152S182 130 196 152" /></>;
  if (gameId === "break-the-ice" || gameId === "glacier-trail" || gameId === "cowrie-kingdoms") return <><path {...common} d="M49 75H191V217H49ZM77 103H163V189H77Z" />{points([[49,75],[84,75],[120,75],[156,75],[191,75],[191,110],[191,146],[191,181],[191,217],[156,217],[120,217],[84,217],[49,217],[49,181],[49,146],[49,110]]).map((node, index) => <g key={index} style={nodeStyle}>{node}</g>)}<path d="M101 154c10-18 29-18 39 0-10 18-29 18-39 0Z" fill="currentColor" opacity=".8" /></>;
  if (gameId === "ice-hunters") return <><path {...common} d="M45 82H195V228H45ZM45 82L195 228M195 82L45 228M45 155H195M120 82V228" />{gridPoints(5,5,45,82,37.5).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}<path d="M102 118c16-19 35-13 35 7 0 15-15 24-28 20-16-5-17-18-7-27Z" fill="currentColor" /></>;
  if (gameId === "sixteen-ice-warriors" || gameId === "forty-glacier-guards") return <><path {...common} d="M44 79H196V231H44Z" />{[0,1,2,3].map((row) => <path key={row} {...common} opacity=".7" d={`M44 ${79 + row * 38}H196M${44 + row * 38} 79V231`} />)}{gridPoints(4,4,63,98,38).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}</>;
  if (gameId === "crown-run") return <><path {...common} d="M47 80H193V226H47ZM84 117H156V189H84Z" />{points([[47,80],[120,80],[193,80],[193,153],[193,226],[120,226],[47,226],[47,153],[120,153]]).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}<path d="M93 125l12 11 15-18 15 18 12-11v31H93Z" fill="currentColor" /></>;
  if (gameId === "sky-temple-run") return <><path {...common} d="M45 210H195M65 210V178H92V146H120V114H148V82H175V210" />{[65,92,120,148,175].map((x,index) => <g key={x}><circle cx={x} cy={210-index*32} r="7" style={nodeStyle} /></g>)}<path d="M104 74h32l-16-19Z" fill="currentColor" /></>;
  if (gameId === "ice-rings" || gameId === "seven-ice-rings") return <><circle {...common} cx="120" cy="151" r="76" /><circle {...common} cx="120" cy="151" r="45" />{[0,45,90,135,180,225,270,315].map((angle) => <circle key={angle} cx={120 + 76*Math.cos(angle*Math.PI/180)} cy={151 + 76*Math.sin(angle*Math.PI/180)} r="5" style={nodeStyle} />)}<circle cx="120" cy="151" r="8" fill="currentColor" /></>;
  if (gameId === "two-stones") return <><path {...common} d="M50 207L120 87 190 207H50M50 207H190M120 87V207" />{points([[50,207],[120,87],[190,207],[120,207],[120,147]]).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}<circle cx="82" cy="188" r="15" fill="currentColor" opacity=".9" /><circle cx="156" cy="188" r="15" fill="#f5fbfb" opacity=".95" /></>;
  if (gameId === "aurora-vulture") return <><path {...common} d="M120 68 172 219 42 124H198L68 219Z" />{points([[120,68],[172,219],[42,124],[198,124],[68,219],[120,151]]).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}<path d="M120 90c-15 18-5 41 0 51 5-10 15-33 0-51Z" fill="currentColor" /></>;
  if (gameId === "ruma-ice-puzzle") return <><path {...common} d="M43 151H197" />{[50,78,106,134,162,190].map((x,index) => <circle key={x} cx={x} cy={151+(index%2?20:-20)} r="14" style={nodeStyle} />)}<path {...common} opacity=".65" d="M64 119C92 91 118 210 146 181S178 116 194 137" /></>;
  if (gameId === "polar-tablan") return <><path {...common} d="M44 84H196V218H44Z" />{[1,2,3,4].map((row) => <path key={row} {...common} opacity=".7" d={`M44 ${84 + row*33.5}H196`} />)}{[44,82,120,158,196].map((x,index) => <circle key={index} cx={x} cy={101+(index%2)*67} r="7" style={nodeStyle} />)}<path {...common} opacity=".7" d="M58 101H182M182 135H58M58 168H182M182 201H58" /></>;
  if (gameId === "sige") return <><path {...common} d="M48 79H192V223H48ZM78 109H162V193H78Z" />{points([[48,79],[120,79],[192,79],[192,151],[192,223],[120,223],[48,223],[48,151],[120,151]]).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}<circle cx="120" cy="151" r="11" fill="currentColor" /></>;
  if (gameId === "aurora-ganjifa-academy") return <><circle {...common} cx="120" cy="151" r="56" />{[-48,-24,0,24,48].map((angle,index) => <g key={angle} transform={`rotate(${angle} 120 151)`}><rect x="106" y="73" width="28" height="72" rx="5" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="120" cy="99" r="6" fill="currentColor" /></g>)}<circle cx="120" cy="151" r="12" fill="currentColor" /></>;
  return <><path {...common} d="M55 95 120 58 185 95v112l-65 37-65-37Z" />{points([[55,95],[120,58],[185,95],[185,207],[120,244],[55,207],[120,151]]).map((node,index) => <g key={index} style={nodeStyle}>{node}</g>)}</>;
}

export function HeritageCoverArt({ game, compact = false }) {
  const meta = COVER_META[game.id] || { accent: "#bdeeff", glow: "#3d8bd0", label: "Heritage board game" };
  const gradientId = `cover-${game.id.replace(/[^a-z0-9]/g, "")}`;
  return (
    <div
      className={`heritage-cover-art ${compact ? "heritage-cover-art--compact" : ""}`}
      style={{ "--cover-accent": meta.accent, "--cover-glow": meta.glow }}
      aria-hidden="true"
    >
      <svg className="heritage-cover-art__scene" viewBox="0 0 240 300" role="presentation">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0a2337" />
            <stop offset=".58" stopColor="#06121e" />
            <stop offset="1" stopColor={meta.glow} />
          </linearGradient>
          <radialGradient id={`${gradientId}-halo`} cx="50%" cy="48%" r="56%">
            <stop offset="0" stopColor={meta.accent} stopOpacity=".28" />
            <stop offset="1" stopColor={meta.accent} stopOpacity="0" />
          </radialGradient>
          <pattern id={`${gradientId}-grain`} width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="2" r=".55" fill="#fff" opacity=".12" />
            <circle cx="7" cy="6" r=".4" fill="#fff" opacity=".08" />
          </pattern>
        </defs>
        <rect width="240" height="300" fill={`url(#${gradientId})`} />
        <rect width="240" height="300" fill={`url(#${gradientId}-halo)`} />
        <path d="M0 230C53 193 87 225 132 196S205 185 240 145V300H0Z" fill="#d8eef0" opacity=".09" />
        <path d="M0 254C54 215 101 263 151 217S209 225 240 204V300H0Z" fill="#fff" opacity=".06" />
        <g className="heritage-cover-art__glyph" style={{ color: meta.accent }}><CoverGlyph gameId={game.id} /></g>
        <rect width="240" height="300" fill={`url(#${gradientId}-grain)`} />
      </svg>
      <div className="heritage-cover-art__frame" />
      <PenguinHostPair gameId={game.id} className="heritage-cover-art__hosts" />
      {!compact && <>
        <span className="heritage-cover-art__series">ARCTIC GAME KINGDOMS</span>
        <span className="heritage-cover-art__number">{String(game.priority).padStart(2, "0")}</span>
        <span className="heritage-cover-art__label">{meta.label}</span>
        <strong className="heritage-cover-art__title">{game.title}</strong>
        <span className="heritage-cover-art__heritage">{game.heritage}</span>
      </>}
    </div>
  );
}

export default HeritageCoverArt;
