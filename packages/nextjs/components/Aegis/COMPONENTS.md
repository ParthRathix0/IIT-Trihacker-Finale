# Aegis Protocol Frontend - Component Documentation

## 📦 Components Overview

This document describes all frontend components for the Aegis Protocol.

---

## 🎯 Main Components

### 1. AegisDashboard.tsx
**Purpose**: Main dashboard with tabbed interface and navigation

**Features**:
- Tabbed navigation (Deposit, Dispute, Claim, Oracles)
- Real-time batch status display
- Connected wallet display
- Educational sidebar with protocol info
- Contract ABI definitions
- Responsive layout

**State**:
- `activeTab`: Current active tab

**Props**: None (uses wagmi hooks internally)

**Usage**:
```tsx
import { AegisDashboard } from "~/components/Aegis";
```

---

### 2. BatchStatus.tsx
**Purpose**: Displays current batch information with real-time updates

**Features**:
- Live batch ID display
- Phase indicator (OPEN, ACCUMULATING, DISPUTING, SETTLING)
- Buy/Sell volume tracking
- Settlement price display
- Phase progress bar
- Auto-refresh every 3 seconds

**State**:
- `batchInfo`: Current batch data
- `timeLeft`: Seconds until phase end
- `blockTime`: Current block number

**Props**:
```typescript
{
  contractAddress: string;
  abi: any;
}
```

**Contract Functions Used**:
- `getCurrentBatchInfo()`

**Example**:
```tsx
<BatchStatus 
  contractAddress="0x..." 
  abi={AEGIS_ABI} 
/>
```

---

### 3. DepositForm.tsx
**Purpose**: Form for placing BUY/SELL orders

**Features**:
- Side selection (BUY/SELL)
- Amount input (ETH)
- Real-time validation
- Loading state during transaction
- Toast notifications
- Error handling

**State**:
- `amount`: Order amount in ETH
- `side`: BUY or SELL
- `isLoading`: Transaction loading state

**Props**:
```typescript
{
  contractAddress: string;
  abi: any;
}
```

**Contract Functions Used**:
- `deposit(amount, side)`

**Example**:
```tsx
<DepositForm 
  contractAddress="0x..." 
  abi={AEGIS_ABI} 
/>
```

**Workflow**:
1. User selects BUY or SELL
2. Enters amount in ETH
3. Clicks "Place Order"
4. Transaction submitted to wallet
5. Upon confirmation, order is placed
6. Form clears and success toast shows

---

### 4. DisputeWidget.tsx
**Purpose**: Allows users to dispute batch settlement price

**Features**:
- Shows user's active order
- Order details (amount, side, status)
- Current batch phase
- Dispute button (DISPUTING phase only)
- Phase-based UI rendering
- Error handling

**State**:
- `isLoading`: Transaction loading state
- `userOrder`: User's order data

**Props**:
```typescript
{
  contractAddress: string;
  abi: any;
}
```

**Contract Functions Used**:
- `getCurrentBatchInfo()`
- `getUserOrder(batchId, user)`
- `dispute()`

**Example**:
```tsx
<DisputeWidget 
  contractAddress="0x..." 
  abi={AEGIS_ABI} 
/>
```

**Workflow**:
1. Check if user has active order
2. Display order details
3. Show "Dispute Order" button only in DISPUTING phase
4. On click, submit dispute transaction
5. Order marked as disputed in contract

---

### 5. ClaimRewards.tsx
**Purpose**: Allows users to claim filled orders and refunds

**Features**:
- Lists previous batches available for claiming
- One-click claim per batch
- Shows filled vs refunded amounts
- Help text explaining the process
- Transaction loading states

**State**:
- `selectedBatchId`: Currently selected batch
- `isLoading`: Transaction loading state

**Props**:
```typescript
{
  contractAddress: string;
  abi: any;
}
```

**Contract Functions Used**:
- `getCurrentBatchInfo()`
- `claim(batchId)`

**Example**:
```tsx
<ClaimRewards 
  contractAddress="0x..." 
  abi={AEGIS_ABI} 
/>
```

**Workflow**:
1. Show list of claimable batches
2. User selects batch
3. Clicks "Claim"
4. Contract processes claim
5. Funds transferred to wallet
6. Success notification shown

---

### 6. OracleMonitor.tsx
**Purpose**: Tracks oracle network health and weights

**Features**:
- Lists all active oracles
- Shows weight distribution (1-1000)
- Displays tech stack (Chainlink, Pyth, API3)
- Status indicator (Active/Inactive)
- Weight visualization with progress bar
- Total oracle count

**State**:
- `oracles`: List of oracle data
- `oracleCount`: Total oracles

**Props**:
```typescript
{
  contractAddress: string;
  abi: any;
}
```

**Contract Functions Used**:
- `oracleCount()`
- `getOracleInfo(oracleId)`

**Example**:
```tsx
<OracleMonitor 
  contractAddress="0x..." 
  abi={AEGIS_ABI} 
/>
```

**Display Elements**:
- Oracle ID
- Tech Stack Name
- Current Weight
- Active/Inactive Badge
- Visual weight bar

---

## 📱 Layout Structure

