"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { parseEther, formatEther } from "viem";
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

const DepositForm = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [isLoading, setIsLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Check Native ETH Balance
  const { data: ethBalance } = useBalance({ address });

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

  const parsedAmount = amount ? parseEther(amount) : 0n;
  const hasEnoughWETH = wethBalance ? wethBalance >= parsedAmount : false;
  const hasEnoughAllowance = allowance ? allowance >= parsedAmount : false;
  const hasEnoughETH = ethBalance ? ethBalance.value >= parsedAmount : false;

  const handleWrapETH = async () => {
    if (!amount) return;
    if (!hasEnoughETH) {
      toast.error("Insufficient ETH balance");
      return;
    }
    try {
      setIsLoading(true);
      await writeContractAsync({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: "deposit",
        value: parsedAmount,
      });
      toast.success("Wrapped ETH to WETH!");
      await refetchBalance();
    } catch (error: any) {
      toast.error(error.message || "Wrap failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!amount) return;
    try {
      setIsLoading(true);
      await writeContractAsync({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress as `0x${string}`, parsedAmount],
      });
      toast.success("Approved WETH!");
      await refetchAllowance();
    } catch (error: any) {
      toast.error(error.message || "Approval failed");
    } finally {
      setIsLoading(false);
    }
  };

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
        args: [parsedAmount, side === "BUY" ? 0n : 1n],
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

  const renderButton = () => {
    if (isLoading) {
      return (
        <button disabled className="w-full py-3 px-4 rounded font-semibold bg-slate-700 text-slate-400 cursor-not-allowed">
          Processing...
        </button>
      );
    }

    if (!isConnected) {
      return (
        <button disabled className="w-full py-3 px-4 rounded font-semibold bg-slate-700 text-slate-400 cursor-not-allowed">
          Connect Wallet
        </button>
      );
    }

    if (!amount || parseFloat(amount) === 0) {
      return (
        <button disabled className="w-full py-3 px-4 rounded font-semibold bg-slate-700 text-slate-400 cursor-not-allowed">
          Enter Amount
        </button>
      );
    }

    if (!hasEnoughWETH) {
      if (!hasEnoughETH) {
        return (
          <button disabled className="w-full py-3 px-4 rounded font-semibold bg-red-900/50 text-red-200 cursor-not-allowed border border-red-800">
            Insufficient ETH (Need {amount} ETH)
          </button>
        );
      }
      return (
        <button
          onClick={handleWrapETH}
          className="w-full py-3 px-4 rounded font-semibold bg-purple-600 hover:bg-purple-700 text-white transition"
        >
          1. Wrap ETH to WETH
        </button>
      );
    }

    if (!hasEnoughAllowance) {
      return (
        <button
          onClick={handleApprove}
          className="w-full py-3 px-4 rounded font-semibold bg-yellow-600 hover:bg-yellow-700 text-white transition"
        >
          2. Approve WETH
        </button>
      );
    }

    return (
      <button
        onClick={handleDeposit}
        className={`w-full py-3 px-4 rounded font-semibold transition ${
          side === "BUY"
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-orange-600 hover:bg-orange-700 text-white"
        }`}
      >
        3. Place {side} Order
      </button>
    );
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
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Amount (WETH) 
            <span className="text-xs text-slate-500 ml-2">
              (WETH: {wethBalance ? parseFloat(formatEther(wethBalance)).toFixed(4) : "0.0"} | ETH: {ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : "0.0"})
            </span>
          </label>
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

        {renderButton()}

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
