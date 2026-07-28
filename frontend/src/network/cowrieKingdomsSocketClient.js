import { request } from "./socketClient.js";

export async function listCowrieKingdomsRooms() {
  return (await request("ck_room_list", {})).rooms || [];
}

export async function createCowrieKingdomsRoom({ visibility = "public", side = "aurora", profile }) {
  return (await request("ck_room_create", { visibility, side, wallet: profile.wallet })).room;
}

export async function joinCowrieKingdomsRoom({ roomCode, profile }) {
  return (await request("ck_room_join", { roomCode, wallet: profile.wallet })).room;
}

export async function getCowrieKingdomsState({ roomCode, profile }) {
  return (await request("ck_game_state", { roomCode, wallet: profile.wallet })).room;
}

export async function rollCowrieKingdomsCowries({ roomCode, profile }) {
  return (await request("ck_game_roll", { roomCode, wallet: profile.wallet })).room;
}

export async function submitCowrieKingdomsAction({ roomCode, profile, action }) {
  return (await request("ck_game_action", { roomCode, wallet: profile.wallet, action })).room;
}

export async function getCowrieKingdomsLegalActions({ roomCode, profile }) {
  return (await request("ck_legal_actions", { roomCode, wallet: profile.wallet })).actions || [];
}

export async function getCowrieKingdomsHistory({ profile }) {
  return (await request("ck_history", { wallet: profile.wallet })).history || [];
}

export async function getMyCowrieKingdomsRooms({ profile }) {
  return (await request("ck_my_rooms", { wallet: profile.wallet })).rooms || [];
}
