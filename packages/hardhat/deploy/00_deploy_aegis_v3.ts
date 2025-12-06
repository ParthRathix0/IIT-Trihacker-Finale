import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys Aegis V3.0 with 5 mock oracles for testing
 */
const deployAegisV3: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 Deploying Aegis V3.0 Multi-Oracle System...\n");

  // Deploy mock token for trading
  console.log("📦 Deploying Mock WETH token...");
  const mockWETH = await deploy("MockWETH", {
    contract: "contracts/mocks/MockWETH.sol:MockWETH",
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ MockWETH deployed at: ${mockWETH.address}\n`);

  // Deploy 5 mock oracles with different characteristics
  const oracleConfigs = [
    { name: "GoodOracle1", price: 200000000000, deviation: 0, volatile: false }, // $2000
    { name: "GoodOracle2", price: 200000000000, deviation: 0, volatile: false },
    { name: "GoodOracle3", price: 200000000000, deviation: 0, volatile: false },
    { name: "SlightlyOffOracle", price: 200000000000, deviation: 200, volatile: false }, // +2%
    { name: "VolatileOracle", price: 200000000000, deviation: 0, volatile: true },
  ];

  const deployedOracles = [];

  for (const config of oracleConfigs) {
    console.log(`📡 Deploying ${config.name}...`);
    const oracle = await deploy(config.name, {
      contract: "contracts/mocks/MockOracle.sol:MockOracle",
      from: deployer,
      args: [config.price],
      log: true,
      autoMine: true,
    });

    // Configure oracle
    const oracleContract = await hre.ethers.getContractAt("MockOracle", oracle.address);
    if (config.deviation !== 0) {
      await oracleContract.setDeviation(config.deviation);
      console.log(`   ⚙️  Set deviation: ${config.deviation / 100}%`);
    }
    if (config.volatile) {
      await oracleContract.setVolatile(true);
      console.log(`   ⚙️  Enabled volatility`);
    }

    deployedOracles.push(oracle.address);
    console.log(`✅ ${config.name} deployed at: ${oracle.address}\n`);
  }

  // Deploy main Aegis V3 contract
  console.log("🛡️  Deploying AegisV3 main contract...");
  const aegisV3 = await deploy("AegisV3", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ AegisV3 deployed at: ${aegisV3.address}\n`);

  // Setup: Register oracles and set asset
  console.log("⚙️  Setting up Aegis V3...\n");
  const aegisContract = await hre.ethers.getContractAt("AegisV3", aegisV3.address);

  console.log("📝 Registering oracles...");
  for (let i = 0; i < deployedOracles.length; i++) {
    const tx = await aegisContract.registerOracle(deployedOracles[i]);
    await tx.wait();
    console.log(`   ✓ Oracle ${i + 1} registered: ${deployedOracles[i]}`);
  }

  console.log("\n💰 Setting batch asset to MockWETH...");
  const setAssetTx = await aegisContract.setBatchAsset(mockWETH.address);
  await setAssetTx.wait();
  console.log(`   ✓ Asset set to: ${mockWETH.address}`);

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📊 Deployment Summary:");
  console.log(`   • AegisV3 Contract: ${aegisV3.address}`);
  console.log(`   • Trading Asset (WETH): ${mockWETH.address}`);
  console.log(`   • Oracles Registered: ${deployedOracles.length}`);
  console.log("\n🔍 Oracle Details:");
  deployedOracles.forEach((addr, i) => {
    console.log(`   ${i + 1}. ${oracleConfigs[i].name}: ${addr}`);
  });

  console.log("\n📝 Next Steps:");
  console.log("   1. Run keeper bot: yarn hardhat run scripts/keeper-bot.ts --network localhost");
  console.log("   2. Simulate users: yarn hardhat run scripts/simulate-users.ts --network localhost");
  console.log("   3. Monitor dashboard: yarn start\n");

  console.log("💡 Quick Test Commands:");
  console.log(`   const aegis = await ethers.getContractAt("AegisV3", "${aegisV3.address}");`);
  console.log(`   await aegis.getCurrentBatchInfo();`);
  console.log(`   await aegis.getOracleInfo(1);`);
  console.log("\n");
};

export default deployAegisV3;
deployAegisV3.tags = ["AegisV3", "MockOracles"];
