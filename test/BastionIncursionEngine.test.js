const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 1: BastionIncursionEngine (Attestcoin Integration)", function () {
  let engine, mockVerifier, owner, defender;
  const SEPOLIA_CHAIN_KEY = 1;
  const SAMPLE_HEIGHT = 5432100;

  beforeEach(async function () {
    [owner, defender] = await ethers.getSigners();

    // 1. Deploy Mock Native Query Verifier
    const MockVerifierFactory = await ethers.getContractFactory("MockNativeQueryVerifier");
    mockVerifier = await MockVerifierFactory.deploy();
    await mockVerifier.waitForDeployment();

    // 2. Deploy BastionIncursionEngine pointing to mock verifier
    const EngineFactory = await ethers.getContractFactory("BastionIncursionEngine");
    engine = await EngineFactory.deploy(await mockVerifier.getAddress());
    await engine.waitForDeployment();
  });

  function createSampleProof(rootHex = ethers.keccak256(ethers.toUtf8Bytes("block-sample-1"))) {
    return {
      merkleProof: {
        root: rootHex,
        siblings: [
          { hash: ethers.keccak256(ethers.toUtf8Bytes("sibling-0")), isLeft: false },
          { hash: ethers.keccak256(ethers.toUtf8Bytes("sibling-1")), isLeft: true },
        ],
      },
      continuityProof: {
        lowerEndpointDigest: ethers.keccak256(ethers.toUtf8Bytes("attestation-checkpoint-1")),
        roots: [
          ethers.keccak256(ethers.toUtf8Bytes("continuity-root-0")),
          ethers.keccak256(ethers.toUtf8Bytes("continuity-root-1")),
        ],
      },
      encodedTransaction: ethers.toUtf8Bytes("mock-evm-tx-receipt-payload"),
    };
  }

  it("should deploy with custom verifier or fallback to 0x0FD2 precompile", async function () {
    expect(await engine.VERIFIER()).to.equal(await mockVerifier.getAddress());

    // Fallback deployment
    const EngineFactory = await ethers.getContractFactory("BastionIncursionEngine");
    const defaultEngine = await EngineFactory.deploy(ethers.ZeroAddress);
    await defaultEngine.waitForDeployment();
    expect(await defaultEngine.VERIFIER()).to.equal("0x0000000000000000000000000000000000000FD2");
  });

  it("should trigger an incursion upon successful Attestcoin proof verification", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleProof();

    const tx = await engine.triggerIncursionCheck(
      SEPOLIA_CHAIN_KEY,
      SAMPLE_HEIGHT,
      encodedTransaction,
      merkleProof,
      continuityProof
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);

    // Verify incursion state was recorded
    expect(await engine.getIncursionsCount()).to.equal(1);
    const incursion = await engine.incursions(0);

    expect(incursion.id).to.equal(0);
    expect(incursion.sourceChain).to.equal(SEPOLIA_CHAIN_KEY);
    expect(incursion.sourceBlockHeight).to.equal(SAMPLE_HEIGHT);
    expect(incursion.severity).to.be.within(1, 5);
    expect(incursion.maxHp).to.be.gt(0);
    expect(incursion.currentHp).to.equal(incursion.maxHp);
    expect(incursion.status).to.equal(0); // Approaching
  });

  it("should enforce replay protection against re-submitting the same attested transaction", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleProof();

    // First submission succeeds
    await engine.triggerIncursionCheck(
      SEPOLIA_CHAIN_KEY,
      SAMPLE_HEIGHT,
      encodedTransaction,
      merkleProof,
      continuityProof
    );

    // Second submission must revert
    await expect(
      engine.triggerIncursionCheck(
        SEPOLIA_CHAIN_KEY,
        SAMPLE_HEIGHT,
        encodedTransaction,
        merkleProof,
        continuityProof
      )
    ).to.be.revertedWith("Bastion: incursion query already processed");
  });

  it("should reject invalid Attestcoin proofs", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleProof();

    // Force mock verifier rejection
    await mockVerifier.setShouldPass(false);

    await expect(
      engine.triggerIncursionCheck(
        SEPOLIA_CHAIN_KEY,
        SAMPLE_HEIGHT,
        encodedTransaction,
        merkleProof,
        continuityProof
      )
    ).to.be.revertedWith("MockNativeQueryVerifier: proof verification failed");
  });

  it("should resolve combat defense correctly: partial damage vs defeat", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleProof();

    await engine.triggerIncursionCheck(
      SEPOLIA_CHAIN_KEY,
      SAMPLE_HEIGHT,
      encodedTransaction,
      merkleProof,
      continuityProof
    );

    const initialInc = await engine.incursions(0);
    const maxHp = initialInc.maxHp;

    // 1. Partial defense strike
    const partialPower = maxHp / 2n;
    await engine.connect(defender).defendIncursion(0, partialPower);

    let incAfterStrike = await engine.incursions(0);
    expect(incAfterStrike.status).to.equal(1); // Engaged
    expect(incAfterStrike.currentHp).to.equal(maxHp - partialPower);
    expect(incAfterStrike.defender).to.equal(defender.address);

    // 2. Lethal defense strike
    await engine.connect(defender).defendIncursion(0, partialPower + 1000n);
    let incAfterDefeat = await engine.incursions(0);
    expect(incAfterDefeat.status).to.equal(2); // Repelled
    expect(incAfterDefeat.currentHp).to.equal(0);
    expect(await engine.totalRepelled()).to.equal(1);
  });

  it("should record city breach when an incursion is not defended", async function () {
    const { merkleProof, continuityProof, encodedTransaction } = createSampleProof();

    await engine.triggerIncursionCheck(
      SEPOLIA_CHAIN_KEY,
      SAMPLE_HEIGHT,
      encodedTransaction,
      merkleProof,
      continuityProof
    );

    await engine.resolveBreach(0);
    const inc = await engine.incursions(0);
    expect(inc.status).to.equal(3); // Breached
    expect(await engine.totalBreached()).to.equal(1);
  });
});
