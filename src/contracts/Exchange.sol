// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import './Token.sol';

contract Exchange is Ownable {

  uint256 public depositAmount; // returned after bet closed - incentive to close bet
  address constant ETHER = address(0); // store Ether in tokens mapping with blank address
  
  uint256 betCount;
  mapping(address => mapping(address => uint256)) public tokens;
  mapping(uint256 => _Bet) public bets;
  mapping(uint256 => bool) public betCancelled;
  mapping(uint256 => bool) public betAccepted;
  mapping(uint256 => bool) public betClosed;

  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);

  struct _Bet {
    uint256 id;
    address maker;
    address taker;
    uint256 amountMaker;
    uint256 amountTaker;
    bool specificAddress;
    bool accepted;
    address winnerMaker;
    address winnerTaker;
    uint256 timestamp;
    }

  constructor (uint256 _depositAmount) {
    depositAmount = _depositAmount;
  }


  function depositToken(address _token, uint256 _amount) public {
      require(_token != ETHER);
      require(Token(_token).transferFrom(msg.sender, address(this), _amount));
      tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;
      emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  function withdrawToken(address _token, uint256 _amount) public {
      require(_token != ETHER);
      require(tokens[_token][msg.sender] >= _amount);
      tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;
      require(Token(_token).transfer(msg.sender, _amount));
      emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  function balanceOf(address _token, address _user) public view returns(uint256 _balance) {
      return tokens[_token][_user];
  }
}