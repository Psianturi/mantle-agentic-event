/**
 * Deploy MAEFDynamicNFTV4 to a non-Mantle EVM chain.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-new-chain.js --network ethereumSepolia
 *   npx hardhat run scripts/deploy-new-chain.js --network polygonAmoy
 *
 * Requires DEPLOYER_PRIVATE_KEY in contracts/.env
 */

import hre from "hardhat";

const EXPLORERS = {
  ethereumSepolia: "https://sepolia.etherscan.io",
  polygonAmoy:     "https://amoy.polygonscan.com",
};

// Backend minter service wallet — must get MINTER_ROLE on every new deployment
const MINTER_SERVICE_WALLET = "0xCBA7951a8b5AE81303AC5E1017e34bF50A342D22";

async function main() {
  const net = await hre.network.create();
  const { ethers } = net;
  const networkName = net.networkName;
  const [deployer] = await ethers.getSigners();

  if (!EXPLORERS[networkName]) {
    throw new Error(`Unknown network: ${networkName}. Add it to EXPLORERS map in this script.`);
  }

  const explorer = EXPLORERS[networkName];

  console.log("Network  :", networkName);
  console.log("Deployer :", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "native token");

  if (balance === 0n) {
    throw new Error(`Deployer has no funds on ${networkName}. Get testnet tokens from a faucet.`);
  }

  console.log("\nDeploying MAEFDynamicNFTV4...");
  const MAEF = await ethers.getContractFactory("MAEFDynamicNFTV4");
  const maef = await MAEF.deploy();
  await maef.waitForDeployment();

  const address = await maef.getAddress();
  console.log("\nSUCCESS: MAEFDynamicNFTV4 deployed to:", address);
  console.log("Explorer:", `${explorer}/address/${address}`);

  // Grant MINTER_ROLE to backend minter service
  console.log("\nGranting MINTER_ROLE to:", MINTER_SERVICE_WALLET);
  const tx = await maef.grantMinterRole(MINTER_SERVICE_WALLET);
  await tx.wait();
  console.log("SUCCESS: MINTER_ROLE granted");
  console.log("Tx      :", `${explorer}/tx/${tx.hash}`);

  console.log("\n=== Post-deploy checklist ===");
  console.log(`1. Add to src/lib/blockchain/chains.ts:`);
  console.log(`   ${networkName}: { contractAddress: "${address}", ... }`);
  console.log(`2. Add to backend CHAIN_CONFIGS (config.py)`);
  console.log(`3. Test: spawn agent on ${networkName} via frontend`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
