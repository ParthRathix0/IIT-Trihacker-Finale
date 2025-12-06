# 🎯 Quick Demo Commands

## For Judges - Run These! 👨‍⚖️

### Interactive Menu (Best Option)
```bash
cd packages/hardhat
./scripts/judge-demo.sh
```

### Individual Demos

**1. Test Suite** (Shows protocol working):
```bash
cd packages/hardhat
./scripts/run-tests.sh
```

**2. Gas Analysis** (Shows cost efficiency):
```bash
cd packages/hardhat
./scripts/show-gas-costs.sh
```

**3. Sepolia Verification** (Shows live deployment):
```bash
cd packages/hardhat
npx hardhat run scripts/testnet-demo.ts --network sepolia
```

---

## What You'll See

### ✅ Test Suite Output:
- 4 tests passing in ~1 second
- Full 12-step batch lifecycle
- Settlement price: $2018 from 5 oracles ($1950-$2100)
- Weight updates showing Delta_1 formula
- Complete gas breakdown

### 💰 Gas Analysis Output:
```
Batch Size      Gas per User         USD @ 15 gwei
─────────────────────────────────────────────────
2 users         1,215,294 gas        $0.069
10 users        415,926 gas          $0.024
100 users       236,068 gas          $0.013
1000 users      218,082 gas          $0.012

Comparison:
• Uniswap V3:      ~200,000 gas (no oracle security)
• Aegis @ 100:     ~236,000 gas (5-oracle consensus)
• Premium:         +18% for full protection
```

### 🌐 Sepolia Verification:
- Live contract addresses
- 5 active oracles responding
- Current batch information
- Etherscan verification links

---

## 📚 Full Documentation

- `DEMO_SCRIPTS.md` - Detailed script documentation
- `DEMO_GUIDE.md` - Judge presentation guide
- `DEPLOYMENT.md` - Deployment details
- `README.md` - Full protocol specification

---

## ⚡ Super Quick Demo (30 seconds)

```bash
cd packages/hardhat && echo "1" | ./scripts/judge-demo.sh
```

This auto-runs the test suite showing:
- ✅ 4/4 tests passing
- 💎 $2018 settlement from multi-oracle consensus
- 📈 Dynamic weight updates
- ⚡ Gas efficiency metrics
