import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstractChain } from "../config/chain.js";

export function Web3Provider({ children }) {
  return (
    <AbstractWalletProvider chain={abstractChain}>
      {children}
    </AbstractWalletProvider>
  );
}
