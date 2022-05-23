// We import Chai to use its asserting functions here.
const { expect } = require('chai');
const roles = require('../lib/roles');

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe('UTC contract test', function () {
  let Token;
  let UTC;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    Token = await ethers.getContractFactory('UTC');
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens once its transaction has been
    // mined.
    UTC = await Token.deploy();

    await UTC.connect(owner).mint(owner.address, ethers.utils.parseUnits('1', 18));
  });

  describe('Deployment', function () {
    it('Should assign the total supply of tokens to the owner', async function () {
      const ownerBalance = await UTC.balanceOf(owner.address);
      expect(await UTC.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe('Transactions', function () {
    it('Should transfer tokens between accounts', async function () {
      // Transfer 50 tokens from owner to addr1
      await UTC.transfer(addr1.address, 50);
      const addr1Balance = await UTC.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await UTC.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await UTC.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it('Should fail if sender doesn’t have enough tokens', async function () {
      const initialOwnerBalance = await UTC.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
      // `require` will evaluate false and revert the transaction.
      await expect(
        UTC.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      // Owner balance shouldn't have changed.
      expect(await UTC.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it('Should update balances after transfers', async function () {
      const initialOwnerBalance = await UTC.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1.
      await UTC.transfer(addr1.address, 100);

      // Transfer another 50 tokens from owner to addr2.
      await UTC.transfer(addr2.address, 50);

      // Check balances.
      const finalOwnerBalance = await UTC.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));

      const addr1Balance = await UTC.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(100);

      const addr2Balance = await UTC.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });
  });

  describe('Transactions with Approval', function () {
    it('Should approve MaxTransfer amount', async () => {
      // Transfer 100 tokens from owner to addr1.
      await UTC.transfer(addr1.address, 100);

      // Approve addr2 to move on behalf of addr1
      await UTC.connect(addr1).approve(addr2.address, ethers.constants.MaxUint256);

      // Transfer 100 tokens from addr1 to addr3 using addr2
      await UTC.connect(addr2).transferFrom(addr1.address, addrs[0].address, 100);

      // Check balances.
      const addr1Balance = await UTC.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(0);

      const addr2Balance = await UTC.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(0);

      const addr3Balance = await UTC.balanceOf(addrs[0].address);
      expect(addr3Balance).to.equal(100);
    });
  });

  describe('Known issues', () => {
    /**
     * NOTE: Even though it could be desired to add another admin, the only needed role is the MINTER_ROLE
     * which was granted to a Multisig Gnosis Safe Wallet. Solving the issue to add or remove
     * people in order to decide when to mint tokens.
     */
    it('is not able to grant ADMIN_ROLE to another user', async function() {
      // admin should not be able to add another admin
      await expect(UTC.grantRole(roles.admin, addr1.address))
        .to.be.revertedWith(`AccessControl: account ${owner.address.toLowerCase()} is missing role ${roles.defaultAdminRole}`);
    });
  });
});
