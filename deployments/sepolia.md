Starting migrations...
======================
> Network name:    'ethTestnet'
> Network id:      11155111
> Block gas limit: 0x2255100


1_initial_migration.js
======================

   Deploying 'Migrations'
   ----------------------
   > transaction hash:    0x50029c32f1127527bda5c3273f0de4c2e89e0b33cdcfdf50ccd704818771b3c5
   > Blocks: 0            Seconds: 5
   > contract address:    0x4C100Fb4cfA807c18e86f038e6f58c2784a5055A
   > block number:        7339937
   > block timestamp:     1734977532
   > account:             0xCD8A1c9aCc980ae031456573e34dC05cD7daE6e3
   > balance:             0.1973269595
   > gas used:            198003
   > gas price:           13.5 gwei
   > value sent:          0 ETH
   > total cost:          0.0026730405 ETH

   Pausing for 1 confirmations...
   ------------------------------
   > confirmation number: 1 (block: 7339938)

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:        0.0026730405 ETH


2_deploy_contracts.js
=====================
Pushing implementations
Deploying governor
0x52d8EE82E4968Ee959514Ad2696166E58C63504D
Deploying stopper
0xdfe161F4c4d4Af407392b00482CC89B7Fb5F1CC1
Deploying upgradeDelegator and admin
Transfering ownership
Setting admins
0x52d8EE82E4968Ee959514Ad2696166E58C63504D
0xdfe161F4c4d4Af407392b00482CC89B7Fb5F1CC1
-----ADDRESSES IN dev-11155111------------
Deployed governor in 0x52d8EE82E4968Ee959514Ad2696166E58C63504D
Deployed stopper in 0xdfe161F4c4d4Af407392b00482CC89B7Fb5F1CC1
Deployed admin in 0x0Fd8989E4cB378B176Db0D5f3D1D2F0Cf11704Fe
Deployed delegator in 0xd1e0b4a308e72b3E6dfef72624333fAeDE6F8d11

   > Saving migration to chain.
   -------------------------------------
   > Total cost:                   0 ETH


Summary
=======
> Total deployments:   1
> Final cost:          0.0026730405 ETH
