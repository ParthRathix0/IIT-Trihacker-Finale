import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployAegis: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const network = await hre.ethers.provider.getNetwork();

  console.log(`\n📦 Deploying to network: ${hre.network.name} (Chain ID: ${network.chainId})`);

  let oracleAddress: string;

  // --- CONFIGURATION ---
  const SEPOLIA_REAL_ORACLE = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // ETH/USD

  if (hre.network.name === "sepolia") {
    console.log("🔗 Linking to REAL Chainlink Sepolia Feed...");
    // We do NOT deploy a Mock. We use the official existing contract.
    oracleAddress = SEPOLIA_REAL_ORACLE;
  } else {
    // FALLBACK: Localhost needs a Mock because Chainlink doesn't exist on your laptop.
    console.log("⚠️ Localhost detected: Deploying MOCK Oracle...");
    const mockOracle = await deploy("AegisMockOracle", {
      from: deployer,
      args: [18, "2000000000000000000000"], // $2000
      log: true,
      autoMine: true,
    });
    oracleAddress = mockOracle.address;
  }

  // Deploy Core Protocol
  await deploy("AegisSettlement", {
    from: deployer,
    contract: "contracts/core/AegisSettlement.sol:AegisSettlement",
    args: [oracleAddress], // Inject the Real (or Mock) Address
    log: true,
    autoMine: true,
  });

  console.log(`\n🛡️ Aegis Protocol Deployed!`);
  console.log(`   Connected Oracle: ${oracleAddress}`);
};

export default deployAegis;
deployAegis.tags = ["AegisSettlement"];
