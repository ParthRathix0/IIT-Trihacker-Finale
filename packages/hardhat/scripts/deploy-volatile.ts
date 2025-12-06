import { ethers } from "hardhat";
import { password } from "@inquirer/prompts";
import { Wallet } from "ethers";

async function main() {
  console.log("🚀 Deploying VolatileOracle manually...");

  // Get deployer wallet
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("No encrypted key found in .env file");
  }

  const pass = await password({ message: "Enter password to decrypt private key:" });
  let wallet: Wallet;
  try {
    wallet = (await Wallet.fromEncryptedJson(encryptedKey, pass)) as Wallet;
  } catch (error) {
    console.log("❌ Failed to decrypt private key. Wrong password?");
    throw error;
  }

  const deployer = wallet.connect(ethers.provider);
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Deploy VolatileOracle
  const MockOracle = await ethers.getContractFactory("MockOracle", deployer);
  console.log("📡 Deploying VolatileOracle...");
  const volatileOracle = await MockOracle.deploy(200000000000); // $2000

  await volatileOracle.waitForDeployment();
  const address = await volatileOracle.getAddress();

  console.log("✅ VolatileOracle deployed at:", address);

  // Set it to volatile
  console.log("⚙️  Setting volatility...");
  const tx = await volatileOracle.setVolatile(true);
  await tx.wait();
  console.log("✅ Volatility enabled");

  // Register in AegisV3
  const aegisAddress = "0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1";
  const aegis = await ethers.getContractAt("AegisV3", aegisAddress, deployer);

  console.log("📝 Registering oracle in AegisV3...");
  const registerTx = await aegis.registerOracle(address);
  await registerTx.wait();
  console.log("✅ Oracle registered!");

  console.log("\n================================================================================");
  console.log("🎉 VolatileOracle successfully deployed and registered!");
  console.log("================================================================================");
  console.log("Address:", address);
  console.log("Registered in AegisV3:", aegisAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
