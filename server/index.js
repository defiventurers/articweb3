require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const { randomUUID, randomBytes } = require("crypto");
const { createPublicClient, createWalletClient, http: viemHttp, parseAbi } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const {
  createInitialGameState,
  currentTeam,
  rollDiceForState,
  selectSquare,
  endTurn,
  hasAnyLegalMoveForTeam,
  pickBotMove,
  applyMove,
  getPlacements
} = require("./gameRules.js");

const PORT = process.env.PORT || 10000;
const COUNTDOWN_MS = 5000;
const BOT_DELAY_MS = 650;
const TEAM_CODES = ["green", "red", "blue", "yellow"];
const TEAM_NAME_BY_CODE = {
  green: "Test Abster",
  red: "Test Retsba",
  blue: "Test Pengu",
  yellow: "Test Polly"
};
const ROOM_MODES = {
  OPEN_ICE: "open_ice",
  HIGH_STAKES: "high_stakes"
};
const ETH_VAULT_ADDRESS = process.env.ETH_VAULT_ADDRESS || process.env.VITE_ETH_VAULT_ADDRESS || "";
const ABSTRACT_RPC_URL = process.env.ABSTRACT_RPC_URL || "https://api.testnet.abs.xyz";
const HIGH_STAKES_ENABLED = process.env.HIGH_STAKES_ENABLED === "true" || Boolean(ETH_VAULT_ADDRESS);
const ENTRY_TIERS = {
  "1": {
    code: "1",
    label: "$1",
    entryFeeUsd: 1,
    entryWei: process.env.ETH_ENTRY_1_WEI || "1000000000000000",
    pointMultiplier: 1
  },
  "4": {
    code: "4",
    label: "$4",
    entryFeeUsd: 4,
    entryWei: process.env.ETH_ENTRY_4_WEI || "4000000000000000",
    pointMultiplier: 4
  },
  "16": {
    code: "16",
    label: "$16",
    entryFeeUsd: 16,
    entryWei: process.env.ETH_ENTRY_16_WEI || "16000000000000000",
    pointMultiplier: 16
  }
};
const ABSTRACT_TESTNET_CHAIN = {
  id: 11124,
  name: "Abstract Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [ABSTRACT_RPC_URL] } }
};
const ETH_VAULT_ABI = parseAbi([
  "function lockedEntry(bytes32 matchId, address player) view returns (uint256)",
  "function settleMatch(bytes32 matchId, address[4] players, uint256[4] payouts)"
]);
const ethPublicClient = ETH_VAULT_ADDRESS
  ? createPublicClient({ chain: ABSTRACT_TESTNET_CHAIN, transport: viemHttp(ABSTRACT_RPC_URL) })
  : null;

const profiles = new Map();
const rooms = new Map();
const sockets = new Map();

function send(ws, packet) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(packet));
}

function ok(ws, requestId, type, payload) {
  send(ws, { type, requestId, payload });
}

function fail(ws, requestId, message) {
  send(ws, { type: "error", requestId, payload: { message } });
}

function walletOf(value) {
  return String(value || "").toLowerCase();
}

function normalizeRoomMode(value) {
  return value === ROOM_MODES.HIGH_STAKES ? ROOM_MODES.HIGH_STAKES : ROOM_MODES.OPEN_ICE;
}

function normalizeEntryTier(value) {
  const tier = ENTRY_TIERS[String(value || "1")];
  return tier || ENTRY_TIERS["1"];
}

function normalizeTeam(value) {
  const team = String(value || "").toLowerCase().trim();
  return TEAM_CODES.includes(team) ? team : null;
}

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(out) ? code() : out;
}

function matchId() {
  return `match-${randomUUID()}`;
}

function contractMatchId() {
  return `0x${randomBytes(32).toString("hex")}`;
}

function players(room) {
  return Object.values(room.players);
}

function view(room) {
  return {
    id: room.id,
    matchId: room.matchId,
    contractMatchId: room.contractMatchId,
    roomCode: room.roomCode,
    roomMode: room.roomMode,
    currency: room.currency || null,
    entryTier: room.entryTier,
    entryFeeUsd: room.entryFeeUsd,
    entryWei: room.entryWei || "0",
    tokenUnits: room.tokenUnits,
    visibility: room.visibility,
    status: room.status,
    settlementStatus: room.settlementStatus || null,
    settlementTxHash: room.settlementTxHash || null,
    placements: room.placements || [],
    payoutPlan: room.payoutPlan || [],
    playerCount: players(room).length,
    maxPlayers: 4,
    countdownStartTime: room.countdownStartTime,
    countdownDurationMs: room.countdownDurationMs,
    gameState: room.gameState || null,
    players: players(room).map((player) => ({
      wallet: player.wallet,
      name: profiles.get(player.wallet)?.name || "Player",
      team: player.team,
      entryLocked: Boolean(player.entryLocked),
      entryTxHash: player.entryTxHash || null
    }))
  };
}

