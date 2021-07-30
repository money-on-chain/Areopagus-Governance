const ProxyAdminChanger = require('../../build/contracts/ProxyAdminChanger.json');
const { deployContract, getConfig } = require('./changerHelper');

/**
 * Script for setting address that will receive
 * the commissions after the splitting in CommissionSplitter
 * input: {
 *  network: Network to develop y truffle.js,
 *  proxyAddress: Address of the proxy contract to update. Examples: MoC, MoCInrate or MocState.
 *  newProxyAdminAddress: Address of the ProxyAdmin (with a new UpgradeDelegator).
 * }
 */
const input = {
  network: 'development', 
  proxyAddress: '0x94C3B3cACd8303bc9796E6C0dd366a6bb2f07D72',
  newProxyAdminAddress: '0xe6F0ff2857b1aa10e5988e95f2504aDc63BD6Af9'
};

const execute = async () => {
  const config = getConfig(input.network);
  console.log(JSON.stringify(config));
  return deployContract(ProxyAdminChanger, input.network, [
    input.proxyAddress,
    config.upgradeDelegator,
    input.newProxyAdminAddress
  ]);
};

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
