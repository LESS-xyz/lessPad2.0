//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAdmin {
    function getCreationFee() external view returns(uint256);

    function getFeePercOfRaisedFunds() external view returns(uint256);

    function getReceiverFee() external view returns(address);

    function getDexRouter() external view returns(address);

    function getOwner() external view returns(address);
}