"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import toast from "react-hot-toast";

const BatchStatus = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const [batchInfo, setBatchInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [blockTime, setBlockTime] = useState(0);

  const { data: currentBatchData, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getCurrentBatchInfo",
  });

  useEffect(() => {
    if (currentBatchData) {
      const [batchId, state, endBlock, buyVol, sellVol, settlementPrice] = currentBatchData as any[];
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

  const stateColors = {
    OPEN: "bg-blue-500",
    ACCUMULATING: "bg-yellow-500",
    DISPUTING: "bg-orange-500",
    SETTLING: "bg-green-500",
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6 mb-6">
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
          <div className="flex justify-between mb-2">
            <span className="text-slate-300 text-sm">Phase Progress</span>
            <span className="text-slate-300 text-sm">{Math.round((batchInfo.stateNum / 3) * 100)}%</span>
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
