import { request } from "./socketClient.js";
export async function listKhasiFishflowRooms() { return (await request("kf_room_list", {})).rooms || []; }
export async function createKhasiFishflowRoom({ visibility = "public", side = "aurora", profile }) { return (await request("kf_room_create", { visibility, side, wallet: profile.wallet })).room; }
export async function joinKhasiFishflowRoom({ roomCode, profile }) { return (await request("kf_room_join", { roomCode, wallet: profile.wallet })).room; }
export async function getKhasiFishflowState({ roomCode, profile }) { return (await request("kf_game_state", { roomCode, wallet: profile.wallet })).room; }
export async function submitKhasiFishflowAction({ roomCode, profile, action }) { return (await request("kf_game_action", { roomCode, wallet: profile.wallet, action })).room; }
export async function getKhasiFishflowHistory({ profile }) { return (await request("kf_history", { wallet: profile.wallet })).history || []; }
export async function getMyKhasiFishflowRooms({ profile }) { return (await request("kf_my_rooms", { wallet: profile.wallet })).rooms || []; }
