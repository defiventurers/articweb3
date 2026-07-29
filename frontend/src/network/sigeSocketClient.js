import { request } from "./socketClient.js";

export async function listSigeRooms() { return (await request("sg_room_list", {})).rooms || []; }
export async function createSigeRoom({ visibility = "public", side = "aurora", profile }) { return (await request("sg_room_create", { visibility, side, wallet: profile.wallet })).room; }
export async function joinSigeRoom({ roomCode, profile }) { return (await request("sg_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getSigeState({ roomCode, profile }) { return (await request("sg_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function rollSigeCowries({ roomCode, profile }) { return (await request("sg_game_roll", { roomCode, wallet: profile.wallet })).room; }
export async function submitSigeAction({ roomCode, profile, action }) { return (await request("sg_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getSigeLegalActions({ roomCode, profile }) { return (await request("sg_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getSigeHistory({ profile }) { return (await request("sg_history", { wallet: profile.wallet })).history || []; }
export async function getMySigeRooms({ profile }) { return (await request("sg_my_rooms", { wallet: profile.wallet })).rooms || []; }
