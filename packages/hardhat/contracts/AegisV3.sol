// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Aegis Protocol V3.0
 * @notice Fair, MEV-resistant batch settlement with multi-oracle dynamic weighting
 * @dev Implements 4-phase lifecycle with reputation-based oracle scoring
 */

interface IOracle {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract AegisV3 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== ENUMS =====
    enum BatchState {
        OPEN,           // Users deposit orders
        ACCUMULATING,   // Oracle price collection
        DISPUTING,      // User dispute window
        SETTLING        // Execute trades & update weights
    }

    enum Side {
        BUY,
        SELL
    }

    // ===== STRUCTS =====
    
    /**
     * @dev Oracle information with dynamic weight
     */
    struct OracleInfo {
        address oracleAddress;
        uint256 weight;              // Range: [1, 1000], default 100
        uint256 lastPrice;           // Last valid price recorded
        uint256 lastUpdateBlock;     // For staleness check
        bool isActive;               // Can be deactivated by owner
    }

    /**
     * @dev Single price observation from an oracle
     */
    struct PriceObservation {
        uint256 price;
        uint256 blockNumber;
        bool isValid;                // False if rejected by 10% filter
    }

    /**
     * @dev Per-batch oracle statistics
     */
    struct OracleStats {
        uint256[] observations;      // All price observations
        uint256 trimmedAverage;      // Computed after trimming
        int256 delta1;               // Accuracy + precision score (basis points)
        int256 delta2;               // Dispute-based adjustment (basis points)
        bool ignored;                // True if deviation > 10% from others
    }

    /**
     * @dev User order information
     */
    struct UserOrder {
        uint256 amount;
        Side side;
        bool claimed;
        bool disputed;
    }

    /**
     * @dev Batch data structure
     */
    struct Batch {
        BatchState state;
        address asset;
        uint256 openEnd;
        uint256 accumulationEnd;
        uint256 disputeEnd;
        uint256 settlingEnd;
        uint256 settlementPrice;
        uint256 buyVolume;
        uint256 sellVolume;
        uint256 buyDisputedVolume;
        uint256 sellDisputedVolume;
        mapping(address => UserOrder) orders;
        address[] users;
        mapping(uint256 => OracleStats) oracleStats;  // oracleId => stats
    }

    // ===== CONSTANTS =====
    uint256 public constant OPEN_DURATION = 50;           // 50 blocks (extended for testing)
    uint256 public constant ACCUMULATION_DURATION = 48;   // 48 blocks
    uint256 public constant DISPUTE_DURATION = 15;        // 15 blocks
    uint256 public constant SETTLING_DURATION = 10;       // 10 blocks
    
    uint256 public constant COLLECTION_INTERVAL = 4;      // Collect every 4 blocks
    uint256 public constant MAX_PRICE_DEVIATION = 10;     // 10% max deviation filter
    uint256 public constant TRIM_PERCENT = 10;            // Trim 10% from each end
    uint256 public constant ORACLE_DEVIATION_THRESHOLD = 10; // 10% between oracle avgs
    
    uint256 public constant DISPUTE_VOID_THRESHOLD = 33;  // 33% dispute voids batch
    uint256 public constant WEIGHT_MIN = 1;
    uint256 public constant WEIGHT_MAX = 1000;
    uint256 public constant WEIGHT_DEFAULT = 100;
    
    uint256 public constant BASIS_POINTS = 10000;         // For percentage calculations
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_STALENESS = 300;          // 5 minutes

    // ===== STATE VARIABLES =====
    uint256 public batchCounter;
    mapping(uint256 => Batch) public batches;
    
    // Oracle registry
    uint256 public oracleCount;
    mapping(uint256 => OracleInfo) public oracles;        // oracleId => info
    mapping(address => uint256) public oracleAddressToId; // address => oracleId
    
    uint256 public currentBatchId;
    uint256 public lastCollectionBlock;

