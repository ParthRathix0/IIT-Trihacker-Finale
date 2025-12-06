# Aegis Protocol - Frontend Quick Start

## 📋 Overview

The Aegis Protocol frontend is a modern, interactive application for fair MEV-resistant batch settlement. This guide gets you running in 5 minutes.

## 🚀 Quick Start

### 1. Install & Setup
```bash
cd packages/nextjs
yarn install
```

### 2. Configure Contract Address
Create `.env.local`:
```env
NEXT_PUBLIC_AEGIS_ADDRESS=0x<your-contract-address>
```

### 3. Run Development Server
```bash
yarn dev
```

Visit: **http://localhost:3000/aegis**

## 📖 How to Use

### Place a BUY Order
1. Go to **Deposit** tab
2. Select **BUY** side
3. Enter amount in ETH (e.g., 0.5)
4. Click **Place BUY Order**
5. Confirm transaction in wallet

### Place a SELL Order
1. Go to **Deposit** tab
2. Select **SELL** side
3. Enter amount in ETH
4. Click **Place SELL Order**
5. Confirm transaction

### Dispute an Order
1. Go to **Dispute** tab
2. Your active orders appear during **DISPUTING** phase
3. Click **Dispute Order** to challenge the price
4. Confirm transaction

### Claim Rewards
1. Go to **Claim** tab
2. Select batch to claim from
3. Click **Claim**
4. Rewards are sent to your wallet

### Monitor Oracles
1. Go to **Oracles** tab
2. See all active oracles with:
   - **Weight**: 1-1000 scale
   - **Tech Stack**: Chainlink, Pyth, or API3
   - **Status**: Active/Inactive

## 🔄 Batch Lifecycle

The protocol runs in 4 phases:

```
OPEN (50 blocks)
    ↓
    Users deposit BUY/SELL orders
    ↓
ACCUMULATING (48 blocks)
    ↓
    Oracles collect prices
    ↓
DISPUTING (15 blocks)
    ↓
    Users can dispute price
    ↓
SETTLING (10 blocks)
    ↓
    Settlement occurs, users claim
```

Each phase is controlled automatically by the contract.

## 💡 Key Features

- **Real-time Updates**: Batch status refreshes every 3-5 seconds
- **Multi-Oracle Protection**: Hydra Defense prevents manipulation
- **No Custodial Risk**: You keep control of your wallet
- **Fair Pricing**: Settlement price is community-vetted
- **MEV-Resistant**: Batch processing prevents frontrunning

## 🏗️ Component Structure

```
Aegis Protocol Dashboard
├── BatchStatus      → Live batch phase display
├── Deposit Tab
│   └── DepositForm  → Place BUY/SELL orders
├── Dispute Tab
│   └── DisputeWidget → Challenge prices
├── Claim Tab
│   └── ClaimRewards  → Get filled + refunds
└── Oracles Tab
    └── OracleMonitor → Track oracle network
```

## 🔧 Configuration

### Available Environment Variables

```env
# Required
NEXT_PUBLIC_AEGIS_ADDRESS=0x...

# Optional
NEXT_PUBLIC_RPC_URL=https://...
```

### Customize Contract ABI

Edit `AegisDashboard.tsx` to update the `AEGIS_ABI` if your contract changes.

## 🎨 Styling

The frontend uses:
- **Tailwind CSS** for utilities
- **DaisyUI** for pre-built components  
- **Gradient backgrounds** for modern aesthetics

All in `<component-name>.tsx` files.

## 📱 Responsive Design

- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)

## 🐛 Troubleshooting

### "Connect wallet" always showing
→ Ensure RainbowKit is initialized in `ScaffoldEthAppWithProviders.tsx`

### Contract calls failing
→ Check `NEXT_PUBLIC_AEGIS_ADDRESS` in `.env.local`

### No orders showing
→ Verify you placed order in OPEN phase

### Oracles not displaying
→ Confirm oracles are registered in contract

## 📚 Development Guide

### Add New Tab
1. Create `components/Aegis/MyNewTab.tsx`
2. Import in `AegisDashboard.tsx`
3. Add button and render logic:
```tsx
const [activeTab, setActiveTab] = useState<"deposit" | "dispute" | "claim" | "oracles" | "mynewtab">("deposit");

// In tabs:
<button onClick={() => setActiveTab("mynewtab")}>My New Tab</button>

// In content:
{activeTab === "mynewtab" && <MyNewTab contractAddress={CONTRACT_ADDRESS} abi={AEGIS_ABI} />}
```

### Add Contract Function
1. Add to `AEGIS_ABI` in `AegisDashboard.tsx`
2. Use in component:
```tsx
const { writeContractAsync } = useWriteContract();

await writeContractAsync({
  address: CONTRACT_ADDRESS,
  abi: AEGIS_ABI,
  functionName: "functionName",
  args: [arg1, arg2],
});
```

## 🚀 Production Deployment

```bash
# Build
yarn build

# Test production build locally
yarn serve

# Deploy to Vercel
yarn vercel
```

## 📊 Key Metrics

- **Batch Size**: 50 blocks open, 48 accumulating
- **Dispute Window**: 15 blocks
- **Settlement Window**: 10 blocks
- **Max Oracles**: Unlimited
- **Max Price Deviation**: 10% filter per oracle

## 🔗 Links

- Protocol Documentation: See `DOCUMENTATION_SUMMARY.md`
- Contract Code: `packages/hardhat/contracts/AegisV3.sol`
- Frontend Code: `packages/nextjs/components/Aegis/`

## 📝 Notes

- All amounts are in wei (smallest ETH unit)
- Frontend auto-converts to ETH for display
- Transactions require wallet approval
- Some phases may auto-trigger on first user action

## ❓ FAQ

**Q: How long do batches take?**
A: ~10-15 minutes depending on block times (4-5 phases × 10-50 blocks)

**Q: Can I cancel my order?**
A: Orders are final once submitted. Dispute if settlement is unfair.

**Q: What are fill rates?**
A: Percentage of your order that gets filled based on buy/sell volume ratio

**Q: Why do disputes exist?**
A: To ensure prices are fair and prevent oracle manipulation

---

**Need help?** Check the README in `components/Aegis/README.md`
