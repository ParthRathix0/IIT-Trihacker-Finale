"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import toast from "react-hot-toast";

const BatchStatus = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const [batchInfo, setBatchInfo] = useState<any>(null);
  const [isProgressing, setIsProgressing] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const { data: currentBatchData, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getCurrentBatchInfo",
  });

  const [highlightPulse, setHighlightPulse] = useState(false);

  useEffect(() => {
    if (currentBatchData) {
      const [batchId, state, endBlock, buyVol, sellVol, settlementPrice] = currentBatchData as any[];
      const prevVolumes = batchInfo ? batchInfo.buyVolume + batchInfo.sellVolume : "0";
      const newVolumes = formatEther(BigInt(buyVol) + BigInt(sellVol));
      
      // Trigger pulse animation if volumes changed
      if (prevVolumes !== "0" && newVolumes !== prevVolumes) {
        setHighlightPulse(true);
        setTimeout(() => setHighlightPulse(false), 2000);
      }
      
      setBatchInfo({
        batchId: batchId?.toString(),
        state: ["OPEN", "ACCUMULATING", "DISPUTING", "SETTLING"][Number(state)],
        stateNum: Number(state),
        endBlock: Number(endBlock),
        buyVolume: formatEther(buyVol),
        sellVolume: formatEther(sellVol),
        settlementPrice: settlementPrice ? formatEther(settlementPrice) : "0",
      });
    }
  }, [currentBatchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  const progressPhase = async () => {
    setIsProgressing(true);
    try {
      if (batchInfo?.state === "OPEN") {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startAccumulation",
          args: [],
        });
        toast.success("Transitioned to ACCUMULATING");
      } else if (batchInfo?.state === "ACCUMULATING") {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "collectOraclePrices",
          args: [],
        });
        toast.success("Oracle prices collected");
        setTimeout(() => refetch(), 1000);
      } else if (batchInfo?.state === "DISPUTING") {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "startSettling",
          args: [],
        });
        toast.success("Transitioned to SETTLING");
      } else if (batchInfo?.state === "SETTLING") {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "executeSettlement",
          args: [],
        });
        toast.success("Settlement executed! New batch started");
      }
      setTimeout(() => refetch(), 1000);
    } catch (error: any) {
      toast.error(error.shortMessage || error.message?.slice(0, 100) || "Transaction failed");
    } finally {
      setIsProgressing(false);
    }
  };

  const startDispute = async () => {
    setIsProgressing(true);
    try {
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "startDispute",
        args: [],
      });
      toast.success("Transitioned to DISPUTING");
      setTimeout(() => refetch(), 1000);
    } catch (error: any) {
      toast.error(error.shortMessage || error.message?.slice(0, 100) || "Failed");
    } finally {
      setIsProgressing(false);
    }
  };

  const stateColors = {
    OPEN: "bg-blue-500",
    ACCUMULATING: "bg-yellow-500",
    DISPUTING: "bg-orange-500",
    SETTLING: "bg-green-500",
  };

  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border rounded-lg p-6 mb-6 transition-all duration-500 ${
      highlightPulse ? "border-blue-400 shadow-lg shadow-blue-500/50 scale-[1.02]" : "border-slate-700"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Batch #{batchInfo?.batchId}</h2>
        <div className={`${stateColors[batchInfo?.state as keyof typeof stateColors] || "bg-gray-500"} text-white px-4 py-2 rounded-full font-semibold`}>
          {batchInfo?.state}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
          <p className="text-slate-300 text-sm mb-1">Buy Volume</p>
          <p className="text-2xl font-bold text-blue-400">{parseFloat(batchInfo?.buyVolume || "0").toFixed(4)} ETH</p>
        </div>
        <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
          <p className="text-slate-300 text-sm mb-1">Sell Volume</p>
          <p className="text-2xl font-bold text-orange-400">{parseFloat(batchInfo?.sellVolume || "0").toFixed(4)} ETH</p>
        </div>
        <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
          <p className="text-slate-300 text-sm mb-1">Settlement Price</p>
          <p className="text-2xl font-bold text-green-400">${parseFloat(batchInfo?.settlementPrice || "0").toFixed(2)}</p>
        </div>
      </div>

      {batchInfo?.state && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-300 text-sm">Phase Progress</span>
            <div className="flex gap-2">
              {batchInfo.state === "ACCUMULATING" && (
                <button
                  onClick={startDispute}
                  disabled={isProgressing}
                  className="text-xs px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white rounded"
                >
                  Start Dispute
                </button>
              )}
              <button
                onClick={progressPhase}
                disabled={isProgressing}
                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded"
              >
                {isProgressing ? "Processing..." : 
                  batchInfo.state === "OPEN" ? "Start Accumulating" :
                  batchInfo.state === "ACCUMULATING" ? "Collect Oracles" :
                  batchInfo.state === "DISPUTING" ? "Start Settling" :
                  "Execute Settlement"}
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${stateColors[batchInfo.state as keyof typeof stateColors]}`}
              style={{ width: `${((batchInfo.stateNum + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchStatus;
