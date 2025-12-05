import { ethers } from "hardhat";

async function main() {
  const aegisContract = await ethers.getContract("AegisSettlement");
  const aegisAddress = await aegisContract.getAddress();
  const aegis = await ethers.getContractAt("AegisSettlement", aegisAddress);
  console.log("🤖 TURBO KEEPER STARTED");
  console.log("⚡ Block Time: ~50ms");

  let currentPrice = 2500;

  while (true) {
    try {
      const currentBlock = await ethers.provider.getBlockNumber();
      const currentBatchId = await aegis.currentBatchId();

      // 1. SIMULATE MARKET
      // Normal: +/- $5
      // Flash Crash (Every 20th block): Drop to $100
      const isAttackBlock = currentBlock % 20 === 0;

      if (isAttackBlock) {
        console.log(`⚠️ FLASH CRASH AT BLOCK ${currentBlock}! Price: $100`);
        currentPrice = 100;
      } else {
        const fluctuation = Math.floor(Math.random() * 10) - 5;
        currentPrice += fluctuation;
      }

      // 2. CHECK BATCH STATUS
      const batch = await aegis.batches(currentBatchId);
      const endBlock = Number(batch[2]);
      const state = Number(batch[13]); // BatchState enum

      const DISPUTE = 25;
      const SAFETY = 64;
      const SETTLEMENT_TARGET = endBlock + DISPUTE + SAFETY;

      // 3. EXECUTE
      if (state === 0 || state === 1) {
        // OPEN or ACCUMULATING
        console.log(`🧱 Block ${currentBlock}: Pushing $${currentPrice}...`);

        const tx = await aegis.updateAccumulator(ethers.parseUnits(currentPrice.toString(), 18));
        await tx.wait(); // Waits ~50ms
      } else if (currentBlock > SETTLEMENT_TARGET && state !== 3 && state !== 4) {
        // READY TO SETTLE
        console.log("⚖️ Finality Reached. Settling...");
        const tx = await aegis.settleBatch(currentBatchId);
        await tx.wait();
        console.log("🎉 BATCH SETTLED!");
      } else {
        console.log(`⏳ Block ${currentBlock}: Waiting for Finality...`);
        // We don't need a sleep here because blocks move fast,
        // but we add a tiny delay to stop CPU spinning
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e: any) {
      // Filter out noisy errors typical in fast loops
      if (!e.message.includes("Already updated")) {
        console.log(`Processing...`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
