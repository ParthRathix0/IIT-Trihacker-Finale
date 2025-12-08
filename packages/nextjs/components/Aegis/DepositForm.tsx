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
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "deposit",
        args: [parseEther(amount), side === "BUY" ? 0n : 1n],
      });
      toast.success(`${side} order placed successfully!`);
      setAmount("");
      
      // Scroll to BatchStatus at top
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

        <div className="bg-slate-700 bg-opacity-50 rounded p-3 text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-white mb-2">📋 After Deposit:</div>
          <div>1️⃣ <strong>OPEN (12 blocks)</strong> - Orders accumulate</div>
          <div>2️⃣ <strong>ACCUMULATING (48 blocks)</strong> - Oracle prices collected every 4 blocks</div>
          <div>3️⃣ <strong>DISPUTING (15 blocks)</strong> - Challenge settlement if needed</div>
          <div>4️⃣ <strong>SETTLING (10 blocks)</strong> - Execute fills &amp; claim rewards</div>
          <div className="text-slate-400 mt-2">
            Total cycle: ~85 blocks ({" "}
            {typeof window !== "undefined" && window.location.hostname.includes("localhost") ? "~2 min on local" : "~17 min on Sepolia"})
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositForm;
