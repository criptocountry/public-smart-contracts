// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "../openzeppelin/IERC721Upgradeable.sol";

interface ITransferFeeERC721 {
  /**
    * @dev Emitted when fee changes.
    */
  event NewTransferFee(uint256 fee);

  function getTransferFee() external view returns (uint256);

  function setTransferFee(uint256 fee) external;
}
