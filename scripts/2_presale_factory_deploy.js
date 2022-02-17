const hre = require("hardhat");

const {CALC1_TEST} = process.env;

async function main() {
  // We get the contract to deploy
  const AdminContract = hre.ethers.getContractFactory("AdminContract");
  //const Calculation1 = await hre.ethers.getContractFactory("Calculation1");
  const PresaleFactory = hre.ethers.getContractFactory("PresaleFactory", {
    libraries: {
        Calculation1: CALC1_TEST
    }
  });

  const adminContract = await AdminContract.deployed();
  const presaleFactory = await PresaleFactory.deploy(adminContract.address);

  console.log("PresaleFactory deployed to:", presaleFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });