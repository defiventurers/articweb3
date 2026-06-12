require("@matterlabs/hardhat-zksync");

module.exports = {
  zksolc: {
    version: "latest"
  },
  defaultNetwork: "abstractTestnet",
  networks: {
    abstractTestnet: {
      url: "https://api.testnet.abs.xyz",
      ethNetwork: "sepolia",
      zksync: true,
      chainId: 11124
    },
    abstractMainnet: {
      url: "https://api.mainnet.abs.xyz",
      ethNetwork: "mainnet",
      zksync: true,
      chainId: 2741
    }
  },
  solidity: {
    version: "0.8.24"
  }
};
