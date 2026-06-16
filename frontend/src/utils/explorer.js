import { appConfig } from "../config/chain.js";

function baseExplorerUrl() {
  return appConfig.explorerUrl.replace(/\/$/, "");
}

export function txUrl(txHash) {
  return `${baseExplorerUrl()}/tx/${txHash}`;
}

export function addressUrl(address) {
  return `${baseExplorerUrl()}/address/${address}`;
}

export function contractUrl(address) {
  return addressUrl(address);
}
