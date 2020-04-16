const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();
const { assertBig, toContractBN } = require('./mocHelper');
const { expectRevert, time, BN } = require('openzeppelin-test-helpers');

ZWeb3.initialize(web3.currentProvider);

const MockUpgradedImplementation = artifacts.require('MockUpgraded');
const MockUpgraderContract = artifacts.require('MockUpgraderContract');
const MockUpgraderGovernance = artifacts.require('MockUpgraderContract');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const Blocker = artifacts.require('Blocker');
const BlockableUpgradeDelegator = artifacts.require('BlockableUpgradeDelegator');
const Governor = artifacts.require('Governor');
const UpgradedGovernor = artifacts.require('MockUpgradedGovernor');

const ProxiableUpgradedGovernor = Contracts.getFromLocal('MockUpgradedGovernor');
const ProxiableGovernor = Contracts.getFromLocal('Governor');
const ProxiableMockUpgraded = Contracts.getFromLocal('MockUpgraded');
const ProxiableMockUpgradeable = Contracts.getFromLocal('MockUpgradeable');

const NOT_AUTHORIZED_TO_BLOCK_ERROR = 'not_authorized_to_block';
const BLOCKED_ERROR = 'blocked';
const THRESHOLD_TOO_LOW = 'threshold_too_low';

