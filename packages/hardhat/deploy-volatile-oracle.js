const hre = require("hardhat");
const { decrypt } = require("./scripts/utils/encryption");
const readline = require("readline");

async function getDeployer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("✔ Enter password to decrypt private key: ", async (password) => {
      rl.close();
      const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
      const privateKey = decrypt(encryptedKey, password);
      const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
      resolve(wallet);
    });
  });
}

async function main() {
  console.log("🚀 Deploying VolatileOracle manually...");
  
  const deployer = await getDeployer();
  console.log("Deploying with account:", deployer.address);
  
  // Deploy VolatileOracle
  const MockOracle = await hre.ethers.getContractFactory("MockOracle", deployer);
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
  const aegis = await hre.ethers.getContractAt("AegisV3", aegisAddress, deployer);
  
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
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