function broadcast(room) {
  const packet = { type: "room_state", payload: { room: view(room) } };
  for (const player of players(room)) {
    const ws = sockets.get(player.wallet);
    if (ws) send(ws, packet);
  }
}

function teamWallet(room, teamName) {
  return players(room).find((player) => player.team === teamName)?.wallet || null;
}

function isBotWallet(wallet) {
  return String(wallet || "").startsWith("dev-");
}

function realPlayers(room) {
  return players(room).filter((player) => !isBotWallet(player.wallet));
}

function teamsAreReady(room) {
  const roomPlayers = players(room);
  if (roomPlayers.length !== 4) return false;
  if (roomPlayers.some((player) => !player.team)) return false;
  return new Set(roomPlayers.map((player) => player.team)).size === 4;
}

function highStakesReady(room) {
  const roomPlayers = players(room);
  if (roomPlayers.length !== 4) return false;
  if (realPlayers(room).length !== 4) return false;
  if (roomPlayers.some((player) => !player.entryLocked)) return false;
  return teamsAreReady(room);
}

function roomCanCountdown(room) {
  if (room.roomMode === ROOM_MODES.OPEN_ICE) return teamsAreReady(room);
  if (room.roomMode === ROOM_MODES.HIGH_STAKES) return highStakesReady(room);
  return false;
}

function checkCountdown(room) {
  if (room.status !== "waiting") return;
  if (!roomCanCountdown(room)) return;
  if (!room.countdownStartTime) {
    room.countdownStartTime = Date.now();
    broadcast(room);
  }
}

function checkStart(room) {
  if (room.status !== "waiting" || !room.countdownStartTime) return;
  if (!roomCanCountdown(room)) {
    room.countdownStartTime = null;
    broadcast(room);
    return;
  }
  if (Date.now() - room.countdownStartTime < COUNTDOWN_MS) return;
  room.status = "playing";
  room.countdownStartTime = null;
  room.gameState = createInitialGameState();
  broadcast(room);
  scheduleBotIfNeeded(room);
}

function scheduleBotIfNeeded(room) {
  if (!room || room.roomMode !== ROOM_MODES.OPEN_ICE) return;
  if (room.status !== "playing" || !room.gameState || room.gameState.gameOver) return;
  const activeTeam = currentTeam(room.gameState);
  const activeWallet = teamWallet(room, activeTeam);
  if (!isBotWallet(activeWallet)) return;
  if (room.botTimer) return;

  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    playBotTurn(room);
  }, BOT_DELAY_MS);
}

function playBotTurn(room) {
  if (!room || room.status !== "playing" || !room.gameState || room.gameState.gameOver) return;
  const activeTeam = currentTeam(room.gameState);
  const activeWallet = teamWallet(room, activeTeam);
  if (!isBotWallet(activeWallet)) return;

  let nextGameState = room.gameState;
  if (!nextGameState.dice.rolled) {
    nextGameState = rollDiceForState(nextGameState);
  }

  const move = pickBotMove(nextGameState);
  room.gameState = move ? applyMove(nextGameState, move) : endTurn(nextGameState);
  finalizeGameIfOver(room);
  broadcast(room);
  scheduleBotIfNeeded(room);
}

function requirePlayingRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  const room = rooms.get(roomCode);

  if (!profiles.has(wallet)) {
    fail(ws, requestId, "Create profile first.");
    return null;
  }

  if (!room) {
    fail(ws, requestId, "Room not found.");
    return null;
  }

  if (!room.players[wallet]) {
    fail(ws, requestId, "Join the room first.");
    return null;
  }

  if (room.status !== "playing" || !room.gameState) {
    fail(ws, requestId, "Game has not started yet.");
    return null;
  }

  const activeTeam = currentTeam(room.gameState);
  const activeWallet = teamWallet(room, activeTeam);
  if (activeWallet !== wallet) {
    fail(ws, requestId, "It is not your turn.");
    return null;
  }

  sockets.set(wallet, ws);
  return room;
}

function profileFor(wallet) {
  return profiles.get(wallet);
}

function addPoints(wallet, points, won) {
  const profile = profileFor(wallet);
  if (!profile) return;
  profile.points += points;
  profile.gamesPlayed += 1;
  if (won) profile.wins += 1;
  profiles.set(wallet, profile);
}

