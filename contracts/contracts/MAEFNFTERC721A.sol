// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title MAEF Dynamic NFT Contract (ERC-721A)
 * @dev Gas-optimized Proof-of-Attendance NFT with dynamic metadata
 * ERC-721A provides 60%+ gas savings on batch mints
 * NFT metadata evolves as agents level up
 */
contract MAEFDynamicNFT is ERC721A, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    using Strings for uint256;

    error UnauthorizedMinter(address caller);
    error RegisteredAgentCanOnlyMintForSelf(address caller, address recipient);

    // Gas provisioning constants
    uint256 public constant SPAWN_FEE = 1 ether;  // 1 MNT to spawn agent
    uint256 public constant AGENT_PROVISION = 0.5 ether;  // 0.5 MNT given to agent
    uint256 public constant PLATFORM_FEE = 0.5 ether;  // 0.5 MNT to platform

    mapping(address => bool) public isAgentSpawned;

    struct EventAttendance {
        string eventTitle;
        string eventUrl;
        string platform;
        string agentName;
        address agentAddress;
        string summary;
        uint256 timestamp;
        uint256 agentLevel;
        string niche;
    }

    struct AgentStats {
        uint256 totalEvents;
        uint256 currentLevel;
        uint256 totalGasSpent;
        bool wisdomUnlocked;
        uint256 lastEventTimestamp;
    }

    mapping(uint256 => EventAttendance) public tokenIdToEvent;
    mapping(address => uint256[]) public agentToTokenIds;
    mapping(address => AgentStats) public agentStats;
    
    string public baseMetadataURI;
    string public wisdomBadgeURI;
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed agentWallet,
        string eventTitle,
        string agentName,
        uint256 agentLevel,
        uint256 timestamp
    );

    event AgentLevelUp(
        address indexed agentWallet,
        uint256 newLevel,
        uint256 totalEvents
    );

    event WisdomUnlocked(
        address indexed agentWallet,
        uint256 timestamp
    );

    event AgentSpawned(
        address indexed agentWallet,
        address indexed spawner,
        uint256 provisionAmount,
        uint256 timestamp
    );

    constructor() ERC721A("MAEF Dynamic Proof of Attendance", "MAEF-DPOA") Ownable(msg.sender) {
        baseMetadataURI = "https://ipfs.io/ipfs/";
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Spawns a new agent with gas provisioning
     * User pays 1 MNT: 0.5 MNT goes to agent wallet, 0.5 MNT to platform
     * This gives the agent economic autonomy to pay its own gas fees
     */
    function spawnAgent(address agentWallet) external payable {
        require(msg.value >= SPAWN_FEE, "Insufficient spawn fee: 1 MNT required");
        require(agentWallet != address(0), "Invalid agent wallet address");
        require(!isAgentSpawned[agentWallet], "Agent already spawned");

        // Mark agent as spawned
        isAgentSpawned[agentWallet] = true;

        // Transfer 0.5 MNT to agent's wallet (gas provision)
        (bool success, ) = agentWallet.call{value: AGENT_PROVISION}("");
        require(success, "Gas provision transfer failed");

        // Remaining 0.5 MNT stays in contract (platform fee)
        // Owner can withdraw via withdrawPlatformFees()

        emit AgentSpawned(agentWallet, msg.sender, AGENT_PROVISION, block.timestamp);
    }

    /**
     * @dev Allows owner to withdraw accumulated platform fees
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Check if agent has been spawned and funded
     */
    function isAgentActive(address agentWallet) external view returns (bool) {
        return isAgentSpawned[agentWallet] && agentWallet.balance > 0;
    }

    function grantMinterRole(address minter) external onlyOwner {
        _grantRole(MINTER_ROLE, minter);
    }

    function revokeMinterRole(address minter) external onlyOwner {
        _revokeRole(MINTER_ROLE, minter);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721A, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Mint authorization for True Mode B:
     * 1) Admin fallback wallets with MINTER_ROLE are always allowed.
     * 2) Spawned agents can mint only to their own wallet.
     */
    function _enforceMintAuth(address recipient) internal view {
        bool isAdminMinter = hasRole(MINTER_ROLE, msg.sender);
        bool isRegisteredAgent = isAgentSpawned[msg.sender];

        if (!isAdminMinter && !isRegisteredAgent) {
            revert UnauthorizedMinter(msg.sender);
        }

        if (!isAdminMinter && msg.sender != recipient) {
            revert RegisteredAgentCanOnlyMintForSelf(msg.sender, recipient);
        }
    }

    /**
     * @dev Mints a new Proof-of-Attendance NFT with dynamic metadata
     * Gas optimized for batch operations
     */
    function mintAttendanceNFT(
        address agentWallet,
        string memory eventTitle,
        string memory eventUrl,
        string memory platform,
        string memory agentName,
        string memory summary,
        string memory niche
    ) public returns (uint256) {
        _enforceMintAuth(agentWallet);

        uint256 tokenId = _nextTokenId();
        
        agentStats[agentWallet].totalEvents++;
        agentStats[agentWallet].lastEventTimestamp = block.timestamp;
        
        uint256 newLevel = (agentStats[agentWallet].totalEvents / 2) + 1;
        if (newLevel > agentStats[agentWallet].currentLevel) {
            agentStats[agentWallet].currentLevel = newLevel;
            emit AgentLevelUp(agentWallet, newLevel, agentStats[agentWallet].totalEvents);
        }
        
        if (agentStats[agentWallet].totalEvents >= 5 && !agentStats[agentWallet].wisdomUnlocked) {
            agentStats[agentWallet].wisdomUnlocked = true;
            emit WisdomUnlocked(agentWallet, block.timestamp);
        }

        _safeMint(agentWallet, 1);

        tokenIdToEvent[tokenId] = EventAttendance({
            eventTitle: eventTitle,
            eventUrl: eventUrl,
            platform: platform,
            agentName: agentName,
            agentAddress: agentWallet,
            summary: summary,
            timestamp: block.timestamp,
            agentLevel: agentStats[agentWallet].currentLevel,
            niche: niche
        });

        agentToTokenIds[agentWallet].push(tokenId);

        emit NFTMinted(
            tokenId, 
            agentWallet, 
            eventTitle, 
            agentName, 
            agentStats[agentWallet].currentLevel,
            block.timestamp
        );

        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs with significant gas savings (60%+ vs standard ERC-721)
     * Perfect for agents attending multiple events
     */
    function batchMintAttendanceNFTs(
        address agentWallet,
        string[] memory eventTitles,
        string[] memory eventUrls,
        string[] memory platforms,
        string memory agentName,
        string[] memory summaries,
        string memory niche
    ) public returns (uint256[] memory) {
        _enforceMintAuth(agentWallet);

        require(eventTitles.length == eventUrls.length, "Array length mismatch");
        require(eventTitles.length == platforms.length, "Array length mismatch");
        require(eventTitles.length == summaries.length, "Array length mismatch");
        
        uint256 quantity = eventTitles.length;
        uint256 startTokenId = _nextTokenId();
        
        _safeMint(agentWallet, quantity);
        
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = startTokenId + i;
            tokenIds[i] = tokenId;
            
            agentStats[agentWallet].totalEvents++;
            agentStats[agentWallet].lastEventTimestamp = block.timestamp;
            
            uint256 newLevel = (agentStats[agentWallet].totalEvents / 2) + 1;
            if (newLevel > agentStats[agentWallet].currentLevel) {
                agentStats[agentWallet].currentLevel = newLevel;
                emit AgentLevelUp(agentWallet, newLevel, agentStats[agentWallet].totalEvents);
            }
            
            if (agentStats[agentWallet].totalEvents >= 5 && !agentStats[agentWallet].wisdomUnlocked) {
                agentStats[agentWallet].wisdomUnlocked = true;
                emit WisdomUnlocked(agentWallet, block.timestamp);
            }

            tokenIdToEvent[tokenId] = EventAttendance({
                eventTitle: eventTitles[i],
                eventUrl: eventUrls[i],
                platform: platforms[i],
                agentName: agentName,
                agentAddress: agentWallet,
                summary: summaries[i],
                timestamp: block.timestamp,
                agentLevel: agentStats[agentWallet].currentLevel,
                niche: niche
            });

            agentToTokenIds[agentWallet].push(tokenId);

            emit NFTMinted(
                tokenId, 
                agentWallet, 
                eventTitles[i], 
                agentName,
                agentStats[agentWallet].currentLevel,
                block.timestamp
            );
        }
        
        return tokenIds;
    }

    /**
     * @dev Returns dynamic metadata URI that changes based on agent level
     * Higher level agents get enhanced visual NFTs
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        EventAttendance memory attendance = tokenIdToEvent[tokenId];
        AgentStats memory stats = agentStats[attendance.agentAddress];
        
        if (stats.wisdomUnlocked && bytes(wisdomBadgeURI).length > 0) {
            return string(abi.encodePacked(wisdomBadgeURI, "/", tokenId.toString(), "-wisdom.json"));
        }
        
        if (stats.currentLevel >= 5) {
            return string(abi.encodePacked(baseMetadataURI, "/elite/", tokenId.toString(), ".json"));
        } else if (stats.currentLevel >= 3) {
            return string(abi.encodePacked(baseMetadataURI, "/advanced/", tokenId.toString(), ".json"));
        } else {
            return string(abi.encodePacked(baseMetadataURI, "/standard/", tokenId.toString(), ".json"));
        }
    }

    /**
     * @dev Gets all token IDs owned by an agent wallet
     */
    function getAgentTokenIds(address agentWallet) public view returns (uint256[] memory) {
        return agentToTokenIds[agentWallet];
    }

    /**
     * @dev Gets the event details for a specific token including dynamic level
     */
    function getEventDetails(uint256 tokenId) public view returns (EventAttendance memory) {
        require(_exists(tokenId), "Token does not exist");
        return tokenIdToEvent[tokenId];
    }

    /**
     * @dev Gets agent statistics including level and wisdom status
     */
    function getAgentStats(address agentWallet) public view returns (AgentStats memory) {
        return agentStats[agentWallet];
    }

    /**
     * @dev Gets the total number of NFTs minted
     */
    function getTotalMinted() public view returns (uint256) {
        return _nextTokenId() - _startTokenId();
    }

    /**
     * @dev Updates base metadata URI for dynamic NFT evolution
     */
    function setBaseMetadataURI(string memory newBaseURI) public onlyOwner {
        baseMetadataURI = newBaseURI;
    }

    /**
     * @dev Sets special URI for wisdom-unlocked NFTs
     */
    function setWisdomBadgeURI(string memory newWisdomURI) public onlyOwner {
        wisdomBadgeURI = newWisdomURI;
    }

    /**
     * @dev Records gas spent by agent (called after transaction)
     */
    function recordGasSpent(address agentWallet, uint256 gasAmount) public onlyRole(MINTER_ROLE) {
        agentStats[agentWallet].totalGasSpent += gasAmount;
    }
}
