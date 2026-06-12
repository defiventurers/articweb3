export const GAME_ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "initialGameServer", type: "address" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "gameServer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "setGameServer",
    stateMutability: "nonpayable",
    inputs: [{ name: "newGameServer", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "availableBalance",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "lockedBalance",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "lockEntry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "releaseEntry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "player", type: "address" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "settleMatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "players", type: "address[4]" },
      { name: "payouts", type: "uint256[4]" }
    ],
    outputs: []
  }
];

export const GAME_ESCROW_BYTECODE = "";
