// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SleepToken
 * @dev ERC20 Token for SleepToEarn rewards
 * Only the SleepToEarn contract can mint tokens
 */
contract SleepToken is ERC20, Ownable {
    address public sleepToEarnContract;
    
    event SleepToEarnContractSet(address indexed newContract);
    
    constructor() ERC20("Sleep Token", "SLEEP") Ownable(msg.sender) {
        // Initial supply can be minted to owner if needed
        // _mint(msg.sender, 1000000 * 10**decimals()); // 1M tokens
    }
    
    /**
     * @dev Set the SleepToEarn contract address that can mint tokens
     * @param _sleepToEarnContract Address of the SleepToEarn contract
     */
    function setSleepToEarnContract(address _sleepToEarnContract) external onlyOwner {
        require(_sleepToEarnContract != address(0), "Invalid contract address");
        sleepToEarnContract = _sleepToEarnContract;
        emit SleepToEarnContractSet(_sleepToEarnContract);
    }
    
    /**
     * @dev Mint tokens - only callable by SleepToEarn contract
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == sleepToEarnContract, "Only SleepToEarn contract can mint");
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }
    
    /**
     * @dev Override decimals to use 18 decimals (standard)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
