# 🛡️ Aegis Protocol V3.0

<div align="center">

**Fair, MEV-Resistant Batch Settlement with Multi-Oracle Dynamic Weighting**

[![Built with Scaffold-ETH 2](https://img.shields.io/badge/Built%20with-Scaffold--ETH%202-blue)](https://scaffoldeth.io)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-363636?logo=solidity)](https://soliditylang.org/)
[![Multi-Oracle](https://img.shields.io/badge/Multi--Oracle-Dynamic%20Weights-375bd2)](https://github.com)
[![Live on Sepolia](https://img.shields.io/badge/Live-Sepolia%20Testnet-green)](https://sepolia.etherscan.io/address/0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1)

</div>

---

## 🚀 Live Deployment

**Sepolia Testnet** (Verified & Operational)

### Main Contract
- **AegisV3**: [`0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1`](https://sepolia.etherscan.io/address/0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1)

### Price Oracles (5 Active)
1. **GoodOracle1**: [`0xd183695ef91510D3a324a89e0159Daed5d7A9F6e`](https://sepolia.etherscan.io/address/0xd183695ef91510D3a324a89e0159Daed5d7A9F6e)
2. **GoodOracle2**: [`0xF78F12c4ef47e8e865F8DCFBB5bCe8CCCB2F9dAD`](https://sepolia.etherscan.io/address/0xF78F12c4ef47e8e865F8DCFBB5bCe8CCCB2F9dAD)
3. **GoodOracle3**: [`0x9eE7202D855b7a87CdB6C97A2dbe1C005263Ec29`](https://sepolia.etherscan.io/address/0x9eE7202D855b7a87CdB6C97A2dbe1C005263Ec29)
4. **SlightlyOffOracle**: [`0xf12Dd20D764be3F5D5Aea54cc19Af9F8b449796f`](https://sepolia.etherscan.io/address/0xf12Dd20D764be3F5D5Aea54cc19Af9F8b449796f)
5. **VolatileOracle**: [`0x3AeFBc8A39B4fda7247C39Dbabe888Ae7E305cc9`](https://sepolia.etherscan.io/address/0x3AeFBc8A39B4fda7247C39Dbabe888Ae7E305cc9)

### Supporting Contracts
- **MockWETH**: [`0x46059af680A19f3D149B3B8049D3aecA9050914C`](https://sepolia.etherscan.io/address/0x46059af680A19f3D149B3B8049D3aecA9050914C)

**Status**: ✅ All contracts deployed, tested, and operational

---

## 🎬 Quick Demo for Judges

**Interactive Demo Menu** (Recommended):
```bash
cd packages/hardhat
./scripts/judge-demo.sh
```

**Individual Demos**:
```bash
# Run test suite (12-step batch lifecycle)
./scripts/run-tests.sh

# Show gas cost analysis (amortized costs)
./scripts/show-gas-costs.sh

# Verify Sepolia deployment (live contracts)
npx hardhat run scripts/testnet-demo.ts --network sepolia
```

📚 **Full guide**: See [`DEMO_SCRIPTS.md`](packages/hardhat/DEMO_SCRIPTS.md) for detailed instructions

---

## 📖 Overview

**Aegis Protocol V3.0** is a revolutionary decentralized exchange (DEX) settlement mechanism that combines:

- **Multi-Oracle Consensus**: Aggregates price data from multiple oracles with dynamic reliability weighting
- **MEV Resistance**: Batch-based settlement eliminates front-running and sandwich attacks
- **Dynamic Weight System**: Oracles are rewarded/penalized based on accuracy and precision
- **Dispute Mechanism**: Users can challenge unfair prices with built-in market direction correction
- **4-Phase Lifecycle**: Continuous operation with overlapping batches

### 🎯 Key Innovations

- **🔄 Dynamic Oracle Weights**: Each oracle has a weight (1-1000) that adjusts based on performance
- **📊 Dual Penalty System**: 
  - **Delta_1**: Accuracy (-2x²) + Precision (-3y²) + Bonus (+10)
  - **Delta_2**: Dispute-based directional correction with zero-sum normalization
- **⚖️ Fair Price Discovery**: Weighted average of trimmed oracle data with outlier filtering
- **🛡️ Dispute Protection**: 33% threshold prevents batch execution if market significantly moved
- **🔁 Continuous Operation**: Automatic batch cycling with 85-block total cycle time

Built using **NextJS**, **RainbowKit**, **Hardhat**, **Wagmi**, **Viem**, and **Typescript**.

---

## 🏗️ Architecture

### 4-Phase Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      OPEN       │────▶│  ACCUMULATING   │────▶│   DISPUTING     │────▶│   SETTLING      │
│   (12 blocks)   │     │   (48 blocks)   │     │   (15 blocks)   │     │   (10 blocks)   │
│                 │     │                 │     │                 │     │                 │
│ Users deposit   │     │ Oracle price    │     │ User disputes   │     │ Execute trades  │
│ BUY/SELL orders │     │ collection      │     │ & refunds       │     │ Update weights  │
│                 │     │ every 4 blocks  │     │                 │     │ Auto-cycle      │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
       ▲                                                                           │
       │                                                                           │
       └───────────────────────────────────────────────────────────────────────────┘
                              Total Cycle: 85 blocks (~4.25 minutes)
```

### Phase Details

#### Phase 1: OPEN (12 blocks ~36 seconds)
**Purpose**: User order collection window

**Actions**:
- Users call `deposit(amount, side)` with BUY or SELL
- Assets locked in escrow
- No price exposure during this phase
- Buy/sell volumes tracked separately

**Transition**: Anyone calls `startAccumulation()` after 12 blocks

---

#### Phase 2: ACCUMULATING (48 blocks ~144 seconds)
**Purpose**: Multi-oracle price collection and analysis

**Collection Schedule**: Every 4 blocks (12 collection points total)

**Algorithm**:
1. **Collect Prices**: Call `collectOraclePrices()` every 4 blocks
2. **Filter Invalid Data**: Reject if price differs >10% from oracle's last reading
3. **Store Valid Observations**: Build array of accepted prices per oracle
4. **Compute Trimmed Averages**: 
   - Sort each oracle's prices
   - Remove top/bottom 10%
   - Calculate mean of remaining data
5. **Filter Bad Oracles**: 
   - Sort oracles by their trimmed averages
   - Mark oracle as `ignored` if deviation from neighbor >10%
6. **Calculate Settlement Price**:
   ```
   Settlement Price = Σ(oracle_avg[i] × weight[i]) / Σ(weight[i])
   ```
7. **Compute Delta_1** (accuracy + precision penalties):
   ```
   x = |oracle_avg - settlement_price| / settlement_price × 100
   y = avg(|price - oracle_avg| / oracle_avg × 100) for all prices
   delta_1 = -2x² - 3y² + 10  (in percentage points)
   ```

**Transition**: Anyone calls `startDispute()` after 48 blocks

---

#### Phase 3: DISPUTING (15 blocks ~45 seconds)
**Purpose**: Allow users to challenge unfair settlement price

**User Actions**:
- Call `dispute()` if unhappy with settlement price
- Order marked for full refund
- Dispute volume tracked by side (BUY/SELL)

**Threshold Check**:
```
dispute_ratio = max(buy_disputed_volume, sell_disputed_volume) / total_volume

if dispute_ratio > 33%:
    VOID batch → Refund everyone → Start new batch
else:
    Proceed to SETTLING
```

**Delta_2 Calculation** (directional correction):
1. Sort oracles by trimmed average: `[Low, ..., High]`
2. Assign base penalties: `[-1, -2, -3, -4, -5]`
3. Scale by dispute ratio: `penalty × (dispute_ratio / 33%)`
4. Normalize to zero-sum: Add mean to make Σ(penalties) = 0
5. If seller disputes, flip signs (higher price was more correct)

**Example** (5 oracles, 15% buyer disputes):
```
Sorted: [$1950, $1980, $2000, $2020, $2050]
Base:   [-1,    -2,     -3,     -4,     -5]
Scaled: [-0.45, -0.91,  -1.36,  -1.82,  -2.27]
Normalized: [+0.91, +0.45, 0, -0.45, -0.91]
```

**Interpretation**: Oracle reporting $1950 (lowest, most correct in downward market) gets +0.91% weight boost

**Transition**: Anyone calls `startSettling()` after 15 blocks

---

#### Phase 4: SETTLING (10 blocks ~30 seconds)
**Purpose**: Execute trades and update oracle weights

**Actions**:
1. **Calculate Fill Ratios**:
   ```solidity
   if buy_volume <= sell_volume:
       buy_fill_ratio = 100%
       sell_fill_ratio = buy_volume / sell_volume
   else:
       sell_fill_ratio = 100%
       buy_fill_ratio = sell_volume / buy_volume
   ```

2. **Update Oracle Weights**:
   ```solidity
   W_new = W_old × (1 + delta_1/100) × (1 + delta_2/100)
   W_new = clamp(W_new, 1, 1000)
   ```

3. **Auto-Transition**: Call `executeSettlement()` → Creates next OPEN batch

**Users Claim**: Call `claim(batchId)` anytime after to receive filled + refunded amounts

---

## 📐 Mathematical Specifications

### Oracle Weight System

#### Weight Properties
- **Range**: [1, 1000] (prevents zero-division, caps influence)
- **Default**: 100 (neutral starting point)
- **Update**: Multiplicative adjustment via delta_1 and delta_2

#### Delta_1: Performance Score

**Formula**:
$$
\Delta_1 = -2x^2 - 3y^2 + 10
$$

Where:
- $x$ = **Accuracy deviation** (% difference from settlement price)
  $$
  x = \frac{|\text{oracle\_avg} - \text{settlement\_price}|}{\text{settlement\_price}} \times 100
  $$

- $y$ = **Precision** (internal variance of oracle's readings)
  $$
  y = \text{mean}\left(\frac{|\text{price}_i - \text{oracle\_avg}|}{\text{oracle\_avg}} \times 100\right)
  $$

**Examples**:
| Accuracy (x) | Precision (y) | Delta_1 | Weight Change |
|--------------|---------------|---------|---------------|
| 1% | 0.5% | +9.25% | +9.25% boost |
| 2% | 1% | +1.0% | +1.0% boost |
| 5% | 2% | -62.0% | 38% of original |
| 10% | 5% | -275.0% | Clamped to minimum |

**Design Philosophy**:
- Quadratic penalties ensure large deviations are severely punished
- Precision matters: Volatile oracles lose reputation even if average is correct
- +10 bonus ensures good oracles net positive reward
- Oracle with x=1.5%, y=0.5% breaks even (delta_1 ≈ 0)

#### Delta_2: Dispute Adjustment

**Purpose**: Correct for market direction bias

**Formula**:
$$
\Delta_2[i] = \left(\frac{\text{dispute\_ratio}}{33\%}\right) \times \left(-(\text{rank}[i] + 1) - \text{mean\_rank}\right)
$$

If seller disputes (wants higher price), flip signs.

**Zero-Sum Property**: $\Sigma \Delta_2 = 0$ (no net weight inflation/deflation)

**Example Scenario**:
- **Market**: Falling from $2000 to $1950
- **Settlement**: $2000 (computed before fall)
- **Buyer Disputes**: 20% (want lower price)
- **Oracle Prices**: [$1950, $1980, $2000, $2020, $2050]

Without delta_2, all oracles punished equally for deviating from $2000. But $1950 oracle was most correct!

**Delta_2 Correction**:
```
Base penalties: [-1, -2, -3, -4, -5]
Scaled (20%/33%): [-0.6, -1.2, -1.8, -2.4, -3.0]
Normalized: [+1.2, +0.6, 0, -0.6, -1.2]
```

Result: Lowest oracle gets +1.2% boost, highest gets -1.2% penalty

### Settlement Price Calculation

**Weighted Average**:
$$
P_{\text{settlement}} = \frac{\sum_{i=1}^{N} P_i^{\text{trimmed}} \times W_i}{\sum_{i=1}^{N} W_i}
$$

Where:
- $P_i^{\text{trimmed}}$ = Trimmed average of oracle $i$'s observations
- $W_i$ = Current weight of oracle $i$
- $N$ = Number of non-ignored oracles

### Pro-Rata Fill Mathematics

**Buy Side**:
$$
\text{filled}_{\text{buy}} = \text{deposit}_{\text{buy}} \times \min\left(1, \frac{V_{\text{sell}}}{V_{\text{buy}}}\right)
$$

**Sell Side**:
$$
\text{filled}_{\text{sell}} = \text{deposit}_{\text{sell}} \times \min\left(1, \frac{V_{\text{buy}}}{V_{\text{sell}}}\right)
$$

**Refund**:
$$
\text{refund} = \text{deposit} - \text{filled}
$$

---

## 🔧 Smart Contract API

### Core Functions

#### User Functions
```solidity
// Deposit into current batch
function deposit(uint256 amount, Side side) external

// Dispute settlement price (during DISPUTING phase)
function dispute() external

// Claim filled amount + refund
function claim(uint256 batchId) external
```

#### Keeper Functions (Anyone Can Call)
```solidity
// Transition OPEN → ACCUMULATING
function startAccumulation() external

// Collect oracle prices (every 4 blocks during ACCUMULATING)
function collectOraclePrices() external

// Transition ACCUMULATING → DISPUTING
function startDispute() external

// Transition DISPUTING → SETTLING
function startSettling() external

// Execute settlement and start next batch
function executeSettlement() external
```

#### Owner Functions
```solidity
// Register new oracle
function registerOracle(address oracleAddress) returns (uint256 oracleId)

// Activate/deactivate oracle
function activateOracle(uint256 oracleId) external
function deactivateOracle(uint256 oracleId) external

// Set trading asset for current batch
function setBatchAsset(address asset) external
```

#### View Functions
```solidity
// Get current batch info
function getCurrentBatchInfo() returns (
    uint256 batchId,
    BatchState state,
    uint256 endBlock,
    uint256 buyVolume,
    uint256 sellVolume,
    uint256 settlementPrice
)

// Get oracle information
function getOracleInfo(uint256 oracleId) returns (OracleInfo)

// Get oracle stats for a batch
function getOracleStats(uint256 batchId, uint256 oracleId) returns (
    uint256 observationCount,
    uint256 trimmedAverage,
    int256 delta1,
    int256 delta2,
    bool ignored
)

// Get user order
function getUserOrder(uint256 batchId, address user) returns (
    uint256 amount,
    Side side,
    bool claimed,
    bool disputed
)
```

---

## 🚀 Quick Start

### Prerequisites

### Prerequisites

- [Node.js](https://nodejs.org/) (>= v20.18.3)
- [Yarn](https://yarnpkg.com/) (v1 or v2+)
- [Git](https://git-scm.com/downloads)

### Installation & Deployment

1. **Clone the repository**
   ```bash
   git clone https://github.com/ParthRathix0/IIT-Trihacker-Finale.git
   cd IIT-Trihacker-Finale
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Start local blockchain**
   ```bash
   yarn chain
   ```

4. **Deploy contracts** (in a new terminal)
   ```bash
   yarn deploy
   ```

5. **Register oracles** (using Hardhat console)
   ```bash
   yarn hardhat console --network localhost
   ```
   ```javascript
   const aegis = await ethers.getContractAt("AegisV3", "DEPLOYED_ADDRESS");
   
   // Register 5 mock oracles
   await aegis.registerOracle("CHAINLINK_ETH_USD_ADDRESS");
   await aegis.registerOracle("ORACLE_2_ADDRESS");
   await aegis.registerOracle("ORACLE_3_ADDRESS");
   await aegis.registerOracle("ORACLE_4_ADDRESS");
   await aegis.registerOracle("ORACLE_5_ADDRESS");
   
   // Set trading asset (e.g., WETH)
   await aegis.setBatchAsset("WETH_ADDRESS");
   ```

6. **Start frontend** (in a new terminal)
   ```bash
   yarn start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Block Explorer: http://localhost:3000/blockexplorer

---

## 🧪 Testing & Simulation

### Running a Complete Batch Cycle

```bash
# Terminal 1: Blockchain
yarn chain

# Terminal 2: Deploy and setup
yarn deploy
yarn hardhat run scripts/setup-oracles.ts --network localhost

# Terminal 3: Keeper bot (automates phase transitions)
yarn hardhat run scripts/keeper-bot.ts --network localhost

# Terminal 4: Simulate users
yarn hardhat run scripts/simulate-users.ts --network localhost
```

### Example Keeper Bot Script

```javascript
// scripts/keeper-bot.ts
async function keeperLoop() {
  const aegis = await ethers.getContractAt("AegisV3", DEPLOYED_ADDRESS);
  
  while (true) {
    const info = await aegis.getCurrentBatchInfo();
    const currentBlock = await ethers.provider.getBlockNumber();
    
    if (info.state === 0 && currentBlock >= info.endBlock) {
      // OPEN → ACCUMULATING
      await aegis.startAccumulation();
      console.log("Started accumulation");
    }
    else if (info.state === 1) {
      // ACCUMULATING: Collect prices every 4 blocks
      if (currentBlock % 4 === 0) {
        await aegis.collectOraclePrices();
        console.log(`Collected prices at block ${currentBlock}`);
      }
      
      if (currentBlock >= info.endBlock) {
        await aegis.startDispute();
        console.log("Started dispute phase");
      }
    }
    else if (info.state === 2 && currentBlock >= info.endBlock) {
      // DISPUTING → SETTLING
      await aegis.startSettling();
      console.log("Started settling");
    }
    else if (info.state === 3 && currentBlock >= info.endBlock) {
      // SETTLING → Complete
      await aegis.executeSettlement();
      console.log("Executed settlement, new batch started");
    }
    
    await sleep(3000); // Check every 3 seconds
  }
}
```

---

## 📊 Example Scenarios

### Scenario 1: All Oracles Performing Well

**Setup**:
- 5 oracles with equal weights (100 each)
- All report prices within 1% of each other
- Settlement price: $2000

**Phase 2 Results**:
| Oracle | Observations | Trimmed Avg | Accuracy (x) | Precision (y) | Delta_1 |
|--------|--------------|-------------|--------------|---------------|---------|
| O1     | [1998,2001,2000,1999,2000] | $1999.60 | 0.2% | 0.08% | +9.98% |
| O2     | [2000,2002,2001,2000,1999] | $2000.40 | 0.2% | 0.10% | +9.97% |
| O3     | [2001,2000,2002,2001,2000] | $2000.80 | 0.4% | 0.08% | +9.75% |
| O4     | [1999,2001,2000,1998,2001] | $1999.80 | 0.1% | 0.12% | +9.96% |
| O5     | [2000,2001,2000,1999,2000] | $2000.00 | 0.0% | 0.04% | +9.99% |

**Phase 4 Weight Updates**:
```
O1: 100 → 110 (+10%)
O2: 100 → 110 (+10%)
O3: 100 → 110 (+10%)
O4: 100 → 110 (+10%)
O5: 100 → 110 (+10%)
```

**Outcome**: All oracles rewarded equally

---

### Scenario 2: One Malicious Oracle

**Setup**:
- Oracle O5 attempts price manipulation
- O5 reports prices 15% higher than others
- Other 4 oracles accurate

**Phase 2 Results**:
| Oracle | Trimmed Avg | Ignored? | Delta_1 |
|--------|-------------|----------|---------|
| O1     | $2000 | ✅ No | +9.98% |
| O2     | $2001 | ✅ No | +9.47% |
| O3     | $1999 | ✅ No | +9.47% |
| O4     | $2000 | ✅ No | +9.98% |
| O5     | $2300 | ❌ **Yes** | -290% |

**Settlement Price**: $2000 (O5 excluded from calculation)

**Phase 4 Weight Updates**:
```
O1: 100 → 110
O2: 100 → 109
O3: 100 → 109
O4: 100 → 110
O5: 100 → 1 (clamped to minimum)
```

**Outcome**: O5 effectively removed from future influence

---

### Scenario 3: Market Crash During Batch

**Setup**:
- Settlement calculated at $2000
- During DISPUTING phase, market crashes to $1900
- Buyers dispute (could have gotten better price)
- 25% of buyer volume disputes

**Phase 2 Settlement**: $2000
**Phase 3 Dispute Tracking**:
```
Buy Volume: 100 ETH
Sell Volume: 80 ETH
Buy Disputed: 25 ETH (25% of buy side)
Dispute Ratio: 25% < 33% → Batch proceeds
```

**Oracle Rankings** (by trimmed average):
| Oracle | Avg Price | Rank | Base Penalty | Delta_2 |
|--------|-----------|------|--------------|---------|
| O1     | $1950 | 1st | -1 | +1.52% |
| O2     | $1980 | 2nd | -2 | +0.76% |
| O3     | $2000 | 3rd | -3 | 0% |
| O4     | $2020 | 4th | -4 | -0.76% |
| O5     | $2050 | 5th | -5 | -1.52% |

**Calculation**:
```
Dispute ratio scale: 25% / 33% = 0.76
Base penalties: [-1, -2, -3, -4, -5]
Scaled: [-0.76, -1.52, -2.28, -3.04, -3.80]
Mean: -2.28
Normalized: [+1.52, +0.76, 0, -0.76, -1.52]
```

**Phase 4 Combined Weight Updates**:
```
Assuming all had delta_1 ≈ +2%:
O1: 100 × 1.02 × 1.0152 = 103.5
O2: 100 × 1.02 × 1.0076 = 102.8
O3: 100 × 1.02 × 1.00 = 102.0
O4: 100 × 1.02 × 0.9924 = 101.2
O5: 100 × 1.02 × 0.9848 = 100.5
```

**Outcome**: Oracle that was "most wrong" by delta_1 metric gets corrected by delta_2

---

## 🔐 Security Features

### MEV Protection
- ✅ **Batch Settlement**: All trades execute at single price, eliminating per-order MEV
- ✅ **No Mempool Exposure**: Orders locked before price determination
- ✅ **Front-Running Immunity**: Oracle prices collected over 48 blocks, not exploitable

### Oracle Manipulation Resistance
- ✅ **10% Deviation Filter**: Rejects volatile/manipulated individual readings
- ✅ **Outlier Detection**: Ignores oracles >10% away from consensus
- ✅ **Dynamic Weighting**: Malicious oracles lose influence over time
- ✅ **Multi-Oracle Requirement**: Need at least 2 valid oracles to proceed

### Dispute Mechanism
- ✅ **33% Void Threshold**: Batch cancelled if significant portion disputes
- ✅ **Directional Correction**: Delta_2 prevents systematic bias
- ✅ **Refund Guarantee**: Disputed orders get full refund
- ✅ **Zero-Sum Delta_2**: No net weight inflation from disputes

### Economic Security
- ✅ **Pro-Rata Settlement**: Mathematically fair fill ratios
- ✅ **Weight Bounds**: [1, 1000] prevents zero-division and runaway inflation
- ✅ **Reentrancy Protection**: NonReentrant guards on claim/dispute
- ✅ **Continuous Operation**: No batch can stall indefinitely

---

## 📈 Performance Metrics

### Gas Estimates

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| `deposit()` | ~100k | Includes ERC20 transfer |
| `collectOraclePrices()` | ~150k × N | N = number of active oracles |
| `startDispute()` | ~500k | Computes settlement price + delta_1 (insertion sort optimized) |
| `dispute()` | ~50k | Simple state update |
| `executeSettlement()` | ~300k | Updates all oracle weights |
| `claim()` | ~80k | Includes ERC20 transfer |

**Total Per User**: ~180k gas (~$1.80 at 50 gwei, $2000 ETH)

**Optimization**: Uses insertion sort for small arrays (3-10 elements) - 50% fewer memory writes than bubble sort, saving ~2-3k gas per settlement.

### Throughput

- **Batch Cycle**: 85 blocks (~4.25 minutes on 3-second blocks)
- **Orders Per Batch**: Unlimited (limited by gas for claim distribution)
- **Oracles Supported**: Optimized for 5-10 oracles
- **Scalability**: Can handle hundreds of users per batch

---

## 🎨 Frontend Features

Built with **Next.js 14**, **RainbowKit**, and **Scaffold-ETH 2**:

- **Real-Time Batch Monitor**: Shows current phase, time remaining, volumes
- **Oracle Dashboard**: Live oracle weights, prices, performance scores
- **Deposit Interface**: Simple ETH/token deposits for BUY/SELL
- **Dispute Panel**: One-click dispute during DISPUTING phase
- **Claim Manager**: Track all past batches and claim filled orders
- **Analytics**: Historical batch data, oracle performance charts

---

## 🛠️ Development

### Project Structure

```
packages/
├── hardhat/
│   ├── contracts/
│   │   ├── AegisV3.sol           # Main protocol contract
│   │   ├── mocks/
│   │   │   └── MockOracle.sol    # Testing oracle
│   ├── deploy/
│   │   └── 00_deploy_aegis.ts
│   ├── scripts/
│   │   ├── setup-oracles.ts
│   │   ├── keeper-bot.ts
│   │   └── simulate-users.ts
│   └── test/
│       └── AegisV3.test.ts
├── nextjs/
│   ├── app/
│   │   └── page.tsx              # Main dashboard
│   ├── components/
│   │   ├── AegisV3Dashboard.tsx
│   │   ├── OracleMonitor.tsx
│   │   └── BatchHistory.tsx
│   └── hooks/
│       └── useAegisV3.ts
```

### Running Tests

```bash
# Run all tests
yarn hardhat test

# Run with gas reporting
yarn hardhat test --gas-reporter

# Test on localhost
yarn chain          # Terminal 1
yarn deploy         # Terminal 2
```

### Deployment

#### Local Development
```bash
# Terminal 1: Start local chain
yarn chain

# Terminal 2: Deploy contracts
yarn deploy
```

#### Sepolia Testnet (Live Deployment ✅)
```bash
# Generate deployer wallet
yarn generate

# Fund wallet with Sepolia ETH from faucet

# Deploy to Sepolia
yarn deploy --network sepolia
```

**Live Deployment:**
- **AegisV3**: [`0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1`](https://sepolia.etherscan.io/address/0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1)
- **5 Oracles**: Active and registered
- **Status**: Fully functional on Sepolia testnet

#### Testnet Demonstration
```bash
# Run live tests on Sepolia
yarn hardhat run scripts/testnet-demo.ts --network sepolia

# Verify oracle registration
yarn hardhat run scripts/verify-oracles.ts --network sepolia
```

---

## 📚 Additional Documentation

- **[MULTI_ORACLE_DESIGN.md](./MULTI_ORACLE_DESIGN.md)**: Detailed architecture document
- **Whitepaper**: [Coming Soon]
- **API Documentation**: [docs/API.md](./docs/API.md)
- **Security Audit**: [Coming Soon]

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Scaffold-ETH 2**: Framework foundation
- **Chainlink**: Oracle infrastructure
- **OpenZeppelin**: Security-audited contract libraries
- **IIT TriHacker**: Competition organizers

---

<div align="center">

**Built with ❤️ for fair DeFi**

[Documentation](https://docs.scaffoldeth.io) • [Website](https://scaffoldeth.io) • [GitHub](https://github.com/ParthRathix0/IIT-Trihacker-Finale)

</div>
