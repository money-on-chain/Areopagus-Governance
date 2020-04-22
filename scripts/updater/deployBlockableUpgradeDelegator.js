const { getConfig, getWeb3, getOptions, currentTimestamp } = require('./changerHelper');
const { scripts, ConfigVariablesInitializer } = require('zos');
const BlockableUpgradeDelegator = require('../../build/contracts/BlockableUpgradeDelegator.json');
const ProxyAdmin = require('../../build/contracts/ProxyAdmin.json');
const truffleConfig = require('../../truffle');

const { add, push, create, setAdmin } = scripts;

/**
 * Script for deploying a new BlockableUpgradeDelegator. 
 * unblockUpgradesTimeDelta is in seconds.
 */
const input = {
  network: 'rskTestnet',
  governorAddress: '0xf0a70a883E52dDc94F755cB03D0917E305d5d258',
  unblockUpgradesTimeDelta: 60 * 60 * 24 * 14
};

const execute = async () => {
  const web3 = getWeb3(input.network);
  const [owner] = await web3.eth.getAccounts();
  const ProxyAdminConstructor = await new web3.eth.Contract(ProxyAdmin.abi);
  console.log('Deploying Proxy Admin');
  ProxyAdminConstructor.deploy({
    data: ProxyAdmin.bytecode,
    arguments: []
  })
    .send({
      from: owner,
      gas: truffleConfig.networks[input.network].gas,
      gasPrice: truffleConfig.networks[input.network].gasPrice
    })
    .on('transactionHash', hash => console.log('TxHash:', hash))
    .on('confirmation', confirmationNumber => console.log('Tx confirmation:', confirmationNumber))
    .on('receipt', receipt => {
      console.log('Tx Receipt', receipt);
      deployUpgradeDelegator(web3, owner, receipt);
    })
    .on('error', err => console.error(`ERROR DEPLOYING: ${err}`));
};

const deployUpgradeDelegator = async (web3, owner, receipt) => {
  const proxyAdminAddress = receipt.contractAddress;
  const options = await getOptions(input.network, owner);

  const delegator = await new web3.eth.Contract(BlockableUpgradeDelegator.abi);

  console.log('Deploying BlockableUpgradeDelegator');
  delegator.deploy({
    data: BlockableUpgradeDelegator.bytecode,
    arguments: []
  })
    .send({
      from: owner,
      gas: truffleConfig.networks[input.network].gas,
      gasPrice: truffleConfig.networks[input.network].gasPrice
    })
    .on('transactionHash', hash => console.log('TxHash:', hash))
    .on('confirmation', confirmationNumber => console.log('Tx confirmation:', confirmationNumber))
    .on('receipt', receipt => {
      console.log('Tx Receipt', receipt);
      initializeUpgradeDelegator(owner, web3, proxyAdminAddress, receipt);
    })
    .on('error', err => console.error(`ERROR DEPLOYING: ${err}`));
}

const initializeUpgradeDelegator = async (owner, web3, proxyAdminAddress, receipt) => {
  const delegatorAddress = receipt.contractAddress;
  const delegator = await new web3.eth.Contract(BlockableUpgradeDelegator.abi, delegatorAddress);
  const admin = await new web3.eth.Contract(ProxyAdmin.abi, proxyAdminAddress);

  console.log('Delegator Initialize');
  const unblockUpgradesAt = await currentTimestamp(web3) + input.unblockUpgradesTimeDelta;
  await delegator.methods.initialize(owner, input.governorAddress, proxyAdminAddress, unblockUpgradesAt)
    .send({
      from: owner,
      gas: truffleConfig.networks[input.network].gas,
      gasPrice: truffleConfig.networks[input.network].gasPrice
    })
    .on('transactionHash', hash => console.log('TxHash:', hash))
    .on('confirmation', confirmationNumber => console.log('Tx confirmation:', confirmationNumber))
    .on('receipt', receipt => {
      console.log('Tx receipt:', receipt),
        transferingOwnership(owner, delegator, admin, receipt)
    })
    .on('error', console.error);
}

const transferingOwnership = async (owner, delegator, admin, receipt) => {
  console.log('Transfering Ownership');
  await admin.methods.transferOwnership(delegator.address)
    .send({
      from: owner,
      gas: truffleConfig.networks[input.network].gas,
      gasPrice: truffleConfig.networks[input.network].gasPrice
    })
    .on('transactionHash', hash => console.log('TxHash:', hash))
    .on('confirmation', confirmationNumber => console.log('Tx confirmation:', confirmationNumber))
    .on('receipt', receipt => console.log('Tx receipt:', receipt))
    .on('error', console.error);
}

execute()
  .then(() => console.log('Completed'))
  .catch(err => {
    console.log('Error', err);
  });