function buildPayoutPlan(room, placements) {
  const entry = BigInt(room.entryWei || "0");
  const pool = entry * 4n;
  const first = (pool * 50n) / 100n;
  const second = (pool * 30n) / 100n;
  const third = (pool * 20n) / 100n;
  const fourth = 0n;
  const remainder = pool - first - second - third - fourth;
  const payouts = [first + remainder, second, third, fourth];
  const basePoints = [10, 6, 3, 0];
  const multiplier = normalizeEntryTier(room.entryTier).pointMultiplier;

  return placements.map((team, index) => {
    const wallet = teamWallet(room, team);
    return {
      position: index + 1,
      team,
      wallet,
      payoutWei: payouts[index].toString(),
      points: basePoints[index] * multiplier
    };
  });
}

async function settleHighStakesIfPossible(room) {
  if (room.roomMode !== ROOM_MODES.HIGH_STAKES || !ETH_VAULT_ADDRESS) return;
  if (!process.env.ETH_SETTLEMENT_SIGNER) {
    room.settlementStatus = "needs_settlement_signer";
    return;
  }

  try {
    const account = privateKeyToAccount(normalizeSecret(process.env.ETH_SETTLEMENT_SIGNER));
    const walletClient = createWalletClient({ account, chain: ABSTRACT_TESTNET_CHAIN, transport: viemHttp(ABSTRACT_RPC_URL) });
    const orderedWallets = room.payoutPlan.map((item) => item.wallet);
    const payouts = room.payoutPlan.map((item) => BigInt(item.payoutWei));
    room.settlementStatus = "submitting";
    const hash = await walletClient.writeContract({
      address: ETH_VAULT_ADDRESS,
      abi: ETH_VAULT_ABI,
      functionName: "settleMatch",
      args: [room.contractMatchId, orderedWallets, payouts]
    });
    room.settlementTxHash = hash;
    room.settlementStatus = "submitted";
  } catch (err) {
    room.settlementStatus = "failed";
    room.settlementError = err.shortMessage || err.message || "Settlement failed.";
  }
}

function normalizeSecret(value) {
  const secret = String(value || "").trim();
  return secret.startsWith("0x") ? secret : `0x${secret}`;
}

function finalizeGameIfOver(room) {
  if (!room.gameState?.gameOver || room.finalizedAt) return;
  room.finalizedAt = Date.now();
  room.status = "finished";
  const placements = getPlacements(room.gameState);
  room.placements = placements.map((team, index) => {
    const wallet = teamWallet(room, team);
    return {
      position: index + 1,
      team,
      wallet,
      name: profileFor(wallet)?.name || "Player"
    };
  });

  if (room.roomMode === ROOM_MODES.HIGH_STAKES) {
    room.payoutPlan = buildPayoutPlan(room, placements);
    room.payoutPlan.forEach((item, index) => addPoints(item.wallet, item.points, index === 0));
    room.settlementStatus = "pending";
    settleHighStakesIfPossible(room).then(() => broadcast(room));
  } else {
    room.placements.forEach((item, index) => addPoints(item.wallet, [10, 6, 3, 0][index] || 0, index === 0));
  }
}

async function readLockedEntry(room, wallet) {
  if (!ethPublicClient || !ETH_VAULT_ADDRESS) return 0n;
  return ethPublicClient.readContract({
    address: ETH_VAULT_ADDRESS,
    abi: ETH_VAULT_ABI,
    functionName: "lockedEntry",
    args: [room.contractMatchId, wallet]
  });
}

function login(ws, requestId, payload) {
  const wallet = walletOf(payload.address);
  const name = String(payload.name || "").trim().slice(0, 20);
  if (!wallet) return fail(ws, requestId, "Missing wallet address.");
  if (name.length < 3) return fail(ws, requestId, "Name must be at least 3 characters.");
  const old = profiles.get(wallet);
  const profile = {
    wallet,
    name,
    points: old?.points || 0,
    gamesPlayed: old?.gamesPlayed || 0,
    wins: old?.wins || 0,
    createdAt: old?.createdAt || Date.now()
  };
  profiles.set(wallet, profile);
  sockets.set(wallet, ws);
  return ok(ws, requestId, "profile_login_result", { profile });
}

function list(ws, requestId, payload = {}) {
  const roomMode = normalizeRoomMode(payload.roomMode);
  const publicRooms = [...rooms.values()]
    .filter((room) => room.roomMode === roomMode)
    .filter((room) => room.visibility === "public")
    .filter((room) => room.status === "waiting")
    .filter((room) => players(room).length < 4)
    .map(view);
  return ok(ws, requestId, "room_list_result", { rooms: publicRooms });
}

function createRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  sockets.set(wallet, ws);

  const roomMode = normalizeRoomMode(payload.roomMode);
  const entryTier = normalizeEntryTier(payload.entryTier);

  if (roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) {
    return fail(ws, requestId, "High Stakes rooms are not enabled yet.");
  }

  const roomCode = code();
  const room = {
    id: randomUUID(),
    matchId: matchId(),
    contractMatchId: contractMatchId(),
    roomCode,
    roomMode,
    currency: roomMode === ROOM_MODES.HIGH_STAKES ? "ETH" : null,
    entryTier: roomMode === ROOM_MODES.HIGH_STAKES ? entryTier.code : null,
    entryFeeUsd: roomMode === ROOM_MODES.HIGH_STAKES ? entryTier.entryFeeUsd : 0,
    entryWei: roomMode === ROOM_MODES.HIGH_STAKES ? entryTier.entryWei : "0",
    tokenUnits: "0",
    visibility: payload.visibility === "private" ? "private" : "public",
    status: "waiting",
    gameState: null,
    players: {
      [wallet]: {
        wallet,
        team: null,
        joinedAt: Date.now(),
        entryLocked: roomMode === ROOM_MODES.OPEN_ICE,
        entryTxHash: null
      }
    },
    countdownStartTime: null,
    countdownDurationMs: COUNTDOWN_MS,
    createdAt: Date.now()
  };
  rooms.set(roomCode, room);
  ok(ws, requestId, "room_create_result", { room: view(room) });
  return broadcast(room);
}

function joinRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  const room = rooms.get(roomCode);
  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.status !== "waiting") return fail(ws, requestId, "Room already started.");
  if (room.roomMode === ROOM_MODES.HIGH_STAKES && !HIGH_STAKES_ENABLED) {
    return fail(ws, requestId, "High Stakes rooms are not enabled yet.");
  }
  sockets.set(wallet, ws);
  if (!room.players[wallet]) {
    if (players(room).length >= 4) return fail(ws, requestId, "Room is full.");
    room.players[wallet] = {
      wallet,
      team: null,
      joinedAt: Date.now(),
      entryLocked: room.roomMode === ROOM_MODES.OPEN_ICE,
      entryTxHash: null
    };
  }
  ok(ws, requestId, "room_join_result", { room: view(room) });
  return broadcast(room);
}

async function confirmEntryLock(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  const room = rooms.get(roomCode);
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.roomMode !== ROOM_MODES.HIGH_STAKES) return fail(ws, requestId, "Entry locking is only for High Stakes.");
  if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
  if (!ETH_VAULT_ADDRESS) return fail(ws, requestId, "ETH vault is not configured on the server.");

  try {
    const locked = await readLockedEntry(room, wallet);
    if (locked < BigInt(room.entryWei)) {
      return fail(ws, requestId, "Entry lock not confirmed on-chain yet.");
    }
    room.players[wallet].entryLocked = true;
    room.players[wallet].entryTxHash = payload.txHash || room.players[wallet].entryTxHash;
    room.countdownStartTime = null;
    checkCountdown(room);
    ok(ws, requestId, "room_confirm_entry_result", { room: view(room) });
    return broadcast(room);
  } catch (err) {
    return fail(ws, requestId, err.shortMessage || err.message || "Could not verify entry lock.");
  }
}

function selectRoomTeam(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  const selectedTeam = normalizeTeam(payload.team);
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  const room = rooms.get(roomCode);
  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.status !== "waiting") return fail(ws, requestId, "Room already started.");
  if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
  if (room.roomMode === ROOM_MODES.HIGH_STAKES && !room.players[wallet].entryLocked) return fail(ws, requestId, "Lock your entry first.");
  if (!selectedTeam) return fail(ws, requestId, "Choose a valid team.");

  const taken = players(room).some((player) => player.wallet !== wallet && player.team === selectedTeam);
  if (taken) return fail(ws, requestId, "That team is already taken.");

  sockets.set(wallet, ws);
  room.players[wallet].team = selectedTeam;
  room.countdownStartTime = null;
  checkCountdown(room);
  ok(ws, requestId, "room_select_team_result", { room: view(room) });
  return broadcast(room);
}

