//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./openzeppelin/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol"; // TODO: remove this - not used
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./utils/TransferFeeERC721.sol";
import "./ILandNFT.sol";

contract LandNFT is ILandNFT, Initializable, TransferFeeERC721, OwnableUpgradeable, PausableUpgradeable {
  using Counters for Counters.Counter;

  Counters.Counter tokenIds;

  bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  string public baseURI;

  function initialize(address payable transferFeeAddress) public initializer {
    // initializes TransferFeeERC721
    __TransferFeeERC721_init(ADMIN_ROLE, transferFeeAddress, "Unit trade land", "UTL");

    // setup this contract roles
    _setupRole(ADMIN_ROLE, msg.sender);
    _setupRole(MINTER_ROLE, msg.sender);
    _setupRole(PAUSER_ROLE, msg.sender);

    // set new 'admin' role in order to manage other roles
    _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
    _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
  }

  /**
    * @dev Triggers stopped state.
    *
    * Requirements:
    *
    * - the contract must not be paused.
    * - the caller must have the 'pauser' role.
    */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
    * @dev Returns to normal state.
    *
    * Requirements:
    *
    * - the contract must be paused.
    * - the caller must have the 'pauser' role.
    */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev Base URI for computing {tokenURI}. The resulting URI for each
   * token will be the concatenation of the `baseURI` and the `tokenId`.
   */
  function _baseURI() internal view virtual override returns (string memory) {
      return baseURI;
  }

  /**
    * @dev Change `baseURI`.
    *
    * Requirements:
    *
    * - the caller must have the 'minter' role.
    */
  function setBaseURI(string memory baseTokenURI) public onlyRole(MINTER_ROLE) {
    baseURI = baseTokenURI;
  }

  /**
    * @dev Mints one land from a `city` for a specific `owner`.
    *
    * Requirements:
    *
    * - the contract must not be paused.
    * - the caller must have the 'minter' role.
    */
  function redeem(address owner, uint city) public whenNotPaused onlyRole(MINTER_ROLE) returns (uint256)  {
    return mint(owner, city);
  }

  /**
    * @dev Mints certain `amount` of lands from a `city` for a specific `owner`.
    *
    * Requirements:
    *
    * - the contract must not be paused.
    * - the caller must have the 'minter' role.
    *
    * NOTE: used by LandSeller contract to deliver lands.
    */
  function redeemMany(uint256 amount, address owner, uint city) public whenNotPaused onlyRole(MINTER_ROLE) returns (uint256[] memory) {
    uint256[] memory _tokenIds = new uint256[](amount);

    for (uint256 i = 0; i < amount; i++) {
      _tokenIds[i] = mint(owner, city);
    }

    return _tokenIds;
  }

  function mint(address owner, uint city) internal returns (uint256) {
    tokenIds.increment();
    uint256 tokenId = tokenIds.current();

    _mint(owner, tokenId);

    emit NewLand(
      city,
      tokenId,
      owner
    );

    return tokenId;
  }

  /**
    * @dev Set land transfer fee.
    *
    * Requirements:
    *
    * - the caller must have the 'minter' role.
    */
  function setTransferFee(uint256 fee) public override onlyRole(MINTER_ROLE) {
    require(hasRole(MINTER_ROLE, msg.sender), "Signature invalid or unauthorized");
    _setTransferFee(fee);
  }

  /**
    * @dev Enable ADMIN_ROLE to be admin of itself.
    *
    * Requirements:
    *
    * - The caller must an admin.
    */
  function fixAdminRole() public onlyRole(ADMIN_ROLE) {
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
  }
}
