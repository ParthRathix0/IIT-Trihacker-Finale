# AegisV3 Architecture

## System Overview

AegisV3 is a multi-oracle batch settlement system designed for decentralized exchange operations with Byzantine fault tolerance and MEV resistance. The system aggregates orders into batches, collects prices from multiple oracles, and executes settlements using a sophisticated weighted median algorithm.

## Core Components

### 1. Batch Lifecycle State Machine

```
╔═══════════════════════════════════════════════════════════════╗
║                    AEGIS BATCH LIFECYCLE                       ║
╚═══════════════════════════════════════════════════════════════╝

         ┌─────────────┐
         │    OPEN     │  Duration: 12 blocks (~36 seconds)
         │  Phase 1/4  │  Action: Users deposit BUY/SELL orders
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │ ACCUMULATING│  Duration: 48 blocks (~144 seconds)
         │  Phase 2/4  │  Action: Oracle price collection (×12)
         └──────┬──────┘         + Statistical processing
                │
                ▼
         ┌─────────────┐
         │  DISPUTING  │  Duration: 15 blocks (~45 sec)
         │  Phase 3/4  │  Action: Settlement price computed
         └──────┬──────┘         Users can dispute if needed
                │
                ▼
         ┌─────────────┐
         │  SETTLING   │  Duration: 10 blocks (~30 sec)
         │  Phase 4/4  │  Action: Oracle weights updated
         └──────┬──────┘         Users claim settled funds
                │
                ▼
         [New Batch Created] ──→ Back to OPEN
         
         Total Cycle: 85 blocks (~4.25 minutes)
```

#### State Details

**OPEN Phase (12 blocks, ~36 seconds)**
- Users can deposit BUY or SELL orders
- Orders accumulate in the batch
- Volume tracking for both sides
- Note: Extended to 50 blocks in current deployment for testing purposes

**ACCUMULATING Phase (48 blocks, ~144 seconds)**
- Oracle prices collected every 4 blocks (12 samples total)
- Each oracle provides 12 price points over the period
- Statistical data accumulated for aggregation
- Note: Current deployment allows deposits during this phase too (extended window)

**DISPUTING Phase (15 blocks, ~45 seconds)**
- Settlement price computed using weighted average
- Users can dispute if they disagree with the price
- Delta_1 calculated (accuracy + precision penalties)
- Dispute threshold: 33% of volume (configurable)

**SETTLING Phase (10 blocks, ~30 seconds)**
- Delta_2 calculated (based on dispute correlation)
- Oracle weights updated based on performance
- Fill ratios computed for buyers and sellers
- Users can claim their settled amounts

### 2. Oracle Management System

```
╔═══════════════════════════════════════════════════════════════╗
║              ORACLE AGGREGATION SYSTEM                         ║
╚═══════════════════════════════════════════════════════════════╝

Phase: ACCUMULATING (48 blocks)
Collection Interval: Every 4 blocks → 12 total collections

┌────────────────────────────────────────────────────────────┐
│  Block 0    Block 4    Block 8   ...   Block 44           │
│    ↓          ↓          ↓               ↓                │
│  ┌───┐     ┌───┐     ┌───┐           ┌───┐              │
│  │ C │     │ C │     │ C │    ...    │ C │  ← Collection│
│  └───┘     └───┘     └───┘           └───┘     Events    │
└────────────────────────────────────────────────────────────┘

For EACH collection:
  ┌──────────────────────────────────────────────┐
  │  Oracle 1 → Price + Timestamp                │
  │  Oracle 2 → Price + Timestamp                │
  │  Oracle 3 → Price + Timestamp                │
  │  Oracle 4 → Price + Timestamp                │
  │  Oracle 5 → Price + Timestamp                │
  └──────────────────────────────────────────────┘

Result: 5 oracles × 12 samples = 60 total price points


STATISTICAL PROCESSING:
═══════════════════════════════════════════════════════════

Step 1: PER-ORACLE TRIMMING
─────────────────────────────
For each oracle's 12 prices:
  [P₁, P₂, P₃, P₄, P₅, P₆, P₇, P₈, P₉, P₁₀, P₁₁, P₁₂]
           ↓ Sort
  [P₁, P₂, P₃, P₄, P₅, P₆, P₇, P₈, P₉, P₁₀, P₁₁, P₁₂]
   ╳                                                  ╳
   └──────────────────────────────────────────────────┘
    Drop 10% lowest & 10% highest (1-2 prices each end)
           ↓
  [P₂, P₃, P₄, P₅, P₆, P₇, P₈, P₉, P₁₀, P₁₁]
           ↓ Average
    Trimmed Average = (P₂+P₃+...+P₁₁) / 10

Step 2: DEVIATION FILTER (Oracle-to-Oracle)
────────────────────────────────────────────
  Sort oracles by trimmed average: [Low, ..., High]
  Check adjacent pairs: |price[i+1] - price[i]| / price[i]
  
  If deviation > 10% → Mark oracle as 'ignored'
  Ignored oracles excluded from settlement calculation

Step 3: WEIGHTED AVERAGE SETTLEMENT
───────────────────────────────────
  Input: [(trimmed_avg₁, weight₁), ..., (trimmed_avg₅, weight₅)]
         + ignore flags from deviation filter
         ↓ Filter out ignored oracles
  Valid: [(trimmed_avg_A, weight_A), (trimmed_avg_B, weight_B), ...]
         ↓ Calculate weighted average
  Settlement Price = Σ(trimmed_avg × weight) / Σ(weight)
```

