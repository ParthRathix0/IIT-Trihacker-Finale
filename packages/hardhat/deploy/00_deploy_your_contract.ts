import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys Aegis Protocol
 * 
 * - On localhost/hardhat network: Deploys a Mock Oracle first
 * - On Sepolia/Mainnet: Uses real Chainlink Oracle address
 */
const deployAegis: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("🚀 Deploying Aegis Protocol...");

  let oracleAddress: string;

  // 1. Determine Oracle Address
  if (network.name === "sepolia") {
    // Real Sepolia Chainlink Oracle (ETH/USD)
    oracleAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; 
    console.log("🔗 Using Sepolia Chainlink Oracle:", oracleAddress);
  } else {
    // Localhost/Hardhat: Deploy a Mock Oracle
    console.log("⚠️ Local network detected. Deploying MockOracle...");
    const mockOracle = await deploy("MockOracle", {
      from: deployer,
      args: [], // Constructor args for mock
      log: true,
      autoMine: true,
    });
    oracleAddress = mockOracle.address;
    console.log("✅ MockOracle deployed at:", oracleAddress);
  }

  // 2. Deploy Aegis
  // NOTE: Make sure your contract file name matches "Aegis" or "Aegis_Protocol"
  // If your file is Ageis_Protocol.sol, the contract name inside is likely "Aegis"
  const aegisDeployment = await deploy("Aegis", {
    from: deployer,
    // Contract constructor arguments
    args: [oracleAddress],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const aegis = await hre.ethers.getContract("Aegis", deployer);
  console.log("👋 Aegis deployed at:", await aegis.getAddress());
};

export default deployAegis;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Aegis
deployAegis.tags = ["Aegis"];
