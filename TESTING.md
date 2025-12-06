# Testing Guide - AegisV3

## 🎯 Quick Demo Commands for Judges

### Interactive Demo Menu (⭐ RECOMMENDED)
```bash
cd packages/hardhat
./scripts/judge-demo.sh
```

**Interactive options:**
1. 🧪 Run Full Test Suite (12-step lifecycle)
2. 💰 Show Gas Cost Analysis (amortized costs)
3. 🌐 Verify Sepolia Deployment (live contracts)
4. 📊 Show All (comprehensive demo)
5. 🚪 Exit

---

### Individual Demo Scripts

#### 1. Run Test Suite
Shows complete batch lifecycle with settlement and weight updates:
```bash
cd packages/hardhat
./scripts/run-tests.sh
```

**What you'll see:**
- ✅ 4/4 tests passing (~1-2 seconds)
- 💎 Settlement price: $2018 from 5 oracles
- 📈 Oracle weight updates (110, 110, 109, 109, 109)
- ⚡ Gas breakdown for each operation

#### 2. Gas Cost Analysis
Shows amortized costs at different batch sizes:
```bash
cd packages/hardhat
./scripts/show-gas-costs.sh
```

**What you'll see:**
```
Batch Size    Gas per User    USD @ 15 gwei
2 users       1,215,294       $0.069
100 users     236,068         $0.013
1000 users    218,082         $0.012

vs Uniswap V3: +18% gas for 5-oracle security
```

#### 3. Verify Sepolia Deployment
Checks live testnet contracts:
```bash
cd packages/hardhat
npx hardhat run scripts/testnet-demo.ts --network sepolia
```

**What you'll see:**
- 🌐 Live contract addresses with Etherscan links
- 📡 All 5 oracles active and responding
- 📊 Current batch information
- ✅ Verification that protocol is deployed and operational

#### 4. Quick Help Reference
```bash
cd packages/hardhat
./scripts/demo-help.sh
```

Shows all available commands and quick results summary.

---

### ⚡ Super Quick Demo (30 seconds)
```bash
cd packages/hardhat
echo "1" | ./scripts/judge-demo.sh
```
Auto-runs test suite with full output.

---

## 📚 Full Documentation
- [`DEMO_SCRIPTS.md`](packages/hardhat/DEMO_SCRIPTS.md) - Detailed script documentation
- [`QUICK_DEMO.md`](QUICK_DEMO.md) - Quick reference guide

---

## Quick Start

### Prerequisites
```bash
# Required software:
- Node.js v18+ 
- Yarn v3
- Git

# Clone and install:
git clone <repository-url>
cd IIT-Trihacker-Finale
yarn install
```

### Running the Full Demonstration

The easiest way to see AegisV3 in action:

```bash
# Terminal 1: Start local blockchain
yarn chain

# Terminal 2: Run the full system demo
cd packages/hardhat
./scripts/run-demo.sh
```

This will automatically:
1. Deploy all contracts (AegisV3, MockWETH, 5 MockOracles)
2. Execute a complete batch cycle with 4 users
3. Show all phases: Deposit → Accumulate → Dispute → Settle → Claim
4. Display oracle weight updates
5. Show settlement results

**Expected Output**: See full demonstration with all phases completing successfully in ~1-2 minutes.

## Manual Testing

### Step 1: Start the Blockchain

```bash
# In terminal 1:
yarn chain
```

Keep this running - it's your local Ethereum node.

### Step 2: Deploy Contracts

```bash
# In terminal 2:
cd packages/hardhat
yarn deploy --reset
```

**What this does**:
- Deploys MockWETH token
- Deploys 5 oracle contracts (GoodOracle1-3, SlightlyOffOracle, VolatileOracle)
- Deploys AegisV3 main contract
- Registers all oracles
- Sets WETH as the batch asset

**Output**: Note the contract addresses printed - you'll need them!

### Step 3: Interactive Testing (Hardhat Console)

```bash
npx hardhat console --network localhost
```

#### Get Contract Instances

