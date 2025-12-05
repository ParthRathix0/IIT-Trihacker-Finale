# Aegis Protocol V2.5.1 – Yellow Paper

Fair, MEV‑Resistant Batch Settlement with Adversarial Multi‑Oracle Aggregation

***

## 1. Introduction

Aegis is a batch settlement protocol that computes a single fair clearing price for a trading pair over a fixed horizon and settles all users pro‑rata at that price.

The design goals are:

- Eliminate per‑order MEV and frontrunning.
- Remain robust when external price feeds are adversarial, biased, or stale.
- Provide explicit liveness guarantees and bounded latency.
- Be gas‑efficient and modular enough for production deployment.

This document specifies Aegis Protocol V2.5.1, covering:

- The batch settlement state machine.
- Pro‑rata economics and solvency.
- The adversarial multi‑oracle layer (reputation, weights, bucketing, caps, and ejection).

***

## 2. System Model and Actors

### 2.1 Actors

- **Users** submit BUY and SELL orders into discrete batches over time.
- **Oracles** are external data providers that push prices on‑chain.
- **The Aegis contracts** orchestrate batching, oracle aggregation, settlement, and refunds.


### 2.2 Assets and Markets

For a trading pair $(B, Q)$:

- SELL orders deposit base asset $B$.
- BUY orders deposit quote asset $Q$.
- Escrow contracts hold user funds during each batch’s lifecycle.

The protocol is token‑agnostic as long as token contracts satisfy standard ERC‑20 semantics.

***

## 3. Batch Structure and State Machine

### 3.1 Batch Definition

A batch $b$ is identified by an integer ID and consists of:

- A time or block interval for accepting orders.
- Aggregated BUY and SELL books:
    - $O^B_b$: list of BUY orders.
    - $O^S_b$: list of SELL orders.
- A settlement price $P^\*_b$, or a VOID flag.


### 3.2 States

Each batch proceeds through these states:

1. **OPEN**
    - Users may submit BUY/SELL orders.
    - Deposits are locked in escrow.
2. **ACCUMULATING**
    - Order intake is closed.
    - Additional oracle observations may be recorded.
3. **DISPUTING**
    - Final window where oracles can update and disputes can be raised.
4. **SETTLING**
    - Oracle aggregation is performed.
    - A settlement price is computed.
5. **SETTLED**
    - Final settlement price fixed.
    - User fills and claims are available.
6. **VOIDED**
    - Batch invalidated due to oracle failure or safety conditions.
    - Users receive 1:1 refunds.

Transitions are forward‑only and governed by block‑based timeouts. This ensures each batch terminates in `SETTLED` or `VOIDED` in bounded time.

***

## 4. Economic Model

### 4.1 Aggregated Quantities

For batch $b$:

- $Q^B_b$: total requested BUY quantity (in base).
- $Q^S_b$: total offered SELL quantity (in base).
- $P^\*_b$: settlement price (quote per base) from the oracle layer.


### 4.2 Pro‑Rata Fills

Define BUY and SELL fill factors $\phi^B_b, \phi^S_b \in [0, 1]$:

- If $Q^B_b \le Q^S_b$:
    - $\phi^B_b = 1$
    - $\phi^S_b = Q^B_b / Q^S_b$
- Else ($Q^S_b < Q^B_b$):
    - $\phi^S_b = 1$
    - $\phi^B_b = Q^S_b / Q^B_b$

For BUY order $i$ with quantity $q^B_{i,b}$:

- Filled base: $q^{B,\text{fill}}_{i,b} = \phi^B_b \cdot q^B_{i,b}$
- Quote spent: $q^{Q,\text{spent}}_{i,b} = q^{B,\text{fill}}_{i,b} \cdot P^\*_b$

For SELL order $j$ with quantity $q^S_{j,b}$:

- Filled base: $q^{S,\text{fill}}_{j,b} = \phi^S_b \cdot q^S_{j,b}$
- Quote received: $q^{Q,\text{recv}}_{j,b} = q^{S,\text{fill}}_{j,b} \cdot P^\*_b$

Unfilled base/quote is returned.

### 4.3 Solvency Invariants

Let:

- $D^B_b$: total base deposited by sellers in batch $b$.
- $D^Q_b$: total quote deposited by buyers.

By construction:

- $\sum_j q^{S,\text{fill}}_{j,b} \le D^B_b$
- $\sum_i q^{B,\text{fill}}_{i,b} \le D^B_b$
- $\sum_j q^{Q,\text{recv}}_{j,b} \le D^Q_b$
- $\sum_i q^{Q,\text{spent}}_{i,b} \le D^Q_b$

This is enforced by using global fill factors $\phi^B_b, \phi^S_b$ derived from total BUY/SELL volume.

