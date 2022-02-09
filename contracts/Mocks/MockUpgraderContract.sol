pragma solidity =0.8.10;

// This contract is not intended to be used in a production system
// It was designed to be using in a testing environment only

import "../ChangersTemplates/UpgraderTemplate.sol";
import "./MockUpgraded.sol";

contract MockUpgraderContract is UpgraderTemplate {

  constructor(TransparentUpgradeableProxy _proxy, UpgradeDelegator _upgradeDelegator, address _newImplementation)
  public
  UpgraderTemplate(_proxy, _upgradeDelegator, _newImplementation){
  }

  function _afterUpgrade() internal override {
    MockUpgraded upgradedProxy = MockUpgraded(address(proxy));

    upgradedProxy.initialize2();

  }
}