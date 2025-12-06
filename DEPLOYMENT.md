# 🚀 Deployment Guide

## Sepolia Testnet (Current Deployment)

### Deployed Contracts

| Contract | Address | Status |
|----------|---------|--------|
| **AegisV3** | [`0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1`](https://sepolia.etherscan.io/address/0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1) | ✅ Active |
| **MockWETH** | [`0x46059af680A19f3D149B3B8049D3aecA9050914C`](https://sepolia.etherscan.io/address/0x46059af680A19f3D149B3B8049D3aecA9050914C) | ✅ Active |
| **GoodOracle1** | `0xd183695ef91510D3a324a89e0159Daed5d7A9F6e` | ✅ Registered |
| **GoodOracle2** | `0xF78F12c4ef47e8e865F8DCFBB5bCe8CCCB2F9dAD` | ✅ Registered |
| **GoodOracle3** | `0x9eE7202D855b7a87CdB6C97A2dbe1C005263Ec29` | ✅ Registered |
| **SlightlyOffOracle** | `0xf12Dd20D764be3F5D5Aea54cc19Af9F8b449796f` | ✅ Registered |
| **VolatileOracle** | `0x3AeFBc8A39B4fda7247C39Dbabe888Ae7E305cc9` | ✅ Registered |

### Configuration
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **Oracles**: 5 active
- **Batch Cycle**: 85 blocks (~4.25 minutes)
- **Phases**: OPEN(12) → ACCUMULATING(48) → DISPUTING(15) → SETTLING(10)

---

## 🧪 Testing on Sepolia

### Run Live Tests
```bash
# Comprehensive demonstration
yarn hardhat run scripts/testnet-demo.ts --network sepolia

# Verify oracle registration
yarn hardhat run scripts/verify-oracles.ts --network sepolia
```

### Test Results
```
✅ All 5 oracles registered and active
✅ Batch lifecycle operational
✅ Contract verified on Etherscan
✅ Multi-oracle consensus working
```

---

## 📋 Deployment Steps

### 1. Generate Deployer Wallet
```bash
cd packages/hardhat
yarn generate
```
- Creates encrypted wallet in `.env`
- Save your password securely

### 2. Fund Wallet
Get Sepolia ETH from faucets:
- [Alchemy Faucet](https://sepoliafaucet.com/)
- [Chainlink Faucet](https://faucets.chain.link/sepolia)
- [Infura Faucet](https://www.infura.io/faucet/sepolia)

### 3. Configure Environment
```bash
# Update hardhat.config.ts with your Alchemy API key
ALCHEMY_API_KEY=your_key_here
```

### 4. Deploy Contracts
```bash
# Deploy main contracts + 4 oracles
yarn deploy --network sepolia

# Deploy 5th oracle separately (if needed)
yarn hardhat run scripts/deploy-volatile.ts --network sepolia
```

### 5. Verify Deployment
```bash
# Check oracle status
yarn hardhat run scripts/verify-oracles.ts --network sepolia

# Run test suite
yarn test
```

---

## 🔧 Deployment Script

The deployment process (`deploy/00_deploy_aegis_v3.ts`) includes:

1. **MockWETH** - Test token for trading
2. **5 Mock Oracles** - Price feed simulation
3. **AegisV3** - Main protocol contract
4. **Oracle Registration** - Register all oracles
5. **Asset Configuration** - Set WETH as batch asset

### Delays Between Deployments
To prevent nonce conflicts on testnet:
- 5s delay between each oracle deployment
- 10s delay before main contract deployment

---

## 📊 Gas Costs (Sepolia)

| Operation | Gas Used | Optimized |
|-----------|----------|-----------|
| AegisV3 Deployment | 3,186,443 | ✅ Insertion sort |
| Oracle Deployment | 505,045 | Standard |
| Oracle Registration | 141,434 | Standard |

**Total Deployment Cost**: ~5.2M gas (~0.01-0.02 ETH on Sepolia)

---

## 🐛 Troubleshooting

### "Replacement fee too low" Error
**Cause**: Rapid transaction submission causing nonce conflicts

**Solutions**:
1. Wait 30-60 seconds between deployments
2. Use `--reset` flag to force fresh deployment
3. Deploy problematic contract separately with dedicated script

### Insufficient Funds
**Cause**: Not enough Sepolia ETH in deployer wallet

**Solution**: Get more from faucets (need ~0.05-0.1 ETH)

### Wrong Network
**Cause**: Deploying to wrong network

**Solution**: Always specify `--network sepolia`

---

## 🔐 Security Notes

- Private keys are encrypted with password
- Never commit `.env` file to git
- Use different wallet for mainnet deployment
- Verify all contracts on Etherscan after deployment

---

## 📚 Additional Resources

- [Hardhat Deploy Docs](https://github.com/wighawag/hardhat-deploy)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)
