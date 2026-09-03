const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 2: BastionEconomy (Attested Resource Economy)", function () {
  let economy, mockVerifier, owner, commander;
  const SEPOLIA_CHAIN_KEY = 1;
  const SAMPLE_HEIGHT = 5432200;

  beforeEach(async function () {
    [owner, commander] = await ethers.getSigners();

    const MockVerifierFactory = await ethers.getContractFactory("MockNativeQueryVerifier");
    mockVerifier = await MockVerifierFactory.deploy();
    await mockVerifier.waitForDeployment();

    const EconomyFactory = await ethers.getContractFactory("BastionEconomy");
    economy = await EconomyFactory.deploy(await mockVerifier.getAddress());
    await economy.waitForDeployment();
  });

  function createSampleMarketProof(rootHex = ethers.keccak256(ethers.toUtf8Bytes("market-block-sample-1"))) {
    return {
      merkleProof: {
        root: rootHex,
        siblings: [
          { hash: ethers.keccak256(ethers.toUtf8Bytes("market-sibling-0")), isLeft: false },
          { hash: ethers.keccak256(ethers.toUtf8Bytes("market-sibling-1")), isLeft: true },
        ],
      },
      continuityProof: {
        lowerEndpointDigest: ethers.keccak256(ethers.toUtf8Bytes("market-continuity-digest")),
        roots: [
          ethers.keccak256(ethers.toUtf8Bytes("market-continuity-epoch-1")),
        ],
      },
      encodedTransaction: ethers.toUtf8Bytes("mock-market-tx-receipt-payload"),
    };
  }

  it("should initialize with baseline temperate market conditions", async function () {
    const market = await economy.currentMarket();
    expect(market.stonePriceMultiplier).to.equal(10000);
    expect(market.energyYieldMultiplier).to.equal(10000);
    expect(market.foodScarcityIndex).to.equal(10000);
    expect(market.conditionDescription).to.equal("Temperate Equilibrium");
  });

  it("should allow a commander to harvest baseline settlement resources", async function () {
    await economy.connect(commander).harvestResources();
    const vault = await economy.getVault(commander.address);

    expect(vault.stone).to.be.gt(0);
    expect(vault.energy).to.be.gt(0);
    expect(vault.food).to.be.gt(0);
  });

  it("should shift market conditions upon verifying attested cross-chain data", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleMarketProof();

    const tx = await economy.updateAttestedMarket(
      SEPOLIA_CHAIN_KEY,
      SAMPLE_HEIGHT,
      encodedTransaction,
      merkleProof,
      continuityProof
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);

    const market = await economy.currentMarket();
    expect(market.sourceChain).to.equal(SEPOLIA_CHAIN_KEY);
    expect(market.sourceBlockHeight).to.equal(SAMPLE_HEIGHT);
    expect(market.stonePriceMultiplier).to.be.gt(0);
    expect(market.energyYieldMultiplier).to.be.gt(0);
    expect(market.foodScarcityIndex).to.be.gt(0);
    expect(market.conditionDescription.length).to.be.gt(0);
  });

  it("should enforce replay protection on market queries", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleMarketProof();

    await economy.updateAttestedMarket(
      SEPOLIA_CHAIN_KEY,
      SAMPLE_HEIGHT,
      encodedTransaction,
      merkleProof,
      continuityProof
    );

    await expect(
      economy.updateAttestedMarket(
        SEPOLIA_CHAIN_KEY,
        SAMPLE_HEIGHT,
        encodedTransaction,
        merkleProof,
        continuityProof
      )
    ).to.be.revertedWith("BastionEconomy: market query already processed");
  });

  it("should allow spending resources for defense construction and validate balance", async function () {
    await economy.connect(commander).harvestResources();
    const vaultBefore = await economy.getVault(commander.address);

    // Spend stone and energy to fortify wall
    const spendStone = 50n;
    const spendEnergy = 30n;
    await economy.connect(commander).spendResources(spendStone, spendEnergy, 0, 0, "Reinforce Ramparts");

    const vaultAfter = await economy.getVault(commander.address);
    expect(vaultAfter.stone).to.equal(vaultBefore.stone - spendStone);
    expect(vaultAfter.energy).to.equal(vaultBefore.energy - spendEnergy);

    // Insufficient balance reverts
    await expect(
      economy.connect(commander).spendResources(1000000n, 0, 0, 0, "Impossible Fortress")
    ).to.be.revertedWith("BastionEconomy: insufficient Stone");
  });

  it("should allow trading between resources with market fees", async function () {
    await economy.connect(commander).harvestResources();
    const vaultBefore = await economy.getVault(commander.address);
    const tradeAmount = 50n;

    // Trade 50 Stone for Energy (0 = Stone, 1 = Energy)
    await economy.connect(commander).trade(0, 1, tradeAmount);

    const vaultAfter = await economy.getVault(commander.address);
    expect(vaultAfter.stone).to.equal(vaultBefore.stone - tradeAmount);
    expect(vaultAfter.energy).to.be.gt(vaultBefore.energy);
  });
});
