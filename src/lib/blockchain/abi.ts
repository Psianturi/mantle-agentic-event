export const MAEF_NFT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "agentWallet",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "eventTitle",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "agentName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "NFTMinted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "agentWallet",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "eventTitle",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "eventUrl",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "platform",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "agentName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "summary",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      }
    ],
    "name": "mintAttendanceNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "agentWallet",
        "type": "address"
      }
    ],
    "name": "getAgentTokenIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getEventDetails",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "eventTitle",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "eventUrl",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "platform",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "agentName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "agentAddress",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "summary",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct MAEFNFT.EventAttendance",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalMinted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const
