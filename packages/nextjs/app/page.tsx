"use client";

import type { NextPage } from "next";
import { AegisDashboard } from "~~/components/AegisDashboard";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-4xl">
          {/* Header Section */}
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">The Aegis Protocol</span>
            <span className="block text-xl mt-2 text-gray-500">Adversarial-Resilient Settlement Engine</span>
          </h1>

          {/* Your Custom Dashboard Component */}
          <div className="flex justify-center">
            <AegisDashboard />
          </div>

          {/* Footer / Hackathon Badge */}
          <div className="text-center mt-12 text-sm opacity-50">
            <div className="badge badge-outline p-4">Built for TriHacker Tournament • Running on Sepolia Testnet</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
