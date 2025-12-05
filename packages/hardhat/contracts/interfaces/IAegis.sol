// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IAegis {
    enum BatchState { OPEN, ACCUMULATING, DISPUTING, SETTLED, VOIDED }

    struct Batch {
        uint256 id;
        uint256 startBlock;
        uint256 endBlock;
        uint256 runningPriceSum;
        uint16 validBlockCount;
        uint256 totalBuyVol;
        uint256 totalSellVol;
        uint256 finalPrice;
        uint256 buyFillRate;
        uint256 sellFillRate;
        uint256 minPrice;
        uint256 maxPrice;
        uint256 lastUpdatedBlock;
        BatchState state;
    }

    event BatchCreated(uint256 indexed id, uint256 startBlock);
    event Deposit(uint256 indexed id, address indexed user, bool isBuy, uint256 amount);
    event AccumulatorUpdated(uint256 indexed id, uint256 price, address indexed updatedBy);
    event OutlierScrubbed(uint256 indexed id, uint256 blockOffset, address indexed scrubber);
    event BatchSettled(uint256 indexed id, uint256 finalPrice);
    event BatchVoided(uint256 indexed id, string reason);

    function depositBuy() external payable;
    function depositSell() external payable;
    function updateAccumulator(uint256 price) external;
    function checkUpkeep(bytes calldata checkData) external view returns (bool, bytes memory);
    function performUpkeep(bytes calldata performData) external;
    function scrubOutlier(uint256 batchId, uint256 blockOffset, uint256 badPrice) external;
    function settleBatch(uint256 batchId) external;
}