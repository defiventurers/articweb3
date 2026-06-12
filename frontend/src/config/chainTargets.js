import { isAddress } from "viem";

export const ABSTRACT_TESTNET_USDC = "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || ABSTRACT_TESTNET_USDC;
export const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS || "";
export const TOKEN_DECIMALS = 6;

export const CHAIN_TARGETS_READY =
  isAddress(TOKEN_ADDRESS) && isAddress(VAULT_ADDRESS);