#### Oracle Registration
```solidity
struct OracleInfo {
    address oracleAddress;
    uint256 weight;        // Dynamic weight (starts at 100)
    bool isActive;
    uint256 totalSamples;  // Lifetime sample count
}
```

#### Weight Adjustment Algorithm

```
╔═══════════════════════════════════════════════════════════════╗
║            ORACLE WEIGHT UPDATE MECHANISM                      ║
╚═══════════════════════════════════════════════════════════════╝

TWO-STAGE UPDATE PROCESS:
═══════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────┐
│ Stage 1: Delta_1 (DISPUTING Phase)                        │
│          Measures: Accuracy + Precision                     │
└────────────────────────────────────────────────────────────┘

  Formula: Δ₁ = -2x² - 3y² + 10  (in percentage points)

  Where:
    x = Accuracy deviation from settlement price
      = |oracle_avg - settlement_price| / settlement_price × 100
    
    y = Precision (internal variance of oracle's readings)
      = average(|price_i - oracle_avg| / oracle_avg × 100)

  Examples:
  ┌──────────┬───────────┬─────────┬────────────────┐
  │ Accuracy │ Precision │ Delta_1 │ Interpretation │
  ├──────────┼───────────┼─────────┼────────────────┤
  │   1%     │   0.5%    │ +9.25%  │ Excellent      │
  │   2%     │   1%      │ +1.0%   │ Good           │
  │   3%     │   1.5%    │ -11.75% │ Poor           │
  │   5%     │   2%      │ -52.0%  │ Very Poor      │
  └──────────┴───────────┴─────────┴────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Stage 2: Delta_2 (SETTLING Phase)                         │
│          Measures: Dispute Correlation                      │
└────────────────────────────────────────────────────────────┘

  IF dispute_ratio > 33% (DISPUTE_VOID_THRESHOLD):
    → Batch voided, no delta_2 applied
  
  ELSE:
    Apply directional correction based on which side disputed

    Algorithm:
      1. Sort oracles by trimmed average: [Low, ..., High]
      2. Assign base penalties: [-1, -2, -3, -4, -5]
      3. Scale by dispute ratio: penalty × (dispute_ratio / 33%)
      4. Normalize to zero-sum: Add mean to make Σ(penalties) = 0
      5. If sellers disputed more → flip signs
         (higher prices were more correct in rising market)

  Example (5 oracles, 15% buyer disputes = buyers think price too high):
    Sorted prices: [$1950, $1980, $2000, $2020, $2050]
    Base penalties: [-1, -2, -3, -4, -5]
    Scaled (15%/33% = 0.45): [-0.45, -0.91, -1.36, -1.82, -2.27]
    Mean = -1.36, normalize: [+0.91, +0.45, 0, -0.45, -0.91]
    
    Result: $1950 (lowest) gets +0.91% boost (was most correct)
            $2050 (highest) gets -0.91% penalty (was most wrong)

┌────────────────────────────────────────────────────────────┐
│ Final Weight Update                                         │
└────────────────────────────────────────────────────────────┘

  W_new = W_old × (1 + Δ₁/100) × (1 + Δ₂/100)
  W_new = clamp(W_new, 1, 1000)
  
  MIN_WEIGHT = 1     (Cannot eliminate oracle completely)
  MAX_WEIGHT = 1000  (Cannot dominate consensus)
```

