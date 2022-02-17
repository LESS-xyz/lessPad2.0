const hre = require("hardhat");

require('dotenv').config();
const{
  FEE_RECEIVER, 
  PANCAKE_SWAP_ROUTER, 
  APE_SWAP_ROUTER, 
  BI_SWAP_ROUTER,
  BSC_ROUTER_TEST,
  CALC1
} = process.env;

async function main() {

    const AdminContract = await hre.ethers.getContractFactory("AdminContract");
    const PresaleFactory = await hre.ethers.getContractFactory("PresaleFactory", {
        libraries: {
            Calculation1: CALC1
        }
      }
    );
    const Presale = await hre.ethers.getContractFactory("Presale");

    const adminContract = await AdminContract.deploy(FEE_RECEIVER, {gasLimit: 770000});
    await adminContract.deployed();

    await adminContract.addOrRemoveDex(PANCAKE_SWAP_ROUTER, true, {gasLimit: 95000});
    await adminContract.addOrRemoveDex(APE_SWAP_ROUTER, true, {gasLimit: 100000});
    await adminContract.addOrRemoveDex(BI_SWAP_ROUTER, true, {gasLimit: 100000});

    console.log("AdminContract deployed to:", adminContract.address);

    const factory = await PresaleFactory.deploy(adminContract.address, {gasLimit: 1230000});

    console.log("PresaleFactory deployed to:", factory.address);

    const presaleMaster = await Presale.deploy(adminContract.address, factory.address, {gasLimit: 2510000});
    await factory.setPresaleMaster(presaleMaster.address, {gasLimit: 50000});

    await adminContract.transferOwnership(FEE_RECEIVER, {gasLimit: 31000});

    console.log("PresaleMaster deployed to:", presaleMaster.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });

