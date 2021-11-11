//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IStructs {

    struct PresaleInfo {
        address tokenAddress;
        uint256 tokenPriceInWei;
        uint256 hardCapInWei;
        uint256 softCapInWei;
        uint256 openTime;
        uint256 closeTime;
        uint256 minInvestment;
        uint256 maxInvestment;
    }

    struct PresaleDexInfo {
        uint256 listingPriceInWei;
        uint256 lpTokensLockDurationInDays;
        uint8 liquidityPercentageAllocation;
        uint256 liquidityAllocationTime;
    }

    struct PresaleStringInfo {
        bytes32 saleTitle;
        bytes32 linkTelegram;
        bytes32 linkGithub;
        bytes32 linkTwitter;
        bytes32 linkWebsite;
        string linkLogo;
        string description;
        string whitepaper;
    }

    struct CertifiedAddition {
        bool liquidity;
        uint8 vesting;
        address[] whitelist;
        address nativeToken;
    }

    struct IntermediateVariables {
        bool withdrawedFunds;
        bool liquidityAdded;
        address creator;
        address lpAddress;
        uint256 lpAmount;
        uint256 lpUnlockTime;
        uint256 beginingAmount;
        uint256 tokensForSaleLeft;
        uint256 tokensForLiquidityLeft;
        uint256 raisedAmount;
        uint256 participants;
    }

    struct Investment {
        uint256 amountEth;
        uint256 amountTokens;
        uint256 amountClaimed;
    }
}