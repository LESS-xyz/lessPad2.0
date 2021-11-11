//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAdmin.sol";

contract AdminContract is IAdmin{
    uint256 public creationFeeBNB = 1 ether;
    uint256 public feeOfRaisedFundsPercent = 2;
    address public feeReceiver;
    address public dexRouter;

    mapping(address => bool) public tokensWhitelist;

    constructor(address _feeReceiver) {
        feeReceiver = _feeReceiver;
    }

    function setCreationFee(uint256 _fee) external {
        creationFeeBNB = _fee;
    }

    function setFeePercOfRaisedFunds(uint256 _feePercent) external {
        feeOfRaisedFundsPercent = _feePercent;
    }

    function setFeeReceiver(address _receiver) external {
        feeReceiver = _receiver;
    }

    function setDexRouter(address _dexRouter) external {
        dexRouter = _dexRouter;
    }

    function addOrRemoveWhitelistToken(address _token, bool _isValid) external {
        require(_token != address(0));
        if((_isValid && !tokensWhitelist[_token]) || (!_isValid && tokensWhitelist[_token])){
            tokensWhitelist[_token] = _isValid;
        }
    }

    function getCreationFee() external view override returns(uint256){
        return creationFeeBNB;
    }

    function getFeePercOfRaisedFunds() external view override returns(uint256){
        return feeOfRaisedFundsPercent;
    }

    function getReceiverFee() external view override returns(address){
        return feeReceiver;
    }

    function getDexRouter() external view override returns(address){
        return dexRouter;
    }
}