contract('BlockedUpgradeability', function([owner, anotherAddress, anAddress]) {
  // eslint-disable-next-line mocha/no-top-level-hooks
  beforeEach(async function() {
    this.project = await TestHelper();
    this.project.txParams.gas = 4e6;
  });
  // eslint-disable-next-line mocha/max-top-level-suites
  describe('Proxy with Governance - GIVEN a ProxiableMockUpgradeable contract is up', function() {
    let proxyMockUpgradeable;
    beforeEach(async function() {
      proxyMockUpgradeable = await this.project.createProxy(ProxiableMockUpgradeable, {
        initMethod: 'initialize',
        initArgs: []
      });
    });
    describe('AND the admin is set to a blocked BlockableUpgradeDelegator with a future unblock date', function() {
      let governor;
      let admin;
      let delegator;
      let upgradedImplementation;
      before(async function() {
        upgradedImplementation = await MockUpgradedImplementation.new();
      });
      beforeEach(async function() {
        governor = await Governor.new();
        await governor.initialize(owner);

        admin = await ProxyAdmin.new();
        delegator = await BlockableUpgradeDelegator.new();
        await delegator.initialize(owner, governor.address, admin.address, 0);

        await admin.transferOwnership(delegator.address);

        await this.project.changeProxyAdmin(proxyMockUpgradeable.address, admin.address);
      });

      describe('WHEN the owner tries to update the contract through governance', function() {
        let upgradedProxy;
        let changeContract;

        beforeEach(async function() {
          changeContract = await MockUpgraderContract.new(
            proxyMockUpgradeable.address,
            delegator.address,
            upgradedImplementation.address
          );
          await governor.executeChange(changeContract.address);
          upgradedProxy = await ProxiableMockUpgraded.at(proxyMockUpgradeable.address);
        });
        describe('AND  a user asks for the value of the sumOfVars', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.sumOfVars().call();
          });
          it('THEN the result is 15', async function() {
            assertBig(result, toContractBN(15));
          });
        });
        describe('AND  a user asks for the value of firstVariable', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.firstVariable().call();
          });
          it('THEN the result changed to 6', async function() {
            assertBig(result, toContractBN(6));
          });
        });
        describe('AND  a user asks for the value of the secondVariable', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.secondVariable().call();
          });
          it('THEN the result is still 5', async function() {
            assertBig(result, toContractBN(5));
          });
        });
        describe('AND  a user asks for the value of thirdVariable', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.thirdVariable().call();
          });
          it('THEN the result is 4', async function() {
            assertBig(result, toContractBN(4));
          });
        });
      });
    });
  });

  // eslint-disable-next-line mocha/max-top-level-suites
  describe('Proxy with Governance - GIVEN a ProxiableMockUpgradeable contract is up', function() {
    let proxyMockUpgradeable;
    beforeEach(async function() {
      proxyMockUpgradeable = await this.project.createProxy(ProxiableMockUpgradeable, {
        initMethod: 'initialize',
        initArgs: []
      });
    });
    describe('AND the admin is set to an blocked BlockableUpgradeDelegator with a future unblock date', function() {
      let governor;
      let admin;
      let delegator;
      let upgradedImplementation;
      const TIME_DELTA = new BN(100);

      before(async function() {
        upgradedImplementation = await MockUpgradedImplementation.new();
      });
      beforeEach(async function() {
        governor = await Governor.new();
        await governor.initialize(owner);

        admin = await ProxyAdmin.new();
        delegator = await BlockableUpgradeDelegator.new();
        unblockDate = (await time.latest()).add(TIME_DELTA);
        await delegator.initialize(owner, governor.address, admin.address, unblockDate);

        await admin.transferOwnership(delegator.address);

        await this.project.changeProxyAdmin(proxyMockUpgradeable.address, admin.address);
      });
      it('THEN the contract is blocked', async function() {
        await expect(await delegator.isBlocked()).is.true;
      });

      describe('WHEN the owner tries to update the contract through governance', function() {
        let upgradedProxy;
        let changeContract;

        beforeEach(async function() {
          changeContract = await MockUpgraderContract.new(
            proxyMockUpgradeable.address,
            delegator.address,
            upgradedImplementation.address
          );
        });

        describe('WHEN an authorized member tries and executes a change through the governor', function() {
          it('THEN the tx fails', async function() {
            await expectRevert(governor.executeChange(changeContract.address), BLOCKED_ERROR);
          });
        });
        describe('WHEN an unauthorized member tries to execute a change through the governor after the unblock date was reached', function() {
          it('THEN the governor rejects the tx', async function() {
            await time.increaseTo(unblockDate);
            await expectRevert.unspecified(
              governor.executeChange(changeContract.address, {
                from: anotherAddress
              })
            );
          });
        });
        describe('WHEN trying to block it again with a shorter unblock date', function() {
          it('THEN the tx fails', async function() {
            const newUnblockDate = unblockDate.sub(TIME_DELTA);
            const blocker = await Blocker.new(delegator.address, newUnblockDate);
            await expectRevert(governor.executeChange(blocker.address), BLOCKED_ERROR);
          });
        });
        describe('WHEN trying to block it again with a longer unblock date', function() {
          it('THEN the tx fails', async function() {
            const newUnblockDate = unblockDate.add(TIME_DELTA);
            const blocker = await Blocker.new(delegator.address, newUnblockDate);
            await expectRevert(governor.executeChange(blocker.address), BLOCKED_ERROR);
          });
        });
        describe('AND the unblock date was reached', function() {
          beforeEach(async function() {
            await time.increaseTo(unblockDate);
          });
          it('THEN the contract is not blocked anymore', async function() {
            await expect(await delegator.isBlocked()).is.false;
          });

          describe('WHEN trying to block it again until an already passed date', function() {
            it('THEN the tx fails', async function() {
              await time.increase(TIME_DELTA);
              const newUnblockDate = unblockDate.add(TIME_DELTA);
              const blocker = await Blocker.new(delegator.address, newUnblockDate);
              await expectRevert(governor.executeChange(blocker.address), THRESHOLD_TOO_LOW);
            });
          });

          describe('WHEN someone, even the owner, tries to block it directly', function() {
            it('THEN the tx fails', async function() {
              const newUnblockDate = (await time.latest()).add(TIME_DELTA);
              await expectRevert(
                delegator.blockUntil(newUnblockDate, { from: owner }),
                NOT_AUTHORIZED_TO_BLOCK_ERROR
              );
            });
          });
          describe('WHEN the contract is blocked again through a blocker', function() {
            let newUnblockDate;
            beforeEach(async function() {
              newUnblockDate = (await time.latest()).add(TIME_DELTA);
              const blocker = await Blocker.new(delegator.address, newUnblockDate);
              await governor.executeChange(blocker.address);
            });
            it('THEN the contract is blocked again', async function() {
              await expect(await delegator.isBlocked()).is.true;
            });
            it('THEN the change contract must fail', async function() {
              await expectRevert(governor.executeChange(changeContract.address), BLOCKED_ERROR);
            });
            describe('AND the new unblock date is reached', function() {
              beforeEach(async function() {
                await time.increaseTo(newUnblockDate);
                changeContract = await MockUpgraderContract.new(
                  proxyMockUpgradeable.address,
                  delegator.address,
                  upgradedImplementation.address
                );
                await governor.executeChange(changeContract.address);
                upgradedProxy = await ProxiableMockUpgraded.at(proxyMockUpgradeable.address);
              });
              it('THEN the contract is unblocked again ', async function() {
                await expect(await delegator.isBlocked()).is.false;
              });

              describe('AND  a user asks for the value of the sumOfVars', function() {
                let result;
                beforeEach(async function() {
                  result = await upgradedProxy.methods.sumOfVars().call();
                });
                it('THEN the result is 15', async function() {
                  assertBig(result, toContractBN(15));
                });
              });
            });
          });
        });
      });
    });
  });
  describe('Proxy with Upgradeable Governance - GIVEN a ProxiableMockUpgradeable contract is up', function() {
    let proxyMockUpgradeable;
    beforeEach(async function() {
      proxyMockUpgradeable = await this.project.createProxy(ProxiableMockUpgradeable, {
        initMethod: 'initialize',
        initArgs: []
      });
    });
    describe('AND the admin is set to an BlockableUpgradeDelegator with an already passed unblock date', function() {
      let proxyGovernor;
      let admin;
      let upgradedImplementation;
      let delegator;
      before(async function() {
        upgradedImplementation = await MockUpgradedImplementation.new();
      });
      beforeEach(async function() {
        proxyGovernor = await this.project.createProxy(ProxiableGovernor, {
          initMethod: 'initialize',
          initArgs: [owner]
        });

        admin = await ProxyAdmin.new();
        delegator = await BlockableUpgradeDelegator.new();
        await delegator.initialize(owner, proxyGovernor.address, admin.address, 0);

        await admin.transferOwnership(delegator.address);

        await this.project.changeProxyAdmin(proxyMockUpgradeable.address, admin.address);
        await this.project.changeProxyAdmin(proxyGovernor.address, admin.address);
      });

      describe('WHEN the owner tries to update the governor through governance', function() {
        let changeContract;
        let upgradedGovernorImplementation;

        before(async function() {
          upgradedGovernorImplementation = await UpgradedGovernor.new();
        });
        beforeEach(async function() {
          changeContract = await MockUpgraderGovernance.new(
            proxyGovernor.address,
            delegator.address,
            upgradedGovernorImplementation.address
          );
          await proxyGovernor.methods
            .executeChange(changeContract.address)
            .send({ from: owner, gas: 200000 });
          proxyGovernor = await ProxiableUpgradedGovernor.at(proxyGovernor.address);
        });
        describe('AND  a user asks for the value of the initialized', function() {
          let result;
          beforeEach(async function() {
            result = await proxyGovernor.methods.initialized2().call();
          });
          it('THEN the result is true', async function() {
            await result.should.be.true;
          });
        });
        describe('AND the owner tries to update the contract through the new governance', function() {
          let upgradedProxy;
          let changeContractTwo;

          beforeEach(async function() {
            changeContractTwo = await MockUpgraderContract.new(
              proxyMockUpgradeable.address,
              delegator.address,
              upgradedImplementation.address
            );
            await proxyGovernor.methods
              .executeChange(changeContractTwo.address)
              .send({ from: owner, gas: 200000 });
            upgradedProxy = await ProxiableMockUpgraded.at(proxyMockUpgradeable.address);
          });
          describe('AND  a user asks for the value of the sumOfVars', function() {
            let result;
            beforeEach(async function() {
              result = await upgradedProxy.methods.sumOfVars().call();
            });
            it('THEN the result is 15', async function() {
              assertBig(result, toContractBN(15));
            });
          });
          describe('AND  a user asks for the value of firstVariable', function() {
            let result;
            beforeEach(async function() {
              result = await upgradedProxy.methods.firstVariable().call();
            });
            it('THEN the result changed to 6', async function() {
              assertBig(result, toContractBN(6));
            });
          });
          describe('AND  a user asks for the value of the secondVariable', function() {
            let result;
            beforeEach(async function() {
              result = await upgradedProxy.methods.secondVariable().call();
            });
            it('THEN the result is still 5', async function() {
              assertBig(result, toContractBN(5));
            });
          });
          describe('AND  a user asks for the value of thirdVariable', function() {
            let result;
            beforeEach(async function() {
              result = await upgradedProxy.methods.thirdVariable().call();
            });
            it('THEN the result is 4', async function() {
              assertBig(result, toContractBN(4));
            });
          });
        });
      });
      describe('WHEN the owner tries to update the contract through the basic governance', function() {
        let upgradedProxy;
        let changeContract;

        beforeEach(async function() {
          changeContract = await MockUpgraderContract.new(
            proxyMockUpgradeable.address,
            delegator.address,
            upgradedImplementation.address
          );

          await proxyGovernor.methods
            .executeChange(changeContract.address)
            .send({ from: owner, gas: 200000 });

          upgradedProxy = await ProxiableMockUpgraded.at(proxyMockUpgradeable.address);
        });
        describe('AND  a user asks for the value of the sumOfVars', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.sumOfVars().call();
          });
          it('THEN the result is 15', async function() {
            assertBig(result, toContractBN(15));
          });
        });
        describe('AND  a user asks for the value of firstVariable', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.firstVariable().call();
          });
          it('THEN the result changed to 6', async function() {
            assertBig(result, toContractBN(6));
          });
        });
        describe('AND  a user asks for the value of the secondVariable', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.secondVariable().call();
          });
          it('THEN the result is still 5', async function() {
            assertBig(result, toContractBN(5));
          });
        });
        describe('AND  a user asks for the value of thirdVariable', function() {
          let result;
          beforeEach(async function() {
            result = await upgradedProxy.methods.thirdVariable().call();
          });
          it('THEN the result is 4', async function() {
            assertBig(result, toContractBN(4));
          });
        });
      });
    });
  });

  describe('Proxy with Upgradeable Governance - GIVEN a ProxiableMockUpgradeable contract is up', function() {
    let proxyMockUpgradeable;
    beforeEach(async function() {
      proxyMockUpgradeable = await this.project.createProxy(ProxiableMockUpgradeable, {
        initMethod: 'initialize',
        initArgs: []
      });
    });
    describe('AND the admin is set to an blocked BlockableUpgradeDelegator with a future unblock date', function() {
      let proxyGovernor;
      let admin;
      let upgradedImplementation;
      let delegator;
      let unblockDate;
      const TIME_DELTA = new BN(100);

      before(async function() {
        upgradedImplementation = await MockUpgradedImplementation.new();
      });
      beforeEach(async function() {
        proxyGovernor = await this.project.createProxy(ProxiableGovernor, {
          initMethod: 'initialize',
          initArgs: [owner]
        });

        admin = await ProxyAdmin.new();
        delegator = await BlockableUpgradeDelegator.new();
        unblockDate = (await time.latest()).add(TIME_DELTA);
        await delegator.initialize(owner, proxyGovernor.address, admin.address, unblockDate);

        await admin.transferOwnership(delegator.address);

        await this.project.changeProxyAdmin(proxyMockUpgradeable.address, admin.address);
        // await this.project.changeProxyAdmin(proxyGovernor.address, admin.address);
      });
      it('THEN the contract is blocked', async function() {
        await expect(await delegator.isBlocked()).is.true;
      });

      describe('WHEN the owner tries to update the governor through governance', function() {
        let changeContract;
        let upgradedGovernorImplementation;

        before(async function() {
          upgradedGovernorImplementation = await UpgradedGovernor.new();
        });
        beforeEach(async function() {
          changeContract = await MockUpgraderGovernance.new(
            proxyGovernor.address,
            delegator.address,
            upgradedGovernorImplementation.address
          );
          proxyGovernor = await ProxiableUpgradedGovernor.at(proxyGovernor.address);
        });
      });
    });
  });
});
