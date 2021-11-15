//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAdmin {
    function getCreationFee() external view returns(uint256);

    function getFeePercOfRaisedFunds() external view returns(uint256);

    function getReceiverFee() external view returns(address);

    function getDexRouterEnabled(address _dex) external view returns(bool);

    function getOwner() external view returns(address);

    function getGeneralMinInvestment() external view returns(uint256);

    function calculateFee(uint256 amount) external view returns(uint256);
}