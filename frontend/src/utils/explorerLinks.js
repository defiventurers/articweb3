const EXPLORER_BASE_URL = import.meta.env.VITE_ABSTRACT_EXPLORER_URL || "https://sepolia.abscan.org";

export function txUrl(hash) {
  return hash ? `${EXPLORER_BASE_URL}/tx/${hash}` : null;
}

export function addressUrl(address) {
  return address ? `${EXPLORER_BASE_URL}/address/${address}` : null;
}

export function shortHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export function shortAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
