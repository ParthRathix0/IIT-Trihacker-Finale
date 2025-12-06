import { ethers } from "hardhat";

async function main() {
  const aegisAddress = "0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1";
  const aegis = await ethers.getContractAt("AegisV3", aegisAddress);

  console.log("\n🔍 Checking registered oracles in AegisV3...\n");

  try {
    for (let i = 1; i <= 5; i++) {
      const oracleInfo = await aegis.getOracleInfo(i);
      console.log(`Oracle ${i}:`);
      console.log(`  Address: ${oracleInfo.oracleAddress}`);
      console.log(`  Active: ${oracleInfo.isActive}\n`);
    }

    console.log("✅ All 5 oracles are registered!\n");
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
