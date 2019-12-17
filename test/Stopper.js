const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { expectRevert } = require('openzeppelin-test-helpers');

const Governor = artifacts.require('Governor');
const Stopper = artifacts.require('Stopper');
const MockStoppable = artifacts.require('MockStoppable');
const MakeUnstoppable = artifacts.require('MakeUnstoppable');
const MakeStoppable = artifacts.require('MakeStoppable');
const MockChangeStopper = artifacts.require('MockChangeStopper');

chai.use(chaiAsPromised);
chai.should();

const NOT_AUTHORIZED_CHANGER = 'not_authorized_changer';
const UNSTOPPABLE = 'unstoppable';
const CONTRACT_IS_PAUSED = 'contract_is_paused';
const CONTRACT_IS_ACTIVE = 'contract_is_active';
const NOT_STOPPER = 'not_stopper';

contract('Stopper', function([owner, anAddress, anotherAddress]) {
  const initialValue = anAddress;
  const changeValue = anotherAddress;
  const deployMultipleStopTestContracts = async function(
    amountOfStoppableContracts,
    startStoppable = true
  ) {
    const stopper = await Stopper.new();
    await stopper.initialize(owner);
    const governor = await Governor.new();
    governor.initialize(owner);
    const stoppableContractsPromises = [];
    for (let i = 0; i < amountOfStoppableContracts; i++) {
      stoppableContractsPromises.push(MockStoppable.new());
    }
    const stoppableContracts = await Promise.all(stoppableContractsPromises);
    const initializePromises = stoppableContracts.map(it =>
      it.initialize(stopper.address, governor.address, startStoppable, initialValue)
    );
    await Promise.all(initializePromises);

    return {
      stopper,
      governor,
      stoppableContracts
    };
  };
  const deployStopTestContracts = async function(startStoppable = true) {
    const { stoppableContracts, ...otherContracts } = await deployMultipleStopTestContracts(
      1,
      startStoppable
    );
    const [mockStoppable] = stoppableContracts;
    return {
      mockStoppable,
      ...otherContracts
    };
  };

  describe('GIVEN there is an ecosystem with a stopper and an unpaused contract that starts as unstoppable', function() {
    it('THEN the contract is unstoppable', async function() {
      const startStoppable = false;
      const { mockStoppable } = await deployStopTestContracts(startStoppable);

      await expect(await mockStoppable.stoppable()).to.be.false;
    });
    describe('WHEN an authorized member tries to stop a contract', function() {
      it('THEN the tx fails', async function() {
        const startStoppable = false;
        const { mockStoppable, stopper } = await deployStopTestContracts(startStoppable);

        expectRevert(stopper.pause(mockStoppable.address), UNSTOPPABLE);
      });
    });
  });
  describe('GIVEN there is an ecosystem with a stopper and an unpaused contract', function() {
    describe('WHEN an authorized member tries to stop a contract', function() {
      it('THEN the contract is paused', async function() {
        const { mockStoppable, stopper } = await deployStopTestContracts();

        await stopper.pause(mockStoppable.address);

        await expect(await mockStoppable.paused()).to.be.true;
      });
    });

    describe('WHEN an authorized member tries to make one unstoppable without going through governance', function() {
      it('THEN the tx fails', async function() {
        const { mockStoppable } = await deployStopTestContracts();
        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);
        await expectRevert(mockMakeUnstoppableContract.execute(), NOT_AUTHORIZED_CHANGER);
      });
    });

    describe('WHEN an authorized member tries to make one unstoppable going through governance', function() {
      it('THEN the contract is made unstoppable', async function() {
        const { mockStoppable, governor } = await deployStopTestContracts();
        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);

        await governor.executeChange(mockMakeUnstoppableContract.address);

        await expect(await mockStoppable.stoppable()).to.be.false;
      });
    });

    describe('WHEN another stopper tries to pause a contract', function() {
      it('THEN the tx fails', async function() {
        const { mockStoppable } = await deployStopTestContracts();

        const newStopper = await Stopper.new();
        await newStopper.initialize(owner);

        await expectRevert(newStopper.pause(mockStoppable.address), NOT_STOPPER);
      });
    });

    describe('WHEN an authorized member tries to make a paused contract unstoppable', function() {
      it('THEN the contract keeps being paused', async function() {
        const { mockStoppable, stopper, governor } = await deployStopTestContracts();
        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);

        await stopper.pause(mockStoppable.address);

        await governor.executeChange(mockMakeUnstoppableContract.address);

        await expect(await mockStoppable.paused()).to.be.true;
      });
      it('THEN the txs fail', async function() {
        const { mockStoppable, stopper, governor } = await deployStopTestContracts();
        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);

        await stopper.pause(mockStoppable.address);

        await governor.executeChange(mockMakeUnstoppableContract.address);

        await expectRevert(mockStoppable.setProtectedParam(changeValue), CONTRACT_IS_PAUSED);
      });
    });

    describe('WHEN an authorized member tries to make one contract unstoppable going through governance', function() {
      it('THEN the contract is not pausable', async function() {
        const { mockStoppable, governor } = await deployStopTestContracts();
        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);

        await governor.executeChange(mockMakeUnstoppableContract.address);

        await expectRevert(mockStoppable.pause(), UNSTOPPABLE);
      });
    });

    describe('WHEN an authorized member tries to make one contract unstoppable and then stoppable again going through governance', function() {
      it('THEN the contract is pausable', async function() {
        const { mockStoppable, stopper, governor } = await deployStopTestContracts();

        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);
        await governor.executeChange(mockMakeUnstoppableContract.address);

        const mockMakeStoppableContract = await MakeStoppable.new(mockStoppable.address);
        await governor.executeChange(mockMakeStoppableContract.address);

        await stopper.pause(mockStoppable.address);

        await expect(await mockStoppable.paused()).to.be.true;
      });
    });

    describe('WHEN an authorized member tries to make one paused contract unstoppable and then stoppable again going through governance', function() {
      it('THEN the contract is still paused', async function() {
        const { mockStoppable, stopper, governor } = await deployStopTestContracts();

        await stopper.pause(mockStoppable.address);

        const mockMakeUnstoppableContract = await MakeUnstoppable.new(mockStoppable.address);
        await governor.executeChange(mockMakeUnstoppableContract.address);

        const mockMakeStoppableContract = await MakeStoppable.new(mockStoppable.address);
        await governor.executeChange(mockMakeStoppableContract.address);

        await expect(await mockStoppable.paused()).to.be.true;
      });
    });

    describe('WHEN an authorized member transfers the stopper authorization', function() {
      it('THEN the new stopper is able to pause the contract', async function() {
        const { mockStoppable, governor } = await deployStopTestContracts();

        const newStopper = await Stopper.new({ from: anAddress });
        await newStopper.initialize(anAddress);

        const mockChangeStopper = await MockChangeStopper.new(
          mockStoppable.address,
          newStopper.address
        );

        await governor.executeChange(mockChangeStopper.address);

        await newStopper.pause(mockStoppable.address, { from: anAddress });

        await expect(await mockStoppable.paused()).to.be.true;
      });
    });

    describe('WHEN an authorized member transfers the stopper authorization', function() {
      it('THEN the old stopper is NOT able to pause the contract', async function() {
        const { mockStoppable, governor, stopper } = await deployStopTestContracts();

        const newStopper = await Stopper.new();
        await newStopper.initialize(anAddress);

        const mockChangeStopper = await MockChangeStopper.new(
          mockStoppable.address,
          newStopper.address
        );

        await governor.executeChange(mockChangeStopper.address);

        await expectRevert(stopper.pause(mockStoppable.address), NOT_STOPPER);
      });
    });

    describe('WHEN an unauthorized member tries to stop a contract', function() {
      it('THEN the tx fails', async function() {
        const { mockStoppable, stopper } = await deployStopTestContracts();

        await expectRevert.unspecified(stopper.pause(mockStoppable.address, { from: anAddress }));
      });
    });

    describe('WHEN an authorized member tries to unpause the contract', function() {
      it('THEN the tx fails', async function() {
        const { mockStoppable, stopper } = await deployStopTestContracts();

        await expectRevert(stopper.unpause(mockStoppable.address), CONTRACT_IS_ACTIVE);
      });
    });

    describe('AND a contract was already stopped', function() {
      describe('WHEN an authorized user tries to pause it again', function() {
        it('THEN the tx fails', async function() {
          const { mockStoppable, stopper } = await deployStopTestContracts();

          await stopper.pause(mockStoppable.address);

          await expectRevert(stopper.pause(mockStoppable.address), CONTRACT_IS_PAUSED);
        });
      });

      describe('WHEN someone tries to execute a protected function', function() {
        it('THEN the tx fails', async function() {
          const { mockStoppable, stopper } = await deployStopTestContracts();

          await stopper.pause(mockStoppable.address);

          await expectRevert(mockStoppable.setProtectedParam(changeValue), CONTRACT_IS_PAUSED);
        });
      });

      describe('WHEN someone tries to unpause it', function() {
        it('THEN the tx succeds and the contract is unpaused', async function() {
          const { mockStoppable, stopper } = await deployStopTestContracts();

          await stopper.pause(mockStoppable.address);
          await stopper.unpause(mockStoppable.address);

          await expect(await mockStoppable.paused()).to.be.false;
        });
      });

      describe('WHEN an unauthorized member tries to unstop the contract', function() {
        it('THEN the tx fails', async function() {
          const { mockStoppable, stopper } = await deployStopTestContracts();

          await stopper.pause(mockStoppable.address);

          await expectRevert.unspecified(stopper.pause(mockStoppable.address, { from: anAddress }));
        });
      });
    });
  });
  describe('GIVEN there is an ecosystem with a stopper and two unpaused contract', function() {
    describe('WHEN an authorized user pauses one', function() {
      let stoppedContract;
      let activeContract;
      let stopper;
      beforeEach(async function() {
        let stoppableContracts;
        ({ stoppableContracts, stopper } = await deployMultipleStopTestContracts(2));
        [stoppedContract, activeContract] = stoppableContracts;
        await stopper.pause(stoppedContract.address);
      });
      it('THEN that one is paused', async function() {
        await expect(await stoppedContract.paused()).to.be.true;
      });

      it('THEN the other keeps unpaused', async function() {
        await expect(await activeContract.paused()).to.be.false;
      });
    });
  });
});
