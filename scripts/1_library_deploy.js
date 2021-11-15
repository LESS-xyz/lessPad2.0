// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

require('dotenv').config();
const{FEE_RECEIVER, PANCAKE_SWAP_ROUTER, APE_SWAP_ROUTER, BI_SWAP_ROUTER}=process.env;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const AdminContract = await hre.ethers.getContractFactory("AdminContract");
  const adminContract = await AdminContract.deploy(FEE_RECEIVER);

  await adminContract.deployed();
  await adminContract.addOrRemoveDex(PANCAKE_SWAP_ROUTER, true);
  await adminContract.addOrRemoveDex(APE_SWAP_ROUTER, true);
  await adminContract.addOrRemoveDex(BI_SWAP_ROUTER, true);

  console.log("AdminContract deployed to:", adminContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
