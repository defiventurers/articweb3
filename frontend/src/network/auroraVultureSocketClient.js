import { request } from "./socketClient.js";

export async function listAuroraVultureRooms() {
  return (await request("av_room_list", {})).rooms || [];
}

export async function createAuroraVultureRoom({ visibility = "public", side = "crows", profile }) {
  return (await request("av_room_create", { visibility, side, wallet: profile.wallet })).room;
}

export async function joinAuroraVultureRoom({ roomCode, profile }) {
  return (await request("av_room_join", { roomCode, wallet: profile.wallet })).room;
}

export async function getAuroraVultureState({ roomCode, profile }) {
  return (await request("av_game_state", { roomCode, wallet: profile.wallet })).room;
}

export async function submitAuroraVultureAction({ roomCode, profile, action }) {
  return (await request("av_game_action", { roomCode, wallet: profile.wallet, action })).room;
}

export async function getAuroraVultureLegalActions({ roomCode, profile }) {
  return (await request("av_legal_actions", { roomCode, wallet: profile.wallet })).actions || [];
}

export async function getAuroraVultureHistory({ profile }) {
  return (await request("av_history", { wallet: profile.wallet })).history || [];
}

export async function getMyAuroraVultureRooms({ profile }) {
  return (await request("av_my_rooms", { wallet: profile.wallet })).rooms || [];
}
