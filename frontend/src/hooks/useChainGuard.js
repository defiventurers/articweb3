import { useAccount } from "wagmi";
import { appConfig } from "../config/chain.js";

export function useChainGuard() {
  const { address, chainId, isConnected } = useAccount();
  const connectedChainId = typeof chainId === "number" ? chainId : null;
  const isWrongChain = Boolean(isConnected && connectedChainId && connectedChainId !== appConfig.chainId);

  return {
    address,
    isConnected,
    connectedChainId,
    expectedChainId: appConfig.chainId,
    expectedNetworkName: appConfig.isMainnet ? "Abstract Mainnet" : "Abstract Testnet",
    isWrongChain,
    canUseMoneyActions: Boolean(isConnected && !isWrongChain)
  };
}