```javascript
// Get the deployed contract addresses from deployment output above
const aegisAddress = "0x..." // From deployment output
const wethAddress = "0x..."  // From deployment output

const aegis = await ethers.getContractAt("AegisV3", aegisAddress);
const weth = await ethers.getContractAt("MockWETH", wethAddress);

// Get test accounts
const [deployer, user1, user2, user3, user4] = await ethers.getSigners();
```

#### Phase 1: Deposits (OPEN Phase)

```javascript
// Check current batch
const batchId = await aegis.currentBatchId();
console.log("Current Batch:", batchId.toString());

// Get batch info
const batch = await aegis.batches(batchId);
console.log("OPEN ends at block:", batch.openEnd.toString());
console.log("Current block:", await ethers.provider.getBlockNumber());

// User1: Get WETH and place BUY order
await weth.connect(user1).faucet();
await weth.connect(user1).approve(aegis.target, ethers.parseEther("1000"));
await aegis.connect(user1).deposit(ethers.parseEther("100"), 0); // 0 = BUY
console.log("✓ User1 deposited 100 WETH (BUY)");

// User2: Place SELL order
await weth.connect(user2).faucet();
await weth.connect(user2).approve(aegis.target, ethers.parseEther("1000"));
await aegis.connect(user2).deposit(ethers.parseEther("80"), 1); // 1 = SELL
console.log("✓ User2 deposited 80 WETH (SELL)");

// Check volumes
const updatedBatch = await aegis.batches(batchId);
console.log("Buy Volume:", ethers.formatEther(updatedBatch.buyVolume));
console.log("Sell Volume:", ethers.formatEther(updatedBatch.sellVolume));
```

#### Phase 2: Transition to ACCUMULATING

```javascript
// Mine to end of OPEN phase
const batch = await aegis.batches(batchId);
const currentBlock = await ethers.provider.getBlockNumber();
const blocksToMine = Number(batch.openEnd) - currentBlock + 1;

for (let i = 0; i < blocksToMine; i++) {
    await ethers.provider.send("evm_mine", []);
}
console.log("✓ Mined to end of OPEN phase");

// Trigger transition
await aegis.startAccumulation();
console.log("✓ Transitioned to ACCUMULATING phase");
```

#### Phase 3: Collect Oracle Prices

```javascript
// Collect 3 samples (normally 12, but 3 is enough for demo)
for (let i = 0; i < 3; i++) {
    // Wait 4 blocks
    for (let j = 0; j < 4; j++) {
        await ethers.provider.send("evm_mine", []);
    }
    
    await aegis.collectOraclePrices();
    console.log(`✓ Collected sample ${i + 1}/3`);
}
```

#### Phase 4: Dispute Phase

```javascript
// Mine to end of ACCUMULATING
const batch2 = await aegis.batches(batchId);
const currentBlock2 = await ethers.provider.getBlockNumber();
const blocksToMine2 = Number(batch2.accumulationEnd) - currentBlock2 + 1;

for (let i = 0; i < blocksToMine2; i++) {
    await ethers.provider.send("evm_mine", []);
}

// Start dispute phase (computes settlement price)
await aegis.startDispute();
console.log("✓ Entered DISPUTING phase");

// Check settlement price
const batch3 = await aegis.batches(batchId);
console.log("Settlement Price:", ethers.formatUnits(batch3.settlementPrice, 8), "USD");
```

#### Phase 5: Settlement

```javascript
// Mine to end of DISPUTING
const batch4 = await aegis.batches(batchId);
const currentBlock3 = await ethers.provider.getBlockNumber();
const blocksToMine3 = Number(batch4.disputeEnd) - currentBlock3 + 1;

for (let i = 0; i < blocksToMine3; i++) {
    await ethers.provider.send("evm_mine", []);
}

// Start settling phase
await aegis.startSettling();
console.log("✓ Entered SETTLING phase");

// Mine to end of SETTLING
const batch5 = await aegis.batches(batchId);
const currentBlock4 = await ethers.provider.getBlockNumber();
const blocksToMine4 = Number(batch5.settlingEnd) - currentBlock4 + 1;

for (let i = 0; i < blocksToMine4; i++) {
    await ethers.provider.send("evm_mine", []);
}

// Execute settlement
await aegis.executeSettlement();
console.log("✓ Settlement executed");
```

