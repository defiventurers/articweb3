import { Wallet } from "zksync-ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";
import { vars } from "hardhat/config";

const ABSTRACT_TESTNET_USDC = "0xe4C7fBB0a626ed208021ccabA6Be1566905E2dFc";

export default async function (hre: HardhatRuntimeEnvironment) {
  const deployerKey = vars.get("ABSTRACT_DEPLOYER_KEY");
  const wallet = new Wallet(deployerKey);
  const deployer = new Deployer(hre, wallet);

  const tokenAddress = process.env.TOKEN_ADDRESS || ABSTRACT_TESTNET_USDC;
  const gameServerAddress = process.env.GAME_SERVER_ADDRESS || wallet.address;

  console.log("Deploying GameEscrow to Abstract testnet...");
  console.log(`Token: ${tokenAddress}`);
  console.log(`Game server: ${gameServerAddress}`);

  const artifact = await deployer.loadArtifact("GameEscrow");
  const vault = await deployer.deploy(artifact, [tokenAddress, gameServerAddress]);
  const vaultAddress = await vault.getAddress();

  console.log(`GameEscrow deployed to: ${vaultAddress}`);
  console.log("");
  console.log("Set these Vercel env vars:");
  console.log(`VITE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_VAULT_ADDRESS=${vaultAddress}`);
}
