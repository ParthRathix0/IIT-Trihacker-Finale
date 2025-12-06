"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import toast from "react-hot-toast";

const DepositForm = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [isLoading, setIsLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const handleDeposit = async () => {
    if (!amount || !isConnected) {
      toast.error("Please connect wallet and enter amount");
      return;
    }

    try {
      setIsLoading(true);
      const tx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "deposit",
        args: [parseEther(amount), side === "BUY" ? 0 : 1],
      });
      toast.success(`${side} order placed!`);
      setAmount("");
    } catch (error: any) {
      toast.error(error.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Place Order</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Side</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide("BUY")}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                side === "BUY"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                side === "SELL"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Amount (ETH)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-slate-500"
            step="0.01"
            min="0"
          />
        </div>

        <button
          onClick={handleDeposit}
          disabled={isLoading || !isConnected}
          className={`w-full py-3 px-4 rounded font-semibold transition ${
            isLoading || !isConnected
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : side === "BUY"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
          }`}
        >
          {isLoading ? "Processing..." : `Place ${side} Order`}
        </button>
      </div>
    </div>
  );
};

export default DepositForm;
