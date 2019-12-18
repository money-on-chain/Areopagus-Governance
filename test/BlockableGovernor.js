const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { expectRevert, time, BN } = require('openzeppelin-test-helpers');

const BlockableGovernor = artifacts.require('BlockableGovernor');
const Blocker = artifacts.require('Blocker');
const MockGoverned = artifacts.require('MockGoverned');
const MockChangeContract = artifacts.require('MockChangeContract');

chai.use(chaiAsPromised);
chai.should();

const NOT_AUTHORIZED_CHANGER_ERROR = 'not_authorized_changer';
const NOT_AUTHORIZED_TO_BLOCK_ERROR = 'not_authorized_to_block';
const BLOCKED_ERROR = 'blocked';
const THRESHOLD_TOO_LOW = 'threshold_too_low';

contract('BlockableGovernor', function([owner, anAddress, anotherAddress]) {
  describe('GIVEN there is an ecosystem with a blockable governor with an already passed unblock date(which should behave exactly as a common governor)', function() {
    let governor;
    let mockGoverned;
    let mockChangeContract;

    const initialValue = anAddress;
    const changeValue = anotherAddress;

    beforeEach(async function() {
      governor = await BlockableGovernor.new();
      governor.initialize(owner, 0);
      mockGoverned = await MockGoverned.new(initialValue);
      await mockGoverned.initialize(governor.address);
      mockChangeContract = await MockChangeContract.new(mockGoverned.address, changeValue);
    });
    describe('WHEN an authorized member tries and executes a change through the governor', function() {
      it('THEN the change takes effect', async function() {
        await governor.executeChange(mockChangeContract.address);
        await expect(await mockGoverned.protectedParam()).to.equal(changeValue);
      });
    });

    describe('WHEN an unauthorized member tries to execute a change through the governor', function() {
      it('THEN the governor rejects the tx', async function() {
        await expectRevert.unspecified(
          governor.executeChange(mockChangeContract.address, {
            from: anAddress
          })
        );
      });
    });

    describe('WHEN a contract tries to be executed without going through the governor', function() {
      it('THEN the governed rejects the tx', async function() {
        await expectRevert(
          mockChangeContract.execute({ from: owner }),
          NOT_AUTHORIZED_CHANGER_ERROR
        );
      });
    });

    describe('AND that a change contract was executed', function() {
      describe('WHEN a contract tries to be executed again after being going through the governor', function() {
        it('THEN the governed rejects the tx anyway', async function() {
          await governor.executeChange(mockChangeContract.address);

          await expectRevert(
            mockChangeContract.execute({ from: owner }),
            NOT_AUTHORIZED_CHANGER_ERROR
          );
        });
      });
    });
  });

  // eslint-disable-next-line mocha/max-top-level-suites
  describe('GIVEN there is an ecosystem with a blockable governor with a future unblock date', function() {
    let governor;
    let mockGoverned;
    let mockChangeContract;
    let unblockDate;

    const initialValue = anAddress;
    const changeValue = anotherAddress;
    const TIME_DELTA = new BN(100);

    beforeEach(async function() {
      governor = await BlockableGovernor.new();
      unblockDate = (await time.latest()).add(TIME_DELTA);
      governor.initialize(owner, unblockDate);
      mockGoverned = await MockGoverned.new(initialValue);
      await mockGoverned.initialize(governor.address);
      mockChangeContract = await MockChangeContract.new(mockGoverned.address, changeValue);
    });
    it('THEN the contract is blocked', async function() {
      await expect(await governor.isBlocked()).is.true;
    });

    describe('WHEN an authorized member tries and executes a change through the governor', function() {
      it('THEN the tx fails', async function() {
        await expectRevert(
          governor.executeChange(mockChangeContract.address, {
            from: owner
          }),
          BLOCKED_ERROR
        );
      });
    });

    describe('WHEN an unauthorized member tries to execute a change through the governor after the unblock date was reached', function() {
      it('THEN the governor rejects the tx', async function() {
        await time.increaseTo(unblockDate);
        await expectRevert.unspecified(
          governor.executeChange(mockChangeContract.address, {
            from: anAddress
          })
        );
      });
    });

    describe('WHEN a contract tries to be executed without going through the governor', function() {
      it('THEN the governed rejects the tx', async function() {
        await expectRevert(
          mockChangeContract.execute({ from: owner }),
          NOT_AUTHORIZED_CHANGER_ERROR
        );
      });
    });

    describe('WHEN trying to block it again with a shorter unblock date', function() {
      it('THEN the tx fails', async function() {
        const newUnblockDate = unblockDate.sub(TIME_DELTA);
        const blocker = await Blocker.new(governor.address, newUnblockDate);
        await expectRevert(governor.executeChange(blocker.address), BLOCKED_ERROR);
      });
    });

    describe('WHEN trying to block it again with a longer unblock date', function() {
      it('THEN the tx fails', async function() {
        const newUnblockDate = unblockDate.add(TIME_DELTA);
        const blocker = await Blocker.new(governor.address, newUnblockDate);
        await expectRevert(governor.executeChange(blocker.address), BLOCKED_ERROR);
      });
    });

    describe('AND the unblock date was reached', function() {
      beforeEach(async function() {
        await time.increaseTo(unblockDate);
      });
      it('THEN the contract is not blocked anymore', async function() {
        await expect(await governor.isBlocked()).is.false;
      });

      describe('WHEN trying to block it again until an already passed date', function() {
        it('THEN the tx fails', async function() {
          await time.increase(TIME_DELTA);
          const newUnblockDate = unblockDate.add(TIME_DELTA);
          const blocker = await Blocker.new(governor.address, newUnblockDate);
          await expectRevert(governor.executeChange(blocker.address), THRESHOLD_TOO_LOW);
        });
      });

      describe('WHEN someone, even the owner, tries to block it directly', function() {
        it('THEN the tx fails', async function() {
          const newUnblockDate = (await time.latest()).add(TIME_DELTA);
          await expectRevert(
            governor.blockUntil(newUnblockDate, { from: owner }),
            NOT_AUTHORIZED_TO_BLOCK_ERROR
          );
        });
      });

      describe('WHEN the contract is blocked again through a blocker', function() {
        let newUnblockDate;
        beforeEach(async function() {
          newUnblockDate = (await time.latest()).add(TIME_DELTA);
          const blocker = await Blocker.new(governor.address, newUnblockDate);
          await governor.executeChange(blocker.address);
        });
        it('THEN the contract is blocked again', async function() {
          await expect(await governor.isBlocked()).is.true;
        });
        it('THEN the change contracts fails', async function() {
          await expectRevert(
            governor.executeChange(mockChangeContract.address, {
              from: owner
            }),
            BLOCKED_ERROR
          );
        });
        describe('AND the new unblock date is reached', function() {
          beforeEach(async function() {
            await time.increaseTo(newUnblockDate);
          });
          it('THEN the contract is unblocked again ', async function() {
            await expect(await governor.isBlocked()).is.false;
          });
          it('THEN the change contracts can be run again', async function() {
            await governor.executeChange(mockChangeContract.address);
            await expect(await mockGoverned.protectedParam()).to.equal(changeValue);
          });
        });
      });
    });
  });
});
