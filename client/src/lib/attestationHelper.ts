import { ethers } from "ethers";
import { CREDITCOIN_TESTNET, SOURCE_CHAINS } from "./constants";

export interface AttestationPayload {
  chainKey: number;
  blockHeight: number;
  txHash: string;
  encodedTransaction: string;
  merkleProof: {
    root: string;
    siblings: Array<{ hash: string; isLeft: boolean }>;
  };
  continuityProof: {
    lowerEndpointDigest: string;
    roots: string[];
  };
  simulatedColossus?: {
    archetype: number;
    severity: number;
    hp: number;
    siege: number;
  };
}

/**
 * Generates an Attestcoin proof payload.
 * Demonstrates the exact cryptographic structure ingested by Creditcoin Precompile 0x0FD2.
 */
export function generateAttestationPayload(
  sourceChainKey: number = SOURCE_CHAINS.SEPOLIA.chainKey,
  seedString: string = `beacon-${Date.now()}`
): AttestationPayload {
  const pseudoRandomHash = ethers.keccak256(ethers.toUtf8Bytes(seedString));
  const blockHeight = 5432000 + (Math.floor(Date.now() / 1000) % 9999);
  const txHash = ethers.keccak256(ethers.toUtf8Bytes(`tx-${seedString}-${blockHeight}`));

  // Construct 3-deep Merkle proof path
  const siblings = [
    {
      hash: ethers.keccak256(ethers.toUtf8Bytes(`sibling-0-${pseudoRandomHash}`)),
      isLeft: false,
    },
    {
      hash: ethers.keccak256(ethers.toUtf8Bytes(`sibling-1-${pseudoRandomHash}`)),
      isLeft: true,
    },
    {
      hash: ethers.keccak256(ethers.toUtf8Bytes(`sibling-2-${pseudoRandomHash}`)),
      isLeft: false,
    },
  ];

  const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes(`merkle-root-${blockHeight}`));
  const continuityDigest = ethers.keccak256(ethers.toUtf8Bytes(`checkpoint-${blockHeight}`));
  const continuityRoots = [
    ethers.keccak256(ethers.toUtf8Bytes(`continuity-epoch-1-${blockHeight}`)),
    ethers.keccak256(ethers.toUtf8Bytes(`continuity-epoch-2-${blockHeight}`)),
  ];

  // Derive Colossus attributes deterministically to match BastionIncursionEngine.sol
  const txKey = ethers.keccak256(
    ethers.solidityPacked(["uint64", "uint64", "uint64"], [sourceChainKey, blockHeight, 5])
  );
  const derivationSeed = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "bytes32", "bytes32"], [txKey, merkleRoot, continuityDigest])
  );
  const seedBigInt = BigInt(derivationSeed);

  const archetype = Number(seedBigInt % 4n);
  const severity = Number((seedBigInt >> 8n) % 5n) + 1;
  const hp = severity * 2000 + Number((seedBigInt >> 16n) % 500n);
  const siege = severity * 100 + Number((seedBigInt >> 24n) % 60n);

  return {
    chainKey: sourceChainKey,
    blockHeight,
    txHash,
    encodedTransaction: ethers.hexlify(ethers.toUtf8Bytes(txHash)),
    merkleProof: {
      root: merkleRoot,
      siblings,
    },
    continuityProof: {
      lowerEndpointDigest: continuityDigest,
      roots: continuityRoots,
    },
    simulatedColossus: {
      archetype,
      severity,
      hp,
      siege,
    },
  };
}

/**
 * Calculates estimated gas and CTC cost according to official Creditcoin equation:
 * Cost ≈ 2.3e-5 + 2.9e-7 * continuityHashCount CTC
 */
export function calculateVerificationCost(continuityCount: number = 2): {
  ctcCost: string;
  usdEstimate: string;
  latencyBlocks: number;
} {
  const ctc = 0.000023 + 0.00000029 * continuityCount;
  return {
    ctcCost: `${ctc.toFixed(6)} tCTC`,
    usdEstimate: `< $0.0001 USD`,
    latencyBlocks: 1, // Synchronous in 1 block (~15s)
  };
}
