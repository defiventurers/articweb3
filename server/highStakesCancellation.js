const CANCEL_REASON_ROOM_TIMEOUT = "room_creation_timeout";

function createHighStakesCancellationManager({
  ROOM_MODES,
  ETH_VAULT_ADDRESS,
  ABSTRACT_RPC_URL,
  ETH_VAULT_WRITE_ABI,
  SETTLEMENT_MAX_ATTEMPTS,
  HIGH_STAKES_WAIT_TIMEOUT_MS,
  Contract,
  Provider,
  Wallet,
  realPlayers,
  walletOf,
  audit,
  saveRoomSafe,
  broadcast,
  saveVaultActivity,
  normalizeSecret,
  settlementErrorMessage
}) {
  const waitTimeoutMs = Math.max(0, Number(HIGH_STAKES_WAIT_TIMEOUT_MS || 0));

  function expiresAt(room) {
    if (!room || room.roomMode !== ROOM_MODES.HIGH_STAKES || !waitTimeoutMs) return null;
    const createdAt = Number(room.createdAt || 0);
    return createdAt > 0 ? createdAt + waitTimeoutMs : null;
  }

  function shouldCancel(room, now = Date.now()) {
    const deadline = expiresAt(room);
    if (!deadline) return false;
    if (room.status !== "waiting") return false;
    return now >= deadline;
  }

  function needsRefundRetry(room) {
    return room?.roomMode === ROOM_MODES.HIGH_STAKES && room.status === "cancelled" && ["pending", "failed", "submitting"].includes(room.refundStatus || "");
  }

  function viewFields(room) {
    return {
      highStakesWaitTimeoutMs: room?.roomMode === ROOM_MODES.HIGH_STAKES ? waitTimeoutMs : null,
      highStakesExpiresAt: expiresAt(room),
      cancelReason: room?.cancelReason || null,
      cancelledAt: room?.cancelledAt || null,
      refundStatus: room?.refundStatus || null,
      refundTxHashes: room?.refundTxHashes || [],
      refundError: room?.refundError || null,
      refundAttempts: room?.refundAttempts || 0
    };
  }

  function checkTimeout(room) {
    if (needsRefundRetry(room)) {
      refundCancelled(room).then(() => broadcast(room));
      return true;
    }
    if (!shouldCancel(room)) return false;
    cancelRoom(room);
    refundCancelled(room).then(() => broadcast(room));
    return true;
  }

  function cancelRoom(room) {
    if (!room || room.status === "cancelled") return;
    const deadline = expiresAt(room);
    const playerCount = realPlayers(room).length;
    room.status = "cancelled";
    room.cancelledAt = Date.now();
    room.cancelReason = CANCEL_REASON_ROOM_TIMEOUT;
    room.countdownStartTime = null;
    room.refundStatus = ETH_VAULT_ADDRESS && playerCount ? "pending" : "not_required";
    room.refundAttempts = Number(room.refundAttempts || 0);
    room.refundTxHashes = room.refundTxHashes || [];
    room.refundError = null;
    audit(room, {
      type: "high_stakes_room_cancelled",
      reason: room.cancelReason,
      realPlayerCount: playerCount,
      createdAt: room.createdAt || null,
      deadline,
      timeoutMs: waitTimeoutMs
    });
    saveRoomSafe(room);
    broadcast(room);
  }

  async function refundCancelled(room) {
    if (!room || room.roomMode !== ROOM_MODES.HIGH_STAKES || room.status !== "cancelled") return;
    if (room.refundInFlight) return;
    if (["refunded", "not_required", "needs_refund_review"].includes(room.refundStatus)) return;
    if (!ETH_VAULT_ADDRESS) {
      room.refundStatus = "needs_vault_config";
      room.refundError = "ETH vault is not configured on the server.";
      audit(room, { type: "refund_config_missing", error: room.refundError });
      saveRoomSafe(room);
      return;
    }

    const signerSecret = process.env.ETH_SETTLEMENT_SIGNER;
    if (!signerSecret) {
      room.refundStatus = "needs_refund_signer";
      room.refundError = "ETH_SETTLEMENT_SIGNER is not configured on Render.";
      audit(room, { type: "refund_signer_missing", error: room.refundError });
      saveRoomSafe(room);
      return;
    }

    room.refundAttempts = Number(room.refundAttempts || 0);
    if (room.refundAttempts >= SETTLEMENT_MAX_ATTEMPTS) {
      room.refundStatus = "needs_refund_review";
      room.refundError = `Refund retry limit reached (${SETTLEMENT_MAX_ATTEMPTS}).`;
      audit(room, { type: "refund_retry_limit", attempts: room.refundAttempts });
      saveRoomSafe(room);
      return;
    }

    room.refundInFlight = true;
    try {
      const provider = new Provider(ABSTRACT_RPC_URL);
      const wallet = new Wallet(normalizeSecret(signerSecret), provider);
      const contract = new Contract(ETH_VAULT_ADDRESS, ETH_VAULT_WRITE_ABI, wallet);
      const currentGameServer = await contract.gameServer();
      if (walletOf(currentGameServer) !== walletOf(wallet.address)) {
        room.refundStatus = "needs_game_server_update";
        room.refundError = `Configured settlement signer ${wallet.address} does not match vault gameServer ${currentGameServer}.`;
        audit(room, { type: "refund_signer_mismatch", signer: wallet.address, gameServer: currentGameServer });
        saveRoomSafe(room);
        return;
      }

      room.refundAttempts += 1;
      room.refundStatus = "submitting";
      room.refundError = null;
      room.refundTxHashes = room.refundTxHashes || [];
      audit(room, { type: "refund_submitting", signer: wallet.address, attempt: room.refundAttempts });
      saveRoomSafe(room);

      let releasedCount = 0;
      for (const player of realPlayers(room)) {
        const locked = await contract.lockedEntry(room.contractMatchId, player.wallet);
        const lockedAmount = BigInt(locked || 0);
        if (lockedAmount <= 0n) {
          player.entryLocked = false;
          continue;
        }

        const tx = await contract.releaseEntry(room.contractMatchId, player.wallet);
        room.refundTxHashes = [...new Set([...(room.refundTxHashes || []), tx.hash])];
        audit(room, { type: "entry_refund_submitted", wallet: player.wallet, amountWei: lockedAmount.toString(), txHash: tx.hash });
        saveVaultActivity({
          type: "entry_refund",
          wallet: player.wallet,
          currency: "ETH",
          amountWei: lockedAmount.toString(),
          roomCode: room.roomCode,
          matchId: room.matchId,
          contractMatchId: room.contractMatchId,
          txHash: tx.hash,
          status: "submitted",
          note: "Room cancelled because it stayed waiting past its auto-cancel deadline."
        }).catch(() => {});

        const receipt = await tx.wait();
        if (!(receipt?.status === 1 || receipt?.status === "success")) throw new Error(`Refund transaction did not succeed for ${player.wallet}.`);
        player.entryLocked = false;
        releasedCount += 1;
        saveVaultActivity({
          type: "entry_refund",
          wallet: player.wallet,
          currency: "ETH",
          amountWei: lockedAmount.toString(),
          roomCode: room.roomCode,
          matchId: room.matchId,
          contractMatchId: room.contractMatchId,
          txHash: tx.hash,
          status: "refunded",
          note: "Room cancelled because it stayed waiting past its auto-cancel deadline."
        }).catch(() => {});
      }

      room.refundStatus = releasedCount > 0 ? "refunded" : "not_required";
      room.refundError = null;
      audit(room, { type: "refund_finished", status: room.refundStatus, releasedCount, txHashes: room.refundTxHashes || [] });
      saveRoomSafe(room);
    } catch (err) {
      room.refundStatus = "failed";
      room.refundError = settlementErrorMessage(err);
      audit(room, { type: "refund_failed", error: room.refundError, attempt: room.refundAttempts || 0 });
      saveRoomSafe(room);
    } finally {
      room.refundInFlight = false;
    }
  }

  return { waitTimeoutMs, expiresAt, shouldCancel, checkTimeout, cancelRoom, refundCancelled, viewFields };
}

module.exports = { createHighStakesCancellationManager };
