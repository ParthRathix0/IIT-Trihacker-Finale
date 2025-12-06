# Aegis Protocol Frontend - Visual Guide & Screenshots

## 🎨 UI Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      HEADER (Dark Gradient)                      │
│  ⚔️ Aegis Protocol                          [Connect Wallet]    │
│  Fair, MEV-resistant batch settlement with multi-oracle defense  │
│  Connected: 0x1234...5678                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BATCH STATUS (Full Width)                     │
│  ┌──────────────────────────────┐     ┌──────────────────────┐  │
│  │ Batch #42                    │     │ ACCUMULATING         │  │
│  │ (Green Badge)                │     │ (Yellow Badge)       │  │
│  ├──────────────────────────────┤     └──────────────────────┘  │
│  │ Buy: 25.5 ETH  │ Sell: 22.3 ETH  │ Settlement: $1,850.50    │
│  └──────────────────────────────────────────────────────────────┘
│  Phase Progress: ████████░░░░░░░░░░░░░░░░░░░░ 60%              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              TAB NAVIGATION (Underlined Active)                   │
│  ► Deposit   │ Dispute   │ Claim   │ Oracles                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┬──────────────────────────────┐
│          MAIN CONTENT (70%)      │      SIDEBAR INFO (30%)       │
│                                  │                              │
│  ┌────────────────────────────┐  │  ┌──────────────────────────┐ │
│  │    DEPOSIT FORM            │  │  │ 📊 How It Works:         │ │
│  │ ┌──────────────────────┐   │  │  │ 1. OPEN: Deposit orders  │ │
│  │ │ Side: [BUY] [SELL]   │   │  │  │ 2. ACCUM: Collect prices │ │
│  │ │ Amount: _________ ETH │   │  │  │ 3. DISPUTE: Challenge    │ │
│  │ │ [Place BUY Order]    │   │  │  │ 4. SETTLE: Claim rewards │ │
│  │ └──────────────────────┘   │  │  └──────────────────────────┘ │
│  └────────────────────────────┘  │                              │
│                                  │  ┌──────────────────────────┐ │
│                                  │  │ 🛡️ Hydra Defense:       │ │
│                                  │  │ Multiple oracle sources  │ │
│                                  │  │ with dynamic weighting   │ │
│                                  │  │ prevent MEV attacks      │ │
│                                  │  └──────────────────────────┘ │
│                                  │                              │
│                                  │  ┌──────────────────────────┐ │
│                                  │  │ ✓ Benefits:              │ │
│                                  │  │ • No frontrunning        │ │
│                                  │  │ • Fair price discovery   │ │
│                                  │  │ • Community-driven       │ │
│                                  │  └──────────────────────────┘ │
└──────────────────────────────────┴──────────────────────────────┘
```

---

## 🎯 Component Layouts

### Deposit Tab
```
┌─ DEPOSIT FORM ──────────────────────────┐
│ Side Selection:                         │
│ [━━ BUY ━━]  [SELL]                     │
│                                         │
│ Amount (ETH):                           │
│ ┌─────────────────────────────────────┐ │
│ │ 0.5                                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [━━ PLACE BUY ORDER ━━]                │
│ (Green when ready)                      │
│                                         │
│ ✓ Status: Processing...                │
└─────────────────────────────────────────┘
```

### Dispute Tab
```
┌─ ORDER DETAILS ─────────────────────────┐
│                                         │
│ Amount:      1.50 ETH                   │
│ Side:        BUY                        │
│ Status:      Active                     │
│ Phase:       DISPUTING                  │
│                                         │
│ [━━━ DISPUTE ORDER ━━━]                │
│ (Red - only during DISPUTING)           │
└─────────────────────────────────────────┘
```

### Claim Tab
```
┌─ CLAIMABLE BATCHES ─────────────────────┐
│                                         │
│ Batch #40                               │
│ Available for claiming          [CLAIM] │
│                                         │
│ Batch #39                               │
│ Available for claiming          [CLAIM] │
│                                         │
│ Batch #38                               │
│ Available for claiming          [CLAIM] │
│                                         │
│ How it works:                           │
│ ✓ Place order in OPEN phase             │
│ ✓ Settlement happens in SETTLING phase  │
│ ✓ Claim your filled + refunded amounts  │
└─────────────────────────────────────────┘
```

### Oracles Tab
```
┌─ ORACLE NETWORK ────────────────────────┐
│                                         │
│ Oracle #1                    ✓ Active   │
│ Chainlink │ Weight: 850/1000            │
│ ████████░░░░░░░░░░░░░░░░░░░░           │
│                                         │
│ Oracle #2                    ✓ Active   │
│ Pyth │ Weight: 420/1000                 │
│ ████░░░░░░░░░░░░░░░░░░░░░░░            │
│                                         │
│ Oracle #3                    ✓ Active   │
│ API3 │ Weight: 230/1000                 │
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░            │
│                                         │
│ 3 oracles active in Hydra Defense       │
└─────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Phase Badges
```
OPEN          [Blue Badge]      #3B82F6
ACCUMULATING  [Yellow Badge]    #EAB308
DISPUTING     [Orange Badge]    #F97316
SETTLING      [Green Badge]     #22C55E
```

