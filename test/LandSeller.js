const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const roles = require('../lib/roles');

const baseLandURI = 'https://criptobackendprod.azurewebsites.net/api/land/token/';

async function deploy() {
  const [deployeer, minter, buyer, bank, minterUnitTradeCoin, ...otherWallets] = await ethers.getSigners();
  
  const landNFTFactory = await ethers.getContractFactory('LandNFT');
  const landNFT = await upgrades.deployProxy(landNFTFactory, [bank.address]);
  await landNFT.deployed();

  const unitTradeCoinFactory = await ethers.getContractFactory('BEP20');
  const unitTradeCoin = await unitTradeCoinFactory.deploy();

  const landSellerFactory = await ethers.getContractFactory('LandSeller');
  const landSeller = await upgrades.deployProxy(landSellerFactory, [landNFT.address, bank.address]);
  await landSeller.deployed();

  // should set the base uri
  await landNFT.setBaseURI(baseLandURI);
  // set transfer fee (which should not affect to land seller)
  await landNFT.setTransferFee(ethers.utils.parseUnits('0.01', 18));
  // grant minter role to LandSeller
  await landNFT.connect(deployeer).grantRole(roles.minter, landSeller.address);

  return {
    deployeer,
    minter,
    buyer,
    unitTradeCoin,
    minterUnitTradeCoin,
    landNFT,
    landSeller,
    otherWallets,
  };
}

