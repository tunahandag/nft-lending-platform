// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract MockNFT is ERC721 {
    using Strings for uint256;

    string public baseURI;

    constructor(string memory _name, string memory _symbol, string memory _baseUri) ERC721(_name, _symbol) {
        baseURI = _baseUri;
    }


    function mint(address _to, uint256 tokenId) external {
        _mint(_to, tokenId);
    }

	/**
	 * Return baseURI
	 * @return baseTokenURI baseTokenURI of the contract at the moment
	 */
	function _baseURI() internal view virtual override returns (string memory) {
		return baseURI;
	}

    /**
	 * @dev tokenURI returns the uri to metadata
	 * @param tokenId tokenId
	 * @return tokenURI for given tokenId if exists
	 */

	function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return bytes(_baseURI()).length > 0 ? string.concat(baseURI, tokenId.toString(), ".json") : "";
	}

}