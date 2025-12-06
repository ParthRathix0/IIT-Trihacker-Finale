"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { formatEther } from "viem";
import toast from "react-hot-toast";

const ClaimRewards = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const { address, isConnected } = useAccount();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const { data: currentBatchData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getCurrentBatchInfo",
  }) as { data: readonly unknown[] | undefined };

  const currentBatchId = currentBatchData && Array.isArray(currentBatchData) ? Number(currentBatchData[0]) : 0;

  const handleClaim = async (batchId: number) => {
    if (!isConnected) {
      toast.error("Please connect wallet");
      return;
    }

    try {
      setIsLoading(true);
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "claim",
        args: [batchId],
      });
      toast.success(`Claimed rewards from batch #${batchId}!`);
      setSelectedBatchId(null);
    } catch (error: any) {
      toast.error(error.message || "Claim failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Claim Rewards</h3>

      {!isConnected ? (
        <p className="text-slate-300 text-center py-4">Connect wallet to claim rewards</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
            <p className="text-slate-300 text-sm mb-3">Recent Batches</p>
            <div className="space-y-2">
              {Array.from({ length: Math.max(0, currentBatchId - 5) }).map((_, i) => {
                const batchId = currentBatchId - i - 1;
                return (
                  <div key={batchId} className="flex items-center justify-between p-3 bg-slate-600 bg-opacity-50 rounded">
                    <div>
                      <p className="text-white font-semibold">Batch #{batchId}</p>
                      <p className="text-slate-400 text-sm">Available for claiming</p>
                    </div>
                    <button
                      onClick={() => handleClaim(batchId)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:bg-slate-700 disabled:text-slate-400 transition"
                    >
                      {isLoading ? "..." : "Claim"}
                    </button>
                  </div>
                );
              })}
              {currentBatchId <= 5 && (
                <p className="text-slate-400 text-sm text-center py-2">No finished batches available</p>
              )}
            </div>
          </div>

          <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
            <p className="text-slate-300 text-sm mb-2">How it works:</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>✓ Place a BUY or SELL order in OPEN phase</li>
              <li>✓ During SETTLING, your order is matched at settlement price</li>
              <li>✓ Claim your filled + refunded amounts here</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimRewards;
