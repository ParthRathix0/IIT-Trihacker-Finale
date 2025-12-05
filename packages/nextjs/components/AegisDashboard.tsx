"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const AegisDashboard = () => {
  const [buyAmount, setBuyAmount] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Fix hydration issues by waiting for client load
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 1. READ: Core State
  const { data: currentBatchId } = useScaffoldReadContract({
    contractName: "AegisSettlement",
    functionName: "currentBatchId",
  });

  const { data: batchData } = useScaffoldReadContract({
    contractName: "AegisSettlement",
    functionName: "batches",
    args: [currentBatchId],
  });

  // 2. READ: Oracle Connection
  const { data: oracleAddress } = useScaffoldReadContract({
    contractName: "AegisSettlement",
    functionName: "priceFeed",
  });

  // 3. WRITE: Deposit
  const { writeContractAsync: depositBuy } = useScaffoldWriteContract("AegisSettlement");

  // Helper to calculate Average Price
  const getAveragePrice = () => {
    if (!batchData) return "0";
    // batchData struct mapping:
    // [0]id, [1]start, [2]end, [3]runningSum, [4]validBlockCount, ...
    const runningSum = batchData[3];
    const count = batchData[4];

    if (!count || Number(count) === 0) return "Waiting for Updates...";

    // Math: Sum / Count = Average
    const avg = Number(formatUnits(runningSum, 18)) / Number(count);
    return avg.toFixed(2);
  };

  const getStatus = (statusIndex: number) => {
    const statuses = ["OPEN", "ACCUMULATING", "DISPUTING", "SETTLED", "VOIDED"];
    return statuses[statusIndex] || "UNKNOWN";
  };

  const handleDeposit = async () => {
    try {
      await depositBuy({
        functionName: "depositBuy",
        value: parseEther(buyAmount),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isClient) return <div>Loading Aegis Protocol...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-8">
      {/* CARD 1: PROTOCOL STATUS */}
      <div className="card bg-base-100 shadow-xl border-2 border-primary">
        <div className="card-body">
          <h2 className="card-title text-2xl">🛡️ Aegis Protocol State</h2>
          <div className="badge badge-secondary mb-4">Batch #{currentBatchId?.toString()}</div>

          <div className="stats stats-vertical shadow bg-base-200">
            <div className="stat">
              <div className="stat-title">Batch Status</div>
              <div className="stat-value text-lg text-primary">
                {batchData ? getStatus(batchData[13]) : "Loading..."}
                {/* Note: batchData[13] corresponds to the 'state' enum in the struct */}
              </div>
            </div>

            <div className="stat">
              <div className="stat-title">Aegis Settlement Price (TWAP)</div>
              <div className="stat-value text-success">${getAveragePrice()}</div>
              <div className="stat-desc">Based on {batchData ? batchData[4].toString() : 0} blocks</div>
            </div>
          </div>

          {/* DEPOSIT FORM */}
          <div className="form-control mt-6">
            <label className="label">
              <span className="label-text">Deposit ETH Liquidity</span>
            </label>
            <div className="input-group flex">
              <input
                type="text"
                placeholder="0.1"
                className="input input-bordered w-full"
                value={buyAmount}
                onChange={e => setBuyAmount(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleDeposit}>
                Deposit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: ORACLE HEALTH */}
      <div className="card bg-base-100 shadow-xl border-2 border-secondary">
        <div className="card-body">
          <h2 className="card-title text-2xl">🔮 Chainlink Oracle</h2>
          <p className="text-xs opacity-50 truncate">Connected: {oracleAddress}</p>

          <div className="alert alert-info shadow-lg mt-4 text-sm">
            <div>
              <span>This contract is secured by the decentralized Chainlink Network on Sepolia.</span>
            </div>
          </div>

          <div className="divider">Security Metrics</div>

          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Valid Blocks</div>
              <div className="stat-value text-2xl">{batchData ? batchData[4].toString() : 0}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Volatility Safety</div>
              <div className="stat-value text-lg text-success">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