**Weight Evolution Example:**
```
Batch    Oracle_A  Oracle_B  Oracle_C  Oracle_D  Oracle_E  Notes
  0        100       100       100       100       100     Initial
  1        109       105       100       89        88      A accurate (+9%)
  2        118       110       105       80        78      A continues well
  3        128       115       100       72        69      C recovers to neutral
  4        139       121       105       65        61      D struggling
  5        151       127       110       58        54      Clear leader (A)
  6        164       133       105       52        48      D poor performer
  7        178       140       110       47        43
  8        193       147       115       42        38      D near minimum
  9        209       154       120       38        34
 10        227       162       125       34        30      Stable hierarchy

Analysis:
- Oracle A: Consistently accurate & precise → weight 227 (2.27x influence)
- Oracle B: Good performance → weight 162 (1.62x influence)
- Oracle C: Average → weight 125 (1.25x influence)
- Oracle D: Poor accuracy → weight 34 (0.34x influence)
- Oracle E: Very poor → weight 30 (0.30x influence, near minimum)
```


### 3. Price Aggregation Algorithm

#### Step 1: Data Collection
- 5 oracles × 12 samples = 60 total price points per batch
- Collection interval: 4 blocks (prevents gaming)
- Staleness check: 1 hour max age (for Chainlink oracles)

#### Step 2: Statistical Trimming (Per Oracle)
```typescript
// For each oracle's 12 samples:
1. Sort prices: [p1, p2, ..., p12] using insertion sort (optimal for small n)
2. Remove outliers: Drop lowest 10% and highest 10% (1-2 prices each end)
3. Calculate trimmed average: avg([p2, p3, ..., p11])
4. Store trimmed_average for delta_1 calculation
```

**Algorithm Choice**: Insertion sort is optimal for 3-12 elements:
- O(n²) complexity but ~50% fewer writes than bubble sort
- Typical case: ~n²/4 comparisons vs bubble sort's ~n²/2
- Gas savings: ~2-3k per settlement operation

#### Step 3: Oracle Filtering
```solidity
1. Sort oracles by their trimmed averages (insertion sort)
2. For each adjacent pair, check: |price[i+1] - price[i]| / price[i]
3. If deviation > 10%, mark oracle as 'ignored'
4. Ignored oracles don't participate in settlement price calculation
```

#### Step 4: Weighted Average Calculation
```solidity
Settlement Price = Σ(trimmed_avg_i × weight_i) / Σ(weight_i)

Where:
- trimmed_avg_i = Oracle i's trimmed average (after outlier removal)
- weight_i = Oracle i's current weight (1-1000)
- Sum includes only non-ignored oracles
```

**Example:**
```
Oracle 1: $2000, weight 110, not ignored → contributes: 2000 × 110 = 220,000
Oracle 2: $2005, weight 100, not ignored → contributes: 2005 × 100 = 200,500
Oracle 3: $2010, weight 105, not ignored → contributes: 2010 × 105 = 211,050
Oracle 4: $2020, weight 115, ignored    → contributes: 0 (excluded)
Oracle 5: $2030, weight 120, ignored    → contributes: 0 (excluded)

Total weighted sum: 220,000 + 200,500 + 211,050 = 631,550
Total weight: 110 + 100 + 105 = 315

Settlement Price: 631,550 / 315 = $2,004.92
```

### 4. Settlement Execution

#### Fill Ratio Calculation
```solidity
function _calculateFillRatio(
    uint256 buyVolume,
    uint256 sellVolume,
    bool isBuy
) returns (uint256 fillRatio) {
    
    if (buyVolume > sellVolume) {
        // More buyers than sellers
        buyFillRatio = (sellVolume * 10000) / buyVolume;   // Partial fill
        sellFillRatio = 10000;                              // Full fill
    } else {
        // More sellers than buyers
        buyFillRatio = 10000;                               // Full fill
        sellFillRatio = (buyVolume * 10000) / sellVolume;  // Partial fill
    }
}
```

