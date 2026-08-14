import { request } from "./socketClient.js";

export async function listTwoStonesRooms() { return (await request("ts_room_list", {})).rooms || []; }
export async function createTwoStonesRoom({ visibility = "public", side = "blue", profile }) { return (await request("ts_room_create", { visibility, side, wallet: profile.wallet })).room; }
export async function joinTwoStonesRoom({ roomCode, profile }) { return (await request("ts_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getTwoStonesState({ roomCode, profile }) { return (await request("ts_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function submitTwoStonesAction({ roomCode, profile, action }) { return (await request("ts_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getTwoStonesLegalActions({ roomCode, profile }) { return (await request("ts_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getTwoStonesHistory({ profile }) { return (await request("ts_history", { wallet: profile.wallet })).history || []; }
export async function getMyTwoStonesRooms({ profile }) { return (await request("ts_my_rooms", { wallet: profile.wallet })).rooms || []; }
