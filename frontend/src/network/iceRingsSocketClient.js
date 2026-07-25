import { createProfile, request } from "./socketClient.js";

export { createProfile };

export async function listIceRingsRooms() {
  return (await request("ir_room_list", {})).rooms || [];
}

export async function createIceRingsRoom({ visibility = "public", side = "aurora", profile }) {
  return (await request("ir_room_create", { visibility, side, wallet: profile.wallet })).room;
}

export async function joinIceRingsRoom({ roomCode, profile }) {
  return (await request("ir_room_join", { roomCode, wallet: profile.wallet })).room;
}

export async function getIceRingsState({ roomCode, profile }) {
  return (await request("ir_game_state", { roomCode, wallet: profile.wallet })).room;
}

export async function submitIceRingsAction({ roomCode, profile, action }) {
  return (await request("ir_game_action", { roomCode, wallet: profile.wallet, action })).room;
}

export async function getIceRingsLegalActions({ roomCode, profile }) {
  return (await request("ir_legal_actions", { roomCode, wallet: profile.wallet })).actions || [];
}

export async function getIceRingsHistory({ profile }) {
  return (await request("ir_history", { wallet: profile.wallet })).history || [];
}

export async function getMyIceRingsRooms({ profile }) {
  return (await request("ir_my_rooms", { wallet: profile.wallet })).rooms || [];
}
