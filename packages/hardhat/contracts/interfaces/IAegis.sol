// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IAegis {
    enum BatchState { OPEN, ACCUMULATING, DISPUTING, SETTLED, VOIDED }

    struct Batch {
        uint256 id;
        uint256 startBlock;
        
        // Accumulation
        uint256 accumulationStartBlock;
        uint256 endBlock; // End of Accumulation Phase
        uint256 runningPriceSum;
        uint256 validBlockCount;
        uint256 lastUpdatedBlock;
        
        // Scrubbing
        uint256 disputeEndBlock;

        // Data
        uint256 totalBuyVol;
        uint256 totalSellVol;
        
        // Settlement
        uint256 finalPrice;
        uint256 buyFillRate;
        uint256 sellFillRate;

        BatchState state;
    }

    event BatchCreated(uint256 indexed id, uint256 startBlock);
    event BatchClosed(uint256 indexed id);
    event Deposit(uint256 indexed id, address indexed user, bool isBuy, uint256 amount);
    event AccumulatorUpdated(uint256 indexed id, uint256 price, address indexed updatedBy);
    event DisputeWindowOpened(uint256 indexed id, uint256 endBlock);
    event OutlierScrubbed(uint256 indexed id, uint256 index, address indexed scrubber);
    event WindowExtended(uint256 indexed id, uint256 newEndBlock);
    event BatchSettled(uint256 indexed id, uint256 finalPrice);
    event BatchVoided(uint256 indexed id, string reason);
    event EmergencyWithdrawal(uint256 indexed id, address indexed user, uint256 amount);

    function depositBuy() external payable;
    function depositSell() external payable;
    function updateAccumulator() external;
    function scrubOutlier(uint256 batchId, uint256 index) external;
    function settleBatch(uint256 batchId) external;
    function emergencyWithdraw(uint256 batchId) external;
}