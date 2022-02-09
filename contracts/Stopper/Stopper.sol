pragma solidity =0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Stoppable.sol";

/**
  @title Stopper
  @notice The contract in charge of handling the stoppability of the contract
  that define this contract as its stopper
 */
contract Stopper is Ownable {

  /**
    @notice Pause activeContract if it is stoppable
    @param activeContract Contract to be paused
   */
  function pause(Stoppable activeContract) external onlyOwner {
    activeContract.pause();
  }

  /**
    @notice Unpause pausedContract if it is stoppable
    @param pausedContract Contract to be unpaused
   */
  function unpause(Stoppable pausedContract) external onlyOwner {
    pausedContract.unpause();
  }

  // Leave a gap betweeen inherited contracts variables in order to be
  // able to add more variables in them later
  uint256[50] private upgradeGap;
}