#### Phase 6: Check Oracle Weights

```javascript
// Check how oracle weights changed
for (let i = 1; i <= 5; i++) {
    const oracleInfo = await aegis.getOracleInfo(i);
    console.log(`Oracle ${i} weight:`, oracleInfo.weight.toString());
}
```

#### Phase 7: Claim Settlements

```javascript
// Users claim their settlements
await aegis.connect(user1).claim(batchId);
console.log("✓ User1 claimed");

await aegis.connect(user2).claim(batchId);
console.log("✓ User2 claimed");

// Check final balances
const user1Balance = await weth.balanceOf(user1.address);
const user2Balance = await weth.balanceOf(user2.address);
console.log("User1 final balance:", ethers.formatEther(user1Balance));
console.log("User2 final balance:", ethers.formatEther(user2Balance));
```

## Automated Test Scripts

### Full System Demonstration

```bash
# Complete batch cycle with 4 users
npx hardhat run scripts/demo-full-system.ts --network localhost
```

**What it tests**:
- ✅ User deposits (2 buyers, 2 sellers)
- ✅ Phase transitions
- ✅ Oracle price collection
- ✅ Settlement price computation
- ✅ Oracle weight updates
- ✅ User claims
- ✅ Balance verification

**Duration**: ~2 minutes  
**Expected Result**: All phases complete successfully, oracle weights updated based on performance

## Testing Different Scenarios

### Scenario 1: Testing Deposits During ACCUMULATING Phase

```javascript
// After starting accumulation phase:
await aegis.startAccumulation();

// Mine a few blocks into ACCUMULATING
for (let i = 0; i < 10; i++) {
    await ethers.provider.send("evm_mine", []);
}

// Try to deposit (should work!)
await weth.connect(user3).faucet();
await weth.connect(user3).approve(aegis.target, ethers.parseEther("1000"));
await aegis.connect(user3).deposit(ethers.parseEther("50"), 0);
console.log("✓ Deposit during ACCUMULATING works!");
```

**Expected**: Deposit succeeds (this is a unique feature of AegisV3)

### Scenario 2: Testing Malicious Oracle

```javascript
// Get the SlightlyOffOracle contract
const slightlyOffAddress = "0x..." // From deployment output
const slightlyOff = await ethers.getContractAt("MockOracle", slightlyOffAddress);

// Set high deviation (20%)
await slightlyOff.setDeviation(2000); // 2000 = 20%
console.log("✓ Set oracle to 20% deviation");

// Run through a batch cycle...
// Check oracle weight after settlement:
const oracleInfo = await aegis.getOracleInfo(4); // Oracle 4 is SlightlyOff
console.log("SlightlyOffOracle weight:", oracleInfo.weight.toString());
// Should be significantly lower than other oracles
```

**Expected**: Oracle weight drops below 100 (penalized for inaccuracy)

### Scenario 3: Market Crash Simulation

```javascript
// Get VolatileOracle
const volatileAddress = "0x..." // From deployment output
const volatile = await ethers.getContractAt("MockOracle", volatileAddress);

// Simulate 50% crash
await volatile.simulateCrash(5000); // 5000 = 50%
console.log("✓ Simulated 50% price crash");

// Run through batch cycle...
// Settlement price should reflect the crash
// Buyers might want to dispute if they disagree
```

### Scenario 4: High Dispute Scenario

```javascript
// After settlement price is computed:
const batch = await aegis.batches(batchId);
console.log("Settlement price:", ethers.formatUnits(batch.settlementPrice, 8));

// Buyers dispute if they think price is too high
await aegis.connect(user1).dispute();
await aegis.connect(user2).dispute(); // If user2 was also a buyer

console.log("✓ Disputes filed");

// Check disputed volumes
const updatedBatch = await aegis.batches(batchId);
console.log("Buy Disputed:", ethers.formatEther(updatedBatch.buyDisputedVolume));
console.log("Sell Disputed:", ethers.formatEther(updatedBatch.sellDisputedVolume));

// If disputes exceed 20% of volume, batch will be voided
```

