"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import toast from "react-hot-toast";

const FullDemoFlow = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const { isConnected } = useAccount();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<"idle" | "open" | "accumulating" | "disputing" | "settling">("idle");

  const { writeContractAsync } = useWriteContract();

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runFullDemo = async () => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    setIsRunning(true);
    setLogs([]);
    addLog("🚀 Starting full batch lifecycle demo...");

    try {
      // PHASE 1: OPEN - Place orders
      setCurrentPhase("open");
      addLog("📥 PHASE 1: OPEN - Placing orders...");

      try {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "deposit",
          args: [parseEther("10"), 0n],
        });
        addLog("✓ BUY order placed: 10 WETH");
      } catch (e: any) {
        addLog(`❌ BUY order failed: ${e.shortMessage || e.message?.slice(0, 50)}`);
      }

      await new Promise(r => setTimeout(r, 2000));

      try {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "deposit",
          args: [parseEther("8"), 1n],
        });
        addLog("✓ SELL order placed: 8 WETH");
      } catch (e: any) {
        addLog(`❌ SELL order failed: ${e.shortMessage || e.message?.slice(0, 50)}`);
      }

      await new Promise(r => setTimeout(r, 2000));

      // PHASE 2: ACCUMULATING
      setCurrentPhase("accumulating");
      addLog("📊 PHASE 2: ACCUMULATING - Collecting oracle prices...");
      addLog("⏳ Waiting for OPEN phase to end (12 blocks)...");

      try {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startAccumulation",
          args: [],
        });
        addLog("✓ Transitioned to ACCUMULATING");
      } catch (e: any) {
        addLog("❌ Start accumulation failed: " + (e.shortMessage || e.message?.slice(0, 60)));
        addLog("💡 Note: Need to wait for OPEN phase end (12 blocks after batch created)");
      }

      await new Promise(r => setTimeout(r, 2000));

      // Collect oracle prices
      addLog("🔄 Collecting oracle prices (need 4-block intervals)...");
      for (let i = 1; i <= 3; i++) {
        try {
          await writeContractAsync({
            address: contractAddress as `0x${string}`,
            abi,
            functionName: "collectOraclePrices",
            args: [],
          });
          addLog(`✓ Oracle price collection ${i}/3`);
        } catch (e: any) {
          addLog(`❌ Collection ${i} failed: ${e.shortMessage || e.message?.slice(0, 50)}`);
          addLog(`💡 Need 4 blocks between collections. Wait for more blocks.`);
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      // PHASE 3: DISPUTING
      setCurrentPhase("disputing");
      addLog("⚖️  PHASE 3: DISPUTING - Starting dispute phase...");
      addLog("⏳ Waiting for ACCUMULATING phase to end (48 blocks)...");

      try {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startDispute",
          args: [],
        });
        addLog("✓ Transitioned to DISPUTING");
      } catch (e: any) {
        addLog("❌ Start dispute failed: " + (e.shortMessage || e.message?.slice(0, 60)));
        addLog("💡 Note: Need 12 oracle collections across 48 blocks");
      }

      await new Promise(r => setTimeout(r, 2000));

      // PHASE 4: SETTLING
      setCurrentPhase("settling");
      addLog("💰 PHASE 4: SETTLING - Starting settlement...");
      addLog("⏳ Waiting for DISPUTING phase to end (15 blocks)...");

      try {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startSettling",
          args: [],
        });
        addLog("✓ Transitioned to SETTLING");
      } catch (e: any) {
        addLog("❌ Start settling failed: " + (e.shortMessage || e.message?.slice(0, 60)));
        addLog("💡 Note: Need to wait for dispute window to close");
      }

      await new Promise(r => setTimeout(r, 2000));

      addLog("⏳ Waiting for SETTLING phase to end (10 blocks)...");
      try {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "executeSettlement",
          args: [],
        });
        addLog("✓ Settlement executed! New batch started.");
      } catch (e: any) {
        addLog("❌ Execute settlement failed: " + (e.shortMessage || e.message?.slice(0, 60)));
        addLog("💡 Note: Need to wait for settling phase duration");
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
        {isRunning ? "⏳ Demo Running..." : "▶️ Start Full Demo"}
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
