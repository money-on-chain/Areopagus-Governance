const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { expectRevert } = require('openzeppelin-test-helpers');

const Governor = artifacts.require('Governor');
const MockGoverned = artifacts.require('MockGoverned');
const MockChangeContract = artifacts.require('MockChangeContract');

chai.use(chaiAsPromised);
chai.should();

const NOT_AUTHORIZED_CHANGER = 'not_authorized_changer';

contract('Governance', function([owner, anAddress, anotherAddress]) {
  describe('GIVEN there is an ecosystem with governance', function() {
    describe('WHEN an authorized member tries and executes a change through the governor', function() {
      it('THEN the change takes effect', async function() {
        const initialValue = anAddress;
        const changeValue = anotherAddress;
        const governor = await Governor.new();
        governor.initialize(owner);
        const mockGoverned = await MockGoverned.new(initialValue);
        await mockGoverned.initialize(governor.address);
        const mockChangeContract = await MockChangeContract.new(mockGoverned.address, changeValue);
        await governor.executeChange(mockChangeContract.address);
        await expect(await mockGoverned.protectedParam()).to.equal(changeValue);
      });
    });

    describe('WHEN an unauthorized member tries to execute a change through the governor', function() {
      it('THEN the governor rejects the tx', async function() {
        const initialValue = anAddress;
        const changeValue = anotherAddress;
        const governor = await Governor.new();
        governor.initialize(owner);
        const mockGoverned = await MockGoverned.new(initialValue);
        await mockGoverned.initialize(governor.address);
        const mockChangeContract = await MockChangeContract.new(mockGoverned.address, changeValue);

        await expectRevert.unspecified(
          governor.executeChange(mockChangeContract.address, {
            from: anAddress
          })
        );
      });
    });

    describe('WHEN a contract tries to be executed without going through the governor', function() {
      it('THEN the governed rejects the tx', async function() {
        const initialValue = anAddress;
        const changeValue = anotherAddress;
        const governor = await Governor.new();
        governor.initialize(owner);
        const mockGoverned = await MockGoverned.new(initialValue);
        await mockGoverned.initialize(governor.address);
        const mockChangeContract = await MockChangeContract.new(mockGoverned.address, changeValue);

        await expectRevert(mockChangeContract.execute({ from: owner }), NOT_AUTHORIZED_CHANGER);
      });
    });

    describe('AND that a change contract was executed', function() {
      describe('WHEN a contract tries to be executed again after being going through the governor', function() {
        it('THEN the governed rejects the tx anyway', async function() {
          const initialValue = anAddress;
          const changeValue = anotherAddress;
          const governor = await Governor.new();
          governor.initialize(owner);
          const mockGoverned = await MockGoverned.new(initialValue);
          await mockGoverned.initialize(governor.address);
          const mockChangeContract = await MockChangeContract.new(
            mockGoverned.address,
            changeValue
          );

          await governor.executeChange(mockChangeContract.address);

          await expectRevert(mockChangeContract.execute({ from: owner }), NOT_AUTHORIZED_CHANGER);
        });
      });
    });
  });
});
