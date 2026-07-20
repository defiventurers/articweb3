const SOUND_BASE = "/assets/sounds";
const STORAGE_KEY = "articweb3_audio_muted";

const SOUND_DEFS = {
  ambientIce: { file: "ambient-ice-loop.mp3", volume: 0.18, loop: true },
  capture: { file: "capture.mp3", volume: 0.82 },
  countdownGo: { file: "countdown-go.mp3", volume: 0.82 },
  countdownTick: { file: "countdown-tick.mp3", volume: 0.62 },
  coverScreen: { file: "frozen_crown_overture.mp3", volume: 0.42, track: true, loop: true },
  createProfile: { file: "profile_theme.mp3", volume: 0.5, track: true, loop: true },
  diceRoll: { file: "dice-roll.mp3", volume: 0.72 },
  gameStart: { file: "game-start.mp3", volume: 0.82 },
  highStakes: { file: "high_stakes_theme.mp3", volume: 0.52, track: true, loop: true },
  invalidAction: { file: "invalid-action.mp3", volume: 0.7 },
  mainMenu: { file: "main_menu_theme.mp3", volume: 0.46, track: true, loop: true },
  moveElephant: { file: "move-elephant.mp3", volume: 0.72 },
  moveHorse: { file: "move-horse.mp3", volume: 0.66 },
  moveKing: { file: "move-king.mp3", volume: 0.68 },
  movePawn: { file: "move-pawn.mp3", volume: 0.58 },
  moveShip: { file: "move-ship.mp3", volume: 0.72 },
  openIce: { file: "open_ice_small.mp3", volume: 0.5, track: true, loop: true },
  pieceMove: { file: "piece-move.mp3", volume: 0.62 },
  pieceSelect: { file: "piece-select.mp3", volume: 0.56 },
  playNow: { file: "play-now.mp3", volume: 0.68, track: true },
  playerHub: { file: "player_hub_theme.mp3?v=20260721a", volume: 0.46, track: true, loop: true },
  promotion: { file: "promotion.mp3", volume: 0.78 },
  readyToggle: { file: "ready-toggle.mp3", volume: 0.7 },
  roomJoin: { file: "room-join.mp3", volume: 0.72 },
  teamAbster: { file: "team-abster.mp3", volume: 0.78 },
  teamEliminated: { file: "team-eliminated.mp3", volume: 0.86 },
  teamPengu: { file: "team-pengu.mp3", volume: 0.78 },
  teamPolly: { file: "team-polly.mp3", volume: 0.78 },
  teamRetsba: { file: "team-retsba.mp3", volume: 0.78 },
  turnChange: { file: "turn-change.mp3", volume: 0.55 },
  uiBack: { file: "ui-back.mp3", volume: 0.55 },
  uiConfirm: { file: "ui-confirm.mp3", volume: 0.7 },
  uiError: { file: "ui-error.mp3", volume: 0.7 },
  uiTap: { file: "ui-tap.mp3", volume: 0.45 },
  victory: { file: "victory_theme.mp3", volume: 0.82, track: true },
  defeat: { file: "defeat_theme.mp3", volume: 0.72, track: true },
  tutorial: { file: "tutorial_theme.mp3", volume: 0.42, track: true, loop: true },
  roomSetup: { file: "gathering_the_clans.mp3", volume: 0.45, track: true, loop: true },
  teamSelect: { file: "team_select_theme.mp3", volume: 0.48, track: true, loop: true },
  waitingRoom: { file: "aurora_wait.mp3", volume: 0.4, track: true, loop: true },
  gameBoard: { file: "game_board_theme.mp3", volume: 0.38, track: true, loop: true },
  spectator: { file: "spectator_theme.mp3?v=20260721a", volume: 0.42, track: true, loop: true },
  dataScreens: { file: "data_screen_theme.mp3", volume: 0.4, track: true, loop: true },
  transactionPending: { file: "transaction_pending_loop.mp3", volume: 0.36, track: true, loop: true }
};

const SCREEN_TRACKS = {
  cover: "coverScreen",
  menu: "mainMenu",
  "how-to-play": "tutorial",
  profile: "createProfile",
  hub: "playerHub",
  "open-ice-menu": "openIce",
  "high-stakes": "highStakes",
  "create-room": "roomSetup",
  "join-room": "roomSetup",
  "team-select": "teamSelect",
  waiting: "waitingRoom",
  game: "gameBoard",
  spectator: "spectator",
  "match-history": "dataScreens",
  leaderboard: "dataScreens",
  activity: "dataScreens",
  "my-rooms": "dataScreens",
  "vault-deployer": "transactionPending",
  "settlement-admin": "transactionPending"
};

const listeners = new Set();
const audioByName = new Map();
const lastPlayed = new Map();
let loaded = false;
let unlocked = false;
let enabled = true;
let lastScreen = null;
let lastScreenContext = {};
let currentTrack = null;

