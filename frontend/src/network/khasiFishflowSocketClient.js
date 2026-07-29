import { request } from "./socketClient.js";
export const listKhasiFishflowRooms = async () => (await request("kf_room_list", {})).rooms || [];
export const createKhasiFishflowRoom = async ({ visibility = "public", side = "blue", profile }) => (await request("kf_room_create", { visibility, side, wallet: profile.wallet })).room;
export const joinKhasiFishflowRoom = async ({ roomCode, profile }) => (await request("kf_room_join", { roomCode, wallet: profile.wallet })).room;
export const getKhasiFishflowState = async ({ roomCode, profile }) => (await request("kf_game_state", { roomCode, wallet: profile.wallet })).room;
export const submitKhasiFishflowAction = async ({ roomCode, profile, action }) => (await request("kf_game_action", { roomCode, wallet: profile.wallet, action })).room;
export const getKhasiFishflowHistory = async ({ profile }) => (await request("kf_history", { wallet: profile.wallet })).history || [];
export const getMyKhasiFishflowRooms = async ({ profile }) => (await request("kf_my_rooms", { wallet: profile.wallet })).rooms || [];
