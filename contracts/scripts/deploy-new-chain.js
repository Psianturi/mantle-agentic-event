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

// Fee registry per chain — the ONLY place spawn/breed economics are calibrated.
// Contract itself is chain-agnostic; these values are pushed via setFees() +
// setBreedCost() right after deploy. Values are in the chain's native token units.
// provision must always be <= spawn (enforced on-chain too, see setFees()).
// breed:spawn ratio kept at 2:1, matching Mantle's original economics.
const FEES_PER_CHAIN = {
  ethereumSepolia: { spawn: "0.02", provision: "0.01", breed: "0.04" },  // ETH — sized for typical Sepolia faucet drips
  polygonAmoy:     { spawn: "1",    provision: "0.5",  breed: "2"    },  // MATIC — placeholder, revisit before first use
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
  if (!FEES_PER_CHAIN[networkName]) {
    throw new Error(`No fee config for ${networkName}. Add it to FEES_PER_CHAIN map in this script.`);
  }

  const explorer = EXPLORERS[networkName];
  const fees = FEES_PER_CHAIN[networkName];

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

  // Calibrate spawn economics for this chain's native token (see FEES_PER_CHAIN above)
  console.log(`\nCalling setFees(${fees.spawn}, ${fees.provision})...`);
  const feesTx = await maef.setFees(
    ethers.parseEther(fees.spawn),
    ethers.parseEther(fees.provision),
  );
  await feesTx.wait();
  console.log("SUCCESS: fees set");
  console.log("Tx      :", `${explorer}/tx/${feesTx.hash}`);

  // Calibrate breed economics too — same registry, so the next chain deploy
  // can't repeat the "spawn fee calibrated, breed cost forgotten" mistake.
  console.log(`\nCalling setBreedCost(${fees.breed})...`);
  const breedTx = await maef.setBreedCost(ethers.parseEther(fees.breed));
  await breedTx.wait();
  console.log("SUCCESS: breed cost set");
  console.log("Tx      :", `${explorer}/tx/${breedTx.hash}`);

  // Grant MINTER_ROLE to backend minter service
  console.log("\nGranting MINTER_ROLE to:", MINTER_SERVICE_WALLET);
  const tx = await maef.grantMinterRole(MINTER_SERVICE_WALLET);
  await tx.wait();
  console.log("SUCCESS: MINTER_ROLE granted");
  console.log("Tx      :", `${explorer}/tx/${tx.hash}`);

  console.log("\n=== Post-deploy checklist ===");
  console.log(`1. Add to src/lib/blockchain/chains.ts:`);
  console.log(`   ${networkName}: { contractAddress: "${address}", spawnFee: "${fees.spawn}", ... }`);
  console.log(`2. Add to backend CHAIN_CONFIGS (config.py)`);
  console.log(`3. Test: spawn agent on ${networkName} via frontend`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
