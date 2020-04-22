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
  network: 'rskTestnet',
  proxyAddress: '0xc292f56E567A908674E1D3B9E549b62f904Df1Cf',
  newProxyAdminAddress: '0x67Ed326904252f837c5142F21Df96377566DAB3F'
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
