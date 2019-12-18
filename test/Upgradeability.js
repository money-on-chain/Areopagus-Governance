const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();
const { assertBig, toContractBN } = require('./mocHelper');

ZWeb3.initialize(web3.currentProvider);

const MockUpgradedImplementation = artifacts.require('MockUpgraded');
const MockUpgraderContract = artifacts.require('MockUpgraderContract');
const MockUpgraderGovernance = artifacts.require('MockUpgraderContract');
const ProxyAdmin = artifacts.require('ProxyAdmin');
const UpgradeDelegator = artifacts.require('UpgradeDelegator');
const Governor = artifacts.require('Governor');
const UpgradedGovernor = artifacts.require('MockUpgradedGovernor');

const ProxiableUpgradedGovernor = Contracts.getFromLocal('MockUpgradedGovernor');
const ProxiableGovernor = Contracts.getFromLocal('Governor');
const ProxiableMockUpgraded = Contracts.getFromLocal('MockUpgraded');
const ProxiableMockUpgradeable = Contracts.getFromLocal('MockUpgradeable');

contract('Upgradeability', function([owner]) {
  // eslint-disable-next-line mocha/no-top-level-hooks
  beforeEach(async function() {
    this.project = await TestHelper();
    this.project.txParams.gas = 4e6;
  });
  describe('Proxy without Governance - GIVEN a ProxiableMockUpgradeable contract is up', function() {
    let proxyMockUpgradeable;
    beforeEach(async function() {
      proxyMockUpgradeable = await this.project.createProxy(ProxiableMockUpgradeable, {
        initMethod: 'initialize',
        initArgs: []
      });
    });
    describe('WHEN a user asks for the value of the sumOfVars', function() {
      let result;
      beforeEach(async function() {
        result = await proxyMockUpgradeable.methods.sumOfVars().call();
      });
      it('THEN the result is 9', async function() {
        assertBig(result, toContractBN(9));
      });
    });

    describe('WHEN a user asks for the value of firstVariable', function() {
      let result;
      beforeEach(async function() {
        result = await proxyMockUpgradeable.methods.firstVariable().call();
      });
      it('THEN the result is 4', async function() {
        assertBig(result, toContractBN(4));
      });
    });

    describe('WHEN a user asks for the value of secondVariable', function() {
      let result;
      beforeEach(async function() {
        result = await proxyMockUpgradeable.methods.secondVariable().call();
      });
      it('THEN the result is 5', async function() {
        assertBig(result, toContractBN(5));
      });
    });

    describe('WHEN someone updates the contract', function() {
      beforeEach(async function() {
        proxyMockUpgradeable = await this.project.upgradeProxy(
          proxyMockUpgradeable.address,
          ProxiableMockUpgraded,
          {
            initMethod: 'initialize2',
            initArgs: []
          }
        );
      });
      describe('AND  a user asks for the value of the sumOfVars', function() {
        let result;
        beforeEach(async function() {
          result = await proxyMockUpgradeable.methods.sumOfVars().call();
        });
        it('THEN the result is 15', async function() {
          assertBig(result, toContractBN(15));
        });
      });
      describe('AND  a user asks for the value of firstVariable', function() {
        let result;
        beforeEach(async function() {
          result = await proxyMockUpgradeable.methods.firstVariable().call();
        });
        it('THEN the result changed to 6', async function() {
          assertBig(result, toContractBN(6));
        });
      });
      describe('AND  a user asks for the value of the secondVariable', function() {
        let result;
        beforeEach(async function() {
          result = await proxyMockUpgradeable.methods.secondVariable().call();
        });
        it('THEN the result is still 5', async function() {
          assertBig(result, toContractBN(5));
        });
      });
      describe('AND  a user asks for the value of thirdVariable', function() {
        let result;
        beforeEach(async function() {
          result = await proxyMockUpgradeable.methods.thirdVariable().call();
        });
        it('THEN the result is 4', async function() {
          assertBig(result, toContractBN(4));
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
    describe('AND the admin is set to an UpgradeDelegator', function() {
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
        delegator = await UpgradeDelegator.new();
        await delegator.initialize(governor.address, admin.address);

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
  describe('Proxy with Upgradeable Governance - GIVEN a ProxiableMockUpgradeable contract is up', function() {
    let proxyMockUpgradeable;
    beforeEach(async function() {
      proxyMockUpgradeable = await this.project.createProxy(ProxiableMockUpgradeable, {
        initMethod: 'initialize',
        initArgs: []
      });
    });
    describe('AND the admin is set to an UpgradeDelegator', function() {
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
        delegator = await UpgradeDelegator.new();
        await delegator.initialize(proxyGovernor.address, admin.address);

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
});
