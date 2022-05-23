// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IUTC.sol";

/**
 * @dev UTC Token
 * Token holders to destroy both their own
 * tokens mint only minter role
 * recognized off-chain (via event analysis).
 */
contract UTC is IUTC, ERC20, ERC20Burnable, AccessControl {
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  // 1.000.000.000 UTC
  uint256 MaxSupply = 1000000000 * 10 ** decimals();

  constructor() ERC20("Unit Trade Coin", "UTC")  {
    // setup this contract roles
    _setupRole(ADMIN_ROLE, msg.sender);
    _setupRole(MINTER_ROLE, msg.sender);

    // set new 'admin' role in order to manage other roles
    _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
  }

  function mint(address to, uint256 amount)
    public
    onlyRole(MINTER_ROLE)
  {
    require((amount + totalSupply()) <= MaxSupply, "Not possible to overpass the maximum supply");
    _mint(to, amount);
  }

  function _mint(address to, uint256 amount)
    internal
    override(ERC20)
  {
    super._mint(to, amount);
  }

  function _burn(address account, uint256 amount)
    internal
    override(ERC20)
  {
    super._burn(account, amount);
  }
}
