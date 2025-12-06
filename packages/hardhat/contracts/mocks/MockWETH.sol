// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWETH
 * @notice Mock WETH token for testing
 */
contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {
        // Mint 1 million WETH to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    /**
     * @notice Mint tokens for testing
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @notice Faucet: Anyone can get 100 WETH for testing
     */
    function faucet() external {
        _mint(msg.sender, 100 * 10**18);
    }
}
