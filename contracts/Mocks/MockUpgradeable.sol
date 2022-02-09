pragma solidity =0.8.10;

// This contract is not intended to be used in a production system
// It was designed to be using in a testing environment only

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MockUpgradeable is Initializable {
  uint256 public firstVariable;
  uint256 public secondVariable;

  function initialize() public initializer {
    firstVariable = 4;
    secondVariable = 5;
  }

  function sumOfVars() public view virtual returns (uint256) {
    return firstVariable + secondVariable;
  }
}
