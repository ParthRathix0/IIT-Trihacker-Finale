import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployAegis: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = await hre.getChainId();

  console.log(`\n📦 Deploying Aegis Protocol to chain ${chainId}...`);

  let oracleAddress: string;
  let accumulationWindow: number;
  let disputeWindow: number;

  // --- CONFIGURATION ---
  if (chainId === "31337") {
    // Localhost
    console.log("   ➜ 🛠  Localhost detected. Deploying Mock Oracle...");

    // 1. Deploy Mock
    const mockDeployment = await deploy("AegisMockOracle", {
      from: deployer,
      args: [8, 200000000000], // 8 decimals, $2000 initial price
      log: true,
      autoMine: true,
    });

    oracleAddress = mockDeployment.address;
    accumulationWindow = 5; // Fast for demo
    disputeWindow = 5; // Fast for demo
    console.log(`   ➜ 🧪 Mock Oracle Deployed at: ${oracleAddress}`);
  } else {
    // Sepolia or others
    console.log("   ➜ 🌍 Testnet/Mainnet detected. Using Real Chainlink Oracle.");
    // Sepolia ETH/USD Aggregator
    oracleAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    accumulationWindow = 50; // Production Standard
    disputeWindow = 20;
  }

  // 2. Deploy Core Contract (with 3 arguments)
  await deploy("AegisSettlement", {
    from: deployer,
    args: [oracleAddress, accumulationWindow, disputeWindow], // FIXED: 3 Arguments
    log: true,
    autoMine: true,
  });

  const aegis = await hre.ethers.getContract("AegisSettlement", deployer);
  console.log(`\n✅ AegisSettlement deployed at: ${await aegis.getAddress()}`);
  console.log(`   - Oracle: ${oracleAddress}`);
  console.log(`   - Acc Window: ${accumulationWindow}`);
  console.log(`   - Dispute Window: ${disputeWindow}\n`);
};

export default deployAegis;
deployAegis.tags = ["AegisSettlement"];
