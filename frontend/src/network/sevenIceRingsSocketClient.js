import { request } from "./socketClient.js";

export async function listSevenIceRingsRooms() { return (await request("sir_room_list", {})).rooms || []; }
export async function createSevenIceRingsRoom({ visibility = "public", side = "aurora", variant = "open", profile }) { return (await request("sir_room_create", { visibility, side, variant, wallet: profile.wallet })).room; }
export async function joinSevenIceRingsRoom({ roomCode, profile }) { return (await request("sir_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getSevenIceRingsState({ roomCode, profile }) { return (await request("sir_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function submitSevenIceRingsAction({ roomCode, profile, action }) { return (await request("sir_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getSevenIceRingsLegalActions({ roomCode, profile }) { return (await request("sir_legal_actions", { roomCode, wallet: profile.wallet })).actions || []; }
export async function getSevenIceRingsHistory({ profile }) { return (await request("sir_history", { wallet: profile.wallet })).history || []; }
export async function getMySevenIceRingsRooms({ profile }) { return (await request("sir_my_rooms", { wallet: profile.wallet })).rooms || []; }
