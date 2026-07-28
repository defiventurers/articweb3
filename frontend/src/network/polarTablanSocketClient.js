import { request } from "./socketClient.js";

export async function listPolarTablanRooms() { return (await request("pt_room_list", {})).rooms || []; }
export async function createPolarTablanRoom({ visibility = "public", side = "aurora", profile }) { return (await request("pt_room_create", { visibility, side, wallet: profile.wallet })).room; }
export async function joinPolarTablanRoom({ roomCode, profile }) { return (await request("pt_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getPolarTablanState({ roomCode, profile }) { return (await request("pt_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function rollPolarTablanSticks({ roomCode, profile }) { return (await request("pt_game_roll", { roomCode, wallet: profile.wallet })).room; }
export async function submitPolarTablanAction({ roomCode, profile, action }) { return (await request("pt_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getPolarTablanHistory({ profile }) { return (await request("pt_history", { wallet: profile.wallet })).history || []; }
export async function getMyPolarTablanRooms({ profile }) { return (await request("pt_my_rooms", { wallet: profile.wallet })).rooms || []; }
