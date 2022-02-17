// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev used for testing purposes only.
 */
contract BEP20 is ERC20 {
  constructor() ERC20("BEP20", "B20") {
    _mint(msg.sender, 20000000 * 10 ** decimals());
  }
}
