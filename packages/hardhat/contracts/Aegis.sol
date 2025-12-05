// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Aegis Protocol V2.2
 * @notice Fair, MEV-resistant batch settlement with sequential oracle validation
 */

interface IChainlinkOracle {
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

    function getRoundData(uint80 _roundId)
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

contract Aegis is Ownable {
    using SafeERC20 for IERC20;

    // ===== ENUMS =====
    enum BatchState {
        OPEN,
        ACCUMULATING,
        DISPUTING,
        SETTLING,
        SETTLED,
        VOIDED
    }

    enum Side {
        BUY,
        SELL
    }

    // ===== STRUCTS =====
    struct OraclePrice {
        uint256 price; // Scaled to 10^8
        uint256 updatedAt;
        uint80 roundId;
        uint256 blockNumber;
        address validator;
    }

    struct Batch {
        BatchState state;
        address asset;
        uint256 createdAt;
        uint256 accumulationEnd;
        uint256 disputeEnd;
        mapping(address => uint256) deposits;
        mapping(address => Side) side;
        OraclePrice[] prices;
        mapping(uint256 => bool) priceRemoved; // Tracks removed prices
        uint256 settlementPrice;
        mapping(address => uint256) filled;
        mapping(address => uint256) refund;
        mapping(address => bool) claimed;
        address[] users;
    }

    struct BatchConfig {
        uint256 sequentialThreshold; // In percentage, e.g., 10 for 10%
        uint256 trimmedMeanPercent; // In percentage, e.g., 4 for 4%
    }

    // ===== CONSTANTS =====
    uint256 constant ACCUMULATION_DURATION = 50; // blocks
    uint256 constant DISPUTE_WINDOW = 10; // blocks
    uint256 constant EMERGENCY_TIMEOUT = 1000; // blocks
    uint256 constant MIN_PRICES = 7;
    uint256 constant MAX_STALENESS = 300; // seconds
    uint256 constant SEGMENT_WIDTH = 5; // blocks
    uint256 constant CHALLENGE_THRESHOLD = 5; // 5%
    uint256 constant PRICE_SCALE = 1e8;
    uint256 constant PRECISION = 1e18;

    // ===== STATE VARIABLES =====
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => BatchConfig) public batchConfigs;
    uint256 public batchCounter;
    IChainlinkOracle public oracle;
    uint256 public defaultSequentialThreshold = 10; // 10%
    uint256 public defaultTrimmedMeanPercent = 4; // 4%

    // ===== EVENTS =====
    event BatchCreated(uint256 indexed batchId, address asset);
    event Deposited(
        uint256 indexed batchId,
        address indexed user,
        uint256 amount,
        Side side
    );
    event OracleUpdated(
        uint256 indexed batchId,
        uint256 blockNumber,
        uint256 price
    );
    event Challenged(
        uint256 indexed batchId,
        uint256 priceIndex,
        address challenger
    );
    event BatchSettled(
        uint256 indexed batchId,
        uint256 settlementPrice,
        bytes32 stateRoot
    );
    event Claimed(
        uint256 indexed batchId,
        address indexed user,
        uint256 filled,
        uint256 refund
    );
    event BatchVoided(uint256 indexed batchId, string reason);

    // ===== CONSTRUCTOR =====
    // FIX: Pass msg.sender to Ownable constructor for OZ v5 compatibility
    constructor(address _oracle) Ownable(msg.sender) {
        oracle = IChainlinkOracle(_oracle);
    }

    // ===== CORE FUNCTIONS =====

    /**
     * @notice Create a new batch
     */
    function createBatch(address _asset)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 batchId = batchCounter++;
        Batch storage batch = batches[batchId];
        batch.state = BatchState.OPEN;
        batch.asset = _asset;
        batch.createdAt = block.timestamp;

        // Set default config
        batchConfigs[batchId].sequentialThreshold = defaultSequentialThreshold;
        batchConfigs[batchId].trimmedMeanPercent = defaultTrimmedMeanPercent;

