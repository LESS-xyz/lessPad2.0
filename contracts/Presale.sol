//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IDEX.sol";
import "./interfaces/IAdmin.sol";
import "./interfaces/IStructs.sol";
import "./interfaces/IPresale.sol";
import "./pancake-swap/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Presale is Context, IPresale, IStructs, ReentrancyGuard {
    IAdmin public immutable adminContract;
    address public immutable factory;

    PresaleInfo public generalInfo;
    CertifiedAddition public certifiedAddition;
    PresaleDexInfo public dexInfo;
    PresaleStringInfo public stringInfo;
    IntermediateVariables public intermediate;

    uint256 private tokenMagnitude;

    mapping(address => Investment) public investments; // total wei invested per address
    mapping(address => bool) public whitelist;

    modifier onlyFactory() {
        require(_msgSender() == factory, "FACTORY");
        _;
    }

    modifier timing() {
        require(
            generalInfo.closeTime > block.timestamp &&
                block.timestamp >= generalInfo.openTime,
            "TIME"
        );
        _;
    }

    modifier liquidityAdded() {
        require(intermediate.liquidityAdded, "LIQ");
        _;
    }

    modifier onlyPresaleCreator() {
        require(_msgSender() == intermediate.creator, "CREATOR");
        _;
    }

    constructor(address _adminContract, address _factory) {
        factory = _factory;
        adminContract = IAdmin(_adminContract);
    }

    receive() external payable {}

    function init(
        address[2] memory _creatorToken,
        uint256[9] memory _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax
    ) external override onlyFactory {
        require(generalInfo.tokenAddress == address(0), "ONCE");
        intermediate.creator = _creatorToken[0];
        intermediate
            .tokensForSaleLeft = _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[
            1
        ];
        intermediate
            .beginingAmount = _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[
            1
        ];
        intermediate
            .tokensForLiquidityLeft = _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[
            2
        ];

        generalInfo = PresaleInfo(
            _creatorToken[1],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[0],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[4],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[3],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[5],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[6],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[7],
            _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax[8]
        );

        uint256 tokenDecimals = IERC20Metadata(_creatorToken[1]).decimals();
        tokenMagnitude = uint256(10)**uint256(tokenDecimals);
    }

    function setCertifiedAddition(
        bool _liquidity,
        uint8 _vesting,
        address[] memory _whitelist,
        address _nativeToken
    ) external override onlyFactory {
        uint256 len = _whitelist.length;
        if (len > 0) {
            for (uint256 i = 0; i < len; i++) {
                if (_whitelist[i] != intermediate.creator)
                    whitelist[_whitelist[i]] = true;
            }
        }
        certifiedAddition = CertifiedAddition(
            _liquidity,
            _vesting,
            _whitelist,
            _nativeToken
        );
    }

    function setDexInfo(
        uint256 price,
        uint256 duration,
        uint8 percent,
        uint256 allocationTime
    ) external override onlyFactory {
        dexInfo = PresaleDexInfo(price, duration, percent, allocationTime);
    }

    function setStringInfo(
        bytes32 _saleTitle,
        bytes32 _linkTelegram,
        bytes32 _linkGithub,
        bytes32 _linkTwitter,
        bytes32 _linkWebsite,
        string calldata _linkLogo,
        string calldata _description,
        string calldata _whitepaper
    ) external override onlyFactory {
        stringInfo = PresaleStringInfo(
            _saleTitle,
            _linkTelegram,
            _linkGithub,
            _linkTwitter,
            _linkWebsite,
            _linkLogo,
            _description,
            _whitepaper
        );
    }

    function invest(uint256 amount) external payable timing nonReentrant {
        address sender = _msgSender();
        Investment storage investment = investments[sender];
        if (certifiedAddition.whitelist.length > 0) {
            require(whitelist[sender], "NOT ACCESS");
        }
        //TODO: min/max check
        amount = certifiedAddition.nativeToken == address(0)
            ? msg.value
            : amount;
        require(amount > 0, "ZERO");

        uint256 reservedTokens = getTokenAmount(amount);

        require(
            intermediate.raisedAmount < generalInfo.hardCapInWei &&
                intermediate.tokensForSaleLeft >= reservedTokens,
            "N.E."
        );

        if (investment.amountEth == 0) {
            intermediate.participants++;
        }

        intermediate.raisedAmount += amount;
        investment.amountEth += amount;
        investment.amountTokens += reservedTokens;
        intermediate.tokensForSaleLeft -= reservedTokens;

        if (address(certifiedAddition.nativeToken) != address(0))
            TransferHelper.safeTransferFrom(
                certifiedAddition.nativeToken,
                sender,
                address(this),
                amount
            );
    }

    function withdrawInvestment(uint256 amount) external timing nonReentrant {
        address sender = _msgSender();
        Investment storage investment = investments[sender];
        require(investment.amountEth >= amount && amount > 0, "N.E.");
        require(
            intermediate.raisedAmount < generalInfo.softCapInWei &&
                !intermediate.liquidityAdded,
            "S.L"
        );
        uint256 reservedTokens = getTokenAmount(amount);
        intermediate.raisedAmount -= amount;
        investment.amountEth -= amount;
        investment.amountTokens -= reservedTokens;
        intermediate.tokensForSaleLeft += reservedTokens;
        if (investment.amountEth == 0) {
            intermediate.participants--;
        }

        if (certifiedAddition.nativeToken == address(0)) {
            payable(sender).transfer(amount);
        } else {
            TransferHelper.safeTransfer(
                certifiedAddition.nativeToken,
                sender,
                amount
            );
        }
    }

    function addLiquidity() external nonReentrant {
        require(
            block.timestamp >= dexInfo.liquidityAllocationTime &&
                certifiedAddition.liquidity &&
                intermediate.raisedAmount >= generalInfo.softCapInWei &&
                !intermediate.liquidityAdded &&
                _msgSender() == intermediate.creator,
            "WRONG PARAMS"
        );

        intermediate.liquidityAdded = true;
        intermediate.lpUnlockTime =
            block.timestamp +
            (dexInfo.lpTokensLockDurationInDays * 1 days);

        IUniswapV2Router02 uniswapRouter = IUniswapV2Router02(
            address(adminContract.getDexRouter())
        );

        uint256 liqPoolEthAmount = (intermediate.raisedAmount *
            dexInfo.liquidityPercentageAllocation) / 100;

        if (certifiedAddition.nativeToken != address(0)) {
            TransferHelper.safeApprove(
                certifiedAddition.nativeToken,
                address(uniswapRouter),
                liqPoolEthAmount
            );
            liqPoolEthAmount = swapToEth(liqPoolEthAmount);
        }

        uint256 liqPoolTokenAmount = (liqPoolEthAmount * tokenMagnitude) /
            dexInfo.listingPriceInWei;

        require(
            intermediate.tokensForLiquidityLeft >= liqPoolTokenAmount,
            "N.E."
        );

        intermediate.tokensForLiquidityLeft -= liqPoolTokenAmount;

        IERC20 token = IERC20(generalInfo.tokenAddress);

        TransferHelper.safeApprove(address(token), address(uniswapRouter), liqPoolTokenAmount);

        uint256 amountEth;

        (, amountEth, intermediate.lpAmount) = uniswapRouter.addLiquidityETH{
            value: liqPoolEthAmount
        }(
            address(token),
            liqPoolTokenAmount,
            0,
            0,
            address(this),
            block.timestamp
        );

        IUniswapV2Factory02 uniswapFactory = IUniswapV2Factory02(
            uniswapRouter.factory()
        );
        intermediate.lpAddress = uniswapFactory.getPair(
            uniswapRouter.WETH(),
            generalInfo.tokenAddress
        );
    }

    function claimTokens()
        external
        nonReentrant
        liquidityAdded
    {
        address sender = _msgSender();
        Investment storage investment = investments[sender];
        require(
            block.timestamp >= generalInfo.closeTime &&
                investment.amountClaimed <
                investment.amountTokens &&
                investment.amountEth > 0,
            "W"
        );
        if (certifiedAddition.vesting == 0) {
            investment.amountClaimed = investment
                .amountTokens; // make sure this goes first before transfer to prevent reentrancy
            TransferHelper.safeTransfer(generalInfo.tokenAddress, sender, investment.amountTokens);
        } else {
            uint256 beginingTime = certifiedAddition.liquidity ? intermediate.lpUnlockTime - dexInfo.lpTokensLockDurationInDays * 1 days : generalInfo.closeTime;
            uint256 numOfParts = (block.timestamp - beginingTime) / 2592000; //ONE MONTH
            uint256 part = (investment.amountTokens *
                certifiedAddition.vesting) / 100;
            uint256 earnedTokens = numOfParts *
                part -
                investment.amountClaimed;
            require(earnedTokens > 0, "0");
            if (
                earnedTokens <=
                investment.amountTokens -
                    investment.amountClaimed
            ) {
                investment.amountClaimed += earnedTokens;
            } else {
                earnedTokens =
                    investment.amountTokens -
                    investment.amountClaimed;
                investment.amountClaimed = investment
                    .amountTokens;
            }
            TransferHelper.safeTransfer(generalInfo.tokenAddress, sender, earnedTokens);
        }
    }

    function collectFundsRaised()
        external
        nonReentrant
        onlyPresaleCreator
        liquidityAdded
    {
        require(
            !intermediate.withdrawedFunds &&
                block.timestamp >= generalInfo.closeTime &&
                intermediate.raisedAmount >= generalInfo.softCapInWei,
            "OTS"
        );
        intermediate.withdrawedFunds = true;
        uint256 collectedBalance;
        if (address(0) == certifiedAddition.nativeToken) {
            collectedBalance = address(this).balance;
            payable(intermediate.creator).transfer(collectedBalance);
        } else {
            collectedBalance = IERC20(certifiedAddition.nativeToken).balanceOf(
                address(this)
            );
            TransferHelper.safeTransfer(
                certifiedAddition.nativeToken,
                intermediate.creator,
                collectedBalance
            );
        }
        uint256 unsoldTokensAmount = intermediate.tokensForSaleLeft +
            intermediate.tokensForLiquidityLeft;
        if (unsoldTokensAmount > 0) {
            require(
                IERC20(generalInfo.tokenAddress).transfer(
                    intermediate.creator,
                    unsoldTokensAmount
                ),
                "T"
            );
        }
    }

    function refundLpTokens()
        external
        nonReentrant
        onlyPresaleCreator
        liquidityAdded
    {
        require(
            intermediate.lpAmount > 0 &&
                block.timestamp >= intermediate.lpUnlockTime,
            "EARLY"
        );
        require(
            IERC20(intermediate.lpAddress).transfer(
                intermediate.creator,
                intermediate.lpAmount
            ),
            "LP.T"
        );
        intermediate.lpAmount = 0;
    }

    function getTokenAmount(uint256 _weiAmount)
        internal
        view
        returns (uint256)
    {
        return (_weiAmount * tokenMagnitude) / generalInfo.tokenPriceInWei;
    }

    function swapToEth(uint256 liqPoolEthAmount) private returns(uint256){
        IUniswapV2Router02 uniswap = IUniswapV2Router02(
            adminContract.getDexRouter()
        );
        address[] memory path = new address[](2);
        path[0] = certifiedAddition.nativeToken;
        path[1] = uniswap.WETH();
        uint256[] memory amount = uniswap.getAmountsOut(liqPoolEthAmount, path);
        amount = uniswap.swapTokensForExactETH(
            amount[1],
            liqPoolEthAmount,
            path,
            address(this),
            block.timestamp
        );
        return amount[1];
    }
}
