// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// FIXED: Updated Chainlink Import Path
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol"; 
import "../libraries/AegisMath.sol";
import "../interfaces/IAegis.sol";

contract AegisSettlement is IAegis, Ownable, ReentrancyGuard {
    using AegisMath for uint256;

    // --- CONFIGURATION ---
    AggregatorV3Interface public immutable priceFeed;
    uint256 public immutable ACCUMULATION_WINDOW; 
    uint256 public immutable DISPUTE_WINDOW_INITIAL; 
    
    // SAFETY CONSTANTS
    uint256 public constant DISPUTE_EXTENSION = 10; 
    uint256 public constant EXTENSION_TRIGGER = 5; 
    uint256 public constant REORG_SAFETY = 5; 
    uint256 public constant EMERGENCY_TIMEOUT = 1000; // ~3 hours safety hatch
    uint256 public constant PRECISION = 1e18;

    // --- STATE ---
    uint256 public currentBatchId;
    mapping(uint256 => Batch) public batches;
    
    // Map BatchID -> User -> Asset -> Amount
    // Asset: 0 = Buy Token (e.g. USDC), 1 = Sell Token (e.g. ETH)
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public userDeposits;
    
    // Map BatchID -> AccumulationIndex -> ChainlinkRoundId 
    mapping(uint256 => mapping(uint256 => uint80)) public batchRoundIds;

    constructor(
        address _priceFeed,
        uint256 _accumulationWindow,
        uint256 _disputeWindow
    ) Ownable(msg.sender) { 
        priceFeed = AggregatorV3Interface(_priceFeed);
        ACCUMULATION_WINDOW = _accumulationWindow;
        DISPUTE_WINDOW_INITIAL = _disputeWindow;
        _startNewBatch();
    }

    // --- PHASE 1: AGGREGATION ---

    function _startNewBatch() internal {
        currentBatchId++;
        Batch storage b = batches[currentBatchId];
        b.id = currentBatchId;
        b.state = BatchState.OPEN;
        b.startBlock = block.number;
        emit BatchCreated(currentBatchId, block.number);
    }

    function depositBuy() external payable override nonReentrant {
        _deposit(0);
    }

    function depositSell() external payable override nonReentrant {
        _deposit(1);
    }

    function _deposit(uint8 side) internal {
        Batch storage b = batches[currentBatchId];
        require(b.state == BatchState.OPEN, "Batch not open");
        require(msg.value > 0, "Zero deposit");

        userDeposits[b.id][msg.sender][side] += msg.value;
        
        if (side == 0) b.totalBuyVol += msg.value;
        else b.totalSellVol += msg.value;

        emit Deposit(b.id, msg.sender, side == 0, msg.value);
    }

    // --- PHASE 2: ACCUMULATION ---

    function closeBatch() external {
        Batch storage b = batches[currentBatchId];
        require(b.state == BatchState.OPEN, "Not open");
        
        b.state = BatchState.ACCUMULATING;
        b.accumulationStartBlock = block.number;
        b.endBlock = block.number + ACCUMULATION_WINDOW; 
        
        emit BatchClosed(b.id);
        _startNewBatch(); // Pipelining
    }

    function updateAccumulator() external override {
        if (currentBatchId == 1) return; 
        
        uint256 targetId = currentBatchId - 1;
        Batch storage b = batches[targetId];

        if (b.state != BatchState.ACCUMULATING) return;
        if (block.number > b.endBlock) revert("Window closed");

        (uint80 roundId, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        batchRoundIds[targetId][b.validBlockCount] = roundId;

        b.runningPriceSum += uint256(price);
        b.validBlockCount++;
        b.lastUpdatedBlock = block.number;

        emit AccumulatorUpdated(targetId, uint256(price), msg.sender);
    }

    function endAccumulation(uint256 batchId) external {
        Batch storage b = batches[batchId];
        require(b.state == BatchState.ACCUMULATING, "Wrong state");
        require(block.number > b.endBlock, "Too early");
        
        if (b.validBlockCount == 0) {
            b.state = BatchState.VOIDED;
            emit BatchVoided(batchId, "No data collected");
            return;
        }

        b.state = BatchState.DISPUTING;
        b.disputeEndBlock = block.number + DISPUTE_WINDOW_INITIAL;
        
        emit DisputeWindowOpened(batchId, b.disputeEndBlock);
    }

    // --- PHASE 3: SCRUBBING ---

    function scrubOutlier(uint256 batchId, uint256 index) external override {
        Batch storage b = batches[batchId];
        require(b.state == BatchState.DISPUTING, "Not disputing");
        require(block.number <= b.disputeEndBlock, "Dispute closed");

        uint80 roundId = batchRoundIds[batchId][index];
        require(roundId != 0, "Already scrubbed or invalid");

        (, int256 historicalPrice, , , ) = priceFeed.getRoundData(roundId);
        uint256 price = uint256(historicalPrice);

        uint256 currentAvg = b.runningPriceSum / b.validBlockCount;
        uint256 delta = price > currentAvg ? price - currentAvg : currentAvg - price;
        
        require((delta * 100) / currentAvg > 10, "Not an outlier");

        b.runningPriceSum -= price;
        b.validBlockCount--;
        batchRoundIds[batchId][index] = 0; 

        emit OutlierScrubbed(batchId, index, msg.sender);

        if (b.disputeEndBlock - block.number < EXTENSION_TRIGGER) {
            b.disputeEndBlock += DISPUTE_EXTENSION;
            emit WindowExtended(batchId, b.disputeEndBlock);
        }
    }

    // --- PHASE 4: SETTLEMENT ---

    function settleBatch(uint256 batchId) external override {
        Batch storage b = batches[batchId];
        require(b.state == BatchState.DISPUTING, "Wrong state");
        require(block.number > b.disputeEndBlock + REORG_SAFETY, "Wait for finality");

        if (b.validBlockCount == 0) {
            b.state = BatchState.VOIDED;
            emit BatchVoided(batchId, "All data scrubbed");
            return;
        }

        b.finalPrice = b.runningPriceSum / b.validBlockCount;

        (b.buyFillRate, b.sellFillRate) = AegisMath.calculateFillRates(
            b.totalBuyVol, 
            b.totalSellVol, 
            b.finalPrice
        );

        b.state = BatchState.SETTLED;
        emit BatchSettled(batchId, b.finalPrice);
    }

    // --- WITHDRAWALS & EMERGENCY ---

    function claim(uint256 batchId) external nonReentrant {
        Batch storage b = batches[batchId];
        
        if (b.state == BatchState.SETTLED) {
             _processSettledClaim(batchId);
             return;
        }

        if (b.state == BatchState.VOIDED) {
            _processRefund(batchId);
            return;
        }

        revert("Batch not ready");
    }

    function emergencyWithdraw(uint256 batchId) external override nonReentrant {
        Batch storage b = batches[batchId];
        
        require(b.state != BatchState.SETTLED && b.state != BatchState.VOIDED, "Finalized");
        require(block.number > b.startBlock + EMERGENCY_TIMEOUT, "Timeout not reached");

        if (b.state != BatchState.VOIDED) {
            b.state = BatchState.VOIDED;
            emit BatchVoided(batchId, "Emergency Timeout");
        }

        _processRefund(batchId);
    }

    // --- HELPERS ---

    function _processSettledClaim(uint256 batchId) internal {
        uint256 buyDeposit = userDeposits[batchId][msg.sender][0];
        uint256 sellDeposit = userDeposits[batchId][msg.sender][1];
        Batch storage b = batches[batchId];

        if (buyDeposit > 0) {
            userDeposits[batchId][msg.sender][0] = 0;
            uint256 payout = (buyDeposit * b.buyFillRate) / PRECISION;
            _safeTransfer(msg.sender, payout);
        }
        if (sellDeposit > 0) {
            userDeposits[batchId][msg.sender][1] = 0;
            uint256 payout = (sellDeposit * b.sellFillRate) / PRECISION;
            _safeTransfer(msg.sender, payout);
        }
    }

    function _processRefund(uint256 batchId) internal {
        uint256 buyDeposit = userDeposits[batchId][msg.sender][0];
        uint256 sellDeposit = userDeposits[batchId][msg.sender][1];

        if (buyDeposit > 0) {
            userDeposits[batchId][msg.sender][0] = 0;
            _safeTransfer(msg.sender, buyDeposit);
        }
        if (sellDeposit > 0) {
            userDeposits[batchId][msg.sender][1] = 0;
            _safeTransfer(msg.sender, sellDeposit);
        }
    }

    function _safeTransfer(address to, uint256 amount) internal {
        if (amount > address(this).balance) amount = address(this).balance;
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Transfer failed");
    }
}