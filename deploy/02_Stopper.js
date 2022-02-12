const chalk = require('chalk');
const version = 'v0.1.0';
const ContractName = "Stopper";

module.exports = async (hardhat) => {
    const {getNamedAccounts,deployments,getChainId,ethers} = hardhat;
    const {deploy} = deployments;
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
    
    console.log(chalk.yellow("Areopagus Contracts - Deploy Script"));

    console.log(`\n Deploying ${ContractName}...`);
    const stopperResult = await deploy(ContractName,{
        args:[],
        contract: ContractName,
        from: deployer,
        skipIfAlreadyDeployed: false,
    });

    const stopperAddr = stopperResult.address;

    console.log(chalk.yellow("\n  Contract Deployment Complete!\n"));
    console.log(chalk.green("  -ContractName                       ", stopperAddr));
    console.log(chalk.yellow("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"));

    return true;
};

const id = ContractName + version;
module.exports.tags = [ContractName,version];
module.exports.id = id;