## Helper Functions

### Quick Balance Check

```javascript
async function checkBalances() {
    const users = [user1, user2, user3, user4];
    for (let i = 0; i < users.length; i++) {
        const balance = await weth.balanceOf(users[i].address);
        console.log(`User${i+1}:`, ethers.formatEther(balance), "WETH");
    }
}
```

### Batch Status

```javascript
async function batchStatus() {
    const batchId = await aegis.currentBatchId();
    const batch = await aegis.batches(batchId);
    const currentBlock = await ethers.provider.getBlockNumber();
    
    const states = ["OPEN", "ACCUMULATING", "DISPUTING", "SETTLING"];
    
    console.log("=".repeat(50));
    console.log("Batch", batchId.toString());
    console.log("State:", states[Number(batch.state)]);
    console.log("Current Block:", currentBlock);
    console.log("Phase Ends:", 
        batch.state === 0n ? batch.openEnd.toString() :
        batch.state === 1n ? batch.accumulationEnd.toString() :
        batch.state === 2n ? batch.disputeEnd.toString() :
        batch.settlingEnd.toString()
    );
    console.log("Buy Volume:", ethers.formatEther(batch.buyVolume));
    console.log("Sell Volume:", ethers.formatEther(batch.sellVolume));
    if (batch.settlementPrice > 0n) {
        console.log("Settlement Price:", ethers.formatUnits(batch.settlementPrice, 8), "USD");
    }
    console.log("=".repeat(50));
}
```

### Oracle Status

```javascript
async function oracleStatus() {
    console.log("\nOracle Status:");
    console.log("=".repeat(50));
    for (let i = 1; i <= 5; i++) {
        const oracle = await aegis.getOracleInfo(i);
        console.log(`Oracle ${i}:`);
        console.log(`  Address: ${oracle.oracleAddress}`);
        console.log(`  Weight: ${oracle.weight}`);
        console.log(`  Active: ${oracle.isActive}`);
        console.log(`  Total Samples: ${oracle.totalSamples}`);
    }
    console.log("=".repeat(50));
}
```

## Troubleshooting

### Issue: "OPEN phase ended" error

**Cause**: Tried to deposit after OPEN phase expired  
**Solution**: Deposits are allowed during ACCUMULATING too! Just call `startAccumulation()` first.

```javascript
await aegis.startAccumulation();
// Now deposits work again
```

### Issue: "Too early to collect" error

**Cause**: Trying to collect prices before 4-block interval  
**Solution**: Mine 4 blocks between each collection

```javascript
for (let i = 0; i < 4; i++) {
    await ethers.provider.send("evm_mine", []);
}
await aegis.collectOraclePrices();
```

### Issue: "Not in X state" error

**Cause**: Calling phase transition function at wrong time  
**Solution**: Check current state and mine to the right block

```javascript
const state = await aegis.getBatchState(batchId);
console.log("Current state:", state); // 0=OPEN, 1=ACCUMULATING, 2=DISPUTING, 3=SETTLING
```

### Issue: Transaction reverts with no message

**Cause**: Usually a require statement failing  
**Solution**: Check the batch state and timing

```javascript
await batchStatus(); // Use helper function above
```

### Issue: Oracle prices are all the same

**Cause**: Mock oracles return fixed prices by default  
**Solution**: This is expected! Real oracles would have different prices

```javascript
// To add variance, use the deviation feature:
await slightlyOff.setDeviation(200); // 2% deviation
await volatile.enableVolatility();   // Random variance
```

## Performance Testing

### Measure Gas Costs

