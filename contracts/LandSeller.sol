// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./ILandNFT.sol";

contract LandSeller is Initializable, OwnableUpgradeable, PausableUpgradeable, AccessControlUpgradeable {
  bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  // pending withdrawal of BNB
  address payable private banker;
  uint256 private pendingBanker;

  ILandNFT private landNFT;

  uint256[] private limit;
  uint256[] private sold;
  uint256[] private price;

  mapping (IERC20 => uint256[]) private priceERC20;

  /**
    * @dev Emitted when lands are sold.
    */
  event LandSold(
    uint8 amount,
    uint8 city,
    uint256[] tokenIds,
    address owner,
    uint32 referralCode,
    uint256 exchangeAmount,
    address exchange
  );

  /**
  * @dev Emitted when `limit` changes.
  */
  event NewLimit(uint256[] limit);

  /**
  * @dev Emitted when `sold` changes.
  */
  event NewSold(uint256[] sold);

  /**
  * @dev Emitted when `price` in ether changes.
  */
  event NewPriceEther(uint256[] price);

  /**
  * @dev Emitted when `price` in a specific `token` changes.
  */
  event NewPriceToken(IERC20 token, uint256[] price);

  function initialize(ILandNFT _landNFT, address payable _banker) public initializer {
    __Ownable_init();
    transferOwnership(msg.sender);
    landNFT = _landNFT;
    banker = _banker;

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
    * @dev Changes the buy `limit` of lands for each city.
    *
    * Requirements:
    *
    * - the caller must have the 'minter' role.
    */
  function setLimits(uint256[] memory _limit) public onlyRole(MINTER_ROLE) {
    limit = _limit;
    emit NewLimit(_limit);
  }

  /**
    * @dev Changes the `price` of lands for each city.
    *
    * Requirements:
    *
    * - the caller must have the 'minter' role.
    */
  function setPrice(uint256[] memory _price) public onlyRole(MINTER_ROLE) {
    price = _price;
    emit NewPriceEther(_price);
  }

  /**
    * @dev Changes the `price` of lands for each city.
    *
    * Requirements:
    *
    * - the caller must have the 'minter' role.
    */
  function setPrice(IERC20 token, uint256[] memory _price) public onlyRole(MINTER_ROLE) {
    priceERC20[token] = _price;
    emit NewPriceToken(token, _price);
  }

  /**
    * @dev Changes how many lands were `sold` for each city.
    *
    * NOTE: this is mostly used in order to add sales outside blockchain.
    *
    * Requirements:
    *
    * - the caller must have the 'minter' role.
    */
  function setSold(uint256[] memory _sold) public onlyRole(MINTER_ROLE) {
    sold = _sold;
    emit NewSold(_sold);
  }

  /**
    * @dev Returns the buy `limit` for a specific `city`.
    */
  function getLimit(uint8 city) public view returns(uint256) {
    return limit[city - 1];
  }
  
  /**
    * @dev Returns the land `price` in ether for a specific `city`.
    */
  function getPrice(uint8 city) public view returns(uint256) {
    return price[city - 1];
  }

  /**
    * @dev Returns the land `price` in `token` for a specific `city`.
    */
  function getPrice(IERC20 token, uint8 city) public view returns(uint256) {
    return priceERC20[token][city - 1];
  }

  /**
    * @dev Returns how many land were `sold` for a specific `city`.
    */
  function getSold(uint8 city) public view returns(uint256) {
    return sold[city - 1];
  }

  /**
    * @dev Returns how many land are available for a specific `city`.
    */
  function getAvailable(uint8 city) public view returns(uint256) {
    return limit[city - 1] - sold[city - 1];
  }

  /**
    * @dev Changes the `banker` address.
    */
  function setBanker(address payable newBanker) public onlyOwner {
    banker = newBanker;
  }

  /**
    * @dev Buys a certain `amount` of lands in a `city` and mints it.
    * `Referral code` is used internally to pay commissions.
    *
    * Requirements:
    *
    * - the contract must not be paused.
    * - the caller must send the land price value for that `city` based on desired `amount`.
    * - `amount` should be less than or equals 40.
    * - `amount` of lands to buy should be available.
    */
  function buy(uint8 amount, uint8 city, uint32 referralCode) public payable whenNotPaused returns (uint256[] memory) {
    require(msg.value > 0 && msg.value == (price[city - 1] * amount), "Price does not match");
    require(amount <= 40, "Buy limit exceeded");
    require(amount <= getAvailable(city), "Not enough lands on sale");
    // block other transactions if limit is reached
    sold[city - 1] += amount;
    // mints lands for sender
    uint256[] memory tokenIds = landNFT.redeemMany(amount, msg.sender, city);
    // add ether to pending
    pendingBanker += msg.value;

    emit LandSold(
      amount,
      city,
      tokenIds,
      msg.sender,
      referralCode,
      msg.value,
      address(0)
    );

    return tokenIds;
  }

  /**
    * @dev Buys a certain `amount` of lands in a `city` and mints it paying in `token`.
    * `Referral code` is used internally to pay commissions.
    *
    * Requirements:
    *
    * - the contract must not be paused.
    * - the caller must send the land price value for that `city` based on desired `amount`.
    * - `amount` should be less than or equals 40.
    * - `amount` of lands to buy should be available.
    * - sender should allow LandSeller contract to use the total price of desired `token` in order to buy lands.
    */
  function buy(IERC20 token, uint8 amount, uint8 city, uint32 referralCode) public whenNotPaused returns (uint256[] memory) {
    require(amount <= 40, "Buy limit exceeded");
    require(amount <= getAvailable(city), "Not enough lands on sale");
    require(priceERC20[token][city - 1] > 0, "Price should be greater than zero");

    // block other transactions if limit is reached
    sold[city - 1] += amount;

    uint256[] memory tokenIds = landNFT.redeemMany(amount, msg.sender, city);

    uint256 totalPrice = getPrice(token, city) * amount;
    // charge `token` in order to buy lands
    token.transferFrom(msg.sender, banker, totalPrice);

    emit LandSold(
      amount,
      city,
      tokenIds,
      msg.sender,
      referralCode,
      totalPrice,
      address(token)
    );

    return tokenIds;
  }

  /**
    * @dev Withdraw pending ether to `banker` address.
    */
  function withdraw() public {
    uint256 toTransfer = pendingBanker;
    pendingBanker = 0;
    // withdraw to banker address
    banker.transfer(toTransfer);
  }

  function pending() public view returns(uint256) {
    return pendingBanker;
  }
}
