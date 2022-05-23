const { utils } = require('ethers');

const defaultAdminRole = '0x0000000000000000000000000000000000000000000000000000000000000000';
const admin = utils.keccak256(utils.toUtf8Bytes("ADMIN_ROLE"));
const freeTransfer = utils.keccak256(utils.toUtf8Bytes("FREE_TRANSFER_ROLE"));
const minter = utils.keccak256(utils.toUtf8Bytes("MINTER_ROLE"));
const pauser = utils.keccak256(utils.toUtf8Bytes("PAUSER_ROLE"));

module.exports = {
  admin,
  defaultAdminRole,
  freeTransfer,
  minter,
  pauser,
};
