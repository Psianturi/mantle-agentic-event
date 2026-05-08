# MAEF Blockchain Integration Guide

## Overview

This application now includes full Mantle Network blockchain integration for minting Proof-of-Attendance NFTs on-chain. The integration supports both testnet (Mantle Sepolia) and mainnet deployments.

## Architecture

### Smart Contract
- **Location**: `src/lib/contracts/MAEFNFTContract.sol`
- **Type**: ERC-721 NFT contract
- **Features**:
  - Mints Proof-of-Attendance NFTs
  - Stores event metadata on-chain
  - Tracks agent attendance history
  - IPFS metadata support

### Blockchain Service
- **Location**: `src/lib/blockchain/mantleService.ts`
- **Features**:
  - Wallet connection (MetaMask/WalletConnect)
  - Automatic network switching to Mantle
  - NFT minting with gas estimation
  - Transaction monitoring
  - Balance tracking

### React Hook
- **Location**: `src/hooks/useBlockchain.ts`
- **Purpose**: Provides React components with blockchain state and functions

## Setup Instructions

### 1. Deploy the Smart Contract

#### Using Hardhat

```bash
# Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Create Hardhat config
npx hardhat init

# Update hardhat.config.ts with Mantle networks:
```

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    mantleSepolia: {
      url: "https://rpc.sepolia.mantle.xyz",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 5003
    },
    mantleMainnet: {
      url: "https://rpc.mantle.xyz",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 5000
    }
  },
  etherscan: {
    apiKey: {
      mantleSepolia: process.env.MANTLE_API_KEY || "",
      mantleMainnet: process.env.MANTLE_API_KEY || ""
    },
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.sepolia.mantle.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz"
        }
      },
      {
        network: "mantleMainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz"
        }
      }
    ]
  }
};

export default config;
```

#### Deploy Script

Create `scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MAEF NFT Contract...");

  const MAEFNFTContract = await ethers.getContractFactory("MAEFNFT");
  const contract = await MAEFNFTContract.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`MAEF NFT Contract deployed to: ${address}`);
  console.log(`Update CONTRACT_ADDRESSES in src/lib/blockchain/config.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

#### Deploy to Mantle Sepolia Testnet

```bash
# Set your private key
export PRIVATE_KEY="your_private_key_here"

# Deploy
npx hardhat run scripts/deploy.ts --network mantleSepolia

# Verify contract (optional)
npx hardhat verify --network mantleSepolia DEPLOYED_CONTRACT_ADDRESS
```

### 2. Update Configuration

After deploying the contract, update `src/lib/blockchain/config.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  mainnet: {
    MAEF_NFT: '0xYourMainnetContractAddress'
  },
  testnet: {
    MAEF_NFT: '0xYourTestnetContractAddress'
  },
  sepolia: {
    MAEF_NFT: '0xYourSepoliaContractAddress'  // <- Update this
  }
}
```

### 3. Get Test MNT Tokens

To test on Mantle Sepolia:
1. Visit [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/)
2. Enter your wallet address
3. Request test MNT tokens

## How It Works

### 1. Wallet Connection

```typescript
// User clicks "Connect Wallet"
const { connectWallet } = useBlockchain()
const address = await connectWallet()

// Automatically:
// - Prompts MetaMask connection
// - Switches to Mantle Network
// - Fetches wallet balance
```

### 2. Event Attendance & NFT Minting

```typescript
// When user attends an event
const result = await blockchain.mintNFT({
  agentWallet: agent.walletAddress,
  eventTitle: "DeFi Summit 2026",
  eventUrl: "https://luma.com/event-url",
  platform: "Luma",
  agentName: "Alpha Genesis",
  summary: "AI-generated event summary..."
})

// Returns:
// - success: boolean
// - tokenId: string
// - transactionHash: string
// - gasUsed: string (in MNT)
```

### 3. Transaction Verification

Users can verify their NFT mints on Mantle Explorer:
- Transaction links are provided in toast notifications
- NFT cards show transaction hashes
- Click "View on Explorer" to see on-chain data

## Mock Mode

If no contract address is configured (`0x0000...`), the app runs in **mock mode**:
- Simulates blockchain interactions
- Generates fake transaction hashes
- No actual on-chain transactions
- Perfect for development/testing without deploying

## Gas Optimization

The contract and service include several gas optimizations:
- Efficient storage patterns
- Batch operations support
- Gas estimation before minting
- Configurable gas limits

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Environment Variables**: Use `.env` for sensitive data
3. **Contract Verification**: Always verify contracts on Mantle Explorer
4. **Access Control**: Contract uses Ownable pattern for admin functions
5. **Input Validation**: All user inputs are validated before submission

## Testing

### Local Testing
```bash
# Run Hardhat tests
npx hardhat test

# Test on local network
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

### Integration Testing
1. Connect wallet to Mantle Sepolia
2. Create an agent
3. Enter any event URL
4. Click "Attend Event"
5. Approve the transaction in MetaMask
6. Wait for confirmation
7. View NFT in "NFT Vault" tab

## Troubleshooting

### "Wallet not found"
- Install MetaMask or compatible Web3 wallet
- Refresh the page

### "Failed to switch network"
- Manually add Mantle Network to MetaMask
- Use the network details from `config.ts`

### "Insufficient funds"
- Get test MNT from the faucet
- Check your wallet balance

### "Transaction failed"
- Check gas limits in `config.ts`
- Ensure contract is deployed correctly
- Verify network connection

## Production Deployment

Before deploying to Mantle Mainnet:

1. ✅ Thoroughly test on Sepolia testnet
2. ✅ Audit the smart contract
3. ✅ Set up monitoring and alerts
4. ✅ Configure production RPC endpoints
5. ✅ Update `DEFAULT_NETWORK` in config.ts
6. ✅ Test wallet connections on mainnet
7. ✅ Prepare for higher gas costs

## Resources

- [Mantle Documentation](https://docs.mantle.xyz/)
- [Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz/)
- [Mantle Mainnet Explorer](https://explorer.mantle.xyz/)
- [Mantle Faucet](https://faucet.sepolia.mantle.xyz/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)

## Support

For issues related to:
- **Smart Contract**: Check the Solidity code in `src/lib/contracts/`
- **Blockchain Service**: Review `src/lib/blockchain/mantleService.ts`
- **React Integration**: See `src/hooks/useBlockchain.ts`
- **Mantle Network**: Visit [Mantle Discord](https://discord.gg/mantle)