```javascript
// Measure deposit gas
const tx1 = await aegis.connect(user1).deposit(ethers.parseEther("100"), 0);
const receipt1 = await tx1.wait();
console.log("Deposit gas:", receipt1.gasUsed.toString());

// Measure claim gas
const tx2 = await aegis.connect(user1).claim(batchId);
const receipt2 = await tx2.wait();
console.log("Claim gas:", receipt2.gasUsed.toString());

// Measure collection gas
const tx3 = await aegis.collectOraclePrices();
const receipt3 = await tx3.wait();
console.log("Collection gas:", receipt3.gasUsed.toString());
```

---

## Automated Test Suite

### Running All Tests
```bash
cd packages/hardhat
yarn test
```

**Test Coverage:**
1. ✅ Contract deployment verification
2. ✅ Oracle registration and verification
3. ✅ Multiple oracle registration
4. ✅ **Full batch lifecycle with weight updates** (comprehensive test)

### Test 4: Full Batch Lifecycle (Main Demo Test)

This comprehensive test demonstrates the complete protocol:

**12-Step Process:**
1. Deploy contracts (AegisV3, MockWETH)
2. Register 5 oracles with different names
3. Display initial weights (all 100)
4. Fund users with WETH
5. Users deposit (BUY/SELL)
6. Enter ACCUMULATING phase, set oracle prices
7. Collect oracle observations (3 times)
8. Enter DISPUTING phase
9. Enter SETTLING phase
10. Execute settlement
11. Display oracle weight updates
12. Users claim filled orders

**Key Outputs:**
```
Settlement Price: $2018.00
(Calculated from oracle prices: $2000, $2000, $2040, $2100, $1950)

Oracle Weight Updates:
- Oracle 1 (Accurate):     100 → 110 (↑ +10)
- Oracle 2 (VeryAccurate): 100 → 110 (↑ +10)
- Oracle 3 (SlightlyOff):  100 → 109 (↑ +9)
- Oracle 4 (ModeratelyOff):100 → 109 (↑ +9)
- Oracle 5 (Volatile):     100 → 109 (↑ +9)
```

**Gas Measurements:**
```
Operation              Gas Used       Avg
─────────────────────────────────────────
deposit                145k-159k      152k
collectOraclePrices    315k-583k      405k
startAccumulation      59,963         60k
startDispute           411,107        411k
startSettling          61,488         61k
executeSettlement      252,287        252k
claim                  53k-75k        64k
```

### View Test Source
The comprehensive test is in `test/Aegis.ts` (lines 68-238):
```bash
# View the test code
cat packages/hardhat/test/Aegis.ts | grep -A 170 "Should complete full batch cycle"
```

### Running Specific Tests
```bash
# Run only deployment test
yarn test --grep "Should deploy"

# Run only oracle tests
yarn test --grep "oracle"

# Run full lifecycle test
yarn test --grep "full batch cycle"
```

---

## Gas Analysis Scripts

### Detailed Gas Cost Breakdown

The `show-gas-costs.sh` script provides detailed analysis:

```bash
cd packages/hardhat
./scripts/show-gas-costs.sh
```

**Analysis includes:**

1. **Direct User Costs:**
   - Deposit: ~152,315 gas
   - Claim: ~63,769 gas
   - Total per user: ~216,084 gas

2. **Shared Batch Costs (Amortized):**
   - Oracle Collection (3x): ~1,213,575 gas
   - Phase Transitions: ~784,845 gas
   - Total shared: ~1,998,420 gas

3. **Cost per User at Different Scales:**
   ```
   2 users:    1,215,294 gas ($0.069 @ 15 gwei)
   10 users:     415,926 gas ($0.024 @ 15 gwei)
   50 users:     256,052 gas ($0.015 @ 15 gwei)
   100 users:    236,068 gas ($0.013 @ 15 gwei)
   1000 users:   218,082 gas ($0.012 @ 15 gwei)
   ```

4. **Comparison with Uniswap V3:**
   - Uniswap V3 Swap: ~200,000 gas (no oracle security)
   - Aegis @ 100 users: ~236,000 gas (5-oracle consensus)
   - **Premium: Only +18% for full oracle protection**

