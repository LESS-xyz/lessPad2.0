//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAdmin.sol";
import "./interfaces/IPresale.sol";
import "./interfaces/IStructs.sol";
import "./libraries/Calculation1.sol";
import "./pancake-swap/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

contract PresaleFactory is IStructs, Context {
    IAdmin public immutable adminContract;
    address public presaleMaster;

    address[] public presales;

    event PresaleCreated(
        uint256 presaleId,
        address creator,
        address presaleAddress,
        address tokenAddress
    );
    event Received(address indexed from, uint256 amount);

    constructor(address _adminContract) {
        adminContract = IAdmin(_adminContract);
    }

    receive() external payable {
        emit Received(_msgSender(), msg.value);
    }

    function setPresaleMaster(address _presaleMaster) external {
        require(presaleMaster == address(0));
        require(_msgSender() == adminContract.getOwner());
        presaleMaster = _presaleMaster;
    }

    function createPresale(
        PresaleInfo calldata _info,
        PresaleDexInfo calldata _dexInfo,
        PresaleStringInfo calldata _stringInfo,
        CertifiedAddition calldata _addition
    ) external payable returns (uint256 presaleId) {
        require(presaleMaster != address(0), "NOT INITIALIZED");

        require(
            _info.openTime > block.timestamp &&
                _info.closeTime - _info.openTime > 0 &&
                _info.closeTime < _dexInfo.liquidityAllocationTime,
            "TIME"
        );

        require(
            _info.tokenPriceInWei > 0 &&
                _info.softCapInWei > 0 &&
                _info.hardCapInWei >= _info.softCapInWei &&
                _info.maxInvestment >= _info.minInvestment &&
                _info.minInvestment >=
                adminContract.getGeneralMinInvestment() &&
                _info.hardCapInWei >= _info.minInvestment &&
                _info.tokenAddress != address(0) &&
                msg.value == adminContract.getCreationFee(),
            "WRONG PARAMS"
        );

        if (_addition.liquidity) {
            require(
                _dexInfo.listingPriceInWei > 0 &&
                    _dexInfo.liquidityPercentageAllocation > 49 &&
                    _dexInfo.liquidityPercentageAllocation < 101 &&
                    _dexInfo.lpTokensLockDurationInDays > 29 &&
                    adminContract.getDexRouterEnabled(_dexInfo.dex),
                "LIQ"
            );
        }

        if(_addition.vesting!=0)
            require(_addition.vesting < 101, "VESTING");

        // maxLiqPoolTokenAmount, maxTokensToBeSold, requiredTokenAmount
        uint256[] memory tokenAmounts = new uint256[](3);
        tokenAmounts = Calculation1.countAmountOfTokens(
            _info.hardCapInWei,
            _info.tokenPriceInWei,
            _dexInfo.listingPriceInWei,
            _dexInfo.liquidityPercentageAllocation,
            IERC20Metadata(_info.tokenAddress).decimals(),
            18
        );

        //console.log("SUM: ",tokenAmounts[2]);

        address presaleAddress = Clones.clone(presaleMaster);

        initializePresaleCertified(
            IPresale(presaleAddress),
            [tokenAmounts[1], tokenAmounts[0]],
            _info,
            _addition,
            _dexInfo,
            _stringInfo
        );
        presaleId = presales.length;
        presales.push(presaleAddress);

        TransferHelper.safeTransferFrom(
            _info.tokenAddress,
            _msgSender(),
            presaleAddress,
            tokenAmounts[2]
        );
        TransferHelper.safeTransferETH(
            adminContract.getReceiverFee(),
            msg.value
        );

        emit PresaleCreated(
            presaleId,
            _msgSender(),
            presaleAddress,
            _info.tokenAddress
        );
    }

    function initializePresaleCertified(
        IPresale _presale,
        uint256[2] memory _tokensForSaleLiquidity,
        PresaleInfo calldata _info,
        CertifiedAddition calldata _addition,
        PresaleDexInfo calldata _dexInfo,
        PresaleStringInfo calldata _stringInfo
    ) private {
        _presale.init(
            [_msgSender(), _info.tokenAddress],
            [
                _info.tokenPriceInWei,
                _tokensForSaleLiquidity[0],
                _tokensForSaleLiquidity[1],
                _info.softCapInWei,
                _info.hardCapInWei,
                _info.openTime,
                _info.closeTime,
                _info.minInvestment,
                _info.maxInvestment
            ]
        );

        _presale.setCertifiedAddition(
            _addition.liquidity,
            _addition.vesting,
            _addition.whitelist
        );

        if (_addition.liquidity) {
            _presale.setDexInfo(
                _dexInfo.dex,
                _dexInfo.listingPriceInWei,
                _dexInfo.lpTokensLockDurationInDays,
                _dexInfo.liquidityPercentageAllocation,
                _dexInfo.liquidityAllocationTime
            );
        }
        _presale.setStringInfo(
            _stringInfo.saleTitle,
            _stringInfo.linkTelegram,
            _stringInfo.linkGithub,
            _stringInfo.linkTwitter,
            _stringInfo.linkWebsite,
            _stringInfo.linkLogo,
            _stringInfo.description,
            _stringInfo.whitepaper
        );
    }
}
