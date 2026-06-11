import { isAddress } from "viem";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || "";
export const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS || "";
export const TOKEN_DECIMALS = 6;

export const CHAIN_TARGETS_READY =
  isAddress(TOKEN_ADDRESS) && isAddress(VAULT_ADDRESS);
