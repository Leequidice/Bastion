const hre = require("hardhat");
const { ethers } = hre;

const ARCHETYPE_NAMES = [
  "Mountainbreaker (Heavy Siege)",
  "Dread Strider (Tower Piercer)",
  "Ironclad Gorger (Resource Ravager)",
  "Tempest Goliath (Grid Disruptor)",
];

const STATUS_NAMES = ["Approaching", "Engaged", "Repelled", "Breached"];

async function main() {
  console.log("===============================================================");
  console.log("   BASTION — Phase 1: Attested Colossus Incursion Demo         ");
  console.log("===============================================================");

  const [commander] = await ethers.getSigners();
  console.log(`Settlement Commander: ${commander.address}`);

  // 1. Deploy contracts in test/demo mode
  const MockVerifierFactory = await ethers.getContractFactory("MockNativeQueryVerifier");
  const mockVerifier = await MockVerifierFactory.deploy();
  await mockVerifier.waitForDeployment();
  const verifierAddr = await mockVerifier.getAddress();

  const EngineFactory = await ethers.getContractFactory("BastionIncursionEngine");
  const engine = await EngineFactory.deploy(verifierAddr);
  await engine.waitForDeployment();
  const engineAddr = await engine.getAddress();

  const BeaconFactory = await ethers.getContractFactory("SeismicBeacon");
  const beacon = await BeaconFactory.deploy();
  await beacon.waitForDeployment();
  const beaconAddr = await beacon.getAddress();

  console.log(`[Setup] Mock Attestcoin Verifier (0x0FD2 emulator): ${verifierAddr}`);
  console.log(`[Setup] Bastion Incursion Engine (ASC):             ${engineAddr}`);
  console.log(`[Setup] Source Chain Seismic Beacon (Sepolia):      ${beaconAddr}\n`);

  // 2. Simulate source-chain event on Ethereum Sepolia (chainKey = 1)
  console.log("--- Step 1: Frontier Tremor Detected on Ethereum Sepolia ---");
  const epicenterId = ethers.keccak256(ethers.toUtf8Bytes(`tremor-zone-alpha-${Date.now()}`));
  const magnitude = 85;
  const zoneName = "Desolation of Cinders";

  const beaconTx = await beacon.recordSeismicActivity(epicenterId, magnitude, zoneName);
  const beaconReceipt = await beaconTx.wait();
  console.log(`  Source Chain:       Ethereum Sepolia (chainKey: 1)`);
  console.log(`  Source Tx Hash:     ${beaconReceipt.hash}`);
  console.log(`  Block Height:       ${beaconReceipt.blockNumber}`);
  console.log(`  Epicenter:          ${epicenterId}`);
  console.log(`  Geological Zone:    ${zoneName}`);
  console.log(`  Recorded Magnitude: ${magnitude} Richter`);

  // 3. Construct cryptographic proofs (Merkle inclusion + Continuity anchor)
  console.log("\n--- Step 2: Attestcoin Protocol Proof Construction ---");
  const merkleProof = {
    root: ethers.keccak256(ethers.toUtf8Bytes(`block-header-${beaconReceipt.blockNumber}`)),
    siblings: [
      { hash: ethers.keccak256(ethers.toUtf8Bytes("merkle-branch-alpha")), isLeft: false },
      { hash: ethers.keccak256(ethers.toUtf8Bytes("merkle-branch-beta")), isLeft: true },
      { hash: ethers.keccak256(ethers.toUtf8Bytes("merkle-branch-gamma")), isLeft: false },
    ],
  };

  const continuityProof = {
    lowerEndpointDigest: ethers.keccak256(ethers.toUtf8Bytes(`creditcoin-attestation-${beaconReceipt.blockNumber}`)),
    roots: [
      ethers.keccak256(ethers.toUtf8Bytes("continuity-epoch-1")),
      ethers.keccak256(ethers.toUtf8Bytes("continuity-epoch-2")),
    ],
  };
  const encodedTx = ethers.toUtf8Bytes(beaconReceipt.hash);

  console.log(`  Merkle Tree Root:   ${merkleProof.root}`);
  console.log(`  Proof Siblings:     ${merkleProof.siblings.length} branches`);
  console.log(`  Continuity Digest:  ${continuityProof.lowerEndpointDigest}`);
  console.log(`  Attestation Epochs: ${continuityProof.roots.length} root checkpoints`);

  // 4. Submit to BastionIncursionEngine via Attestcoin verification
  console.log("\n--- Step 3: Submitting Proof to Creditcoin ASC Engine ---");
  const triggerTx = await engine.triggerIncursionCheck(
    1, // chainKey 1 = Ethereum Sepolia
    beaconReceipt.blockNumber,
    encodedTx,
    merkleProof,
    continuityProof
  );
  const triggerReceipt = await triggerTx.wait();

  // Find IncursionTriggered event
  let incursionData;
  for (const log of triggerReceipt.logs) {
    try {
      const parsed = engine.interface.parseLog(log);
      if (parsed && parsed.name === "IncursionTriggered") {
        incursionData = parsed.args;
        break;
      }
    } catch (_) {}
  }

  const incursionId = incursionData.incursionId;
  const incursion = await engine.incursions(incursionId);

  console.log(`  >>> INCURSION ALERT TRIGGERED! <<<`);
  console.log(`  Incursion ID:       #${incursion.id}`);
  console.log(`  Colossus Archetype: ${ARCHETYPE_NAMES[incursion.archetype]}`);
  console.log(`  Threat Severity:    ${"★".repeat(Number(incursion.severity))} (${incursion.severity}/5)`);
  console.log(`  Colossus Health:    ${incursion.maxHp.toString()} HP`);
  console.log(`  Siege Power:        ${incursion.siegePower.toString()} DMG`);
  console.log(`  Bounty on Defeat:   ${incursion.stoneReward} Raw Stone | ${incursion.energyReward} Sunstone Energy`);
  console.log(`  Status:             ${STATUS_NAMES[incursion.status]}`);

  // 5. Player mobilizes defenses
  console.log("\n--- Step 4: Defense Mobilization at Aegis Ramparts ---");
  const defensePowerMustered = incursion.maxHp; // Mobilize full counter-battery
  console.log(`  Commander orders Ballistas & Sunstone Batteries to fire!`);
  console.log(`  Muster Defense Power: ${defensePowerMustered} DMG`);

  const defendTx = await engine.defendIncursion(incursionId, defensePowerMustered);
  await defendTx.wait();

  const finalInc = await engine.incursions(incursionId);
  console.log(`\n  >>> BATTLE RESOLUTION <<<`);
  console.log(`  Colossus HP Remaining: ${finalInc.currentHp}`);
  console.log(`  Colossus Status:       ${STATUS_NAMES[finalInc.status]} (VICTORY)`);
  console.log(`  Total Repelled:        ${await engine.totalRepelled()} Colossi`);
  console.log(`  Total Settlement Breaches: ${await engine.totalBreached()}`);
  console.log(`  Resources Credited:    +${finalInc.stoneReward} Stone, +${finalInc.energyReward} Energy`);

  console.log("\n===============================================================");
  console.log("   DEMO COMPLETE: Phase 1 Attested Incursion Successfully Executed!");
  console.log("===============================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