    // ===== EVENTS =====
    event BatchCreated(uint256 indexed batchId, address asset, uint256 openEnd);
    event BatchStateChanged(uint256 indexed batchId, BatchState newState, uint256 endBlock);
    event Deposited(uint256 indexed batchId, address indexed user, uint256 amount, Side side);
    event OracleRegistered(uint256 indexed oracleId, address oracleAddress, uint256 initialWeight);
    event OraclePriceCollected(uint256 indexed batchId, uint256 indexed oracleId, uint256 price, bool isValid);
    event OracleWeightUpdated(uint256 indexed oracleId, uint256 oldWeight, uint256 newWeight, int256 delta1, int256 delta2);
    event Disputed(uint256 indexed batchId, address indexed user, Side side, uint256 amount);
    event BatchSettled(uint256 indexed batchId, uint256 settlementPrice, uint256 buyFillRatio, uint256 sellFillRatio);
    event BatchVoided(uint256 indexed batchId, string reason);
    event Claimed(uint256 indexed batchId, address indexed user, uint256 filled, uint256 refunded);

    // ===== CONSTRUCTOR =====
    constructor() Ownable(msg.sender) {
        // Start first batch automatically
        _createBatch(address(0)); // Will be set by owner
    }

    // ===== ORACLE MANAGEMENT =====

    /**
     * @notice Register a new oracle with default weight
     * @param _oracleAddress Address of the oracle contract
     */
    function registerOracle(address _oracleAddress) external onlyOwner returns (uint256) {
        require(_oracleAddress != address(0), "Invalid oracle address");
        require(oracleAddressToId[_oracleAddress] == 0, "Oracle already registered");
        
        oracleCount++;
        uint256 oracleId = oracleCount;
        
        oracles[oracleId] = OracleInfo({
            oracleAddress: _oracleAddress,
            weight: WEIGHT_DEFAULT,
            lastPrice: 0,
            lastUpdateBlock: 0,
            isActive: true
        });
        
        oracleAddressToId[_oracleAddress] = oracleId;
        
        emit OracleRegistered(oracleId, _oracleAddress, WEIGHT_DEFAULT);
        return oracleId;
    }

    /**
     * @notice Deactivate an oracle (emergency only)
     */
    function deactivateOracle(uint256 _oracleId) external onlyOwner {
        require(_oracleId > 0 && _oracleId <= oracleCount, "Invalid oracle ID");
        oracles[_oracleId].isActive = false;
    }

    /**
     * @notice Reactivate an oracle
     */
    function activateOracle(uint256 _oracleId) external onlyOwner {
        require(_oracleId > 0 && _oracleId <= oracleCount, "Invalid oracle ID");
        oracles[_oracleId].isActive = true;
    }

    // ===== BATCH LIFECYCLE =====

    /**
     * @notice Create a new batch (internal, auto-called)
     */
    function _createBatch(address _asset) internal returns (uint256) {
        uint256 batchId = batchCounter++;
        Batch storage batch = batches[batchId];
        
        batch.state = BatchState.OPEN;
        batch.asset = _asset;
        batch.openEnd = block.number + OPEN_DURATION;
        batch.accumulationEnd = batch.openEnd + ACCUMULATION_DURATION;
        batch.disputeEnd = batch.accumulationEnd + DISPUTE_DURATION;
        batch.settlingEnd = batch.disputeEnd + SETTLING_DURATION;
        
        currentBatchId = batchId;
        
        emit BatchCreated(batchId, _asset, batch.openEnd);
        return batchId;
    }

