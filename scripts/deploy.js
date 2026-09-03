const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("==================================================");
  console.log("   BASTION: Attestcoin City-Builder Deployment    ");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CTC/ETH");

  const network = await ethers.provider.getNetwork();
  console.log(`Target Network: ${network.name} (Chain ID: ${network.chainId})`);

  let verifierAddress;

  // On Creditcoin CC3 Testnet (Chain ID 102031) or Mainnet, use native precompile 0x0FD2
  if (network.chainId === 102031n) {
    verifierAddress = "0x0000000000000000000000000000000000000FD2";
    console.log(`\n[Creditcoin Testnet] Using Native Block Prover Precompile: ${verifierAddress}`);
  } else {
    // Local / Hardhat test node: deploy MockNativeQueryVerifier
    console.log("\n[Development Environment] Deploying MockNativeQueryVerifier...");
    const MockVerifierFactory = await ethers.getContractFactory("MockNativeQueryVerifier");
    const mockVerifier = await MockVerifierFactory.deploy();
    await mockVerifier.waitForDeployment();
    verifierAddress = await mockVerifier.getAddress();
    console.log("MockNativeQueryVerifier deployed at:", verifierAddress);
  }

  // 1. Deploy BastionIncursionEngine (Phase 1 ASC)
  console.log("\n[Phase 1] Deploying BastionIncursionEngine...");
  const EngineFactory = await ethers.getContractFactory("BastionIncursionEngine");
  const engine = await EngineFactory.deploy(verifierAddress);
  await engine.waitForDeployment();
  const engineAddress = await engine.getAddress();
  console.log("BastionIncursionEngine deployed at:", engineAddress);

  // 2. Deploy BastionEconomy (Phase 2)
  console.log("\n[Phase 2] Deploying BastionEconomy...");
  const EconomyFactory = await ethers.getContractFactory("BastionEconomy");
  const economy = await EconomyFactory.deploy(verifierAddress);
  await economy.waitForDeployment();
  const economyAddress = await economy.getAddress();
  console.log("BastionEconomy deployed at:", economyAddress);

  // 3. Deploy BastionStructures (Phase 3)
  console.log("\n[Phase 3] Deploying BastionStructures (ERC-721)...");
  const StructuresFactory = await ethers.getContractFactory("BastionStructures");
  const structures = await StructuresFactory.deploy();
  await structures.waitForDeployment();
  const structuresAddress = await structures.getAddress();
  console.log("BastionStructures deployed at:", structuresAddress);

  // Authorize incursion engine to damage structures during battles
  await structures.setAuthorizedCaller(engineAddress, true);
  console.log("Authorized IncursionEngine on BastionStructures.");

  // 4. Deploy SeismicBeacon (Source chain contract for Sepolia)
  console.log("\nDeploying SeismicBeacon (Source Chain Emitter)...");
  const BeaconFactory = await ethers.getContractFactory("SeismicBeacon");
  const beacon = await BeaconFactory.deploy();
  await beacon.waitForDeployment();
  const beaconAddress = await beacon.getAddress();
  console.log("SeismicBeacon deployed at:", beaconAddress);

  console.log("\n==================================================");
  console.log("Deployment Summary:");
  console.log(`- Attestcoin Verifier:   ${verifierAddress}`);
  console.log(`- Incursion Engine:      ${engineAddress}`);
  console.log(`- Economy Engine:        ${economyAddress}`);
  console.log(`- Structures NFT:        ${structuresAddress}`);
  console.log(`- Seismic Beacon:        ${beaconAddress}`);
  console.log("==================================================");

  return {
    verifierAddress,
    engineAddress,
    economyAddress,
    structuresAddress,
    beaconAddress,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