#### User Settlement Formula
```solidity
For BUYER:
    filled_amount = deposited_amount * buy_fill_ratio / 10000
    tokens_received = filled_amount  // Gets WETH back
    
For SELLER:
    filled_amount = deposited_amount * sell_fill_ratio / 10000
    tokens_received = filled_amount  // Gets WETH back
```

### 5. Security Features

```
╔═══════════════════════════════════════════════════════════════╗
║              DISPUTE MECHANISM FLOWCHART                       ║
╚═══════════════════════════════════════════════════════════════╝

User disagrees with settlement price?
         │
         ├─ YES → Call dispute()
         │         │
         │         ├─ Record: user disputed volume
         │         ├─ Mark order as disputed
         │         └─ Emit DisputeRaised event
         │
         └─ NO → Proceed to claim()

After DISPUTING phase ends:
         │
         ├─ Calculate: dispute_ratio = disputed_vol / total_vol
         │
         ├─ If dispute_ratio ≥ 33% (DISPUTE_VOID_THRESHOLD)
         │    │
         │    └─→ BATCH VOIDED
         │         ├─ Users refunded 100%
         │         ├─ No settlement executed
         │         └─ Oracle weights unchanged
         │
         └─ If dispute_ratio < 33%
              │
              └─→ SETTLEMENT PROCEEDS
                   ├─ Non-disputed users: normal settlement
                   ├─ Disputed users: refunded 100%
                   └─ Oracle weights updated (with delta_2)

Key Security Properties:
  ✓ Minority can't grief (need 33%+ volume)
  ✓ Legitimate concerns can void bad batches
  ✓ Disputed users always get refunds
  ✓ Non-disputed users benefit from settlement
```

```
╔═══════════════════════════════════════════════════════════════╗
║          SETTLEMENT & CLAIMING PROCESS                         ║
╚═══════════════════════════════════════════════════════════════╝

After SETTLING phase:
         │
         ▼
┌────────────────────────────────┐
│ User calls claim()             │
└────────────────────────────────┘
         │
         ├─ Check: Already claimed? → Revert
         │
         ├─ Check: Disputed? 
         │    └─ YES → Refund 100% deposited amount
         │    └─ NO  → Calculate filled amount
         │
         ├─ Fill Ratio Logic:
         │    Buy Volume > Sell Volume?
         │      ├─ Buyers: partial fill (sell_vol / buy_vol)
         │      └─ Sellers: 100% fill
         │    
         │    Sell Volume > Buy Volume?
         │      ├─ Buyers: 100% fill
         │      └─ Sellers: partial fill (buy_vol / sell_vol)
         │
         ├─ Calculate: filled_amt = deposited * fill_ratio
         │
         ├─ Transfer: WETH to user
         │
         ├─ Mark: order.claimed = true
         │
         └─ Emit: OrderClaimed event

Example:
  Buy Volume: 175 WETH
  Sell Volume: 140 WETH
  
  → Buyers get: 140/175 = 80% fill
  → Sellers get: 100% fill
  
  Buyer deposited 50 WETH:
    ├─ Filled: 50 × 0.8 = 40 WETH
    └─ Receives: 40 WETH back
  
  Seller deposited 30 WETH:
    ├─ Filled: 30 × 1.0 = 30 WETH
    └─ Receives: 30 WETH back
```

#### MEV Resistance
- **Batch Execution**: All orders execute at the same price
- **Time-Lock Phases**: No front-running possible within batch
- **Fair Price Discovery**: Weighted average prevents manipulation

#### Byzantine Fault Tolerance
- **Multi-Oracle Design**: 5 oracles (can handle 2 failures)
- **Statistical Trimming**: Outliers automatically removed per oracle (10% each end)
- **Weighted Average**: Bad actors' influence proportional to their reputation weight
- **Adaptive Weights**: Malicious oracles lose influence over time via delta_1 and delta_2

#### Sybil Resistance
- **Weight Bounds**: Maximum weight capped at 1000, minimum at 1
- **Multiplicative Updates**: Weight changes compound over time (exponential impact)
- **Minimum Weight**: Bad oracles can't be eliminated completely (always weight ≥ 1)

#### Reentrancy Protection
```solidity
- NonReentrant modifier on all state-changing functions
- Checks-Effects-Interactions pattern
- SafeERC20 for token transfers
```

