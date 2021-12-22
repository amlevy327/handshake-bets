// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import './Token.sol';

contract Exchange is Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _betCount;

  uint256 public depositAmount; // returned after bet closed - incentive to close bet
  address constant ADDRESS_0X0 = address(0); // store Ether in tokens mapping with blank address

  mapping(address => mapping(address => uint256)) public tokens;
  mapping(uint256 => _Bet) public bets;
  mapping(uint256 => bool) public cancelled;
  mapping(uint256 => bool) public accepted;
  mapping(uint256 => bool) public closed;

  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);
  event BetCreated(uint256 id, address token, address maker, address taker, uint256 amountMaker, uint256 amountTaker, uint256 depositAmount, bool accepted, address winnerMaker, address winnerTaker, uint256 timestamp);
  event BetCancelled(uint256 id, address token, address maker, address taker, uint256 amountMaker, uint256 amountTaker, uint256 depositAmount, bool accepted, address winnerMaker, address winnerTaker, uint256 timestamp);

  struct _Bet {
    uint256 id;
    address token;
    address maker;
    address taker;
    uint256 amountMaker;
    uint256 amountTaker;
    uint256 amountDeposit;
    bool accepted;
    address winnerMaker;
    address winnerTaker;
    uint256 timestamp;
    }

  constructor (uint256 _depositAmount) {
    depositAmount = _depositAmount;
  }


  function depositToken(address _token, uint256 _amount) public {
    require(_token != ADDRESS_0X0);
    require(Token(_token).transferFrom(msg.sender, address(this), _amount));
    tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;
    emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  function withdrawToken(address _token, uint256 _amount) public {
    require(_token != ADDRESS_0X0);
    require(tokens[_token][msg.sender] >= _amount);
    tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;
    require(Token(_token).transfer(msg.sender, _amount));
    emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  function balanceOf(address _token, address _user) public view returns(uint256 _balance) {
      return tokens[_token][_user];
  }
  
  function createBet(address _token, address _taker, uint256 _amountMaker, uint256 _amountTaker) public {
    require(msg.sender != _taker, 'taker cannot be sender');
    require(tokens[_token][msg.sender] >= (_amountMaker + depositAmount), 'insufficent balance');

    tokens[_token][msg.sender] -= (_amountMaker + depositAmount);
    tokens[_token][address(this)] += (_amountMaker + depositAmount);

    _betCount.increment();
    bets[_betCount.current()] = _Bet(_betCount.current(), _token, msg.sender, _taker, _amountMaker, _amountTaker, depositAmount, false, ADDRESS_0X0, ADDRESS_0X0, block.timestamp);

    emit BetCreated(_betCount.current(), _token, msg.sender, _taker, _amountMaker, _amountTaker, depositAmount, false, ADDRESS_0X0, ADDRESS_0X0, block.timestamp);
  }

  function cancelBet(uint256 _id) public {
    _Bet storage _bet = bets[_id];
    require(_id == _bet.id);
    require(msg.sender == address(_bet.maker));
    require(cancelled[_id] == false, 'bet already cancelled');
    require(accepted[_id] == false, 'bet already accepted');
    
    cancelled[_id] = true;

    tokens[_bet.token][msg.sender] += (_bet.amountMaker + _bet.amountDeposit); // options: add fees or keep deposit
    tokens[_bet.token][address(this)] -= (_bet.amountMaker + _bet.amountDeposit);

    emit BetCancelled(_betCount.current(), _bet.token, _bet.maker, _bet.taker, _bet.amountMaker, _bet.amountTaker, _bet.amountDeposit, _bet.accepted, _bet.winnerMaker, _bet.winnerTaker, block.timestamp);
  }
}