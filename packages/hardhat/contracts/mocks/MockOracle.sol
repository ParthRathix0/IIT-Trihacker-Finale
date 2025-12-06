// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockOracle
 * @notice Simple mock oracle for testing Aegis V3.0
 * @dev Implements IOracle interface with configurable price manipulation
 */
contract MockOracle {
    int256 public price;
    uint256 public updatedAt;
    uint80 public roundId;
    
    address public owner;
    int256 public priceDeviation; // Percentage deviation to simulate (basis points)
    bool public isVolatile;       // If true, adds random variance
    
    event PriceUpdated(int256 newPrice, uint256 timestamp);
    
    constructor(int256 _initialPrice) {
        owner = msg.sender;
        price = _initialPrice;
        updatedAt = block.timestamp;
        roundId = 1;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /**
     * @notice Chainlink-compatible interface
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 _roundId,
            int256 answer,
            uint256 startedAt,
            uint256 _updatedAt,
            uint80 answeredInRound
        )
    {
        int256 adjustedPrice = price;
        
        // Apply deviation if set
        if (priceDeviation != 0) {
            adjustedPrice = (price * (10000 + priceDeviation)) / 10000;
        }
        
        // Add volatility if enabled
        if (isVolatile) {
            // Simple pseudo-random variance ±3%
            uint256 variance = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 600;
            int256 adjustment = int256(variance) - 300; // -300 to +300 basis points
            adjustedPrice = (adjustedPrice * (10000 + adjustment)) / 10000;
        }
        
        return (
            roundId,
            adjustedPrice,
            updatedAt,
            updatedAt,
            roundId
        );
    }
    
    /**
     * @notice Update base price
     */
    function setPrice(int256 _newPrice) external onlyOwner {
        price = _newPrice;
        updatedAt = block.timestamp;
        roundId++;
        emit PriceUpdated(_newPrice, block.timestamp);
    }
    
    /**
     * @notice Set systematic deviation (for testing malicious oracles)
     * @param _deviationBps Deviation in basis points (e.g., 1000 = +10%)
     */
    function setDeviation(int256 _deviationBps) external onlyOwner {
        priceDeviation = _deviationBps;
    }
    
    /**
     * @notice Toggle volatility (for testing precision penalties)
     */
    function setVolatile(bool _volatile) external onlyOwner {
        isVolatile = _volatile;
    }
    
    /**
     * @notice Simulate price crash
     */
    function simulateCrash(int256 _crashPercent) external onlyOwner {
        price = (price * (100 - _crashPercent)) / 100;
        updatedAt = block.timestamp;
        roundId++;
        emit PriceUpdated(price, block.timestamp);
    }
    
    /**
     * @notice Simulate price pump
     */
    function simulatePump(int256 _pumpPercent) external onlyOwner {
        price = (price * (100 + _pumpPercent)) / 100;
        updatedAt = block.timestamp;
        roundId++;
        emit PriceUpdated(price, block.timestamp);
    }
}
