require("@matterlabs/hardhat-zksync");

module.exports = {
  zksolc: {
    version: "1.5.15"
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
  },
  etherscan: {
    apiKey: {
      abstractTestnet: process.env.ETHERSCAN_API_KEY || "",
      abstractMainnet: process.env.ETHERSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "abstractTestnet",
        chainId: 11124,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.abscan.org/"
        }
      },
      {
        network: "abstractMainnet",
        chainId: 2741,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://abscan.org/"
        }
      }
    ]
  }
};