        emit BatchCreated(batchId, _asset);
        return batchId;
    }

    /**
     * @notice User deposits into batch
     */
    function deposit(
        uint256 _batchId,
        uint256 _amount,
        Side _side
    ) external {
        Batch storage batch = batches[_batchId];
        require(
            batch.state == BatchState.OPEN || batch.state == BatchState.ACCUMULATING,
            "Batch not accepting deposits"
        );
        require(_amount > 0, "Amount must be > 0");

        // Transfer from user to contract
        IERC20(batch.asset).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        // Record deposit
        if (batch.deposits[msg.sender] == 0) {
            batch.users.push(msg.sender);
        }
        batch.deposits[msg.sender] += _amount;
        batch.side[msg.sender] = _side;

        emit Deposited(_batchId, msg.sender, _amount, _side);
    }

    /**
     * @notice Start accumulation phase
     */
    function startAccumulation(uint256 _batchId) external onlyOwner {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.OPEN, "Batch not in OPEN state");

        batch.state = BatchState.ACCUMULATING;
        batch.accumulationEnd = block.number + ACCUMULATION_DURATION;
    }

    /**
     * @notice Collect oracle price (called every 5 blocks)
     */
    function updateAccumulator(uint256 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.ACCUMULATING, "Batch not accumulating");
        require(
            block.number % SEGMENT_WIDTH == 0,
            "Not at segment boundary"
        );

        // Get latest price from Chainlink
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,

        ) = oracle.latestRoundData();

        // Check staleness
        require(
            block.timestamp - updatedAt <= MAX_STALENESS,
            "Price too stale"
        );

        // Store price
        OraclePrice memory priceData = OraclePrice({
            price: uint256(answer),
            updatedAt: updatedAt,
            roundId: roundId,
            blockNumber: block.number,
            validator: block.coinbase
        });

        batch.prices.push(priceData);

        emit OracleUpdated(_batchId, block.number, uint256(answer));

        // Transition to DISPUTING if accumulation period ended
        if (block.number >= batch.accumulationEnd) {
            _transitionToDisputing(_batchId);
        }
    }

    /**
     * @notice Transition to DISPUTING phase
     */
    function _transitionToDisputing(uint256 _batchId) internal {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.ACCUMULATING, "Not in ACCUMULATING");

        if (batch.prices.length < MIN_PRICES) {
            // Insufficient prices, void batch
            batch.state = BatchState.VOIDED;
            emit BatchVoided(_batchId, "Insufficient oracle prices");
            return;
        }

        batch.state = BatchState.DISPUTING;
        batch.disputeEnd = block.number + DISPUTE_WINDOW;
    }

    /**
     * @notice Challenge a price as anomalous
     */
    function challenge(uint256 _batchId, uint256 _priceIndex) external {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.DISPUTING, "Not in DISPUTING phase");
        require(block.number < batch.disputeEnd, "Dispute window closed");
        require(_priceIndex < batch.prices.length, "Invalid price index");
        require(!batch.priceRemoved[_priceIndex], "Price already removed");

        OraclePrice memory targetPrice = batch.prices[_priceIndex];

        // Compute current median (excluding removed prices)
        uint256 medianPrice = _computeMedian(_batchId);

        // Calculate deviation
        uint256 deviation = _calculateDeviation(
            targetPrice.price,
            medianPrice
        );
        require(
            deviation > CHALLENGE_THRESHOLD,
            "Deviation below threshold"
        );

        // Verify with Chainlink
        (
            ,
            int256 answer,
            ,
            ,

        ) = oracle.getRoundData(targetPrice.roundId);

        require(
            uint256(answer) == targetPrice.price,
            "Price mismatch with oracle"
        );

        // Mark price as removed
        batch.priceRemoved[_priceIndex] = true;

        emit Challenged(_batchId, _priceIndex, msg.sender);
    }

    /**
     * @notice Settle batch after dispute window
     * CRITICAL: This includes sequential validation + 2/3 check
     */
    function settleBatch(uint256 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.DISPUTING, "Not in DISPUTING");
        require(block.number >= batch.disputeEnd, "Dispute window not closed");

        // STEP 1: Sequential Validation
        uint256 validCount = 0;
        uint256 totalCount = batch.prices.length;
        
        for (uint256 i = 0; i < totalCount; i++) {
            if (batch.priceRemoved[i]) continue;
            
            if (_isValidBySequential(_batchId, i)) {
                validCount++;
            } else {
                batch.priceRemoved[i] = true;
            }
        }

        // STEP 2: 2/3 Data Quality Check ⭐ CRITICAL
        uint256 minValid = (totalCount * 2) / 3;
        if (validCount < minValid) {
            batch.state = BatchState.VOIDED;
            emit BatchVoided(_batchId, "Insufficient valid prices");
            return;
        }

        batch.state = BatchState.SETTLING;

        // STEP 3: Settlement Price
        batch.settlementPrice = _computeMedian(_batchId);

        // STEP 4: Pro-Rata Settlement
        _computeProRataFills(_batchId);

        batch.state = BatchState.SETTLED;

        emit BatchSettled(_batchId, batch.settlementPrice, bytes32(0));
    }

    /**
     * @notice Sequential validation: price within X% of both neighbors
     */
    function _isValidBySequential(uint256 _batchId, uint256 _idx)
        internal
        view
        returns (bool)
    {
        Batch storage batch = batches[_batchId];
        uint256 threshold = batchConfigs[_batchId].sequentialThreshold;
        OraclePrice memory price = batch.prices[_idx];

        // First price: always valid (no left neighbor)
        if (_idx == 0) return true;

        // Last price: always valid (no right neighbor)
        if (_idx == batch.prices.length - 1) return true;

        // Check left neighbor
        if (batch.priceRemoved[_idx - 1]) return false; // Skip removed prices
        uint256 leftDev = _calculateDeviation(
            price.price,
            batch.prices[_idx - 1].price
        );
        if (leftDev > threshold) return false;

        // Check right neighbor
        if (batch.priceRemoved[_idx + 1]) return false; // Skip removed prices
        uint256 rightDev = _calculateDeviation(
            price.price,
            batch.prices[_idx + 1].price
        );
        if (rightDev > threshold) return false;

        return true;
    }

    /**
     * @notice Calculate percentage deviation between two prices
     */
    function _calculateDeviation(uint256 _price1, uint256 _price2)
        internal
        pure
        returns (uint256)
    {
        if (_price2 == 0) return 0;
        uint256 diff = _price1 > _price2
            ? _price1 - _price2
            : _price2 - _price1;
        return (diff * 100) / _price2;
    }

    /**
     * @notice Compute median with trimming
     */
    function _computeMedian(uint256 _batchId) internal view returns (uint256) {
        Batch storage batch = batches[_batchId];
        uint256 trimPercent = batchConfigs[_batchId].trimmedMeanPercent;

        // Collect valid prices
        uint256[] memory validPrices = new uint256[](batch.prices.length);
        uint256 validCount = 0;

        for (uint256 i = 0; i < batch.prices.length; i++) {
            if (!batch.priceRemoved[i]) {
                validPrices[validCount] = batch.prices[i].price;
                validCount++;
            }
        }

        require(validCount > 0, "No valid prices");

        // Sort prices
        uint256[] memory sorted = _sortPrices(validPrices, validCount);

        // Calculate trim count
        uint256 trimCount = (validCount * trimPercent) / 100;

        // Calculate trimmed mean
        uint256 sum = 0;
        uint256 count = 0;
        for (uint256 i = trimCount; i < validCount - trimCount; i++) {
            sum += sorted[i];
            count++;
        }

        return sum / count;
    }

    /**
     * @notice Sort prices (bubble sort for simplicity, optimize later)
     */
    function _sortPrices(uint256[] memory _prices, uint256 _count)
        internal
        pure
        returns (uint256[] memory)
    {
        uint256[] memory sorted = new uint256[](_count);
        for (uint256 i = 0; i < _count; i++) {
            sorted[i] = _prices[i];
        }

        // Bubble sort
        for (uint256 i = 0; i < _count; i++) {
            for (uint256 j = i + 1; j < _count; j++) {
                if (sorted[i] > sorted[j]) {
                    uint256 temp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = temp;
                }
            }
        }

        return sorted;
    }

    /**
     * @notice Compute pro-rata fills for all users
     */
    function _computeProRataFills(uint256 _batchId) internal {
        Batch storage batch = batches[_batchId];

        // FIX: Removed incorrect variables from top of function

        // Calculate volumes
        uint256 buyVolume = 0;
        uint256 sellVolume = 0;

        for (uint256 i = 0; i < batch.users.length; i++) {
            address user = batch.users[i];
            if (batch.side[user] == Side.BUY) {
                buyVolume += batch.deposits[user];
            } else {
                sellVolume += batch.deposits[user];
            }
        }

        uint256 effectiveVolume = buyVolume < sellVolume
            ? buyVolume
            : sellVolume;

        // Calculate fill ratios
        uint256 ratioBuy = buyVolume <= sellVolume
            ? PRECISION
            : (effectiveVolume * PRECISION) / buyVolume;

        uint256 ratioSell = sellVolume <= buyVolume
            ? PRECISION
            : (effectiveVolume * PRECISION) / sellVolume;

        // Calculate fills for each user
        for (uint256 i = 0; i < batch.users.length; i++) {
            address user = batch.users[i];
            // FIX: Renamed local 'deposit' to 'userDeposit' to avoid shadowing function
            uint256 userDeposit = batch.deposits[user];
            uint256 ratio = batch.side[user] == Side.BUY
                ? ratioBuy
                : ratioSell;

            // FIX: Now 'userDeposit' and 'ratio' are defined when used
            uint256 filled = (userDeposit * ratio) / PRECISION;
            uint256 refund = userDeposit - filled;

            batch.filled[user] = filled;
            batch.refund[user] = refund;
        }
    }

    /**
     * @notice User claims their settled funds
     */
    function claim(uint256 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.SETTLED, "Batch not settled");
        require(!batch.claimed[msg.sender], "Already claimed");

        uint256 filled = batch.filled[msg.sender];
        uint256 refund = batch.refund[msg.sender];
        uint256 total = filled + refund;

        require(total > 0, "Nothing to claim");

        batch.claimed[msg.sender] = true;

        IERC20(batch.asset).safeTransfer(msg.sender, total);

        emit Claimed(_batchId, msg.sender, filled, refund);
    }

    /**
     * @notice Emergency void batch if stuck
     */
    function emergencyVoid(uint256 _batchId) external onlyOwner {
        Batch storage batch = batches[_batchId];
        require(
            block.number >=
                batch.accumulationEnd + DISPUTE_WINDOW + EMERGENCY_TIMEOUT,
            "Emergency timeout not reached"
        );
        require(batch.state != BatchState.SETTLED, "Already settled");

        batch.state = BatchState.VOIDED;
        emit BatchVoided(_batchId, "Emergency timeout");
    }

    /**
     * @notice Emergency refund for voided batches
     */
    function emergencyWithdraw(uint256 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batch.state == BatchState.VOIDED, "Batch not voided");
        require(!batch.claimed[msg.sender], "Already claimed");

        // FIX: Renamed 'deposit' to 'userDeposit' to avoid shadowing function
        uint256 userDeposit = batch.deposits[msg.sender];
        require(userDeposit > 0, "No deposit");

        batch.claimed[msg.sender] = true;

        // FIX: Using correct variable 'userDeposit'
        IERC20(batch.asset).safeTransfer(msg.sender, userDeposit);

        emit Claimed(_batchId, msg.sender, 0, userDeposit);
    }

    // ===== VIEW FUNCTIONS =====

    function getBatchState(uint256 _batchId)
        external
        view
        returns (BatchState)
    {
        return batches[_batchId].state;
    }

    function getBatchPrice(uint256 _batchId, uint256 _idx)
        external
        view
        returns (OraclePrice memory)
    {
        return batches[_batchId].prices[_idx];
    }

    function getBatchPriceCount(uint256 _batchId)
        external
        view
        returns (uint256)
    {
        return batches[_batchId].prices.length;
    }

    function getUserDeposit(uint256 _batchId, address _user)
        external
        view
        returns (uint256)
    {
        return batches[_batchId].deposits[_user];
    }

    function getUserFilled(uint256 _batchId, address _user)
        external
        view
        returns (uint256)
    {
        return batches[_batchId].filled[_user];
    }

    function getUserRefund(uint256 _batchId, address _user)
        external
        view
        returns (uint256)
    {
        return batches[_batchId].refund[_user];
    }
}
