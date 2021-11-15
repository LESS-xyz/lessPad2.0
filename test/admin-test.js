const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect, assert } = require('chai');
const chai = require('chai');
const { expectEvent, expectRevert, makeInterfaceId, time } = require('@openzeppelin/test-helpers');

chai.use(require('chai-bignumber')());

const ZERO = BigNumber.from('0');
const ONE = BigNumber.from('1');
const TWO = BigNumber.from('2');
const THREE = BigNumber.from('3');
const FOUR = BigNumber.from('4');
const FIVE = BigNumber.from('5');
const SIX = BigNumber.from('6');
const SEVEN = BigNumber.from('7');
const EIGHT = BigNumber.from('8');
const NINE = BigNumber.from('9');
const TEN = BigNumber.from('10');
const ONE_HUNDRED = BigNumber.from('100');
const ONE_THOUSAND = BigNumber.from('1000');
const DECIMALS = BigNumber.from('18');
const ONE_TOKEN = TEN.pow(DECIMALS);

describe("AdminContract", function() {
    const accounts = waffle.provider.getWallets();
    const deployer = accounts[0];                      // <- if .connect(account) wasn't provided, account is accounts[0]

    let wethInst, pancakeFactoryInstant, pancakeRouterInstant;

    before("Deploy DEX", async()=>{
        let WETH = await ethers.getContractFactory("WETH");
        let PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        let PancakeRouter = await ethers.getContractFactory("PancakeRouter");

        wethInst = await WETH.deploy();
        pancakeFactoryInstant = await PancakeFactory.deploy(deployer.address);
        pancakeRouterInstant = await PancakeRouter.deploy(pancakeFactoryInstant.address, wethInst.address);
    })
    
    it("All funcs should work", async()=>{
        const AdminContract = await ethers.getContractFactory("AdminContract");
        const adminContract = await AdminContract.deploy(deployer.address);
        await adminContract.deployed();

        await adminContract.addOrRemoveDex(pancakeRouterInstant.address, true);
        assert.equal(await adminContract.getDexRouterEnabled(pancakeRouterInstant.address), true);

        expect(await adminContract.getFeePercOfRaisedFunds()).to.be.equal(TWO);

        let fee = await adminContract.calculateFee(ONE_TOKEN);
        expect(fee).to.be.equal(ONE_TOKEN.mul(TWO).div(ONE_HUNDRED));

        expect(await adminContract.getCreationFee()).to.be.equal(ONE_TOKEN);

        expect(await adminContract.getReceiverFee()).to.be.equal(deployer.address);

        expect(await adminContract.getGeneralMinInvestment()).to.be.equal(ZERO);
        await adminContract.setMinInvestment(ONE_TOKEN.div(TEN));
        expect(await adminContract.getGeneralMinInvestment()).to.be.equal(ONE_TOKEN.div(TEN));

    })
});
