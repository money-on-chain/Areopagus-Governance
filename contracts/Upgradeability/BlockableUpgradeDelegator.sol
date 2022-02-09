pragma solidity =0.8.10;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "../Blockability/Blockable.sol";
import "./UpgradeDelegator.sol";

/**
  @title BlockableUpgradeDelegator
  @notice Dispatches to the proxyAdmin any call made through the governance system
  @dev Adapter between our governance system and the zeppelinOS proxyAdmin. This is
  needed to be able to upgrade governance through the same system. This contract
  can be blocked until a given threshold.
 */
contract BlockableUpgradeDelegator is UpgradeDelegator, Blockable {
    /**
    @notice Initialize the contract with the basic settings
    @dev This initialize replaces the constructor but it is not called automatically.
    It is necessary because of the upgradeability of the contracts
    @param _owner Owner address of this system
    @param _governor Governor address of this system
    @param _proxyAdmin ProxyAdmin that we will forward the call to
    @param _firstUnblockDate Timestamp of the first threshold that should be passed before the governor is active
      again
   */
  function initialize(
    address _owner,
    address _governor,
    ProxyAdmin _proxyAdmin,
    uint256 _firstUnblockDate
  ) public initializer {
    super.initialize(_owner);
    UpgradeDelegator.initialize(_governor, _proxyAdmin);
    Blockable.initialize(_firstUnblockDate);
  }

  /**
  * @dev Changes the admin of a proxy.
  * @param proxy Proxy to change admin.
  * @param newAdmin Address to transfer proxy administration to.
  */
  function changeProxyAdmin(TransparentUpgradeableProxy proxy, address newAdmin)
      public
      override
      notBlocked
  {
    UpgradeDelegator.changeProxyAdmin(proxy, newAdmin);
  }

  /**
  * @dev Upgrades a proxy to the newest implementation of a contract.
  * @param proxy Proxy to be upgraded.
  * @param implementation the address of the Implementation.
  */
  function upgrade(TransparentUpgradeableProxy proxy, address implementation)
      public
      override
      notBlocked
  {
    UpgradeDelegator.upgrade(proxy, implementation);
  }

  /**
  * @dev Upgrades a proxy to the newest implementation of a contract and forwards a function call to it.
  * This is useful to initialize the proxied contract.
  * @param proxy Proxy to be upgraded.
  * @param implementation Address of the Implementation.
  * @param data Data to send as msg.data in the low level call.
  * It should include the signature and the parameters of the function to be called, as described in
  * https://solidity.readthedocs.io/en/v0.4.24/abi-spec.html#function-selector-and-argument-encoding.
  */
  function upgradeAndCall(
    TransparentUpgradeableProxy proxy,
    address implementation,
    bytes memory data
  ) public override payable notBlocked {
    UpgradeDelegator.upgradeAndCall(proxy, implementation, data);
  }

  /**
  @notice Defines which addresses are authorized to Block and which are not; in this case, the changes that come through the governor
  @param who Address that is being asked for
  */
  function isAuthorizedToBlock(address who) public override view returns (bool) {
    return governor.isAuthorizedChanger(who);
  }
}
