const { ethers, waffle } = require('hardhat');
const provider = waffle.provider;
const { BigNumber } = require('ethers');
const { expect, assert } = require('chai');
const chai = require('chai');
const { constants, expectEvent, expectRevert, makeInterfaceId, time } = require('@openzeppelin/test-helpers');

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

describe("Presale", function() {
    const accounts = waffle.provider.getWallets();
    const deployer = accounts[0];                      // <- if .connect(account) wasn't provided, account is accounts[0]
    const feeReceiver = accounts[4];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];

    let wethInst, pancakeFactoryInstant, pancakeRouterInstant, adminContract, factory, presaleMaster, testToken, calcLibrary;

    before("Deploy DEX, Admin Contract, Factory Contract, Presale Master Contract", async()=>{
        let WETH = await ethers.getContractFactory("WETH");
        let PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        let PancakeRouter = await ethers.getContractFactory("PancakeRouter");

        wethInst = await WETH.deploy();
        pancakeFactoryInstant = await PancakeFactory.deploy(deployer.address);
        pancakeRouterInstant = await PancakeRouter.deploy(pancakeFactoryInstant.address, wethInst.address);

        const AdminContract = await ethers.getContractFactory("AdminContract");
        adminContract = await AdminContract.deploy(feeReceiver.address);
        await adminContract.deployed();

        await adminContract.setMinInvestment(ONE_TOKEN.div(TEN));
        await adminContract.addOrRemoveDex(pancakeRouterInstant.address, true);

        const Calculation1 = await ethers.getContractFactory("Calculation1");
        calcLibrary = await Calculation1.deploy();

        const PresaleFactory = await ethers.getContractFactory("PresaleFactory", {
            libraries: {
                Calculation1: calcLibrary.address
            }
        });
        factory = await PresaleFactory.deploy(adminContract.address);
        await factory.deployed();

        const Presale = await ethers.getContractFactory("Presale");
        presaleMaster = await Presale.deploy(adminContract.address, factory.address);

        await factory.setPresaleMaster(presaleMaster.address);

        const TestToken = await ethers.getContractFactory("TestToken");
        testToken = await TestToken.connect(user1).deploy("Test Token", "TEST");
        await testToken.deployed();
    })

    it("Should create correct presale", async()=>{
        await testToken.connect(user1).approve(factory.address, ONE_TOKEN.mul(ONE_THOUSAND).add(ONE_HUNDRED.mul(TWO).add(TEN.mul(FIVE)).mul(ONE_TOKEN)));
        const balanceBeforeFee = await provider.getBalance(feeReceiver.address);
        let nowTimestamp = await time.latest();
        let info = {
            tokenAddress: testToken.address,
            tokenPriceInWei: ONE_TOKEN.div(ONE_HUNDRED),
            hardCapInWei: TEN.mul(ONE_TOKEN),
            softCapInWei: FIVE.mul(ONE_TOKEN),
            openTime: BigNumber.from(nowTimestamp.add(time.duration.days(1)).toString()),
            closeTime: BigNumber.from(nowTimestamp.add(time.duration.days(2)).toString()),
            minInvestment: ONE_TOKEN.div(TEN),
            maxInvestment: ONE_TOKEN.mul(TEN)
        }
        console.log(info);
        let dexInfo = {
            dex : pancakeRouterInstant.address,
            listingPriceInWei: ONE_TOKEN.mul(TWO).div(ONE_HUNDRED),
            lpTokensLockDurationInDays: TEN.mul(THREE),
            liquidityPercentageAllocation: TEN.mul(FIVE),
            liquidityAllocationTime: BigNumber.from(nowTimestamp.add(time.duration.days(3)).toString())
        }
        console.log(dexInfo);
        let certInfo = {
            liquidity: true,
            vesting: TEN,
            whitelist: [user1.address, user2.address, user3.address]
        }
        console.log(certInfo);
        let name = "Test Presale";
        let stringInfo = {
            saleTitle: ethers.utils.formatBytes32String(name),
            linkTelegram: ethers.utils.formatBytes32String("https://t.me/TestPresale"),
            linkGithub: ethers.utils.formatBytes32String("https://github.com/TestPresale"),
            linkTwitter: ethers.utils.formatBytes32String("https://twitter.com/TestPresale"),
            linkWebsite: ethers.utils.formatBytes32String("https://website.com/TestPresale"),
            linkLogo: "https://cdn.logo.com/hotlink-ok/logo-social.png",
            description: "Test Presale description",
            whitepaper: "https://uniswap.org/whitepaper.pdf"
        }
        console.log(stringInfo);
        await factory.connect(user1).createPresale(info, dexInfo, stringInfo, certInfo, {value: ONE_TOKEN});
        const balanceAfterFee = await provider.getBalance(feeReceiver.address);
        //FEE
        expect(balanceAfterFee.sub(balanceBeforeFee)).to.be.equal(ONE_TOKEN);

        //INITIAL PARAMS EQUALS
        const presaleAddress = await factory.presales(ZERO);
        const Presale = await ethers.getContractFactory("Presale");
        const presaleInst = Presale.attach(presaleAddress);

        const contractTestBalance = await testToken.balanceOf(presaleAddress);
        expect(contractTestBalance).to.be.equal((ONE_THOUSAND.add(TWO.mul(ONE_HUNDRED)).add(FIVE.mul(TEN))).mul(ONE_TOKEN));

        /* address tokenAddress;
        uint256 tokenPriceInWei;
        uint256 hardCapInWei;
        uint256 softCapInWei;
        uint256 openTime;
        uint256 closeTime;
        uint256 minInvestment;
        uint256 maxInvestment; */
        let contractGeneralInfo = await presaleInst.generalInfo.call();
        assert.equal(contractGeneralInfo.tokenAddress, testToken.address);
        expect(contractGeneralInfo.tokenPriceInWei).to.be.equal(info.tokenPriceInWei);
        expect(contractGeneralInfo.hardCapInWei).to.be.equal(info.hardCapInWei);
        expect(contractGeneralInfo.softCapInWei).to.be.equal(info.softCapInWei);
        expect(contractGeneralInfo.openTime).to.be.equal(info.openTime);
        expect(contractGeneralInfo.closeTime).to.be.equal(info.closeTime);
        expect(contractGeneralInfo.minInvestment).to.be.equal(info.minInvestment);
        expect(contractGeneralInfo.maxInvestment).to.be.equal(info.maxInvestment);

        /* bool withdrawedFunds;
        bool liquidityAdded;
        address creator;
        address lpAddress;
        uint256 lpAmount;
        uint256 lpUnlockTime;
        uint256 beginingAmount;
        uint256 tokensForSaleLeft;
        uint256 tokensForLiquidityLeft;
        uint256 raisedAmount;
        uint256 participants; */
        let contractIntermediate = await presaleInst.intermediate.call();
        assert.equal(contractIntermediate.withdrawedFunds, false);
        assert.equal(contractIntermediate.liquidityAdded, false);
        assert.equal(contractIntermediate.creator, user1.address);
        assert.equal(contractIntermediate.lpAddress, constants.ZERO_ADDRESS);
        expect(contractIntermediate.lpAmount).to.be.equal(ZERO);
        expect(contractIntermediate.lpUnlockTime).to.be.equal(ZERO);
        expect(contractIntermediate.beginingAmount).to.be.equal(ONE_THOUSAND.mul(ONE_TOKEN));
        expect(contractIntermediate.tokensForSaleLeft).to.be.equal(ONE_THOUSAND.mul(ONE_TOKEN));
        expect(contractIntermediate.tokensForLiquidityLeft).to.be.equal((TWO.mul(ONE_HUNDRED).add(FIVE.mul(TEN))).mul(ONE_TOKEN));
        expect(contractIntermediate.raisedAmount).to.be.equal(ZERO);
        expect(contractIntermediate.participants).to.be.equal(ZERO);

        /* address dex;
        uint256 listingPriceInWei;
        uint256 lpTokensLockDurationInDays;
        uint8 liquidityPercentageAllocation;
        uint256 liquidityAllocationTime; */
        let dexContractInfo = await presaleInst.dexInfo.call();
        assert.equal(dexContractInfo.dex, pancakeRouterInstant.address);
        expect(dexContractInfo.listingPriceInWei).to.be.equal(dexInfo.listingPriceInWei);
        expect(dexContractInfo.lpTokensLockDurationInDays).to.be.equal(dexInfo.lpTokensLockDurationInDays);
        expect(dexContractInfo.liquidityPercentageAllocation).to.be.equal(dexInfo.liquidityPercentageAllocation);
        expect(dexContractInfo.liquidityAllocationTime).to.be.equal(dexInfo.liquidityAllocationTime);

        /* bool liquidity;
        uint8 vesting;
        address[] whitelist; */
        let certifiedContractInfo = await presaleInst.certifiedAddition.call();
        assert.equal(certifiedContractInfo.liquidity, true);
        expect(certifiedContractInfo.vesting).to.be.equal(TEN);
        assert.equal(await presaleInst.whitelist(user2.address), true);
        assert.equal(await presaleInst.whitelist(user3.address), true);
        assert.equal(await presaleInst.whitelist(user1.address), false);

        /* bytes32 saleTitle;
        bytes32 linkTelegram;
        bytes32 linkGithub;
        bytes32 linkTwitter;
        bytes32 linkWebsite;
        string linkLogo;
        string description;
        string whitepaper; */
        let stringContractInfo = await presaleInst.stringInfo.call();
        assert.equal(stringContractInfo.saleTitle, stringInfo.saleTitle);
        assert.equal(stringContractInfo.linkTelegram, stringInfo.linkTelegram);
        assert.equal(stringContractInfo.linkGithub, stringInfo.linkGithub);
        assert.equal(stringContractInfo.linkTwitter, stringInfo.linkTwitter);
        assert.equal(stringContractInfo.linkWebsite, stringInfo.linkWebsite);
        assert.equal(stringContractInfo.linkLogo, stringInfo.linkLogo);
        assert.equal(stringContractInfo.description, stringInfo.description);
        assert.equal(stringContractInfo.whitepaper, stringInfo.whitepaper);
    })

    it("Should buy/withdraw TestTokens, add liquidity, collect raised funds", async()=>{
        const presaleAddress = await factory.presales(ZERO);
        const Presale = await ethers.getContractFactory("Presale");
        const presaleInst = Presale.attach(presaleAddress);
        await expectRevert(presaleInst.connect(user2).invest({value: ONE_TOKEN}), "TIME");
        await time.increase(time.duration.days(1));
        await expectRevert(presaleInst.connect(user2).invest({value: ONE_TOKEN.div(ONE_THOUSAND)}), "MIN/MAX INVESTMENT");
        
        let balance = await testToken.balanceOf(user2.address);
        expect(balance).to.be.equal(ZERO);
        await presaleInst.connect(user2).invest({value: ONE_TOKEN.div(TWO)});
        balance = await testToken.balanceOf(user2.address);
        expect(balance).to.be.equal(ZERO);
        let reservedTokens = await presaleInst.investments(user2.address);
        expect(reservedTokens.amountTokens).to.be.equal(ethers.utils.parseEther('50'))

        await expectRevert(presaleInst.connect(user1).invest({value: ONE_TOKEN}), "NOT ACCESS");

        await presaleInst.connect(user2).invest({value: THREE.mul(ONE_TOKEN)});
        expect(await provider.getBalance(presaleAddress)).to.be.equal(ethers.utils.parseEther('3.5'))
        reservedTokens = await presaleInst.investments(user2.address);
        expect(reservedTokens.amountTokens).to.be.equal(ethers.utils.parseEther('350'))
        let balanceBefore = await provider.getBalance(user2.address);
        await presaleInst.connect(user2).withdrawInvestment(TWO.mul(ONE_TOKEN));
        balance = await provider.getBalance(user2.address);

        let difference = ethers.utils.formatEther((balance.sub(balanceBefore)).toString());
        difference = Math.ceil(difference);
        assert.equal(difference, TWO);

        await expectRevert(presaleInst.connect(user2).invest({value: TEN.mul(ONE_TOKEN)}), "MIN/MAX INVESTMENT");
        await expectRevert(presaleInst.connect(user3).invest({value: TEN.mul(ONE_TOKEN)}), "N.E.");
        await expectRevert(presaleInst.connect(user3).withdrawInvestment(ONE), "N.E.");

        let contractIntermediate = await presaleInst.intermediate.call();
        expect(contractIntermediate.raisedAmount).to.be.equal(ONE_TOKEN.add(ONE_TOKEN.div(TWO)));
        expect(contractIntermediate.tokensForSaleLeft).to.be.equal(ethers.utils.parseEther('850'));

        await presaleInst.connect(user3).invest({value: FIVE.mul(ONE_TOKEN)});
        
        await expectRevert(presaleInst.connect(user3).withdrawInvestment(ONE), "S.L");
        await expectRevert(presaleInst.connect(user2).withdrawInvestment(ONE), "S.L");

        await time.increase(time.duration.days(1));

        await expectRevert(presaleInst.connect(user2).invest({value: ONE_TOKEN}), "TIME");

        await expectRevert(presaleInst.connect(user2).claimTokens(), "LIQ");
        await expectRevert(presaleInst.connect(user1).addLiquidity(), "WRONG PARAMS");
        await expectRevert(presaleInst.connect(user1).collectFundsRaised(), "LIQ");

        await time.increase(time.duration.days(1));

        contractIntermediate = await presaleInst.intermediate.call();

        let liqTokensLeftBefore = contractIntermediate.tokensForLiquidityLeft;
        expect(liqTokensLeftBefore).to.be.equal(ethers.utils.parseEther('250'));

        await presaleInst.connect(user1).addLiquidity();
        contractIntermediate = await presaleInst.intermediate.call();
        assert.equal(contractIntermediate.liquidityAdded, true);
        assert.notEqual(contractIntermediate.lpAddress, constants.ZERO_ADDRESS);
        let dexContractInfo = await presaleInst.dexInfo.call();
        expect(contractIntermediate.raisedAmount).to.be.equal(ethers.utils.parseEther('6.5'));
        let expectedEthAmt = contractIntermediate.raisedAmount.mul(dexContractInfo.liquidityPercentageAllocation).div(ONE_HUNDRED);
        let expectedTokenAmt = expectedEthAmt.mul(ONE_TOKEN).div(dexContractInfo.listingPriceInWei);
        expect(expectedTokenAmt).to.be.equal(ethers.utils.parseEther('162.5'));
        expect(await provider.getBalance(presaleAddress)).to.be.equal(contractIntermediate.raisedAmount.sub(expectedEthAmt));
        expect(contractIntermediate.tokensForLiquidityLeft).to.be.equal(liqTokensLeftBefore.sub(expectedTokenAmt));
        
        await expectRevert(presaleInst.connect(user2).claimTokens(), "0");

        balanceBefore = await testToken.balanceOf(user1.address);
        let balanceEthBefore = await provider.getBalance(user1.address);
        let fee = (contractIntermediate.raisedAmount).mul(TWO).div(ONE_HUNDRED);
        let feeReceiverBefore = await provider.getBalance(feeReceiver.address);
        expectedEthAmt = (await provider.getBalance(presaleAddress)).sub(fee);
        expectedTokenAmt = ethers.utils.parseEther('437.5');
        await presaleInst.connect(user1).collectFundsRaised();
        balance = await testToken.balanceOf(user1.address);
        let balanceEthAfter = await provider.getBalance(user1.address);
        let feeReceiverAfter = await provider.getBalance(feeReceiver.address);
        expect(balance.sub(balanceBefore)).to.be.equal(expectedTokenAmt);
        expect(feeReceiverAfter.sub(feeReceiverBefore)).to.be.equal(fee);

        difference = ethers.utils.formatEther(balanceEthAfter.sub(balanceEthBefore).toString());

        difference = Math.round10(difference, -2).toString();
        difference = ethers.utils.parseEther(difference);
        assert.equal(difference.toString(), expectedEthAmt);

        await expectRevert(presaleInst.connect(user1).refundLpTokens(), "EARLY");
        await expectRevert(presaleInst.connect(user2).refundLpTokens(), "CREATOR");
    })

    it('Vesting and refund LP tokens', async()=>{
        const presaleAddress = await factory.presales(ZERO);
        const Presale = await ethers.getContractFactory("Presale");
        const presaleInst = Presale.attach(presaleAddress);

        let user2BalanceBefore;
        let user3BalanceBefore;
        let user2BalanceAfter;
        let user3BalanceAfter;
        let user2Part = await presaleInst.investments(user2.address);
        user2Part = user2Part.amountTokens.mul(TEN).div(ONE_HUNDRED);
        let user3Part = await presaleInst.investments(user3.address);
        user3Part = user3Part.amountTokens.mul(TEN).div(ONE_HUNDRED);

        let numOfParts;
        let previouseIteration = -1;

        let totalUser2 = ZERO;
        let totalUser3 = ZERO;

        for(var i = 0; i<10; i++){
            await time.increase(time.duration.days(30));
            user2BalanceBefore = await testToken.balanceOf(user2.address);
            await presaleInst.connect(user2).claimTokens();
            user2BalanceAfter = await testToken.balanceOf(user2.address);
            expect(user2BalanceAfter.sub(user2BalanceBefore)).to.be.equal(user2Part);
            totalUser2 = totalUser2.add(user2Part);

            if(i == 1 || i == 5 || i == 7 || i == 9){
                user3BalanceBefore = await testToken.balanceOf(user3.address);
                await presaleInst.connect(user3).claimTokens();
                user3BalanceAfter = await testToken.balanceOf(user3.address);
                numOfParts = BigNumber.from(i - previouseIteration);
                expect(user3BalanceAfter.sub(user3BalanceBefore)).to.be.equal(user3Part.mul(numOfParts));
                totalUser3 = totalUser3.add(user3Part.mul(numOfParts));
                previouseIteration = i;
            }
        }

        user2Part = await presaleInst.investments(user2.address);
        user2Part = user2Part.amountTokens;
        expect(totalUser2).to.be.equal(user2Part);

        user3Part = await presaleInst.investments(user3.address);
        user3Part = user3Part.amountTokens;
        expect(totalUser3).to.be.equal(user3Part);

        await time.increase(time.duration.days(30));

        await expectRevert(presaleInst.connect(user2).claimTokens(), "W");
        await expectRevert(presaleInst.connect(user3).claimTokens(), "W");
        await expectRevert(presaleInst.connect(user1).claimTokens(), "W");

        await expectRevert(presaleInst.connect(user1).collectFundsRaised(), "OTS");

        let contractIntermediate = await presaleInst.intermediate.call();
        const LPToken = await ethers.getContractFactory("PancakePair");
        const lpToken = LPToken.attach(contractIntermediate.lpAddress);
        const balanceBefore = await lpToken.balanceOf(user1.address);
        await presaleInst.connect(user1).refundLpTokens();
        const balanceAfter = await lpToken.balanceOf(user1.address);
        expect(balanceAfter.sub(balanceBefore)).to.be.equal(contractIntermediate.lpAmount);
        await expectRevert(presaleInst.connect(user1).refundLpTokens(), "EARLY");
    })

    it("Withdraw investments (all/more than allowed); presale without vesting and whitelist", async()=>{
        const TestToken = await ethers.getContractFactory("TestToken");
        let testToken1 = await TestToken.connect(user2).deploy("Test Token 1", "TEST1");
        await testToken1.deployed();
        await testToken1.connect(user2).approve(factory.address, ethers.utils.parseEther('1000'));

        let nowTimestamp = await time.latest();
        let info = {
            tokenAddress: testToken1.address,
            tokenPriceInWei: ONE_TOKEN.div(ONE_HUNDRED),
            hardCapInWei: TEN.mul(ONE_TOKEN),
            softCapInWei: FIVE.mul(ONE_TOKEN),
            openTime: BigNumber.from(nowTimestamp.add(time.duration.days(1)).toString()),
            closeTime: BigNumber.from(nowTimestamp.add(time.duration.days(2)).toString()),
            minInvestment: ONE_TOKEN.div(TEN),
            maxInvestment: ONE_TOKEN.mul(TEN)
        }
        console.log(info);
        let dexInfo = {
            dex : pancakeRouterInstant.address,
            listingPriceInWei: ONE_TOKEN.mul(TWO).div(ONE_HUNDRED),
            lpTokensLockDurationInDays: TEN.mul(THREE),
            liquidityPercentageAllocation: TEN.mul(FIVE),
            liquidityAllocationTime: BigNumber.from(nowTimestamp.add(time.duration.days(3)).toString())
        }
        console.log(dexInfo);
        let certInfo = {
            liquidity: false,
            vesting: ZERO,
            whitelist: []
        }
        console.log(certInfo);
        let name = "Test Presale";
        let stringInfo = {
            saleTitle: ethers.utils.formatBytes32String(name),
            linkTelegram: ethers.utils.formatBytes32String("https://t.me/TestPresale"),
            linkGithub: ethers.utils.formatBytes32String("https://github.com/TestPresale"),
            linkTwitter: ethers.utils.formatBytes32String("https://twitter.com/TestPresale"),
            linkWebsite: ethers.utils.formatBytes32String("https://website.com/TestPresale"),
            linkLogo: "https://cdn.logo.com/hotlink-ok/logo-social.png",
            description: "Test Presale description",
            whitepaper: "https://uniswap.org/whitepaper.pdf"
        }
        console.log(stringInfo);

        await factory.connect(user2).createPresale(info, dexInfo, stringInfo, certInfo, {value: ONE_TOKEN});

        const presaleAddress = await factory.presales(ONE);
        const Presale = await ethers.getContractFactory("Presale");
        const presaleInst = Presale.attach(presaleAddress);

        await expectRevert(presaleInst.connect(user2).invest({value: ONE}), "TIME");

        await time.increase(time.duration.days(1));

        await expectRevert(presaleInst.connect(user2).invest({value: ONE}), "FORBIDDEN");
        await presaleInst.connect(user1).invest({value: ONE_TOKEN});
        await expectRevert(presaleInst.connect(user1).withdrawInvestment(ethers.utils.parseEther('0.98')), "N.E.");
        
        let contractIntermediate = await presaleInst.intermediate.call();
        expect(contractIntermediate.participants).to.be.equal(ONE);
        let investment = await presaleInst.investments(user1.address);
        expect(investment.amountTokens).to.be.equal(ONE_HUNDRED.mul(ONE_TOKEN));

        await presaleInst.connect(user1).withdrawInvestment(ONE_TOKEN);
        contractIntermediate = await presaleInst.intermediate.call();
        expect(contractIntermediate.participants).to.be.equal(ZERO);
        investment = await presaleInst.investments(user1.address);
        expect(investment.amountTokens).to.be.equal(ZERO);

        await presaleInst.connect(user1).invest({value: FIVE.mul(ONE_TOKEN)});
        await presaleInst.connect(user3).invest({value: TWO.mul(ONE_TOKEN)});

        const balanceBefore1 = await testToken1.balanceOf(user1.address);
        const balanceBefore3 = await testToken1.balanceOf(user3.address);

        await time.increase(time.duration.days(1));

        await presaleInst.connect(user1).claimTokens();
        await presaleInst.connect(user3).claimTokens();

        const balanceAfter1 = await testToken1.balanceOf(user1.address);
        const balanceAfter3 = await testToken1.balanceOf(user3.address);

        expect(balanceAfter1.sub(balanceBefore1)).to.be.equal(ethers.utils.parseEther('500'));
        expect(balanceAfter3.sub(balanceBefore3)).to.be.equal(ethers.utils.parseEther('200'));
    })

    it("Unsuccessful presale ending", async()=>{
      const TestToken = await ethers.getContractFactory("TestToken");
      let testToken2 = await TestToken.connect(deployer).deploy("Test Token 2", "TEST2");
      await testToken2.deployed();
      await testToken2.connect(deployer).approve(factory.address, ethers.utils.parseEther('1250'));

      let nowTimestamp = await time.latest();
      let info = {
          tokenAddress: testToken2.address,
          tokenPriceInWei: ONE_TOKEN.div(ONE_HUNDRED),
          hardCapInWei: TEN.mul(ONE_TOKEN),
          softCapInWei: FIVE.mul(ONE_TOKEN),
          openTime: BigNumber.from(nowTimestamp.add(time.duration.days(1)).toString()),
          closeTime: BigNumber.from(nowTimestamp.add(time.duration.days(2)).toString()),
          minInvestment: ONE_TOKEN.div(TEN),
          maxInvestment: ONE_TOKEN.mul(TEN)
      }
      console.log(info);
      let dexInfo = {
          dex : pancakeRouterInstant.address,
          listingPriceInWei: ONE_TOKEN.mul(TWO).div(ONE_HUNDRED),
          lpTokensLockDurationInDays: TEN.mul(THREE),
          liquidityPercentageAllocation: TEN.mul(FIVE),
          liquidityAllocationTime: BigNumber.from(nowTimestamp.add(time.duration.days(3)).toString())
      }
      console.log(dexInfo);
      let certInfo = {
          liquidity: true,
          vesting: ZERO,
          whitelist: []
      }
      console.log(certInfo);
      let name = "Test Presale";
      let stringInfo = {
          saleTitle: ethers.utils.formatBytes32String(name),
          linkTelegram: ethers.utils.formatBytes32String("https://t.me/TestPresale"),
          linkGithub: ethers.utils.formatBytes32String("https://github.com/TestPresale"),
          linkTwitter: ethers.utils.formatBytes32String("https://twitter.com/TestPresale"),
          linkWebsite: ethers.utils.formatBytes32String("https://website.com/TestPresale"),
          linkLogo: "https://cdn.logo.com/hotlink-ok/logo-social.png",
          description: "Test Presale description",
          whitepaper: "https://uniswap.org/whitepaper.pdf"
      }
      console.log(stringInfo);

      await factory.connect(deployer).createPresale(info, dexInfo, stringInfo, certInfo, {value: ONE_TOKEN});

      const presaleAddress = await factory.presales(TWO);
      const Presale = await ethers.getContractFactory("Presale");
      const presaleInst = Presale.attach(presaleAddress);

      await time.increase(time.duration.days(1));

      await presaleInst.connect(user1).invest({value: ethers.utils.parseEther('3.7')});
      await presaleInst.connect(user2).invest({value: ethers.utils.parseEther('1.2')});

      await presaleInst.connect(user1).withdrawInvestment(ethers.utils.parseEther('0.1'));

      expect(await provider.getBalance(presaleInst.address)).to.be.equal(ethers.utils.parseEther('4.8'));

      await time.increase(time.duration.days(2));

      await expectRevert(presaleInst.connect(deployer).addLiquidity(), "WRONG PARAMS");
      await expectRevert(presaleInst.connect(deployer).collectFundsRaised(), "LIQ");
      await expectRevert(presaleInst.connect(deployer).refundLpTokens(), "LIQ");

      await expectRevert(presaleInst.connect(user3).withdrawInvestment(ONE), "N.E.");
      
      await expectRevert(presaleInst.connect(user1).withdrawInvestment(ethers.utils.parseEther('3.55')), "N.E.");
      await presaleInst.connect(user1).withdrawInvestment(ethers.utils.parseEther('3.5'));
      await presaleInst.connect(user1).withdrawInvestment(ethers.utils.parseEther('0.1'));
      await presaleInst.connect(user2).withdrawInvestment(ethers.utils.parseEther('1.2'));
    })

    it("Vesting, borrow tkns too late and strange vesting perc", async()=>{
      const TestToken = await ethers.getContractFactory("TestToken");
      let testToken3 = await TestToken.connect(deployer).deploy("Test Token 3", "TEST2");
      await testToken3.deployed();
      await testToken3.connect(deployer).approve(factory.address, ethers.utils.parseEther('1250'));

      let nowTimestamp = await time.latest();
      let info = {
          tokenAddress: testToken3.address,
          tokenPriceInWei: ONE_TOKEN.div(ONE_HUNDRED),
          hardCapInWei: TEN.mul(ONE_TOKEN),
          softCapInWei: FIVE.mul(ONE_TOKEN),
          openTime: BigNumber.from(nowTimestamp.add(time.duration.days(1)).toString()),
          closeTime: BigNumber.from(nowTimestamp.add(time.duration.days(2)).toString()),
          minInvestment: ONE_TOKEN.div(TEN),
          maxInvestment: ONE_TOKEN.mul(TEN)
      }
      console.log(info);
      let dexInfo = {
          dex : pancakeRouterInstant.address,
          listingPriceInWei: ONE_TOKEN.mul(TWO).div(ONE_HUNDRED),
          lpTokensLockDurationInDays: TEN.mul(THREE),
          liquidityPercentageAllocation: TEN.mul(FIVE),
          liquidityAllocationTime: BigNumber.from(nowTimestamp.add(time.duration.days(3)).toString())
      }
      console.log(dexInfo);
      let certInfo = {
          liquidity: false,
          vesting: SIX.mul(TEN),
          whitelist: []
      }
      console.log(certInfo);
      let name = "Test Presale";
      let stringInfo = {
          saleTitle: ethers.utils.formatBytes32String(name),
          linkTelegram: ethers.utils.formatBytes32String("https://t.me/TestPresale"),
          linkGithub: ethers.utils.formatBytes32String("https://github.com/TestPresale"),
          linkTwitter: ethers.utils.formatBytes32String("https://twitter.com/TestPresale"),
          linkWebsite: ethers.utils.formatBytes32String("https://website.com/TestPresale"),
          linkLogo: "https://cdn.logo.com/hotlink-ok/logo-social.png",
          description: "Test Presale description",
          whitepaper: "https://uniswap.org/whitepaper.pdf"
      }
      console.log(stringInfo);

      await factory.connect(deployer).createPresale(info, dexInfo, stringInfo, certInfo, {value: ONE_TOKEN});

      const presaleAddress = await factory.presales(THREE);
      const Presale = await ethers.getContractFactory("Presale");
      const presaleInst = Presale.attach(presaleAddress);

      await time.increase(time.duration.days(1));
      
      await presaleInst.connect(user1).invest({value: ONE_TOKEN});
      await presaleInst.connect(user2).invest({value: ONE_TOKEN.mul(FIVE)});

      await time.increase(time.duration.days(1));

      await expectRevert(presaleInst.connect(user1).claimTokens(), "0");

      await time.increase(time.duration.days(30));

      let balanceBefore1 = await testToken3.balanceOf(user1.address);
      await presaleInst.connect(user1).claimTokens();
      let balanceAfter1 = await testToken3.balanceOf(user1.address);
      expect(balanceAfter1.sub(balanceBefore1)).to.be.equal(ethers.utils.parseEther('60'));

      await time.increase(time.duration.days(30));

      balanceBefore1 = await testToken3.balanceOf(user2.address);
      await presaleInst.connect(user2).claimTokens();
      balanceAfter1 = await testToken3.balanceOf(user2.address);
      expect(balanceAfter1.sub(balanceBefore1)).to.be.equal(ethers.utils.parseEther('500'));

      balanceBefore1 = await testToken3.balanceOf(user1.address);
      await presaleInst.connect(user1).claimTokens();
      balanceAfter1 = await testToken3.balanceOf(user1.address);
      expect(balanceAfter1.sub(balanceBefore1)).to.be.equal(ethers.utils.parseEther('40'));
    })
});

