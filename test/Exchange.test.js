const { expectEvent } = require('@openzeppelin/test-helpers');

const Exchange = artifacts.require('../contracts/Exchange.sol')
const Token = artifacts.require('../contracts/Token.sol')

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, user1, user2]) => {
  let exchange
  let allEvents
  let userStartValue = 100

  const EVM_REVERT = 'VM Exception while processing transaction: revert'
  let ADDRESS_0x0 = '0x0000000000000000000000000000000000000000'
  let DEPOSIT = 5

  beforeEach(async ()=> {
    token = await Token.new("Shakes", "HAKE", { from: deployer })
    token.transfer(user1, userStartValue, { from: deployer })
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

  describe('Checking balance', () => {
    let amount
    let balance

    beforeEach(async () => {
      amount = 30
      // deposit
      await token.approve(exchange.address, amount, { from: user1 })
      await exchange.depositToken(token.address, amount, { from: user1 })
    })

    describe('Success', () => {
      it('returns user balance', async () => {
        // check tokens on exchange
        balance = await exchange.balanceOf(token.address, user1)
        balance.toString().should.equal(amount.toString())
      })
    })
  })
})