    /**
     * @notice Set the trading asset for current batch (owner only)
     */
    function setBatchAsset(address _asset) external onlyOwner {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.OPEN, "Can only set asset in OPEN state");
        require(batch.users.length == 0, "Cannot change asset after deposits");
        batch.asset = _asset;
    }

    /**
     * @notice Deposit into current batch
     * @param _amount Amount to deposit
     * @param _side BUY or SELL
     */
    function deposit(uint256 _amount, Side _side) external nonReentrant {
        Batch storage batch = batches[currentBatchId];
        require(
            batch.state == BatchState.OPEN || batch.state == BatchState.ACCUMULATING,
            "Batch not accepting deposits"
        );
        require(block.number < batch.accumulationEnd, "Deposit phase ended");
        require(_amount > 0, "Amount must be > 0");
        require(batch.asset != address(0), "Asset not set");

        // Transfer tokens
        IERC20(batch.asset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record order
        if (batch.orders[msg.sender].amount == 0) {
            batch.users.push(msg.sender);
        }
        
        batch.orders[msg.sender].amount += _amount;
        batch.orders[msg.sender].side = _side;

        // Update volume
        if (_side == Side.BUY) {
            batch.buyVolume += _amount;
        } else {
            batch.sellVolume += _amount;
        }

        emit Deposited(currentBatchId, msg.sender, _amount, _side);
    }

    /**
     * @notice Transition from OPEN to ACCUMULATING (anyone can call when time expires)
     */
    function startAccumulation() external {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.OPEN, "Not in OPEN state");
        require(block.number >= batch.openEnd, "OPEN phase not ended");

        batch.state = BatchState.ACCUMULATING;
        batch.accumulationEnd = block.number + ACCUMULATION_DURATION;
        lastCollectionBlock = block.number;

        emit BatchStateChanged(currentBatchId, BatchState.ACCUMULATING, batch.accumulationEnd);
    }

    /**
     * @notice Collect oracle prices (called every 4 blocks during ACCUMULATING)
     */
    function collectOraclePrices() external {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.ACCUMULATING, "Not in ACCUMULATING state");
        require(block.number < batch.accumulationEnd, "ACCUMULATING phase ended");
        require(block.number >= lastCollectionBlock + COLLECTION_INTERVAL, "Too early to collect");

        lastCollectionBlock = block.number;

        // Collect from each active oracle
        for (uint256 i = 1; i <= oracleCount; i++) {
            OracleInfo storage oracle = oracles[i];
            if (!oracle.isActive) continue;

            try IOracle(oracle.oracleAddress).latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                // Check staleness
                if (block.timestamp - updatedAt > MAX_STALENESS) {
                    emit OraclePriceCollected(currentBatchId, i, 0, false);
                    continue;
                }

                uint256 price = uint256(answer);
                bool isValid = true;

                // Apply 10% deviation filter
                if (oracle.lastPrice > 0) {
                    uint256 deviation = _calculateDeviation(price, oracle.lastPrice);
                    if (deviation > MAX_PRICE_DEVIATION) {
                        isValid = false;
                    }
                }

                if (isValid) {
                    batch.oracleStats[i].observations.push(price);
                    oracle.lastPrice = price;
                }

                oracle.lastUpdateBlock = block.number;
                emit OraclePriceCollected(currentBatchId, i, price, isValid);

            } catch {
                emit OraclePriceCollected(currentBatchId, i, 0, false);
            }
        }
    }

    /**
     * @notice Transition from ACCUMULATING to DISPUTING
     */
    function startDispute() external {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.ACCUMULATING, "Not in ACCUMULATING state");
        require(block.number >= batch.accumulationEnd, "ACCUMULATING phase not ended");

        // Compute settlement price and delta_1
        _computeSettlementPrice(currentBatchId);
        _computeDelta1(currentBatchId);

        batch.state = BatchState.DISPUTING;
        batch.disputeEnd = block.number + DISPUTE_DURATION;

        emit BatchStateChanged(currentBatchId, BatchState.DISPUTING, batch.disputeEnd);
    }

    /**
     * @notice User disputes the settlement price
     */
    function dispute() external nonReentrant {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.DISPUTING, "Not in DISPUTING state");
        require(block.number < batch.disputeEnd, "DISPUTING phase ended");
        require(batch.orders[msg.sender].amount > 0, "No order to dispute");
        require(!batch.orders[msg.sender].disputed, "Already disputed");
        require(!batch.orders[msg.sender].claimed, "Already claimed");

        UserOrder storage order = batch.orders[msg.sender];
        order.disputed = true;

        uint256 amount = order.amount;
        Side side = order.side;

        // Track disputed volume
        if (side == Side.BUY) {
            batch.buyDisputedVolume += amount;
        } else {
            batch.sellDisputedVolume += amount;
        }

        emit Disputed(currentBatchId, msg.sender, side, amount);
    }

    /**
     * @notice Transition from DISPUTING to SETTLING
     */
    function startSettling() external {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.DISPUTING, "Not in DISPUTING state");
        require(block.number >= batch.disputeEnd, "DISPUTING phase not ended");

        // Check dispute threshold
        uint256 totalVolume = batch.buyVolume + batch.sellVolume;
        uint256 maxDisputedVolume = batch.buyDisputedVolume > batch.sellDisputedVolume 
            ? batch.buyDisputedVolume 
            : batch.sellDisputedVolume;

        uint256 disputeRatio = (maxDisputedVolume * 100) / totalVolume;

        if (disputeRatio > DISPUTE_VOID_THRESHOLD) {
            // Void the batch - too many disputes
            _voidBatch(currentBatchId, "Dispute threshold exceeded");
            return;
        }

        // Compute delta_2
        _computeDelta2(currentBatchId, disputeRatio);

        batch.state = BatchState.SETTLING;
        batch.settlingEnd = block.number + SETTLING_DURATION;

        emit BatchStateChanged(currentBatchId, BatchState.SETTLING, batch.settlingEnd);
    }

    /**
     * @notice Execute settlement (called once at end of SETTLING phase)
     */
    function executeSettlement() external {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.SETTLING, "Not in SETTLING state");
        require(block.number >= batch.settlingEnd, "SETTLING phase not ended");

        // Update oracle weights
        _updateOracleWeights(currentBatchId);

        // Emit settlement event (users claim individually)
        uint256 buyFillRatio = _calculateFillRatio(batch.buyVolume, batch.sellVolume, true);
        uint256 sellFillRatio = _calculateFillRatio(batch.buyVolume, batch.sellVolume, false);

        emit BatchSettled(currentBatchId, batch.settlementPrice, buyFillRatio, sellFillRatio);

        // Start next batch
        _createBatch(batch.asset);
    }

    /**
     * @notice Void a batch and refund all users
     */
    function _voidBatch(uint256 _batchId, string memory _reason) internal {
        Batch storage batch = batches[_batchId];
        batch.state = BatchState.OPEN; // Reuse OPEN as VOIDED state
        emit BatchVoided(_batchId, _reason);
        
        // Start next batch
        _createBatch(batch.asset);
    }

    // ===== CLAIMING =====

    /**
     * @notice Claim filled amount and refund
     */
    function claim(uint256 _batchId) external nonReentrant {
        Batch storage batch = batches[_batchId];
        UserOrder storage order = batch.orders[msg.sender];
        
        require(order.amount > 0, "No order");
        require(!order.claimed, "Already claimed");

        order.claimed = true;

        uint256 filled = 0;
        uint256 refunded = 0;

        if (order.disputed || batch.state == BatchState.OPEN) {
            // Full refund for disputed or voided batch
            refunded = order.amount;
        } else {
            // Calculate filled amount
            uint256 fillRatio = _calculateFillRatio(batch.buyVolume, batch.sellVolume, order.side == Side.BUY);
            filled = (order.amount * fillRatio) / PRECISION;
            refunded = order.amount - filled;
        }

        uint256 total = filled + refunded;
        if (total > 0) {
            IERC20(batch.asset).safeTransfer(msg.sender, total);
        }

        emit Claimed(_batchId, msg.sender, filled, refunded);
    }

    // ===== INTERNAL CALCULATIONS =====

    /**
     * @notice Compute settlement price and mark bad oracles
     */
    function _computeSettlementPrice(uint256 _batchId) internal {
        Batch storage batch = batches[_batchId];

        // Step 1: Compute trimmed average for each oracle
        uint256[] memory oracleAvgs = new uint256[](oracleCount + 1);
        uint256 validCount = 0;

        for (uint256 i = 1; i <= oracleCount; i++) {
            OracleStats storage stats = batch.oracleStats[i];
            if (stats.observations.length < 3) {
                stats.ignored = true;
                continue;
            }

            // Compute trimmed average
            uint256[] memory sorted = _sortArray(stats.observations);
            uint256 trimCount = (sorted.length * TRIM_PERCENT) / 100;
            uint256 sum = 0;
            uint256 count = 0;

            for (uint256 j = trimCount; j < sorted.length - trimCount; j++) {
                sum += sorted[j];
                count++;
            }

            if (count > 0) {
                oracleAvgs[i] = sum / count;
                stats.trimmedAverage = oracleAvgs[i];
                validCount++;
            } else {
                stats.ignored = true;
            }
        }

        require(validCount >= 2, "Insufficient valid oracles");

        // Step 2: Filter oracles with >10% deviation from neighbors
        uint256[] memory sortedAvgs = new uint256[](validCount);
        uint256[] memory sortedIds = new uint256[](validCount);
        uint256 idx = 0;

        for (uint256 i = 1; i <= oracleCount; i++) {
            if (!batch.oracleStats[i].ignored && oracleAvgs[i] > 0) {
                sortedAvgs[idx] = oracleAvgs[i];
                sortedIds[idx] = i;
                idx++;
            }
        }

        // Sort by price using insertion sort (gas-optimized for small arrays)
        for (uint256 i = 1; i < validCount; i++) {
            uint256 keyAvg = sortedAvgs[i];
            uint256 keyId = sortedIds[i];
            uint256 j = i;
            
            while (j > 0 && sortedAvgs[j - 1] > keyAvg) {
                sortedAvgs[j] = sortedAvgs[j - 1];
                sortedIds[j] = sortedIds[j - 1];
                j--;
            }
            sortedAvgs[j] = keyAvg;
            sortedIds[j] = keyId;
        }

        // Mark outliers
        for (uint256 i = 0; i < validCount - 1; i++) {
            uint256 deviation = _calculateDeviation(sortedAvgs[i + 1], sortedAvgs[i]);
            if (deviation > ORACLE_DEVIATION_THRESHOLD) {
                batch.oracleStats[sortedIds[i + 1]].ignored = true;
            }
        }

        // Step 3: Compute weighted settlement price
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;

        for (uint256 i = 1; i <= oracleCount; i++) {
            if (!batch.oracleStats[i].ignored && oracleAvgs[i] > 0) {
                uint256 weight = oracles[i].weight;
                weightedSum += oracleAvgs[i] * weight;
                totalWeight += weight;
            }
        }

        require(totalWeight > 0, "No valid weighted oracles");
        batch.settlementPrice = weightedSum / totalWeight;
    }

    /**
     * @notice Compute delta_1 for each oracle (accuracy + precision)
     */
    function _computeDelta1(uint256 _batchId) internal {
        Batch storage batch = batches[_batchId];
        uint256 settlementPrice = batch.settlementPrice;

        for (uint256 i = 1; i <= oracleCount; i++) {
            OracleStats storage stats = batch.oracleStats[i];
            if (stats.observations.length == 0) continue;

            // Accuracy: deviation from settlement price
            uint256 x = _calculateDeviation(stats.trimmedAverage, settlementPrice);

            // Precision: internal variance
            uint256 y = 0;
            if (stats.observations.length > 1) {
                uint256 sumDev = 0;
                for (uint256 j = 0; j < stats.observations.length; j++) {
                    uint256 dev = _calculateDeviation(stats.observations[j], stats.trimmedAverage);
                    sumDev += dev;
                }
                y = sumDev / stats.observations.length;
            }

            // delta_1 = -2x² - 3y² + 10 (in basis points)
            int256 accuracyPenalty = -2 * int256(x * x);
            int256 precisionPenalty = -3 * int256(y * y);
            int256 bonus = 1000; // 10% in basis points

            stats.delta1 = accuracyPenalty + precisionPenalty + bonus;
        }
    }

    /**
     * @notice Compute delta_2 based on dispute ratio
     */
    function _computeDelta2(uint256 _batchId, uint256 _disputeRatio) internal {
        Batch storage batch = batches[_batchId];

        if (_disputeRatio == 0) {
            // No disputes, no adjustment
            for (uint256 i = 1; i <= oracleCount; i++) {
                batch.oracleStats[i].delta2 = 0;
            }
            return;
        }

        // Determine direction
        bool isBuyerDispute = batch.buyDisputedVolume > batch.sellDisputedVolume;

        // Sort oracles by trimmed average
        uint256[] memory sortedIds = new uint256[](oracleCount);
        uint256[] memory sortedPrices = new uint256[](oracleCount);
        
        for (uint256 i = 1; i <= oracleCount; i++) {
            sortedIds[i - 1] = i;
            sortedPrices[i - 1] = batch.oracleStats[i].trimmedAverage;
        }

        // Bubble sort
        for (uint256 i = 0; i < oracleCount - 1; i++) {
            for (uint256 j = i + 1; j < oracleCount; j++) {
                if (sortedPrices[i] > sortedPrices[j]) {
                    (sortedPrices[i], sortedPrices[j]) = (sortedPrices[j], sortedPrices[i]);
                    (sortedIds[i], sortedIds[j]) = (sortedIds[j], sortedIds[i]);
                }
            }
        }

        // Assign penalties: -1, -2, -3, -4, -5, ...
        int256[] memory basePenalties = new int256[](oracleCount);
        int256 sumPenalties = 0;

        for (uint256 i = 0; i < oracleCount; i++) {
            basePenalties[i] = -int256(i + 1);
            sumPenalties += basePenalties[i];
        }

        // Scale by dispute ratio
        int256 scaleFactor = int256(_disputeRatio * BASIS_POINTS / DISPUTE_VOID_THRESHOLD);
        
        for (uint256 i = 0; i < oracleCount; i++) {
            basePenalties[i] = (basePenalties[i] * scaleFactor) / int256(BASIS_POINTS);
        }

        // Normalize to zero-sum
        int256 meanPenalty = sumPenalties / int256(oracleCount);
        
        for (uint256 i = 0; i < oracleCount; i++) {
            int256 normalized = basePenalties[i] - meanPenalty;
            
            // Flip if seller dispute (higher price was more correct)
            if (!isBuyerDispute) {
                normalized = -normalized;
            }
            
            batch.oracleStats[sortedIds[i]].delta2 = normalized;
        }
    }

    /**
     * @notice Update oracle weights based on delta_1 and delta_2
     */
    function _updateOracleWeights(uint256 _batchId) internal {
        Batch storage batch = batches[_batchId];

        for (uint256 i = 1; i <= oracleCount; i++) {
            OracleInfo storage oracle = oracles[i];
            OracleStats storage stats = batch.oracleStats[i];

            if (stats.observations.length == 0) continue;

            uint256 oldWeight = oracle.weight;

            // Apply delta_1: W * (1 + delta1/10000)
            int256 newWeightInt = int256(oldWeight) + (int256(oldWeight) * stats.delta1) / int256(BASIS_POINTS);
            
            // Apply delta_2: W * (1 + delta2/10000)
            newWeightInt = newWeightInt + (newWeightInt * stats.delta2) / int256(BASIS_POINTS);

            // Clamp to [1, 1000]
            uint256 newWeight;
            if (newWeightInt < int256(WEIGHT_MIN)) {
                newWeight = WEIGHT_MIN;
            } else if (newWeightInt > int256(WEIGHT_MAX)) {
                newWeight = WEIGHT_MAX;
            } else {
                newWeight = uint256(newWeightInt);
            }

            oracle.weight = newWeight;

            emit OracleWeightUpdated(i, oldWeight, newWeight, stats.delta1, stats.delta2);
        }
    }

    /**
     * @notice Calculate fill ratio for pro-rata settlement
     */
    function _calculateFillRatio(uint256 _buyVolume, uint256 _sellVolume, bool _isBuy) internal pure returns (uint256) {
        if (_buyVolume == 0 || _sellVolume == 0) {
            return 0;
        }

        if (_isBuy) {
            return _buyVolume <= _sellVolume ? PRECISION : (_sellVolume * PRECISION) / _buyVolume;
        } else {
            return _sellVolume <= _buyVolume ? PRECISION : (_buyVolume * PRECISION) / _sellVolume;
        }
    }

    /**
     * @notice Calculate percentage deviation between two values
     */
    function _calculateDeviation(uint256 _value1, uint256 _value2) internal pure returns (uint256) {
        if (_value2 == 0) return 0;
        uint256 diff = _value1 > _value2 ? _value1 - _value2 : _value2 - _value1;
        return (diff * 100) / _value2;
    }

    /**
     * @notice Sort array using insertion sort (gas-optimized for small arrays)
     */
    function _sortArray(uint256[] memory _array) internal pure returns (uint256[] memory) {
        uint256[] memory sorted = new uint256[](_array.length);
        for (uint256 i = 0; i < _array.length; i++) {
            sorted[i] = _array[i];
        }

        // Insertion sort - optimal for small arrays (3-10 elements)
        for (uint256 i = 1; i < sorted.length; i++) {
            uint256 key = sorted[i];
            uint256 j = i;
            
            while (j > 0 && sorted[j - 1] > key) {
                sorted[j] = sorted[j - 1];
                j--;
            }
            sorted[j] = key;
        }

        return sorted;
    }

    // ===== VIEW FUNCTIONS =====

    function getBatchState(uint256 _batchId) external view returns (BatchState) {
        return batches[_batchId].state;
    }

    function getOracleInfo(uint256 _oracleId) external view returns (OracleInfo memory) {
        return oracles[_oracleId];
    }

    function getOracleStats(uint256 _batchId, uint256 _oracleId) external view returns (
        uint256 observationCount,
        uint256 trimmedAverage,
        int256 delta1,
        int256 delta2,
        bool ignored
    ) {
        OracleStats storage stats = batches[_batchId].oracleStats[_oracleId];
        return (
            stats.observations.length,
            stats.trimmedAverage,
            stats.delta1,
            stats.delta2,
            stats.ignored
        );
    }

    function getUserOrder(uint256 _batchId, address _user) external view returns (
        uint256 amount,
        Side side,
        bool claimed,
        bool disputed
    ) {
        UserOrder storage order = batches[_batchId].orders[_user];
        return (order.amount, order.side, order.claimed, order.disputed);
    }

    function getCurrentBatchInfo() external view returns (
        uint256 batchId,
        BatchState state,
        uint256 endBlock,
        uint256 buyVolume,
        uint256 sellVolume,
        uint256 settlementPrice
    ) {
        Batch storage batch = batches[currentBatchId];
        uint256 end;
        
        if (batch.state == BatchState.OPEN) end = batch.openEnd;
        else if (batch.state == BatchState.ACCUMULATING) end = batch.accumulationEnd;
        else if (batch.state == BatchState.DISPUTING) end = batch.disputeEnd;
        else if (batch.state == BatchState.SETTLING) end = batch.settlingEnd;

        return (
            currentBatchId,
            batch.state,
            end,
            batch.buyVolume,
            batch.sellVolume,
            batch.settlementPrice
        );
    }
}
