require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-ethers");
require('solidity-coverage');
require('hardhat-deploy');
require("hardhat-gas-reporter");
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require('hardhat-docgen');

const networks = require('./hardhat.networks');
const namedAccounts = require('./hardhat.accounts');

module.exports = {
  defaultNetwork: "hardhat",
  networks,
  namedAccounts,
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings:{
          optimizer:{
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.5.8",
        settings:{
          optimizer: {
            enabled: true,
            runs: 999999
          }
        },
      }
    ],
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 0.06
  },
  abiExporter: {
    path: './abis',
    clear: true,
    flat: true,
    only: ['']
  },
  paths:{
    sources: './contracts',
    cache: './cache',
    artifacts: './build',
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  docgen: {
    path: './docs/',
    clear: true,
    runOnCompile: false,
  },
  mocha:{
    timeout: 100000,
  }
};