```
AegisDashboard
├── Header
│   ├── Title: "⚔️ Aegis Protocol"
│   ├── Description
│   └── Connected Wallet Address
├── Tabs Navigation
│   ├── Deposit
│   ├── Dispute
│   ├── Claim
│   └── Oracles
├── Main Content (Grid)
│   ├── [70%] Tab Content
│   │   └── Active Component (DepositForm, DisputeWidget, etc.)
│   └── [30%] Sidebar
│       ├── How It Works (Blue)
│       ├── Hydra Defense (Purple)
│       └── Benefits (Green)
└── BatchStatus (Full Width Above Tabs)
    ├── Batch ID & State Badge
    ├── Buy/Sell Volumes
    ├── Settlement Price
    └── Phase Progress Bar
```

---

## 🎨 Styling System

### Colors Used
- **Background**: `from-slate-900 via-slate-800 to-slate-900`
- **Cards**: `from-slate-800 to-slate-900`
- **Blue (BUY)**: `text-blue-400`, `bg-blue-600`
- **Orange (SELL)**: `text-orange-400`, `bg-orange-600`
- **Green (CLAIM)**: `bg-green-600`
- **Red (DISPUTE)**: `bg-red-600`

### Typography
- **Headings**: `font-bold text-white`
- **Labels**: `text-slate-300 text-sm font-medium`
- **Body**: `text-slate-300 text-sm`
- **Numbers**: `text-2xl font-bold`

### Spacing
- **Container**: `max-w-7xl mx-auto px-6 py-8`
- **Grid Gaps**: `gap-4` to `gap-6`
- **Padding**: `p-4` to `p-6`

---

## 🔄 Data Flow

### Order Placement Flow
```
User Input
    ↓
DepositForm validates
    ↓
writeContractAsync called
    ↓
Wallet signs transaction
    ↓
Contract deposit() executed
    ↓
Toast notification
    ↓
BatchStatus updates (auto-refresh)
```

### Batch Status Update Flow
```
BatchStatus auto-refresh (3s interval)
    ↓
useReadContract fetches getCurrentBatchInfo
    ↓
batchInfo state updated
    ↓
UI re-renders with new data
    ↓
Progress bar animates
```

---

## 🔌 Contract Integration

### Required ABI Functions

```typescript
// Batch Info
getCurrentBatchInfo(): {
  batchId: uint256,
  state: uint8,
  endBlock: uint256,
  buyVolume: uint256,
  sellVolume: uint256,
  settlementPrice: uint256
}

// User Operations
deposit(amount: uint256, side: uint8): void
dispute(): void
claim(batchId: uint256): void

// User Data
getUserOrder(batchId: uint256, user: address): {
  amount: uint256,
  side: uint8,
  claimed: bool,
  disputed: bool
}

// Oracle Info
oracleCount(): uint256
getOracleInfo(oracleId: uint256): OracleInfo
```

---

## 🎯 State Management

### Global State
- Connected wallet address (wagmi)
- Active batch ID (contract)
- Current batch state (contract)

### Component State
- `activeTab`: Dashboard tab selection
- `amount`: Deposit form input
- `side`: BUY/SELL selection
- `isLoading`: Transaction states
- `batchInfo`: Batch data cache
- `orderData`: User order cache

### External State (Contract)
- User balances
- Batch state
- Oracle weights
- Filled/disputed flags

---

## 🚀 Performance Optimizations

1. **Auto-refresh Strategy**
   - BatchStatus: 3-5 second intervals
   - Stops on component unmount
   - Debounced updates

2. **Read Contract Hooks**
   - Query caching built-in
   - Stale while revalidate pattern
   - Conditional queries (enabled flag)

3. **Memoization**
   - State variables memoized
   - Computed values cached
   - Re-renders optimized

---

## 🧪 Testing Guide

### Manual Testing Checklist
- [ ] Connect wallet successfully
- [ ] Place BUY order (check batch updates)
- [ ] Place SELL order (check batch updates)
- [ ] Dispute during DISPUTING phase
- [ ] Claim from previous batch
- [ ] View oracle network
- [ ] Mobile responsiveness
- [ ] Error handling (reject transaction)
- [ ] Toast notifications appear

### Edge Cases to Test
- No wallet connected
- Active transaction pending
- Network switch mid-transaction
- Invalid amount input
- Contract call failures
- Very small/large amounts

---

## 📚 Usage Examples

### Simple Integration
```tsx
import { AegisDashboard } from "~/components/Aegis";

export default function Page() {
  return <AegisDashboard />;
}
```

### Custom Configuration
```tsx
import { DepositForm, BatchStatus } from "~/components/Aegis";

const CONTRACT_ADDRESS = "0x...";
const ABI = [...];

export default function CustomDash() {
  return (
    <div>
      <BatchStatus contractAddress={CONTRACT_ADDRESS} abi={ABI} />
      <DepositForm contractAddress={CONTRACT_ADDRESS} abi={ABI} />
    </div>
  );
}
```

---

## 🔐 Security Considerations

1. **No Private Keys Stored**: All signing via wallet extension
2. **Input Validation**: Amount checks, wallet validation
3. **Error Handling**: Try-catch on all contract calls
4. **User Confirmation**: All transactions require wallet approval
5. **No Unnecessary Approvals**: Direct ETH calls, no token approvals

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Connect wallet" always showing | Check RainbowKit setup in providers |
| Contract calls failing | Verify NEXT_PUBLIC_AEGIS_ADDRESS env var |
| No batch data | Wait for contract to be deployed |
| Buttons disabled | Check wallet connection, network |
| Oracles not showing | Confirm oracles registered in contract |

---

## 📖 Related Files

- `app/aegis/page.tsx` - Route handler
- `AegisDashboard.tsx` - Main component
- `package.json` - Dependencies
- `.env.local` - Configuration

---

Generated: 2025-12-06
Updated with full frontend implementation
