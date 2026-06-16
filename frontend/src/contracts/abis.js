export const tokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
];

export const vaultAbi = [
  { type: "function", name: "availableBalance", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "lockedBalance", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "lockEntry", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "releaseEntry", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }, { name: "player", type: "address" }], outputs: [] },
  { type: "function", name: "settleMatch", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }, { name: "players", type: "address[4]" }, { name: "payouts", type: "uint256[4]" }], outputs: [] }
];

export const ethVaultAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "gameServer", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "depositsPaused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "locksPaused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "settlementPaused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "withdrawalsPaused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "maxEntryAmount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "maxActiveLocks", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "activeLocks", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "defaultLockTimeout", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "availableBalance", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "lockedBalance", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "matchSettled", stateMutability: "view", inputs: [{ name: "matchId", type: "bytes32" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "lockedEntry", stateMutability: "view", inputs: [{ name: "matchId", type: "bytes32" }, { name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "lockDeadline", stateMutability: "view", inputs: [{ name: "matchId", type: "bytes32" }, { name: "player", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "setOwner", stateMutability: "nonpayable", inputs: [{ name: "newOwner", type: "address" }], outputs: [] },
  { type: "function", name: "setGameServer", stateMutability: "nonpayable", inputs: [{ name: "newGameServer", type: "address" }], outputs: [] },
  { type: "function", name: "setDepositsPaused", stateMutability: "nonpayable", inputs: [{ name: "paused", type: "bool" }], outputs: [] },
  { type: "function", name: "setLocksPaused", stateMutability: "nonpayable", inputs: [{ name: "paused", type: "bool" }], outputs: [] },
  { type: "function", name: "setSettlementPaused", stateMutability: "nonpayable", inputs: [{ name: "paused", type: "bool" }], outputs: [] },
  { type: "function", name: "setWithdrawalsPaused", stateMutability: "nonpayable", inputs: [{ name: "paused", type: "bool" }], outputs: [] },
  { type: "function", name: "setMaxEntryAmount", stateMutability: "nonpayable", inputs: [{ name: "newAmount", type: "uint256" }], outputs: [] },
  { type: "function", name: "setMaxActiveLocks", stateMutability: "nonpayable", inputs: [{ name: "newCap", type: "uint256" }], outputs: [] },
  { type: "function", name: "setDefaultLockTimeout", stateMutability: "nonpayable", inputs: [{ name: "newTimeout", type: "uint256" }], outputs: [] },
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "depositAndLock", stateMutability: "payable", inputs: [{ name: "matchId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "lockEntry", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "releaseEntry", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }, { name: "player", type: "address" }], outputs: [] },
  { type: "function", name: "refundExpiredEntry", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "settleMatch", stateMutability: "nonpayable", inputs: [{ name: "matchId", type: "bytes32" }, { name: "players", type: "address[4]" }, { name: "payouts", type: "uint256[4]" }], outputs: [] }
];
