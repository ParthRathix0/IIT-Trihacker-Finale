import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys Aegis V3.0 with 5 mock oracles for testing
 * Updated to be robust and idempotent
 */
const deployAegisV3: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const ethers = hre.ethers; 

  console.log("\n🚀 Deploying Aegis V3.0 Multi-Oracle System...\n");

  // Deploy mock token
  console.log("📦 Deploying Mock WETH token...");
  const mockWETH = await deploy("MockWETH", {
    contract: "contracts/mocks/MockWETH.sol:MockWETH",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ MockWETH deployed at: ${mockWETH.address}\n`);

  // Deploy Oracles
  const oracleConfigs = [
    { name: "GoodOracle1",       price: 200000000000, deviation: 0,   volatile: false, stackId: 1 }, 
    { name: "GoodOracle2",       price: 200000000000, deviation: 0,   volatile: false, stackId: 1 },
    { name: "GoodOracle3",       price: 200000000000, deviation: 0,   volatile: false, stackId: 2 },
    { name: "SlightlyOffOracle", price: 200000000000, deviation: 200, volatile: false, stackId: 2 },
    { name: "VolatileOracle",    price: 200000000000, deviation: 0,   volatile: true,  stackId: 3 },
  ];

  const deployedOracles: string[] = [];

  for (const config of oracleConfigs) {
    console.log(`📡 Deploying ${config.name} (Stack: ${config.stackId})...`);
    const oracle = await deploy(config.name, {
      contract: "contracts/mocks/MockOracle.sol:MockOracle",
      from: deployer,
      args: [config.price],
      log: true,
      autoMine: true,
    });

    const oracleContract = await ethers.getContractAt("MockOracle", oracle.address);
    if (config.deviation !== 0) await oracleContract.setDeviation(config.deviation);
    if (config.volatile) await oracleContract.setVolatile(true);

    deployedOracles.push(oracle.address);
    console.log(`✅ ${config.name} deployed at: ${oracle.address}\n`);
  }

  // Deploy Main Contract
  console.log("🛡️  Deploying AegisV3 main contract...");
  const aegisV3 = await deploy("AegisV3", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ AegisV3 deployed at: ${aegisV3.address}\n`);

  // Setup
  console.log("⚙️  Setting up Aegis V3...\n");
  const aegisContract = await ethers.getContractAt("AegisV3", aegisV3.address);

  console.log("📝 Registering oracles with Hydra IDs...");
  for (let i = 0; i < deployedOracles.length; i++) {
    const oracleAddr = deployedOracles[i];
    const stackId = oracleConfigs[i].stackId;

    try {
        const existingId = await aegisContract.oracleAddressToId(oracleAddr);
        if (existingId == 0n) {
            const tx = await aegisContract.registerOracle(oracleAddr, stackId);
            await tx.wait();
            console.log(`   ✓ Oracle ${i + 1} registered: ${oracleAddr} (Stack ${stackId})`);
        } else {
            console.log(`   ⚠️ Oracle ${i + 1} already registered. Skipping.`);
        }
    } catch (e: any) {
        console.log(`   ⚠️ Error registering oracle ${i + 1}: ${e.message}`);
    }
  }

  // FIX: Just try to set the asset directly. 
  // If it's already set or batch is not OPEN, it will revert, and we catch it.
  console.log("\n💰 Setting batch asset to MockWETH...");
  try {
      // Check via public getter if available, else try/catch
      let currentAsset = ethers.ZeroAddress;
      try {
          currentAsset = await aegisContract.batchAsset();
      } catch (e) { /* ignore if getter fails */ }

      if (currentAsset.toLowerCase() !== mockWETH.address.toLowerCase()) {
          const setAssetTx = await aegisContract.setBatchAsset(mockWETH.address);
          await setAssetTx.wait();
          console.log(`   ✓ Asset set to: ${mockWETH.address}`);
      } else {
          console.log(`   ✓ Asset already set correctly.`);
      }
  } catch (e: any) {
      console.log(`   ⚠️ Skipped setting asset (Likely already set or batch active): ${e.message}`);
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log(`   • AegisV3 Contract: ${aegisV3.address}`);
};

export default deployAegisV3;
deployAegisV3.tags = ["AegisV3", "MockOracles"];