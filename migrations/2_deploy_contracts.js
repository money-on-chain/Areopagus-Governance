/* eslint-disable no-console */
const { scripts, ConfigVariablesInitializer } = require('zos');

const allConfigs = require('./config');

const UpgradeDelegator = artifacts.require('UpgradeDelegator');
const BlockableUpgradeDelegator = artifacts.require('BlockableUpgradeDelegator');
const ProxyAdmin = artifacts.require('ProxyAdmin');

const { add, push, create, setAdmin } = scripts;

async function deploy(options, owner, config) {
  const governorToDeploy = config.unblockAt ? 'BlockableGovernor' : 'Governor';
  const initParamsGovernor = config.unblockAt ? [owner, config.unblockAt] : [owner];
  // Register initial version of my contracts in the zos project
  await add({
    contractsData: [
      { name: governorToDeploy, alias: 'Governor' },
      { name: 'Stopper', alias: 'Stopper' }
    ]
  });

  console.log('Pushing implementations');
  // Push implementation contracts to the network
  await push(options);

  // Create an instance of Governor, setting initial value to owner
  console.log('Deploying governor');
  const governor = await create({
    contractAlias: 'Governor',
    initMethod: 'initialize',
    initArgs: initParamsGovernor,
    ...options
  });

  console.log('Deploying stopper');
  const stopper = await create({
    contractAlias: 'Stopper',
    initMethod: 'initialize',
    initArgs: [owner],
    ...options
  });

  console.log('Deploying upgradeDelegator and admin');
  const admin = await ProxyAdmin.new();
  let upgradeDelegator;

  // check if the script if BlockableUpgradeDelegator should be used
  if (config.unblockUpgradesAt) {
    upgradeDelegator = await BlockableUpgradeDelegator.new();
    await upgradeDelegator.initialize(
      owner,
      governor.address,
      admin.address,
      config.unblockUpgradesAt
    );
  } else {
    upgradeDelegator = await UpgradeDelegator.new();
    await upgradeDelegator.initialize(governor.address, admin.address);
  }

  console.log('Transfering ownership');
  await admin.transferOwnership(upgradeDelegator.address);
  console.log('Setting admins');
  await setAdmin({ contractAlias: 'Governor', newAdmin: admin.address, ...options });
  await setAdmin({ contractAlias: 'Stopper', newAdmin: admin.address, ...options });
  console.log(`-----ADDRESSES IN ${options.network}------------`);
  console.log(`Deployed governor in ${governor.address}`);
  console.log(`Deployed stopper in ${stopper.address}`);
  console.log(`Deployed admin in ${admin.address}`);
  console.log(`Deployed delegator in ${upgradeDelegator.address}`);
}

module.exports = (deployer, networkName, [owner]) =>
  deployer.then(async () => {
    const { network, txParams } = await ConfigVariablesInitializer.initNetworkConfiguration({
      network: networkName,
      from: owner
    });
    return deploy({ network, txParams }, owner, allConfigs[networkName]);
  });
