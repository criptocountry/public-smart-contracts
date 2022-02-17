const { utils } = require('ethers');

const admin = utils.keccak256(utils.toUtf8Bytes("ADMIN_ROLE"));
const freeTransfer = utils.keccak256(utils.toUtf8Bytes("FREE_TRANSFER_ROLE"));
const minter = utils.keccak256(utils.toUtf8Bytes("MINTER_ROLE"));
const pauser = utils.keccak256(utils.toUtf8Bytes("PAUSER_ROLE"));

module.exports = {
  admin,
  freeTransfer,
  minter,
  pauser,
};