function canUseAudio() {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

function notify() {
  listeners.forEach((listener) => listener({ enabled, unlocked }));
}

function load() {
  if (loaded || !canUseAudio()) return;
  enabled = window.localStorage.getItem(STORAGE_KEY) !== "true";

  Object.entries(SOUND_DEFS).forEach(([name, def]) => {
    const audio = new Audio(`${SOUND_BASE}/${def.file}`);
    audio.preload = "auto";
    audio.volume = def.volume;
    audio.loop = Boolean(def.loop);
    audioByName.set(name, audio);
  });

  loaded = true;
  notify();
}

function unlock() {
  load();
  if (!canUseAudio() || unlocked) return;
  unlocked = true;
  notify();
  handleScreen(lastScreen, lastScreenContext);
}

function subscribe(listener) {
  listeners.add(listener);
  listener({ enabled, unlocked });
  return () => listeners.delete(listener);
}

function isEnabled() {
  load();
  return enabled;
}

function setMuted(muted) {
  load();
  enabled = !muted;
  if (canUseAudio()) window.localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
  if (muted) stopAllAudio();
  else handleScreen(lastScreen, lastScreenContext);
  notify();
}

function toggleMuted() {
  setMuted(enabled);
}

function play(name, options = {}) {
  load();
  if (!enabled || !unlocked) return;

  const source = audioByName.get(name);
  if (!source) return;

  const cooldownMs = Number(options.cooldownMs ?? 60);
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const last = lastPlayed.get(name) || 0;
  if (cooldownMs > 0 && now - last < cooldownMs) return;
  lastPlayed.set(name, now);

  try {
    const audio = source.cloneNode(true);
    audio.loop = false;
    audio.volume = Number(options.volume ?? source.volume ?? 0.7);
    audio.play().catch(() => {});
  } catch {
    // Audio is cosmetic. Never break gameplay because of a browser audio failure.
  }
}

function playTrack(name, options = {}) {
  load();
  if (!enabled || !unlocked) return;

  const audio = audioByName.get(name);
  if (!audio) return;

  const restart = options.restart !== false;
  if (currentTrack && currentTrack !== name) stopTrack(currentTrack);
  if (currentTrack === name && !restart && !audio.paused) return;

  currentTrack = name;
  try {
    audio.loop = Boolean(SOUND_DEFS[name]?.loop);
    audio.volume = Number(options.volume ?? SOUND_DEFS[name]?.volume ?? audio.volume ?? 0.7);
    if (restart) audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Ignore cosmetic audio failures.
  }
}

function stopTrack(name = currentTrack) {
  if (!name) return;
  const audio = audioByName.get(name);
  if (audio) {
    audio.pause();
    try { audio.currentTime = 0; } catch {}
  }
  if (currentTrack === name) currentTrack = null;
}

function startLoop(name) {
  load();
  if (!enabled || !unlocked) return;
  const audio = audioByName.get(name);
  if (!audio || !audio.paused) return;
  try {
    audio.loop = true;
    audio.play().catch(() => {});
  } catch {
    // Ignore cosmetic audio failures.
  }
}

function stopLoop(name) {
  const audio = audioByName.get(name);
  if (!audio) return;
  audio.pause();
}

function stopAllAudio() {
  audioByName.forEach((audio) => {
    audio.pause();
    if (audio.loop || SOUND_DEFS[currentTrack]?.track) {
      try { audio.currentTime = 0; } catch {}
    }
  });
  currentTrack = null;
}

function handleScreen(screen, context = {}) {
  lastScreen = screen;
  lastScreenContext = context || {};
  if (!screen) return;

  stopLoop("ambientIce");

  const track = screen === "results"
    ? resultTrack(context)
    : SCREEN_TRACKS[screen];

  if (track) {
    playTrack(track, { restart: currentTrack !== track });
  } else {
    stopTrack();
  }
}

function resultTrack({ room, profile } = {}) {
  const profileWallet = String(profile?.wallet || "").toLowerCase();
  if (!profileWallet) return "victory";

  const placements = room?.placements?.length
    ? room.placements
    : (room?.players || []).map((player, index) => ({ ...player, position: index + 1 }));
  const playerPlacement = placements.find((player) => String(player.wallet || "").toLowerCase() === profileWallet);
  return Number(playerPlacement?.position || 0) === 1 ? "victory" : "defeat";
}

function teamSound(team) {
  return {
    green: "teamAbster",
    red: "teamRetsba",
    blue: "teamPengu",
    yellow: "teamPolly"
  }[team] || "pieceSelect";
}

function pieceMoveSound(pieceType) {
  return {
    king: "moveKing",
    elephant: "moveElephant",
    horse: "moveHorse",
    ship: "moveShip",
    pawn: "movePawn"
  }[pieceType] || "pieceMove";
}

export const soundManager = {
  load,
  unlock,
  subscribe,
  isEnabled,
  setMuted,
  toggleMuted,
  play,
  playTrack,
  stopTrack,
  startLoop,
  stopLoop,
  handleScreen,
  teamSound,
  pieceMoveSound
};