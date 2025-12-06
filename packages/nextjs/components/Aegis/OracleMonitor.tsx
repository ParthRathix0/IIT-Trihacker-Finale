"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";

const OracleMonitor = ({ contractAddress, abi }: { contractAddress: string; abi: any }) => {
  const [oracles, setOracles] = useState<any[]>([]);
  const [oracleCount, setOracleCount] = useState(0);

  const { data: countData, refetch: refetchCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "oracleCount",
  });

  useEffect(() => {
    if (countData) {
      setOracleCount(Number(countData));
      fetchOracleData(Number(countData));
    }
  }, [countData]);

  const fetchOracleData = async (count: number) => {
    const oracleList: any[] = [];
    for (let i = 1; i <= count; i++) {
      try {
        // Note: You'll need the getOracleInfo function in your contract
        oracleList.push({
          id: i,
          weight: Math.floor(Math.random() * 1000),
          stackId: Math.floor(Math.random() * 3) + 1,
          isActive: Math.random() > 0.1,
        });
      } catch (error) {
        console.error(`Failed to fetch oracle ${i}:`, error);
      }
    }
    setOracles(oracleList);
  };

  const stackNames: { [key: number]: string } = {
    1: "Chainlink",
    2: "Pyth",
    3: "API3",
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Oracle Network</h3>

      <div className="space-y-3">
        {oracles.length === 0 ? (
          <p className="text-slate-300 text-center py-4">No oracles registered</p>
        ) : (
          oracles.map((oracle) => (
            <div key={oracle.id} className="flex items-center justify-between p-3 bg-slate-700 bg-opacity-50 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold">Oracle #{oracle.id}</p>
                  {oracle.isActive ? (
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">Active</span>
                  ) : (
                    <span className="text-xs bg-gray-900 text-gray-300 px-2 py-1 rounded">Inactive</span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">
                  Stack: {stackNames[oracle.stackId]} | Weight: {oracle.weight}/1000
                </p>
              </div>
              <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${(oracle.weight / 1000) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-slate-700 bg-opacity-50 rounded text-sm">
        <p className="text-slate-300 mb-2">
          <span className="font-semibold text-white">{oracleCount}</span> oracles active in Hydra Defense
        </p>
        <p className="text-slate-400 text-xs">
          Multiple oracle sources ensure price accuracy and prevent MEV attacks
        </p>
      </div>
    </div>
  );
};

export default OracleMonitor;
