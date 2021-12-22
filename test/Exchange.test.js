const { expectEvent } = require('@openzeppelin/test-helpers');

const Exchange = artifacts.require('../contracts/Exchange.sol')
const Token = artifacts.require('../contracts/Token.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, user1, user2, user3]) => {
  let exchange
  let allEvents
  let userStartValue = 100

  const EVM_REVERT = 'VM Exception while processing transaction: revert'
  let ADDRESS_0x0 = '0x0000000000000000000000000000000000000000'
  let DEPOSIT = 5

  beforeEach(async ()=> {
    token = await Token.new("Shakes", "HAKE", { from: deployer })
    token.transfer(user1, userStartValue, { from: deployer })
    token.transfer(user2, userStartValue, { from: deployer })
    exchange = await Exchange.new(DEPOSIT, { from: deployer })
    allEvents = await exchange.getPastEvents("allEvents", {fromBlock: 0, toBlock: "latest"})
  })

  describe('Constructor', () => {
    describe('Contract', () => {
      it('deploys successfully', async () => {
        const address = await exchange.address

        address.should.not.equal(0x0, 'address does not equal 0x0')
        address.should.not.equal('', 'address does not equal ""')
        address.should.not.equal(null, 'address does not equal null')
        address.should.not.equal(undefined, 'address does not equal undefined')
      })

      it('tracks deposit amount', async () => {
        let depositAmount = await exchange.depositAmount()
        depositAmount.toString().should.equal(DEPOSIT.toString(), 'contract owner is correct')
      })
    })

    describe('Ownable', () => {
      it('transfers ownership to deployer', async () => {
        let contractOwner = await exchange.owner()
        contractOwner.toString().should.equal(deployer.toString(), 'contract owner is correct')
      })

      it('emits OwnershipTransferred event', async () => {
        let event = await allEvents[0]
        let previousOwner = event.args.previousOwner
        let newOwner = event.args.newOwner

        previousOwner.toString().should.equal(ADDRESS_0x0.toString())
        newOwner.toString().should.equal(deployer.toString())
      })
    })
  })

  describe('Deposit tokens', () => {
    let result
    let amount

    describe('Success', () => {
      beforeEach(async ()=> {
        amount = 10
        await token.approve(exchange.address, amount, { from: user1 })
        result = await exchange.depositToken(token.address, amount, { from: user1 })
      })

      it('tracks the token deposit', async () => {
        let balance
        // check exchange token balance
        balance = await token.balanceOf(exchange.address)
        balance.toString().should.equal(amount.toString(), 'token contract balance is correct')
        // check tokens on exchange
        balance = await exchange.tokens(token.address,user1)
        balance.toString().should.equal(amount.toString(), 'exchange contract balance is correct')
      })

      it('emits a Deposit event', async () => {
        expectEvent(result, 'Deposit', { token: token.address, user: user1, amount: amount.toString(), balance: amount.toString()})
      })
    })

    describe('Failure', () => {
      it('rejects ether deposits', async () => {
        await exchange.depositToken(ADDRESS_0x0, 10, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('fails when no tokens are approved', async () => {
        await exchange.depositToken(token.address, 10, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })
    })

  describe('Withdraw tokens', () => {
    let result
    let depositAmount
    let withdrawAmount
    let balance

    beforeEach(async () => {
      depositAmount = 30
      withdrawAmount = 10
      // deposit
      await token.approve(exchange.address, depositAmount, { from: user1 })
      await exchange.depositToken(token.address, depositAmount, { from: user1 })
    })

    describe('Success', () => {
      beforeEach(async ()=> {
        // withdraw
        result = await exchange.withdrawToken(token.address, withdrawAmount, { from: user1 })
      })

      it('tracks the token withdraw', async () => {
        balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal((depositAmount - withdrawAmount).toString())
      })

      it('emits a Withdraw event', async () => {
        expectEvent(result, 'Withdraw', { token: token.address, user: user1, amount: withdrawAmount.toString(), balance: balance.toString()})
      })
    })
  
    describe('Failure', () => {
      it('rejects ether withdraw', async () => {
        // withdraw
        await exchange.withdrawToken(ADDRESS_0x0, withdrawAmount, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects withdraw with insuffient balance', async () => {
        // withdraw
        await exchange.withdrawToken(token.address, 1000, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })
  })

  describe('Create bet', () => {
    let result
    let amountTransfer = 30
    let amountMaker = 10
    let amountTaker = 8
    let depositAmount = DEPOSIT

    beforeEach(async () => {
      amountTransfer = 30
      // deposit
      await token.approve(exchange.address, amountTransfer, { from: user1 })
      await exchange.depositToken(token.address, amountTransfer, { from: user1 })
    })

    describe('Success', () => {
      beforeEach(async ()=> {
        result = await exchange.createBet(token.address, user2, amountMaker, amountTaker, { from: user1 })
      })

      it('bet created with _taker as user', async () => {
        const bet = await exchange.bets('1')
        bet.id.toString().should.equal('1', 'id is correct')
        bet.token.toString().should.equal(token.address.toString(), 'token address is correct')
        bet.maker.toString().should.equal(user1.toString(), 'maker address is correct')
        bet.taker.toString().should.equal(user2.toString(), 'taker address is correct')
        bet.amountMaker.toString().should.equal(amountMaker.toString(), 'amount maker is correct')
        bet.amountTaker.toString().should.equal(amountTaker.toString(), 'amount taker is correct')
        bet.amountDeposit.toString().should.equal(DEPOSIT.toString(), 'amount deposit is correct')
        bet.accepted.should.equal(false, 'accepted is correct')
        bet.winnerMaker.toString().should.equal(ADDRESS_0x0, 'winner maker is 0x0')
        bet.winnerTaker.toString().should.equal(ADDRESS_0x0, 'winner taker is 0x0')
      })

      it('emits a BetCreated event', async () => {
        expectEvent(
          result,
          'BetCreated',
          { id: '1',
            token: token.address, 
            maker: user1.toString(),
            taker: user2.toString(),
            amountMaker: amountMaker.toString(),
            amountTaker: amountTaker.toString(),
            depositAmount: DEPOSIT.toString(),
            accepted: false,
            winnerMaker: ADDRESS_0x0,
            winnerTaker: ADDRESS_0x0
          })
      })

      it('tracks contract balance', async () => {
        balance = await exchange.tokens(token.address, exchange.address)
        balance.toString().should.equal((amountMaker + depositAmount).toString(), 'contract balance is correct')
      })

      it('tracks user balance', async () => {
        balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal((amountTransfer - (amountMaker + depositAmount)).toString(), 'user balance is correct')
      })

      it('bet created with _taker as 0x0', async () => {
        result = await exchange.createBet(token.address, ADDRESS_0x0, amountMaker, amountTaker, { from: user1 })
        const bet = await exchange.bets('2')
        bet.id.toString().should.equal('2', 'id is correct')
        bet.token.toString().should.equal(token.address.toString(), 'token address is correct')
        bet.maker.toString().should.equal(user1.toString(), 'maker address is correct')
        bet.taker.toString().should.equal(ADDRESS_0x0, 'taker address is 0x0')
        bet.amountMaker.toString().should.equal(amountMaker.toString(), 'amount maker is correct')
        bet.amountTaker.toString().should.equal(amountTaker.toString(), 'amount taker is correct')
        bet.amountDeposit.toString().should.equal(DEPOSIT.toString(), 'amount deposit is correct')
        bet.accepted.should.equal(false, 'accepted is correct')
        bet.winnerMaker.toString().should.equal(ADDRESS_0x0, 'winner maker is 0x0')
        bet.winnerTaker.toString().should.equal(ADDRESS_0x0, 'winner taker is 0x0')
      })
    })
  
    describe('Failure', () => {
      it('rejects if taker address is sender address', async () => {
        await exchange.createBet(token.address, user1, amountMaker, amountTaker, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects if insufficient balance', async () => {
        await exchange.createBet(token.address, user2, '1000', amountTaker, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })

  describe('Cancel bet', () => {
    let result
    let amountTransfer = 30
    let amountMaker = 10
    let amountTaker = 8
    let depositAmount = DEPOSIT

    beforeEach(async () => {
      amountTransfer = 30
      // deposit
      await token.approve(exchange.address, amountTransfer, { from: user1 })
      await exchange.depositToken(token.address, amountTransfer, { from: user1 })
      await exchange.createBet(token.address, user2, amountMaker, amountTaker, { from: user1 })
    })

    describe('Success', () => {
      beforeEach(async () => {
        result = await exchange.cancelBet('1', { from: user1 })
      })

      it('bet cancelled', async () => {
        const betCancelledStatus = await exchange.cancelled('1')
        betCancelledStatus.should.equal(true, 'status is correct')
      })

      it('emits a BetCancelled event', async () => {
        expectEvent(
          result,
          'BetCancelled',
          { id: '1',
            token: token.address, 
            maker: user1.toString(),
            taker: user2.toString(),
            amountMaker: amountMaker.toString(),
            amountTaker: amountTaker.toString(),
            depositAmount: DEPOSIT.toString(),
            accepted: false,
            winnerMaker: ADDRESS_0x0,
            winnerTaker: ADDRESS_0x0
          })
      })

      it('tracks contract balance', async () => {
        balance = await exchange.tokens(token.address, exchange.address)
        balance.toString().should.equal('0', 'contract balance is correct')
      })

      it('tracks user balance', async () => {
        balance = await exchange.tokens(token.address, user1)
        balance.toString().should.equal(amountTransfer.toString(), 'user balance is correct')
      })
    })
  
    describe('Failure', () => {
      it('rejects if id does not exist', async () => {
        result = await exchange.cancelBet('100', { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects if sender is not maker', async () => {
        result = await exchange.cancelBet('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })

      // TODO: ADD ACCEPTED FUNCTION
      // it('rejects if already accepted', async () => {
      // })

      it('rejects if already cancelled', async () => {
        await exchange.cancelBet('1', { from: user1 })
        result = await exchange.cancelBet('1', { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })

  describe('Accept bet', () => {
    let result
    let amountTransferUser1 = 30
    let amountTransferUser2 = 40
    let amountMaker = 10
    let amountTaker = 8

    beforeEach(async () => {
      // deposit
      await token.approve(exchange.address, amountTransferUser1, { from: user1 })
      await token.approve(exchange.address, amountTransferUser2, { from: user2 })
      
      await exchange.depositToken(token.address, amountTransferUser1, { from: user1 })
      await exchange.depositToken(token.address, amountTransferUser2, { from: user2 })
    })

    describe('Success - taker is already set', () => {
      beforeEach(async () => {
        await exchange.createBet(token.address, user2, amountMaker, amountTaker, { from: user1 })
        result = await exchange.acceptBet('1', { from: user2 })
      })

      it('bet accepted', async () => {
        const betAcceptedStatus = await exchange.accepted('1')
        betAcceptedStatus.should.equal(true, 'status is correct')
      })

      it('emits a BetAccepted event', async () => {
        expectEvent(
          result,
          'BetAccepted',
          { id: '1',
            token: token.address, 
            maker: user1.toString(),
            taker: user2.toString(),
            amountMaker: amountMaker.toString(),
            amountTaker: amountTaker.toString(),
            depositAmount: DEPOSIT.toString(),
            winnerMaker: ADDRESS_0x0,
            winnerTaker: ADDRESS_0x0
          })
      })

      it('tracks contract balance', async () => {
        balance = await exchange.tokens(token.address, exchange.address)
        balance.toString().should.equal((amountMaker + DEPOSIT + amountTaker + DEPOSIT).toString(), 'contract balance is correct')
      })

      it('tracks user balance', async () => {
        balance = await exchange.tokens(token.address, user2)
        balance.toString().should.equal((amountTransferUser2 - amountTaker - DEPOSIT).toString(), 'user balance is correct')
      })
    })

    describe('Success - taker is not set', () => {
      beforeEach(async () => {
        await exchange.createBet(token.address, ADDRESS_0x0, amountMaker, amountTaker, { from: user1 })
        result = await exchange.acceptBet('1', { from: user2 })
      })

      it('bet accepted', async () => {
        const betAcceptedStatus = await exchange.accepted('1')
        betAcceptedStatus.should.equal(true, 'status is correct')
      })

      it('emits a BetAccepted event', async () => {
        expectEvent(
          result,
          'BetAccepted',
          { id: '1',
            token: token.address, 
            maker: user1.toString(),
            taker: user2.toString(),
            amountMaker: amountMaker.toString(),
            amountTaker: amountTaker.toString(),
            depositAmount: DEPOSIT.toString(),
            winnerMaker: ADDRESS_0x0,
            winnerTaker: ADDRESS_0x0
          })
      })

      it('tracks contract balance', async () => {
        balance = await exchange.tokens(token.address, exchange.address)
        balance.toString().should.equal((amountMaker + DEPOSIT + amountTaker + DEPOSIT).toString(), 'contract balance is correct')
      })

      it('tracks user balance', async () => {
        balance = await exchange.tokens(token.address, user2)
        balance.toString().should.equal((amountTransferUser2 - amountTaker - DEPOSIT).toString(), 'user balance is correct')
      })
    })

    describe('Failure', () => {
      beforeEach(async () => {
        await exchange.createBet(token.address, user2, amountMaker, amountTaker, { from: user1 })
        
      })

      it('rejects if id does not exist', async () => {
        result = await exchange.acceptBet('100', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects if already accepted', async () => {
        await exchange.acceptBet('1', { from: user2 })
        result = await exchange.acceptBet('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects if already cancelled', async () => {
        await exchange.cancelBet('1', { from: user1 })
        result = await exchange.acceptBet('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects withdraw with insuffient balance', async () => {
        await exchange.withdrawToken(token.address, amountTransferUser2, { from: user2 })
        result = await exchange.acceptBet('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects accepting bet for specific user', async () => {
        result = await exchange.acceptBet('1', { from: user3 }).should.be.rejectedWith(EVM_REVERT)
      })
    })
  })
})