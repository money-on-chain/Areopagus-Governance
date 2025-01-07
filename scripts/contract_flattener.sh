#!/usr/bin/env bash
echo "Starting to flatten our contracts"
node_modules/.bin/truffle-flattener contracts/Governance/Governor.sol > scripts/contract_flatten/Governor_flat.sol
node_modules/.bin/truffle-flattener contracts/Governance/BlockableGovernor.sol > scripts/contract_flatten/BlockableGovernor_flat.sol
node_modules/.bin/truffle-flattener contracts/Stopper/Stopper.sol > scripts/contract_flatten/Stopper_flat.sol
node_modules/.bin/truffle-flattener contracts/Upgradeability/UpgradeDelegator.sol > scripts/contract_flatten/UpgradeDelegator_flat.sol
node_modules/.bin/truffle-flattener contracts/Upgradeability/BlockableUpgradeDelegator.sol > scripts/contract_flatten/BlockableUpgradeDelegator_flat.sol
node_modules/.bin/truffle-flattener node_modules/zos-lib/contracts/upgradeability/ProxyAdmin.sol > scripts/contract_flatten/ProxyAdmin_flat.sol
echo "Finish successfully! Take a look in folder scripts/contract_flatten/..."