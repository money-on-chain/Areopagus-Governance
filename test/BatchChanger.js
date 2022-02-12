const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { expectRevert } = require('openzeppelin-test-helpers');

const Governor = artifacts.require('Governor');
const MockGoverned = artifacts.require('MockGoverned');
const BatchChanger = artifacts.require('BatchChanger');

chai.use(chaiAsPromised);
chai.should();

contract('BatchChanger', function([owner, anAddress, anotherAddress]) {
  describe('WHEN an authorized member tries and executes a change through the governor', function() {
    it('THEN the change takes effect', async function() {
      const initialValue = anAddress;
      const changeValue = anotherAddress;
      const changeSecondValue = 1234;
      const governor = await Governor.new();
      governor.initialize(owner);
      const mockGoverned = await MockGoverned.new(initialValue);
      await mockGoverned.initialize(governor.address);

      const batchChangerContract = await BatchChanger.new();
      const ownerBatch = await batchChangerContract.owner();
      await expect(owner).to.equal(ownerBatch);

      const targets = [];
      const datas = [];

      const setFirstParamData = mockGoverned.contract.methods
        .setProtectedParam(changeValue)
        .encodeABI();
      targets.push(mockGoverned.address);
      datas.push(setFirstParamData);

      const setSecondParamData = mockGoverned.contract.methods
        .setProtectedParamUint(changeSecondValue)
        .encodeABI();
      targets.push(mockGoverned.address);
      datas.push(setSecondParamData);

      // Save the transactions to be executed as a batch
      await batchChangerContract.schedule(targets, datas);

      // Execute in a single transaction the batched transactions
      await governor.executeChange(batchChangerContract.address);

      await expect(await mockGoverned.protectedParam()).to.equal(changeValue);
      await expect((await mockGoverned.protectedParamUint()).toString()).to.equal(
        changeSecondValue.toString()
      );

      await expect((await batchChangerContract.targetsToExecuteLength()).toString()).to.equal('0');
      await expect((await batchChangerContract.datasToExecuteLength()).toString()).to.equal('0');
    });
  });

  describe('WHEN an unauthorized member tries to add a transaction to the batch', function() {
    it('THEN then rejects the tx', async function() {
      const initialValue = anAddress;
      const changeValue = anotherAddress;
      const governor = await Governor.new();
      governor.initialize(owner);
      const mockGoverned = await MockGoverned.new(initialValue);
      await mockGoverned.initialize(governor.address);

      const batchChangerContract = await BatchChanger.new();
      const targets = [];
      const datas = [];

      const setFirstParamData = await mockGoverned.contract.methods
        .setProtectedParam(changeValue)
        .encodeABI();
      targets.push(mockGoverned.address);
      datas.push(setFirstParamData);

      await expectRevert(
        batchChangerContract.schedule(targets, datas, { from: anAddress }),
        'Ownable: caller is not the owner'
      );
      
    });
  });
});
