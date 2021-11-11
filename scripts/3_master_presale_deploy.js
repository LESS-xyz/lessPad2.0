const hre = require("hardhat");

async function main() {
  // We get the contract to deploy
  const Presale = await hre.ethers.getContractFactory("Presale");
  const AdminContract = hre.ethers.getContractFactory("AdminContract");
  const PresaleFactory = hre.ethers.getContractFactory("PresaleFactory");

  const adminContract = await AdminContract.deployed();
  const presaleFactory = await PresaleFactory.deployed();
  const presaleMaster = await Presale.deploy(adminContract.address, presaleFactory.address);

  await presaleFactory.setPresaleMaster(presaleMaster.address);

  console.log("PresaleMaster deployed to:", presaleMaster.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });