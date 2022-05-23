const { assert, expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const roles = require('../lib/roles');

const baseLandURI = 'https://www.cryptocountry.net/api/token/';
const transferFee = ethers.utils.parseUnits('0.1', 18);
const bitcoinResidence = 1;

async function deploy() {
  const [deployeer, minter, redeemer, tokenReceiver, banker, ...otherWallets] = await ethers.getSigners();

  const factory = await ethers.getContractFactory('LandNFT');
  const contract = await upgrades.deployProxy(factory, [banker.address]);
  await contract.deployed();

  assert(await contract.getRoleAdmin(roles.minter) === roles.admin, 'The admin role from MINTER_ROLE should be ADMIN_ROLE');
  assert(await contract.hasRole(roles.admin, deployeer.address), 'Deployeer should have admin role');

  await contract.grantRole(roles.minter, minter.address);
  await contract.setBaseURI(baseLandURI);
  await contract.setTransferFee(transferFee);

  return {
    deployeer,
    minter,
    redeemer,
    contract,
    tokenReceiver,
    otherWallets,
  };
}

describe('LandNFT', function() {
  it('Should deploy', async function() {
    const [banker] = await ethers.getSigners();

    let factory = await ethers.getContractFactory('LandNFT')
    const contract = await upgrades.deployProxy(factory, [banker.address]);
    await contract.deployed();
  });

  it('Should not be able to initialize twice', async function() {
    const [banker] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('LandNFT')
    const contract = await upgrades.deployProxy(factory, [banker.address]);
    await contract.deployed();

    await expect(contract.initialize(banker.address))
      .to.be.revertedWith('Initializable: contract is already initialized');
  });

  it('Should be able to mint', async function() {
    const { contract, redeemer, minter } = await deploy();

    const tokenId = 1;

    await expect(await contract.connect(minter).redeem(redeemer.address, bitcoinResidence, { value: 0 }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenId)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenId, redeemer.address);

    // should have the expected tokenURI
    expect(await contract.tokenURI(1)).to.be.equal(`${baseLandURI}${tokenId}`);

    expect(await contract.connect(redeemer).ownerOf(tokenId)).to.equal(redeemer.address);
    await expect(contract.connect(redeemer).ownerOf(2))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');
  });

  it('Should only be able to transfer once fee is payed (if has no free transfer role)', async function() {
    const { contract, redeemer, minter, tokenReceiver } = await deploy();

    const tokenId = 1;

    await expect(await contract.connect(minter).redeem(redeemer.address, bitcoinResidence, { value: 0 }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenId)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenId, redeemer.address);

    // should have the expected tokenURI
    expect(await contract.tokenURI(1)).to.be.equal(`${baseLandURI}${tokenId}`);

    expect(await contract.connect(redeemer).ownerOf(tokenId)).to.equal(redeemer.address);
    await expect(contract.connect(redeemer).ownerOf(2))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');

    // it is expected that redeemer has no free transfer role
    expect(await contract.hasRole(roles.freeTransfer, redeemer.address)).to.be.equal(false);
    // and because of that should not be able to transfer freely
    await expect(contract.connect(redeemer).transferFrom(redeemer.address, tokenReceiver.address, tokenId))
      .to.be.revertedWith('Transfer fee is required in order to transfer');
    // but it should be able to transfer once fee is payed
    await expect(contract.connect(redeemer).transferFrom(redeemer.address, tokenReceiver.address, tokenId, { value: transferFee }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(redeemer.address, tokenReceiver.address, tokenId);
  });

  it('Should receive expected fees', async function() {
    const { contract, redeemer, minter, tokenReceiver } = await deploy();

    const tokenId = 1;

    await expect(await contract.connect(minter).redeem(redeemer.address, bitcoinResidence, { value: 0 }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenId)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenId, redeemer.address);

    // should have the expected tokenURI
    expect(await contract.tokenURI(1)).to.be.equal(`${baseLandURI}${tokenId}`);

    expect(await contract.connect(redeemer).ownerOf(tokenId)).to.equal(redeemer.address);

    // should be able to transfer paying the fee
    await expect(contract.connect(redeemer).transferFrom(redeemer.address, tokenReceiver.address, tokenId, { value: transferFee }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(redeemer.address, tokenReceiver.address, tokenId);
  });

  it('Should be able to mint many', async function() {
    const { contract, redeemer, minter } = await deploy();

    const tokenIds = [1, 2, 3, 4];

    await expect(await contract.connect(minter).redeemMany(tokenIds.length, redeemer.address, bitcoinResidence, { value: 0 }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenIds[0])
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenIds[1])
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenIds[2])
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenIds[3])
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenIds[0], redeemer.address)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenIds[1], redeemer.address)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenIds[2], redeemer.address)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenIds[3], redeemer.address)

    // should have the expected tokenURI
    expect(await contract.tokenURI(1)).to.be.equal(`${baseLandURI}1`);
    expect(await contract.tokenURI(2)).to.be.equal(`${baseLandURI}2`);
    expect(await contract.tokenURI(3)).to.be.equal(`${baseLandURI}3`);
    expect(await contract.tokenURI(4)).to.be.equal(`${baseLandURI}4`);

    expect(await contract.connect(redeemer).ownerOf(tokenIds[0])).to.equal(redeemer.address);
    expect(await contract.connect(redeemer).ownerOf(tokenIds[1])).to.equal(redeemer.address);
    expect(await contract.connect(redeemer).ownerOf(tokenIds[2])).to.equal(redeemer.address);
    expect(await contract.connect(redeemer).ownerOf(tokenIds[3])).to.equal(redeemer.address);
    await expect(contract.connect(redeemer).ownerOf(5))
      .to.be.revertedWith('ERC721: owner query for nonexistent token');
  });

  it('Should be able to change the baseURI and get correct URI for NFTs already minted', async () => {
    const { contract, redeemer, minter } = await deploy();

    const tokenId = 1;

    await expect(await contract.connect(minter).redeem(redeemer.address, bitcoinResidence, { value: 0 }))
      .and.to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, redeemer.address, tokenId)
      .and.to.emit(contract, 'NewLand')
      .withArgs(bitcoinResidence, tokenId, redeemer.address);

    // should have the expected tokenURI
    expect(await contract.tokenURI(1)).to.be.equal(`${baseLandURI}${tokenId}`);

    const newBaseLandURI = 'https://www.someotherdomain.net/api/token/';

    // set new base land URI
    await contract.connect(minter).setBaseURI(newBaseLandURI, { value: 0 });

    // should have the expected new tokenURI
    expect(await contract.tokenURI(1)).to.be.equal(`${newBaseLandURI}${tokenId}`);
  });

  it('Should fail to redeem if not priviledges were granted', async function() {
    const { contract, otherWallets } = await deploy();

    await expect(contract.connect(otherWallets[0]).redeem(otherWallets[0].address, bitcoinResidence, { value: 0 }))
      .to.be.revertedWith(`AccessControl: account ${otherWallets[0].address.toLowerCase()} is missing role ${roles.minter}`);
  });

  it('Should be able to add another admin after the fix executed', async function() {
    const { contract, deployeer, otherWallets } = await deploy();

    // admin should not be able to add another admin
    await expect(contract.grantRole(roles.admin, otherWallets[0].address))
      .to.be.revertedWith(`AccessControl: account ${deployeer.address.toLowerCase()} is missing role ${roles.defaultAdminRole}`);

    // admin manages admins now
    await expect(await contract.fixAdminRole())
      .to.emit(contract, 'RoleAdminChanged')
      .withArgs(roles.admin, roles.defaultAdminRole, roles.admin);

    // admin is able to add another admin
    await expect(await contract.grantRole(roles.admin, otherWallets[0].address))
      .to.emit(contract, 'RoleGranted')
      .withArgs(roles.admin, otherWallets[0].address, deployeer.address);
  });
});