### Action Buttons
```
BUY Order     [Blue Button]      #2563EB
SELL Order    [Orange Button]    #EA580C
CLAIM         [Green Button]     #16A34A
DISPUTE       [Red Button]       #DC2626
```

### Text Hierarchy
```
Primary:      White (#FFFFFF)
Secondary:    Slate-300 (#CBD5E1)
Tertiary:     Slate-400 (#94A3B8)
Numbers:      Blue/Green (#93C5FD / #86EFAC)
```

---

## 📱 Responsive Breakpoints

### Mobile (320px - 480px)
```
┌─────────────────┐
│     HEADER      │
├─────────────────┤
│  BATCH STATUS   │
├─────────────────┤
│   TAB NAV       │
├─────────────────┤
│  TAB CONTENT    │
│  (100% width)   │
├─────────────────┤
│  SIDEBAR INFO   │
│  (100% width,   │
│   below content)│
└─────────────────┘
```

### Tablet (768px - 1024px)
```
┌───────────────────────────────┐
│           HEADER              │
├───────────────────────────────┤
│        BATCH STATUS           │
├───────────┬───────────────────┤
│TAB NAV    │   CONTENT (65%)   │
├───────────┤   + SIDEBAR (35%) │
│CONTENT    │   SIDE BY SIDE    │
│ (100%)    │                   │
└───────────┴───────────────────┘
```

### Desktop (1440px+)
```
┌────────────────────────────────────────┐
│              HEADER                    │
├────────────────────────────────────────┤
│           BATCH STATUS (Full)          │
├─────────────────────────────────────────┤
│ TAB NAV                                 │
├────────────────────┬────────────────────┤
│   CONTENT (65%)    │  SIDEBAR (35%)     │
│   (Main Tab)       │  (3 Info Cards)    │
│                    │                    │
│                    │                    │
└────────────────────┴────────────────────┘
```

---

## 🔄 Interaction Flow Diagram

```
USER ACTION              COMPONENT         STATE CHANGE      OUTCOME
────────────────────────────────────────────────────────────────────

Connect Wallet  ──→  RainbowKit  ──→  {address, isConnected}  ✓ Enabled
                                                               Buttons
                                                               
Select BUY      ──→  DepositForm ──→  {side: "BUY"}  ──→ Button Color
                     State                                Updates

Enter Amount    ──→  DepositForm ──→  {amount: "0.5"} ──→ Validated
                     Validation                           & Formatted

Click "Place    ──→  writeContractAsync  ──→ TX Pending ──→ Show Spinner
Order"             Function                    State           & Disable

Sign TX         ──→  Wallet           ──→  TX Hash ────→ Success Toast
                     Extension               Generated         & Reset
                                                           Form

Auto Refresh    ──→  BatchStatus      ──→  {batch} ────→ Phase Updates
(3s interval)       useReadContract        State            & Progress
                     Query                  Refreshed        Bar

Click "Dispute" ──→  DisputeWidget    ──→  dispute() ──→ TX Submitted
(DISPUTING          writeContractAsync     Called        ✓ Marked
phase)              Function                              Disputed

Click "Claim"   ──→  ClaimRewards     ──→  claim()  ──→ Funds Sent
                     writeContractAsync    Called       to Wallet
                     Function              ✓ Success
```

---

## 📊 Data Flow

```
CONTRACT STATE                    COMPONENT STATE              UI STATE
──────────────────────────────────────────────────────────────────────

getCurrentBatchInfo()  ──→  BatchStatus  ──→  {batchInfo}  ──→  [Displayed]
  - batchId                  useReadContract   - id             ID Badge
  - state                     (auto-refresh)   - state          State Badge
  - endBlock                                   - volumes        Volumes
  - buyVolume                                  - price          Progress
  - sellVolume
  - settlementPrice

getCurrentBatchInfo()  ──→  DisputeWidget ──→  {batchData}  ──→  [Rendered]
+                            useReadContract   + {orderData}     Order
getUserOrder()               (conditional)                       Details
  - amount
  - side                                                         Button
  - claimed                                                      State
  - disputed

oracleCount()          ──→  OracleMonitor ──→  {oracles}   ──→  [Listed]
+                            useReadContract   - Array of        Oracle
getOracleInfo()        (batch read loop)       - id              Cards
  - weight                                     - weight          with
  - techStackId                                - stackId         Bars
  - isActive                                   - isActive
```

---

## 🎬 Animation Timeline

