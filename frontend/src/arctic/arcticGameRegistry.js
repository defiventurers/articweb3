import { GAME_CATALOG } from "../data/gameCatalog.js";

const WORLD_LAYOUT = {
  "arctic-dominion": { zone: "crown-citadel", x: 52, y: 48, depth: 12, rotation: -8, scale: 1.22, landmark: "The Crown Citadel", reveal: "royal" },
  "nine-ice-forts": { zone: "fortress-pass", x: 34, y: 42, depth: 28, rotation: -14, scale: 0.95, landmark: "Nine Forts Pass", reveal: "forts" },
  "four-wing-ice-hunt": { zone: "frostwood", x: 18, y: 64, depth: 42, rotation: 12, scale: 0.9, landmark: "Hunter's Frostwood", reveal: "hunt" },
  fishflow: { zone: "river-market", x: 28, y: 73, depth: 35, rotation: -9, scale: 0.92, landmark: "Fishflow River", reveal: "river" },
  "break-the-ice": { zone: "ice-bridge", x: 43, y: 72, depth: 20, rotation: 11, scale: 0.9, landmark: "Crackling Bridge", reveal: "crack" },
  "ice-hunters": { zone: "glacier-ledge", x: 13, y: 40, depth: 58, rotation: -4, scale: 0.88, landmark: "Predator's Ledge", reveal: "hunt" },
  "sixteen-ice-warriors": { zone: "warrior-camp", x: 66, y: 67, depth: 30, rotation: 7, scale: 1.01, landmark: "Warrior's Camp", reveal: "warriors" },
  "glacier-trail": { zone: "summit-trail", x: 80, y: 34, depth: 54, rotation: 14, scale: 0.86, landmark: "Glacier Trail", reveal: "trail" },
  "crown-run": { zone: "royal-causeway", x: 64, y: 38, depth: 34, rotation: -12, scale: 0.9, landmark: "Royal Causeway", reveal: "royal" },
  "forty-glacier-guards": { zone: "guard-plain", x: 80, y: 68, depth: 48, rotation: 9, scale: 0.82, landmark: "Forty Guard Plain", reveal: "guards" },
  "sky-temple-run": { zone: "sky-temple", x: 88, y: 20, depth: 67, rotation: 18, scale: 0.82, landmark: "Aurora Temple", reveal: "temple" },
  "ice-rings": { zone: "crystal-lake", x: 8, y: 76, depth: 62, rotation: -15, scale: 0.8, landmark: "Seven-Crystal Lake", reveal: "rings" },
  "cowrie-kingdoms": { zone: "caravan-road", x: 58, y: 82, depth: 46, rotation: 8, scale: 0.85, landmark: "Cowrie Caravan", reveal: "trail" },
  "two-stones": { zone: "stone-circle", x: 39, y: 30, depth: 68, rotation: -11, scale: 0.78, landmark: "Two Stone Circle", reveal: "stones" },
  "aurora-vulture": { zone: "star-cliff", x: 20, y: 22, depth: 76, rotation: 15, scale: 0.8, landmark: "Vulture Star Cliff", reveal: "aurora" },
  "khasi-fishflow": { zone: "khasi-river", x: 72, y: 78, depth: 38, rotation: -6, scale: 0.87, landmark: "Khasi River Bend", reveal: "river" },
  "seven-ice-rings": { zone: "ring-grotto", x: 10, y: 54, depth: 74, rotation: 5, scale: 0.78, landmark: "Ring Grotto", reveal: "rings" },
  "ruma-ice-puzzle": { zone: "ruma-cave", x: 47, y: 23, depth: 72, rotation: 10, scale: 0.82, landmark: "Ruma Ice Cave", reveal: "puzzle" },
  "polar-tablan": { zone: "tablan-sledway", x: 90, y: 52, depth: 59, rotation: -10, scale: 0.78, landmark: "Tablan Sledway", reveal: "trail" },
  sige: { zone: "sige-watch", x: 31, y: 88, depth: 52, rotation: 13, scale: 0.76, landmark: "Sige Watch", reveal: "stones" },
  "aurora-ganjifa-academy": { zone: "card-academy", x: 72, y: 22, depth: 62, rotation: -16, scale: 0.81, landmark: "Ganjifa Academy", reveal: "aurora" }
};

const REVEAL_EFFECTS = {
  royal: { accent: "#ffd58a", board: "crown", particles: "snow-crown" },
  forts: { accent: "#91d8ff", board: "fort", particles: "ice-sparks" },
  hunt: { accent: "#f5a466", board: "hunt", particles: "wild-snow" },
  river: { accent: "#6ce8ea", board: "river", particles: "water-glint" },
  crack: { accent: "#d5f3ff", board: "race", particles: "ice-crack" },
  warriors: { accent: "#f2c779", board: "war", particles: "banner-flurry" },
  trail: { accent: "#89c7ff", board: "trail", particles: "trail-snow" },
  guards: { accent: "#bc9eff", board: "guard", particles: "glacier-dust" },
  temple: { accent: "#c5a5ff", board: "temple", particles: "aurora-shards" },
  rings: { accent: "#8bf1d2", board: "ring", particles: "crystal-orbit" },
  stones: { accent: "#c1d2e3", board: "stone", particles: "stone-frost" },
  aurora: { accent: "#b68cff", board: "cards", particles: "aurora-motes" },
  puzzle: { accent: "#ffbf91", board: "puzzle", particles: "ruma-light" }
};

function defaultArtwork(gameId) {
  return {
    frontArtwork: null,
    sideArtwork: null,
    topArtwork: null,
    replacementPath: `/assets/boxes/${gameId}/`
  };
}

export const ARCTIC_GAME_REGISTRY = GAME_CATALOG.map((game) => {
  const layout = WORLD_LAYOUT[game.id];
  if (!layout) throw new Error(`Missing Arctic world layout for ${game.id}`);

  return {
    ...game,
    gameId: game.id,
    position: { x: layout.x, y: layout.y, depth: layout.depth },
    rotation: layout.rotation,
    scale: layout.scale,
    zone: layout.zone,
    landmark: layout.landmark,
    boxMaterial: "weathered-iceboard",
    theme: game.theme,
    revealConfig: REVEAL_EFFECTS[layout.reveal],
    ...defaultArtwork(game.id)
  };
});

export function getArcticWorldGame(gameId) {
  return ARCTIC_GAME_REGISTRY.find((game) => game.gameId === gameId) || null;
}

export const PLAYABLE_ARCTIC_GAMES = ARCTIC_GAME_REGISTRY.filter((game) => game.available);
