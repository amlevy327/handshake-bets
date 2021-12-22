// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is Ownable, ERC20 {

  constructor (string memory _name, string memory _symbol) ERC20 (_name, _symbol) {
    _mint(msg.sender, 1000000 * (10 ** 18));
  }
}