```
COMPONENT          ANIMATION              DURATION    TIMING
──────────────────────────────────────────────────────────────

Progress Bar       Width ↑ Update         500ms       ease-out

Phase Badge        Fade In                300ms       ease-in

Button Hover       BG Color Change        200ms       ease-out
                   + Shadow

Form Input         Border Highlight       150ms       ease-in
                   (on focus)

Toast Notify       Slide Up               300ms       ease-out
                   Auto-dismiss           4 seconds   linear

Page Load          Stagger                200ms       ease-out
                   Components             (cascading)
```

---

## 🎯 Wireframe - Mobile View

```
┌─────────────────────────────┐
│          HEADER             │
│ ⚔️ Aegis Protocol          │
└─────────────────────────────┘
┌─────────────────────────────┐
│     BATCH STATUS            │
│ Batch #42                   │
│ [🟢 ACCUMULATING]           │
│ Buy: 25.5 ETH               │
│ Sell: 22.3 ETH              │
│ Price: $1,850.50            │
│ Progress: ████░░░░░ 60%     │
└─────────────────────────────┘
┌─────────────────────────────┐
│      TAB BUTTONS            │
│ ▶ Deposit Dispute Claim     │
│   Oracles                   │
└─────────────────────────────┘
┌─────────────────────────────┐
│     DEPOSIT FORM            │
│ Side: [BUY] [SELL]          │
│ Amount:                     │
│ [________________] ETH      │
│ [PLACE BUY ORDER]           │
└─────────────────────────────┘
┌─────────────────────────────┐
│    HOW IT WORKS             │
│ 1. OPEN: Deposit            │
│ 2. ACCUM: Collect prices    │
│ 3. DISPUTE: Challenge       │
│ 4. SETTLE: Claim rewards    │
└─────────────────────────────┘
```

---

## 🎯 Wireframe - Desktop View

```
┌──────────────────────────────────────────────────┐
│ ⚔️ Aegis Protocol | Fair MEV-resistant settlement │
│ Connected: 0x1234...5678                         │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Batch #42 [🟢 ACCUMULATING]                     │
│  Buy: 25.5 ETH │ Sell: 22.3 ETH │ Price: $1,850 │
│  Progress: ████████░░░░░░░░░░░░░░░░░░░░ 60%    │
└──────────────────────────────────────────────────┘

┌───────────────────┐ ┌─────────────────────────────┐
│ ► Deposit         │ │                             │
│   Dispute         │ │    📊 How It Works:         │
│   Claim           │ │    1. OPEN: Deposit orders  │
│   Oracles         │ │    2. ACCUM: Collect prices │
├───────────────────┤ │    3. DISPUTE: Challenge    │
│                   │ │    4. SETTLE: Claim rewards │
│ DEPOSIT FORM      │ │                             │
│ ┌─────────────┐   │ │ ┌─────────────────────────┐ │
│ │ Side:[B][S] │   │ │ │ 🛡️ Hydra Defense       │ │
│ │ Amount:___  │   │ │ │ Multiple oracles with  │ │
│ │ [PLACE ORD] │   │ │ │ dynamic weighting      │ │
│ └─────────────┘   │ │ └─────────────────────────┘ │
│                   │ │                             │
│                   │ │ ┌─────────────────────────┐ │
│                   │ │ │ ✓ Benefits:             │ │
│                   │ │ │ • No frontrunning       │ │
│                   │ │ │ • Fair pricing         │ │
│                   │ │ │ • Community-driven     │ │
│                   │ │ └─────────────────────────┘ │
└───────────────────┴─────────────────────────────────┘
```

---

## 🎨 Color Palette Reference

```
PRIMARY COLORS:
  Dark BG:      #0F172A (slate-900)
  Card BG:      #1E293B (slate-800)
  Border:       #334155 (slate-700)
  
TEXT:
  Primary:      #FFFFFF (white)
  Secondary:    #CBD5E1 (slate-300)
  Tertiary:     #94A3B8 (slate-400)

ACTIONS:
  BUY:          #2563EB (blue-600)
  SELL:         #EA580C (orange-600)
  CLAIM:        #16A34A (green-600)
  DISPUTE:      #DC2626 (red-600)
  
VALUES:
  Numbers:      #93C5FD (blue-400)
  Success:      #86EFAC (green-400)
  Alert:        #FCA5A5 (red-400)
```

---

## 🎯 Key Visual Elements

✅ **Badges** - Phase indicators (colored)
✅ **Progress Bar** - Phase completion %
✅ **Cards** - Info containers (rounded, bordered)
✅ **Buttons** - Call-to-action (color-coded)
✅ **Gradients** - Visual depth (subtle, dark)
✅ **Icons** - Unicode symbols (⚔️, 📊, 🛡️, ✓, etc.)
✅ **Shadows** - Depth perception (subtle)
✅ **Spacing** - Breathing room (consistent grid)

---

This visual guide complements the code documentation for developers and designers!
