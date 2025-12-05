import { ethers } from "hardhat";

async function main() {
  // 1. ROBUST CONTRACT RETRIEVAL
  // Use ethers.getContract which works best with hardhat-deploy

  let aegis;
  try {
    aegis = await ethers.getContract("AegisSettlement");
    console.log(`✅ Found AegisSettlement at: ${await aegis.getAddress()}`);
  } catch (e) {
    // FIX 1: Log the error 'e' so it is "used"
    console.error("❌ Could not find AegisSettlement. Did you run 'yarn deploy'?", e);
    process.exit(1);
  }

  let mockOracle = null;
  try {
    // Try to get the Mock Oracle. If on Sepolia, this will fail (expected).
    mockOracle = await ethers.getContract("AegisMockOracle");
    console.log(`✅ Found AegisMockOracle at: ${await mockOracle.getAddress()}`);
  } catch (e) {
    // FIX 2: Log the error 'e' here too
    console.log("⚠️ No Mock Oracle found. Assuming Testnet/Production (Real Oracle). Debug:", e);
    console.log("   -> Market simulation (Flash Crash) will be DISABLED.");
  }

  console.log("🤖 KEEPER STARTED");

  while (true) {
    try {
      const currentBlock = await ethers.provider.getBlockNumber();
      const batchId = await aegis.currentBatchId();

      const batch = await aegis.batches(batchId);
      // SAFETY: Explicitly cast enum state.
      // Struct: { ..., BatchState state; } -> State is the LAST field.
      const state = Number(batch.state);
      const stateName = ["OPEN", "ACCUM", "DISPUTE", "SETTLED", "VOID"][state];

      console.log(`\n🧱 Block ${currentBlock} | Batch ${batchId} | State: ${stateName}`);

      // --- STATE 0: OPEN ---
      if (state === 0) {
        console.log("   > Closing batch to start Gauntlet...");
        const tx = await aegis.closeBatch();
        await tx.wait();
        console.log("   ✅ Batch Closed.");
      }

      // --- PIPELINE MANAGEMENT (Check Previous Batch) ---
      if (batchId > 1) {
        const prevBatchId = Number(batchId) - 1;
        const prevBatch = await aegis.batches(prevBatchId);
        const pbState = Number(prevBatch.state);

        if (pbState !== 3 && pbState !== 4) {
          // If not Settled/Void
          console.log(
            `   > Pipeline Batch ${prevBatchId} State: ${["OPEN", "ACCUM", "DISPUTE", "SETTLED", "VOID"][pbState]}`,
          );
        }

        if (pbState === 1) {
          // ACCUMULATING
          const endBlock = Number(prevBatch.endBlock);

          if (currentBlock <= endBlock) {
            // 1. Manipulate Price (If Mock exists)
            if (mockOracle) {
              let price = 2000;
              if (currentBlock % 10 === 0) {
                price = 200; // Flash crash
                console.log("   ⚠️ INJECTING FLASH CRASH ($200)");
              }
              // Chainlink uses 8 decimals
              await (await mockOracle.updateAnswer(ethers.parseUnits(price.toString(), 8))).wait();
            }

            // 2. Accumulate
            console.log("   > Calling updateAccumulator()...");
            // NO ARGUMENTS - Contract reads from Oracle
            await (await aegis.updateAccumulator()).wait();
          } else {
            console.log("   > Ending Accumulation...");
            await (await aegis.endAccumulation(prevBatchId)).wait();
          }
        } else if (pbState === 2) {
          // DISPUTING
          const disputeEnd = Number(prevBatch.disputeEndBlock);
          const safety = Number(await aegis.REORG_SAFETY());

          if (currentBlock > disputeEnd + safety) {
            console.log(`   > Settling Batch ${prevBatchId}...`);
            await (await aegis.settleBatch(prevBatchId)).wait();
            console.log("   🎉 BATCH SETTLED");
          } else {
            console.log(`   ⏳ Waiting for Dispute/Finality (Target: ${disputeEnd + safety})`);
          }
        }
      }

      await new Promise(r => setTimeout(r, 2000));
    } catch (e: any) {
      // Filter expected reverts to keep console clean
      if (!e.message.includes("Window closed") && !e.message.includes("Too early") && !e.message.includes("Not open")) {
        console.log("Loop Error:", e.message);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
