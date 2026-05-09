const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MNT");

  if (balance === 0n) {
    throw new Error("Deployer has no MNT. Get testnet MNT from https://faucet.sepolia.mantle.xyz");
  }

  console.log("\nDeploying MAEFDynamicNFT (ERC721A)...");
  const MAEF = await ethers.getContractFactory("MAEFDynamicNFT");
  const maef = await MAEF.deploy();
  await maef.waitForDeployment();

  const address = await maef.getAddress();
  console.log("✅ MAEFDynamicNFT deployed to:", address);
  console.log("   Explorer:", `https://explorer.sepolia.mantle.xyz/address/${address}`);

  // If AGENT_WALLET is set, grant it MINTER_ROLE so backend can mint autonomously
  const agentWallet = process.env.AGENT_WALLET_ADDRESS;
  if (agentWallet && ethers.isAddress(agentWallet)) {
    const MINTER_ROLE = await maef.MINTER_ROLE();
    const tx = await maef.grantMinterRole(agentWallet);
    await tx.wait();
    console.log("✅ MINTER_ROLE granted to agent wallet:", agentWallet);
  }

  console.log("\n📋 Next step: update src/lib/blockchain/config.ts");
  console.log(`   CONTRACT_ADDRESSES.sepolia.MAEF_NFT = '${address}'`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
