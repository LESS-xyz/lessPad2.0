const hre = require("hardhat");

async function main() {
  // We get the contract to deploy
  const AdminContract = hre.ethers.getContractFactory("AdminContract");
  const PresaleFactory = hre.ethers.getContractFactory("PresaleFactory");

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