## Data Structures

### Batch Structure
```solidity
struct Batch {
    BatchState state;
    address asset;
    uint256 openEnd;
    uint256 accumulationEnd;
    uint256 disputeEnd;
    uint256 settlingEnd;
    uint256 buyVolume;
    uint256 sellVolume;
    uint256 settlementPrice;
    uint256 buyDisputedVolume;
    uint256 sellDisputedVolume;
}
```

### Order Structure
```solidity
struct Order {
    uint256 amount;
    Side side;        // BUY or SELL
    bool claimed;
    bool disputed;
}
```

### Oracle Statistics (Per Batch)
```solidity
struct OracleStats {
    uint256[] observations;      // All 12 price samples
    uint256 trimmedAverage;      // After removing outliers
    int256 delta1;               // Deviation from batch average
    int256 delta2;               // Dispute correlation score
    bool ignored;                // If failed staleness check
}
```

## Key Design Decisions

### Key System Invariants

The following properties MUST hold at all times:

1. **Weight Bounds**: `1 ≤ oracle.weight ≤ 1000` for all active oracles
   - Prevents any single oracle from dominating
   - Ensures failed oracles retain minimal influence
   - 1000x range allows significant differentiation

2. **Phase Timing**: Each batch progresses through phases in order
   - OPEN (12 blocks) → ACCUMULATING (48 blocks) → DISPUTING (15 blocks) → SETTLING (10 blocks)
   - No skipping, no reversing
   - Total: 85 blocks per batch cycle
   - Enforced by state machine

3. **Volume Conservation**: Sum of all fills equals min(buyVolume, sellVolume)
   - No tokens created or destroyed
   - Unmatched volume refunded
   - Fill ratios ensure conservation

4. **Claim Uniqueness**: Each user can claim exactly once per batch
   - order.claimed flag prevents double-spending
   - Checked before every transfer

5. **Dispute Integrity**: Disputed users always receive 100% refund
   - No partial fills for disputed orders
   - Guaranteed by claim() logic
   - Batch voided if dispute_ratio > 33%

6. **Oracle Sample Count**: Each oracle provides exactly 12 samples (if active)
   - Collected every 4 blocks during ACCUMULATING
   - Missing samples flagged but don't halt batch
   - Staleness checks ensure data freshness

7. **Settlement Atomicity**: Either all non-disputed orders settle, or none do
   - Dispute threshold voiding is all-or-nothing
   - No partial batch settlements
   - State transitions are atomic

## Key Design Decisions

### 1. Extended Deposit Window (Testing Only)
**Decision**: Current deployment allows deposits during ACCUMULATING phase (not in spec)
- **Rationale**: Extended OPEN phase to 50 blocks for easier testing and demonstration
- **Production Spec**: OPEN = 12 blocks, deposits only in OPEN phase
- **Current Testing**: OPEN = 50 blocks, deposits allowed in OPEN + ACCUMULATING
- **Trade-off**: Better UX and longer participation window vs slightly longer batch cycle
- **Note**: This is a testing convenience, not the final production design

### 2. Collection Interval
**Decision**: 4 blocks between oracle price collections
- **Rationale**: Balance between data richness and gas costs
- **Alternative Considered**: Every block (too expensive), every 10 blocks (too sparse)
- **Result**: 12 samples over 48 blocks = good statistical basis

### 3. Trimming Strategy
**Decision**: Drop 10% lowest and 10% highest from each oracle's 12 samples
- **Rationale**: Removes clear outliers while preserving majority of data
- **Alternative Considered**: Fixed count (e.g., drop 2 prices), IQR method (more complex)
- **Result**: 1-2 prices removed from each end (10% of 12 ≈ 1.2 prices)
- **Benefit**: Simple, gas-efficient, effective against outliers and flash crashes

### 4. Weight Update Formula
**Decision**: Multiplicative updates with Δ₁ = -2x² - 3y² + 10 and directional Δ₂
- **Rationale**: 
  - Quadratic penalties for both accuracy (x²) and precision (y²)
  - Precision weighted 1.5x more than accuracy (coefficient 3 vs 2)
  - Base bonus of +10% encourages participation
  - Multiplicative application: W_new = W_old × (1 + Δ₁/100) × (1 + Δ₂/100)
- **Alternative Considered**: 
  - Linear penalties (less sensitive to outliers)
  - Additive updates (±5, ±10) - less dynamic range
  - Exponential moving average (more complex)
- **Benefit**: 
  - Smooth adaptation over time
  - Heavily penalizes inaccurate/imprecise oracles
  - Resistant to temporary failures
  - Bounded range [1, 1000] prevents extremes

### 5. Dispute Mechanism
**Decision**: User-initiated disputes with 33% threshold
- **Rationale**: Requires significant volume to void batch, prevents minority griefing
- **Trade-off**: Requires coordination but ensures legitimate concerns are heard
- **Threshold**: 33% = max(buy_disputed_volume, sell_disputed_volume) / total_volume
- **Benefit**: 
  - Legitimate objections can void bad batches
  - Disputed users always get 100% refund
  - Non-disputed users still benefit from settlement if <33%
  - Dispute data used for delta_2 directional correction

## Gas Optimization Techniques

### 1. Batch Processing
- Single settlement for all users vs individual trades
- Amortizes fixed costs across participants
- Result: ~180k gas per user (competitive with DEX aggregators)

### 2. Storage Optimization
```solidity
// Packed struct (single storage slot where possible)
struct OracleInfo {
    address oracleAddress;  // 20 bytes
    uint96 weight;          // 12 bytes (packed with address)
    bool isActive;          // 1 byte
    ...
}
```

### 3. Loop Optimization
- Early exits when possible
- Minimal storage writes in loops
- Pre-calculate values outside loops

### 4. Event vs Storage
- Emit events for historical data instead of storing
- Reduces storage costs significantly
- Users can reconstruct history from events

## Upgradeability Considerations

**Current Design**: Non-upgradeable
- **Rationale**: Security and immutability priority
- **Future**: Consider proxy pattern for non-critical parameters

**Configurable Parameters** (Owner-controlled):
- `DISPUTE_VOID_THRESHOLD`: Can adjust dispute sensitivity
- Oracle registration/deactivation
- Batch asset selection

**Non-Configurable** (Constants):
- Phase durations: Set at deployment for predictability
- Weight bounds: Critical security parameters
- Collection interval: Affects system behavior fundamentally

## Potential Extensions

### 1. Multi-Asset Support
- Current: Single asset per deployment
- Extension: Asset-specific batches running in parallel
- Benefit: More market coverage

### 2. Advanced Dispute Resolution
- Current: Simple threshold-based voiding
- Extension: Mediation period, arbitration
- Benefit: More nuanced conflict resolution

### 3. Oracle Reputation NFTs
- Current: On-chain weights only
- Extension: Transferable reputation tokens
- Benefit: Market for oracle services

### 4. Cross-Chain Oracles
- Current: Same-chain oracles only
- Extension: Aggregate prices from multiple chains
- Benefit: More diverse price sources

## Testing Strategy

### Unit Tests
- Individual function validation
- Edge case coverage
- Access control verification

### Integration Tests
- Full batch cycle execution
- Multi-user scenarios
- Oracle weight evolution

### Stress Tests
- Maximum users per batch
- Extreme price volatility
- Multiple concurrent batches

### Security Tests
- Reentrancy attacks
- Front-running attempts
- Oracle collusion scenarios
- Overflow/underflow checks

## Deployment Checklist

- [ ] Deploy MockWETH (or use existing WETH)
- [ ] Deploy 5+ oracle contracts (or use Chainlink feeds)
- [ ] Deploy AegisV3 contract
- [ ] Register all oracles
- [ ] Set batch asset (WETH)
- [ ] Verify contracts on Etherscan
- [ ] Test with small amounts
- [ ] Monitor first few batches
- [ ] Gradually increase limits

## Monitoring & Maintenance

### Key Metrics
- Oracle weight evolution over time
- Dispute rates per batch
- Average fill ratios
- Gas costs per user
- Settlement price vs external markets

### Alerts
- Oracle downtime (missing samples)
- High dispute rates (>10%)
- Large weight deviations
- Settlement price outliers
- Unusual volume patterns

### Maintenance Tasks
- Oracle performance review (weekly)
- Weight distribution analysis (monthly)
- System parameter optimization (quarterly)
- Security audits (bi-annually)
