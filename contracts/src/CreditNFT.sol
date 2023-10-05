// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract CreditNFT is ERC721 {
    uint256 public id = 0;
    constructor() ERC721("CreditNFT", "CREDIT") {}

    struct Score {
        uint256 score;
        uint256 timestamp;
        uint256 chainID;
    }
    mapping(uint256 tokenID => Score score) public scores;

    event CreditScoreUpdated(address indexed user, uint256 indexed tokenID, Score score);

    function create(uint256 score) external {
        id += 1;
        _safeMint(msg.sender, id);
        scores[id] = Score(score, block.timestamp, block.chainid);
        emit CreditScoreUpdated(msg.sender, id, scores[id]);
    }

    function get(uint256 tokenID) external view returns (address, uint256, uint256, uint256) {
        return (ownerOf(tokenID), scores[tokenID].score, scores[tokenID].timestamp, scores[tokenID].chainID);
    }
}
