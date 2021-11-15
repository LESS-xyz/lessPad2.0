//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IPresale {
    function init(
        address[2] memory _creatorToken,
        uint256[9] memory _priceTokensForSaleLiquiditySoftHardOpenCloseMinMax
    ) external;

    function setCertifiedAddition(
        bool _liquidity,
        uint8 _vesting,
        address[] memory _whitelist
    ) external;

    function setDexInfo(
        address dex,
        uint256 price,
        uint256 duration,
        uint8 percent,
        uint256 allocationTime
    ) external;

    function setStringInfo(
        bytes32 _saleTitle,
        bytes32 _linkTelegram,
        bytes32 _linkGithub,
        bytes32 _linkTwitter,
        bytes32 _linkWebsite,
        string calldata _linkLogo,
        string calldata _description,
        string calldata _whitepaper
    ) external;
}