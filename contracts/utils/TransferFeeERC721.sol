// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../openzeppelin/ERC721Upgradeable.sol";
import "./ITransferFeeERC721.sol";

abstract contract TransferFeeERC721 is Initializable, ITransferFeeERC721, ERC721Upgradeable, AccessControlUpgradeable {
  address payable private transferFeeAddress;
  uint256 private transferFee;
  
  bytes32 private constant FREE_TRANSFER_ROLE = keccak256("FREE_TRANSFER_ROLE");

  /**
    * @dev Initializes the contract with the 'transfer fee' destinatary address and registers this contract as ERC721.
    */
  function __TransferFeeERC721_init(bytes32 ADMIN_ROLE, address payable _transferFeeAddress, string memory name_erc721, string memory symbol_erc721) internal initializer {
    __TransferFeeERC721_init_unchained(ADMIN_ROLE, _transferFeeAddress);
    __ERC721_init(name_erc721, symbol_erc721);
  }

  function __TransferFeeERC721_init_unchained(bytes32 ADMIN_ROLE, address payable _transferFeeAddress) internal initializer {
    transferFeeAddress = _transferFeeAddress;

    // setup this contract roles
    _setupRole(FREE_TRANSFER_ROLE, msg.sender);
    // set new 'admin' role in order to manage other roles
    _setRoleAdmin(FREE_TRANSFER_ROLE, ADMIN_ROLE);
  }
  
  /**
    * @dev See {IERC165-supportsInterface}.
    */
  function supportsInterface(bytes4 interfaceId) public view virtual override (AccessControlUpgradeable, ERC721Upgradeable) returns (bool) {
    return ERC721Upgradeable.supportsInterface(interfaceId) || AccessControlUpgradeable.supportsInterface(interfaceId);
  }

  function getTransferFee() public view returns (uint256) {
    return transferFee;
  }

  /**
    * @dev The setTransferFee function needs to be implemented.
    */
  function setTransferFee(uint256 fee) public virtual {
    require(false, "TransferFee: setTransferFee should be override");
    _setTransferFee(fee);
  }

  function _setTransferFee(uint256 fee) internal {
    transferFee = fee;
    emit NewTransferFee(fee);
  }

  /**
    * @dev See {IERC721-transferFrom}.
    *
    * Requirements:
    *
    * - should comply with required fee.
    */
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override payable requireFee {
    require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");

    _transfer(from, to, tokenId);
  }

  /**
    * @dev See {IERC721-safeTransferFrom}.
    *
    * Requirements:
    *
    * - should comply with required fee.
    */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public virtual override payable requireFee {
    safeTransferFrom(from, to, tokenId, "");
  }

  /**
    * @dev See {IERC721-safeTransferFrom}.
    *
    * Requirements:
    *
    * - should comply with required fee.
    */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory _data
  ) public virtual override payable requireFee {
    require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
    _safeTransfer(from, to, tokenId, _data);
  }

  /**
    * @dev Collect fee in msg.
    */
  function collectFee() internal {
    if (msg.value > 0)
      transferFeeAddress.transfer(msg.value);
  }

  /**
    * @dev Modifier to make transfers possible if fee value is sended or sender has 'free transfer' role.
    */
  modifier requireFee() {
    if (msg.value == transferFee) {
      _;
      collectFee();
    } else {
      require(hasRole(FREE_TRANSFER_ROLE, msg.sender), "Transfer fee is required in order to transfer");
      _;
    }
  }
  // https://forum.openzeppelin.com/t/what-exactly-is-the-reason-for-uint256-50-private-gap/798
  uint256[50] private __gap;
}
