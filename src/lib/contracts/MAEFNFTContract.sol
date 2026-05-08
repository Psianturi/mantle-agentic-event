// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MAEF NFT Contract
 * @dev Proof-of-Attendance NFT contract for Mantle Agentic Event Factory
 * Each NFT represents an agent's attendance at a digital event
 */
contract MAEFNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct EventAttendance {
        string eventTitle;
        string eventUrl;
        string platform;
        string agentName;
        string agentAddress;
        string summary;
        uint256 timestamp;
    }

    mapping(uint256 => EventAttendance) public tokenIdToEvent;
    mapping(address => uint256[]) public agentToTokenIds;
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed agentWallet,
        string eventTitle,
        string agentName,
        uint256 timestamp
    );

    constructor() ERC721("MAEF Proof of Attendance", "MAEF-POA") Ownable(msg.sender) {}

    /**
     * @dev Mints a new Proof-of-Attendance NFT
     * @param agentWallet The wallet address of the agent
     * @param eventTitle The title of the event attended
     * @param eventUrl The URL of the event
     * @param platform The platform where the event was held
     * @param agentName The name of the agent
     * @param summary AI-generated summary of the event
     * @param metadataURI IPFS URI containing the NFT metadata
     * @return The token ID of the newly minted NFT
     */
    function mintAttendanceNFT(
        address agentWallet,
        string memory eventTitle,
        string memory eventUrl,
        string memory platform,
        string memory agentName,
        string memory summary,
        string memory metadataURI
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(agentWallet, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        tokenIdToEvent[newTokenId] = EventAttendance({
            eventTitle: eventTitle,
            eventUrl: eventUrl,
            platform: platform,
            agentName: agentName,
            agentAddress: addressToString(agentWallet),
            summary: summary,
            timestamp: block.timestamp
        });

        agentToTokenIds[agentWallet].push(newTokenId);

        emit NFTMinted(newTokenId, agentWallet, eventTitle, agentName, block.timestamp);

        return newTokenId;
    }

    /**
     * @dev Gets all token IDs owned by an agent wallet
     * @param agentWallet The wallet address of the agent
     * @return Array of token IDs
     */
    function getAgentTokenIds(address agentWallet) public view returns (uint256[] memory) {
        return agentToTokenIds[agentWallet];
    }

    /**
     * @dev Gets the event details for a specific token
     * @param tokenId The token ID to query
     * @return EventAttendance struct containing event details
     */
    function getEventDetails(uint256 tokenId) public view returns (EventAttendance memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenIdToEvent[tokenId];
    }

    /**
     * @dev Gets the total number of NFTs minted
     * @return The current token count
     */
    function getTotalMinted() public view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @dev Helper function to convert address to string
     */
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
