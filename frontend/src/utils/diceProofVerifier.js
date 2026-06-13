export async function verifyDiceProofs(randomness = {}) {
  const seed = randomness.serverSeedReveal;
  const seedHash = normalizeHash(randomness.serverSeedHash);
  const proofs = Array.isArray(randomness.diceProofs) ? randomness.diceProofs : [];

  if (!seed) {
    return {
      status: "waiting",
      seedValid: false,
      summary: "Seed reveal is not available yet. Verification unlocks after the match finishes.",
      results: proofs.map((proof) => ({ proof, status: "waiting", reason: "Waiting for seed reveal." }))
    };
  }

  const computedSeedHash = await sha256Hex(seed);
  const seedValid = computedSeedHash === seedHash;
  const results = [];

  for (const proof of proofs) {
    const input = proof.input || {};
    const roomCode = input.roomCode || proof.roomCode || randomness.roomCode || "";
    const matchId = input.matchId || proof.matchId || randomness.matchId || "";
    const contractMatchId = input.contractMatchId || proof.contractMatchId || randomness.contractMatchId || "";
    const turnNonce = input.turnNonce ?? proof.turnNonce;
    const wallet = String(input.wallet || proof.wallet || "").toLowerCase();
    const team = input.team || proof.team || "";
    const proofInput = [seed, roomCode, matchId, contractMatchId, turnNonce, wallet, team].join(":");
    const inputHash = await sha256Hex(proofInput);
    const dice = [diceFromHash(inputHash, 0), diceFromHash(inputHash, 8)];
    const expectedHash = normalizeHash(proof.inputHash);
    const expectedDice = (proof.dice || []).map((value) => Number(value));
    const hashValid = inputHash === expectedHash;
    const diceValid = expectedDice.length === 2 && expectedDice[0] === dice[0] && expectedDice[1] === dice[1];
    const serverHashValid = normalizeHash(proof.serverSeedHash) === seedHash;
    const valid = seedValid && hashValid && diceValid && serverHashValid;
    results.push({
      proof,
      status: valid ? "valid" : "invalid",
      reason: valid ? "Verified." : buildReason({ seedValid, hashValid, diceValid, serverHashValid }),
      recomputedHash: inputHash,
      recomputedDice: dice
    });
  }

  const validCount = results.filter((result) => result.status === "valid").length;
  const invalidCount = results.filter((result) => result.status === "invalid").length;
  return {
    status: invalidCount ? "invalid" : "valid",
    seedValid,
    computedSeedHash,
    summary: `${validCount}/${proofs.length} dice proofs verified${invalidCount ? `, ${invalidCount} invalid` : ""}.`,
    results
  };
}

export function shortVerificationStatus(status) {
  if (status === "valid") return "VALID";
  if (status === "invalid") return "INVALID";
  return "WAITING";
}

function buildReason(parts) {
  const reasons = [];
  if (!parts.seedValid) reasons.push("seed hash mismatch");
  if (!parts.serverHashValid) reasons.push("proof seed hash mismatch");
  if (!parts.hashValid) reasons.push("input hash mismatch");
  if (!parts.diceValid) reasons.push("dice mismatch");
  return reasons.join(", ") || "invalid proof";
}

function diceFromHash(hash, offset) {
  return (parseInt(hash.slice(offset, offset + 8), 16) % 6) + 1;
}

function normalizeHash(value) {
  return String(value || "").replace(/^0x/i, "").toLowerCase();
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
