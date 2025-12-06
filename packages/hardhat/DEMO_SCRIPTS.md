# 🎯 Quick Demo Scripts for Judges

All scripts are located in `packages/hardhat/scripts/`

## 🚀 Quick Start

```bash
cd packages/hardhat
./scripts/judge-demo.sh
```

This opens an interactive menu with 5 options:

## 📋 Available Scripts

### 1. **Interactive Judge Demo** (Recommended!)
```bash
./scripts/judge-demo.sh
```
- Interactive menu with all demo options
- Choose what to show judges on the fly
- Beautiful formatted output

**Menu Options:**
1. 🧪 Run Full Test Suite - Shows 12-step batch lifecycle
2. 💰 Gas Cost Analysis - Displays amortized costs at different batch sizes
3. 🌐 Verify Sepolia Deployment - Checks live testnet contracts
4. 📊 Show All - Comprehensive demo (all 3 above)
5. 🚪 Exit

---

### 2. **Run Test Suite Only**
```bash
./scripts/run-tests.sh
```
**Shows:**
- ✅ All 4 test cases passing
- 📊 Full batch lifecycle (12 steps)
- 💎 Settlement price: $2018 from 5 oracles
- 📈 Oracle weight updates
- ⚡ Gas measurements for each operation

**Time:** ~1-2 seconds

---

### 3. **Show Gas Cost Analysis**
```bash
./scripts/show-gas-costs.sh
```
**Shows:**
- 📊 Gas cost breakdown by operation
- 💰 Amortized costs per user (2 to 1000 users)
- 💵 USD costs at 15 gwei gas price
- 🔍 Comparison with Uniswap V3

**Example Output:**
```
Batch Size      Gas per User         USD @ 15 gwei
─────────────────────────────────────────────────
2 users         1,215,294 gas        $0.069
10 users        415,926 gas          $0.024
100 users       236,068 gas          $0.013
1000 users      218,082 gas          $0.012
```

**Time:** ~2-3 seconds

---

### 4. **Verify Sepolia Deployment**
```bash
npx hardhat run scripts/testnet-demo.ts --network sepolia
```
**Shows:**
- 🌐 Live contract addresses
- 📡 All 5 oracles active and responsive
- 📊 Current batch information
- ⚡ Real-time price feeds

**Time:** ~5-10 seconds (depends on RPC)

---

## 🎬 Recommended Demo Flow for Judges

### **Quick Demo (2 minutes):**
```bash
./scripts/judge-demo.sh
# Select option 1 (Test Suite)
```

### **Detailed Demo (5 minutes):**
```bash
./scripts/judge-demo.sh
# Select option 4 (Show All)
```

### **Custom Demo:**
Run individual scripts as needed:
```bash
# Show tests
./scripts/run-tests.sh

# Show gas analysis
./scripts/show-gas-costs.sh

# Verify live deployment
npx hardhat run scripts/testnet-demo.ts --network sepolia
```

---

## 📊 What Each Demo Shows

### Test Suite (`run-tests.sh`)
**Key Highlights:**
- ✅ 4/4 tests passing
- 🔄 Full batch cycle: OPEN → ACCUMULATING → DISPUTING → SETTLING
- 💎 Settlement price calculation with 5 oracles
- 📈 Dynamic weight updates (Delta_1 formula)
- ⚡ Gas efficiency metrics

**Judges See:**
- Multi-oracle consensus in action
- Weighted average settlement ($2018 from $1950-$2100)
- Oracle reputation system working
- Complete user journey (deposit → settle → claim)

---

### Gas Analysis (`show-gas-costs.sh`)
**Key Highlights:**
- 💰 Cost per user: 216k gas + (2M shared / N users)
- 📊 Breakeven at ~50 users (competitive with Uniswap)
- 🎯 Optimal at 100+ users (~236k gas vs Uniswap's 200k)
- ✨ Only +18% premium for 5-oracle security

**Judges See:**
- Economics of batch processing
- How costs amortize with scale
- Competitive pricing at reasonable volumes
- Value proposition (security vs cost)

---

### Sepolia Verification (`testnet-demo.ts`)
**Key Highlights:**
- 🌐 Live contracts on Sepolia testnet
- 📡 5 active oracles with real addresses
- ✅ All systems operational
- 🔗 Etherscan links for verification

**Judges See:**
- Protocol is actually deployed and working
- Not just local tests - real blockchain
- Professional deployment process
- Production-ready code

---

## 🎯 Pro Tips for Judges

1. **Start with the interactive menu** - Most flexible option
2. **Run tests first** - Shows the protocol works
3. **Then show gas costs** - Proves it's economically viable
4. **Finish with Sepolia** - Demonstrates it's production-ready

---

## 🐛 Troubleshooting

**If scripts don't run:**
```bash
chmod +x scripts/*.sh
```

**If yarn test fails:**
```bash
yarn install
yarn hardhat compile
```

**If Sepolia demo fails:**
- Check `DEPLOYER_PRIVATE_KEY` in `.env`
- Verify RPC endpoint is working
- Ensure contracts are deployed (see `DEPLOYMENT.md`)

---

## 📝 Notes

- All scripts use colored output for better readability
- Gas costs assume 15 gwei and ETH @ $3,800
- Test suite uses Hardhat local network (instant)
- Sepolia verification requires network connection

---

## 🔗 Related Documentation

- `DEMO_GUIDE.md` - Detailed judge presentation guide
- `DEPLOYMENT.md` - Deployment instructions and addresses
- `README.md` - Full protocol documentation

