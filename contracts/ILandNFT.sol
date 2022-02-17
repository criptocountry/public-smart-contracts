//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ILandNFT {
  /**
    * @dev Emitted when a land is minted.
    */
  event NewLand(
    uint indexed city,
    uint256 indexed tokenId,
    address indexed owner
  );

  function initialize(address payable transferFeeAddress) external;

  function pause() external;

  function unpause() external;

  function setBaseURI(string memory baseTokenURI) external;

  function redeem(address owner, uint city) external returns (uint256);

  function redeemMany(uint256 amount, address owner, uint city) external returns (uint256[] memory);
}
