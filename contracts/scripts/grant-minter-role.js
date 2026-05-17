/**
 * Grant MINTER_ROLE on deployed V4 contract to the dedicated backend minter wallet.
 *
 * Usage:
 *   MINTER_WALLET=0x... npx hardhat run scripts/grant-minter-role.js --network mantleSepolia
 *
 * Requires DEPLOYER_PRIVATE_KEY in contracts/.env (deployer has DEFAULT_ADMIN_ROLE).
 */

import { network } from "hardhat";

const CONTRACT_ADDRESS = "0x66fD8b5411856D42c08D9356e879a6e7dF0c9419"; // V4

const ABI = [
  "function grantMinterRole(address minter) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
];

async function main() {
  const { ethers } = await network.create();

  const minterWallet = process.env.MINTER_WALLET;
  if (!minterWallet || !ethers.isAddress(minterWallet)) {
    throw new Error("Set MINTER_WALLET=0x<address> env var before running.");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Network      :", network.name);
  console.log("Deployer     :", deployer.address);
  console.log("Contract     :", CONTRACT_ADDRESS);
  console.log("Minter target:", minterWallet);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, deployer);

  const MINTER_ROLE = await contract.MINTER_ROLE();
  const alreadyGranted = await contract.hasRole(MINTER_ROLE, minterWallet);

  if (alreadyGranted) {
    console.log("\nMINTER_ROLE already granted — nothing to do.");
    return;
  }

  const tx = await contract.grantMinterRole(minterWallet);
  console.log("\nTx sent:", tx.hash);
  await tx.wait();
  console.log("SUCCESS: MINTER_ROLE granted to", minterWallet);
  console.log("Explorer:", `https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