***

## 5. Oracle Threat Model

The oracle subsystem is explicitly designed for adversarial conditions:

- Oracles may report prices that deviate up to 30% from a reference.
- Prices may be stale or missing.
- Oracles may collude.
- A previously trustworthy oracle may become malicious after attracting weight.

Assumptions:

- A strict majority of oracles is honest over time.
- At least 2 active oracles are required to settle a batch.

Goals:

- Bound per‑oracle influence.
- Detect and penalize inaccurate reports.
- Eject chronic underperformers.
- Avoid excessive gas usage.

***

## 6. Oracle State \& Reputation

### 6.1 Oracle State

For each oracle $i$:

- `oracleAddress`: on‑chain address.
- `name`: metadata label.
- `reputation` $R_i \in [-100, 100]$.
- `lastUpdateBlock` $L_i$.
- `consecutiveBadBatches` $S_i$.
- `isActive`: bool.
- `isEjected`: bool.

A separate mapping caches `dynamicWeight[i]` computed from $R_i$.

### 6.2 Reputation → Weight (Sigmoid Approximation)

Weights are derived from reputation using a piecewise linear approximation of a sigmoid:

- $R_i = -100 \Rightarrow w_i = 0.1$
- $R_i = 0 \Rightarrow w_i = 0.5$
- $R_i = 100 \Rightarrow w_i = 0.9$

In fixed‑point form:

- Clamp $R_i$ to $[-100, 100]$.
- Compute:
    - `shift = R_i * 0.4e18 / 200`
    - `weight = 0.5e18 + shift`
    - Clamp `weight` to `[0.1e18, 0.9e18]`.

This guarantees:

- Weight never reaches 0 (oracles can recover).
- Weight changes smoothly with reputation.


### 6.3 Passive Recovery

To avoid permanent penalties:

- On each use, if `block.number - lastUpdateBlock > 32`, reputation is incremented by `blocksPassed / 32`.
- Reputation is capped at +100.
- `lastUpdateBlock` is updated.

This dispenses “forgiveness” over time to oracles that stop misbehaving.

***

## 7. Deviation Bucketing

### 7.1 Historical Bands

Let $P_{\text{prev}}$ be the previous batch’s settlement price. Define bands:

- Tight: $[0.97 P_{\text{prev}}, 1.03 P_{\text{prev}}]$
- Wide: $[0.85 P_{\text{prev}}, 1.15 P_{\text{prev}}]$
- Extreme: $[0.70 P_{\text{prev}}, 1.30 P_{\text{prev}}]$

These are computed once per batch.

### 7.2 Buckets

For each oracle price $p_i$, assign a `DeviationBucket`:

- `GOOD`: $p_i$ in tight band.
- `ACCEPTABLE`: $p_i$ in wide band but not tight.
- `BAD`: $p_i$ in extreme band but not in tighter bands.
- `EXTREME`: outside the extreme band.

Classification is $O(1)$ per oracle using only comparisons.

***

## 8. Consensus Bucket and Candidate Set

### 8.1 Consensus Bucket

Let $B_i$ be oracle $i$’s bucket. Define counts:

- $c_b = \#\{ i \mid B_i = b \}$ for each bucket $b$.

Consensus bucket is:

- $B^\* = \arg\max_b c_b$

If multiple buckets tie, a deterministic priority is used (GOOD > ACCEPTABLE > BAD > EXTREME).

### 8.2 Candidate Price Set

Define:

- $C = \{ p_i \mid B_i = B^\* \}$

This is the set of prices used to derive the settlement price.

***

## 9. Max Weight Cap and Normalization (V2.5.1)

### 9.1 Raw Weights

For each active oracle $i$:

- Compute $\tilde{w}_i = \text{reputationToWeight}(R_i)$.
- Let $W = \sum_i \tilde{w}_i$.


### 9.2 Per‑Oracle Cap (40%)

Define:

- $w_{\max} = \frac{2}{5} W$ (i.e. 40% of total raw weight).

Clip:

- $\hat{w}_i = \min(\tilde{w}_i, w_{\max})$.
- Surplus: $\Delta = \sum_i (\tilde{w}_i - \hat{w}_i)_{+}$.


### 9.3 Redistribute Surplus

Let:

- $U = \sum_{i: \hat{w}_i < w_{\max}} \hat{w}_i$.

For each uncapped oracle:

- $\hat{w}_i \leftarrow \hat{w}_i + \Delta \cdot \frac{\hat{w}_i}{U}$

This preserves total weight and enforces the cap.

### 9.4 Final Normalized Weights

Normalize to get final weights $w_i$:

- $w_i = \hat{w}_i / \sum_j \hat{w}_j$

