//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAdmin.sol";
import "./interfaces/IDEX.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AdminContract is IAdmin, Ownable{
    uint256 public creationFeeBNB = 1 ether;
    uint256 public feeOfRaisedFundsPercent;
    address public feeReceiver;

    uint256 public generalMinInvestment = 10 ** 17;

    address[] public dexes;

    mapping(address => bool) public dexList;

    mapping(address => uint256) private _dexIndexies;

    constructor(address _feeReceiver) {
        feeReceiver = _feeReceiver;
    }

    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFeeBNB = _fee;
    }

    function setFeePercOfRaisedFunds(uint256 _feePercent) external onlyOwner {
        feeOfRaisedFundsPercent = _feePercent;
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        feeReceiver = _receiver;
    }

    function setMinInvestment(uint256 _minInvestmet) external onlyOwner {
        generalMinInvestment = _minInvestmet;
    }

    function addOrRemoveDex(address _dex, bool _isValid) external onlyOwner {
        require(_dex != address(0), "ZERO");
        if((_isValid && !dexList[_dex]) || (!_isValid && dexList[_dex])){
            if(_isValid)
            {
                require(_checkRouter(_dex), "INVALID DEX ADDRESS");
                _dexIndexies[_dex] = dexes.length;
                dexes.push(_dex);
            }
            else {
                uint256 lastIndex = dexes.length - 1;
                uint256 _dexIndex = _dexIndexies[_dex];
                if(_dexIndex == lastIndex)
                    dexes.pop();
                else{
                    address lastDex = dexes[lastIndex];
                    dexes[_dexIndex] = lastDex;
                    _dexIndexies[lastDex] = _dexIndex;
                    dexes.pop();
                }
            }
            dexList[_dex] = _isValid;
        }
    }

    function availableDexes() external view returns(address[] memory){
        return dexes;
    }

    function getCreationFee() external view override returns(uint256){
        return creationFeeBNB;
    }

    function getFeePercOfRaisedFunds() external view override returns(uint256){
        return feeOfRaisedFundsPercent;
    }

    function calculateFee(uint256 amount) external view override returns(uint256){
        return amount * feeOfRaisedFundsPercent / 100;
    }

    function getReceiverFee() external view override returns(address){
        return feeReceiver;
    }

    function getDexRouterEnabled(address _dex) external view override returns(bool){
        return dexList[_dex];
    }

    function getOwner() external view override returns(address) {
        return owner();
    }

    function getGeneralMinInvestment() external view override returns(uint256){
        return generalMinInvestment;
    }

    function _checkRouter(address _router) private view returns(bool){
        address weth;
        address factory;

        if(_isContract(_router)){
            try IUniswapV2Router02(_router).factory() returns (address _factory){
                factory = _factory;
            } catch {
                return false;
            }

            /* try IUniswapV2Factory02(factory).allPairsLength() returns (uint256 _length){
                if (_length == 0){
                    return false;
                }
            } catch {
                return false;
            } */

            try IUniswapV2Router02(_router).WETH() returns (address _weth){
                weth = _weth;
            } catch {
                return false;
            }
        }
        else {
            return false;
        }

        return true;
    }

    function _isContract(address addr) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
}