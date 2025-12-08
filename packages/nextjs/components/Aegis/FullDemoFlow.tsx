"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import toast from "react-hot-toast";

const WETH_ADDRESS = "0x46059af680A19f3D149B3B8049D3aecA9050914C"; // Sepolia WETH

const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
    stateMutability: "view",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
    stateMutability: "view",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
    stateMutability: "nonpayable",
  },
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    type: "function",
    stateMutability: "payable",
  },
] as const;

const FullDemoFlow = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const { address, isConnected } = useAccount();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<"idle" | "open" | "accumulating" | "disputing" | "settling">("idle");

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Check WETH Balance
  const { data: wethBalance, refetch: refetchBalance } = useReadContract({
    address: WETH_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  // Check Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: WETH_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address as `0x${string}`, contractAddress as `0x${string}`],
    query: { enabled: !!address && !!contractAddress },
  });

  const { data: batchInfo } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getCurrentBatchInfo",
  });

  const currentBatchState = batchInfo ? Number((batchInfo as any[])[1]) : 0; // 0=OPEN, 1=ACCUMULATING, 2=DISPUTING, 3=SETTLING

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const waitForBlocks = async (blocks: number) => {
    if (!publicClient) return;
    addLog(`⏳ Waiting for ${blocks} blocks (~${blocks * 12}s)...`);
    const startBlock = await publicClient.getBlockNumber();
    while (true) {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock >= startBlock + BigInt(blocks)) break;
      await new Promise(r => setTimeout(r, 4000));
    }
  };

  const runFullDemo = async () => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    if (currentBatchState !== 0) {
      toast.error("Batch is not in OPEN phase. Please finish current batch first.");
      addLog("❌ Cannot start demo: Batch is not in OPEN phase.");
      addLog(`💡 Current Phase: ${["OPEN", "ACCUMULATING", "DISPUTING", "SETTLING"][currentBatchState]}`);
      addLog("👉 Use the Dashboard to advance/finish the current batch.");
      return;
    }

    setIsRunning(true);
    setLogs([]);
    addLog("🚀 Starting full batch lifecycle demo...");

    try {
      // PRE-CHECK: WETH and Allowance
      const requiredAmount = parseEther("0.002"); // 0.001 + 0.0008 + buffer
      
      if (!wethBalance || wethBalance < requiredAmount) {
        addLog("⚠️ Insufficient WETH. Wrapping ETH...");
        try {
          const hash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: erc20Abi,
            functionName: "deposit",
            value: requiredAmount,
            // @ts-ignore
            gas: 100000n, // Force gas limit to bypass simulation
          });
          addLog("⏳ Waiting for Wrap confirmation...");
          await publicClient?.waitForTransactionReceipt({ hash });
          addLog("✓ Wrapped 0.002 ETH to WETH");
          await refetchBalance();
        } catch (e: any) {
          addLog(`⚠️ Failed to wrap ETH: ${e.shortMessage || e.message?.slice(0, 30)}...`);
          addLog("➡️ Proceeding anyway...");
          console.error(e);
        }
      }

      if (!allowance || allowance < requiredAmount) {
        addLog("⚠️ Insufficient Allowance. Approving WETH...");
        try {
          const hash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: erc20Abi,
            functionName: "approve",
            args: [contractAddress as `0x${string}`, requiredAmount * 10n], // Approve plenty
            // @ts-ignore
            gas: 100000n,
          });
          addLog("⏳ Waiting for Approval confirmation...");
          await publicClient?.waitForTransactionReceipt({ hash });
          addLog("✓ Approved WETH for Aegis contract");
          await refetchAllowance();
        } catch (e: any) {
          addLog(`⚠️ Failed to approve: ${e.shortMessage || e.message?.slice(0, 30)}...`);
          addLog("➡️ Proceeding anyway...");
          console.error(e);
        }
      }

      // PHASE 1: OPEN - Place orders
      setCurrentPhase("open");
      addLog("📥 PHASE 1: OPEN - Placing orders...");

      try {
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "deposit",
          args: [parseEther("0.001"), 0n],
          // @ts-ignore
          gas: 200000n,
        });
        addLog("⏳ Waiting for BUY confirmation...");
        await publicClient?.waitForTransactionReceipt({ hash });
        addLog("✓ BUY order placed: 0.001 WETH");
      } catch (e: any) {
        addLog(`❌ BUY order failed: ${e.shortMessage || e.message?.slice(0, 50)}`);
      }

      try {
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "deposit",
          args: [parseEther("0.0008"), 1n],
          // @ts-ignore
          gas: 200000n,
        });
        addLog("⏳ Waiting for SELL confirmation...");
        await publicClient?.waitForTransactionReceipt({ hash });
        addLog("✓ SELL order placed: 0.0008 WETH");
      } catch (e: any) {
        addLog(`❌ SELL order failed: ${e.shortMessage || e.message?.slice(0, 50)}`);
      }

      // PHASE 2: ACCUMULATING
      setCurrentPhase("accumulating");
      addLog("📊 PHASE 2: ACCUMULATING - Collecting oracle prices...");
      
      // Wait for OPEN phase to end (12 blocks)
      await waitForBlocks(2); // Just wait a bit to be safe, usually user interaction takes time

      try {
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startAccumulation",
          args: [],
        });
        addLog("⏳ Waiting for Accumulation start...");
        await publicClient?.waitForTransactionReceipt({ hash });
        addLog("✓ Transitioned to ACCUMULATING");
      } catch (e: any) {
        addLog("⚠️ Start accumulation failed (maybe already started or too early).");
      }

      // Collect oracle prices
      addLog("🔄 Collecting oracle prices (need 4-block intervals)...");
      for (let i = 1; i <= 3; i++) {
        try {
          const hash = await writeContractAsync({
            address: contractAddress as `0x${string}`,
            abi,
            functionName: "collectOraclePrices",
            args: [],
          });
          addLog(`⏳ Waiting for Collection ${i}/3...`);
          await publicClient?.waitForTransactionReceipt({ hash });
          addLog(`✓ Oracle price collection ${i}/3`);
          
          if (i < 3) await waitForBlocks(4); // Wait 4 blocks between collections
        } catch (e: any) {
          addLog(`❌ Collection ${i} failed: ${e.shortMessage || e.message?.slice(0, 50)}`);
        }
      }

      // PHASE 3: DISPUTING
      setCurrentPhase("disputing");
      addLog("⚖️  PHASE 3: DISPUTING - Starting dispute phase...");
      
      try {
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startDispute",
          args: [],
        });
        addLog("⏳ Waiting for Dispute start...");
        await publicClient?.waitForTransactionReceipt({ hash });
        addLog("✓ Transitioned to DISPUTING");
      } catch (e: any) {
        addLog("⚠️ Start dispute failed (maybe too early).");
      }

      // PHASE 4: SETTLING
      setCurrentPhase("settling");
      addLog("💰 PHASE 4: SETTLING - Starting settlement...");
      
      try {
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startSettling",
          args: [],
        });
        addLog("⏳ Waiting for Settling start...");
        await publicClient?.waitForTransactionReceipt({ hash });
        addLog("✓ Transitioned to SETTLING");
      } catch (e: any) {
        addLog("⚠️ Start settling failed.");
      }

      try {
        const hash = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "executeSettlement",
          args: [],
        });
        addLog("⏳ Waiting for Execution...");
        await publicClient?.waitForTransactionReceipt({ hash });
        addLog("✓ Settlement executed! New batch started.");
      } catch (e: any) {
        addLog("⚠️ Execute settlement failed.");
      }

      await new Promise(r => setTimeout(r, 2000));

      addLog("📈 Demo complete!");
      setCurrentPhase("idle");
      toast.success("Full demo completed!");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      toast.error("Demo failed");
      setCurrentPhase("idle");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">🎬 Full Batch Lifecycle Demo</h3>
      <p className="text-purple-100 text-sm">
        Demonstrates all 4 phases by calling real contract functions: OPEN (deposit) → ACCUMULATING (oracle) → DISPUTING (challenge) → SETTLING (execute)
      </p>

      {/* Phase Indicator */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {(["open", "accumulating", "disputing", "settling"] as const).map(phase => (
          <div
            key={phase}
            className={`py-2 px-2 rounded text-sm font-semibold transition ${
              currentPhase === phase
                ? "bg-white text-purple-900 scale-105"
                : currentPhase === "idle"
                  ? "bg-purple-700 text-white"
                  : ["open", "accumulating", "disputing", "settling"].indexOf(phase) <
                      ["open", "accumulating", "disputing", "settling"].indexOf(currentPhase)
                    ? "bg-green-600 text-white"
                    : "bg-purple-700 text-purple-300"
            }`}
          >
            {phase === "open" && "📥"}
            {phase === "accumulating" && "📊"}
            {phase === "disputing" && "⚖️"}
            {phase === "settling" && "💰"}
            <div className="text-xs mt-1">{phase.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={runFullDemo}
        disabled={isRunning || !isConnected}
        className={`w-full py-3 px-4 rounded font-semibold transition ${
          isRunning || !isConnected
            ? "bg-purple-700 text-purple-300 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-500 text-white"
        }`}
      >
        {isRunning ? "⏳ Demo Running..." : currentBatchState !== 0 ? "⚠️ Finish Current Batch First" : "▶️ Start Full Demo"}
      </button>

      {/* Logs */}
      <div className="bg-black bg-opacity-40 rounded p-4 max-h-96 overflow-y-auto font-mono text-xs text-green-300 space-y-1 border border-purple-700">
        {logs.length === 0 ? (
          <div className="text-purple-400">Click &quot;Start Full Demo&quot; to begin...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-green-300">
              {log}
            </div>
          ))
        )}
      </div>

      <div className="text-purple-200 text-xs">
        <strong>⚠️ Note:</strong> Requires WETH balance &amp; approval. Calls real contract functions—phase transitions require block confirmations. On Sepolia, expect errors due to block timing constraints (~15-30 min for full cycle).
      </div>
    </div>
  );
};

export default FullDemoFlow;
