const chalk = require('chalk');
const version = 'v0.1.0';
const ContractName = "BlockableGovernor";

module.exports = async (hardhat) => {
    const {getNamedAccounts,deployments,getChainId,ethers} = hardhat;
    const {deploy, execute} = deployments;
    const {deployer} = await getNamedAccounts();

    //RSK FIX
    const format = ethers.provider.formatter.formats;
    if (format) format.receipt['root'] = format.receipt['logsBloom']
    Object.assign(ethers.provider.formatter, { format: format });
    const signer = await ethers.provider.getSigner(deployer);
    Object.assign(signer.provider.formatter, { format: format });
    //RSK FIX

    const chainId = parseInt(await getChainId(),10);
    console.log("ChainID: ", chainId);
    
    console.log(chalk.yellow("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"));
    console.log(chalk.yellow("Areopagus Contracts - Deploy Script"));
    console.log(chalk.yellow("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"));

    console.log(`\n Deploying ${ContractName}...`);
    const firstUnblockDate = process.env.UNBLOCK_AT || '20';
    const governorResult = await deploy(ContractName,{
        args:[],
        contract: ContractName,
        from: deployer,
        skipIfAlreadyDeployed: false,
    });

    /*console.log(chalk.yellow("Initializing contract ......"));
    const gov = await deployments.get(ContractName);
    const governorBlock = new ethers.Contract(
        governorResult.address,
        gov.abi,
        signer,
    );
    console.log(governorBlock);

    await governorBlock.initialize(deployer,20);*/


    const governorAddr = governorResult.address;

    console.log(chalk.yellow("\n  Contract Deployment Complete!\n"));
    console.log(chalk.green("  -ContractName                       ", governorAddr));
    console.log(chalk.yellow("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"));

    return true;
};

const id = ContractName + version;
module.exports.tags = [ContractName,version];
module.exports.id = id;