function devFillRoom(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  const room = rooms.get(roomCode);
  if (!room) return fail(ws, requestId, "Room not found.");
  if (room.status !== "waiting") return fail(ws, requestId, "Room already started.");
  if (room.roomMode !== ROOM_MODES.OPEN_ICE) return fail(ws, requestId, "Bots are only available for Open Ice.");
  if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
  if (!room.players[wallet].team) return fail(ws, requestId, "Choose your team first.");

  for (const teamCode of TEAM_CODES) {
    if (players(room).length >= 4) break;
    if (players(room).some((player) => player.team === teamCode)) continue;
    const fakeWallet = `dev-${room.roomCode}-${teamCode}`;
    profiles.set(fakeWallet, {
      wallet: fakeWallet,
      name: TEAM_NAME_BY_CODE[teamCode],
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      createdAt: Date.now()
    });
    room.players[fakeWallet] = {
      wallet: fakeWallet,
      team: teamCode,
      joinedAt: Date.now(),
      entryLocked: true
    };
  }

  checkCountdown(room);
  ok(ws, requestId, "dev_fill_room_result", { room: view(room) });
  return broadcast(room);
}

function gameRollDice(ws, requestId, payload) {
  const room = requirePlayingRoom(ws, requestId, payload);
  if (!room) return;
  room.gameState = rollDiceForState(room.gameState);
  const activeTeam = currentTeam(room.gameState);
  if (room.gameState.dice.rolled && !hasAnyLegalMoveForTeam(room.gameState, activeTeam)) {
    room.gameState = endTurn(room.gameState);
  }
  finalizeGameIfOver(room);
  ok(ws, requestId, "game_action_result", { room: view(room) });
  broadcast(room);
  scheduleBotIfNeeded(room);
}

function gameSelectSquare(ws, requestId, payload) {
  const room = requirePlayingRoom(ws, requestId, payload);
  if (!room) return;
  const row = Number(payload.row);
  const col = Number(payload.col);
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 7 || col < 0 || col > 7) {
    return fail(ws, requestId, "Invalid square.");
  }
  room.gameState = selectSquare(room.gameState, row, col);
  finalizeGameIfOver(room);
  ok(ws, requestId, "game_action_result", { room: view(room) });
  broadcast(room);
  scheduleBotIfNeeded(room);
}

function gameEndTurn(ws, requestId, payload) {
  const room = requirePlayingRoom(ws, requestId, payload);
  if (!room) return;
  room.gameState = endTurn(room.gameState);
  finalizeGameIfOver(room);
  ok(ws, requestId, "game_action_result", { room: view(room) });
  broadcast(room);
  scheduleBotIfNeeded(room);
}

function gameState(ws, requestId, payload) {
  const wallet = walletOf(payload.wallet);
  const roomCode = String(payload.roomCode || "").trim().toUpperCase();
  const room = rooms.get(roomCode);
  if (!profiles.has(wallet)) return fail(ws, requestId, "Create profile first.");
  if (!room) return fail(ws, requestId, "Room not found.");
  if (!room.players[wallet]) return fail(ws, requestId, "Join the room first.");
  sockets.set(wallet, ws);
  return ok(ws, requestId, "game_state_result", { room: view(room) });
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, profiles: profiles.size, rooms: rooms.size, highStakesEnabled: HIGH_STAKES_ENABLED, ethVaultConfigured: Boolean(ETH_VAULT_ADDRESS) }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Artic Web3 lobby server running.");
});

new WebSocket.Server({ server }).on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let packet;
    try { packet = JSON.parse(raw); } catch { return fail(ws, null, "Invalid JSON."); }
    const { type, requestId, payload = {} } = packet;
    if (type === "profile_login") return login(ws, requestId, payload);
    if (type === "room_list") return list(ws, requestId, payload);
    if (type === "room_create") return createRoom(ws, requestId, payload);
    if (type === "room_join") return joinRoom(ws, requestId, payload);
    if (type === "room_confirm_entry") return confirmEntryLock(ws, requestId, payload);
    if (type === "room_select_team") return selectRoomTeam(ws, requestId, payload);
    if (type === "dev_fill_room") return devFillRoom(ws, requestId, payload);
    if (type === "game_state") return gameState(ws, requestId, payload);
    if (type === "game_roll_dice") return gameRollDice(ws, requestId, payload);
    if (type === "game_select_square") return gameSelectSquare(ws, requestId, payload);
    if (type === "game_end_turn") return gameEndTurn(ws, requestId, payload);
    return fail(ws, requestId, `Unknown message type: ${type}`);
  });
});

setInterval(() => {
  for (const room of rooms.values()) checkStart(room);
}, 250);

server.listen(PORT, () => console.log(`Artic Web3 lobby server running on port ${PORT}`));
