// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockOracle {
    uint80 public roundId = 1;
    int256 public price = 200000000000; // $2000 scaled to 8 decimals (Chainlink standard)
    uint256 public updatedAt;

    constructor() {
        updatedAt = block.timestamp;
    }

    // Mocking Chainlink's latestRoundData
    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (roundId, price, 0, updatedAt, roundId);
    }

    // Mocking Chainlink's getRoundData
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (_roundId, price, 0, updatedAt, _roundId);
    }

    // Helper to change price for testing
    function setPrice(int256 _price) external {
        price = _price;
        updatedAt = block.timestamp;
        roundId++;
    }
}