// Замыкание
(function() {
    /**
     * Корректировка округления десятичных дробей.
     *
     * @param {String}  type  Тип корректировки.
     * @param {Number}  value Число.
     * @param {Integer} exp   Показатель степени (десятичный логарифм основания корректировки).
     * @returns {Number} Скорректированное значение.
     */
    function decimalAdjust(type, value, exp) {
      // Если степень не определена, либо равна нулю...
      if (typeof exp === 'undefined' || +exp === 0) {
        return Math[type](value);
      }
      value = +value;
      exp = +exp;
      // Если значение не является числом, либо степень не является целым числом...
      if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
      }
      // Сдвиг разрядов
      value = value.toString().split('e');
      value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
      // Обратный сдвиг
      value = value.toString().split('e');
      return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }
  
    // Десятичное округление к ближайшему
    if (!Math.round10) {
      Math.round10 = function(value, exp) {
        return decimalAdjust('round', value, exp);
      };
    }
    // Десятичное округление вниз
    if (!Math.floor10) {
      Math.floor10 = function(value, exp) {
        return decimalAdjust('floor', value, exp);
      };
    }
    // Десятичное округление вверх
    if (!Math.ceil10) {
      Math.ceil10 = function(value, exp) {
        return decimalAdjust('ceil', value, exp);
      };
    }
  })();
