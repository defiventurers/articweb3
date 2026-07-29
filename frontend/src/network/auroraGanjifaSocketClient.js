import { request } from "./socketClient.js";

export async function listAuroraGanjifaRooms() { return (await request("ag_room_list", {})).rooms || []; }
export async function createAuroraGanjifaRoom({ visibility = "public", playerCount = 3, profile }) { return (await request("ag_room_create", { visibility, playerCount, wallet: profile.wallet })).room; }
export async function joinAuroraGanjifaRoom({ roomCode, profile }) { return (await request("ag_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getAuroraGanjifaState({ roomCode, profile }) { return (await request("ag_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function getAuroraGanjifaLegalActions({ roomCode, profile }) { return (await request("ag_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function submitAuroraGanjifaAction({ roomCode, profile, action }) { return (await request("ag_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getAuroraGanjifaHistory({ profile }) { return (await request("ag_history", { wallet: profile.wallet })).history || []; }
export async function getMyAuroraGanjifaRooms({ profile }) { return (await request("ag_my_rooms", { wallet: profile.wallet })).rooms || []; }
