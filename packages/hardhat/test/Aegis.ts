import { expect } from "chai";
import { ethers } from "hardhat";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

describe("AegisV3 Protocol", function () {
  it("Should deploy AegisV3 successfully", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy AegisV3 contract
    const AegisV3 = await ethers.getContractFactory("AegisV3");
    const aegis = await AegisV3.deploy();
    
    // Verify deployment
    expect(await aegis.getAddress()).to.be.properAddress;
    console.log("    ✓ AegisV3 deployed at:", await aegis.getAddress());
  });

  it("Should register and verify oracle", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Mock Oracle with initial price of $2000
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const oracle = await MockOracle.deploy(200000000000); // 8 decimals
    const oracleAddress = await oracle.getAddress();
    
    // Deploy AegisV3
    const AegisV3 = await ethers.getContractFactory("AegisV3");
    const aegis = await AegisV3.deploy();
    
    // Register oracle
    await aegis.registerOracle(oracleAddress);
    
    // Verify oracle registration
    const oracleInfo = await aegis.getOracleInfo(1);
    expect(oracleInfo.oracleAddress).to.equal(oracleAddress);
    expect(oracleInfo.isActive).to.be.true;
    expect(oracleInfo.weight).to.equal(100); // Default weight
    
    console.log("    ✓ Oracle registered with weight:", oracleInfo.weight.toString());
  });

  it("Should register multiple oracles", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy AegisV3
    const AegisV3 = await ethers.getContractFactory("AegisV3");
    const aegis = await AegisV3.deploy();
    
    // Deploy and register 3 oracles
    const MockOracle = await ethers.getContractFactory("MockOracle");
    
    for (let i = 1; i <= 3; i++) {
      const oracle = await MockOracle.deploy(200000000000);
      await aegis.registerOracle(await oracle.getAddress());
      
      const oracleInfo = await aegis.getOracleInfo(i);
      expect(oracleInfo.isActive).to.be.true;
    }
    
    console.log("    ✓ Successfully registered 3 oracles");
  });

  it("Should complete full batch cycle with weight updates and settlement", async function () {
    this.timeout(60000); // Increase timeout for this test
    
    const [owner, user1, user2] = await ethers.getSigners();
    
    console.log("\n    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("    🧪 FULL BATCH LIFECYCLE WITH WEIGHT UPDATES");
    console.log("    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("    📊 Market: ETH/USD (Users trade ETH at USD settlement price)");
    console.log("    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // 1. Deploy contracts
    console.log("    📦 Step 1: Deploying contracts...");
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const weth = await MockWETH.deploy();
    const wethAddress = await weth.getAddress();
    
    const AegisV3 = await ethers.getContractFactory("AegisV3");
    const aegis = await AegisV3.deploy();
    const aegisAddress = await aegis.getAddress();
    
    // 2. Deploy and register 5 oracles with different characteristics
    console.log("    📡 Step 2: Registering 5 oracles...");
    const MockOracle = await ethers.getContractFactory("MockOracle");
    const oracles = [];
    const oracleNames = ["Accurate", "VeryAccurate", "SlightlyOff", "ModeratelyOff", "Volatile"];
    
    for (let i = 0; i < 5; i++) {
      const oracle = await MockOracle.deploy(200000000000); // $2000
      oracles.push(oracle);
      await aegis.registerOracle(await oracle.getAddress());
      console.log(`       ✓ ${oracleNames[i]} oracle registered (ID: ${i + 1})`);
    }
    
    // Set batch asset
    await aegis.setBatchAsset(wethAddress);
    
    // 3. Display initial weights
    console.log("\n    ⚖️  Step 3: Initial Oracle Weights");
    for (let i = 1; i <= 5; i++) {
      const info = await aegis.getOracleInfo(i);
      console.log(`       Oracle ${i} (${oracleNames[i - 1]}): Weight = ${info.weight}`);
    }
    
    // 4. Mint WETH to users
    console.log("\n    💰 Step 4: Funding users with WETH...");
    await weth.mint(user1.address, ethers.parseEther("10"));
    await weth.mint(user2.address, ethers.parseEther("10"));
    console.log("       ✓ User1: 10 WETH");
    console.log("       ✓ User2: 10 WETH");
    
    // 5. Users approve and deposit
    console.log("\n    📥 Step 5: Users making deposits...");
    await weth.connect(user1).approve(aegisAddress, ethers.parseEther("1"));
    await aegis.connect(user1).deposit(ethers.parseEther("1"), 0); // BUY
    console.log("       ✓ User1 deposited 1 ETH (BUY at market price)");
    
    await weth.connect(user2).approve(aegisAddress, ethers.parseEther("1"));
    await aegis.connect(user2).deposit(ethers.parseEther("1"), 1); // SELL
    console.log("       ✓ User2 deposited 1 ETH (SELL at market price)");
    
    // 6. Move to ACCUMULATING phase and set oracle prices
    console.log("\n    ⏰ Step 6: Moving to ACCUMULATING phase...");
    await mine(51); // Skip OPEN phase (50 blocks + 1)
    await aegis.startAccumulation(); // Trigger phase transition
    console.log("       ✓ Entered ACCUMULATING phase");
    
    // Set different prices for each oracle to show variability
    const prices = [
      200000000000n, // $2000 - Accurate
      200000000000n, // $2000 - VeryAccurate
      204000000000n, // $2040 - SlightlyOff (+2%)
      210000000000n, // $2100 - ModeratelyOff (+5%)
      195000000000n, // $1950 - Volatile (-2.5%)
    ];
    
    console.log("       Setting ETH/USD oracle prices:");
    for (let i = 0; i < 5; i++) {
      await oracles[i].setPrice(prices[i]);
      const priceInDollars = Number(prices[i]) / 1e8;
      console.log(`       ✓ Oracle ${i + 1}: $${priceInDollars.toFixed(2)} per ETH`);
    }
    
    // 7. Collect oracle observations
    console.log("\n    📊 Step 7: Keeper collecting oracle observations...");
    await aegis.collectOraclePrices();
    console.log("       ✓ First observation collected");
    
    await mine(4);
    await aegis.collectOraclePrices();
    console.log("       ✓ Second observation collected");
    
    await mine(4);
    await aegis.collectOraclePrices();
    console.log("       ✓ Third observation collected");
    
    // 8. Move to DISPUTING phase
    console.log("\n    ⚖️  Step 8: Moving to DISPUTING phase...");
    await mine(40); // Complete ACCUMULATING phase (48 blocks total collected 3 times)
    await aegis.startDispute();
    console.log("       ✓ Entered DISPUTING phase");
    
    // 9. Move to SETTLING phase
    console.log("\n    🔄 Step 9: Moving to SETTLING phase...");
    await mine(16); // Skip DISPUTING phase (15 blocks + 1)
    await aegis.startSettling();
    console.log("       ✓ Entered SETTLING phase");
    
    // 10. Execute settlement
    console.log("\n    ⚡ Step 10: Executing settlement...");
    await mine(11); // Complete SETTLING phase (10 blocks + 1)
    const batchId = await aegis.currentBatchId();
    
    // Get batch info BEFORE executing settlement
    const batchInfoBefore = await aegis.getCurrentBatchInfo();
    const settlementPrice = batchInfoBefore.settlementPrice;
    const priceInDollars = Number(settlementPrice) / 1e8;
    
    await aegis.executeSettlement();
    console.log("       ✓ Batch settled!");
    
    // 11. Show settlement price calculation
    console.log("\n    💎 Settlement Price Calculation:");
    console.log("       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`       Final ETH/USD Settlement Price: $${priceInDollars.toFixed(2)} per ETH`);
    console.log("       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("       How it's calculated:");
    console.log("       1. Collect ETH price observations from all oracles");
    console.log("       2. Remove outliers (>10% deviation from neighbors)");
    console.log("       3. Calculate weighted average using oracle weights");
    console.log("       4. Trim top/bottom 10% of remaining observations");
    console.log("       5. Final price is weighted median of trimmed data");
    console.log("");
    console.log("       Result: Users trading ETH are settled at $" + priceInDollars.toFixed(2));
    
    // 12. Check weight updates
    console.log("\n    📈 Step 11: Oracle Weight Updates");
    console.log("       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (let i = 1; i <= 5; i++) {
      const info = await aegis.getOracleInfo(i);
      const weightChange = Number(info.weight) - 100;
      const changeSymbol = weightChange > 0 ? "↑" : weightChange < 0 ? "↓" : "→";
      const changeColor = weightChange > 0 ? "+" : "";
      
      console.log(`       Oracle ${i} (${oracleNames[i - 1]}):`);
      console.log(`         Weight: ${info.weight} (${changeSymbol} ${changeColor}${weightChange})`);
      
      if (weightChange > 0) {
        console.log(`         Status: ✅ REWARDED (accurate & precise)`);
      } else if (weightChange < 0) {
        console.log(`         Status: ⚠️  PENALIZED (less accurate)`);
      } else {
        console.log(`         Status: → NEUTRAL`);
      }
    }
    
    console.log("\n    📊 Weight Update Formula:");
    console.log("       Delta_1 = -2x² (accuracy) - 3y² (precision) + 10 (bonus)");
    console.log("       Delta_2 = Dispute-based correction (if any)");
    console.log("       New Weight = Old Weight + (Delta_1 + Delta_2) / 100");
    console.log("       Range: [1, 1000]");
    
    // 13. Users claim their filled orders
    console.log("\n    💵 Step 12: Users claiming filled orders...");
    await aegis.connect(user1).claim(batchId);
    console.log("       ✓ User1 claimed their order");
    
    await aegis.connect(user2).claim(batchId);
    console.log("       ✓ User2 claimed their order");
    
    console.log("\n    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("    ✅ FULL BATCH CYCLE COMPLETED SUCCESSFULLY!");
    console.log("    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Assertions
    expect(settlementPrice).to.be.gt(0);
    expect(batchInfoBefore.state).to.equal(3); // SETTLING state
  });
});

