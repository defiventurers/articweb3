export const ETH_GAME_ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "initialGameServer", type: "address" }],
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
    stateMutability: "payable",
    inputs: [],
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
  }
];

export const ETH_GAME_ESCROW_BYTECODE = "";
