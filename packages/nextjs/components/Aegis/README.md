# Aegis Protocol Frontend

A modern, interactive frontend for the Aegis Protocol - a fair, MEV-resistant batch settlement system with multi-oracle dynamic weighting.

## Features

### 🏗️ Components

1. **AegisDashboard** - Main dashboard with tabbed interface
2. **BatchStatus** - Real-time batch lifecycle display with phase indicators
3. **DepositForm** - Simple BUY/SELL order placement
4. **DisputeWidget** - Challenge orders during dispute phase
5. **ClaimRewards** - Claim filled orders and refunds
6. **OracleMonitor** - Track oracle network health and weights

### 🎯 User Flows

#### 1. Place an Order
- Select BUY or SELL side
- Enter amount in ETH
- Submit transaction
- Wait for batch to progress through phases

#### 2. Dispute an Order
- Only available during DISPUTING phase
- Click "Dispute Order" to challenge the settlement price
- Used when you believe price was unfair

#### 3. Claim Rewards
- After batch settles (SETTLING phase)
- Claim filled amount + refunded amount
- Funds transferred to wallet

#### 4. Monitor Oracles
- View active oracle network
- Track oracle weights (1-1000 scale)
- See tech stack distribution (Chainlink, Pyth, API3)

## Installation

```bash
cd packages/nextjs
yarn install
```

## Configuration

Set the contract address in `AegisDashboard.tsx`:

```typescript
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AEGIS_ADDRESS || "0x...";
```

Add to `.env.local`:

```
NEXT_PUBLIC_AEGIS_ADDRESS=0x...
```

## Running

```bash
yarn dev
```

Visit http://localhost:3000/aegis

## Architecture

```
components/Aegis/
├── AegisDashboard.tsx      # Main dashboard & routing
├── BatchStatus.tsx         # Batch info display
├── DepositForm.tsx         # Order placement
├── DisputeWidget.tsx       # Dispute interface
├── ClaimRewards.tsx        # Claiming interface
├── OracleMonitor.tsx       # Oracle monitoring
└── index.ts               # Exports

app/aegis/
└── page.tsx               # Route handler
```

## Smart Contract Integration

The frontend interacts with AegisV3 contract via these functions:

- `getCurrentBatchInfo()` - Get current batch state
- `deposit(amount, side)` - Place order
- `dispute()` - Dispute current batch
- `claim(batchId)` - Claim batch rewards
- `getUserOrder(batchId, user)` - Get user's order info
- `oracleCount()` - Get number of oracles

## Styling

Built with:
- **Tailwind CSS** - Utility-first styling
- **DaisyUI** - Component library
- **Gradient backgrounds** - Modern aesthetic

## State Management

- **Wagmi** - Web3 hooks for contract interaction
- **React Query** - Data fetching
- **React Hot Toast** - User notifications
- **Viem** - Ethereum utilities

## Key Features

### Real-time Updates
- Batch status refreshes every 3-5 seconds
- Live phase transitions
- Progress indicators

### User Experience
- Responsive design (mobile + desktop)
- Clear phase indicators
- Helpful tooltips and info cards
- Toast notifications for success/error

### Security
- Non-custodial (users control wallets)
- Uses wagmi for safe contract calls
- Transaction-level error handling

## Adding Features

### Add New Tab
1. Create component in `components/Aegis/`
2. Import in `AegisDashboard.tsx`
3. Add tab button with state
4. Render component based on tab

### Add Contract Function Call
1. Define ABI function in `AEGIS_ABI`
2. Use `useWriteContract()` hook
3. Call with `writeContractAsync()`
4. Handle errors with try-catch

## Future Enhancements

- [ ] Historical batch viewing
- [ ] Advanced oracle analytics
- [ ] Portfolio tracking
- [ ] Transaction history
- [ ] Mobile app
- [ ] Dark/light theme toggle
- [ ] Multichain support
- [ ] Price charts

## Troubleshooting

### "Connect wallet" still shows
- Ensure RainbowKit is properly initialized
- Check `ScaffoldEthAppWithProviders.tsx`

### Contract calls failing
- Verify `NEXT_PUBLIC_AEGIS_ADDRESS` is set
- Check contract ABI in `AEGIS_ABI`
- Ensure you're on correct network

### No oracles displaying
- Verify oracles are registered in contract
- Check `oracleCount` returns > 0

## License

MIT
