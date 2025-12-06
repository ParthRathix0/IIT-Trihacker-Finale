"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import toast from "react-hot-toast";

const DisputeWidget = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [userOrder, setUserOrder] = useState<any>(null);

  const { writeContractAsync } = useWriteContract();
  const { data: batchData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getCurrentBatchInfo",
  }) as { data: readonly unknown[] | undefined };

  const batchId = batchData && Array.isArray(batchData) ? batchData[0] : 0;

  const { data: orderData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "getUserOrder",
    args: [batchId as bigint, address as `0x${string}`],
    query: { enabled: !!address && !!batchData && batchId !== 0 },
  }) as { data: readonly unknown[] | undefined };

  const handleDispute = async () => {
    if (!isConnected) {
      toast.error("Please connect wallet");
      return;
    }

    try {
      setIsLoading(true);
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "dispute",
        args: [],
      });
      toast.success("Order disputed successfully!");
    } catch (error: any) {
      toast.error(error.message || "Dispute failed");
    } finally {
      setIsLoading(false);
    }
  };

  const canDispute = orderData && Array.isArray(orderData) && !orderData[2] && !orderData[3]; // not claimed, not disputed
  const batchState = batchData && Array.isArray(batchData) ? ["OPEN", "ACCUMULATING", "DISPUTING", "SETTLING"][Number(batchData[1])] : "";

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Dispute Order</h3>

      {!isConnected ? (
        <p className="text-slate-300 text-center py-4">Connect wallet to see your orders</p>
      ) : !orderData || !Array.isArray(orderData) || orderData[0] === 0n ? (
        <p className="text-slate-300 text-center py-4">No active order in current batch</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
            <p className="text-slate-300 text-sm mb-2">Order Details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-400">Amount:</p>
                <p className="text-white font-semibold">{(Number(orderData[0]) / 1e18).toFixed(4)} ETH</p>
              </div>
              <div>
                <p className="text-slate-400">Side:</p>
                <p className={`font-semibold ${orderData[1] === 0n ? "text-blue-400" : "text-orange-400"}`}>
                  {orderData[1] === 0n ? "BUY" : "SELL"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Status:</p>
                <p className="text-white font-semibold">{orderData[3] ? "Disputed" : "Active"}</p>
              </div>
              <div>
                <p className="text-slate-400">Batch Phase:</p>
                <p className="text-white font-semibold">{batchState}</p>
              </div>
            </div>
          </div>

          {batchState === "DISPUTING" && !orderData[3] && !orderData[2] ? (
            <button
              onClick={handleDispute}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded font-semibold bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-700 disabled:text-slate-400 transition"
            >
              {isLoading ? "Processing..." : "Dispute Order"}
            </button>
          ) : batchState !== "DISPUTING" ? (
            <p className="text-center text-slate-300 text-sm py-2">Disputes only available during DISPUTING phase</p>
          ) : (
            <p className="text-center text-slate-300 text-sm py-2">Order already disputed or claimed</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DisputeWidget;
