const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 3: BastionStructures (Attested Structure State ERC-721)", function () {
  let structures, owner, commander, authorizedEngine;

  beforeEach(async function () {
    [owner, commander, authorizedEngine] = await ethers.getSigners();

    const StructuresFactory = await ethers.getContractFactory("BastionStructures");
    structures = await StructuresFactory.deploy();
    await structures.waitForDeployment();

    await structures.setAuthorizedCaller(authorizedEngine.address, true);
  });

  it("should erect a Rampart structure and generate a valid state attestation hash", async function () {
    const tx = await structures.erectStructure(
      commander.address,
      0, // Rampart
      5, // gridX
      5, // gridY
      "https://bastion.game/metadata/rampart-1.json"
    );
    await tx.wait();

    expect(await structures.totalSupply()).to.equal(1);
    expect(await structures.ownerOf(0)).to.equal(commander.address);

    const state = await structures.getAttestedStructureState(0);
    expect(state.sType).to.equal(0); // Rampart
    expect(state.condition).to.equal(0); // Intact
    expect(state.level).to.equal(1);
    expect(state.durability).to.equal(1500);
    expect(state.defensePower).to.equal(100);
    expect(state.attestationHash).to.not.equal(ethers.ZeroHash);
  });

  it("should apply battle damage from authorized engine and update attested state", async function () {
    await structures.erectStructure(commander.address, 1, 10, 10, "ballista.json"); // BallistaTower (800 HP)

    // Inflict 500 damage -> drops below 50% -> Damaged
    await structures.connect(authorizedEngine).applyBattleDamage(0, 500);

    const damagedState = await structures.getAttestedStructureState(0);
    expect(damagedState.condition).to.equal(1); // Damaged
    expect(damagedState.durability).to.equal(300);

    // Inflict another 400 damage -> drops to 0 -> Destroyed
    await structures.connect(authorizedEngine).applyBattleDamage(0, 400);

    const destroyedState = await structures.getAttestedStructureState(0);
    expect(destroyedState.condition).to.equal(2); // Destroyed
    expect(destroyedState.durability).to.equal(0);
  });

  it("should repair a damaged structure back to Intact", async function () {
    await structures.erectStructure(commander.address, 2, 8, 8, "pylon.json"); // SunstonePylon (600 HP)
    await structures.connect(authorizedEngine).applyBattleDamage(0, 400);

    // Commander repairs structure
    await structures.connect(commander).repairStructure(0);

    const repairedState = await structures.getAttestedStructureState(0);
    expect(repairedState.condition).to.equal(0); // Intact
    expect(repairedState.durability).to.equal(600);
  });

  it("should upgrade an intact structure to increase defense output", async function () {
    await structures.erectStructure(commander.address, 1, 2, 2, "ballista.json");

    await structures.connect(commander).upgradeStructure(0);
    const upgradedState = await structures.getAttestedStructureState(0);

    expect(upgradedState.level).to.equal(2);
    expect(upgradedState.defensePower).to.be.gt(450);
  });
});