These normalized weights are optionally exposed for monitoring and can be used in future extensions (e.g. true weighted median).

Properties:

- $w_i \le 40\%$ for all $i$.
- $\sum_i w_i = 100\%$.

***

## 10. Settlement Price Computation

With consensus bucket $B^\*$, candidate set $C$, and (optionally) weights $w_i$:

1. Filter $C = \{ p_i \mid B_i = B^\* \}$.
2. Compute:
    - Simple median of $C$ (for current implementation).
3. If $C$ is empty, the batch is VOIDED.

For a small number of oracles (e.g. 3–5), simple median is robust and efficient; a true weighted median can be introduced later.

The resulting $P^\*$ is passed to the economic layer for pro‑rata settlement.

***

## 11. Reputation Updates

### 11.1 Base Update per Batch

For each oracle $i$:

- Let $B_i$ be its bucket and $B^\*$ the consensus bucket.
- If $B_i = B^\*$:
    - $\Delta R_i = +15$.
- Else:
    - $d_i = |B_i - B^\*|$ (bucket distance).
    - $\Delta R_i = -25 \cdot d_i$.

Then:

- Apply passive recovery (if applicable).
- Set $R_i \leftarrow \text{clamp}(R_i + \Delta R_i, -100, 100)$.


### 11.2 Weight‑Scaled Penalty (Optional)

An additional term proportional to current weight and excess price deviation may be used to punish especially harmful deviations:

- Heavier oracles lose more reputation for the same deviation.
- This strengthens incentives for oracles with high influence to remain honest.

***

## 12. Strike System and Ejection

### 12.1 Strike Logic

Each oracle $i$ has `consecutiveBadBatches` $S_i$.

Per batch:

- If $B_i = B^\*$:
    - $S_i \leftarrow 0$ (reset).
- Else if $B_i \in \{\text{BAD}, \text{EXTREME}\}$:
    - $S_i \leftarrow S_i + 1$.
- Else if $B_i = \text{ACCEPTABLE}$ and $S_i > 0$:
    - $S_i \leftarrow S_i - 1$ (gradual forgiveness).


### 12.2 Three Strikes Ejection

If $S_i \ge 3$:

- Oracle is ejected:
    - `isActive = false`
    - `isEjected = true`
    - Removed from `activeOracles`.
    - Its weight is effectively set to zero and not considered further.

This removes chronically incorrect oracles even if reputation decays slowly.

### 12.3 Reputation‑Based Ejection

Independently of strikes, if $R_i < -80$:

- Oracle is ejected immediately.

This captures extremely malicious or very inaccurate behavior that rapidly destroys reputation.

***

## 13. Liveness and Failure Modes

### 13.1 Minimum Oracles

Aegis enforces:

- At least two active oracles are required to settle a batch.

If fewer than two remain:

- Batch is VOIDED.
- All user deposits are refunded 1:1.


### 13.2 Batch Voiding Conditions

A batch is VOIDED when:

- No consensus bucket can be formed.
- Candidate set $C$ is empty.
- Active oracle count drops below the minimum.
- Any safety invariant fails during oracle resolve.

Voiding always preserves solvency and returns user funds.

***

## 14. Contract Structure (Recommended Layout)

For production use, the codebase should be organized as:

- `src/AegisCore.sol`
    - Batch state machine, order intake, escrow, pro‑rata settlement.
- `src/AegisOracleManager.sol`
    - Oracle registration (admin‑gated), reputation/weight state, strikes, ejection.
- `src/AegisOracleAggregator.sol`
    - Deviation bucketing, consensus bucket selection, settlement price computation, weight normalization.
- `src/interfaces/`
    - `IAegisCore.sol`, `IAegisOracleManager.sol`, `IAegisOracleAggregator.sol`.
- `src/lib/`
    - Median helpers, fixed‑point math utilities.

This modularization improves readability, testability, and auditability.

***

## 15. Future Extensions

Potential future improvements:

- Switch from simple median to true weighted median within the consensus bucket.
- Use zk‑proofs to verify off‑chain oracle aggregation on‑chain.
- Introduce stake‑based slashing tied to reputation.
- Add governance mechanisms to add/remove oracles and tune parameters (bands, thresholds, caps).

***

## 16. Summary

Aegis V2.5.1 combines:

- A batch‑based, pro‑rata settlement engine that removes per‑order MEV.
- A multi‑oracle aggregation layer resilient to adversarial behavior.
- Non‑linear reputation with weight floors and passive recovery.
- A strict 40% max weight cap per oracle to prevent centralization.
- A strike and reputation‑based ejection system to remove chronic offenders.
- Gas‑efficient on‑chain logic based on banded bucketing rather than full statistics.