import { ethers } from "hardhat";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/cR4WnXePioePZ5fFrnSiR");
  
  // Address from .env (encrypted key)
  const encryptedAddress = "0x0ed0ac62e23fa5a90786694d43134f4e256a5729";
  
  // Address from hardhat.config.ts (default key)
  const defaultAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // Contract address from frontend config
  const contractAddress = "0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1";

  console.log("🔍 Diagnostics for Sepolia Network:");
  console.log("----------------------------------------");

  // Check Encrypted Account
  const balance1 = await provider.getBalance(encryptedAddress);
  console.log(`\n1. Encrypted Account (from .env): ${encryptedAddress}`);
  console.log(`   Balance: ${ethers.formatEther(balance1)} ETH`);
  if (balance1 === 0n) console.log("   ❌ INSUFFICIENT FUNDS");

  // Check Default Account
  const balance2 = await provider.getBalance(defaultAddress);
  console.log(`\n2. Default Hardhat Account: ${defaultAddress}`);
  console.log(`   Balance: ${ethers.formatEther(balance2)} ETH`);

  // Check Contract
  const code = await provider.getCode(contractAddress);
  console.log(`\n3. Target Contract: ${contractAddress}`);
  if (code === "0x") {
    console.log("   ❌ NO CONTRACT DEPLOYED (Code is empty)");
  } else {
    console.log("   ✅ Contract exists");
  }
  
  console.log("\n----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