describe('LandSeller', function() {
  it('Should deploy', async function() {
    const [landNFT, banker] = await ethers.getSigners();

    let factory = await ethers.getContractFactory('LandSeller')
    const contract = await upgrades.deployProxy(factory, [landNFT.address, banker.address]);
    await contract.deployed();
  });

  it('Should not be able to initialize twice', async function() {
    const [landNFT, banker] = await ethers.getSigners();

    let factory = await ethers.getContractFactory('LandSeller')
    const contract = await upgrades.deployProxy(factory, [landNFT.address, banker.address]);
    await contract.deployed();

    await expect(contract.initialize(landNFT.address, banker.address))
      .to.be.revertedWith('Initializable: contract is already initialized');
  });

  it('Should be able to buy', async function() {
    const { landNFT, landSeller, buyer } = await deploy();

    const amount = 1;
    const tokenId = 1;
    const bitcoinResidence = 1;
    const bitcoinPrice = ethers.utils.parseUnits('0.01', 18);
    const referredCode = 2459;

    // set limits for residence bitcoin only to 1000
    await landSeller.setLimits([1000]);
    // set price for residence bitcoin only
    await landSeller['setPrice(uint256[])']([bitcoinPrice]);
    // nothing was sold for bitcoin residence
    await landSeller.setSold([0]);

    await expect(await landSeller.connect(buyer)['buy(uint8,uint8,uint32)'](amount, bitcoinResidence, referredCode, { value: bitcoinPrice }))
      .and.to.emit(landNFT, 'Transfer') // mint and transfer to redeemer
      .withArgs(ethers.constants.AddressZero, buyer.address, tokenId)
      .and.to.emit(landSeller, 'LandSold') // land seller event
      .withArgs(amount, bitcoinResidence, [tokenId], buyer.address, referredCode, bitcoinPrice, ethers.constants.AddressZero);

    // should have the expected tokenURI
    expect(await landNFT.tokenURI(1)).to.be.equal(`${baseLandURI}${tokenId}`);

    expect(await landNFT.ownerOf(tokenId)).to.equal(buyer.address);
    await expect(landNFT.ownerOf(tokenId + 1))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');
  });

  it('Should be able to buy many', async function() {
    const { landNFT, landSeller, buyer } = await deploy();

    const amount = 2;
    const bitcoinResidence = 1;
    const bitcoinPrice = ethers.utils.parseUnits('0.01', 18);
    const referredCode = 2459;

    // set limits for residence bitcoin only to 1000
    await landSeller.setLimits([1000]);
    // set price for residence bitcoin only
    await landSeller['setPrice(uint256[])']([bitcoinPrice]);
    // nothing was sold for bitcoin residence
    await landSeller.setSold([0]);

    await expect(await landSeller.connect(buyer)['buy(uint8,uint8,uint32)'](amount, bitcoinResidence, referredCode, { value: bitcoinPrice.mul(amount) }))
      .and.to.emit(landNFT, 'Transfer') // mint and transfer to redeemer
      .withArgs(ethers.constants.AddressZero, buyer.address, 1)
      .and.to.emit(landNFT, 'Transfer') // mint and transfer to redeemer
      .withArgs(ethers.constants.AddressZero, buyer.address, 2)
      .and.to.emit(landSeller, 'LandSold') // land seller event
      .withArgs(amount, bitcoinResidence, [1, 2], buyer.address, referredCode, bitcoinPrice.mul(amount), ethers.constants.AddressZero);

    // should have the expected tokenURI
    expect(await landNFT.tokenURI(1)).to.be.equal(`${baseLandURI}1`);
    expect(await landNFT.tokenURI(2)).to.be.equal(`${baseLandURI}2`);

    expect(await landNFT.ownerOf(1)).to.equal(buyer.address);
    expect(await landNFT.ownerOf(2)).to.equal(buyer.address);
    await expect(landNFT.ownerOf(3))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');
  });

  it('Should be able to exchange UnitTradeCoin and get Lands', async function() {
    const { landNFT, landSeller, buyer, unitTradeCoin } = await deploy();

    const amount = 1;
    const tokenId = 1;
    const bitcoinResidence = 1;
    const bitcoinPrice = ethers.utils.parseUnits('1', 18);
    const referredCode = 2459;

    // set limits for residence bitcoin only to 1000
    await landSeller.setLimits([1000]);
    // set price for residence bitcoin only
    await landSeller['setPrice(address,uint256[])'](unitTradeCoin.address, [bitcoinPrice]);
    // nothing was sold for bitcoin residence
    await landSeller.setSold([0]);

    // give one UnitTradeCoin to buyer
    await unitTradeCoin.transfer(buyer.address, bitcoinPrice);

    const totalPrice = bitcoinPrice.mul(amount);
    // approve landSeller to transfer UnitTradeCoin in name of buyer
    await unitTradeCoin.connect(buyer).approve(landSeller.address, totalPrice);

    await expect(await landSeller.connect(buyer)['buy(address,uint8,uint8,uint32)'](unitTradeCoin.address, amount, bitcoinResidence, referredCode, { value: 0 }))
      .and.to.emit(landNFT, 'Transfer') // mint and transfer to redeemer
      .withArgs(ethers.constants.AddressZero, buyer.address, tokenId)
      .and.to.emit(landSeller, 'LandSold') // land seller event
      .withArgs(amount, bitcoinResidence, [tokenId], buyer.address, referredCode, totalPrice, unitTradeCoin.address);

    // should have the expected tokenURI
    expect(await landNFT.tokenURI(1)).to.be.equal(`${baseLandURI}${tokenId}`);

    expect(await landNFT.ownerOf(tokenId)).to.equal(buyer.address);
    await expect(landNFT.ownerOf(tokenId + 1))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');
  });

  it('Should not be able to exchange UnitTradeCoin and get Lands if no price is setted', async function() {
    const { landSeller, buyer, unitTradeCoin } = await deploy();

    const amount = 1;
    const bitcoinResidence = 1;
    const bitcoinPrice = ethers.utils.parseUnits('1', 18);
    const referredCode = 2459;

    // set limits for residence bitcoin only to 1000
    await landSeller.setLimits([1000]);
    // set price for residence bitcoin only
    // await landSeller['setPrice(address,uint256[])'](unitTradeCoin.address, [bitcoinPrice]);
    // nothing was sold for bitcoin residence
    await landSeller.setSold([0]);

    // give one UnitTradeCoin to buyer
    await unitTradeCoin.transfer(buyer.address, bitcoinPrice);

    const totalPrice = bitcoinPrice.mul(amount);
    // approve landSeller to transfer UnitTradeCoin in name of buyer
    await unitTradeCoin.connect(buyer).approve(landSeller.address, totalPrice);

    await expect(landSeller.connect(buyer)['buy(address,uint8,uint8,uint32)'](unitTradeCoin.address, amount, bitcoinResidence, referredCode, { value: 0 }))
      .to.be.revertedWith('reverted with panic code 0x32 (Array accessed at an out-of-bounds or negative index)');
  });

  it('Should not be able to exchange and get Lands if no UnitTradeCoin is available', async function() {
    const { landNFT, landSeller, buyer, unitTradeCoin } = await deploy();

    const amount = 1;
    const tokenId = 1;
    const bitcoinResidence = 1;
    const bitcoinPrice = ethers.utils.parseUnits('1', 18);
    const referredCode = 2459;

    // set limits for residence bitcoin only to 1000
    await landSeller.setLimits([1000]);
    // set price for residence bitcoin only
    await landSeller['setPrice(address,uint256[])'](unitTradeCoin.address, [bitcoinPrice]);
    // nothing was sold for bitcoin residence
    await landSeller.setSold([0]);

    // don't give one UnitTradeCoin to buyer
    // await unitTradeCoin.transfer(buyer.address, bitcoinPrice);

    // approve landSeller to transfer UnitTradeCoin in name of buyer
    await unitTradeCoin.connect(buyer).approve(landSeller.address, bitcoinPrice.mul(amount));

    // balance amount should not be enough
    await expect(landSeller.connect(buyer)['buy(address,uint8,uint8,uint32)'](unitTradeCoin.address, amount, bitcoinResidence, referredCode, { value: 0 }))
      .to.be.revertedWith('ERC20: transfer amount exceeds balance');

    // and lands should not be granted
    await expect(landNFT.ownerOf(tokenId))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');

    // and sold should be zero
    await expect(await landSeller.getSold(bitcoinResidence)).to.be.equal(0);
  });
});
