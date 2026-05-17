import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MNT");

  if (balance === 0n) {
    throw new Error("Deployer has no MNT. Get testnet MNT from https://faucet.sepolia.mantle.xyz");
  }

  console.log("\nDeploying MAEFDynamicNFTV4 (V4 master contract)...");
  const MAEF = await ethers.getContractFactory("MAEFDynamicNFTV4");
  const maef = await MAEF.deploy();
  await maef.waitForDeployment();

  const address = await maef.getAddress();
  console.log("SUCCESS: MAEFDynamicNFTV4 deployed to:", address);
  console.log("   Explorer:", `https://explorer.sepolia.mantle.xyz/address/${address}`);

  const agentWallet = process.env.AGENT_WALLET_ADDRESS;
  if (agentWallet && ethers.isAddress(agentWallet)) {
    const tx = await maef.grantMinterRole(agentWallet);
    await tx.wait();
    console.log("SUCCESS: MINTER_ROLE granted to agent wallet:", agentWallet);
  }

  console.log("\n=== Next steps ===");
  console.log(`1. Update VITE_NFT_CONTRACT_ADDRESS in frontend .env:`);
  console.log(`   VITE_NFT_CONTRACT_ADDRESS_SEPOLIA=${address}`);
  console.log(`2. Update Cloud Run CONTRACT_ADDRESS env var to: ${address}`);
  console.log(`3. Grant MINTER_ROLE to backend minter wallet on the new contract.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