### Economics at Scale

**Break-even Point**: ~50 users per batch
- Below 50: More expensive than direct swaps
- Above 50: Competitive with direct swaps
- Above 100: Only marginal premium for security

**Optimal Efficiency**: 1000+ users per batch
- Shared costs: Only ~2,000 gas per user
- Total cost approaches theoretical minimum (216k gas)
- ~1% overhead for multi-oracle consensus

---

## Continuous Integration

### GitHub Actions (if configured)
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test
```

---

## Additional Resources

### Documentation Files
- [`DEMO_SCRIPTS.md`](packages/hardhat/DEMO_SCRIPTS.md) - Complete demo script guide
- [`DEMO_GUIDE.md`](packages/hardhat/DEMO_GUIDE.md) - Judge presentation playbook
- [`DEPLOYMENT.md`](packages/hardhat/DEPLOYMENT.md) - Deployment instructions
- [`QUICK_DEMO.md`](QUICK_DEMO.md) - Quick reference for demos
- [`README.md`](README.md) - Full protocol documentation

### Live Deployment
- **Network**: Sepolia Testnet
- **AegisV3**: `0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1`
- **Status**: ✅ Verified and operational with 5 active oracles

### Contract Source
- Main contract: `packages/hardhat/contracts/AegisV3.sol`
- Test suite: `packages/hardhat/test/Aegis.ts`
- Mock contracts: `packages/hardhat/contracts/mocks/`

---

## Summary

**For Judges - Quick Demo:**
```bash
cd packages/hardhat
./scripts/judge-demo.sh  # Interactive menu
```

**For Developers - Full Testing:**
```bash
yarn chain              # Terminal 1
yarn deploy --reset     # Terminal 2
yarn test               # Run test suite
```

**For Analysis - Gas Costs:**
```bash
./scripts/show-gas-costs.sh  # Detailed breakdown
```

**For Verification - Live Contracts:**
```bash
npx hardhat run scripts/testnet-demo.ts --network sepolia
```

---

**Need Help?** Run `./scripts/demo-help.sh` for quick reference!

### Batch Size Testing

```javascript
// Test with varying numbers of users
async function testBatchSize(numUsers) {
    const signers = await ethers.getSigners();
    
    // All users deposit
    for (let i = 0; i < numUsers; i++) {
        const user = signers[i];
        await weth.connect(user).faucet();
        await weth.connect(user).approve(aegis.target, ethers.parseEther("1000"));
        const side = i % 2; // Alternate BUY/SELL
        await aegis.connect(user).deposit(ethers.parseEther("100"), side);
    }
    
    console.log(`✓ ${numUsers} users deposited`);
    
    // Complete batch cycle...
    // Measure total gas used
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test AegisV3

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: yarn install
      
      - name: Start Hardhat node
        run: yarn chain &
        
      - name: Wait for node
        run: sleep 10
      
      - name: Run demo
        run: |
          cd packages/hardhat
          ./scripts/run-demo.sh
```

## Next Steps

1. **Read the Architecture**: See `ARCHITECTURE.md` for system design details
2. **Review Gas Costs**: See `GAS_ANALYSIS.md` for cost breakdown
3. **Explore Code**: Check `packages/hardhat/contracts/AegisV3.sol`
4. **Customize**: Modify oracle count, phase durations, or dispute thresholds

## Support

- **Documentation**: See `README.md` for overview
- **Architecture**: See `ARCHITECTURE.md` for technical details
- **Gas Analysis**: See `GAS_ANALYSIS.md` for cost breakdown
- **Issues**: Open an issue on GitHub

## Success Criteria

Your testing is successful when you see:

✅ All contracts deploy without errors  
✅ Users can deposit during OPEN and ACCUMULATING phases  
✅ Oracle prices collected successfully  
✅ Settlement price computed correctly  
✅ Oracle weights updated based on performance  
✅ Users can claim their settlements  
✅ Final balances match expected amounts  

**Happy Testing! 🎉**
