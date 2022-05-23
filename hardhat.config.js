require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
      },
      {
        version: '0.8.11',
      },
    ]
  },
};
